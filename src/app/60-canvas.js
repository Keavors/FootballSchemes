
/* ---------- Поле редактора ---------- */
let canvasRO = null;
function renderCanvas() {
  const host = $('#edCanvas');
  if (!host) return;
  if (App.canvasBoard) App.canvasBoard.cancel();
  host.textContent = '';
  host.classList.toggle('mode-draw', App.tool.m !== 'select');
  const s = slide(), b = board();
  if (!s || !b) {
    App.canvasBoard = null;
    host.appendChild(h('div', { class: 'ed-empty' },
      h('p', null, s && s.layout === 'text' ? 'Это текстовый слайд. Схему можно включить на вкладке «Макет».' : 'На этом слайде пока нет схемы.'),
      s ? btn('plus', 'Добавить схему', addBoardToSlide, false, 'primary') : null));
    return;
  }
  const bd = new TE.Board(host, b, App.project, { editor: true, frame: App.frameIdx, onRender: drawOverlay });
  App.canvasBoard = bd;
  const svg = bd.svg;
  svg.addEventListener('pointerdown', e => onDown(e, bd));
  svg.addEventListener('pointermove', e => onMove(e, bd));
  svg.addEventListener('pointerup', e => onUp(e, bd, false));
  svg.addEventListener('pointercancel', e => onUp(e, bd, true));
  svg.addEventListener('wheel', e => {
    if (App.playing) return;
    e.preventDefault();
    const p = svgXY(e, bd);
    zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p[0], p[1]);
  }, { passive: false });
  svg.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (App.playing) return;
    const u = unitsXY(e, bd);
    const target = e.target.closest('[data-eid],[data-ball],[data-bidx],[data-aidx],[data-zidx]');
    const was = JSON.stringify(App.sel);
    if (target) pickAt(target, e);
    if (JSON.stringify(App.sel) !== was) refresh(['canvas', 'insp']);
    openCanvasMenu({ x: e.clientX, y: e.clientY }, u);
  });
  applyZoom(bd);
  fitCanvas();
  if (!canvasRO && window.ResizeObserver) {
    canvasRO = new ResizeObserver(() => fitCanvas());
  }
  if (canvasRO) { canvasRO.disconnect(); canvasRO.observe(host); }
  drawOverlay(bd);
  renderActionBar(host);
  renderZoomBar(host);
}
/* Поменялись цвета или разметка — перекрашиваем поле на месте, без пересборки */
function restyleCanvas() {
  const bd = App.canvasBoard;
  if (!bd || !bd.svg.isConnected) { renderCanvas(); return; }
  try {
    bd.restyle(App.project);
  } catch (e) {
    renderCanvas();
    return;
  }
  applyZoom(bd);
  fitCanvas();
  drawOverlay(bd);
}
let fitRetry = 0;
function fitCanvas() {
  const host = $('#edCanvas'), bd = App.canvasBoard;
  if (!host || !bd || !bd.svg.isConnected) return;
  const cs = getComputedStyle(host);
  const W = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  let Hh = host.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (W <= 10) {
    /* Разметка ещё не посчитана (бывает на телефоне при первом кадре) — пробуем ещё раз. */
    if (fitRetry++ < 20) requestAnimationFrame(fitCanvas);
    return;
  }
  fitRetry = 0;
  /* Если по высоте контейнер схлопнулся, отдаём схеме разумную долю экрана вместо нулевой. */
  if (Hh <= 10) Hh = Math.max(200, Math.round(window.innerHeight * 0.5));
  let w = W, hh = W / bd.ar;
  if (hh > Hh) { hh = Hh; w = Hh * bd.ar; }
  bd.svg.style.width = Math.floor(w) + 'px';
  bd.svg.style.height = Math.floor(hh) + 'px';
  drawOverlay(bd);
}
function addBoardToSlide() {
  commit(p => {
    const s = slide();
    s.board = boardFromFormation(p.settings.format);
    if (s.layout === 'text') s.layout = 'split';
    App.frameIdx = 0;
  });
}

