// Этап 2б: призраки прошлого шага и разметка зон поля.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 2б — призраки и разметка зон');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const ghosts = () => e.$$('.te-ghosts circle').length;
  const ghostLines = () => e.$$('.te-ghosts line').length;
  const grid = () => e.$$('#edCanvas .te-grid line').length;

  t.section('призраки');
  t.ok('на первом шаге призраков нет', ghosts() === 0);
  const ent = e.board().entities.find(x => e.frame().pos[x.id]);
  const p0 = e.frame().pos[ent.id].slice();
  await e.press('Шаг');
  await e.wait(15);
  t.ok('на новом шаге пока никто не двигался — призраков нет', ghosts() === 0);
  await e.drag(`[data-eid="${ent.id}"] circle`, p0, [p0[0] - 20, p0[1] - 20]);
  t.ok('после сдвига появился призрак', ghosts() === 1, ghosts());
  t.ok('и пунктир от прошлого места', ghostLines() === 1);
  t.ok('кнопка «Призраки» включена', /on/.test(e.button('Призраки').className));
  await e.press('Призраки');
  t.ok('выключили — призраки пропали', ghosts() === 0 && !/ on/.test(e.button('Призраки').className));
  await e.press('Призраки');
  t.ok('включили — вернулись', ghosts() === 1);
  await e.press('Предыдущий шаг');
  t.ok('на первом шаге призраков по-прежнему нет', ghosts() === 0);
  t.ok('и кнопки «Призраки» там нет', !e.button('Призраки'));
  await e.press('Следующий шаг');

  t.section('разметка зон');
  t.ok('по умолчанию разметки нет', grid() === 0);
  await e.tap(null, [50, 50]);
  const seg = lbl => e.button(lbl, e.$('#edInsp'));
  e.click(seg('Трети'));
  await e.wait(15);
  t.ok('«Трети» — две линии поперёк', grid() === 2, grid());
  e.click(seg('Коридоры'));
  await e.wait(15);
  t.ok('«Коридоры» — четыре линии вдоль', grid() === 4, grid());
  e.click(seg('Трети и коридоры'));
  await e.wait(15);
  t.ok('вместе — шесть линий', grid() === 6, grid());
  e.click(seg('18 зон'));
  await e.wait(15);
  t.ok('«18 зон» — пять поперёк и две вдоль', grid() === 7, grid());
  t.ok('разметка сохранилась в схеме', e.board().grid === 'zones18');

  t.section('разметка в показе');
  await e.press('Показ');
  await e.wait(30);
  t.ok('по умолчанию в показе разметки нет', e.$$('.ed-preview .te-grid line').length === 0);
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(15);
  await e.tap(null, [50, 50]);
  const tog = e.$$('#edInsp .tog').find(l => /во время показа/.test(e.text(l)));
  t.ok('есть переключатель «показывать и во время показа»', !!tog);
  if (tog) { e.change(tog.querySelector('input'), true); await e.wait(15); }
  t.ok('настройка сохранилась', e.board().gridShow === 'always');
  await e.press('Показ');
  await e.wait(30);
  t.ok('теперь разметка видна и в показе', e.$$('.ed-preview .te-grid line').length === 7, e.$$('.ed-preview .te-grid line').length);
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(15);
  e.click(seg('Нет'));
  await e.wait(15);
  t.ok('«Нет» убирает разметку', grid() === 0);
  t.clean(e, 'этап 2б без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
