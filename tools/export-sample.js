// Пример «Маятник» отдельным файлом презентации — тем самым, что кидают команде.
//   node tools/export-sample.js            — сохранить mayatnik-taktika-8x8.html в корне проекта
//   node tools/export-sample.js путь.html  — сохранить в другое место
// Собирает приложение, открывает его в безоконном браузере и экспортирует пример со встроенными шрифтами.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'mayatnik-taktika-8x8.html'));
/* Google отдаёт лёгкие шрифты woff2 только настоящему браузеру */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { stdio: 'inherit' });
const { openApp } = require(path.join(ROOT, 'tests', 'harness'));

(async () => {
  const netFetch = (url, o) => fetch(url, Object.assign({}, o, { headers: Object.assign({ 'User-Agent': UA }, o && o.headers) }));
  const e = await openApp({ fetch: netFetch });
  const p = e.UST.pendulumProject();
  let css = '';
  try { css = await e.UST.fontsInline(); } catch (err) { css = ''; }
  const html = e.UST.buildExportHTML(e.UST.forExport(p, false), css);
  fs.writeFileSync(OUT, html, 'utf8');
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  console.log(`Сохранено: ${path.relative(ROOT, OUT) || OUT} — ${kb} КБ, ${p.slides.length} слайдов, шрифты ${css ? 'внутри файла' : 'по ссылке (скачать не вышло)'}`);
  e.close();
  process.exit(0);
})().catch(err => { console.error(err && err.stack || err); process.exit(1); });
