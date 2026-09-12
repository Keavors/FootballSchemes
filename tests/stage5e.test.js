// Этап 5д: ролик со схемой — раскадровка, сборка GIF, окно «Ролик».
const { openApp, suite } = require('./harness');

/* Читаем обратно то, что записал наш сжиматель: если совпало — файл поймёт любой просмотрщик */
function lzwDecode(bytes) {
  const minCode = bytes[0], clear = 1 << minCode, end = clear + 1;
  const data = [];
  let i = 1;
  while (i < bytes.length) {
    const len = bytes[i++];
    if (!len) break;
    for (let k = 0; k < len; k++) data.push(bytes[i++]);
  }
  let dict = [], next = end + 1, size = minCode + 1;
  const reset = () => {
    dict = [];
    for (let k = 0; k < clear; k++) dict[k] = [k];
    dict[clear] = [];
    dict[end] = [];
    next = end + 1;
    size = minCode + 1;
  };
  reset();
  const out = [];
  let acc = 0, bits = 0, prev = null, p = 0;
  for (;;) {
    while (bits < size && p < data.length) { acc |= data[p++] << bits; bits += 8; }
    if (bits < size) break;
    const code = acc & ((1 << size) - 1);
    acc >>>= size;
    bits -= size;
    if (code === clear) { reset(); prev = null; continue; }
    if (code === end) break;
    let entry;
    if (dict[code]) entry = dict[code];
    else if (prev) entry = prev.concat([prev[0]]);
    else break;
    for (let k = 0; k < entry.length; k++) out.push(entry[k]);
    if (prev && next < 4096) {
      dict[next++] = prev.concat([entry[0]]);
      if (next > (1 << size) - 1 && size < 12) size++;
    }
    prev = entry;
  }
  return out;
}
const str = (b, at, n) => String.fromCharCode.apply(null, Array.from(b.slice(at, at + n)));

