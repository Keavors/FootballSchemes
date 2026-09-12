// Этап 2д: режим штампа и линейка в метрах.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 2д — штамп и линейка');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const f = () => e.frame(), b = () => e.board();
  const hint = () => e.text(e.$('#edTools .tool-hint'));

  t.section('штамп');
  const n0 = b().entities.length;
  await e.press('Добавить');
  await e.press('Наш игрок', e.$('.modal-ov'));
  await e.wait(15);
  t.ok('включился режим штампа', e.App.tool.m === 'stamp' && e.App.tool.kind === 'ours');
  t.ok('в подсказке написано, что делать', /Касайтесь поля/.test(hint()), hint());
  await e.tap(null, [30, 30]);
  t.ok('игрок появился в точке касания', b().entities.length === n0 + 1 && Math.abs(f().pos[b().entities[n0].id][0] - 30) < 0.6 && Math.abs(f().pos[b().entities[n0].id][1] - 30) < 0.6, JSON.stringify(f().pos[b().entities[n0].id]));
  t.ok('режим штампа не выключился', e.App.tool.m === 'stamp');
  await e.tap(null, [70, 30]);
  t.ok('второй игрок встал рядом', b().entities.length === n0 + 2 && Math.abs(f().pos[b().entities[n0 + 1].id][0] - 70) < 0.6);
  t.ok('номера идут по порядку', b().entities[n0 + 1].number === String(b().entities.filter(x => x.kind === 'ours').length));
  t.ok('новый игрок виден на всех шагах схемы', b().frames.every(fr => !!fr.pos[b().entities[n0].id]));
  await e.press('Готово');
  t.ok('«Готово» возвращает обычный выбор', e.App.tool.m === 'select');
  e.key('z', { ctrlKey: true });
  e.key('z', { ctrlKey: true });
  await e.wait(20);
  t.ok('отмена убирает поставленных', b().entities.length === n0);

  t.section('линейка');
  /* освобождаем поле: всех к нижнему краю, чтобы координаты замеров были предсказуемы */
  e.UST.commit(() => {
    const fr = e.frame();
    b().entities.forEach((x, i) => { if (fr.pos[x.id]) fr.pos[x.id] = [4 + i * 2, 97]; });
  });
  await e.wait(15);
  await e.press('Линейка');
  t.ok('включилась линейка', e.App.tool.m === 'measure');
  const dataBefore = JSON.stringify(e.App.project);
  const svg = () => e.svg();
  const a = e.pt([20, 20]), c = e.pt([20, 70]);
  e.ptr(svg(), 'pointerdown', a[0], a[1]);
  e.ptr(svg(), 'pointermove', c[0], c[1]);
  t.ok('во время замера на поле видна линия', !!e.$('.measure-line'));
  e.ptr(svg(), 'pointerup', c[0], c[1]);
  await e.wait(15);
  t.ok('расстояние посчитано в метрах', /30,0 м/.test(hint()), hint());
  t.ok('сам замер схему не меняет', JSON.stringify(e.App.project) === dataBefore);

  t.section('прилипание линейки к игроку');
  const P = b().entities.find(x => f().pos[x.id]).id;
  e.UST.commit(() => { f().pos[P] = [60, 60]; });
  await e.wait(10);
  await e.press('Линейка');
  const s1 = e.pt([20, 60]), s2 = e.pt([62, 62]);
  e.ptr(svg(), 'pointerdown', s1[0], s1[1]);
  e.ptr(svg(), 'pointermove', s2[0], s2[1]);
  e.ptr(svg(), 'pointerup', s2[0], s2[1]);
  await e.wait(15);
  t.ok('конец линейки прилип к игроку', Math.abs(e.App.measure.b[0] - 60) < 0.01 && Math.abs(e.App.measure.b[1] - 60) < 0.01, JSON.stringify(e.App.measure.b));
  t.ok('и показал 16,0 м', /16,0 м/.test(hint()), hint());

  t.section('оставить замер на схеме');
  const arrows0 = f().arrows.length, zones0 = f().zones.length;
  await e.press('Оставить на схеме');
  await e.wait(15);
  t.ok('появилась линия', f().arrows.length === arrows0 + 1 && f().arrows[arrows0].head === false);
  t.ok('и подпись с расстоянием', f().zones.length === zones0 + 1 && /16,0 м/.test(f().zones[zones0].text), f().zones[zones0] && f().zones[zones0].text);
  t.ok('линейка выключилась', e.App.tool.m === 'select' && !e.App.measure);

  t.section('свои размеры поля');
  await e.press('Настройки');
  const rngs = e.$$('.modal-ov .fld').filter(x => /Длина поля/.test(e.text(x)));
  t.ok('в настройках есть длина поля в метрах', rngs.length === 1);
  const inp = rngs[0].querySelector('input[type="range"]');
  e.input(inp, '100');
  await e.wait(15);
  await e.press('Закрыть', e.$('.modal-ov'));
  await e.wait(15);
  await e.press('Линейка');
  const q1 = e.pt([20, 20]), q2 = e.pt([20, 70]);
  e.ptr(svg(), 'pointerdown', q1[0], q1[1]);
  e.ptr(svg(), 'pointermove', q2[0], q2[1]);
  e.ptr(svg(), 'pointerup', q2[0], q2[1]);
  await e.wait(15);
  t.ok('на поле 100 м те же полполя — это 50 м', /50,0 м/.test(hint()), hint());
  t.clean(e, 'этап 2д без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
