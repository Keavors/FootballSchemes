
/* ---------- Режим показа ---------- */
function mountPresentation(rootEl, project, opts) {
  opts = opts || {};
  const P = normalizeProject(clone(project));
  /* Скрытые слайды в показ не идут; если скрыто всё — показываем как есть */
  const shown = P.slides.filter(s => !s.hidden);
  if (shown.length) P.slides = shown;
  const st = P.settings;
  rootEl.textContent = '';
  const theme = ['board', 'night', 'paper'].indexOf(st.look.theme) >= 0 ? st.look.theme : 'board';
  const font = ['sport', 'bold', 'clean'].indexOf(st.look.font) >= 0 ? st.look.font : 'sport';
  const app = H('div', `te-app te-theme-${theme} te-font-${font}`, rootEl);
  const acc = safeColor(st.look.accent, '#ff7a00');
  app.style.setProperty('--te-accent', acc);
  app.style.setProperty('--te-accent-text', theme === 'night' ? acc : mix(acc, '#000000', 0.22));

  const top = H('header', 'te-top', app);
  const logo = H('div', 'te-logo', top, '<i></i><span></span>');
  logo.querySelector('span').textContent = plain(P.title);
  /* Эмблема команды вместо точки, если её загрузили */
  const brand = st.brand || { team: '', logo: '' };
  if (brand.logo) {
    const badge = document.createElement('img');
    badge.className = 'te-badge';
    badge.src = brand.logo;
    badge.alt = '';
    logo.replaceChild(badge, logo.querySelector('i'));
  }
  H('div', 'te-grow', top);
  const pager = H('span', 'te-pager', top);
  const tocBtn = H('button', 'te-btn', top, 'Слайды');
  tocBtn.type = 'button';
  const de = document.documentElement;
  const canFs = !opts.onClose && !!(de.requestFullscreen || de.webkitRequestFullscreen);
  let fsBtn = null;
  if (canFs) { fsBtn = H('button', 'te-btn', top, ICON.fs); fsBtn.type = 'button'; fsBtn.setAttribute('aria-label', 'Во весь экран'); }
  (opts.actions || []).forEach(a => {
    const ab = H('button', 'te-btn', top);
    ab.type = 'button';
    ab.textContent = a.label;
    if (a.title) ab.title = a.title;
    ab.addEventListener('click', () => a.onClick());
  });
  /* Маркер: рисование поверх схемы во время разбора */
  const markBtn = H('button', 'te-btn te-mark-btn', top, ICON.pen);
  markBtn.type = 'button';
  markBtn.title = 'Рисовать поверх схемы';
  markBtn.setAttribute('aria-label', 'Рисовать поверх схемы');
  /* Скорость показа */
  const SPEEDS = [0.5, 1, 1.5, 2];
  let speedK = 1;
  const speedBtn = H('button', 'te-btn te-speed-btn', top, '1×');
  speedBtn.type = 'button';
  speedBtn.title = 'Скорость анимации';
  /* Режим докладчика: заметки, таймер и следующий слайд во втором окне */
  const presBtn = H('button', 'te-btn te-pres-btn', top, 'Докладчик');
  presBtn.type = 'button';
  presBtn.title = 'Второе окно: заметки, таймер и что дальше';
  if (opts.onClose) {
    const cb = H('button', 'te-btn', top, 'Закрыть');
    cb.type = 'button';
    cb.addEventListener('click', () => opts.onClose());
  }

  const stage = H('main', 'te-stage', app);
  const nav = H('nav', 'te-nav', app);
  nav.setAttribute('aria-label', 'Навигация по слайдам');
  const prevBtn = H('button', 'te-navbtn', nav, ICON.back);
  prevBtn.type = 'button'; prevBtn.setAttribute('aria-label', 'Предыдущий слайд');
  const prog = H('div', 'te-prog', nav, '<div class="te-track"><i></i></div><span class="te-where"></span>');
  const nextBtn = H('button', 'te-navbtn te-primary', nav, '<span>Дальше</span>' + ICON.fwd);
  nextBtn.type = 'button'; nextBtn.setAttribute('aria-label', 'Следующий слайд');
  const fill = prog.querySelector('i'), where = prog.querySelector('.te-where');

  /* Панель маркера: цвет, стереть, готово */
  const MARK_COLORS = ['#ffe066', '#ff5a4e', '#ffffff'];
  let marker = false, markerColor = MARK_COLORS[0];
  const drawBar = H('div', 'te-draw-bar', app);
  drawBar.hidden = true;
  const colBtns = MARK_COLORS.map(c => {
    const b = H('button', 'te-draw-col', drawBar);
    b.type = 'button';
    b.style.background = c;
    b.setAttribute('aria-label', 'Цвет маркера');
    b.addEventListener('click', () => { markerColor = c; paintCols(); });
    return b;
  });
  function paintCols() { colBtns.forEach((b, i) => b.classList.toggle('on', MARK_COLORS[i] === markerColor)); }
  const eraseBtn = H('button', 'te-btn', drawBar, 'Стереть');
  eraseBtn.type = 'button';
  eraseBtn.addEventListener('click', () => (boards[cur] || []).forEach(b => b.clearDrawing()));
  const doneBtn = H('button', 'te-btn', drawBar, 'Готово');
  doneBtn.type = 'button';
  doneBtn.addEventListener('click', () => setMarker(false));
  function setMarker(on) {
    marker = !!on;
    drawBar.hidden = !marker;
    app.classList.toggle('te-marking', marker);
    markBtn.setAttribute('aria-pressed', String(marker));
    paintCols();
  }
  markBtn.addEventListener('click', () => setMarker(!marker));
  speedBtn.addEventListener('click', () => {
    speedK = SPEEDS[(SPEEDS.indexOf(speedK) + 1) % SPEEDS.length];
    speedBtn.textContent = String(speedK).replace('.', ',') + '×';
    (boards[cur] || []).forEach(b => b.setSpeed(speedK));
  });
  /* Короткая надпись поверх показа */
  function flash(text) {
    const el = H('div', 'te-flash', app);
    el.setAttribute('role', 'status');
    el.textContent = text;
    setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
  }
  /* ---------- Режим докладчика ---------- */
  let pres = null, presTimer = 0, presT0 = 0;
  const PRES_CSS = 'body{margin:0;background:#0f1a14;color:#eaf2ec;font:16px/1.55 system-ui,Segoe UI,Roboto,Arial,sans-serif}'
    + '.w{max-width:920px;margin:0 auto;padding:18px;display:grid;gap:14px}'
    + '.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}'
    + '#p-time{margin-left:auto;font-size:26px;font-variant-numeric:tabular-nums}'
    + 'h1{margin:0;font-size:26px;line-height:1.2}'
    + '#p-notes{background:#18241d;border:1px solid #2a3a31;border-radius:12px;padding:14px;min-height:150px}'
    + '#p-notes p{margin:0 0 8px}#p-notes ul,#p-notes ol{margin:0 0 8px 20px}'
    + '#p-next{color:#9db0a5}'
    + 'button{min-height:46px;padding:0 18px;border-radius:10px;border:1px solid #3a4a41;background:#1b2621;color:inherit;font:inherit;cursor:pointer}'
    + 'button.go{border:0;background:#ff7a00;color:#1f2a44;font-weight:600}';
  const PRES_HTML = '<div class="w"><div class="row"><b id="p-num"></b><span id="p-time">00:00</span></div>'
    + '<h1 id="p-title"></h1><div id="p-notes"></div><div id="p-next"></div>'
    + '<div class="row"><button id="p-prev">← Назад</button><button id="p-step">Шаг вперёд</button>'
    + '<button id="p-go" class="go">Дальше →</button><button id="p-reset">Таймер заново</button></div></div>';
  function presUpdate() {
    if (!pres || pres.closed || !pres.document) return;
    const d = pres.document, s = P.slides[cur] || {};
    const set = (id, text) => { const el = d.getElementById(id); if (el) el.textContent = text; };
    set('p-num', `Слайд ${cur + 1} из ${N}`);
    set('p-title', plain(s.title) || `Слайд ${cur + 1}`);
    const notes = d.getElementById('p-notes');
    if (notes) notes.innerHTML = s.notes ? md(s.notes) : '<i style="color:#9db0a5">Заметок к этому слайду нет</i>';
    const nx = P.slides[cur + 1];
    set('p-next', nx ? 'Дальше: ' + (plain(nx.nav || nx.title) || `слайд ${cur + 2}`) : 'Это последний слайд');
  }
  function presTick() {
    if (!pres || pres.closed || !pres.document) { clearInterval(presTimer); presTimer = 0; return; }
    const s = Math.max(0, Math.floor((Date.now() - presT0) / 1000));
    const el = pres.document.getElementById('p-time');
    if (el) el.textContent = ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function openPresenter() {
    if (pres && !pres.closed) { try { pres.focus(); } catch (e) { /* ignore */ } return; }
    try { pres = window.open('', 'ust-presenter', 'width=920,height=760'); } catch (e) { pres = null; }
    if (!pres || !pres.document) { pres = null; flash('Браузер не дал открыть второе окно — разрешите всплывающие окна'); return; }
    const d = pres.document;
    d.head.innerHTML = '<meta charset="utf-8"><title>Докладчик — ' + esc(plain(P.title)) + '</title><style>' + PRES_CSS + '</style>';
    d.body.innerHTML = PRES_HTML;
    const on = (id, fn) => { const el = d.getElementById(id); if (el) el.onclick = fn; };
    on('p-prev', () => go(cur - 1));
    on('p-go', () => go(cur + 1));
    on('p-step', () => { const b = (boards[cur] || []).find(x => x.n > 1) || (boards[cur] || [])[0]; if (b) b.step(1); });
    on('p-reset', () => { presT0 = Date.now(); presTick(); });
    presT0 = Date.now();
    clearInterval(presTimer);
    presTimer = setInterval(presTick, 1000);
    presTick();
    presUpdate();
    flash('Второе окно открыто — перетащите его на свой экран');
  }
  function closePresenter() {
    if (presTimer) clearInterval(presTimer);
    presTimer = 0;
    if (pres && !pres.closed) { try { pres.close(); } catch (e) { /* ignore */ } }
    pres = null;
  }
  presBtn.addEventListener('click', openPresenter);
  const toc = H('div', 'te-toc', app);
  toc.hidden = true;
  const panel = H('div', 'te-toc-panel', toc);
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Список слайдов');
  const th = H('div', 'te-toc-head', panel, '<span>Слайды</span>');
  const tcl = H('button', 'te-btn', th, 'Закрыть');
  tcl.type = 'button';
  const tlist = H('ol', null, panel);

  /* Картинка слайда отдельным блоком: над текстом или рядом с ним */
  function slideImage(s) {
    if (!s.image || !s.image.src) return null;
    const fig = H('figure', 'te-img');
    const el = H('img', null, fig);
    el.src = s.image.src;
    el.alt = s.image.alt || '';
    return fig;
  }
  const boards = [];
  const N = P.slides.length;
  if (!N) H('div', 'te-empty', stage, 'В презентации пока нет слайдов.');
  P.slides.forEach((s, idx) => {
    const hasBoard = !!(s.board && s.layout !== 'text');
    const sec = H('section', 'te-slide ' + (hasBoard ? 'te-has-board' : 'te-text') + (s.layout === 'title' ? ' te-title-slide' : ''), stage);
    const label = plain(s.nav || s.title) || `Слайд ${idx + 1}`;
    sec.setAttribute('aria-label', `${idx + 1}. ${label}`);
    const inner = H('div', 'te-inner', sec);
    const brandHTML = (s.layout === 'title' && (brand.logo || brand.team))
      ? `<div class="te-brand">${brand.logo ? `<img src="${esc(brand.logo)}" alt="">` : ''}${brand.team ? `<span>${esc(brand.team)}</span>` : ''}</div>`
      : '';
    const headHTML = brandHTML + (s.title ? (s.layout === 'title' ? `<h1>${inline(s.title)}</h1>` : `<h2>${inline(s.title)}</h2>`) : '') +
      (s.subtitle ? `<p class="${s.layout === 'title' ? 'te-sub' : 'te-lead'}">${inline(s.subtitle)}</p>` : '');
    const bodyHTML = md(s.body);
    if (s.layout === 'roles' && s.board) {
      if (headHTML) H('div', 'te-head', inner, headHTML);
      const wrap = H('div', 'te-roles', inner);
      const visCol = H('div', 'te-roles-pitch', wrap);
      const bd = new Board(H('div', 'te-vis', visCol), s.board, P, {});
      boards[idx] = [bd];
      const card = H('div', 'te-roles-card', wrap);
      const chips = H('div', 'te-chapters', card);
      const ttl = H('h3', 'te-role-title', card);
      const roleBody = H('div', 'te-body te-md te-role-body', card);
      const roles = s.roles || [];
      let curRole = 0;
      const showRole = k => {
        const r = roles[k];
        if (!r) return;
        curRole = k;
        ttl.textContent = plain(r.title || '');
        roleBody.innerHTML = md(r.body || '');
        bd.setHighlight(r.ids || []);
        Array.prototype.forEach.call(chips.children, (c, n) => c.setAttribute('aria-pressed', String(n === k)));
      };
      roles.forEach((r, k) => {
        const rb = H('button', 'te-chapter', chips);
        rb.type = 'button';
        rb.textContent = plain(r.title || `Роль ${k + 1}`);
        rb.addEventListener('click', () => showRole(k));
      });
      /* вход на слайд пересобирает схему — возвращаем подсветку выбранной роли */
      const enterBase = bd.enter.bind(bd);
      bd.enter = () => { enterBase(); if (roles.length) showRole(curRole); };
      if (roles.length) showRole(0);
      const figR = slideImage(s);
      if (figR) inner.appendChild(figR);
      if (bodyHTML) H('div', 'te-body te-md', inner, bodyHTML);
    } else if (s.layout === 'duo' && s.board && s.board2) {
      if (headHTML) H('div', 'te-head', inner, headHTML);
      const duo = H('div', 'te-duo', inner);
      boards[idx] = [[s.board, s.cap1], [s.board2, s.cap2]].map(pair => {
        const col = H('div', 'te-duo-col', duo);
        if (pair[1]) H('div', 'te-duo-cap', col, inline(pair[1]));
        const vis = H('div', 'te-vis', col);
        const sui = H('div', 'te-sui', col);
        const bd = new Board(vis, pair[0], P, { uiHost: sui });
        if (!sui.childNodes.length) sui.remove();
        return bd;
      });
      const figD = slideImage(s);
      if (figD) inner.appendChild(figD);
      if (bodyHTML) H('div', 'te-body te-md', inner, bodyHTML);
    } else if (hasBoard) {
      const split = H('div', 'te-split' + (s.side === 'right' ? ' te-right' : '') + (s.layout === 'board' ? ' te-focus' : ''), inner);
      if (headHTML) H('div', 'te-head', split, headHTML);
      const vis = H('div', 'te-vis', split);
      const sui = H('div', 'te-sui', split);
      const figB = slideImage(s);
      if (figB) split.appendChild(figB);
      if (bodyHTML) H('div', 'te-body te-md', split, bodyHTML);
      boards[idx] = [new Board(vis, s.board, P, { uiHost: sui })];
      if (!sui.childNodes.length) sui.remove();
    } else if (s.image && s.image.src && s.image.place === 'side') {
      const split = H('div', 'te-split te-img-split' + (s.side === 'right' ? ' te-right' : ''), inner);
      if (headHTML) H('div', 'te-head', split, headHTML);
      const fig = slideImage(s);
      fig.className = 'te-img te-vis';
      split.appendChild(fig);
      if (bodyHTML) H('div', 'te-body te-md', split, bodyHTML);
    } else {
      if (headHTML) H('div', 'te-head', inner, headHTML);
      const figT = slideImage(s);
      if (figT) inner.appendChild(figT);
      if (bodyHTML) H('div', 'te-body te-md', inner, bodyHTML);
    }
    const li = H('li', null, tlist);
    const b = H('button', null, li);
    b.type = 'button';
    H('span', null, b).textContent = String(idx + 1);
    H('span', null, b).textContent = label;
    b.addEventListener('click', () => { closeToc(false); go(idx); });
  });

  /* Схема под пальцем: по ней рисуем и по ней же листаем шаги */
  function boardAt(target) {
    const svg = target && target.closest ? target.closest('svg.te-svg') : null;
    if (!svg) return null;
    return (boards[cur] || []).find(b => b.svg === svg) || null;
  }
  let drawing = null;
  stage.addEventListener('pointerdown', e => {
    if (!marker) return;
    const bd = boardAt(e.target);
    if (!bd) return;
    e.preventDefault();
    const p = bd.svgPoint(e.clientX, e.clientY);
    const d = `M${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    const path = S('path', {
      d, fill: 'none', stroke: markerColor, 'stroke-width': (4 * bd.drawScale()).toFixed(2),
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'te-stroke'
    }, bd.drawLayer());
    drawing = { bd, path, d };
    try { stage.setPointerCapture(e.pointerId); } catch (x) { /* не поддерживается — не страшно */ }
  });
  stage.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = drawing.bd.svgPoint(e.clientX, e.clientY);
    drawing.d += `L${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    drawing.path.setAttribute('d', drawing.d);
  });
  const endDraw = () => { drawing = null; };
  stage.addEventListener('pointerup', endDraw);
  stage.addEventListener('pointercancel', endDraw);
  /* Касание схемы листает шаги — когда не рисуем */
  stage.addEventListener('click', e => {
    if (marker || (e.target && e.target.closest && e.target.closest('button'))) return;
    const bd = boardAt(e.target);
    if (!bd || bd.n < 2) return;
    /* шаг вперёд сам останавливает автопоказ — тапом удобно вести разбор */
    bd.step(1);
  });

  let cur = -1;
  function go(n) {
    if (!N) return;
    n = Math.max(0, Math.min(N - 1, n));
    if (n === cur) return;
    const secs = stage.querySelectorAll('.te-slide');
    if (cur >= 0) { secs[cur].classList.remove('on'); (boards[cur] || []).forEach(b => b.leave()); }
    cur = n;
    const sec = secs[n];
    sec.classList.add('on');
    sec.scrollTop = 0;
    const body = sec.querySelector('.te-body');
    if (body) body.scrollTop = 0;
    (boards[n] || []).forEach(b => { b.clearDrawing(); b.setSpeed(speedK); b.enter(); });
    pager.textContent = `${n + 1} / ${N}`;
    fill.style.width = ((n + 1) / N * 100) + '%';
    where.textContent = plain(P.slides[n].nav || P.slides[n].title) || `Слайд ${n + 1}`;
    prevBtn.disabled = n === 0;
    nextBtn.disabled = n === N - 1;
    tlist.querySelectorAll('button').forEach((el, k) => el.setAttribute('aria-current', String(k === n)));
    if (opts.useHash) { try { history.replaceState(null, '', '#' + (n + 1)); } catch (e) { /* sandbox */ } }
    presUpdate();
  }
  function openToc() { toc.hidden = false; const c = tlist.querySelector('[aria-current="true"]') || tlist.querySelector('button'); if (c) c.focus(); }
  function closeToc(refocus) { toc.hidden = true; if (refocus !== false) tocBtn.focus(); }
  function toggleFs() {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch (e) { /* not allowed */ }
  }
  prevBtn.addEventListener('click', () => go(cur - 1));
  nextBtn.addEventListener('click', () => go(cur + 1));
  tocBtn.addEventListener('click', openToc);
  tcl.addEventListener('click', () => closeToc());
  toc.addEventListener('click', e => { if (e.target === toc) closeToc(); });
  if (fsBtn) fsBtn.addEventListener('click', toggleFs);

  const onKey = e => {
    if (!app.isConnected) return;
    if (!toc.hidden) { if (e.key === 'Escape') closeToc(); return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const onButton = tag === 'BUTTON';
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(cur + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(N - 1); }
    else if (e.key === 'Escape' && opts.onClose) opts.onClose();
    else if (e.key === ' ' && !onButton) { const b = (boards[cur] || []).find(x => x.playBtn); if (b) { e.preventDefault(); b.playBtn.click(); } }
    else if ('fFаА'.indexOf(e.key) >= 0 && canFs) toggleFs();
    else if ('pPзЗ'.indexOf(e.key) >= 0) openPresenter();
  };
  document.addEventListener('keydown', onKey);

  let sx = 0, sy = 0, stt = 0;
  stage.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; stt = Date.now(); }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (marker) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - stt < 700) go(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  let start = opts.start || 0;
  const hashSlide = () => { const hn = parseInt((location.hash || '').replace('#', ''), 10); return hn >= 1 && hn <= N ? hn - 1 : -1; };
  const onHash = () => { const k = hashSlide(); if (k >= 0) go(k); };
  if (opts.useHash) { const k = hashSlide(); if (k >= 0) start = k; window.addEventListener('hashchange', onHash); }
  go(start);
  return {
    go,
    destroy() {
      closePresenter();
      boards.forEach(bs => (bs || []).forEach(b => b.leave()));
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      rootEl.textContent = '';
    }
  };
}