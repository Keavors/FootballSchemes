
/* Ошибки не должны молча ломать экран: показываем их и даём скопировать. */
/* ---------- Надёжность редактора ---------- */
/* Не терять последние правки, если вкладку свернули или закрыли */
function flushSave() {
  if (!App.project) return;
  /* аварийную копию пишем сразу: она синхронная и переживёт закрытие вкладки */
  if (App.saving === 'pending') { emergencySave(); saveNow(); }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
window.addEventListener('pagehide', flushSave);

/* Та же презентация открыта в другой вкладке или окне */
let conflictBar = null;
window.addEventListener('storage', e => {
  if (App.view !== 'editor' || !App.project || e.key !== 'ustanovka-p-' + App.project.id || !e.newValue) return;
  let other;
  try { other = JSON.parse(e.newValue); } catch (x) { return; }
  if (!other || !Array.isArray(other.slides)) return;
  const mine = +App.project.updated || 0, theirs = +other.updated || 0;
  if (theirs === mine) return;
  /* Другая вкладка записала более старую версию поверх нашей — молча возвращаем свою */
  if (theirs < mine) { saveNow(); return; }
  showConflictBar(other);
});
function showConflictBar(other) {
  if (conflictBar) conflictBar.remove();
  const bar = h('div', { class: 'updbar conflict', role: 'alert' },
    h('span', null, 'Эту презентацию изменили в другой вкладке или окне.'),
    btn('download', 'Загрузить ту версию', () => { bar.remove(); conflictBar = null; loadOtherVersion(other); }, false, 'sm accent'),
    btn('check', 'Оставить мою', () => {
      bar.remove();
      conflictBar = null;
      if (App.view !== 'editor') return;
      touch();
      /* Наша версия должна быть заведомо новее, иначе другая вкладка молча вернёт свою */
      App.project.updated = Math.max(+App.project.updated || 0, (+other.updated || 0) + 1);
    }, false, 'sm'));
  conflictBar = bar;
  document.body.appendChild(bar);
}
function loadOtherVersion(other) {
  if (App.view !== 'editor') return;
  if (App.canvasBoard) App.canvasBoard.cancel();
  App.project = TE.normalizeProject(other);
  hist.past = []; hist.future = []; hist.key = null;
  App.sel = null;
  App.saving = 'saved';
  fixState();
  refresh();
  toast('Загружена версия из другой вкладки');
}

/* Окно перешло между «телефоном» и «компьютером» — перестраиваем интерфейс */
(function () {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(max-width: 899px)');
  const onChange = () => {
    if (App.view !== 'editor') return;
    closeSlidesDrawer();
    App.sheet = false;
    refresh();
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
})();