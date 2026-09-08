const slider = document.getElementById("interval");
const val = document.getElementById("val");
const nextEl = document.getElementById("next");
const muteEl = document.getElementById("mute");
const testBtn = document.getElementById("test");
const powerEl = document.getElementById("power");
const settingsEl = document.getElementById("settings");
const powerState = document.getElementById("power-state");
const saveBtn = document.getElementById("save");

const STALE_MS = 10 * 60000; // harus sama dengan REMINDER_STALE_MS di background.js

function setEnabled(on) {
  powerEl.classList.toggle("on", on);
  powerEl.setAttribute("aria-checked", String(on));
  settingsEl.classList.toggle("off", !on);
  powerState.textContent = on ? "Akan muncul tiap interval" : "Dimatikan — pengingat berhenti";
  if (!on) nextEl.textContent = "";
}

function renderTest(active) {
  testBtn.disabled = !!active;
  testBtn.textContent = active ? "🎭 Pengamen lagi tampil" : "▶ Test sekarang";
}

function fmt(m){ return m >= 60 ? (m/60).toFixed(m%60?1:0)+"j" : m+"m"; }
function renderNext(ts){
  if(!ts) { nextEl.textContent=""; return; }
  const d = new Date(ts);
  const diff = Math.max(0, Math.round((ts - Date.now())/60000));
  nextEl.textContent = `⏰ Berikutnya: ${d.toLocaleTimeString()} (~${diff}m lagi)`;
}

chrome.runtime.sendMessage({type:"GET_STATE"}, (res)=>{
  if (chrome.runtime.lastError || !res) return;
  setEnabled(res.enabled !== false);
  slider.value = Math.min(res.intervalMinutes, Number(slider.max));
  val.textContent = fmt(res.intervalMinutes);
  renderTest(res.reminderActive);
  renderNext(res.nextDrinkAt);
});

// status aktif bisa berubah selagi popup kebuka (pengamen tampil/nutup) -> update live
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.reminderShownAt) return;
  const at = changes.reminderShownAt.newValue;
  renderTest(!!at && Date.now() - at < STALE_MS);
});

// Master on/off. Disimpan di storage.sync (satu sumber, kebaca background.js).
chrome.storage.sync.get({ enabled: true }, ({ enabled }) => setEnabled(enabled !== false));
powerEl.addEventListener("click", () => {
  const on = !powerEl.classList.contains("on");
  chrome.storage.sync.set({ enabled: on });
  setEnabled(on);
  if (on) {
    chrome.runtime.sendMessage({type:"GET_STATE"}, r=>{ if (r) renderNext(r.nextDrinkAt); });
  }
});

slider.addEventListener("input", ()=> val.textContent = fmt(Number(slider.value)));

// Toggle mute PAKAI METHOD BARU: baca/tulis chrome.storage.local langsung dari popup,
// tanpa lewat pesan GET_STATE ke service worker. Response GET_STATE yang datang lambat
// dulunya bisa menimpa posisi checkbox dengan nilai lama -> keliatan "gak kesimpen".
// storage.local gak punya sync lintas device, jadi nilai yang keliatan selalu yang terakhir ditulis.
chrome.storage.local.get({ muted: false }, ({ muted }) => { muteEl.checked = !!muted; });
muteEl.addEventListener("change", ()=>{
  chrome.storage.local.set({ muted: muteEl.checked });
});

saveBtn.addEventListener("click", ()=>{
  const minutes = Number(slider.value);
  chrome.runtime.sendMessage({type:"SET_INTERVAL", minutes}, (res)=>{
    if (chrome.runtime.lastError || !res) return;
    val.textContent = fmt(res.intervalMinutes);
    chrome.runtime.sendMessage({type:"GET_STATE"}, r=>{ if (r) renderNext(r.nextDrinkAt); });
    const b=document.getElementById("save");
    const t=b.textContent; b.textContent="✓ Tersimpan"; setTimeout(()=>b.textContent=t,1200);
  });
});

testBtn.addEventListener("click", ()=>{
  testBtn.textContent = "⏳ mencoba...";
  chrome.runtime.sendMessage({type:"TEST_NOW"}, (res)=>{
    if (chrome.runtime.lastError) {
      testBtn.textContent = "⚠️ " + chrome.runtime.lastError.message;
      setTimeout(()=> renderTest(false), 2500);
      return;
    }
    if (res && res.active) { renderTest(true); return; }
    if (res && res.delivered === 0) {
      testBtn.textContent = "⚠️ buka tab biasa dulu";
      nextEl.textContent = "Test gagal: kamu lagi di chrome:// — buka tab google.com lalu Test lagi";
      setTimeout(()=> renderTest(false), 2500);
      return;
    }
    window.close();
  });
});
