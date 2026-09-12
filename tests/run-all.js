// Прогон всех тестов: node tests/run-all.js [часть-имени]
// Перед прогоном пересобирает dist, чтобы тесты всегда шли по свежей сборке.
const fs = require('fs'), path = require('path'), { execFileSync, spawnSync } = require('child_process');

const DIR = __dirname, ROOT = path.join(DIR, '..');
const filter = process.argv[2] || '';

console.log('Сборка…');
try {
  execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { stdio: 'inherit' });
} catch (e) {
  console.log('Сборка не удалась — тесты не запускаю.');
  process.exit(2);
}

const weight = f => (f.indexOf('smoke') === 0 ? 0 : 1);
const files = fs.readdirSync(DIR)
  .filter(f => /\.test\.js$/.test(f) && (!filter || f.indexOf(filter) >= 0))
  .sort((a, b) => weight(a) - weight(b) || a.localeCompare(b, 'ru', { numeric: true }));

if (!files.length) { console.log('Тесты не найдены'); process.exit(1); }

let passed = 0, failed = 0, broken = 0;
const rows = [];
files.forEach(f => {
  const r = spawnSync(process.execPath, [path.join(DIR, f)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const sums = [...out.matchAll(/^(.+): (\d+) прошло, (\d+) упало$/gm)];
  const ok = sums.reduce((s, m) => s + +m[2], 0);
  const bad = sums.reduce((s, m) => s + +m[3], 0);
  passed += ok;
  failed += bad;
  if (r.status !== 0 && !bad) broken++;
  rows.push({ f, ok, bad, status: r.status, out });
  const mark = r.status === 0 ? 'OK  ' : 'СБОЙ';
  console.log(`  ${mark} ${f.replace('.test.js', '').padEnd(22)} ${String(ok).padStart(3)} прошло` + (bad ? `, ${bad} упало` : ''));
  if (r.status !== 0) {
    out.split('\n').filter(l => /FAIL|ТЕСТ УПАЛ|ИСКЛЮЧЕНИЕ/.test(l)).slice(0, 8).forEach(l => console.log('        ' + l.trim()));
  }
});

console.log(`\nИТОГО: ${passed} прошло, ${failed} упало` + (broken ? `, ${broken} файлов не отработали` : ''));
process.exit(failed || broken ? 1 : 0);
