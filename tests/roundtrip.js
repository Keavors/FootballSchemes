// Проверка: экранирование при экспорте + извлечение при импорте не ломают данные.
const SEP = String.fromCharCode(0x2028), PSEP = String.fromCharCode(0x2029);
const RE_SEP = new RegExp(SEP, 'g'), RE_PSEP = new RegExp(PSEP, 'g');

const project = {
  title: 'Маятник <8x8> & "контратака"',
  slides: [{
    id: 'a1',
    title: 'Шаг </script> внутри текста',
    body: 'Юникод-разделители:' + SEP + PSEP + ' и кавычки «ёлочки» \\ backslash',
    board: { entities: [{ id: 'e1', label: 'ЛЗ' }], frames: [{ pos: { e1: [50, 60] }, cap: 'a < b && c > d' }] }
  }]
};

// --- как в buildExportHTML ---
const data = JSON.stringify(project)
  .replace(/</g, '\\u003c')
  .replace(RE_SEP, '\\u2028')
  .replace(RE_PSEP, '\\u2029');
const html =
  '<!DOCTYPE html>\n<head>\n<title>t</title>\n</head>\n<body>\n' +
  '<script type="application/json" id="te-data">' + data + '<\/script>\n' +
  '<script>var engine = 1;<\/script>\n</body>\n</html>\n';

// --- как в parseImported ---
const m = html.match(/<script[^>]*id=["']te-data["'][^>]*>([\s\S]*?)<\/script>/i);
if (!m) { console.log('FAIL: блок te-data не найден'); process.exit(1); }

let obj;
try { obj = JSON.parse(m[1]); } catch (e) { console.log('FAIL: JSON.parse ->', e.message); process.exit(1); }

const same = JSON.stringify(obj) === JSON.stringify(project);
console.log('te-data найден            :', true);
console.log('JSON.parse прошёл         :', true);
console.log('данные совпали побайтно   :', same);
console.log('title                     :', JSON.stringify(obj.title));
console.log('строка с закрывающим тегом:', JSON.stringify(obj.slides[0].title));
console.log('u2028/u2029 сохранены     :', obj.slides[0].body.indexOf(SEP) >= 0 && obj.slides[0].body.indexOf(PSEP) >= 0);
console.log('сырых "<" в данных нет    :', data.indexOf('<') === -1);
console.log('сырых u2028/u2029 нет     :', data.indexOf(SEP) === -1 && data.indexOf(PSEP) === -1);
console.log(same ? '\nRESULT: OK' : '\nRESULT: FAIL');
process.exit(same ? 0 : 1);
