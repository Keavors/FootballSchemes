// Этап 2в: прилипание к линиям игроков и разметке поля.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 2в — прилипание и направляющие');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);

  /* Освобождаем середину поля: всех уводим вниз, двух подопытных ставим на известные места */
  const vis = e.board().entities.filter(x => e.frame().pos[x.id]);
  const A = vis[0].id, B = vis[1].id;
  e.UST.commit(() => {
    const f = e.frame();
    e.board().entities.forEach((x, i) => { if (f.pos[x.id]) f.pos[x.id] = [4 + i * 2, 96]; });
    f.pos[A] = [20, 40];
    f.pos[B] = [60, 70];
  });
  await e.wait(15);
  const pos = id => e.frame().pos[id];
  const guides = () => e.$$('.snap-guide').length;

  const dragTo = async (id, to, mods) => {
    const svg = e.svg(), from = pos(id).slice();
    const a = e.pt(from), b = e.pt(to);
    e.ptr(svg.querySelector(`[data-eid="${id}"] circle`), 'pointerdown', a[0], a[1], mods);
    e.ptr(svg, 'pointermove', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, mods);
    e.ptr(svg, 'pointermove', b[0], b[1], mods);
    return { finish: async () => { e.ptr(svg, 'pointerup', b[0], b[1], mods); await e.wait(15); } };
  };

  t.section('прилипание к линии другого игрока');
  let d = await dragTo(A, [61.2, 41]);
  t.ok('во время перетаскивания видна направляющая', guides() === 1, guides());
  await d.finish();
  t.ok('игрок встал ровно по линии другого', Math.abs(pos(A)[0] - 60) < 0.01, JSON.stringify(pos(A)));
  t.ok('по второй оси ничего не прилипло', Math.abs(pos(A)[1] - 41) < 0.01);
  t.ok('после отпускания направляющих нет', guides() === 0);

  t.section('прилипание к центру поля');
  d = await dragTo(A, [49, 41]);
  await d.finish();
  t.ok('прилипло к центральной линии', Math.abs(pos(A)[0] - 50) < 0.01, JSON.stringify(pos(A)));

  t.section('Alt отключает прилипание');
  d = await dragTo(A, [61.2, 41], { altKey: true });
  t.ok('с Alt направляющих нет', guides() === 0);
  await d.finish();
  t.ok('игрок остался там, куда вели', Math.abs(pos(A)[0] - 61.2) < 0.2, JSON.stringify(pos(A)));

  t.section('кнопка «Привязка»');
  t.ok('кнопка включена', /on/.test(e.button('Привязка').className));
  await e.press('Привязка');
  t.ok('выключилась', !/ on/.test(e.button('Привязка').className));
  e.UST.commit(() => { e.frame().pos[A] = [20, 40]; });
  await e.wait(10);
  d = await dragTo(A, [61.2, 41]);
  await d.finish();
  t.ok('без привязки игрок встаёт точно куда вели', Math.abs(pos(A)[0] - 61.2) < 0.2, JSON.stringify(pos(A)));
  await e.press('Привязка');
  t.ok('включили обратно', /on/.test(e.button('Привязка').className));

  t.section('группой');
  e.UST.commit(() => { const f = e.frame(); f.pos[A] = [20, 40]; f.pos[B] = [60, 70]; });
  await e.wait(10);
  await e.tap(`[data-eid="${A}"] circle`, pos(A));
  await e.tap(`[data-eid="${B}"] circle`, pos(B), { shiftKey: true });
  t.ok('выбраны двое', e.App.sel.ids && e.App.sel.ids.length === 2);
  const gap = pos(B)[0] - pos(A)[0];
  d = await dragTo(A, [23.2, 40]);
  await d.finish();
  t.ok('ведущий прилип к линии штрафной', Math.abs(pos(A)[0] - 22) < 0.01, JSON.stringify(pos(A)));
  t.ok('расстояние внутри группы не изменилось', Math.abs((pos(B)[0] - pos(A)[0]) - gap) < 0.01, (pos(B)[0] - pos(A)[0]).toFixed(2));
  t.clean(e, 'этап 2в без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
