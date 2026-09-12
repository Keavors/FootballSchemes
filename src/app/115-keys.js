
/* ---------- Клавиатура ---------- */
function onEditorKey(e) {
  if (App.view !== 'editor' || document.querySelector('.ed-preview, .modal-ov')) return;
  const tag = (e.target && e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (mod && (key === 'z' || key === 'я')) { if (typing) return; e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && (key === 'y' || key === 'н')) { if (typing) return; e.preventDefault(); redo(); return; }
  if (mod && (e.code === 'KeyA' || key === 'a' || key === 'ф')) { if (typing || App.tab !== 'board') return; e.preventDefault(); selectAllOnFrame(); return; }
  if (mod && (e.code === 'KeyC' || key === 'c' || key === 'с')) { if (typing || App.tab !== 'board') return; e.preventDefault(); copySelection(false); return; }
  if (mod && (e.code === 'KeyX' || key === 'x' || key === 'ч')) { if (typing || App.tab !== 'board') return; e.preventDefault(); copySelection(true); return; }
  if (mod && (e.code === 'KeyV' || key === 'v' || key === 'м')) { if (typing || App.tab !== 'board') return; e.preventDefault(); pasteClipboard(e.shiftKey ? 'place' : 'copy'); return; }
  if (mod && (e.code === 'KeyD' || key === 'd' || key === 'в')) { if (typing || App.tab !== 'board') return; e.preventDefault(); duplicateSelection(); return; }
  if (typing || App.tab !== 'board') return;
  if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.25); return; }
  if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / 1.25); return; }
  if (e.key === '0') { e.preventDefault(); resetZoom(); return; }
  if (e.key === 'Escape') { App.tool = { m: 'select' }; App.sel = null; refresh(['tools', 'canvas', 'insp']); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && App.sel) { e.preventDefault(); deleteSelection(); return; }
  if (e.key.indexOf('Arrow') === 0 && App.sel && !App.playing) {
    e.preventDefault();
    const d = e.shiftKey ? 2 : 0.5;
    const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
    const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
    commit(() => nudgeSelection(boardHoriz() ? [dy, -dx] : [dx, dy]), { key: 'nudge', parts: ['canvas'] });
    return;
  }
  if (e.key === 'PageDown') { e.preventDefault(); gotoFrame(App.frameIdx + 1); }
  if (e.key === 'PageUp') { e.preventDefault(); gotoFrame(App.frameIdx - 1); }
}

/* ---------- Запуск ---------- */
window.addEventListener('resize', () => { if (App.view === 'editor') { fitCanvas(); } });
window.addEventListener('beforeunload', e => {
  if (Store.mode === 'memory' && App.project && App.dirtyExport) { e.preventDefault(); e.returnValue = ''; }
});
/* ---------- Справка: клавиши и жесты ---------- */
const KEY_HELP = [
  ['Работа с презентацией', [
    ['Ctrl + Z', 'Отменить'],
    ['Ctrl + Shift + Z или Ctrl + Y', 'Вернуть отменённое'],
    ['?  или  F1', 'Эта справка'],
    ['Esc', 'Снять выделение и вернуться к стрелке-курсору']
  ]],
  ['Схема', [
    ['Ctrl + A', 'Выделить всё на этом шаге'],
    ['Ctrl + C  /  Ctrl + X  /  Ctrl + V', 'Копировать, вырезать, вставить'],
    ['Ctrl + Shift + V', 'Вставить на то же место'],
    ['Ctrl + D', 'Дублировать выделенное'],
    ['Delete', 'Удалить выделенное'],
    ['Стрелки', 'Сдвинуть на полшага; с Shift — крупнее'],
    ['+  /  −  /  0', 'Приблизить, отдалить, показать всё поле'],
    ['PageUp / PageDown', 'Предыдущий и следующий шаг схемы']
  ]],
  ['Мышь и палец', [
    ['Тянуть игрока', 'Перенести его; остальные шаги не меняются'],
    ['Shift или Ctrl при нажатии', 'Добавить объект к выделению'],
    ['Alt при переносе', 'Временно отключить прилипание к линиям'],
    ['Тянуть среднюю точку стрелки', 'Изогнуть стрелку'],
    ['Плюсики на стрелке', 'Добавить точку пути']
  ]],
  ['Во время показа', [
    ['→  ←  или  PageDown / PageUp', 'Следующий и предыдущий слайд'],
    ['Home / End', 'Первый и последний слайд'],
    ['Пробел', 'Запустить или остановить анимацию'],
    ['Касание по схеме', 'Следующий шаг схемы'],
    ['Свайп по слайду', 'Листать слайды на телефоне'],
    ['F', 'Во весь экран'],
    ['P', 'Второе окно докладчика: заметки и таймер']
  ]]
];
function openKeyHelp() {
  modal('Клавиши и жесты', KEY_HELP.map(([title, rows]) => h('div', { class: 'exp-card' },
    h('h3', null, title),
    h('dl', { class: 'keys' }, rows.map(([k, what]) => [h('dt', null, h('kbd', null, k)), h('dd', null, what)]))
  )).concat([h('p', { class: 'muted small' }, 'На телефоне всё то же самое делается пальцем — клавиши нужны на компьютере.')]), { wide: true });
}
window.addEventListener('keydown', e => {
  const tag = (e.target && e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) return;
  if (e.key !== '?' && e.key !== 'F1') return;
  if (document.querySelector('.modal-ov')) return;
  e.preventDefault();
  openKeyHelp();
});
