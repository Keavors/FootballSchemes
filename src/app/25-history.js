

/* ---------- Изменения, отмена, сохранение ---------- */
let saveTimer = null;
function touch() {
  App.project.updated = Date.now();
  App.dirtyExport = true;
  App.saving = 'pending';
  setSaveBadge();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 1200);
}
async function saveNow() {
  clearTimeout(saveTimer);
  if (!App.project) return;
  App.saving = 'saving';
  setSaveBadge();
  const ok = await saveProject(App.project);
  App.saving = ok === 'quota' ? 'quota' : ok ? 'saved' : 'error';
  setSaveBadge();
  if (ok) askPersist();
}
function setSaveBadge() {
  const el = $('#saveBadge');
  if (!el) return;
  if (Store.mode === 'memory') {
    el.textContent = 'Без автосохранения';
    el.className = 'save-badge warn';
    el.title = 'В этом окружении проекты не сохраняются между сеансами. Сохраняйте файл через «Экспорт».';
    return;
  }
  const bad = App.saving === 'error' || App.saving === 'quota';
  el.className = 'save-badge' + (bad ? ' warn' : '');
  el.title = App.saving === 'quota' ? 'В браузере кончилось место. Сохраните файл через «Экспорт» и удалите лишние презентации на главной.' : '';
  el.textContent = { pending: 'Изменено…', saving: 'Сохраняю…', saved: 'Сохранено', error: 'Не удалось сохранить', quota: 'Нет места в браузере', idle: '' }[App.saving] || '';
}
function commit(fn, opts) {
  opts = opts || {};
  const before = opts.before || snapshot();
  if (fn) fn(App.project);
  /* Ничего не поменялось — не засоряем «Отменить» и не помечаем проект изменённым */
  if (snapshot() === before) { refresh(opts.parts); return; }
  const now = Date.now();
  const coalesce = !!(opts.key && hist.key === opts.key && now - hist.t < 1500);
  if (!coalesce) {
    hist.past.push(before);
    if (hist.past.length > 80) hist.past.shift();
    hist.future = [];
  }
  hist.key = opts.key || null;
  hist.t = now;
  touch();
  refresh(opts.parts);
}
function fixState() {
  const p = App.project;
  App.slideIdx = Math.max(0, Math.min(App.slideIdx, p.slides.length - 1));
  const b = board();
  App.frameIdx = b ? Math.max(0, Math.min(App.frameIdx, b.frames.length - 1)) : 0;
  const f = frame(), s = App.sel;
  if (!s) return;
  if (!b || !f) { App.sel = null; return; }
  if (s.t === 'ent') { s.ids = s.ids.filter(id => b.entities.some(e => e.id === id)); if (!s.ids.length) App.sel = null; }
  else if (s.t === 'arrow' && !f.arrows[s.i]) App.sel = null;
  else if (s.t === 'zone' && !f.zones[s.i]) App.sel = null;
  else if (s.t === 'bubble' && !f.bubbles[s.i]) App.sel = null;
  else if (s.t === 'ball' && !f.ball) App.sel = null;
  else if (s.t === 'mix') {
    const has = (list, id) => list.some(x => x.id === id);
    App.sel = selFromParts({
      e: (s.ids || []).filter(id => b.entities.some(e => e.id === id)),
      a: (s.arrows || []).filter(id => has(f.arrows, id)),
      z: (s.zones || []).filter(id => has(f.zones, id)),
      b: (s.bubbles || []).filter(id => has(f.bubbles, id)),
      ball: !!(s.ball && f.ball)
    }, f);
  }
}
function undo() {
  if (!hist.past.length || App.playing) return;
  hist.future.push(snapshot());
  App.project = JSON.parse(hist.past.pop());
  hist.key = null;
  fixState();
  touch();
  refresh();
}
function redo() {
  if (!hist.future.length || App.playing) return;
  hist.past.push(snapshot());
  App.project = JSON.parse(hist.future.pop());
  hist.key = null;
  fixState();
  touch();
  refresh();
}
function updateUndoBtns() {
  const u = $('#btnUndo'), r = $('#btnRedo');
  if (u) u.disabled = !hist.past.length;
  if (r) r.disabled = !hist.future.length;
}
function refresh(parts) {
  if (App.view !== 'editor' || !App.project) return;
  fixState();
  const all = !parts, has = p => all || parts.indexOf(p) >= 0;
  if (has('top')) renderTop();
  if (has('slides')) renderSlides();
  if (has('main')) { renderTabs(); renderStage(); renderTimeline(); }
  else {
    if (has('tools')) renderTools();
    if (has('canvas')) renderCanvas();
    else if (has('style')) restyleCanvas();
    if (has('timeline')) renderTimeline();
  }
  if (has('bar') && !has('canvas') && !has('main')) renderActionBar();
  if (has('insp')) renderInspector();
  updateUndoBtns();
  setSaveBadge();
}