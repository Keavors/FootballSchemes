// Этап 5а: маркер поверх схемы, скорость показа, листание шагов касанием.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 5а — разбор во время показа');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(50);
  await e.gotoBoardSlide(0);
  await e.press('Показ');
  await e.wait(60);
  const prev = () => e.$('.ed-preview');
  const svg = () => e.$('.ed-preview .te-slide.on svg.te-svg');
  const strokes = () => e.$$('.ed-preview .te-draw .te-stroke');
  t.ok('показ открыт на схеме', !!svg());

  t.section('маркер');
  const markBtn = e.button('Рисовать поверх схемы', prev());
  const speedBtn = e.$$('.ed-preview .te-speed-btn')[0];
  t.ok('в шапке есть маркер и скорость', !!markBtn && !!speedBtn);
  t.ok('панель маркера спрятана', e.$('.ed-preview .te-draw-bar').hidden === true);
  e.click(markBtn);
  await e.wait(20);
  t.ok('маркер включился', e.$('.ed-preview .te-draw-bar').hidden === false && markBtn.getAttribute('aria-pressed') === 'true');
  const draw = (x1, y1, x2, y2) => {
    e.ptr(svg(), 'pointerdown', x1, y1);
    e.ptr(e.$('.ed-preview .te-stage'), 'pointermove', (x1 + x2) / 2, (y1 + y2) / 2);
    e.ptr(e.$('.ed-preview .te-stage'), 'pointermove', x2, y2);
    e.ptr(e.$('.ed-preview .te-stage'), 'pointerup', x2, y2);
  };
  draw(100, 100, 260, 320);
  await e.wait(20);
  t.ok('линия нарисовалась', strokes().length === 1 && /L/.test(strokes()[0].getAttribute('d')), strokes().length ? strokes()[0].getAttribute('d').slice(0, 30) : '');
  t.ok('цвет по умолчанию жёлтый', strokes()[0].getAttribute('stroke') === '#ffe066');
  const red = e.$$('.ed-preview .te-draw-col')[1];
  e.click(red);
  draw(120, 140, 200, 200);
  await e.wait(20);
  t.ok('можно сменить цвет', strokes().length === 2 && strokes()[1].getAttribute('stroke') === '#ff5a4e');
  await e.press('Стереть', e.$('.ed-preview .te-draw-bar'));
  t.ok('«Стереть» убирает нарисованное', strokes().length === 0);

  t.section('листание касанием');
  const step = () => e.text(e.$('.ed-preview .te-step'));
  const was = step();
  e.click(svg());
  await e.wait(30);
  t.ok('при включённом маркере касание шаг не листает', step() === was, was + ' → ' + step());
  await e.press('Готово', e.$('.ed-preview .te-draw-bar'));
  t.ok('маркер выключился', e.$('.ed-preview .te-draw-bar').hidden === true && !e.$('.ed-preview .te-app').classList.contains('te-marking'));
  e.click(svg());
  await e.wait(60);
  t.ok('без маркера касание по схеме листает шаг', step() !== was, was + ' → ' + step());

  t.section('скорость');
  t.ok('по умолчанию обычная скорость', e.text(speedBtn) === '1×');
  e.click(speedBtn);
  await e.wait(15);
  t.ok('переключается на полторы', e.text(speedBtn) === '1,5×', e.text(speedBtn));
  e.click(speedBtn);
  e.click(speedBtn);
  await e.wait(15);
  t.ok('и дальше по кругу', e.text(speedBtn) === '0,5×', e.text(speedBtn));

  t.section('переход на другой слайд');
  e.click(markBtn);
  draw(140, 160, 240, 260);
  await e.wait(20);
  t.ok('нарисовали снова', strokes().length === 1);
  e.click(e.$('.ed-preview .te-navbtn.te-primary'));
  await e.wait(60);
  e.click(e.$$('.ed-preview .te-navbtn')[0]);
  await e.wait(60);
  t.ok('при возврате на слайд рисунок стёрт', strokes().length === 0);
  await e.press('Готово', e.$('.ed-preview .te-draw-bar'));
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(20);
  t.ok('показ закрылся', !e.$('.ed-preview'));
  t.clean(e, 'этап 5а без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
