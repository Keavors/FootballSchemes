
/* ---------- Фишки ---------- */
const TEAMS = { ours: 1, opp: 1, third: 1 };
const EQUIP_COLOR = { cone: '#ff8a1a', disc: '#ffd23f', pole: '#ffd23f', minigoal: '#ffffff', ball: '#ffffff', dummy: '#1f2a44' };
const isPlayer = e => !!(e && TEAMS[e.kind]);
function entRadius(st, e) {
  if (!isPlayer(e)) return 12 * (+e.size || 1);
  return 15 * (+st.tokens[e.kind + 'Size'] || 1) * (+e.size || 1);
}
function entColors(st, e) {
  if (!isPlayer(e)) return { fill: safeColor(e.color, EQUIP_COLOR[e.kind] || '#ffffff'), text: '#ffffff' };
  const C = st.colors, k = e.kind;
  return {
    fill: safeColor(e.color || (e.gk ? C[k + 'Keeper'] : C[k]), '#2456c7'),
    text: safeColor(e.textColor || (e.gk ? C[k + 'KeeperText'] : C[k + 'Text']), '#ffffff')
  };
}
function entLabel(st, e) {
  if (!isPlayer(e)) return '';
  const mode = st.tokens[e.kind + 'Label'];
  if (mode === 'none') return '';
  if (mode === 'number') return String(e.number || e.label || '');
  return String(e.label || e.number || '');
}
/* Игрок состава, к которому привязана фишка */
function rosterOf(P, e) {
  if (!e || !e.player || !P || !Array.isArray(P.roster)) return null;
  return P.roster.find(r => r.id === e.player) || null;
}
function nameOf(P, e) {
  const r = rosterOf(P, e);
  return r ? r.name : '';
}
/* Что написать на фишке с учётом привязки к составу */
function tokenLabel(P, st, e) {
  if (!isPlayer(e)) return '';
  const mode = st.tokens[e.kind + 'Label'];
  if (mode === 'none') return '';
  const r = rosterOf(P, e);
  if (mode === 'number') return String((r && r.number) || e.number || e.label || '');
  return String(e.label || (r && r.number) || e.number || '');
}
function shapeEl(g, shape, R) {
  switch (shape) {
    case 'square': return S('rect', { x: -R * 0.92, y: -R * 0.92, width: R * 1.84, height: R * 1.84, rx: R * 0.28 }, g);
    case 'triangle': return S('path', { d: `M0,${-R * 1.15} L${R * 1.1},${R * 0.8} L${-R * 1.1},${R * 0.8} Z`, 'stroke-linejoin': 'round' }, g);
    case 'diamond': return S('path', { d: `M0,${-R * 1.2} L${R * 1.2},0 L0,${R * 1.2} L${-R * 1.2},0 Z`, 'stroke-linejoin': 'round' }, g);
    case 'shirt': {
      const s = R * 1.08;
      return S('path', { d: `M${-0.42 * s},${-0.95 * s} Q0,${-0.62 * s} ${0.42 * s},${-0.95 * s} L${s},${-0.55 * s} L${0.72 * s},${-0.12 * s} L${0.52 * s},${-0.28 * s} L${0.52 * s},${0.95 * s} L${-0.52 * s},${0.95 * s} L${-0.52 * s},${-0.28 * s} L${-0.72 * s},${-0.12 * s} L${-s},${-0.55 * s} Z`, 'stroke-linejoin': 'round' }, g);
    }
    default: return S('circle', { r: R }, g);
  }
}
function drawEntity(g, e, st, editor, extra) {
  const parts = {};
  extra = extra || {};
  if (isPlayer(e)) {
    const R = entRadius(st, e);
    parts.R = R;
    if (editor) S('circle', { r: R + 9, fill: 'transparent' }, g);
    const col = entColors(st, e);
    const shape = e.shape || st.tokens[e.kind + 'Shape'] || 'circle';
    S('ellipse', { cx: 1.5, cy: R - 3, rx: R, ry: 5, class: 'te-shadow' }, g);
    parts.halo = S('circle', { r: R + 2, class: 'te-halo' }, g);
    parts.body = shapeEl(g, shape, R);
    parts.body.setAttribute('class', 'te-tb');
    parts.body.style.fill = col.fill;
    parts.fill = col.fill; parts.text = col.text;
    const lab = extra.label != null ? extra.label : entLabel(st, e);
    if (extra.name && st.tokens.showNames) {
      parts.name = S('text', { class: 'te-name', 'text-anchor': 'middle', y: (R + 13).toFixed(1), 'font-size': (R * 0.62).toFixed(1) }, g);
      parts.name.textContent = extra.name;
    }
    if (lab) {
      const fs = R * (lab.length >= 4 ? 0.56 : lab.length === 3 ? 0.7 : 0.84);
      parts.label = S('text', { class: 'te-lbl', 'text-anchor': 'middle', dy: '.36em', y: shape === 'triangle' ? (R * 0.22).toFixed(1) : null, 'font-size': fs.toFixed(1) }, g);
      parts.label.style.fill = col.text;
      parts.label.textContent = lab;
    }
  } else {
    const s = +e.size || 1, c = safeColor(e.color, EQUIP_COLOR[e.kind] || '#ffffff');
    parts.R = 12 * s;
    if (editor) S('circle', { r: 20 * s, fill: 'transparent' }, g);
    parts.halo = S('circle', { r: 16 * s, class: 'te-halo' }, g);
    const eg = S('g', { transform: `scale(${s})` }, g);
    if (e.kind === 'cone') {
      S('ellipse', { cx: 0, cy: 7, rx: 10, ry: 3.2, fill: 'rgba(0,0,0,.3)' }, eg);
      S('path', { d: 'M0,-12 L8,7 L-8,7 Z', fill: c, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1, 'stroke-linejoin': 'round' }, eg);
      S('path', { d: 'M-4.2,-2 L4.2,-2', stroke: '#fff', 'stroke-width': 2.4 }, eg);
    } else if (e.kind === 'disc') {
      S('ellipse', { cx: 0, cy: 1.6, rx: 10, ry: 5, fill: 'rgba(0,0,0,.25)' }, eg);
      S('ellipse', { cx: 0, cy: 0, rx: 10, ry: 5, fill: c, stroke: 'rgba(0,0,0,.3)', 'stroke-width': 1 }, eg);
      S('ellipse', { cx: 0, cy: -0.5, rx: 4, ry: 2, fill: 'rgba(0,0,0,.22)' }, eg);
    } else if (e.kind === 'pole') {
      S('ellipse', { cx: 1, cy: 3, rx: 6, ry: 2.5, fill: 'rgba(0,0,0,.3)' }, eg);
      S('rect', { x: -2, y: -24, width: 4, height: 26, rx: 2, fill: c, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1 }, eg);
      S('circle', { cx: 0, cy: 2, r: 4, fill: '#333' }, eg);
    } else if (e.kind === 'minigoal') {
      S('rect', { x: -20, y: -7, width: 40, height: 10, fill: 'rgba(255,255,255,.18)', stroke: c, 'stroke-width': 2.6 }, eg);
      for (let x = -14; x <= 14; x += 7) S('line', { x1: x, y1: -7, x2: x, y2: 3, stroke: 'rgba(255,255,255,.45)', 'stroke-width': 1 }, eg);
    } else if (e.kind === 'dummy') {
      S('ellipse', { cx: 1, cy: 12, rx: 9, ry: 3, fill: 'rgba(0,0,0,.3)' }, eg);
      S('path', { d: 'M-7,12 L-7,-6 Q-7,-10 -3,-10 L3,-10 Q7,-10 7,-6 L7,12 Z', fill: c, stroke: '#fff', 'stroke-width': 1.5 }, eg);
      S('circle', { cx: 0, cy: -15, r: 4.5, fill: c, stroke: '#fff', 'stroke-width': 1.5 }, eg);
    } else {
      S('ellipse', { cx: 1.5, cy: 5, rx: 6, ry: 2.6, fill: 'rgba(0,0,0,.3)' }, eg);
      S('circle', { r: 6.5, fill: c, stroke: '#15251c', 'stroke-width': 1.6 }, eg);
      S('path', { d: 'M0,-3.2 L3,-1 L1.9,2.6 L-1.9,2.6 L-3,-1 z', fill: '#15251c' }, eg);
    }
  }
  return parts;
}

