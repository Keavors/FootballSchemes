
/* ---------- Инструменты ---------- */
function setTool(t) {
  App.tool = t;
  refresh(['tools', 'canvas']);
}
function renderTools() {
  const el = $('#edTools');
  if (!el) return;
  el.textContent = '';
  const b = board();
  if (!b) return;
  const t = App.tool;
  const toolBtn = (m, ic, label, extra) => btn(ic, label, () => setTool(Object.assign({ m }, extra || {})), App.playing, 'sm tool' + (t.m === m ? ' on' : ''));
  const row = h('div', { class: 'tool-row' },
    slide() && slide().layout === 'duo' ? seg([[0, 'Левая схема'], [1, 'Правая схема']], App.boardIdx, v => {
      App.boardIdx = v;
      App.sel = null;
      App.frameIdx = 0;
      App.frameSel = [];
      refresh(['main', 'insp']);
    }) : null,
    toolBtn('select', 'cursor', 'Выбор'),
    toolBtn('arrow', 'arrow', 'Стрелка', { preset: t.preset || 'run', from: null, ballFollows: true }),
    toolBtn('rect', 'rect', 'Зона'),
    toolBtn('ellipse', 'ellipse', 'Овал'),
    toolBtn('text', 'text', 'Надпись'),
    toolBtn('measure', '', 'Линейка'),
    h('span', { class: 'sep' }),
    btn('plus', 'Добавить', openAddMenu, App.playing, 'sm'),
    btn('users', 'Расстановка', openFormation, App.playing, 'sm'),
    App.frameIdx > 0 ? btn('', 'Призраки', () => { App.onion = !App.onion; refresh(['tools', 'canvas']); }, App.playing, 'sm tool' + (App.onion ? ' on' : ''), 'Показывать, где игроки стояли на прошлом шаге') : null,
    btn('', 'Привязка', () => { App.snap = !App.snap; refresh(['tools']); }, App.playing, 'sm tool' + (App.snap ? ' on' : ''), 'Прилипание к линиям других игроков и разметке поля. Alt временно отключает'));
  el.appendChild(row);
  if (t.m === 'arrow') {
    el.appendChild(h('div', { class: 'tool-row tool-sub' },
      (P => Object.keys(P).map(k => h('button', { type: 'button', class: 'sw tk' + (t.preset === k ? ' on' : '') + (P[k].custom ? ' mine' : ''), onclick: () => { t.preset = k; t.from = null; refresh(['tools', 'canvas']); } }, P[k].name)))(arrowPresets()),
      h('span', { class: 'sep' }),
      h('span', { class: 'tool-hint' }, t.from ? 'Теперь коснитесь конца стрелки' : 'Коснитесь начала: игрока или точки на поле'),
      btn('check', 'Готово', () => setTool({ m: 'select' }), false, 'sm')));
  } else if (t.m === 'rect' || t.m === 'ellipse') {
    el.appendChild(h('div', { class: 'tool-row tool-sub' }, h('span', { class: 'tool-hint' }, 'Проведите по полю, чтобы нарисовать, или просто коснитесь'), btn('check', 'Готово', () => setTool({ m: 'select' }), false, 'sm')));
  } else if (t.m === 'text') {
    el.appendChild(h('div', { class: 'tool-row tool-sub' }, h('span', { class: 'tool-hint' }, 'Коснитесь места на поле, где нужна надпись'), btn('check', 'Готово', () => setTool({ m: 'select' }), false, 'sm')));
  } else if (t.m === 'stamp') {
    el.appendChild(h('div', { class: 'tool-row tool-sub' },
      h('span', { class: 'tool-hint' }, `Касайтесь поля — ${(ENTITY_KINDS[t.kind] || 'объект').toLowerCase()} появится там`),
      btn('check', 'Готово', () => setTool({ m: 'select' }), false, 'sm')));
  } else if (t.m === 'measure') {
    el.appendChild(h('div', { class: 'tool-row tool-sub' },
      h('span', { class: 'tool-hint' }, App.measure ? measureText() : 'Проведите по полю между двумя точками — покажу расстояние в метрах'),
      App.measure ? btn('check', 'Оставить на схеме', keepMeasure, false, 'sm') : null,
      btn('close', 'Готово', () => { App.measure = null; setTool({ m: 'select' }); }, false, 'sm')));
  } else if (App.multi || isMobile()) {
    el.appendChild(h('div', { class: 'tool-row' },
      h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: App.multi, onchange: e => { App.multi = e.target.checked; } }), h('span', { class: 'tog-ui' }), h('span', { class: 'small' }, 'Несколько сразу')),
      h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: App.autoArrows, onchange: e => { App.autoArrows = e.target.checked; } }), h('span', { class: 'tog-ui' }), h('span', { class: 'small' }, 'Авто-стрелки'))));
  }
}
function openAddMenu() {
  /* Кнопка включает «штамп»: касаешься поля — объект появляется там */
  const stamp = (kind, opts) => () => {
    close();
    setTool(Object.assign({ m: 'stamp', kind }, opts || {}));
    toast('Касайтесь поля — объект появится там');
  };
  const close = modal('Добавить на схему', [
    h('h3', null, 'Игроки'),
    h('div', { class: 'btn-row' },
      btn('person', 'Наш игрок', stamp('ours')), btn('person', 'Наш вратарь', stamp('ours', { gk: true })),
      btn('person', 'Соперник', stamp('opp')), btn('person', 'Вратарь соперника', stamp('opp', { gk: true })),
      btn('person', 'Нейтральный', stamp('third'))),
    h('h3', null, 'Мяч и инвентарь'),
    h('div', { class: 'btn-row' },
      btn('ball', 'Мяч на этом шаге', () => { close(); commit(() => { const f = frame(); f.ball = { at: [50, 50] }; App.sel = { t: 'ball' }; }, { parts: ['canvas', 'insp'] }); }),
      btn('', 'Конус', stamp('cone')), btn('', 'Фишка', stamp('disc')), btn('', 'Стойка', stamp('pole')),
      btn('', 'Мини-ворота', stamp('minigoal')), btn('', 'Манекен', stamp('dummy')), btn('', 'Мяч-инвентарь', stamp('ball'))),
    h('p', { class: 'muted small' }, 'Коснитесь поля в нужном месте — можно ставить подряд несколько. Скрыть объект на отдельном шаге можно в его свойствах.')
  ]);
}
function addEntity(kind, opts) {
  opts = opts || {};
  commit(() => {
    const b = board();
    const e = { id: uid(), kind, label: '', number: '', gk: !!opts.gk };
    if (TE.isPlayer(e)) {
      const n = b.entities.filter(x => x.kind === kind).length + 1;
      e.number = opts.gk ? '1' : String(n);
      e.label = kind === 'ours' ? (opts.gk ? 'ВР' : String(n)) : '';
    }
    b.entities.push(e);
    const cnt = b.entities.length;
    const base = kind === 'opp' ? [50, opts.gk ? 6 : 34] : kind === 'ours' ? [50, opts.gk ? 94 : 66] : [50, 50];
    let pos;
    if (opts.at) pos = [clampU(opts.at[0]), clampU(opts.at[1])];
    else {
      pos = [Math.max(6, Math.min(94, base[0] + ((cnt * 7) % 44) - 22)), base[1]];
      if (opts.gk) pos[0] = 50;
    }
    b.frames.forEach(f => { f.pos[e.id] = pos.slice(); });
    App.sel = { t: 'ent', ids: [e.id] };
    if (!opts.keepTool) App.tool = { m: 'select' };
  }, { parts: ['tools', 'canvas', 'insp'] });
}