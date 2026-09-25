const video = document.getElementById("video");
const viewfinder = document.getElementById("viewfinder");
const frameOverlay = document.getElementById("frameOverlay");
const countdownEl = document.getElementById("countdown");
const flashEl = document.getElementById("flash");
const camError = document.getElementById("camError");
const shutterBtn = document.getElementById("shutterBtn");
const flipBtn = document.getElementById("flipBtn");
const countdownBtn = document.getElementById("countdownBtn");
const demoBtn = document.getElementById("demoBtn");
const themeSelect = document.getElementById("themeSelect");
const filterGrid = document.getElementById("filterGrid");
const frameGrid = document.getElementById("frameGrid");
const stickerRow = document.getElementById("stickerRow");
const captionInput = document.getElementById("captionInput");
const shotsEl = document.getElementById("shots");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

const FILTERS = [
  { id: "none", name: "Normal", css: "none" },
  { id: "mono", name: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "sepia", name: "Retro", css: "sepia(.8) contrast(1.05)" },
  { id: "warm", name: "Warm", css: "saturate(1.4) hue-rotate(-12deg) brightness(1.05)" },
  { id: "cool", name: "Cool", css: "saturate(1.2) hue-rotate(16deg) brightness(1.03)" },
  { id: "vibrant", name: "Vibes", css: "saturate(2) contrast(1.15)" },
  { id: "dreamy", name: "Dreamy", css: "blur(.6px) brightness(1.12) saturate(1.3)" },
  { id: "noir", name: "Noir", css: "grayscale(1) contrast(1.5) brightness(.95)" },
];

const FRAMES = ["none", "solid", "dashed", "dots", "neon"];
const STICKERS = ["💖", "⭐", "🌈", "🎈", "🎉", "😎", "🌸", "👑"];

const state = {
  filter: FILTERS[0],
  frame: "solid",
  mode: "single",
  countdownOn: true,
  facing: "user",
  demo: false,
  sticker: "",
  stream: null,
  busy: false,
  shots: [],
  selectedId: null,
};

const demoCanvas = document.createElement("canvas");
demoCanvas.width = 960;
demoCanvas.height = 720;
demoCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:none;";
viewfinder.appendChild(demoCanvas);
let demoRaf = 0;

function themeColors() {
  const cs = getComputedStyle(document.body);
  return {
    accent: cs.getPropertyValue("--accent").trim(),
    accent2: cs.getPropertyValue("--accent-2").trim(),
    panel: cs.getPropertyValue("--panel").trim(),
    text: cs.getPropertyValue("--text").trim(),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startCamera() {
  stopDemo();
  try {
    if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facing, width: { ideal: 1280 } },
      audio: false,
    });
    video.srcObject = state.stream;
    video.className = state.facing === "user" ? "front" : "back";
    camError.classList.remove("show");
    video.style.display = "block";
    state.demo = false;
    demoBtn.classList.remove("on");
  } catch (err) {
    camError.classList.add("show");
  }
}

function stopDemo() {
  cancelAnimationFrame(demoRaf);
  demoCanvas.style.display = "none";
}

