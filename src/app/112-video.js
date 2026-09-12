
/* ---------- Ролик со схемой: видео и GIF ---------- */
/* Раскадровка: из чего состоит ролик и сколько длится каждый кусочек */
function clipPlan(bd) {
  const plan = [];
  const cap = i => TE.plain((bd.F[i] && bd.F[i].cap) || '');
  plan.push({ i: 0, k0: 0, k1: 0, ms: 1200, cap: cap(0) });
  for (let i = 1; i < bd.n; i++) {
    if (bd.isChapterStart(i)) plan.push({ i, k0: 0, k1: 0, ms: 500, cap: cap(i) });
    else plan.push({ i: i - 1, k0: 0, k1: 1, ms: bd.stepMs(i), cap: cap(i) });
    plan.push({ i, k0: 0, k1: 0, ms: Math.min(bd.holdMs(i), 2600), cap: cap(i) });
  }
  return plan;
}
function clipTotal(plan) { return plan.reduce((s, p) => s + p.ms, 0); }
/* Что показывать на миллисекунде t */
function clipAt(bd, plan, t) {
  let acc = 0;
  for (let n = 0; n < plan.length; n++) {
    const p = plan[n];
    if (t < acc + p.ms || n === plan.length - 1) {
      const part = p.ms > 0 ? Math.min(1, Math.max(0, (t - acc) / p.ms)) : 0;
      bd.scrubTo(p.i, p.k0 + (p.k1 - p.k0) * part);
      return p;
    }
    acc += p.ms;
  }
  return plan[plan.length - 1];
}

/* Схему рисуем в холст: сначала картинка из SVG, потом полоса с подписью */
function clipPainter(bd, opts) {
  const vb = (bd.svg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
  const w = Math.max(160, Math.round(opts.width / 2) * 2);
  const boardH = Math.round(w * (vb[3] / vb[2]) / 2) * 2;
  const capH = opts.caps ? Math.round(w * 0.085 / 2) * 2 : 0;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = boardH + capH;
  const ctx = canvas.getContext && canvas.getContext('2d');
  const cssText = ($('#te-css') || {}).textContent || '';
  const NS = 'http://www.w3.org/2000/svg';
  function xml() {
    const clone = bd.svg.cloneNode(true);
    if (cssText) {
      const st = document.createElementNS(NS, 'style');
      st.textContent = cssText;
      clone.insertBefore(st, clone.firstChild);
    }
    clone.setAttribute('width', w);
    clone.setAttribute('height', boardH);
    return new XMLSerializer().serializeToString(clone);
  }
  function paint(cap) {
    return new Promise(res => {
      if (!ctx || typeof Image !== 'function' || typeof XMLSerializer !== 'function') { res(false); return; }
      const img = new Image();
      img.onload = () => {
        try {
          ctx.fillStyle = '#0f1a14';
          ctx.fillRect(0, 0, w, boardH + capH);
          ctx.drawImage(img, 0, 0, w, boardH);
          if (capH) {
            ctx.fillStyle = '#101a15';
            ctx.fillRect(0, boardH, w, capH);
            ctx.fillStyle = '#eaf2ec';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '600 ' + Math.round(capH * 0.44) + 'px system-ui, Segoe UI, Arial, sans-serif';
            ctx.fillText(cap || '', w / 2, boardH + capH / 2, w - 24);
          }
          res(true);
        } catch (e) { res(false); }
      };
      img.onerror = () => res(false);
      try { img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml()); } catch (e) { res(false); }
    });
  }
  return { canvas, ctx, width: w, height: boardH + capH, paint };
}

/* ---------- Видео ---------- */
function videoType() {
  if (typeof MediaRecorder !== 'function') return '';
  const list = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  for (let i = 0; i < list.length; i++) {
    try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) { /* дальше */ }
  }
  return '';
}
function canRecordVideo() {
  return !!videoType() && typeof HTMLCanvasElement === 'function' && !!HTMLCanvasElement.prototype.captureStream;
}
const nowMs = () => (typeof performance === 'object' && performance.now ? performance.now() : Date.now());
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

