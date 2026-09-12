/* ---------- Заготовки: готовые слайды и презентация ----------
   Координаты в долях поля: x — поперёк (0 слева, 100 справа), y — вдоль
   (0 у чужих ворот, 100 у своих). Одни и те же числа подходят любому формату. */
function tplBoard(spec) {
  const b = TE.normalizeBoard({ entities: [], frames: [TE.newFrame()], view: spec.view || {} });
  const f = b.frames[0], byKey = {};
  (spec.players || []).forEach(p => {
    const e = { id: uid(), kind: p.k || 'ours', label: p.l || '', number: p.n || '', gk: !!p.gk };
    b.entities.push(e);
    f.pos[e.id] = [p.x, p.y];
    if (p.key) byKey[p.key] = e.id;
    if (p.ball) f.ball = { owner: e.id };
    if (p.hl) f.hl.push(e.id);
  });
  const ref = v => (typeof v === 'string' ? (byKey[v] ? { e: byKey[v] } : { p: [50, 50] }) : { p: v.slice() });
  (spec.arrows || []).forEach(a => {
    const preset = ARROW_PRESETS[a.t || 'pass'] || ARROW_PRESETS.pass;
    f.arrows.push(Object.assign({ id: uid(), kind: 'line', bend: a.bend || 0, from: ref(a.from), to: ref(a.to) }, clone(preset.a)));
  });
  (spec.zones || []).forEach(z => f.zones.push(Object.assign({ id: uid(), color: '#ffffff', stroke: 'dashed', label: '', lpos: 'top' }, z)));
  if (spec.cap) f.cap = spec.cap;
  return b;
}
/* Наша расстановка по схеме формата — для заготовок с полным составом */
function tplFormation(fmt, code) {
  return boardFromFormation(fmt, code);
}

