// Пример «Маятник»: схемы должны быть футбольно логичными, а не только красивыми.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Пример «Маятник» — логика схем');
  const e = await openApp();
  const p = e.UST.pendulumProject();
  const boards = p.slides.map((s, i) => ({ s, i })).filter(x => x.s.board);
  const where = (x, fi) => `«${x.s.nav}», шаг ${fi + 1}`;

  t.section('состав презентации');
  t.ok('слайдов достаточно и у всех есть заголовок', p.slides.length >= 15 && p.slides.every(s => s.title), p.slides.length);
  t.ok('схем много — это не текстовая лекция', boards.length >= 10, boards.length);
  const roles = p.slides.find(s => s.layout === 'roles');
  t.ok('есть слайд с требованиями по позициям', !!roles && roles.roles.length === 5, roles && roles.roles.length);
  const roleIds = [].concat.apply([], roles.roles.map(r => r.ids));
  const ours = roles.board.entities.filter(x => x.kind === 'ours').map(x => x.id);
  t.ok('в ролях есть каждый из восьми игроков', ours.length === 8 && ours.every(id => roleIds.indexOf(id) >= 0), JSON.stringify(roleIds));
  t.ok('у каждой роли расписано «без мяча», «после отбора» и что нужно', roles.roles.every(r => /Без мяча/.test(r.body) && /(С мячом|После отбора)/.test(r.body) && /Что нужно/.test(r.body)));
  const quizzes = [].concat.apply([], boards.map(x => x.s.board.frames.filter(f => f.quiz)));
  t.ok('есть паузы-вопросы, и у каждой есть ответ', quizzes.length >= 2 && quizzes.every(f => f.quiz.q && f.quiz.a), quizzes.length);
  t.ok('на первой схеме вопросов нет — титул крутится сам', !boards[0].s.board.frames.some(f => f.quiz));

  const kindOf = b => { const k = {}; b.entities.forEach(x => { k[x.id] = x; }); return k; };

  t.section('соперник стоит там, где он реально стоит');
  const attackBad = [], buildBad = [];
  let attackN = 0, buildN = 0;
  boards.forEach(x => {
    const K = kindOf(x.s.board);
    x.s.board.frames.forEach((f, fi) => {
      const opp = Object.keys(f.pos).filter(id => f.pos[id] && K[id] && K[id].kind === 'opp' && !K[id].gk);
      /* соперник атакует — большинство его полевых на нашей половине */
      if (/Соперник атакует/.test(f.cap)) {
        attackN++;
        const inOurHalf = opp.filter(id => f.pos[id][1] > 50).length;
        if (inOurHalf < 4) attackBad.push(where(x, fi) + `: на нашей половине ${inOurHalf}`);
      }
      /* соперник катает мяч у себя — его защитники у своих ворот, мяч на его половине */
      if (/катает мяч у себя|Мяч у их защитника/.test(f.cap)) {
        buildN++;
        const defs = opp.filter(id => /^od/.test(id));
        const owner = f.ball && f.ball.owner;
        if (defs.some(id => f.pos[id][1] > 35) || !owner || K[owner].kind !== 'opp' || f.pos[owner][1] > 50) buildBad.push(where(x, fi));
      }
    });
  });
  t.ok('схемы, где соперник атакует, есть', attackN >= 2, attackN);
  t.ok('когда соперник атакует — он на нашей половине', attackBad.length === 0, attackBad.join(' | '));
  t.ok('схемы, где соперник разыгрывает у себя, есть', buildN >= 3, buildN);
  t.ok('когда катает у себя — защитники у своих ворот, мяч на его половине', buildBad.length === 0, buildBad.join(' | '));

  t.section('в контратаке сзади всегда четверо');
  const restBad = [];
  boards.forEach(x => x.s.board.frames.forEach((f, fi) => {
    if (!/бегут трое|убегают/.test(f.cap)) return;
    const back = ['LB', 'LC', 'RC', 'RB', 'LM', 'RM'].filter(id => f.pos[id] && f.pos[id][1] >= 55).length;
    if (back < 4) restBad.push(where(x, fi) + `: сзади ${back}`);
  }));
  t.ok('кто страхует — остаётся на своей половине', restBad.length === 0, restBad.join(' | '));

  t.section('пасы, мяч и фишки');
  const passBad = [], overlap = [], missing = [], outside = [];
  boards.forEach(x => {
    const K = kindOf(x.s.board), chapters = x.s.board.frames.map(f => !!f.chapter);
    let prevOwner = null;
    x.s.board.frames.forEach((f, fi) => {
      const ids = Object.keys(f.pos).filter(id => f.pos[id]);
      ids.forEach(id => { const q = f.pos[id]; if (q[0] < 0 || q[0] > 100 || q[1] < 0 || q[1] > 100) outside.push(where(x, fi) + ' ' + id); });
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const a = f.pos[ids[i]], c = f.pos[ids[j]];
        /* поле 360×540 точек: фишки радиусом ~11 точек не должны лезть друг на друга */
        if (Math.hypot((a[0] - c[0]) * 3.6, (a[1] - c[1]) * 5.4) < 20) overlap.push(where(x, fi) + ` ${ids[i]}/${ids[j]}`);
      }
      if (f.ball && f.ball.owner && !f.pos[f.ball.owner]) missing.push(where(x, fi) + ' мяч у ' + f.ball.owner);
      f.arrows.forEach(a => {
        [a.target, a.from && a.from.e, a.to && a.to.e].filter(Boolean).forEach(id => { if (!f.pos[id]) missing.push(where(x, fi) + ' стрелка ' + id); });
        const pass = a.kind === 'line' && a.head !== false && (a.color === 'pass' || a.color === 'opp') && a.width >= 3;
        /* пас отдаёт тот, у кого был мяч; второй пас подряд — только следующим шагом */
        if (pass && a.from && a.from.e && fi > 0 && !chapters[fi] && prevOwner && prevOwner !== a.from.e) passBad.push(where(x, fi) + ` ${a.from.e} (мяч у ${prevOwner})`);
      });
      prevOwner = f.ball && f.ball.owner ? f.ball.owner : null;
    });
  });
  t.ok('пас отдаёт тот, у кого мяч', passBad.length === 0, passBad.join(' | '));
  t.ok('фишки не налезают друг на друга', overlap.length === 0, overlap.slice(0, 5).join(' | '));
  t.ok('стрелки и мяч только у тех, кто на поле', missing.length === 0, missing.join(' | '));
  t.ok('все стоят в пределах поля', outside.length === 0, outside.join(' | '));

  t.section('в редакторе и показе');
  await e.press('Открыть пример «Маятник»');
  await e.wait(60);
  t.ok('пример открывается', e.App.view === 'editor' && e.App.project.slides.length === p.slides.length);
  const ri = e.App.project.slides.findIndex(s => s.layout === 'roles');
  e.UST.App.slideIdx = ri;
  await e.press('Показ');
  await e.wait(80);
  const chips = e.$$('.ed-preview .te-slide.on .te-roles-card .te-chapter');
  t.ok('в показе у ролей пять кнопок', chips.length === 5, chips.length);
  e.click(chips[2]);
  await e.wait(30);
  const hl = e.$$('.ed-preview .te-slide.on .te-tok.hl').map(g => g.getAttribute('data-eid')).sort().join(',');
  t.ok('нажали «Крайние защитники» — подсветились ЛЗ и ПЗ', hl === 'LB,RB', hl);
  t.clean(e, 'пример без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
