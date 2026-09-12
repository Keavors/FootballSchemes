
/* ---------- Свои форматы поля ---------- */
/* Формат по имени: привычный, свой из этой презентации или свой с этого устройства */
function fmtObj(id) {
  if (TE.FORMATS[id]) return TE.FORMATS[id];
  const own = App.project && (App.project.settings.formats || []).find(f => f && f.id === id);
  return own || (Prefs.formats || []).find(f => f && f.id === id) || null;
}
function formatChoices() {
  const out = Object.keys(TE.FORMATS).map(k => [k, TE.FORMATS[k].name]);
  const seen = {};
  const add = list => (list || []).forEach(f => {
    if (f && f.id && !seen[f.id] && !TE.FORMATS[f.id]) { seen[f.id] = 1; out.push([f.id, f.name]); }
  });
  add(App.project && App.project.settings.formats);
  add(Prefs.formats);
  return out;
}
const STD_BY_N = { 3: '5x5', 4: '5x5', 5: '5x5', 6: '6x6', 7: '7x7', 8: '8x8', 9: '9x9', 10: '11x11', 11: '11x11' };
function formatPlayers(id) { const f = fmtObj(id); return (f && f.n) || 8; }
function stdFormat(id) { return TE.FORMATS[id] ? id : (STD_BY_N[formatPlayers(id)] || '8x8'); }
function formationsFor(id) { return FORMATIONS[stdFormat(id)] || FORMATIONS['8x8']; }
function defaultFormationFor(id) { return DEFAULT_FORMATION[stdFormat(id)] || '3-3-1'; }
/* Формат уезжает вместе с презентацией — иначе у команды поле будет другим */
function applyFormat(id) {
  const f = fmtObj(id);
  commit(p => {
    p.settings.format = id;
    if (f && f.custom) {
      if (!Array.isArray(p.settings.formats)) p.settings.formats = [];
      const k = p.settings.formats.findIndex(x => x && x.id === id);
      if (k >= 0) p.settings.formats[k] = clone(f); else p.settings.formats.push(clone(f));
    }
  }, { parts: ['style', 'insp'] });
}
function blankFormat() {
  return { id: 'fmt' + uid().slice(0, 6), name: 'Наше поле', n: 8, ratio: 1.5, m: [60, 40], box: [0.56, 0.16], ga: [0.26, 0.055], spot: 0.11, circle: 0.122, goal: 0.17, arc: true, round: false, custom: true };
}
function rememberFormat(f) {
  if (!Array.isArray(Prefs.formats)) Prefs.formats = [];
  const k = Prefs.formats.findIndex(x => x && x.id === f.id);
  if (k >= 0) Prefs.formats[k] = clone(f); else Prefs.formats.push(clone(f));
  savePrefs();
}
function openFormatEditor(src, onSaved) {
  const f = TE.normFormat(src ? clone(src) : blankFormat());
  let autoRatio = !src;
  const prev = h('div', { class: 'fmt-prev' });
  const note = h('p', { class: 'muted small' }, '');
  let timer = 0;
  const redraw = () => {
    note.textContent = `Поле ${f.m[0]}×${f.m[1]} м, пропорции 1 : ${f.ratio.toFixed(2)}.`;
    clearTimeout(timer);
    timer = setTimeout(() => {
      prev.textContent = '';
      try {
        const base = App.project ? clone(App.project.settings) : TE.defaultSettings('8x8');
        base.format = f.id;
        base.formats = [clone(f)];
        base.pitch = Object.assign({}, base.pitch, { ratio: 0, view: 'full', orientation: 'vertical' });
        const proj = TE.normalizeProject({ settings: base, slides: [] });
        new TE.Board(prev, TE.normalizeBoard({ entities: [], frames: [{ pos: {} }] }), proj, { bare: true, frame: 0 });
      } catch (e) { /* без предпросмотра тоже можно работать */ }
    }, 40);
  };
  const upd = fn => v => {
    fn(v);
    if (autoRatio && f.m[1] > 0) f.ratio = +(f.m[0] / f.m[1]).toFixed(3);
    redraw();
  };
  const pct = v => Math.round(v * 100) + '%';
  const gaRow = h('div', { class: 'set-grid' });
  const drawGa = () => {
    gaRow.textContent = '';
    if (!f.ga) return;
    appendAll(gaRow,
      fld('Вратарская: ширина', rng(f.ga[0], 0.1, 0.8, 0.01, upd(v => { f.ga[0] = v; }), pct)),
      fld('Вратарская: глубина', rng(f.ga[1], 0.02, 0.2, 0.005, upd(v => { f.ga[1] = v; }), pct)));
  };
  drawGa();
  const close = modal(src ? 'Свой формат поля' : 'Новый формат поля', [
    h('div', { class: 'set-grid' },
      fld('Название', txt(f.name, upd(v => { f.name = v; }), { max: 24, ph: 'Наш зал' })),
      fld('Игроков в команде', rng(f.n, 3, 11, 1, upd(v => { f.n = Math.round(v); }), v => Math.round(v) + ' на ' + Math.round(v)), 'От этого зависят расстановки'),
      fld('Длина поля, м', rng(f.m[0], 15, 130, 1, upd(v => { f.m[0] = v; }), v => v + ' м')),
      fld('Ширина поля, м', rng(f.m[1], 10, 90, 1, upd(v => { f.m[1] = v; }), v => v + ' м'))),
    tog(autoRatio, v => { autoRatio = v; if (v && f.m[1] > 0) f.ratio = +(f.m[0] / f.m[1]).toFixed(3); redraw(); }, 'Пропорции поля считать по размерам'),
    fld('Пропорции', rng(f.ratio, 1, 2.6, 0.02, v => { autoRatio = false; f.ratio = v; redraw(); }, v => '1 : ' + v.toFixed(2))),
    prev,
    note,
    h('div', { class: 'set-grid' },
      fld('Штрафная: ширина', rng(f.box[0], 0.2, 0.98, 0.01, upd(v => { f.box[0] = v; }), pct)),
      fld('Штрафная: глубина', rng(f.box[1], 0.05, 0.35, 0.005, upd(v => { f.box[1] = v; }), pct)),
      fld('Точка пенальти', rng(f.spot, 0.03, 0.3, 0.005, upd(v => { f.spot = v; }), pct), 'Доля длины поля от ворот'),
      fld('Центральный круг', rng(f.circle, 0.04, 0.3, 0.005, upd(v => { f.circle = v; }), pct)),
      fld('Ширина ворот', rng(f.goal, 0.05, 0.45, 0.005, upd(v => { f.goal = v; }), pct))),
    tog(!!f.ga, v => { f.ga = v ? [0.26, 0.055] : null; drawGa(); redraw(); }, 'Есть вратарская площадка'),
    gaRow,
    tog(!!f.round, upd(v => { f.round = v; }), 'Штрафная скруглённая, как в мини-футболе'),
    tog(!!f.arc, upd(v => { f.arc = v; }), 'Дуга у штрафной'),
    h('div', { class: 'btn-row' },
      btn('check', 'Сохранить формат', () => {
        const done = TE.normFormat(f);
        rememberFormat(done);
        close();
        if (onSaved) onSaved(done);
        toast('Формат сохранён');
      }, false, 'primary'),
      src ? btn('trash', 'Убрать из моих', () => {
        Prefs.formats = (Prefs.formats || []).filter(x => x.id !== f.id);
        savePrefs();
        close();
        if (onSaved) onSaved(null);
        toast('Формат убран. В презентациях, где он уже стоит, поле не изменится');
      }, false, 'sm danger') : null)
  ], { wide: true });
  redraw();
}
/* ---------- Свои типы стрелок ---------- */
/* Привычные типы плюс мои — они лежат на устройстве и доступны во всех презентациях */
function arrowPresets() {
  const out = {};
  Object.keys(ARROW_PRESETS).forEach(k => { out[k] = ARROW_PRESETS[k]; });
  (Prefs.arrows || []).forEach(p => {
    if (p && p.id && p.a) out[p.id] = { name: p.name, a: p.a, ball: !!p.ball, move: !!p.move, custom: true };
  });
  return out;
}
function askName(title, value, onOk, extra) {
  let v = value || '';
  const close = modal(title, [
    fld('Название', txt(v, x => { v = x; }, { max: 20, focus: true, ph: 'Например: заброс за спину' })),
    extra || null,
    h('div', { class: 'btn-row' }, btn('check', 'Сохранить', () => {
      const s = v.trim();
      if (!s) { toast('Придумайте название'); return; }
      close();
      onOk(s);
    }, false, 'primary'))
  ]);
}
/* Запоминаем вид выбранной стрелки как свой тип */
function saveArrowType(a) {
  let ball = a.kind !== 'move';
  const tg = tog(ball, v => { ball = v; }, 'Мяч идёт по этой стрелке');
  askName('Свой тип стрелки', '', name => {
    if (!Array.isArray(Prefs.arrows)) Prefs.arrows = [];
    const keep = ['style', 'color', 'width', 'head', 'bend', 'lob', 'opacity', 'draw'];
    const v = {};
    keep.forEach(k => { if (a[k] !== undefined && a[k] !== null) v[k] = a[k]; });
    Prefs.arrows.push({ id: 'arr' + uid().slice(0, 6), name, a: v, ball, move: a.kind === 'move' });
    Prefs.arrows = Prefs.arrows.slice(-24);
    savePrefs();
    refresh(['tools', 'insp']);
    toast('Тип стрелки «' + name + '» сохранён');
  }, tg);
}
function removeArrowType(id) {
  Prefs.arrows = (Prefs.arrows || []).filter(x => x.id !== id);
  savePrefs();
  if (App.tool && App.tool.preset === id) App.tool.preset = 'run';
  refresh(['tools', 'insp']);
}

