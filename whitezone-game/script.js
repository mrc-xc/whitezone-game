// =========================
// WHITE ZONE Sticker Game
// Mobile-first: drag + pinch zoom + rotate
// IG screenshot: 1080x1920 export
// Paths use RELATIVE ./assets/... for GitHub Pages
// =========================

const ASSETS = {
  bg: "./assets/bg/whitezone-bg.png",
  base: "./assets/base/ghost-base.png",
  itemsDir: "./assets/items/"
};

// ✅ 遊戲內顯示名（世界觀版）— 你要改中文就在這裡改
const STICKERS = [
  { id: "base", file: ASSETS.base, name: "宇宙吞噬者（本體）", isBase: true },

  { id: "vr",     file: ASSETS.itemsDir + "item-vr.png",     name: "視線遮罩（VR）" },
  { id: "rice",   file: ASSETS.itemsDir + "item-rice.png",   name: "糧序波紋（稻米）" },
  { id: "plant",  file: ASSETS.itemsDir + "item-plant.png",  name: "靜默繁殖（植物）" },
  { id: "fire",   file: ASSETS.itemsDir + "item-fire.png",   name: "無標記燃點（火焰）" },
  { id: "grape",  file: ASSETS.itemsDir + "item-grape.png",  name: "甜度偏差（葡萄）" },
  { id: "cloud",  file: ASSETS.itemsDir + "item-cloud.png",  name: "視線遮罩（雲）" },
  { id: "tern",   file: ASSETS.itemsDir + "item-tern.png",   name: "回聲翼（小燕鷗）" },
  { id: "bus",    file: ASSETS.itemsDir + "item-bus.png",    name: "遺落班次（舊公車）" },
  { id: "tea",    file: ASSETS.itemsDir + "item-tea.png",    name: "茶席殘響（茶葉）" },
  { id: "cane",   file: ASSETS.itemsDir + "item-cane.png",   name: "緩行權杖（拐杖）" },
  { id: "cape",   file: ASSETS.itemsDir + "item-cape.png",   name: "不可見披覆（披風）" },
  { id: "broom",  file: ASSETS.itemsDir + "item-broom.png",  name: "清掃者偽裝（掃帚）" },
  { id: "tail",   file: ASSETS.itemsDir + "item-tail.png",   name: "邊界尾跡（尾巴）" },
  { id: "saturn", file: ASSETS.itemsDir + "item-saturn.png", name: "邊界軌道群（土星環）" },
];

const itemGrid = document.getElementById("itemGrid");
const stage = document.getElementById("stage");
const bg = document.getElementById("bg");
const layers = document.getElementById("layers");
const pickedText = document.getElementById("pickedText");
const toast = document.getElementById("toast");

const btnToFront = document.getElementById("btnToFront");
const btnRemove  = document.getElementById("btnRemove");
const btnClear   = document.getElementById("btnClear");
const btnShot    = document.getElementById("btnShot");

bg.style.backgroundImage = `url("${ASSETS.bg}")`;

let selected = null;
let zCounter = 10;

// --- helpers ---
function showToast(msg){
  toast.textContent = msg;
  toast.style.opacity = "1";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.style.opacity="0", 1300);
}

function setPicked(name){
  pickedText.textContent = name ? `已選取：${name}` : `已選取：—`;
}

function clearSelection(){
  if(selected){
    selected.classList.remove("selected");
  }
  selected = null;
  setPicked(null);
}

function selectSticker(el){
  if(selected && selected !== el) selected.classList.remove("selected");
  selected = el;
  selected.classList.add("selected");
  setPicked(el.dataset.name || "—");
}

// --- render left panel ---
function makeTile(st){
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.innerHTML = `
    <div class="thumb"><img src="${st.file}" alt=""></div>
    <div class="name">${st.name}</div>
  `;
  tile.addEventListener("click", () => addStickerToStage(st));
  return tile;
}

STICKERS.forEach(s => itemGrid.appendChild(makeTile(s)));