function legendRow(st, board) {
  const kinds = {};
  board.entities.forEach(e => { kinds[e.kind] = 1; });
  const anyHl = board.frames.some(f => f.hl && f.hl.length);
  const arrows = [].concat(...board.frames.map(f => f.arrows || []));
  const anyPass = arrows.some(a => (a.style || 'solid') === 'solid' && a.head !== false);
  const anyRun = arrows.some(a => a.style === 'dashed');
  const L = st.legend, C = st.colors;
  const dot = (c, t) => `<span><i style="background:${safeColor(c)}"></i>${esc(t)}</span>`;
  let html = '';
  if (kinds.ours && L.ours) html += dot(C.ours, L.ours);
  if (anyHl && L.special) html += dot(C.special, L.special);
  if (kinds.opp && L.opp) html += dot(C.opp, L.opp);
  if (kinds.third && L.third) html += dot(C.third, L.third);
  if (anyPass && L.pass) html += `<span><svg width="24" height="8" aria-hidden="true"><path d="M1 4h22" stroke="${mix(safeColor(C.pass), '#000000', 0.28)}" stroke-width="3"/></svg>${esc(L.pass)}</span>`;
  if (anyRun && L.run) html += `<span><svg width="24" height="8" aria-hidden="true"><path d="M1 4h22" stroke="currentColor" stroke-width="2.4" stroke-dasharray="5 4"/></svg>${esc(L.run)}</span>`;
  const dir = L.dir === 'auto' ? (st.pitch.orientation === 'horizontal' ? 'атакуем вправо →' : 'атакуем вверх ↑') : L.dir;
  if (dir) html += `<span>${esc(dir)}</span>`;
  if (!html) return null;
  const k = document.createElement('div');
  k.className = 'te-keys';
  k.innerHTML = html;
  return k;
}

function wavyPath(x0, y0, x1, y1, x2, y2) {
  const L = quadLen(x0, y0, x1, y1, x2, y2), N = Math.max(12, Math.round(L / 2.5));
  let out = '', acc = 0, px = x0, py = y0;
  for (let i = 0; i <= N; i++) {
    const t = i / N, m = 1 - t;
    const x = m * m * x0 + 2 * m * t * x1 + t * t * x2, y = m * m * y0 + 2 * m * t * y1 + t * t * y2;
    const tx = 2 * m * (x1 - x0) + 2 * t * (x2 - x1), ty = 2 * m * (y1 - y0) + 2 * t * (y2 - y1), tl = Math.hypot(tx, ty) || 1;
    if (i) acc += Math.hypot(x - px, y - py);
    px = x; py = y;
    const taper = Math.max(0, Math.min(1, acc / 10, (L - acc) / 14));
    const off = Math.sin(acc / 16 * Math.PI * 2) * 4 * taper;
    out += (i ? 'L' : 'M') + (x - ty / tl * off).toFixed(1) + ',' + (y + tx / tl * off).toFixed(1);
  }
  return out;
}