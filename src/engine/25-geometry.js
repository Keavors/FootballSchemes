
/* ---------- Геометрия и поле ---------- */
function makeGeo(st) {
  const f = formatOf(st);
  const ratio = +st.pitch.ratio > 0.5 ? +st.pitch.ratio : f.ratio;
  const MG = 20, PW = 360, PL = Math.round(PW * ratio);
  const horiz = st.pitch.orientation === 'horizontal';
  const VW = horiz ? PL + 2 * MG : PW + 2 * MG;
  const VH = horiz ? PW + 2 * MG : PL + 2 * MG;
  const pt = horiz
    ? (x, y) => [MG + (100 - y) * PL / 100, MG + x * PW / 100]
    : (x, y) => [MG + x * PW / 100, MG + y * PL / 100];
  const inv = horiz
    ? (sx, sy) => [(sy - MG) * 100 / PW, 100 - (sx - MG) * 100 / PL]
    : (sx, sy) => [(sx - MG) * 100 / PW, (sy - MG) * 100 / PL];
  let vb = [0, 0, VW, VH];
  const cut = MG + PL * 0.44;
  if (st.pitch.view === 'attack') vb = horiz ? [cut, 0, VW - cut, VH] : [0, 0, VW, VH - cut];
  else if (st.pitch.view === 'defence') vb = horiz ? [0, 0, VW - cut, VH] : [0, cut, VW, VH - cut];
  return { f, ratio, MG, PW, PL, horiz, VW, VH, vb, pt, inv };
}
/* Настройки для отдельной схемы: общие, но ориентация и часть поля могут быть свои */
function boardSettings(st, board) {
  const v = (board && board.view) || {};
  const own = {};
  if (v.orientation && v.orientation !== 'inherit') own.orientation = v.orientation;
  if (v.part && v.part !== 'inherit') own.view = v.part;
  if (!Object.keys(own).length) return st;
  return Object.assign({}, st, { pitch: Object.assign({}, st.pitch, own) });
}

function drawPitch(svg, geo, st, id) {
  const defs = S('defs', null, svg);
  const vg = S('radialGradient', { id: id + '-vg', cx: '50%', cy: '50%', r: '72%' }, defs);
  S('stop', { offset: '55%', 'stop-color': '#062a14', 'stop-opacity': '0' }, vg);
  S('stop', { offset: '100%', 'stop-color': '#062a14', 'stop-opacity': '.3' }, vg);
  const pc = st.pitch, f = geo.f, PW = geo.PW, PL = geo.PL, MG = geo.MG;
  S('rect', { x: 0, y: 0, width: geo.VW, height: geo.VH, fill: safeColor(pc.surround, '#2f7a4a') }, svg);
  const g = S('g', { transform: geo.horiz ? `matrix(0,1,-1,0,${MG + PL},${MG})` : `translate(${MG},${MG})` }, svg);
  const n = pc.stripes ? 12 : 1;
  for (let i = 0; i < n; i++) S('rect', { x: 0, y: i * PL / n, width: PW, height: PL / n + 0.6, fill: safeColor(i % 2 ? pc.grass : pc.grass2, '#3a8a55') }, g);
  S('rect', { x: 0, y: 0, width: PW, height: PL, fill: `url(#${id}-vg)` }, g);
  if (!pc.markings) return defs;
  const lc = safeColor(pc.lines, '#ffffff');
  const A = o => Object.assign(o, { fill: 'none', stroke: lc, 'stroke-opacity': 0.82, 'stroke-width': 2.2 });
  S('rect', A({ x: 0, y: 0, width: PW, height: PL }), g);
  S('line', A({ x1: 0, y1: PL / 2, x2: PW, y2: PL / 2 }), g);
  S('circle', A({ cx: PW / 2, cy: PL / 2, r: f.circle * PW }), g);
  S('circle', { cx: PW / 2, cy: PL / 2, r: 3, fill: lc, 'fill-opacity': 0.85 }, g);
  [0, 1].forEach(bottom => {
    const y0 = bottom ? PL : 0, d = bottom ? -1 : 1;
    const bw = f.box[0] * PW, bh = f.box[1] * PL;
    if (f.round) {
      const r = Math.min(bh, bw / 3), x0 = PW / 2 - bw / 2, x1 = PW / 2 + bw / 2, ye = y0 + d * bh;
      S('path', A({ d: `M${x0},${y0} L${x0},${ye - d * r} Q${x0},${ye} ${x0 + r},${ye} L${x1 - r},${ye} Q${x1},${ye} ${x1},${ye - d * r} L${x1},${y0}` }), g);
    } else {
      S('rect', A({ x: PW / 2 - bw / 2, y: bottom ? y0 - bh : y0, width: bw, height: bh }), g);
    }
    if (f.ga) { const gw = f.ga[0] * PW, gh = f.ga[1] * PL; S('rect', A({ x: PW / 2 - gw / 2, y: bottom ? y0 - gh : y0, width: gw, height: gh }), g); }
    const sy = y0 + d * f.spot * PL;
    S('circle', { cx: PW / 2, cy: sy, r: 2.6, fill: lc, 'fill-opacity': 0.85 }, g);
    if (f.arc) {
      const ey = y0 + d * bh, r = (f.arcR || f.circle * 0.87) * PW, dy = Math.abs(ey - sy);
      if (dy < r) { const hc = Math.sqrt(r * r - dy * dy); S('path', A({ d: `M${PW / 2 - hc},${ey} A${r},${r} 0 0 ${bottom ? 1 : 0} ${PW / 2 + hc},${ey}` }), g); }
    }
    const gwid = f.goal * PW;
    S('rect', { x: PW / 2 - gwid / 2, y: bottom ? y0 : y0 - 10, width: gwid, height: 10, fill: 'rgba(255,255,255,.18)', stroke: lc, 'stroke-opacity': 0.9, 'stroke-width': 2 }, g);
  });
  return defs;
}