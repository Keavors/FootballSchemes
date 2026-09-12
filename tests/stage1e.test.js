// Этап 1д: формат по образцу.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 1д — формат по образцу');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const f = () => e.frame(), insp = () => e.$('#edInsp');
  const selArrow = async i => { e.App.sel = { t: 'arrow', i }; e.UST.refresh(['canvas', 'insp']); await e.wait(10); };
  const selZone = async i => { e.App.sel = { t: 'zone', i }; e.UST.refresh(['canvas', 'insp']); await e.wait(10); };

  t.section('стрелки');
  e.UST.commit(() => {
    f().arrows.push({ id: 'a1', kind: 'line', from: { p: [20, 20] }, to: { p: [40, 40] }, style: 'wavy', color: '#ff5a4e', width: 6, head: false, opacity: 0.6, bend: 30 });
    f().arrows.push({ id: 'a2', kind: 'line', from: { p: [60, 20] }, to: { p: [80, 40] }, style: 'solid', color: 'pass', width: 3, head: true, opacity: 1, bend: 0 });
  });
  await e.wait(10);
  const i1 = () => f().arrows.findIndex(a => a.id === 'a1'), i2 = () => f().arrows.findIndex(a => a.id === 'a2');
  await selArrow(i1());
  t.ok('пока нечего применять — кнопки «Применить оформление» нет', !e.button('Применить оформление', insp()));
  await e.press('Копировать оформление', insp());
  await e.wait(10);
  await selArrow(i2());
  t.ok('после копирования появилась кнопка «Применить оформление»', !!e.button('Применить оформление', insp()));
  await e.press('Применить оформление', insp());
  await e.wait(15);
  const a1 = f().arrows[i1()], a2 = f().arrows[i2()];
  t.ok('вид стрелки перенесён', a2.style === 'wavy' && a2.color === '#ff5a4e' && a2.width === 6 && a2.head === false && a2.opacity === 0.6);
  t.ok('а концы и изгиб остались свои', a2.from.p[0] === 60 && a2.to.p[0] === 80 && a2.bend === 0);
  t.ok('образец не изменился', a1.style === 'wavy' && a1.bend === 30);
  e.key('z', { ctrlKey: true });
  await e.wait(15);
  t.ok('отмена возвращает прежний вид', f().arrows[i2()].style === 'solid');

  t.section('зоны разного вида');
  e.UST.commit(() => {
    f().zones.push({ id: 'z1', type: 'rect', x: 10, y: 60, w: 20, h: 15, color: '#ff5a4e', fill: 0.5, stroke: 'solid', size: 30, lpos: 'bottom', label: 'Зона' });
    f().zones.push({ id: 'z2', type: 'text', x: 70, y: 70, text: 'Надпись', color: '#ffffff', size: 22, font: 'hand', outline: true });
  });
  await e.wait(10);
  const zi = id => f().zones.findIndex(z => z.id === id);
  await selZone(zi('z1'));
  await e.press('Копировать оформление', insp());
  await e.wait(10);
  await selZone(zi('z2'));
  await e.press('Применить оформление', insp());
  await e.wait(15);
  const z2 = f().zones[zi('z2')];
  t.ok('надпись взяла цвет и размер', z2.color === '#ff5a4e' && z2.size === 30);
  t.ok('лишние свойства прямоугольника не налипли', z2.fill === undefined && z2.stroke === undefined && z2.lpos === undefined);
  t.ok('свои свойства надписи целы', z2.text === 'Надпись' && z2.font === 'hand');

  t.section('игроки');
  const vis = e.board().entities.filter(x => f().pos[x.id] && e.TE.isPlayer(x));
  const src = vis[0], targets = vis.slice(1, 3).map(x => x.id);
  e.UST.commit(() => { const o = e.UST.App.project.slides[e.App.slideIdx].board.entities.find(x => x.id === src.id); o.color = '#2fb67c'; o.shape = 'square'; o.size = 1.4; });
  await e.wait(10);
  e.App.sel = { t: 'ent', ids: [src.id] };
  e.UST.refresh(['canvas', 'insp']);
  await e.wait(10);
  await e.press('Копировать оформление', insp());
  await e.wait(10);
  e.App.sel = { t: 'ent', ids: targets };
  e.UST.refresh(['canvas', 'insp']);
  await e.wait(10);
  await e.press('Применить оформление', insp());
  await e.wait(15);
  const got = targets.map(id => e.board().entities.find(x => x.id === id));
  t.ok('оформление разошлось по всем выбранным', got.every(x => x.color === '#2fb67c' && x.shape === 'square' && x.size === 1.4));
  t.ok('подписи игроков не тронуты', got.every((x, k) => x.label === vis[k + 1].label));

  t.section('смешанное выделение');
  e.App.sel = { t: 'mix', ids: [vis[3].id], arrows: ['a1'], zones: [], bubbles: [], ball: false };
  e.UST.refresh(['canvas', 'insp']);
  await e.wait(10);
  await e.press('Применить оформление', insp());
  await e.wait(15);
  t.ok('в смешанном выделении оформление ушло только игроку', e.board().entities.find(x => x.id === vis[3].id).shape === 'square' && f().arrows[i1()].style === 'wavy');
  t.clean(e, 'этап 1д без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
