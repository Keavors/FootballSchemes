
/* ---------- Панель свойств ---------- */
function renderInspector() {
  const el = $('#edInsp');
  if (!el) return;
  el.textContent = '';
  const body = $('#edBody');
  const s = slide(), b = board();
  const show = s && ((App.tab === 'board' && b) || App.tab === 'text');
  el.classList.toggle('hide-sheet', !show);
  if (body) body.classList.toggle('no-sheet', !show);
  if (!show) return;
  let title, content;
  if (App.tab === 'text') { title = 'Как оформлять текст'; content = mdHelp(); }
  else {
    const sel = App.sel, f = frame();
    if (sel && sel.t === 'ent' && sel.ids.length === 1) { const e = ent(sel.ids[0]); title = entName(e); content = inspEntity(e); }
    else if (sel && sel.t === 'ent') { title = `Выбрано: ${sel.ids.length}`; content = inspMulti(sel.ids); }
    else if (sel && sel.t === 'mix') { title = `Выбрано: ${selCount(sel)}`; content = inspMix(sel); }
    else if (sel && sel.t === 'arrow' && f.arrows[sel.i]) { title = 'Стрелка'; content = inspArrow(sel.i); }
    else if (sel && sel.t === 'zone' && f.zones[sel.i]) { title = ZONE_NAMES[f.zones[sel.i].type] || 'Зона'; content = inspZone(sel.i); }
    else if (sel && sel.t === 'bubble' && f.bubbles[sel.i]) { title = 'Реплика'; content = inspBubble(sel.i); }
    else if (sel && sel.t === 'ball') { title = 'Мяч'; content = inspBall(); }
    else { title = `Шаг ${App.frameIdx + 1}`; content = inspFrame(); }
  }
  const head = h('div', { class: 'insp-head' },
    sel_back(),
    h('b', null, title),
    h('span', { class: 'insp-toggle' }, icon(App.sheet ? 'chevdown' : 'chevup'), App.sheet ? 'Свернуть' : (App.tab === 'text' ? 'Подсказка' : 'Свойства')));
  head.addEventListener('click', e => {
    if (!isMobile() || e.target.closest('button')) return;
    App.sheet = !App.sheet;
    renderInspector();
  });
  appendAll(el, head, h('div', { class: 'insp-body' }, content));
  el.classList.toggle('open', !!App.sheet);
}
function sel_back() {
  if (!App.sel || App.tab !== 'board') return null;
  return ibtn('back', 'Снять выделение', () => { App.sel = null; refresh(['canvas', 'insp']); }, false, 'sm ghost');
}
const ZONE_NAMES = { rect: 'Зона', ellipse: 'Овал', text: 'Надпись', link: 'Линия между игроками', poly: 'Многоугольник', hull: 'Рамка вокруг группы', ring: 'Кольцо вокруг игрока' };
function entName(e) {
  if (!e) return 'Объект';
  const kind = e.gk && TE.isPlayer(e) ? (e.kind === 'opp' ? 'Вратарь соперника' : 'Вратарь') : ENTITY_KINDS[e.kind];
  const lab = e.label || e.number;
  return lab ? `${kind} ${lab}` : kind;
}
function entChip(e, f, onClick) {
  const col = TE.entColors(App.project.settings, e);
  const on = App.sel && App.sel.t === 'ent' && App.sel.ids.indexOf(e.id) >= 0;
  return h('button', { type: 'button', class: 'ent-chip' + (f.pos[e.id] ? '' : ' off') + (on ? ' on' : ''), onclick: onClick, title: f.pos[e.id] ? entName(e) : entName(e) + ' — скрыт на этом шаге' },
    h('span', { class: 'ent-dot', style: { background: TE.isPlayer(e) ? col.fill : '#8a94a6', color: col.text } }, TE.isPlayer(e) ? String(e.label || e.number || '').slice(0, 3) : ''),
    TE.isPlayer(e) ? (e.label || e.number || '•') : ENTITY_KINDS[e.kind]);
}
/* Выбор игрока состава для фишки */
function rosterSelect(e) {
  const roster = App.project.roster || [];
  const sel = h('select', { class: 'inp' },
    h('option', { value: '' }, '— не привязан —'),
    roster.map(r => h('option', { value: r.id, selected: e.player === r.id }, (r.number ? r.number + ' · ' : '') + (r.name || 'Без имени'))));
  sel.addEventListener('change', () => commit(() => {
    const x = ent(e.id);
    if (!x) return;
    if (sel.value) x.player = sel.value; else delete x.player;
  }, { parts: ['canvas', 'insp'] }));
  return sel;
}

