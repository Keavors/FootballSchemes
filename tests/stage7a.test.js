// Этап 7а: версия формата с переносом старых файлов и резервная копия всех презентаций.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 7а — версия формата и резервная копия');
  const e = await openApp({ idb: true });
  const TE = e.TE, UST = e.UST;

  t.section('версия формата');
  const fresh = TE.normalizeProject({ slides: [] });
  t.ok('у новой презентации проставлена версия', fresh.v === TE.FORMAT_V && TE.FORMAT_V >= 1, fresh.v);
  const old = TE.normalizeProject({
    settings: { format: '8x8', pitch: { orientation: 'auto' } },
    slides: [{ id: 's1', layout: 'split', title: 'Старый', image: 'data:image/png;base64,iVBORw0KGgo=' }]
  });
  t.ok('старый файл получает нынешнюю версию', old.v === TE.FORMAT_V, old.v);
  t.ok('картинка-ссылка стала картинкой слайда', old.slides[0].image && old.slides[0].image.src === 'data:image/png;base64,iVBORw0KGgo=', JSON.stringify(old.slides[0].image));
  t.ok('и место показа проставилось', old.slides[0].image.place === 'body');
  t.ok('ориентация «авто» заменена', old.settings.pitch.orientation === 'vertical', old.settings.pitch.orientation);
  t.ok('перенос не трогает уже нынешние файлы', TE.normalizeProject({ v: TE.FORMAT_V, slides: [{ id: 'a', layout: 'text', image: 'мусор' }] }).slides[0].image === undefined);
  t.ok('файл из будущего распознаётся', TE.tooNew({ v: TE.FORMAT_V + 5 }) === true && TE.tooNew({ v: TE.FORMAT_V }) === false && TE.tooNew({}) === false);

  t.section('сборка копии');
  await e.press('Открыть пример «Маятник»');
  await e.wait(60);
  e.UST.commit(p => { p.title = 'Первая'; }, { parts: [] });
  await e.wait(700);
  await e.press('К списку презентаций');
  await e.wait(80);
  UST.addPaletteColor('#abcdef');
  const data = await UST.buildBackup();
  t.ok('в копии есть презентация', data.projects.length === 1 && data.projects[0].title === 'Первая', JSON.stringify(data.projects.map(p => p.title)));
  t.ok('копия подписана и датирована', data.kind === 'ustanovka-backup' && data.v === TE.FORMAT_V && data.made > 0);
  t.ok('и мои настройки внутри', (data.prefs.palette || []).indexOf('#abcdef') >= 0, JSON.stringify(data.prefs.palette));
  t.ok('чужой файл копией не считается', UST.parseBackup('{"slides":[]}') === null && UST.parseBackup('не json') === null);
  t.ok('свой — читается обратно', !!UST.parseBackup(JSON.stringify(data)));

  t.section('возврат из копии поверх старой');
  const idBefore = data.projects[0].id;
  e.UST.Prefs.palette = [];
  const res = await UST.restoreBackup(JSON.parse(JSON.stringify(data)), 'replace', true);
  t.ok('презентация заменена, а не задвоена', res.replaced === 1 && res.added === 0, JSON.stringify(res));
  const idx = await UST.Store.get('ustanovka-index');
  t.ok('в списке по-прежнему одна', JSON.parse(idx).length === 1, idx.slice(0, 80));
  t.ok('мои цвета вернулись', (e.UST.Prefs.palette || []).indexOf('#abcdef') >= 0, JSON.stringify(e.UST.Prefs.palette));

  t.section('возврат копиями рядом');
  const res2 = await UST.restoreBackup(JSON.parse(JSON.stringify(data)), 'copy', false);
  t.ok('добавилась вторая', res2.added === 1 && res2.replaced === 0, JSON.stringify(res2));
  const idx2 = JSON.parse(await UST.Store.get('ustanovka-index'));
  t.ok('теперь их две', idx2.length === 2, idx2.length);
  t.ok('и у копии своё имя', idx2.some(x => /из копии/.test(x.title)) && idx2.some(x => x.id === idBefore), JSON.stringify(idx2.map(x => x.title)));
  const broken = { kind: 'ustanovka-backup', v: 1, made: Date.now(), projects: [null, { slides: 'нет' }] };
  const res3 = await UST.restoreBackup(broken, 'copy', false);
  t.ok('битые записи пропускаются, а не ломают всё', res3.skipped >= 1 && res3.added === 0, JSON.stringify(res3));

  t.section('окно резервной копии');
  await e.press('Копия всех');
  await e.wait(40);
  const dlg = () => e.$$('.modal-ov').pop();
  t.ok('окно открылось', /Резервная копия/.test(e.text(dlg())));
  t.ok('есть и сохранение, и возврат', !!e.button('Сохранить копию', dlg()) && /Выбрать файл копии/.test(e.text(dlg())));
  await e.press('Сохранить копию', dlg());
  await e.wait(60);
  t.ok('файл сохраняется с понятным именем', /ustanovka-kopiya-\d{4}-\d{2}-\d{2}\.json/.test(e.text(e.$('.toast')) || ''), e.text(e.$('.toast')));
  const cl = e.button('Закрыть', dlg());
  if (cl) e.click(cl);
  await e.wait(20);
  UST.openRestore({ kind: 'ustanovka-backup', v: TE.FORMAT_V + 3, made: Date.now(), projects: [] }, null);
  await e.wait(30);
  t.ok('про копию из будущей версии предупреждаем', /более новой версии/.test(e.text(dlg())), e.text(dlg()).slice(0, 90));
  const cl2 = e.button('Закрыть', dlg());
  if (cl2) e.click(cl2);
  await e.wait(20);
  t.clean(e, 'этап 7а без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
