
/* ---------- Текст: лёгкая разметка ---------- */
function inline(s) {
  let t = esc(s);
  t = t.replace(/!!([^!\n]+?!?)!!/g, '<span class="te-shout">$1</span>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  t = t.replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<i>$2</i>');
  t = t.replace(/\{(#[0-9a-fA-F]{3,8})\s+([^{}]+)\}/g, '<span style="color:$1">$2</span>');
  return t;
}
function plain(s) {
  return String(s || '').replace(/\*\*|!!|\*/g, '').replace(/\{#[0-9a-fA-F]{3,8}\s+([^{}]+)\}/g, '$1');
}
const RX_BLOCK = /^(#{1,3}\s|\s*[-*•]\s|\s*\d+[.)]\s|\s*>)/;
function mdBlock(src) {
  const lines = src.split('\n');
  let out = '', i = 0;
  while (i < lines.length) {
    const L = lines[i];
    if (!L.trim()) { i++; continue; }
    let m;
    if ((m = L.match(/^#{1,3}\s+(.*)$/))) { out += `<h3>${inline(m[1])}</h3>`; i++; continue; }
    if (/^\s*[-*•]\s+/.test(L)) {
      let items = '';
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) { items += `<li>${inline(lines[i].replace(/^\s*[-*•]\s+/, ''))}</li>`; i++; }
      out += `<ul class="te-list">${items}</ul>`; continue;
    }
    if (/^\s*\d+[.)]\s+/.test(L)) {
      let items = '';
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items += `<li><span>${inline(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</span></li>`; i++; }
      out += `<ol class="te-steps">${items}</ol>`; continue;
    }
    if (/^\s*>/.test(L)) {
      const t = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { t.push(inline(lines[i].replace(/^\s*>\s?/, ''))); i++; }
      out += `<p class="te-callout">${t.join('<br>')}</p>`; continue;
    }
    if (L.indexOf('::') >= 0) {
      let rows = '';
      while (i < lines.length && lines[i].trim() && lines[i].indexOf('::') >= 0) {
        const parts = lines[i].split('::');
        rows += `<div><dt>${inline(parts[0].trim())}</dt><dd>${inline(parts.slice(1).join('::').trim())}</dd></div>`;
        i++;
      }
      out += `<dl class="te-dl">${rows}</dl>`; continue;
    }
    const t = [];
    while (i < lines.length && lines[i].trim() && !RX_BLOCK.test(lines[i]) && lines[i].indexOf('::') < 0) { t.push(inline(lines[i])); i++; }
    if (!t.length) { t.push(inline(lines[i])); i++; }
    out += `<p>${t.join('<br>')}</p>`;
  }
  return out;
}
function md(text) {
  const src = String(text || '').replace(/\r/g, '');
  const cols = src.split(/^\s*\|\|\s*$/m);
  if (cols.length > 1) return '<div class="te-cols">' + cols.map(c => '<div>' + mdBlock(c) + '</div>').join('') + '</div>';
  return mdBlock(src);
}

/* ---------- Главы ---------- */
function computeChapters(frames) {
  const idx = [];
  frames.forEach((f, i) => { if (i === 0 || (f.chapter && f.chapter.trim())) idx.push(i); });
  if (idx.length <= 1) return null;
  return idx.map((from, k) => ({
    name: (frames[from].chapter || '').trim() || 'Часть ' + (k + 1),
    from,
    to: k + 1 < idx.length ? idx[k + 1] - 1 : frames.length - 1
  }));
}