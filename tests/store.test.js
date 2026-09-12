// Тест хранилища: берём реальный код Store из ustanovka.html и гоняем в трёх окружениях.
const fs = require('fs'), vm = require('vm');
const SRC = fs.readFileSync(__dirname + '/../dist/ustanovka.html', 'utf8').split('\n');
// Находим блок по маркерам, а не по номерам строк — файл ещё будет меняться.
const start = SRC.findIndex(l => l.indexOf('const LS = (function') === 0);
const end = SRC.findIndex(l => l.indexOf('const IDX_KEY') === 0);
if (start < 0 || end < 0 || end <= start) { console.log('FAIL: блок Store не найден в ustanovka.html'); process.exit(1); }
const code = SRC.slice(start, end).join('\n');

function makeLocalStorage(limitBytes) {
  const map = new Map();
  let used = 0;
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      const add = String(v).length - (map.has(k) ? map.get(k).length : 0);
      if (limitBytes != null && used + add > limitBytes) {
        const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e;
      }
      used += add; map.set(k, String(v));
    },
    removeItem: k => { if (map.has(k)) { used -= map.get(k).length; map.delete(k); } },
    _map: map
  };
}

function run(name, win) {
  const ctx = { window: win, console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code + '\n;({ mode: Store.mode, Store })', ctx);
  return vm.runInContext('({ mode: Store.mode, Store })', ctx);
}

let failures = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) failures++;
  console.log((ok ? '  OK   ' : '  FAIL ') + label + ' -> ' + JSON.stringify(got) + (ok ? '' : ' (ждали ' + JSON.stringify(want) + ')'));
};

(async () => {
  console.log('1) Есть облачное window.storage');
  const cloudCalls = [];
  const cloud = run('cloud', {
    storage: {
      get: async k => { cloudCalls.push(['get', k]); return { value: 'cloudval' }; },
      set: async (k, v) => { cloudCalls.push(['set', k, v]); return true; },
      delete: async k => { cloudCalls.push(['del', k]); return true; }
    },
    localStorage: makeLocalStorage()
  });
  check('режим', cloud.mode, 'cloud');
  check('set', await cloud.Store.set('a', '1'), true);
  check('get', await cloud.Store.get('a'), 'cloudval');
  check("облако реально вызвано", cloudCalls.length, 2);

  console.log('\n2) Обычный браузер (localStorage работает) — это телефон Keavors');
  const ls = makeLocalStorage();
  const local = run('local', { localStorage: ls });
  check('режим', local.mode, 'local');
  check('set', await local.Store.set('ustanovka-p-x', '{"t":1}'), true);
  check('get вернул сохранённое', await local.Store.get('ustanovka-p-x'), '{"t":1}');
  check('данные лежат в localStorage', ls.getItem('ustanovka-p-x'), '{"t":1}');
  check('пробный ключ убран', ls._map.has('__ust_probe__'), false);
  await local.Store.del('ustanovka-p-x');
  check('после удаления', await local.Store.get('ustanovka-p-x'), null);
  check('нет ключа — null', await local.Store.get('нетТакого'), null);

  console.log('\n3) localStorage запрещён (приватный режим / заблокирован)');
  const blocked = run('blocked', {
    localStorage: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } }
  });
  check('режим', blocked.mode, 'memory');
  check('set не падает', await blocked.Store.set('k', 'v'), true);
  check('get из памяти', await blocked.Store.get('k'), 'v');

  console.log('\n4) localStorage вообще нет');
  const none = run('none', {});
  check('режим', none.mode, 'memory');
  check('set', await none.Store.set('k', 'v'), true);
  check('get', await none.Store.get('k'), 'v');

  console.log('\n5) Место в браузере кончилось на середине работы');
  const small = makeLocalStorage(40);
  const quota = run('quota', { localStorage: small });
  check('режим', quota.mode, 'local');
  check('маленькое влезло', await quota.Store.set('k1', 'x'.repeat(20)), true);
  check('большое -> сигнал quota', await quota.Store.set('k2', 'y'.repeat(500)), 'quota');
  check('работа НЕ потеряна (ушла в память)', await quota.Store.get('k2'), 'y'.repeat(500));
  check('старое на месте', await quota.Store.get('k1'), 'x'.repeat(20));

  console.log(failures ? '\nRESULT: FAIL (' + failures + ')' : '\nRESULT: OK — все проверки прошли');
  process.exit(failures ? 1 : 0);
})();
