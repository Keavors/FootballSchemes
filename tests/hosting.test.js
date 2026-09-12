// Проверка хостинга: файлы сайта, иконки, манифест, офлайн-режим, установка, обновления, ссылки на показ.
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib'), crypto = require('crypto');
const { loadApp } = require(path.join(__dirname, 'load-app.js'));

const SITE = __dirname + '/../dist/site';
const APP_FILE = __dirname + '/../dist/ustanovka.html';
const BASE = 'https://u.github.io/ustanovka/';

let passed = 0, failed = 0;
function ok(label, cond, info) {
  if (cond) passed++; else failed++;
  console.log((cond ? '  OK   ' : '  FAIL ') + label + (info !== undefined && info !== '' ? ' -> ' + info : ''));
}
const title = t => console.log('\n' + t);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, ms = 2000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(10); } return !!fn(); }

/* ---------- PNG ---------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function readPNG(file) {
  const b = fs.readFileSync(file);
  const sig = b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  let off = 8, w = 0, h = 0, crcOk = true, last = '';
  const idat = [];
  while (off + 12 <= b.length) {
    const len = b.readUInt32BE(off), type = b.toString('ascii', off + 4, off + 8);
    if (crc32(b.slice(off + 4, off + 8 + len)) !== b.readUInt32BE(off + 8 + len)) crcOk = false;
    const data = b.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    if (type === 'IDAT') idat.push(data);
    last = type;
    off += 12 + len;
  }
  let rawOk = false;
  try { rawOk = zlib.inflateSync(Buffer.concat(idat)).length === (w * 3 + 1) * h; } catch (e) { rawOk = false; }
  return { sig, w, h, crcOk, rawOk, last };
}

/* ---------- мини-DOM для кода приложения ---------- */
class FakeNode {
  constructor(tag, text) {
    this.tagName = tag ? String(tag).toUpperCase() : '#text';
    this.children = []; this.attrs = {}; this.style = {}; this.listeners = {}; this.dataset = {};
    this.parent = null; this._text = text == null ? '' : String(text); this._cls = '';
  }
  get className() { return this._cls; }
  set className(v) { this._cls = String(v); }
  get classList() {
    const n = this;
    return { add: c => { n._cls = (n._cls + ' ' + c).trim(); }, remove: c => { n._cls = n._cls.split(/\s+/).filter(x => x !== c).join(' '); }, toggle() {}, contains: c => n._cls.split(/\s+/).indexOf(c) >= 0 };
  }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.children = []; this._text = String(v); }
  get innerHTML() { return this._html || ''; }
  set innerHTML(v) { this._html = String(v); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  hasAttribute(k) { return k in this.attrs; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  removeEventListener() {}
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null; } }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  focus() {}
  select() {}
}
function findAll(node, pred, out = []) { if (pred(node)) out.push(node); node.children.forEach(c => findAll(c, pred, out)); return out; }
const hasClass = cls => n => n.className.split(/\s+/).indexOf(cls) >= 0;

