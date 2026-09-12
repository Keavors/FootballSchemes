# «Установка» — выполнение всего плана (этапы 0–7)

Проект: исходники в `src/**`, сборка `npm run build` → `dist/ustanovka.html` и `dist/site/`.
Правки модулей пачкой: `node tools/apply.js <спец>` (формат — в самом файле).
Тесты: `npm test` (jsdom, 933 проверки).
Правило: править только `src/**`, всё проверять тестами.

Статусы: [ ] не начато · [~] в работе · [x] готово и проверено

## Этап 0 — дефекты
- [x] 0.1 бег по дуге стрелки
- [x] 0.2 мяч по дуге паса
- [x] 0.3 сохранение при уходе со страницы (pagehide/visibilitychange)
- [x] 0.4 конфликт двух вкладок (storage event)
- [x] 0.5 перестройка интерфейса при смене ширины (matchMedia change)
- [x] 0.6 подписи отражения по ориентации поля
- [x] 0.7 создание «Кольца вокруг игрока»
- [x] 0.8 пустой шаг отмены (commit с before без изменений)

## Этап 1 — выделение и буфер
- [x] 1.3 модель выделения на id: App.sel = {e:[], a:[], z:[], b:[], ball:false} | null
- [x] 1.1 рамка выделения
- [x] 1.2 быстрый выбор + Ctrl+A + инвертировать
- [x] 1.4 копировать/вырезать/вставить (App.clip + localStorage 'ustanovka-clip')
- [x] 1.5 вставить позиции (по id, затем по команде+подписи)
- [x] 1.6 вставить на то же место
- [x] 1.7 дублировать любое выделение
- [x] 1.8 копировать/вставить шаг и слайд
- [x] 1.9 формат по образцу (App.styleClip)
- [x] 1.10 панель действий + контекстное меню (правый клик / долгое нажатие)

## Этап 2 — поле
- [x] 2.1 масштаб/сдвиг (колесо, щипок, кнопки)
- [x] 2.2 призраки прошлого шага (bd.gG)
- [x] 2.3 направляющие и привязка
- [x] 2.4 тактическая сетка (board.grid)
- [x] 2.5 распределить, отразить вдоль, развернуть 180°, соперник зеркально
- [x] 2.6 замок (locked)
- [x] 2.7 порядок слоёв зон/стрелок
- [x] 2.8 стрелки клавиатуры для зон/надписей/мяча
- [x] 2.9 режим штампа
- [x] 2.10 линейка в метрах

## Этап 3 — анимация
- [x] 3.1 очерёдность внутри шага (f.ord[id], a.ord)
- [x] 3.2 пути с несколькими точками (a.pts)
- [x] 3.3 мяч верхом (a.lob)
- [x] 3.4 таймлайн: перетаскивание, миниатюры
- [x] 3.5 промежуточный шаг
- [x] 3.6 ползунок, проиграть отсюда, скорость
- [x] 3.7 несколько шагов сразу
- [x] 3.8 главы списком + зеркальная глава

## Этап 4 — слайды
- [x] 4.1 макет «две схемы» (board2)
- [x] 4.2 макет «роли»
- [x] 4.3 своя ориентация/часть поля у схемы (board.view)
- [x] 4.4 состав команды (project.roster, e.player)
- [x] 4.5 картинки на слайдах (нужно 7.5)
- [x] 4.6 список слайдов: перетаскивание, миниатюры
- [x] 4.7 заметки к слайду
- [x] 4.8 скрытый слайд
- [x] 4.9 шаблоны

## Этап 5 — показ
- [x] 5.1 рисование поверх схемы
- [x] 5.2 видео (WebM/MP4) + GIF
- [x] 5.3 PNG шага
- [x] 5.4 печать/PDF
- [x] 5.5 встроенные шрифты в экспорт
- [x] 5.6 режим докладчика
- [x] 5.7 скорость в показе, тап = шаг
- [x] 5.8 пауза-вопрос

## Этап 6 — настройки
- [x] 6.1 свои форматы и размеры в метрах
- [x] 6.2 свои типы стрелок
- [x] 6.3 свои расстановки
- [x] 6.4 своя палитра
- [x] 6.5 своя тема, эмблема, название команды
- [x] 6.6 справка по клавишам

