
/* Всё, что доступно снаружи: из консоли и из тестов */
window.UST = {
  App, commit, refresh, openEditor, renderHome, undo, redo,
  buildExportHTML, forExport, parseImported, packProject, unpackProject, shareLinkFor,
  pendulumProject, formation, selParts, selFromParts, getClip,
  mirrorFrames, mirrorCaption, mirrorPairs, moveSlideTo, Store, saveProject, loadProject, emergencySave,
  SLIDE_TEMPLATES, insertTemplate, presetProject, svgToPNG, openPrint, printFrames, snapshotBoard, fontsInline,
  Prefs, loadPrefs, savePrefs, fmtObj, formatChoices, applyFormat, openFormatEditor, formationsFor, defaultFormationFor,
  arrowPresets, saveArrowType, removeArrowType, addPaletteColor, removePaletteColor, askName,
  boardSpots, mirrorSpots, saveBoardFormation, removeFormation, applyFormation, openFormation,
  saveTheme, applyTheme, removeTheme, brandLogoBox, openKeyHelp, KEY_HELP,
  openBackup, buildBackup, parseBackup, restoreBackup, openRestore,
  openHistory, loadHistory, noteVersion, removeHistory, restoreVersion, thumbOf, projThumb, projList,
  restyleCanvas, renderCanvas,
  openClip, clipPlan, clipTotal, clipAt, clipPainter, makeGif, makeVideo, canRecordVideo, gifWriter, lzwWrite, medianCut, palMapper, gifFrameIndices
};

const errSeen = {};
function reportError(where, e) {
  const msg = (e && (e.stack || e.message)) || String(e);
  if (errSeen[msg]) return;
  errSeen[msg] = 1;
  try { console.error(where, e); } catch (_) { /* ignore */ }
  const text = where + '\n' + msg;
  const bar = h('div', { class: 'errbar', role: 'alert' },
    h('span', null, 'Что-то пошло не так. Работа не потеряна — сохраните её через «Экспорт».'),
    btn('copy', 'Скопировать ошибку', () => copyText(text), false, 'sm'),
    ibtn('close', 'Закрыть', () => bar.remove(), false, 'sm ghost'));
  document.body.appendChild(bar);
}
window.addEventListener('error', e => reportError('error', e.error || e.message));
window.addEventListener('unhandledrejection', e => reportError('promise', e.reason));

/* Сначала переносим старые презентации в IndexedDB, потом рисуем главный экран */
Promise.resolve().then(migrateToIdb).catch(() => { /* перенос не удался — покажем то, что есть */ }).then(loadPrefs).catch(() => { /* свои настройки не прочитались */ }).then(() => {
  try {
    renderHome();
  } catch (e) {
    reportError('startup', e);
    const root = $('#app');
    if (root) root.appendChild(h('p', { style: 'padding:24px' }, 'Не удалось запустить приложение. Обновите страницу.'));
  }
});
/* Присланная ссылка открывается сразу, переноса хранилища ей ждать незачем */
openShared();