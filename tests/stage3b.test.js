// Этап 3б: пути с несколькими точками и навес (мяч верхом).
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 3б — пути через точки и навес');
  const env = await openApp();
  const TE = env.TE;
  const host = () => { const d = env.doc.createElement('div'); env.doc.body.appendChild(d); return d; };
  const P = TE.normalizeProject({ settings: { format: '8x8' }, slides: [] });
  const half = bd => { bd.animate = (total, fn) => { fn(total / 2); return Promise.resolve(true); }; return bd; };

  t.section('бег через точку пути');
  const runBoard = pts => TE.normalizeBoard({
    entities: [{ id: 'a', kind: 'ours' }],
    frames: [
      { pos: { a: [20, 60] } },
      { pos: { a: [80, 60] }, arrows: [{ id: 'm', kind: 'move', target: 'a', style: 'dashed', color: 'auto', width: 2.8, head: true, pts }] }
    ]
  });
  const bd = half(new TE.Board(host(), runBoard([[50, 20]]), P, { bare: true }));
  await bd.tweenTo(1);
  t.ok('на середине игрок у заданной точки, а не на прямой', Math.abs(bd.cur.a[1] - 20) < 6 && Math.abs(bd.cur.a[0] - 50) < 6, JSON.stringify(bd.cur.a.map(v => +v.toFixed(1))));
  const straight = half(new TE.Board(host(), runBoard(undefined), P, { bare: true }));
  await straight.tweenTo(1);
  t.ok('без точек — как раньше, по прямой', Math.abs(straight.cur.a[1] - 60) < 1e-6);
  const two = half(new TE.Board(host(), runBoard([[35, 30], [65, 30]]), P, { bare: true }));
  await two.tweenTo(1);
  t.ok('с двумя точками путь идёт по ним', Math.abs(two.cur.a[1] - 30) < 8, JSON.stringify(two.cur.a.map(v => +v.toFixed(1))));
  const full = new TE.Board(host(), runBoard([[50, 20]]), P, { bare: true });
  full.animate = (total, fn) => { fn(total); return Promise.resolve(true); };
  await full.tweenTo(1);
  t.ok('в конце игрок точно в цели', Math.abs(full.cur.a[0] - 80) < 0.01 && Math.abs(full.cur.a[1] - 60) < 0.01);
  t.ok('стрелка нарисована гладкой линией через точки', /C/.test(full.apath[0]), (full.apath[0] || '').slice(0, 24));

  t.section('навес');
  const lobBoard = lob => TE.normalizeBoard({
    entities: [{ id: 'a', kind: 'ours' }, { id: 'b', kind: 'ours' }],
    frames: [
      { pos: { a: [20, 80], b: [80, 30] }, ball: { owner: 'a' } },
      { pos: { a: [20, 80], b: [80, 30] }, ball: { owner: 'b' }, arrows: [{ id: 'p', kind: 'line', from: { e: 'a' }, to: { e: 'b' }, style: 'dashed', color: 'pass', width: 3, head: true, bend: 55, lob }] }
    ]
  });
  const lb = half(new TE.Board(host(), lobBoard(true), P, { bare: true }));
  await lb.tweenTo(1);
  const tr = lb.gBallBody.getAttribute('transform') || '';
  t.ok('в полёте мяч приподнят над тенью', /translate\(0,-\d/.test(tr), tr);
  t.ok('и тень бледнее', +lb.gBallShadow.getAttribute('opacity') < 1, lb.gBallShadow.getAttribute('opacity'));
  const lbEnd = new TE.Board(host(), lobBoard(true), P, { bare: true });
  lbEnd.animate = (total, fn) => { fn(total); return Promise.resolve(true); };
  await lbEnd.tweenTo(1);
  t.ok('к концу мяч опустился', !/translate\(0,-[1-9]/.test(lbEnd.gBallBody.getAttribute('transform') || ''), lbEnd.gBallBody.getAttribute('transform'));
  const flat = half(new TE.Board(host(), lobBoard(false), P, { bare: true }));
  await flat.tweenTo(1);
  t.ok('обычный пас — мяч по земле', !/translate\(0,-[1-9]/.test(flat.gBallBody.getAttribute('transform') || ''));
  t.clean(env, 'движок без ошибок');
  env.close();

  t.section('в редакторе');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  await e.gotoBoardSlide(0);
  const f = () => e.frame();
  const ids = e.board().entities.filter(x => f().pos[x.id]).slice(0, 2).map(x => x.id);
  e.UST.commit(() => {
    f().arrows.push({ id: 'ar', kind: 'line', from: { e: ids[0] }, to: { e: ids[1] }, style: 'solid', color: 'pass', width: 3, head: true, bend: 0 });
  });
  await e.wait(15);
  e.App.sel = { t: 'arrow', i: f().arrows.findIndex(a => a.id === 'ar') };
  e.UST.refresh(['canvas', 'insp']);
  await e.wait(10);
  t.ok('у выбранной стрелки есть «плюсик» для новой точки', !!e.$('#edCanvas [data-handle="a-add-0"]'));
  const plus = e.$('#edCanvas [data-handle="a-add-0"] circle');
  const box = e.pt([40, 40]);
  e.ptr(plus, 'pointerdown', box[0], box[1]);
  e.ptr(e.svg(), 'pointermove', ...e.pt([30, 25]));
  e.ptr(e.svg(), 'pointerup', ...e.pt([30, 25]));
  await e.wait(15);
  const ar = () => f().arrows.find(a => a.id === 'ar');
  t.ok('точка пути появилась там, куда потянули', ar().pts && ar().pts.length === 1 && Math.abs(ar().pts[0][0] - 30) < 1 && Math.abs(ar().pts[0][1] - 25) < 1, JSON.stringify(ar().pts));
  t.ok('за точку можно взяться отдельно', !!e.$('#edCanvas [data-handle="a-pt-0"]'));
  const pt0 = e.$('#edCanvas [data-handle="a-pt-0"] circle');
  e.ptr(pt0, 'pointerdown', ...e.pt(ar().pts[0]));
  e.ptr(e.svg(), 'pointermove', ...e.pt([70, 20]));
  e.ptr(e.svg(), 'pointerup', ...e.pt([70, 20]));
  await e.wait(15);
  t.ok('точку можно перетащить', Math.abs(ar().pts[0][0] - 70) < 1 && Math.abs(ar().pts[0][1] - 20) < 1, JSON.stringify(ar().pts));
  t.ok('в свойствах видно число точек', /Точек пути: 1/.test(e.text(e.$('#edInsp'))));
  const lobTog = e.$$('#edInsp .tog').find(l => /верхом/.test(e.text(l)));
  t.ok('есть переключатель «мяч летит верхом»', !!lobTog);
  if (lobTog) { e.change(lobTog.querySelector('input'), true); await e.wait(15); }
  t.ok('навес включился', ar().lob === true);
  await e.press('Убрать точки пути', e.$('#edInsp'));
  await e.wait(15);
  t.ok('точки пути убираются одной кнопкой', !ar().pts);
  await e.press('Стрелка');
  t.ok('в наборе стрелок появился «Навес»', !!e.button('Навес'));
  t.clean(e, 'этап 3б без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
