// Этап 1б: рамка выделения, быстрый выбор, Shift, перетаскивание группы.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 1б — рамка выделения и быстрый выбор');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  /* слайд, где есть и наши, и соперник */
  const idx = e.App.project.slides.findIndex(s => s.board && s.layout !== 'text' && s.board.entities.some(x => x.kind === 'opp'));
  e.click(e.$$('.sl-list .sl-main')[idx]);
  await e.wait(20);
  const ours = () => e.board().entities.filter(x => x.kind === 'ours' && e.frame().pos[x.id]);
  const opps = () => e.board().entities.filter(x => x.kind === 'opp' && e.frame().pos[x.id]);
  t.ok('на слайде есть обе команды', ours().length > 0 && opps().length > 0, ours().length + ' наших, ' + opps().length + ' соперников');

  t.section('рамка выделения');
  await e.drag(null, [2, 2], [98, 98]);
  const all = e.UST.selParts(e.App.sel, e.frame());
  t.ok('рамка по всему полю выделила всех игроков', all.e.length === ours().length + opps().length, all.e.length);
  await e.tap(null, [50, 50]);
  t.ok('касание пустого места снимает выделение', !e.App.sel);

  const top = e.board().entities.filter(x => e.frame().pos[x.id] && e.frame().pos[x.id][1] < 50).map(x => x.id);
  await e.drag(null, [0, 0], [100, 49.5]);
  const half = e.UST.selParts(e.App.sel, e.frame());
  t.ok('рамка на половину поля берёт только тех, кто внутри', half.e.length === top.length && top.every(id => half.e.indexOf(id) >= 0), half.e.length + ' из ' + top.length);

  const first = ours()[0];
  await e.tap(`[data-eid="${first.id}"] circle`, e.frame().pos[first.id]);
  t.ok('обычное касание выделяет одного', e.App.sel.t === 'ent' && e.App.sel.ids.length === 1);
  await e.drag(null, [0, 0], [100, 49.5], { shiftKey: true });
  t.ok('Shift + рамка добавляет к выделению', e.UST.selParts(e.App.sel, e.frame()).e.length === (top.indexOf(first.id) >= 0 ? top.length : top.length + 1));

  t.section('стрелки и зоны в рамке');
  e.UST.commit(() => {
    e.frame().arrows.push({ id: 'arX', kind: 'line', from: { p: [10, 60] }, to: { p: [30, 70] }, style: 'solid', color: 'pass', width: 3, head: true, bend: 0 });
    e.frame().zones.push({ id: 'zX', type: 'rect', x: 60, y: 60, w: 20, h: 20, color: '#ffffff', label: '', lpos: 'top', stroke: 'dashed' });
  });
  await e.wait(15);
  await e.drag(null, [5, 55], [95, 95]);
  const low = e.UST.selParts(e.App.sel, e.frame());
  t.ok('в рамку попали и стрелка, и зона', low.a.indexOf('arX') >= 0 && low.z.indexOf('zX') >= 0);
  t.ok('получилось смешанное выделение', e.App.sel.t === 'mix');

  t.section('Shift по объектам');
  await e.tap(`[data-eid="${first.id}"] circle`, e.frame().pos[first.id]);
  const zoneEl = e.svg().querySelector(`[data-zidx="${e.frame().zones.findIndex(z => z.id === 'zX')}"] rect`);
  e.ptr(zoneEl, 'pointerdown', ...e.pt([70, 70]), { shiftKey: true });
  e.ptr(e.svg(), 'pointerup', ...e.pt([70, 70]), { shiftKey: true });
  await e.wait(15);
  t.ok('Shift по зоне добавил её к игроку', e.App.sel.t === 'mix' && e.UST.selParts(e.App.sel, e.frame()).z.indexOf('zX') >= 0);

  t.section('перетаскивание группы');
  const p0 = e.frame().pos[first.id].slice(), z0 = e.frame().zones.find(z => z.id === 'zX').x;
  await e.drag(`[data-eid="${first.id}"] circle`, p0, [p0[0] + 8, p0[1]]);
  const z1 = e.frame().zones.find(z => z.id === 'zX').x;
  t.ok('вместе с игроком уехала и выбранная зона', Math.abs(z1 - (z0 + 8)) < 0.6, z0 + ' → ' + z1);

  t.section('быстрый выбор');
  await e.tap(null, [50, 50]);
  await e.press('Наших', e.$('#edInsp'));
  t.ok('«Наших» выделяет всю нашу команду', e.App.sel.t === 'ent' && e.App.sel.ids.length === ours().length, e.App.sel.ids.length);
  await e.press('Инвертировать', e.$('#edInsp'));
  t.ok('«Инвертировать» переключает на остальных', e.App.sel.t === 'ent' && e.App.sel.ids.length === opps().length, e.App.sel.ids.length);
  await e.press('Снять выделение', e.$('#edInsp'));
  t.ok('«Снять выделение» очищает', !e.App.sel);
  await e.press('Соперников', e.$('#edInsp'));
  t.ok('«Соперников» выделяет соперников', e.App.sel.ids.length === opps().length);
  await e.tap(null, [50, 50]);
  await e.press('Всё на шаге', e.$('#edInsp'));
  const every = e.UST.selParts(e.App.sel, e.frame());
  t.ok('«Всё на шаге» берёт игроков, стрелки и зоны', every.e.length === ours().length + opps().length && every.a.length === e.frame().arrows.length && every.z.length === e.frame().zones.length);
  await e.tap(null, [50, 50]);
  e.key('a', { ctrlKey: true, code: 'KeyA' });
  await e.wait(15);
  t.ok('Ctrl+A делает то же самое', !!e.App.sel && e.UST.selParts(e.App.sel, e.frame()).e.length === ours().length + opps().length);
  t.clean(e, 'этап 1б без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
