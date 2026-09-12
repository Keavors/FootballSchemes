// Этап 2а: масштаб и сдвиг поля.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 2а — масштаб поля');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const vb = () => e.svg().getAttribute('viewBox').split(' ').map(Number);
  const full = e.App.canvasBoard.geo.vb.slice();
  const bar = () => e.$('.zoom-bar');
  const val = () => e.text(e.$('.zoom-val'));

  t.section('начальное состояние');
  t.ok('поле показано целиком', vb()[2] === full[2] && vb()[3] === full[3], vb().join(' '));
  t.ok('панель масштаба есть и показывает 100%', !!bar() && val() === '100%', val());
  t.ok('«отдалить» и «вписать» пока недоступны', e.button('Отдалить', bar()).disabled && e.button('Вписать поле целиком', bar()).disabled);

  t.section('кнопки');
  const data0 = JSON.stringify(e.App.project);
  await e.press('Приблизить', bar());
  t.ok('масштаб 125%', val() === '125%', val());
  t.ok('видимая часть поля уменьшилась', Math.abs(vb()[2] - full[2] / 1.25) < 0.1, vb().join(' '));
  t.ok('схема при этом не изменилась', JSON.stringify(e.App.project) === data0);
  t.ok('«Отменить» не появилось', e.$('#btnUndo').disabled);
  for (let i = 0; i < 14 && !e.button('Приблизить', bar()).disabled; i++) await e.press('Приблизить', bar());
  t.ok('масштаб упирается в 600%', val() === '600%', val());
  t.ok('дальше кнопка недоступна', e.button('Приблизить', bar()).disabled);
  await e.press('Вписать поле целиком', bar());
  t.ok('«Вписать» возвращает поле целиком', val() === '100%' && vb()[2] === full[2]);

  t.section('клавиши');
  e.key('+');
  await e.wait(10);
  t.ok('клавиша + приближает', val() === '125%', val());
  e.key('-');
  await e.wait(10);
  t.ok('клавиша − отдаляет', val() === '100%', val());
  e.key('+');
  e.key('+');
  await e.wait(10);
  e.key('0');
  await e.wait(10);
  t.ok('клавиша 0 вписывает поле', val() === '100%' && vb()[2] === full[2]);

  t.section('колесо мыши');
  const p = e.pt([25, 25]);
  const wheel = new e.win.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -120, clientX: p[0], clientY: p[1] });
  e.svg().dispatchEvent(wheel);
  await e.wait(10);
  t.ok('колесо вверх приближает', val() === '120%', val());
  const vbZoom = vb();
  t.ok('видимая часть не вылезает за поле', vbZoom[0] >= full[0] - 0.01 && vbZoom[1] >= full[1] - 0.01 && vbZoom[0] + vbZoom[2] <= full[0] + full[2] + 0.01);
  e.svg().dispatchEvent(new e.win.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120, clientX: p[0], clientY: p[1] }));
  await e.wait(10);
  t.ok('колесо вниз отдаляет', val() === '100%', val());

  t.section('щипок двумя пальцами');
  const c = e.pt([50, 50]);
  e.ptr(e.svg(), 'pointerdown', c[0] - 40, c[1], { pointerType: 'touch', pointerId: 11 });
  e.ptr(e.svg(), 'pointerdown', c[0] + 40, c[1], { pointerType: 'touch', pointerId: 12 });
  e.ptr(e.svg(), 'pointermove', c[0] - 80, c[1], { pointerType: 'touch', pointerId: 11 });
  e.ptr(e.svg(), 'pointermove', c[0] + 80, c[1], { pointerType: 'touch', pointerId: 12 });
  await e.wait(10);
  t.ok('пальцы развели — приблизилось', parseInt(val(), 10) > 150, val());
  e.ptr(e.svg(), 'pointerup', c[0] - 80, c[1], { pointerType: 'touch', pointerId: 11 });
  e.ptr(e.svg(), 'pointerup', c[0] + 80, c[1], { pointerType: 'touch', pointerId: 12 });
  await e.wait(10);
  t.ok('после щипка выделение не появилось', !e.App.sel);
  await e.press('Вписать поле целиком', bar());

  t.section('второй палец во время перетаскивания');
  const ent = e.board().entities.find(x => e.frame().pos[x.id]);
  const p0 = e.frame().pos[ent.id].slice();
  const a = e.pt(p0);
  const data1 = JSON.stringify(e.App.project);
  e.ptr(e.svg().querySelector(`[data-eid="${ent.id}"] circle`), 'pointerdown', a[0], a[1], { pointerType: 'touch', pointerId: 21 });
  e.ptr(e.svg(), 'pointermove', a[0] + 30, a[1] + 30, { pointerType: 'touch', pointerId: 21 });
  e.ptr(e.svg(), 'pointerdown', a[0] + 120, a[1], { pointerType: 'touch', pointerId: 22 });
  e.ptr(e.svg(), 'pointermove', a[0] + 200, a[1], { pointerType: 'touch', pointerId: 22 });
  await e.wait(15);
  e.ptr(e.svg(), 'pointerup', a[0] + 30, a[1] + 30, { pointerType: 'touch', pointerId: 21 });
  e.ptr(e.svg(), 'pointerup', a[0] + 200, a[1], { pointerType: 'touch', pointerId: 22 });
  await e.wait(15);
  t.ok('игрок не уехал: начатое перетаскивание отменено', JSON.stringify(e.App.project) === data1, JSON.stringify(e.frame().pos[ent.id]) + ' vs ' + JSON.stringify(p0));
  t.ok('при этом масштаб изменился', parseInt(val(), 10) > 100, val());

  t.section('переход на другой слайд');
  await e.gotoBoardSlide(1);
  t.ok('на новом слайде масштаб снова 100%', val() === '100%', val());
  t.clean(e, 'этап 2а без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
