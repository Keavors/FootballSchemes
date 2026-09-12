
/* ---------- Шаги ---------- */
function renderTimeline() {
  const el = $('#edTimeline');
  if (!el) return;
  el.textContent = '';
  const b = board();
  if (App.tab !== 'board' || !b || !slide()) { el.hidden = true; return; }
  el.hidden = false;
  const n = b.frames.length, i = App.frameIdx;
  appendAll(el, 
    h('div', { class: 'tl-head' },
      h('span', { class: 'tl-title' }, `Шаг ${i + 1} из ${n}`),
      ibtn('left', 'Предыдущий шаг', () => gotoFrame(i - 1), i === 0 || App.playing, 'sm'),
      ibtn('right', 'Следующий шаг', () => gotoFrame(i + 1), i === n - 1 || App.playing, 'sm'),
      App.playing
        ? btn('stop', 'Стоп', stopPlay, false, 'sm primary')
        : btn('play', 'Проиграть', playAll, n < 2, 'sm', 'Проиграть все шаги схемы'),
      h('div', { class: 'grow' }),
      btn('plus', 'Шаг', addFrame, App.playing, 'sm primary', 'Новый шаг: копия текущей расстановки без стрелок'),
      ibtn('copy', 'Дублировать шаг целиком', dupFrame, App.playing, 'sm'),
      ibtn('play', 'Проиграть переход к этому шагу', playStep, i === 0 || App.playing, 'sm'),
      ibtn('trash', 'Удалить шаг', delFrame, n === 1 || App.playing, 'sm danger'),
      ibtn('menu', 'Ещё действия с шагом', ev => openFrameMenu(ev.currentTarget), App.playing, 'sm')),
    n > 1 ? h('div', { class: 'tl-scrub' },
      (() => {
        const sl = h('input', { type: 'range', min: 0, max: (n - 1) * 100, step: 1, value: i * 100, 'aria-label': 'Прокрутка анимации', disabled: App.playing });
        sl.addEventListener('input', () => scrubEditor(+sl.value / 100));
        sl.addEventListener('change', () => scrubDone(+sl.value / 100));
        return sl;
      })(),
      btn('play', 'Отсюда', playFrom, App.playing || i >= n - 1, 'sm', 'Проиграть с этого шага'),
      seg([[0.5, '0,5×'], [1, '1×'], [2, '2×']], App.playSpeed || 1, v => { App.playSpeed = v; refresh(['timeline']); })) : null,
    App.frameSel.length ? h('div', { class: 'tl-head tl-sel' },
      h('span', { class: 'tl-title' }, `Выбрано шагов: ${App.frameSel.length}`),
      btn('copy', 'Копировать', () => copyFrames(App.frameSel), false, 'sm'),
      btn('left', 'Раньше', () => moveFrames(App.frameSel, -1), App.frameSel[0] === 0, 'sm'),
      btn('right', 'Позже', () => moveFrames(App.frameSel, 1), App.frameSel[App.frameSel.length - 1] >= n - 1, 'sm'),
      btn('trash', 'Удалить', () => deleteFrames(App.frameSel), false, 'sm danger'),
      btn('close', 'Снять выбор', () => { App.frameSel = []; refresh(['timeline']); }, false, 'sm')) : null,
    h('div', { class: 'tl-chips', id: 'tlChips' }, b.frames.map((f, k) => {
      const chip = h('button', {
        type: 'button', class: 'tl-chip' + (k === i ? ' on' : '') + (f.chapter ? ' ch' : '') + (f.quiz ? ' quiz' : '') + (App.frameSel.indexOf(k) >= 0 ? ' pick' : ''),
        title: TE.plain(f.cap) || `Шаг ${k + 1}`, disabled: App.playing, 'data-frame': String(k),
        onclick: ev => {
          if (tlMoved) return;
          if (ev.shiftKey || ev.ctrlKey || ev.metaKey) toggleFrameSel(k);
          else { App.frameSel = []; gotoFrame(k); }
        }
      }, frameThumb(b, f), h('span', null, String(k + 1), f.chapter ? h('small', null, f.chapter) : null));
      chip.addEventListener('pointerdown', ev => tlDown(ev, k));
      return chip;
    })));
  const on = el.querySelector('.tl-chip.on');
  if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
/* Маленькая картинка шага для ленты */
function frameThumb(b, f) {
  const st = App.project.settings, geo = TE.makeGeo(st), S = TE.S;
  const w = 30, hh = Math.max(16, Math.round(w * (geo.vb[3] / geo.vb[2])));
  const svg = S('svg', { viewBox: geo.vb.join(' '), width: w, height: hh, class: 'tl-thumb', 'aria-hidden': 'true' });
  S('rect', { x: geo.vb[0], y: geo.vb[1], width: geo.vb[2], height: geo.vb[3], rx: 14, fill: '#3a8a55' }, svg);
  b.entities.forEach(x => {
    const p = f.pos[x.id];
    if (!p) return;
    const col = TE.entColors(st, x), s = geo.pt(p[0], p[1]);
    S('circle', { cx: s[0].toFixed(1), cy: s[1].toFixed(1), r: TE.isPlayer(x) ? 16 : 10, fill: col.fill }, svg);
  });
  const bp = f.ball && (f.ball.owner ? f.pos[f.ball.owner] : f.ball.at);
  if (bp) {
    const s = geo.pt(bp[0], bp[1]);
    S('circle', { cx: s[0].toFixed(1), cy: s[1].toFixed(1), r: 9, fill: '#ffffff', stroke: '#15251c', 'stroke-width': 3 }, svg);
  }
  return svg;
}
/* Перетаскивание шагов в ленте */
let tlDrag = null, tlMoved = false;
function tlDown(e, k) {
  if (App.playing || (e.button !== undefined && e.button > 0)) return;
  tlDrag = { k, to: k, x0: e.clientX, moved: false, ready: e.pointerType !== 'touch', timer: 0 };
  if (e.pointerType === 'touch') tlDrag.timer = setTimeout(() => { if (tlDrag) tlDrag.ready = true; }, 350);
  document.addEventListener('pointermove', tlMove, true);
  document.addEventListener('pointerup', tlUp, true);
  document.addEventListener('pointercancel', tlUp, true);
}
function tlMove(e) {
  if (!tlDrag || !tlDrag.ready) return;
  if (!tlDrag.moved && Math.abs(e.clientX - tlDrag.x0) < 8) return;
  tlDrag.moved = true;
  const chips = $('#tlChips');
  if (!chips) return;
  const kids = Array.prototype.slice.call(chips.children);
  let best = tlDrag.k, bestD = 1e9;
  kids.forEach((el, idx) => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const d = Math.abs(r.left + r.width / 2 - e.clientX);
    if (d < bestD) { bestD = d; best = idx; }
  });
  tlDrag.to = best;
  kids.forEach((el, idx) => el.classList.toggle('drop', idx === best && best !== tlDrag.k));
}
function tlUp() {
  document.removeEventListener('pointermove', tlMove, true);
  document.removeEventListener('pointerup', tlUp, true);
  document.removeEventListener('pointercancel', tlUp, true);
  const d = tlDrag;
  tlDrag = null;
  if (!d) return;
  if (d.timer) clearTimeout(d.timer);
  if (!d.moved || d.to === d.k) { refresh(['timeline']); return; }
  tlMoved = true;
  moveFrameTo(d.k, d.to);
  setTimeout(() => { tlMoved = false; }, 0);
}
function moveFrameTo(from, to) {
  commit(() => {
    const b = board();
    if (from === to || from < 0 || to < 0 || from >= b.frames.length || to >= b.frames.length) return;
    const [f] = b.frames.splice(from, 1);
    b.frames.splice(to, 0, f);
    App.frameIdx = to;
    App.sel = null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides'] });
}
/* Шаг ровно посередине между этим и следующим */
function insertMidFrame() {
  const b = board();
  if (!b || App.frameIdx >= b.frames.length - 1) return;
  commit(() => {
    const bb = board(), i = App.frameIdx, a = bb.frames[i], c = bb.frames[i + 1];
    const mid = (p, q) => [+((p[0] + q[0]) / 2).toFixed(1), +((p[1] + q[1]) / 2).toFixed(1)];
    const nf = TE.newFrame();
    for (const id in c.pos) {
      const p1 = a.pos[id], p2 = c.pos[id];
      nf.pos[id] = p2 ? (p1 ? mid(p1, p2) : p2.slice()) : null;
    }
    nf.hl = c.hl.slice();
    nf.dim = c.dim.slice();
    nf.focus = c.focus.slice();
    nf.zones = clone(c.zones).map(z => Object.assign(z, { id: uid() }));
    if (a.ball && a.ball.at && c.ball && c.ball.at) nf.ball = { at: mid(a.ball.at, c.ball.at) };
    else nf.ball = clone(a.ball || c.ball);
    nf.dur = Math.max(200, Math.round((c.dur || 1100) / 2));
    c.dur = nf.dur;
    nf.hold = 300;
    bb.frames.splice(i + 1, 0, nf);
    App.frameIdx = i + 1;
    App.sel = null;
  }, { parts: ['canvas', 'timeline', 'insp', 'slides'] });
  toast('Добавлен промежуточный шаг');
}