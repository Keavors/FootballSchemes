
/* ---------- Показ, экспорт, импорт ---------- */
function openPreview(start) {
  if (App.canvasBoard) App.canvasBoard.cancel();
  App.playing = false;
  const ov = h('div', { class: 'ed-preview' });
  document.body.appendChild(ov);
  let inst = null;
  const close = () => { if (inst) inst.destroy(); ov.remove(); refresh(['tools', 'canvas', 'timeline']); };
  /* скрытые слайды в показ не идут — пересчитываем, с какого начинать */
  const at = start == null ? App.slideIdx : start;
  const shown = App.project.slides.filter(s => !s.hidden);
  const from = Math.max(0, shown.indexOf(App.project.slides[at]));
  inst = TE.mountPresentation(ov, App.project, { start: from, onClose: close });
}
const FONT_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Oswald:wght@500;600;700&family=PT+Sans:ital,wght@0,400;0,700;1,400&family=Rubik:wght@400;500;700&family=Russo+One&display=swap" rel="stylesheet">';
/* ---------- Шрифты внутрь файла ---------- */
function bytesToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Oswald:wght@500;600;700&family=PT+Sans:ital,wght@0,400;0,700;1,400&family=Rubik:wght@400;500;700&family=Russo+One&display=swap';
let fontCache = '';
/* Скачиваем шрифты и складываем прямо в файл — тогда он выглядит одинаково даже без интернета */
async function fontsInline() {
  if (fontCache) return fontCache;
  if (typeof fetch !== 'function' || typeof btoa !== 'function') return '';
  let out = '';
  try {
    const css = await (await fetch(FONT_CSS_URL)).text();
    /* Перед каждым куском Google пишет комментарий с названием набора букв */
    const rx = /(?:\/\*\s*([a-z-]+)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/gi;
    let m;
    while ((m = rx.exec(css))) {
      /* берём кириллицу и обычную латиницу: остальные наборы только утяжелят файл */
      const subset = (m[1] || '').toLowerCase();
      if (subset && subset !== 'cyrillic' && subset !== 'latin') continue;
      const u = m[2].match(/url\((https:[^)]+)\)/);
      if (!u || out.length > 3e6) continue;
      const buf = await (await fetch(u[1])).arrayBuffer();
      out += '@font-face {' + m[2].replace(u[1], 'data:font/woff2;base64,' + bytesToBase64(buf)) + '}\n';
    }
  } catch (e) {
    return '';
  }
  if (out) fontCache = '<style>\n' + out + '</style>';
  return fontCache;
}
function buildExportHTML(p, fontCss) {
  const css = $('#te-css').textContent;
  const engine = $('#te-engine').textContent;
  const data = JSON.stringify(p).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const title = TE.esc(TE.plain(p.title));
  return '<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    `<title>${title}</title>\n<meta name="generator" content="Установка">\n${fontCss || FONT_LINK}\n` +
    `<style>html,body{margin:0;height:100%;background:#edf1ee}#te-root{height:100vh;height:100dvh}\n${css}</style>\n</head>\n<body>\n<div id="te-root"></div>\n` +
    `<script type="application/json" id="te-data">${data}<\/script>\n<script>${engine}<\/script>\n` +
    '<script>TE.mountPresentation(document.getElementById("te-root"), JSON.parse(document.getElementById("te-data").textContent), { useHash: true });<\/script>\n</body>\n</html>\n';
}
function download(name, text, type) {
  try {
    const blob = new Blob([text], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name, style: 'display:none' });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    App.dirtyExport = false;
    toast('Файл сохраняется: ' + name);
  } catch (e) { copyText(text); }
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Скопировано в буфер обмена'); return; } catch (e) { /* fallback */ }
  const ta = h('textarea', { value: text, style: 'position:fixed;top:0;left:0;opacity:0' });
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  if (ok) { toast('Скопировано в буфер обмена'); return; }
  const area = h('textarea', { class: 'inp', rows: 10, value: text, readonly: true });
  modal('Скопируйте вручную', [h('p', null, 'Браузер не дал скопировать автоматически. Выделите весь текст и скопируйте, затем сохраните в файл.'), area]);
  setTimeout(() => { area.focus(); area.select(); }, 50);
}
/* ---------- Картинка схемы ---------- */
/* Рисуем схему заново, начисто: без ручек редактирования и призраков */
function snapshotBoard(b, frameIdx) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;pointer-events:none';
  document.body.appendChild(host);
  const bd = new TE.Board(host, b, App.project, { bare: true, frame: frameIdx || 0 });
  return { svg: bd.svg, free: () => host.remove() };
}
/* SVG → PNG через холст. Если холста нет, честно сообщаем об этом */
function svgToPNG(svg, width, cb) {
  let ctx = null;
  try { ctx = document.createElement('canvas').getContext('2d'); } catch (e) { ctx = null; }
  if (!ctx || typeof Image !== 'function' || typeof XMLSerializer !== 'function') { cb(''); return; }
  const clone = svg.cloneNode(true);
  const css = $('#te-css');
  if (css) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = css.textContent;
    clone.insertBefore(style, clone.firstChild);
  }
  const vb = (clone.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
  const ratio = vb[3] && vb[2] ? vb[3] / vb[2] : 1;
  const w = Math.max(200, Math.round(width || 1600)), hh = Math.round(w * ratio);
  clone.setAttribute('width', w);
  clone.setAttribute('height', hh);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = hh;
      const c2 = c.getContext('2d');
      if (!c2) { cb(''); return; }
      c2.fillStyle = '#0f1a14';
      c2.fillRect(0, 0, w, hh);
      c2.drawImage(img, 0, 0, w, hh);
      cb(c.toDataURL('image/png'));
    } catch (e) { cb(''); }
  };
  img.onerror = () => cb('');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}
