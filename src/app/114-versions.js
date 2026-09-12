
/* ---------- История версий ---------- */
function versionSize(v) {
  const kb = (v.data || '').length / 1024;
  return kb > 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(kb)) + ' КБ';
}
function versionWhen(t) {
  const d = new Date(+t || Date.now());
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
/* Вернуть старую версию: перед этим нынешнюю тоже кладём в историю, чтобы откат можно было отменить */
async function restoreVersion(id, t, after) {
  const list = await loadHistory(id);
  const v = list.find(x => x.t === t);
  if (!v) { toast('Эта версия уже не хранится'); return; }
  let p = null;
  try { p = TE.normalizeProject(JSON.parse(v.data)); } catch (e) { p = null; }
  if (!p) { toast('Версия не читается'); return; }
  const cur = await loadProject(id);
  if (cur) await noteVersion(cur, true);
  p.id = id;
  p.updated = Date.now();
  const ok = await saveProject(p);
  if (!ok) { toast('Не получилось записать презентацию'); return; }
  toast('Вернулись к версии от ' + versionWhen(t));
  if (after) after(p);
}
function openHistory(id, after) {
  const body = h('div');
  let close;
  const draw = async () => {
    body.textContent = '';
    const list = await loadHistory(id);
    const cur = App.project && App.project.id === id ? App.project : null;
    appendAll(body,
      h('p', { class: 'muted small' }, 'Приложение само откладывает копию раз в несколько минут работы. Здесь можно вернуться к любой из них — нынешняя версия при этом тоже сохранится.'),
      h('div', { class: 'btn-row' },
        btn('check', 'Отложить копию сейчас', async () => {
          const p = cur || await loadProject(id);
          if (!p) { toast('Презентация не открылась'); return; }
          const done = await noteVersion(p, true);
          toast(done ? 'Копия отложена' : 'Эта версия уже есть в истории');
          draw();
        }, false, 'sm primary'),
        list.length ? btn('trash', 'Очистить историю', () => confirmBox('Убрать все отложенные копии этой презентации?', 'Очистить', async () => {
          await removeHistory(id);
          draw();
        }), false, 'sm danger') : null),
      list.length
        ? h('div', null, list.map(v => h('div', { class: 'mine-row' },
          h('b', null, versionWhen(v.t)),
          h('span', { class: 'muted small' }, `${v.slides} ${plural(v.slides, 'слайд', 'слайда', 'слайдов')} · ${versionSize(v)}`),
          btn('undo', 'Вернуть', () => confirmBox(`Вернуть презентацию к версии от ${versionWhen(v.t)}? Нынешняя версия останется в истории.`, 'Вернуть', async () => {
            close();
            await restoreVersion(id, v.t, after);
          }), false, 'sm'))))
        : h('p', { class: 'muted small' }, 'Пока копий нет — они появятся, когда поработаете над презентацией.'));
  };
  close = modal('История версий', body, { wide: true });
  draw();
}
