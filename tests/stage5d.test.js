// Этап 5г: шрифты внутри файла и режим докладчика.
const { openApp, suite } = require('./harness');

const FAKE_CSS = `/* cyrillic-ext */
@font-face {
  font-family: 'Rubik';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/rubik/cyr-ext.woff2) format('woff2');
  unicode-range: U+0460-052F;
}
/* cyrillic */
@font-face {
  font-family: 'Rubik';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/rubik/cyr.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F;
}
/* vietnamese */
@font-face {
  font-family: 'Oswald';
  src: url(https://fonts.gstatic.com/s/oswald/viet.woff2) format('woff2');
}
/* latin */
@font-face {
  font-family: 'Oswald';
  src: url(https://fonts.gstatic.com/s/oswald/lat.woff2) format('woff2');
}
`;

(async () => {
  const t = suite('Этап 5г — шрифты в файле и докладчик');

  t.section('без интернета файл всё равно собирается');
  const off = await openApp();
  const none = await off.UST.fontsInline();
  t.ok('шрифты не скачались — возвращается пусто', none === '', JSON.stringify(none));
  const plainHTML = off.UST.buildExportHTML(off.TE.normalizeProject({ title: 'Тест', slides: [{ id: 's1', layout: 'title', title: 'Тест' }] }), '');
  t.ok('в файле остаётся обычная ссылка на шрифты', /fonts.googleapis.com/.test(plainHTML) && !/data:font/.test(plainHTML));
  t.clean(off, 'без интернета ошибок нет');
  off.close();

  t.section('шрифты складываются внутрь файла');
  const asked = [];
  const fetchStub = url => {
    asked.push(String(url));
    if (/css2/.test(String(url))) return Promise.resolve({ ok: true, text: () => Promise.resolve(FAKE_CSS) });
    return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new Uint8Array([119, 79, 70, 50, 7, 8]).buffer) });
  };
  const e = await openApp({ fetch: fetchStub });
  const css = await e.UST.fontsInline();
  t.ok('получился кусок стилей со шрифтами', /^<style>/.test(css) && /data:font\/woff2;base64,/.test(css), css.slice(0, 40));
  t.ok('кириллица и латиница взяты', (css.match(/@font-face/g) || []).length === 2, (css.match(/@font-face/g) || []).length);
  t.ok('лишние наборы букв пропущены', !asked.some(u => /-ext|viet/.test(u)), asked.filter(u => /-ext|viet/.test(u)).join(' '));
  t.ok('внешних ссылок на шрифты не осталось', !/url\(https:/.test(css));
  const P = e.TE.normalizeProject({ title: 'Тест', slides: [{ id: 's1', layout: 'title', title: 'Тест' }] });
  const html = e.UST.buildExportHTML(P, css);
  t.ok('в готовом файле шрифты внутри', /data:font\/woff2/.test(html) && !/fonts.googleapis.com/.test(html));
  const asked2 = asked.length;
  await e.UST.fontsInline();
  t.ok('второй раз качать не надо', asked.length === asked2, asked.length + ' вместо ' + asked2);

  t.section('переключатель в экспорте');
  await e.press('Открыть пример «Маятник»');
  await e.wait(50);
  await e.press('Экспорт');
  await e.wait(20);
  const togs = e.$$('.modal-ov label').map(l => e.text(l));
  t.ok('в экспорте есть выбор про шрифты', togs.some(s => /Зашить шрифты/.test(s)), togs.join(' | ').slice(0, 120));
  await e.press('Скачать .html');
  await e.wait(40);
  t.ok('файл собрался и качается', /сохраняется|Сохранено|\.html/i.test(e.text(e.$('.toast')) || ''), e.text(e.$('.toast')));
  const close = e.button('Закрыть', e.$('.modal-ov'));
  if (close) e.click(close);
  await e.wait(20);

  t.section('режим докладчика');
  /* Своё «второе окно»: настоящее всплывающее окно в тестах не открыть */
  const opened = [];
  e.win.open = () => {
    const d = e.doc.implementation.createHTMLDocument('');
    const w = { closed: false, document: d, focused: 0, focus() { w.focused++; }, close() { w.closed = true; } };
    opened.push(w);
    return w;
  };
  await e.gotoBoardSlide(0);
  await e.press('Показ');
  await e.wait(60);
  const prev = () => e.$('.ed-preview');
  t.ok('в шапке показа есть кнопка «Докладчик»', !!e.button('Докладчик', prev()));
  await e.press('Докладчик', prev());
  await e.wait(30);
  const w = opened[0];
  const d = w && w.document;
  const txt = id => (d.getElementById(id) || {}).textContent || '';
  t.ok('второе окно открылось', !!d && !!d.getElementById('p-wrap-check') === false && !!d.getElementById('p-num'));
  t.ok('видно номер слайда', /Слайд \d+ из \d+/.test(txt('p-num')), txt('p-num'));
  t.ok('видно заголовок слайда', txt('p-title').length > 0, txt('p-title'));
  t.ok('таймер пошёл с нуля', /^\d\d:\d\d$/.test(txt('p-time')), txt('p-time'));
  t.ok('подсказано, что дальше', /Дальше:|последний слайд/.test(txt('p-next')), txt('p-next'));
  t.ok('показ предупредил про второе окно', /второе окно|Второе окно/.test(e.text(e.$('.te-flash')) || ''), e.text(e.$('.te-flash')));

  const was = e.text(e.$('.ed-preview .te-where'));
  d.getElementById('p-go').onclick();
  await e.wait(40);
  t.ok('кнопка «Дальше» листает показ', e.text(e.$('.ed-preview .te-where')) !== was, was + ' → ' + e.text(e.$('.ed-preview .te-where')));
  t.ok('и второе окно обновилось', /Слайд 2 из/.test(txt('p-num')), txt('p-num'));
  d.getElementById('p-prev').onclick();
  await e.wait(40);
  t.ok('и листает назад', /Слайд 1 из/.test(txt('p-num')), txt('p-num'));

  t.section('заметки докладчика');
  const notesHTML = () => (d.getElementById('p-notes') || {}).innerHTML || '';
  t.ok('без заметок честно об этом сказано', /Заметок к этому слайду нет/.test(notesHTML()) || /<p>/.test(notesHTML()), notesHTML().slice(0, 60));
  await e.press('Закрыть', prev());
  await e.wait(30);
  e.App.project.slides[e.App.slideIdx].notes = 'Скажи про **прессинг**\n- и про откат';
  await e.press('Показ');
  await e.wait(60);
  await e.press('Докладчик', prev());
  await e.wait(30);
  const d2 = opened[opened.length - 1].document;
  const n2 = (d2.getElementById('p-notes') || {}).innerHTML || '';
  t.ok('заметки слайда попали во второе окно', /прессинг/.test(n2) && /<b>|<li>/.test(n2), n2.slice(0, 80));

  t.section('окно закрывается вместе с показом');
  const last = opened[opened.length - 1];
  await e.press('Закрыть', prev());
  await e.wait(30);
  t.ok('второе окно закрыто', last.closed === true);
  t.ok('повторный показ открывает новое окно', opened.length === 2, opened.length);
  t.clean(e, 'этап 5г без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
