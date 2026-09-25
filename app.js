const video = document.getElementById("video");
const viewfinder = document.getElementById("viewfinder");
const frameOverlay = document.getElementById("frameOverlay");
const stickerFloat = document.getElementById("stickerFloat");
const countdownEl = document.getElementById("countdown");
const flashEl = document.getElementById("flash");
const camError = document.getElementById("camError");
const shutterBtn = document.getElementById("shutterBtn");
const shutterHint = document.getElementById("shutterHint");
const vfBadge = document.getElementById("vfBadge");
const flipBtn = document.getElementById("flipBtn");
const countdownBtn = document.getElementById("countdownBtn");
const demoBtn = document.getElementById("demoBtn");
const themeSelect = document.getElementById("themeSelect");
const filterGrid = document.getElementById("filterGrid");
const frameGrid = document.getElementById("frameGrid");
const stickerRow = document.getElementById("stickerRow");
const layoutGrid = document.getElementById("layoutGrid");
const layoutCount = document.getElementById("layoutCount");
const captionInput = document.getElementById("captionInput");
const shotsEl = document.getElementById("shots");
const shotsCount = document.getElementById("shotsCount");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

const FILTERS = [
  { id: "none", name: "Normal", css: "none" },
  { id: "mono", name: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "noir", name: "Noir", css: "grayscale(1) contrast(1.6) brightness(.92)" },
  { id: "retro", name: "Retro", css: "sepia(.75) contrast(1.08) saturate(1.15)" },
  { id: "warm", name: "Warm", css: "saturate(1.4) hue-rotate(-12deg) brightness(1.05)" },
  { id: "cool", name: "Cool", css: "saturate(1.2) hue-rotate(16deg) brightness(1.03)" },
  { id: "vivid", name: "Vivid", css: "saturate(2) contrast(1.15)" },
  { id: "dreamy", name: "Dreamy", css: "blur(.7px) brightness(1.12) saturate(1.3)" },
  { id: "sakura", name: "Sakura", css: "hue-rotate(315deg) saturate(1.35) brightness(1.08)" },
  { id: "sunset", name: "Sunset", css: "sepia(.35) saturate(1.7) hue-rotate(-18deg) brightness(1.05)" },
  { id: "ocean", name: "Ocean", css: "hue-rotate(155deg) saturate(1.35) brightness(1.04)" },
  { id: "frost", name: "Frost", css: "saturate(.85) brightness(1.16) contrast(1.05)" },
  { id: "faded", name: "Faded", css: "contrast(.85) brightness(1.12) saturate(.85)" },
  { id: "pop", name: "Pop Art", css: "contrast(1.35) saturate(1.8)" },
  { id: "invert", name: "Negative", css: "invert(1)" },
  { id: "soft", name: "Soft Glow", css: "brightness(1.1) saturate(1.12) blur(.3px)" },
];

const FRAMES = ["none", "solid", "dashed", "dots", "neon"];
const STICKERS = ["💖", "⭐", "🌈", "🎈", "🎉", "😎", "🌸", "👑", "🦄", "🍭", "🔥", "💜"];

