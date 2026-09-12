// Этап 1а: постоянные id у стрелок/зон/реплик и выделение разнотипных объектов.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 1а — смешанное выделение');
  const env = await openApp();
  const TE = env.TE;

  t.section('id у объектов шага');
  const b = TE.normalizeBoard({
    entities: [{ id: 'p1', kind: 'ours' }],
    frames: [{ pos: { p1: [50, 50] }, arrows: [{ kind: 'move', target: 'p1' }, null], zones: [{ type: 'rect', x: 1, y: 1, w: 9, h: 9 }], bubbles: [{ target: 'p1', text: 'Иду' }] }]
  });
  const f0 = b.frames[0];
  t.ok('стрелке выдан id', !!f0.arrows[0].id && f0.arrows.length === 1);
  t.ok('зоне выдан id', !!f0.zones[0].id);
  t.ok('реплике выдан id', !!f0.bubbles[0].id);
  const again = TE.normalizeBoard(JSON.parse(JSON.stringify(b)));
  t.ok('повторная проверка id не меняет', again.frames[0].arrows[0].id === f0.arrows[0].id);
  t.ok('битые записи выброшены', TE.normalizeBoard({ entities: [], frames: [null, { pos: {} }] }).frames.length === 1);

  t.section('наборы выделения');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const ent = e.board().entities.find(x => e.frame().pos[x.id]);
  e.UST.commit(() => {
    e.frame().arrows.push({ id: 'ar1', kind: 'line', from: { p: [20, 20] }, to: { p: [60, 60] }, style: 'solid', color: 'pass', width: 3, head: true, bend: 0 });
  });
  await e.wait(10);
  const parts = { e: [ent.id], a: ['ar1'], z: [], b: [], ball: false };
  const sel = e.UST.selFromParts(parts, e.frame());
  t.ok('игрок + стрелка дают смешанное выделение', sel && sel.t === 'mix' && sel.ids.length === 1 && sel.arrows[0] === 'ar1');
  t.ok('только игроки — обычное выделение', e.UST.selFromParts({ e: [ent.id], a: [], z: [], b: [], ball: false }, e.frame()).t === 'ent');
  t.ok('одна стрелка — выделение стрелки', e.UST.selFromParts({ e: [], a: ['ar1'], z: [], b: [], ball: false }, e.frame()).t === 'arrow');
  t.ok('пусто — ничего не выделено', e.UST.selFromParts({ e: [], a: [], z: [], b: [], ball: false }, e.frame()) === null);
  t.ok('разбор обратно даёт те же id', JSON.stringify(e.UST.selParts(sel, e.frame())) === JSON.stringify(parts));

  t.section('смешанное выделение в редакторе');
  e.App.sel = sel;
  e.UST.refresh(['canvas', 'insp']);
  await e.wait(10);
  t.ok('в свойствах написано «Выбрано: 2»', /Выбрано: 2/.test(e.text(e.$('#edInsp .insp-head'))), e.text(e.$('#edInsp .insp-head')));
  t.ok('перечислено, что именно выбрано', /1 игроков и инвентаря · 1 стрелок/.test(e.text(e.$('#edInsp'))));
  t.ok('на поле подсвечен игрок', e.$$('.te-over circle').length >= 1);
  t.ok('на поле подсвечена стрелка', !!e.$('.te-over path.sel-arrow'));
  await e.press('Только игроки', e.$('#edInsp'));
  t.ok('«Только игроки» оставляет игроков', e.App.sel.t === 'ent' && e.App.sel.ids[0] === ent.id);

  t.section('удаление и восстановление после правок');
  e.App.sel = e.UST.selFromParts(parts, e.frame());
  e.UST.refresh(['canvas', 'insp']);
  await e.wait(10);
  const ents0 = e.board().entities.length;
  await e.press('Удалить выбранное', e.$('#edInsp'));
  t.ok('удалились и игрок, и стрелка', e.board().entities.length === ents0 - 1 && !e.frame().arrows.some(a => a.id === 'ar1'));
  t.ok('после удаления ничего не выделено', !e.App.sel);
  e.key('z', { ctrlKey: true });
  await e.wait(15);
  t.ok('отмена возвращает обоих', e.board().entities.length === ents0 && e.frame().arrows.some(a => a.id === 'ar1'));

  const ent2 = e.board().entities.filter(x => e.frame().pos[x.id])[1];
  e.App.sel = { t: 'mix', ids: [ent.id, ent2.id], arrows: ['ar1'], zones: [], bubbles: [], ball: false };
  e.UST.commit(() => { e.frame().arrows = e.frame().arrows.filter(a => a.id !== 'ar1'); });
  await e.wait(10);
  t.ok('исчезнувшая стрелка выпадает из выделения, игроки остаются', e.App.sel && e.App.sel.t === 'ent' && e.App.sel.ids.length === 2);

  e.App.sel = { t: 'mix', ids: [ent.id], arrows: [], zones: [e.frame().zones.length ? e.frame().zones[0].id : 'нет'], bubbles: [], ball: false };
  e.UST.refresh(['canvas', 'insp']);
  await e.press('Следующий шаг');
  t.ok('при переходе на другой шаг остаются выбранные игроки', e.App.sel && e.App.sel.t === 'ent' && e.App.sel.ids[0] === ent.id);

  e.App.sel = e.UST.selFromParts({ e: [ent.id], a: [], z: [], b: [], ball: false }, e.frame());
  e.UST.refresh(['canvas', 'insp']);
  const n0 = e.board().entities.length;
  e.key('Delete');
  await e.wait(15);
  t.ok('клавиша Delete удаляет выделенное', e.board().entities.length === n0 - 1);
  t.clean(e, 'этап 1а без ошибок');
  e.close();
  env.close();
  process.exit(t.done() ? 1 : 0);
})().catch(e => { console.log('ТЕСТ УПАЛ:', e && e.stack || e); process.exit(2); });
