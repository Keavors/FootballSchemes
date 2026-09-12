const NS = 'http://www.w3.org/2000/svg';
const REDUCED = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
let UID = 0;

function S(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function H(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function uid() { return Math.random().toString(36).slice(2, 10); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function rgb(c) {
  let x = String(c || '').trim().replace('#', '');
  if (x.length === 3 || x.length === 4) x = x.slice(0, 3).split('').map(ch => ch + ch).join('');
  const n = parseInt(x.slice(0, 6), 16);
  return isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function safeColor(c, fb) { return /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(c || '')) ? c : (fb || '#ffffff'); }
function isWhite(c) { const v = rgb(c); return v[0] > 235 && v[1] > 235 && v[2] > 235; }
function quadLen(x0, y0, x1, y1, x2, y2) {
  let L = 0, px = x0, py = y0;
  for (let i = 1; i <= 16; i++) {
    const t = i / 16, m = 1 - t;
    const x = m * m * x0 + 2 * m * t * x1 + t * t * x2, y = m * m * y0 + 2 * m * t * y1 + t * t * y2;
    L += Math.hypot(x - px, y - py); px = x; py = y;
  }
  return L;
}
/* Точка на квадратичной кривой */
function quadAt(x0, y0, cx, cy, x1, y1, t) {
  const m = 1 - t;
  return [m * m * x0 + 2 * m * t * cx + t * t * x1, m * m * y0 + 2 * m * t * cy + t * t * y1];
}
/* Контрольная точка изгиба — так же, как у стрелки: середина, сдвинутая поперёк на bend */
function bendCtrl(x0, y0, x1, y1, bend) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  return [(x0 + x1) / 2 - dy / L * bend, (y0 + y1) / 2 + dx / L * bend];
}
/* Точка на кубической кривой */
function cubicAt(p0, c1, c2, p1, t) {
  const m = 1 - t, a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
  return [a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1]];
}
/* Контрольные точки гладкого пути через заданные точки */
function smoothCtrl(pts, i) {
  const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
  return [
    [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
    [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
  ];
}
/* Путь через точки одной гладкой линией */
function smoothPath(pts) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const c = smoothCtrl(pts, i);
    d += `C${c[0][0].toFixed(1)},${c[0][1].toFixed(1)} ${c[1][0].toFixed(1)},${c[1][1].toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}
function samplePath(pts, per) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const c = smoothCtrl(pts, i);
    for (let s = 0; s < per; s++) out.push(cubicAt(pts[i], c[0], c[1], pts[i + 1], s / per));
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
/* Точка на доле k пути — по длине, чтобы скорость была ровной */
function pathAt(pts, k) {
  const s = samplePath(pts, 12), acc = [0];
  let total = 0;
  for (let i = 1; i < s.length; i++) { total += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); acc.push(total); }
  if (!total) return s[0].slice();
  const want = clamp01(k) * total;
  for (let i = 1; i < acc.length; i++) {
    if (acc[i] >= want) {
      const seg = acc[i] - acc[i - 1] || 1, f = (want - acc[i - 1]) / seg;
      return [s[i - 1][0] + (s[i][0] - s[i - 1][0]) * f, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * f];
    }
  }
  return s[s.length - 1].slice();
}
function pathLength(pts) {
  const s = samplePath(pts, 12);
  let L = 0;
  for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
  return L;
}