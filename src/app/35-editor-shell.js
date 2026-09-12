
/* ---------- Редактор: каркас ---------- */
let keysBound = false;
function openEditor(project) {
  if (homeDemo) { homeDemo.cancel(); homeDemo = null; }
  App.project = TE.normalizeProject(project);
  Object.assign(App, { view: 'editor', slideIdx: 0, frameIdx: 0, sel: null, tool: { m: 'select' }, tab: 'board', sheet: false, playing: false, dirtyExport: false, zoom: { k: 1, cx: null, cy: null } });
  hist.past = []; hist.future = []; hist.key = null;
  const root = $('#app');
  root.textContent = '';
  root.appendChild(h('div', { class: 'ed' },
    h('header', { class: 'ed-top', id: 'edTop' }),
    h('div', { class: 'ed-body', id: 'edBody' },
      h('aside', { class: 'ed-slides', id: 'edSlides', 'aria-label': 'Слайды' }),
      h('div', { class: 'ed-scrim', id: 'edScrim', onclick: closeSlidesDrawer }),
      h('div', { class: 'ed-tabs', id: 'edTabs' }),
      h('main', { class: 'ed-stage', id: 'edStage' }),
      h('div', { class: 'ed-timeline', id: 'edTimeline' }),
      h('aside', { class: 'ed-insp', id: 'edInsp', 'aria-label': 'Свойства' }))));
  if (!keysBound) { document.addEventListener('keydown', onEditorKey); keysBound = true; }
  App.saving = 'saved';
  refresh();
}
async function goHome() {
  if (App.canvasBoard) App.canvasBoard.cancel();
  await saveNow();
  renderHome();
}
function renderTop() {
  const el = $('#edTop');
  el.textContent = '';
  const title = h('input', { class: 'ttl-inp', value: App.project.title, 'aria-label': 'Название презентации', maxlength: 80 });
  title.addEventListener('input', () => commit(p => { p.title = title.value; }, { key: 'title', parts: [] }));
  appendAll(el, 
    ibtn('back', 'К списку презентаций', goHome, false, 'ghost'),
    title,
    h('span', { class: 'save-badge', id: 'saveBadge' }),
    h('div', { class: 'grow' }),
    h('button', { type: 'button', class: 'btn icon ghost', id: 'btnUndo', title: 'Отменить (Ctrl+Z)', 'aria-label': 'Отменить', onclick: undo }, icon('undo')),
    h('button', { type: 'button', class: 'btn icon ghost', id: 'btnRedo', title: 'Повторить (Ctrl+Shift+Z)', 'aria-label': 'Повторить', onclick: redo }, icon('redo')),
    ibtn('help', 'Клавиши и жесты', openKeyHelp, false, 'ghost'),
    btn('gear', 'Настройки', openSettings, false, '', 'Настройки презентации'),
    btn('share', 'Экспорт', openExport, false, '', 'Скачать или сохранить'),
    btn('play', 'Показ', () => openPreview(App.slideIdx), false, 'primary', 'Показать презентацию'));
  setSaveBadge();
  updateUndoBtns();
}
function openSlidesDrawer() { $('#edSlides').classList.add('open'); $('#edScrim').classList.add('open'); }
function closeSlidesDrawer() { const s = $('#edSlides'); if (s) s.classList.remove('open'); const c = $('#edScrim'); if (c) c.classList.remove('open'); }

