// Этап 1в: копировать, вырезать, вставить, дублировать, вставить позиции.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 1в — буфер обмена');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const b = () => e.board(), f = () => e.frame();
  const vis = () => b().entities.filter(x => f().pos[x.id]);

  t.section('копирование игроков со связями');
  const two = vis().slice(0, 2).map(x => x.id);
  e.UST.commit(() => {
    f().arrows.push({ id: 'pass1', kind: 'line', from: { e: two[0] }, to: { e: two[1] }, style: 'solid', color: 'pass', width: 3, head: true, bend: 0 });
    f().bubbles.push({ id: 'bub1', target: two[0], text: 'Иду', color: '#ff8a1a' });
    f().hl.push(two[1]);
    f().ball = { owner: two[0] };
  });
  await e.wait(10);
  e.App.sel = { t: 'ent', ids: two };
  e.UST.refresh(['canvas', 'insp']);
  const ents0 = b().entities.length, arrows0 = f().arrows.length;
  e.key('c', { ctrlKey: true, code: 'KeyC' });
  await e.wait(10);
  const clip = e.UST.getClip();
  t.ok('в буфере два игрока', clip && clip.kind === 'objects' && clip.entities.length === 2);
  t.ok('вместе с ними скопированы пас, реплика и мяч', clip.arrows.length === 1 && clip.bubbles.length === 1 && !!clip.ball && clip.hl.length === 1);

  t.section('вставка копий');
  const p0 = f().pos[two[0]].slice();
  e.key('v', { ctrlKey: true, code: 'KeyV' });
  await e.wait(15);
  t.ok('добавились два новых игрока', b().entities.length === ents0 + 2, b().entities.length);
  t.ok('и копия паса', f().arrows.length === arrows0 + 1);
  const newIds = e.UST.selParts(e.App.sel, f()).e;
  t.ok('вставленное сразу выделено', newIds.length === 2 && newIds.every(id => two.indexOf(id) < 0));
  const np = f().pos[newIds[0]];
  t.ok('копия легла со смещением, а не поверх', Math.abs(np[0] - (p0[0] + 4)) < 0.6 && Math.abs(np[1] - (p0[1] + 3)) < 0.6, JSON.stringify(np));
  const newArrow = f().arrows[f().arrows.length - 1];
  t.ok('пас копии соединяет копии, а не оригиналы', newArrow.from.e === newIds[0] && newArrow.to.e === newIds[1]);
  t.ok('реплика перешла на копию', f().bubbles.some(x => x.target === newIds[0] && x.text === 'Иду'));
  t.ok('подсветка перешла на копию', f().hl.indexOf(newIds[1]) >= 0);
  e.key('v', { ctrlKey: true, code: 'KeyV' });
  await e.wait(15);
  const third = e.UST.selParts(e.App.sel, f()).e[0];
  t.ok('вторая вставка сдвигается дальше', Math.abs(f().pos[third][0] - (p0[0] + 8)) < 0.6, f().pos[third][0]);
  e.key('v', { ctrlKey: true, shiftKey: true, code: 'KeyV' });
  await e.wait(15);
  const inPlace = e.UST.selParts(e.App.sel, f()).e[0];
  t.ok('Ctrl+Shift+V вставляет точно на то же место', Math.abs(f().pos[inPlace][0] - p0[0]) < 0.01, f().pos[inPlace][0]);

  t.section('отмена, вырезание, дублирование');
  const before = b().entities.length;
  e.key('z', { ctrlKey: true });
  await e.wait(15);
  t.ok('отмена убирает вставленное', b().entities.length === before - 2);
  e.App.sel = { t: 'ent', ids: [two[0]] };
  e.UST.refresh(['canvas', 'insp']);
  e.key('d', { ctrlKey: true, code: 'KeyD' });
  await e.wait(15);
  t.ok('Ctrl+D дублирует выбранного', b().entities.length === before - 1);
  const cutId = e.UST.selParts(e.App.sel, f()).e[0];
  e.key('x', { ctrlKey: true, code: 'KeyX' });
  await e.wait(15);
  t.ok('Ctrl+X убирает со схемы', !b().entities.some(x => x.id === cutId) && b().entities.length === before - 2);
  e.key('v', { ctrlKey: true, code: 'KeyV' });
  await e.wait(15);
  t.ok('и вставляется обратно', b().entities.length === before - 1);

  t.section('вставка позиций');
  e.App.sel = { t: 'ent', ids: two };
  e.UST.refresh(['canvas', 'insp']);
  const saved = two.map(id => f().pos[id].slice());
  e.key('c', { ctrlKey: true, code: 'KeyC' });
  await e.wait(10);
  await e.press('Шаг');
  await e.wait(15);
  e.UST.commit(() => { two.forEach(id => { f().pos[id] = [10, 10]; }); });
  await e.wait(10);
  await e.press('Вставить позиции', e.$('#edInsp'));
  await e.wait(15);
  t.ok('на новом шаге игроки встали как на прошлом', two.every((id, i) => Math.abs(f().pos[id][0] - saved[i][0]) < 0.01 && Math.abs(f().pos[id][1] - saved[i][1]) < 0.01));
  t.ok('новых игроков при этом не появилось', b().entities.length === before - 1);

  t.section('перенос расстановки в другую презентацию');
  const label0 = b().entities.find(x => x.id === two[0]).label;
  await e.press('К списку презентаций');
  await e.wait(40);
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const match = b().entities.find(x => x.label === label0);
  t.ok('в новой презентации есть игрок с той же подписью', !!match, label0);
  if (match) {
    e.UST.commit(() => { f().pos[match.id] = [5, 5]; });
    await e.wait(10);
    await e.press('Вставить позиции', e.$('#edInsp'));
    await e.wait(15);
    t.ok('позиция перенеслась по подписи игрока', Math.abs(f().pos[match.id][0] - saved[0][0]) < 0.01 && Math.abs(f().pos[match.id][1] - saved[0][1]) < 0.01, JSON.stringify(f().pos[match.id]));
  }
  t.clean(e, 'этап 1в без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
