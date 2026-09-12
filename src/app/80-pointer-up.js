function previewShape(bd, a, b) {
  drawOverlay(bd);
  const g = bd.gO, geo = bd.geo, k = unitScale(bd);
  const p = geo.pt(a[0], a[1]), q = geo.pt(b[0], b[1]);
  const attrs = { fill: 'rgba(255,255,255,.18)', stroke: '#ff7a00', 'stroke-width': 2.5 * k, 'stroke-dasharray': `${6 * k} ${4 * k}` };
  if (App.tool.m === 'rect') TE.S('rect', Object.assign({ x: Math.min(p[0], q[0]), y: Math.min(p[1], q[1]), width: Math.abs(p[0] - q[0]), height: Math.abs(p[1] - q[1]) }, attrs), g);
  else TE.S('ellipse', Object.assign({ cx: (p[0] + q[0]) / 2, cy: (p[1] + q[1]) / 2, rx: Math.abs(p[0] - q[0]) / 2, ry: Math.abs(p[1] - q[1]) / 2 }, attrs), g);
}
function applyHandle(name, u, e, bd) {
  const f = frame(), s = App.sel;
  if (!s) return;
  if (name === 'a-start' || name === 'a-end') {
    const a = f.arrows[s.i];
    if (a && a.kind !== 'move') a[name === 'a-start' ? 'from' : 'to'] = { p: u };
  } else if (name.indexOf('a-pt-') === 0) {
    const a = f.arrows[s.i], n = +name.slice(5);
    if (a && Array.isArray(a.pts) && a.pts[n]) a.pts[n] = [u[0], u[1]];
  } else if (name === 'a-bend') {
    const a = f.arrows[s.i], G = bd.ageo[s.i];
    if (!a || !G) return;
    const p = svgXY(e, bd);
    const mx = (G.sx + G.ex) / 2, my = (G.sy + G.ey) / 2, dx = G.ex - G.sx, dy = G.ey - G.sy, L = Math.hypot(dx, dy) || 1;
    a.bend = Math.max(-240, Math.min(240, Math.round(2 * ((p[0] - mx) * (-dy / L) + (p[1] - my) * (dx / L)))));
  } else if (name === 'z-a' || name === 'z-b') {
    const z = f.zones[s.i];
    if (!z) return;
    const x1 = z.x + z.w, y1 = z.y + z.h;
    if (name === 'z-a') { z.x = u[0]; z.y = u[1]; z.w = x1 - u[0]; z.h = y1 - u[1]; }
    else { z.w = u[0] - z.x; z.h = u[1] - z.y; }
  } else if (name === 'z-e') {
    const z = f.zones[s.i];
    if (z) { z.rx = Math.max(1.5, Math.abs(u[0] - z.cx)); z.ry = Math.max(1, Math.abs(u[1] - z.cy)); }
  } else if (name === 'z-r') {
    const z = f.zones[s.i], p = z && bd.cur[z.target];
    if (p) { const c = bd.geo.pt(p[0], p[1]), q = svgXY(e, bd); z.r = Math.max(12, Math.round(Math.hypot(q[0] - c[0], q[1] - c[1]))); }
  }
}
function normalizeRect(z) {
  if (z.w < 0) { z.x += z.w; z.w = -z.w; }
  if (z.h < 0) { z.y += z.h; z.h = -z.h; }
  z.w = Math.max(3, +z.w.toFixed(1)); z.h = Math.max(2, +z.h.toFixed(1));
  z.x = +z.x.toFixed(1); z.y = +z.y.toFixed(1);
}
function onUp(e, bd, cancelled) {
  ptrs.delete(e.pointerId);
  if (gest) { if (ptrs.size < 2) gest = null; return; }
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  drag = null;
  if (d.lpTimer) clearTimeout(d.lpTimer);
  try { bd.svg.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  if (cancelled) {
    if (d.moved) { App.project = JSON.parse(d.before); refresh(); }
    return;
  }
  const f = frame(), u = unitsXY(e, bd);
  const openSheet = () => { if (isMobile() && !App.multi) App.sheet = true; };
  switch (d.kind) {
    case 'ent':
      if (d.moved) {
        if (App.autoArrows && App.frameIdx > 0) syncMoveArrows(Object.keys(d.start));
        commit(null, { before: d.before, parts: ['canvas', 'insp'] });
      } else if (d.toggle) {
        const parts = selParts(App.sel, f), at = parts.e.indexOf(d.id);
        if (at >= 0) parts.e.splice(at, 1); else parts.e.push(d.id);
        App.sel = selFromParts(parts, f);
        refresh(['canvas', 'insp']);
      } else {
        App.sel = { t: 'ent', ids: [d.id] };
        openSheet();
        refresh(['canvas', 'insp']);
      }
      break;
    case 'ball':
      if (d.moved) {
        const hit = nearestEntity(bd, e, 16);
        f.ball = hit && TE.isPlayer(ent(hit)) ? { owner: hit } : { at: u };
        App.sel = { t: 'ball' };
        commit(null, { before: d.before, parts: ['canvas', 'insp'] });
      } else { pickBall(e); openSheet(); refresh(['canvas', 'insp']); }
      break;
    case 'zone':
      if (d.moved && d.z0) commit(null, { before: d.before, parts: ['canvas', 'insp'] });
      else { pickObject('zone', d.idx, e); openSheet(); refresh(['canvas', 'insp']); }
      break;
    case 'arrow':
      pickObject('arrow', d.idx, e); openSheet(); refresh(['canvas', 'insp']);
      break;
    case 'bubble':
      pickObject('bubble', d.idx, e); openSheet(); refresh(['canvas', 'insp']);
      break;
    case 'marquee': {
      if (!d.moved) { if (App.sel) { App.sel = null; refresh(['canvas', 'insp']); } break; }
      const add = !!(e.shiftKey || e.metaKey || e.ctrlKey) || App.multi;
      const found = partsInRect(bd, d.u0, u);
      const cur = add ? selParts(App.sel, f) : { e: [], a: [], z: [], b: [], ball: false };
      ['e', 'a', 'z', 'b'].forEach(key => found[key].forEach(id => { if (cur[key].indexOf(id) < 0) cur[key].push(id); }));
      cur.ball = cur.ball || found.ball;
      App.sel = selFromParts(cur, f);
      openSheet();
      refresh(['canvas', 'insp']);
      break;
    }
    case 'handle':
      if (d.moved) {
        const s = App.sel;
        if (s && s.t === 'arrow' && (d.handle === 'a-start' || d.handle === 'a-end')) {
          const a = f.arrows[s.i], hit = nearestEntity(bd, e, 14);
          if (a && hit) a[d.handle === 'a-start' ? 'from' : 'to'] = { e: hit };
        }
        if (s && s.t === 'zone' && f.zones[s.i] && f.zones[s.i].type === 'rect') normalizeRect(f.zones[s.i]);
        commit(null, { before: d.before, parts: ['canvas', 'insp'] });
      }
      break;
    case 'empty':
      if (!d.moved && App.sel) { App.sel = null; refresh(['canvas', 'insp']); }
      break;
    case 'tool-arrow':
      arrowToolTap(d.ref, bd);
      break;
    case 'tool-stamp':
      addEntity(App.tool.kind, { gk: !!App.tool.gk, at: u, keepTool: true });
      break;
    case 'tool-measure':
      App.measure.b = measurePoint(bd, e, u);
      refresh(['tools', 'canvas']);
      break;
    case 'tool-zone': {
      const t = App.tool.m;
      const a = d.u0, b = d.moved ? u : null;
      commit(() => {
        const fr = frame();
        let z;
        if (t === 'rect') {
          z = b && Math.abs(b[0] - a[0]) > 3 && Math.abs(b[1] - a[1]) > 2
            ? { type: 'rect', x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] }
            : { type: 'rect', x: a[0] - 15, y: a[1] - 9, w: 30, h: 18 };
          normalizeRect(z);
        } else {
          z = b && Math.abs(b[0] - a[0]) > 3
            ? { type: 'ellipse', cx: +((a[0] + b[0]) / 2).toFixed(1), cy: +((a[1] + b[1]) / 2).toFixed(1), rx: Math.max(2, Math.abs(b[0] - a[0]) / 2), ry: Math.max(1.5, Math.abs(b[1] - a[1]) / 2) }
            : { type: 'ellipse', cx: a[0], cy: a[1], rx: 12, ry: 8 };
        }
        Object.assign(z, { id: uid(), color: '#ffffff', label: '', lpos: t === 'rect' ? 'top' : 'bottom', stroke: 'dashed' });
        fr.zones.push(z);
        App.sel = { t: 'zone', i: fr.zones.length - 1 };
        App.tool = { m: 'select' };
      }, { parts: ['tools', 'canvas', 'insp'] });
      openSheet();
      break;
    }
    case 'tool-text':
      commit(() => {
        const fr = frame();
        fr.zones.push({ id: uid(), type: 'text', x: u[0], y: u[1], text: 'Надпись', color: '#ffffff', size: 24, font: 'hand' });
        App.sel = { t: 'zone', i: fr.zones.length - 1 };
        App.tool = { m: 'select' };
        App.sheet = true;
      }, { parts: ['tools', 'canvas', 'insp'] });
      setTimeout(() => { const i = $('#edInsp [data-focus]'); if (i) { i.focus(); i.select(); } }, 60);
      break;
    default:
  }
}
function arrowToolTap(ref, bd) {
  const t = App.tool;
  if (!t.from) { t.from = ref; refresh(['tools']); drawOverlay(bd); return; }
  const from = t.from;
  t.from = null;
  if (from.e && ref.e && from.e === ref.e) { refresh(['tools', 'canvas']); return; }
  if (from.p && ref.p && Math.hypot(from.p[0] - ref.p[0], from.p[1] - ref.p[1]) < 2) { refresh(['tools', 'canvas']); return; }
  const PRE = arrowPresets();
  const preset = PRE[t.preset] || PRE.run;
  commit(() => {
    const fr = frame(), b = board();
    const fromEnt = from.e ? b.entities.find(x => x.id === from.e) : null;
    const movers = ['run', 'dribble', 'opprun', 'press'];
    const moving = (preset.move || movers.indexOf(t.preset) >= 0) && fromEnt && ref.p && App.frameIdx > 0;
    let a;
    if (moving) {
      fr.pos[from.e] = ref.p.slice();
      fr.arrows = fr.arrows.filter(x => !(x.kind === 'move' && x.target === from.e));
      a = Object.assign({ id: uid(), kind: 'move', target: from.e, bend: 0 }, clone(preset.a));
      if (t.preset === 'dribble') fr.ball = { owner: from.e };
    } else {
      a = Object.assign({ id: uid(), kind: 'line', from: clone(from), to: clone(ref), bend: 0 }, clone(preset.a));
      if (preset.ball && t.ballFollows) {
        if (t.preset === 'dribble') fr.ball = ref.p ? { at: ref.p.slice() } : { owner: ref.e };
        else fr.ball = ref.e ? { owner: ref.e } : { at: ref.p.slice() };
      }
    }
    fr.arrows.push(a);
    App.sel = { t: 'arrow', i: fr.arrows.length - 1 };
  }, { parts: ['tools', 'canvas', 'insp'] });
}
function syncMoveArrows(ids) {
  const b = board(), i = App.frameIdx;
  if (!b || i < 1) return;
  const f = b.frames[i], prev = b.frames[i - 1];
  ids.forEach(id => {
    const e = b.entities.find(x => x.id === id);
    const a = prev.pos[id], c = f.pos[id];
    const has = f.arrows.findIndex(x => x.kind === 'move' && x.target === id);
    if (!e || !a || !c) return;
    const dist = Math.hypot(a[0] - c[0], a[1] - c[1]);
    if (dist > 4 && has < 0) {
      f.arrows.push({ id: uid(), kind: 'move', target: id, style: 'dashed', color: 'auto', width: 2.8, head: true, bend: 0 });
    } else if (dist <= 4 && has >= 0) {
      f.arrows.splice(has, 1);
      if (App.sel && App.sel.t === 'arrow') App.sel = null;
    }
  });
}