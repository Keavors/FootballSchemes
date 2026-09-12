// Этап 4в: макет «Роли» — требования по позициям.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 4в — роли и требования');
  const env = await openApp();
  const TE = env.TE;
  const host = () => { const d = env.doc.createElement('div'); env.doc.body.appendChild(d); return d; };

  t.section('показ ролей');
  const P = TE.normalizeProject({
    settings: { format: '8x8' },
    slides: [{
      id: 's1', layout: 'roles', title: 'Кто что делает',
      board: { entities: [{ id: 'lz', kind: 'ours', label: 'ЛЗ' }, { id: 'pz', kind: 'ours', label: 'ПЗ' }], frames: [{ pos: { lz: [20, 80], pz: [80, 80] } }] },
      roles: [
        { id: 'r1', title: 'Левый защитник', body: '- Держит ширину', ids: ['lz'] },
        { id: 'r2', title: 'Правый защитник', body: '- Страхует центр', ids: ['pz'] }
      ]
    }]
  });
  const root = host();
  const show = TE.mountPresentation(root, P, {});
  t.ok('слайд ролей собран', !!root.querySelector('.te-roles'));
  const chips = root.querySelectorAll('.te-roles-card .te-chapter');
  t.ok('две кнопки ролей', chips.length === 2, chips.length);
  t.ok('первая роль открыта сразу', /Левый защитник/.test(root.querySelector('.te-role-title').textContent));
  t.ok('и её требования видны', /Держит ширину/.test(root.querySelector('.te-role-body').textContent));
  const tok = id => root.querySelector(`[data-eid="${id}"]`);
  t.ok('на схеме подсвечен нужный игрок', tok('lz').classList.contains('hl') && !tok('pz').classList.contains('hl'));
  chips[1].dispatchEvent(new env.win.MouseEvent('click', { bubbles: true }));
  await env.wait(15);
  t.ok('переключение роли меняет текст', /Правый защитник/.test(root.querySelector('.te-role-title').textContent) && /Страхует центр/.test(root.querySelector('.te-role-body').textContent));
  t.ok('и подсветку на схеме', tok('pz').classList.contains('hl') && !tok('lz').classList.contains('hl'));
  show.destroy();
  t.ok('слайд ролей без схемы превращается в текстовый', TE.normalizeProject({ slides: [{ id: 'x', layout: 'roles' }] }).slides[0].layout === 'text');
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
  const card = e.$$('.layout-cards .lay').find(x => /Роли/.test(e.text(x)));
  t.ok('в макетах есть «Роли»', !!card);
  e.click(card);
  await e.wait(30);
  const ourCount = e.slide().board.entities.filter(x => x.kind === 'ours' && e.slide().board.frames[0].pos[x.id]).length;
  t.ok('роли созданы по нашим игрокам', e.slide().roles.length === ourCount, e.slide().roles.length + ' при ' + ourCount);
  t.ok('у каждой роли свой игрок', e.slide().roles.every(r => r.ids.length === 1));

  await e.press('Текст');
  await e.wait(20);
  t.ok('в тексте появился редактор ролей', /Роли и требования/.test(e.text(e.$('.ed-pane'))));
  const cards = () => e.$$('.ed-pane .exp-card');
  t.ok('карточек ролей столько же', cards().length === ourCount, cards().length);
  const titleInp = cards()[0].querySelector('input.inp');
  e.input(titleInp, 'Левый латераль');
  await e.wait(20);
  t.ok('название роли сохраняется', e.slide().roles[0].title === 'Левый латераль');
  const bodyInp = cards()[0].querySelector('textarea.inp');
  e.input(bodyInp, '- Без мяча: держит ширину\n- С мячом: подключается');
  await e.wait(20);
  t.ok('требования сохраняются', /держит ширину/.test(e.slide().roles[0].body));
  const chip2 = cards()[0].querySelectorAll('.ent-chip')[1];
  e.click(chip2);
  await e.wait(25);
  t.ok('к роли можно добавить второго игрока', e.slide().roles[0].ids.length === 2);
  await e.press('Добавить роль');
  await e.wait(25);
  t.ok('роль добавляется', e.slide().roles.length === ourCount + 1);
  await e.press('Удалить роль', cards()[cards().length - 1]);
  await e.wait(25);
  t.ok('и удаляется', e.slide().roles.length === ourCount);
  await e.press('Ниже', cards()[0]);
  await e.wait(25);
  t.ok('порядок ролей меняется', e.slide().roles[1].title === 'Левый латераль', e.slide().roles.map(r => r.title).join(' | '));

  await e.press('Показ');
  await e.wait(40);
  t.ok('в показе роли видны кнопками', e.$$('.ed-preview .te-roles-card .te-chapter').length === ourCount);
  t.ok('и первая роль раскрыта', !!e.$('.ed-preview .te-role-title') && e.text(e.$('.ed-preview .te-role-title')).length > 0);
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(15);
  t.clean(e, 'этап 4в без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
