// Этап 0: дефекты.
const { openApp, suite } = require('./harness');

const half = bd => { bd.animate = (total, fn) => { fn(total / 2); return Promise.resolve(true); }; return bd; };
const full = bd => { bd.animate = (total, fn) => { fn(total); return Promise.resolve(true); }; return bd; };

async function openExample(opts) {
  const e = await openApp(opts);
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  return e;
}

(async () => {
  const t = suite('Этап 0 — дефекты');
  const env = await openApp();
  const TE = env.TE;
  const host = () => { const d = env.doc.createElement('div'); env.doc.body.appendChild(d); return d; };

  await t.step('0.1', async () => {
    t.section('0.1 Бег по дуге стрелки');
    const P = TE.normalizeProject({ settings: { format: '8x8' }, slides: [] });
    const board = TE.normalizeBoard({
      entities: [{ id: 'a', kind: 'ours', label: 'ЛЗ' }],
      frames: [{ pos: { a: [20, 60] } }, { pos: { a: [80, 60] }, arrows: [{ id: 'm', kind: 'move', target: 'a', style: 'dashed', bend: 80 }] }]
    });
    const bd = half(new TE.Board(host(), board, P, { bare: true }));
    await bd.tweenTo(1);
    const mid = bd.cur.a;
    t.ok('на середине пути игрок сошёл с прямой', Math.abs(mid[1] - 60) > 3, JSON.stringify(mid.map(v => +v.toFixed(2))));
    const g = bd.geo, P0 = g.pt(20, 60), P1 = g.pt(80, 60), C = TE.bendCtrl(P0[0], P0[1], P1[0], P1[1], 80);
    const q = TE.quadAt(P0[0], P0[1], C[0], C[1], P1[0], P1[1], 0.5), exp = g.inv(q[0], q[1]);
    t.ok('точка лежит на кривой стрелки', Math.hypot(mid[0] - exp[0], mid[1] - exp[1]) < 0.01);
    const arrowG = bd.ageo[0], arrowSide = Math.sign(arrowG.cy - (arrowG.sy + arrowG.ey) / 2), runSide = Math.sign(g.pt(mid[0], mid[1])[1] - P0[1]);
    t.ok('изгиб бега в ту же сторону, что и стрелка', arrowSide === runSide && arrowSide !== 0);
    const bdEnd = full(new TE.Board(host(), board, P, { bare: true }));
    await bdEnd.tweenTo(1);
    t.ok('в конце шага игрок точно в цели', Math.abs(bdEnd.cur.a[0] - 80) < 1e-6 && Math.abs(bdEnd.cur.a[1] - 60) < 1e-6);
    const flat = JSON.parse(JSON.stringify(board));
    flat.frames[1].arrows[0].bend = 0;
    const bdFlat = half(new TE.Board(host(), TE.normalizeBoard(flat), P, { bare: true }));
    await bdFlat.tweenTo(1);
    t.ok('без изгиба — по прямой, как раньше', Math.abs(bdFlat.cur.a[1] - 60) < 1e-6);
    P.settings.pitch.orientation = 'horizontal';
    const bdH = half(new TE.Board(host(), board, P, { bare: true }));
    await bdH.tweenTo(1);
    t.ok('на горизонтальном поле тоже по дуге', Math.abs(bdH.cur.a[1] - 60) > 3, JSON.stringify(bdH.cur.a.map(v => +v.toFixed(2))));
    t.clean(env, '0.1 без ошибок');
  });

  await t.step('0.2', async () => {
    t.section('0.2 Мяч по дуге паса');
    const P = TE.normalizeProject({ settings: { format: '8x8' }, slides: [] });
    const mk = bend => TE.normalizeBoard({
      entities: [{ id: 'a', kind: 'ours' }, { id: 'b', kind: 'ours' }],
      frames: [
        { pos: { a: [20, 60], b: [80, 60] }, ball: { owner: 'a' } },
        { pos: { a: [20, 60], b: [80, 60] }, ball: { owner: 'b' }, arrows: [{ id: 'p', kind: 'line', from: { e: 'a' }, to: { e: 'b' }, style: 'solid', color: 'pass', bend }] }
      ]
    });
    const bd = new TE.Board(host(), mk(90), P, { bare: true });
    const start = bd.ballXY.slice();
    half(bd);
    await bd.tweenTo(1);
    const end = bd.ballPt({ owner: 'b' }), straightY = start[1] + (end[1] - start[1]) * 0.5;
    t.ok('мяч на середине паса летит по дуге', Math.abs(bd.ballXY[1] - straightY) > 10, (bd.ballXY[1] - straightY).toFixed(1) + ' px от прямой');
    const G = bd.ageo[0];
    t.ok('дуга мяча в ту же сторону, что и стрелка паса', Math.sign(G.cy - (G.sy + G.ey) / 2) === Math.sign(bd.ballXY[1] - straightY));
    const bdFlat = new TE.Board(host(), mk(0), P, { bare: true });
    const s2 = bdFlat.ballXY.slice();
    half(bdFlat);
    await bdFlat.tweenTo(1);
    const e2 = bdFlat.ballPt({ owner: 'b' });
    t.ok('прямой пас — мяч по прямой', Math.abs(bdFlat.ballXY[1] - (s2[1] + (e2[1] - s2[1]) * 0.5)) < 1e-6);
    t.clean(env, '0.2 без ошибок');
  });
  env.close();

  await t.step('0.3', async () => {
    t.section('0.3 Сохранение при уходе со страницы');
    const e = await openExample();
    const f = e.frame(), ent = e.board().entities.find(x => f.pos[x.id]), p0 = f.pos[ent.id].slice();
    await e.drag(`[data-eid="${ent.id}"] circle`, p0, [p0[0] + 7, p0[1]]);
    t.ok('после правки сохранение отложено', e.App.saving === 'pending', e.App.saving);
    Object.defineProperty(e.doc, 'visibilityState', { value: 'hidden', configurable: true });
    e.doc.dispatchEvent(new e.win.Event('visibilitychange'));
    await e.wait(5);
    const read = () => JSON.parse(e.win.localStorage.getItem('ustanovka-p-' + e.App.project.id)).slides[e.App.slideIdx].board.frames[e.App.frameIdx].pos[ent.id];
    t.ok('при сворачивании правка сразу записана', Math.abs(read()[0] - (p0[0] + 7)) < 0.6, JSON.stringify(read()));
    Object.defineProperty(e.doc, 'visibilityState', { value: 'visible', configurable: true });
    await e.drag(`[data-eid="${ent.id}"] circle`, e.frame().pos[ent.id], [p0[0] + 12, p0[1]]);
    e.win.dispatchEvent(new e.win.Event('pagehide'));
    await e.wait(5);
    t.ok('при закрытии вкладки правка тоже записана', Math.abs(read()[0] - (p0[0] + 12)) < 0.6, JSON.stringify(read()));
    t.clean(e, '0.3 без ошибок');
    e.close();
  });

  await t.step('0.4', async () => {
    t.section('0.4 Две вкладки');
    const e = await openExample();
    const key = 'ustanovka-p-' + e.App.project.id;
    const other = JSON.parse(JSON.stringify(e.App.project));
    other.updated = (e.App.project.updated || 0) + 5000;
    other.title = 'Изменено в другой вкладке';
    e.win.dispatchEvent(new e.win.StorageEvent('storage', { key, newValue: JSON.stringify(other) }));
    await e.wait(10);
    const bar = e.$('.updbar.conflict');
    t.ok('появилась полоса «изменили в другой вкладке»', !!bar);
    await e.press('Загрузить ту версию', bar);
    t.ok('загружена версия из другой вкладки', e.App.project.title === 'Изменено в другой вкладке' && !e.$('.updbar.conflict'));
    const older = JSON.parse(JSON.stringify(e.App.project));
    older.updated = (e.App.project.updated || 0) - 5000;
    older.title = 'Старая версия';
    e.win.localStorage.setItem(key, JSON.stringify(older));
    e.win.dispatchEvent(new e.win.StorageEvent('storage', { key, newValue: JSON.stringify(older) }));
    await e.wait(20);
    t.ok('старая запись из другой вкладки молча заменена нашей', JSON.parse(e.win.localStorage.getItem(key)).title === 'Изменено в другой вкладке' && !e.$('.updbar.conflict'));
    const newer = JSON.parse(JSON.stringify(e.App.project));
    newer.updated = (e.App.project.updated || 0) + 9000;
    e.win.dispatchEvent(new e.win.StorageEvent('storage', { key, newValue: JSON.stringify(newer) }));
    await e.wait(10);
    await e.press('Оставить мою', e.$('.updbar.conflict'));
    await e.wait(5);
    t.ok('«Оставить мою» — наша версия новее той и будет записана', e.App.saving === 'pending' && +e.App.project.updated > +newer.updated, e.App.project.updated + ' > ' + newer.updated);
    await e.wait(1300);
    t.ok('и действительно записана поверх той', +JSON.parse(e.win.localStorage.getItem(key)).updated === +e.App.project.updated);
    t.clean(e, '0.4 без ошибок');
    e.close();
  });

  await t.step('0.5', async () => {
    t.section('0.5 Смена ширины окна');
    const e = await openExample();
    const hasSlidesBtn = () => e.$$('#edTabs button').some(b => /\d+ \/ \d+/.test(e.text(b)));
    t.ok('на ПК кнопки списка слайдов нет', !hasSlidesBtn());
    e.opts.mobile = true;
    const entry = (e.win.__mq || []).find(x => /max-width:\s*899px/.test(x.q) && x.listeners.length);
    t.ok('слушатель смены ширины подключён', !!entry);
    if (entry) entry.listeners.forEach(fn => fn({ matches: true }));
    await e.wait(10);
    t.ok('после перехода на узкий экран кнопка появилась сразу', hasSlidesBtn());
    t.clean(e, '0.5 без ошибок');
    e.close();
  });

  await t.step('0.6-0.7', async () => {
    t.section('0.6 Подписи отражения · 0.7 Кольцо вокруг игрока');
    const e = await openExample();
    const f = e.frame(), ids = e.board().entities.filter(x => f.pos[x.id]).slice(0, 2).map(x => x.id);
    await e.tap(`[data-eid="${ids[0]}"] circle`, f.pos[ids[0]]);
    const z0 = e.frame().zones.length;
    await e.press('Кольцо вокруг', e.$('#edInsp'));
    const ring = e.frame().zones[z0];
    t.ok('кольцо вокруг игрока создано', e.frame().zones.length === z0 + 1 && ring.type === 'ring' && ring.target === ids[0]);
    t.ok('кольцо выделено для настройки', e.App.sel && e.App.sel.t === 'zone');
    const selectTwo = async () => {
      await e.tap(`[data-eid="${ids[0]}"] circle`, e.frame().pos[ids[0]]);
      await e.tap(`[data-eid="${ids[1]}"] circle`, e.frame().pos[ids[1]], { shiftKey: true });
    };
    await selectTwo();
    t.ok('выделены двое', e.App.sel && e.App.sel.t === 'ent' && e.App.sel.ids.length === 2);
    t.ok('вертикальное поле: «Отразить слева направо»', !!e.button('Отразить слева направо', e.$('#edInsp')));
    await e.press('Кольца', e.$('#edInsp'));
    t.ok('кольца вокруг обоих', e.frame().zones.filter(z => z.type === 'ring').length === 3);
    e.UST.commit(p => { p.settings.pitch.orientation = 'horizontal'; });
    await e.wait(10);
    await selectTwo();
    t.ok('горизонтальное поле: «Отразить сверху вниз»', !!e.button('Отразить сверху вниз', e.$('#edInsp')));
    t.clean(e, '0.6–0.7 без ошибок');
    e.close();
  });

  await t.step('0.8', async () => {
    t.section('0.8 Пустые шаги отмены');
    const e = await openExample();
    t.ok('в начале отменять нечего', e.$('#btnUndo').disabled);
    e.UST.commit(null, { before: JSON.stringify(e.App.project), parts: ['canvas'] });
    e.UST.commit(() => {}, { parts: ['canvas'] });
    await e.wait(5);
    t.ok('правка без изменений не попадает в «Отменить»', e.$('#btnUndo').disabled);
    t.ok('и не помечает проект изменённым', e.App.saving !== 'pending', e.App.saving);
    const hullIds = e.board().entities.filter(x => e.frame().pos[x.id]).slice(0, 3).map(x => x.id);
    e.UST.commit(p => { e.frame().zones.push({ id: 'hz', type: 'hull', ids: hullIds, color: '#ffffff', label: '' }); });
    await e.wait(10);
    const undoDepth = () => e.$('#btnUndo').disabled ? 0 : 1;
    e.key('z', { ctrlKey: true });
    await e.wait(10);
    e.key('z', { ctrlKey: true, shiftKey: true });
    await e.wait(10);
    const hi = e.frame().zones.findIndex(z => z.id === 'hz');
    const zoneEl = e.svg().querySelector(`[data-zidx="${hi}"] rect`);
    t.ok('рамка вокруг игроков нарисована на поле', hi >= 0 && !!zoneEl);
    const before = JSON.stringify(e.App.project);
    if (zoneEl) await e.drag(zoneEl, [50, 50], [60, 55]);
    t.ok('перетаскивание рамки вокруг игроков ничего не меняет', JSON.stringify(e.App.project) === before);
    e.key('z', { ctrlKey: true });
    await e.wait(10);
    t.ok('и первая же отмена убирает саму рамку, а не пустой шаг', !e.frame().zones.some(z => z.id === 'hz') && undoDepth() === 0);
    t.clean(e, '0.8 без ошибок');
    e.close();
  });

  process.exit(t.done() ? 1 : 0);
})().catch(e => { console.log('ТЕСТ УПАЛ:', e && e.stack || e); process.exit(2); });
