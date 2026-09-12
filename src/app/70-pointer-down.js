
let drag = null;
function onDown(e, bd) {
  if (App.playing || (e.button !== undefined && e.button > 0)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { startGesture(bd); return; }
  const f = frame();
  if (!f) return;
  const target = e.target.closest('[data-handle],[data-eid],[data-ball],[data-bidx],[data-aidx],[data-zidx]');
  const u = unitsXY(e, bd);
  try { bd.svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  drag = { pid: e.pointerId, x0: e.clientX, y0: e.clientY, u0: u, moved: false, before: snapshot(), kind: 'empty' };
  /* Долгое нажатие пальцем — то же меню, что по правому клику */
  if (e.pointerType === 'touch') {
    const target0 = e.target.closest('[data-eid],[data-ball],[data-bidx],[data-aidx],[data-zidx]');
    drag.lpTimer = setTimeout(() => {
      if (!drag || drag.moved) return;
      const d = drag;
      drag = null;
      const was = JSON.stringify(App.sel);
      if (target0) pickAt(target0, e);
      if (JSON.stringify(App.sel) !== was) refresh(['canvas', 'insp']);
      openCanvasMenu({ x: d.x0, y: d.y0 }, d.u0);
    }, 550);
  }
  const tool = App.tool.m;
  const eid = target && target.getAttribute('data-eid');
  if (tool === 'arrow') { drag.kind = 'tool-arrow'; drag.ref = eid ? { e: eid } : { p: u }; return; }
  if (tool === 'rect' || tool === 'ellipse') { drag.kind = 'tool-zone'; return; }
  if (tool === 'text') { drag.kind = 'tool-text'; return; }
  if (tool === 'stamp') { drag.kind = 'tool-stamp'; return; }
  if (tool === 'measure') {
    drag.kind = 'tool-measure';
    const p = measurePoint(bd, e, u);
    App.measure = { a: p, b: p.slice() };
    return;
  }
  if (!target) {
    /* По пустому месту тянем рамку выделения */
    if (tool === 'select') drag.kind = 'marquee';
    return;
  }
  if (target.hasAttribute('data-handle')) {
    drag.kind = 'handle';
    drag.handle = target.getAttribute('data-handle');
    /* Потянули «плюсик» — на этом месте появляется новая точка пути */
    if (drag.handle.indexOf('a-add-') === 0) {
      const s = App.sel, a = s && s.t === 'arrow' ? f.arrows[s.i] : null;
      const at = +drag.handle.slice(6);
      if (a) {
        a.pts = Array.isArray(a.pts) ? a.pts : [];
        a.pts.splice(at, 0, [u[0], u[1]]);
        drag.handle = 'a-pt-' + at;
        bd._snap(App.frameIdx);
      }
    }
    return;
  }
  if (eid) {
    drag.kind = 'ent';
    drag.id = eid;
    const multi = e.shiftKey || e.metaKey || e.ctrlKey || App.multi;
    const parts = selParts(App.sel, f), selIds = parts.e;
    drag.toggle = multi;
    drag.ids = selIds.indexOf(eid) >= 0 ? selIds.slice() : [eid];
    if (!multi && selIds.indexOf(eid) < 0) { App.sel = { t: 'ent', ids: [eid] }; drawOverlay(bd); }
    drag.start = {};
    drag.ids.forEach(id => {
      const o = ent(id);
      if (f.pos[id] && !(o && o.locked)) drag.start[id] = f.pos[id].slice();
    });
    /* Вместе с игроками тянем выбранные зоны и свободный мяч */
    drag.zstart = {};
    if (selIds.indexOf(eid) >= 0) {
      f.zones.forEach(z => { if (parts.z.indexOf(z.id) >= 0 && ['rect', 'text', 'ellipse'].indexOf(z.type) >= 0) drag.zstart[z.id] = clone(z); });
      drag.ballStart = parts.ball && f.ball && Array.isArray(f.ball.at) ? f.ball.at.slice() : null;
    }
    return;
  }
  if (target.hasAttribute('data-ball')) { drag.kind = 'ball'; return; }
  if (target.hasAttribute('data-bidx')) { drag.kind = 'bubble'; drag.idx = +target.getAttribute('data-bidx'); return; }
  if (target.hasAttribute('data-aidx')) { drag.kind = 'arrow'; drag.idx = +target.getAttribute('data-aidx'); return; }
  if (target.hasAttribute('data-zidx')) {
    drag.kind = 'zone';
    drag.idx = +target.getAttribute('data-zidx');
    const z = f.zones[drag.idx];
    drag.z0 = z && !z.locked ? clone(z) : null;
  }
}
function onMove(e, bd) {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gest) { updateGesture(bd); return; }
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
  drag.moved = true;
  if (drag.lpTimer) { clearTimeout(drag.lpTimer); drag.lpTimer = 0; }
  const f = frame(), u = unitsXY(e, bd);
  const du = [u[0] - drag.u0[0], u[1] - drag.u0[1]];
  switch (drag.kind) {
    case 'ent': {
      const snapped = App.snap && !e.altKey ? snapDelta(bd, drag, du) : null;
      const d2 = snapped ? snapped.du : du;
      drag.guides = snapped ? snapped.guides : null;
      for (const id in drag.start) f.pos[id] = [clampU(drag.start[id][0] + d2[0]), clampU(drag.start[id][1] + d2[1])];
      for (const zid in drag.zstart) {
        const z = f.zones.find(x => x.id === zid), z0 = drag.zstart[zid];
        if (!z) continue;
        if (z.type === 'ellipse') { z.cx = clampU(z0.cx + d2[0]); z.cy = clampU(z0.cy + d2[1]); }
        else { z.x = clampU(z0.x + d2[0]); z.y = clampU(z0.y + d2[1]); }
      }
      if (drag.ballStart) f.ball = { at: [clampU(drag.ballStart[0] + d2[0]), clampU(drag.ballStart[1] + d2[1])] };
      bd._snap(App.frameIdx);
      break;
    }
    case 'ball':
      f.ball = { at: u };
      bd._snap(App.frameIdx);
      break;
    case 'zone': {
      const z = f.zones[drag.idx], z0 = drag.z0;
      if (!z || !z0) break;
      if (z.type === 'rect' || z.type === 'text') { z.x = clampU(z0.x + du[0]); z.y = clampU(z0.y + du[1]); }
      else if (z.type === 'ellipse') { z.cx = clampU(z0.cx + du[0]); z.cy = clampU(z0.cy + du[1]); }
      bd._snap(App.frameIdx);
      break;
    }
    case 'handle':
      applyHandle(drag.handle, u, e, bd);
      bd._snap(App.frameIdx);
      break;
    case 'tool-zone':
      previewShape(bd, drag.u0, u);
      break;
    case 'tool-measure':
      App.measure.b = u;
      drawOverlay(bd);
      break;
    case 'marquee':
      drawMarquee(bd, drag.u0, u);
      break;
    default:
  }
}
/* Рамка выделения на поле */
function drawMarquee(bd, a, b) {
  drawOverlay(bd);
  const g = bd.gO, geo = bd.geo, k = unitScale(bd);
  const p = geo.pt(a[0], a[1]), q = geo.pt(b[0], b[1]);
  TE.S('rect', {
    x: Math.min(p[0], q[0]), y: Math.min(p[1], q[1]), width: Math.abs(p[0] - q[0]), height: Math.abs(p[1] - q[1]),
    fill: 'rgba(255,122,0,.12)', stroke: '#ff7a00', 'stroke-width': 2 * k, 'stroke-dasharray': `${5 * k} ${4 * k}`
  }, g);
}
/* Что попало в рамку: игроки, стрелки, зоны и свободный мяч */
function partsInRect(bd, a, b) {
  const f = frame(), out = { e: [], a: [], z: [], b: [], ball: false };
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  const inside = p => !!p && p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
  for (const id in bd.cur) if (inside(bd.cur[id])) out.e.push(id);
  f.arrows.forEach((ar, i) => {
    const G = bd.ageo[i];
    if (!G) return;
    const mid = bd.geo.inv((G.sx + 2 * G.cx + G.ex) / 4, (G.sy + 2 * G.cy + G.ey) / 4);
    if (inside(mid)) out.a.push(ar.id);
  });
  f.zones.forEach(z => { if (inside(zoneCenterU(bd, z))) out.z.push(z.id); });
  if (f.ball && !f.ball.owner && bd.ballXY) {
    const p = bd.geo.inv(bd.ballXY[0], bd.ballXY[1]);
    if (inside(p)) out.ball = true;
  }
  return out;
}
/* Выбор объекта касанием: с Shift или «Несколько сразу» — добавляет к выделению */
function pickObject(kind, idx, e) {
  const f = frame();
  const map = { arrow: ['a', f.arrows], zone: ['z', f.zones], bubble: ['b', f.bubbles] };
  const [key, list] = map[kind];
  const obj = list[idx];
  if (!obj) return;
  const multi = !!(e && (e.shiftKey || e.metaKey || e.ctrlKey)) || App.multi;
  if (!multi) { App.sel = { t: kind, i: idx }; return; }
  const parts = selParts(App.sel, f), at = parts[key].indexOf(obj.id);
  if (at >= 0) parts[key].splice(at, 1); else parts[key].push(obj.id);
  App.sel = selFromParts(parts, f);
}
function pickBall(e) {
  const f = frame();
  const multi = !!(e && (e.shiftKey || e.metaKey || e.ctrlKey)) || App.multi;
  if (!multi) { App.sel = { t: 'ball' }; return; }
  const parts = selParts(App.sel, f);
  parts.ball = !parts.ball;
  App.sel = selFromParts(parts, f);
}
/* Быстрый выбор */
function selectKind(kind) {
  const b = board(), f = frame();
  const ids = b.entities.filter(e => f.pos[e.id] && (kind === 'eq' ? !TE.isPlayer(e) : e.kind === kind)).map(e => e.id);
  App.sel = ids.length ? { t: 'ent', ids } : null;
  if (!ids.length) toast('На этом шаге таких нет');
  refresh(['canvas', 'insp']);
}
function selectAllOnFrame() {
  const b = board(), f = frame();
  if (!b || !f) return;
  App.sel = selFromParts({
    e: b.entities.filter(e => f.pos[e.id]).map(e => e.id),
    a: f.arrows.map(a => a.id),
    z: f.zones.map(z => z.id),
    b: f.bubbles.map(x => x.id),
    ball: !!f.ball
  }, f);
  refresh(['canvas', 'insp']);
}
function invertSelection() {
  const b = board(), f = frame(), cur = selParts(App.sel, f);
  App.sel = selFromParts({ e: b.entities.filter(e => f.pos[e.id] && cur.e.indexOf(e.id) < 0).map(e => e.id), a: [], z: [], b: [], ball: false }, f);
  refresh(['canvas', 'insp']);
}