/* ---------- Мои цвета ---------- */
function addPaletteColor(c) {
  if (!/^#[0-9a-f]{6}$/i.test(String(c))) return false;
  c = String(c).toLowerCase();
  if (!Array.isArray(Prefs.palette)) Prefs.palette = [];
  if (SWATCHES.indexOf(c) >= 0 || Prefs.palette.indexOf(c) >= 0) return false;
  Prefs.palette.unshift(c);
  Prefs.palette = Prefs.palette.slice(0, 14);
  savePrefs();
  return true;
}
function removePaletteColor(c) {
  Prefs.palette = (Prefs.palette || []).filter(x => x !== c);
  savePrefs();
}
/* ---------- Свои расстановки ---------- */
/* Снимок расстановки прямо с поля: кто где стоит на этом шаге */
function boardSpots(team) {
  const b = board(), f = frame();
  if (!b || !f) return [];
  return b.entities.filter(e => e.kind === team && Array.isArray(f.pos[e.id]))
    .map(e => ({ label: e.label || '', number: e.number || '', gk: !!e.gk, x: +(+f.pos[e.id][0]).toFixed(1), y: +(+f.pos[e.id][1]).toFixed(1) }))
    .sort((a, c) => (c.gk ? 1 : 0) - (a.gk ? 1 : 0) || c.y - a.y);
}
function mirrorSpots(spots) {
  return spots.map(s => Object.assign({}, s, { x: +(100 - s.x).toFixed(1), y: +(100 - s.y).toFixed(1) }));
}
function rememberFormation(item) {
  if (!Array.isArray(Prefs.formations)) Prefs.formations = [];
  Prefs.formations.push(item);
  Prefs.formations = Prefs.formations.slice(-24);
  savePrefs();
}
function saveBoardFormation(team, after) {
  const spots = boardSpots(team);
  if (spots.length < 2) { toast('На этом шаге некого запоминать'); return; }
  askName('Своя расстановка', '', name => {
    rememberFormation({ id: 'frm' + uid().slice(0, 6), name, team, spots, n: spots.length });
    toast(`Расстановка «${name}» сохранена: ${spots.length} ${plural(spots.length, 'игрок', 'игрока', 'игроков')}`);
    if (after) after();
  });
}
function removeFormation(id, after) {
  Prefs.formations = (Prefs.formations || []).filter(x => x.id !== id);
  savePrefs();
  if (after) after();
}

/* ---------- Моё оформление ---------- */
const THEME_KEYS = ['look', 'colors', 'tokens'];
const THEME_PITCH = ['grass', 'grass2', 'surround', 'lines', 'stripes', 'markings'];
function saveTheme(after) {
  askName('Своё оформление', '', name => {
    const st = App.project.settings, item = { id: 'thm' + uid().slice(0, 6), name, pitch: {} };
    THEME_KEYS.forEach(k => { item[k] = clone(st[k]); });
    THEME_PITCH.forEach(k => { item.pitch[k] = st.pitch[k]; });
    if (!Array.isArray(Prefs.themes)) Prefs.themes = [];
    Prefs.themes.push(item);
    Prefs.themes = Prefs.themes.slice(-16);
    savePrefs();
    toast('Оформление «' + name + '» сохранено');
    if (after) after();
  });
}
function applyTheme(item) {
  commit(p => {
    THEME_KEYS.forEach(k => { if (item[k]) Object.assign(p.settings[k], clone(item[k])); });
    THEME_PITCH.forEach(k => { if (item.pitch && item.pitch[k] !== undefined) p.settings.pitch[k] = item.pitch[k]; });
  }, { parts: ['canvas', 'main', 'insp'] });
  toast('Оформление «' + item.name + '» применено');
}
function removeTheme(id, after) {
  Prefs.themes = (Prefs.themes || []).filter(x => x.id !== id);
  savePrefs();
  if (after) after();
}
/* ---------- Эмблема ---------- */
function brandLogoBox(after) {
  const st = App.project.settings;
  const file = h('input', { type: 'file', accept: 'image/*' });
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    readImage(f, src => {
      if (!src) { toast('Не получилось прочитать картинку'); return; }
      commit(p => { p.settings.brand.logo = src; }, { parts: ['main'] });
      if (after) after();
    });
  });
  return h('div', { class: 'img-box' },
    st.brand.logo ? h('img', { class: 'img-prev brand-prev', src: st.brand.logo, alt: '' }) : null,
    h('div', { class: 'btn-row' },
      h('label', { class: 'btn sm file-btn' }, icon('upload'), h('span', { class: 'lbl' }, st.brand.logo ? 'Заменить эмблему' : 'Выбрать эмблему'), file),
      st.brand.logo ? btn('trash', 'Убрать', () => { commit(p => { p.settings.brand.logo = ''; }, { parts: ['main'] }); if (after) after(); }, false, 'sm danger') : null),
    h('p', { class: 'muted small' }, 'Эмблема видна в шапке показа и на титульном слайде. Лучше небольшой PNG на прозрачном фоне.'));
}
