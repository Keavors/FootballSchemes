// Этап 4а: макет «две схемы рядом» и своя ориентация/часть поля у схемы.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 4а — две схемы и своё поле');
  const env = await openApp();
  const TE = env.TE;

  t.section('своя ориентация у схемы');
  const P = TE.normalizeProject({ settings: { format: '8x8' }, slides: [] });
  const mkBoard = view => TE.normalizeBoard({ entities: [{ id: 'a', kind: 'ours' }], frames: [{ pos: { a: [50, 50] } }], view });
  const host = () => { const d = env.doc.createElement('div'); env.doc.body.appendChild(d); return d; };
  const plain = new TE.Board(host(), mkBoard(), P, { bare: true });
  t.ok('по умолчанию как в настройках — вертикально', plain.geo.horiz === false);
  const horiz = new TE.Board(host(), mkBoard({ orientation: 'horizontal' }), P, { bare: true });
  t.ok('схема может лежать горизонтально', horiz.geo.horiz === true);
  t.ok('общие настройки при этом не изменились', P.settings.pitch.orientation === 'vertical');
  const attack = new TE.Board(host(), mkBoard({ part: 'attack' }), P, { bare: true });
  t.ok('и показывать только половину атаки', attack.geo.vb[3] < plain.geo.vb[3], attack.geo.vb.join(' '));

  t.section('показ двух схем');
  const duoProject = TE.normalizeProject({
    settings: { format: '8x8' },
    slides: [{
      id: 's1', layout: 'duo', title: 'Как играем', cap1: 'Без мяча 4-2-1', cap2: 'С мячом 3-3-1',
      board: mkBoard(), board2: mkBoard({ orientation: 'horizontal' })
    }]
  });
  const root = host();
  const show = TE.mountPresentation(root, duoProject, {});
  t.ok('на слайде две колонки со схемами', root.querySelectorAll('.te-duo-col').length === 2);
  t.ok('и два поля', root.querySelectorAll('.te-duo-col svg.te-svg').length === 2);
  t.ok('подписи над схемами на месте', /Без мяча 4-2-1/.test(root.textContent) && /С мячом 3-3-1/.test(root.textContent));
  show.destroy();
  const single = TE.normalizeProject({ settings: { format: '8x8' }, slides: [{ id: 's2', layout: 'split', title: 'Обычный', board: mkBoard() }] });
  const root2 = host();
  const show2 = TE.mountPresentation(root2, single, {});
  t.ok('обычный слайд по-прежнему с одной схемой', root2.querySelectorAll('svg.te-svg').length === 1 && !root2.querySelector('.te-duo'));
  show2.destroy();
  t.clean(env, 'движок без ошибок');
  env.close();

  t.section('в редакторе');
  const e = await openApp();
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  await e.gotoBoardSlide(0);
  await e.press('Макет');
  await e.wait(15);
  const card = e.$$('.layout-cards .lay').find(x => /Две схемы/.test(e.text(x)));
  t.ok('в макетах появились «Две схемы»', !!card);
  e.click(card);
  await e.wait(25);
  t.ok('вторая схема создана', !!e.slide().board2 && e.slide().layout === 'duo');
  await e.press('Схема');
  await e.wait(15);
  t.ok('появился переключатель схем', !!e.button('Левая схема') && !!e.button('Правая схема'));

  const leftId = e.board().entities[0].id;
  const p0 = e.frame().pos[leftId].slice();
  await e.press('Правая схема');
  await e.wait(20);
  t.ok('переключились на правую схему', e.App.boardIdx === 1);
  const rightId = e.board().entities[0].id;
  const pr = e.frame().pos[rightId].slice();
  await e.drag(`[data-eid="${rightId}"] circle`, pr, [pr[0] + 10, pr[1]]);
  t.ok('правка ушла в правую схему', Math.abs(e.slide().board2.frames[0].pos[rightId][0] - (pr[0] + 10)) < 0.6);
  t.ok('левая схема не тронута', Math.abs(e.slide().board.frames[0].pos[leftId][0] - p0[0]) < 0.01);

  t.section('ориентация конкретной схемы');
  await e.press('Макет');
  await e.wait(15);
  const fld = e.$$('.ed-pane .fld').find(x => /Ориентация этой схемы/.test(e.text(x)));
  t.ok('есть выбор ориентации схемы', !!fld);
  e.click([...fld.querySelectorAll('button')].find(x => e.text(x) === 'Горизонтально'));
  await e.wait(20);
  t.ok('настройка записана в саму схему', e.slide().board2.view.orientation === 'horizontal');
  await e.press('Схема');
  await e.wait(20);
  t.ok('поле в редакторе повернулось', e.App.canvasBoard.geo.horiz === true);
  t.ok('общие настройки презентации не изменились', e.App.project.settings.pitch.orientation === 'vertical');
  await e.press('Левая схема');
  await e.wait(20);
  t.ok('у левой схемы ориентация прежняя', e.App.canvasBoard.geo.horiz === false);

  t.section('подписи над схемами');
  await e.press('Текст');
  await e.wait(15);
  const cap = e.$$('.ed-pane .fld').find(x => /над левой схемой/.test(e.text(x)));
  t.ok('есть поле подписи для левой схемы', !!cap);
  if (cap) { e.input(cap.querySelector('input'), 'Без мяча 4-2-1'); await e.wait(20); }
  t.ok('подпись сохранилась', e.slide().cap1 === 'Без мяча 4-2-1');
  await e.press('Показ');
  await e.wait(40);
  t.ok('в показе видно обе схемы и подпись', e.$$('.ed-preview .te-duo-col').length === 2 && /Без мяча 4-2-1/.test(e.text(e.$('.ed-preview'))));
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(15);
  t.clean(e, 'этап 4а без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
