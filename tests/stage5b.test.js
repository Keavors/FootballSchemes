// Этап 5б: пауза-вопрос во время показа.
const { openApp, suite } = require('./harness');

(async () => {
  const t = suite('Этап 5б — пауза-вопрос');
  const env = await openApp();
  const TE = env.TE;

  t.section('проверка данных');
  const okB = TE.normalizeBoard({ entities: [], frames: [{ pos: {} }, { pos: {}, quiz: { q: 'Куда бежит ЛЗ?', a: 'За спину' } }] });
  t.ok('вопрос сохраняется', okB.frames[1].quiz.q === 'Куда бежит ЛЗ?' && okB.frames[1].quiz.a === 'За спину');
  const emptyB = TE.normalizeBoard({ entities: [], frames: [{ pos: {}, quiz: { q: '  ', a: 'что-то' } }] });
  t.ok('пустой вопрос выбрасывается', emptyB.frames[0].quiz === undefined);
  env.close();

  t.section('в показе');
  const e = await openApp();
  await e.press('Открыть пример «Маятник»');
  await e.wait(50);
  await e.gotoBoardSlide(0);
  e.UST.commit(() => {
    const b = e.board();
    b.autoplay = false;
    b.frames[1].quiz = { q: 'Куда открывается ЛЗ?', a: 'В свободную зону на фланге' };
  });
  await e.wait(20);
  await e.press('Показ');
  await e.wait(60);
  const card = () => e.$('.ed-preview .te-quiz');
  const step = () => e.text(e.$('.ed-preview .te-step'));
  const fwd = () => e.$$('.ed-preview .te-ctrl button')[3];
  t.ok('показ открыт на первом шаге', step() === '1/4', step());
  t.ok('вопроса пока нет', !card());
  e.click(fwd());
  await e.wait(40);
  t.ok('перед шагом появился вопрос', !!card() && /Куда открывается ЛЗ/.test(e.text(card())));
  t.ok('шаг при этом не перелистнулся', step() === '1/4', step());
  t.ok('ответ пока скрыт', card().querySelector('.te-quiz-a').hidden === true);
  await e.press('Показать ответ', card());
  await e.wait(20);
  t.ok('ответ показан', card() && card().querySelector('.te-quiz-a').hidden === false && /свободную зону/.test(e.text(card())));
  await e.press('Дальше', card());
  await e.wait(60);
  t.ok('после ответа шаг перелистнулся', !card() && step() === '2/4', step());
  e.click(fwd());
  await e.wait(60);
  t.ok('дальше листается как обычно', step() === '3/4', step());
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(20);

  t.section('вопрос останавливает автопоказ');
  e.UST.commit(() => { e.board().autoplay = true; });
  await e.wait(20);
  await e.press('Показ');
  await e.wait(1500);
  t.ok('автопоказ остановился на вопросе', !!card() && step() === '1/4', step() + (card() ? ', вопрос показан' : ', вопроса нет'));
  await e.press('Показать ответ', card());
  await e.press('Дальше', card());
  await e.wait(120);
  t.ok('после ответа показ продолжился', !card() && step() !== '1/4', step());
  await e.press('Закрыть', e.$('.ed-preview .te-top'));
  await e.wait(20);

  t.section('в редакторе');
  await e.press('Следующий шаг');
  await e.wait(20);
  const fld = e.$$('#edInsp .fld').find(x => /Вопрос перед этим шагом/.test(e.text(x)));
  t.ok('в свойствах шага есть вопрос', !!fld);
  t.ok('и он заполнен', fld.querySelector('input').value === 'Куда открывается ЛЗ?');
  e.input(fld.querySelector('input'), 'Кто страхует?');
  await e.wait(30);
  t.ok('вопрос правится', e.frame().quiz.q === 'Кто страхует?');
  t.ok('шаг с вопросом помечен в ленте', /quiz/.test(e.$$('#tlChips .tl-chip')[1].className));
  e.input(fld.querySelector('input'), '');
  await e.wait(30);
  t.ok('пустой вопрос убирает паузу', !e.frame().quiz && !/quiz/.test(e.$$('#tlChips .tl-chip')[1].className));
  t.clean(e, 'этап 5б без ошибок');
  e.close();
  process.exit(t.done() ? 1 : 0);
})().catch(err => { console.log('ТЕСТ УПАЛ:', err && err.stack || err); process.exit(2); });
