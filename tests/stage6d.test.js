// Этап 6г: справка по клавишам и жестам.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 6г — справка по клавишам');
  const e = await openApp();
  const UST = e.UST;

  t.section('содержание справки');
  const titles = UST.KEY_HELP.map(x => x[0]);
  t.ok('есть все разделы', titles.length === 4 && /Схема/.test(titles.join(' ')) && /показа/.test(titles.join(' ')), titles.join(' | '));
  const rows = UST.KEY_HELP.reduce((a, x) => a.concat(x[1]), []);
  t.ok('каждая строка — клавиша и объяснение', rows.every(r => r.length === 2 && r[0] && r[1]), rows.length);
  const all = JSON.stringify(UST.KEY_HELP);
  ['Ctrl + Z', 'Ctrl + A', 'Ctrl + Shift + V', 'Delete', 'PageUp', 'Пробел', 'Alt'].forEach(k => {
    t.ok('описан ' + k, all.indexOf(k) > 0);
  });
  t.ok('про докладчика тоже сказано', /докладчика/.test(all));
  t.ok('и про свайп на телефоне', /Свайп/.test(all));

  t.section('как открыть');
  await e.press('Открыть пример «Маятник»');
  await e.wait(50);
  t.ok('в шапке редактора есть кнопка справки', !!e.button('Клавиши и жесты'));
  await e.press('Клавиши и жесты');
  await e.wait(30);
  const dlg = () => e.$('.modal-ov');
  t.ok('справка открылась', !!dlg() && /Клавиши и жесты/.test(e.text(dlg())));
  t.ok('клавиши показаны отдельными значками', e.$$('.keys kbd', dlg()).length === rows.length, e.$$('.keys kbd', dlg()).length + ' из ' + rows.length);
  t.ok('и есть пояснение для телефона', /На телефоне/.test(e.text(dlg())));
  e.click(e.button('Закрыть', dlg()));
  await e.wait(20);
  t.ok('справка закрывается', !e.$('.modal-ov'));

  t.section('вопросительный знак');
  e.key('?');
  await e.wait(30);
  t.ok('по «?» справка открывается', !!e.$('.modal-ov') && /Клавиши и жесты/.test(e.text(e.$('.modal-ov'))));
  e.key('?');
  await e.wait(20);
  t.ok('второй раз поверх не открывается', e.$$('.modal-ov').length === 1, e.$$('.modal-ov').length);
  e.click(e.button('Закрыть', e.$('.modal-ov')));
  await e.wait(20);
  e.key('F1');
  await e.wait(30);
  t.ok('и по F1 тоже', !!e.$('.modal-ov'));
  e.click(e.button('Закрыть', e.$('.modal-ov')));
  await e.wait(20);

  t.section('во время набора текста не мешает');
  const inp = e.$('.ttl-inp');
  inp.focus();
  e.key('?', {}, inp);
  await e.wait(20);
  t.ok('при вводе названия «?» просто печатается', !e.$('.modal-ov'));
  t.clean(e, 'этап 6г без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
