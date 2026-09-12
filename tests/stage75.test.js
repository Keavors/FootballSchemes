// Этап 7.5: хранилище IndexedDB, перенос старых презентаций, аварийная копия, индикатор места.
const { openApp, suite } = require('./harness');

const withEstimate = win => {
  Object.defineProperty(win.navigator, 'storage', {
    configurable: true,
    value: { estimate: async () => ({ usage: 3 * 1048576, quota: 500 * 1048576 }) }
  });
};

(async () => {
  const t = suite('Этап 7.5 — хранилище');

  t.section('режим хранилища');
  const plain = await openApp();
  t.ok('без IndexedDB работаем как раньше, через localStorage', plain.UST.Store.mode === 'local', plain.UST.Store.mode);
  plain.close();

  const e = await openApp({ idb: true, beforeParse: withEstimate });
  t.ok('с IndexedDB включается он', e.UST.Store.mode === 'idb', e.UST.Store.mode);
  await e.wait(60);
  t.ok('на главном экране виден расход места', /занимают 3,0 МБ из 500 МБ/.test(e.text(e.$('.home'))), e.text(e.$('#storageNote')));

  t.section('сохранение и чтение');
  await e.press('Открыть пример «Маятник»');
  await e.wait(60);
  await e.gotoBoardSlide(0);
  const id = e.App.project.id;
  const ent = e.board().entities.find(x => e.frame().pos[x.id]);
  const p0 = e.frame().pos[ent.id].slice();
  await e.drag(`[data-eid="${ent.id}"] circle`, p0, [p0[0] + 9, p0[1]], { altKey: true });
  await e.wait(1400);
  t.ok('после правки записалось', e.App.saving === 'saved', e.App.saving);
  const raw = await e.UST.Store.get('ustanovka-p-' + id);
  const saved = JSON.parse(raw);
  t.ok('в хранилище лежит свежая расстановка', Math.abs(saved.slides[e.App.slideIdx].board.frames[0].pos[ent.id][0] - (p0[0] + 9)) < 0.6);
  t.ok('в localStorage презентации больше не лежат', !e.win.localStorage.getItem('ustanovka-p-' + id));
  const list = JSON.parse(await e.UST.Store.get('ustanovka-index'));
  t.ok('список презентаций тоже в IndexedDB', Array.isArray(list) && list.some(x => x.id === id));
  e.close();

  t.section('перенос старых презентаций');
  const oldProj = {
    id: 'old1', title: 'Старая презентация', updated: 1000,
    settings: { format: '8x8' },
    slides: [{ id: 's1', layout: 'text', title: 'Старая презентация', body: 'текст' }]
  };
  const e2 = await openApp({
    idb: true,
    localStorage: {
      'ustanovka-index': JSON.stringify([{ id: 'old1', title: 'Старая презентация', slides: 1, format: '8x8', updated: 1000 }]),
      'ustanovka-p-old1': JSON.stringify(oldProj)
    }
  });
  await e2.wait(120);
  t.ok('старая презентация видна в списке', /Старая презентация/.test(e2.text(e2.$('.home'))));
  e2.win.localStorage.removeItem('ustanovka-p-old1');
  const moved = await e2.UST.Store.get('ustanovka-p-old1');
  t.ok('и уже перенесена в IndexedDB', !!moved && /Старая презентация/.test(moved));
  await e2.press('Открыть', e2.$('.proj'));
  await e2.wait(60);
  t.ok('она открывается', e2.App.view === 'editor' && e2.App.project.title === 'Старая презентация');
  e2.close();

  t.section('аварийная копия при закрытии вкладки');
  const e3 = await openApp({ idb: true });
  await e3.press('Открыть пример «Маятник»');
  await e3.wait(60);
  await e3.gotoBoardSlide(0);
  const id3 = e3.App.project.id;
  const ent3 = e3.board().entities.find(x => e3.frame().pos[x.id]);
  const q0 = e3.frame().pos[ent3.id].slice();
  await e3.drag(`[data-eid="${ent3.id}"] circle`, q0, [q0[0] + 12, q0[1]]);
  t.ok('правка ещё не записана', e3.App.saving === 'pending');
  /* делаем вид, что вкладку убили до того, как хранилище успело записать */
  const realSet = e3.UST.Store.set.bind(e3.UST.Store);
  e3.UST.Store.set = () => new Promise(() => {});
  e3.win.dispatchEvent(new e3.win.Event('pagehide'));
  await e3.wait(20);
  const em = e3.win.localStorage.getItem('ustanovka-emergency');
  t.ok('аварийная копия легла в localStorage', !!em && JSON.parse(em).id === id3);
  e3.UST.Store.set = realSet;
  /* в основном хранилище осталась версия постарше */
  const stale = JSON.parse(JSON.stringify(e3.App.project));
  stale.updated = 1;
  stale.slides[e3.App.slideIdx].board.frames[0].pos[ent3.id] = q0.slice();
  await e3.UST.Store.set('ustanovka-p-' + id3, JSON.stringify(stale));
  const back = await e3.UST.loadProject(id3);
  t.ok('при открытии поднялась более свежая аварийная копия', Math.abs(back.slides[e3.App.slideIdx].board.frames[0].pos[ent3.id][0] - (q0[0] + 12)) < 0.6, JSON.stringify(back.slides[e3.App.slideIdx].board.frames[0].pos[ent3.id]));
  await e3.drag(`[data-eid="${ent3.id}"] circle`, e3.frame().pos[ent3.id], [q0[0] + 14, q0[1]]);
  await e3.wait(1500);
  t.ok('после обычного сохранения аварийная копия убирается', e3.App.saving === 'saved' && !e3.win.localStorage.getItem('ustanovka-emergency'), e3.App.saving);
  t.clean(e3, 'этап 7.5 без ошибок');
  e3.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
