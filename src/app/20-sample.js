
/* ---------- Пример «Маятник»: схемы в сжатой записи ----------
   Координаты в долях поля: x — поперёк (0 слева, 100 справа), y — вдоль
   (0 у ворот соперника, 100 у наших). Мы атакуем вверх, соперник — вниз.

   Наши: GK вратарь, LB/RB латерали (ЛЛ/ПЛ), LC/RC центральные защитники,
   LM/RM центральные полузащитники, ST нападающий.
   Соперник (3-3-1, по экрану слева направо): og вратарь, odl/odc/odr защитники,
   oml/omc/omr полузащитники, of нападающий.

   Кадр дописывает изменения к предыдущему; reset — начать расстановку заново. */
function fromCompact(scene) {
  const LBL = { GK: 'ВР', LB: 'ЛЛ', LC: 'ЛЦ', RC: 'ПЦ', RB: 'ПЛ', LM: 'ЛП', RM: 'ПП', ST: 'Н' };
  const NUM = { GK: '1', LB: '3', LC: '5', RC: '4', RB: '2', LM: '8', RM: '6', ST: '9' };
  const ONUM = { og: '1', odl: '2', odc: '4', odr: '3', oml: '7', omc: '8', omr: '11', of: '9' };
  const COL = { white: '#ffffff', red: '#ff5a4e', orange: '#ff8a1a', yellow: '#ffe066' };
  const ids = [];
  scene.frames.forEach(f => [f.pos, f.opp].forEach(o => { if (o) Object.keys(o).forEach(k => { if (ids.indexOf(k) < 0) ids.push(k); }); }));
  const entities = ids.map(id => id[0] === 'o'
    ? { id, kind: 'opp', label: '', number: ONUM[id] || '', gk: id === 'og' }
    : { id, kind: 'ours', label: LBL[id] || id, number: NUM[id] || '', gk: id === 'GK' });
  const chapterAt = {};
  (scene.chapters || []).forEach(c => { chapterAt[c.from] = c.name; });
  const ref = v => (typeof v === 'string' ? { e: v } : { p: v.slice() });
  let P = {}, ball = null, hl = [], dim = [];
  const frames = scene.frames.map((f, i) => {
    if (f.reset) { P = {}; hl = []; dim = []; }
    if (f.pos) Object.assign(P, f.pos);
    if (f.opp) Object.assign(P, f.opp);
    if ('ball' in f) ball = f.ball;
    if (f.hl) hl = f.hl;
    if (f.dim) dim = f.dim;
    const pos = {};
    for (const k in P) if (P[k]) pos[k] = P[k].slice();
    const arrows = (f.arrows || []).map(a => {
      let out;
      if (a.t === 'run' || a.t === 'orun') {
        const st = a.t === 'orun' ? { style: 'dashed', color: 'opp', width: 2.8 }
          : { style: 'dashed', color: a.hot ? 'special' : 'auto', width: 2.8 };
        out = a.to
          ? Object.assign({ id: uid(), kind: 'line', from: { e: a.id }, to: { p: a.to.slice() }, head: true, bend: a.bend || 0 }, st)
          : Object.assign({ id: uid(), kind: 'move', target: a.id, head: true, bend: a.bend || 0 }, st);
      } else {
        out = { id: uid(), kind: 'line', from: ref(a.from), to: ref(a.to), head: true, bend: a.bend || 0, style: 'solid' };
        if (a.t === 'pass') Object.assign(out, { color: 'pass', width: 3 });
        else if (a.t === 'opass') Object.assign(out, { color: 'opp', width: 3 });
        else if (a.t === 'shot') Object.assign(out, { color: 'pass', width: 4.2 });
        else if (a.t === 'oshot') Object.assign(out, { color: 'opp', width: 4.2 });
        /* закрытый пас: куда сопернику уже не отдать */
        else if (a.t === 'closed') Object.assign(out, { style: 'dotted', color: '#ff5a4e', width: 2.4, head: false, opacity: 0.85, draw: false });
        else Object.assign(out, { color: '#ffffff', width: 2.2, opacity: 0.8, draw: false });
        if (a.lob) { out.lob = true; out.style = 'dashed'; if (!a.bend) out.bend = 30; }
      }
      if (a.o > 1) out.ord = a.o;
      return out;
    });
    const zones = (f.zones || []).map(z => {
      const color = COL[z.c || 'white'] || '#ffffff';
      if (z.t === 'rect') return { id: uid(), type: 'rect', x: z.x, y: z.y, w: z.w, h: z.h, color, label: z.label || '', lpos: z.lb ? 'bottom' : 'top' };
      if (z.t === 'hull') return { id: uid(), type: 'hull', ids: z.ids.slice(), color, label: z.label || '' };
      if (z.t === 'link') return { id: uid(), type: 'link', ids: z.ids.slice(), color, label: z.label || '', lpos: z.lpos === 'below' ? 'below' : 'margin' };
      if (z.t === 'tri') return { id: uid(), type: 'poly', ids: z.ids.slice(), color };
      if (z.t === 'ring') return { id: uid(), type: 'ring', target: z.at, r: z.r || 30, color, label: z.label || '', lpos: z.above ? 'above' : 'below' };
      return null;
    }).filter(Boolean);
    const bubbles = (f.bubbles || []).map(b => ({ id: uid(), target: b.id, text: b.text, color: b.c === 'white' ? '#ffffff' : '#ff8a1a', below: !!b.below }));
    const frame = {
      id: uid(), pos, ball: typeof ball === 'string' ? { owner: ball } : Array.isArray(ball) ? { at: ball.slice() } : null,
      hl: hl.slice(), dim: dim.slice(), focus: (f.focus || []).slice(), arrows, zones, bubbles, ord: Object.assign({}, f.ord || {}),
      cap: String(f.cap || ''), chapter: chapterAt[i] || '', dur: f.dur || 1100, hold: f.hold || 2000
    };
    if (f.quiz) frame.quiz = { q: f.quiz.q, a: f.quiz.a };
    return frame;
  });
  return TE.normalizeBoard({ entities, frames, autoplay: !!scene.auto, loop: !!scene.loop, still: !!scene.still, legend: true });
}