function siteEnv(o) {
  o = Object.assign({ protocol: 'https:', ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/140', standalone: false, version: null, withApp: false, fetch: null, compression: true, hash: '' }, o);
  const env = { swReg: [], timers: [], win: {}, doc: {}, replaced: [], shown: [], destroyed: 0 };
  const body = new FakeNode('body'), slot = new FakeNode('div'), appRoot = new FakeNode('div');
  const on = bag => (t, f) => { (bag[t] = bag[t] || []).push(f); };
  const file = o.protocol === 'file:';
  env.body = body; env.slot = slot; env.appRoot = appRoot;
  env.location = { protocol: o.protocol, hash: o.hash, href: (file ? 'file:///D:/ustanovka.html' : BASE) + o.hash, origin: file ? 'null' : 'https://u.github.io', pathname: file ? '/D:/ustanovka.html' : '/ustanovka/', search: '' };
  const extra = {
    Node: FakeNode,
    location: env.location,
    history: { replaceState: (s, t, u) => { env.replaced.push(String(u)); env.location.hash = ''; env.location.href = String(u); }, pushState() {} },
    navigator: {
      userAgent: o.ua, onLine: true, platform: 'Linux', maxTouchPoints: 5, standalone: o.standalone,
      serviceWorker: { register: u => { env.swReg.push(u); return Promise.resolve({}); } }
    },
    matchMedia: q => ({ matches: q.indexOf('standalone') >= 0 ? !!o.standalone : false, addEventListener() {} }),
    addEventListener: on(env.win),
    setTimeout: (fn, ms, ...a) => { if (ms >= 10000) { env.timers.push({ fn, ms }); return 0; } return setTimeout(fn, ms, ...a); },
    fetch: o.fetch || (() => Promise.reject(new TypeError('offline'))),
    document: {
      body, head: new FakeNode('head'), documentElement: new FakeNode('html'), activeElement: null, visibilityState: 'visible',
      createElement: t => new FakeNode(t),
      createTextNode: t => new FakeNode(null, t),
      querySelector: sel => (sel === '#installSlot' ? slot : sel === '#app' ? (o.withApp ? appRoot : null) : sel.indexOf('app-version') >= 0 ? (o.version ? { content: o.version } : null) : null),
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: on(env.doc),
      removeEventListener() {}
    }
  };
  if (!o.compression) extra.CompressionStream = undefined;
  env.ctx = loadApp(APP_FILE, extra);
  env.ctx.TE.mountPresentation = (ov, p, opts) => { env.shown.push({ ov, p, opts }); return { destroy() { env.destroyed++; }, go() {} }; };
  return env;
}

/* ---------- сервис-воркер в песочнице ---------- */
function makeSW(src, fetchImpl) {
  const store = new Map();
  const key = k => (typeof k === 'string' ? new URL(k, BASE).href : k.url);
  const handlers = {};
  const env = { store, handlers, flags: {} };
  const cacheFor = name => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      async match(k, opt) {
        const u = key(k);
        if (m.has(u)) return m.get(u).clone();
        if (opt && opt.ignoreSearch) for (const [kk, v] of m) if (kk.split('?')[0] === u.split('?')[0]) return v.clone();
        return undefined;
      },
      async put(k, res) { m.set(key(k), res); },
      async addAll(list) {
        for (const u of list) {
          const res = await ctx.fetch({ url: key(u), method: 'GET', mode: 'cors' });
          if (!res.ok) throw new Error('addAll: ' + u);
          m.set(key(u), res);
        }
      }
    };
  };
  const ctx = {
    URL, Response, console, Promise,
    setTimeout: (fn, ms, ...a) => setTimeout(fn, Math.min(ms, 40), ...a),
    caches: { open: async n => cacheFor(n), keys: async () => [...store.keys()], delete: async n => store.delete(n) },
    fetch: req => fetchImpl(req),
    addEventListener: (t, f) => { handlers[t] = f; },
    registration: { scope: BASE },
    location: { origin: 'https://u.github.io' },
    skipWaiting: async () => { env.flags.skip = true; },
    clients: { claim: async () => { env.flags.claim = true; } }
  };
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'sw.js' });
  env.setFetch = f => { fetchImpl = f; };
  env.fire = (type, request) => {
    const ev = { request, waits: [], resp: undefined, waitUntil(p) { this.waits.push(Promise.resolve(p)); }, respondWith(p) { this.resp = Promise.resolve(p); } };
    handlers[type](ev);
    return ev;
  };
  env.settle = async ev => { await Promise.allSettled(ev.waits); await sleep(5); };
  env.cached = async u => { const m = store.get('ustanovka-v1'); const r = m && m.get(new URL(u, BASE).href); return r ? r.clone().text() : null; };
  return env;
}

