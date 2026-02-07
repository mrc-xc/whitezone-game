// ====== WHITE ZONE 狀態貼紙互動（手機友善）======
// 拖曳：單指
// 縮放/旋轉：雙指（像 IG 貼紙）
// 截圖：輸出 1080x1920（IG Story 尺寸）

const ASSETS = {
  base: { src: "./assets/base/ghost-base.png", name: "宇宙吞噬者（本體）" },
  items: [
    { id:"vr",     src:"./assets/items/item-vr.png",     name:"視線濾鏡（VR）" },
    { id:"rice",   src:"./assets/items/item-rice.png",   name:"糧序波紋（稻米）" },
    { id:"plant",  src:"./assets/items/item-plant.png",  name:"靜默繁殖（植物）" },
    { id:"fire",   src:"./assets/items/item-fire.png",   name:"無標記燃點（火焰）" },
    { id:"grape",  src:"./assets/items/item-grape.png",  name:"甜度偏差（葡萄）" },
    { id:"cloud",  src:"./assets/items/item-cloud.png",  name:"視線遮罩（雲）" },
    { id:"tern",   src:"./assets/items/item-tern.png",   name:"回聲翼（小燕鷗）" },
    { id:"bus",    src:"./assets/items/item-bus.png",    name:"遺落班次（舊公車）" },
    { id:"tea",    src:"./assets/items/item-tea.png",    name:"茶席殘響（茶葉）" },
    { id:"cane",   src:"./assets/items/item-cane.png",   name:"緩行權杖（拐杖）" },
    { id:"cape",   src:"./assets/items/item-cape.png",   name:"不可見披覆（披風）" },
    { id:"broom",  src:"./assets/items/item-broom.png",  name:"清掃者偽裝（掃帚）" },
    { id:"tail",   src:"./assets/items/item-tail.png",   name:"邊界尾跡（尾巴）" },
    { id:"saturn", src:"./assets/items/item-saturn.png", name:"邊界軌道群（土星環）" },
  ],
};

const tray = document.getElementById("tray");
const canvas = document.getElementById("canvas");
const selectedText = document.getElementById("selectedText");

const btnFront = document.getElementById("btnFront");
const btnDelete = document.getElementById("btnDelete");
const btnClear = document.getElementById("btnClear");
const btnExport = document.getElementById("btnExport");

let selectedSticker = null;
let zTop = 10;

// ========== 建立側欄項目 ==========
function addTrayItem(entry, isBase=false){
  const div = document.createElement("div");
  div.className = "item";
  div.innerHTML = `
    <img alt="${entry.name}" src="${entry.src}">
    <div class="label">${entry.name}</div>
  `;
  div.addEventListener("click", () => {
    const s = spawnSticker(entry.src, entry.name, isBase);
    selectSticker(s);
  });
  tray.appendChild(div);
}

// 先放本體在第一格
addTrayItem(ASSETS.base, true);
ASSETS.items.forEach(i => addTrayItem(i, false));

// ========== 生成貼紙 ==========
function spawnSticker(src, name, isBase){
  const wrap = document.createElement("div");
  wrap.className = "sticker";
  wrap.dataset.name = name;
  wrap.style.zIndex = String(++zTop);

  const img = document.createElement("img");
  img.src = src;
  img.alt = name;

  // 初始大小：本體大一點
  img.style.width = isBase ? "360px" : "240px";

  wrap.appendChild(img);
  canvas.appendChild(wrap);

  // 初始狀態（中心）
  const state = {
    x: canvas.clientWidth / 2,
    y: canvas.clientHeight / 2,
    scale: 1,
    rot: 0,
  };
  wrap._state = state;
  applyTransform(wrap);

  // 點一下選取
  wrap.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    selectSticker(wrap);
  });

  // 手勢
  attachGesture(wrap);

  return wrap;
}