/* ---------- Слайды ---------- */
function renderSlides() {
  const el = $('#edSlides');
  el.textContent = '';
  const p = App.project;
  appendAll(el, 
    h('div', { class: 'sl-head' }, h('h2', null, 'Слайды'), h('span', { class: 'muted' }, String(p.slides.length)), h('div', { class: 'grow' }),
      isMobile() ? ibtn('close', 'Закрыть', closeSlidesDrawer, false, 'sm ghost') : null),
    h('ol', { class: 'sl-list', id: 'slList' }, p.slides.map((s, i) => {
      const li = h('li', { class: 'sl-item' + (i === App.slideIdx ? ' on' : '') + (s.hidden ? ' hidden-slide' : ''), 'data-slide': String(i) },
        h('button', { type: 'button', class: 'sl-main', onclick: () => { if (!slMoved) gotoSlide(i); }, 'aria-current': i === App.slideIdx ? 'true' : null },
          slideThumb(s),
          h('span', { class: 'sl-num' }, String(i + 1)),
          h('span', { class: 'sl-txt' },
            h('b', null, TE.plain(s.nav || s.title) || 'Без названия'),
            h('small', null, LAYOUTS[s.layout].name
              + (s.board && s.layout !== 'text' ? ` · ${s.board.frames.length} ${plural(s.board.frames.length, 'шаг', 'шага', 'шагов')}` : '')
              + (s.hidden ? ' · скрыт' : '')))),
        i === App.slideIdx ? h('div', { class: 'sl-acts' },
          ibtn('up', 'Переместить выше', () => moveSlide(-1), i === 0, 'sm'),
          ibtn('down', 'Переместить ниже', () => moveSlide(1), i === p.slides.length - 1, 'sm'),
          ibtn('copy', 'Дублировать слайд', dupSlide, false, 'sm'),
          ibtn('trash', 'Удалить слайд', delSlide, false, 'sm danger'),
          ibtn('menu', 'Ещё действия со слайдом', ev => openSlideMenu(ev.currentTarget, i), false, 'sm')) : null);
      li.addEventListener('pointerdown', ev => slDown(ev, i));
      return li;
    })),
    h('div', { class: 'sl-add' },
      h('span', null, 'Добавить слайд'),
      h('div', { class: 'sl-add-grid' },
        btn('', 'Схема и текст', () => addSlide('split'), false, 'sm'),
        btn('', 'Только текст', () => addSlide('text'), false, 'sm'),
        btn('', 'Титульный', () => addSlide('title'), false, 'sm'),
        btn('', 'Продолжить схему', () => addSlide('continue'), !board(), 'sm', 'Новый слайд с расстановкой из текущего шага'),
        btn('plus', 'Из заготовки…', openTemplates, false, 'sm', 'Готовый слайд: угловой, штрафной, прессинг, роли'))));
}
/* Миниатюра слайда: первый шаг схемы или значок макета */
function slideThumb(s) {
  if (s.board && s.layout !== 'text') {
    const t = frameThumb(s.board, s.board.frames[0]);
    t.setAttribute('class', 'sl-thumb');
    return t;
  }
  return h('span', { class: 'sl-thumb-icon' }, layoutIcon(s.layout));
}
/* Перетаскивание слайдов в списке */
let slDrag = null, slMoved = false;
function slDown(e, i) {
  if (e.button !== undefined && e.button > 0) return;
  slDrag = { i, to: i, y0: e.clientY, moved: false, ready: e.pointerType !== 'touch', timer: 0 };
  if (e.pointerType === 'touch') slDrag.timer = setTimeout(() => { if (slDrag) slDrag.ready = true; }, 350);
  document.addEventListener('pointermove', slMove, true);
  document.addEventListener('pointerup', slUp, true);
  document.addEventListener('pointercancel', slUp, true);
}
function slMove(e) {
  if (!slDrag || !slDrag.ready) return;
  if (!slDrag.moved && Math.abs(e.clientY - slDrag.y0) < 8) return;
  slDrag.moved = true;
  const list = $('#slList');
  if (!list) return;
  const kids = Array.prototype.slice.call(list.children);
  let best = slDrag.i, bestD = 1e9;
  kids.forEach((el, idx) => {
    const r = el.getBoundingClientRect();
    if (!r.height) return;
    const d = Math.abs(r.top + r.height / 2 - e.clientY);
    if (d < bestD) { bestD = d; best = idx; }
  });
  slDrag.to = best;
  kids.forEach((el, idx) => el.classList.toggle('drop', idx === best && best !== slDrag.i));
}
function slUp() {
  document.removeEventListener('pointermove', slMove, true);
  document.removeEventListener('pointerup', slUp, true);
  document.removeEventListener('pointercancel', slUp, true);
  const d = slDrag;
  slDrag = null;
  if (!d) return;
  if (d.timer) clearTimeout(d.timer);
  if (!d.moved || d.to === d.i) { refresh(['slides']); return; }
  slMoved = true;
  moveSlideTo(d.i, d.to);
  setTimeout(() => { slMoved = false; }, 0);
}
function moveSlideTo(from, to) {
  commit(p => {
    if (from === to || from < 0 || to < 0 || from >= p.slides.length || to >= p.slides.length) return;
    const [s] = p.slides.splice(from, 1);
    p.slides.splice(to, 0, s);
    App.slideIdx = to;
    App.frameIdx = 0;
    App.sel = null;
  });
}
function gotoSlide(i) {
  if (App.canvasBoard) App.canvasBoard.cancel();
  App.slideIdx = i; App.frameIdx = 0; App.sel = null; App.tool = { m: 'select' }; App.playing = false; App.sheet = false;
  App.zoom = { k: 1, cx: null, cy: null };
  App.frameSel = [];
  App.boardIdx = 0;
  closeSlidesDrawer();
  refresh();
}
function addSlide(kind) {
  commit(p => {
    const fmt = p.settings.format;
    let s;
    if (kind === 'text') s = { layout: 'text', title: 'Новый слайд', subtitle: '', body: '- Пункт\n- Ещё пункт', board: null };
    else if (kind === 'title') s = { layout: 'title', title: 'Заголовок', subtitle: 'Подзаголовок', body: '', board: null };
    else if (kind === 'continue') {
      const b = clone(board()), f = clone(frame());
      f.id = uid(); f.arrows = []; f.bubbles = []; f.cap = ''; f.chapter = ''; f.focus = [];
      b.frames = [f];
      s = { layout: slide().layout === 'text' ? 'split' : slide().layout, title: 'Продолжение', subtitle: '', body: '', board: b };
    } else s = { layout: 'split', title: 'Новая схема', subtitle: '', body: '', board: boardFromFormation(fmt) };
    s.id = uid(); s.nav = ''; s.side = 'left';
    p.slides.splice(App.slideIdx + 1, 0, s);
    App.slideIdx++; App.frameIdx = 0; App.sel = null;
    if (kind === 'text' || kind === 'title') App.tab = 'text';
  });
  closeSlidesDrawer();
}
function dupSlide() {
  commit(p => {
    const s = clone(slide());
    s.id = uid();
    p.slides.splice(App.slideIdx + 1, 0, s);
    App.slideIdx++; App.frameIdx = 0; App.sel = null;
  });
}
function delSlide() {
  const s = slide();
  confirmBox(`Удалить слайд «${TE.plain(s.nav || s.title) || App.slideIdx + 1}»? Отменить можно кнопкой «Отменить».`, 'Удалить', () => {
    commit(p => {
      p.slides.splice(App.slideIdx, 1);
      App.slideIdx = Math.max(0, App.slideIdx - 1); App.frameIdx = 0; App.sel = null;
    });
  });
}
function moveSlide(d) {
  commit(p => {
    const i = App.slideIdx, j = i + d;
    if (j < 0 || j >= p.slides.length) return;
    const [s] = p.slides.splice(i, 1);
    p.slides.splice(j, 0, s);
    App.slideIdx = j;
  }, { parts: ['slides'] });
}

