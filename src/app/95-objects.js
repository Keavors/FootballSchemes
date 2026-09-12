
/* ---------- Операции над объектами ---------- */
function setVisible(id, v) {
  const b = board(), f = frame(), i = App.frameIdx;
  if (!v) { f.pos[id] = null; return; }
  if (f.pos[id]) return;
  let p = null;
  for (let k = i - 1; k >= 0 && !p; k--) if (b.frames[k].pos[id]) p = b.frames[k].pos[id];
  for (let k = i + 1; k < b.frames.length && !p; k++) if (b.frames[k].pos[id]) p = b.frames[k].pos[id];
  f.pos[id] = (p || [50, 50]).slice();
}
function toggleIn(key, id, v) {
  const f = frame(), k = f[key].indexOf(id);
  if (v && k < 0) f[key].push(id);
  if (!v && k >= 0) f[key].splice(k, 1);
}
function setMoveArrow(id, v) {
  const f = frame(), k = f.arrows.findIndex(a => a.kind === 'move' && a.target === id);
  if (v && k < 0) f.arrows.push({ id: uid(), kind: 'move', target: id, style: 'dashed', color: 'auto', width: 2.8, head: true, bend: 0 });
  if (!v && k >= 0) f.arrows.splice(k, 1);
}
/* Очередь игрока внутри шага: 1 — двигается сразу, 2 — следом и так далее */
function entOrder(id) {
  const f = frame();
  if (f.ord && f.ord[id]) return Math.max(1, Math.min(4, Math.round(f.ord[id])));
  const mv = f.arrows.find(a => a.kind === 'move' && a.target === id);
  return mv && mv.ord ? Math.max(1, Math.min(4, Math.round(mv.ord))) : 1;
}
function setEntOrder(id, n) {
  const f = frame();
  f.ord = f.ord || {};
  if (n <= 1) delete f.ord[id]; else f.ord[id] = n;
  const mv = f.arrows.find(a => a.kind === 'move' && a.target === id);
  if (mv) { if (n <= 1) delete mv.ord; else mv.ord = n; }
}
function framePhases() {
  const f = frame();
  return f ? TE.frameOrders(f, f.pos).phases : 1;
}
function autoOrderFrame() {
  commit(() => {
    const f = frame();
    f.ord = f.ord || {};
    f.arrows.forEach(a => {
      if (a.kind === 'move') { a.ord = 2; f.ord[a.target] = 2; }
      else a.ord = 1;
    });
  }, { parts: ['canvas', 'insp'] });
  toast('Сначала пас, потом пробежки');
}
const ORDER_SEG = [[1, '1'], [2, '2'], [3, '3'], [4, '4']];
/* Вопрос, который показываем команде перед этим шагом */
function setQuiz(key, v) {
  const f = frame();
  const cur = f.quiz ? clone(f.quiz) : { q: '', a: '' };
  cur[key] = v;
  if (String(cur.q || '').trim()) f.quiz = cur; else delete f.quiz;
}
function setBubble(id, text) {
  const f = frame(), k = f.bubbles.findIndex(b => b.target === id);
  if (!text) { if (k >= 0) f.bubbles.splice(k, 1); return; }
  if (k >= 0) f.bubbles[k].text = text;
  else f.bubbles.push({ id: uid(), target: id, text, color: App.project.settings.colors.special, below: false });
}
/* Горизонтально ли лежит поле на текущей схеме */
/* Горизонтально ли лежит поле на текущей схеме (у схемы может быть своя ориентация) */
function boardHoriz() {
  const b = board(), v = (b && b.view) || {};
  if (v.orientation === 'horizontal') return true;
  if (v.orientation === 'vertical') return false;
  return !!(App.project && App.project.settings.pitch.orientation === 'horizontal');
}
/* Кольцо вокруг каждого из игроков на текущем шаге */
function addRings(ids) {
  commit(() => {
    const fr = frame();
    ids.forEach(id => {
      if (fr.pos[id]) fr.zones.push({ id: uid(), type: 'ring', target: id, r: 30, color: '#ffffff', label: '', lpos: 'below', stroke: 'dashed' });
    });
    App.sel = { t: 'zone', i: fr.zones.length - 1 };
  }, { parts: ['canvas', 'insp'] });
}
function copyPosForward(ids, all) {
  const b = board(), f = frame();
  b.frames.forEach((fr, k) => {
    if (fr === f || (!all && k < App.frameIdx)) return;
    ids.forEach(id => { if (f.pos[id]) fr.pos[id] = f.pos[id].slice(); });
  });
  toast(all ? 'Позиции скопированы во все шаги' : 'Позиции скопированы в следующие шаги');
}
function copyAnnoForward(key, i, all) {
  commit(() => {
    const b = board(), f = frame();
    const last = all ? b.frames.length - 1 : App.frameIdx + 1;
    for (let k = App.frameIdx + 1; k <= last && k < b.frames.length; k++) {
      const c = clone(f[key][i]);
      c.id = uid();
      b.frames[k][key].push(c);
    }
  }, { parts: ['canvas'] });
  toast('Скопировано');
}
function alignEntities(ids, axis) {
  const f = frame();
  const pts = ids.map(id => f.pos[id]).filter(Boolean);
  if (!pts.length) return;
  const avg = pts.reduce((s, p) => s + p[axis], 0) / pts.length;
  ids.forEach(id => { if (f.pos[id]) f.pos[id][axis] = +avg.toFixed(1); });
}
/* Распределить выбранных равномерно по оси: 0 — поперёк поля, 1 — вдоль */
function distributeEntities(ids, axis) {
  const f = frame();
  const list = ids.filter(id => f.pos[id]).sort((a, b) => f.pos[a][axis] - f.pos[b][axis]);
  if (list.length < 3) return;
  const a = f.pos[list[0]][axis], b = f.pos[list[list.length - 1]][axis];
  list.forEach((id, i) => { f.pos[id][axis] = +(a + (b - a) * i / (list.length - 1)).toFixed(1); });
}
function mirrorEntities(ids, axis) {
  const f = frame();
  ids.forEach(id => { const p = f.pos[id]; if (p) p[axis] = +(100 - p[axis]).toFixed(1); });
}
/* Развернуть шаг на 180° — как будто смотрим с другой стороны поля */
function rotateFrame180() {
  const f = frame();
  const flip = p => [+(100 - p[0]).toFixed(1), +(100 - p[1]).toFixed(1)];
  for (const id in f.pos) if (f.pos[id]) f.pos[id] = flip(f.pos[id]);
  if (f.ball && f.ball.at) f.ball.at = flip(f.ball.at);
  f.arrows.forEach(a => ['from', 'to'].forEach(s => { if (a[s] && a[s].p) a[s] = { p: flip(a[s].p) }; }));
  f.zones.forEach(z => {
    if (z.type === 'rect') { const p = flip([z.x + z.w, z.y + z.h]); z.x = p[0]; z.y = p[1]; }
    else if (z.type === 'ellipse') { const p = flip([z.cx, z.cy]); z.cx = p[0]; z.cy = p[1]; }
    else if (z.type === 'text') { const p = flip([z.x, z.y]); z.x = p[0]; z.y = p[1]; }
  });
}
/* Расставить соперников зеркально нашим: показать, что нас встречает такая же схема */
function mirrorOpponents() {
  const b = board(), f = frame();
  const ours = b.entities.filter(e => e.kind === 'ours' && f.pos[e.id]);
  const opps = b.entities.filter(e => e.kind === 'opp');
  let made = 0;
  ours.forEach((o, i) => {
    let t = opps[i];
    if (!t) {
      t = { id: uid(), kind: 'opp', label: '', number: String(i + 1), gk: !!o.gk };
      b.entities.push(t);
      opps.push(t);
      b.frames.forEach(fr => { if (fr !== f) fr.pos[t.id] = null; });
      made++;
    }
    const p = f.pos[o.id];
    t.gk = !!o.gk;
    f.pos[t.id] = [+(100 - p[0]).toFixed(1), +(100 - p[1]).toFixed(1)];
  });
  opps.slice(ours.length).forEach(t => { f.pos[t.id] = null; });
  return made;
}
/* Порядок наложения зон и стрелок */
function reorderItem(key, i, dir) {
  const f = frame(), list = f[key];
  if (i < 0 || i >= list.length) return;
  const [it] = list.splice(i, 1);
  const at = dir > 0 ? list.length : 0;
  list.splice(at, 0, it);
  App.sel = { t: key === 'zones' ? 'zone' : 'arrow', i: at };
}
/* Сдвинуть выделенное стрелками клавиатуры */
function nudgeSelection(d) {
  const f = frame(), p = selParts();
  p.e.forEach(id => {
    const q = f.pos[id], o = ent(id);
    if (!q || (o && o.locked)) return;
    q[0] = clampU(q[0] + d[0]);
    q[1] = clampU(q[1] + d[1]);
  });
  p.z.forEach(id => {
    const z = f.zones.find(x => x.id === id);
    if (!z || z.locked) return;
    if (z.type === 'ellipse') { z.cx = clampU(z.cx + d[0]); z.cy = clampU(z.cy + d[1]); }
    else if (z.type === 'rect' || z.type === 'text') { z.x = clampU(z.x + d[0]); z.y = clampU(z.y + d[1]); }
  });
  p.a.forEach(id => {
    const a = f.arrows.find(x => x.id === id);
    if (!a || a.kind === 'move') return;
    ['from', 'to'].forEach(s => { if (a[s] && a[s].p) a[s] = { p: [clampU(a[s].p[0] + d[0]), clampU(a[s].p[1] + d[1])] }; });
  });
  if (p.ball && f.ball && f.ball.at) f.ball.at = [clampU(f.ball.at[0] + d[0]), clampU(f.ball.at[1] + d[1])];
}
function duplicateEntity(id) {
  App.sel = { t: 'ent', ids: [id] };
  duplicateSelection();
}
function deleteEntities(ids) {
  const b = board();
  const gone = id => ids.indexOf(id) >= 0;
  b.entities = b.entities.filter(e => !gone(e.id));
  b.frames.forEach(f => {
    ids.forEach(id => { delete f.pos[id]; });
    ['hl', 'dim', 'focus'].forEach(k => { f[k] = f[k].filter(id => !gone(id)); });
    f.arrows = f.arrows.filter(a => !(a.kind === 'move' && gone(a.target)) && !(a.from && a.from.e && gone(a.from.e)) && !(a.to && a.to.e && gone(a.to.e)));
    f.bubbles = f.bubbles.filter(x => !gone(x.target));
    f.zones = f.zones.filter(z => {
      if (z.type === 'ring') return !gone(z.target);
      if (z.ids) { z.ids = z.ids.filter(id => !gone(id)); return z.ids.length > 0; }
      return true;
    });
    if (f.ball && f.ball.owner && gone(f.ball.owner)) f.ball = null;
  });
  App.sel = null;
}
function deleteSelection() {
  const s = App.sel, f = frame();
  if (!s || !f) return;
  if (s.t === 'mix') commit(() => deleteParts(selParts(s, frame())), { parts: ['canvas', 'insp'] });
  else if (s.t === 'ent') commit(() => deleteEntities(s.ids), { parts: ['canvas', 'insp'] });
  else if (s.t === 'arrow') commit(() => { f.arrows.splice(s.i, 1); App.sel = null; }, { parts: ['canvas', 'insp'] });
  else if (s.t === 'zone') commit(() => { f.zones.splice(s.i, 1); App.sel = null; }, { parts: ['canvas', 'insp'] });
  else if (s.t === 'bubble') commit(() => { f.bubbles.splice(s.i, 1); App.sel = null; }, { parts: ['canvas', 'insp'] });
  else if (s.t === 'ball') commit(() => { f.ball = null; App.sel = null; }, { parts: ['canvas', 'insp'] });
}
/* Удалить наборы объектов на текущем шаге (игроки — со всей схемы) */
function deleteParts(p) {
  const f = frame();
  f.arrows = f.arrows.filter(a => p.a.indexOf(a.id) < 0);
  f.zones = f.zones.filter(z => p.z.indexOf(z.id) < 0);
  f.bubbles = f.bubbles.filter(x => p.b.indexOf(x.id) < 0);
  if (p.ball) f.ball = null;
  if (p.e.length) deleteEntities(p.e);
  App.sel = null;
}
/* Свойства смешанного выделения */
function inspMix(sel) {
  const p = selParts(sel);
  const rows = [[p.e.length, 'игроков и инвентаря'], [p.a.length, 'стрелок'], [p.z.length, 'зон и надписей'], [p.b.length, 'реплик'], [p.ball ? 1 : 0, 'мяч']].filter(r => r[0]);
  return [
    sect(null,
      h('p', { class: 'muted small', style: 'margin:0 0 8px' }, rows.map(r => r[0] + ' ' + r[1]).join(' · ')),
      h('div', { class: 'btn-row' },
        p.e.length ? btn('users', 'Только игроки', () => { App.sel = { t: 'ent', ids: p.e.slice() }; refresh(['canvas', 'insp']); }, false, 'sm') : null,
        btn('', 'Инвертировать', invertSelection, false, 'sm'),
        btn('', 'Снять выделение', () => { App.sel = null; refresh(['canvas', 'insp']); }, false, 'sm'))),
    sect('Буфер обмена', clipRow()),
    styleClip ? sect('Оформление', h('div', { class: 'btn-row' },
      btn('check', 'Применить оформление', () => commit(() => applyStyleToParts(selParts(App.sel)), { parts: ['canvas', 'insp'] }), false, 'sm'))) : null,
    sect(null, btn('trash', 'Удалить выбранное', () => commit(() => deleteParts(selParts(App.sel)), { parts: ['canvas', 'insp'] }), false, 'sm danger'))
  ];
}