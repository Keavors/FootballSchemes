
/* ---------- Форматы и настройки ---------- */
const FORMATS = {
  '5x5': { name: '5×5', n: 5, ratio: 2.0, box: [0.76, 0.15], ga: null, spot: 0.15, circle: 0.15, goal: 0.16, arc: false, round: true, m: [40, 20] },
  '6x6': { name: '6×6', n: 6, ratio: 1.6, box: [0.62, 0.15], ga: null, spot: 0.12, circle: 0.12, goal: 0.16, arc: false, m: [48, 30] },
  '7x7': { name: '7×7', n: 7, ratio: 1.55, box: [0.58, 0.15], ga: [0.28, 0.05], spot: 0.11, circle: 0.12, goal: 0.16, arc: true, m: [55, 35] },
  '8x8': { name: '8×8', n: 8, ratio: 1.5, box: [0.56, 0.16], ga: [0.26, 0.055], spot: 0.11, circle: 0.122, goal: 0.17, arc: true, m: [60, 40] },
  '9x9': { name: '9×9', n: 9, ratio: 1.5, box: [0.56, 0.16], ga: [0.26, 0.055], spot: 0.11, circle: 0.12, goal: 0.14, arc: true, m: [70, 50] },
  '11x11': { name: '11×11', n: 11, ratio: 1.54, box: [0.593, 0.157], ga: [0.269, 0.052], spot: 0.105, circle: 0.135, goal: 0.108, arc: true, arcR: 0.135, m: [105, 68] }
};
/* Формат поля: привычный или свой, сохранённый вместе с презентацией */
function formatOf(st) {
  const own = Array.isArray(st.formats) ? st.formats.find(f => f && f.id === st.format) : null;
  return own || FORMATS[st.format] || FORMATS['8x8'];
}
/* Свой формат приводим в порядок: всё в разумных пределах, чтобы поле не развалилось */
function normFormat(f) {
  f = f && typeof f === 'object' ? f : {};
  const num = (v, d, lo, hi) => { const n = +v; return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const ga = Array.isArray(f.ga) ? f.ga : null;
  const out = {
    id: String(f.id || ('fmt' + uid().slice(0, 6))),
    name: String(f.name || 'Своё поле').slice(0, 24) || 'Своё поле',
    n: Math.round(num(f.n, 8, 3, 11)),
    ratio: +num(f.ratio, 1.5, 1, 2.6).toFixed(3),
    m: [Math.round(num(f.m && f.m[0], 60, 15, 130)), Math.round(num(f.m && f.m[1], 40, 10, 90))],
    box: [num(f.box && f.box[0], 0.56, 0.2, 0.98), num(f.box && f.box[1], 0.16, 0.05, 0.35)],
    ga: ga ? [num(ga[0], 0.26, 0.1, 0.8), num(ga[1], 0.055, 0.02, 0.2)] : null,
    spot: num(f.spot, 0.11, 0.03, 0.3),
    circle: num(f.circle, 0.122, 0.04, 0.3),
    goal: num(f.goal, 0.17, 0.05, 0.45),
    arc: !!f.arc,
    round: !!f.round,
    custom: true
  };
  if (f.arcR) out.arcR = num(f.arcR, 0.135, 0.05, 0.4);
  return out;
}
/* Реальные размеры поля в метрах: свои из настроек или типичные для формата */
function pitchMeters(st) {
  const f = formatOf(st), m = f.m || [60, 40];
  return [+st.pitch.lengthM > 10 ? +st.pitch.lengthM : m[0], +st.pitch.widthM > 5 ? +st.pitch.widthM : m[1]];
}

function defaultSettings(format) {
  return {
    format: FORMATS[format] ? format : '8x8',
    formats: [],
    pitch: { orientation: 'vertical', view: 'full', ratio: 0, lengthM: 0, widthM: 0, stripes: true, markings: true, grass: '#3a8a55', grass2: '#40925b', surround: '#2f7a4a', lines: '#ffffff' },
    colors: {
      ours: '#2456c7', oursText: '#ffffff', oursKeeper: '#f1c232', oursKeeperText: '#1f2a44',
      opp: '#d8453c', oppText: '#ffffff', oppKeeper: '#9e2f28', oppKeeperText: '#ffffff',
      third: '#7b8699', thirdText: '#ffffff', thirdKeeper: '#4f596b', thirdKeeperText: '#ffffff',
      special: '#ff7a00', specialText: '#1f2a44',
      run: '#ffffff', pass: '#ffe066', oppArrow: '#ff5a4e', ball: '#ffffff'
    },
    tokens: { oursSize: 1, oppSize: 0.8, thirdSize: 0.9, oursLabel: 'label', oppLabel: 'none', thirdLabel: 'label', oursShape: 'circle', oppShape: 'circle', thirdShape: 'circle', showNames: false },
    legend: { show: true, ours: 'мы', special: 'выделен', opp: 'соперник', third: 'нейтральные', pass: 'пас', run: 'бег', dir: 'auto' },
    look: { theme: 'board', font: 'sport', accent: '#ff7a00' },
    brand: { team: '', logo: '' },
    anim: { speed: 1, autoplay: true }
  };
}

function deepMerge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object') {
    const o = over && typeof over === 'object' && !Array.isArray(over) ? over : {};
    const out = {};
    for (const k in base) out[k] = deepMerge(base[k], o[k]);
    for (const k in o) if (!(k in base)) out[k] = o[k];
    return out;
  }
  if (over === undefined || over === null) return base;
  if (typeof base === 'number') { const n = +over; return isNaN(n) ? base : n; }
  if (typeof base === 'boolean') return !!over;
  return over;
}