
/* ---------- Элементы форм ---------- */
function sect(title) { return h('section', { class: 'insp-sec' }, title ? h('h3', null, title) : null, Array.prototype.slice.call(arguments, 1)); }
function fld(label, ctl, hint) { return h('div', { class: 'fld' }, h('span', { class: 'fld-l' }, label), ctl, hint ? h('small', null, hint) : null); }
function txt(value, onChange, opts) {
  opts = opts || {};
  const el = h(opts.multi ? 'textarea' : 'input', { class: 'inp', value: value || '', placeholder: opts.ph || null, rows: opts.rows || null, maxlength: opts.max || null, 'data-focus': opts.focus ? '1' : null });
  el.addEventListener('input', () => onChange(el.value));
  return el;
}
function rng(value, min, max, step, onChange, fmt) {
  const out = h('output', null, fmt ? fmt(+value) : String(value));
  const el = h('input', { type: 'range', min, max, step, value });
  el.addEventListener('input', () => { out.textContent = fmt ? fmt(+el.value) : el.value; onChange(+el.value); });
  return h('div', { class: 'rng' }, el, out);
}
function tog(checked, onChange, label) {
  const el = h('input', { type: 'checkbox', checked: !!checked });
  el.addEventListener('change', () => onChange(el.checked));
  return h('label', { class: 'tog' }, el, h('span', { class: 'tog-ui' }), h('span', null, label));
}
function seg(options, value, onChange) {
  const wrap = h('div', { class: 'seg', role: 'group' });
  options.forEach(([v, l]) => {
    const b = h('button', { type: 'button', class: v === value ? 'on' : '', 'aria-pressed': String(v === value) }, l);
    b.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
      onChange(v);
    });
    wrap.appendChild(b);
  });
  return wrap;
}
const SWATCHES = ['#ffffff', '#ffe066', '#ff8a1a', '#ff5a4e', '#d8453c', '#2456c7', '#4aa3ff', '#2fb67c', '#1f2a44', '#8a94a6'];
function colorPick(value, onChange, opts) {
  opts = opts || {};
  const wrap = h('div', { class: 'sw-row' });
  const custom = h('input', { type: 'color', class: 'sw-custom', value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff', title: 'Свой цвет' });
  const mark = v => wrap.querySelectorAll('.sw').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  const pick = v => { mark(v); onChange(v); };
  const swatch = (c, title) => h('button', { type: 'button', class: 'sw' + (String(value).toLowerCase() === c ? ' on' : ''), 'data-v': c, style: { background: c }, title: title || c, 'aria-label': 'Цвет ' + c, onclick: () => pick(c) });
  const draw = () => {
    wrap.textContent = '';
    (opts.tokens || []).forEach(([v, l, c]) => wrap.appendChild(h('button', { type: 'button', class: 'sw tk' + (value === v ? ' on' : ''), 'data-v': v, onclick: () => pick(v) }, c ? h('i', { style: { background: c } }) : null, l)));
    (opts.swatches || SWATCHES).forEach(c => wrap.appendChild(swatch(c)));
    /* мои цвета — те, что я сам добавил на этом устройстве */
    if (!opts.swatches) (Prefs.palette || []).forEach(c => wrap.appendChild(swatch(c, 'Мой цвет ' + c)));
    wrap.appendChild(custom);
    if (!opts.swatches) wrap.appendChild(h('button', {
      type: 'button', class: 'sw sw-add', title: 'Запомнить этот цвет в моих', 'aria-label': 'Запомнить цвет',
      onclick: () => { const v = custom.value; if (addPaletteColor(v)) draw(); pick(v); }
    }, '+'));
  };
  custom.addEventListener('input', () => { mark(''); onChange(custom.value); });
  draw();
  return wrap;
}
const live = (key, fn, parts) => v => commit(() => fn(v), { key, parts: parts || ['canvas'] });