
/* ---------- Главный экран ---------- */
let homeDemo = null;
let homeQuery = '', homeSort = 'updated';
/* Картинка презентации в списке: поле и точки игроков с первой схемы */
function projThumb(m) {
  const th = m.thumb, ratio = th && th.r > 0.5 ? th.r : 1.5;
  const horiz = !!(th && th.h);
  const W = horiz ? Math.round(100 * ratio) : 100, H = horiz ? 100 : Math.round(100 * ratio);
  const grass = (th && th.g) || '#3a8a55';
  const cols = (th && th.c) || ['#2456c7', '#d8453c', '#7b8699'];
  const dots = ((th && th.pts) || []).map(p => {
    const x = horiz ? (100 - p[1]) * W / 100 : p[0] * W / 100;
    const y = horiz ? p[0] * H / 100 : p[1] * H / 100;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${TE.esc(cols[p[2]] || cols[0])}" stroke="#ffffff" stroke-width=".8"/>`;
  }).join('');
  return h('div', { class: 'proj-thumb', 'aria-hidden': 'true', html:
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">` +
    `<rect x="0" y="0" width="${W}" height="${H}" rx="3" fill="${TE.esc(grass)}"/>` +
    `<g fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width=".8">` +
    (horiz ? `<line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}"/>` : `<line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}"/>`) +
    `<circle cx="${W / 2}" cy="${H / 2}" r="${Math.min(W, H) * 0.13}"/></g>` + dots + '</svg>' });
}
async function renderHome() {
  App.view = 'home';
  App.project = null;
  if (App.canvasBoard) { App.canvasBoard.cancel(); App.canvasBoard = null; }
  if (homeDemo) { homeDemo.cancel(); homeDemo = null; }
  const root = $('#app');
  root.textContent = '';
  const list = await loadIndex();
  const demoHost = h('div', { class: 'te-app home-demo', 'aria-hidden': 'true' });
  const wrap = h('div', { class: 'home' },
    h('header', { class: 'home-top' },
      h('div', { class: 'brand' }, h('span', { class: 'brand-dot' }), 'Установка'),
      h('div', { class: 'grow' }),
      btn('upload', 'Открыть файл', openImport),
      btn('copy', 'Копия всех', () => openBackup(renderHome), false, '', 'Сохранить все презентации одним файлом или вернуть их из копии')),
    h('div', { id: 'installSlot' }),
    h('section', { class: 'home-hero' },
      h('div', null,
        h('h1', null, 'Тактические презентации для своей команды'),
        h('p', { class: 'lead' }, 'Расставьте игроков, нарисуйте стрелки и зоны, соберите анимацию по шагам — и покажите команде с телефона, ноутбука или телевизора. Готовую презентацию можно в любой момент открыть и поправить.'),
        h('div', { class: 'home-actions' },
          btn('plus', 'Новая презентация', openNewProject, false, 'primary lg'),
          btn('', 'Открыть пример «Маятник»', () => createFrom(pendulumProject()), false, 'lg'))),
      demoHost),
    Store.mode === 'memory' ? h('div', { class: 'note-mem' }, h('p', null, 'Здесь проекты хранятся только до закрытия страницы. Чтобы не потерять работу, сохраняйте файл проекта через «Экспорт» — его можно открыть потом на любом устройстве.')) : null,
    h('div', { class: 'home-list', id: 'storageNote', style: 'padding-top:0' }),
    h('section', { class: 'home-list' },
      h('h2', null, 'Мои презентации'),
      list.length ? projList(list) : h('p', { class: 'muted' }, 'Пока пусто. Создайте первую презентацию или откройте пример.')));
  root.appendChild(wrap);
  renderInstallSlot();
  storageNote().then(text => {
    const box = $('#storageNote');
    if (box && text) box.appendChild(h('p', { class: 'muted small' }, text));
  });
  try {
    const demo = pendulumProject();
    const b = demo.slides[0].board;
    b.legend = false;
    const fr = h('div', { class: 'te-board' });
    demoHost.appendChild(fr);
    homeDemo = new TE.Board(fr, b, demo, { bare: true });
    homeDemo.B.loop = true;
    homeDemo.play(900);
  } catch (e) { demoHost.remove(); }
}
/* Список презентаций: поиск и порядок выбирает сам пользователь */
function projList(list) {
  const grid = h('div', { class: 'proj-grid' });
  const empty = h('p', { class: 'muted', hidden: true }, 'Ничего не нашлось. Попробуйте другое слово.');
  const draw = () => {
    const q = homeQuery.trim().toLowerCase();
    let items = q ? list.filter(m => String(m.title || '').toLowerCase().indexOf(q) >= 0) : list.slice();
    items.sort(homeSort === 'title'
      ? (a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru')
      : (a, b) => (b.updated || 0) - (a.updated || 0));
    grid.textContent = '';
    items.forEach(m => grid.appendChild(projCard(m)));
    empty.hidden = items.length > 0;
  };
  const search = h('input', { class: 'inp', type: 'search', value: homeQuery, placeholder: 'Поиск по названию', 'aria-label': 'Поиск по названию' });
  search.addEventListener('input', () => { homeQuery = search.value; draw(); });
  const tools = list.length > 1
    ? h('div', { class: 'home-tools' }, search, seg([['updated', 'Сначала новые'], ['title', 'По названию']], homeSort, v => { homeSort = v; draw(); }))
    : null;
  draw();
  return h('div', null, tools, grid, empty);
}
function projCard(m) {
  const d = new Date(m.updated || Date.now());
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const open = async () => { const p = await loadProject(m.id); if (p) openEditor(p); else toast('Не получилось открыть проект'); };
  const thumb = h('button', { type: 'button', class: 'proj-shot', 'aria-label': 'Открыть «' + (m.title || 'Без названия') + '»', onclick: open }, projThumb(m));
  return h('article', { class: 'proj' },
    thumb,
    h('h3', null, m.title || 'Без названия'),
    h('div', { class: 'meta' }, `${String(m.format || '8x8').replace('x', '×')} · ${m.slides} ${plural(m.slides, 'слайд', 'слайда', 'слайдов')} · ${date}`),
    h('div', { class: 'acts' },
      btn('', 'Открыть', open, false, 'primary sm'),
      btn('copy', 'Копия', async () => { const p = await loadProject(m.id); if (!p) return; p.id = uid(); p.title += ' (копия)'; p.updated = Date.now(); await saveProject(p); renderHome(); }, false, 'sm'),
      btn('undo', 'История', () => openHistory(m.id, () => renderHome()), false, 'sm', 'Вернуться к более ранней версии'),
      btn('trash', 'Удалить', () => confirmBox(`Удалить «${m.title}»? Это действие нельзя отменить.`, 'Удалить', async () => { await removeProject(m.id); renderHome(); }), false, 'sm danger')));
}
async function createFrom(p) {
  p.id = uid();
  p.updated = Date.now();
  await saveProject(p);
  openEditor(p);
}
function openNewProject() {
  const st = { title: 'Установка на игру', format: '8x8', kind: 'blank' };
  const titleIn = h('input', { class: 'inp', value: st.title, maxlength: 80 });
  titleIn.addEventListener('input', () => { st.title = titleIn.value; });
  const close = modal('Новая презентация', [
    fld('Название', titleIn),
    fld('Формат', seg(formatChoices(), st.format, v => { st.format = v; })),
    fld('С чего начать', seg([['blank', 'С чистого листа'], ['preset', 'Заготовка «Установка на игру»']], st.kind, v => { st.kind = v; }),
      'В заготовке уже есть титул, роли по позициям, схемы без мяча и с мячом, угловой и правила на игру'),
    h('p', { class: 'muted small' }, 'Формат задаёт разметку поля и базовую расстановку. Его можно поменять позже в настройках.'),
    h('div', { class: 'btn-row' }, btn('check', 'Создать', () => {
      close();
      const name = st.title.trim() || 'Презентация';
      createFrom(st.kind === 'preset' ? presetProject(name, st.format) : blankProject(name, st.format));
    }, false, 'primary'))
  ]);
}
function blankProject(title, format) {
  const own = fmtObj(format);
  const p = TE.normalizeProject({ title, settings: { format, formats: own && own.custom ? [clone(own)] : [] }, slides: [] });
  p.slides.push({ id: uid(), layout: 'title', title, subtitle: 'Как мы играем', body: 'Коротко: о чём эта презентация и что важно запомнить.', nav: 'Титул', board: null, side: 'left' });
  p.slides.push({ id: uid(), layout: 'split', title: 'Наша расстановка', subtitle: '', body: '- **Главное.** Опишите, за что отвечает каждая линия.\n- **Второе.** Добавьте шаги анимации внизу.', nav: 'Расстановка', board: boardFromFormation(format), side: 'left' });
  return TE.normalizeProject(p);
}