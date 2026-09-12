// Этап 4г: миниатюры и перетаскивание слайдов, заметки для себя, скрытые слайды.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 4г — список слайдов, заметки, скрытые');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  const items = () => e.$$('#slList .sl-item');
  const slides = () => e.App.project.slides;

  t.section('миниатюры');
  t.ok('у слайдов со схемой есть миниатюра поля', e.$$('#slList .sl-thumb').length > 0, e.$$('#slList .sl-thumb').length);
  t.ok('у текстовых слайдов — значок макета', e.$$('#slList .sl-thumb-icon').length > 0, e.$$('#slList .sl-thumb-icon').length);
  t.ok('миниатюра показывает игроков', e.$$('#slList .sl-thumb circle').length > 0);

  t.section('перетаскивание слайдов');
  const titles = () => slides().map(s => s.title).join(' | ');
  const before = slides()[0].title;
  const stub = () => items().forEach((el, i) => Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: i * 60, width: 200, height: 50, right: 200, bottom: i * 60 + 50, x: 0, y: i * 60 })
  }));
  stub();
  const list = e.$('#slList');
  e.ptr(items()[0], 'pointerdown', 50, 20);
  e.ptr(list, 'pointermove', 50, 80);
  e.ptr(list, 'pointermove', 50, 145);
  e.ptr(list, 'pointerup', 50, 145);
  await e.wait(25);
  t.ok('слайд переехал на третье место', slides()[2].title === before, titles().slice(0, 60));
  t.ok('и стал выбранным', e.App.slideIdx === 2);
  e.key('z', { ctrlKey: true });
  await e.wait(25);
  t.ok('отмена возвращает порядок', slides()[0].title === before);

  t.section('обычное нажатие по слайду');
  stub();
  e.ptr(items()[1], 'pointerdown', 50, 80);
  e.ptr(list, 'pointerup', 50, 80);
  e.click(items()[1].querySelector('.sl-main'));
  await e.wait(25);
  t.ok('короткое нажатие просто открывает слайд', e.App.slideIdx === 1);

  t.section('скрытый слайд');
  const n0 = slides().length;
  await e.press('Ещё действия со слайдом');
  await e.press('Скрыть из показа', e.$('.pop'));
  await e.wait(25);
  t.ok('слайд помечен скрытым', slides()[1].hidden === true);
  t.ok('в списке видно пометку', /скрыт/.test(e.text(items()[1])));
  await e.press('Показ');
  await e.wait(50);
  t.ok('в показе слайдов на один меньше', e.$$('.ed-preview .te-slide').length === n0 - 1, e.$$('.ed-preview .te-slide').length + ' из ' + n0);
  t.ok('показ открылся на видимом слайде', !!e.$('.ed-preview .te-slide.on'));
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(20);
  await e.press('Ещё действия со слайдом');
  t.ok('в меню теперь «Показывать в показе»', !!e.button('Показывать в показе', e.$('.pop')));
  await e.press('Показывать в показе', e.$('.pop'));
  await e.wait(25);
  t.ok('слайд снова виден', !slides()[1].hidden);

  t.section('заметки для себя');
  await e.press('Текст');
  await e.wait(20);
  const fld = e.$$('.ed-pane .fld').find(x => /Заметки для себя/.test(e.text(x)));
  t.ok('есть поле заметок', !!fld);
  e.input(fld.querySelector('textarea'), 'Сказать про компактность');
  await e.wait(25);
  t.ok('заметка сохранилась', slides()[e.App.slideIdx].notes === 'Сказать про компактность');
  await e.press('Показ');
  await e.wait(40);
  t.ok('в показе заметки не видны', !/Сказать про компактность/.test(e.text(e.$('.ed-preview'))));
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(20);
  const clean = e.UST.forExport(e.App.project, false);
  t.ok('в файле для команды заметок нет', clean.slides.every(s => s.notes === undefined));
  t.ok('но сами данные целы', clean.slides.length === slides().length && clean.slides[1].title === slides()[1].title);
  const withNotes = e.UST.forExport(e.App.project, true);
  t.ok('по желанию заметки можно включить', withNotes.slides.some(s => s.notes === 'Сказать про компактность'));
  const link = await e.UST.packProject(e.App.project);
  const back = await e.UST.unpackProject(link);
  t.ok('в ссылке на показ заметок тоже нет', back.slides.every(s => !s.notes));
  await e.press('Экспорт');
  await e.wait(20);
  t.ok('в окне экспорта есть переключатель заметок', !!e.$$('.modal-ov .tog').find(x => /заметки/.test(e.text(x))));
  await e.press('Закрыть', e.$('.modal-ov'));
  await e.wait(15);
  t.clean(e, 'этап 4г без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
