// Этап 4б: состав команды и имена под фишками.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 4б — состав команды');
  const env = await openApp();
  const TE = env.TE;
  const host = () => { const d = env.doc.createElement('div'); env.doc.body.appendChild(d); return d; };

  t.section('имя под фишкой');
  const mk = (showNames, labelMode) => {
    const P = TE.normalizeProject({
      settings: { format: '8x8', tokens: { showNames, oursLabel: labelMode || 'label' } },
      roster: [{ id: 'r1', name: 'Петров', number: '7', pos: 'ЛЗ' }],
      slides: []
    });
    const b = TE.normalizeBoard({ entities: [{ id: 'a', kind: 'ours', label: 'ЛЗ', number: '3', player: 'r1' }], frames: [{ pos: { a: [50, 50] } }] });
    return { P, b };
  };
  const on = mk(true);
  const bdOn = new TE.Board(host(), on.b, on.P, { bare: true });
  const nameEl = bdOn.svg.querySelector('.te-name');
  t.ok('под фишкой подписано имя', !!nameEl && nameEl.textContent === 'Петров', nameEl && nameEl.textContent);
  const off = mk(false);
  const bdOff = new TE.Board(host(), off.b, off.P, { bare: true });
  t.ok('без галочки имён нет', !bdOff.svg.querySelector('.te-name'));

  t.section('номер из состава');
  const byNum = mk(false, 'number');
  t.ok('на фишке номер из состава, а не свой', TE.tokenLabel(byNum.P, byNum.P.settings, byNum.b.entities[0]) === '7', TE.tokenLabel(byNum.P, byNum.P.settings, byNum.b.entities[0]));
  const byLabel = mk(false, 'label');
  t.ok('в режиме позиций — по-прежнему позиция', TE.tokenLabel(byLabel.P, byLabel.P.settings, byLabel.b.entities[0]) === 'ЛЗ');
  const noLink = TE.normalizeBoard({ entities: [{ id: 'b', kind: 'ours', label: '', number: '5' }], frames: [{ pos: { b: [50, 50] } }] });
  t.ok('непривязанная фишка работает как раньше', TE.tokenLabel(byNum.P, byNum.P.settings, noLink.entities[0]) === '5');
  t.ok('старые презентации без состава открываются', Array.isArray(TE.normalizeProject({ slides: [] }).roster));
  t.clean(env, 'движок без ошибок');
  env.close();

  t.section('в редакторе');
  const e = await openApp();
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  await e.gotoBoardSlide(0);
  await e.press('Настройки');
  await e.press('Состав', e.$('.modal-ov'));
  await e.wait(15);
  await e.press('Добавить игрока', e.$('.modal-ov'));
  await e.wait(20);
  t.ok('игрок добавлен в состав', e.App.project.roster.length === 1);
  const card = e.$$('.modal-ov .exp-card')[0];
  const inputs = card.querySelectorAll('input.inp');
  e.input(inputs[0], 'Петров');
  e.input(inputs[1], '7');
  await e.wait(20);
  t.ok('имя и номер сохранились', e.App.project.roster[0].name === 'Петров' && e.App.project.roster[0].number === '7');
  const tog = e.$$('.modal-ov .tog').find(x => /имена под фишками/.test(e.text(x)));
  t.ok('есть переключатель имён', !!tog);
  if (tog) { e.change(tog.querySelector('input'), true); await e.wait(20); }
  await e.press('Закрыть', e.$('.modal-ov'));
  await e.wait(20);

  const entId = e.board().entities.find(x => x.kind === 'ours' && !x.gk).id;
  await e.tap(`[data-eid="${entId}"] circle`, e.frame().pos[entId]);
  const sel = e.$$('#edInsp select.inp')[0];
  t.ok('в свойствах игрока есть выбор из состава', !!sel);
  e.change(sel, e.App.project.roster[0].id);
  await e.wait(25);
  t.ok('фишка привязана к игроку состава', e.board().entities.find(x => x.id === entId).player === e.App.project.roster[0].id);
  const drawn = e.$$('#edCanvas .te-name').map(x => e.text(x));
  t.ok('на поле под фишкой появилась фамилия', drawn.indexOf('Петров') >= 0, drawn.join(', '));

  t.section('замена и удаление');
  await e.press('Настройки');
  await e.press('Состав', e.$('.modal-ov'));
  await e.wait(15);
  e.input(e.$$('.modal-ov .exp-card')[0].querySelectorAll('input.inp')[0], 'Сидоров');
  await e.wait(20);
  await e.press('Закрыть', e.$('.modal-ov'));
  await e.wait(20);
  t.ok('замена игрока обновила подпись на схеме', e.$$('#edCanvas .te-name').map(x => e.text(x)).indexOf('Сидоров') >= 0);
  await e.press('Настройки');
  await e.press('Состав', e.$('.modal-ov'));
  await e.wait(15);
  await e.press('Убрать из состава', e.$('.modal-ov'));
  await e.wait(25);
  await e.press('Закрыть', e.$('.modal-ov'));
  await e.wait(20);
  t.ok('состав пуст', e.App.project.roster.length === 0);
  t.ok('фишка отвязана и осталась на месте', !e.board().entities.find(x => x.id === entId).player && !!e.frame().pos[entId]);
  t.clean(e, 'этап 4б без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
