// Пример «Маятник»: схемы должны быть футбольно логичными и совпадать с тактикой команды.
// Тактика: без мяча 4-2-1, с мячом 3-3-1; в атаке четверо (латераль по флангу, полузащитник на ближнюю,
// нападающий на дальнюю, второй полузащитник на подборе), сзади всегда трое.
const fs = require('fs'), path = require('path');
const { openApp, suite } = require('./harness');

const FILE = path.join(__dirname, '..', 'mayatnik-taktika-8x8.html');

(async () => {
  const t = suite('Пример «Маятник» — логика схем и файл презентации');
  const e = await openApp();
  const p = e.UST.pendulumProject();
  const boards = p.slides.map((s, i) => ({ s, i })).filter(x => x.s.board);
  const where = (x, fi) => `«${x.s.nav}», шаг ${fi + 1}`;
  const FIELD = ['LB', 'LC', 'RC', 'RB', 'LM', 'RM', 'ST'];

  t.section('состав презентации');
  t.ok('слайдов достаточно и у всех есть заголовок', p.slides.length >= 18 && p.slides.every(s => s.title), p.slides.length);
  t.ok('схем много — это не текстовая лекция', boards.length >= 13, boards.length);
  const labels = boards[0].s.board.entities.filter(x => x.kind === 'ours').map(x => x.label).sort().join(' ');
  t.ok('позиции подписаны как у команды: латерали ЛЛ и ПЛ', labels === 'ВР ЛЛ ЛП ЛЦ Н ПЛ ПП ПЦ', labels);
  const all = JSON.stringify(p);
  t.ok('есть позиционная атака', p.slides.filter(s => /Позиционная атака/.test(s.title)).length >= 2);
  t.ok('формула команды проговорена', /4-2-1/.test(all) && /3-3-1/.test(all) && /сзади \*\*всегда трое\*\*/.test(all));
  const roles = p.slides.find(s => s.layout === 'roles');
  t.ok('есть слайд с требованиями по позициям', !!roles && roles.roles.length === 5, roles && roles.roles.length);
  const roleIds = [].concat.apply([], roles.roles.map(r => r.ids));
  const ours = roles.board.entities.filter(x => x.kind === 'ours').map(x => x.id);
  t.ok('в ролях есть каждый из восьми игроков', ours.length === 8 && ours.every(id => roleIds.indexOf(id) >= 0), JSON.stringify(roleIds));
  t.ok('у каждой роли: без мяча, в контратаке, в позиционной атаке и что нужно', roles.roles.every(r => /Без мяча/.test(r.body) && /В контратаке/.test(r.body) && /В позиционной атаке/.test(r.body) && /Что нужно/.test(r.body)));
  const quizzes = [].concat.apply([], boards.map(x => x.s.board.frames.filter(f => f.quiz)));
  t.ok('есть паузы-вопросы, и у каждой есть ответ', quizzes.length >= 2 && quizzes.every(f => f.quiz.q && f.quiz.a), quizzes.length);
  t.ok('на первой схеме вопросов нет — титул крутится сам', !boards[0].s.board.frames.some(f => f.quiz));

  const kindOf = b => { const k = {}; b.entities.forEach(x => { k[x.id] = x; }); return k; };

  t.section('соперник стоит там, где он реально стоит');
  const attackBad = [], buildBad = [], defBad = [];
  let attackN = 0, buildN = 0, defN = 0;
  boards.forEach(x => {
    const K = kindOf(x.s.board);
    x.s.board.frames.forEach((f, fi) => {
      const opp = Object.keys(f.pos).filter(id => f.pos[id] && K[id] && K[id].kind === 'opp' && !K[id].gk);
      if (/Соперник атакует/.test(f.cap)) {
        attackN++;
        const inOurHalf = opp.filter(id => f.pos[id][1] > 50).length;
        if (inOurHalf < 4) attackBad.push(where(x, fi) + `: на нашей половине ${inOurHalf}`);
      }
      if (/катает мяч у себя|Мяч у их защитника/.test(f.cap)) {
        buildN++;
        const owner = f.ball && f.ball.owner;
        if (opp.filter(id => /^od/.test(id)).some(id => f.pos[id][1] > 35) || !owner || K[owner].kind !== 'opp' || f.pos[owner][1] > 50) buildBad.push(where(x, fi));
      }
      /* соперник обороняется против нашей позиционной атаки — почти все у своих ворот */
      if (/стоит блоком|успел вернуться/.test(f.cap)) {
        defN++;
        const back = opp.filter(id => f.pos[id][1] < 50).length;
        if (back < 6) defBad.push(where(x, fi) + `: у своих ворот ${back}`);
      }
    });
  });
  t.ok('схемы, где соперник атакует, есть', attackN >= 2, attackN);
  t.ok('когда соперник атакует — он на нашей половине', attackBad.length === 0, attackBad.join(' | '));
  t.ok('схемы, где соперник разыгрывает у себя, есть', buildN >= 3, buildN);
  t.ok('когда катает у себя — защитники у своих ворот, мяч на его половине', buildBad.length === 0, buildBad.join(' | '));
  t.ok('схемы против обороняющегося соперника есть', defN >= 2, defN);
  t.ok('когда обороняется — стоит у своих ворот', defBad.length === 0, defBad.join(' | '));

  t.section('в атаке четверо, сзади всегда трое');
  const attBad = [], posBad = [], boxBad = [];
  let attN = 0, boxN = 0;
  boards.forEach(x => x.s.board.frames.forEach((f, fi) => {
    const y = id => (f.pos[id] ? f.pos[id][1] : 100);
    if (/четверо/.test(f.cap) && !/забежали все четверо/.test(f.cap)) {
      attN++;
      const up = FIELD.filter(id => y(id) < 50).length, back = FIELD.filter(id => y(id) >= 55).length;
      if (up !== 4 || back !== 3) attBad.push(where(x, fi) + `: впереди ${up}, сзади ${back}`);
    }
    if (/3-3-1/.test(f.cap)) {
      const back = FIELD.filter(id => y(id) >= 48).length;
      if (back < 3) posBad.push(where(x, fi) + `: сзади ${back}`);
    }
    /* штрафная занята: двое у ворот, один на краю, трое сзади */
    if (/Штрафная занята/.test(f.cap)) {
      boxN++;
      const inBox = FIELD.filter(id => f.pos[id] && f.pos[id][1] <= 16 && f.pos[id][0] >= 22 && f.pos[id][0] <= 78).length;
      const edge = FIELD.filter(id => f.pos[id] && f.pos[id][1] > 16 && f.pos[id][1] <= 28 && f.pos[id][0] >= 38 && f.pos[id][0] <= 62).length;
      const back = FIELD.filter(id => y(id) >= 48).length;
      if (inBox !== 2 || edge !== 1 || back !== 3) boxBad.push(where(x, fi) + `: в штрафной ${inBox}, на краю ${edge}, сзади ${back}`);
    }
  }));
  t.ok('схем с атакой вчетвером много', attN >= 4, attN);
  t.ok('когда атакуют четверо — впереди ровно четверо, сзади ровно трое', attBad.length === 0, attBad.join(' | '));
  t.ok('в 3-3-1 сзади не меньше троих', posBad.length === 0, posBad.join(' | '));
  t.ok('разбор занятия штрафной есть в контратаке и в позиционной атаке', boxN >= 2, boxN);
  t.ok('штрафная занята правильно: ближняя, дальняя, край, трое сзади', boxBad.length === 0, boxBad.join(' | '));

  t.section('пасы, мяч и фишки');
  const passBad = [], overlap = [], missing = [], outside = [];
  boards.forEach(x => {
    const chapters = x.s.board.frames.map(f => !!f.chapter);
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
        if (pass && a.from && a.from.e && fi > 0 && !chapters[fi] && prevOwner && prevOwner !== a.from.e) passBad.push(where(x, fi) + ` ${a.from.e} (мяч у ${prevOwner})`);
      });
      prevOwner = f.ball && f.ball.owner ? f.ball.owner : null;
    });
  });
  t.ok('пас отдаёт тот, у кого мяч', passBad.length === 0, passBad.join(' | '));
  t.ok('фишки не налезают друг на друга', overlap.length === 0, overlap.slice(0, 6).join(' | '));
  t.ok('стрелки и мяч только у тех, кто на поле', missing.length === 0, missing.join(' | '));
  t.ok('все стоят в пределах поля', outside.length === 0, outside.join(' | '));

  t.section('файл презентации для команды');
  t.ok('файл mayatnik-taktika-8x8.html есть', fs.existsSync(FILE));
  const html = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '';
  const m = html.match(/<script type="application\/json" id="te-data">([\s\S]*?)<\/script>/);
  const strip = o => (Array.isArray(o) ? o.map(strip) : (o && typeof o === 'object')
    ? Object.keys(o).sort().reduce((acc, k) => { if (k !== 'id') acc[k] = strip(o[k]); return acc; }, {}) : o);
  const inFile = m ? JSON.parse(m[1]) : null;
  const now = JSON.parse(JSON.stringify(e.UST.forExport(p, false)));
  t.ok('в файле ровно нынешний пример (иначе: npm run sample)', !!inFile && JSON.stringify(strip(inFile)) === JSON.stringify(strip(now)), inFile ? inFile.slides.length + ' слайдов в файле' : 'данных нет');
  t.ok('шрифты зашиты в файл — откроется без интернета', /data:font\/woff2;base64,/.test(html) && !/fonts\.googleapis\.com\/css2/.test(html));
  e.close();

  const shown = await openApp({ html });
  await shown.wait(80);
  t.ok('файл открывается сам по себе как презентация', shown.$$('.te-slide').length === p.slides.length, shown.$$('.te-slide').length);
  t.ok('на первом слайде крутится схема', !!shown.$('.te-slide svg.te-svg'));
  t.clean(shown, 'файл без ошибок');
  shown.close();

  t.section('в редакторе и показе');
  const ed = await openApp();
  await ed.press('Открыть пример «Маятник»');
  await ed.wait(60);
  t.ok('пример открывается', ed.App.view === 'editor' && ed.App.project.slides.length === p.slides.length);
  ed.UST.App.slideIdx = ed.App.project.slides.findIndex(s => s.layout === 'roles');
  await ed.press('Показ');
  await ed.wait(80);
  const chips = ed.$$('.ed-preview .te-slide.on .te-roles-card .te-chapter');
  t.ok('в показе у ролей пять кнопок', chips.length === 5, chips.length);
  ed.click(chips[2]);
  await ed.wait(30);
  const hl = ed.$$('.ed-preview .te-slide.on .te-tok.hl').map(g => g.getAttribute('data-eid')).sort().join(',');
  t.ok('нажали «Латерали» — подсветились ЛЛ и ПЛ', hl === 'LB,RB', hl);
  t.clean(ed, 'пример без ошибок');
  ed.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
