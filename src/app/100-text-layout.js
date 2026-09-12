
/* ---------- Вкладка «Текст» ---------- */
function renderTextTab(stage) {
  const s = slide();
  const pane = h('div', { class: 'ed-pane' });
  const prev = h('div', { class: 'md-prev te-app te-md' });
  const updPrev = () => {
    const cur = slide();
    prev.innerHTML = (cur.title ? (cur.layout === 'title' ? `<h1 style="font-size:44px">${TE.inline(cur.title)}</h1>` : `<h2>${TE.inline(cur.title)}</h2>`) : '') +
      (cur.subtitle ? `<p class="${cur.layout === 'title' ? 'te-sub' : 'te-lead'}">${TE.inline(cur.subtitle)}</p>` : '') + TE.md(cur.body);
  };
  const upd = (key, fn, parts) => v => { commit(() => fn(slide(), v), { key: key + s.id, parts: parts || [] }); updPrev(); };
  const title = txt(s.title, upd('t', (x, v) => { x.title = v; }, ['slides']), { ph: 'Заголовок слайда', max: 120 });
  const sub = txt(s.subtitle, upd('st', (x, v) => { x.subtitle = v; }), { multi: true, rows: 2, ph: 'Короткое пояснение под заголовком' });
  const body = h('textarea', { class: 'inp', rows: 16, value: s.body, placeholder: '- **Пункт.** Пояснение\n1. Шаг\n## Подзаголовок\n> Важная мысль', spellcheck: 'true' });
  body.addEventListener('input', () => upd('b', (x, v) => { x.body = v; })(body.value));
  const nav = txt(s.nav, upd('n', (x, v) => { x.nav = v; }, ['slides']), { ph: 'Если пусто — берётся заголовок', max: 40 });
  const notes = txt(s.notes, upd('nt', (x, v) => { x.notes = v; }), { multi: true, rows: 3, ph: 'Что сказать команде на этом слайде' });
  const wrap = (a, b2) => () => {
    const st0 = body.selectionStart, en = body.selectionEnd, v = body.value;
    const selTxt = v.slice(st0, en) || 'текст';
    body.value = v.slice(0, st0) + a + selTxt + b2 + v.slice(en);
    body.focus();
    body.setSelectionRange(st0 + a.length, st0 + a.length + selTxt.length);
    body.dispatchEvent(new Event('input'));
  };
  const prefix = fnP => () => {
    const v = body.value, st0 = body.selectionStart, en = body.selectionEnd;
    const ls = v.lastIndexOf('\n', st0 - 1) + 1;
    let le = v.indexOf('\n', en); if (le < 0) le = v.length;
    const lines = v.slice(ls, le).split('\n').map((l, k) => fnP(l.replace(/^(\s*([-*•]|\d+[.)]|#{1,3}|>)\s*)/, ''), k));
    const rep = lines.join('\n');
    body.value = v.slice(0, ls) + rep + v.slice(le);
    body.focus();
    body.setSelectionRange(ls, ls + rep.length);
    body.dispatchEvent(new Event('input'));
  };
  const insert = t => () => {
    const st0 = body.selectionStart, v = body.value;
    body.value = v.slice(0, st0) + t + v.slice(body.selectionEnd);
    body.focus();
    body.setSelectionRange(st0 + t.length, st0 + t.length);
    body.dispatchEvent(new Event('input'));
  };
  const C = App.project.settings.colors;
  const bar = h('div', { class: 'md-bar' },
    btn('', 'Жирный', wrap('**', '**'), false, 'sm'),
    btn('', 'Курсив', wrap('*', '*'), false, 'sm'),
    btn('', 'Команда голосом', wrap('!!', '!!'), false, 'sm'),
    btn('', 'Список', prefix(l => '- ' + l), false, 'sm'),
    btn('', 'Шаги 1, 2, 3', prefix((l, k) => (k + 1) + '. ' + l), false, 'sm'),
    btn('', 'Подзаголовок', prefix(l => '## ' + l), false, 'sm'),
    btn('', 'Врезка', prefix(l => '> ' + l), false, 'sm'),
    btn('', 'Термин :: пояснение', insert('\nТермин :: пояснение\n'), false, 'sm'),
    btn('', 'Две колонки', insert('\n||\n'), false, 'sm'),
    btn('', 'Цвет наших', wrap(`{${C.ours} `, '}'), false, 'sm'),
    btn('', 'Цвет соперника', wrap(`{${C.opp} `, '}'), false, 'sm'),
    btn('', 'Цвет выделения', wrap(`{${C.special} `, '}'), false, 'sm'));
  pane.appendChild(h('div', { class: 'ed-pane-in' },
    h('div', { class: 'txt-grid' },
      h('div', null,
        fld('Заголовок', title),
        fld('Подзаголовок', sub),
        fld('Основной текст', h('div', null, bar, body)),
        fld('Короткое название для навигации', nav),
        fld('Заметки для себя', notes, 'Команда их не увидит: в показ и в отправленный файл не попадают'),
        fld('Картинка на слайде', imageBox()),
        s.layout === 'duo' ? fld('Подпись над левой схемой', txt(s.cap1, upd('c1', (x, v) => { x.cap1 = v; }), { ph: 'Например: Без мяча 4-2-1', max: 60 })) : null,
        s.layout === 'duo' ? fld('Подпись над правой схемой', txt(s.cap2, upd('c2', (x, v) => { x.cap2 = v; }), { ph: 'Например: С мячом 3-3-1', max: 60 })) : null),
      h('div', null, h('div', { class: 'fld-l', style: 'margin-bottom:6px' }, 'Как это будет выглядеть'), prev))));
  if (slide().layout === 'roles') pane.firstChild.appendChild(rolesEditor());
  stage.appendChild(pane);
  updPrev();
}
/* ---------- Картинка на слайде ---------- */
/* Большие фотографии ужимаем, иначе презентация распухает. Если рисовать негде — берём как есть */
function shrinkDataURL(src, cb) {
  let ctx = null;
  try { ctx = document.createElement('canvas').getContext('2d'); } catch (e) { ctx = null; }
  if (!ctx || typeof Image !== 'function') { cb(src); return; }
  const img = new Image();
  img.onload = () => {
    try {
      const max = 1600, k = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
      if (k >= 1 && src.length < 400000) { cb(src); return; }
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((img.width || 1) * k));
      c.height = Math.max(1, Math.round((img.height || 1) * k));
      const c2 = c.getContext('2d');
      if (!c2) { cb(src); return; }
      c2.drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.82));
    } catch (e) { cb(src); }
  };
  img.onerror = () => cb(src);
  img.src = src;
}
function readImage(file, cb) {
  const fr = new FileReader();
  fr.onload = () => shrinkDataURL(String(fr.result || ''), cb);
  fr.onerror = () => cb('');
  fr.readAsDataURL(file);
}
function imageBox() {
  const box = h('div', { class: 'img-box' });
  const cur = slide().image;
  const file = h('input', { type: 'file', accept: 'image/*' });
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (!f) return;
    readImage(f, src => {
      if (!src) { toast('Не получилось прочитать картинку'); return; }
      commit(() => {
        const s = slide();
        s.image = { src, alt: '', place: (s.image && s.image.place) || 'body' };
      }, { parts: ['main'] });
    });
  });
  appendAll(box,
    cur && cur.src ? h('img', { class: 'img-prev', src: cur.src, alt: '' }) : null,
    h('div', { class: 'btn-row' },
      h('label', { class: 'btn sm file-btn' }, icon('upload'), h('span', { class: 'lbl' }, cur && cur.src ? 'Заменить' : 'Выбрать картинку'), file),
      cur && cur.src ? btn('trash', 'Убрать', () => commit(() => { delete slide().image; }, { parts: ['main'] }), false, 'sm danger') : null),
    cur && cur.src ? fld('Где показывать', seg([['body', 'Над текстом'], ['side', 'Рядом с текстом']], cur.place || 'body',
      v => commit(() => { slide().image.place = v; }, { parts: ['main'] }))) : null,
    h('small', null, 'Картинка хранится внутри презентации и уезжает вместе с файлом. В ссылку на показ она не входит.'));
  return box;
}

