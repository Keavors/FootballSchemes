// Загружает движок и приложение из ustanovka.html в node без браузера (только чистая логика).
const fs = require('fs'), vm = require('vm');

function loadApp(file, extra) {
  const html = fs.readFileSync(file, 'utf8');
  const engStart = html.indexOf('<script id="te-engine">');
  const engEnd = html.indexOf('</script>', engStart);
  const eng = html.slice(engStart + '<script id="te-engine">'.length, engEnd);
  const appOpen = html.indexOf('<script>', engEnd);
  const appEnd = html.lastIndexOf('</script>');
  const app = html.slice(appOpen + '<script>'.length, appEnd);

  const noop = () => {};
  const ctx = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, performance, URL, TextEncoder, TextDecoder,
    Blob: typeof Blob !== 'undefined' ? Blob : undefined,
    CompressionStream: typeof CompressionStream !== 'undefined' ? CompressionStream : undefined,
    DecompressionStream: typeof DecompressionStream !== 'undefined' ? DecompressionStream : undefined,
    Response: typeof Response !== 'undefined' ? Response : undefined,
    btoa, atob,
    requestAnimationFrame: noop, cancelAnimationFrame: noop,
    addEventListener: noop, removeEventListener: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    location: { protocol: 'file:', hash: '', href: 'file:///ustanovka.html', origin: 'null', pathname: '/ustanovka.html', search: '' },
    history: { replaceState: noop, pushState: noop },
    navigator: { userAgent: 'node' },
    document: {
      querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
      createElement: () => { throw new Error('no DOM in node'); },
      addEventListener: noop, removeEventListener: noop, body: null, head: null, documentElement: {}
    }
  };
  Object.assign(ctx, extra || {});
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(eng, ctx, { filename: 'engine.js' });
  vm.runInContext(app, ctx, { filename: 'app.js' });
  return ctx;
}
process.on('unhandledRejection', () => {}); // renderHome без DOM падает — это ожидаемо
module.exports = { loadApp };
