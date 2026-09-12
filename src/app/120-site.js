/* ---------- Сайт: установка на телефон, офлайн, обновления, ссылки на показ ---------- */
const HOSTED = /^https?:$/.test(location.protocol);
const APP_VERSION = (document.querySelector('meta[name="app-version"]') || {}).content || '';
const TELEGRAM_LIMIT = 4096;
const SHARE_PREFIX = '#show=';

if (HOSTED && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(e => { try { console.warn('Офлайн-режим не включился', e); } catch (_) { /* ignore */ } });
}

/* Установка как приложение */
let installEvt = null;
const isStandalone = () => !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true);
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderInstallSlot(); });
window.addEventListener('appinstalled', () => { installEvt = null; renderInstallSlot(); toast('Готово: «Установка» появилась среди приложений'); });
function renderInstallSlot() {
  const slot = $('#installSlot');
  if (!slot) return;
  slot.textContent = '';
  slot.className = '';
  if (!HOSTED || isStandalone() || (!installEvt && !isIOS())) return;
  slot.className = 'install-note';
  slot.appendChild(h('div', null,
    h('p', null, 'Установите «Установку» на телефон или компьютер — она откроется как обычное приложение и будет работать без интернета.'),
    installEvt
      ? btn('download', 'Установить', runInstall, false, 'accent')
      : btn('download', 'Как установить', openIOSInstall, false, 'accent')));
}
async function runInstall() {
  const ev = installEvt;
  if (!ev) return;
  installEvt = null;
  renderInstallSlot();
  try { await ev.prompt(); await ev.userChoice; } catch (e) { /* окно закрыли */ }
}
function openIOSInstall() {
  modal('Установка на iPhone и iPad', [
    h('ol', { class: 'steps-list' },
      h('li', null, 'Откройте эту страницу в Safari.'),
      h('li', null, 'Нажмите «Поделиться» — квадрат со стрелкой вверх.'),
      h('li', null, 'Выберите «На экран „Домой“» и нажмите «Добавить».')),
    h('p', { class: 'muted small' }, 'У приложения на экране «Домой» своё хранилище, отдельное от Safari. Презентации, сделанные в браузере, перенесите: «Экспорт» → «Скачать .json», а в приложении — «Открыть файл». Зато там их не тронет автоочистка Safari: он может стирать данные сайтов, которые долго не открывали.')
  ]);
}

/* Просим браузер не удалять сохранённые презентации при нехватке места */
let persistAsked = false;
function askPersist() {
  if (persistAsked || !HOSTED || !navigator.storage || !navigator.storage.persist || !navigator.storage.persisted) return;
  persistAsked = true;
  navigator.storage.persisted().then(yes => (yes ? true : navigator.storage.persist())).catch(() => { /* ignore */ });
}

/* Обновления: если приложение открыто днями, оно узнаёт о новой версии */
let updCheckedAt = 0, updShown = false;
async function checkForUpdate() {
  if (!HOSTED || updShown || !APP_VERSION || navigator.onLine === false) return;
  if (Date.now() - updCheckedAt < 30 * 60 * 1000) return;
  updCheckedAt = Date.now();
  try {
    const r = await fetch('./?v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const m = (await r.text()).match(/<meta name="app-version" content="([^"]+)"/);
    if (m && m[1] !== APP_VERSION) showUpdateBar();
  } catch (e) { /* нет сети — проверим в другой раз */ }
}
function showUpdateBar() {
  if (updShown) return;
  updShown = true;
  const bar = h('div', { class: 'updbar', role: 'status' },
    h('span', null, 'Вышла новая версия «Установки».'),
    btn('check', 'Обновить', async () => { if (App.project) await saveNow(); location.reload(); }, false, 'sm accent'),
    ibtn('close', 'Позже', () => bar.remove(), false, 'sm ghost'));
  document.body.appendChild(bar);
}
if (HOSTED) {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
  setTimeout(checkForUpdate, 15000);
}

/* Ссылка на показ: презентация сжата и лежит после «#» — эта часть адреса на сервер не уходит */
function toB64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function pipeBytes(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
async function packProject(p) {
  const q = clone(p);
  delete q.id;
  delete q.updated;
  q.slides.forEach(s => { delete s.notes; delete s.image; });
  const bytes = new TextEncoder().encode(JSON.stringify(q));
  if (window.CompressionStream) return 'z' + toB64url(await pipeBytes(bytes, new CompressionStream('deflate')));
  return 'j' + toB64url(bytes);
}
const BROKEN_LINK = 'Ссылка обрезана или повреждена — попросите прислать её ещё раз.';
async function unpackProject(code) {
  const str = String(code || ''), kind = str.charAt(0);
  let bytes, text, obj;
  try { bytes = fromB64url(str.slice(1)); } catch (e) { throw new Error(BROKEN_LINK); }
  if (kind === 'z') {
    if (!window.DecompressionStream) throw new Error('Браузер устарел и не может открыть эту ссылку. Обновите его или откройте ссылку в Chrome.');
    try { text = new TextDecoder().decode(await pipeBytes(bytes, new DecompressionStream('deflate'))); } catch (e) { throw new Error(BROKEN_LINK); }
  } else if (kind === 'j') {
    text = new TextDecoder().decode(bytes);
  } else {
    throw new Error(BROKEN_LINK);
  }
  try { obj = JSON.parse(text); } catch (e) { throw new Error(BROKEN_LINK); }
  if (!obj || !Array.isArray(obj.slides)) throw new Error('В ссылке нет слайдов.');
  return TE.normalizeProject(obj);
}
async function shareLinkFor(p) {
  return location.href.split('#')[0] + SHARE_PREFIX + await packProject(p);
}
function sharedCode() {
  const hs = location.hash || '';
  return hs.indexOf(SHARE_PREFIX) === 0 ? hs.slice(SHARE_PREFIX.length) : '';
}
function clearShareHash() {
  try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* ignore */ }
}
let sharedView = null;
async function openShared() {
  const code = sharedCode();
  if (!code) return;
  let p;
  try { p = await unpackProject(code); } catch (e) {
    clearShareHash();
    modal('Не получилось открыть ссылку', [h('p', null, e.message)]);
    return;
  }
  if (sharedView) sharedView.close();
  const ov = h('div', { class: 'ed-preview' });
  document.body.appendChild(ov);
  const close = () => { inst.destroy(); ov.remove(); clearShareHash(); sharedView = null; };
  const inst = TE.mountPresentation(ov, p, {
    actions: [{
      label: 'Изменить',
      title: 'Сохранить копию у себя и открыть в редакторе',
      onClick: async () => {
        close();
        if (App.project) await saveNow();
        await createFrom(clone(p));
        toast('Копия сохранена в «Моих презентациях»');
      }
    }]
  });
  sharedView = { close };
}
window.addEventListener('hashchange', () => { if (sharedCode()) openShared(); });

/* Что приложение отдаёт наружу — в модуле запуска 130-boot.js */