/* ---------- Роли: требования по позициям ---------- */
function moveRole(i, d) {
  commit(() => {
    const r = slide().roles, j = i + d;
    if (j < 0 || j >= r.length) return;
    const [x] = r.splice(i, 1);
    r.splice(j, 0, x);
  }, { parts: ['main'] });
}
function rolesEditor() {
  const s = slide(), b = s.board, f0 = b ? b.frames[0] : null;
  const wrap = h('div', { class: 'card' },
    h('h3', null, 'Роли и требования'),
    h('p', { class: 'muted small' }, 'Каждая роль — кнопка в показе: нажал и видно, кто это на схеме и что от него нужно.'));
  (s.roles || []).forEach((r, i) => {
    const chips = b ? h('div', { class: 'ent-list' }, b.entities.filter(x => TE.isPlayer(x)).map(x => h('button', {
      type: 'button',
      class: 'ent-chip' + ((r.ids || []).indexOf(x.id) >= 0 ? ' on' : '') + (f0 && f0.pos[x.id] ? '' : ' off'),
      onclick: () => commit(() => {
        const rr = slide().roles[i];
        rr.ids = rr.ids || [];
        const at = rr.ids.indexOf(x.id);
        if (at >= 0) rr.ids.splice(at, 1); else rr.ids.push(x.id);
      }, { parts: ['main'] })
    }, x.label || x.number || '•'))) : null;
    wrap.appendChild(h('div', { class: 'exp-card' },
      fld('Название роли', txt(r.title, v => commit(() => { slide().roles[i].title = v; }, { key: 'rt' + r.id, parts: [] }), { max: 40, ph: 'Левый защитник (ЛЗ)' })),
      fld('Требования', txt(r.body, v => commit(() => { slide().roles[i].body = v; }, { key: 'rb' + r.id, parts: [] }), { multi: true, rows: 4, ph: '- Без мяча: держит ширину\n- С мячом: подключается вперёд' })),
      fld('Кто это на схеме', chips),
      h('div', { class: 'btn-row' },
        btn('up', 'Выше', () => moveRole(i, -1), i === 0, 'sm'),
        btn('down', 'Ниже', () => moveRole(i, 1), i === (s.roles.length - 1), 'sm'),
        btn('trash', 'Удалить роль', () => commit(() => { slide().roles.splice(i, 1); }, { parts: ['main'] }), false, 'sm danger'))));
  });
  wrap.appendChild(h('div', { class: 'btn-row' }, btn('plus', 'Добавить роль', () => commit(() => {
    const x = slide();
    x.roles = x.roles || [];
    x.roles.push({ id: uid(), title: 'Новая роль', body: '- Без мяча:\n- С мячом:', ids: [] });
  }, { parts: ['main'] }), false, 'primary')));
  return wrap;
}
function mdHelp() {
  const row = (code, what) => h('div', null, h('span', null, h('code', null, code)), h('span', null, what));
  return [sect(null,
    h('div', { class: 'md-help' },
      row('**текст**', 'жирный'),
      row('*текст*', 'курсив'),
      row('!!Иду!!!', 'команда «от руки»: Иду!'),
      row('- пункт', 'список'),
      row('1. шаг', 'нумерованные шаги'),
      row('## Заголовок', 'подзаголовок'),
      row('> мысль', 'врезка с полосой'),
      row('Слово :: пояснение', 'таблица-определение'),
      row('||', 'вторая колонка на ПК'),
      row('{#d8453c текст}', 'цветной текст')),
    h('p', { class: 'muted small', style: 'margin-top:10px' }, 'Пустая строка разделяет абзацы. Разметку можно вставлять кнопками над полем.'))];
}

