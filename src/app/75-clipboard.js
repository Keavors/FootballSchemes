/* ---------- Буфер обмена ---------- */
const CLIP_KEY = 'ustanovka-clip';
let clipCache = null, pasteStep = 0;

function setClip(clip) {
  clipCache = clip;
  pasteStep = 0;
  try { if (LS) LS.setItem(CLIP_KEY, JSON.stringify(clip)); } catch (x) { /* не влезло — останется в памяти */ }
}
function getClip() {
  if (clipCache) return clipCache;
  try { const v = LS && LS.getItem(CLIP_KEY); if (v) clipCache = JSON.parse(v); } catch (x) { clipCache = null; }
  return clipCache;
}
/* Собрать буфер: выбранное и всё, что к нему относится (стрелки, реплики, мяч, связи) */
function makeClip(parts) {
  const b = board(), f = frame();
  const has = id => parts.e.indexOf(id) >= 0;
  const clip = {
    kind: 'objects', v: 1, format: App.project.settings.format, title: App.project.title, time: Date.now(),
    entities: b.entities.filter(e => has(e.id)).map(e => clone(e)),
    pos: {}, hl: [], dim: [], focus: [], arrows: [], zones: [], bubbles: [], ball: null
  };
  clip.entities.forEach(e => { if (f.pos[e.id]) clip.pos[e.id] = f.pos[e.id].slice(); });
  ['hl', 'dim', 'focus'].forEach(k => { clip[k] = f[k].filter(has); });
  f.arrows.forEach(a => {
    const picked = parts.a.indexOf(a.id) >= 0;
    const linked = a.kind === 'move'
      ? has(a.target)
      : !!((a.from && a.from.e) || (a.to && a.to.e)) && (!a.from || !a.from.e || has(a.from.e)) && (!a.to || !a.to.e || has(a.to.e));
    if (picked || linked) clip.arrows.push(clone(a));
  });
  f.zones.forEach(z => {
    const picked = parts.z.indexOf(z.id) >= 0;
    const linked = z.type === 'ring' ? has(z.target) : !!(z.ids && z.ids.length && z.ids.every(has));
    if (picked || linked) clip.zones.push(clone(z));
  });
  f.bubbles.forEach(x => { if (parts.b.indexOf(x.id) >= 0 || has(x.target)) clip.bubbles.push(clone(x)); });
  if (f.ball && (parts.ball || (f.ball.owner && has(f.ball.owner)))) clip.ball = clone(f.ball);
  return clip;
}
/* Вставить копии объектов на текущий шаг; dx/dy — смещение, чтобы копия не легла точно поверх */
function pasteObjects(clip, opts) {
  opts = opts || {};
  const b = board(), f = frame(), map = {};
  const dx = opts.dx || 0, dy = opts.dy || 0;
  const parts = { e: [], a: [], z: [], b: [], ball: false };
  const shift = p => [clampU(p[0] + dx), clampU(p[1] + dy)];
  (clip.entities || []).forEach(src => {
    const e = clone(src);
    e.id = uid();
    map[src.id] = e.id;
    b.entities.push(e);
    const p = clip.pos[src.id] ? shift(clip.pos[src.id]) : null;
    b.frames.forEach(fr => { fr.pos[e.id] = p ? p.slice() : null; });
    parts.e.push(e.id);
  });
  const ref = id => map[id] || (b.entities.some(x => x.id === id) ? id : null);
  ['hl', 'dim', 'focus'].forEach(k => (clip[k] || []).forEach(id => {
    const t = ref(id);
    if (t && f[k].indexOf(t) < 0) f[k].push(t);
  }));
  (clip.arrows || []).forEach(src => {
    const a = clone(src);
    a.id = uid();
    if (a.kind === 'move') {
      const t = ref(a.target);
      if (!t) return;
      a.target = t;
    } else {
      const fix = side => {
        if (!a[side]) return true;
        if (a[side].e) {
          const t = ref(a[side].e);
          if (t) { a[side] = { e: t }; return true; }
          const p = clip.pos[a[side].e];
          if (p) { a[side] = { p: shift(p) }; return true; }
          return false;
        }
        if (a[side].p) a[side] = { p: shift(a[side].p) };
        return true;
      };
      if (!fix('from') || !fix('to')) return;
    }
    f.arrows.push(a);
    parts.a.push(a.id);
  });
  (clip.zones || []).forEach(src => {
    const z = clone(src);
    z.id = uid();
    if (z.type === 'ring') { const t = ref(z.target); if (!t) return; z.target = t; }
    else if (z.ids) { z.ids = z.ids.map(ref).filter(Boolean); if (!z.ids.length) return; }
    else if (z.type === 'ellipse') { z.cx = clampU(z.cx + dx); z.cy = clampU(z.cy + dy); }
    else { z.x = clampU(z.x + dx); z.y = clampU(z.y + dy); }
    f.zones.push(z);
    parts.z.push(z.id);
  });
  (clip.bubbles || []).forEach(src => {
    const x = clone(src);
    x.id = uid();
    const t = ref(x.target);
    if (!t) return;
    x.target = t;
    f.bubbles.push(x);
    parts.b.push(x.id);
  });
  if (clip.ball) {
    if (clip.ball.owner) { const t = ref(clip.ball.owner); if (t) { f.ball = { owner: t }; parts.ball = true; } }
    else if (clip.ball.at) { f.ball = { at: shift(clip.ball.at) }; parts.ball = true; }
  }
  return parts;
}
/* Вставить расстановку: те же игроки встают так, как были скопированы */
function pastePositions(clip) {
  const b = board(), f = frame(), used = {};
  let n = 0;
  (clip.entities || []).forEach(src => {
    const p = clip.pos[src.id];
    if (!p) return;
    const name = src.label || src.number;
    let target = b.entities.find(e => e.id === src.id && !used[e.id]);
    if (!target && name) target = b.entities.find(e => !used[e.id] && e.kind === src.kind && !!e.gk === !!src.gk && (e.label || e.number) === name);
    if (!target) return;
    used[target.id] = 1;
    f.pos[target.id] = p.slice();
    n++;
  });
  return n;
}
function copySelection(cut) {
  if (!selCount(App.sel)) { toast('Сначала выберите, что копировать'); return; }
  const parts = selParts();
  setClip(makeClip(parts));
  if (cut) commit(() => deleteParts(parts), { parts: ['canvas', 'insp', 'tools'] });
  else refresh(['insp', 'tools', 'bar']);
  toast(cut ? 'Вырезано' : 'Скопировано');
}
function pasteClipboard(mode) {
  const clip = getClip();
  if (!clip) { toast('Буфер пуст'); return; }
  if (clip.kind === 'slide') { pasteSlideClip(clip); return; }
  if (clip.kind === 'frame') { pasteFrameClip(clip); return; }
  if (clip.kind === 'frames') { pasteFramesClip(clip); return; }
  if (!board()) { toast('На этом слайде нет схемы'); return; }
  if (mode === 'positions') {
    let n = 0;
    commit(() => { n = pastePositions(clip); }, { parts: ['canvas', 'insp'] });
    toast(n ? `Позиции вставлены: ${n}` : 'Тех же игроков здесь нет — вставьте копии');
    return;
  }
  const step = mode === 'place' ? 0 : ++pasteStep;
  commit(() => {
    const parts = pasteObjects(clip, { dx: step * 4, dy: step * 3 });
    App.sel = selFromParts(parts, frame());
  }, { parts: ['canvas', 'insp', 'tools'] });
  toast('Вставлено');
}
function duplicateSelection() {
  if (!selCount(App.sel)) return;
  const clip = makeClip(selParts());
  commit(() => {
    App.sel = selFromParts(pasteObjects(clip, { dx: 4, dy: 3 }), frame());
  }, { parts: ['canvas', 'insp'] });
}
/* Кнопки буфера для панели свойств */
function clipRow() {
  const has = selCount(App.sel) > 0, clip = getClip();
  return h('div', { class: 'btn-row' },
    btn('copy', 'Копировать', () => copySelection(false), !has, 'sm'),
    btn('', 'Вырезать', () => copySelection(true), !has, 'sm'),
    btn('copy', 'Дублировать', duplicateSelection, !has, 'sm'),
    clip ? btn('', 'Вставить', () => pasteClipboard('copy'), false, 'sm') : null,
    clip ? btn('', 'Вставить на то же место', () => pasteClipboard('place'), false, 'sm') : null,
    clip ? btn('', 'Вставить позиции', () => pasteClipboard('positions'), false, 'sm', 'Те же игроки встанут так, как были скопированы') : null);
}
/* ---------- Формат по образцу ---------- */
let styleClip = null;
const STYLE_KEYS = {
  arrow: ['style', 'color', 'width', 'head', 'opacity', 'draw'],
  zone: ['color', 'fill', 'stroke', 'size', 'lpos', 'font', 'outline', 'width'],
  player: ['color', 'textColor', 'shape', 'size'],
  equip: ['color', 'size', 'rot']
};
/* Что имеет смысл переносить между зонами разного вида */
const ZONE_STYLE = {
  rect: ['color', 'fill', 'stroke', 'size', 'lpos'],
  ellipse: ['color', 'fill', 'stroke', 'size', 'lpos'],
  ring: ['color', 'fill', 'stroke', 'size', 'lpos'],
  hull: ['color', 'fill', 'stroke', 'size'],
  poly: ['color', 'fill', 'stroke'],
  link: ['color', 'width', 'size', 'lpos'],
  text: ['color', 'size', 'font', 'outline']
};
function copyStyle(kind, obj) {
  if (!obj) return;
  const v = {};
  (STYLE_KEYS[kind] || []).forEach(k => { if (obj[k] !== undefined) v[k] = clone(obj[k]); });
  styleClip = { kind, v };
  toast('Оформление скопировано');
  refresh(['insp']);
}
function applyStyleTo(kind, list) {
  if (!styleClip || styleClip.kind !== kind) return 0;
  let n = 0;
  list.forEach(o => {
    if (!o) return;
    const allow = kind === 'zone' ? (ZONE_STYLE[o.type] || []) : (STYLE_KEYS[kind] || []);
    Object.keys(styleClip.v).forEach(k => { if (allow.indexOf(k) >= 0) o[k] = clone(styleClip.v[k]); });
    n++;
  });
  return n;
}
function applyStyleToParts(p) {
  if (!styleClip) return;
  const f = frame();
  if (styleClip.kind === 'arrow') applyStyleTo('arrow', f.arrows.filter(a => p.a.indexOf(a.id) >= 0));
  else if (styleClip.kind === 'zone') applyStyleTo('zone', f.zones.filter(z => p.z.indexOf(z.id) >= 0));
  else applyStyleTo(styleClip.kind, p.e.map(ent).filter(x => x && (styleClip.kind === 'player' ? TE.isPlayer(x) : !TE.isPlayer(x))));
}
/* Кнопки «скопировать оформление» / «применить» для панели свойств */
function styleRow(kind, targets) {
  const ready = styleClip && styleClip.kind === kind;
  return h('div', { class: 'btn-row' },
    btn('', 'Копировать оформление', () => copyStyle(kind, targets()[0]), false, 'sm'),
    ready ? btn('check', 'Применить оформление', () => commit(() => { applyStyleTo(kind, targets()); }, { parts: ['canvas', 'insp'] }), false, 'sm') : null);
}
/* ---------- Действия над выделением: панель, правый клик, долгое нажатие ---------- */
/* Выбрать объект под курсором, если он ещё не выбран */
function pickAt(target, e) {
  const f = frame();
  if (!f || !target) return;
  const parts = selParts(App.sel, f);
  const eid = target.getAttribute('data-eid');
  if (eid) { if (parts.e.indexOf(eid) < 0) App.sel = { t: 'ent', ids: [eid] }; return; }
  if (target.hasAttribute('data-ball')) { if (!parts.ball) App.sel = { t: 'ball' }; return; }
  if (target.hasAttribute('data-aidx')) {
    const i = +target.getAttribute('data-aidx'), a = f.arrows[i];
    if (a && parts.a.indexOf(a.id) < 0) App.sel = { t: 'arrow', i };
    return;
  }
  if (target.hasAttribute('data-zidx')) {
    const i = +target.getAttribute('data-zidx'), z = f.zones[i];
    if (z && parts.z.indexOf(z.id) < 0) App.sel = { t: 'zone', i };
    return;
  }
  if (target.hasAttribute('data-bidx')) {
    const i = +target.getAttribute('data-bidx'), bb = f.bubbles[i];
    if (bb && parts.b.indexOf(bb.id) < 0) App.sel = { t: 'bubble', i };
  }
}
/* Вставить копии так, чтобы они легли вокруг указанной точки поля */
function pasteAt(u) {
  const clip = getClip();
  if (!clip) { toast('Буфер пуст'); return; }
  if (clip.kind !== 'objects' || !u) { pasteClipboard('copy'); return; }
  const pts = Object.keys(clip.pos || {}).map(k => clip.pos[k]).filter(Boolean);
  let dx = 0, dy = 0;
  if (pts.length) {
    dx = u[0] - pts.reduce((s, p) => s + p[0], 0) / pts.length;
    dy = u[1] - pts.reduce((s, p) => s + p[1], 0) / pts.length;
  }
  commit(() => { App.sel = selFromParts(pasteObjects(clip, { dx, dy }), frame()); }, { parts: ['canvas', 'insp'] });
  toast('Вставлено');
}
function openCanvasMenu(anchor, u) {
  const clip = getClip(), n = selCount(App.sel);
  menu(anchor, [
    n ? { icon: 'copy', label: 'Копировать', onClick: () => copySelection(false) } : null,
    n ? { label: 'Вырезать', onClick: () => copySelection(true) } : null,
    n ? { icon: 'copy', label: 'Дублировать', onClick: duplicateSelection } : null,
    clip && clip.kind === 'objects' ? { label: u ? 'Вставить сюда' : 'Вставить', onClick: () => pasteAt(u) } : null,
    clip && clip.kind === 'objects' ? { label: 'Вставить позиции', onClick: () => pasteClipboard('positions') } : null,
    clip && clip.kind === 'frame' ? { label: 'Вставить шаг', onClick: () => pasteFrameClip(clip) } : null,
    clip && clip.kind === 'slide' ? { label: 'Вставить слайд', onClick: () => pasteSlideClip(clip) } : null,
    { sep: true },
    { icon: 'users', label: 'Выбрать всё на шаге', onClick: selectAllOnFrame },
    n ? { label: 'Снять выделение', onClick: () => { App.sel = null; refresh(['canvas', 'insp']); } } : null,
    n ? { sep: true } : null,
    n ? { icon: 'trash', label: 'Удалить', danger: true, onClick: deleteSelection } : null
  ]);
}
/* Панель действий над схемой */
/* Панель действий над схемой; вызывается и отдельно — после копирования */
function renderActionBar(host) {
  host = host || $('#edCanvas');
  if (!host) return;
  const old = host.querySelector('.act-bar');
  if (old) old.remove();
  if (App.tab !== 'board' || !board()) return;
  const n = selCount(App.sel), clip = getClip();
  if (App.playing || (!n && !clip)) return;
  const bar = h('div', { class: 'act-bar' });
  if (n) {
    bar.appendChild(btn('copy', 'Копировать', () => copySelection(false), false, 'sm'));
    bar.appendChild(btn('', 'Вырезать', () => copySelection(true), false, 'sm'));
    bar.appendChild(btn('copy', 'Дублировать', duplicateSelection, false, 'sm'));
  }
  if (clip) bar.appendChild(btn('', 'Вставить', () => pasteClipboard('copy'), false, 'sm'));
  if (n) bar.appendChild(btn('trash', 'Удалить', deleteSelection, false, 'sm'));
  bar.appendChild(ibtn('menu', 'Ещё действия', ev => openCanvasMenu(ev.currentTarget, null), false, 'sm'));
  host.appendChild(bar);
}
/* ---------- Всплывающее меню ---------- */
let popEl = null;
function closeMenu() {
  if (!popEl) return;
  popEl.remove();
  popEl = null;
  document.removeEventListener('pointerdown', onPopOutside, true);
  document.removeEventListener('keydown', onPopEsc, true);
}
function onPopOutside(e) { if (popEl && !popEl.contains(e.target)) closeMenu(); }
function onPopEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } }
/* anchor — кнопка или точка {x, y} на экране */
function menu(anchor, items) {
  closeMenu();
  const el = h('div', { class: 'pop', role: 'menu' });
  items.forEach(it => {
    if (!it) return;
    if (it.sep) { el.appendChild(h('div', { class: 'pop-sep' })); return; }
    el.appendChild(h('button', {
      type: 'button', class: 'pop-item' + (it.danger ? ' danger' : ''), disabled: !!it.disabled,
      onclick: () => { closeMenu(); it.onClick(); }
    }, it.icon ? icon(it.icon) : h('span', { class: 'ic' }), h('span', null, it.label)));
  });
  document.body.appendChild(el);
  const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
  const x = r ? r.left : (anchor && anchor.x) || 0;
  const y = r ? r.bottom + 4 : (anchor && anchor.y) || 0;
  const w = el.offsetWidth || 220, hh = el.offsetHeight || 44;
  el.style.left = Math.max(8, Math.min(x, (window.innerWidth || 1200) - w - 8)) + 'px';
  el.style.top = Math.max(8, Math.min(y, (window.innerHeight || 800) - hh - 8)) + 'px';
  popEl = el;
  setTimeout(() => {
    if (!popEl) return;
    document.addEventListener('pointerdown', onPopOutside, true);
    document.addEventListener('keydown', onPopEsc, true);
  }, 0);
  return el;
}

