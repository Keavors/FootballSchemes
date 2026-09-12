
function newFrame() {
  return { id: uid(), pos: {}, ball: null, hl: [], dim: [], focus: [], arrows: [], zones: [], bubbles: [], cap: '', chapter: '', dur: 1100, hold: 2000 };
}

function normalizeBoard(b) {
  if (!Array.isArray(b.entities)) b.entities = [];
  b.entities = b.entities.filter(e => e && typeof e === 'object');
  b.entities.forEach(e => {
    e.id = String(e.id || uid());
    e.kind = e.kind || 'ours';
    if (e.label == null) e.label = '';
    if (e.number == null) e.number = '';
  });
  if (!Array.isArray(b.frames)) b.frames = [];
  b.frames = b.frames.filter(f => f && typeof f === 'object');
  if (!b.frames.length) b.frames = [newFrame()];
  b.frames.forEach(f => {
    f.id = f.id || uid();
    if (!f.pos || typeof f.pos !== 'object') f.pos = {};
    ['arrows', 'zones', 'bubbles', 'hl', 'dim', 'focus'].forEach(k => { if (!Array.isArray(f[k])) f[k] = []; });
    /* У стрелок, зон и реплик всегда есть id — по ним работает выделение и буфер обмена */
    ['arrows', 'zones', 'bubbles'].forEach(k => {
      f[k] = f[k].filter(x => x && typeof x === 'object');
      f[k].forEach(x => { if (!x.id) x.id = uid(); });
    });
    f.arrows.forEach(a => {
      if (!Array.isArray(a.pts)) { if (a.pts !== undefined) delete a.pts; return; }
      a.pts = a.pts.filter(p => Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]));
      if (!a.pts.length) delete a.pts;
    });
    if (f.ball === undefined) f.ball = null;
    if (!f.ord || typeof f.ord !== 'object' || Array.isArray(f.ord)) f.ord = {};
    /* Пауза-вопрос перед шагом */
    if (f.quiz && typeof f.quiz === 'object' && String(f.quiz.q || '').trim()) {
      f.quiz = { q: String(f.quiz.q), a: String(f.quiz.a == null ? '' : f.quiz.a) };
    } else if (f.quiz !== undefined) delete f.quiz;
    if (typeof f.cap !== 'string') f.cap = '';
    if (typeof f.chapter !== 'string') f.chapter = '';
    f.dur = +f.dur || 1100;
    f.hold = +f.hold || 2000;
  });
  if (b.autoplay === undefined) b.autoplay = true;
  if (b.loop === undefined) b.loop = false;
  if (b.legend === undefined) b.legend = true;
  if (b.still === undefined) b.still = false;
  if (typeof b.grid !== 'string') b.grid = 'none';
  /* Своя ориентация и часть поля у отдельной схемы */
  if (!b.view || typeof b.view !== 'object') b.view = {};
  if (['inherit', 'vertical', 'horizontal'].indexOf(b.view.orientation) < 0) b.view.orientation = 'inherit';
  if (['inherit', 'full', 'attack', 'defence'].indexOf(b.view.part) < 0) b.view.part = 'inherit';
  if (b.gridShow !== 'always') b.gridShow = 'editor';
  return b;
}

