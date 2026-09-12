// Этап 4е: картинки на слайдах.
const { openApp, suite } = require('./harness');

const PIC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

(async () => {
  const t = suite('Этап 4е — картинки на слайдах');
  const env = await openApp();
  const TE = env.TE;
  const host = () => { const d = env.doc.createElement('div'); env.doc.body.appendChild(d); return d; };

  t.section('проверка данных');
  const ok = TE.normalizeProject({ slides: [{ id: 'a', layout: 'text', image: { src: PIC, place: 'side', alt: 'Фото' } }] });
  t.ok('правильная картинка сохраняется', ok.slides[0].image.src === PIC && ok.slides[0].image.place === 'side' && ok.slides[0].image.alt === 'Фото');
  const bad = TE.normalizeProject({ slides: [{ id: 'b', layout: 'text', image: { alt: 'пусто' } }] });
  t.ok('битая — выбрасывается', bad.slides[0].image === undefined);
  const dflt = TE.normalizeProject({ slides: [{ id: 'c', layout: 'text', image: { src: PIC } }] });
  t.ok('по умолчанию картинка над текстом', dflt.slides[0].image.place === 'body');

  t.section('показ');
  const mk = (place, withBoard) => TE.normalizeProject({
    settings: { format: '8x8' },
    slides: [{
      id: 's', layout: withBoard ? 'split' : 'text', title: 'Слайд', body: 'Текст слайда',
      image: { src: PIC, place },
      board: withBoard ? { entities: [{ id: 'p', kind: 'ours' }], frames: [{ pos: { p: [50, 50] } }] } : null
    }]
  });
  const r1 = host();
  const v1 = TE.mountPresentation(r1, mk('body', false), {});
  t.ok('картинка показана', !!r1.querySelector('.te-img img') && r1.querySelector('.te-img img').src === PIC);
  t.ok('над текстом — обычной колонкой', !r1.querySelector('.te-img-split'));
  v1.destroy();
  const r2 = host();
  const v2 = TE.mountPresentation(r2, mk('side', false), {});
  t.ok('рядом с текстом — в две колонки', !!r2.querySelector('.te-img-split .te-img img') && !!r2.querySelector('.te-img-split .te-body'));
  v2.destroy();
  const r3 = host();
  const v3 = TE.mountPresentation(r3, mk('body', true), {});
  t.ok('на слайде со схемой картинка тоже помещается', !!r3.querySelector('.te-split .te-img img') && !!r3.querySelector('.te-split svg.te-svg'));
  v3.destroy();
  t.clean(env, 'движок без ошибок');
  env.close();

  t.section('в редакторе');
  const e = await openApp();
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  await e.press('Текст');
  await e.wait(20);
  t.ok('есть поле картинки', !!e.$('.img-box') && !!e.$('.img-box input[type=file]'));
  const input = e.$('.img-box input[type=file]');
  const file = new e.win.File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'photo.png', { type: 'image/png' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new e.win.Event('change', { bubbles: true }));
  await e.wait(200);
  const img = () => e.slide().image;
  t.ok('картинка добавилась на слайд', !!img() && /^data:image\/png/.test(img().src), img() && img().src.slice(0, 22));
  t.ok('в редакторе видно предпросмотр', !!e.$('.img-prev'));
  const fld = e.$$('.ed-pane .fld').find(x => /Где показывать/.test(e.text(x)));
  t.ok('есть выбор места', !!fld);
  e.click([...fld.querySelectorAll('button')].find(b => /Рядом/.test(e.text(b))));
  await e.wait(30);
  t.ok('место переключается', img().place === 'side');
  await e.press('Показ');
  await e.wait(60);
  t.ok('в показе картинка видна', !!e.$('.ed-preview .te-img img'));
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(20);

  t.section('отправка');
  const link = await e.UST.packProject(e.App.project);
  const back = await e.UST.unpackProject(link);
  t.ok('в ссылку на показ картинка не входит', back.slides.every(s => !s.image));
  const html = e.UST.buildExportHTML(e.UST.forExport(e.App.project, false));
  t.ok('а в файл презентации — входит', html.indexOf('data:image/png') > 0);
  await e.press('Экспорт');
  await e.wait(20);
  t.ok('в экспорте есть предупреждение про ссылку', /Картинки в ссылку не войдут/.test(e.text(e.$('.modal-ov'))));
  await e.press('Закрыть', e.$('.modal-ov'));
  await e.wait(15);
  await e.press('Текст');
  await e.wait(20);
  await e.press('Убрать');
  await e.wait(30);
  t.ok('картинку можно убрать', !e.slide().image && !e.$('.img-prev'));
  t.clean(e, 'этап 4е без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
