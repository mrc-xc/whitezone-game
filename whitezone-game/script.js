/* =========================
   WHITE ZONE Sticker Game
   - Single finger: drag
   - Two fingers: pinch zoom + rotate (IG-like)
   - Works on mobile (Pointer Events)
========================= */

const PATHS = {
  bg: "./assets/bg/whitezone-bg.png",
  base: "./assets/base/ghost-base.png",
  itemsDir: "./assets/items/",
};

// ✅ 你「檔名照原本」，但遊戲內顯示中文更有世界觀
const ITEMS = [
  { id:"base", file: PATHS.base, name:"宇宙吞噬者（本體）", isBase:true },

  { id:"vr",     file: PATHS.itemsDir + "item-vr.png",     name:"視線遮罩（VR）" },
  { id:"rice",   file: PATHS.itemsDir + "item-rice.png",   name:"糧序波紋（稻米）" },
  { id:"plant",  file: PATHS.itemsDir + "item-plant.png",  name:"靜默繁殖（植物）" },
  { id:"fire",   file: PATHS.itemsDir + "item-fire.png",   name:"無標記燃點（火焰）" },
  { id:"grape",  file: PATHS.itemsDir + "item-grape.png",  name:"甜度偏差（葡萄）" },
  { id:"cloud",  file: PATHS.itemsDir + "item-cloud.png",  name:"視線遮罩（雲）" },
  { id:"tern",   file: PATHS.itemsDir + "item-tern.png",   name:"回聲翼（小燕鷗）" },
  { id:"bus",    file: PATHS.itemsDir + "item-bus.png",    name:"遺落班次（舊公車）" },
  { id:"tea",    file: PATHS.itemsDir + "item-tea.png",    name:"茶席殘響（茶葉）" },
  { id:"cane",   file: PATHS.itemsDir + "item-cane.png",   name:"緩行權杖（拐杖）" },
  { id:"cape",   file: PATHS.itemsDir + "item-cape.png",   name:"不可見披覆（披風）" },
  { id:"broom",  file: PATHS.itemsDir + "item-broom.png",  name:"清掃者偽裝（掃帚）" },
  { id:"tail",   file: PATHS.itemsDir + "item-tail.png",   name:"邊界尾跡（尾巴）" },
  { id:"saturn", file: PATHS.itemsDir + "item-saturn.png", name:"邊界軌道群（土星環）" },
];

const trayEl = document.getElementById("tray");
const stageEl = document.getElementById("stage");
const bgEl = document.getElementById("bg");
const selectedLabelEl = document.getElementById("selectedLabel");

const btnFront = document.getElementById("btnFront");
const btnDelete = document.getElementById("btnDelete");
const btnClear = document.getElementById("btnClear");
const btnShot = document.getElementById("btnShot");

let selectedSticker = null;
let zTop = 10;

// ---------- init background ----------
bgEl.src = PATHS.bg;

// ---------- build tray ----------
ITEMS.forEach(item => {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = item.id;

  const thumb = document.createElement("div");
  thumb.className = "thumb";

  const img = document.createElement("img");
  img.alt = item.name;
  img.src = item.file;

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = item.name;

  thumb.appendChild(img);
  card.appendChild(thumb);
  card.appendChild(name);

  card.addEventListener("click", () => addSticker(item));
  trayEl.appendChild(card);
});

// ---------- sticker logic ----------
function addSticker(item){
  const sticker = document.createElement("div");
  sticker.className = "sticker";
  sticker.style.zIndex = String(++zTop);

  const img = document.createElement("img");
  img.src = item.file;
  img.alt = item.name;

  // 本體稍微大一點比較合理
  if (item.isBase) {
    img.style.width = "360px";
  } else {
    img.style.width = "240px";
  }

  sticker.appendChild(img);
  stageEl.appendChild(sticker);

  // 初始狀態：置中 + 稍微偏下（比較像你想要的構圖）
  const init = {
    x: 0,
    y: item.isBase ? 120 : 0,
    scale: 1,
    rotation: 0,
  };

  sticker._t = init;
  applyTransform(sticker);

  makeInteractive(sticker, item.name);
  selectSticker(sticker, item.name);
}

function applyTransform(sticker){
  const t = sticker._t;
  sticker.style.transform =
    `translate(-50%, -50%) translate(${t.x}px, ${t.y}px) rotate(${t.rotation}rad) scale(${t.scale})`;
}

function selectSticker(sticker, name){
  if (selectedSticker && selectedSticker !== sticker){
    selectedSticker.classList.remove("selected");
  }
  selectedSticker = sticker;
  if (selectedSticker){
    selectedSticker.classList.add("selected");
    selectedLabelEl.textContent = `已選取：${name}`;
  }else{
    selectedLabelEl.textContent = "已選取：無";
  }
}

