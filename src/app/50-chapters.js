/* ---------- Главы ---------- */
/* Пары «левый ↔ правый» по подписям: ЛЗ ↔ ПЗ, ЛП ↔ ПП, ЛЛ ↔ ПЛ */
function mirrorPairs(b) {
  const map = {}, byLabel = {};
  b.entities.forEach(e => { if (e.label) byLabel[e.kind + '|' + e.label] = e.id; });
  b.entities.forEach(e => {
    const l = e.label || '';
    if (!l || (l[0] !== 'Л' && l[0] !== 'П')) return;
    const other = (l[0] === 'Л' ? 'П' : 'Л') + l.slice(1);
    const id2 = byLabel[e.kind + '|' + other];
    if (id2) map[e.id] = id2;
  });
  return map;
}
const SIDE_WORDS = [
  ['справа', 'слева'], ['правый', 'левый'], ['правого', 'левого'], ['правому', 'левому'],
  ['правым', 'левым'], ['правом', 'левом'], ['правая', 'левая'], ['правой', 'левой'],
  ['правую', 'левую'], ['правое', 'левое'], ['правые', 'левые'], ['правых', 'левых'],
  ['вправо', 'влево'], ['направо', 'налево'], ['правее', 'левее'], ['правда', 'правда']
];
/* Поменять в тексте «право» на «лево» и подписи игроков на зеркальные */
function mirrorCaption(s, b) {
  let out = String(s || '');
  const map = {};
  SIDE_WORDS.forEach(p => { if (p[0] !== p[1]) { map[p[0]] = p[1]; map[p[1]] = p[0]; } });
  const words = Object.keys(map).sort((a, c) => c.length - a.length);
  if (words.length) {
    out = out.replace(new RegExp('(' + words.join('|') + ')', 'gi'), m => {
      const rep = map[m.toLowerCase()] || m;
      return m[0] === m[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep;
    });
  }
  const pairs = {};
  b.entities.forEach(e => {
    const l = e.label;
    if (!l || (l[0] !== 'Л' && l[0] !== 'П')) return;
    const other = (l[0] === 'Л' ? 'П' : 'Л') + l.slice(1);
    if (b.entities.some(x => x.kind === e.kind && x.label === other)) pairs[l] = other;
  });
  const keys = Object.keys(pairs).sort((a, c) => c.length - a.length);
  if (keys.length) {
    out = out.replace(new RegExp('(^|[^A-Za-zА-Яа-яЁё])(' + keys.join('|') + ')(?![A-Za-zА-Яа-яЁё])', 'g'), (m, pre, lab) => pre + pairs[lab]);
  }
  return out;
}
/* Зеркальная копия шагов: тот же сценарий, но на другом фланге */
function mirrorFrames(frames, b) {
  const pair = mirrorPairs(b);
  const swap = id => pair[id] || id;
  const fx = p => [+(100 - p[0]).toFixed(1), +(+p[1]).toFixed(1)];
  return frames.map(src => {
    const f = clone(src);
    f.id = uid();
    const pos = {};
    for (const id in src.pos) { const p = src.pos[id]; pos[swap(id)] = p ? fx(p) : null; }
    f.pos = pos;
    ['hl', 'dim', 'focus'].forEach(k => { f[k] = (src[k] || []).map(swap); });
    const ord = {};
    for (const id in (src.ord || {})) ord[swap(id)] = src.ord[id];
    f.ord = ord;
    f.arrows = (src.arrows || []).map(a => {
      const c = clone(a);
      c.id = uid();
      if (c.kind === 'move') c.target = swap(c.target);
      ['from', 'to'].forEach(s => {
        if (c[s] && c[s].e) c[s] = { e: swap(c[s].e) };
        else if (c[s] && c[s].p) c[s] = { p: fx(c[s].p) };
      });
      if (Array.isArray(c.pts)) c.pts = c.pts.map(fx);
      if (c.bend) c.bend = -c.bend;
      return c;
    });
    f.zones = (src.zones || []).map(z => {
      const c = clone(z);
      c.id = uid();
      if (Array.isArray(c.ids)) c.ids = c.ids.map(swap);
      if (c.target) c.target = swap(c.target);
      if (c.type === 'rect') c.x = +(100 - c.x - c.w).toFixed(1);
      else if (c.type === 'ellipse') c.cx = +(100 - c.cx).toFixed(1);
      else if (c.type === 'text') c.x = +(100 - c.x).toFixed(1);
      return c;
    });
    f.bubbles = (src.bubbles || []).map(x => { const c = clone(x); c.id = uid(); c.target = swap(c.target); return c; });
    if (src.ball) f.ball = src.ball.owner ? { owner: swap(src.ball.owner) } : (src.ball.at ? { at: fx(src.ball.at) } : null);
    f.cap = mirrorCaption(src.cap, b);
    f.chapter = src.chapter ? mirrorCaption(src.chapter, b) : '';
    return f;
  });
}
function chapterList() {
  const b = board();
  if (!b) return [];
  return TE.computeChapters(b.frames) || [{ name: b.frames[0].chapter || 'Весь ролик', from: 0, to: b.frames.length - 1 }];
}
function dupChapter(c, mirror) {
  commit(() => {
    const b = board(), src = b.frames.slice(c.from, c.to + 1);
    const copy = mirror ? mirrorFrames(src, b) : src.map(f => {
      const x = clone(f);
      x.id = uid();
      ['arrows', 'zones', 'bubbles'].forEach(k => (x[k] || []).forEach(y => { y.id = uid(); }));
      return x;
    });
    if (copy.length) {
      const was = src[0].chapter || c.name;
      const now = copy[0].chapter || was;
      copy[0].chapter = mirror ? (now === was ? was + ' (зеркально)' : now) : was + ' (копия)';
    }
    b.frames.splice.apply(b.frames, [c.to + 1, 0].concat(copy));
    App.frameIdx = c.to + 1;
    App.frameSel = [];
    App.sel = null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides'] });
  toast(mirror ? 'Глава продублирована зеркально' : 'Глава продублирована');
}
function delChapter(c) {
  const b = board();
  const n = c.to - c.from + 1;
  if (b.frames.length - n < 1) { toast('Хотя бы один шаг должен остаться'); return; }
  commit(() => {
    const bb = board();
    bb.frames.splice(c.from, n);
    if (bb.frames[0]) bb.frames[0].chapter = bb.frames[0].chapter || '';
    App.frameIdx = Math.max(0, Math.min(bb.frames.length - 1, c.from - 1));
    App.frameSel = [];
    App.sel = null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides'] });
}
function moveChapter(c, dir) {
  const all = chapterList(), at = all.findIndex(x => x.from === c.from);
  const other = all[at + dir];
  if (!other) return;
  commit(() => {
    const b = board();
    const mine = b.frames.splice(c.from, c.to - c.from + 1);
    const insert = dir < 0 ? other.from : other.to - mine.length + 1;
    b.frames.splice.apply(b.frames, [insert, 0].concat(mine));
    App.frameIdx = insert;
    App.frameSel = [];
  }, { parts: ['canvas', 'timeline', 'insp', 'slides'] });
}
function openChapters() {
  const b = board();
  if (!b) return;
  const body = h('div');
  let close;
  const draw = () => {
    body.textContent = '';
    const all = chapterList();
    appendAll(body,
      h('p', { class: 'muted small' }, 'Глава начинается с шага, у которого есть название. В показе главы становятся кнопками над схемой.'),
      h('div', null, all.map((c, k) => {
        const name = txt(c.name, v => commit(() => { board().frames[c.from].chapter = v; }, { key: 'chap' + c.from, parts: ['timeline', 'slides'] }), { ph: 'Название главы', max: 40 });
        return h('div', { class: 'exp-card' },
          fld(`Шаги ${c.from + 1}–${c.to + 1}`, name),
          h('div', { class: 'btn-row' },
            btn('up', 'Выше', () => { moveChapter(c, -1); draw(); }, k === 0, 'sm'),
            btn('down', 'Ниже', () => { moveChapter(c, 1); draw(); }, k === all.length - 1, 'sm'),
            btn('copy', 'Дублировать', () => { dupChapter(c, false); draw(); }, false, 'sm'),
            btn('', 'Зеркально', () => { dupChapter(c, true); draw(); }, false, 'sm', 'Тот же сценарий на другом фланге: игроки меняются местами по подписям, текст «справа» становится «слева»'),
            btn('trash', 'Удалить', () => { delChapter(c); draw(); }, all.length < 2, 'sm danger')));
      })),
      h('div', { class: 'btn-row' }, btn('check', 'Готово', () => close(), false, 'primary')));
  };
  draw();
  close = modal('Главы схемы', body, { onClose: () => refresh(['timeline', 'insp']) });
}