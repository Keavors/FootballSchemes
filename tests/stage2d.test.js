// Этап 2г: групповые операции, разворот шага, закрепление, порядок слоёв, сдвиг стрелками.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 2г — группы, замок, слои');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const f = () => e.frame(), insp = () => e.$('#edInsp');
  const pos = id => f().pos[id];
  const vis = e.board().entities.filter(x => f().pos[x.id]);
  const [A, B, C] = vis.slice(0, 3).map(x => x.id);
  const togByText = re => e.$$('#edInsp .tog').find(l => re.test(e.text(l)));

  t.section('распределить и отразить');
  e.UST.commit(() => { f().pos[A] = [10, 30]; f().pos[B] = [12, 40]; f().pos[C] = [60, 50]; });
  await e.wait(10);
  e.App.sel = { t: 'ent', ids: [A, B, C] };
  e.UST.refresh(['canvas', 'insp']);
  await e.press('Распределить поперёк', insp());
  t.ok('игроки разошлись равномерно по ширине', Math.abs(pos(A)[0] - 10) < 0.06 && Math.abs(pos(B)[0] - 35) < 0.06 && Math.abs(pos(C)[0] - 60) < 0.06, [pos(A)[0], pos(B)[0], pos(C)[0]].join(', '));
  await e.press('Распределить вдоль', insp());
  t.ok('и равномерно по длине', Math.abs(pos(A)[1] - 30) < 0.06 && Math.abs(pos(B)[1] - 40) < 0.06 && Math.abs(pos(C)[1] - 50) < 0.06, [pos(A)[1], pos(B)[1], pos(C)[1]].join(', '));
  await e.press('Отразить слева направо', insp());
  t.ok('отражение поперёк поля', Math.abs(pos(A)[0] - 90) < 0.06 && Math.abs(pos(C)[0] - 40) < 0.06, [pos(A)[0], pos(C)[0]].join(', '));
  await e.press('Отразить сверху вниз', insp());
  t.ok('отражение вдоль поля', Math.abs(pos(A)[1] - 70) < 0.06 && Math.abs(pos(C)[1] - 50) < 0.06, [pos(A)[1], pos(C)[1]].join(', '));

  t.section('разворот шага на 180°');
  e.UST.commit(() => {
    f().pos[A] = [20, 80];
    f().ball = { at: [30, 90] };
    f().zones.push({ id: 'zR', type: 'rect', x: 10, y: 10, w: 20, h: 10, color: '#ffffff', label: '', lpos: 'top', stroke: 'dashed' });
  });
  await e.wait(10);
  await e.tap(null, [50, 50]);
  await e.press('Развернуть шаг на 180°', insp());
  const zR = () => f().zones.find(z => z.id === 'zR');
  t.ok('игрок оказался с другой стороны', Math.abs(pos(A)[0] - 80) < 0.06 && Math.abs(pos(A)[1] - 20) < 0.06, JSON.stringify(pos(A)));
  t.ok('мяч тоже', Math.abs(f().ball.at[0] - 70) < 0.06 && Math.abs(f().ball.at[1] - 10) < 0.06);
  t.ok('зона развернулась целиком', Math.abs(zR().x - 70) < 0.06 && Math.abs(zR().y - 80) < 0.06 && zR().w === 20, JSON.stringify([zR().x, zR().y, zR().w, zR().h]));
  await e.press('Развернуть шаг на 180°', insp());
  t.ok('повторный разворот возвращает как было', Math.abs(pos(A)[0] - 20) < 0.06 && Math.abs(zR().x - 10) < 0.06);

  t.section('соперники зеркально');
  await e.press('К списку презентаций');
  await e.wait(40);
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const ourCount = e.board().entities.filter(x => x.kind === 'ours' && f().pos[x.id]).length;
  await e.tap(null, [50, 50]);
  await e.press('Соперники зеркально', insp());
  await e.wait(15);
  const opps = e.board().entities.filter(x => x.kind === 'opp' && f().pos[x.id]);
  t.ok('соперников стало столько же, сколько наших', opps.length === ourCount, opps.length + ' и ' + ourCount);
  const ourGk = e.board().entities.find(x => x.kind === 'ours' && x.gk);
  const oppGk = e.board().entities.find(x => x.kind === 'opp' && x.gk);
  t.ok('вратарь соперника встал зеркально нашему', !!oppGk && Math.abs(pos(oppGk.id)[1] - (100 - pos(ourGk.id)[1])) < 0.06, oppGk && JSON.stringify(pos(oppGk.id)));

  t.section('замок');
  const L = e.board().entities.find(x => x.kind === 'ours' && !x.gk && f().pos[x.id]).id;
  await e.tap(`[data-eid="${L}"] circle`, pos(L));
  const lockTog = togByText(/Закрепить/);
  t.ok('в свойствах есть «Закрепить»', !!lockTog);
  e.change(lockTog.querySelector('input'), true);
  await e.wait(15);
  const p0 = pos(L).slice();
  await e.drag(`[data-eid="${L}"] circle`, p0, [p0[0] + 15, p0[1]]);
  t.ok('закреплённый игрок не двигается перетаскиванием', JSON.stringify(pos(L)) === JSON.stringify(p0), JSON.stringify(pos(L)));
  await e.tap(`[data-eid="${L}"] circle`, pos(L));
  e.key('ArrowRight');
  await e.wait(15);
  t.ok('и клавишами тоже', JSON.stringify(pos(L)) === JSON.stringify(p0));
  e.change(togByText(/Закрепить/).querySelector('input'), false);
  await e.wait(15);
  e.key('ArrowRight');
  await e.wait(15);
  t.ok('после снятия замка снова двигается', pos(L)[0] > p0[0]);

  t.section('порядок слоёв и сдвиг клавишами');
  e.UST.commit(() => {
    f().zones.push({ id: 'z1', type: 'rect', x: 10, y: 10, w: 10, h: 10, color: '#ffffff', label: '', lpos: 'top', stroke: 'dashed' });
    f().zones.push({ id: 'z2', type: 'rect', x: 30, y: 10, w: 10, h: 10, color: '#ffe066', label: '', lpos: 'top', stroke: 'dashed' });
  });
  await e.wait(10);
  e.App.sel = { t: 'zone', i: f().zones.findIndex(z => z.id === 'z1') };
  e.UST.refresh(['canvas', 'insp']);
  await e.press('На передний план', insp());
  t.ok('зона ушла на передний план', f().zones[f().zones.length - 1].id === 'z1');
  t.ok('и осталась выбранной', e.App.sel.t === 'zone' && f().zones[e.App.sel.i].id === 'z1');
  const zx = f().zones[f().zones.length - 1].x;
  e.key('ArrowRight');
  await e.wait(15);
  t.ok('зона двигается стрелками клавиатуры', Math.abs(f().zones.find(z => z.id === 'z1').x - (zx + 0.5)) < 0.01);
  e.UST.commit(() => { f().ball = { at: [50, 50] }; });
  await e.wait(10);
  e.App.sel = { t: 'ball' };
  e.UST.refresh(['canvas', 'insp']);
  e.key('ArrowDown', { shiftKey: true });
  await e.wait(15);
  t.ok('мяч двигается стрелками клавиатуры', Math.abs(f().ball.at[1] - 52) < 0.01, JSON.stringify(f().ball.at));
  t.clean(e, 'этап 2г без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
