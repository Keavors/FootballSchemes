// Этап 4д: готовые заготовки слайдов и презентации.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 4д — заготовки');
  const e = await openApp();
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const slides = () => e.App.project.slides;

  t.section('вставка готового слайда');
  t.ok('в списке слайдов есть кнопка заготовок', !!e.button('Из заготовки…'));
  await e.press('Из заготовки…');
  await e.wait(20);
  t.ok('окно заготовок открылось', !!e.$('.modal-ov') && e.$$('.modal-ov .exp-card').length === e.UST.SLIDE_TEMPLATES.length, e.$$('.modal-ov .exp-card').length);
  t.ok('среди них есть угловой и прессинг', /Угловой в атаке/.test(e.text(e.$('.modal-ov'))) && /Прессинг соперника/.test(e.text(e.$('.modal-ov'))));
  const n0 = slides().length, at = e.App.slideIdx;
  const cornerCard = e.$$('.modal-ov .exp-card').find(c => /Угловой/.test(e.text(c)));
  await e.press('Вставить', cornerCard);
  await e.wait(30);
  t.ok('слайд вставлен сразу после текущего', slides().length === n0 + 1 && e.App.slideIdx === at + 1);
  const s = slides()[e.App.slideIdx];
  t.ok('в нём есть схема с игроками обеих команд', !!s.board && s.board.entities.some(x => x.kind === 'ours') && s.board.entities.some(x => x.kind === 'opp'));
  t.ok('нарисованы стрелки и зона', s.board.frames[0].arrows.length >= 2 && s.board.frames[0].zones.length >= 1);
  t.ok('мяч у подающего', !!s.board.frames[0].ball);
  t.ok('схема показывает только атакующую треть', s.board.view.part === 'attack');
  t.ok('поле в редакторе открылось на этом слайде', !!e.svg() && e.$$('#edCanvas [data-eid]').length > 0);
  t.clean(e, 'вставка заготовки без ошибок');

  t.section('заготовка ролей');
  await e.press('Из заготовки…');
  await e.wait(20);
  const rolesCard = e.$$('.modal-ov .exp-card').find(c => /Требования к позициям/.test(e.text(c)));
  await e.press('Вставить', rolesCard);
  await e.wait(30);
  const r = slides()[e.App.slideIdx];
  t.ok('это слайд ролей', r.layout === 'roles' && r.roles.length > 0, r.layout + ', ролей ' + (r.roles || []).length);
  t.ok('у каждой роли свой игрок на схеме', r.roles.every(x => x.ids.length === 1));

  t.section('показ вставленных слайдов');
  await e.press('Показ');
  await e.wait(60);
  t.ok('показ открылся', !!e.$('.ed-preview'));
  for (let i = 0; i < 3; i++) { e.click(e.$('.ed-preview .te-navbtn.te-primary')); await e.wait(20); }
  t.ok('слайды листаются без ошибок', !!e.$('.ed-preview .te-slide.on'));
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(20);
  t.clean(e, 'показ без ошибок');

  t.section('заготовка целой презентации');
  await e.press('К списку презентаций');
  await e.wait(40);
  await e.press('Новая презентация');
  await e.wait(20);
  const fld = e.$$('.modal-ov .fld').find(x => /С чего начать/.test(e.text(x)));
  t.ok('в окне создания есть выбор заготовки', !!fld);
  e.click([...fld.querySelectorAll('button')].find(b => /Заготовка/.test(e.text(b))));
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(60);
  const titles = slides().map(x => x.title);
  t.ok('создано семь слайдов', slides().length === 7, slides().length + ': ' + titles.join(' | ').slice(0, 70));
  t.ok('есть титул, роли, схемы и правила', slides()[0].layout === 'title' && slides().some(x => x.layout === 'roles') && slides().some(x => x.layout === 'duo') && /правила/i.test(titles[titles.length - 1]));
  t.ok('в схеме «Как играем» две доски', !!slides().find(x => x.layout === 'duo').board2);
  t.ok('редактор открылся на новой презентации', e.App.view === 'editor' && !!e.$('.ed'));
  await e.press('Показ');
  await e.wait(60);
  t.ok('заготовка показывается целиком', e.$$('.ed-preview .te-slide').length === 7);
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(20);
  t.clean(e, 'этап 4д без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