(async () => {
  const appHtml = fs.readFileSync(APP_FILE, 'utf8');
  const VERSION = (appHtml.match(/<meta name="app-version" content="([^"]+)"/) || [])[1];
  const swSrc = fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8');
  const shell = JSON.parse(swSrc.match(/const SHELL = (\[[^\]]*\])/)[1].replace(/'/g, '"'));

  title('1) Файлы сайта');
  const indexHtml = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
  ok('index.html совпадает с ustanovka.html', sha(appHtml) === sha(indexHtml), sha(indexHtml));
  const missing = shell.filter(f => f !== './' && !fs.existsSync(path.join(SITE, f)));
  ok('все файлы для офлайн-режима на месте', missing.length === 0, missing.join(', ') || shell.length + ' шт.');
  ok('в странице есть метка версии', !!VERSION, VERSION);
  ok('манифест подключается только на сайте', /if \(!\/\^https\?:\$\/\.test\(location\.protocol\)\) return;[\s\S]{0,200}manifest\.json/.test(appHtml));
  ok('шрифты запрашиваются с crossorigin (нормально кэшируются)', /fonts\.googleapis\.com\/css2[^>]*rel="stylesheet" crossorigin>/.test(appHtml));
  ok('иконка для iPhone подключена и существует', /rel="apple-touch-icon" href="icons\/apple-touch-icon\.png"/.test(appHtml) && fs.existsSync(path.join(SITE, 'icons/apple-touch-icon.png')));

  title('2) Манифест и иконки');
  let man = null;
  try { man = JSON.parse(fs.readFileSync(path.join(SITE, 'manifest.json'), 'utf8')); } catch (e) { man = null; }
  ok('manifest.json — корректный JSON', !!man);
  if (man) {
    ok('start_url и scope относительные (работает в подпапке GitHub Pages)', man.start_url === './' && man.scope === './');
    ok('открывается как приложение (standalone)', man.display === 'standalone');
    ok('короткое имя под иконкой', !!man.short_name, man.short_name);
    const sizes = man.icons.map(i => i.sizes + '/' + (i.purpose || 'any'));
    ok('иконки 192 и 512 + 512 для круглой маски Android', sizes.includes('192x192/any') && sizes.includes('512x512/any') && sizes.includes('512x512/maskable'), sizes.join(', '));
    for (const ic of man.icons) {
      const png = readPNG(path.join(SITE, ic.src));
      const [w, h] = ic.sizes.split('x').map(Number);
      ok(`${ic.src}: целый PNG ${ic.sizes}`, png.sig && png.crcOk && png.rawOk && png.w === w && png.h === h && png.last === 'IEND', `${png.w}×${png.h}`);
    }
  }
  const apple = readPNG(path.join(SITE, 'icons/apple-touch-icon.png'));
  ok('icons/apple-touch-icon.png: целый PNG 180x180', apple.sig && apple.crcOk && apple.rawOk && apple.w === 180 && apple.h === 180);

  title('3) Синтаксис');
  const scripts = [...appHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  ok('в странице 3 скрипта: манифест, движок, приложение', scripts.length === 3, scripts.length);
  scripts.forEach((code, i) => { let err = null; try { new vm.Script(code); } catch (e) { err = e.message; } ok(`скрипт ${i + 1} компилируется`, !err, err || code.length + ' симв.'); });
  let swErr = null;
  try { new vm.Script(swSrc); } catch (e) { swErr = e.message; }
  ok('sw.js компилируется', !swErr, swErr || '');
  const names = {};
  for (const m of (scripts[2] || '').matchAll(/^(?:async\s+)?function\s+([\w$]+)|^(?:const|let|var)\s+([\w$]+)/gm)) { const n = m[1] || m[2]; names[n] = (names[n] || 0) + 1; }
  const dups = Object.keys(names).filter(n => names[n] > 1);
  ok('в приложении нет повторных объявлений', dups.length === 0, dups.join(', ') || Object.keys(names).length + ' имён');

  title('4) Файл с диска работает как раньше');
  const local = siteEnv({ protocol: 'file:', version: VERSION });
  ok('офлайн-режим не регистрируется', local.swReg.length === 0);
  ok('проверка обновлений не запускается', local.timers.length === 0);
  (local.win.beforeinstallprompt || []).forEach(f => f({ preventDefault() {} }));
  ok('плашки «Установить» нет', local.slot.className === '' && local.slot.children.length === 0);

  title('5) Сайт: офлайн-режим, установка, обновления');
  const site = siteEnv({ version: VERSION });
  ok('регистрирует офлайн-режим (sw.js)', site.swReg.length === 1 && site.swReg[0] === 'sw.js', site.swReg.join(', '));
  ok('через 15 с проверяет обновление', site.timers.some(t => t.ms === 15000));
  ok('и при каждом возвращении в приложение', (site.doc.visibilitychange || []).length >= 1, (site.doc.visibilitychange || []).length + ' слушателя (проверка обновлений и сохранение при сворачивании)');
  ok('слушает установку и присланные ссылки', ['beforeinstallprompt', 'appinstalled', 'hashchange'].every(t => (site.win[t] || []).length === 1));

  let prevented = false, prompted = false;
  site.win.beforeinstallprompt[0]({ preventDefault() { prevented = true; }, prompt: async () => { prompted = true; }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  ok('Android: плашка с кнопкой «Установить»', site.slot.className === 'install-note' && /Установить/.test(site.slot.textContent) && prevented);
  const instBtn = findAll(site.slot, n => n.tagName === 'BUTTON')[0];
  if (instBtn) await instBtn.listeners.click[0]();
  ok('кнопка открывает системное окно установки и прячется', prompted && site.slot.children.length === 0);
  site.win.appinstalled[0]();
  ok('после установки — сообщение', findAll(site.body, hasClass('toast')).length === 1);

  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
  const ios = siteEnv({ ua: IPHONE, version: VERSION, withApp: true });
  await waitFor(() => ios.slot.children.length > 0);
  ok('iPhone: плашка «Как установить»', /Как установить/.test(ios.slot.textContent));
  const iosBtn = findAll(ios.slot, n => n.tagName === 'BUTTON')[0];
  if (iosBtn) iosBtn.listeners.click[0]();
  ok('iPhone: открывается пошаговая инструкция', findAll(ios.body, hasClass('modal-ov')).some(n => /На экран/.test(n.textContent) && /своё хранилище/.test(n.textContent)));
  const iosApp = siteEnv({ ua: IPHONE, version: VERSION, withApp: true, standalone: true });
  await waitFor(() => iosApp.appRoot.children.length > 0);
  ok('уже установленное приложение плашку не показывает', iosApp.appRoot.children.length > 0 && iosApp.slot.children.length === 0);

  const mkFetch = html => async () => ({ ok: true, status: 200, text: async () => html });
  const same = siteEnv({ version: VERSION, fetch: mkFetch(`<meta name="app-version" content="${VERSION}">`) });
  await same.timers.find(t => t.ms === 15000).fn();
  ok('та же версия — полосы обновления нет', findAll(same.body, hasClass('updbar')).length === 0);
  const newer = siteEnv({ version: VERSION, fetch: mkFetch('<meta name="app-version" content="2099.01.01-1">') });
  await newer.timers.find(t => t.ms === 15000).fn();
  ok('новая версия — полоса с кнопкой «Обновить»', findAll(newer.body, hasClass('updbar')).some(n => /Обновить/.test(n.textContent)));
  newer.doc.visibilitychange[0]();
  await sleep(20);
  ok('полоса не дублируется', findAll(newer.body, hasClass('updbar')).length === 1);
  const offline = siteEnv({ version: VERSION });
  let threw = false;
  try { await offline.timers.find(t => t.ms === 15000).fn(); } catch (e) { threw = true; }
  ok('нет сети — тихо, без ошибок', !threw && findAll(offline.body, hasClass('updbar')).length === 0);

  title('6) Ссылка на показ');
  const U = site.ctx.UST;
  const p = U.pendulumProject();
  /* сравниваем содержимое, а не порядок ключей: ссылка не несёт личных заметок, поэтому они добавляются при разборе в другом месте */
  const canon = x => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.keys(v).sort().reduce((o, kk) => { o[kk] = v[kk]; return o; }, {})
    : v));
  const strip = x => { const q = JSON.parse(JSON.stringify(x)); delete q.id; delete q.updated; return canon(q); };
  const code = await U.packProject(p);
  ok('сжатый код ссылки из безопасных для адреса символов', code[0] === 'z' && /^[A-Za-z0-9_-]+$/.test(code), code.length + ' симв.');
  const back = await U.unpackProject(code);
  ok('«Маятник» после ссылки совпадает полностью', strip(back) === strip(p), back.slides.length + ' слайдов');
  const link = await U.shareLinkFor(p);
  ok('ссылка ведёт на сайт и начинается с #show=', link.indexOf(BASE + '#show=z') === 0, link.length + ' симв.');
  const small = JSON.parse(JSON.stringify(p));
  small.slides = small.slides.filter(s => s.board).slice(0, 1);
  small.slides[0].board.frames = small.slides[0].board.frames.slice(0, 3);
  const smallLink = await U.shareLinkFor(small);
  ok('небольшая презентация помещается в сообщение Telegram', smallLink.length <= 4096, smallLink.length + ' симв.');

  const oldBrowser = siteEnv({ version: VERSION, compression: false });
  const plainCode = await oldBrowser.ctx.UST.packProject(p);
  ok('браузер без сжатия делает несжатую ссылку', plainCode[0] === 'j', plainCode.length + ' симв.');
  ok('и она открывается', strip(await U.unpackProject(plainCode)) === strip(p));

  const msg = async (u, c) => { try { await u.unpackProject(c); return 'без ошибки'; } catch (e) { return e.message; } };
  ok('обрезанная ссылка — понятная ошибка', /обрезана/.test(await msg(U, code.slice(0, Math.floor(code.length / 2)))));
  ok('пустая ссылка — понятная ошибка', /обрезана/.test(await msg(U, '')));
  ok('мусор вместо кода — понятная ошибка', /обрезана/.test(await msg(U, 'z!!!')));
  ok('данные без слайдов — «нет слайдов»', /нет слайдов/.test(await msg(U, 'j' + Buffer.from('{"a":1}').toString('base64url'))));
  const noDecomp = siteEnv({ version: VERSION });
  noDecomp.ctx.DecompressionStream = undefined;
  const oldMsg = await msg(noDecomp.ctx.UST, code);
  ok('очень старый браузер — просьба обновить', /устарел/.test(oldMsg), oldMsg);

  title('7) Открытие присланной ссылки');
  const atStart = siteEnv({ version: VERSION, hash: '#show=' + code });
  await waitFor(() => atStart.shown.length === 1);
  ok('ссылка, открытая с нуля, сразу показывает презентацию', atStart.shown.length === 1 && strip(atStart.shown[0].p) === strip(p));

  const viewer = siteEnv({ version: VERSION });
  viewer.location.hash = '#show=' + code;
  viewer.location.href = BASE + '#show=' + code;
  viewer.win.hashchange[0]();
  await waitFor(() => viewer.shown.length === 1);
  const sh = viewer.shown[0];
  ok('ссылка в уже открытом приложении тоже показывает', !!sh && strip(sh.p) === strip(p));
  ok('в шапке показа есть «Изменить»', !!(sh && sh.opts.actions && sh.opts.actions[0].label === 'Изменить'));
  ok('показ не перезаписывает адрес номерами слайдов', !!sh && !sh.opts.useHash);
  if (sh) await sh.opts.actions[0].onClick().catch(() => { /* редактор без DOM дальше не рисуется — это ожидаемо */ });
  ok('«Изменить»: показ закрыт, #show= убран из адреса', viewer.destroyed === 1 && viewer.replaced[0] === BASE, viewer.replaced.join(' | '));
  ok('«Изменить»: копия сохранена и открыта в редакторе', viewer.ctx.UST.App.view === 'editor' && viewer.ctx.UST.App.project && viewer.ctx.UST.App.project.slides.length === p.slides.length);

  const bad = siteEnv({ version: VERSION });
  bad.location.hash = '#show=zBROKEN';
  bad.location.href = BASE + '#show=zBROKEN';
  bad.win.hashchange[0]();
  await waitFor(() => findAll(bad.body, hasClass('modal-ov')).length > 0);
  ok('битая ссылка: окно с объяснением вместо падения', findAll(bad.body, hasClass('modal-ov')).some(n => /обрезана/.test(n.textContent)) && bad.shown.length === 0);
  ok('битая ссылка: #show= убран из адреса', bad.replaced[0] === BASE);

  title('8) Офлайн-режим (sw.js)');
  const res = (body, status = 200) => new Response(body, { status });
  const nav = u => ({ url: new URL(u, BASE).href, method: 'GET', mode: 'navigate' });
  const get = u => ({ url: new URL(u, BASE).href, method: 'GET', mode: 'cors' });
  const sw = makeSW(swSrc, req => Promise.resolve(res('file:' + req.url)));
  let ev = sw.fire('install', null);
  await sw.settle(ev);
  const inCache = await Promise.all(shell.map(f => sw.cached(f)));
  ok('установка: все файлы легли в кэш', inCache.every(Boolean), shell.length + ' файлов');
  ok('установка: новая версия включается сразу', sw.flags.skip === true);

  sw.store.set('ustanovka-v0', new Map());
  sw.store.set('other-app', new Map());
  ev = sw.fire('activate', null);
  await sw.settle(ev);
  ok('активация: старый кэш удалён, чужой не тронут', !sw.store.has('ustanovka-v0') && sw.store.has('other-app') && sw.store.has('ustanovka-v1'));
  ok('активация: сразу обслуживает открытые вкладки', sw.flags.claim === true);

  sw.setFetch(() => Promise.resolve(res('NEW')));
  ev = sw.fire('fetch', nav('./'));
  ok('есть сеть: страница из сети', (await (await ev.resp).text()) === 'NEW');
  await sw.settle(ev);
  ok('есть сеть: свежая страница сохранена под обоими адресами', (await sw.cached('./')) === 'NEW' && (await sw.cached('index.html')) === 'NEW');

  sw.setFetch(() => Promise.reject(new TypeError('Failed to fetch')));
  ev = sw.fire('fetch', nav('./'));
  ok('нет сети: страница из кэша', (await (await ev.resp).text()) === 'NEW');
  await sw.settle(ev);
  ev = sw.fire('fetch', nav('index.html'));
  ok('нет сети: адрес с index.html тоже открывается', (await (await ev.resp).text()) === 'NEW');
  await sw.settle(ev);

  sw.setFetch(() => new Promise(r => setTimeout(() => r(res('LATE')), 150)));
  ev = sw.fire('fetch', nav('./'));
  ok('медленная сеть: сразу из кэша, без ожидания', (await (await ev.resp).text()) === 'NEW');
  await sw.settle(ev);
  ok('медленная сеть: свежая версия докачалась в фоне', (await sw.cached('./')) === 'LATE');

  sw.setFetch(() => Promise.resolve(res('V2')));
  ev = sw.fire('fetch', get('./?v=123'));
  ok('проверка обновления получает свежую страницу', (await (await ev.resp).text()) === 'V2');
  await sw.settle(ev);
  ok('…и кэширует её под чистым адресом, без ?v=', (await sw.cached('./')) === 'V2' && !sw.store.get('ustanovka-v1').has(new URL('./?v=123', BASE).href));

  sw.setFetch(() => Promise.resolve(res('PART', 206)));
  ev = sw.fire('fetch', nav('./'));
  await (await ev.resp).text();
  await sw.settle(ev);
  ok('неполный ответ (206) кэш не портит', (await sw.cached('./')) === 'V2');
  sw.setFetch(() => Promise.resolve(res('ERR', 500)));
  ev = sw.fire('fetch', nav('./'));
  const r500 = await ev.resp;
  await sw.settle(ev);
  ok('ошибка сервера (500) кэш не портит', r500.status === 500 && (await sw.cached('./')) === 'V2');

  const empty = makeSW(swSrc, () => Promise.reject(new TypeError('offline')));
  ev = empty.fire('fetch', nav('./'));
  const outcome = await ev.resp.then(() => 'ответ', () => 'ошибка');
  await empty.settle(ev);
  ok('нет сети и пустой кэш — обычная ошибка браузера, без зависания', outcome === 'ошибка');

  let fontCalls = 0;
  sw.setFetch(() => { fontCalls++; return Promise.resolve(res('FONT')); });
  const fontReq = { url: 'https://fonts.googleapis.com/css2?family=Oswald', method: 'GET', mode: 'cors' };
  ev = sw.fire('fetch', fontReq);
  const f1 = await (await ev.resp).text();
  ev = sw.fire('fetch', fontReq);
  const f2 = await (await ev.resp).text();
  ok('шрифты: со второго раза без сети', f1 === 'FONT' && f2 === 'FONT' && fontCalls === 1, 'запросов в сеть: ' + fontCalls);

  sw.setFetch(() => Promise.resolve(res('M2')));
  ev = sw.fire('fetch', get('manifest.json'));
  const m1 = await (await ev.resp).text();
  await sw.settle(ev);
  ok('манифест: мгновенно из кэша', m1 === 'file:' + new URL('manifest.json', BASE).href);
  ok('манифест: обновился в фоне', (await sw.cached('manifest.json')) === 'M2');

  ev = sw.fire('fetch', { url: 'https://example.com/x.js', method: 'GET', mode: 'no-cors' });
  ok('чужие адреса не перехватываются', ev.resp === undefined);
  ev = sw.fire('fetch', { url: BASE, method: 'POST', mode: 'cors' });
  ok('POST-запросы не перехватываются', ev.resp === undefined);

  console.log(`\nИТОГ: ${passed} прошло, ${failed} упало`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('ТЕСТ УПАЛ С ИСКЛЮЧЕНИЕМ:', e && e.stack || e); process.exit(2); });