function inspFrame() {
  const b = board(), f = frame(), i = App.frameIdx, n = b.frames.length;
  const groups = [['ours', 'Наши'], ['opp', 'Соперник'], ['third', 'Нейтральные'], ['eq', 'Инвентарь']];
  return [
    sect(null,
      fld('Подпись к шагу', txt(f.cap, live('cap' + f.id, v => { frame().cap = v; }, []), { multi: true, rows: 3, ph: 'Что происходит на этом шаге. Можно **жирный** и !!Команда!!' }), 'Показывается под схемой во время воспроизведения'),
      fld('Глава с этого шага', txt(f.chapter, live('ch' + f.id, v => { frame().chapter = v; }, ['timeline']), { ph: 'Например: Отбор справа', max: 40 }), 'Главы превращаются в кнопки над схемой — удобно показывать варианты'),
      h('div', { class: 'btn-row' }, btn('slides', 'Главы схемы…', openChapters, false, 'sm', 'Переименовать, переставить, продублировать — в том числе зеркально')),
      fld('Длительность перехода', rng(f.dur / 1000, 0.2, 4, 0.1, live('dur' + f.id, v => { frame().dur = Math.round(v * 1000); }, []), v => v.toFixed(1) + ' с'),
        framePhases() > 1 ? `Это время на одну очередь, а их в шаге ${framePhases()} — всего ${(f.dur * framePhases() / 1000).toFixed(1)} с` : ''),
      fld('Пауза после шага', rng(f.hold / 1000, 0.3, 8, 0.1, live('hold' + f.id, v => { frame().hold = Math.round(v * 1000); }, []), v => v.toFixed(1) + ' с')),
      h('div', { class: 'btn-row' },
        btn('wand', 'Стрелки всем, кто сместился', autoMoveArrowsAll, i === 0, 'sm'),
        btn('wand', 'Сначала пас, потом бег', autoOrderFrame, !(f.arrows.some(a => a.kind !== 'move') && f.arrows.some(a => a.kind === 'move')), 'sm', 'Расставить очередь: пасы в первую, пробежки во вторую'),
        btn('trash', 'Убрать стрелки и зоны', () => commit(() => { const fr = frame(); fr.arrows = []; fr.zones = []; fr.bubbles = []; App.sel = null; }), !(f.arrows.length || f.zones.length || f.bubbles.length), 'sm')),
      h('div', { class: 'btn-row' },
        btn('', 'Развернуть шаг на 180°', () => commit(rotateFrame180, { parts: ['canvas'] }), false, 'sm', 'Как будто смотрим с другой стороны поля'),
        btn('users', 'Соперники зеркально', () => {
          let n = 0;
          commit(() => { n = mirrorOpponents(); }, { parts: ['canvas', 'insp'] });
          toast(n ? `Добавлено соперников: ${n}` : 'Соперники расставлены зеркально');
        }, false, 'sm')),
      h('div', { class: 'btn-row' },
        btn('left', 'Шаг раньше', () => moveFrame(-1), i === 0, 'sm'),
        btn('right', 'Шаг позже', () => moveFrame(1), i === n - 1, 'sm'))),
    sect('Буфер обмена', clipRow()),
    sect('Пауза-вопрос',
      fld('Вопрос перед этим шагом', txt((f.quiz && f.quiz.q) || '', live('qq' + f.id, v => setQuiz('q', v), ['timeline']), { max: 120, ph: 'Например: куда открывается ЛЗ?' })),
      fld('Ответ', txt((f.quiz && f.quiz.a) || '', live('qa' + f.id, v => setQuiz('a', v), []), { max: 200, ph: 'Короткий ответ — покажем после вопроса' })),
      h('p', { class: 'muted small', style: 'margin:0' }, 'В показе анимация остановится на этом месте и спросит команду.')),
    sect('Выбрать сразу',
      h('div', { class: 'btn-row' },
        btn('users', 'Наших', () => selectKind('ours'), false, 'sm'),
        btn('users', 'Соперников', () => selectKind('opp'), false, 'sm'),
        btn('users', 'Нейтральных', () => selectKind('third'), false, 'sm'),
        btn('', 'Инвентарь', () => selectKind('eq'), false, 'sm'),
        btn('', 'Всё на шаге', selectAllOnFrame, false, 'sm')),
      h('p', { class: 'muted small', style: 'margin:6px 0 0' }, 'Ещё можно протянуть рамку по пустому месту поля, а Shift добавляет к выбранному.')),
    sect('Объекты на схеме',
      h('p', { class: 'muted small', style: 'margin:0 0 8px' }, 'Нажмите, чтобы выбрать. Пунктирные скрыты на этом шаге.'),
      groups.map(([k, l]) => {
        const list = b.entities.filter(e => (k === 'eq' ? !TE.isPlayer(e) : e.kind === k));
        if (!list.length) return null;
        return h('div', { class: 'ent-group' }, h('span', null, l), h('div', { class: 'ent-list' }, list.map(e => entChip(e, f, () => { App.sel = { t: 'ent', ids: [e.id] }; refresh(['canvas', 'insp']); }))));
      }),
      h('div', { class: 'btn-row' }, btn('plus', 'Добавить', openAddMenu, false, 'sm'), btn('users', 'Расстановка', openFormation, false, 'sm'))),
    sect('Схема на слайде',
      fld('Разметка зон', seg([['none', 'Нет'], ['thirds', 'Трети'], ['channels', 'Коридоры'], ['both', 'Трети и коридоры'], ['zones18', '18 зон']], b.grid || 'none', v => commit(() => { board().grid = v; }, { parts: ['canvas', 'insp'] })), 'Подсказка для расстановки'),
      (b.grid && b.grid !== 'none') ? tog(b.gridShow === 'always', v => commit(() => { board().gridShow = v ? 'always' : 'editor'; }, { parts: ['canvas'] }), 'Показывать разметку и во время показа') : null,
      tog(b.autoplay, v => commit(() => { board().autoplay = v; }, { parts: [] }), 'Запускать анимацию при открытии слайда'),
      tog(b.loop, v => commit(() => { board().loop = v; }, { parts: [] }), 'Повторять по кругу'),
      tog(b.legend !== false, v => commit(() => { board().legend = v; }, { parts: [] }), 'Показывать легенду над полем'),
      tog(b.still, v => commit(() => { board().still = v; }, { parts: [] }), 'Без кнопок воспроизведения'),
      h('p', { class: 'muted small', style: 'margin:6px 0 0' }, 'Цвета, поле и подписи для всей презентации — в «Настройках».'))
  ];
}
function autoMoveArrowsAll() {
  commit(() => { const b = board(); syncMoveArrows(b.entities.map(e => e.id)); }, { parts: ['canvas', 'insp'] });
}

