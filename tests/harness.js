// Безоконный браузер для тестов «Установки»: загружает настоящий ustanovka.html в jsdom и даёт помощники.
const fs = require('fs'), path = require('path');
const SP = path.resolve(__dirname, '..');
const { JSDOM, VirtualConsole } = require('jsdom');
const APP_FILE = __dirname + '/../dist/ustanovka.html';

const rejections = [];
process.on('unhandledRejection', r => rejections.push(r));

const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

function stubWindow(win, o) {
  win.matchMedia = q => {
    let m = false, mm;
    if (/max-width:\s*899px/.test(q)) m = !!o.mobile;
    else if ((mm = q.match(/max-width:\s*(\d+)px/))) m = o.width <= +mm[1];
    else if ((mm = q.match(/min-width:\s*(\d+)px/))) m = o.width >= +mm[1];
    else if (/prefers-reduced-motion/.test(q)) m = o.reducedMotion !== false;
    else if (/display-mode:\s*standalone/.test(q)) m = !!o.standalone;
    const listeners = [];
    const mq = { matches: m, media: q, onchange: null, addEventListener: (t, f) => listeners.push(f), removeEventListener() {}, addListener: f => listeners.push(f), removeListener() {} };
    (win.__mq = win.__mq || []).push({ q, mq, listeners });
    return mq;
  };
  ['CompressionStream', 'DecompressionStream', 'Response', 'TextEncoder', 'TextDecoder', 'ReadableStream', 'structuredClone'].forEach(k => { if (globalThis[k]) win[k] = globalThis[k]; });
  win.Blob = globalThis.Blob;
  win.URL.createObjectURL = () => 'blob:stub/' + Math.random().toString(36).slice(2);
  win.URL.revokeObjectURL = () => {};
  win.fetch = o.fetch || (() => Promise.reject(new TypeError('offline (test)')));
  win.SVGSVGElement.prototype.createSVGPoint = function () { return { x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y }; } }; };
  win.SVGElement.prototype.getScreenCTM = function () { return { a: 1, d: 1, e: 0, f: 0, inverse() { return this; } }; };
  win.HTMLElement.prototype.scrollIntoView = function () {};
  win.Element.prototype.scrollIntoView = function () {};
  win.scrollTo = () => {};
  if (o.idb) {
    /* своя песочница IndexedDB на каждый запуск, чтобы тесты не мешали друг другу */
    let factory = null;
    try { factory = new (require('fake-indexeddb/lib/FDBFactory'))(); } catch (e) { factory = require('fake-indexeddb').indexedDB || require('fake-indexeddb'); }
    win.indexedDB = factory;
    try { win.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange'); } catch (e) { /* не понадобится */ }
  }
  if (o.localStorage) Object.keys(o.localStorage).forEach(k => win.localStorage.setItem(k, o.localStorage[k]));
  if (o.beforeParse) o.beforeParse(win);
}

