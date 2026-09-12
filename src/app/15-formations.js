
/* ---------- Расстановки ---------- */
const FORMATIONS = {
  '5x5': ['2-2', '1-2-1', '2-1-1', '3-1', '1-1-2'],
  '6x6': ['2-2-1', '1-2-2', '2-1-2', '1-3-1', '3-1-1'],
  '7x7': ['2-3-1', '3-2-1', '2-1-2-1', '3-1-2', '1-3-2'],
  '8x8': ['3-3-1', '4-2-1', '3-2-2', '2-3-2', '3-1-3', '2-4-1'],
  '9x9': ['3-3-2', '3-2-3', '2-4-2', '3-4-1', '4-3-1'],
  '11x11': ['4-4-2', '4-3-3', '4-2-3-1', '4-1-4-1', '3-5-2', '3-4-3', '5-3-2', '4-4-1-1']
};
const DEFAULT_FORMATION = { '5x5': '2-2', '6x6': '2-2-1', '7x7': '2-3-1', '8x8': '3-3-1', '9x9': '3-3-2', '11x11': '4-3-3' };
function lineLabels(c, base) {
  if (base === 'Н') { if (c === 1) return ['Н']; if (c === 2) return ['ЛН', 'ПН']; if (c === 3) return ['ЛН', 'Н', 'ПН']; }
  if (base === 'АП' && c === 3) return ['ЛП', 'АП', 'ПП'];
  if (c === 1) return [base === 'З' ? 'ЦЗ' : base === 'П' ? 'ЦП' : base];
  const P = { 2: ['Л', 'П'], 3: ['Л', 'Ц', 'П'], 4: ['Л', 'ЛЦ', 'ПЦ', 'П'], 5: ['Л', 'ЛЦ', 'Ц', 'ПЦ', 'П'] };
  return (P[c] || Array.from({ length: c }, (_, i) => String(i + 1))).map(p => p + base);
}
function formation(code, opt) {
  opt = Object.assign({ height: 0.5, width: 0.5, team: 'ours' }, opt || {});
  const lines = String(code).split('-').map(x => parseInt(x, 10)).filter(x => x > 0);
  const nL = lines.length;
  const push = (opt.height - 0.5) * 24;
  const yDef = 76 - push * 0.8, yAtt = (nL >= 4 ? 34 : 40) - push;
  const out = [{ label: 'ВР', number: '1', gk: true, x: 50, y: +(94 - Math.max(0, push * 0.25)).toFixed(1) }];
  let num = 2;
  lines.forEach((c, li) => {
    const y = nL === 1 ? (yDef + yAtt) / 2 : yDef + (yAtt - yDef) * li / (nL - 1);
    let base = li === 0 ? 'З' : li === nL - 1 ? 'Н' : 'П';
    if (nL >= 4 && li > 0 && li < nL - 1) base = li === 1 ? 'ОП' : 'АП';
    const labels = lineLabels(c, base);
    const spread = (0.35 + opt.width * 0.5) / 0.6;
    const span = c === 1 ? 0 : Math.min(88, (c === 2 ? 44 : c === 3 ? 64 : 76) * spread);
    for (let k = 0; k < c; k++) {
      const x = c === 1 ? 50 : 50 - span / 2 + span * k / (c - 1);
      out.push({ label: labels[k], number: String(num++), gk: false, x: +x.toFixed(1), y: +y.toFixed(1) });
    }
  });
  if (opt.team === 'opp') out.forEach(p => { p.x = +(100 - p.x).toFixed(1); p.y = +(100 - p.y).toFixed(1); });
  return out;
}
function boardFromFormation(format, code) {
  const b = TE.normalizeBoard({ entities: [], frames: [TE.newFrame()] });
  formation(code || defaultFormationFor(format)).forEach(p => {
    const e = { id: uid(), kind: 'ours', label: p.label, number: p.number, gk: p.gk };
    b.entities.push(e);
    b.frames[0].pos[e.id] = [p.x, p.y];
  });
  return b;
}

/* ---------- Пресеты ---------- */
const ARROW_PRESETS = {
  run: { name: 'Бег', a: { style: 'dashed', color: 'auto', width: 2.8, head: true } },
  pass: { name: 'Пас', a: { style: 'solid', color: 'pass', width: 3, head: true }, ball: true },
  dribble: { name: 'Ведение', a: { style: 'wavy', color: 'run', width: 2.6, head: true }, ball: true },
  shot: { name: 'Удар', a: { style: 'solid', color: 'pass', width: 4.2, head: true }, ball: true },
  press: { name: 'Прессинг', a: { style: 'solid', color: 'special', width: 3.6, head: true } },
  opprun: { name: 'Бег соперника', a: { style: 'dashed', color: 'opp', width: 2.8, head: true } },
  opppass: { name: 'Пас соперника', a: { style: 'solid', color: 'opp', width: 3, head: true }, ball: true },
  lob: { name: 'Навес', a: { style: 'dashed', color: 'pass', width: 3.2, head: true, bend: 55, lob: true }, ball: true },
  line: { name: 'Линия', a: { style: 'solid', color: '#ffffff', width: 2.4, head: false } }
};
const LAYOUTS = {
  title: { name: 'Титульный', hint: 'Крупный заголовок' },
  split: { name: 'Схема и текст', hint: 'Схема рядом с текстом' },
  board: { name: 'Акцент на схеме', hint: 'Узкая колонка текста' },
  duo: { name: 'Две схемы', hint: 'Например: без мяча и с мячом' },
  roles: { name: 'Роли', hint: 'Требования по позициям' },
  text: { name: 'Только текст', hint: 'Без схемы' }
};
const ENTITY_KINDS = {
  ours: 'Наш игрок', opp: 'Соперник', third: 'Нейтральный',
  cone: 'Конус', disc: 'Фишка', pole: 'Стойка', minigoal: 'Мини-ворота', ball: 'Мяч (инвентарь)', dummy: 'Манекен'
};
const PITCH_PRESETS = [
  { name: 'Газон', v: { grass: '#3a8a55', grass2: '#40925b', surround: '#2f7a4a', lines: '#ffffff' } },
  { name: 'Вечер', v: { grass: '#23573a', grass2: '#285f40', surround: '#1b4630', lines: '#e8f3ea' } },
  { name: 'Искусственный', v: { grass: '#2f8d6f', grass2: '#339676', surround: '#257259', lines: '#ffffff' } },
  { name: 'Меловая доска', v: { grass: '#2c3a35', grass2: '#2f3e39', surround: '#222d29', lines: '#e9efe9' } },
  { name: 'Маркерная доска', v: { grass: '#f4f6f5', grass2: '#eef1ef', surround: '#dfe5e2', lines: '#39516e' } },
  { name: 'Зал', v: { grass: '#c98d52', grass2: '#cf955b', surround: '#a8733f', lines: '#ffffff' } }
];