// --- stage stickers ---
function createStickerEl(st){
  const wrap = document.createElement("div");
  wrap.className = "sticker";
  wrap.dataset.id = st.id;
  wrap.dataset.name = st.name;
  wrap.style.zIndex = String(++zCounter);

  // initial transform state
  const state = {
    x: stage.clientWidth * 0.55,
    y: stage.clientHeight * 0.58,
    scale: st.isBase ? 1.0 : 1.0,
    rotation: 0
  };

  // base initial position a bit lower, and slightly larger for mobile
  if(st.isBase){
    state.x = stage.clientWidth * 0.60;
    state.y = stage.clientHeight * 0.62;
    state.scale = 1.15;
  }

  wrap._state = state;

  const img = document.createElement("img");
  img.src = st.file;
  img.alt = st.name;
  img.draggable = false;

  // image load fallback log (helps debug if path wrong)
  img.addEventListener("error", () => {
    console.error("Image failed to load:", img.src);
    showToast("圖片路徑錯誤：請確認 assets 資料夾大小寫");
  });

  wrap.appendChild(img);

  applyTransform(wrap);

  // select on tap
  wrap.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    selectSticker(wrap);
  });

  enableGestures(wrap);

  return wrap;
}

function addStickerToStage(st){
  // base: only allow one
  if(st.isBase){
    const existingBase = layers.querySelector(`.sticker[data-id="base"]`);
    if(existingBase){
      selectSticker(existingBase);
      showToast("本體已在畫面中");
      return;
    }
  }
  const el = createStickerEl(st);
  layers.appendChild(el);
  selectSticker(el);
}

stage.addEventListener("pointerdown", () => clearSelection());

// --- transforms ---
function applyTransform(el){
  const s = el._state;
  // translate(-50%, -50%) to center anchor
  el.style.transform =
    `translate(${s.x}px, ${s.y}px) translate(-50%, -50%) rotate(${s.rotation}rad) scale(${s.scale})`;
}

// --- gesture system: 1 finger drag, 2 finger pinch+rotate ---
function enableGestures(el){
  const pointers = new Map();

  let start = null;

  function getPoint(e){
    return { x: e.clientX, y: e.clientY };
  }

  function dist(a,b){
    const dx=a.x-b.x, dy=a.y-b.y;
    return Math.hypot(dx,dy);
  }

  function angle(a,b){
    return Math.atan2(b.y-a.y, b.x-a.x);
  }

  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, getPoint(e));

    // on first contact, snapshot
    if(pointers.size === 1){
      const p = getPoint(e);
      start = {
        mode: "drag",
        p0: p,
        x0: el._state.x,
        y0: el._state.y
      };
    }

    // if two pointers, begin pinch
    if(pointers.size === 2){
      const pts = Array.from(pointers.values());
      const d0 = dist(pts[0], pts[1]);
      const a0 = angle(pts[0], pts[1]);
      start = {
        mode: "pinch",
        d0,
        a0,
        x0: el._state.x,
        y0: el._state.y,
        s0: el._state.scale,
        r0: el._state.rotation,
        // center of two fingers
        c0: { x: (pts[0].x+pts[1].x)/2, y: (pts[0].y+pts[1].y)/2 },
      };
    }
  });

  el.addEventListener("pointermove", (e) => {
    if(!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, getPoint(e));

    if(!start) return;

    if(start.mode === "drag" && pointers.size === 1){
      const p = getPoint(e);
      const dx = p.x - start.p0.x;
      const dy = p.y - start.p0.y;
      el._state.x = start.x0 + dx;
      el._state.y = start.y0 + dy;
      applyTransform(el);
    }

    if(pointers.size === 2){
      const pts = Array.from(pointers.values());
      const d1 = dist(pts[0], pts[1]);
      const a1 = angle(pts[0], pts[1]);
      const c1 = { x: (pts[0].x+pts[1].x)/2, y: (pts[0].y+pts[1].y)/2 };

      // start may still be drag from first pointer; convert to pinch
      if(start.mode !== "pinch"){
        start = {
          mode: "pinch",
          d0: d1,
          a0: a1,
          x0: el._state.x,
          y0: el._state.y,
          s0: el._state.scale,
          r0: el._state.rotation,
          c0: c1
        };
      }

      const scaleFactor = d1 / start.d0;
      el._state.scale = clamp(start.s0 * scaleFactor, 0.25, 4.0);

      const da = a1 - start.a0;
      el._state.rotation = start.r0 + da;

      // move along finger center
      el._state.x = start.x0 + (c1.x - start.c0.x);
      el._state.y = start.y0 + (c1.y - start.c0.y);

      applyTransform(el);
    }
  });

  el.addEventListener("pointerup", (e) => {
    pointers.delete(e.pointerId);
    if(pointers.size === 0){
      start = null;
    }
  });

  el.addEventListener("pointercancel", (e) => {
    pointers.delete(e.pointerId);
    if(pointers.size === 0){
      start = null;
    }
  });
}

