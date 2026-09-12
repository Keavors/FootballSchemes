/* ---------- Хранилище ----------
   Четыре уровня: облако (если есть) → IndexedDB → localStorage → память до перезагрузки.
   IndexedDB держит десятки мегабайт, поэтому в него влезают и картинки на слайдах. */
const LS = (function () {
  try {
    const s = window.localStorage;
    if (!s) return null;
    const probe = '__ust_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch (e) { return null; }
})();
const IDB = (function () {
  try { return window.indexedDB || null; } catch (e) { return null; }
})();

let idbPromise = null;
function idbOpen() {
  if (!IDB) return Promise.resolve(null);
  if (!idbPromise) {
    idbPromise = new Promise(resolve => {
      let req;
      try { req = IDB.open('ustanovka', 1); } catch (e) { resolve(null); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }
  return idbPromise;
}
/* Одна операция с хранилищем: {ok, value}. Ошибку не бросаем — работа не должна прерываться */
function idbRun(mode, fn) {
  return idbOpen().then(db => {
    if (!db) return { ok: false, value: null };
    return new Promise(resolve => {
      let tx;
      try { tx = db.transaction('kv', mode); } catch (e) { resolve({ ok: false, value: null }); return; }
      let value = null;
      const req = fn(tx.objectStore('kv'));
      if (req) req.onsuccess = () => { value = req.result; };
      tx.oncomplete = () => resolve({ ok: true, value: value === undefined ? null : value });
      tx.onerror = () => resolve({ ok: false, value: null });
      tx.onabort = () => resolve({ ok: false, value: null });
    });
  }).catch(() => ({ ok: false, value: null }));
}

const Store = {
  mode: (window.storage && typeof window.storage.get === 'function' && typeof window.storage.set === 'function')
    ? 'cloud' : (IDB ? 'idb' : (LS ? 'local' : 'memory')),
  mem: {},
  async get(key) {
    if (this.mode === 'cloud') {
      try { const r = await window.storage.get(key, false); return r ? r.value : null; } catch (e) { return null; }
    }
    if (this.mode === 'idb') {
      /* аварийная копия в памяти главнее: она есть, только если запись не прошла */
      if (this.mem[key] != null) return this.mem[key];
      const r = await idbRun('readonly', st => st.get(key));
      if (r.ok && r.value != null) return r.value;
      try { return (LS && LS.getItem(key)) || null; } catch (e) { return null; }
    }
    if (this.mode === 'local') {
      if (this.mem[key] != null) return this.mem[key];
      try { const v = LS.getItem(key); return v != null ? v : null; } catch (e) { return null; }
    }
    return this.mem[key] != null ? this.mem[key] : null;
  },
  async set(key, value) {
    if (this.mode === 'cloud') {
      try { const r = await window.storage.set(key, value, false); return !!r; } catch (e) { return false; }
    }
    if (this.mode === 'idb') {
      const r = await idbRun('readwrite', st => st.put(String(value), key));
      if (r.ok) { delete this.mem[key]; return true; }
      this.mem[key] = value;
      return 'quota';
    }
    if (this.mode === 'local') {
      try { LS.setItem(key, value); delete this.mem[key]; return true; } catch (e) {
        /* память браузера кончилась — не теряем работу, держим её в оперативной */
        this.mem[key] = value;
        return 'quota';
      }
    }
    this.mem[key] = value;
    return true;
  },
  async del(key) {
    delete this.mem[key];
    if (this.mode === 'cloud') {
      try { await window.storage.delete(key, false); } catch (e) { /* ignore */ }
      return true;
    }
    if (this.mode === 'idb') await idbRun('readwrite', st => st.delete(key));
    try { if (LS) LS.removeItem(key); } catch (e) { /* ignore */ }
    return true;
  }
};

const IDX_KEY = 'ustanovka-index';
const EMERGENCY_KEY = 'ustanovka-emergency';

/* Разовый перенос презентаций из localStorage в IndexedDB */
async function migrateToIdb() {
  if (Store.mode !== 'idb' || !LS) return;
  const done = await idbRun('readonly', st => st.get('migrated'));
  if (done.ok && done.value) return;
  let keys = [];
  try {
    for (let i = 0; i < LS.length; i++) {
      const k = LS.key(i);
      if (k && k.indexOf('ustanovka-') === 0 && k !== EMERGENCY_KEY) keys.push(k);
    }
  } catch (e) { keys = []; }
  for (const k of keys) {
    const already = await idbRun('readonly', st => st.get(k));
    if (already.ok && already.value != null) continue;
    let v = null;
    try { v = LS.getItem(k); } catch (e) { v = null; }
    if (v != null) await idbRun('readwrite', st => st.put(v, k));
  }
  await idbRun('readwrite', st => st.put('1', 'migrated'));
}

/* Аварийная копия: IndexedDB может не успеть записать, если вкладку закрыли прямо сейчас */
function emergencySave() {
  if (!LS || !App.project) return;
  try {
    LS.setItem(EMERGENCY_KEY, JSON.stringify({ id: App.project.id, updated: App.project.updated || 0, data: JSON.stringify(App.project) }));
  } catch (e) { /* не влезло — значит, и восстанавливать нечего */ }
}
function emergencyFor(id) {
  if (!LS) return null;
  try {
    const raw = LS.getItem(EMERGENCY_KEY);
    if (!raw) return null;
    const em = JSON.parse(raw);
    if (!em || em.id !== id) return null;
    return { updated: +em.updated || 0, obj: JSON.parse(em.data) };
  } catch (e) { return null; }
}
function clearEmergency() {
  try { if (LS) LS.removeItem(EMERGENCY_KEY); } catch (e) { /* ignore */ }
}

/* ---------- Мои настройки на этом устройстве ---------- */
/* Свои форматы, стрелки, расстановки и цвета — чтобы не настраивать заново в каждой презентации */
const PREFS_KEY = 'ustanovka-prefs';
const Prefs = { formats: [], arrows: [], formations: [], palette: [], themes: [] };
const PREFS_LISTS = ['formats', 'arrows', 'formations', 'palette', 'themes'];
async function loadPrefs() {
  try {
    const v = await Store.get(PREFS_KEY);
    if (v) Object.assign(Prefs, JSON.parse(v) || {});
  } catch (e) { /* настройки не прочитались — начнём с пустых */ }
  PREFS_LISTS.forEach(k => { if (!Array.isArray(Prefs[k])) Prefs[k] = []; });
  return Prefs;
}
let prefsTimer = 0;
function savePrefs() {
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => {
    try { Store.set(PREFS_KEY, JSON.stringify(Prefs)); } catch (e) { /* не сохранилось — не беда */ }
  }, 150);
}
async function loadIndex() {
  const v = await Store.get(IDX_KEY);
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
/* ---------- История версий ---------- */
const HIST_MAX = 10, HIST_GAP = 8 * 60 * 1000, HIST_BYTES = 6e6;
const histKey = id => 'ustanovka-h-' + id;
async function loadHistory(id) {
  const v = await Store.get(histKey(id));
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
/* Откладываем копию: не чаще раза в несколько минут и только если что-то поменялось */
async function noteVersion(p, force) {
  if (!p || !p.id) return false;
  const list = await loadHistory(p.id);
  const last = list[0];
  const now = Date.now();
  if (!force && last && now - (+last.t || 0) < HIST_GAP) return false;
  const data = JSON.stringify(p);
  if (last && last.data === data) return false;
  list.unshift({ t: now, title: p.title, slides: p.slides.length, data });
  while (list.length > HIST_MAX) list.pop();
  let total = 0;
  list.forEach(x => { total += (x.data || '').length; });
  while (list.length > 1 && total > HIST_BYTES) total -= (list.pop().data || '').length;
  await Store.set(histKey(p.id), JSON.stringify(list));
  return true;
}
async function removeHistory(id) { await Store.del(histKey(id)); }
/* Маленький слепок первой схемы: по нему рисуется картинка в списке презентаций */
function thumbOf(p) {
  const s = (p.slides || []).find(x => x.board && x.layout !== 'text');
  if (!s) return null;
  const f = s.board.frames[0] || { pos: {} };
  const pts = [];
  s.board.entities.forEach(e => {
    const pos = f.pos[e.id];
    if (!Array.isArray(pos) || pts.length >= 24) return;
    pts.push([Math.round(pos[0]), Math.round(pos[1]), e.kind === 'opp' ? 1 : e.kind === 'ours' ? 0 : 2]);
  });
  const st = p.settings;
  return {
    r: +(TE.formatOf(st).ratio || 1.5).toFixed(2),
    h: st.pitch.orientation === 'horizontal',
    g: st.pitch.grass,
    c: [st.colors.ours, st.colors.opp, st.colors.third],
    pts
  };
}
async function saveProject(p) {
  const ok = await Store.set('ustanovka-p-' + p.id, JSON.stringify(p));
  if (!ok) return false;
  const quota = ok === 'quota';
  if (!quota) clearEmergency();
  const list = await loadIndex();
  let thumb = null;
  try { thumb = thumbOf(p); } catch (e) { thumb = null; }
  const meta = { id: p.id, title: p.title, slides: p.slides.length, format: p.settings.format, updated: p.updated || Date.now(), thumb };
  const i = list.findIndex(x => x.id === p.id);
  if (i >= 0) list[i] = meta; else list.unshift(meta);
  list.sort((a, b) => (b.updated || 0) - (a.updated || 0));
  await Store.set(IDX_KEY, JSON.stringify(list));
  if (!quota) noteVersion(p).catch(() => { /* история не записалась — работе не мешает */ });
  return quota ? 'quota' : true;
}
async function loadProject(id) {
  const v = await Store.get('ustanovka-p-' + id);
  let obj = null;
  try { obj = v ? JSON.parse(v) : null; } catch (e) { obj = null; }
  /* если вкладку закрыли до записи — поднимаем аварийную копию */
  const em = emergencyFor(id);
  if (em && (!obj || em.updated > (+obj.updated || 0))) {
    obj = em.obj;
    await Store.set('ustanovka-p-' + id, JSON.stringify(obj));
  }
  if (!obj) return null;
  try { return TE.normalizeProject(obj); } catch (e) { return null; }
}
async function removeProject(id) {
  await Store.del('ustanovka-p-' + id);
  await removeHistory(id);
  const list = (await loadIndex()).filter(x => x.id !== id);
  await Store.set(IDX_KEY, JSON.stringify(list));
}
/* Сколько места занято — показываем на главном экране, если браузер отвечает */
async function storageNote() {
  if (!navigator.storage || !navigator.storage.estimate) return '';
  try {
    const est = await navigator.storage.estimate();
    if (!est || !est.quota) return '';
    const mb = v => (v / 1048576).toFixed(v > 10485760 ? 0 : 1).replace('.', ',');
    return `Презентации занимают ${mb(est.usage || 0)} МБ из ${mb(est.quota)} МБ, доступных браузеру`;
  } catch (e) { return ''; }
}
