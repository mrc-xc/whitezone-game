// ====== 你的資產路徑（照你的資料夾） ======
const PATH_BG   = "assets/bg/whitezone-bg.png";
const PATH_BASE = "assets/base/ghost-base.png";

// 遊戲內顯示名（中文世界觀版）— 檔名不改
const ITEMS = [
  { file:"item-vr.png",     name:"視線遮罩（VR）" },
  { file:"item-rice.png",   name:"糧序波紋（稻米）" },
  { file:"item-plant.png",  name:"靜默繁殖（植物）" },
  { file:"item-fire.png",   name:"無標記燃點（火焰）" },
  { file:"item-grape.png",  name:"甜度偏差（葡萄）" },
  { file:"item-cloud.png",  name:"視線遮罩（雲）" },
  { file:"item-tern.png",   name:"回聲翼（小燕鷗）" },
  { file:"item-bus.png",    name:"遺落班次（舊公車）" },
  { file:"item-tea.png",    name:"茶席殘響（茶葉）" },
  { file:"item-cane.png",   name:"緩行權杖（拐杖）" },
  { file:"item-cape.png",   name:"不可見披覆（披風）" },
  { file:"item-broom.png",  name:"清掃者偽裝（掃帚）" },
  { file:"item-tail.png",   name:"邊界尾跡（尾巴）" },
  { file:"item-saturn.png", name:"邊界軌道群（土星環）" },
];

const $ = (s)=>document.querySelector(s);
const itemsGrid = $("#itemsGrid");
const stage = $("#stage");
const canvas = $("#canvas");
const selectedLabel = $("#selectedLabel");

$("#bg").src = PATH_BG;
$("#base").src = PATH_BASE;

let stickers = [];
let selectedId = null;

// ====== 建左側按鈕 ======
ITEMS.forEach((it)=>{
  const btn = document.createElement("button");
  btn.className = "itemBtn";
  btn.innerHTML = `
    <img src="assets/items/${it.file}" alt="${it.name}">
    <div class="name">${it.name}</div>
  `;
  btn.addEventListener("click", ()=> addSticker(it));
  itemsGrid.appendChild(btn);
});

// ====== 貼紙物件 ======
function addSticker(it){
  const id = crypto.randomUUID();
  const el = document.createElement("div");
  el.className = "sticker";
  el.dataset.id = id;

  const img = document.createElement("img");
  img.src = `assets/items/${it.file}`;
  img.alt = it.name;
  el.appendChild(img);

  // 初始狀態：放中間、適中大小
  const rect = stage.getBoundingClientRect();
  const state = {
    id,
    name: it.name,
    x: rect.width * 0.52,
    y: rect.height * 0.58,
    s: 1,
    r: 0,
    w: 180
  };

  el.style.width = state.w + "px";
  canvas.appendChild(el);

  stickers.push({ el, state, pointers:new Map() });
  selectSticker(id);
  renderSticker(id);
  bindGestures(id);
}

function selectSticker(id){
  selectedId = id;
  stickers.forEach(o=>{
    o.el.classList.toggle("selected", o.state.id === id);
  });
  const obj = stickers.find(o=>o.state.id===id);
  selectedLabel.textContent = obj ? `已選取：${obj.state.name}` : "已選取：—";
}

function renderSticker(id){
  const obj = stickers.find(o=>o.state.id===id);
  if(!obj) return;
  const {x,y,s,r,w} = obj.state;
  obj.el.style.width = w + "px";
  obj.el.style.transform = `translate(${x - w/2}px, ${y - w/2}px) rotate(${r}rad) scale(${s})`;
}