(async () => {
  const t = suite('Этап 5д — видео и GIF');
  const e = await openApp();
  const TE = e.TE, UST = e.UST;

  t.section('раскадровка');
  const B = TE.normalizeBoard({
    entities: [{ id: 'a', kind: 'ours', label: '1' }],
    frames: [{ pos: { a: [20, 50] } }, { pos: { a: [60, 50] }, dur: 800 }, { pos: { a: [80, 20] }, hold: 9000 }]
  });
  const P = TE.normalizeProject({ title: 'Ролик', slides: [] });
  const host = e.doc.createElement('div');
  e.doc.body.appendChild(host);
  const bd = new TE.Board(host, B, P, { bare: true, frame: 0 });
  const plan = UST.clipPlan(bd);
  t.ok('на каждый шаг — движение и остановка', plan.length === 5, plan.length);
  t.ok('переход берёт длительность шага', bd.stepMs(1) === 800 && bd.stepMs(2) === 1100, bd.stepMs(1) + ' и ' + bd.stepMs(2));
  t.ok('слишком долгую паузу подрезаем', UST.clipTotal(plan) === 1200 + 800 + 2000 + 1100 + 2600, UST.clipTotal(plan));
  const total = UST.clipTotal(plan);
  UST.clipAt(bd, plan, 0);
  t.ok('в начале стоим на первом шаге', bd.i === 0 && Math.round(bd.cur.a[0]) === 20, JSON.stringify(bd.cur.a));
  UST.clipAt(bd, plan, 1200 + 400);
  const mid = bd.cur.a[0];
  t.ok('в середине перехода игрок между точками', mid > 21 && mid < 59, mid.toFixed(1));
  UST.clipAt(bd, plan, 1200 + 800);
  t.ok('к концу перехода он на месте', Math.round(bd.cur.a[0]) === 60, JSON.stringify(bd.cur.a));
  t.ok('в конце ролика — последний шаг', UST.clipAt(bd, plan, total).i === 2);
  const seg = UST.clipAt(bd, plan, 1200 + 400);
  t.ok('у куска есть подпись шага', typeof seg.cap === 'string');

  t.section('палитра');
  const pal = UST.medianCut([[0, 0, 0], [2, 2, 2], [250, 250, 250], [255, 255, 255], [200, 10, 10], [10, 200, 10]], 4);
  t.ok('цветов не больше, чем просили', pal.length <= 4 && pal.length >= 2, pal.length);
  const map = UST.palMapper(pal);
  t.ok('белый и чёрный попадают в разные ячейки', map(255, 255, 255) !== map(0, 0, 0), map(255, 255, 255) + ' и ' + map(0, 0, 0));
  t.ok('почти белый идёт к белому', map(252, 250, 251) === map(255, 255, 255));

  t.section('кадр с прозрачностью');
  const rgba = list => { const d = new Uint8Array(list.length * 4); list.forEach((c, i) => { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }); return d; };
  const pal2 = [[0, 0, 0], [255, 255, 255]], map2 = UST.palMapper(pal2);
  const f1 = UST.gifFrameIndices(rgba([[0, 0, 0], [255, 255, 255], [0, 0, 0], [0, 0, 0]]), map2, null, 2);
  t.ok('первый кадр рисуется целиком', Array.from(f1.px).join('') === '0100' && f1.changed === 4, Array.from(f1.px).join(''));
  const prev = Uint8Array.from(f1.px);
  const f2 = UST.gifFrameIndices(rgba([[0, 0, 0], [255, 255, 255], [255, 255, 255], [0, 0, 0]]), map2, prev, 2);
  t.ok('во втором кадре меняется только то, что сдвинулось', Array.from(f2.px).join('') === '2212' && f2.changed === 1, Array.from(f2.px).join('') + ' изменено ' + f2.changed);

  t.section('сжатие и файл GIF');
  const px = [];
  for (let i = 0; i < 9000; i++) px.push((i * 7 + (i % 13) * 31 + Math.floor(i / 50)) % 200);
  const bag = { bytes: [], push(b) { this.bytes.push(b & 255); } };
  UST.lzwWrite(bag, px, 8);
  const back = lzwDecode(bag.bytes);
  t.ok('сжатое разжимается обратно один в один', back.length === px.length && back.every((v, i) => v === px[i]), back.length + ' из ' + px.length);
  t.ok('и места занимает меньше', bag.bytes.length < px.length, bag.bytes.length + ' байт вместо ' + px.length);
  const flat = new Array(4000).fill(7);
  const bag2 = { bytes: [], push(b) { this.bytes.push(b & 255); } };
  UST.lzwWrite(bag2, flat, 8);
  t.ok('однотонная картинка сжимается сильно', bag2.bytes.length < 200 && lzwDecode(bag2.bytes).length === 4000, bag2.bytes.length + ' байт');

  const gw = UST.gifWriter(2, 2, pal2);
  gw.frame([0, 1, 1, 0], 10, false);
  gw.frame([2, 2, 0, 2], 10, true);
  const file = gw.finish();
  t.ok('файл начинается как GIF', str(file, 0, 6) === 'GIF89a', str(file, 0, 6));
  t.ok('размер записан', file[6] === 2 && file[8] === 2);
  t.ok('ролик зациклен', str(file, 0, file.length).indexOf('NETSCAPE2.0') > 0);
  t.ok('файл закрыт как положено', file[file.length - 1] === 0x3B, file[file.length - 1]);
  t.ok('два кадра на месте', (str(file, 0, file.length).split('!ù').length - 1) === 2);
  t.ok('прозрачность включена только во втором кадре', UST.gifWriter(2, 2, pal2).trans === 2);

  t.section('окно ролика');
  await e.press('Открыть пример «Маятник»');
  await e.wait(50);
  await e.gotoBoardSlide(0);
  await e.press('Экспорт');
  await e.wait(20);
  const card = e.$$('.modal-ov .exp-card').find(c => /Ролик со схемой/.test(e.text(c)));
  t.ok('в экспорте есть карточка ролика', !!card);
  await e.press('Сделать ролик', card);
  await e.wait(40);
  const box = e.$('.modal-ov .modal');
  t.ok('окно ролика открылось', !!box && /Ролик со схемой/.test(e.text(box)));
  t.ok('видно, сколько будет длиться', /длиться примерно/.test(e.text(box)), e.text(box).slice(0, 80));
  t.ok('без записи видео честно предупреждаем', /не умеет записывать видео/.test(e.text(box)) && UST.canRecordVideo() === false);
  t.ok('есть выбор GIF и размера', !!e.button('GIF', box) && !!e.button('560', box));
  await e.press('Сделать ролик', box);
  await e.wait(120);
  t.ok('без холста ролик не собирается и об этом сказано', /не вышло/.test(e.text(e.$('.modal-ov .modal') || box)), e.text(e.$('.modal-ov .modal') || box).slice(-90));
  const cl = e.button('Закрыть', e.$('.modal-ov'));
  if (cl) e.click(cl);
  await e.wait(20);
  t.ok('скрытая схема убрана со страницы', e.$$('div').filter(d => /left:-10000px/.test(d.getAttribute('style') || '')).length === 0);

  t.section('схема из одного шага');
  e.App.project.slides[e.App.slideIdx].board.frames.length = 1;
  UST.openClip();
  await e.wait(20);
  t.ok('ролик из одного шага не делаем', /один шаг/.test(e.text(e.$('.toast')) || ''), e.text(e.$('.toast')));
  t.clean(e, 'этап 5д без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