// 點空白取消選取
stageEl.addEventListener("pointerdown", (e) => {
  // 如果點到貼紙就不取消（貼紙會自己處理）
  const hitSticker = e.target.closest(".sticker");
  if (!hitSticker){
    if (selectedSticker) selectedSticker.classList.remove("selected");
    selectedSticker = null;
    selectedLabelEl.textContent = "已選取：無";
  }
});

// ---------- IG-like gestures (Pointer Events) ----------
function makeInteractive(sticker, displayName){
  const pointers = new Map(); // pointerId -> {x,y}
  let startT = null;

  sticker.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    selectSticker(sticker, displayName);
    sticker.setPointerCapture(e.pointerId);

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1){
      // drag start
      startT = {
        type: "drag",
        x0: e.clientX,
        y0: e.clientY,
        t0: { ...sticker._t },
      };
    } else if (pointers.size === 2){
      // pinch start
      const pts = [...pointers.values()];
      const d = dist(pts[0], pts[1]);
      const a = angle(pts[0], pts[1]);
      const mid = midpoint(pts[0], pts[1]);

      startT = {
        type: "pinch",
        d0: d,
        a0: a,
        mid0: mid,
        t0: { ...sticker._t },
      };
    }
  });

  sticker.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    e.preventDefault();

    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (!startT) return;

    if (pointers.size === 1 && startT.type === "drag"){
      const dx = e.clientX - startT.x0;
      const dy = e.clientY - startT.y0;
      sticker._t.x = startT.t0.x + dx;
      sticker._t.y = startT.t0.y + dy;
      applyTransform(sticker);
    }

    if (pointers.size === 2){
      const pts = [...pointers.values()];
      const d = dist(pts[0], pts[1]);
      const a = angle(pts[0], pts[1]);
      const mid = midpoint(pts[0], pts[1]);

      // 如果原本不是 pinch（例如先拖曳再放上第二指），重建 startT
      if (!startT || startT.type !== "pinch"){
        const d0 = d;
        const a0 = a;
        startT = {
          type: "pinch",
          d0,
          a0,
          mid0: mid,
          t0: { ...sticker._t },
        };
      }

      const scaleFactor = clamp(d / startT.d0, 0.25, 5);
      const rotDelta = a - startT.a0;

      sticker._t.scale = clamp(startT.t0.scale * scaleFactor, 0.25, 5);
      sticker._t.rotation = startT.t0.rotation + rotDelta;

      // 用雙指中點移動來平移
      sticker._t.x = startT.t0.x + (mid.x - startT.mid0.x);
      sticker._t.y = startT.t0.y + (mid.y - startT.mid0.y);

      applyTransform(sticker);
    }
  });

  function endPointer(e){
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);

    // 剩 1 指 → 轉成拖曳基準
    if (pointers.size === 1){
      const only = [...pointers.values()][0];
      startT = {
        type: "drag",
        x0: only.x,
        y0: only.y,
        t0: { ...sticker._t },
      };
    } else if (pointers.size === 0){
      startT = null;
    }
  }

  sticker.addEventListener("pointerup", endPointer);
  sticker.addEventListener("pointercancel", endPointer);
  sticker.addEventListener("pointerout", (e) => {
    // 不強制 end，避免滑出元素就中斷（手機很常發生）
  });
}

// ---------- buttons ----------
btnFront.addEventListener("click", () => {
  if (!selectedSticker) return;
  selectedSticker.style.zIndex = String(++zTop);
});

btnDelete.addEventListener("click", () => {
  if (!selectedSticker) return;
  selectedSticker.remove();
  selectedSticker = null;
  selectedLabelEl.textContent = "已選取：無";
});

btnClear.addEventListener("click", () => {
  // 刪除所有 sticker（保留背景）
  [...stageEl.querySelectorAll(".sticker")].forEach(el => el.remove());
  selectedSticker = null;
  selectedLabelEl.textContent = "已選取：無";
});

btnShot.addEventListener("click", async () => {
  // IG 4:5 1080x1350
  const targetW = 1080;
  const targetH = 1350;

  // 用 stage 畫面截圖，再縮放到 IG 尺寸
  const canvas = await html2canvas(stageEl, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
  });

  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;

  const ctx = out.getContext("2d");
  // cover 裁切：把 stage 填滿 4:5
  const srcW = canvas.width;
  const srcH = canvas.height;

  const srcRatio = srcW / srcH;
  const dstRatio = targetW / targetH;

  let sx=0, sy=0, sw=srcW, sh=srcH;
  if (srcRatio > dstRatio){
    // 太寬，裁左右
    sh = srcH;
    sw = sh * dstRatio;
    sx = (srcW - sw) / 2;
  }else{
    // 太高，裁上下
    sw = srcW;
    sh = sw / dstRatio;
    sy = (srcH - sh) / 2;
  }

  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const a = document.createElement("a");
  a.download = "whitezone-ig.png";
  a.href = out.toDataURL("image/png");
  a.click();
});

// ---------- utils ----------
function dist(p1, p2){
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}
function angle(p1, p2){
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}
function midpoint(p1, p2){
  return { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
}
function clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