## Этап 7 — надёжность
- [x] 7.1 резервная копия всех презентаций
- [x] 7.2 история версий
- [x] 7.3 главный экран: миниатюры, поиск, сортировка
- [x] 7.4 версия формата + миграции (p.v)
- [x] 7.5 IndexedDB + индикатор места
- [x] 7.6 обновление поля без пересборки

## Заметки по реализации
- Этап 0: engine quadAt/bendCtrl/moveBends/passBend, Board.moveAt; app commit сравнивает снимки; boardHoriz(), addRings(ids); блок «Надёжность редактора» перед errSeen (flushSave, storage-конфликт .updbar.conflict, matchMedia change). Тесты: tests/stage0.test.js (39), smoke (51).
- Этап 1 подход: одиночные выделения прежние (ent/arrow/zone/bubble/ball), плюс {t:"mix", ids, arrows, zones, bubbles, ball} по id; selParts/selFromParts.
- Этап 1: selParts/selFromParts/selCount, zoneCenterU; marquee (drag.kind marquee, partsInRect); pickObject/pickBall/pickAt; selectKind/selectAllOnFrame/invertSelection; буфер: CLIP_KEY, makeClip/pasteObjects/pastePositions/copySelection/pasteClipboard/duplicateSelection/clipRow; шаги-слайды: copyFrame/pasteFrameClip/copySlide/pasteSlideClip/openFrameMenu/openSlideMenu; menu()/closeMenu() + .pop; styleClip/copyStyle/applyStyleTo/styleRow; renderActionBar (.act-bar, часть refresh "bar"), openCanvasMenu/pasteAt, долгое нажатие в onDown. Тесты 1а–1е: 112 проверок.
- Этап 2: Board.setView/drawGrid/after, App.zoom/onion/snap/measure; applyZoom/setZoom/zoomAt/resetZoom/renderZoomBar (.zoom-bar), ptrs/gest щипок; drawGhosts (bd.gG), drawGuides+snapDelta, drawMeasure/measureText/measurePoint/keepMeasure; distributeEntities/mirrorEntities/rotateFrame180/mirrorOpponents/reorderItem/nudgeSelection; замок e.locked и z.locked; штамп (tool m=stamp, addEntity opts.at/keepTool); FORMATS.m + pitchMeters + настройки длины/ширины в метрах. Тесты 2а–2д: 97 проверок.
- Этап 3: engine frameOrders (f.ord, a.ord), Board.after/scrubTo, drawArrows(delayFn)+a.pts (smoothPath/pathAt/pathLength), setBall(arrow) c a.lob, moveBends→стрелка; app entOrder/setEntOrder/framePhases/autoOrderFrame, frameThumb/tlDown-tlMove-tlUp/moveFrameTo, insertMidFrame, scrubEditor/scrubDone/playFrom/editorSpeed, frameSel (toggleFrameSel/copyFrames/pasteFramesClip/deleteFrames/moveFrames), главы: mirrorPairs/mirrorCaption/mirrorFrames/chapterList/dupChapter/delChapter/moveChapter/openChapters. Тесты 3а–3д: 90 проверок.

## Итог

Все этапы плана (0–7) сделаны и закрыты тестами: `npm test` — 933 проверки, 0 падений.

## Пример «Маятник» по тактике команды (2026-09-13)

- Без мяча 4-2-1 (средний блок, принцип маятника, ловушки), с мячом 3-3-1.
- В атаке четверо: латераль фланга отбора по флангу, полузащитник на ближнюю, нападающий на дальнюю, второй полузащитник на подборе. Сзади всегда трое.
- Позиционная атака: «Держим!», 3-3-1, «Меняемся!», розыгрыш от вратаря, три хода к удару, потеря и «Домой!».
- Роли по позициям: без мяча / в контратаке / в позиционной атаке / что нужно. 19 слайдов, 13 схем.
- Файл для команды: `mayatnik-taktika-8x8.html` (`npm run sample`), логику и совпадение файла с примером проверяет `tests/sample.test.js`.