const SLIDE_TEMPLATES = [
  {
    id: 'corner',
    name: 'Угловой в атаке',
    hint: 'Подача, зоны у ворот, кто на подборе',
    make: () => ({
      layout: 'split',
      title: 'Угловой в атаке',
      body: '- **Подача** на ближнюю.\n- **Ближняя** сбрасывает, **дальняя** замыкает.\n- **Подбор** страхует у линии штрафной.\n- Один остаётся сзади на случай контратаки.',
      board: tplBoard({
        view: { part: 'attack' },
        cap: 'Подача на ближнюю, сброс в центр',
        players: [
          { key: 'corner', l: 'Подача', x: 3, y: 3, ball: true },
          { key: 'near', l: 'Ближн', x: 38, y: 9, hl: true },
          { key: 'mid', l: 'Центр', x: 50, y: 12 },
          { key: 'far', l: 'Дальн', x: 62, y: 11 },
          { key: 'edge', l: 'Подбор', x: 50, y: 24 },
          { key: 'back', l: 'Страх', x: 50, y: 42 },
          { k: 'opp', x: 50, y: 4, gk: true, n: '1' },
          { k: 'opp', x: 43, y: 9, n: '2' },
          { k: 'opp', x: 56, y: 10, n: '3' },
          { k: 'opp', x: 50, y: 18, n: '4' }
        ],
        arrows: [{ t: 'pass', from: 'corner', to: 'near', bend: 40 }, { t: 'run', from: [58, 20], to: 'far' }],
        zones: [{ type: 'rect', x: 34, y: 2, w: 32, h: 12, label: 'Ближняя зона' }]
      })
    })
  },
  {
    id: 'freekick',
    name: 'Штрафной у чужих ворот',
    hint: 'Стенка, удар и розыгрыш',
    make: () => ({
      layout: 'split',
      title: 'Штрафной',
      body: '- **Первый вариант** — удар.\n- **Второй** — короткий пас в сторону и прострел.\n- Двое идут на добивание, один страхует сзади.',
      board: tplBoard({
        view: { part: 'attack' },
        cap: 'Удар или короткий розыгрыш',
        players: [
          { key: 'shot', l: 'Удар', x: 45, y: 24, ball: true, hl: true },
          { key: 'side', l: 'Пас', x: 58, y: 25 },
          { key: 'in1', l: 'Добив', x: 42, y: 12 },
          { key: 'in2', l: 'Добив', x: 56, y: 12 },
          { key: 'back', l: 'Страх', x: 50, y: 45 },
          { k: 'opp', x: 50, y: 5, gk: true, n: '1' },
          { k: 'opp', x: 44, y: 17, n: '2' },
          { k: 'opp', x: 48, y: 17, n: '3' },
          { k: 'opp', x: 52, y: 17, n: '4' },
          { k: 'opp', x: 56, y: 17, n: '5' }
        ],
        arrows: [{ t: 'shot', from: 'shot', to: [53, 2], bend: -20 }, { t: 'pass', from: 'shot', to: 'side' }],
        zones: [{ type: 'text', x: 50, y: 20, text: 'Стенка', size: 18, color: '#ffe066', font: 'body' }]
      })
    })
  },
  {
    id: 'throwin',
    name: 'Аут в своей трети',
    hint: 'Три варианта: вперёд, назад, в линию',
    make: () => ({
      layout: 'split',
      title: 'Аут в своей трети',
      body: '- **Ближний** открывается к линии.\n- **Назад** — всегда открытый вариант.\n- Если оба закрыты — выносим вперёд по линии.',
      board: tplBoard({
        cap: 'Открылись втроём, вариант назад обязателен',
        players: [
          { key: 'in', l: 'Аут', x: 2, y: 55, ball: true, hl: true },
          { key: 'near', l: 'Ближн', x: 13, y: 47 },
          { key: 'wide', l: 'В линию', x: 10, y: 30 },
          { key: 'back', l: 'Назад', x: 16, y: 70 },
          { k: 'opp', x: 20, y: 48, n: '2' },
          { k: 'opp', x: 18, y: 62, n: '3' }
        ],
        arrows: [
          { t: 'pass', from: 'in', to: 'near' },
          { t: 'pass', from: 'in', to: 'back', bend: 25 },
          { t: 'pass', from: 'in', to: 'wide', bend: -30 }
        ]
      })
    })
  },
  {
    id: 'goalkick',
    name: 'Удар от ворот',
    hint: 'Выход из обороны низом',
    make: () => ({
      layout: 'split',
      title: 'Удар от ворот',
      body: '- Разошлись **широко**, вратарь выбирает сторону.\n- Полузащита открывается **между линиями**.\n- Нет варианта низом — выносим в сторону, а не в центр.',
      board: tplBoard({
        view: { part: 'defence' },
        cap: 'Широко, свободный человек всегда есть',
        players: [
          { key: 'gk', l: 'ВР', x: 50, y: 94, gk: true, ball: true, hl: true },
          { key: 'left', l: 'ЛЗ', x: 12, y: 80 },
          { key: 'right', l: 'ПЗ', x: 88, y: 80 },
          { key: 'cb', l: 'ЦЗ', x: 50, y: 84 },
          { key: 'mid', l: 'ЦП', x: 50, y: 64 },
          { key: 'fwd', l: 'Н', x: 50, y: 45 },
          { k: 'opp', x: 40, y: 70, n: '9' },
          { k: 'opp', x: 60, y: 70, n: '10' }
        ],
        arrows: [{ t: 'pass', from: 'gk', to: 'left' }, { t: 'pass', from: 'gk', to: 'right' }]
      })
    })
  },
  {
    id: 'press',
    name: 'Прессинг соперника',
    hint: 'Ловушка на фланге',
    make: () => ({
      layout: 'split',
      title: 'Прессинг',
      body: '- Накрываем, когда мяч **уходит на фланг**.\n- Центр закрыт, играть можно только вдоль линии.\n- Отбор — сразу вперёд, не назад.',
      board: tplBoard({
        cap: 'Загоняем на фланг и накрываем втроём',
        players: [
          { key: 'f1', l: 'Н', x: 46, y: 26, hl: true },
          { key: 'f2', l: 'ЛП', x: 28, y: 32 },
          { key: 'f3', l: 'ПП', x: 66, y: 32 },
          { key: 'm', l: 'ЦП', x: 50, y: 46 },
          { key: 'd', l: 'ЦЗ', x: 50, y: 66 },
          { k: 'opp', key: 'ogk', x: 50, y: 8, gk: true, n: '1', ball: true },
          { k: 'opp', key: 'ol', x: 24, y: 16, n: '2' },
          { k: 'opp', x: 76, y: 16, n: '3' },
          { k: 'opp', x: 50, y: 22, n: '4' }
        ],
        arrows: [{ t: 'press', from: 'f1', to: 'ogk', bend: 20 }, { t: 'press', from: 'f2', to: 'ol' }],
        zones: [{ type: 'rect', x: 4, y: 6, w: 34, h: 34, color: '#ff5a4e', label: 'Ловушка', fill: 0.16 }]
      })
    })
  },
  {
    id: 'roles',
    name: 'Требования к позициям',
    hint: 'Схема и карточки по каждой позиции',
    make: fmt => {
      const board = tplFormation(fmt);
      const f0 = board.frames[0];
      return {
        layout: 'roles',
        title: 'Кто за что отвечает',
        board,
        roles: board.entities.filter(q => f0.pos[q.id]).map(q => ({
          id: uid(),
          title: q.label || q.number || 'Игрок',
          body: '- Без мяча:\n- С мячом:\n- Главное:',
          ids: [q.id]
        }))
      };
    }
  }
];