// ====== 手勢（單指拖曳 / 雙指縮放+旋轉） ======
function bindGestures(id){
  const obj = stickers.find(o=>o.state.id===id);
  const el = obj.el;
  const st = obj.state;

  const getPoint = (e)=>({ x:e.clientX, y:e.clientY });

  let start = null;

  el.addEventListener("pointerdown", (e)=>{
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    selectSticker(id);
    obj.pointers.set(e.pointerId, getPoint(e));

    if(obj.pointers.size === 1){
      const p = [...obj.pointers.values()][0];
      start = {
        mode:"drag",
        x0: st.x, y0: st.y,
        p0: p
      };
    }else if(obj.pointers.size === 2){
      const pts = [...obj.pointers.values()];
      const a = pts[0], b = pts[1];
      start = {
        mode:"pinch",
        x0: st.x, y0: st.y,
        s0: st.s, r0: st.r,
        dist0: dist(a,b),
        ang0: angle(a,b),
        mid0: mid(a,b)
      };
    }
  });

  el.addEventListener("pointermove", (e)=>{
    if(!obj.pointers.has(e.pointerId)) return;
    obj.pointers.set(e.pointerId, getPoint(e));

    if(obj.pointers.size === 1 && start?.mode==="drag"){
      const p = [...obj.pointers.values()][0];
      const dx = p.x - start.p0.x;
      const dy = p.y - start.p0.y;
      st.x = start.x0 + dx;
      st.y = start.y0 + dy;
      clampToStage(st);
      renderSticker(id);
    }

    if(obj.pointers.size === 2){
      const pts = [...obj.pointers.values()];
      const a = pts[0], b = pts[1];
      const d = dist(a,b);
      const ang = angle(a,b);
      const m = mid(a,b);

      if(!start || start.mode!=="pinch"){
        start = {
          mode:"pinch",
          x0: st.x, y0: st.y,
          s0: st.s, r0: st.r,
          dist0: d,
          ang0: ang,
          mid0: m
        };
      }

      const scale = d / (start.dist0 || d);
      st.s = clamp(start.s0 * scale, 0.25, 4);
      st.r = start.r0 + (ang - start.ang0);

      // 讓中心跟著兩指中點走（更像IG）
      st.x = start.x0 + (m.x - start.mid0.x);
      st.y = start.y0 + (m.y - start.mid0.y);

      clampToStage(st);
      renderSticker(id);
    }
  });

  const end = (e)=>{
    if(obj.pointers.has(e.pointerId)) obj.pointers.delete(e.pointerId);
    if(obj.pointers.size === 1){
      const p = [...obj.pointers.values()][0];
      start = { mode:"drag", x0: st.x, y0: st.y, p0: p };
    }else if(obj.pointers.size === 0){
      start = null;
    }
  };

  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

function clampToStage(st){
  const rect = stage.getBoundingClientRect();
  st.x = clamp(st.x, 0, rect.width);
  st.y = clamp(st.y, 0, rect.height);
}

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function angle(a,b){ return Math.atan2(b.y-a.y, b.x-a.x); }
function mid(a,b){ return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }

// ====== 置頂 / 移除 / 清空 ======
$("#btnFront").addEventListener("click", ()=>{
  if(!selectedId) return;
  const obj = stickers.find(o=>o.state.id===selectedId);
  if(!obj) return;
  canvas.appendChild(obj.el);
});

$("#btnRemove").addEventListener("click", ()=>{
  if(!selectedId) return;
  const idx = stickers.findIndex(o=>o.state.id===selectedId);
  if(idx<0) return;
  stickers[idx].el.remove();
  stickers.splice(idx,1);
  selectedId = null;
  selectedLabel.textContent = "已選取：—";
});

$("#btnClear").addEventListener("click", ()=>{
  stickers.forEach(o=>o.el.remove());
  stickers = [];
  selectedId = null;
  selectedLabel.textContent = "已選取：—";
});

// ====== 截圖（IG尺寸 1080x1350） ======
$("#btnShot").addEventListener("click", async ()=>{
  // 用 canvas 畫：背景 + 貼紙 + 本體
  const W = 1080, H = 1350; // IG直式更好發
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");

  // 取 stage 當下內容比例：把 16:9 / 1:1 的舞台塞進 4:5
  const stageRect = stage.getBoundingClientRect();
  const scale = Math.min(W / stageRect.width, H / stageRect.height);

  // 背景
  await drawImageFit(ctx, $("#bg"), W, H);

  // 貼紙（依 DOM 順序）
  const ordered = [...canvas.querySelectorAll(".sticker")].map(el=>{
    return stickers.find(o=>o.el===el);
  }).filter(Boolean);

  for(const o of ordered){
    await drawSticker(ctx, o, scale, W, H, stageRect);
  }

  // 本體（固定在舞台中間）
  await drawBase(ctx, $("#base"), scale, W, H, stageRect);

  // 下載
  const a = document.createElement("a");
  a.download = "whitezone-ig.png";
  a.href = out.toDataURL("image/png");
  a.click();
});

async function drawImageFit(ctx, imgEl, W, H){
  await ensureLoaded(imgEl);
  // cover
  const iw = imgEl.naturalWidth, ih = imgEl.naturalHeight;
  const s = Math.max(W/iw, H/ih);
  const w = iw*s, h = ih*s;
  ctx.drawImage(imgEl, (W-w)/2, (H-h)/2, w, h);
}

async function drawSticker(ctx, o, scale, W, H, stageRect){
  const img = o.el.querySelector("img");
  await ensureLoaded(img);

  // 將舞台座標轉到輸出圖中央
  const cx = W/2 + (o.state.x - stageRect.width/2) * scale;
  const cy = H/2 + (o.state.y - stageRect.height/2) * scale;

  const w = o.state.w * scale * o.state.s;
  const h = (img.naturalHeight / img.naturalWidth) * w;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.state.r);
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.restore();
}

async function drawBase(ctx, baseEl, scale, W, H, stageRect){
  await ensureLoaded(baseEl);
  // base 在 CSS 用 left 50% top 55% + width:min(62%,520px)
  const baseW_stage = Math.min(stageRect.width * 0.62, 520);
  const baseW = baseW_stage * scale;
  const baseH = (baseEl.naturalHeight / baseEl.naturalWidth) * baseW;

  const cx = W/2;
  const cy = H/2 + (stageRect.height * (0.55 - 0.5)) * scale; // 55%
  ctx.drawImage(baseEl, cx - baseW/2, cy - baseH/2, baseW, baseH);
}

function ensureLoaded(imgEl){
  return new Promise((res)=>{
    if(imgEl.complete && imgEl.naturalWidth) return res();
    imgEl.onload = ()=>res();
    imgEl.onerror = ()=>res(); // 不阻塞
  });
}



