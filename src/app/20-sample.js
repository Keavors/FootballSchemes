
/* ---------- Пример «Маятник»: схемы в сжатой записи ----------
   Координаты в долях поля: x — поперёк (0 слева, 100 справа), y — вдоль
   (0 у ворот соперника, 100 у наших). Мы атакуем вверх, соперник — вниз.

   Наши: GK вратарь, LB/RB крайние защитники, LC/RC центральные защитники,
   LM/RM центральные полузащитники, ST нападающий.
   Соперник (3-3-1, по экрану слева направо): og вратарь, odl/odc/odr защитники,
   oml/omc/omr полузащитники, of нападающий.

   Кадр дописывает изменения к предыдущему; reset — начать расстановку заново. */
function fromCompact(scene) {
  const LBL = { GK: 'ВР', LB: 'ЛЗ', LC: 'ЛЦ', RC: 'ПЦ', RB: 'ПЗ', LM: 'ЛП', RM: 'ПП', ST: 'Н' };
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
  /* Средний блок 4-2-1: первая линия у центра поля, защитники в 16 метрах от ворот */
  const BLOCK = { GK: [50, 94], LB: [17, 70], LC: [38, 73], RC: [62, 73], RB: [83, 70], LM: [40, 59], RM: [60, 59], ST: [50, 46] };
  /* Блок качнулся к мячу слева / справа: дальний крайний подтянулся к центру */
  const SHIFT_L = { GK: [46, 94], LB: [13, 69], LC: [32, 73], RC: [53, 74], RB: [72, 72], LM: [33, 58], RM: [52, 59], ST: [40, 43] };
  const SHIFT_R = { GK: [54, 94], LB: [28, 72], LC: [47, 74], RC: [68, 73], RB: [87, 69], LM: [48, 59], RM: [67, 58], ST: [60, 43] };
  /* Ловушка у левой бровки: крайний вышел, трое сзади лесенкой */
  const TRAP_L = { GK: [42, 93], LB: [12, 52], LC: [25, 66], RC: [44, 72], RB: [62, 73], LM: [22, 45], RM: [42, 57], ST: [18, 34] };
  const TRAP_R = { GK: [58, 93], RB: [88, 52], RC: [75, 66], LC: [56, 72], LB: [38, 73], RM: [78, 45], LM: [58, 57], ST: [82, 34] };

  /* Соперник разыгрывает у себя: защитники у своей штрафной, нападающий у наших центральных */
  const BUILD = { og: [50, 5], odl: [22, 22], odc: [50, 18], odr: [78, 22], oml: [9, 40], omc: [50, 35], omr: [91, 40], of: [52, 70] };
  const BUILD_L = Object.assign({}, BUILD, { odl: [20, 24], omc: [46, 36], of: [44, 70] });
  const BUILD_R = Object.assign({}, BUILD, { odr: [80, 24], omc: [54, 36], of: [58, 70] });

  const OUR = ['LB', 'LC', 'RC', 'RB', 'LM', 'RM', 'ST'];
  const runs = list => list.map(id => ({ t: 'run', id }));
  const L421 = [{ t: 'link', ids: ['LB', 'LC', 'RC', 'RB'], label: '4' }, { t: 'link', ids: ['LM', 'RM'], label: '2' }, { t: 'link', ids: ['ST'], label: '1' }];
  const REST_L = [{ t: 'hull', ids: ['LB', 'LM', 'ST'], label: 'бегут трое', c: 'orange' }, { t: 'link', ids: ['LC', 'RC', 'RB'], label: '3' }, { t: 'ring', at: 'RM', r: 24, label: 'опорный', above: true }];
  const REST_R = [{ t: 'hull', ids: ['RB', 'RM', 'ST'], label: 'бегут трое', c: 'orange' }, { t: 'link', ids: ['LB', 'LC', 'RC'], label: '3' }, { t: 'ring', at: 'LM', r: 24, label: 'опорный', above: true }];

  const SC = {};

  /* Титул: весь план одной петлёй */
  SC.idea = {
    auto: true, loop: true,
    frames: [
      { reset: true, pos: BLOCK, opp: BUILD, ball: 'odc', zones: L421, cap: 'Без мяча — компактный **4-2-1** у центра поля. Мяч у соперника на его половине — пусть.', hold: 2600 },
      { pos: SHIFT_L, opp: BUILD_L, ball: 'odl', arrows: [{ t: 'opass', from: 'odc', to: 'odl' }], zones: [{ t: 'hull', ids: OUR, label: 'качнулись к мячу' }], cap: 'Мяч ушёл в сторону — весь блок качнулся за ним, как маятник.', hold: 2400 },
      { pos: TRAP_L, opp: { oml: [8, 44], omc: [42, 38], of: [40, 68] }, ball: 'oml', hl: ['LB'], arrows: [{ t: 'opass', from: 'odl', to: 'oml' }].concat(runs(['LB', 'LM', 'ST'])), bubbles: [{ id: 'LB', text: 'Мой!', c: 'white' }], cap: 'Пас на фланг — сигнал. **ЛЗ** выходит, **ЛП** и **Н** закрывают пасы внутрь и назад.', hold: 2800 },
      { pos: { LB: [11, 46] }, opp: { oml: [6, 51] }, ball: 'LB', dim: ['oml'], bubbles: [{ id: 'LB', text: 'Пошли!' }], cap: 'Зажали у бровки — отбор!', hold: 1600 },
      {
        pos: { LM: [24, 40], LB: [10, 26], ST: [32, 20], RM: [44, 56], LC: [30, 68], RC: [48, 71], RB: [64, 71] },
        opp: { odl: [22, 32], omc: [40, 44], of: [42, 66], odc: [44, 20], odr: [66, 24] },
        ord: { LB: 2, ST: 2, RM: 2, LC: 2, RC: 2, RB: 2, odl: 2 }, ball: 'LM', dim: [],
        arrows: [{ t: 'pass', from: [11, 46], to: 'LM' }, { t: 'run', id: 'LB', o: 2 }, { t: 'run', id: 'ST', o: 2 }], zones: REST_L,
        cap: 'Пас внутрь — и трое убегают: **ЛЗ-маятник**, **ЛП** и **Н**. Четверо страхуют.', hold: 2600, dur: 1200
      },
      {
        pos: { LB: [12, 14], ST: [44, 12], LM: [34, 22] }, opp: { odl: [16, 22], odc: [40, 18] }, ord: { LM: 2 }, ball: 'LB',
        arrows: [{ t: 'pass', from: 'LM', to: 'LB' }, { t: 'run', id: 'ST' }, { t: 'run', id: 'LM', o: 2 }], zones: REST_L,
        cap: 'Пас на ход за спину защитника — и прострел на **Н**. От отбора до удара — 8 секунд.', hold: 2400, dur: 1300
      },
      { reset: true, pos: BLOCK, opp: BUILD, ball: 'odc', arrows: [{ t: 'run', id: 'LB', hot: true }, { t: 'run', id: 'ST' }, { t: 'run', id: 'LM' }], zones: L421, cap: 'Не забили — все бегом домой. Маятник качнулся обратно: снова **4-2-1**.', hold: 2600, dur: 1400 }
    ]
  };

  /* Роли: расстановка без движения */
  SC.roles = { still: true, frames: [{ pos: BLOCK, zones: L421 }] };

  /* Без мяча: средний блок качается за мячом */
  SC.block = {
    auto: true,
    frames: [
      { reset: true, pos: BLOCK, opp: BUILD, ball: 'odc', zones: [{ t: 'rect', x: 4, y: 2, w: 92, h: 30, label: 'здесь мяч отдаём', lb: true }, { t: 'hull', ids: OUR, label: 'компактно' }], cap: 'Соперник катает мяч у себя. Мы не бежим к нему — стоим блоком у центра поля.', hold: 2600 },
      { pos: SHIFT_L, opp: BUILD_L, ball: 'odl', arrows: [{ t: 'opass', from: 'odc', to: 'odl' }], zones: [{ t: 'hull', ids: OUR, label: '' }], cap: 'Мяч влево — сдвинулись все семеро. **Н** встал между мячом и центром, **ПЗ** подтянулся к центральным.', hold: 2600 },
      { pos: SHIFT_R, opp: BUILD_R, ball: 'odr', arrows: [{ t: 'opass', from: 'odl', to: 'odr', bend: -22 }], zones: [{ t: 'hull', ids: OUR, label: '' }], cap: 'Перевод на другой фланг — блок качнулся вправо. Теперь к центру подтягивается **ЛЗ**.', hold: 2600, dur: 1400 },
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
        cap: '**ЛЗ** выходит на игрока с мячом. **ЛЦ** встаёт у него за спиной, **ПЦ** и **ПЗ** сдвигаются лесенкой — маятник качнулся.', hold: 3400
      },
      { reset: true, pos: SHIFT_R, opp: BUILD_R, ball: 'odr', zones: [{ t: 'link', ids: ['LB', 'LC', 'RC', 'RB'], label: 'линия из четырёх' }], cap: 'Мяч справа — всё то же зеркально.', hold: 1800 },
      {
        pos: TRAP_R, opp: { omr: [92, 44], omc: [58, 38], of: [60, 68] }, ball: 'omr', hl: ['RB'], ord: { RC: 2, LC: 2, LB: 2, GK: 2 },
        arrows: [{ t: 'opass', from: 'odr', to: 'omr' }, { t: 'run', id: 'RB' }, { t: 'run', id: 'RC', o: 2 }, { t: 'run', id: 'LC', o: 2 }, { t: 'run', id: 'LB', o: 2 }],
        zones: [{ t: 'link', ids: ['RB', 'RC', 'LC', 'LB'], label: 'лесенка', c: 'orange' }], bubbles: [{ id: 'RB', text: 'Мой!', c: 'white' }, { id: 'RC', text: 'Сдвиг!', c: 'white', below: true }],
        cap: '**ПЗ** выходит, **ПЦ** страхует, **ЛЦ** и **ЛЗ** подтягиваются к центру. Один атакует — трое за ним наискосок.', hold: 3400
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
        quiz: { q: 'Сейчас мяч уйдёт на фланг. Кто выходит на игрока с мячом и что закрывают остальные?', a: '**ЛЗ** выходит на мяч, **ЛП** закрывает пас внутрь, **Н** — пас назад, **ЛЦ** страхует за спиной.' },
        pos: TRAP_L, opp: { oml: [8, 44], omc: [42, 38], of: [40, 68] }, ball: 'oml', focus: ['LB'],
        arrows: [{ t: 'opass', from: 'odl', to: 'oml' }].concat(runs(['LB', 'LM', 'ST', 'LC']), [{ t: 'closed', from: 'oml', to: 'omc', o: 2 }, { t: 'closed', from: 'oml', to: 'odl', o: 2 }]),
        zones: [{ t: 'rect', x: 1, y: 30, w: 34, h: 30, label: 'ловушка у бровки', lb: true, c: 'orange' }], bubbles: [{ id: 'LB', text: 'Мой!', c: 'white' }],
        cap: 'Пас на фланг — сигнал. Бровка играет за нас: **ЛЗ** выходит, **ЛП** и **Н** закрывают пасы внутрь и назад.', hold: 3200
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

  /* Кто бежит, кто стоит */
  SC.rule = {
    auto: true,
    chapters: [{ name: 'Отбор слева', from: 0, to: 1 }, { name: 'Отбор справа', from: 2, to: 3 }, { name: 'Отбор в центре', from: 4, to: 6 }],
    frames: [
      {
        reset: true, pos: Object.assign({}, TRAP_L, { LB: [11, 46] }), opp: Object.assign({}, BUILD_L, { oml: [6, 51], odl: [22, 26], omc: [42, 38], of: [40, 68] }),
        ball: 'LB', dim: ['oml'], focus: ['LB'], zones: [{ t: 'rect', x: 1, y: 2, w: 33, h: 96, label: 'левый фланг' }], cap: 'Мяч отобрали на **левом** фланге.', hold: 1600
      },
      {
        quiz: { q: 'Отобрали слева. Кто бежит в контратаку, а кто остаётся?', a: 'Бегут **ЛЗ**, **ЛП** и **Н**. Стоят **ПЗ**, **ЛЦ**, **ПЦ** и **ПП** — опорный.' },
        pos: { LB: [10, 30], LM: [28, 34], ST: [34, 18], RM: [44, 56], LC: [30, 68], RC: [48, 71], RB: [64, 71], GK: [44, 92] },
        opp: { odl: [18, 32], omc: [40, 44], oml: [8, 46], of: [42, 66] }, hl: ['LB'], dim: [], ball: 'LB',
        arrows: runs(['LB', 'LM', 'ST', 'RM', 'LC', 'RC', 'RB']), zones: REST_L, bubbles: [{ id: 'LB', text: 'Иду!' }, { id: 'RB', text: 'Стою!', c: 'white', below: true }],
        cap: 'Бегут **ЛЗ-маятник**, **ЛП** и **Н**. **ПЗ** стал третьим защитником, **ПП** — опорный.', hold: 3400, dur: 1300
      },
      {
        reset: true, pos: Object.assign({}, TRAP_R, { RB: [89, 46] }), opp: Object.assign({}, BUILD_R, { omr: [94, 51], odr: [78, 26], omc: [58, 38], of: [60, 68] }),
        ball: 'RB', dim: ['omr'], focus: ['RB'], zones: [{ t: 'rect', x: 66, y: 2, w: 33, h: 96, label: 'правый фланг' }], cap: 'Отобрали на **правом** фланге.', hold: 1600
      },
      {
        pos: { RB: [90, 30], RM: [72, 34], ST: [66, 18], LM: [56, 56], RC: [70, 68], LC: [52, 71], LB: [36, 71], GK: [56, 92] },
        opp: { odr: [82, 32], omc: [60, 44], omr: [92, 46], of: [58, 66] }, hl: ['RB'], dim: [], ball: 'RB',
        arrows: runs(['RB', 'RM', 'ST', 'LM', 'RC', 'LC', 'LB']), zones: REST_R, bubbles: [{ id: 'RB', text: 'Иду!' }, { id: 'LB', text: 'Стою!', c: 'white', below: true }],
        cap: 'Зеркально: бегут **ПЗ**, **ПП** и **Н**. Стоят **ЛЗ**, оба центральных и **ЛП**.', hold: 3400, dur: 1300
      },
      {
        reset: true, pos: Object.assign({}, BLOCK, { LM: [46, 60] }), opp: Object.assign({}, BUILD, { omc: [48, 50], of: [54, 70] }),
        ball: 'LM', dim: ['omc'], focus: ['LM'], zones: [{ t: 'rect', x: 34, y: 2, w: 32, h: 96, label: 'центр' }], cap: 'Перехват в **центре**. Кто бежит — решает первый пас.', hold: 1800
      },
      {
        pos: { RB: [86, 62] }, ball: 'RB', hl: ['RB'], dim: [], focus: [],
        arrows: [{ t: 'run', id: 'RB' }, { t: 'pass', from: 'LM', to: 'RB' }],
        cap: 'Первый пас ушёл **вправо** — значит, маятник сейчас **ПЗ**.', hold: 2000
      },
      {
        pos: { RB: [88, 40], RM: [68, 40], ST: [62, 22], LM: [50, 58], LC: [40, 70], RC: [58, 71], LB: [26, 70], GK: [50, 93] },
        opp: { omr: [86, 48], odr: [76, 30], omc: [50, 54], of: [54, 68] }, ball: 'RB',
        arrows: runs(['RB', 'RM', 'ST', 'LM', 'LC', 'RC', 'LB']), zones: REST_R, bubbles: [{ id: 'RB', text: 'Иду!' }, { id: 'LB', text: 'Стою!', c: 'white', below: true }],
        cap: 'Бегут **ПЗ**, **ПП** и **Н**. **ЛЗ** остаётся, **ЛП** — опорный. Сомневаешься — стой.', hold: 3200, dur: 1300
      }
    ]
  };

  /* Главная контратака: соперник атакует у наших ворот и раскрыт */
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
        pos: { RB: [88, 52], ST: [60, 42] }, opp: { odr: [72, 50], omc: [60, 64], omr: [88, 72] }, ord: { ST: 2 }, ball: 'RM', hl: ['RB'],
        arrows: [{ t: 'pass', from: [66, 58], to: 'RM' }, { t: 'run', id: 'RB' }, { t: 'run', id: 'ST', o: 2 }],
        bubbles: [{ id: 'RB', text: 'Иду!' }],
        cap: '**Н** не разворачивается — скидка набегающему **ПП**. **ПЗ** уже летит по флангу.', hold: 2200
      },
      {
        pos: { RB: [88, 28], ST: [56, 22], RM: [66, 40], LB: [32, 74], LC: [48, 76], RC: [64, 75], LM: [52, 62], GK: [54, 93] },
        opp: { odr: [80, 36], odc: [54, 30], odl: [38, 32], omc: [60, 54], of: [56, 76], oml: [28, 62], omr: [86, 62] },
        ord: { RM: 2 }, ball: 'RB',
        arrows: [{ t: 'pass', from: 'RM', to: 'RB' }, { t: 'run', id: 'RB' }, { t: 'run', id: 'ST' }, { t: 'run', id: 'RM', o: 2 }],
        zones: [{ t: 'link', ids: ['LB', 'LC', 'RC'], label: '3' }, { t: 'ring', at: 'LM', r: 24, label: 'опорный', above: true }],
        cap: 'Пас на ход за спину — в свободную зону, а не в ноги. Сзади четверо наших на двоих.', hold: 2600, dur: 1300
      },
      {
        pos: { RB: [88, 20], ST: [52, 14], RM: [62, 24] }, opp: { odc: [47, 19], odr: [84, 26], og: [52, 6] }, ord: { RB: 1 }, ball: 'ST',
        arrows: [{ t: 'run', id: 'RB' }, { t: 'pass', from: 'RB', to: 'ST', o: 2 }, { t: 'run', id: 'RM' }],
        cap: 'Прострел низом на **Н**, **ПП** — на добивание.', hold: 2000
      },
      { ball: [42, -1], arrows: [{ t: 'shot', from: 'ST', to: [42, 0] }], zones: [], cap: 'Удар. От отбора до удара — 7–8 секунд.', hold: 2400 }
    ]
  };

  /* Два способа контратаки */
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
        pos: { ST: [44, 26], LM: [36, 48], LB: [14, 54], RM: [54, 66] }, opp: { odc: [46, 34], odl: [34, 40], odr: [66, 40], omc: [46, 57] }, ord: { LM: 2, LB: 2, RM: 2 },
        ball: 'ST', hl: ['LB'], focus: [],
        arrows: [{ t: 'pass', from: 'LC', to: 'ST', lob: true, bend: -18 }, { t: 'run', id: 'ST' }, { t: 'run', id: 'LM', o: 2 }, { t: 'run', id: 'LB', o: 2 }],
        bubbles: [{ id: 'LC', text: 'Пошли!', below: true }],
        cap: '…и сразу длинный за спину на ход **Н**. Мяч ушёл влево — догоняют **ЛП** и **ЛЗ**.', hold: 2400, dur: 1300
      },
      { pos: { ST: [44, 14], LM: [38, 28], LB: [14, 32] }, opp: { odc: [48, 20], og: [46, 8] }, ball: 'ST', arrows: runs(['ST', 'LM', 'LB']), cap: '**Н** один на один, **ЛП** и **ЛЗ** догоняют на добивание.', hold: 1800 },
      { ball: [36, -1], arrows: [{ t: 'shot', from: 'ST', to: [36, 0] }], cap: 'Удар в дальний угол.', hold: 2200 },
      {
        reset: true, pos: Object.assign({}, TRAP_L, { LB: [11, 46] }), opp: Object.assign({}, BUILD_L, { oml: [6, 51], odl: [22, 26], omc: [42, 38], of: [40, 68] }),
        ball: 'LB', dim: ['oml'], cap: 'Отобрали высоко у бровки — соперник ещё не успел перестроиться.', hold: 1800
      },
      {
        pos: { LM: [24, 40], LB: [10, 26], ST: [32, 20], RM: [44, 56], LC: [30, 68], RC: [48, 71], RB: [64, 71] }, opp: { odl: [22, 32], omc: [40, 44], of: [42, 66] },
        ord: { LB: 2, ST: 2, odl: 2 }, ball: 'LM', hl: ['LB'], dim: [],
        arrows: [{ t: 'pass', from: [11, 46], to: 'LM' }, { t: 'run', id: 'LB', o: 2 }, { t: 'run', id: 'ST', o: 2 }, { t: 'orun', id: 'odl', o: 2 }],
        cap: 'Пас внутрь **ЛП** — и **ЛЗ** сразу уходит вперёд по бровке.', hold: 2200
      },
      {
        pos: { LB: [12, 14], ST: [44, 12] }, opp: { odl: [16, 22], odc: [40, 18] }, ball: 'LB',
        arrows: [{ t: 'pass', from: 'LM', to: 'LB' }, { t: 'run', id: 'LB' }, { t: 'run', id: 'ST' }],
        cap: 'Защитник вышел на **ЛП** — за его спиной свободно. Пас на ход **ЛЗ**.', hold: 2200
      },
      {
        pos: { LB: [14, 8], ST: [46, 10], LM: [34, 20] }, ord: { LM: 1 }, ball: 'ST',
        arrows: [{ t: 'run', id: 'LB' }, { t: 'pass', from: 'LB', to: 'ST', o: 2 }, { t: 'run', id: 'LM' }],
        cap: 'Прострел на **Н**, **ЛП** — на подборе. Всё за 6–7 секунд.', hold: 2000
      },
      { ball: [56, -1], arrows: [{ t: 'shot', from: 'ST', to: [56, 0] }], cap: 'Удар.', hold: 2200 }
    ]
  };

  /* Страховка: пока трое бегут, сзади четверо */
  SC.rest = {
    auto: true,
    frames: [
      {
        reset: true, pos: { GK: [54, 93], LB: [32, 74], LC: [48, 76], RC: [64, 75], RB: [88, 28], LM: [52, 62], RM: [66, 40], ST: [56, 22] },
        opp: { og: [50, 6], odl: [38, 32], odc: [54, 30], odr: [80, 36], oml: [28, 62], omc: [60, 54], omr: [86, 62], of: [56, 76] },
        ball: 'RB', hl: ['RB'], zones: [{ t: 'hull', ids: ['RB', 'RM', 'ST'], label: 'атакуют трое', c: 'orange' }],
        cap: 'Контратака идёт втроём. А что у нас сзади?', hold: 2000
      },
      {
        zones: [{ t: 'rect', x: 16, y: 56, w: 68, h: 26, label: 'четверо на двоих', lb: true }, { t: 'ring', at: 'of', r: 22, c: 'red' }, { t: 'ring', at: 'oml', r: 22, c: 'red' }],
        cap: 'Сзади четверо на двоих: три защитника в линию в середине нашей половины, **ЛП** — опорный перед ними.', hold: 3000
      },
      {
        pos: { LC: [46, 73], RC: [62, 72], LM: [54, 66], ST: [58, 20] }, opp: { odc: [50, 26], of: [54, 72] }, ball: 'of', zones: [],
        arrows: [{ t: 'opass', from: [50, 26], to: 'of', lob: true }, { t: 'run', id: 'LC' }, { t: 'run', id: 'LM' }],
        cap: 'Потеряли — и соперник сразу бьёт длинно на своего нападающего. А рядом с ним уже трое наших.', hold: 2600, dur: 1300
      },
      { pos: { RC: [60, 71] }, opp: { of: [54, 75] }, ball: 'RC', dim: ['of'], focus: ['RC'], bubbles: [{ id: 'RC', text: 'Мой!', c: 'white', below: true }], cap: 'Отбор — и можно снова «Пошли!». Контратака рискует тремя, а не всей командой.', hold: 2400 },
      {
        reset: true, pos: { GK: [50, 93], LB: [26, 74], LC: [44, 78], RC: [62, 78], RB: [86, 40], LM: [42, 66], RM: [60, 66], ST: [58, 30] },
        opp: { og: [50, 6], odl: [30, 34], odc: [50, 30], odr: [70, 34], oml: [22, 62], omc: [50, 54], omr: [80, 62], of: [54, 82] },
        ball: 'RB', hl: ['RB'],
        zones: [{ t: 'ring', at: 'oml', r: 20, c: 'red' }, { t: 'ring', at: 'omr', r: 20, c: 'red' }, { t: 'ring', at: 'of', r: 20, c: 'red' }, { t: 'hull', ids: ['RB', 'ST'], label: 'вдвоём', c: 'orange' }, { t: 'link', ids: ['LM', 'RM'], label: 'оба стоят' }],
        cap: 'У соперника впереди остались трое? Тогда **оба** полузащитника стоят — атакуем вдвоём.', hold: 3200
      }
    ]
  };

  /* Если не вышло: «Держим!» или «Домой!» */
  SC.after = {
    auto: true,
    chapters: [{ name: 'Держим!', from: 0, to: 2 }, { name: 'Потеряли — Домой!', from: 3, to: 6 }],
    frames: [
      {
        reset: true, pos: { GK: [50, 92], LB: [30, 68], LC: [46, 70], RC: [64, 68], RB: [88, 30], LM: [50, 56], RM: [62, 36], ST: [48, 20] },
        opp: { og: [50, 5], odl: [34, 20], odc: [54, 15], odr: [74, 22], oml: [36, 34], omc: [56, 30], omr: [80, 36], of: [52, 62] },
        ball: 'RB', hl: ['RB'], cap: 'Соперник успел вернуться: впереди трое наших против шестерых. Свободного паса нет.', hold: 2200
      },
      {
        pos: { RM: [64, 42], ST: [46, 26], LB: [30, 56], LC: [44, 58], RC: [64, 56], LM: [48, 48] }, ord: { LB: 2, LC: 2, RC: 2, LM: 2 }, ball: 'RM',
        arrows: [{ t: 'pass', from: 'RB', to: 'RM' }, { t: 'run', id: 'LC', o: 2 }, { t: 'run', id: 'RC', o: 2 }, { t: 'run', id: 'LB', o: 2 }],
        bubbles: [{ id: 'RB', text: 'Держим!', below: true }],
        zones: [{ t: 'link', ids: ['LB', 'LC', 'RC'], label: '3' }, { t: 'link', ids: ['LM', 'RM', 'RB'], label: '3' }, { t: 'link', ids: ['ST'], label: '1' }],
        cap: '«Держим!» Не бьём с плохой позиции: пас назад, владеем в **3-3-1**, вся команда подтягивается к центру поля.', hold: 3000
      },
      {
        pos: { LM: [44, 46] }, opp: { omc: [52, 34], oml: [40, 36], of: [56, 68] }, ball: 'LM',
        arrows: [{ t: 'pass', from: 'RM', to: 'LM' }],
        zones: [{ t: 'link', ids: ['LB', 'LC', 'RC'], label: '3' }, { t: 'link', ids: ['LM', 'RM', 'RB'], label: '3' }, { t: 'link', ids: ['ST'], label: '1' }],
        cap: 'Ждём, пока соперник раскроется. Появился пас за спину — снова «Пошли!».', hold: 2400
      },
      {
        reset: true, pos: { GK: [50, 90], LB: [28, 64], LC: [46, 68], RC: [64, 66], RB: [88, 24], LM: [48, 54], RM: [62, 32], ST: [50, 18] },
        opp: { og: [50, 4], odl: [32, 14], odc: [52, 11], odr: [74, 14], oml: [30, 30], omc: [55, 26], omr: [80, 30], of: [42, 60] },
        ball: 'omc', hl: ['RB'], zones: [{ t: 'ring', at: 'omc', r: 26, c: 'red', label: 'потеря' }], cap: 'Потеряли мяч у чужой штрафной.', hold: 1800
      },
      {
        pos: { RM: [60, 38], ST: [48, 30], RB: [86, 40], LM: [50, 62], LB: [24, 70], LC: [42, 74], RC: [62, 72] }, opp: { omc: [55, 31], of: [42, 62], omr: [78, 44] },
        ball: 'omc', focus: ['RM'], zones: [],
        arrows: [{ t: 'run', id: 'RM' }, { t: 'run', id: 'RB', hot: true }, { t: 'run', id: 'ST' }, { t: 'run', id: 'LM' }, { t: 'run', id: 'LC' }, { t: 'run', id: 'RC' }, { t: 'run', id: 'LB' }],
        bubbles: [{ id: 'RM', text: 'Мой!', c: 'white' }, { id: 'LC', text: 'Домой!', c: 'white', below: true }],
        cap: 'Ближний — **ПП** — задерживает: не лезет в подкат, а мешает отдать вперёд. Остальные — «Домой!»', hold: 2800
      },
      {
        pos: { RB: [86, 58], RC: [72, 72], LC: [54, 76], LB: [36, 76], LM: [50, 64], RM: [60, 48], ST: [50, 40] }, opp: { omr: [86, 52], of: [44, 68], omc: [56, 36] },
        ord: { RB: 1 }, ball: 'omr', focus: [],
        arrows: [{ t: 'opass', from: 'omc', to: 'omr' }, { t: 'run', id: 'RB', hot: true }, { t: 'run', id: 'RC' }, { t: 'run', id: 'LC' }, { t: 'run', id: 'LB' }],
        zones: [{ t: 'ring', at: 'LM', r: 24, label: 'закрыл центр', above: true }],
        cap: 'Соперник ищет фланг, откуда ушёл маятник. **ПЗ** бежит назад на максимальной скорости, **ПЦ** сдвигается к бровке, **ЛП** закрывает центр.', hold: 3000, dur: 1300
      },
      {
        pos: { GK: [56, 93], LB: [34, 76], LC: [50, 78], RC: [68, 77], RB: [86, 71], LM: [54, 64], RM: [70, 63], ST: [62, 50] }, opp: { omr: [88, 62], of: [48, 72] },
        ball: 'omr', hl: [], arrows: runs(['RB', 'RM', 'ST']), zones: [{ t: 'hull', ids: OUR, label: 'снова блок' }],
        cap: 'Через 5–6 секунд после потери мы снова в блоке **4-2-1** — и снова ждём сигнала.', hold: 2800
      }
    ]
  };

  /* Ошибки: у соперника всё логично — наказывает за каждую */
  SC.mistakes = {
    auto: false,
    chapters: [{ name: 'Бегут все', from: 0, to: 0 }, { name: 'Ушли оба крайних', from: 1, to: 1 }, { name: 'Блок в штрафной', from: 2, to: 2 }, { name: 'Одиночный прессинг', from: 3, to: 5 }],
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
        cap: 'Ушли **оба** крайних. Фланговые соперника остались высоко — и бегут в пустые зоны до самых ворот.', hold: 2000
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
    'Играем от обороны. Сопернику отдаём мяч на его половине, стоим компактным блоком и качаемся за мячом, как маятник. Отобрали — трое убегают в быструю контратаку, пока соперник раскрыт.\n\n' +
    '- **Без мяча — 4-2-1 у центра поля.** Семеро двигаются вместе, центр закрыт.\n' +
    '- **Маятник.** Крайний защитник со стороны мяча выходит, остальные страхуют лесенкой.\n' +
    '- **Отбор — «Пошли!»** Бегут трое: крайний фланга отбора, ближний полузащитник и нападающий.\n' +
    '- **Сзади всегда четверо.** Два центральных, дальний крайний и опорный.', SC.idea);

  add('text', 'Как мы играем', 'Как мы играем', 'Четыре фазы. Большую часть матча мяч у соперника — это не беда, а наш план.',
    '1. **Оборона.** Компактный блок 4-2-1 у центра поля. Сопернику отдаём мяч у его ворот, но не пускаем в центр и за спину.\n' +
    '2. **Маятник и ловушка.** Мяч на фланге — крайний выходит, трое страхуют лесенкой, полузащитник и нападающий закрывают пасы. Зажали — отбор.\n' +
    '3. **Контратака до 10 секунд.** Первый пас вперёд, трое бегут на ускорении, четверо страхуют.\n' +
    '4. **Возврат.** Не забили — «Держим!» и спокойно владеем. Потеряли — «Домой!», через 5–6 секунд снова в блоке.\n\n' +
    '> Наша сила — не владение, а скорость. Соперник, который атакует, сам поднимает защитников и оставляет за спиной пустое поле.');

  add('roles', 'Кто есть кто', 'Кто есть кто и что от кого требуется', 'Нажмите на позицию — на схеме подсветятся её игроки.',
    'Буквы на фишках одинаковые на всех схемах: **ВР** вратарь, **ЛЗ** и **ПЗ** крайние защитники, **ЛЦ** и **ПЦ** центральные защитники, **ЛП** и **ПП** центральные полузащитники, **Н** нападающий.',
    SC.roles, {
      roles: [
        {
          title: 'Вратарь', ids: ['GK'],
          body: '**Без мяча**\n- Командует блоком: «Сдвиг!», «Мой!», «Домой!» — он видит всё поле.\n- Стоит высоко и забирает пробросы за спину защитников.\n- Мяч на фланге — смещается к ближней штанге.\n\n' +
            '**С мячом**\n- Поймал — сразу ищет свободного: рукой на крайнего или ногой за спину их защитникам.\n- Соперник успел вернуться — «Держим!» и спокойный пас центральному.\n\n' +
            '**Что нужно:** голос, игра на выходах, быстрый и точный ввод мяча.'
        },
        {
          title: 'Центральные защитники', ids: ['LC', 'RC'],
          body: '**Без мяча**\n- Держат линию в 16 метрах от ворот — перед штрафной, а не в ней.\n- Крайний вышел на мяч — ближний центральный встаёт у него за спиной наискосок и кричит «Сдвиг!».\n- Из линии выходят только на приём спиной к воротам — второй тут же страхует.\n\n' +
            '**После отбора**\n- Первый пас — вперёд, в одно-два касания, без обводки.\n- В атаку не уходят никогда: это двое из четырёх страхующих.\n\n' +
            '**Что нужно:** единоборства и игра головой, терпение, короткий точный пас.'
        },
        {
          title: 'Крайние защитники — маятники', ids: ['LB', 'RB'],
          body: '**Без мяча**\n- Мяч на твоём фланге — выходишь на игрока с мячом и прижимаешь его к бровке.\n- Мяч на другом фланге — подтягиваешься к центру и становишься третьим центральным.\n\n' +
            '**После отбора**\n- Отобрали на твоём фланге или первый пас ушёл к тебе — рывок вперёд по бровке и «Иду!».\n- Отобрали на другом — остаёшься и кричишь «Стою!».\n- Потеря — назад на максимальной скорости: твой фланг открыт.\n\n' +
            '**Что нужно:** ускорение и выносливость, оборона один в один, передача на ходу.'
        },
        {
          title: 'Центральные полузащитники', ids: ['LM', 'RM'],
          body: '**Без мяча**\n- Закрывают центр: между вами и защитниками не больше 8 метров.\n- Крайний вышел на мяч — ближний полузащитник закрывает пас внутрь.\n- Приём спиной к нашим воротам — зажимаете соперника с боков.\n\n' +
            '**После отбора**\n- Ближний к мячу первым предлагает себя, отдаёт вперёд в одно касание и бежит третьим.\n- Дальний — опорный: встаёт перед защитниками и никуда не уходит.\n- У соперника впереди трое — стоите оба.\n\n' +
            '**Что нужно:** перехваты и подбор, игра в одно касание, понимание, когда бежать, а когда стоять.'
        },
        {
          title: 'Нападающий', ids: ['ST'],
          body: '**Без мяча**\n- Первый защитник: встаёт между мячом и центром и направляет соперника на фланг.\n- Мяч ушёл на фланг — закрывает пас назад, ловушка захлопывается.\n- Один на защитников не бежит никогда.\n\n' +
            '**После отбора**\n- Показывается под первый пас или сразу уходит за спину защитникам.\n- Держит мяч спиной к воротам и скидывает набегающему полузащитнику.\n- Во время прострела — в штрафной, у ближней или дальней штанги.\n\n' +
            '**Что нужно:** рывок, игра спиной к воротам, хладнокровие: моментов будет немного.'
        }
      ]
    });

  add('split', 'Без мяча: блок', 'Без мяча: отдаём мяч, не отдаём пространство', 'Соперник может катать мяч сколько угодно. Опасны только пас в центр и пас за спину.',
    '- **Семеро — одно целое.** От нападающего до защитников около 16 метров, между линиями — не больше 8.\n' +
    '- **Первая линия — у центра поля.** Их защитникам мяч отдаём, дальше в центр не пускаем.\n' +
    '- **Весь блок качается за мячом.** Мяч ушёл в сторону — сдвинулись все семеро, дальний крайний подтянулся к центру.\n' +
    '- **Центр закрыт всегда.** Пусть играют по флангу — там у нас ловушка.\n' +
    '- **Никто не выходит без сигнала.** Одиночный прессинг только открывает дыру за спиной.', SC.block);

  add('split', 'Принцип маятника', 'Принцип маятника', 'Один атакует мяч — трое страхуют наискосок. Мяч ушёл на другой фланг — всё качнулось обратно.',
    '- **Крайний со стороны мяча выходит** на игрока с мячом и прижимает его к бровке.\n' +
    '- **Ближний центральный встаёт у него за спиной**, остальные сдвигаются лесенкой.\n' +
    '- **Дальний крайний подтягивается к центру** и становится третьим центральным.\n' +
    '- **Мяч переведён — маятник качнулся обратно.** Вышедший возвращается в линию, выходит крайний другого фланга.\n' +
    '- **Голос:** !!Мой!!! — кто вышел, !!Сдвиг!!! — центральный защитник.\n\n' +
    '> Тот же принцип решает контратаку: крайний, который вышел на мяч и отобрал, уже выше всех — он и бежит вперёд.', SC.pendulum);

  add('split', 'Ловушки', 'Ловушки: где мы отбираем мяч', 'Выходим на мяч только по сигналу — и сразу вдвоём-втроём.',
    '- **Пас на фланг.** Бровка — наш лишний защитник. Крайний выходит, ближний полузащитник закрывает пас внутрь, нападающий — пас назад, центральный страхует.\n' +
    '- **Приём спиной к нашим воротам.** Центральный защитник выходит сзади и не даёт развернуться, полузащитники зажимают с боков, второй центральный страхует.\n' +
    '- **Плохой приём, отскок, мяч в воздухе.** Ближайший атакует сразу, без команды.\n\n' +
    '> Выходим только вдвоём-втроём. Один — это не прессинг, а дыра за спиной.', SC.trap);

  add('split', 'Кто бежит', 'Кто бежит в контратаку, а кто стоит', 'На поле некогда думать, поэтому решает один признак — где отобрали мяч.',
    'Отобрали слева :: бегут **ЛЗ, ЛП и Н** — стоят ПЗ, ЛЦ, ПЦ и ПП\n' +
    'Отобрали справа :: бегут **ПЗ, ПП и Н** — стоят ЛЗ, ЛЦ, ПЦ и ЛП\n' +
    'Отобрали в центре :: решает **первый пас**: ушёл вправо — бегут правые, влево — левые\n\n' +
    '- **Трое бегут — четверо стоят.** Оба центральных, дальний крайний и опорный никуда не уходят.\n' +
    '- **Голос обязателен.** Кто отобрал — !!Пошли!!!, маятник — !!Иду!!!, дальний крайний — !!Стою!!!\n' +
    '- **Сомневаешься — стой.** Лучше атаковать вдвоём, чем пропустить в пустую зону.', SC.rule);

  add('split', 'Контратака', 'Контратака — по шагам', 'Соперник атаковал и раскрылся. У нас 8–10 секунд, пока он не вернулся.',
    '1. **Отбор и «Пошли!»** Кто отобрал или первым увидел — кричит.\n' +
    '2. **Первый пас — вперёд, в одно касание.** Нападающий показался — пас в ноги. Не назад и не поперёк.\n' +
    '3. **Скидка набегающему полузащитнику.** Нападающий не разворачивается, а закрывает мяч корпусом.\n' +
    '4. **Пас на ход маятнику за спину** — в свободную зону, а не в ноги.\n' +
    '5. **Прострел низом.** Нападающий в штрафной, полузащитник на добивании.\n' +
    '6. **Удар за 10 секунд.** Не получилось — !!Держим!!!\n\n' +
    '> Соперник, который атакует, сам поднимает защитников — поле за их спиной наше.', SC.counter);

  add('split', 'Два способа', 'Ещё два способа контратаки', 'Моментов за игру будет немного, поэтому комбинации должны быть отработаны.',
    '## Длинный за спину\n' +
    'Соперник атакует через центр и держит защитников у центральной линии. Перехватили — сразу длинный на ход нападающему. Догоняют ближний полузащитник и крайний той стороны, куда ушёл мяч.\n' +
    '## После ловушки у бровки\n' +
    'Отобрали высоко — соперник не успел перестроиться. Пас внутрь полузащитнику, крайний уходит вперёд по бровке, пас на ход ему за спину защитника — и прострел.\n\n' +
    '> Бегущий без мяча быстрее любого дриблинга. Мяч должен бежать впереди.', SC.variants);

  add('split', 'Страховка', 'Пока бежим вперёд — сзади четверо', 'Контратака рискует тремя игроками, а не всей командой.',
    '- **Три защитника в линию и опорный перед ними.** Даже когда очень хочется в атаку.\n' +
    '- **Линия — в середине нашей половины**, а не у штрафной: так успеваем и к длинному пасу, и к отскоку.\n' +
    '- **Опорный первым встречает контратаку** и закрывает центр.\n' +
    '- **Считаем их нападающих.** Впереди у соперника остались трое — второй полузащитник тоже стоит, атакуем вдвоём.', SC.rest);

  add('split', 'Если не вышло', 'Контратака не вышла: «Держим!» или «Домой!»', 'Не забили за 10 секунд — не отдаём мяч глупо и не оставляем пустые зоны.',
    '## Соперник успел вернуться\n' +
    '- **Не бьём с плохой позиции** и не лезем втроём против шестерых.\n' +
    '- **!!Держим!!!** — пас назад, владеем в 3-3-1, команда подтягивается к центру поля.\n' +
    '- **Ждём, пока соперник раскроется** — и снова !!Пошли!!!\n' +
    '## Потеряли мяч\n' +
    '1. **Ближний задерживает.** Не лезет в подкат, а мешает отдать вперёд.\n' +
    '2. **Остальные — !!Домой!!!** Бегом, а не шагом.\n' +
    '3. **Маятник возвращается на максимальной скорости**, центральный сдвигается на его фланг.\n' +
    '4. **Через 5–6 секунд мы снова в 4-2-1.**', SC.after);

  add('split', 'Ошибки', 'Ошибки, которые ломают схему', 'Четыре главные — на схеме, переключайте кнопками.',
    '- **Бегут все.** Сзади один — любой длинный пас становится выходом двое на одного.\n' +
    '- **Ушли оба крайних.** Фланги пустые до самых ворот.\n' +
    '- **Блок провалился в штрафную.** Соперник бьёт из-за штрафной и навешивает.\n' +
    '- **Одиночный прессинг.** Один побежал без сигнала — за его спиной дыра.\n' +
    '- **Медленный первый пас.** Две лишние секунды — и соперник уже вернулся.\n' +
    '- **Маятник возвращается шагом.** Его фланг открыт для ответной атаки.', SC.mistakes);

  add('text', 'Команды голосом', 'Голос — половина схемы', 'Маятник работает, только если все слышат, что происходит. Семь коротких команд — одни и те же на каждой игре.',
    '!!Мой!!! :: **Кто выходит на мяч.** Я атакую игрока с мячом — остальные страхуют.\n' +
    '!!Сдвиг!!! :: **Центральный защитник.** Линия сдвигается к мячу лесенкой.\n' +
    '!!Пошли!!! :: **Кто отобрал или первым увидел.** Контратака: трое бегут вперёд.\n' +
    '!!Иду!!! :: **Маятник.** Я ухожу в атаку по флангу.\n' +
    '!!Стою!!! :: **Дальний крайний.** Остаюсь третьим защитником.\n' +
    '!!Держим!!! :: **Игрок с мячом или вратарь.** Контратака не вышла — сохраняем мяч.\n' +
    '!!Домой!!! :: **Вратарь или центральный защитник.** Потеря — все бегом в блок 4-2-1.');

  add('text', 'По ситуации', 'Как меняем игру по ситуации', 'Модель та же — меняется высота блока и число бегущих в контратаку.',
    'Ведём в счёте :: Блок на 5 метров ниже. В контратаку бегут двое — нападающий и полузащитник, крайние стоят.\n' +
    'Ничья :: Играем как обычно. Не раскрываемся ради гола — контратака сама даст момент.\n' +
    'Проигрываем :: Первая линия выше центра поля, выходим на мяч раньше. В контратаку — четверо: оба полузащитника. Сзади остаются трое.\n' +
    'Соперник бьёт длинными :: Защитники на пару метров глубже, вратарь страхует за спиной, полузащитники подбирают отскоки.\n' +
    'У соперника быстрые нападающие :: Опорный не уходит никогда. Крайний бежит только после чистого отбора.\n' +
    'Соперник не атакует и сам отдаёт мяч :: Владеем в 3-3-1, но правило «сзади четверо» остаётся.\n' +
    'Устали крайние :: Меняем их первыми. Контратаку чаще ведут нападающий и полузащитник.');

  add('text', 'Тренировка', 'Как отработать на тренировке', 'Пять упражнений — от физики к игре. Первое делайте каждую тренировку.',
    '1. **Рывок после разворота** (10 минут). Старт спиной к направлению, разворот по сигналу и ускорение на 20–30 метров. 6–8 повторений с полным отдыхом. В первую очередь — крайние и нападающий.\n' +
    '2. **Маятник четверых** (10 минут). Четыре защитника против трёх атакующих, мяч гоняют с фланга на фланг. Один выходит на мяч — трое сдвигаются лесенкой. Тренер останавливает и проверяет линию.\n' +
    '3. **Блок против владения** (15 минут). Семь наших против восьми-девяти на половине поля. Соперник катает мяч, наши держат 4-2-1 и выходят только по сигналам. После отбора — пас в мини-ворота на центральной линии за 5 секунд.\n' +
    '4. **Контратака трое против двоих** (15 минут). Мяч получает наш защитник, трое бегут против двух защитников, догоняющий стартует через 2 секунды. На удар — 10 секунд.\n' +
    '5. **Стоп-кадр в двусторонке.** По свистку все замирают. Проверяем: сзади четверо? Бежали ровно трое? Маятник вернулся в блок?');

  add('text', 'Плюсы и риски', 'Честно: сильные стороны и риски', 'План рабочий, но у оборонительной игры есть цена. Лучше знать её до матча.',
    '## Что даёт такая игра\n' +
    '- **Мало моментов у соперника.** Семь человек перед штрафной, центр закрыт.\n' +
    '- **Играем на своей сильной стороне.** Скорость крайних и нападающего опаснее всего, когда впереди пустое поле.\n' +
    '- **Соперник открывается сам.** Атакуя, он поднимает защитников и оставляет зону за спиной.\n' +
    '- **Меньше риска при потере.** В контратаке рискуют трое, остальные всегда на местах.\n' +
    '- **Экономим силы.** Спринтуем по сигналу, а не весь матч.\n' +
    '||\n' +
    '## Риски и что с ними делать\n' +
    '- **Долго без мяча — давит на голову.** Договариваемся заранее: это наш план, а не оборона от безысходности.\n' +
    '- **Удары издалека и стандарты у наших ворот.** Не фолим у штрафной, закрываем удар, отрабатываем стандарты.\n' +
    '- **Крайние много спринтуют.** Меняем их чаще остальных.\n' +
    '- **Контратак за игру немного.** Каждую доводим до удара — для этого отработанные комбинации.\n' +
    '- **Пропустили первыми.** Одной обороной не отыграться — план на слайде «По ситуации».');

  add('text', 'Шпаргалка', 'Шпаргалка', 'Если запомнить только один экран — пусть будет этот.',
    '1. Без мяча — **4-2-1 у центра поля**. Центр закрыт, фланг — ловушка.\n' +
    '2. **Маятник**: крайний выходит на мяч, трое страхуют лесенкой, дальний крайний — в центр.\n' +
    '3. На мяч выходим **по сигналу**: пас на фланг, приём спиной, плохой приём.\n' +
    '4. Отбор — !!Пошли!!! Первый пас — **вперёд**.\n' +
    '5. Бегут **трое**: крайний фланга отбора, ближний полузащитник, нападающий.\n' +
    '6. Стоят **четверо**: два центральных, дальний крайний, опорный.\n' +
    '7. **10 секунд** на удар. Не вышло — !!Держим!!! Потеря — !!Домой!!!');

  return TE.normalizeProject(p);
}
