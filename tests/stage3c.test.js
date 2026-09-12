// Этап 3в: миниатюры шагов, перетаскивание шагов в ленте, промежуточный шаг.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 3в — лента шагов');
  const e = await openApp();
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const b = () => e.board(), f = () => e.frame();
  const chips = () => e.$$('#tlChips .tl-chip');

  t.section('миниатюры');
  t.ok('у шага есть миниатюра', !!e.$('#tlChips .tl-chip .tl-thumb'));
  const dots = e.$$('#tlChips .tl-chip .tl-thumb circle').length;
  const visible = b().entities.filter(x => f().pos[x.id]).length;
  t.ok('на миниатюре видны все игроки шага', dots >= visible, dots + ' точек при ' + visible + ' игроках');

  t.section('перетаскивание шагов');
  await e.press('Шаг');
  await e.wait(15);
  await e.press('Шаг');
  await e.wait(15);
  e.UST.commit(() => { b().frames.forEach((fr, k) => { fr.chapter = ['А', 'Б', 'В'][k]; }); });
  await e.wait(15);
  const order = () => b().frames.map(fr => fr.chapter).join('');
  t.ok('три шага в порядке А Б В', order() === 'АБВ', order());
  const stubRects = () => chips().forEach((el, i) => Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: i * 50, top: 0, width: 40, height: 40, right: i * 50 + 40, bottom: 40, x: i * 50, y: 0 })
  }));
  stubRects();
  const list = e.$('#tlChips');
  e.ptr(chips()[0], 'pointerdown', 20, 20);
  e.ptr(list, 'pointermove', 60, 20);
  e.ptr(list, 'pointermove', 120, 20);
  e.ptr(list, 'pointerup', 120, 20);
  await e.wait(20);
  t.ok('первый шаг переехал в конец', order() === 'БВА', order());
  t.ok('и остался выбранным', e.App.frameIdx === 2);
  e.key('z', { ctrlKey: true });
  await e.wait(20);
  t.ok('отмена возвращает порядок', order() === 'АБВ', order());

  t.section('обычное нажатие по шагу');
  stubRects();
  e.ptr(chips()[1], 'pointerdown', 70, 20);
  e.ptr(list, 'pointerup', 70, 20);
  e.click(chips()[1]);
  await e.wait(20);
  t.ok('короткое нажатие просто переключает шаг', e.App.frameIdx === 1);

  t.section('промежуточный шаг');
  const ids = b().entities.filter(x => f().pos[x.id]).slice(0, 1).map(x => x.id);
  e.UST.commit(() => {
    b().frames[0].pos[ids[0]] = [20, 20];
    b().frames[1].pos[ids[0]] = [60, 60];
    b().frames[1].dur = 1200;
  });
  await e.wait(15);
  e.App.frameIdx = 0;
  e.UST.refresh();
  await e.wait(15);
  const n0 = b().frames.length;
  await e.press('Ещё действия с шагом');
  await e.press('Шаг посередине', e.$('.pop'));
  await e.wait(20);
  t.ok('шаг добавлен следом', b().frames.length === n0 + 1 && e.App.frameIdx === 1);
  const mid = b().frames[1].pos[ids[0]];
  t.ok('игрок встал ровно посередине пути', Math.abs(mid[0] - 40) < 0.06 && Math.abs(mid[1] - 40) < 0.06, JSON.stringify(mid));
  t.ok('время поделено между двумя половинами', b().frames[1].dur === 600 && b().frames[2].dur === 600, b().frames[1].dur + ' и ' + b().frames[2].dur);
  e.App.frameIdx = b().frames.length - 1;
  e.UST.refresh();
  await e.wait(15);
  await e.press('Ещё действия с шагом');
  t.ok('на последнем шаге пункт недоступен', e.button('Шаг посередине', e.$('.pop')).disabled);
  e.key('Escape', {}, e.doc);
  await e.wait(10);
  t.clean(e, 'этап 3в без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
