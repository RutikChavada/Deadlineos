"use strict";
/* ---------- Config & state ---------- */
const KEY = "deadlineos.v1";
const W = 1080, H = 1920;
const FONT = '"Space Grotesk","Inter","SF Pro Display","Segoe UI",system-ui,sans-serif';
const THEMES = [
  {name:"Aurora", bg:["#070716","#17124a","#0b1f5c"], a:"#4f8cff", b:"#9b5cff"},
  {name:"Nebula", bg:["#0a0618","#2a0f52","#12123f"], a:"#b45cff", b:"#ff5fa8"},
  {name:"Ocean",  bg:["#050b18","#0b2a5c","#0d1450"], a:"#35c8ff", b:"#6a6dff"}
];
const pad = n => String(n).padStart(2, "0");
const todayKey = () => new Date().toDateString();
const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function defaults(){
  return {
    goal: "Build My AI Project",
    deadline: "2026-12-15T23:59",
    start: Date.now(),
    theme: 0,
    day: todayKey(),
    milestones: [
      {t:"Week 1 · Define scope, dataset & success metric", done:false},
      {t:"Week 2 · Build baseline model & pipeline", done:false},
      {t:"Week 3 · Train, evaluate & iterate", done:false},
      {t:"Week 4 · Build the app / UI & integrate", done:false},
      {t:"Week 5 · Test, polish & write docs", done:false},
      {t:"Final days · Launch & demo", done:false}
    ],
    tasks: [
      {t:"2 hours of focused deep work", done:false},
      {t:"Run or review one experiment", done:false},
      {t:"Write a short progress note", done:false},
      {t:"Plan tomorrow’s top task", done:false}
    ]
  };
}
let S = defaults();
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && saved.goal) S = Object.assign(S, saved);
} catch (e) {}
if (S.day !== todayKey()) { S.tasks.forEach(t => t.done = false); S.day = todayKey(); }  // daily reset
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ---------- Countdown maths ---------- */
function calc(){
  const end = new Date(S.deadline).getTime();
  const now = Date.now();
  let ms = isNaN(end) ? 0 : end - now;
  const over = ms <= 0; if (over) ms = 0;
  const secs = Math.floor(ms / 1000);
  let start = S.start;
  if (!(start < end)) start = end - 30 * 864e5;
  const pct = over ? 100 : Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
  return {
    d: Math.floor(secs / 86400), h: Math.floor(secs % 86400 / 3600),
    m: Math.floor(secs % 3600 / 60), s: secs % 60, over, pct, end
  };
}

/* ---------- DOM refs ---------- */
const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");

/* ---------- UI rendering ---------- */
function renderTheme(){
  $("themes").innerHTML = THEMES.map((t,i) =>
    `<button class="sw ${i===S.theme?"on":""}" data-i="${i}" title="${t.name}" aria-label="${t.name} theme" style="background:linear-gradient(135deg,${t.a},${t.b})"></button>`).join("");
}
function renderList(ul, arr, kind){
  const firstOpen = kind === "ms" ? arr.findIndex(x => !x.done) : -1;
  ul.innerHTML = arr.map((x,i) =>
    `<li class="item ${x.done?"done":""} ${i===firstOpen?"now":""}">
       <input type="checkbox" data-k="${kind}" data-i="${i}" ${x.done?"checked":""} aria-label="Toggle">
       <p>${esc(x.t)}</p>${i===firstOpen?'<span class="tag">Now</span>':""}
       <button class="x" data-k="${kind}" data-del="${i}" aria-label="Delete">×</button></li>`).join("");
  const n = arr.filter(x => x.done).length;
  $(kind + "Count").textContent = `${n}/${arr.length} done`;
}
function renderAll(){
  $("goal").value = S.goal; $("dead").value = S.deadline;
  $("goalView").textContent = S.goal;
  renderTheme(); renderList($("ms"), S.milestones, "ms"); renderList($("tk"), S.tasks, "tk");
  tick();
}
function tick(){
  const c = calc();
  $("d").textContent = c.d; $("h").textContent = pad(c.h); $("m").textContent = pad(c.m); $("s").textContent = pad(c.s);
  $("bar").style.width = c.pct.toFixed(1) + "%";
  $("pct").textContent = c.pct.toFixed(1) + "% of time elapsed";
  $("dlText").textContent = isNaN(c.end) ? "Pick a valid deadline" :
    "Deadline: " + new Date(c.end).toLocaleString(undefined, {dateStyle:"long", timeStyle:"short"});
  $("banner").style.display = c.over ? "block" : "none";
  const now = new Date();
  $("cTime").textContent = (now.getHours() % 12 || 12) + ":" + pad(now.getMinutes());
  $("cDate").textContent = now.toLocaleDateString(undefined, {weekday:"long", month:"long", day:"numeric"});
  draw(c);
}

