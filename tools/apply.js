// Пакетные правки исходников: всё или ничего.
//   node tools/apply.js <файл-спецификации>
//
// Формат спецификации:
//   @@ FILE src/app/40-tools.js          — заменить кусок (OLD обязан встретиться ровно один раз)
//   --- OLD
//   ...точный текст...
//   --- NEW
//   ...замена...
//   @@ END
//
//   @@ APPEND src/styles/app.css         — дописать в конец файла
//   ...текст...
//   @@ END
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const spec = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');

const ops = [];
let cur = null;
spec.split('\n').forEach((line, n) => {
  if (line.indexOf('@@ ') === 0) {
    const head = line.slice(3).trim();
    if (head === 'END') {
      if (!cur) throw new Error('лишний END на строке ' + (n + 1));
      ops.push(cur);
      cur = null;
      return;
    }
    if (cur) throw new Error('блок «' + cur.head + '» не закрыт до строки ' + (n + 1));
    const sp = head.indexOf(' ');
    cur = { kind: head.slice(0, sp), file: head.slice(sp + 1).trim(), lines: [], head };
    return;
  }
  if (cur) cur.lines.push(line);
});
if (cur) throw new Error('блок «' + cur.head + '» не закрыт');

const cache = {};
const load = rel => {
  if (!(rel in cache)) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) throw new Error('нет файла ' + rel);
    cache[rel] = fs.readFileSync(p, 'utf8');
  }
  return cache[rel];
};

const problems = [];
ops.forEach(op => {
  try {
    if (op.kind === 'APPEND') {
      cache[op.file] = load(op.file).replace(/\s*$/, '') + '\n' + op.lines.join('\n').replace(/^\n+|\n+$/g, '') + '\n';
      return;
    }
    if (op.kind !== 'FILE') throw new Error('неизвестная операция ' + op.kind);
    const m = op.lines.join('\n').match(/^--- OLD\n([\s\S]*?)\n--- NEW\n([\s\S]*)$/);
    if (!m) throw new Error('нужен формат --- OLD / --- NEW');
    const text = load(op.file), hits = text.split(m[1]).length - 1;
    if (hits !== 1) throw new Error('фрагмент найден ' + hits + ' раз(а)');
    cache[op.file] = text.replace(m[1], () => m[2]);
  } catch (e) {
    problems.push(op.file + ': ' + e.message);
  }
});

if (problems.length) {
  console.log('НЕ ПРИМЕНЕНО, файлы не изменены:');
  problems.forEach(p => console.log('  - ' + p));
  process.exit(1);
}
Object.keys(cache).forEach(rel => fs.writeFileSync(path.join(ROOT, rel), cache[rel], 'utf8'));
console.log('Правок: ' + ops.length + ' в файлах: ' + Object.keys(cache).join(', '));