function inspEntity(e) {
  if (!e) return [];
  const id = e.id, f = frame(), b = board(), st = App.project.settings;
  const player = TE.isPlayer(e), vis = !!f.pos[id];
  const bub = f.bubbles.find(x => x.target === id);
  const hasMove = f.arrows.some(a => a.kind === 'move' && a.target === id);
  const setE = (key, fn, parts) => live(key + id, v => { const x = ent(id); if (x) fn(x, v); }, parts || ['canvas']);
  const out = [];
  out.push(sect('На этом шаге',
    tog(vis, v => commit(() => setVisible(id, v), { parts: ['canvas', 'insp'] }), 'Виден на поле'),
    player ? tog(f.hl.indexOf(id) >= 0, v => commit(() => toggleIn('hl', id, v), { parts: ['canvas', 'insp'] }), `Выделить цветом «${st.legend.special || 'выделен'}»`) : null,
    tog(f.focus.indexOf(id) >= 0, v => commit(() => toggleIn('focus', id, v), { parts: ['canvas'] }), 'Пульсирующее кольцо'),
    tog(f.dim.indexOf(id) >= 0, v => commit(() => toggleIn('dim', id, v), { parts: ['canvas'] }), 'Приглушить'),
    player ? tog(!!(f.ball && f.ball.owner === id), v => commit(() => { frame().ball = v ? { owner: id } : null; }, { parts: ['canvas', 'insp'] }), 'Мяч у этого игрока') : null,
    App.frameIdx > 0 ? tog(hasMove, v => commit(() => setMoveArrow(id, v), { parts: ['canvas', 'insp'] }), 'Стрелка перемещения с прошлого шага') : null,
    App.frameIdx > 0 ? fld('Очередь в шаге', seg(ORDER_SEG, entOrder(id), v => commit(() => setEntOrder(id, v), { parts: ['canvas', 'insp'] })), 'Первая очередь двигается сразу, вторая — следом') : null,
    player ? fld('Реплика над игроком', txt(bub ? bub.text : '', v => commit(() => setBubble(id, v), { key: 'bub' + id + f.id, parts: ['canvas'] }), { ph: 'Например: Иду!', max: 24 })) : null,
    player && bub ? h('div', { class: 'btn-row' },
      seg([['#ff8a1a', 'Оранжевая'], ['#ffffff', 'Белая'], ['#ffe066', 'Жёлтая']], bub.color || '#ff8a1a', v => commit(() => { const x = frame().bubbles.find(q => q.target === id); if (x) x.color = v; }, { parts: ['canvas'] })),
      tog(!!bub.below, v => commit(() => { const x = frame().bubbles.find(q => q.target === id); if (x) x.below = v; }, { parts: ['canvas'] }), 'Снизу')) : null,
    h('div', { class: 'btn-row' },
      btn('right', 'Позицию — в следующие шаги', () => commit(() => copyPosForward([id], false), { parts: ['canvas'] }), App.frameIdx === b.frames.length - 1 || !vis, 'sm'),
      btn('', 'Во все шаги', () => commit(() => copyPosForward([id], true), { parts: ['canvas'] }), b.frames.length < 2 || !vis, 'sm'),
      btn('', 'Кольцо вокруг', () => addRings([id]), !vis, 'sm'))));
  if (player) {
    out.push(sect('Фишка',
      h('div', { class: 'set-grid' },
        fld('Подпись', txt(e.label, setE('lab', (x, v) => { x.label = v; }, ['canvas']), { max: 4, ph: 'ЛЗ' })),
        fld('Номер', txt(e.number, setE('num', (x, v) => { x.number = v; }, ['canvas']), { max: 3, ph: '5' }))),
      fld('Команда', seg([['ours', 'Наши'], ['opp', 'Соперник'], ['third', 'Нейтральные']], e.kind, v => commit(() => { ent(id).kind = v; }, { parts: ['canvas', 'insp'] }))),
      fld('Игрок из состава', rosterSelect(e), (App.project.roster || []).length ? 'Имя покажется под фишкой, если включить это в «Настройках» → «Состав»' : 'Состав пока пуст — заполните его в «Настройках» → «Состав»'),
      tog(e.gk, v => commit(() => { ent(id).gk = v; }, { parts: ['canvas', 'insp'] }), 'Вратарь'),
      fld('Форма', seg([['', 'Как у команды'], ['circle', 'Круг'], ['square', 'Квадрат'], ['triangle', 'Треугольник'], ['diamond', 'Ромб'], ['shirt', 'Футболка']], e.shape || '', v => commit(() => { ent(id).shape = v; }, { parts: ['canvas'] }))),
      fld('Цвет фишки', colorPick(e.color || '', v => commit(() => { ent(id).color = v; }, { key: 'col' + id, parts: ['canvas'] }), { tokens: [['', 'Цвет команды']] })),
      fld('Цвет подписи', colorPick(e.textColor || '', v => commit(() => { ent(id).textColor = v; }, { key: 'tcol' + id, parts: ['canvas'] }), { tokens: [['', 'Авто']], swatches: ['#ffffff', '#1f2a44', '#ffe066'] })),
      fld('Размер', rng(e.size || 1, 0.5, 2, 0.05, setE('size', (x, v) => { x.size = v; }), v => Math.round(v * 100) + '%'))));
  } else {
    out.push(sect('Инвентарь',
      fld('Тип', seg(['cone', 'disc', 'pole', 'minigoal', 'dummy', 'ball'].map(k => [k, ENTITY_KINDS[k]]), e.kind, v => commit(() => { ent(id).kind = v; }, { parts: ['canvas', 'insp'] }))),
      fld('Цвет', colorPick(e.color || '', v => commit(() => { ent(id).color = v; }, { key: 'col' + id, parts: ['canvas'] }), { tokens: [['', 'Стандартный']] })),
      fld('Размер', rng(e.size || 1, 0.5, 3, 0.05, setE('size', (x, v) => { x.size = v; }), v => Math.round(v * 100) + '%')),
      fld('Поворот', rng(e.rot || 0, -180, 180, 5, setE('rot', (x, v) => { x.rot = v; }), v => v + '°'))));
  }
  out.push(sect('Оформление', styleRow(player ? 'player' : 'equip', () => [ent(id)]),
    tog(!!e.locked, v => commit(() => { const x = ent(id); if (x) x.locked = v; }, { parts: ['canvas', 'insp'] }), 'Закрепить — чтобы не двигать случайно')));
  out.push(sect('Буфер обмена', clipRow()));
  out.push(sect(null, h('div', { class: 'btn-row' },
    btn('copy', 'Дублировать', () => duplicateEntity(id), false, 'sm'),
    btn('trash', 'Удалить со всей схемы', () => commit(() => deleteEntities([id]), { parts: ['canvas', 'insp'] }), false, 'sm danger'))));
  return out;
}
function inspMulti(ids) {
  const f = frame();
  const allIn = k => ids.every(id => f[k].indexOf(id) >= 0);
  const zone = z => commit(() => { const fr = frame(); fr.zones.push(Object.assign({ id: uid(), ids: ids.slice(), color: '#ffffff', label: '' }, z)); App.sel = { t: 'zone', i: fr.zones.length - 1 }; }, { parts: ['canvas', 'insp'] });
  return [
    sect(null, h('div', { class: 'btn-row' },
      btn('', 'Инвертировать', invertSelection, false, 'sm'),
      btn('', 'Снять выделение', () => { App.sel = null; refresh(['canvas', 'insp']); }, false, 'sm'))),
    sect('Буфер обмена', clipRow()),
    sect('Связать выбранных',
      h('div', { class: 'btn-row' },
        btn('', 'Линия', () => zone({ type: 'link', lpos: 'margin', label: String(ids.length) }), false, 'sm'),
        btn('', 'Многоугольник', () => zone({ type: 'poly' }), ids.length < 3, 'sm'),
        btn('', 'Рамка вокруг', () => zone({ type: 'hull', label: '' }), false, 'sm'),
        btn('', 'Кольца', () => addRings(ids), false, 'sm'))),
    sect('На этом шаге',
      tog(allIn('hl'), v => commit(() => ids.forEach(id => toggleIn('hl', id, v)), { parts: ['canvas'] }), 'Выделить цветом'),
      tog(allIn('dim'), v => commit(() => ids.forEach(id => toggleIn('dim', id, v)), { parts: ['canvas'] }), 'Приглушить'),
      tog(ids.every(id => f.pos[id]), v => commit(() => ids.forEach(id => setVisible(id, v)), { parts: ['canvas', 'insp'] }), 'Видны на поле'),
      App.frameIdx > 0 ? btn('wand', 'Стрелки перемещения', () => commit(() => syncMoveArrows(ids), { parts: ['canvas'] }), false, 'sm') : null,
      h('div', { class: 'btn-row' },
        btn('right', 'Позиции — в следующие шаги', () => commit(() => copyPosForward(ids, false), { parts: ['canvas'] }), false, 'sm'),
        btn('', 'Во все шаги', () => commit(() => copyPosForward(ids, true), { parts: ['canvas'] }), false, 'sm'))),
    sect('Выровнять',
      h('div', { class: 'btn-row' },
        btn('', 'В одну линию поперёк', () => commit(() => alignEntities(ids, 1), { parts: ['canvas'] }), false, 'sm'),
        btn('', 'В одну линию вдоль', () => commit(() => alignEntities(ids, 0), { parts: ['canvas'] }), false, 'sm'),
        btn('', boardHoriz() ? 'Отразить сверху вниз' : 'Отразить слева направо', () => commit(() => mirrorEntities(ids, 0), { parts: ['canvas'] }), false, 'sm'),
        btn('', boardHoriz() ? 'Отразить слева направо' : 'Отразить сверху вниз', () => commit(() => mirrorEntities(ids, 1), { parts: ['canvas'] }), false, 'sm'),
        btn('', 'Распределить поперёк', () => commit(() => distributeEntities(ids, 0), { parts: ['canvas'] }), ids.length < 3, 'sm'),
        btn('', 'Распределить вдоль', () => commit(() => distributeEntities(ids, 1), { parts: ['canvas'] }), ids.length < 3, 'sm'))),
    sect('Цвет выбранных', colorPick('', v => commit(() => ids.forEach(id => { const e = ent(id); if (e && TE.isPlayer(e)) e.color = v; }), { key: 'mcol', parts: ['canvas'] }), { tokens: [['', 'Цвет команды']] })),
    sect('Оформление', styleRow('player', () => ids.map(ent).filter(x => x && TE.isPlayer(x)))),
    sect(null, btn('trash', 'Удалить выбранных со схемы', () => commit(() => deleteEntities(ids), { parts: ['canvas', 'insp'] }), false, 'sm danger'))
  ];
}
const COLOR_TOKENS = () => {
  const C = App.project.settings.colors;
  return [['auto', 'Авто', null], ['run', 'Бег', C.run], ['pass', 'Пас', C.pass], ['opp', 'Соперник', C.oppArrow], ['special', 'Выделение', C.special]];
};
function inspArrow(i) {
  const f = frame(), a = f.arrows[i];
  const set = (key, fn, parts) => live(key + a.id, v => { const x = frame().arrows[i]; if (x) fn(x, v); }, parts);
  return [
    sect(null,
      fld('Тип', h('div', { class: 'sw-row' }, (P => Object.keys(P).map(k => h('button', {
        type: 'button', class: 'sw tk' + (P[k].custom ? ' mine' : ''), onclick: () => commit(() => { const x = frame().arrows[i]; Object.assign(x, clone(P[k].a)); }, { parts: ['canvas', 'insp'] })
      }, P[k].name)))(arrowPresets()))),
      fld('Линия', seg([['solid', 'Сплошная'], ['dashed', 'Пунктир'], ['dotted', 'Точки'], ['wavy', 'Волна']], a.style || 'solid', v => commit(() => { frame().arrows[i].style = v; }, { parts: ['canvas', 'insp'] }))),
      fld('Цвет', colorPick(a.color || 'run', v => commit(() => { frame().arrows[i].color = v; }, { key: 'acol' + a.id, parts: ['canvas'] }), { tokens: COLOR_TOKENS() })),
      fld('Толщина', rng(a.width || 3, 1, 8, 0.2, set('aw', (x, v) => { x.width = v; }), v => v.toFixed(1))),
      fld('Изгиб', rng(a.bend || 0, -200, 200, 2, set('ab', (x, v) => { x.bend = v; }), v => String(v)), 'Или тяните за среднюю точку на поле'),
      fld('Прозрачность', rng(a.opacity != null ? a.opacity : 1, 0.2, 1, 0.05, set('ao', (x, v) => { x.opacity = v; }), v => Math.round(v * 100) + '%')),
      fld('Очередь в шаге', seg(ORDER_SEG, Math.max(1, Math.min(4, Math.round(+a.ord || 1))), v => commit(() => {
        const x = frame().arrows[i];
        if (v <= 1) delete x.ord; else x.ord = v;
        if (x.kind === 'move' && x.target) setEntOrder(x.target, v);
      }, { parts: ['canvas', 'insp'] })), 'Стрелки первой очереди рисуются сразу, вторые — следом'),
      tog(a.head !== false, v => commit(() => { frame().arrows[i].head = v; }, { parts: ['canvas'] }), 'Наконечник'),
      (a.style || 'solid') === 'solid' ? tog(a.draw !== false, v => commit(() => { frame().arrows[i].draw = v; }, { parts: [] }), 'Прорисовывать во время показа') : null,
      a.kind === 'move' ? h('p', { class: 'muted small' }, 'Стрелка перемещения: идёт от позиции игрока на прошлом шаге к позиции на этом.') : null,
      a.kind !== 'move' ? tog(!!a.lob, v => commit(() => { frame().arrows[i].lob = v; }, { parts: ['canvas'] }), 'Мяч летит верхом (навес)') : null,
      h('div', { class: 'btn-row' }, btn('', 'Сохранить как свой тип', () => saveArrowType(frame().arrows[i]), false, 'sm', 'Запомнить цвет, линию и толщину этой стрелки')),
      h('div', { class: 'btn-row' },
        h('span', { class: 'muted small' }, (a.pts && a.pts.length ? `Точек пути: ${a.pts.length}. ` : 'Путь прямой. ') + 'Точки добавляются «плюсиками» прямо на поле'),
        (a.pts && a.pts.length) ? btn('trash', 'Убрать точки пути', () => commit(() => { delete frame().arrows[i].pts; }, { parts: ['canvas', 'insp'] }), false, 'sm') : null),
      a.kind === 'line' ? h('div', { class: 'btn-row' },
        btn('', 'Развернуть', () => commit(() => { const x = frame().arrows[i]; const t = x.from; x.from = x.to; x.to = t; }, { parts: ['canvas'] }), false, 'sm'),
        btn('ball', 'Мяч в конец стрелки', () => commit(() => { const x = frame().arrows[i]; frame().ball = x.to.e ? { owner: x.to.e } : { at: x.to.p.slice() }; }, { parts: ['canvas'] }), false, 'sm')) : null,
      btn('right', 'Копировать в следующий шаг', () => copyAnnoForward('arrows', i), App.frameIdx === board().frames.length - 1, 'sm')),
    sect('Оформление', styleRow('arrow', () => [frame().arrows[i]]),
      h('div', { class: 'btn-row' },
        btn('up', 'На передний план', () => commit(() => reorderItem('arrows', i, 1), { parts: ['canvas', 'insp'] }), i === f.arrows.length - 1, 'sm'),
        btn('down', 'На задний план', () => commit(() => reorderItem('arrows', i, -1), { parts: ['canvas', 'insp'] }), i === 0, 'sm'))),
    sect(null, btn('trash', 'Удалить стрелку', () => commit(() => { frame().arrows.splice(i, 1); App.sel = null; }, { parts: ['canvas', 'insp'] }), false, 'sm danger'))
  ];
}
function inspZone(i) {
  const f = frame(), z = f.zones[i];
  const set = (key, fn, parts) => live(key + z.id, v => { const x = frame().zones[i]; if (x) fn(x, v); }, parts);
  const out = [];
  if (z.type === 'text') {
    out.push(sect(null,
      fld('Текст', txt(z.text, set('zt', (x, v) => { x.text = v; }), { ph: 'Надпись', max: 60, focus: true })),
      fld('Шрифт', seg([['hand', 'От руки'], ['head', 'Заголовочный'], ['body', 'Обычный']], z.font || 'hand', v => commit(() => { frame().zones[i].font = v; }, { parts: ['canvas'] }))),
      fld('Размер', rng(z.size || 22, 10, 60, 1, set('zs', (x, v) => { x.size = v; }), v => v + ' px')),
      tog(z.outline !== false, v => commit(() => { frame().zones[i].outline = v; }, { parts: ['canvas'] }), 'Тёмная обводка для читаемости')));
  } else {
    out.push(sect(null,
      fld(z.type === 'link' ? 'Подпись (цифра на полях или текст)' : 'Подпись', txt(z.label, set('zl', (x, v) => { x.label = v; }), { ph: z.type === 'link' ? '3' : 'Например: трое сзади', max: 40 })),
      z.type === 'rect' ? fld('Где подпись', seg([['top', 'Сверху'], ['center', 'В центре'], ['bottom', 'Снизу']], z.lpos || 'top', v => commit(() => { frame().zones[i].lpos = v; }, { parts: ['canvas'] }))) : null,
      z.type === 'ellipse' ? fld('Где подпись', seg([['top', 'Сверху'], ['center', 'В центре'], ['bottom', 'Снизу']], z.lpos || 'bottom', v => commit(() => { frame().zones[i].lpos = v; }, { parts: ['canvas'] }))) : null,
      z.type === 'ring' ? fld('Где подпись', seg([['above', 'Сверху'], ['below', 'Снизу']], z.lpos || 'below', v => commit(() => { frame().zones[i].lpos = v; }, { parts: ['canvas'] }))) : null,
      z.type === 'link' ? fld('Где подпись', seg([['margin', 'На полях'], ['above', 'Над линией'], ['below', 'Под линией'], ['none', 'Скрыть']], z.lpos || 'margin', v => commit(() => { frame().zones[i].lpos = v; }, { parts: ['canvas'] }))) : null,
      z.type !== 'link' ? fld('Размер подписи', rng(z.size || 22, 12, 44, 1, set('zs', (x, v) => { x.size = v; }), v => v + ' px')) : null,
      z.type === 'ring' ? fld('Радиус', rng(z.r || 30, 12, 140, 1, set('zr', (x, v) => { x.r = v; }), v => v + ' px')) : null,
      z.type === 'link' ? fld('Толщина', rng(z.width || 3, 1, 8, 0.5, set('zw', (x, v) => { x.width = v; }), v => String(v))) : null,
      z.type === 'link' ? tog(z.order === 'given', v => commit(() => { frame().zones[i].order = v ? 'given' : ''; }, { parts: ['canvas'] }), 'Соединять в порядке выбора, а не слева направо') : null,
      ['rect', 'ellipse', 'ring', 'hull', 'poly'].indexOf(z.type) >= 0 ? fld('Контур', seg([['dashed', 'Пунктир'], ['solid', 'Сплошной'], ['none', 'Без контура']], z.stroke || (z.type === 'poly' ? 'solid' : 'dashed'), v => commit(() => { frame().zones[i].stroke = v; }, { parts: ['canvas'] }))) : null,
      ['rect', 'ellipse', 'ring', 'hull', 'poly'].indexOf(z.type) >= 0 ? fld('Заливка', rng(z.fill != null && z.fill !== '' ? z.fill : 0.15, 0, 0.8, 0.02, set('zf', (x, v) => { x.fill = v; }), v => Math.round(v * 100) + '%')) : null));
  }
  out.push(sect(null,
    fld('Цвет', colorPick(z.color || '#ffffff', v => commit(() => { frame().zones[i].color = v; }, { key: 'zc' + z.id, parts: ['canvas'] }))),
    h('div', { class: 'btn-row' },
      btn('right', 'Копировать в следующий шаг', () => copyAnnoForward('zones', i), App.frameIdx === board().frames.length - 1, 'sm'),
      btn('', 'Во все следующие', () => copyAnnoForward('zones', i, true), App.frameIdx === board().frames.length - 1, 'sm'),
      btn('trash', 'Удалить', () => commit(() => { frame().zones.splice(i, 1); App.sel = null; }, { parts: ['canvas', 'insp'] }), false, 'sm danger'))));
  out.push(sect('Оформление', styleRow('zone', () => [frame().zones[i]]),
    h('div', { class: 'btn-row' },
      btn('up', 'На передний план', () => commit(() => reorderItem('zones', i, 1), { parts: ['canvas', 'insp'] }), i === f.zones.length - 1, 'sm'),
      btn('down', 'На задний план', () => commit(() => reorderItem('zones', i, -1), { parts: ['canvas', 'insp'] }), i === 0, 'sm')),
    tog(!!z.locked, v => commit(() => { frame().zones[i].locked = v; }, { parts: ['canvas', 'insp'] }), 'Закрепить — чтобы не двигать случайно')));
  return out;
}
function inspBubble(i) {
  const f = frame(), b = f.bubbles[i];
  return [sect(null,
    fld('Текст', txt(b.text, live('bt' + b.id, v => { const x = frame().bubbles[i]; if (x) x.text = v; }), { max: 24, focus: true })),
    fld('Цвет', colorPick(b.color || '#ff8a1a', v => commit(() => { frame().bubbles[i].color = v; }, { key: 'bc' + b.id, parts: ['canvas'] }))),
    fld('Цвет текста', colorPick(b.textColor || '#1f2a44', v => commit(() => { frame().bubbles[i].textColor = v; }, { key: 'btc' + b.id, parts: ['canvas'] }), { swatches: ['#1f2a44', '#ffffff'] })),
    tog(!!b.below, v => commit(() => { frame().bubbles[i].below = v; }, { parts: ['canvas'] }), 'Показывать под игроком'),
    h('div', { class: 'btn-row' },
      btn('', 'К игроку', () => { App.sel = { t: 'ent', ids: [b.target] }; refresh(['canvas', 'insp']); }, !ent(b.target), 'sm'),
      btn('trash', 'Удалить реплику', () => commit(() => { frame().bubbles.splice(i, 1); App.sel = null; }, { parts: ['canvas', 'insp'] }), false, 'sm danger')))];
}
function inspBall() {
  const f = frame(), b = board();
  const players = b.entities.filter(e => TE.isPlayer(e) && f.pos[e.id]);
  const owner = f.ball && f.ball.owner;
  return [sect(null,
    h('p', { class: 'muted small', style: 'margin:0 0 8px' }, 'Перетащите мяч к игроку — он прилипнет к нему. Отпустите на свободном месте — останется там.'),
    fld('У кого мяч', h('div', { class: 'ent-list' },
      h('button', { type: 'button', class: 'ent-chip' + (f.ball && !owner ? ' on' : ''), onclick: () => commit(() => { const fr = frame(); const p = owner && fr.pos[owner] ? fr.pos[owner] : [50, 50]; fr.ball = { at: p.slice() }; }, { parts: ['canvas', 'insp'] }) }, 'Свободный'),
      players.map(e => entChip(e, f, () => commit(() => { frame().ball = { owner: e.id }; }, { parts: ['canvas', 'insp'] }))))),
    h('div', { class: 'btn-row' },
      btn('right', 'Так же в следующих шагах', () => commit(() => { const bb = board(); for (let k = App.frameIdx + 1; k < bb.frames.length; k++) bb.frames[k].ball = clone(frame().ball); }, { parts: ['canvas'] }), App.frameIdx === b.frames.length - 1, 'sm'),
      btn('trash', 'Убрать мяч с шага', () => commit(() => { frame().ball = null; App.sel = null; }, { parts: ['canvas', 'insp'] }), !f.ball, 'sm danger')))];
}