
/* ---------- Доска ---------- */
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.6 12a7.4 7.4 0 1 0 2.3-5.4M4.6 4v4.2h4.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const noteColor = c => (isWhite(c) ? '#ffffff' : mix(c, '#ffffff', 0.55));

class Board {
  constructor(host, board, project, opts) {
    opts = opts || {};
    this.P = project;
    this.st = boardSettings(project.settings, board);
    this.B = board;
    this.F = board.frames;
    this.n = this.F.length;
    this.opts = opts;
    this.editor = !!opts.editor;
    this.geo = makeGeo(this.st);
    this.speed = Math.max(0.25, +this.st.anim.speed || 1);
    this.E = {};
    board.entities.forEach(e => { this.E[e.id] = e; });
    this.gen = 0; this.i = 0; this.cur = {}; this.ballXY = null; this.ballOwner = null;
    this.quizDone = {};
    this.dyn = []; this.ageo = []; this.playing = false;
    this.chapters = computeChapters(this.F);
    this.id = 'teb' + (++UID) + uid().slice(0, 3);
    this.ar = this.geo.vb[2] / this.geo.vb[3];
    let pitchHost = host;
    if (!this.editor && !opts.bare) {
      host.style.setProperty('--ar', this.ar.toFixed(4));
      host.style.setProperty('--te-maxw', this.ar > 1 ? '56vw' : '640px');
      if (board.legend !== false && this.st.legend.show) {
        const lg = legendRow(this.st, board);
        if (lg) host.appendChild(lg);
      }
      const fr = H('div', 'te-board', host);
      this.quizHost = fr;
      pitchHost = H('div', 'te-pitch', fr);
    }
    this.host = host;
    this.svg = S('svg', { viewBox: this.geo.vb.join(' '), class: 'te-svg' + (this.editor ? ' te-static' : ''), role: 'img', 'aria-label': board.aria || 'Тактическая схема' }, pitchHost);
    /* Поле держим отдельной группой — тогда его можно перерисовать, не пересобирая схему */
    this.gPitch = S('g', { class: 'te-pitch-g' }, this.svg);
    this.defs = drawPitch(this.gPitch, this.geo, this.st, this.id);
    this.markers = {};
    this.gGrid = S('g', { class: 'te-grid' }, this.svg);
    if (this.editor) this.gG = S('g', { class: 'te-ghosts' }, this.svg);
    this.drawGrid();
    this.gZ = S('g', null, this.svg);
    this.gA = S('g', null, this.svg);
    this.gT = S('g', null, this.svg);
    this.gBall = S('g', { class: 'te-ball gone', 'data-ball': '1' }, this.svg);
    this.gB = S('g', null, this.svg);
    if (this.editor) this.gO = S('g', { class: 'te-over' }, this.svg);
    this.tok = {}; this.parts = {};
    const rank = e => (isPlayer(e) ? (e.kind === 'ours' ? 3 : e.kind === 'third' ? 2 : 1) : 0);
    board.entities.slice().sort((a, b) => rank(a) - rank(b)).forEach(e => {
      const g = S('g', { class: 'te-tok gone', 'data-eid': e.id }, this.gT);
      this.parts[e.id] = drawEntity(S('g', null, g), e, this.st, this.editor, { label: tokenLabel(this.P, this.st, e), name: nameOf(this.P, e) });
      this.tok[e.id] = g;
    });
    const bi = S('g', null, this.gBall);
    if (this.editor) S('circle', { r: 16, fill: 'transparent' }, bi);
    this.gBallShadow = S('ellipse', { cx: 1.5, cy: 5, rx: 6, ry: 2.6, fill: 'rgba(0,0,0,.3)' }, bi);
    this.gBallBody = S('g', null, bi);
    S('circle', { r: 6.5, fill: safeColor(this.st.colors.ball), stroke: '#15251c', 'stroke-width': 1.6 }, this.gBallBody);
    S('path', { d: 'M0,-3.2 L3,-1 L1.9,2.6 L-1.9,2.6 L-3,-1 z', fill: '#15251c' }, this.gBallBody);
    if (opts.uiHost && this.n > 1 && !board.still) this.buildUI(opts.uiHost);
    this._snap(Math.max(0, Math.min(opts.frame || 0, this.n - 1)));
  }

  radius(id) { const p = this.parts[id]; return p ? p.R : 12; }

  /* Перерисовать поле и фишки по новым настройкам, не пересобирая схему целиком */
  restyle(project) {
    if (project) this.P = project;
    this.st = boardSettings(this.P.settings, this.B);
    this.geo = makeGeo(this.st);
    this.ar = this.geo.vb[2] / this.geo.vb[3];
    this.speed = Math.max(0.25, +this.st.anim.speed || 1);
    this.svg.setAttribute('viewBox', this.geo.vb.join(' '));
    if (this.host && !this.editor && !this.opts.bare) {
      this.host.style.setProperty('--ar', this.ar.toFixed(4));
      this.host.style.setProperty('--te-maxw', this.ar > 1 ? '56vw' : '640px');
    }
    this.gPitch.textContent = '';
    this.defs = drawPitch(this.gPitch, this.geo, this.st, this.id);
    /* стрелки рисуются наконечниками из defs — их тоже собираем заново */
    this.markers = {};
    this.drawGrid();
    this.B.entities.forEach(e => {
      const g = this.tok[e.id];
      if (!g) return;
      g.textContent = '';
      this.parts[e.id] = drawEntity(S('g', null, g), e, this.st, this.editor, { label: tokenLabel(this.P, this.st, e), name: nameOf(this.P, e) });
    });
    this.gBallBody.textContent = '';
    S('circle', { r: 6.5, fill: safeColor(this.st.colors.ball), stroke: '#15251c', 'stroke-width': 1.6 }, this.gBallBody);
    S('path', { d: 'M0,-3.2 L3,-1 L1.9,2.6 L-1.9,2.6 L-3,-1 z', fill: '#15251c' }, this.gBallBody);
    this._snap(Math.max(0, Math.min(this.i, this.n - 1)));
    return this;
  }