/* Версия формата данных: по ней старые презентации переносятся на нынешний вид */
const FORMAT_V = 1;
const MIGRATIONS = [
  /* 0 → 1: раньше картинка слайда была просто ссылкой, а ориентация поля могла быть «авто» */
  function toV1(p) {
    (Array.isArray(p.slides) ? p.slides : []).forEach(s => {
      if (s && typeof s.image === 'string' && s.image) s.image = { src: s.image, alt: '', place: 'body' };
    });
    const pit = p.settings && p.settings.pitch;
    if (pit && (pit.orientation === 'auto' || !pit.orientation)) pit.orientation = 'vertical';
  }
];
function migrateProject(p) {
  let v = Math.max(0, Math.round(+p.v || 0));
  while (v < FORMAT_V && MIGRATIONS[v]) {
    try { MIGRATIONS[v](p); } catch (e) { /* шаг не удался — идём дальше, дальше всё равно всё проверим */ }
    v++;
  }
  p.v = FORMAT_V;
  return p;
}
/* Презентация из более новой версии: открыть можно, но что-то может выглядеть не так */
function tooNew(p) { return !!p && Math.round(+p.v || 0) > FORMAT_V; }
function normalizeProject(p) {
  p = p && typeof p === 'object' ? p : {};
  migrateProject(p);
  const fmt = (p.settings && p.settings.format) || '8x8';
  p.settings = deepMerge(defaultSettings(fmt), p.settings || {});
  /* Свои форматы поля живут прямо в презентации, иначе у команды поле будет другим */
  p.settings.formats = (Array.isArray(p.settings.formats) ? p.settings.formats : [])
    .filter(f => f && typeof f === 'object').map(normFormat).slice(0, 24);
  if (!FORMATS[p.settings.format] && !p.settings.formats.some(f => f.id === p.settings.format)) p.settings.format = '8x8';
  /* Название команды и эмблема: эмблема — только картинка, чужие ссылки не берём */
  const br = p.settings.brand && typeof p.settings.brand === 'object' ? p.settings.brand : {};
  const logo = String(br.logo || '');
  p.settings.brand = {
    team: String(br.team == null ? '' : br.team).slice(0, 40),
    logo: /^data:image\//.test(logo) && logo.length < 600000 ? logo : ''
  };
  p.title = typeof p.title === 'string' ? p.title : 'Презентация';
  p.id = String(p.id || uid());
  /* Состав команды: имя, номер, позиция. Фишка может быть привязана к игроку состава */
  if (!Array.isArray(p.roster)) p.roster = [];
  p.roster = p.roster.filter(r => r && typeof r === 'object').map(r => ({
    id: String(r.id || uid()),
    name: String(r.name == null ? '' : r.name),
    number: String(r.number == null ? '' : r.number),
    pos: String(r.pos == null ? '' : r.pos)
  }));
  if (!Array.isArray(p.slides)) p.slides = [];
  p.slides = p.slides.filter(s => s && typeof s === 'object');
  p.slides.forEach(s => {
    s.id = String(s.id || uid());
    ['title', 'subtitle', 'body', 'nav', 'notes'].forEach(k => { if (typeof s[k] !== 'string') s[k] = ''; });
    s.hidden = !!s.hidden;
    /* Картинка на слайде: только сама ссылка на данные и место показа */
    if (s.image && typeof s.image === 'object' && typeof s.image.src === 'string' && s.image.src) {
      s.image = {
        src: s.image.src,
        alt: String(s.image.alt == null ? '' : s.image.alt),
        place: s.image.place === 'side' ? 'side' : 'body'
      };
    } else if (s.image !== undefined) delete s.image;
    if (!s.board || typeof s.board !== 'object') s.board = null;
    if (['split', 'board', 'text', 'title', 'duo', 'roles'].indexOf(s.layout) < 0) s.layout = s.board ? 'split' : 'text';
    if (!Array.isArray(s.roles)) s.roles = [];
    s.roles = s.roles.filter(r => r && typeof r === 'object').map(r => ({
      id: String(r.id || uid()),
      title: String(r.title == null ? '' : r.title),
      body: String(r.body == null ? '' : r.body),
      ids: Array.isArray(r.ids) ? r.ids.map(String) : []
    }));
    s.side = s.side === 'right' ? 'right' : 'left';
    ['cap1', 'cap2'].forEach(k => { if (typeof s[k] !== 'string') s[k] = ''; });
    if (s.board) normalizeBoard(s.board);
    if (s.board2) normalizeBoard(s.board2);
    if (s.layout === 'duo' && !s.board2) s.layout = s.board ? 'split' : 'text';
    if (s.layout === 'roles' && !s.board) s.layout = 'text';
  });
  return p;
}