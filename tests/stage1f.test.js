// Этап 1е: панель действий, правый клик, долгое нажатие.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 1е — действия над выделением');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const f = () => e.frame(), b = () => e.board();
  const bar = () => e.$('.act-bar');

  t.section('панель действий');
  t.ok('пока ничего не выбрано и буфер пуст — панели нет', !bar());
  const ent = b().entities.find(x => f().pos[x.id]);
  await e.tap(`[data-eid="${ent.id}"] circle`, f().pos[ent.id]);
  t.ok('после выбора игрока появилась панель', !!bar());
  t.ok('на панели есть копирование и удаление', !!e.button('Копировать', bar()) && !!e.button('Удалить', bar()));
  t.ok('кнопки «Вставить» пока нет', !e.button('Вставить', bar()));
  await e.press('Копировать', bar());
  await e.wait(10);
  t.ok('после копирования появилась «Вставить»', !!e.button('Вставить', bar()));
  const n0 = b().entities.length;
  await e.press('Вставить', bar());
  await e.wait(15);
  t.ok('кнопка «Вставить» работает', b().entities.length === n0 + 1);
  await e.press('Удалить', bar());
  await e.wait(15);
  t.ok('кнопка «Удалить» работает', b().entities.length === n0);

  t.section('правый клик по игроку');
  await e.tap(null, [50, 50]);
  const ent2 = b().entities.filter(x => f().pos[x.id])[1];
  const el = e.svg().querySelector(`[data-eid="${ent2.id}"] circle`);
  const pt = e.pt(f().pos[ent2.id]);
  el.dispatchEvent(new e.win.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: pt[0], clientY: pt[1] }));
  await e.wait(15);
  t.ok('открылось меню', !!e.$('.pop'));
  t.ok('игрок под курсором сразу выделен', e.App.sel && e.App.sel.t === 'ent' && e.App.sel.ids[0] === ent2.id);
  t.ok('в меню есть «Копировать» и «Удалить»', !!e.button('Копировать', e.$('.pop')) && !!e.button('Удалить', e.$('.pop')));
  await e.press('Копировать', e.$('.pop'));
  await e.wait(10);
  t.ok('меню закрылось после действия', !e.$('.pop'));

  t.section('вставка в точку');
  const empty = e.svg();
  const target = e.pt([25, 35]);
  empty.dispatchEvent(new e.win.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: target[0], clientY: target[1] }));
  await e.wait(15);
  t.ok('по пустому месту меню предлагает вставить сюда', !!e.button('Вставить сюда', e.$('.pop')));
  const before = b().entities.length;
  await e.press('Вставить сюда', e.$('.pop'));
  await e.wait(15);
  const added = b().entities[b().entities.length - 1];
  t.ok('вставился один объект', b().entities.length === before + 1);
  t.ok('и лёг именно в указанную точку', Math.abs(f().pos[added.id][0] - 25) < 0.6 && Math.abs(f().pos[added.id][1] - 35) < 0.6, JSON.stringify(f().pos[added.id]));

  t.section('долгое нажатие пальцем');
  await e.tap(null, [50, 50]);
  const ent3 = b().entities.filter(x => f().pos[x.id])[2];
  const p3 = e.pt(f().pos[ent3.id]);
  const el3 = e.svg().querySelector(`[data-eid="${ent3.id}"] circle`);
  e.ptr(el3, 'pointerdown', p3[0], p3[1], { pointerType: 'touch', pointerId: 7 });
  await e.wait(700);
  t.ok('через полсекунды открылось меню', !!e.$('.pop'));
  t.ok('игрок выделился', e.App.sel && e.App.sel.t === 'ent' && e.App.sel.ids[0] === ent3.id);
  e.ptr(e.svg(), 'pointerup', p3[0], p3[1], { pointerType: 'touch', pointerId: 7 });
  await e.wait(15);
  t.ok('отпускание пальца не сбрасывает выделение', e.App.sel && e.App.sel.ids[0] === ent3.id);
  e.key('Escape', {}, e.doc);
  await e.wait(10);
  t.ok('Esc закрывает меню', !e.$('.pop'));

  t.section('быстрое касание меню не открывает');
  const p4 = e.pt(f().pos[ent3.id]);
  e.ptr(el3, 'pointerdown', p4[0], p4[1], { pointerType: 'touch', pointerId: 8 });
  await e.wait(60);
  e.ptr(e.svg(), 'pointerup', p4[0], p4[1], { pointerType: 'touch', pointerId: 8 });
  await e.wait(700);
  t.ok('короткое касание меню не открыло', !e.$('.pop'));
  t.clean(e, 'этап 1е без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