  /* Слой для рисования поверх схемы во время разбора */
  drawLayer() {
    if (!this.gDraw) this.gDraw = S('g', { class: 'te-draw' }, this.svg);
    return this.gDraw;
  }
  clearDrawing() { if (this.gDraw) this.gDraw.textContent = ''; }
  /* Точка экрана в координатах картинки */
  svgPoint(x, y) {
    const m = this.svg.getScreenCTM();
    if (!m) return [0, 0];
    const p = this.svg.createSVGPoint();
    p.x = x;
    p.y = y;
    const q = p.matrixTransform(m.inverse());
    return [q.x, q.y];
  }
  /* Сколько единиц картинки в одном экранном пикселе — чтобы линия была одинаковой на любом экране */
  drawScale() {
    const r = this.svg.getBoundingClientRect();
    return r.width ? this.geo.vb[2] / r.width : 1;
  }
  setSpeed(k) { this.speed = Math.max(0.25, (+this.st.anim.speed || 1) * (+k || 1)); }

  /* Вопрос перед шагом: остановиться и спросить команду */
  quizFor(i) {
    const f = this.F[i];
    return f && f.quiz && f.quiz.q ? f.quiz : null;
  }
  quizCard(i, onDone) {
    const q = this.quizFor(i);
    if (!q || !this.quizHost || this.quizEl) return false;
    const card = H('div', 'te-quiz', this.quizHost);
    H('div', 'te-quiz-q', card).textContent = q.q;
    const ans = H('div', 'te-quiz-a', card);
    ans.hidden = true;
    ans.textContent = q.a || '';
    const go = H('button', 'te-btn te-quiz-btn', card, q.a ? 'Показать ответ' : 'Дальше');
    go.type = 'button';
    go.addEventListener('click', () => {
      if (q.a && ans.hidden) { ans.hidden = false; go.textContent = 'Дальше'; return; }
      this.hideQuiz();
      onDone();
    });
    this.quizEl = card;
    return true;
  }
  hideQuiz() {
    if (this.quizEl) { this.quizEl.remove(); this.quizEl = null; }
  }

  /* Масштаб и сдвиг схемы в редакторе: k — во сколько раз приблизили, cx/cy — центр в координатах картинки */
  setView(k, cx, cy) {
    const vb = this.geo.vb;
    k = Math.max(1, Math.min(6, +k || 1));
    const w = vb[2] / k, hh = vb[3] / k;
    const x = Math.max(vb[0], Math.min(vb[0] + vb[2] - w, (cx == null ? vb[0] + vb[2] / 2 : cx) - w / 2));
    const y = Math.max(vb[1], Math.min(vb[1] + vb[3] - hh, (cy == null ? vb[1] + vb[3] / 2 : cy) - hh / 2));
    this.viewK = k; this.viewW = w; this.viewH = hh;
    this.svg.setAttribute('viewBox', [+x.toFixed(2), +y.toFixed(2), +w.toFixed(2), +hh.toFixed(2)].join(' '));
    return { k, cx: x + w / 2, cy: y + hh / 2 };
  }