/* ---------- Canvas helpers ---------- */
function rr(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x,y,w,h,r) : ctx.rect(x,y,w,h); }
function setFont(px, wt){ ctx.font = `${wt||500} ${px}px ${FONT}`; }
function spacing(v){ if ("letterSpacing" in ctx) ctx.letterSpacing = v + "px"; }
function fit(text, maxW){
  if (ctx.measureText(text).width <= maxW) return text;
  while (text.length > 1 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
  return text.trimEnd() + "…";
}
function wrap(text, maxW, maxLines){
  const words = text.split(/\s+/), lines = []; let cur = "";
  for (const w of words){
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines){ lines.length = maxLines; lines[maxLines-1] = fit(lines[maxLines-1] + "…", maxW); }
  return lines;
}

/* ---------- Wallpaper drawing (1080 × 1920) ---------- */
function draw(c){
  const T = THEMES[S.theme];
  ctx.save(); ctx.clearRect(0,0,W,H); ctx.textBaseline = "alphabetic"; spacing(0);

  // background
  let g = ctx.createLinearGradient(0,0,W*.6,H);
  g.addColorStop(0,T.bg[0]); g.addColorStop(.5,T.bg[1]); g.addColorStop(1,T.bg[2]);
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  [[920,260,650,T.a,.38],[90,1250,720,T.b,.30],[620,1750,560,T.a,.22]].forEach(([x,y,r,col,a]) => {
    const rg = ctx.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0, col + Math.round(a*255).toString(16).padStart(2,"0")); rg.addColorStop(1, col + "00");
    ctx.fillStyle = rg; ctx.fillRect(0,0,W,H);
  });

  // goal title
  ctx.textAlign = "left"; ctx.fillStyle = T.a; setFont(30,700); spacing(8);
  ctx.fillText("MY GOAL", 90, 600);
  spacing(0); setFont(76,700); ctx.fillStyle = "#fff";
  const lines = wrap(S.goal, 900, 2);
  lines.forEach((l,i) => ctx.fillText(l, 90, 690 + i*88));
  const yD = 690 + (lines.length-1)*88;

  // big days number
  const base = yD + 270;
  setFont(270,700); ctx.textAlign = "left";
  const dTxt = String(c.d), dW = ctx.measureText(dTxt).width;
  let tg = ctx.createLinearGradient(90,base-240,90+dW,base);
  tg.addColorStop(0,T.a); tg.addColorStop(1,T.b);
  ctx.fillStyle = tg; ctx.shadowColor = T.b + "88"; ctx.shadowBlur = 50;
  ctx.fillText(dTxt, 90, base); ctx.shadowBlur = 0;
  setFont(40,600); ctx.fillStyle = "rgba(255,255,255,.75)"; spacing(6);
  ctx.fillText(c.d === 1 ? "DAY LEFT" : "DAYS LEFT", 90 + dW + 36, base - 6); spacing(0);

  // h / m / s boxes
  const by = base + 50, bw = 280, bh = 180, gap = 30;
  [["h",c.h,"HOURS"],["m",c.m,"MINUTES"],["s",c.s,"SECONDS"]].forEach(([k,v,lab],i) => {
    const x = 90 + i*(bw+gap);
    rr(x,by,bw,bh,36); ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "#fff"; setFont(96,700); ctx.fillText(pad(v), x+bw/2, by+108);
    ctx.fillStyle = "rgba(255,255,255,.55)"; setFont(24,600); spacing(5); ctx.fillText(lab, x+bw/2, by+152); spacing(0);
  });

  // progress bar
  const py = by + bh + 50;
  rr(90,py,900,16,8); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fill();
  if (c.pct > 0){
    const pg = ctx.createLinearGradient(90,0,990,0); pg.addColorStop(0,T.a); pg.addColorStop(1,T.b);
    rr(90,py,Math.max(16,900*c.pct/100),16,8); ctx.fillStyle = pg; ctx.fill();
  }
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,.6)"; setFont(26,500);
  ctx.fillText(c.over ? "Deadline reached" : c.pct.toFixed(0) + "% of time elapsed", 90, py + 54);
  ctx.textAlign = "right";
  ctx.fillText(isNaN(c.end) ? "" : new Date(c.end).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}), 990, py + 54);

  // cards: milestones + checklist
  const cy = py + 100, ch = Math.min(330, 1735 - cy), cw = 435;
  card(90, cy, cw, ch, "THIS WEEK", S.milestones.filter(m => !m.done).slice(0,3).map(m => ({t:m.t.replace(/^.*?·\s*/,""), done:false, dot:true})), T);
  const tdone = S.tasks.filter(t => t.done).length;
  card(90+cw+30, cy, cw, ch, `TODAY  ${tdone}/${S.tasks.length}`, S.tasks.slice(0,4), T);

  // footer
  ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.35)"; setFont(24,600); spacing(8);
  ctx.fillText("DEADLINEOS", W/2, 1790); spacing(0);
  ctx.restore();
}
function card(x,y,w,h,title,items,T){
  rr(x,y,w,h,36); ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = "left"; ctx.fillStyle = T.a; setFont(24,700); spacing(5); ctx.fillText(title, x+32, y+54); spacing(0);
  if (!items.length){ ctx.fillStyle = "rgba(255,255,255,.5)"; setFont(26,500); ctx.fillText("All done 🎉", x+32, y+110); return; }
  const step = Math.min(66, (h-90)/Math.max(items.length,1));
  items.forEach((it,i) => {
    const iy = y + 108 + i*step;
    if (it.dot){
      ctx.fillStyle = T.b; ctx.beginPath(); ctx.arc(x+44, iy-9, 7, 0, 7); ctx.fill();
    } else {
      rr(x+32, iy-26, 30, 30, 9);
      if (it.done){ const g = ctx.createLinearGradient(x,iy,x+60,iy); g.addColorStop(0,T.a); g.addColorStop(1,T.b); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x+39,iy-11); ctx.lineTo(x+45,iy-5); ctx.lineTo(x+56,iy-19); ctx.stroke(); }
      else { ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 3; ctx.stroke(); }
    }
    setFont(27,500); ctx.fillStyle = it.done ? "rgba(255,255,255,.4)" : "#fff";
    const tx = x + 80, txt = fit(it.t, w - 80 - 24);
    ctx.fillText(txt, tx, iy);
    if (it.done){ ctx.fillRect(tx, iy-9, ctx.measureText(txt).width, 2); }
  });
}