function pendulumProject() {
  /* ---------- Расстановки ---------- */
  /* Без мяча — средний блок 4-2-1: первая линия у центра поля, защитники в 16 метрах от ворот */
  const BLOCK = { GK: [50, 94], LB: [17, 70], LC: [38, 73], RC: [62, 73], RB: [83, 70], LM: [40, 59], RM: [60, 59], ST: [50, 46] };
  /* Блок качнулся к мячу слева / справа: дальний латераль подтянулся к центру */
  const SHIFT_L = { GK: [46, 94], LB: [13, 69], LC: [32, 73], RC: [53, 74], RB: [72, 72], LM: [33, 58], RM: [52, 59], ST: [40, 43] };
  const SHIFT_R = { GK: [54, 94], LB: [28, 72], LC: [47, 74], RC: [68, 73], RB: [87, 69], LM: [48, 59], RM: [67, 58], ST: [60, 43] };
  /* Ловушка у бровки: латераль вышел, трое сзади лесенкой */
  const TRAP_L = { GK: [42, 93], LB: [12, 52], LC: [25, 66], RC: [44, 72], RB: [62, 73], LM: [22, 45], RM: [42, 57], ST: [18, 34] };
  const TRAP_R = { GK: [58, 93], RB: [88, 52], RC: [75, 66], LC: [56, 72], LB: [38, 73], RM: [78, 45], LM: [58, 57], ST: [82, 34] };
  /* С мячом — 3-3-1 в позиционной атаке, мяч справа: наверху ПЛ, третий защитник ЛЛ */
  const POS_R = { GK: [50, 90], LB: [32, 54], LC: [48, 56], RC: [66, 54], RB: [88, 32], RM: [64, 34], LM: [44, 40], ST: [46, 22] };

  /* Соперник разыгрывает у себя: защитники у своей штрафной, нападающий у наших центральных */
  const BUILD = { og: [50, 5], odl: [22, 22], odc: [50, 18], odr: [78, 22], oml: [9, 40], omc: [50, 35], omr: [91, 40], of: [52, 70] };
  const BUILD_L = Object.assign({}, BUILD, { odl: [20, 24], omc: [46, 36], of: [44, 70] });
  const BUILD_R = Object.assign({}, BUILD, { odr: [80, 24], omc: [54, 36], of: [58, 70] });
  /* Соперник обороняется блоком у своей штрафной — против нашей позиционной атаки */
  const DEF = { og: [50, 4], odl: [30, 20], odc: [52, 16], odr: [70, 20], oml: [24, 34], omc: [50, 32], omr: [76, 34], of: [52, 48] };

  const OUR = ['LB', 'LC', 'RC', 'RB', 'LM', 'RM', 'ST'];
  const runs = list => list.map(id => ({ t: 'run', id }));
  const L421 = [{ t: 'link', ids: ['LB', 'LC', 'RC', 'RB'], label: '4' }, { t: 'link', ids: ['LM', 'RM'], label: '2' }, { t: 'link', ids: ['ST'], label: '1' }];
  const L331_R = [{ t: 'link', ids: ['LB', 'LC', 'RC'], label: '3' }, { t: 'link', ids: ['LM', 'RM', 'RB'], label: '3' }, { t: 'link', ids: ['ST'], label: '1' }];
  const ATT4_L = [{ t: 'hull', ids: ['LB', 'LM', 'ST', 'RM'], label: 'атакуют четверо', c: 'orange' }, { t: 'link', ids: ['LC', 'RC', 'RB'], label: '3 сзади' }];
  const ATT4_R = [{ t: 'hull', ids: ['RB', 'RM', 'ST', 'LM'], label: 'атакуют четверо', c: 'orange' }, { t: 'link', ids: ['LB', 'LC', 'RC'], label: '3 сзади' }];
  const BOX_R = [{ t: 'ring', at: 'RM', r: 18, label: 'ближняя' }, { t: 'ring', at: 'ST', r: 18, label: 'дальняя' }, { t: 'ring', at: 'LM', r: 18, label: 'подбор' }];

  const SC = {};

  /* Титул: весь план одной петлёй */
  SC.idea = {
    auto: true, loop: true,
    frames: [
      { reset: true, pos: BLOCK, opp: BUILD, ball: 'odc', zones: L421, cap: 'Без мяча — **4-2-1** у центра поля. Мяч сопернику отдаём: пусть владеет у себя.', hold: 2600 },
      { pos: SHIFT_L, opp: BUILD_L, ball: 'odl', arrows: [{ t: 'opass', from: 'odc', to: 'odl' }], zones: [{ t: 'hull', ids: OUR, label: 'качнулись к мячу' }], cap: 'Мяч ушёл в сторону — весь блок качнулся за ним, как маятник.', hold: 2400 },
      { pos: TRAP_L, opp: { oml: [8, 44], omc: [42, 38], of: [40, 68] }, ball: 'oml', hl: ['LB'], arrows: [{ t: 'opass', from: 'odl', to: 'oml' }].concat(runs(['LB', 'LM', 'ST'])), bubbles: [{ id: 'LB', text: 'Мой!', c: 'white' }], cap: 'Пас на фланг — сигнал. **ЛЛ** выходит, **ЛП** и **Н** закрывают пасы внутрь и назад.', hold: 2800 },
      { pos: { LB: [11, 46] }, opp: { oml: [6, 51] }, ball: 'LB', dim: ['oml'], bubbles: [{ id: 'LB', text: 'Пошли!' }], cap: 'Зажали у бровки — отбор!', hold: 1600 },
      {
        pos: { LM: [24, 40], LB: [10, 26], ST: [40, 24], RM: [46, 44], LC: [34, 64], RC: [52, 66], RB: [68, 64], GK: [46, 90] },
        opp: { odl: [22, 32], omc: [40, 48], of: [42, 62], odc: [50, 18], odr: [66, 24] },
        ord: { LB: 2, ST: 2, RM: 2, LC: 2, RC: 2, RB: 2, GK: 2, odl: 2 }, ball: 'LM', dim: [],
        arrows: [{ t: 'pass', from: [11, 46], to: 'LM' }, { t: 'run', id: 'LB', o: 2 }, { t: 'run', id: 'ST', o: 2 }, { t: 'run', id: 'RM', o: 2 }], zones: ATT4_L,
        cap: 'Отобрали слева — мы в **3-3-1**: вперёд четверо (**ЛЛ**, **ЛП**, **Н**, **ПП**), сзади трое (**ЛЦ**, **ПЦ**, **ПЛ**).', hold: 3000, dur: 1200
      },
      {
        pos: { LB: [12, 16], LM: [42, 12], ST: [58, 12], RM: [50, 26] }, opp: { odl: [18, 24], odc: [48, 15], odr: [62, 18], omc: [42, 36] }, ord: { LM: 2 }, ball: 'LB',
        arrows: [{ t: 'pass', from: [24, 40], to: 'LB' }, { t: 'run', id: 'LB' }, { t: 'run', id: 'ST' }, { t: 'run', id: 'RM' }, { t: 'run', id: 'LM', o: 2 }], zones: ATT4_L,
        cap: 'Пас на ход **ЛЛ**. **ЛП** — на ближнюю штангу, **Н** — на дальнюю, **ПП** — на край штрафной на подбор.', hold: 2800, dur: 1300
      },
      { pos: { LB: [12, 8] }, ball: 'ST', arrows: [{ t: 'run', id: 'LB' }, { t: 'pass', from: 'LB', to: 'ST', lob: true, o: 2 }], cap: 'Навес на дальнюю — **Н**. Отскок подберёт **ПП**.', hold: 1800 },
      { ball: [52, -1], arrows: [{ t: 'shot', from: 'ST', to: [52, 0] }], zones: [], cap: 'Удар. От отбора до удара — 8 секунд.', hold: 2000 },
      { reset: true, pos: BLOCK, opp: BUILD, ball: 'odc', arrows: [{ t: 'run', id: 'LB', hot: true }, { t: 'run', id: 'LM' }, { t: 'run', id: 'ST' }, { t: 'run', id: 'RM' }], zones: L421, cap: 'Не забили — все бегом домой. Маятник качнулся обратно: снова **4-2-1**.', hold: 2600, dur: 1400 }
    ]
  };

  /* Роли: расстановка без движения */
  SC.roles = { still: true, frames: [{ pos: BLOCK, zones: L421 }] };

  /* Без мяча: средний блок качается за мячом */
  SC.block = {
    auto: true,
    frames: [
      { reset: true, pos: BLOCK, opp: BUILD, ball: 'odc', zones: [{ t: 'rect', x: 4, y: 2, w: 92, h: 30, label: 'здесь мяч отдаём', lb: true }, { t: 'hull', ids: OUR, label: 'компактно' }], cap: 'Соперник катает мяч у себя. Мы не бежим к нему — стоим блоком у центра поля.', hold: 2600 },
      { pos: SHIFT_L, opp: BUILD_L, ball: 'odl', arrows: [{ t: 'opass', from: 'odc', to: 'odl' }], zones: [{ t: 'hull', ids: OUR, label: '' }], cap: 'Мяч влево — сдвинулись все семеро. **Н** встал между мячом и центром, **ПЛ** подтянулся к центральным.', hold: 2600 },
      { pos: SHIFT_R, opp: BUILD_R, ball: 'odr', arrows: [{ t: 'opass', from: 'odl', to: 'odr', bend: -22 }], zones: [{ t: 'hull', ids: OUR, label: '' }], cap: 'Перевод на другой фланг — блок качнулся вправо. Теперь к центру подтягивается **ЛЛ**.', hold: 2600, dur: 1400 },
      { zones: [{ t: 'rect', x: 26, y: 59, w: 48, h: 14, label: 'между линиями — 8 метров', c: 'orange' }], arrows: [{ t: 'closed', from: 'odr', to: 'of' }, { t: 'closed', from: 'odr', to: 'omc' }], cap: 'Главное — закрытый центр. Пас в ноги нападающему или в центр не проходит — остаётся только фланг.', hold: 3000 }
    ]
  };

  /* Принцип маятника: один выходит, трое страхуют лесенкой */
  SC.pendulum = {
    auto: true,
    chapters: [{ name: 'Мяч слева', from: 0, to: 1 }, { name: 'Мяч справа', from: 2, to: 3 }],
    frames: [
      { reset: true, pos: SHIFT_L, opp: BUILD_L, ball: 'odl', zones: [{ t: 'link', ids: ['LB', 'LC', 'RC', 'RB'], label: 'линия из четырёх' }], cap: 'Мяч у их защитника слева. Наша четвёрка стоит линией.', hold: 1800 },
      {
        pos: TRAP_L, opp: { oml: [8, 44], omc: [42, 38], of: [40, 68] }, ball: 'oml', hl: ['LB'], ord: { LC: 2, RC: 2, RB: 2, GK: 2 },
        arrows: [{ t: 'opass', from: 'odl', to: 'oml' }, { t: 'run', id: 'LB' }, { t: 'run', id: 'LC', o: 2 }, { t: 'run', id: 'RC', o: 2 }, { t: 'run', id: 'RB', o: 2 }],
        zones: [{ t: 'link', ids: ['LB', 'LC', 'RC', 'RB'], label: 'лесенка', c: 'orange' }], bubbles: [{ id: 'LB', text: 'Мой!', c: 'white' }, { id: 'LC', text: 'Сдвиг!', c: 'white', below: true }],
        cap: '**ЛЛ** выходит на игрока с мячом, **ЛЦ** встаёт у него за спиной, **ПЦ** и **ПЛ** сдвигаются лесенкой. Отберём мяч — **ПЛ** уже стоит третьим защитником.', hold: 3600
      },
      { reset: true, pos: SHIFT_R, opp: BUILD_R, ball: 'odr', zones: [{ t: 'link', ids: ['LB', 'LC', 'RC', 'RB'], label: 'линия из четырёх' }], cap: 'Мяч справа — всё то же зеркально.', hold: 1800 },
      {
        pos: TRAP_R, opp: { omr: [92, 44], omc: [58, 38], of: [60, 68] }, ball: 'omr', hl: ['RB'], ord: { RC: 2, LC: 2, LB: 2, GK: 2 },
        arrows: [{ t: 'opass', from: 'odr', to: 'omr' }, { t: 'run', id: 'RB' }, { t: 'run', id: 'RC', o: 2 }, { t: 'run', id: 'LC', o: 2 }, { t: 'run', id: 'LB', o: 2 }],
        zones: [{ t: 'link', ids: ['RB', 'RC', 'LC', 'LB'], label: 'лесенка', c: 'orange' }], bubbles: [{ id: 'RB', text: 'Мой!', c: 'white' }, { id: 'RC', text: 'Сдвиг!', c: 'white', below: true }],
        cap: '**ПЛ** выходит, **ПЦ** страхует, **ЛЦ** и **ЛЛ** подтягиваются к центру. Один атакует — трое за ним наискосок.', hold: 3400
      }
    ]
  };

  /* Ловушки: где отбираем мяч */
  SC.trap = {
    auto: true,
    chapters: [{ name: 'Пас на фланг', from: 0, to: 2 }, { name: 'Приём спиной', from: 3, to: 5 }],
    frames: [
      { reset: true, pos: SHIFT_L, opp: BUILD_L, ball: 'odl', cap: 'Ждём сигнала. Мяч у их защитника — не выходим.', hold: 1600 },
      {
        quiz: { q: 'Сейчас мяч уйдёт на фланг. Кто выходит на игрока с мячом и что закрывают остальные?', a: '**ЛЛ** выходит на мяч, **ЛП** закрывает пас внутрь, **Н** — пас назад, **ЛЦ** страхует за спиной.' },
        pos: TRAP_L, opp: { oml: [8, 44], omc: [42, 38], of: [40, 68] }, ball: 'oml', focus: ['LB'],
        arrows: [{ t: 'opass', from: 'odl', to: 'oml' }].concat(runs(['LB', 'LM', 'ST', 'LC']), [{ t: 'closed', from: 'oml', to: 'omc', o: 2 }, { t: 'closed', from: 'oml', to: 'odl', o: 2 }]),
        zones: [{ t: 'rect', x: 1, y: 30, w: 34, h: 30, label: 'ловушка у бровки', lb: true, c: 'orange' }], bubbles: [{ id: 'LB', text: 'Мой!', c: 'white' }],
        cap: 'Пас на фланг — сигнал. Бровка играет за нас: **ЛЛ** выходит, **ЛП** и **Н** закрывают пасы внутрь и назад.', hold: 3200
      },
      { pos: { LB: [11, 46] }, opp: { oml: [6, 51] }, ball: 'LB', dim: ['oml'], focus: ['LB'], bubbles: [{ id: 'LB', text: 'Пошли!', below: true }], cap: 'Зажали у бровки — отбор. Сразу «Пошли!»', hold: 2000 },
      { reset: true, pos: BLOCK, opp: Object.assign({}, BUILD, { omc: [50, 40], of: [54, 64] }), ball: 'omc', cap: 'Соперник ищет пас между нашими линиями — в ноги своему нападающему.', hold: 1800 },
      {
        pos: { RC: [58, 69], LM: [46, 62], RM: [62, 60], LC: [46, 75], LB: [24, 72], RB: [80, 72], ST: [48, 50] }, ball: 'of', focus: ['RC'],
        ord: { LM: 2, RM: 2, LC: 2, LB: 2, RB: 2 },
        arrows: [{ t: 'opass', from: 'omc', to: 'of' }, { t: 'run', id: 'RC' }, { t: 'run', id: 'LM', o: 2 }, { t: 'run', id: 'RM', o: 2 }, { t: 'run', id: 'LC', o: 2 }],
        bubbles: [{ id: 'RC', text: 'Мой!', c: 'white', below: true }],
        cap: 'Принял спиной к нашим воротам — сигнал. **ПЦ** выходит сзади, **ЛП** и **ПП** зажимают с боков, **ЛЦ** страхует.', hold: 3200
      },
      { pos: { LM: [47, 61] }, opp: { of: [55, 65] }, ball: 'LM', dim: ['of'], focus: ['LM'], bubbles: [{ id: 'LM', text: 'Пошли!' }], cap: 'Отобрали — первый пас только вперёд.', hold: 2000 }
    ]
  };

  /* Отобрали — кто куда: перестроение в атаку вчетвером */
  SC.rule = {
    auto: true,
    chapters: [{ name: 'Отбор слева', from: 0, to: 1 }, { name: 'Отбор справа', from: 2, to: 3 }, { name: 'Отбор в центре', from: 4, to: 6 }],
    frames: [
      {
        reset: true, pos: Object.assign({}, TRAP_L, { LB: [11, 46] }), opp: Object.assign({}, BUILD_L, { oml: [6, 51], odl: [22, 26], omc: [42, 38], of: [40, 68] }),
        ball: 'LB', dim: ['oml'], focus: ['LB'], zones: [{ t: 'rect', x: 1, y: 2, w: 33, h: 96, label: 'левый фланг' }], cap: 'Мяч отобрали на **левом** фланге.', hold: 1600
      },
      {
        quiz: { q: 'Отобрали слева. Кто куда бежит, а кто остаётся сзади?', a: '**ЛЛ** — по флангу, **ЛП** — на ближнюю штангу, **Н** — на дальнюю, **ПП** — на край штрафной. Сзади трое: **ЛЦ**, **ПЦ** и **ПЛ**.' },
        pos: { LB: [10, 28], LM: [30, 30], ST: [50, 20], RM: [48, 40], LC: [34, 64], RC: [52, 66], RB: [68, 64], GK: [46, 90] },
        opp: { odl: [18, 32], odc: [42, 18], odr: [66, 26], omc: [42, 46], oml: [8, 46], of: [40, 62], omr: [84, 42] }, hl: ['LB'], dim: [], ball: 'LB',
        arrows: runs(['LB', 'LM', 'ST', 'RM', 'LC', 'RC', 'RB']), zones: ATT4_L, bubbles: [{ id: 'LB', text: 'Иду!' }, { id: 'RB', text: 'Стою!', c: 'white', below: true }],
        cap: 'Вперёд четверо: **ЛЛ** по флангу, **ЛП** на ближнюю, **Н** на дальнюю, **ПП** на подбор. **ПЛ** стал третьим защитником.', hold: 3600, dur: 1300
      },
      {
        reset: true, pos: Object.assign({}, TRAP_R, { RB: [89, 46] }), opp: Object.assign({}, BUILD_R, { omr: [94, 51], odr: [78, 26], omc: [58, 38], of: [60, 68] }),
        ball: 'RB', dim: ['omr'], focus: ['RB'], zones: [{ t: 'rect', x: 66, y: 2, w: 33, h: 96, label: 'правый фланг' }], cap: 'Отобрали на **правом** фланге.', hold: 1600
      },
      {
        pos: { RB: [90, 28], RM: [70, 30], ST: [50, 20], LM: [52, 40], RC: [66, 64], LC: [48, 66], LB: [32, 64], GK: [54, 90] },
        opp: { odr: [82, 32], odc: [58, 18], odl: [34, 26], omc: [58, 46], omr: [92, 46], of: [60, 62], oml: [16, 42] }, hl: ['RB'], dim: [], ball: 'RB',
        arrows: runs(['RB', 'RM', 'ST', 'LM', 'RC', 'LC', 'LB']), zones: ATT4_R, bubbles: [{ id: 'RB', text: 'Иду!' }, { id: 'LB', text: 'Стою!', c: 'white', below: true }],
        cap: 'Зеркально: **ПЛ** по флангу, **ПП** на ближнюю, **Н** на дальнюю, **ЛП** на подбор. Сзади **ЛЦ**, **ПЦ** и **ЛЛ**.', hold: 3600, dur: 1300
      },
      {
        reset: true, pos: Object.assign({}, BLOCK, { LM: [46, 60] }), opp: Object.assign({}, BUILD, { omc: [48, 50], of: [54, 70] }),
        ball: 'LM', dim: ['omc'], focus: ['LM'], zones: [{ t: 'rect', x: 34, y: 2, w: 32, h: 96, label: 'центр' }], cap: 'Перехват в **центре**. Кто идёт по флангу — решает первый пас.', hold: 1800
      },
      {
        pos: { RB: [86, 62] }, ball: 'RB', hl: ['RB'], dim: [], focus: [],
        arrows: [{ t: 'run', id: 'RB' }, { t: 'pass', from: 'LM', to: 'RB' }],
        cap: 'Первый пас ушёл **вправо** — значит, по флангу идёт **ПЛ**, на ближнюю — **ПП**.', hold: 2000
      },
      {
        pos: { RB: [88, 40], RM: [66, 34], ST: [50, 24], LM: [50, 48], LC: [40, 66], RC: [58, 68], LB: [26, 66], GK: [50, 90] },
        opp: { omr: [86, 48], odr: [76, 30], omc: [54, 54], of: [48, 64] }, ball: 'RB',
        arrows: runs(['RB', 'RM', 'ST', 'LM', 'LC', 'RC', 'LB']), zones: ATT4_R, bubbles: [{ id: 'RB', text: 'Иду!' }, { id: 'LB', text: 'Стою!', c: 'white', below: true }],
        cap: 'Вперёд **ПЛ**, **ПП**, **Н** и **ЛП** на подбор. Сзади трое. Сомневаешься, твой ли фланг, — стой.', hold: 3400, dur: 1300
      }
    ]
  };

  /* Главная контратака: соперник атаковал у наших ворот и раскрылся */
  SC.counter = {
    auto: true,
    frames: [
      {
        reset: true,
        pos: { GK: [56, 95], LB: [30, 82], LC: [48, 85], RC: [66, 84], RB: [84, 78], LM: [50, 69], RM: [70, 70], ST: [60, 54] },
        opp: { og: [50, 8], odl: [28, 42], odc: [50, 40], odr: [72, 44], oml: [24, 64], omc: [52, 58], omr: [88, 73], of: [56, 80] },
        ball: 'omr', zones: [{ t: 'rect', x: 8, y: 4, w: 84, h: 34, label: 'за их спиной пусто', lb: true, c: 'orange' }],
        cap: 'Соперник атакует по нашему правому флангу. Его защитники поднялись к центру поля — за их спиной пусто.', hold: 2600
      },
      { pos: { RB: [86, 74] }, opp: { omr: [91, 80] }, ball: 'RB', dim: ['omr'], focus: ['RB'], zones: [{ t: 'ring', at: 'RB', r: 26 }], bubbles: [{ id: 'RB', text: 'Пошли!' }], cap: 'Отбор! Кто отобрал — кричит «Пошли!»', hold: 1800 },
      {
        pos: { ST: [66, 58], RM: [70, 62] }, opp: { omc: [56, 62], of: [58, 78] }, ord: { RM: 2 }, ball: 'ST', dim: [], focus: [],
        arrows: [{ t: 'run', id: 'ST' }, { t: 'pass', from: 'RB', to: 'ST', o: 2 }, { t: 'run', id: 'RM', o: 2 }],
        cap: 'Первый пас — вперёд, в одно касание: **Н** показался под мяч.', hold: 2000
      },
      {
        pos: { RB: [88, 52], ST: [58, 42], LM: [52, 56], LC: [46, 76], RC: [64, 74], LB: [34, 76] }, opp: { odr: [72, 50], omc: [60, 64], omr: [88, 70] },
        ord: { ST: 2, LM: 2, LC: 2, RC: 2, LB: 2 }, ball: 'RM', hl: ['RB'],
        arrows: [{ t: 'pass', from: [66, 58], to: 'RM' }, { t: 'run', id: 'RB' }, { t: 'run', id: 'ST', o: 2 }, { t: 'run', id: 'LM', o: 2 }],
        bubbles: [{ id: 'RB', text: 'Иду!' }],
        cap: '**Н** скидывает набегающему **ПП**. **ПЛ** уже летит по флангу, **ЛП** идёт следом по центру.', hold: 2400
      },
      {
        pos: { RB: [88, 28], ST: [54, 24], RM: [66, 34], LM: [50, 40], LB: [34, 64], LC: [48, 66], RC: [64, 64], GK: [54, 92] },
        opp: { odr: [80, 36], odc: [54, 32], odl: [38, 32], omc: [60, 52], of: [56, 72], oml: [28, 60], omr: [86, 62] },
        ord: { RM: 2 }, ball: 'RB',
        arrows: [{ t: 'pass', from: [70, 62], to: 'RB' }, { t: 'run', id: 'RB' }, { t: 'run', id: 'ST' }, { t: 'run', id: 'LM' }, { t: 'run', id: 'RM', o: 2 }],
        zones: ATT4_R,
        cap: 'Пас на ход **ПЛ** за спину. Впереди четверо, сзади трое — против двух их нападающих.', hold: 2800, dur: 1300
      },
      {
        pos: { RB: [88, 16], RM: [58, 10], ST: [42, 10], LM: [50, 22] }, opp: { odc: [48, 15], odr: [80, 22], odl: [38, 20], omc: [58, 40], og: [52, 5] }, ball: 'RB',
        arrows: runs(['RB', 'RM', 'ST', 'LM']), zones: BOX_R,
        cap: 'Штрафная занята правильно: **ПП** — ближняя штанга, **Н** — дальняя, **ЛП** — край штрафной на подбор.', hold: 3400, dur: 1300
      },
      { ball: 'RM', arrows: [{ t: 'pass', from: 'RB', to: 'RM' }], zones: [], cap: 'Прострел низом на ближнюю — **ПП** бьёт в касание…', hold: 1600 },
      {
        opp: { odc: [53, 14] }, ball: 'LM',
        arrows: [{ t: 'shot', from: 'RM', to: [54, 14] }, { t: 'line', from: [54, 14], to: 'LM', o: 2 }],
        zones: [{ t: 'ring', at: 'LM', r: 18, label: 'подбор' }],
        cap: '…защитник блокирует удар, но отскок достаётся **ЛП** на краю штрафной.', hold: 2200
      },
      { ball: [44, -1], arrows: [{ t: 'shot', from: 'LM', to: [44, 0] }], zones: [], cap: 'Удар с подбора. От отбора до удара — 8–9 секунд.', hold: 2400 }
    ]
  };

  /* Ещё два способа контратаки */
  SC.variants = {
    auto: true,
    chapters: [{ name: 'Длинный за спину', from: 0, to: 4 }, { name: 'После ловушки у бровки', from: 5, to: 9 }],
    frames: [
      {
        reset: true, pos: { GK: [50, 95], LB: [22, 80], LC: [42, 84], RC: [60, 84], RB: [78, 80], LM: [42, 70], RM: [60, 70], ST: [50, 56] },
        opp: { og: [50, 10], odl: [28, 46], odc: [50, 44], odr: [72, 46], oml: [18, 66], omc: [46, 62], omr: [82, 66], of: [54, 80] },
        ball: 'omc', zones: [{ t: 'rect', x: 10, y: 4, w: 80, h: 38, label: 'за их спиной пусто', lb: true, c: 'orange' }],
        cap: 'Соперник атакует через центр, его защитники стоят у центральной линии.', hold: 2200
      },
      { pos: { LC: [46, 76] }, opp: { of: [54, 81] }, ball: 'LC', focus: ['LC'], arrows: [{ t: 'opass', from: 'omc', to: [46, 76] }], cap: 'Пас в ноги нападающему — перехват **ЛЦ**…', hold: 1500 },
      {
        pos: { ST: [44, 26], LM: [36, 48], LB: [14, 54], RM: [54, 60], RC: [60, 78], RB: [72, 78] }, opp: { odc: [46, 34], odl: [34, 40], odr: [66, 40], omc: [46, 57] },
        ord: { LM: 2, LB: 2, RM: 2, RC: 2, RB: 2 }, ball: 'ST', hl: ['LB'], focus: [],
        arrows: [{ t: 'pass', from: 'LC', to: 'ST', lob: true, bend: -18 }, { t: 'run', id: 'ST' }, { t: 'run', id: 'LM', o: 2 }, { t: 'run', id: 'LB', o: 2 }, { t: 'run', id: 'RM', o: 2 }],
        bubbles: [{ id: 'LC', text: 'Пошли!', below: true }],
        cap: '…и сразу длинный за спину на ход **Н**. Мяч ушёл влево: догоняют **ЛЛ** по флангу, **ЛП** в штрафную, **ПП** — на подбор. Сзади **ЛЦ**, **ПЦ**, **ПЛ**.', hold: 2800, dur: 1300
      },
      {
        pos: { ST: [44, 14], LM: [38, 24], LB: [14, 32], RM: [50, 36] }, opp: { odc: [48, 20], og: [46, 8], odl: [34, 32] }, ball: 'ST',
        arrows: runs(['ST', 'LM', 'LB', 'RM']), cap: '**Н** один на один. **ЛЛ** и **ЛП** догоняют на добивание, **ПП** — на подборе.', hold: 2000
      },
      { ball: [36, -1], arrows: [{ t: 'shot', from: 'ST', to: [36, 0] }], cap: 'Удар в дальний угол.', hold: 2200 },
      {
        reset: true, pos: Object.assign({}, TRAP_L, { LB: [11, 46] }), opp: Object.assign({}, BUILD_L, { oml: [6, 51], odl: [22, 26], omc: [42, 38], of: [40, 68] }),
        ball: 'LB', dim: ['oml'], cap: 'Отобрали высоко у бровки — соперник ещё не успел перестроиться.', hold: 1800
      },
      {
        pos: { LM: [24, 40], LB: [10, 26], ST: [40, 22], RM: [46, 44], LC: [34, 64], RC: [52, 66], RB: [68, 64] }, opp: { odl: [22, 32], omc: [40, 48], of: [42, 62] },
        ord: { LB: 2, ST: 2, RM: 2, LC: 2, RC: 2, RB: 2, odl: 2 }, ball: 'LM', hl: ['LB'], dim: [],
        arrows: [{ t: 'pass', from: [11, 46], to: 'LM' }, { t: 'run', id: 'LB', o: 2 }, { t: 'run', id: 'ST', o: 2 }, { t: 'run', id: 'RM', o: 2 }, { t: 'orun', id: 'odl', o: 2 }],
        zones: ATT4_L,
        cap: 'Пас внутрь **ЛП** — и **ЛЛ** сразу уходит вперёд по бровке, **ПП** идёт по центру. Сзади трое.', hold: 2600
      },
      {
        pos: { LB: [12, 14], ST: [56, 14], LM: [42, 14], RM: [50, 28] }, opp: { odl: [16, 22], odc: [46, 20] }, ord: { LM: 2 }, ball: 'LB',
        arrows: [{ t: 'pass', from: [24, 40], to: 'LB' }, { t: 'run', id: 'LB' }, { t: 'run', id: 'ST' }, { t: 'run', id: 'RM' }, { t: 'run', id: 'LM', o: 2 }],
        zones: ATT4_L,
        cap: 'Защитник вышел на **ЛП** — за его спиной свободно. Пас на ход **ЛЛ**, **ЛП** бежит на ближнюю, **Н** — на дальнюю.', hold: 2600
      },
      {
        pos: { LB: [14, 8] }, ball: 'ST',
        arrows: [{ t: 'run', id: 'LB' }, { t: 'pass', from: 'LB', to: 'ST', lob: true, o: 2 }],
        cap: 'Навес на дальнюю — **Н**. **ЛП** на ближней, **ПП** на подборе.', hold: 2000
      },
      { ball: [46, -1], arrows: [{ t: 'shot', from: 'ST', to: [46, 0] }], zones: [], cap: 'Удар.', hold: 2200 }
    ]
  };

  /* Пока атакуем — сзади всегда трое */
  SC.rest = {
    auto: true,
    frames: [
      {
        reset: true, pos: { GK: [52, 90], LB: [34, 64], LC: [48, 66], RC: [64, 64], RB: [88, 28], RM: [66, 34], ST: [52, 22], LM: [50, 40] },
        opp: { og: [50, 6], odl: [38, 30], odc: [54, 32], odr: [80, 36], oml: [28, 60], omc: [60, 52], omr: [86, 62], of: [56, 72] },
        ball: 'RB', hl: ['RB'], zones: ATT4_R,
        cap: 'В атаке четверо. А что у нас сзади?', hold: 2000
      },
      {
        zones: [{ t: 'rect', x: 20, y: 56, w: 62, h: 22, label: 'трое на двоих', lb: true }, { t: 'ring', at: 'of', r: 22, c: 'red' }, { t: 'ring', at: 'oml', r: 22, c: 'red' }],
        cap: 'Сзади трое на двоих: **ЛЦ**, **ПЦ** и **ЛЛ** в линию у середины нашей половины. **ЛП** на краю штрафной — первый, кто встретит потерю.', hold: 3200
      },
      {
        pos: { LC: [47, 71], RC: [61, 71], LB: [36, 68], LM: [50, 46], ST: [56, 18] }, opp: { odc: [50, 26], of: [54, 70] }, ball: 'of', zones: [],
        arrows: [{ t: 'opass', from: [50, 26], to: 'of', lob: true }, { t: 'run', id: 'LC' }, { t: 'run', id: 'RC' }, { t: 'run', id: 'LM' }],
        cap: 'Потеряли — соперник сразу бьёт длинно на своего нападающего. А рядом с ним уже двое наших.', hold: 2600, dur: 1300
      },
      { pos: { RC: [60, 73] }, opp: { of: [54, 76] }, ball: 'RC', dim: ['of'], focus: ['RC'], bubbles: [{ id: 'RC', text: 'Мой!', c: 'white', below: true }], cap: 'Отбор — и снова «Пошли!». В атаке рискуем четырьмя, но трое сзади на месте всегда.', hold: 2400 },
      {
        reset: true, pos: { GK: [50, 92], LB: [28, 74], LC: [46, 78], RC: [64, 78], RB: [86, 40], LM: [46, 64], RM: [62, 40], ST: [56, 26] },
        opp: { og: [50, 6], odl: [30, 34], odc: [50, 30], odr: [70, 34], oml: [22, 62], omc: [50, 54], omr: [80, 62], of: [54, 82] },
        ball: 'RB', hl: ['RB'],
        zones: [{ t: 'ring', at: 'oml', r: 20, c: 'red' }, { t: 'ring', at: 'omr', r: 20, c: 'red' }, { t: 'ring', at: 'of', r: 20, c: 'red' }, { t: 'hull', ids: ['RB', 'RM', 'ST'], label: 'атакуем втроём', c: 'orange' }, { t: 'ring', at: 'LM', r: 22, label: 'остаётся', above: true }],
        cap: 'У соперника впереди остались трое? Тогда **ЛП** не идёт на подбор, а остаётся четвёртым сзади — атакуем втроём.', hold: 3400
      }
    ]
  };

  /* Позиционная атака: перестраиваемся в 3-3-1 */
  SC.shape = {
    auto: true,
    chapters: [{ name: '«Держим!»', from: 0, to: 2 }, { name: '«Меняемся!»', from: 3, to: 4 }, { name: 'От вратаря', from: 5, to: 7 }],
    frames: [
      {
        reset: true, pos: { GK: [50, 90], LB: [32, 64], LC: [48, 66], RC: [64, 64], RB: [88, 30], RM: [64, 30], ST: [44, 24], LM: [46, 42] },
        opp: Object.assign({}, DEF, { omr: [84, 38] }), ball: 'RB', hl: ['RB'],
        cap: 'Контратака не вышла: соперник успел вернуться, за мячом шестеро. Бить неоткуда.', hold: 2200
      },
      {
        pos: { RM: [64, 38], LB: [32, 54], LC: [48, 56], RC: [66, 54] }, ord: { LB: 2, LC: 2, RC: 2 }, ball: 'RM',
        arrows: [{ t: 'pass', from: 'RB', to: 'RM' }, { t: 'run', id: 'LC', o: 2 }, { t: 'run', id: 'RC', o: 2 }, { t: 'run', id: 'LB', o: 2 }],
        bubbles: [{ id: 'RB', text: 'Держим!', below: true }], zones: L331_R,
        cap: '«Держим!» Не рискуем: пас назад и перестраиваемся в **3-3-1**. Трое сзади поднимаются к центру поля.', hold: 3000
      },
      {
        opp: { of: [50, 50], omc: [46, 34] }, ball: 'LC', arrows: [{ t: 'pass', from: 'RM', to: 'LC' }], zones: L331_R,
        cap: '**3-3-1**: сзади **ЛЦ**, **ПЦ** и **ЛЛ**; **ПЛ** держит ширину справа, **ПП** и **ЛП** между линиями соперника; **Н** прижимает их защитников.', hold: 3600
      },
      {
        reset: true, pos: { GK: [50, 90], LB: [30, 52], LC: [48, 56], RC: [66, 54], RB: [88, 32], RM: [64, 38], LM: [46, 42], ST: [44, 24] },
        opp: Object.assign({}, DEF, { of: [40, 48], omc: [44, 32] }), ball: 'LB', hl: ['RB'],
        cap: 'Мяч перевели налево, соперник сместился за ним. Свободная зона теперь слева.', hold: 2000
      },
      {
        pos: { LB: [12, 34], RB: [70, 54], RC: [54, 56], LC: [38, 56], LM: [34, 40], RM: [62, 36] }, ord: { LB: 2 }, ball: 'LM', hl: ['LB'],
        arrows: [{ t: 'pass', from: [30, 52], to: 'LM' }, { t: 'run', id: 'LB', o: 2 }, { t: 'run', id: 'RB', hot: true }, { t: 'run', id: 'RC' }, { t: 'run', id: 'LC' }],
        bubbles: [{ id: 'LC', text: 'Меняемся!', c: 'white', below: true }, { id: 'LB', text: 'Иду!' }, { id: 'RB', text: 'Стою!', c: 'white', below: true }],
        zones: [{ t: 'link', ids: ['LC', 'RC', 'RB'], label: '3' }, { t: 'link', ids: ['LB', 'LM', 'RM'], label: '3' }, { t: 'link', ids: ['ST'], label: '1' }],
        cap: '«Меняемся!» **ЛЛ** поднимается в середину, **ПЛ** возвращается третьим защитником. Маятник качнулся — сзади снова трое.', hold: 3800, dur: 1400
      },
      {
        reset: true, pos: { GK: [50, 94], LB: [20, 78], LC: [42, 82], RC: [66, 80], RB: [88, 58], RM: [62, 64], LM: [40, 64], ST: [50, 44] },
        opp: { og: [50, 6], odl: [30, 36], odc: [50, 34], odr: [70, 36], oml: [24, 60], omc: [50, 56], omr: [76, 60], of: [50, 72] }, ball: 'GK',
        zones: [{ t: 'link', ids: ['LB', 'LC', 'RC'], label: '3' }, { t: 'link', ids: ['LM', 'RM', 'RB'], label: '3' }, { t: 'link', ids: ['ST'], label: '1' }],
        cap: 'Мяч у вратаря. Трое сзади раздвигаются на ширину штрафной, **ПЛ** — в середине справа, **ЛП** и **ПП** открываются под пас.', hold: 2600
      },
      { opp: { of: [60, 74] }, ball: 'RC', arrows: [{ t: 'pass', from: 'GK', to: 'RC' }], cap: 'Пас на свободного защитника. Нападающий соперника один — против троих ему не успеть.', hold: 2000 },
      {
        pos: { RM: [66, 50], ST: [56, 36] }, opp: { omr: [82, 60] }, ord: { RM: 2, ST: 2 }, ball: 'RB',
        arrows: [{ t: 'pass', from: 'RC', to: 'RB', bend: 12 }, { t: 'run', id: 'RM', o: 2 }, { t: 'run', id: 'ST', o: 2 }],
        cap: 'Первый пас — вперёд, на **ПЛ** у бровки. Дальше атакуем по флангу — как на следующем слайде.', hold: 2400
      }
    ]
  };

  /* Позиционная атака: три хода к удару */
  SC.patterns = {
    auto: true,
    chapters: [{ name: 'Через фланг', from: 0, to: 4 }, { name: 'Через нападающего', from: 5, to: 9 }, { name: 'Подбор с края', from: 10, to: 12 }],
    frames: [
      { reset: true, pos: POS_R, opp: DEF, ball: 'RM', zones: L331_R, cap: 'Соперник стоит блоком у своей штрафной. Мы в **3-3-1**, мяч у **ПП**.', hold: 2200 },
      { opp: { omr: [80, 30] }, ball: 'RB', arrows: [{ t: 'pass', from: 'RM', to: 'RB' }], zones: L331_R, cap: 'Пас на **ПЛ**. Их крайний выходит на него — у бровки за его спиной свободно.', hold: 2000 },
      {
        pos: { RB: [90, 14], RM: [58, 9], ST: [42, 9], LM: [50, 22], LB: [34, 50], LC: [50, 52], RC: [66, 50] },
        opp: { odr: [80, 18], odc: [50, 13], odl: [36, 15], omc: [50, 30], omr: [86, 24] }, ord: { LB: 2, LC: 2, RC: 2 }, ball: 'RB',
        arrows: runs(['RB', 'RM', 'ST', 'LM']), zones: BOX_R.concat([{ t: 'link', ids: ['LB', 'LC', 'RC'], label: '3' }]),
        cap: '**ПЛ** уходит по бровке на ускорении. Штрафная занята: **ПП** на ближней, **Н** на дальней, **ЛП** на краю. Трое сзади подтянулись.', hold: 3400, dur: 1300
      },
      { ball: 'RM', arrows: [{ t: 'pass', from: 'RB', to: 'RM' }], zones: [], cap: 'Прострел на ближнюю — **ПП** замыкает.', hold: 1600 },
      { ball: [56, -1], arrows: [{ t: 'shot', from: 'RM', to: [56, 0] }], cap: 'Удар. Ближняя закрыта — навес на дальнюю или откат на край.', hold: 2400 },
      {
        reset: true, pos: { GK: [50, 90], LB: [30, 54], LC: [48, 56], RC: [66, 54], RB: [88, 34], RM: [64, 38], LM: [40, 42], ST: [50, 22] },
        opp: Object.assign({}, DEF, { omc: [44, 30] }), ball: 'LM', cap: 'Центр соперника закрыт плотно. Мяч у **ЛП**.', hold: 2000
      },
      {
        pos: { ST: [56, 30] }, opp: { odc: [54, 22] }, ord: { odc: 2 }, ball: 'ST',
        arrows: [{ t: 'run', id: 'ST' }, { t: 'pass', from: 'LM', to: 'ST', o: 2 }],
        cap: '**Н** опускается под мяч спиной к воротам и уводит за собой защитника.', hold: 2200
      },
      {
        pos: { LM: [46, 16], RB: [88, 20] }, ord: { LM: 2, RB: 2 }, ball: 'RM',
        arrows: [{ t: 'pass', from: 'ST', to: 'RM' }, { t: 'run', id: 'LM', o: 2 }, { t: 'run', id: 'RB', o: 2 }],
        cap: 'Скидка на **ПП** — а в дыру, откуда ушёл защитник, уже бежит **ЛП**. **Н** теперь на краю штрафной.', hold: 2400
      },
      { pos: { LM: [48, 9] }, ball: 'LM', arrows: [{ t: 'pass', from: 'RM', to: 'LM' }, { t: 'run', id: 'LM' }], cap: 'Пас на ход — **ЛП** выходит к воротам.', hold: 1800 },
      { ball: [58, -1], arrows: [{ t: 'shot', from: 'LM', to: [58, 0] }], cap: 'Удар. Роли поменялись, места остались: кто опустился за мячом — тот и на подборе.', hold: 2400 },
      {
        reset: true, pos: { GK: [50, 90], LB: [34, 50], LC: [50, 52], RC: [66, 50], RB: [90, 14], RM: [58, 9], ST: [42, 9], LM: [50, 22] },
        opp: { og: [50, 4], odl: [36, 15], odc: [50, 13], odr: [80, 18], oml: [26, 30], omc: [56, 32], omr: [86, 24], of: [52, 46] }, ball: 'RB',
        zones: BOX_R, cap: 'Навес с фланга. Все по местам: ближняя, дальняя, край.', hold: 1800
      },
      {
        opp: { odc: [47, 14] }, ball: 'LM',
        arrows: [{ t: 'pass', from: 'RB', to: [44, 9], lob: true }, { t: 'opass', from: [47, 14], to: 'LM', o: 2 }],
        zones: [{ t: 'ring', at: 'LM', r: 18, label: 'подбор' }],
        cap: 'Навес на дальнюю, защитник выбивает — прямо на **ЛП** на краю штрафной.', hold: 2200
      },
      { ball: [44, -1], arrows: [{ t: 'shot', from: 'LM', to: [44, 0] }], zones: [], cap: 'Удар с ходу. Бить неудобно — пас назад на трёх защитников, и атака заново.', hold: 2600 }
    ]
  };

  /* Потеряли мяч: «Домой!» */
  SC.loss = {
    auto: true,
    frames: [
      {
        reset: true, pos: { GK: [50, 90], LB: [32, 56], LC: [48, 58], RC: [66, 56], RB: [88, 22], RM: [60, 12], ST: [44, 12], LM: [50, 24] },
        opp: { og: [50, 4], odl: [36, 16], odc: [53, 19], odr: [74, 16], oml: [28, 30], omc: [56, 32], omr: [80, 30], of: [50, 48] },
        ball: 'omc', hl: ['RB'], zones: [{ t: 'ring', at: 'omc', r: 26, c: 'red', label: 'потеря' }], cap: 'Потеряли мяч у чужой штрафной.', hold: 1800
      },
      {
        pos: { LM: [54, 38], RM: [66, 24], ST: [44, 28], RB: [86, 40], LB: [34, 62], LC: [48, 64], RC: [66, 62] }, opp: { of: [48, 52] },
        ball: 'omc', focus: ['LM'], zones: [],
        arrows: [{ t: 'run', id: 'LM' }, { t: 'run', id: 'RB', hot: true }, { t: 'run', id: 'RM' }, { t: 'run', id: 'ST' }, { t: 'run', id: 'LC' }, { t: 'run', id: 'RC' }, { t: 'run', id: 'LB' }],
        bubbles: [{ id: 'LM', text: 'Мой!', c: 'white' }, { id: 'LC', text: 'Домой!', c: 'white', below: true }],
        cap: '**ЛП** с края штрафной первым закрывает мяч: не лезет в подкат, а мешает отдать вперёд. Остальные — «Домой!»', hold: 3000
      },
      {
        pos: { RB: [86, 58], RC: [74, 70], LC: [56, 74], LB: [40, 72], LM: [52, 52], RM: [62, 44], ST: [48, 40] }, opp: { omr: [84, 48], of: [52, 62], omc: [56, 38] },
        ball: 'omr', focus: [],
        arrows: [{ t: 'opass', from: 'omc', to: 'omr' }, { t: 'run', id: 'RB', hot: true }, { t: 'run', id: 'RC' }, { t: 'run', id: 'LC' }, { t: 'run', id: 'LB' }, { t: 'run', id: 'LM' }],
        zones: [{ t: 'ring', at: 'LM', r: 24, label: 'закрыл центр', above: true }],
        cap: 'Соперник ищет фланг, откуда ушёл латераль. **ПЛ** бежит назад на максимальной скорости, **ПЦ** сдвигается к бровке, **ЛП** закрывает центр.', hold: 3200, dur: 1300
      },
      {
        pos: { GK: [56, 93], LB: [34, 76], LC: [50, 78], RC: [68, 77], RB: [86, 71], LM: [54, 64], RM: [70, 63], ST: [62, 50] }, opp: { omr: [88, 62], of: [48, 72] },
        ball: 'omr', hl: [], arrows: runs(['RB', 'RM', 'ST']), zones: [{ t: 'hull', ids: OUR, label: 'снова 4-2-1' }],
        cap: 'Через 5–6 секунд после потери мы снова в **4-2-1** — и снова ждём сигнала.', hold: 2800
      }
    ]
  };

  /* Ошибки: у соперника всё логично — он наказывает за каждую */
  SC.mistakes = {
    auto: false,
    chapters: [{ name: 'Бегут все', from: 0, to: 0 }, { name: 'Ушли оба латераля', from: 1, to: 1 }, { name: 'Блок в штрафной', from: 2, to: 2 }, { name: 'Одиночный прессинг', from: 3, to: 5 }, { name: 'Некому на подбор', from: 6, to: 7 }],
    frames: [
      {
        reset: true, pos: { GK: [50, 92], LB: [20, 36], LC: [50, 66], RC: [70, 40], RB: [86, 26], LM: [38, 30], RM: [60, 26], ST: [48, 14] },
        opp: { og: [50, 4], odl: [30, 16], odc: [54, 9], odr: [72, 16], oml: [24, 28], omc: [52, 22], omr: [80, 52], of: [42, 56] },
        ball: 'omc', zones: [{ t: 'rect', x: 5, y: 54, w: 90, h: 38, c: 'red', label: 'пусто', lb: true }],
        arrows: [{ t: 'opass', from: 'omc', to: [36, 80], lob: true }, { t: 'orun', id: 'of', to: [36, 80] }, { t: 'orun', id: 'omr', to: [70, 78] }],
        cap: 'В атаку ушли шестеро — сзади один **ЛЦ**. Их нападающий и крайний остались впереди: длинный пас, и двое против одного.', hold: 2000
      },
      {
        reset: true, pos: { GK: [50, 92], LB: [12, 28], RB: [88, 30], LC: [40, 66], RC: [60, 66], LM: [40, 48], RM: [60, 40], ST: [50, 20] },
        opp: { og: [50, 4], odl: [30, 18], odc: [50, 14], odr: [70, 18], oml: [12, 56], omc: [50, 38], omr: [88, 56], of: [50, 60] },
        ball: 'omc', hl: ['LB', 'RB'],
        zones: [{ t: 'rect', x: 1, y: 58, w: 22, h: 34, c: 'red', label: 'пусто', lb: true }, { t: 'rect', x: 77, y: 58, w: 22, h: 34, c: 'red', label: 'пусто', lb: true }],
        arrows: [{ t: 'opass', from: 'omc', to: [88, 80] }, { t: 'orun', id: 'omr', to: [88, 82] }, { t: 'orun', id: 'oml', to: [12, 82] }],
        cap: 'Ушли **оба** латераля — сзади двое. Фланговые соперника остались высоко и бегут в пустые зоны до самых ворот.', hold: 2000
      },
      {
        reset: true, pos: { GK: [50, 96], LB: [20, 88], LC: [38, 90], RC: [60, 90], RB: [80, 88], LM: [32, 82], RM: [64, 82], ST: [50, 72] },
        opp: { og: [50, 8], odl: [30, 48], odc: [50, 46], odr: [70, 48], oml: [20, 72], omc: [44, 64], omr: [80, 72], of: [54, 80] },
        ball: 'omc', zones: [{ t: 'rect', x: 22, y: 58, w: 56, h: 14, c: 'red', label: 'бьют отсюда' }],
        arrows: [{ t: 'oshot', from: 'omc', to: [46, 100] }],
        cap: 'Блок провалился в штрафную. Соперник спокойно бьёт из-за штрафной и навешивает.', hold: 2000
      },
      {
        reset: true, pos: Object.assign({}, BLOCK, { ST: [50, 44] }), opp: BUILD, ball: 'odc', focus: ['ST'],
        arrows: [{ t: 'run', id: 'ST', to: [50, 26] }],
        cap: '**Н** один побежал на их защитника — без сигнала и без поддержки.', hold: 2000
      },
      {
        pos: { ST: [50, 24] }, opp: { omc: [50, 38] }, ball: 'omc', focus: [],
        arrows: [{ t: 'run', id: 'ST' }, { t: 'opass', from: 'odc', to: 'omc', bend: 20 }],
        zones: [{ t: 'rect', x: 30, y: 30, w: 40, h: 22, c: 'red', label: 'дыра', lb: true }],
        cap: 'Пас мимо него — и у соперника свободный игрок в центре, которого никто не держит.', hold: 2200
      },
      {
        opp: { omc: [50, 42] }, ball: 'of',
        arrows: [{ t: 'opass', from: 'omc', to: 'of' }],
        zones: [{ t: 'rect', x: 30, y: 30, w: 40, h: 22, c: 'red', label: 'дыра', lb: true }],
        cap: 'Разворот и пас в ноги нападающему между линиями. Выходим только по сигналу и только вдвоём-втроём.', hold: 2600
      },
      {
        reset: true, pos: { GK: [50, 90], LB: [32, 54], LC: [48, 56], RC: [66, 54], RB: [90, 12], RM: [58, 8], ST: [42, 8], LM: [48, 11] },
        opp: { og: [50, 4], odl: [36, 15], odc: [55, 15], odr: [78, 16], oml: [30, 30], omc: [52, 30], omr: [80, 30], of: [50, 48] },
        ball: 'RB', zones: [{ t: 'rect', x: 34, y: 17, w: 32, h: 12, c: 'red', label: 'на краю никого', lb: true }],
        cap: 'Прострел — а в штрафную забежали все четверо. На краю штрафной никого.', hold: 2200
      },
      {
        opp: { omc: [50, 24] }, ball: 'omc',
        arrows: [{ t: 'pass', from: 'RB', to: [52, 12] }, { t: 'opass', from: [55, 15], to: 'omc', o: 2 }, { t: 'orun', id: 'of', to: [46, 66], o: 2 }],
        cap: 'Защитник выбивает на край — а там соперник. Отскок его, и контратака против наших троих.', hold: 2600
      }
    ]
  };

  /* ---------- Слайды ---------- */
  const p = TE.normalizeProject({
    title: 'Маятник',
    settings: { format: '8x8', legend: { special: 'маятник' }, tokens: { oppSize: 0.8 } },
    slides: []
  });
  const add = (layout, nav, title, subtitle, body, scene, extra) => p.slides.push(Object.assign({ id: uid(), layout, nav, title, subtitle, body, side: 'left', board: scene ? fromCompact(scene) : null }, extra || {}));

  add('title', 'Маятник: идея', 'Маятник', 'Отдаём мяч — забираем пространство',
    'Играем от обороны: приглашаем соперника владеть мячом, стоим компактно и ждём сигнала. Отобрали — острая контратака малым числом, на ускорениях, пока соперник раскрыт. Не вышло — спокойная позиционная атака.\n\n' +
    '- **Без мяча — 4-2-1.** Семеро качаются за мячом, как маятник, центр закрыт.\n' +
    '- **С мячом — 3-3-1.** Латераль фланга, где отобрали мяч, уходит в полузащиту и дальше вперёд, второй становится третьим защитником.\n' +
    '- **В атаке четверо.** Латераль по флангу, полузащитник на ближнюю штангу, нападающий на дальнюю, второй полузащитник на подборе.\n' +
    '- **Сзади всегда трое.** Два центральных защитника и второй латераль.', SC.idea);

  add('text', 'Как мы играем', 'Как мы играем', 'Пять фаз. Большую часть матча мяч у соперника — это не беда, а наш план.',
    '1. **Оборона 4-2-1.** Компактный блок у центра поля. Мяч сопернику отдаём у его ворот, центр и спину — нет.\n' +
    '2. **Маятник и ловушка.** Мяч на фланге — латераль выходит, трое страхуют лесенкой, полузащитник и нападающий закрывают пасы. Зажали — отбор.\n' +
    '3. **Контратака вчетвером — до 10 секунд.** Первый пас вперёд: латераль по флангу, в штрафной двое, один на подборе. Сзади трое.\n' +
    '4. **Позиционная атака 3-3-1.** Соперник успел вернуться — «Держим!», перестраиваемся и терпеливо ищем фланг и подбор.\n' +
    '5. **Потеря.** Ближний задерживает, остальные «Домой!» — через 5–6 секунд снова 4-2-1.\n\n' +
    '> Формула на весь матч: без мяча **4-2-1**, с мячом **3-3-1**, сзади **всегда трое**.');

  add('roles', 'Кто есть кто', 'Кто есть кто и что от кого требуется', 'Нажмите на позицию — на схеме подсветятся её игроки.',
    'Буквы на фишках одинаковые на всех схемах: **ВР** вратарь, **ЛЛ** и **ПЛ** латерали, **ЛЦ** и **ПЦ** центральные защитники, **ЛП** и **ПП** центральные полузащитники, **Н** нападающий.',
    SC.roles, {
      roles: [
        {
          title: 'Вратарь', ids: ['GK'],
          body: '**Без мяча**\n- Командует блоком: «Сдвиг!», «Мой!», «Домой!» — ему видно всё поле.\n- Стоит высоко и забирает пробросы за спину защитников.\n\n' +
            '**В контратаке**\n- Поймал мяч — сразу ищет свободного: рукой на латераля или ногой за спину их защитникам.\n\n' +
            '**В позиционной атаке**\n- Начинает розыгрыш: трое сзади раздвигаются, вратарь отдаёт свободному.\n- Страхует за спиной у трёх защитников, которые поднялись к центру поля.\n\n' +
            '**Что нужно:** голос, игра на выходах, точный ввод мяча рукой и ногой.'
        },
        {
          title: 'Центральные защитники', ids: ['LC', 'RC'],
          body: '**Без мяча**\n- Держат линию в 16 метрах от ворот — перед штрафной, а не в ней.\n- Латераль вышел на мяч — ближний центральный встаёт у него за спиной наискосок и кричит «Сдвиг!».\n- Из линии выходят только на приём спиной к воротам — второй тут же страхует.\n\n' +
            '**В контратаке**\n- Первый пас — вперёд, в одно-два касания.\n- Вперёд не уходят: вместе со вторым латералем это трое, которые стоят всегда.\n- Поднимаются вслед за атакой до середины нашей половины.\n\n' +
            '**В позиционной атаке**\n- Стоят у центральной линии, спокойно перекатывают мяч и ищут свободного.\n- Кричат «Меняемся!», когда мяч надолго ушёл на другой фланг.\n- Потеря — первыми встречают нападающего соперника.\n\n' +
            '**Что нужно:** единоборства и игра головой, терпение, точный пас.'
        },
        {
          title: 'Латерали — маятники', ids: ['LB', 'RB'],
          body: '**Без мяча**\n- Мяч на твоём фланге — выходишь на игрока с мячом и прижимаешь его к бровке.\n- Мяч на другом фланге — подтягиваешься к центру и становишься третьим центральным.\n\n' +
            '**В контратаке**\n- Отобрали на твоём фланге или первый пас ушёл к тебе — «Иду!» и рывок по бровке. Твоя работа — прострел или навес.\n- Отобрали на другом — «Стою!», ты третий защитник.\n- Потеря — назад на максимальной скорости: твой фланг открыт.\n\n' +
            '**В позиционной атаке**\n- Верхний латераль держит ширину у бровки и уходит за спину их крайнему.\n- Нижний — третий защитник. По команде «Меняемся!» верхний возвращается, нижний поднимается.\n\n' +
            '**Что нужно:** ускорение и выносливость, оборона один в один, передача на ходу.'
        },
        {
          title: 'Центральные полузащитники', ids: ['LM', 'RM'],
          body: '**Без мяча**\n- Закрывают центр: между вами и защитниками не больше 8 метров.\n- Латераль вышел на мяч — ближний полузащитник закрывает пас внутрь.\n- Приём спиной к нашим воротам — зажимаете соперника с боков.\n\n' +
            '**В контратаке**\n- Полузащитник со стороны атаки — на **ближнюю штангу**.\n- Второй — на **край штрафной**: подбирает отскок, бьёт с ходу или начинает позиционную атаку.\n- Потеря — тот, кто на подборе, первым закрывает мяч.\n- У соперника впереди остались трое — второй на подбор не идёт, а остаётся сзади.\n\n' +
            '**В позиционной атаке**\n- Оба между линиями соперника: открываются под пас, помогают латералю на фланге и бегут в дыру за защитником.\n\n' +
            '**Что нужно:** перехваты и подбор, игра в одно касание, удар из-за штрафной.'
        },
        {
          title: 'Нападающий', ids: ['ST'],
          body: '**Без мяча**\n- Первый защитник: встаёт между мячом и центром и направляет соперника на фланг.\n- Мяч ушёл на фланг — закрывает пас назад, ловушка захлопывается.\n- Один на защитников не бежит никогда.\n\n' +
            '**В контратаке**\n- Показывается под первый пас или сразу уходит за спину защитникам.\n- Держит мяч спиной и скидывает набегающему полузащитнику.\n- На прострел — на **дальнюю штангу**.\n\n' +
            '**В позиционной атаке**\n- Прижимает защитников соперника, опускается под мяч и уводит за собой защитника.\n- Опустился — остаётся на краю штрафной вместо полузащитника.\n\n' +
            '**Что нужно:** рывок, игра спиной к воротам, хладнокровие: моментов будет немного.'
        }
      ]
    });

  add('split', 'Без мяча: 4-2-1', 'Без мяча: отдаём мяч, не отдаём пространство', 'Соперник может катать мяч сколько угодно. Опасны только пас в центр и пас за спину.',
    '- **Семеро — одно целое.** От нападающего до защитников около 16 метров, между линиями — не больше 8.\n' +
    '- **Первая линия — у центра поля.** Их защитникам мяч отдаём, дальше в центр не пускаем.\n' +
    '- **Весь блок качается за мячом.** Мяч ушёл в сторону — сдвинулись все семеро, дальний латераль подтянулся к центру.\n' +
    '- **Центр закрыт всегда.** Пусть играют по флангу — там у нас ловушка.\n' +
    '- **Никто не выходит без сигнала.** Одиночный прессинг только открывает дыру за спиной.', SC.block);

  add('split', 'Принцип маятника', 'Принцип маятника', 'Один атакует мяч — трое страхуют наискосок. Мяч ушёл на другой фланг — всё качнулось обратно.',
    '- **Латераль со стороны мяча выходит** на игрока с мячом и прижимает его к бровке.\n' +
    '- **Ближний центральный встаёт у него за спиной**, остальные сдвигаются лесенкой.\n' +
    '- **Дальний латераль подтягивается к центру** и становится третьим центральным.\n' +
    '- **Мяч переведён — маятник качнулся обратно.** Вышедший возвращается в линию, выходит латераль другого фланга.\n' +
    '- **Голос:** !!Мой!!! — кто вышел, !!Сдвиг!!! — центральный защитник.\n\n' +
    '> Так рождается 3-3-1: отобрали мяч — вышедший латераль уже выше всех и бежит вперёд, а дальний уже стоит третьим защитником.', SC.pendulum);

  add('split', 'Ловушки', 'Ловушки: где мы отбираем мяч', 'Выходим на мяч только по сигналу — и сразу вдвоём-втроём.',
    '- **Пас на фланг.** Бровка — наш лишний защитник. Латераль выходит, ближний полузащитник закрывает пас внутрь, нападающий — пас назад, центральный страхует.\n' +
    '- **Приём спиной к нашим воротам.** Центральный защитник выходит сзади и не даёт развернуться, полузащитники зажимают с боков, второй центральный страхует.\n' +
    '- **Плохой приём, отскок, мяч в воздухе.** Ближайший атакует сразу, без команды.\n\n' +
    '> Выходим только вдвоём-втроём. Один — это не прессинг, а дыра за спиной.', SC.trap);

  add('split', 'Кто куда', 'Отобрали мяч — кто куда', 'Решает один признак — где отобрали мяч. С этой секунды мы в 3-3-1.',
    'Отобрали слева :: **ЛЛ** по флангу, **ЛП** на ближнюю, **Н** на дальнюю, **ПП** на подбор. Сзади **ЛЦ, ПЦ и ПЛ**\n' +
    'Отобрали справа :: **ПЛ** по флангу, **ПП** на ближнюю, **Н** на дальнюю, **ЛП** на подбор. Сзади **ЛЦ, ПЦ и ЛЛ**\n' +
    'Отобрали в центре :: решает **первый пас**: ушёл вправо — атакуем как «справа», влево — как «слева»\n\n' +
    '- **Четверо атакуют — трое стоят.** Оба центральных и второй латераль никуда не уходят.\n' +
    '- **Голос обязателен.** Кто отобрал — !!Пошли!!!, латераль — !!Иду!!!, второй латераль — !!Стою!!!\n' +
    '- **Сомневаешься, твой ли фланг, — стой.** Лучше атаковать втроём, чем пропустить в пустую зону.', SC.rule);

  add('split', 'Контратака', 'Контратака вчетвером — по шагам', 'Соперник атаковал и раскрылся. У нас 8–10 секунд, пока он не вернулся.',
    '1. **Отбор и «Пошли!»** Кто отобрал или первым увидел — кричит.\n' +
    '2. **Первый пас — вперёд, в одно касание.** Нападающий показался — пас в ноги. Не назад и не поперёк.\n' +
    '3. **Скидка набегающему полузащитнику** — латераль уже бежит по флангу.\n' +
    '4. **Пас на ход латералю за спину** — в свободную зону, а не в ноги.\n' +
    '5. **Занимаем штрафную:** полузащитник со стороны атаки — ближняя штанга, нападающий — дальняя, второй полузащитник — край штрафной.\n' +
    '6. **Прострел или навес.** Отскок — удар с подбора. Не получилось за 10 секунд — !!Держим!!!\n\n' +
    '> Соперник, который атакует, сам поднимает защитников — поле за их спиной наше.', SC.counter);

  add('split', 'Ещё два способа', 'Ещё два способа контратаки', 'Моментов за игру будет немного, поэтому комбинации должны быть отработаны.',
    '## Длинный за спину\n' +
    'Соперник атакует через центр и держит защитников у центральной линии. Перехватили — сразу длинный на ход нападающему. Догоняют латераль и полузащитник той стороны, куда ушёл мяч, второй полузащитник — на подбор.\n' +
    '## После ловушки у бровки\n' +
    'Отобрали высоко — соперник не успел перестроиться. Пас внутрь полузащитнику, латераль уходит вперёд по бровке, пас на ход ему за спину защитника — и навес на дальнюю.\n\n' +
    '> Бегущий без мяча быстрее любого дриблинга. Мяч должен бежать впереди.', SC.variants);

  add('split', 'Трое сзади', 'Пока атакуем — сзади всегда трое', 'Контратака рискует четырьмя игроками, а не всей командой.',
    '- **Два центральных и второй латераль.** Никуда не уходят, даже когда очень хочется.\n' +
    '- **Линия поднимается за атакой** до середины нашей половины, в позиционной атаке — до центра поля.\n' +
    '- **Первый на потерю — полузащитник на подборе.** Он ближе всех и задерживает соперника, пока трое перестраиваются.\n' +
    '- **Считаем их нападающих.** Впереди у соперника остались трое — полузащитник на подбор не идёт, остаётся четвёртым сзади.', SC.rest);

  add('split', 'Позиционная атака: 3-3-1', 'Позиционная атака: перестраиваемся в 3-3-1', 'Контратака не вышла или мяч у вратаря — не спешим. Владеем мячом, пока соперник не раскроется.',
    '- **!!Держим!!!** — пас назад, никто не бьёт с плохой позиции.\n' +
    '- **Трое сзади** — два центральных и нижний латераль — поднимаются к центру поля и перекатывают мяч.\n' +
    '- **Трое в середине:** верхний латераль держит ширину у бровки, **ЛП** и **ПП** между линиями соперника.\n' +
    '- **Нападающий** прижимает защитников и опускается под мяч.\n' +
    '- **!!Меняемся!!!** Мяч надолго ушёл на другой фланг — верхний латераль возвращается, нижний поднимается. Только когда мяч у нас сзади и в безопасности, никогда в контратаке.\n' +
    '- **От вратаря:** трое раздвигаются на ширину штрафной, полузащитники открываются, первый пас — на свободного.', SC.shape);

  add('split', 'Позиционная атака: удар', 'Позиционная атака: как доводим до удара', 'Три отработанных хода. Места в штрафной одни и те же: ближняя, дальняя, край.',
    '## Через фланг\n' +
    'Пас латералю, их крайний выходит на него — латераль уходит по бровке на ускорении. Штрафная занята: полузащитник на ближней, нападающий на дальней, второй полузащитник на краю. Прострел.\n' +
    '## Через нападающего\n' +
    'Нападающий опускается спиной к воротам и уводит защитника. Скидка полузащитнику — а в дыру за защитником уже бежит второй полузащитник. Кто опустился, тот и на подборе.\n' +
    '## Подбор с края\n' +
    'Защитник выбивает навес — мяч летит на край штрафной, где стоит наш. Удар с ходу. Бить неудобно — пас назад и атака заново.\n\n' +
    '> Не бьём из безнадёжных позиций. Лучше ещё один перевод, чем потеря и контратака против троих.', SC.patterns);

  add('split', 'Потеряли мяч', 'Потеряли мяч: «Домой!»', 'Потеря в атаке — не беда, если первые пять секунд все делают своё.',
    '1. **Полузащитник на подборе закрывает мяч первым.** Не лезет в подкат, а мешает отдать вперёд.\n' +
    '2. **Остальные — !!Домой!!!** Бегом, а не шагом.\n' +
    '3. **Латераль возвращается на максимальной скорости**, центральный сдвигается на его фланг, второй полузащитник закрывает центр.\n' +
    '4. **Через 5–6 секунд — снова 4-2-1.**', SC.loss);

  add('split', 'Ошибки', 'Ошибки, которые ломают схему', 'Пять главных — на схеме, переключайте кнопками.',
    '- **Бегут все.** Сзади один — любой длинный пас становится выходом двое на одного.\n' +
    '- **Ушли оба латераля.** Сзади двое, фланги пустые до самых ворот.\n' +
    '- **Блок провалился в штрафную.** Соперник бьёт из-за штрафной и навешивает.\n' +
    '- **Одиночный прессинг.** Один побежал без сигнала — за его спиной дыра.\n' +
    '- **Некому на подбор.** В штрафную забежали все четверо — отскок у соперника, и контратака против наших троих.\n' +
    '- **Медленный первый пас** и **латераль возвращается шагом** — соперник успевает раньше нас.', SC.mistakes);

  add('text', 'Команды голосом', 'Голос — половина схемы', 'Маятник работает, только если все слышат, что происходит. Восемь коротких команд — одни и те же на каждой игре.',
    '!!Мой!!! :: **Кто выходит на мяч.** Я атакую игрока с мячом — остальные страхуют.\n' +
    '!!Сдвиг!!! :: **Центральный защитник.** Линия сдвигается к мячу лесенкой.\n' +
    '!!Пошли!!! :: **Кто отобрал или первым увидел.** Контратака: четверо вперёд.\n' +
    '!!Иду!!! :: **Латераль фланга отбора.** Я ухожу по флангу.\n' +
    '!!Стою!!! :: **Второй латераль.** Остаюсь третьим защитником.\n' +
    '!!Держим!!! :: **Игрок с мячом или вратарь.** Контратака не вышла — перестраиваемся в 3-3-1.\n' +
    '!!Меняемся!!! :: **Центральный защитник.** Мяч надолго ушёл на другой фланг — латерали меняются местами.\n' +
    '!!Домой!!! :: **Вратарь или центральный защитник.** Потеря — все бегом в 4-2-1.');

  add('text', 'По ситуации', 'Как меняем игру по ситуации', 'Модель та же — меняется высота блока, число атакующих и терпение в позиционной атаке.',
    'Ведём в счёте :: Блок на 5 метров ниже. В контратаке трое: полузащитник на подбор не идёт. В позиционной атаке больше держим мяч, чем рискуем.\n' +
    'Ничья :: Играем как обычно. Не раскрываемся ради гола — контратака сама даст момент.\n' +
    'Проигрываем :: Первая линия выше центра поля, выходим на мяч раньше. В позиционной атаке трое сзади стоят на центральной линии, «Меняемся!» не кричим — верхний латераль остаётся наверху.\n' +
    'Соперник бьёт длинными :: Защитники на пару метров глубже, вратарь страхует за спиной, полузащитники подбирают отскоки.\n' +
    'У соперника быстрые нападающие :: Трое сзади не поднимаются выше середины нашей половины. Латераль бежит только после чистого отбора.\n' +
    'Соперник не атакует и сам отдаёт мяч :: Больше позиционной атаки в 3-3-1, но правило «сзади трое» остаётся.\n' +
    'Устали латерали :: Меняем их первыми. В позиционной атаке реже «Меняемся!» — пусть один латераль отдыхает сзади.');

  add('text', 'Тренировка', 'Как отработать на тренировке', 'Шесть упражнений — от физики к игре. Первое делайте каждую тренировку.',
    '1. **Рывок после разворота** (10 минут). Старт спиной к направлению, разворот по сигналу и ускорение на 20–30 метров. 6–8 повторений с полным отдыхом. В первую очередь — латерали и нападающий.\n' +
    '2. **Маятник четверых** (10 минут). Четыре защитника против трёх атакующих, мяч гоняют с фланга на фланг. Один выходит на мяч — трое сдвигаются лесенкой. Тренер останавливает и проверяет линию.\n' +
    '3. **Блок против владения** (15 минут). Семь наших против восьми-девяти на половине поля. Соперник катает мяч, наши держат 4-2-1 и выходят только по сигналам. После отбора — пас в мини-ворота на центральной линии за 5 секунд.\n' +
    '4. **Контратака четверо против трёх** (15 минут). Отбор у нашей штрафной: латераль по флангу, полузащитник на ближнюю, нападающий на дальнюю, второй на подбор. Догоняющий стартует через 2 секунды, на удар — 10 секунд.\n' +
    '5. **Позиционная атака 3-3-1 против блока** (15 минут). Семеро против шестерых на половине поля. Гол засчитывается только после прострела с фланга или удара с подбора. Потеря — трое сзади задерживают контратаку в мини-ворота.\n' +
    '6. **Стоп-кадр в двусторонке.** По свистку все замирают. Сзади трое? В штрафной двое и один на краю? Латераль вернулся в блок?');

  add('text', 'Плюсы и риски', 'Честно: сильные стороны и риски', 'План рабочий, но у оборонительной игры есть цена. Лучше знать её до матча.',
    '## Что даёт такая игра\n' +
    '- **Мало моментов у соперника.** Семь человек перед штрафной, центр закрыт.\n' +
    '- **Играем на своей сильной стороне.** Скорость латералей и нападающего опаснее всего, когда впереди пустое поле.\n' +
    '- **Соперник открывается сам.** Атакуя, он поднимает защитников и оставляет зону за спиной.\n' +
    '- **Контролируемый риск.** В атаке четверо, но трое сзади на местах всегда.\n' +
    '- **Экономим силы.** Спринтуем по сигналу, а не весь матч.\n' +
    '||\n' +
    '## Риски и что с ними делать\n' +
    '- **Долго без мяча — давит на голову.** Договариваемся заранее: это наш план, а не оборона от безысходности.\n' +
    '- **Удары издалека и стандарты у наших ворот.** Не фолим у штрафной, закрываем удар, отрабатываем стандарты.\n' +
    '- **Латерали много спринтуют.** Меняем их чаще остальных.\n' +
    '- **Позиционная атака против плотного блока — трудно.** Не бьём из безнадёжных позиций, ищем фланг и подбор.\n' +
    '- **Пропустили первыми.** Одной обороной не отыграться — план на слайде «По ситуации».');

  add('text', 'Шпаргалка', 'Шпаргалка', 'Если запомнить только один экран — пусть будет этот.',
    '1. Без мяча — **4-2-1 у центра поля**. Центр закрыт, фланг — ловушка.\n' +
    '2. **Маятник**: латераль выходит на мяч, трое страхуют лесенкой, второй латераль — в центр.\n' +
    '3. На мяч выходим **по сигналу**: пас на фланг, приём спиной, плохой приём.\n' +
    '4. Отбор — !!Пошли!!! Первый пас — **вперёд**. С мячом мы в **3-3-1**.\n' +
    '5. Атакуют **четверо**: латераль по флангу, полузащитник на ближнюю, нападающий на дальнюю, второй полузащитник на подбор.\n' +
    '6. Стоят **трое**: два центральных и второй латераль. Всегда.\n' +
    '7. **10 секунд** на удар. Не вышло — !!Держим!!! и позиционная атака. Потеря — !!Домой!!!');

  return TE.normalizeProject(p);
}