async function makeVideo(bd, opts, onProgress, stopped) {
  const type = videoType();
  const art = clipPainter(bd, opts);
  if (!type || !art.ctx || !art.canvas.captureStream) return null;
  const plan = clipPlan(bd), total = clipTotal(plan), fps = 25;
  let stream, rec;
  try {
    stream = art.canvas.captureStream(0);
    rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: Math.round(art.width * art.height * 6) });
  } catch (e) { return null; }
  const track = (stream.getVideoTracks() || [])[0];
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const finished = new Promise(res => { rec.onstop = res; });
  rec.start();
  const t0 = nowMs();
  let t = 0;
  while (t < total && !stopped()) {
    const seg = clipAt(bd, plan, t);
    if (!(await art.paint(seg.cap))) break;
    try { if (track && track.requestFrame) track.requestFrame(); else if (stream.requestFrame) stream.requestFrame(); } catch (e) { /* и так запишется */ }
    onProgress(t / total);
    const next = t + 1000 / fps, wall = nowMs() - t0;
    if (next > wall) await sleep(next - wall);
    t = Math.max(next, nowMs() - t0);
  }
  try { rec.stop(); } catch (e) { /* уже остановлен */ }
  await finished;
  try { (stream.getTracks() || []).forEach(tr => tr.stop()); } catch (e) { /* ignore */ }
  if (!chunks.length) return null;
  const blob = new Blob(chunks, { type: type.split(';')[0] });
  return { blob, ext: /mp4/.test(type) ? 'mp4' : 'webm', ms: total };
}