function downloadDataURL(name, url) {
  try {
    const a = h('a', { href: url, download: name, style: 'display:none' });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1500);
    toast('Файл сохраняется: ' + name);
  } catch (e) { toast('Не получилось сохранить файл'); }
}
function savePNG(name) {
  const b = board();
  if (!b) { toast('Сначала откройте слайд со схемой'); return; }
  const snap = snapshotBoard(b, App.frameIdx);
  svgToPNG(snap.svg, 1600, url => {
    snap.free();
    if (!url) { toast('Этот браузер не умеет сохранять картинку — сделайте снимок экрана'); return; }
    downloadDataURL(name + '.png', url);
  });
}

/* ---------- Печать и PDF ---------- */
/* Какие шаги показать на бумаге: начала глав, но не больше четырёх */
function printFrames(b) {
  const n = b.frames.length;
  if (n <= 4) return b.frames.map((f, i) => i);
  const ch = (TE.computeChapters(b.frames) || []).map(c => c.from);
  const out = ch.length ? ch.slice(0, 4) : [];
  if (!out.length) { for (let i = 0; i < 4; i++) out.push(Math.round(i * (n - 1) / 3)); }
  if (out.indexOf(n - 1) < 0 && out.length < 4) out.push(n - 1);
  return out;
}
function openPrint() {
  const p = App.project;
  const root = h('div', { class: 'print-root' });
  const tools = h('div', { class: 'print-tools' },
    h('span', null, 'Так презентация ляжет на бумагу или в PDF'),
    btn('', 'Печать', () => { try { window.print(); } catch (e) { toast('Печать недоступна'); } }, false, 'sm primary'),
    btn('close', 'Закрыть', () => close(), false, 'sm'));
  root.appendChild(tools);
  p.slides.filter(s => !s.hidden).forEach((s, i) => {
    const page = h('section', { class: 'print-page' });
    appendAll(page,
      h('div', { class: 'print-head' },
        h('h2', null, TE.plain(s.title) || `Слайд ${i + 1}`),
        s.subtitle ? h('p', null, TE.plain(s.subtitle)) : null),
      s.image && s.image.src ? h('img', { class: 'print-img', src: s.image.src, alt: '' }) : null);
    [s.board, s.layout === 'duo' ? s.board2 : null].filter(Boolean).forEach(b => {
      const wrap = h('div', { class: 'print-boards' });
      printFrames(b).forEach(fi => {
        const cell = h('div', { class: 'print-cell' });
        const host = h('div');
        cell.appendChild(host);
        new TE.Board(host, b, p, { bare: true, frame: fi });
        const cap = TE.plain(b.frames[fi].cap || '');
        cell.appendChild(h('small', null, cap || `Шаг ${fi + 1}`));
        wrap.appendChild(cell);
      });
      page.appendChild(wrap);
    });
    if (s.roles && s.roles.length) {
      page.appendChild(h('div', { class: 'print-text te-md', html: s.roles.map(r => `<p><b>${TE.esc(TE.plain(r.title))}</b></p>` + TE.md(r.body)).join('') }));
    }
    if (s.body) page.appendChild(h('div', { class: 'print-text te-md', html: TE.md(s.body) }));
    root.appendChild(page);
  });
  document.body.appendChild(root);
  document.body.classList.add('printing');
  function close() {
    root.remove();
    document.body.classList.remove('printing');
    window.removeEventListener('afterprint', close);
  }
  window.addEventListener('afterprint', close);
  try { window.print(); } catch (e) { /* печати нет — окно всё равно показывает, как получится */ }
}

