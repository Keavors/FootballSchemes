
/* ---------- Резервная копия всех презентаций ---------- */
const BACKUP_KIND = 'ustanovka-backup';
function backupName() {
  const d = new Date(), p = n => ('0' + n).slice(-2);
  return `ustanovka-kopiya-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}
/* Собираем всё, что хранится на этом устройстве: презентации и мои настройки */
async function buildBackup() {
  const list = await loadIndex();
  const projects = [];
  for (let i = 0; i < list.length; i++) {
    const p = await loadProject(list[i].id);
    if (p) projects.push(p);
  }
  return { kind: BACKUP_KIND, v: TE.FORMAT_V, made: Date.now(), prefs: clone(Prefs), projects };
}
function parseBackup(text) {
  let data = null;
  try { data = JSON.parse(text); } catch (e) { return null; }
  if (!data || data.kind !== BACKUP_KIND || !Array.isArray(data.projects)) return null;
  return data;
}
/* Возвращаем презентации на место: либо поверх старых, либо рядом копиями */
async function restoreBackup(data, mode, withPrefs) {
  const list = await loadIndex();
  const have = {};
  list.forEach(x => { have[x.id] = 1; });
  const out = { added: 0, replaced: 0, skipped: 0 };
  for (let i = 0; i < data.projects.length; i++) {
    const raw = data.projects[i];
    /* мусор в копии пропускаем: пустые «презентации» в списке никому не нужны */
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.slides)) { out.skipped++; continue; }
    let p = null;
    try { p = TE.normalizeProject(clone(raw)); } catch (e) { p = null; }
    if (!p) { out.skipped++; continue; }
    const known = !!have[p.id];
    if (known && mode === 'copy') {
      p.id = uid();
      p.title = (p.title || 'Презентация') + ' (из копии)';
    }
    p.updated = +p.updated || Date.now();
    const ok = await saveProject(p);
    if (!ok) { out.skipped++; continue; }
    if (known && mode === 'replace') out.replaced++; else out.added++;
    have[p.id] = 1;
  }
  if (withPrefs && data.prefs && typeof data.prefs === 'object') {
    PREFS_LISTS.forEach(k => {
      const inc = Array.isArray(data.prefs[k]) ? data.prefs[k] : [];
      if (!Array.isArray(Prefs[k])) Prefs[k] = [];
      if (k === 'palette') {
        inc.forEach(c => { if (Prefs.palette.indexOf(c) < 0) Prefs.palette.push(c); });
        Prefs.palette = Prefs.palette.slice(0, 14);
      } else {
        const seen = {};
        Prefs[k].forEach(x => { if (x && x.id) seen[x.id] = 1; });
        inc.forEach(x => { if (x && x.id && !seen[x.id]) { seen[x.id] = 1; Prefs[k].push(x); } });
      }
    });
    savePrefs();
  }
  return out;
}
function openRestore(data, afterAll) {
  let mode = 'replace', withPrefs = true;
  const when = new Date(+data.made || Date.now());
  const n = data.projects.length;
  const close = modal('Восстановить из копии', [
    h('p', null, `В копии ${n} ${plural(n, 'презентация', 'презентации', 'презентаций')}. Сделана ${when.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}.`),
    +data.v > TE.FORMAT_V ? h('p', { class: 'muted small' }, 'Копия сделана в более новой версии «Установки» — что-то может открыться не полностью.') : null,
    fld('Если такая презентация уже есть', seg([['replace', 'Заменить её'], ['copy', 'Добавить рядом копией']], mode, v => { mode = v; })),
    tog(withPrefs, v => { withPrefs = v; }, 'Вернуть и мои настройки: форматы, стрелки, расстановки, цвета'),
    h('p', { class: 'muted small' }, 'Презентации, которых нет в копии, останутся на месте — ничего не удаляется.'),
    h('div', { class: 'btn-row' }, btn('check', 'Восстановить', async () => {
      close();
      const res = await restoreBackup(data, mode, withPrefs);
      const parts = [];
      if (res.added) parts.push(`добавлено ${res.added}`);
      if (res.replaced) parts.push(`заменено ${res.replaced}`);
      if (res.skipped) parts.push(`пропущено ${res.skipped}`);
      toast('Готово: ' + (parts.join(', ') || 'ничего не изменилось'));
      if (afterAll) afterAll();
    }, false, 'primary'))
  ]);
}
function openBackup(afterAll) {
  const info = h('p', { class: 'muted small' }, 'Один файл со всеми презентациями и моими настройками. Положите его в облако или на почту — и работа не пропадёт даже с новым телефоном.');
  const fileIn = h('input', { type: 'file', accept: '.json,application/json' });
  fileIn.addEventListener('change', () => {
    const f = fileIn.files && fileIn.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const data = parseBackup(String(r.result || ''));
      if (!data) { toast('Это не похоже на резервную копию «Установки»'); return; }
      close();
      openRestore(data, afterAll);
    };
    r.onerror = () => toast('Не получилось прочитать файл');
    r.readAsText(f);
  });
  const close = modal('Резервная копия', [
    h('div', { class: 'exp-card' },
      h('h3', null, 'Сохранить копию'),
      info,
      h('div', { class: 'btn-row' }, btn('download', 'Сохранить копию', async () => {
        const data = await buildBackup();
        if (!data.projects.length) { toast('Сохранять пока нечего — нет ни одной презентации'); return; }
        download(backupName(), JSON.stringify(data), 'application/json');
      }, false, 'primary'))),
    h('div', { class: 'exp-card' },
      h('h3', null, 'Вернуть из копии'),
      h('p', { class: 'muted small' }, 'Выберите файл копии — покажу, что в нём, и спрошу, как восстанавливать.'),
      h('div', { class: 'btn-row' }, h('label', { class: 'btn file-btn' }, icon('upload'), h('span', { class: 'lbl' }, 'Выбрать файл копии'), fileIn)))
  ]);
}