/* ---------- Вкладка «Макет» ---------- */
function layoutIcon(k) {
  const g = '<rect x="0" y="0" width="100" height="54" rx="6" fill="#edf1ee" stroke="#c9d2cd"/>';
  const pitch = (x, y, w, hh) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="3" fill="#3a8a55"/>`;
  const lines = (x, y, n, w) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * 7}" width="${w - (i % 2) * 8}" height="3" rx="1.5" fill="#9aa5b5"/>`).join('');
  const m = {
    title: g + '<rect x="12" y="16" width="56" height="9" rx="2" fill="#1f2a44"/><rect x="12" y="30" width="40" height="4" rx="2" fill="#9aa5b5"/>',
    split: g + pitch(8, 6, 28, 42) + '<rect x="44" y="8" width="40" height="6" rx="2" fill="#1f2a44"/>' + lines(44, 20, 4, 46),
    board: g + pitch(22, 4, 32, 46) + '<rect x="62" y="8" width="26" height="5" rx="2" fill="#1f2a44"/>' + lines(62, 18, 3, 28),
    duo: g + pitch(10, 8, 34, 38) + pitch(56, 8, 34, 38) + '<rect x="10" y="2" width="20" height="4" rx="2" fill="#1f2a44"/><rect x="56" y="2" width="20" height="4" rx="2" fill="#1f2a44"/>',
    roles: g + pitch(8, 8, 30, 38) + '<rect x="46" y="8" width="14" height="5" rx="2.5" fill="#ff7a00"/><rect x="64" y="8" width="14" height="5" rx="2.5" fill="#9aa5b5"/><rect x="46" y="20" width="34" height="5" rx="2" fill="#1f2a44"/>' + lines(46, 30, 3, 44),
    text: g + '<rect x="10" y="8" width="48" height="6" rx="2" fill="#1f2a44"/>' + lines(10, 20, 4, 80)
  };
  return h('span', { html: `<svg viewBox="0 0 100 54" aria-hidden="true">${m[k]}</svg>` });
}
function renderSlideTab(stage) {
  const s = slide(), b = s.board;
  const pane = h('div', { class: 'ed-pane' });
  pane.appendChild(h('div', { class: 'ed-pane-in' },
    h('div', { class: 'card' }, h('h3', null, 'Раскладка слайда'),
      h('div', { class: 'layout-cards' }, Object.keys(LAYOUTS).map(k => h('button', {
        type: 'button', class: 'lay' + (s.layout === k ? ' on' : ''), 'aria-pressed': String(s.layout === k),
        onclick: () => commit(p => {
          const x = slide();
          x.layout = k;
          if (k !== 'text' && k !== 'title' && !x.board) x.board = boardFromFormation(p.settings.format);
          if (k === 'duo' && !x.board2) x.board2 = TE.normalizeBoard(clone(x.board));
          if (k === 'roles' && !(x.roles || []).length) {
            const f0 = x.board.frames[0];
            x.roles = x.board.entities.filter(q => TE.isPlayer(q) && q.kind === 'ours' && f0.pos[q.id]).map(q => ({
              id: uid(),
              title: q.label || q.number || 'Игрок',
              body: '- Что делает без мяча\n- Что делает с мячом',
              ids: [q.id]
            }));
          }
          App.boardIdx = 0;
        }, { parts: ['main', 'slides', 'insp'] })
      }, layoutIcon(k), h('b', null, LAYOUTS[k].name), h('small', null, LAYOUTS[k].hint))))),
    h('div', { class: 'card' }, h('h3', null, 'Схема'),
      b ? [
        s.layout === 'duo' ? h('p', { class: 'muted small' }, `Настройки ниже — для ${App.boardIdx === 1 ? 'правой' : 'левой'} схемы. Переключить можно на вкладке «Схема».`) : null,
        fld('Ориентация этой схемы', seg([['inherit', 'Как в настройках'], ['vertical', 'Вертикально'], ['horizontal', 'Горизонтально']], (b.view && b.view.orientation) || 'inherit', v => commit(() => { board().view.orientation = v; }, { parts: ['canvas', 'insp'] }))),
        fld('Часть поля у этой схемы', seg([['inherit', 'Как в настройках'], ['full', 'Всё поле'], ['attack', 'Половина атаки'], ['defence', 'Своя половина']], (b.view && b.view.part) || 'inherit', v => commit(() => { board().view.part = v; }, { parts: ['canvas', 'insp'] }))),
        s.layout !== 'text' && s.layout !== 'duo' ? fld('Сторона схемы на широком экране', seg([['left', 'Слева'], ['right', 'Справа']], s.side, v => commit(() => { slide().side = v; }, { parts: [] }))) : null,
        s.layout === 'text' ? h('p', { class: 'muted' }, 'На текстовом слайде схема не показывается, но сохраняется.') : null,
        tog(b.autoplay, v => commit(() => { board().autoplay = v; }, { parts: [] }), 'Запускать анимацию при открытии'),
        tog(b.loop, v => commit(() => { board().loop = v; }, { parts: [] }), 'Повторять по кругу'),
        tog(b.legend !== false, v => commit(() => { board().legend = v; }, { parts: [] }), 'Легенда над полем'),
        tog(b.still, v => commit(() => { board().still = v; }, { parts: [] }), 'Без кнопок воспроизведения'),
        h('div', { class: 'btn-row' },
          btn('', 'Новая схема с нуля', () => confirmBox('Заменить схему на новую расстановку? Текущие шаги будут удалены (можно отменить).', 'Заменить', () => commit(p => { slide().board = boardFromFormation(p.settings.format); App.frameIdx = 0; App.sel = null; })), false, 'sm'),
          btn('trash', 'Убрать схему со слайда', () => confirmBox('Убрать схему? Все её шаги будут удалены (можно отменить).', 'Убрать', () => commit(() => { const x = slide(); x.board = null; x.layout = x.layout === 'title' ? 'title' : 'text'; App.sel = null; })), false, 'sm danger'))
      ] : [h('p', { class: 'muted' }, 'На этом слайде нет схемы.'), btn('plus', 'Добавить схему', addBoardToSlide, false, 'primary')]),
    h('div', { class: 'card' }, h('h3', null, 'Проверить'),
      h('p', { class: 'muted', style: 'margin:0 0 10px' }, 'Откроется показ с этого слайда — так его увидит команда.'),
      btn('play', 'Показать этот слайд', () => openPreview(App.slideIdx), false, 'primary'))));
  stage.appendChild(pane);
}