function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }

// --- buttons ---
btnToFront.addEventListener("click", () => {
  if(!selected) return showToast("請先選取一個貼紙");
  selected.style.zIndex = String(++zCounter);
  showToast("已置頂");
});

btnRemove.addEventListener("click", () => {
  if(!selected) return showToast("請先選取一個貼紙");
  const isBase = selected.dataset.id === "base";
  selected.remove();
  selected = null;
  setPicked(null);
  showToast(isBase ? "本體已移除" : "已移除");
});

btnClear.addEventListener("click", () => {
  layers.innerHTML = "";
  clearSelection();
  showToast("已清空");
});

// --- IG Screenshot (1080x1920) ---
btnShot.addEventListener("click", async () => {
  try{
    showToast("正在輸出 1080×1920…");
    const dataURL = await exportIG(1080, 1920);
    downloadDataURL(dataURL, "WHITEZONE_IG_1080x1920.png");
    showToast("已輸出");
  }catch(err){
    console.error(err);
    showToast("截圖失敗：請用 Chrome / Safari");
  }
});

// Export function: draw bg + all stickers into canvas
async function exportIG(W, H){
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // draw background (cover)
  const bgImg = await loadImage(ASSETS.bg);
  drawCover(ctx, bgImg, 0, 0, W, H);

  // stage rect -> map sticker positions
  const stageRect = stage.getBoundingClientRect();

  // collect stickers sorted by z-index
  const all = Array.from(layers.querySelectorAll(".sticker"));
  all.sort((a,b) => (parseInt(a.style.zIndex||"0",10) - parseInt(b.style.zIndex||"0",10)));

  for(const el of all){
    const imgEl = el.querySelector("img");
    const img = await loadImage(imgEl.src);

    // parse transform state
    const s = el._state;

    // map from stage pixels to export pixels
    const sx = (s.x / stageRect.width) * W;
    const sy = (s.y / stageRect.height) * H;

    // base image visual width on stage (img css width) * scale
    const cssW = parseFloat(getComputedStyle(imgEl).width); // px on screen
    const scaleToExport = (W / stageRect.width);
    const drawW = cssW * s.scale * scaleToExport;
    const drawH = (img.height / img.width) * drawW;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(s.rotation);
    ctx.scale(1,1);
    ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

function drawCover(ctx, img, x, y, w, h){
  const ir = img.width / img.height;
  const cr = w / h;
  let dw, dh, dx, dy;
  if(ir > cr){
    dh = h;
    dw = dh * ir;
    dx = x - (dw - w)/2;
    dy = y;
  }else{
    dw = w;
    dh = dw / ir;
    dx = x;
    dy = y - (dh - h)/2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function downloadDataURL(dataURL, filename){
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// --- auto add base on start (so users see something immediately) ---
window.addEventListener("load", () => {
  // ensure stage size is ready
  addStickerToStage(STICKERS[0]); // base
  showToast("點左側加入狀態，像 IG 貼紙拖曳/縮放/旋轉");
});