const LAYOUTS = [
  { id: "strip4", name: "Strip 4", gw: 1, gh: 4, rects: [[0, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1], [0, 3, 1, 1]] },
  { id: "strip3", name: "Strip 3", gw: 1, gh: 3, rects: [[0, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1]] },
  { id: "strip2", name: "Strip 2", gw: 1, gh: 2, rects: [[0, 0, 1, 1], [0, 1, 1, 1]] },
  { id: "grid22", name: "Grid 2×2", gw: 2, gh: 2, rects: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  { id: "grid23", name: "Grid 2×3", gw: 2, gh: 3, rects: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1]] },
  { id: "hero3", name: "Hero 3", gw: 2, gh: 2, rects: [[0, 0, 2, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  { id: "side3", name: "Samping 3", gw: 2, gh: 2, rects: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
  { id: "row3", name: "Baris 3", gw: 3, gh: 1, rects: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1]] },
  { id: "wide2", name: "Lebar 2", gw: 2, gh: 1, rects: [[0, 0, 1, 1], [1, 0, 1, 1]] },
];

const state = {
  filter: FILTERS[0],
  frame: "solid",
  mode: "single",
  layout: LAYOUTS[0],
  countdownOn: true,
  facing: "user",
  demo: false,
  sticker: "",
  stickerPos: { x: 0.76, y: 0.7 },
  stream: null,
  busy: false,
  shots: [],
  selectedId: null,
};

const demoCanvas = document.createElement("canvas");
demoCanvas.width = 960;
demoCanvas.height = 720;
demoCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:none;transition:filter .25s;";
viewfinder.appendChild(demoCanvas);
demoCanvas.style.zIndex = "2";
let demoRaf = 0;

function themeColors() {
  const cs = getComputedStyle(document.body);
  return {
    accent: cs.getPropertyValue("--accent").trim(),
    accent2: cs.getPropertyValue("--accent-2").trim(),
    panel: cs.getPropertyValue("--panel-solid").trim() || "#ffffff",
    text: cs.getPropertyValue("--text").trim(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

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
    video.style.filter = state.filter.css;
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
  demoCanvas.style.filter = state.filter.css;
  const emojis = ["🎉", "😎", "💖", "🌈", "⭐", "🎈", "🦄"];
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
    ctx.font = "700 36px Fredoka, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("Mode Uji Coba 🧪", w / 2, h - 58);
    demoRaf = requestAnimationFrame(loop);
  };
  demoRaf = requestAnimationFrame(loop);
}

const getSource = () => (state.demo ? demoCanvas : video);
const mirrorNeeded = () => !state.demo && state.facing === "user";

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

function drawCover(ctx, src, dx, dy, dw, dh) {
  const sw = src.width;
  const sh = src.height;
  const scale = Math.max(dw / sw, dh / sh);
  const cw = dw / scale;
  const ch = dh / scale;
  ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, dx, dy, dw, dh);
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
  ctx.font = `${Math.round(w * 0.15)}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,.4)";
  ctx.shadowBlur = 14;
  ctx.fillText(state.sticker, state.stickerPos.x * w, state.stickerPos.y * h);
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

async function captureSingle() {
  if (state.countdownOn) {
    countdownEl.classList.add("show");
    for (const n of ["3", "2", "1"]) {
      countdownEl.textContent = n;
      await sleep(850);
    }
    countdownEl.classList.remove("show");
    countdownEl.textContent = "";
  }
  flash();
  await sleep(120);
  addShot(snapCanvas().toDataURL("image/png"), "single");
}

async function captureCollage() {
  const parts = [];
  const total = state.layout.rects.length;
  for (let i = 1; i <= total; i++) {
    if (state.countdownOn) {
      countdownEl.classList.add("show");
      countdownEl.textContent = `${i}/${total}`;
      await sleep(950);
      countdownEl.classList.remove("show");
      countdownEl.textContent = "";
    } else {
      countdownEl.classList.add("show");
      countdownEl.textContent = `${i}/${total}`;
      await sleep(550);
      countdownEl.classList.remove("show");
      countdownEl.textContent = "";
    }
    flash();
    await sleep(120);
    parts.push(snapCanvas());
  }
  addShot(composeCollage(state.layout, parts), "collage");
}

function composeCollage(layout, parts) {
  const colors = themeColors();
  const cell = 340;
  const pad = 26;
  const gap = 14;
  const caption = captionInput.value.trim();
  const capH = caption ? 104 : 56;
  const W = layout.gw * cell + (layout.gw - 1) * gap + pad * 2;
  const H = layout.gh * cell + (layout.gh - 1) * gap + pad * 2 + capH;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = colors.text.startsWith("#f") ? "#141414" : "#ffffff";
  ctx.fillRect(0, 0, W, H);

  layout.rects.forEach((r, i) => {
    const [rx, ry, rw, rh] = r;
    const x = pad + rx * (cell + gap);
    const y = pad + ry * (cell + gap);
    const w = rw * cell + (rw - 1) * gap;
    const h = rh * cell + (rh - 1) * gap;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    drawCover(ctx, parts[i], x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = colors.text;
  ctx.font = "700 42px Fredoka, sans-serif";
  ctx.fillText(caption || "Cekrek! 📸", W / 2, H - capH + (caption ? 46 : 34));
  ctx.fillStyle = colors.accent;
  ctx.font = "600 19px Fredoka, sans-serif";
  ctx.fillText("✦ CEKREK! ✦", W / 2, H - 18);

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const octx = out.getContext("2d");
  octx.drawImage(canvas, 0, 0);
  drawFrame(octx, W, H, state.frame);
  return out.toDataURL("image/png");
}

function addShot(url, type) {
  const shot = { id: Date.now() + Math.random(), url, type };
  state.shots.push(shot);
  state.selectedId = shot.id;
  renderShots();
}

function renderShots() {
  shotsEl.innerHTML = "";
  shotsCount.textContent = state.shots.length;
  if (!state.shots.length) {
    shotsEl.innerHTML = `<p class="shots-empty">Belum ada foto. Klik tombol besar buat mulai!</p>`;
    downloadBtn.disabled = true;
    return;
  }
  state.shots.forEach((s) => {
    const wrap = document.createElement("div");
    wrap.className = "shot-wrap" + (s.type !== "single" ? " col-strip" : "");
    const img = document.createElement("img");
    img.src = s.url;
    img.className = "shot" + (s.id === state.selectedId ? " selected" : "");
    img.onclick = () => {
      state.selectedId = s.id;
      renderShots();
    };
    const del = document.createElement("button");
    del.className = "shot-del";
    del.textContent = "✕";
    del.onclick = (e) => {
      e.stopPropagation();
      state.shots = state.shots.filter((x) => x.id !== s.id);
      if (state.selectedId === s.id) state.selectedId = state.shots.at(-1)?.id ?? null;
      renderShots();
    };
    wrap.appendChild(img);
    wrap.appendChild(del);
    shotsEl.appendChild(wrap);
  });
  downloadBtn.disabled = false;
}

function downloadSelected() {
  const shot = state.shots.find((s) => s.id === state.selectedId) || state.shots.at(-1);
  if (!shot) return;
  const a = document.createElement("a");
  a.href = shot.url;
  a.download = `cekrek-${shot.type}-${Date.now()}.png`;
  a.click();
}

async function shoot() {
  if (state.busy) return;
  state.busy = true;
  shutterBtn.disabled = true;
  try {
    if (state.mode === "single") await captureSingle();
    else await captureCollage();
  } finally {
    state.busy = false;
    shutterBtn.disabled = false;
  }
}

function updateModeUI() {
  document.querySelectorAll(".mode-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === state.mode);
  });
  if (state.mode === "single") {
    vfBadge.textContent = "Single";
    shutterHint.textContent = "Klik buat selfie!";
  } else {
    vfBadge.textContent = `Kolase · ${state.layout.name} (${state.layout.rects.length} foto)`;
    shutterHint.textContent = `Ambil ${state.layout.rects.length} foto berturut-turut`;
  }
  layoutCount.textContent = state.mode === "collage" ? `aktif: ${state.layout.name}` : "";
}

function setMode(mode) {
  state.mode = mode;
  updateModeUI();
}

function buildFilters() {
  FILTERS.forEach((f, i) => {
    const btn = document.createElement("button");
    btn.className = "filter-opt" + (i === 0 ? " active" : "");
    btn.dataset.id = f.id;
    const preview = document.createElement("i");
    preview.style.filter = f.css === "none" ? "none" : f.css;
    btn.appendChild(preview);
    const tick = document.createElement("b");
    tick.className = "tick";
    tick.textContent = "✅";
    btn.appendChild(tick);
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
  none.onclick = () => selectSticker("", none);
  stickerRow.appendChild(none);
  STICKERS.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "sticker";
    btn.textContent = s;
    btn.onclick = () => selectSticker(s, btn);
    stickerRow.appendChild(btn);
  });
}

function selectSticker(s, btn) {
  state.sticker = s;
  document.querySelectorAll(".sticker").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  stickerFloat.textContent = s || "";
  stickerFloat.classList.toggle("show", !!s);
  applyStickerPos();
}

function applyStickerPos() {
  stickerFloat.style.left = `${state.stickerPos.x * 100}%`;
  stickerFloat.style.top = `${state.stickerPos.y * 100}%`;
}

function buildLayouts() {
  LAYOUTS.forEach((layout, idx) => {
    const btn = document.createElement("button");
    btn.className = "layout-opt" + (idx === 0 ? " active" : "");
    const mini = document.createElement("div");
    mini.className = "layout-mini";
    layout.rects.forEach(([rx, ry, rw, rh]) => {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.style.left = `${(rx / layout.gw) * 100}%`;
      cellEl.style.top = `${(ry / layout.gh) * 100}%`;
      cellEl.style.width = `calc(${(rw / layout.gw) * 100}% - 2px)`;
      cellEl.style.height = `calc(${(rh / layout.gh) * 100}% - 2px)`;
      mini.appendChild(cellEl);
    });
    const label = document.createElement("span");
    label.textContent = `${layout.name} · ${layout.rects.length} foto`;
    btn.appendChild(mini);
    btn.appendChild(label);
    btn.onclick = () => {
      state.layout = layout;
      document.querySelectorAll(".layout-opt").forEach((b) => b.classList.toggle("active", b === btn));
      setMode("collage");
    };
    layoutGrid.appendChild(btn);
  });
}

function setupStickerDrag() {
  stickerFloat.addEventListener("pointerdown", (e) => {
    if (!state.sticker) return;
    e.preventDefault();
    stickerFloat.classList.add("dragging");
    const rect = viewfinder.getBoundingClientRect();
    const move = (ev) => {
      state.stickerPos = {
        x: clamp((ev.clientX - rect.left) / rect.width, 0.07, 0.93),
        y: clamp((ev.clientY - rect.top) / rect.height, 0.1, 0.93),
      };
      applyStickerPos();
    };
    const up = () => {
      stickerFloat.classList.remove("dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".tab-pane").forEach((p) => {
        p.classList.toggle("active", p.dataset.pane === tab.dataset.tab);
      });
    };
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
  btn.onclick = () => setMode(btn.dataset.mode);
});

buildFilters();
buildFrames();
buildStickers();
buildLayouts();
setupStickerDrag();
setupTabs();
updateModeUI();
renderShots();
applyStickerPos();
startCamera();
