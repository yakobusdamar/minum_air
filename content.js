(() => {
  const SCRIPT_VERSION = Symbol("drink-reminder");
  window.__drinkReminderActiveVersion = SCRIPT_VERSION;

  const VIDEO_DATANG_SRC = chrome.runtime.getURL("assets/pengamen_datang.mp4");
  const VIDEO_NYANYI_SRC = chrome.runtime.getURL("assets/pengamen_nyanyi.mp4");
  const VIDEO_KASIH_SRC  = chrome.runtime.getURL("assets/pengamen_kasih.mp4");
  const VIDEO_MINUM_SRC  = chrome.runtime.getURL("assets/pengamen_minum.mp4");
  const MAX_MUSIC = 20;

  async function detectMusicFiles() {
    const found = [];
    for (let i = 1; i <= MAX_MUSIC; i++) {
      const url = chrome.runtime.getURL(`assets/music_${i}.mp3`);
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) found.push(`music_${i}.mp3`);
      } catch {}
    }
    return found;
  }

  let AUDIO_SRC = null;

  async function pickRandomAudio() {
    const files = await detectMusicFiles();
    if (!files.length) return null;
    return chrome.runtime.getURL("assets/" + files[Math.floor(Math.random() * files.length)]);
  }

  const GREEN_MIN = 30;
  const GREEN_RATIO_LOW = 0.06;
  const GREEN_RATIO_HIGH = 0.18;

  let overlay = null;
  let rafId = null;
  let bgAudio = null;
  let prevOverflow = null;

  function stopAllAudio() {
    // matiin audio kita sendiri (termasuk zombie dari inject lama).
    // JANGAN nemblak querySelectorAll("audio") — itu ikut mematiin audio milik halaman.
    const audios = [bgAudio, window.__drinkReminderAudio].filter(Boolean);
    for (const a of audios) { try { a.pause(); a.src = ""; } catch {} }
    bgAudio = null; window.__drinkReminderAudio = null;
  }

  function stopAndRemove() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    stopAllAudio();
    if (overlay) { overlay.remove(); overlay = null; }
    if (prevOverflow !== null) document.documentElement.style.overflow = prevOverflow;
    prevOverflow = null;
  }

  function fadeOutAudio(ms = 350) {
    const audios = [bgAudio, window.__drinkReminderAudio].filter(Boolean);
    if (!audios.length) return;
    // pause zombie juga biar gak nyisa
    const start = performance.now();
    const startVols = audios.map(a => a.volume);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms);
      audios.forEach((a, i) => { try { a.volume = Math.max(0, startVols[i] * (1 - p)); } catch {} });
      if (p < 1) requestAnimationFrame(tick);
      else audios.forEach(a => { try { a.pause(); } catch {} });
    };
    requestAnimationFrame(tick);
    // hard stop fallback kalau rAF keblokir
    setTimeout(() => audios.forEach(a => { try { a.pause(); } catch {} }), ms + 100);
  }

  async function showReminder() {
    if (overlay) return;
    // overlay dibikin sinkron dulu sebagai guard — showReminder sekarang async,
    // jadi tanpa ini dua panggilan beruntun bisa lolos guard sebelum await selesai
    overlay = document.createElement("div");
    overlay.id = "drink-reminder-overlay";
    // simpan overflow asli halaman biar bisa di-restore utuh pas ditutup
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    // toggle mute (baca langsung storage.local, sama sumbernya dengan popup)
    const { muted } = await chrome.storage.local.get({ muted: false });

    overlay.innerHTML = `
      <div class="dr-backdrop"></div>
      <div class="dr-canvas-wrap"><canvas class="dr-canvas"></canvas></div>
      <div class="dr-panel" role="dialog" aria-modal="true" aria-label="Time to drink">
        <div class="dr-actions">
          <button class="dr-btn dr-primary" id="dr-drank"><span class="dr-ico">💧</span> Sudah minum</button>
          <button class="dr-btn dr-ghost" id="dr-snooze"><span class="dr-ico">💰</span><span class="dr-btn-text">Kasih uang<span class="dr-sub">tunda 5 menit</span></span></button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(overlay);
    // lapor ke background: pengamen resmi tampil (buat disable tombol Test di popup)
    chrome.runtime.sendMessage({ type: "REMINDER_SHOWN" }).catch(() => {});
    const thisOverlay = overlay;

    const canvas = overlay.querySelector(".dr-canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // kill zombie audio dari sesi sebelumnya (inject lama)
    if (window.__drinkReminderAudio) { try { window.__drinkReminderAudio.pause(); } catch {} }
    if (!muted) {
      const audioSrc = await pickRandomAudio();
      if (!audioSrc) return; // no music files found
      bgAudio = new Audio(audioSrc);
      window.__drinkReminderAudio = bgAudio;
      bgAudio.loop = false; // habis lagu -> auto close (versi selesai ke-3)
      bgAudio.volume = 1.0;
      bgAudio.addEventListener("ended", () => {
        if (overlay !== thisOverlay || overlay.querySelector(".dr-panel")?.style.display === "none") return;
        // lagu habis natural, anggap selesai kayak "sudah minum"
        stopAndRemove();
        chrome.runtime.sendMessage({ type: "DRANK" }).catch(() => {});
      });
      bgAudio.play().catch(() => {
        const unlock = () => { if (bgAudio) bgAudio.play().catch(()=>{}); };
        overlay.addEventListener("click", unlock, { once: true });
        document.addEventListener("click", unlock, { once: true });
      });
    }
    // kalau muted: gak ada lagu, jadi gak ada auto-close saat lagu habis —
    // overlay nutup pas user klik salah satu tombol.

    // --- preload semua video biar switch tanpa gap ---
    const vDatang = document.createElement("video");
    const vNyanyi = document.createElement("video");
    const vKasih  = document.createElement("video");
    const vMinum  = document.createElement("video");
    for (const v of [vDatang, vNyanyi]) {
      v.playsInline = true; v.muted = true; v.preload = "auto"; v.style.display = "none";
      overlay.appendChild(v);
    }
    for (const v of [vKasih, vMinum]) {
      v.playsInline = true; v.muted = muted; v.volume = muted ? 0 : 1.0; v.preload = "auto"; v.style.display = "none";
      overlay.appendChild(v);
    }
    vDatang.src = VIDEO_DATANG_SRC;
    vNyanyi.src = VIDEO_NYANYI_SRC; vNyanyi.loop = true;
    vKasih.src  = VIDEO_KASIH_SRC;
    vMinum.src  = VIDEO_MINUM_SRC;
    // trigger preload
    vNyanyi.load(); vKasih.load(); vMinum.load();

    let stage = "datang"; // datang -> nyanyi -> kasih/minum
    let currentVideo = vDatang;

    function chromaKey(frame) {
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (g < GREEN_MIN) continue;
        const maxRB = Math.max(r, b);
        const ratio = (g - maxRB) / g;
        if (ratio > GREEN_RATIO_HIGH) d[i+3] = 0;
        else if (ratio > GREEN_RATIO_LOW) {
          const t = (ratio - GREEN_RATIO_LOW) / (GREEN_RATIO_HIGH - GREEN_RATIO_LOW);
          d[i+3] = Math.round(d[i+3] * (1 - t));
          d[i+1] = Math.round(g - (g - maxRB) * t);
        }
      }
      return frame;
    }

    function drawLoop() {
      if (overlay !== thisOverlay || !currentVideo || currentVideo.paused || currentVideo.ended) return;
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return;
      ctx.drawImage(currentVideo, 0, 0, w, h);
      const frame = ctx.getImageData(0, 0, w, h);
      ctx.putImageData(chromaKey(frame), 0, 0);
      rafId = requestAnimationFrame(drawLoop);
    }

    function tryPlay(v) {
      v.play().catch(() => {
        const once = () => { v.play().catch(()=>{}); document.removeEventListener("click", once); };
        document.addEventListener("click", once, { once: true });
      });
    }

    function switchTo(nextV) {
      currentVideo = nextV;
      if (nextV.videoWidth) { canvas.width = nextV.videoWidth; canvas.height = nextV.videoHeight; }
      if (nextV.readyState >= 2) {
        tryPlay(nextV);
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(drawLoop);
      } else {
        nextV.addEventListener("loadeddata", () => {
          if (overlay !== thisOverlay || currentVideo !== nextV) return;
          canvas.width = nextV.videoWidth; canvas.height = nextV.videoHeight;
          tryPlay(nextV);
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(drawLoop);
        }, { once: true });
      }
    }

    vDatang.addEventListener("loadedmetadata", () => {
      if (overlay !== thisOverlay || currentVideo !== vDatang) return;
      canvas.width = vDatang.videoWidth; canvas.height = vDatang.videoHeight;
    });
    vDatang.addEventListener("loadeddata", () => {
      if (overlay !== thisOverlay || currentVideo !== vDatang) return;
      tryPlay(vDatang);
      rafId = requestAnimationFrame(drawLoop);
    });
    vDatang.addEventListener("ended", () => {
      if (overlay !== thisOverlay || stage !== "datang") return;
      stage = "nyanyi";
      switchTo(vNyanyi);
    });
    vDatang.load();

    // --- actions ---
    let busy = false;
    function playOnceAndThen(video, cb) {
      if (busy) return;
      busy = true;
      fadeOutAudio(350); // kucing berhenti ngamen -> musik fadeout cepat
      overlay.querySelector(".dr-panel").style.display = "none";
      stage = "outro";
      cancelAnimationFrame(rafId);
      switchTo(video);
      const done = () => { video.removeEventListener("ended", done); cb(); };
      video.addEventListener("ended", done);
      // fallback kalau video gak ada ended (error) -> 4s timeout
      setTimeout(() => { video.removeEventListener("ended", done); if (overlay===thisOverlay && busy) cb(); }, 5000);
    }

    overlay.querySelector("#dr-drank").addEventListener("click", () => {
      playOnceAndThen(vMinum, () => {
        stopAndRemove();
        chrome.runtime.sendMessage({ type: "DRANK" }).catch(() => {});
      });
    });
    overlay.querySelector("#dr-snooze").addEventListener("click", () => {
      playOnceAndThen(vKasih, () => {
        stopAndRemove();
        chrome.runtime.sendMessage({ type: "SNOOZE", minutes: 5 }).catch(() => {});
      });
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (window.__drinkReminderActiveVersion !== SCRIPT_VERSION) return;
    if (msg.type === "SHOW_REMINDER") showReminder();
  });
  // tab ditutup / navigasi pas overlay masih nongol -> status aktif harus dibersihin
  window.addEventListener("pagehide", () => {
    if (overlay) chrome.runtime.sendMessage({ type: "REMINDER_HIDDEN" }).catch(() => {});
  });
  window.__showDrinkReminder = () => {
    if (window.__drinkReminderActiveVersion !== SCRIPT_VERSION) return;
    showReminder();
  };
})();