function insertTemplate(tpl) {
  commit(p => {
    const s = tpl.make(p.settings.format);
    s.id = uid();
    s.side = 'left';
    p.slides.splice(App.slideIdx + 1, 0, s);
    TE.normalizeProject(p);
    App.slideIdx++;
    App.frameIdx = 0;
    App.sel = null;
  });
  toast('Слайд из заготовки добавлен');
}
function openTemplates() {
  const close = modal('Заготовки слайдов', [
    h('p', { class: 'muted small' }, 'Готовый слайд со схемой и текстом — дальше меняете под себя.'),
    h('div', null, SLIDE_TEMPLATES.map(tpl => h('div', { class: 'exp-card' },
      h('h3', null, tpl.name),
      h('p', { class: 'muted small' }, tpl.hint),
      h('div', { class: 'btn-row' }, btn('plus', 'Вставить', () => { close(); insertTemplate(tpl); }, false, 'primary')))))
  ]);
}

/* Заготовка целой презентации: то, что обычно и рассказывают перед игрой */
function presetProject(title, fmt) {
  const rolesSlide = SLIDE_TEMPLATES.find(t => t.id === 'roles').make(fmt);
  const corner = SLIDE_TEMPLATES.find(t => t.id === 'corner').make(fmt);
  const without = boardFromFormation(fmt);
  const withBall = boardFromFormation(fmt);
  const p = {
    title: title || 'Установка на игру',
    settings: { format: fmt },
    slides: [
      { id: uid(), layout: 'title', title: title || 'Установка на игру', subtitle: 'Соперник, дата, время сбора', body: 'Коротко: как играем и что для этого нужно.', nav: 'Титул' },
      Object.assign({ id: uid(), nav: 'Роли' }, rolesSlide),
      { id: uid(), layout: 'duo', title: 'Как играем', cap1: 'Без мяча', cap2: 'С мячом', board: without, board2: withBall, nav: 'Схема', body: '- Без мяча: компактно, узко, страхуем друг друга.\n- С мячом: шире, быстрее, ищем свободного.' },
      { id: uid(), layout: 'split', title: 'Оборона', nav: 'Оборона', board: boardFromFormation(fmt), body: '- Линия ровная, расстояние 8–10 м.\n- Ближний накрывает, остальные страхуют.\n- Не выдёргиваемся по одному.' },
      { id: uid(), layout: 'split', title: 'Атака', nav: 'Атака', board: boardFromFormation(fmt), body: '- Первый пас — вперёд, если можно.\n- Крайние держат ширину.\n- В штрафную заходим втроём.' },
      Object.assign({ id: uid(), nav: 'Стандарты' }, corner),
      { id: uid(), layout: 'text', title: 'Три правила на игру', nav: 'Правила', body: '1. **Компактно** без мяча.\n2. **Первый пас** вперёд.\n3. **Разговариваем** на поле.' }
    ]
  };
  return TE.normalizeProject(p);
}