async function openApp(opts) {
  const o = Object.assign({ url: 'https://u.github.io/ustanovka/', width: 1280, mobile: false }, opts);
  const errors = [];
  const vc = new VirtualConsole();
  /* jsdom не умеет рисовать на canvas — это не ошибка приложения, оно к этому готово */
  const IGNORE = /Not implemented: (HTMLCanvasElement|Window's print|navigation to another Document)/;
  vc.on('jsdomError', e => {
    const msg = (e && (e.stack || e.message)) || String(e);
    if (!IGNORE.test(msg)) errors.push('jsdom: ' + msg);
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(x => (x && x.stack) || String(x)).join(' ')));
  const html = o.html || fs.readFileSync(o.file || APP_FILE, 'utf8');
  const env = { errors, rejFrom: rejections.length };
  const dom = new JSDOM(html, { url: o.url, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, beforeParse: win => stubWindow(win, o) });
  const win = dom.window, doc = win.document;
  Object.assign(env, {
    dom, win, doc, opts: o,
    get UST() { return win.UST; },
    get TE() { return win.TE; },
    get App() { return win.UST && win.UST.App; },
    problems() {
      const out = errors.splice(0).concat(rejections.slice(env.rejFrom).map(r => 'rejection: ' + ((r && r.stack) || r)));
      env.rejFrom = rejections.length;
      const bar = doc.querySelector('.errbar');
      if (bar) { out.push('errbar: ' + norm(bar.textContent)); bar.remove(); }
      return out;
    },
    wait: (ms = 0) => new Promise(r => win.setTimeout(r, ms)).then(() => new Promise(r => setImmediate(r))),
    $: (s, root) => (root || doc).querySelector(s),
    $$: (s, root) => [...(root || doc).querySelectorAll(s)],
    text: el => norm(el && el.textContent),
    click(el) {
      if (!el) throw new Error('click: элемент не найден');
      el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    button(label, root) {
      const all = [...(root || doc).querySelectorAll('button')];
      return all.find(b => norm(b.textContent) === label)
        || all.find(b => (b.getAttribute('aria-label') || '') === label || (b.getAttribute('title') || '') === label)
        || all.find(b => norm(b.textContent).indexOf(label) >= 0);
    },
    async press(label, root) {
      const b = env.button(label, root);
      if (!b) throw new Error('кнопка не найдена: ' + label);
      if (b.disabled) throw new Error('кнопка неактивна: ' + label);
      env.click(b);
      await env.wait(15);
      return b;
    },
    key(k, mods, target) {
      const t = target || doc.activeElement || doc.body;
      const ev = new win.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, mods || {}));
      t.dispatchEvent(ev);
      return ev;
    },
    input(el, v) { el.value = v; el.dispatchEvent(new win.Event('input', { bubbles: true })); },
    change(el, v) { if (typeof v === 'boolean') el.checked = v; else el.value = v; el.dispatchEvent(new win.Event('change', { bubbles: true })); },
    ptr(el, type, x, y, extra) {
      extra = extra || {};
      const ev = new win.MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: extra.button || 0, buttons: 1 }, extra));
      Object.defineProperty(ev, 'pointerId', { value: extra.pointerId || 1 });
      Object.defineProperty(ev, 'pointerType', { value: extra.pointerType || 'mouse' });
      el.dispatchEvent(ev);
      return ev;
    },
    svg: () => doc.querySelector('#edCanvas svg'),
    pt: u => env.App.canvasBoard.geo.pt(u[0], u[1]),
    target(sel) {
      const svg = env.svg();
      if (!sel) return svg;
      const el = typeof sel === 'string' ? svg.querySelector(sel) : sel;
      if (!el) throw new Error('на поле не найден ' + sel);
      return el;
    },
    async drag(sel, fromU, toU, extra) {
      const svg = env.svg(), a = env.pt(fromU), b = env.pt(toU), el = env.target(sel);
      env.ptr(el, 'pointerdown', a[0], a[1], extra);
      for (let i = 1; i <= 5; i++) env.ptr(svg, 'pointermove', a[0] + (b[0] - a[0]) * i / 5, a[1] + (b[1] - a[1]) * i / 5, extra);
      env.ptr(svg, 'pointerup', b[0], b[1], extra);
      await env.wait(15);
    },
    async tap(sel, u, extra) {
      const svg = env.svg(), a = env.pt(u), el = env.target(sel);
      env.ptr(el, 'pointerdown', a[0], a[1], extra);
      env.ptr(svg, 'pointerup', a[0], a[1], extra);
      await env.wait(15);
    },
    slide: () => env.App.project.slides[env.App.slideIdx],
    board: () => { const s = env.App.project.slides[env.App.slideIdx]; return s && s.board; },
    frame: () => { const b = env.board(); return b && b.frames[env.App.frameIdx]; },
    async gotoBoardSlide(n) {
      const idx = env.App.project.slides.map((s, i) => (s.board && s.layout !== 'text' ? i : -1)).filter(i => i >= 0)[n || 0];
      env.click(env.$$('.sl-list .sl-main')[idx]);
      await env.wait(15);
      return idx;
    },
    close() { try { win.close(); } catch (e) { /* ignore */ } }
  });
  await env.wait(40);
  return env;
}

function suite(name) {
  let passed = 0, failed = 0;
  console.log('\n### ' + name);
  const t = {
    section(title) { console.log('\n' + title); },
    ok(label, cond, info) {
      if (cond) passed++; else failed++;
      console.log((cond ? '  OK   ' : '  FAIL ') + label + (info !== undefined && info !== '' ? ' -> ' + info : ''));
      return !!cond;
    },
    clean(env, label) {
      const p = env.problems();
      return t.ok(label || 'без ошибок', p.length === 0, p.slice(0, 3).map(s => s.split('\n').slice(0, 4).join(' | ')).join(' || '));
    },
    async step(label, fn) {
      try { await fn(); } catch (e) { failed++; console.log('  FAIL ' + label + ' -> ИСКЛЮЧЕНИЕ: ' + ((e && e.stack) || e).split('\n').slice(0, 4).join(' | ')); }
    },
    get failed() { return failed; },
    done() { console.log(`\n${name}: ${passed} прошло, ${failed} упало`); return failed; }
  };
  return t;
}

module.exports = { openApp, suite, norm, APP_FILE, SP };