/* ---------- GIF своими руками ---------- */
/* Растущий поток байтов */
function byteBag() {
  let buf = new Uint8Array(4096), n = 0;
  const grow = need => {
    if (n + need <= buf.length) return;
    let size = buf.length;
    while (size < n + need) size *= 2;
    const nb = new Uint8Array(size);
    nb.set(buf.subarray(0, n));
    buf = nb;
  };
  return {
    push(b) { grow(1); buf[n++] = b & 255; },
    str(s) { grow(s.length); for (let i = 0; i < s.length; i++) buf[n++] = s.charCodeAt(i) & 255; },
    u16(v) { grow(2); buf[n++] = v & 255; buf[n++] = (v >> 8) & 255; },
    get length() { return n; },
    take() { return buf.slice(0, n); }
  };
}
/* Сжатие LZW — как того требует формат GIF */
function lzwWrite(out, px, minCode) {
  out.push(minCode);
  const clear = 1 << minCode, end = clear + 1;
  let size = minCode + 1, next = end + 1, dict = new Map();
  let block = [], acc = 0, bits = 0;
  const flush = () => { if (!block.length) return; out.push(block.length); for (let i = 0; i < block.length; i++) out.push(block[i]); block = []; };
  const emit = code => {
    acc |= code << bits;
    bits += size;
    while (bits >= 8) { block.push(acc & 255); acc >>>= 8; bits -= 8; if (block.length === 255) flush(); }
  };
  emit(clear);
  let prefix = px[0];
  for (let i = 1; i < px.length; i++) {
    const k = px[i], key = prefix * 4096 + k, got = dict.get(key);
    if (got !== undefined) { prefix = got; continue; }
    emit(prefix);
    if (next < 4096) {
      /* ширину кода увеличиваем до записи новой пары — так же считает тот, кто будет читать */
      if (next > (1 << size) - 1 && size < 12) size++;
      dict.set(key, next++);
    } else {
      emit(clear);
      dict = new Map();
      next = end + 1;
      size = minCode + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(end);
  if (bits > 0) { block.push(acc & 255); if (block.length === 255) flush(); }
  flush();
  out.push(0);
}
/* Сборка файла GIF: шапка, палитра, кадры */
function gifWriter(w, hh, pal) {
  const out = byteBag();
  let bits = 2;
  while ((1 << bits) < pal.length + 1 && bits < 8) bits++;
  const slots = 1 << bits, trans = pal.length;
  out.str('GIF89a');
  out.u16(w);
  out.u16(hh);
  out.push(0xF0 | (bits - 1));
  out.push(0);
  out.push(0);
  for (let i = 0; i < slots; i++) {
    const c = pal[i] || [0, 0, 0];
    out.push(c[0]); out.push(c[1]); out.push(c[2]);
  }
  /* крутить бесконечно */
  out.push(0x21); out.push(0xFF); out.push(11);
  out.str('NETSCAPE2.0');
  out.push(3); out.push(1); out.u16(0); out.push(0);
  return {
    trans,
    frame(px, delayCs, withTrans) {
      out.push(0x21); out.push(0xF9); out.push(4);
      out.push((1 << 2) | (withTrans ? 1 : 0));
      out.u16(Math.max(2, Math.round(delayCs)));
      out.push(withTrans ? trans : 0);
      out.push(0);
      out.push(0x2C); out.u16(0); out.u16(0); out.u16(w); out.u16(hh); out.push(0);
      lzwWrite(out, px, Math.max(2, bits));
    },
    finish() { out.push(0x3B); return out.take(); }
  };
}
/* Палитра: делим все цвета кадра пополам, пока не наберём нужное число */
function medianCut(px, max) {
  if (!px.length) return [[0, 0, 0]];
  const span = box => {
    let lo = [255, 255, 255], hi = [0, 0, 0];
    for (let i = 0; i < box.length; i++) {
      for (let c = 0; c < 3; c++) { const v = box[i][c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
    }
    let ch = 0, best = -1;
    for (let c = 0; c < 3; c++) { const d = hi[c] - lo[c]; if (d > best) { best = d; ch = c; } }
    return { ch, size: best };
  };
  const boxes = [px];
  while (boxes.length < max) {
    let pick = -1, score = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const s = span(boxes[i]).size * Math.log(boxes[i].length + 1);
      if (s > score) { score = s; pick = i; }
    }
    if (pick < 0) break;
    const b = boxes[pick], ch = span(b).ch;
    b.sort((x, y) => x[ch] - y[ch]);
    const mid = b.length >> 1;
    boxes.splice(pick, 1, b.slice(0, mid), b.slice(mid));
  }
  return boxes.map(b => {
    let r = 0, g = 0, bl = 0;
    for (let i = 0; i < b.length; i++) { r += b[i][0]; g += b[i][1]; bl += b[i][2]; }
    return [Math.round(r / b.length), Math.round(g / b.length), Math.round(bl / b.length)];
  });
}
function palMapper(pal) {
  const cache = new Map();
  return (r, g, b) => {
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let best = 0, bd = Infinity;
    for (let i = 0; i < pal.length; i++) {
      const dr = pal[i][0] - r, dg = pal[i][1] - g, db = pal[i][2] - b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; best = i; }
    }
    cache.set(key, best);
    return best;
  };
}
/* Один кадр в номера цветов; что не изменилось — делаем прозрачным, так файл легче */
function gifFrameIndices(data, map, prev, trans) {
  const n = data.length / 4, px = new Uint8Array(n);
  let changed = 0;
  for (let i = 0; i < n; i++) {
    const k = i * 4, c = map(data[k], data[k + 1], data[k + 2]);
    if (prev && prev[i] === c) px[i] = trans;
    else { px[i] = c; changed++; }
    if (prev) prev[i] = c;
  }
  return { px, changed };
}

async function makeGif(bd, opts, onProgress, stopped) {
  const art = clipPainter(bd, opts);
  if (!art.ctx || !art.ctx.getImageData) return null;
  const plan = clipPlan(bd), total = clipTotal(plan);
  const fps = Math.max(5, Math.min(15, opts.fps || 10));
  const stepMs = 1000 / fps, count = Math.max(2, Math.ceil(total / stepMs));
  const grab = async t => {
    const seg = clipAt(bd, plan, t);
    if (!(await art.paint(seg.cap))) return null;
    try { return art.ctx.getImageData(0, 0, art.width, art.height).data; } catch (e) { return null; }
  };
  /* палитру берём по нескольким кадрам, чтобы цвета не «поплыли» */
  const samples = [];
  for (const part of [0, 0.45, 0.8]) {
    const data = await grab(total * part);
    if (!data) return null;
    for (let i = 0; i < data.length; i += 4 * 11) samples.push([data[i], data[i + 1], data[i + 2]]);
  }
  const pal = medianCut(samples, 255), map = palMapper(pal);
  const gif = gifWriter(art.width, art.height, pal);
  const prev = new Uint8Array(art.width * art.height);
  for (let n = 0; n < count && !stopped(); n++) {
    const data = await grab(Math.min(total, n * stepMs));
    if (!data) return null;
    const first = n === 0;
    const f = gifFrameIndices(data, map, first ? null : prev, gif.trans);
    if (first) for (let i = 0; i < prev.length; i++) prev[i] = f.px[i];
    gif.frame(f.px, stepMs / 10, !first);
    onProgress((n + 1) / count);
    await sleep(0);
  }
  const bytes = gif.finish();
  return { blob: new Blob([bytes], { type: 'image/gif' }), ext: 'gif', ms: total };
}

/* ---------- Окно «Ролик» ---------- */
function downloadBlob(name, blob) {
  try {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name, style: 'display:none' });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    toast('Файл сохраняется: ' + name);
  } catch (e) { toast('Не получилось сохранить файл'); }
}
function fileSizeNote(blob) {
  const kb = blob.size / 1024;
  return kb > 1024 ? (kb / 1024).toFixed(1) + ' МБ' : Math.round(kb) + ' КБ';
}
function openClip() {
  const b = board();
  if (!b) { toast('Сначала откройте слайд со схемой'); return; }
  if (b.frames.length < 2) { toast('В этой схеме один шаг — ролик делать не из чего'); return; }
  const canVideo = canRecordVideo();
  let kind = canVideo ? 'video' : 'gif';
  let width = 720, caps = true, busy = false, stop = false;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;pointer-events:none';
  document.body.appendChild(host);
  const bd = new TE.Board(host, b, App.project, { bare: true, frame: 0 });
  const secs = Math.round(clipTotal(clipPlan(bd)) / 100) / 10;
  const line = h('p', { class: 'muted small' }, `Ролик будет длиться примерно ${String(secs).replace('.', ',')} с.`);
  const fill = h('i');
  const bar = h('div', { class: 'clip-bar', hidden: true }, fill);
  const widths = h('div');
  const paint = () => {
    widths.textContent = '';
    const list = kind === 'video' ? [[640, '640'], [960, '960'], [1280, '1280']] : [[400, '400'], [560, '560'], [720, '720']];
    if (!list.some(x => x[0] === width)) width = list[1][0];
    widths.appendChild(fld('Ширина картинки, точек', seg(list, width, v => { width = v; })));
  };
  paint();
  const goBtn = btn('', 'Сделать ролик', () => run(), false, 'primary');
  const close = modal('Ролик со схемой', [
    h('p', null, 'Схема этого слайда со всеми шагами: видео — чтобы показать на телевизоре или кинуть в чат, GIF — чтобы в переписке игралось само.'),
    fld('Что делаем', seg([['video', 'Видео'], ['gif', 'GIF']], kind, v => { kind = v; paint(); })),
    canVideo ? null : h('p', { class: 'muted small' }, 'Этот браузер не умеет записывать видео — здесь доступен только GIF.'),
    widths,
    tog(caps, v => { caps = v; }, 'Подписывать шаги под схемой'),
    line,
    bar,
    h('div', { class: 'btn-row' }, goBtn)
  ], { onClose: () => { stop = true; host.remove(); } });
  async function run() {
    if (busy) return;
    if (kind === 'video' && !canVideo) { toast('Видео тут не запишется — выберите GIF'); return; }
    busy = true;
    stop = false;
    goBtn.disabled = true;
    bar.hidden = false;
    line.textContent = 'Собираю ролик… можно не закрывать окно.';
    const tick = k => { fill.style.width = Math.round(Math.min(1, k) * 100) + '%'; };
    let res = null;
    try {
      const o = { width, caps, fps: 10 };
      res = kind === 'video' ? await makeVideo(bd, o, tick, () => stop) : await makeGif(bd, o, tick, () => stop);
    } catch (e) {
      res = null;
    }
    busy = false;
    goBtn.disabled = false;
    if (stop) return;
    if (!res || !res.blob || !res.blob.size) {
      bar.hidden = true;
      line.textContent = kind === 'video'
        ? 'Записать видео не вышло. Попробуйте GIF или сделайте запись экрана.'
        : 'Сделать GIF не вышло — этот браузер не умеет работать с картинкой.';
      return;
    }
    tick(1);
    line.textContent = 'Готово: ' + fileSizeNote(res.blob) + '. Файл сохраняется.';
    downloadBlob(slug(App.project.title) + '-' + (App.slideIdx + 1) + '.' + res.ext, res.blob);
    close();
  }
}
