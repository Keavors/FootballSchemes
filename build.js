// Сборка: модули src/** → один файл dist/ustanovka.html и папка сайта dist/site/.
//   node build.js            — собрать
//   node build.js --check    — собрать в памяти и сверить с ustanovka.html (байт в байт)
//   node build.js --version=2026.09.12-1 — заодно проставить версию в мета-теге
const fs = require('fs'), path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'build.json'), 'utf8'));
const read = rel => fs.readFileSync(path.join(SRC, rel), 'utf8');

function script(sec) {
  return sec.prologue + sec.files.map(read).join('\n') + sec.epilogue;
}
function build(version) {
  let out = read(cfg.shell)
    .replace('{{CSS_ENGINE}}', () => read(cfg.css.engine))
    .replace('{{CSS_APP}}', () => read(cfg.css.app))
    .replace('{{JS_ENGINE}}', () => script(cfg.engine))
    .replace('{{JS_APP}}', () => script(cfg.app));
  if (version) out = out.replace(/(<meta name="app-version" content=")[^"]*(">)/, (m, a, b) => a + version + b);
  return out;
}
function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  fs.readdirSync(from, { withFileTypes: true }).forEach(d => {
    const src = path.join(from, d.name), dst = path.join(to, d.name);
    if (d.isDirectory()) n += copyDir(src, dst);
    else { fs.copyFileSync(src, dst); n++; }
  });
  return n;
}

const args = process.argv.slice(2);
const version = (args.find(a => a.indexOf('--version=') === 0) || '').split('=')[1] || '';
const out = build(version);

if (args.indexOf('--check') >= 0) {
  const refPath = path.join(ROOT, 'ustanovka.html');
  if (!fs.existsSync(refPath)) { console.log('Нечем сверять: нет ustanovka.html'); process.exit(1); }
  const ref = fs.readFileSync(refPath, 'utf8');
  if (ref === out) { console.log('Сверка: собранный файл совпадает с исходным байт в байт (' + out.length + ' символов)'); process.exit(0); }
  console.log('РАСХОЖДЕНИЕ! Длина: было ' + ref.length + ', стало ' + out.length);
  const n = Math.min(ref.length, out.length);
  let i = 0;
  while (i < n && ref[i] === out[i]) i++;
  console.log('Первое отличие на позиции ' + i + ' (строка ' + (ref.slice(0, i).split('\n').length) + ')');
  console.log('  было:  ' + JSON.stringify(ref.slice(i, i + 120)));
  console.log('  стало: ' + JSON.stringify(out.slice(i, i + 120)));
  process.exit(1);
}

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'ustanovka.html'), out, 'utf8');
const siteDir = path.join(DIST, 'site');
fs.mkdirSync(siteDir, { recursive: true });
fs.writeFileSync(path.join(siteDir, 'index.html'), out, 'utf8');
const copied = copyDir(path.join(SRC, 'site'), siteDir);
const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`Собрано: dist/ustanovka.html (${kb} КБ), dist/site/ (index.html + ${copied} файлов)`);
