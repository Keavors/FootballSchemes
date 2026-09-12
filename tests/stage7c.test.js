// Этап 7в: поле перекрашивается на месте, без пересборки схемы.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 7в — обновление поля без пересборки');
  const e = await openApp({ idb: true });
  const TE = e.TE;
  await e.press('Открыть пример «Маятник»');
  await e.wait(60);
  await e.gotoBoardSlide(0);
  const svg = () => e.$('#edCanvas svg');
  const grass = () => (e.$('#edCanvas svg rect[fill]') || {}).getAttribute && e.$$('#edCanvas svg rect').map(r => r.getAttribute('fill'));

  t.section('тот же самый холст');
  const was = svg();
  const tokenIds = e.$$('#edCanvas [data-eid]').map(x => x.getAttribute('data-eid'));
  e.UST.commit(p => { p.settings.pitch.grass = '#112233'; p.settings.pitch.grass2 = '#112233'; }, { parts: ['style'] });
  await e.wait(40);
  t.ok('схема не пересобиралась', svg() === was, svg() === was);
  t.ok('поле перекрасилось', (grass() || []).indexOf('#112233') >= 0, JSON.stringify(grass()));
  t.ok('фишки на месте', JSON.stringify(e.$$('#edCanvas [data-eid]').map(x => x.getAttribute('data-eid'))) === JSON.stringify(tokenIds));

  t.section('цвет команды и подписи');
  const tokFills = id => e.$$(`#edCanvas [data-eid="${id}"] .te-tb`).map(x => x.style.fill);
  const one = e.board().entities.find(x => x.kind === 'ours' && !x.gk).id;
  e.UST.commit(p => { p.settings.colors.ours = '#7700aa'; }, { parts: ['style'] });
  await e.wait(40);
  t.ok('фишка перекрасилась', /119, 0, 170|#7700aa/.test(tokFills(one).join(' ')), JSON.stringify(tokFills(one)));
  t.ok('и холст всё тот же', svg() === was);
  e.UST.commit(p => { p.settings.tokens.oursSize = 1.6; }, { parts: ['style'] });
  await e.wait(40);
  t.ok('размер фишки поменялся', e.App.canvasBoard.radius(one) > 12, e.App.canvasBoard.radius(one));

  t.section('другой формат и ориентация');
  const vb = () => svg().getAttribute('viewBox');
  const vb0 = vb();
  e.UST.commit(p => { p.settings.pitch.orientation = 'horizontal'; }, { parts: ['style'] });
  await e.wait(40);
  t.ok('поле повернулось', vb() !== vb0, vb0 + ' → ' + vb());
  t.ok('и это по-прежнему тот же холст', svg() === was);
  const my = TE.normFormat({ id: 'zal2', name: 'Зал', n: 6, ratio: 1.2, m: [40, 24], round: true, arc: false });
  e.UST.commit(p => { p.settings.formats = [my]; }, { parts: [] });
  e.UST.applyFormat('zal2');
  await e.wait(60);
  const v = vb().split(' ').map(Number);
  t.ok('пропорции стали как в своём формате', Math.abs((v[2] - 40) / (v[3] - 40) - 1.2) < 0.03, vb());
  t.ok('схема так и не пересобиралась', svg() === was);
  t.ok('игроки остались на своих местах', e.$$('#edCanvas [data-eid]').length === tokenIds.length, e.$$('#edCanvas [data-eid]').length);

  t.section('стрелки и наконечники после перекраски');
  e.App.frameIdx = 1;
  e.UST.refresh(['canvas']);
  await e.wait(40);
  const arrows0 = e.$$('#edCanvas path[marker-end], #edCanvas path[stroke]').length;
  e.UST.commit(p => { p.settings.colors.pass = '#00ff88'; }, { parts: ['style'] });
  await e.wait(40);
  t.ok('стрелки на месте после перекраски', e.$$('#edCanvas path[marker-end], #edCanvas path[stroke]').length === arrows0, e.$$('#edCanvas path[stroke]').length + ' было ' + arrows0);
  t.ok('наконечники собраны заново', e.$$('#edCanvas marker').length > 0, e.$$('#edCanvas marker').length);

  t.section('если холста нет — просто рисуем заново');
  const board = e.App.canvasBoard;
  e.$('#edCanvas').textContent = '';
  e.UST.restyleCanvas();
  await e.wait(40);
  t.ok('схема восстановилась', !!svg() && svg() !== was && e.App.canvasBoard !== board);
  t.clean(e, 'этап 7в без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