function applyTransform(wrap){
  const s = wrap._state;
  wrap.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%) rotate(${s.rot}rad) scale(${s.scale})`;
}

function selectSticker(wrap){
  if(selectedSticker) selectedSticker.classList.remove("selected");
  selectedSticker = wrap;
  if(selectedSticker){
    selectedSticker.classList.add("selected");
    selectedText.textContent = `已選取：${selectedSticker.dataset.name}`;
  }else{
    selectedText.textContent = "已選取：無";
  }
}

// 點空白取消選取
canvas.addEventListener("pointerdown", () => selectSticker(null));

// ========== 置頂 / 刪除 / 清空 ==========
btnFront.addEventListener("click", () => {
  if(!selectedSticker) return;
  selectedSticker.style.zIndex = String(++zTop);
});

btnDelete.addEventListener("click", () => {
  if(!selectedSticker) return;
  selectedSticker.remove();
  selectedSticker = null;
  selectedText.textContent = "已選取：無";
});

btnClear.addEventListener("click", () => {
  canvas.innerHTML = "";
  selectedSticker = null;
  selectedText.textContent = "已選取：無";
  zTop = 10;
});

// ========== 手勢（IG 貼紙感） ==========
function attachGesture(wrap){
  const pointers = new Map();

  let start = null;

  wrap.addEventListener("pointerdown", (e) => {
    wrap.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

    const s = wrap._state;

    if(pointers.size === 1){
      // 單指拖曳
      const p = [...pointers.values()][0];
      start = {
        mode:"drag",
        sx:p.x, sy:p.y,
        x:s.x, y:s.y,
        scale:s.scale,
        rot:s.rot
      };
    } else if(pointers.size === 2){
      // 雙指：縮放+旋轉
      const [a,b] = [...pointers.values()];
      start = {
        mode:"pinch",
        x:s.x, y:s.y,
        scale:s.scale,
        rot:s.rot,
        dist: dist(a,b),
        ang: angle(a,b)
      };
    }
  });

  wrap.addEventListener("pointermove", (e) => {
    if(!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    const s = wrap._state;

    if(!start) return;

    if(pointers.size === 1 && start.mode === "drag"){
      const p = [...pointers.values()][0];
      const dx = p.x - start.sx;
      const dy = p.y - start.sy;

      s.x = clamp(start.x + dx, 0, canvas.clientWidth);
      s.y = clamp(start.y + dy, 0, canvas.clientHeight);
      applyTransform(wrap);
    }

    if(pointers.size === 2){
      const [a,b] = [...pointers.values()];
      const d = dist(a,b);
      const ang = angle(a,b);

      // 以中心為基準縮放旋轉
      const scaleFactor = d / start.dist;
      s.scale = clamp(start.scale * scaleFactor, 0.2, 6);

      const deltaAng = ang - start.ang;
      s.rot = start.rot + deltaAng;

      applyTransform(wrap);
    }
  });

  wrap.addEventListener("pointerup", (e) => {
    pointers.delete(e.pointerId);
    if(pointers.size === 0){
      start = null;
    }else if(pointers.size === 1){
      // 從雙指回單指：重新定義 drag 起點
      const s = wrap._state;
      const p = [...pointers.values()][0];
      start = {
        mode:"drag",
        sx:p.x, sy:p.y,
        x:s.x, y:s.y,
        scale:s.scale,
        rot:s.rot
      };
    }
  });

  wrap.addEventListener("pointercancel", (e) => {
    pointers.delete(e.pointerId);
    if(pointers.size === 0) start = null;
  });
}

function dist(a,b){
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx,dy);
}
function angle(a,b){
  return Math.atan2(b.y - a.y, b.x - a.x);
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

// ========== IG 截圖輸出 1080x1920 ==========
btnExport.addEventListener("click", async () => {
  const W = 1080, H = 1920;
  const exportCanvas = document.getElementById("exportCanvas");
  exportCanvas.width = W;
  exportCanvas.height = H;
  const ctx = exportCanvas.getContext("2d");

  // 背景：取目前 bg 圖（cover 效果）
  const bgImg = await loadImg(document.getElementById("bg").src);
  drawCover(ctx, bgImg, 0, 0, W, H);

  // 依 zIndex 排序貼紙再畫上去
  const stickers = [...canvas.querySelectorAll(".sticker")]
    .sort((a,b)=> (parseInt(a.style.zIndex||"0") - parseInt(b.style.zIndex||"0")));

  // 把畫布座標映射到輸出座標
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const scaleX = W / cw;
  const scaleY = H / ch;

  for(const st of stickers){
    const s = st._state;
    const imgEl = st.querySelector("img");
    const img = await loadImg(imgEl.src);

    // 取原始顯示寬度（px）
    const baseW = parseFloat(imgEl.style.width || "240");
    const drawW = baseW * s.scale * scaleX;
    const drawH = (img.height / img.width) * drawW;

    const x = s.x * scaleX;
    const y = s.y * scaleY;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.rot);
    ctx.translate(-drawW/2, -drawH/2);
    ctx.drawImage(img, 0, 0, drawW, drawH);
    ctx.restore();
  }

  // 下載
  const url = exportCanvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "whitezone-story.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

function loadImg(src){
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function drawCover(ctx, img, x, y, w, h){
  const ir = img.width / img.height;
  const r = w / h;
  let dw, dh, dx, dy;
  if(ir > r){
    dh = h; dw = dh * ir;
    dx = x - (dw - w)/2; dy = y;
  }else{
    dw = w; dh = dw / ir;
    dx = x; dy = y - (dh - h)/2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

