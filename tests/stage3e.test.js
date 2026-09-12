// Этап 3д: главы списком и зеркальная глава.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 3д — главы и зеркало');
  const e = await openApp();
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const b = () => e.board(), f = () => e.frame();
  const byLabel = l => b().entities.find(x => x.label === l);

  t.section('пары левый–правый');
  const lz = byLabel('ЛЗ'), pz = byLabel('ПЗ');
  t.ok('в расстановке есть ЛЗ и ПЗ', !!lz && !!pz, (lz && lz.label) + ' / ' + (pz && pz.label));
  const pairs = e.UST.mirrorPairs(b());
  t.ok('они распознаны как зеркальная пара', pairs[lz.id] === pz.id && pairs[pz.id] === lz.id);

  t.section('текст переворачивается');
  t.ok('«справа» становится «слева»', e.UST.mirrorCaption('Отбор справа', b()) === 'Отбор слева', e.UST.mirrorCaption('Отбор справа', b()));
  t.ok('подписи игроков меняются', e.UST.mirrorCaption('ЛЗ идёт вперёд, правый фланг', b()) === 'ПЗ идёт вперёд, левый фланг', e.UST.mirrorCaption('ЛЗ идёт вперёд, правый фланг', b()));
  t.ok('заглавная буква сохраняется', e.UST.mirrorCaption('Справа отбор', b()) === 'Слева отбор', e.UST.mirrorCaption('Справа отбор', b()));

  t.section('зеркальные шаги');
  e.UST.commit(() => {
    const fr = f();
    fr.pos[lz.id] = [20, 80];
    fr.pos[pz.id] = [80, 80];
    fr.ball = { owner: lz.id };
    fr.hl = [lz.id];
    fr.cap = 'ЛЗ подключается справа';
    fr.arrows.push({ id: 'm1', kind: 'move', target: lz.id, style: 'dashed', color: 'auto', width: 2.8, head: true, bend: 40 });
  });
  await e.wait(15);
  const mir = e.UST.mirrorFrames([f()], b())[0];
  t.ok('позиции поменялись местами и отразились', Math.abs(mir.pos[pz.id][0] - 80) < 0.01 && Math.abs(mir.pos[lz.id][0] - 20) < 0.01, JSON.stringify([mir.pos[pz.id], mir.pos[lz.id]]));
  t.ok('мяч перешёл к зеркальному игроку', mir.ball.owner === pz.id);
  t.ok('подсветка тоже', mir.hl[0] === pz.id);
  t.ok('стрелка теперь у другого игрока и изогнута в другую сторону', mir.arrows[0].target === pz.id && mir.arrows[0].bend === -40);
  t.ok('подпись к шагу переведена', mir.cap === 'ПЗ подключается слева', mir.cap);

  t.section('главы в редакторе');
  await e.press('Шаг');
  await e.wait(15);
  e.UST.commit(() => { b().frames[1].chapter = 'Отбор справа'; });
  await e.wait(15);
  await e.press('Ещё действия с шагом');
  await e.press('Главы схемы…', e.$('.pop'));
  await e.wait(20);
  const dlg = () => e.$('.modal-ov');
  t.ok('окно глав открылось и показывает две главы', !!dlg() && e.$$('.modal-ov .exp-card').length === 2, e.$$('.modal-ov .exp-card').length);
  const cards = () => e.$$('.modal-ov .exp-card');
  const n0 = b().frames.length;
  await e.press('Зеркально', cards()[1]);
  await e.wait(25);
  t.ok('добавились зеркальные шаги', b().frames.length === n0 + 1, b().frames.length);
  const mirrored = b().frames[2];
  t.ok('глава названа «Отбор слева»', mirrored.chapter === 'Отбор слева', mirrored.chapter);
  await e.press('Дублировать', cards()[1]);
  await e.wait(25);
  t.ok('обычная копия помечена «(копия)»', /\(копия\)/.test(b().frames[2].chapter), b().frames[2].chapter);
  t.ok('шагов стало ещё больше', b().frames.length === n0 + 2);
  await e.press('Выше', cards()[2]);
  await e.wait(25);
  t.ok('главу можно поднять выше', b().frames.map(x => x.chapter).filter(Boolean).length >= 2);
  await e.press('Удалить', cards()[1]);
  await e.wait(25);
  t.ok('и удалить со всеми её шагами', b().frames.length === n0 + 1, b().frames.length);
  await e.press('Готово', dlg());
  await e.wait(15);
  t.ok('окно закрылось', !e.$('.modal-ov'));
  t.clean(e, 'этап 3д без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