/* Копия для отправки: личные заметки по умолчанию не уезжают */
function forExport(p, withNotes) {
  const q = clone(p);
  if (!withNotes) q.slides.forEach(s => { delete s.notes; });
  return q;
}
function openExport() {
  const p = App.project, name = slug(p.title);
  let withNotes = false;
  let embedFonts = true;
  let close;
  /* Собираем файл: сначала, если надо, подтягиваем шрифты */
  const withHTML = use => async () => {
    let css = '';
    if (embedFonts) {
      css = await fontsInline();
      if (!css) toast('Шрифты встроить не вышло — нужен интернет. Файл сохраню как есть');
    }
    try { use(buildExportHTML(forExport(p, withNotes), css)); } catch (e) { toast('Не получилось собрать файл'); }
  };
  const shareOut = h('div', { class: 'share-out' });
  const makeLink = async () => {
    shareOut.textContent = '';
    let link;
    try { link = await shareLinkFor(App.project); } catch (e) {
      shareOut.appendChild(h('p', { class: 'err' }, 'Не получилось собрать ссылку: ' + ((e && e.message) || e)));
      return;
    }
    const n = link.length;
    appendAll(shareOut,
      h('textarea', { class: 'inp', rows: 3, readonly: true, value: link, 'aria-label': 'Ссылка на показ' }),
      h('p', { class: 'muted small' }, `Длина: ${n} ${plural(n, 'символ', 'символа', 'символов')}.` +
        (n > TELEGRAM_LIMIT ? ` В Telegram не влезет: там сообщение до ${TELEGRAM_LIMIT} символов. В WhatsApp пройдёт, а для Telegram разделите презентацию на части поменьше.` : '')),
      h('div', { class: 'btn-row' },
        btn('copy', 'Скопировать ссылку', () => copyText(link), false, 'primary'),
        navigator.share ? btn('share', 'Поделиться…', () => { navigator.share({ title: TE.plain(App.project.title), url: link }).catch(() => { /* окно закрыли */ }); }) : null));
  };
  close = modal('Экспорт', [
    HOSTED ? h('div', { class: 'exp-card' },
      h('h3', null, 'Ссылка на показ'),
      h('p', null, 'Команда открывает презентацию по ссылке прямо в браузере — на iPhone, Android и компьютере, без файлов. Презентация зашита в саму ссылку и на хостинг не попадает. Поменяли что-то — создайте ссылку заново.'),
      App.project.slides.some(s => s.image) ? h('p', { class: 'muted small' }, 'Картинки в ссылку не войдут — если они важны, отправьте файлом.') : null,
      h('div', { class: 'btn-row' }, btn('share', 'Создать ссылку', makeLink, false, 'primary')),
      shareOut) : null,
    h('div', { class: 'exp-card' },
      h('h3', null, 'Презентация для команды'),
      h('p', null, 'Один HTML-файл: открывается в любом браузере на телефоне, ноутбуке или телевизоре. Его можно отправить в мессенджер, а потом открыть здесь для правки.'),
      h('div', { class: 'btn-row' },
        btn('download', 'Скачать .html', withHTML(html => download(name + '.html', html, 'text/html')), false, 'primary'),
        btn('copy', 'Скопировать код', withHTML(html => copyText(html)), false, '')),
      tog(embedFonts, v => { embedFonts = v; }, 'Зашить шрифты в файл: вид везде одинаковый, но файл тяжелее'),
      p.slides.some(s => s.notes) ? tog(withNotes, v => { withNotes = v; }, 'Включить мои заметки в файл') : null),
    h('div', { class: 'exp-card' },
      h('h3', null, 'Файл проекта'),
      h('p', null, 'Только данные, лёгкий файл. Подходит, чтобы перенести работу между устройствами.'),
      h('div', { class: 'btn-row' },
        btn('download', 'Скачать .json', () => download(name + '.json', JSON.stringify(forExport(p, withNotes), null, 1), 'application/json')),
        btn('copy', 'Скопировать', () => copyText(JSON.stringify(forExport(p, withNotes)))))),
    h('div', { class: 'exp-card' },
      h('h3', null, 'Картинка и печать'),
      h('p', null, 'Картинку текущего шага удобно кинуть в чат команды, а печать — раздать на бумаге или сохранить в PDF.'),
      h('div', { class: 'btn-row' },
        btn('download', 'Картинка PNG', () => savePNG(name), !board(), 'sm'),
        btn('', 'Печать / PDF', () => { close(); openPrint(); }, false, 'sm'))),
    h('div', { class: 'exp-card' },
      h('h3', null, 'История версий'),
      h('p', null, 'Приложение само откладывает копии по ходу работы. Если что-то пошло не так — можно вернуться к любой из них.'),
      h('div', { class: 'btn-row' }, btn('undo', 'Открыть историю', () => { close(); openHistory(p.id, q => openEditor(q)); }, false, 'sm'))),
    h('div', { class: 'exp-card' },
      h('h3', null, 'Ролик со схемой'),
      h('p', null, 'Схема с движением одним файлом: видео — для телевизора и чата, GIF — играет в переписке сам.'),
      h('div', { class: 'btn-row' },
        btn('', 'Сделать ролик', () => { close(); openClip(); }, !board(), 'sm'))),
    h('p', { class: 'muted small' }, 'Если скачивание не началось, нажмите «Скопировать» и сохраните текст в файл с тем же расширением.')
  ]);
}
function parseImported(text) {
  let s = String(text || '').trim();
  if (!s) throw new Error('Файл пустой.');
  const m = s.match(/<script[^>]*id=["']te-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (m) s = m[1];
  let obj;
  try { obj = JSON.parse(s); } catch (e) { throw new Error('Это не похоже на файл презентации из этого приложения.'); }
  if (!obj || !Array.isArray(obj.slides)) throw new Error('В файле не нашлось слайдов.');
  /* Файл из более новой «Установки» открываем, но честно предупреждаем */
  if (TE.tooNew(obj)) setTimeout(() => toast('Файл сделан в более новой версии «Установки» — что-то может выглядеть не так'), 400);
  return TE.normalizeProject(obj);
}
function openImport() {
  const err = h('p', { class: 'err', role: 'alert' });
  const fileIn = h('input', { type: 'file', accept: '.json,.html,.htm,application/json,text/html' });
  const ta = h('textarea', { class: 'inp', rows: 5, placeholder: '…или вставьте сюда содержимое файла' });
  let close;
  const go = text => {
    try {
      const p = parseImported(text);
      close();
      createFrom(p).then(() => toast('Презентация открыта для редактирования'));
    } catch (e) { err.textContent = e.message; }
  };
  fileIn.addEventListener('change', () => {
    const f = fileIn.files && fileIn.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => go(String(r.result));
    r.onerror = () => { err.textContent = 'Не получилось прочитать файл.'; };
    r.readAsText(f);
  });
  close = modal('Открыть презентацию', [
    h('p', null, 'Подойдёт файл проекта (.json) или презентация (.html), сохранённая из этого приложения. Откроется копия — исходный файл не изменится.'),
    h('label', { class: 'btn primary file-btn' }, icon('upload'), 'Выбрать файл', fileIn),
    h('div', { style: 'height:12px' }),
    ta,
    h('div', { class: 'btn-row' }, btn('check', 'Открыть из текста', () => go(ta.value))),
    err
  ]);
}