// Этап 1г: копирование шагов и слайдов, меню «ещё».
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 1г — шаги и слайды в буфере');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(40);
  const boardSlides = e.App.project.slides.map((s, i) => (s.board && s.layout !== 'text' ? i : -1)).filter(i => i >= 0);
  e.click(e.$$('.sl-list .sl-main')[boardSlides[0]]);
  await e.wait(20);

  t.section('меню шага');
  await e.press('Ещё действия с шагом');
  t.ok('меню открылось', !!e.$('.pop'));
  t.ok('в меню есть копирование шага', !!e.button('Копировать шаг', e.$('.pop')));
  t.ok('вставка шага пока недоступна', e.button('Вставить шаг сюда', e.$('.pop')).disabled);
  e.key('Escape', {}, e.doc);
  await e.wait(10);
  t.ok('Esc закрывает меню', !e.$('.pop'));

  t.section('копирование шага');
  const b = () => e.board(), f = () => e.frame();
  const srcPos = JSON.stringify(f().pos);
  const srcCount = Object.keys(f().pos).filter(id => f().pos[id]).length;
  await e.press('Ещё действия с шагом');
  await e.press('Копировать шаг', e.$('.pop'));
  await e.wait(10);
  t.ok('шаг лежит в буфере', e.UST.getClip().kind === 'frame' && e.UST.getClip().entities.length === srcCount);
  const n0 = b().frames.length;
  await e.press('Ещё действия с шагом');
  await e.press('Вставить шаг сюда', e.$('.pop'));
  await e.wait(15);
  t.ok('шаг вставлен следом', b().frames.length === n0 + 1 && e.App.frameIdx === 1);
  t.ok('расстановка на вставленном шаге та же', JSON.stringify(f().pos) === srcPos);
  await e.press('Удалить шаг');
  await e.wait(10);

  t.section('перенос шага на другую схему');
  const other = boardSlides.find(i => i !== boardSlides[0]);
  e.click(e.$$('.sl-list .sl-main')[other]);
  await e.wait(20);
  const ents0 = b().entities.length, frames0 = b().frames.length;
  /* своих игроков узнаём по id или по подписи, соперников с первой схемы здесь нет — они добавятся */
  const known = x => b().entities.some(y => y.id === x.id || (y.kind === x.kind && !!y.gk === !!x.gk && (y.label || y.number) && (y.label || y.number) === (x.label || x.number)));
  const clipEnts = e.UST.getClip().entities;
  const fresh = clipEnts.filter(x => !known(x)).length;
  e.key('v', { ctrlKey: true, code: 'KeyV' });
  await e.wait(25);
  t.ok('шаг вставился на другую схему', b().frames.length === frames0 + 1);
  t.ok('знакомые игроки не задвоились', fresh < clipEnts.length && b().entities.length === ents0 + fresh, ents0 + ' + ' + fresh + ' новых → ' + b().entities.length);
  t.ok('расстановка перенеслась', Object.keys(f().pos).filter(id => f().pos[id]).length === srcCount);
  e.key('z', { ctrlKey: true });
  await e.wait(15);
  t.ok('отмена возвращает схему как была', b().frames.length === frames0);

  t.section('копирование слайда');
  const slides0 = e.App.project.slides.length;
  const title0 = e.App.project.slides[e.App.slideIdx].title;
  await e.press('Ещё действия со слайдом');
  await e.press('Копировать слайд', e.$('.pop'));
  await e.wait(10);
  t.ok('слайд лежит в буфере', e.UST.getClip().kind === 'slide');
  await e.press('Ещё действия со слайдом');
  await e.press('Вставить слайд после', e.$('.pop'));
  await e.wait(20);
  t.ok('слайд вставлен следом', e.App.project.slides.length === slides0 + 1);
  const copy = e.App.project.slides[e.App.slideIdx];
  t.ok('копия с тем же содержимым, но своим номером', copy.title === title0 && copy.id !== e.App.project.slides[e.App.slideIdx - 1].id);

  t.section('перенос слайда в другую презентацию');
  await e.press('К списку презентаций');
  await e.wait(40);
  await e.press('Новая презентация');
  await e.press('Создать', e.$('.modal-ov'));
  await e.wait(40);
  const own0 = e.App.project.slides.length;
  e.key('v', { ctrlKey: true, code: 'KeyV' });
  await e.wait(25);
  t.ok('слайд из другой презентации вставился', e.App.project.slides.length === own0 + 1);
  t.ok('вместе со схемой', !!e.App.project.slides[e.App.slideIdx].board && e.App.project.slides[e.App.slideIdx].title === title0);
  t.section('перенос шага на схему с другими игроками');
  await e.press('Ещё действия с шагом');
  await e.press('Копировать шаг', e.$('.pop'));
  await e.wait(10);
  const cnt = e.UST.getClip().entities.length;
  const ownIdx = e.App.project.slides.findIndex((s, i) => s.board && s.layout !== 'text' && i !== e.App.slideIdx);
  e.click(e.$$('.sl-list .sl-main')[ownIdx]);
  await e.wait(20);
  const ownEnts = b().entities.length, ownFrames = b().frames.length;
  e.key('v', { ctrlKey: true, code: 'KeyV' });
  await e.wait(25);
  t.ok('шаг лёг на схему с другими игроками', b().frames.length === ownFrames + 1);
  t.ok('недостающие игроки добавлены на схему', b().entities.length === ownEnts + cnt, ownEnts + ' → ' + b().entities.length);
  t.ok('и они видны на вставленном шаге', Object.keys(f().pos).filter(id => f().pos[id]).length === cnt);
  t.clean(e, 'этап 1г без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
