// Этап 5в: картинка шага (PNG) и печать / PDF.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 5в — картинка и печать');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(50);
  await e.gotoBoardSlide(0);

  t.section('какие шаги попадают на бумагу');
  const mk = n => e.TE.normalizeBoard({ entities: [], frames: Array.from({ length: n }, () => ({ pos: {} })) });
  t.ok('мало шагов — печатаем все', JSON.stringify(e.UST.printFrames(mk(3))) === '[0,1,2]', JSON.stringify(e.UST.printFrames(mk(3))));
  const many = mk(9);
  t.ok('много шагов — не больше четырёх', e.UST.printFrames(many).length <= 4, JSON.stringify(e.UST.printFrames(many)));
  const withCh = mk(9);
  withCh.frames[3].chapter = 'Вторая';
  withCh.frames[6].chapter = 'Третья';
  t.ok('если есть главы — печатаем их начала и финал', JSON.stringify(e.UST.printFrames(withCh)) === '[0,3,6,8]', JSON.stringify(e.UST.printFrames(withCh)));

  t.section('картинка PNG');
  const snap = e.UST.snapshotBoard(e.board(), 0);
  t.ok('схема перерисовывается начисто', !!snap.svg && snap.svg.querySelectorAll('[data-eid]').length > 0 && !snap.svg.querySelector('.te-over'));
  const url = await new Promise(res => e.UST.svgToPNG(snap.svg, 400, res));
  snap.free();
  t.ok('без поддержки холста честно возвращается пусто', url === '', JSON.stringify(url).slice(0, 30));
  await e.press('Экспорт');
  await e.wait(20);
  const card = e.$$('.modal-ov .exp-card').find(c => /Картинка и печать/.test(e.text(c)));
  t.ok('в экспорте есть карточка картинки и печати', !!card);
  await e.press('Картинка PNG', card);
  await e.wait(60);
  t.ok('в этом браузере честно сообщаем, что картинку не сделать', /не умеет сохранять картинку/.test(e.text(e.$('.toast')) || ''), e.text(e.$('.toast')));

  t.section('печать');
  await e.press('Печать / PDF', e.$('.modal-ov .exp-card:last-child') || e.$('.modal-ov'));
  await e.wait(60);
  const root = () => e.$('.print-root');
  t.ok('окно печати собралось', !!root() && e.doc.body.classList.contains('printing'));
  const pages = () => e.$$('.print-page');
  const visible = e.App.project.slides.filter(s => !s.hidden).length;
  t.ok('страниц столько же, сколько видимых слайдов', pages().length === visible, pages().length + ' из ' + visible);
  t.ok('на страницах есть схемы', e.$$('.print-cell svg').length > 0, e.$$('.print-cell svg').length);
  t.ok('и подписи к шагам', e.$$('.print-cell small').length > 0);
  t.ok('есть текст слайдов', /Маятник|игра|оборон/i.test(e.text(root())));
  await e.press('Закрыть', root());
  await e.wait(20);
  t.ok('окно печати закрывается', !e.$('.print-root') && !e.doc.body.classList.contains('printing'));

  t.section('скрытые слайды не печатаются');
  await e.press('Ещё действия со слайдом');
  await e.press('Скрыть из показа', e.$('.pop'));
  await e.wait(25);
  e.UST.openPrint();
  await e.wait(60);
  t.ok('скрытый слайд на бумагу не попал', e.$$('.print-page').length === visible - 1, e.$$('.print-page').length + ' из ' + (visible - 1));
  await e.press('Закрыть', e.$('.print-root'));
  await e.wait(20);
  t.clean(e, 'этап 5в без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
