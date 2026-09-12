
/* ---------- Окна ---------- */
function modal(title, content, opts) {
  opts = opts || {};
  const prevFocus = document.activeElement;
  const ov = h('div', { class: 'modal-ov' });
  const box = h('div', { class: 'modal' + (opts.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h2', null, title), ibtn('close', 'Закрыть', () => close(), false, 'ghost')),
    h('div', { class: 'modal-body' }, content));
  ov.appendChild(box);
  ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
  document.body.appendChild(ov);
  const onEsc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onEsc, true);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onEsc, true);
    ov.remove();
    if (opts.onClose) opts.onClose();
    if (prevFocus && prevFocus.focus && prevFocus.isConnected) prevFocus.focus();
  }
  if (!isMobile()) setTimeout(() => { const f = box.querySelector('.modal-body input, .modal-body textarea, .modal-body button'); if (f) f.focus(); }, 30);
  return close;
}
function confirmBox(text, okLabel, onOk) {
  const close = modal('Подтвердите', [h('p', null, text), h('div', { class: 'btn-row' },
    btn('', okLabel, () => { close(); onOk(); }, false, 'primary'),
    btn('', 'Отмена', () => close()))]);
}

/* ---------- Расстановка ---------- */
function openFormation() {
  if (!board()) return;
  const fmt = App.project.settings.format;
  const st = { team: 'ours', format: fmt, code: defaultFormationFor(fmt), height: 0.5, width: 0.5, scope: 'this', relabel: true, gk: true };
  const body = h('div');
  let close;
  const draw = () => {
    body.textContent = '';
    const codes = formationsFor(st.format);
    if (codes.indexOf(st.code) < 0) st.code = codes[0];
    const custom = h('input', { class: 'inp', value: st.code, placeholder: 'Например 4-2-1', maxlength: 12 });
    custom.addEventListener('input', () => { if (/^\d+(-\d+)*$/.test(custom.value)) st.code = custom.value; });
    appendAll(body, 
      fld('Команда', seg([['ours', 'Наши'], ['opp', 'Соперник'], ['third', 'Нейтральные']], st.team, v => { st.team = v; })),
      fld('Формат', seg(formatChoices(), st.format, v => { st.format = v; draw(); })),
      fld('Схема', seg(codes.map(c => [c, c]), st.code, v => { st.code = v; custom.value = v; })),
      fld('Или своя схема по линиям, от защиты', custom),
      (Prefs.formations || []).length ? fld('Мои расстановки', h('div', { class: 'sw-row' },
        (Prefs.formations || []).map(it => h('button', {
          type: 'button', class: 'sw tk mine', title: `${it.n} ${plural(it.n, 'игрок', 'игрока', 'игроков')}`,
          onclick: () => { close(); applyFormation(Object.assign({}, st, { spots: it.spots, savedTeam: it.team })); }
        }, it.name))), 'Нажмите — игроки встанут так же') : null,
      fld('Высота блока', rng(st.height, 0, 1, 0.05, v => { st.height = v; }, v => (v < 0.34 ? 'низко' : v > 0.66 ? 'высоко' : 'средне'))),
      fld('Ширина', rng(st.width, 0, 1, 0.05, v => { st.width = v; }, v => (v < 0.34 ? 'узко' : v > 0.66 ? 'широко' : 'обычно'))),
      fld('Применить', seg([['this', 'К этому шагу'], ['all', 'Ко всем шагам']], st.scope, v => { st.scope = v; })),
      tog(st.gk, v => { st.gk = v; }, 'С вратарём'),
      tog(st.relabel, v => { st.relabel = v; }, 'Подписать позиции (ЛЗ, ЦП, Н…)'),
      h('div', { class: 'btn-row' },
        btn('check', 'Расставить', () => { close(); applyFormation(st); }, false, 'primary'),
        btn('', 'Запомнить расстановку с поля', () => saveBoardFormation(st.team, draw), false, 'sm', 'Сохранить, как игроки стоят сейчас'),
        (Prefs.formations || []).length ? btn('trash', 'Убрать мои', () => {
          const last = (Prefs.formations || [])[Prefs.formations.length - 1];
          if (last) removeFormation(last.id, draw);
        }, false, 'sm danger', 'Убрать последнюю сохранённую') : null));
  };
  draw();
  close = modal('Расстановка', body);
}
function applyFormation(o) {
  commit(() => {
    const b = board(), kind = o.team;
    let spots;
    if (o.spots && o.spots.length) {
      /* своя расстановка: если сохранили за другую команду — зеркалим */
      const savedOpp = o.savedTeam === 'opp', wantOpp = kind === 'opp';
      spots = clone(o.spots);
      if (savedOpp !== wantOpp) spots = mirrorSpots(spots);
    } else {
      spots = formation(o.code, { team: kind === 'opp' ? 'opp' : 'ours', height: o.height, width: o.width });
    }
    if (!o.gk) spots = spots.filter(s => !s.gk);
    const mine = b.entities.filter(e => e.kind === kind);
    const keeper = mine.find(e => e.gk), field = mine.filter(e => !e.gk);
    const ordered = [], used = {};
    const make = gk => { const e = { id: uid(), kind, label: '', number: '', gk }; b.entities.push(e); return e; };
    /* Своя расстановка возвращает каждого на его место: сначала ищем по подписи и номеру */
    const take = sp => {
      const free = test => field.find(e => !used[e.id] && test(e));
      let e = null;
      if (o.spots) {
        e = (sp.label && free(x => (x.label || '').toLowerCase() === String(sp.label).toLowerCase()))
          || (sp.number && free(x => String(x.number) === String(sp.number))) || null;
      }
      if (!e) e = free(() => true) || make(false);
      used[e.id] = 1;
      return e;
    };
    spots.forEach(sp => { ordered.push(sp.gk ? (keeper || make(true)) : take(sp)); });
    const extras = field.filter(e => !used[e.id]);
    ordered.forEach((e, k) => { if (o.relabel || (!e.label && !e.number)) { e.label = kind === 'ours' || o.relabel ? spots[k].label : ''; e.number = spots[k].number; } });
    const frames = o.scope === 'all' ? b.frames : [frame()];
    b.frames.forEach(f => {
      const inScope = frames.indexOf(f) >= 0;
      ordered.forEach((e, k) => {
        if (inScope) f.pos[e.id] = [spots[k].x, spots[k].y];
        else if (!(e.id in f.pos)) f.pos[e.id] = null;
      });
      if (inScope) extras.forEach(e => { f.pos[e.id] = null; });
    });
    App.sel = null;
  }, { parts: ['canvas', 'insp'] });
  toast('Игроки расставлены');
}

