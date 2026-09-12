// Этап 3а: очерёдность движений внутри шага (сначала пас, потом забегание).
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 3а — очерёдность внутри шага');
  const env = await openApp();
  const TE = env.TE;
  const host = () => { const d = env.doc.createElement('div'); env.doc.body.appendChild(d); return d; };

  t.section('расчёт очередей');
  const mk = (passOrd, moveOrd) => TE.normalizeBoard({
    entities: [{ id: 'a', kind: 'ours' }, { id: 'b', kind: 'ours' }],
    frames: [
      { pos: { a: [20, 60], b: [80, 60] }, ball: { owner: 'a' } },
      {
        pos: { a: [20, 60], b: [80, 30] }, ball: { owner: 'b' },
        arrows: [
          { id: 'pass', kind: 'line', from: { e: 'a' }, to: { e: 'b' }, style: 'solid', color: 'pass', width: 3, head: true, ord: passOrd },
          { id: 'run', kind: 'move', target: 'b', style: 'dashed', color: 'auto', width: 2.8, head: true, ord: moveOrd }
        ]
      }
    ]
  });
  const board = mk(1, 2);
  const ord = TE.frameOrders(board.frames[1], board.frames[1].pos);
  t.ok('в шаге две очереди', ord.phases === 2, ord.phases);
  t.ok('пас — первая очередь', ord.arrow.pass === 1);
  t.ok('пробежка — вторая', ord.arrow.run === 2 && ord.ent.b === 2);
  t.ok('мяч летит вместе с пасом', ord.ball === 1);
  const plain = TE.normalizeBoard({ entities: [{ id: 'a', kind: 'ours' }], frames: [{ pos: { a: [10, 10] } }, { pos: { a: [50, 50] } }] });
  t.ok('без указаний очередь одна', TE.frameOrders(plain.frames[1], plain.frames[1].pos).phases === 1);

  t.section('движение по очередям');
  const P = TE.normalizeProject({ settings: { format: '8x8' }, slides: [] });
  const bd = new TE.Board(host(), board, P, { bare: true });
  const shots = [];
  bd.animate = (total, fn) => {
    shots.total = total;
    [0.5, 1.5].forEach(time => { fn(time); shots.push({ time, b: bd.cur.b.slice(), ball: bd.ballXY.slice() }); });
    return Promise.resolve(true);
  };
  const ballStart = bd.ballXY.slice();
  await bd.tweenTo(1);
  t.ok('шаг длится две очереди', shots.total === 2, shots.total);
  const half1 = shots[0], half2 = shots[1];
  t.ok('в первой очереди бегун ещё стоит', Math.abs(half1.b[1] - 60) < 1e-6, JSON.stringify(half1.b));
  t.ok('а мяч уже летит', Math.abs(half1.ball[0] - ballStart[0]) > 1, (half1.ball[0] - ballStart[0]).toFixed(1));
  t.ok('во второй очереди бегун в пути', half2.b[1] < 59 && half2.b[1] > 31, JSON.stringify(half2.b));
  t.ok('к этому времени мяч уже долетел', Math.abs(half2.ball[0] - bd.ballPt({ owner: 'b' })[0]) < 0.01);

  const board1 = mk(1, 1);
  const bd1 = new TE.Board(host(), board1, P, { bare: true });
  let total1 = 0;
  bd1.animate = (total, fn) => { total1 = total; fn(total); return Promise.resolve(true); };
  await bd1.tweenTo(1);
  t.ok('если очередь одна — шаг прежней длины', total1 === 1, total1);
  t.clean(env, 'расчёты без ошибок');
  env.close();

  t.section('в редакторе');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const f = () => e.frame();
  const ids = e.board().entities.filter(x => f().pos[x.id]).slice(0, 2).map(x => x.id);
  await e.press('Шаг');
  await e.wait(15);
  e.UST.commit(() => {
    f().pos[ids[1]] = [60, 30];
    f().arrows.push({ id: 'p1', kind: 'line', from: { e: ids[0] }, to: { e: ids[1] }, style: 'solid', color: 'pass', width: 3, head: true, bend: 0 });
    f().arrows.push({ id: 'm1', kind: 'move', target: ids[1], style: 'dashed', color: 'auto', width: 2.8, head: true, bend: 0 });
  });
  await e.wait(15);
  await e.tap(null, [50, 50]);
  const insp = () => e.$('#edInsp');
  await e.press('Сначала пас, потом бег', insp());
  await e.wait(15);
  t.ok('пас стал первой очередью', f().arrows.find(a => a.id === 'p1').ord === 1);
  t.ok('пробежка — второй', f().arrows.find(a => a.id === 'm1').ord === 2 && f().ord[ids[1]] === 2);
  t.ok('в подсказке к длительности видно число очередей', /2/.test(e.text(e.$$('#edInsp .fld').find(x => /Длительность/.test(e.text(x))))), e.text(e.$$('#edInsp .fld').find(x => /Длительность/.test(e.text(x)))));

  await e.tap(`[data-eid="${ids[1]}"] circle`, f().pos[ids[1]]);
  const ordFld = e.$$('#edInsp .fld').find(x => /Очередь в шаге/.test(e.text(x)));
  t.ok('у игрока есть выбор очереди', !!ordFld);
  t.ok('и там выбрана вторая', ordFld && ordFld.querySelector('button.on') && e.text(ordFld.querySelector('button.on')) === '2');
  e.click([...ordFld.querySelectorAll('button')].find(b => e.text(b) === '3'));
  await e.wait(15);
  t.ok('можно переключить на третью', f().ord[ids[1]] === 3 && f().arrows.find(a => a.id === 'm1').ord === 3);
  e.click([...e.$$('#edInsp .fld').find(x => /Очередь в шаге/.test(e.text(x))).querySelectorAll('button')].find(b => e.text(b) === '1'));
  await e.wait(15);
  t.ok('и вернуть в первую', !f().ord[ids[1]] && !f().arrows.find(a => a.id === 'm1').ord);
  t.clean(e, 'этап 3а без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
