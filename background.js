// ponytail: single alarm, single interval. No per-tab state.
const DEFAULT_MINUTES = 30;
// master on/off di popup: kalau mati, jadwal & test gak jalan sama sekali
const DEFAULT_ENABLED = true;
// batas aman status "pengamen lagi tampil": kalau tab ditutup pas overlay nongol,
// sinyal REMINDER_HIDDEN gak sempat terkirim — jangan biarkan Test terkunci selamanya
const REMINDER_STALE_MS = 10 * 60000;

async function isEnabled() {
  const { enabled } = await chrome.storage.sync.get({ enabled: DEFAULT_ENABLED });
  return enabled !== false;
}

async function isReminderActive() {
  const { reminderShownAt } = await chrome.storage.local.get({ reminderShownAt: 0 });
  return reminderShownAt > 0 && Date.now() - reminderShownAt < REMINDER_STALE_MS;
}

async function getInterval() {
  const { intervalMinutes } = await chrome.storage.sync.get({ intervalMinutes: DEFAULT_MINUTES });
  return intervalMinutes;
}

async function schedule(minutes) {
  await chrome.alarms.clear("drink");
  // toggle off -> jangan jadwalin apa-apa (tetap bersihkan alarm sisa)
  if (!(await isEnabled())) {
    await chrome.storage.local.set({ nextDrinkAt: null });
    return;
  }
  const m = minutes ?? await getInterval();
  chrome.alarms.create("drink", { periodInMinutes: m, delayInMinutes: m });
  const next = Date.now() + m * 60000;
  await chrome.storage.local.set({ nextDrinkAt: next });
}

// selalu inject ulang content.css/content.js versi terbaru ke tab, baru kirim SHOW_REMINDER.
// sengaja TIDAK coba sendMessage dulu sebelum inject — kalau tab itu masih punya content
// script versi lama yang nyangkut (dari sebelum extension di-reload), dia bakal tetap
// "berhasil" jawab sendMessage walau logicnya basi, jadi versi baru ga pernah ke-inject.
// Lihat guard __drinkReminderActiveVersion di content.js: instance terbaru yang di-inject
// otomatis jadi satu-satunya yang aktif, instance lama yang masih nyangkut jadi diem sendiri.
async function showInTab(tabId) {
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
  } catch {}
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch {
    return false; // biasanya karena halamannya restricted (chrome web store, dll)
  }
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SHOW_REMINDER" });
    return true;
  } catch {
    // fallback: panggil langsung fungsi global yang barusan di-set content.js
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.__showDrinkReminder && window.__showDrinkReminder()
      });
      return true;
    } catch {}
  }
  return false;
}

function isRestrictedUrl(url) {
  return !url || url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://") || url.startsWith("about:");
}

// cari tab yang lagi aktif — coba window yang lagi fokus dulu, fallback ke tab aktif di window manapun
async function getActiveTab() {
  let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) {
    [tab] = await chrome.tabs.query({ active: true });
  }
  return tab;
}

// cek apakah ada window Chrome yang sedang focused — kalau iya, overlay aja cukup,
// notifikasi OS gak perlu (biar ganggu kalau lagi pakai Chrome)
async function isChromeFocused() {
  const wins = await chrome.windows.getAll();
  return wins.some((w) => w.focused);
}

async function sendDrinkNotification() {
  if (await isChromeFocused()) return; // Chrome lagi aktif — overlay udah keliatan, skip notif
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Time to drink! 💧",
    message: "Pengamen datang bawa recehan — buka tab browser kalau dia belum muncul.",
    priority: 2
  });
}

async function notifyActiveTab() {
  sendDrinkNotification();
  const tab = await getActiveTab();
  if (!tab?.id || isRestrictedUrl(tab.url)) return 0;
  return (await showInTab(tab.id)) ? 1 : 0;
}

chrome.runtime.onInstalled.addListener(async () => {
  const { intervalMinutes } = await chrome.storage.sync.get({ intervalMinutes: null });
  if (intervalMinutes == null) await chrome.storage.sync.set({ intervalMinutes: DEFAULT_MINUTES });
  await schedule();
});

chrome.runtime.onStartup.addListener(() => schedule());

// toggle master on/off dari popup (storage.sync key "enabled")
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.enabled) return;
  schedule();
});

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "drink") return;
  // kalau toggle dimatiin tapi alarm yang lama masih nyangkut -> jangan tampilkan
  if (!(await isEnabled())) {
    await chrome.alarms.clear("drink");
    return;
  }
  await notifyActiveTab();
  // re-arm periodic after a snooze (one-shot has no periodInMinutes)
  const alarm = await chrome.alarms.get("drink");
  if (!alarm || !alarm.periodInMinutes) {
    setTimeout(() => schedule(), 1000);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === "DRANK") {
      await chrome.storage.local.remove("reminderShownAt");
      await schedule();
      sendResponse({ ok: true });
    } else if (msg.type === "SNOOZE") {
      const mins = Number(msg.minutes) || 5;
      await chrome.storage.local.remove("reminderShownAt");
      await chrome.alarms.clear("drink");
      chrome.alarms.create("drink", { delayInMinutes: mins });
      await chrome.storage.local.set({ nextDrinkAt: Date.now() + mins * 60000 });
      sendResponse({ ok: true });
    } else if (msg.type === "GET_STATE") {
      const { intervalMinutes } = await chrome.storage.sync.get({ intervalMinutes: DEFAULT_MINUTES });
      const { nextDrinkAt } = await chrome.storage.local.get({ nextDrinkAt: null });
      const enabled = await isEnabled();
      sendResponse({ intervalMinutes, nextDrinkAt, reminderActive: await isReminderActive(), enabled });
    } else if (msg.type === "REMINDER_SHOWN") {
      await chrome.storage.local.set({ reminderShownAt: Date.now() });
      sendResponse({ ok: true });
    } else if (msg.type === "REMINDER_HIDDEN") {
      await chrome.storage.local.remove("reminderShownAt");
      sendResponse({ ok: true });
    } else if (msg.type === "SET_INTERVAL") {
      const v = Math.max(1, Math.min(240, Number(msg.minutes) || DEFAULT_MINUTES));
      await chrome.storage.sync.set({ intervalMinutes: v });
      await schedule(v);
      sendResponse({ ok: true, intervalMinutes: v });
    } else if (msg.type === "TEST_NOW") {
      // pengamen lagi tampil di tab manapun -> jangan tambah pengamen kedua
      if (!(await isEnabled())) {
        sendResponse({ ok: true, delivered: 0, disabled: true });
        return;
      }
      if (await isReminderActive()) {
        sendResponse({ ok: true, delivered: 0, active: true });
        return;
      }
      const delivered = await notifyActiveTab();
      sendResponse({ ok: true, delivered });
    }
  })();
  return true;
});