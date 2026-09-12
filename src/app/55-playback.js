/* ---------- Прокрутка, скорость, несколько шагов ---------- */
function editorSpeed() {
  return Math.max(0.2, (+App.project.settings.anim.speed || 1) * (App.playSpeed || 1));
}
function scrubEditor(x) {
  const bd = App.canvasBoard, b = board();
  if (!bd || !b) return;
  const i = Math.max(0, Math.min(b.frames.length - 1, Math.floor(x + 1e-6)));
  bd.scrubTo(i, x - i);
  drawOverlay(bd);
}
function scrubDone(x) {
  const b = board();
  if (!b) return;
  App.frameIdx = Math.max(0, Math.min(b.frames.length - 1, Math.round(x)));
  refresh(['canvas', 'timeline', 'insp', 'tools']);
}
function playFrom() {
  const bd = App.canvasBoard, b = board();
  if (!bd || !b || b.frames.length < 2) return;
  App.playing = true;
  App.tool = { m: 'select' };
  refresh(['tools', 'timeline']);
  const host = $('#edCanvas');
  if (host) host.appendChild(h('div', { class: 'ed-play-badge' }, 'Воспроизведение'));
  bd.speed = editorSpeed();
  bd.playRange(App.frameIdx, b.frames.length - 1, stopPlay);
}
function toggleFrameSel(k) {
  const i = App.frameSel.indexOf(k);
  if (i >= 0) App.frameSel.splice(i, 1); else App.frameSel.push(k);
  App.frameSel.sort((a, b) => a - b);
  refresh(['timeline']);
}
function copyFrames(list) {
  const b = board();
  if (!b || !list.length) return;
  const frames = list.map(k => clone(b.frames[k]));
  const ids = {};
  frames.forEach(f => Object.keys(f.pos).forEach(id => { if (f.pos[id]) ids[id] = 1; }));
  setClip({
    kind: 'frames', v: 1, format: App.project.settings.format, time: Date.now(),
    frames, entities: b.entities.filter(e => ids[e.id]).map(e => clone(e))
  });
  toast(`Скопировано шагов: ${frames.length}`);
  refresh(['timeline', 'insp', 'bar']);
}
function pasteFramesClip(clip) {
  if (!board()) { toast('На этом слайде нет схемы'); return; }
  commit(() => {
    const bb = board();
    (clip.entities || []).forEach(src => {
      if (bb.entities.some(x => x.id === src.id)) return;
      bb.entities.push(clone(src));
      bb.frames.forEach(fr => { if (!(src.id in fr.pos)) fr.pos[src.id] = null; });
    });
    const add = (clip.frames || []).map(src => {
      const f = clone(src);
      f.id = uid();
      ['arrows', 'zones', 'bubbles'].forEach(k => (f[k] || []).forEach(x => { x.id = uid(); }));
      Object.keys(f.pos).forEach(id => { if (!bb.entities.some(x => x.id === id)) delete f.pos[id]; });
      return f;
    });
    bb.frames.splice.apply(bb.frames, [App.frameIdx + 1, 0].concat(add));
    App.frameIdx += add.length;
    App.frameSel = [];
    App.sel = null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides'] });
  toast('Шаги вставлены');
}
function deleteFrames(list) {
  const b = board();
  if (!b || !list.length) return;
  if (b.frames.length - list.length < 1) { toast('Хотя бы один шаг должен остаться'); return; }
  commit(() => {
    const bb = board();
    list.slice().sort((a, b2) => b2 - a).forEach(k => bb.frames.splice(k, 1));
    App.frameIdx = Math.max(0, Math.min(bb.frames.length - 1, list[0] - 1));
    App.frameSel = [];
    App.sel = null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides'] });
}
function moveFrames(list, dir) {
  const b = board();
  if (!b || !list.length) return;
  const sorted = list.slice().sort((a, b2) => a - b2);
  if (dir < 0 && sorted[0] === 0) return;
  if (dir > 0 && sorted[sorted.length - 1] >= b.frames.length - 1) return;
  commit(() => {
    const bb = board();
    (dir > 0 ? sorted.slice().reverse() : sorted).forEach(k => {
      const [f] = bb.frames.splice(k, 1);
      bb.frames.splice(k + dir, 0, f);
    });
    App.frameSel = sorted.map(k => k + dir);
    App.frameIdx = App.frameSel[0];
  }, { parts: ['canvas', 'timeline', 'insp', 'slides'] });
}
function gotoFrame(i) {
  const b = board();
  if (!b || App.playing) return;
  App.frameIdx = Math.max(0, Math.min(b.frames.length - 1, i));
  if (App.sel && App.sel.t === 'mix') App.sel = App.sel.ids.length ? { t: 'ent', ids: App.sel.ids.slice() } : null;
  else if (App.sel && App.sel.t !== 'ent' && App.sel.t !== 'ball') App.sel = null;
  if (App.tool.m === 'arrow') App.tool.from = null;
  refresh(['canvas', 'timeline', 'insp', 'tools']);
}
function addFrame() {
  commit(() => {
    const b = board(), f = frame();
    const nf = TE.newFrame();
    nf.pos = clone(f.pos); nf.ball = clone(f.ball); nf.hl = f.hl.slice(); nf.dim = f.dim.slice();
    nf.zones = clone(f.zones).map(z => Object.assign(z, { id: uid() }));
    nf.dur = f.dur; nf.hold = f.hold;
    b.frames.splice(App.frameIdx + 1, 0, nf);
    App.frameIdx++;
    if (App.sel && App.sel.t !== 'ent') App.sel = null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides', 'tools'] });
  toast('Шаг добавлен — перетаскивайте игроков, стрелки появятся сами');
}
function dupFrame() {
  commit(() => {
    const b = board(), f = clone(frame());
    f.id = uid(); f.chapter = '';
    b.frames.splice(App.frameIdx + 1, 0, f);
    App.frameIdx++;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides', 'tools'] });
}
function delFrame() {
  const b = board();
  if (!b || b.frames.length < 2) return;
  commit(() => {
    b.frames.splice(App.frameIdx, 1);
    App.frameIdx = Math.max(0, App.frameIdx - 1);
    App.sel = App.sel && App.sel.t === 'ent' ? App.sel : null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides', 'tools'] });
}
function moveFrame(d) {
  commit(() => {
    const b = board(), i = App.frameIdx, j = i + d;
    if (j < 0 || j >= b.frames.length) return;
    const [f] = b.frames.splice(i, 1);
    b.frames.splice(j, 0, f);
    App.frameIdx = j;
  }, { parts: ['canvas', 'timeline', 'insp'] });
}
function playAll() {
  const bd = App.canvasBoard, b = board();
  if (!bd || !b || b.frames.length < 2) return;
  App.playing = true; App.tool = { m: 'select' };
  refresh(['tools', 'timeline']);
  const host = $('#edCanvas');
  if (host) host.appendChild(h('div', { class: 'ed-play-badge' }, 'Воспроизведение'));
  bd.speed = editorSpeed();
  bd.playRange(0, b.frames.length - 1, stopPlay);
}
function playStep() {
  const bd = App.canvasBoard, i = App.frameIdx;
  if (!bd || i < 1) return;
  App.playing = true;
  refresh(['tools', 'timeline']);
  bd.speed = editorSpeed();
  bd.playRange(i - 1, i, stopPlay);
}
function stopPlay() {
  if (App.canvasBoard) App.canvasBoard.cancel();
  App.playing = false;
  refresh(['tools', 'canvas', 'timeline']);
}