/* ---------- Вкладки и сцена ---------- */
function renderTabs() {
  const el = $('#edTabs');
  el.textContent = '';
  const tabs = [['board', 'Схема'], ['text', 'Текст'], ['slide', 'Макет']];
  appendAll(el, 
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, l]) => h('button', {
      type: 'button', role: 'tab', class: App.tab === k ? 'on' : '', 'aria-selected': String(App.tab === k),
      onclick: () => { if (App.canvasBoard) App.canvasBoard.cancel(); App.playing = false; App.tab = k; App.tool = { m: 'select' }; refresh(['main', 'insp']); }
    }, l))),
    h('div', { class: 'grow' }),
    isMobile() ? btn('slides', `${App.slideIdx + 1} / ${App.project.slides.length}`, openSlidesDrawer, false, 'sm', 'Список слайдов') : null);
}
function renderStage() {
  const el = $('#edStage');
  el.textContent = '';
  const body = $('#edBody');
  if (!App.project.slides.length) {
    body.classList.add('no-sheet');
    el.appendChild(h('div', { class: 'ed-canvas' }, h('div', { class: 'ed-empty' }, h('p', null, 'В презентации нет слайдов.'), btn('plus', 'Добавить слайд', () => addSlide('split'), false, 'primary'))));
    return;
  }
  body.classList.toggle('no-sheet', App.tab === 'slide');
  if (App.tab === 'board') {
    appendAll(el, h('div', { class: 'ed-tools', id: 'edTools' }), h('div', { class: 'ed-canvas', id: 'edCanvas' }));
    renderTools();
    renderCanvas();
  } else if (App.tab === 'text') {
    renderTextTab(el);
  } else {
    renderSlideTab(el);
  }
}