/* единицы пользователя на один CSS-пиксель */
function unitScale(bd) {
  const r = bd.svg.getBoundingClientRect();
  return r.width ? (bd.viewW || bd.geo.vb[2]) / r.width : 1;
}
/* ---------- Масштаб и сдвиг поля ---------- */
function applyZoom(bd) {
  const z = App.zoom, got = bd.setView(z.k, z.cx, z.cy);
  z.k = got.k; z.cx = got.cx; z.cy = got.cy;
}
function setZoom(k, cx, cy) {
  const bd = App.canvasBoard;
  if (!bd) return;
  App.zoom.k = Math.max(1, Math.min(6, k));
  if (cx != null) { App.zoom.cx = cx; App.zoom.cy = cy; }
  applyZoom(bd);
  drawOverlay(bd);
  renderZoomBar();
}
/* Приблизить/отдалить так, чтобы точка под курсором или пальцами осталась на месте */
function zoomAt(factor, sx, sy) {
  const bd = App.canvasBoard;
  if (!bd) return;
  const vb = bd.geo.vb, z = App.zoom;
  const cx0 = z.cx == null ? vb[0] + vb[2] / 2 : z.cx, cy0 = z.cy == null ? vb[1] + vb[3] / 2 : z.cy;
  if (sx == null) { sx = cx0; sy = cy0; }
  const k0 = z.k, k1 = Math.max(1, Math.min(6, k0 * factor));
  if (Math.abs(k1 - k0) < 1e-6) return;
  setZoom(k1, sx + (cx0 - sx) * (k0 / k1), sy + (cy0 - sy) * (k0 / k1));
}
function resetZoom() {
  App.zoom = { k: 1, cx: null, cy: null };
  const bd = App.canvasBoard;
  if (!bd) return;
  applyZoom(bd);
  drawOverlay(bd);
  renderZoomBar();
}
function renderZoomBar(host) {
  host = host || $('#edCanvas');
  if (!host) return;
  const old = host.querySelector('.zoom-bar');
  if (old) old.remove();
  if (App.tab !== 'board' || !board() || App.playing) return;
  const z = App.zoom;
  host.appendChild(h('div', { class: 'zoom-bar' },
    ibtn('minus', 'Отдалить', () => zoomAt(1 / 1.25), z.k <= 1.001, 'sm'),
    h('span', { class: 'zoom-val' }, Math.round(z.k * 100) + '%'),
    ibtn('plus', 'Приблизить', () => zoomAt(1.25), z.k >= 5.999, 'sm'),
    ibtn('fit', 'Вписать поле целиком', resetZoom, z.k <= 1.001, 'sm')));
}
/* Щипок двумя пальцами */
const ptrs = new Map();
let gest = null;
function midClient() {
  const p = [...ptrs.values()];
  return { clientX: (p[0].x + p[1].x) / 2, clientY: (p[0].y + p[1].y) / 2 };
}
function startGesture(bd) {
  if (drag) {
    if (drag.moved) { App.project = JSON.parse(drag.before); refresh(); }
    if (drag.lpTimer) clearTimeout(drag.lpTimer);
    drag = null;
  }
  const p = [...ptrs.values()], mc = midClient();
  const vb = bd.geo.vb, z = App.zoom;
  gest = {
    d0: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1,
    k0: z.k,
    mid0c: { x: mc.clientX, y: mc.clientY },
    fixed: svgXY(mc, bd),
    cx0: z.cx == null ? vb[0] + vb[2] / 2 : z.cx,
    cy0: z.cy == null ? vb[1] + vb[3] / 2 : z.cy
  };
}
function updateGesture(bd) {
  if (!gest || ptrs.size < 2) return;
  const p = [...ptrs.values()], mc = midClient();
  const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
  const k = Math.max(1, Math.min(6, gest.k0 * (d / gest.d0)));
  let cx = gest.fixed[0] + (gest.cx0 - gest.fixed[0]) * (gest.k0 / k);
  let cy = gest.fixed[1] + (gest.cy0 - gest.fixed[1]) * (gest.k0 / k);
  const r = bd.svg.getBoundingClientRect();
  const perPx = r.width ? (bd.geo.vb[2] / k) / r.width : 0;
  cx -= (mc.clientX - gest.mid0c.x) * perPx;
  cy -= (mc.clientY - gest.mid0c.y) * perPx;
  setZoom(k, cx, cy);
}
function svgXY(e, bd) {
  const m = bd.svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = bd.svg.createSVGPoint();
  p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(m.inverse());
  return [q.x, q.y];
}
const clampU = v => Math.round(Math.max(-4, Math.min(104, v)) * 10) / 10;
function unitsXY(e, bd) {
  const s = svgXY(e, bd), u = bd.geo.inv(s[0], s[1]);
  return [clampU(u[0]), clampU(u[1])];
}
function nearestEntity(bd, e, px) {
  const s = svgXY(e, bd), lim = px * unitScale(bd);
  let best = null, bestD = 1e9;
  for (const id in bd.cur) {
    const p = bd.geo.pt(bd.cur[id][0], bd.cur[id][1]);
    const d = Math.hypot(p[0] - s[0], p[1] - s[1]) - bd.radius(id);
    if (d < lim && d < bestD) { best = id; bestD = d; }
  }
  return best;
}