function startDemo() {
  state.demo = true;
  demoBtn.classList.add("on");
  camError.classList.remove("show");
  video.style.display = "none";
  demoCanvas.style.display = "block";
  const emojis = ["🎉", "😎", "💖", "🌈", "⭐", "🎈"];
  const t0 = performance.now();
  const loop = (t) => {
    const ctx = demoCanvas.getContext("2d");
    const { accent, accent2 } = themeColors();
    const w = demoCanvas.width;
    const h = demoCanvas.height;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#241f36");
    g.addColorStop(1, "#3d3358");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const elapsed = (t - t0) / 1000;
    for (let i = 0; i < 6; i++) {
      const x = w / 2 + Math.cos(elapsed * 0.7 + i) * (260 + i * 22);
      const y = h / 2 + Math.sin(elapsed * 0.9 + i * 1.6) * (190 + i * 14);
      ctx.beginPath();
      ctx.arc(x, y, 90 - i * 8, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? accent : accent2;
      ctx.globalAlpha = 0.35;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = "140px serif";
    ctx.fillText(emojis[Math.floor(elapsed) % emojis.length], w / 2, h / 2 + 50);
    ctx.font = "600 34px Fredoka, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("Mode Uji Coba 🧪", w / 2, h - 60);
    demoRaf = requestAnimationFrame(loop);
  };
  demoRaf = requestAnimationFrame(loop);
}

function getSource() {
  return state.demo ? demoCanvas : video;
}

function mirrorNeeded() {
  return !state.demo && state.facing === "user";
}

function drawSource(ctx, w, h) {
  const src = getSource();
  ctx.save();
  if (mirrorNeeded()) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  const sw = src.videoWidth || src.width;
  const sh = src.videoHeight || src.height;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  ctx.restore();
}

function drawFrame(ctx, w, h, frameId) {
  if (frameId === "none") return;
  const { accent, accent2 } = themeColors();
  const t = Math.max(12, Math.round(w * 0.028));
  ctx.save();
  ctx.lineWidth = t;
  const inset = t / 2 + 2;
  if (frameId === "solid") {
    ctx.strokeStyle = accent;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  } else if (frameId === "dashed") {
    ctx.strokeStyle = accent;
    ctx.setLineDash([t * 2, t * 1.4]);
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  } else if (frameId === "dots") {
    ctx.strokeStyle = accent2;
    ctx.lineWidth = t;
    ctx.setLineDash([1, t * 2]);
    ctx.lineCap = "round";
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.strokeRect(inset + t * 0.9, inset + t * 0.9, w - (inset + t * 0.9) * 2, h - (inset + t * 0.9) * 2);
  } else if (frameId === "neon") {
    ctx.strokeStyle = "#ffffff";
    ctx.shadowColor = accent;
    ctx.shadowBlur = 28;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawSticker(ctx, w, h) {
  if (!state.sticker) return;
  ctx.save();
  ctx.font = `${Math.round(w * 0.14)}px serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(state.sticker, w * 0.05, h - h * 0.05);
  ctx.restore();
}

function snapCanvas() {
  const w = 1280;
  const h = 960;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.filter = state.filter.css;
  drawSource(ctx, w, h);
  ctx.filter = "none";
  drawFrame(ctx, w, h, state.frame);
  drawSticker(ctx, w, h);
  return canvas;
}

function flash() {
  flashEl.classList.remove("go");
  void flashEl.offsetWidth;
  flashEl.classList.add("go");
}

async function runCountdown(extra = "") {
  if (!state.countdownOn) return;
  countdownEl.classList.add("show");
  for (const n of ["3", "2", "1"]) {
    countdownEl.textContent = extra ? `${n}` : n;
    await sleep(900);
  }
  countdownEl.classList.remove("show");
  countdownEl.textContent = "";
}

async function captureSingle() {
  await runCountdown();
  flash();
  await sleep(120);
  const url = snapCanvas().toDataURL("image/png");
  addShot(url, "single");
}

async function captureStrip() {
  const parts = [];
  for (let i = 1; i <= 4; i++) {
    if (state.countdownOn) {
      countdownEl.classList.add("show");
      countdownEl.textContent = `${i}/4`;
      await sleep(950);
      countdownEl.classList.remove("show");
    } else {
      await sleep(500);
    }
    flash();
    await sleep(120);
    parts.push(snapCanvas());
  }
  const url = composeStrip(parts);
  addShot(url, "strip");
}

function composeStrip(parts) {
  const colors = themeColors();
  const W = 520;
  const pad = 22;
  const gap = 14;
  const caption = captionInput.value.trim();
  const capH = caption ? 96 : 44;
  const photoH = Math.round(((W - pad * 2) * 3) / 4);
  const H = pad + parts.length * photoH + (parts.length - 1) * gap + capH + pad;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = colors.panel === "#1e1e1e" ? "#141414" : "#ffffff";
  ctx.fillRect(0, 0, W, H);

  parts.forEach((part, i) => {
    const y = pad + i * (photoH + gap);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, y, W - pad * 2, photoH);
    ctx.clip();
    ctx.drawImage(part, 0, 0, part.width, part.height, pad, y, W - pad * 2, photoH);
    ctx.restore();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(pad, y, W - pad * 2, photoH);
  });

  const textY = H - pad - capH / 2 + 10;
  ctx.textAlign = "center";
  ctx.fillStyle = colors.text;
  ctx.font = "700 40px Fredoka, sans-serif";
  ctx.fillText(caption || "SnapBooth 💛", W / 2, textY);
  ctx.fillStyle = colors.accent;
  ctx.font = "500 20px Fredoka, sans-serif";
  ctx.fillText("📸 SNAPBOOTH", W / 2, H - pad + 4);

  const stripCanvas = document.createElement("canvas");
  stripCanvas.width = W;
  stripCanvas.height = H;
  const sctx = stripCanvas.getContext("2d");
  sctx.drawImage(canvas, 0, 0);
  drawFrame(sctx, W, H, state.frame);
  return stripCanvas.toDataURL("image/png");
}

function addShot(url, type) {
  const shot = { id: Date.now() + Math.random(), url, type };
  state.shots.push(shot);
  state.selectedId = shot.id;
  renderShots();
}

function renderShots() {
  shotsEl.innerHTML = "";
  if (!state.shots.length) {
    shotsEl.innerHTML = `<p class="shots-empty">Belum ada foto. Klik tombol besar buat mulai!</p>`;
    downloadBtn.disabled = true;
    return;
  }
  state.shots.forEach((s) => {
    const img = document.createElement("img");
    img.src = s.url;
    img.className = "shot" + (s.type === "strip" ? " strip-shot" : "");
    if (s.id === state.selectedId) img.style.borderColor = "var(--accent)";
    img.onclick = () => {
      state.selectedId = s.id;
      renderShots();
    };
    shotsEl.appendChild(img);
  });
  downloadBtn.disabled = false;
}

function downloadSelected() {
  const shot = state.shots.find((s) => s.id === state.selectedId) || state.shots.at(-1);
  if (!shot) return;
  const a = document.createElement("a");
  a.href = shot.url;
  a.download = `snapbooth-${shot.type}-${Date.now()}.png`;
  a.click();
}

async function shoot() {
  if (state.busy) return;
  state.busy = true;
  shutterBtn.disabled = true;
  try {
    if (state.mode === "single") await captureSingle();
    else await captureStrip();
  } finally {
    state.busy = false;
    shutterBtn.disabled = false;
  }
}

function buildFilters() {
  FILTERS.forEach((f, i) => {
    const btn = document.createElement("button");
    btn.className = "filter-opt" + (i === 0 ? " active" : "");
    btn.dataset.id = f.id;
    const preview = document.createElement("i");
    preview.style.filter = f.css === "none" ? "none" : f.css;
    btn.appendChild(preview);
    const label = document.createElement("span");
    label.textContent = f.name;
    btn.appendChild(label);
    btn.onclick = () => {
      state.filter = f;
      document.querySelectorAll(".filter-opt").forEach((b) => b.classList.toggle("active", b === btn));
      video.style.filter = f.css;
      demoCanvas.style.filter = f.css;
    };
    filterGrid.appendChild(btn);
  });
}

function buildFrames() {
  FRAMES.forEach((id) => {
    const btn = document.createElement("button");
    btn.className = "frame-opt" + (id === state.frame ? " active" : "");
    btn.dataset.frame = id;
    btn.title = id;
    btn.onclick = () => {
      state.frame = id;
      frameOverlay.dataset.frame = id;
      document.querySelectorAll(".frame-opt").forEach((b) => b.classList.toggle("active", b === btn));
    };
    frameGrid.appendChild(btn);
  });
  frameOverlay.dataset.frame = state.frame;
}

function buildStickers() {
  const none = document.createElement("button");
  none.className = "sticker active";
  none.textContent = "❌";
  none.title = "Tanpa stiker";
  none.onclick = () => {
    state.sticker = "";
    document.querySelectorAll(".sticker").forEach((b) => b.classList.remove("active"));
    none.classList.add("active");
  };
  stickerRow.appendChild(none);
  STICKERS.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "sticker";
    btn.textContent = s;
    btn.onclick = () => {
      state.sticker = s;
      document.querySelectorAll(".sticker").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    };
    stickerRow.appendChild(btn);
  });
}

shutterBtn.onclick = shoot;
flipBtn.onclick = async () => {
  state.facing = state.facing === "user" ? "environment" : "user";
  await startCamera();
};
countdownBtn.onclick = () => {
  state.countdownOn = !state.countdownOn;
  countdownBtn.classList.toggle("on", state.countdownOn);
  countdownBtn.textContent = state.countdownOn ? "⏱️ 3s" : "⏱️ Off";
};
demoBtn.onclick = () => {
  if (state.demo) startCamera();
  else startDemo();
};
themeSelect.onchange = () => {
  document.body.dataset.theme = themeSelect.value;
};
downloadBtn.onclick = downloadSelected;
clearBtn.onclick = () => {
  state.shots = [];
  state.selectedId = null;
  renderShots();
};
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.onclick = () => {
    state.mode = btn.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.toggle("active", b === btn));
  };
});

buildFilters();
buildFrames();
buildStickers();
countdownBtn.classList.add("on");
renderShots();
startCamera();