/* ---------- Буфер: шаги и слайды целиком ---------- */
function copyFrame(idx) {
  const b = board();
  if (!b) return;
  const f = b.frames[idx == null ? App.frameIdx : idx];
  const ids = Object.keys(f.pos).filter(id => f.pos[id]);
  setClip({
    kind: 'frame', v: 1, format: App.project.settings.format, time: Date.now(),
    frame: clone(f), entities: b.entities.filter(e => ids.indexOf(e.id) >= 0).map(e => clone(e))
  });
  toast('Шаг скопирован');
  refresh(['insp', 'timeline', 'bar']);
}
function pasteFrameClip(clip) {
  if (!board()) { toast('На этом слайде нет схемы'); return; }
  commit(() => {
    const bb = board(), f = clone(clip.frame);
    f.id = uid();
    ['arrows', 'zones', 'bubbles'].forEach(k => (f[k] || []).forEach(x => { x.id = uid(); }));
    /* игроков, которых на этой схеме ещё нет, добавляем — иначе шаг вставится пустым */
    (clip.entities || []).forEach(src => {
      if (bb.entities.some(x => x.id === src.id)) return;
      bb.entities.push(clone(src));
      bb.frames.forEach(fr => { if (!(src.id in fr.pos)) fr.pos[src.id] = null; });
    });
    Object.keys(f.pos).forEach(id => { if (!bb.entities.some(x => x.id === id)) delete f.pos[id]; });
    bb.frames.splice(App.frameIdx + 1, 0, f);
    App.frameIdx++;
    App.sel = null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides', 'tools'] });
  toast('Шаг вставлен');
}
function copySlide(idx) {
  const s = App.project.slides[idx == null ? App.slideIdx : idx];
  if (!s) return;
  setClip({ kind: 'slide', v: 1, format: App.project.settings.format, time: Date.now(), slide: clone(s) });
  toast('Слайд скопирован');
  refresh(['slides', 'insp', 'bar']);
}
function pasteSlideClip(clip) {
  commit(p => {
    const s = clone(clip.slide);
    s.id = uid();
    if (s.board) TE.normalizeBoard(s.board);
    p.slides.splice(App.slideIdx + 1, 0, s);
    App.slideIdx++;
    App.frameIdx = 0;
    App.sel = null;
  });
  toast('Слайд вставлен');
}
function openFrameMenu(anchor) {
  const b = board(), clip = getClip();
  if (!b) return;
  menu(anchor, [
    { icon: 'copy', label: 'Копировать шаг', onClick: () => copyFrame() },
    { label: 'Вставить шаг сюда', disabled: !(clip && clip.kind === 'frame'), onClick: () => pasteFrameClip(getClip()) },
    { sep: true },
    { icon: 'plus', label: 'Шаг посередине', disabled: App.frameIdx >= b.frames.length - 1, onClick: insertMidFrame },
    { icon: 'slides', label: 'Главы схемы…', onClick: openChapters },
    { icon: 'left', label: 'Сдвинуть шаг раньше', disabled: App.frameIdx === 0, onClick: () => moveFrame(-1) },
    { icon: 'right', label: 'Сдвинуть шаг позже', disabled: App.frameIdx >= b.frames.length - 1, onClick: () => moveFrame(1) }
  ]);
}
function openSlideMenu(anchor, i) {
  const clip = getClip();
  menu(anchor, [
    { icon: 'copy', label: 'Копировать слайд', onClick: () => copySlide(i) },
    { label: 'Вставить слайд после', disabled: !(clip && clip.kind === 'slide'), onClick: () => { App.slideIdx = i; pasteSlideClip(getClip()); } },
    { sep: true },
    { icon: 'copy', label: 'Дублировать слайд', onClick: () => { App.slideIdx = i; dupSlide(); } },
    {
      icon: App.project.slides[i] && App.project.slides[i].hidden ? 'eye' : 'eyeoff',
      label: App.project.slides[i] && App.project.slides[i].hidden ? 'Показывать в показе' : 'Скрыть из показа',
      onClick: () => commit(p => { p.slides[i].hidden = !p.slides[i].hidden; }, { parts: ['slides'] })
    },
    { icon: 'trash', label: 'Удалить слайд', danger: true, onClick: () => { App.slideIdx = i; delSlide(); } }
  ]);
}