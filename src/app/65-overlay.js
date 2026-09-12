
function drawOverlay(bd) {
  const g = bd.gO;
  if (!g) return;
  g.textContent = '';
  drawGhosts(bd);
  if (App.playing) return;
  drawGuides(bd);
  drawMeasure(bd);
  const f = frame();
  if (!f) return;
  const S = TE.S, k = unitScale(bd), geo = bd.geo, sel = App.sel;
  const handle = (x, y, name) => {
    const hg = S('g', { 'data-handle': name, transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` }, g);
    S('circle', { r: 20 * k, fill: 'transparent' }, hg);
    S('circle', { r: 7 * k, fill: '#ffffff', stroke: '#ff7a00', 'stroke-width': 2.5 * k }, hg);
  };
  const ring = (x, y, r) => S('circle', { cx: x, cy: y, r, fill: 'none', stroke: '#ff7a00', 'stroke-width': 2.5 * k, 'stroke-dasharray': `${6 * k} ${4 * k}` }, g);
  if (sel && sel.t === 'ent') {
    sel.ids.forEach(id => {
      const p = bd.cur[id];
      if (!p) return;
      const s = geo.pt(p[0], p[1]);
      ring(s[0], s[1], bd.radius(id) + 7);
    });
  } else if (sel && sel.t === 'ball' && bd.ballXY) {
    ring(bd.ballXY[0], bd.ballXY[1], 13);
  } else if (sel && sel.t === 'arrow') {
    const a = f.arrows[sel.i], G = bd.ageo[sel.i];
    if (a && G) {
      S('path', { d: (bd.apath && bd.apath[sel.i]) || `M${G.sx},${G.sy} Q${G.cx},${G.cy} ${G.ex},${G.ey}`, fill: 'none', stroke: '#ff7a00', 'stroke-width': 1.5 * k, 'stroke-dasharray': `${4 * k} ${4 * k}` }, g);
      if (a.kind !== 'move') { handle(G.sx, G.sy, 'a-start'); handle(G.ex, G.ey, 'a-end'); }
      const pts = Array.isArray(a.pts) ? a.pts : [];
      pts.forEach((p, n) => { const s2 = geo.pt(p[0], p[1]); handle(s2[0], s2[1], 'a-pt-' + n); });
      if (!pts.length) handle(0.25 * G.sx + 0.5 * G.cx + 0.25 * G.ex, 0.25 * G.sy + 0.5 * G.cy + 0.25 * G.ey, 'a-bend');
      /* Маленькие «плюсики» на серединах — потянешь и добавится новая точка пути */
      const chain = [[G.sx, G.sy]].concat(pts.map(p => geo.pt(p[0], p[1])), [[G.ex, G.ey]]);
      for (let n = 0; n < chain.length - 1; n++) {
        const mx = (chain[n][0] + chain[n + 1][0]) / 2, my = (chain[n][1] + chain[n + 1][1]) / 2;
        const hg = S('g', { 'data-handle': 'a-add-' + n, transform: `translate(${mx.toFixed(1)},${my.toFixed(1)})` }, g);
        S('circle', { r: 16 * k, fill: 'transparent' }, hg);
        S('circle', { r: 5 * k, fill: 'rgba(255,255,255,.85)', stroke: '#ff7a00', 'stroke-width': 2 * k }, hg);
        S('path', { d: `M${-2.6 * k},0 H${2.6 * k} M0,${-2.6 * k} V${2.6 * k}`, stroke: '#ff7a00', 'stroke-width': 1.6 * k }, hg);
      }
    }
  } else if (sel && sel.t === 'zone') {
    const z = f.zones[sel.i];
    if (z) {
      if (z.type === 'rect') {
        const a = geo.pt(z.x, z.y), b = geo.pt(z.x + z.w, z.y + z.h);
        handle(a[0], a[1], 'z-a'); handle(b[0], b[1], 'z-b');
      } else if (z.type === 'ellipse') {
        const c = geo.pt(z.cx, z.cy), e2 = geo.pt(z.cx + z.rx, z.cy + z.ry);
        ring(c[0], c[1], 4 * k);
        handle(e2[0], e2[1], 'z-e');
      } else if (z.type === 'ring') {
        const p = bd.cur[z.target];
        if (p) { const s = geo.pt(p[0], p[1]); handle(s[0] + (+z.r || 30), s[1], 'z-r'); }
      } else if (z.type === 'text') {
        const c = geo.pt(z.x, z.y);
        ring(c[0], c[1], 6 * k);
      } else if (z.ids) {
        z.ids.forEach(id => { const p = bd.cur[id]; if (p) { const s = geo.pt(p[0], p[1]); ring(s[0], s[1], bd.radius(id) + 5); } });
      }
    }
  } else if (sel && sel.t === 'bubble') {
    const b = f.bubbles[sel.i], p = b && bd.cur[b.target];
    if (p) { const s = geo.pt(p[0], p[1]); ring(s[0], s[1], bd.radius(b.target) + 7); }
  } else if (sel && sel.t === 'mix') {
    sel.ids.forEach(id => { const p = bd.cur[id]; if (p) { const s = geo.pt(p[0], p[1]); ring(s[0], s[1], bd.radius(id) + 7); } });
    sel.arrows.forEach(aid => {
      const G = bd.ageo[f.arrows.findIndex(a => a.id === aid)];
      if (G) S('path', { d: `M${G.sx},${G.sy} Q${G.cx},${G.cy} ${G.ex},${G.ey}`, fill: 'none', stroke: '#ff7a00', 'stroke-width': 7 * k, 'stroke-opacity': 0.45, 'stroke-linecap': 'round', class: 'sel-arrow' }, g);
    });
    sel.zones.forEach(zid => { const c = zoneCenter(bd, f.zones.find(z => z.id === zid)); if (c) ring(c[0], c[1], 12 * k); });
    sel.bubbles.forEach(bid => {
      const b = f.bubbles.find(x => x.id === bid), p = b && bd.cur[b.target];
      if (p) { const s = geo.pt(p[0], p[1]); ring(s[0], s[1] - bd.radius(b.target) - 22, 18 * k); }
    });
    if (sel.ball && bd.ballXY) ring(bd.ballXY[0], bd.ballXY[1], 13);
  }
  const t = App.tool;
  if (t.m === 'arrow' && t.from) {
    let s = null;
    if (t.from.e && bd.cur[t.from.e]) s = geo.pt(bd.cur[t.from.e][0], bd.cur[t.from.e][1]);
    else if (t.from.p) s = geo.pt(t.from.p[0], t.from.p[1]);
    if (s) {
      S('circle', { cx: s[0], cy: s[1], r: 10 * k, fill: 'rgba(255,122,0,.35)', stroke: '#ff7a00', 'stroke-width': 2.5 * k }, g);
      bd.previewFrom = s;
    }
  }
}
/* Призраки: где игроки стояли на прошлом шаге */
function drawGhosts(bd) {
  if (!bd.gG) return;
  bd.gG.textContent = '';
  const b = board();
  if (!App.onion || App.playing || App.frameIdx < 1 || !b) return;
  const prev = b.frames[App.frameIdx - 1];
  if (!prev) return;
  const geo = bd.geo, k = unitScale(bd), S = TE.S;
  for (const id in bd.cur) {
    const p0 = prev.pos[id], p1 = bd.cur[id];
    if (!p0 || !p1 || Math.hypot(p0[0] - p1[0], p0[1] - p1[1]) < 0.6) continue;
    const e = ent(id);
    if (!e) continue;
    const col = TE.entColors(App.project.settings, e);
    const a = geo.pt(p0[0], p0[1]), c = geo.pt(p1[0], p1[1]);
    S('line', { x1: a[0], y1: a[1], x2: c[0], y2: c[1], stroke: col.fill, 'stroke-opacity': 0.35, 'stroke-width': 1.6 * k, 'stroke-dasharray': `${4 * k} ${4 * k}` }, bd.gG);
    S('circle', { cx: a[0], cy: a[1], r: bd.radius(id), fill: col.fill, 'fill-opacity': 0.22, stroke: col.fill, 'stroke-opacity': 0.45, 'stroke-width': 1.4 * k }, bd.gG);
  }
}
/* Прилипание к линиям других игроков, к разметке поля и к показанной сетке зон */
function snapDelta(bd, d, du) {
  const f = frame(), b = board(), anchor = d.start[d.id];
  if (!f || !b || !anchor) return null;
  const geo = bd.geo, fmt = geo.f, k = unitScale(bd);
  const tolX = Math.max(0.5, 7 * k / (geo.PW / 100)), tolY = Math.max(0.5, 7 * k / (geo.PL / 100));
  const box = (fmt.box && fmt.box[0] ? fmt.box[0] : 0) * 100;
  const ga = (fmt.ga && fmt.ga[0] ? fmt.ga[0] : 0) * 100;
  const depth = (fmt.box && fmt.box[1] ? fmt.box[1] : 0) * 100;
  const spot = (fmt.spot || 0) * 100;
  const xs = [50], ys = [50];
  if (box) xs.push(50 - box / 2, 50 + box / 2);
  if (ga) xs.push(50 - ga / 2, 50 + ga / 2);
  if (depth) ys.push(depth, 100 - depth);
  if (spot) ys.push(spot, 100 - spot);
  const gr = b.grid || 'none';
  if (gr === 'zones18') { ys.push(16.67, 33.33, 50, 66.67, 83.33); xs.push(33.33, 66.67); }
  if (gr === 'thirds' || gr === 'both') ys.push(33.33, 66.67);
  for (const id in f.pos) {
    if (!f.pos[id] || d.start[id] !== undefined) continue;
    xs.push(f.pos[id][0]);
    ys.push(f.pos[id][1]);
  }
  const want = [anchor[0] + du[0], anchor[1] + du[1]];
  let bx = null, by = null, bestX = tolX, bestY = tolY;
  xs.forEach(x => { const dd = Math.abs(x - want[0]); if (dd < bestX) { bestX = dd; bx = x; } });
  ys.forEach(y => { const dd = Math.abs(y - want[1]); if (dd < bestY) { bestY = dd; by = y; } });
  if (bx == null && by == null) return null;
  return {
    du: [(bx == null ? want[0] : bx) - anchor[0], (by == null ? want[1] : by) - anchor[1]],
    guides: { x: bx, y: by }
  };
}
/* Оранжевые линии-подсказки, когда игрок встал вровень с другим */
function drawGuides(bd) {
  if (!drag || !drag.guides || App.playing) return;
  const g = bd.gO, geo = bd.geo, k = unitScale(bd), S = TE.S;
  const gx = drag.guides.x, gy = drag.guides.y;
  const line = (a, b) => S('line', {
    x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#ff7a00', 'stroke-width': 1.5 * k,
    'stroke-dasharray': `${5 * k} ${4 * k}`, class: 'snap-guide'
  }, g);
  if (gx != null) line(geo.pt(gx, 0), geo.pt(gx, 100));
  if (gy != null) line(geo.pt(0, gy), geo.pt(100, gy));
}
/* ---------- Линейка ---------- */
function measureText() {
  const m = App.measure;
  if (!m) return '';
  const mt = TE.pitchMeters(App.project.settings);
  const dx = (m.b[0] - m.a[0]) / 100 * mt[1], dy = (m.b[1] - m.a[1]) / 100 * mt[0];
  return Math.hypot(dx, dy).toFixed(1).replace('.', ',') + ' м';
}
/* Концы линейки прилипают к игрокам, но только когда действительно рядом */
function measurePoint(bd, e, u) {
  const hit = nearestEntity(bd, e, 12);
  return hit && bd.cur[hit] ? bd.cur[hit].slice() : u;
}
function drawMeasure(bd) {
  if (!App.measure || App.tool.m !== 'measure') return;
  const g = bd.gO, geo = bd.geo, k = unitScale(bd), S = TE.S, m = App.measure;
  const a = geo.pt(m.a[0], m.a[1]), b = geo.pt(m.b[0], m.b[1]);
  S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#ff7a00', 'stroke-width': 2.5 * k, 'stroke-dasharray': `${7 * k} ${5 * k}`, class: 'measure-line' }, g);
  [a, b].forEach(p => S('circle', { cx: p[0], cy: p[1], r: 4 * k, fill: '#ff7a00' }, g));
  const tx = S('text', { x: ((a[0] + b[0]) / 2).toFixed(1), y: ((a[1] + b[1]) / 2 - 9 * k).toFixed(1), 'text-anchor': 'middle', class: 'te-note measure-label', 'font-size': (20 * k).toFixed(1), fill: '#ffffff' }, g);
  tx.textContent = measureText();
}
/* Превратить замер в стрелку с подписью прямо на схеме */
function keepMeasure() {
  const m = App.measure;
  if (!m) return;
  const label = measureText();
  commit(() => {
    const fr = frame();
    fr.arrows.push({ id: uid(), kind: 'line', from: { p: m.a.slice() }, to: { p: m.b.slice() }, style: 'solid', color: '#ffffff', width: 2, head: false, bend: 0, draw: false, opacity: 0.9 });
    fr.zones.push({ id: uid(), type: 'text', x: +((m.a[0] + m.b[0]) / 2).toFixed(1), y: +((m.a[1] + m.b[1]) / 2 - 2).toFixed(1), text: label, color: '#ffffff', size: 20, font: 'body' });
    App.measure = null;
    App.tool = { m: 'select' };
  }, { parts: ['tools', 'canvas', 'insp'] });
}