  /* Разметка зон поля: трети, коридоры или 18 зон */
  drawGrid() {
    if (!this.gGrid) return;
    this.gGrid.textContent = '';
    const type = this.B.grid || 'none';
    if (type === 'none') return;
    if (!this.editor && this.B.gridShow !== 'always') return;
    const geo = this.geo, f = geo.f;
    const line = (x1, y1, x2, y2) => {
      const a = geo.pt(x1, y1), b = geo.pt(x2, y2);
      S('line', { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1) }, this.gGrid);
    };
    const box = (f.box && f.box[0] ? f.box[0] : 0.56) * 100;
    const ga = (f.ga && f.ga[0] ? f.ga[0] : box / 200) * 100;
    const rows = type === 'zones18' ? [16.67, 33.33, 50, 66.67, 83.33] : (type === 'thirds' || type === 'both' ? [33.33, 66.67] : []);
    const cols = type === 'zones18' ? [33.33, 66.67] : (type === 'channels' || type === 'both' ? [50 - box / 2, 50 - ga / 2, 50 + ga / 2, 50 + box / 2] : []);
    rows.forEach(y => line(0, y, 100, y));
    cols.forEach(x => line(x, 0, x, 100));
  }

  /* Отложенное действие, которое отменяется вместе с анимацией */
  after(ms, fn) {
    const gen = this.gen;
    if (!(ms > 0)) { fn(); return; }
    setTimeout(() => { if (gen === this.gen) fn(); }, ms);
  }
  isChapterStart(i) { return !!(this.chapters && i > 0 && this.chapters.some(c => c.from === i)); }

  resolve(i) {
    const f = this.F[i] || newFrame();
    const P = {};
    for (const id in f.pos) if (f.pos[id] && this.tok[id]) P[id] = f.pos[id];
    return { f, P, ball: f.ball || null, hl: f.hl || [], dim: f.dim || [], focus: f.focus || [] };
  }

  applyClasses(st) {
    const sp = safeColor(this.st.colors.special, '#ff7a00'), spt = safeColor(this.st.colors.specialText, '#1f2a44');
    for (const id in this.tok) {
      const c = this.tok[id].classList, p = this.parts[id];
      const hl = st.hl.indexOf(id) >= 0, fo = st.focus.indexOf(id) >= 0;
      c.toggle('gone', !st.P[id]);
      c.toggle('dim', st.dim.indexOf(id) >= 0);
      c.toggle('hl', hl);
      c.toggle('focus', fo && !hl);
      if (p.body) p.body.style.fill = hl ? sp : p.fill;
      if (p.label) p.label.style.fill = hl ? spt : p.text;
      if (p.halo) p.halo.style.stroke = hl ? sp : fo ? '#ffffff' : 'none';
    }
  }

  /* Подсветить выбранных — для слайда с ролями */
  setHighlight(ids) {
    const st = this.resolve(this.i);
    st.hl = (ids || []).slice();
    st.focus = [];
    this.applyClasses(st);
  }

  place() {
    for (const id in this.cur) {
      const p = this.cur[id], s = this.geo.pt(p[0], p[1]), e = this.E[id];
      const rot = e && !isPlayer(e) && +e.rot ? ` rotate(${+e.rot})` : '';
      this.tok[id].setAttribute('transform', `translate(${s[0].toFixed(1)},${s[1].toFixed(1)})${rot}`);
    }
  }

  ballPt(b) {
    if (!b) return null;
    if (b.owner) {
      const p = this.cur[b.owner];
      if (!p) return null;
      const s = this.geo.pt(p[0], p[1]), o = this.radius(b.owner) * 0.82 + 1;
      return [s[0] + o, s[1] + o];
    }
    if (Array.isArray(b.at)) return this.geo.pt(b.at[0], b.at[1]);
    return null;
  }

  setBall(b, fromXY, same, k, arrow) {
    const end = this.ballPt(b);
    if (!end) { this.gBall.classList.add('gone'); this.ballXY = null; return; }
    this.gBall.classList.remove('gone');
    const moving = !!fromXY && !same;
    let p;
    if (!moving) p = end;
    else {
      const pts = arrow && Array.isArray(arrow.pts) && arrow.pts.length ? arrow.pts.map(q => this.geo.pt(q[0], q[1])) : null;
      const bend = arrow ? +arrow.bend || 0 : 0;
      const far = Math.hypot(end[0] - fromXY[0], end[1] - fromXY[1]) > 1;
      if (pts && far) p = pathAt([fromXY].concat(pts, [end]), k);
      else if (bend && far) {
        const C = bendCtrl(fromXY[0], fromXY[1], end[0], end[1], bend);
        p = quadAt(fromXY[0], fromXY[1], C[0], C[1], end[0], end[1], k);
      } else p = [fromXY[0] + (end[0] - fromXY[0]) * k, fromXY[1] + (end[1] - fromXY[1]) * k];
    }
    this.ballXY = p;
    this.gBall.setAttribute('transform', `translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`);
    /* Навес: мяч поднимается над тенью и к концу опускается */
    if (this.gBallBody) {
      const lob = moving && arrow && arrow.lob;
      const dist = lob ? Math.hypot(end[0] - fromXY[0], end[1] - fromXY[1]) : 0;
      const lift = lob ? 4 * Math.min(46, dist * 0.26) * clamp01(k) * (1 - clamp01(k)) : 0;
      this.gBallBody.setAttribute('transform', lift > 0.1 ? `translate(0,${(-lift).toFixed(1)}) scale(${(1 + lift / 260).toFixed(3)})` : '');
      if (this.gBallShadow) this.gBallShadow.setAttribute('opacity', lift > 0.1 ? Math.max(0.3, 1 - lift / 80).toFixed(2) : '1');
    }
  }

  marker(color, w) {
    const size = Math.round(8 + w * 1.1);
    const key = color.replace(/[^a-z0-9]/gi, '').toLowerCase() + 's' + size;
    if (!this.markers[key]) {
      const id = `${this.id}-m${key}`;
      const m = S('marker', { id, viewBox: '0 0 10 10', refX: '6', refY: '5', markerWidth: size, markerHeight: size, markerUnits: 'userSpaceOnUse', orient: 'auto' }, this.defs);
      S('path', { d: 'M0,0.5 L10,5 L0,9.5 L2.6,5 z', fill: color }, m);
      this.markers[key] = id;
    }
    return `url(#${this.markers[key]})`;
  }

  arrowColor(a, st) {
    const C = this.st.colors, c = a.color || 'run';
    if (c === 'auto') {
      const id = a.kind === 'move' ? a.target : (a.from && a.from.e);
      if (id && st.hl.indexOf(id) >= 0) return C.special;
      const e = id && this.E[id];
      return e && e.kind === 'opp' ? C.oppArrow : C.run;
    }
    if (c === 'run') return C.run;
    if (c === 'pass') return C.pass;
    if (c === 'opp') return C.oppArrow;
    if (c === 'special') return C.special;
    return c;
  }

  drawArrows(f, from, to, st, animated, delayFn) {
    this.gA.textContent = '';
    this.ageo = [];
    this.apath = [];
    (f.arrows || []).forEach((a, idx) => {
      let A = null, B = null, rA = 0, rB = 0;
      if (a.kind === 'move') {
        A = from[a.target]; B = to[a.target];
        rA = rB = this.radius(a.target) + 2;
      } else {
        if (a.from && a.from.e) { A = from[a.from.e]; rA = this.radius(a.from.e) + 2; } else if (a.from && a.from.p) A = a.from.p;
        if (a.to && a.to.e) { B = to[a.to.e]; rB = this.radius(a.to.e) + 2; } else if (a.to && a.to.p) B = a.to.p;
      }
      if (!A || !B) return;
      const head = a.head !== false;
      if (!rB && head) rB = 3;
      const P0 = this.geo.pt(A[0], A[1]), P1 = this.geo.pt(B[0], B[1]);
      const mids = Array.isArray(a.pts) ? a.pts.map(q => this.geo.pt(q[0], q[1])) : [];
      const first = mids[0] || P1, last = mids.length ? mids[mids.length - 1] : P0;
      const d0 = Math.hypot(first[0] - P0[0], first[1] - P0[1]) || 1;
      const d1 = Math.hypot(P1[0] - last[0], P1[1] - last[1]) || 1;
      const dx = P1[0] - P0[0], dy = P1[1] - P0[1], len = Math.hypot(dx, dy);
      if (len < rA + rB + (this.editor ? 4 : 16) && !mids.length) return;
      const sx = P0[0] + (first[0] - P0[0]) / d0 * rA, sy = P0[1] + (first[1] - P0[1]) / d0 * rA;
      const ex = P1[0] - (P1[0] - last[0]) / d1 * rB, ey = P1[1] - (P1[1] - last[1]) / d1 * rB;
      const ux = dx / (len || 1), uy = dy / (len || 1);
      const bend = +a.bend || 0;
      const cx = (sx + ex) / 2 - uy * bend, cy = (sy + ey) / 2 + ux * bend;
      this.ageo[idx] = { sx, sy, cx, cy, ex, ey };
      const col = safeColor(this.arrowColor(a, st));
      const w = Math.max(0.5, +a.width || 3);
      const style = a.style || 'solid';
      const chain = mids.length ? [[sx, sy]].concat(mids, [[ex, ey]]) : null;
      const d = chain ? smoothPath(chain)
        : (style === 'wavy' ? wavyPath(sx, sy, cx, cy, ex, ey)
          : `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`);
      this.apath[idx] = d;
      const g = S('g', { class: 'te-arrow' }, this.gA);
      const dl = animated && delayFn ? Math.max(0, delayFn(a) || 0) : 0;
      if (dl > 0) {
        g.style.opacity = '0';
        g.style.transition = 'opacity .2s ease-out';
        this.after(dl, () => { g.style.opacity = '1'; });
      }
      const p = S('path', { d, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-opacity': a.opacity != null ? a.opacity : null }, g);
      const mk = () => { if (head) p.setAttribute('marker-end', this.marker(col, w)); };
      if (style === 'dashed' || style === 'dotted') {
        p.setAttribute('stroke-dasharray', style === 'dotted' ? '0.5 7' : '8 7');
        p.setAttribute('class', 'te-dash');
        mk();
      } else if (!animated || REDUCED || (style === 'wavy' && !chain) || a.draw === false) {
        mk();
      } else {
        const L = chain ? pathLength(chain) : quadLen(sx, sy, cx, cy, ex, ey);
        p.style.strokeDasharray = L;
        p.style.strokeDashoffset = L;
        p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset ${(0.45 / this.speed).toFixed(2)}s ease-out ${(dl / 1000).toFixed(2)}s`;
        p.style.strokeDashoffset = 0;
        this.after(dl + 360 / this.speed, mk);
      }
      if (this.editor) S('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 22, 'data-aidx': idx }, g);
    });
  }

  note(parent, x, y, text, color, size) {
    const g = S('g', { transform: `translate(${(+x).toFixed(1)},${(+y).toFixed(1)})` }, parent);
    const t = S('text', { class: 'te-note', 'text-anchor': 'middle', dy: '.32em', fill: color, 'font-size': +size || 22 }, g);
    t.textContent = text;
    return g;
  }

  drawZones(f) {
    this.gZ.textContent = '';
    this.dyn = [];
    const geo = this.geo;
    (f.zones || []).forEach((z, idx) => {
      const col = safeColor(z.color || '#ffffff');
      const g = S('g', { class: 'te-zone', 'data-zidx': this.editor ? idx : null }, this.gZ);
      const fo = z.fill != null && z.fill !== '' ? +z.fill : (isWhite(col) ? 0.13 : 0.22);
      const stroke = z.stroke === 'none' ? { stroke: 'none' } : { stroke: col, 'stroke-opacity': 0.9, 'stroke-width': 2, 'stroke-dasharray': z.stroke === 'solid' ? null : '7 6' };
      const nc = noteColor(col);
      if (z.type === 'rect') {
        const a = geo.pt(+z.x || 0, +z.y || 0), b = geo.pt((+z.x || 0) + (+z.w || 0), (+z.y || 0) + (+z.h || 0));
        const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), w = Math.abs(a[0] - b[0]), hh = Math.abs(a[1] - b[1]);
        S('rect', Object.assign({ x, y, width: w, height: hh, rx: Math.min(14, w / 4, hh / 4), fill: col, 'fill-opacity': fo }, stroke), g);
        if (z.label) {
          const ly = z.lpos === 'bottom' ? y + hh - 20 : z.lpos === 'center' ? y + hh / 2 : y + 20;
          this.note(g, x + w / 2, ly, z.label, nc, z.size);
        }
      } else if (z.type === 'ellipse') {
        const c = geo.pt(+z.cx || 0, +z.cy || 0);
        const rx = Math.abs(geo.horiz ? z.ry * geo.PL / 100 : z.rx * geo.PW / 100);
        const ry = Math.abs(geo.horiz ? z.rx * geo.PW / 100 : z.ry * geo.PL / 100);
        S('ellipse', Object.assign({ cx: c[0], cy: c[1], rx, ry, fill: col, 'fill-opacity': fo }, stroke), g);
        if (z.label) this.note(g, c[0], z.lpos === 'center' ? c[1] : z.lpos === 'top' ? c[1] - ry - 14 : c[1] + ry + 16, z.label, nc, z.size);
      } else if (z.type === 'text') {
        const c = geo.pt(+z.x || 0, +z.y || 0);
        const cls = 'te-note' + (z.font === 'head' ? ' te-note-head' : z.font === 'body' ? ' te-note-body' : '') + (z.outline === false ? ' te-note-plain' : '');
        const t = S('text', { x: c[0].toFixed(1), y: c[1].toFixed(1), dy: '.32em', 'text-anchor': 'middle', class: cls, fill: col, 'font-size': +z.size || 22 }, g);
        t.textContent = z.text || '';
      } else if (z.type === 'hull') {
        const r = S('rect', Object.assign({ rx: 26, fill: col, 'fill-opacity': z.fill != null && z.fill !== '' ? fo : 0.1 }, stroke), g);
        const lab = z.label ? S('g', null, g) : null;
        if (lab) { const t = S('text', { class: 'te-note', 'text-anchor': 'start', dy: '.32em', fill: nc, 'font-size': +z.size || 22 }, lab); t.textContent = z.label; }
        this.dyn.push(() => {
          const pts = (z.ids || []).map(id => this.cur[id]).filter(Boolean);
          if (!pts.length) { g.setAttribute('visibility', 'hidden'); return; }
          g.removeAttribute('visibility');
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          pts.forEach(p => { const s = geo.pt(p[0], p[1]); x0 = Math.min(x0, s[0]); y0 = Math.min(y0, s[1]); x1 = Math.max(x1, s[0]); y1 = Math.max(y1, s[1]); });
          const pad = 26;
          r.setAttribute('x', (x0 - pad).toFixed(1)); r.setAttribute('y', (y0 - pad).toFixed(1));
          r.setAttribute('width', (x1 - x0 + 2 * pad).toFixed(1)); r.setAttribute('height', (y1 - y0 + 2 * pad).toFixed(1));
          if (lab) lab.setAttribute('transform', `translate(${(x0 - pad + 8).toFixed(1)},${(y0 - pad - 13).toFixed(1)})`);
        });
      } else if (z.type === 'link') {
        const pl = S('polyline', { fill: 'none', stroke: col, 'stroke-opacity': 0.85, 'stroke-width': +z.width || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        if (this.editor) S('polyline', { fill: 'none', stroke: 'transparent', 'stroke-width': 20, class: 'te-linkhit' }, g);
        let lab = null;
        const lp = z.lpos || 'margin';
        if (z.label && lp !== 'none') {
          lab = S('g', null, g);
          const t = S('text', { class: lp === 'margin' ? 'te-digit' : 'te-note', 'text-anchor': lp === 'margin' && !geo.horiz ? 'end' : 'middle', dy: '.35em', fill: lp === 'margin' ? null : nc, 'font-size': lp === 'margin' ? null : (+z.size || 22) }, lab);
          t.textContent = z.label;
        }
        this.dyn.push(() => {
          let pts = (z.ids || []).map(id => this.cur[id]).filter(Boolean);
          if (z.order !== 'given') pts = pts.slice().sort((a, b) => a[0] - b[0]);
          if (!pts.length) { g.setAttribute('visibility', 'hidden'); return; }
          g.removeAttribute('visibility');
          const S2 = pts.map(p => geo.pt(p[0], p[1]));
          const ptsAttr = S2.map(s => s[0].toFixed(1) + ',' + s[1].toFixed(1)).join(' ');
          pl.setAttribute('points', ptsAttr);
          if (this.editor) g.querySelector('.te-linkhit').setAttribute('points', ptsAttr);
          if (lab) {
            const ax = S2.reduce((s, p) => s + p[0], 0) / S2.length, ay = S2.reduce((s, p) => s + p[1], 0) / S2.length;
            const vb = geo.vb;
            if (lp === 'margin') lab.setAttribute('transform', geo.horiz ? `translate(${ax.toFixed(1)},${(vb[1] + vb[3] - 9).toFixed(1)})` : `translate(${(vb[0] + vb[2] - 3).toFixed(1)},${ay.toFixed(1)})`);
            else lab.setAttribute('transform', `translate(${ax.toFixed(1)},${(ay + (lp === 'above' ? -38 : 38)).toFixed(1)})`);
          }
        });
      } else if (z.type === 'poly') {
        const pg = S('polygon', Object.assign({ fill: col, 'fill-opacity': z.fill != null && z.fill !== '' ? fo : 0.14, 'stroke-linejoin': 'round' }, z.stroke === 'none' ? { stroke: 'none' } : { stroke: col, 'stroke-opacity': 0.75, 'stroke-width': 2, 'stroke-dasharray': z.stroke === 'dashed' ? '7 6' : null }), g);
        this.dyn.push(() => {
          const pts = (z.ids || []).map(id => this.cur[id]).filter(Boolean);
          pg.setAttribute('points', pts.map(p => geo.pt(p[0], p[1]).map(v => v.toFixed(1)).join(',')).join(' '));
        });
      } else if (z.type === 'ring') {
        const rr = +z.r || 30;
        const c = S('circle', Object.assign({ r: rr, fill: col, 'fill-opacity': z.fill != null && z.fill !== '' ? fo : 0.14 }, z.stroke === 'none' ? { stroke: 'none' } : { stroke: col, 'stroke-width': 2.2, 'stroke-dasharray': z.stroke === 'solid' ? null : '6 5' }), g);
        const lab = z.label ? S('g', null, g) : null;
        if (lab) { const t = S('text', { class: 'te-note', 'text-anchor': 'middle', dy: '.32em', fill: nc, 'font-size': +z.size || 22 }, lab); t.textContent = z.label; }
        this.dyn.push(() => {
          const p = typeof z.target === 'string' ? this.cur[z.target] : null;
          if (!p) { g.setAttribute('visibility', 'hidden'); return; }
          g.removeAttribute('visibility');
          const s = geo.pt(p[0], p[1]);
          c.setAttribute('cx', s[0].toFixed(1)); c.setAttribute('cy', s[1].toFixed(1));
          if (lab) lab.setAttribute('transform', `translate(${s[0].toFixed(1)},${(z.lpos === 'above' ? s[1] - rr - 15 : s[1] + rr + 16).toFixed(1)})`);
        });
      }
    });
  }

  drawBubbles(f) {
    this.gB.textContent = '';
    (f.bubbles || []).forEach((b, idx) => {
      const text = String(b.text || '');
      if (!text) return;
      const g = S('g', { 'data-bidx': this.editor ? idx : null }, this.gB);
      const inner = S('g', { class: 'te-bub' }, g);
      const fill = safeColor(b.color || this.st.colors.special, '#ff8a1a'), tcol = safeColor(b.textColor || '#1f2a44');
      const w = Math.max(52, text.length * 11 + 22), hh = 30, dn = !!b.below;
      if (dn) inner.style.transformOrigin = '50% 0%';
      S('rect', { x: -w / 2, y: dn ? 7 : -hh - 7, width: w, height: hh, rx: 10, fill, stroke: 'rgba(8,40,20,.35)', 'stroke-width': 1 }, inner);
      S('path', { d: dn ? 'M-7,8 L0,0 L7,8 z' : 'M-7,-8 L0,0 L7,-8 z', fill }, inner);
      const t = S('text', { class: 'te-bubtxt', 'text-anchor': 'middle', y: dn ? 7 + hh / 2 : -7 - hh / 2, dy: '.34em', fill: tcol }, inner);
      t.textContent = text;
      this.dyn.push(() => {
        const p = this.cur[b.target];
        if (!p) { g.setAttribute('visibility', 'hidden'); return; }
        g.removeAttribute('visibility');
        const s = this.geo.pt(p[0], p[1]), r = this.radius(b.target);
        g.setAttribute('transform', `translate(${s[0].toFixed(1)},${(s[1] + (dn ? r + 3 : -r - 3)).toFixed(1)})`);
      });
    });
  }

  updateDyn() { for (let k = 0; k < this.dyn.length; k++) this.dyn[k](); }

  _snap(i) {
    this.clearDrawing();
    const st = this.resolve(i);
    const prevP = (i > 0 && !this.isChapterStart(i)) ? this.resolve(i - 1).P : st.P;
    this.i = i;
    this.cur = {};
    for (const id in st.P) this.cur[id] = st.P[id].slice();
    this.applyClasses(st);
    this.place();
    this.ballOwner = st.ball && st.ball.owner ? st.ball.owner : null;
    this.setBall(st.ball, null, true, 1);
    const from = {};
    for (const id in this.cur) from[id] = prevP[id] || this.cur[id];
    this.drawArrows(st.f, from, this.cur, st, false);
    this.drawZones(st.f);
    this.drawBubbles(st.f);
    this.updateDyn();
    this.ui(i);
    if (this.opts.onRender) this.opts.onRender(this);
  }

  async tweenTo(i) {
    this.clearDrawing();
    const st = this.resolve(i);
    const from = {};
    for (const id in st.P) from[id] = this.cur[id] ? this.cur[id].slice() : st.P[id].slice();
    const fromBall = this.ballXY ? this.ballXY.slice() : null;
    const same = !!(st.ball && st.ball.owner && st.ball.owner === this.ballOwner);
    const bends = moveBends(st.f, st.P), ballBend = passBend(st.f, st.ball);
    const ord = frameOrders(st.f, st.P);
    this.i = i;
    this.applyClasses(st);
    const dur = REDUCED ? 1 : (st.f.dur || 1100) / this.speed;
    const delay = REDUCED ? 0 : ((st.f.arrows && st.f.arrows.length) ? 320 / this.speed : 0);
    const start = n => delay + (n - 1) * dur;
    this.drawArrows(st.f, from, st.P, st, true, a => start(ord.arrow[a.id] || 1) - delay);
    this.drawZones(st.f);
    this.drawBubbles(st.f);
    this.ui(i);
    const ok = await this.animate(delay + dur * ord.phases, t => {
      const next = {};
      for (const id in from) {
        const k = ease(clamp01((t - start(ord.ent[id] || 1)) / dur));
        next[id] = this.moveAt(from[id], st.P[id], bends[id], k);
      }
      this.cur = next;
      this.place();
      this.setBall(st.ball, fromBall, same, ease(clamp01((t - start(ord.ball)) / dur)), ballBend);
      this.updateDyn();
    });
    if (ok) this.ballOwner = st.ball && st.ball.owner ? st.ball.owner : null;
    return ok;
  }

  /* Сколько миллисекунд идёт переход к шагу i и сколько потом стоим на месте */
  stepMs(i) {
    if (i <= 0 || i >= this.n) return 0;
    const st = this.resolve(i);
    return (st.f.dur || 1100) * frameOrders(st.f, st.P).phases;
  }
  holdMs(i) { return (this.F[i] && this.F[i].hold) || 2000; }

  /* Показать промежуточное состояние между шагами i и i+1 — для ползунка прокрутки */
  scrubTo(i, k) {
    this.cancel();
    i = Math.max(0, Math.min(this.n - 1, i));
    this._snap(i);
    if (!(k > 0.001) || i >= this.n - 1) return;
    const st = this.resolve(i + 1);
    const from = {};
    for (const id in st.P) from[id] = this.cur[id] ? this.cur[id].slice() : st.P[id].slice();
    const fromBall = this.ballXY ? this.ballXY.slice() : null;
    const same = !!(st.ball && st.ball.owner && st.ball.owner === this.ballOwner);
    const mv = moveBends(st.f, st.P), pass = passBend(st.f, st.ball), ord = frameOrders(st.f, st.P);
    this.applyClasses(st);
    this.drawArrows(st.f, from, st.P, st, false);
    this.drawZones(st.f);
    this.drawBubbles(st.f);
    const T = ord.phases * clamp01(k);
    const cur = {};
    for (const id in from) cur[id] = this.moveAt(from[id], st.P[id], mv[id], ease(clamp01(T - ((ord.ent[id] || 1) - 1))));
    this.cur = cur;
    this.place();
    this.setBall(st.ball, fromBall, same, ease(clamp01(T - (ord.ball - 1))), pass);
    this.updateDyn();
  }

  /* Положение игрока на доле k пути: по прямой или по дуге его стрелки */
  /* Где игрок на доле k пути: по прямой, по дуге или по пути через точки */
  moveAt(a, b, arrow, k) {
    const straight = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    if (!arrow) return straight;
    const pts = Array.isArray(arrow.pts) && arrow.pts.length ? arrow.pts : null, bend = +arrow.bend || 0;
    if (!pts && !bend) return straight;
    const g = this.geo, P0 = g.pt(a[0], a[1]), P1 = g.pt(b[0], b[1]);
    if (Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) < 1) return straight;
    if (pts) {
      const s = pathAt([P0].concat(pts.map(p => g.pt(p[0], p[1])), [P1]), k);
      return g.inv(s[0], s[1]);
    }
    const C = bendCtrl(P0[0], P0[1], P1[0], P1[1], bend);
    const s = quadAt(P0[0], P0[1], C[0], C[1], P1[0], P1[1], k);
    return g.inv(s[0], s[1]);
  }

  animate(total, fn) {
    const gen = this.gen;
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        if (gen !== this.gen) return res(false);
        const el = now - t0;
        fn(Math.min(el, total));
        if (el < total) requestAnimationFrame(step); else res(true);
      };
      requestAnimationFrame(step);
    });
  }

  wait(ms) {
    const gen = this.gen;
    return new Promise(res => { this.tm = setTimeout(() => res(gen === this.gen), ms); });
  }

  cancel() { this.gen++; clearTimeout(this.tm); this.setPlaying(false); }

  rangeOf(i) {
    if (!this.chapters) return [0, this.n - 1];
    const c = this.chapters.find(ch => i >= ch.from && i <= ch.to) || this.chapters[0];
    return [c.from, c.to];
  }

  async play(startHold) {
    this.cancel();
    const gen = this.gen;
    this.setPlaying(true);
    const [a, b] = this.rangeOf(this.i);
    if (this.i >= b && !this.B.loop) { this._snap(a); if (!(await this.wait(800))) return; }
    if (startHold && !(await this.wait(startHold))) return;
    while (gen === this.gen) {
      let nx = this.i + 1;
      if (this.i >= b) { if (this.B.loop) nx = a; else break; }
      if (!this.quizDone[nx] && this.quizFor(nx)) {
        this.setPlaying(false);
        this.quizCard(nx, () => { this.quizDone[nx] = 1; this.play(); });
        return;
      }
      if (!(await this.tweenTo(nx))) return;
      if (!this.B.loop && nx >= b) break;
      if (!(await this.wait((this.F[nx].hold || 2000) / this.speed))) return;
    }
    if (gen === this.gen) this.setPlaying(false);
  }

  async playRange(a, b, onDone) {
    this.cancel();
    const gen = this.gen;
    this.playing = true;
    this._snap(a);
    if (!(await this.wait(450))) return;
    for (let i = a + 1; i <= b; i++) {
      if (this.isChapterStart(i)) { if (!(await this.wait(400))) return; this._snap(i); }
      else if (!(await this.tweenTo(i))) return;
      if (i < b && !(await this.wait((this.F[i].hold || 2000) / this.speed))) return;
    }
    if (!(await this.wait(700))) return;
    if (gen === this.gen) { this.playing = false; if (onDone) onDone(); }
  }

  async step(d) {
    this.cancel();
    if (d > 0) {
      if (this.i >= this.n - 1) return;
      const nx = this.i + 1;
      if (!this.quizDone[nx] && this.quizCard(nx, () => { this.quizDone[nx] = 1; this.step(1); })) return;
      if (this.isChapterStart(nx)) this._snap(nx); else await this.tweenTo(nx);
    } else {
      const pv = this.i - 1;
      if (pv < 0) return;
      if (pv === 0 || this.isChapterStart(pv)) this._snap(pv);
      else { this._snap(pv - 1); await this.tweenTo(pv); }
    }
  }

  buildUI(host) {
    const ui = H('div', 'te-sui-in', host);
    if (this.chapters) {
      const ch = H('div', 'te-chapters', ui);
      this.chipEls = this.chapters.map(c => {
        const b = H('button', 'te-chapter', ch);
        b.type = 'button';
        b.textContent = c.name;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => { this.cancel(); this._snap(c.from); this.play(900); });
        return b;
      });
    }
    if (this.F.some(f => f.cap)) {
      const box = H('div', 'te-note-box', ui);
      box.setAttribute('aria-live', 'polite');
      this.stepEl = H('span', 'te-step', box);
      this.capEl = H('span', 'te-cap', box);
    }
    const ctrl = H('div', 'te-ctrl', ui);
    const mk = (cls, label, icon, fn) => {
      const b = H('button', cls, ctrl, icon);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.title = label;
      b.addEventListener('click', fn);
      return b;
    };
    mk('', 'Показать сначала', ICON.restart, () => { this.cancel(); this._snap(this.rangeOf(this.i)[0]); this.play(700); });
    mk('', 'Шаг назад', ICON.back, () => this.step(-1));
    this.playBtn = mk('te-play', 'Воспроизвести', ICON.play, () => { if (this.playing) { this.cancel(); this._snap(this.i); } else this.play(); });
    mk('', 'Шаг вперёд', ICON.fwd, () => this.step(1));
    this.ticks = H('div', 'te-ticks', ctrl);
    this.ticks.setAttribute('aria-hidden', 'true');
  }

  ui(i) {
    if (!this.ticks) return;
    const [a, b] = this.rangeOf(i);
    if (this.capEl) {
      this.stepEl.textContent = `${i - a + 1}/${b - a + 1}`;
      this.capEl.innerHTML = inline(this.F[i].cap || '');
    }
    this.ticks.textContent = '';
    for (let k = a; k <= b; k++) H('i', k <= i ? 'done' : '', this.ticks);
    if (this.chipEls) {
      const cur = this.chapters.findIndex(c => i >= c.from && i <= c.to);
      this.chipEls.forEach((el, k) => el.setAttribute('aria-pressed', String(k === cur)));
    }
  }

  setPlaying(p) {
    this.playing = p;
    if (!this.playBtn) return;
    this.playBtn.innerHTML = p ? ICON.pause : ICON.play;
    this.playBtn.setAttribute('aria-label', p ? 'Пауза' : 'Воспроизвести');
    this.playBtn.title = p ? 'Пауза' : 'Воспроизвести';
  }

  enter() {
    this.cancel();
    this.quizDone = {};
    this.hideQuiz();
    this._snap(0);
    if (this.B.autoplay && this.st.anim.autoplay !== false && this.n > 1 && !this.B.still) this.play(1100);
  }
  leave() { this.cancel(); this.hideQuiz(); }
}