/* ---------- Events ---------- */
$("goal").addEventListener("input", e => { S.goal = e.target.value.trim() || "My Goal"; $("goalView").textContent = S.goal; save(); tick(); });
$("dead").addEventListener("input", e => { if (e.target.value){ S.deadline = e.target.value; save(); tick(); } });
$("themes").addEventListener("click", e => { const b = e.target.closest(".sw"); if (!b) return; S.theme = +b.dataset.i; save(); renderTheme(); tick(); });

function bindList(ulId, formId, inputId, key, kind){
  $(ulId).addEventListener("click", e => {
    const del = e.target.closest("[data-del]");
    if (del){ S[key].splice(+del.dataset.del, 1); }
    else if (e.target.matches("input[type=checkbox]")){ S[key][+e.target.dataset.i].done = e.target.checked; }
    else return;
    save(); renderList($(ulId), S[key], kind); tick();
  });
  $(formId).addEventListener("submit", e => {
    e.preventDefault(); const v = $(inputId).value.trim(); if (!v) return;
    S[key].push({t:v, done:false}); $(inputId).value = ""; save(); renderList($(ulId), S[key], kind); tick();
  });
}
bindList("ms","msForm","msIn","milestones","ms");
bindList("tk","tkForm","tkIn","tasks","tk");

$("download").addEventListener("click", () => {
  draw(calc());
  cv.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "deadlineos-wallpaper-1080x1920.png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
});

/* ---------- Boot ---------- */
renderAll();
setInterval(tick, 1000);
if (document.fonts) {
  Promise.all([document.fonts.load('700 40px "Space Grotesk"'), document.fonts.load('500 30px "Space Grotesk"')])
    .then(() => document.fonts.ready).then(tick).catch(() => {});
}
