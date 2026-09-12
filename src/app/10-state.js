
/* ---------- Состояние и история ---------- */
const App = {
  view: 'home', project: null, slideIdx: 0, frameIdx: 0, tab: 'board',
  tool: { m: 'select' }, sel: null, multi: false, sheet: false, playing: false, measure: null,
  frameSel: [], playSpeed: 1, boardIdx: 0,
  autoArrows: true, canvasBoard: null, saving: 'idle', dirtyExport: false,
  zoom: { k: 1, cx: null, cy: null }, onion: true, snap: true
};
const hist = { past: [], future: [], key: null, t: 0 };
const slide = () => (App.project ? App.project.slides[App.slideIdx] : null);
const board = () => {
  const s = slide();
  if (!s) return null;
  return s.layout === 'duo' && App.boardIdx === 1 ? (s.board2 || null) : s.board;
};
const frame = () => { const b = board(); return b ? b.frames[App.frameIdx] : null; };
const ent = id => { const b = board(); return b ? b.entities.find(e => e.id === id) : null; };
const snapshot = () => JSON.stringify(App.project);
/* ---------- Выделение: одиночное или смешанное ---------- */
/* Выделение как наборы id по типам: игроки/инвентарь, стрелки, зоны, реплики, мяч */
function selParts(s, f) {
  if (s === undefined) s = App.sel;
  f = f || frame();
  const out = { e: [], a: [], z: [], b: [], ball: false };
  if (!s || !f) return out;
  if (s.t === 'ent') out.e = s.ids.slice();
  else if (s.t === 'arrow') { if (f.arrows[s.i]) out.a = [f.arrows[s.i].id]; }
  else if (s.t === 'zone') { if (f.zones[s.i]) out.z = [f.zones[s.i].id]; }
  else if (s.t === 'bubble') { if (f.bubbles[s.i]) out.b = [f.bubbles[s.i].id]; }
  else if (s.t === 'ball') out.ball = !!f.ball;
  else if (s.t === 'mix') {
    out.e = (s.ids || []).slice();
    out.a = (s.arrows || []).slice();
    out.z = (s.zones || []).slice();
    out.b = (s.bubbles || []).slice();
    out.ball = !!(s.ball && f.ball);
  }
  return out;
}
/* Наборы id → самое простое выделение, которое их описывает */
function selFromParts(p, f) {
  f = f || frame();
  const n = p.e.length + p.a.length + p.z.length + p.b.length + (p.ball ? 1 : 0);
  if (!n || !f) return null;
  if (n === p.e.length) return { t: 'ent', ids: p.e.slice() };
  if (n === 1 && p.a.length) return { t: 'arrow', i: f.arrows.findIndex(x => x.id === p.a[0]) };
  if (n === 1 && p.z.length) return { t: 'zone', i: f.zones.findIndex(x => x.id === p.z[0]) };
  if (n === 1 && p.b.length) return { t: 'bubble', i: f.bubbles.findIndex(x => x.id === p.b[0]) };
  if (n === 1 && p.ball) return { t: 'ball' };
  return { t: 'mix', ids: p.e.slice(), arrows: p.a.slice(), zones: p.z.slice(), bubbles: p.b.slice(), ball: !!p.ball };
}
function selCount(s) {
  const p = selParts(s);
  return p.e.length + p.a.length + p.z.length + p.b.length + (p.ball ? 1 : 0);
}
/* Центр зоны в единицах поля — для подсветки и рамки выделения */
function zoneCenterU(bd, z) {
  if (!z) return null;
  if (z.type === 'rect') return [z.x + z.w / 2, z.y + z.h / 2];
  if (z.type === 'ellipse') return [z.cx, z.cy];
  if (z.type === 'text') return [z.x, z.y];
  if (z.type === 'ring') return bd.cur[z.target] || null;
  const pts = (z.ids || []).map(id => bd.cur[id]).filter(Boolean);
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}
function zoneCenter(bd, z) {
  const u = zoneCenterU(bd, z);
  return u ? bd.geo.pt(u[0], u[1]) : null;
}