/* ---------- Настройки презентации ---------- */
function openSettings() {
  const tabs = [['pitch', 'Поле'], ['teams', 'Команды'], ['roster', 'Состав'], ['arrows', 'Стрелки'], ['look', 'Оформление'], ['legend', 'Легенда']];
  let cur = 'pitch';
  const holder = h('div');
  const set = (path, parts) => v => commit(p => {
    const keys = path.split('.');
    let o = p.settings;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = v;
  }, { key: 'set:' + path, parts: parts || ['style'] });
  const S = () => App.project.settings;
  const draw = () => {
    holder.textContent = '';
    const st = S();
    if (cur === 'pitch') {
      appendAll(holder, h('div', { class: 'set-grid' },
        fld('Формат', seg(formatChoices(), st.format, v => { applyFormat(v); draw(); })),
        fld('Свой размер поля', h('div', { class: 'btn-row' },
          btn('plus', 'Новый формат', () => openFormatEditor(null, f => { if (f) applyFormat(f.id); draw(); }), false, 'sm'),
          fmtObj(st.format) && fmtObj(st.format).custom
            ? btn('', 'Изменить «' + fmtObj(st.format).name + '»', () => openFormatEditor(fmtObj(st.format), f => { if (f) applyFormat(f.id); draw(); }), false, 'sm')
            : null), 'Свои размеры уезжают вместе с презентацией'),
        fld('Ориентация', seg([['vertical', 'Вертикально'], ['horizontal', 'Горизонтально']], st.pitch.orientation, set('pitch.orientation', ['style', 'insp']))),
        fld('Какую часть поля показывать', seg([['full', 'Всё поле'], ['attack', 'Половина атаки'], ['defence', 'Своя половина']], st.pitch.view, set('pitch.view'))),
        fld('Пропорции поля', rng(st.pitch.ratio || TE.formatOf(st).ratio, 1.2, 2.2, 0.02, set('pitch.ratio'), v => '1 : ' + v.toFixed(2)), 'Длина к ширине'),
        fld('Длина поля, м', rng(TE.pitchMeters(st)[0], 25, 120, 1, set('pitch.lengthM', []), v => v + ' м'), 'Нужно для линейки'),
        fld('Ширина поля, м', rng(TE.pitchMeters(st)[1], 15, 80, 1, set('pitch.widthM', []), v => v + ' м')),
        tog(st.pitch.stripes, set('pitch.stripes'), 'Полосы на газоне'),
        tog(st.pitch.markings, set('pitch.markings'), 'Разметка поля')),
      fld('Стиль поля', h('div', { class: 'btn-row' }, PITCH_PRESETS.map(pr => btn('', pr.name, () => { commit(p => Object.assign(p.settings.pitch, pr.v), { parts: ['style'] }); draw(); }, false, 'sm')))),
      h('div', { class: 'set-grid' },
        fld('Газон', colorPick(st.pitch.grass, set('pitch.grass'))),
        fld('Вторая полоса', colorPick(st.pitch.grass2, set('pitch.grass2'))),
        fld('За полем', colorPick(st.pitch.surround, set('pitch.surround'))),
        fld('Линии разметки', colorPick(st.pitch.lines, set('pitch.lines')))));
    } else if (cur === 'teams') {
      const team = (k, name) => h('div', { class: 'exp-card' }, h('h3', null, name), h('div', { class: 'set-grid' },
        fld('Цвет фишек', colorPick(st.colors[k], set('colors.' + k))),
        fld('Цвет подписи', colorPick(st.colors[k + 'Text'], set('colors.' + k + 'Text'), { swatches: ['#ffffff', '#1f2a44', '#ffe066'] })),
        fld('Вратарь', colorPick(st.colors[k + 'Keeper'], set('colors.' + k + 'Keeper'))),
        fld('Подпись вратаря', colorPick(st.colors[k + 'KeeperText'], set('colors.' + k + 'KeeperText'), { swatches: ['#ffffff', '#1f2a44'] })),
        fld('На фишках', seg([['label', 'Позиция'], ['number', 'Номер'], ['none', 'Ничего']], st.tokens[k + 'Label'], set('tokens.' + k + 'Label'))),
        fld('Форма', seg([['circle', 'Круг'], ['square', 'Квадрат'], ['triangle', 'Треугольник'], ['diamond', 'Ромб'], ['shirt', 'Футболка']], st.tokens[k + 'Shape'], set('tokens.' + k + 'Shape'))),
        fld('Размер', rng(st.tokens[k + 'Size'], 0.5, 1.8, 0.05, set('tokens.' + k + 'Size'), v => Math.round(v * 100) + '%'))));
      appendAll(holder, team('ours', 'Наши'), team('opp', 'Соперник'), team('third', 'Нейтральные'),
        h('div', { class: 'exp-card' }, h('h3', null, 'Выделение'), h('p', { class: 'muted small' }, 'Этим цветом подсвечивается ключевой игрок шага — например, маятник.'),
          h('div', { class: 'set-grid' },
            fld('Цвет', colorPick(st.colors.special, set('colors.special'))),
            fld('Цвет подписи', colorPick(st.colors.specialText, set('colors.specialText'), { swatches: ['#1f2a44', '#ffffff'] })))));
    } else if (cur === 'roster') {
      const p = App.project;
      appendAll(holder,
        tog(st.tokens.showNames, set('tokens.showNames', ['canvas']), 'Показывать имена под фишками'),
        h('p', { class: 'muted small' }, 'Состав нужен, чтобы подписать фишки фамилиями. Поменяли человека здесь — обновится на всех слайдах.'),
        h('div', null, (p.roster || []).map((r, ri) => h('div', { class: 'exp-card' },
          h('div', { class: 'set-grid' },
            fld('Имя или фамилия', txt(r.name, v => commit(q => { q.roster[ri].name = v; }, { key: 'rn' + r.id, parts: ['canvas'] }), { max: 24, ph: 'Петров' })),
            fld('Номер', txt(r.number, v => commit(q => { q.roster[ri].number = v; }, { key: 'rnum' + r.id, parts: ['canvas'] }), { max: 3, ph: '7' })),
            fld('Позиция', txt(r.pos, v => commit(q => { q.roster[ri].pos = v; }, { key: 'rp' + r.id, parts: [] }), { max: 12, ph: 'ЛЗ' }))),
          h('div', { class: 'btn-row' }, btn('trash', 'Убрать из состава', () => {
            commit(q => {
              const gone = q.roster[ri].id;
              q.roster.splice(ri, 1);
              q.slides.forEach(s => [s.board, s.board2].forEach(b => b && b.entities.forEach(x => { if (x.player === gone) delete x.player; })));
            }, { parts: ['canvas'] });
            draw();
          }, false, 'sm danger'))))),
        h('div', { class: 'btn-row' }, btn('plus', 'Добавить игрока', () => {
          commit(q => { q.roster.push({ id: uid(), name: '', number: String(q.roster.length + 1), pos: '' }); }, { parts: [] });
          draw();
        }, false, 'primary')));
    } else if (cur === 'arrows') {
      appendAll(holder, h('div', { class: 'set-grid' },
        fld('Бег наших', colorPick(st.colors.run, set('colors.run'))),
        fld('Пас и удар', colorPick(st.colors.pass, set('colors.pass'))),
        fld('Действия соперника', colorPick(st.colors.oppArrow, set('colors.oppArrow'))),
        fld('Мяч', colorPick(st.colors.ball, set('colors.ball'), { swatches: ['#ffffff', '#ffe066', '#ff8a1a'] })),
        fld('Скорость анимации', rng(st.anim.speed, 0.4, 2.5, 0.05, set('anim.speed', []), v => '×' + v.toFixed(2))),
        tog(st.anim.autoplay, set('anim.autoplay', []), 'Разрешить автозапуск схем при показе')),
      h('p', { class: 'muted small' }, 'У каждой стрелки можно выбрать свой цвет — эти значения используются по умолчанию.'),
      h('div', { class: 'exp-card' },
        h('h3', null, 'Мои типы стрелок'),
        h('p', { class: 'muted small' }, 'Выделите стрелку на схеме и нажмите «Сохранить как свой тип» — она появится здесь и в панели инструментов на всех презентациях этого устройства.'),
        (Prefs.arrows || []).length
          ? h('div', null, (Prefs.arrows || []).map(a => h('div', { class: 'mine-row' },
            h('b', null, a.name),
            h('span', { class: 'muted small' }, (a.move ? 'перемещение' : 'линия') + (a.ball ? ', с мячом' : '')),
            btn('', 'Переименовать', () => askName('Название типа', a.name, n => { a.name = n; savePrefs(); draw(); }), false, 'sm'),
            btn('trash', 'Убрать', () => { removeArrowType(a.id); draw(); }, false, 'sm danger'))))
          : h('p', { class: 'muted small' }, 'Пока своих типов нет.')));
    } else if (cur === 'look') {
      appendAll(holder, h('div', { class: 'set-grid' },
        fld('Тема показа', seg([['board', 'Доска'], ['paper', 'Белая'], ['night', 'Ночная']], st.look.theme, set('look.theme', []))),
        fld('Шрифты', seg([['sport', 'Спортивные'], ['bold', 'Жирные'], ['clean', 'Строгие']], st.look.font, set('look.font', []))),
        fld('Акцентный цвет', colorPick(st.look.accent, set('look.accent', [])), 'Прогресс, выделение текста, команды голосом')),
      h('div', { class: 'exp-card' },
        h('h3', null, 'Команда и эмблема'),
        fld('Название команды', txt(st.brand.team, set('brand.team', ['main']), { max: 40, ph: 'ФК Молния' }), 'Видно на титульном слайде'),
        brandLogoBox(draw)),
      h('div', { class: 'exp-card' },
        h('h3', null, 'Моё оформление'),
        h('p', { class: 'muted small' }, 'Сохраните цвета, шрифты и вид фишек — и применяйте одним нажатием в любой презентации на этом устройстве.'),
        (Prefs.themes || []).length
          ? h('div', null, (Prefs.themes || []).map(it => h('div', { class: 'mine-row' },
            h('b', null, it.name),
            btn('check', 'Применить', () => { applyTheme(it); draw(); }, false, 'sm'),
            btn('trash', 'Убрать', () => removeTheme(it.id, draw), false, 'sm danger'))))
          : h('p', { class: 'muted small' }, 'Пока сохранённого оформления нет.'),
        h('div', { class: 'btn-row' }, btn('', 'Сохранить текущее оформление', () => saveTheme(draw), false, 'sm primary'))),
      h('div', { class: 'exp-card' },
        h('h3', null, 'Мои цвета'),
        h('p', { class: 'muted small' }, 'Цвета, которые вы добавили кнопкой «+» в любом выборе цвета. Они сохраняются на этом устройстве.'),
        (Prefs.palette || []).length
          ? h('div', { class: 'sw-row' }, (Prefs.palette || []).map(c => h('button', {
            type: 'button', class: 'sw', 'data-v': c, style: { background: c }, title: 'Убрать цвет ' + c, 'aria-label': 'Убрать цвет ' + c,
            onclick: () => { removePaletteColor(c); draw(); }
          }))) : h('p', { class: 'muted small' }, 'Пока своих цветов нет.'),
        (Prefs.palette || []).length ? h('p', { class: 'muted small' }, 'Нажмите на цвет, чтобы убрать его из моих.') : null),
      h('div', { class: 'btn-row' }, btn('play', 'Посмотреть, как выглядит', () => openPreview(App.slideIdx), false, 'primary')));
    } else if (cur === 'legend') {
      appendAll(holder, tog(st.legend.show, set('legend.show', []), 'Показывать легенду над схемами'),
        h('p', { class: 'muted small' }, 'Пункт появляется, только если на схеме есть такой объект. Пустое поле — пункт скрыт.'),
        h('div', { class: 'set-grid' },
          fld('Наши', txt(st.legend.ours, set('legend.ours', []), { max: 24 })),
          fld('Выделение', txt(st.legend.special, set('legend.special', []), { max: 24, ph: 'маятник' })),
          fld('Соперник', txt(st.legend.opp, set('legend.opp', []), { max: 24 })),
          fld('Нейтральные', txt(st.legend.third, set('legend.third', []), { max: 24 })),
          fld('Пас', txt(st.legend.pass, set('legend.pass', []), { max: 24 })),
          fld('Бег', txt(st.legend.run, set('legend.run', []), { max: 24 })),
          fld('Направление атаки', txt(st.legend.dir === 'auto' ? '' : st.legend.dir, v => set('legend.dir', [])(v.trim() ? v : 'auto'), { max: 32, ph: 'Авто: «атакуем вверх ↑»' }))));
    }
  };
  const tabBar = seg(tabs, cur, v => { cur = v; draw(); });
  draw();
  modal('Настройки презентации', [tabBar, h('div', { style: 'height:12px' }), holder], { wide: true, onClose: () => refresh() });
}