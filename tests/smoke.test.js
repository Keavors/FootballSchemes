// Сквозной сценарий редактора в безоконном браузере: всё основное, что умеет приложение.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Сценарии редактора (ПК)');
  const env = await openApp();
  const { App } = { get App() { return env.App; } };

  await t.step('главный экран', async () => {
    t.ok('главный экран нарисован', !!env.$('.home') && /Мои презентации/.test(env.text(env.$('.home'))));
    t.clean(env, 'главный экран без ошибок');
  });

  await t.step('открыть пример', async () => {
    await env.press('Открыть пример «Маятник»');
    await env.wait(40);
    t.ok('открылся редактор', !!env.$('.ed') && env.App.view === 'editor');
    t.ok('в списке 18 слайдов', env.$$('.sl-list .sl-main').length === 18, env.$$('.sl-list .sl-main').length);
    t.clean(env, 'открытие примера без ошибок');
  });

  await t.step('вкладки', async () => {
    await env.press('Текст');
    t.ok('вкладка «Текст»', !!env.$('.md-prev'));
    await env.press('Макет');
    t.ok('вкладка «Макет»', !!env.$('.layout-cards'));
    await env.press('Схема');
    t.clean(env, 'переключение вкладок без ошибок');
  });

  let si;
  await t.step('слайд со схемой', async () => {
    si = await env.gotoBoardSlide(0);
    t.ok('на поле есть svg', !!env.svg());
    t.ok('на поле есть фишки', env.$$('#edCanvas [data-eid]').length > 0, env.$$('#edCanvas [data-eid]').length);
    t.clean(env, 'переход на слайд со схемой без ошибок');
  });

  await t.step('перетаскивание и отмена', async () => {
    const b = env.board(), f = env.frame();
    const e = b.entities.find(x => f.pos[x.id]);
    const p0 = f.pos[e.id].slice();
    await env.drag(`[data-eid="${e.id}"] circle`, p0, [p0[0] + 6, p0[1] + 4]);
    const p1 = env.frame().pos[e.id];
    t.ok('игрок сдвинулся', Math.abs(p1[0] - (p0[0] + 6)) < 0.6 && Math.abs(p1[1] - (p0[1] + 4)) < 0.6, JSON.stringify(p0) + ' → ' + JSON.stringify(p1));
    t.ok('кнопка «Отменить» активна', !env.$('#btnUndo').disabled);
    env.key('z', { ctrlKey: true });
    await env.wait(15);
    t.ok('Ctrl+Z вернул позицию', JSON.stringify(env.frame().pos[e.id]) === JSON.stringify(p0));
    env.key('z', { ctrlKey: true, shiftKey: true });
    await env.wait(15);
    t.ok('Ctrl+Shift+Z повторил', JSON.stringify(env.frame().pos[e.id]) === JSON.stringify(p1));
    t.clean(env, 'перетаскивание без ошибок');
  });

  await t.step('выбор и клавиши', async () => {
    const f = env.frame(), e = env.board().entities.find(x => f.pos[x.id]);
    await env.tap(`[data-eid="${e.id}"] circle`, f.pos[e.id]);
    t.ok('касание выделяет игрока', env.App.sel && env.App.sel.t === 'ent' && env.App.sel.ids[0] === e.id);
    const before = env.frame().pos[e.id].slice();
    env.key('ArrowRight');
    await env.wait(15);
    t.ok('стрелка вправо двигает игрока', env.frame().pos[e.id][0] > before[0]);
    env.key('Escape');
    await env.wait(10);
    t.ok('Esc снимает выделение', !env.App.sel);
    t.clean(env, 'клавиши без ошибок');
  });

  await t.step('инструменты', async () => {
    const f = env.frame(), e = env.board().entities.find(x => f.pos[x.id]);
    const arrows0 = env.frame().arrows.length;
    await env.press('Стрелка');
    await env.tap(`[data-eid="${e.id}"] circle`, env.frame().pos[e.id]);
    await env.tap(null, [50, 30]);
    t.ok('инструмент «Стрелка» рисует стрелку', env.frame().arrows.length === arrows0 + 1, arrows0 + ' → ' + env.frame().arrows.length);
    await env.press('Выбор');
    const zones0 = env.frame().zones.length;
    await env.press('Зона');
    await env.drag(null, [10, 10], [30, 22]);
    t.ok('инструмент «Зона» рисует зону', env.frame().zones.length === zones0 + 1);
    await env.press('Надпись');
    await env.tap(null, [60, 60]);
    t.ok('инструмент «Надпись» ставит надпись', env.frame().zones.length === zones0 + 2 && env.frame().zones[zones0 + 1].type === 'text');
    t.clean(env, 'инструменты без ошибок');
  });

  await t.step('добавить и расстановка', async () => {
    const n0 = env.board().entities.length;
    await env.press('Добавить');
    await env.press('Наш игрок', env.$('.modal-ov'));
    await env.tap(null, [45, 45]);
    t.ok('игрок ставится касанием поля', env.board().entities.length === n0 + 1);
    await env.press('Готово');
    await env.press('Расстановка');
    await env.press('Расставить', env.$('.modal-ov'));
    t.ok('расстановка применена', !env.$('.modal-ov'));
    t.clean(env, 'добавление и расстановка без ошибок');
  });

  await t.step('шаги', async () => {
    const n0 = env.board().frames.length;
    await env.press('Шаг');
    t.ok('добавлен шаг', env.board().frames.length === n0 + 1 && env.App.frameIdx === 1);
    await env.press('Дублировать шаг целиком');
    t.ok('шаг продублирован', env.board().frames.length === n0 + 2);
    await env.press('Предыдущий шаг');
    t.ok('переход на шаг назад', env.App.frameIdx === 1);
    await env.press('Удалить шаг');
    t.ok('шаг удалён', env.board().frames.length === n0 + 1);
    await env.press('Проиграть');
    await env.wait(50);
    t.clean(env, 'шаги без ошибок');
    if (env.App.playing) await env.press('Стоп');
  });

  await t.step('настройки', async () => {
    await env.press('Настройки');
    for (const tab of ['Поле', 'Команды', 'Стрелки', 'Оформление', 'Легенда']) await env.press(tab, env.$('.modal-ov'));
    await env.press('Закрыть', env.$('.modal-ov'));
    t.ok('настройки закрыты', !env.$('.modal-ov'));
    t.clean(env, 'настройки без ошибок');
  });

  await t.step('экспорт и ссылка', async () => {
    await env.press('Экспорт');
    await env.press('Создать ссылку', env.$('.modal-ov'));
    await env.wait(80);
    const ta = env.$('.share-out textarea');
    t.ok('ссылка создана', !!ta && ta.value.indexOf('#show=z') > 0, ta && ta.value.length);
    await env.press('Закрыть', env.$('.modal-ov'));
    t.clean(env, 'экспорт без ошибок');
  });

  await t.step('показ', async () => {
    await env.press('Показ');
    t.ok('показ открыт', !!env.$('.ed-preview'));
    for (let i = 0; i < 4; i++) { env.click(env.$('.ed-preview .te-navbtn.te-primary')); await env.wait(10); }
    await env.press('Закрыть', env.$('.ed-preview .te-top'));
    t.ok('показ закрыт', !env.$('.ed-preview'));
    t.clean(env, 'показ без ошибок');
  });

  await t.step('слайды', async () => {
    const n0 = env.App.project.slides.length;
    await env.press('Только текст');
    t.ok('добавлен текстовый слайд', env.App.project.slides.length === n0 + 1);
    await env.press('Дублировать слайд');
    t.ok('слайд продублирован', env.App.project.slides.length === n0 + 2);
    await env.press('Переместить выше');
    await env.press('Удалить слайд');
    await env.press('Удалить', env.$('.modal-ov'));
    t.ok('слайд удалён', env.App.project.slides.length === n0 + 1);
    t.clean(env, 'слайды без ошибок');
  });

  await t.step('назад к списку', async () => {
    await env.press('К списку презентаций');
    await env.wait(40);
    t.ok('вернулись на главный экран, проект в списке', !!env.$('.proj') && env.App.view === 'home');
    await env.press('Открыть', env.$('.proj'));
    await env.wait(40);
    t.ok('проект снова открылся', env.App.view === 'editor');
    t.clean(env, 'возврат и открытие без ошибок');
  });
  env.close();

  const m = suite('Сценарии редактора (телефон)');
  const ph = await openApp({ mobile: true, width: 390 });
  await m.step('телефон', async () => {
    await ph.press('Открыть пример «Маятник»');
    await ph.wait(40);
    const slidesBtn = ph.$$('#edTabs button').find(b => /\d+ \/ \d+/.test(ph.text(b)));
    m.ok('есть кнопка списка слайдов', !!slidesBtn);
    if (slidesBtn) ph.click(slidesBtn);
    await ph.wait(10);
    m.ok('список слайдов открывается', ph.$('#edSlides').classList.contains('open'));
    await ph.gotoBoardSlide(0);
    m.ok('после выбора список закрыт', !ph.$('#edSlides').classList.contains('open'));
    const head = ph.$('#edInsp .insp-head');
    ph.click(head);
    await ph.wait(10);
    m.ok('шторка свойств открывается', ph.$('#edInsp').classList.contains('open'));
    m.clean(ph, 'телефонные сценарии без ошибок');
  });
  ph.close();

  const failed = t.failed + m.failed;
  t.done(); m.done();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('ТЕСТ УПАЛ:', e && e.stack || e); process.exit(2); });
