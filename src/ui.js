(function () {
'use strict';
var LT = window.LT, BR = LT.BR, W0 = LT.W0, H0 = LT.H0;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var KEY = 'ouhsd-lower-thirds-v1', RKEY = 'ouhsd-lower-thirds-rundown-v1';
var GREEN = '#00B140';
var APP = window.LT_APP === 'live' ? 'live' : 'video';
document.body.setAttribute('data-app', APP);
var OUTPUT = APP === 'live' && location.hash === '#output';
var liveAir = { onAir: false, row: -1 };

/* ---------------------------------------------------------------- state */
var state = LT.norm(LT.DEFAULTS);
try { var saved = localStorage.getItem(KEY); if (saved) state = LT.norm(JSON.parse(saved)); } catch (e) { /* storage unavailable */ }
var rows = [], activeRow = -1, baseStyle = state.style;
try { var rs0 = JSON.parse(localStorage.getItem(RKEY) || 'null'); if (rs0 && rs0.rows) rows = rs0.rows.slice(0, 500).map(function (r) { return { name: String(r.name || '').slice(0, 120), title: String(r.title || '').slice(0, 120), third: String(r.third || '').slice(0, 120), style: LT.STYLES.some(function (x) { return x.id === r.style; }) ? r.style : '' }; }); } catch (e) { /* ignore */ }
var t = state.tIn, playing = false, loop = false, speed = 1, raf = 0, lastTs = 0;
var L = null, A = null, bgLum = null, fontsOk = false, busy = false, cancelFlag = false;
var logos = {}, bgCanvases = {};
var guides = { safe: false, clear: false };
var cap = { webm: false, h264: false, checked: false };
var ex = { fmt: 'seq', fps: 30, res: '1080', full: true, inOnly: false, outOnly: false };
var meas = document.createElement('canvas').getContext('2d');
var dlCap = null;
var cvBg = $('#cvBg'), cvOut = $('#cvOut'), cvGuides = $('#cvGuides'), frameEl = $('#frame');

function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
function slug(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
function fmtT(x) { return x.toFixed(2); }

/* ---------------------------------------------------------------- logos and fonts */
function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
$('#hdrLogo').src = window.LOGO_SRC.sw;
var logoPromise = Promise.all(Object.keys(window.LOGO_SRC).map(function (k) { return loadImg(window.LOGO_SRC[k]).then(function (i) { logos[k] = i; }); }));
function loadFonts() {
  var faces = ['700 40px Montserrat', '600 40px Montserrat', '400 40px "Open Sans"', '600 40px "Open Sans"'];
  return Promise.all(faces.map(function (f) { return document.fonts.load(f, 'Aa'); })).then(function () {
    fontsOk = faces.every(function (f) { return document.fonts.check(f); });
  }).catch(function () { fontsOk = false; });
}

/* ---------------------------------------------------------------- backgrounds */
function ridge(ctx, base, amp, seed, color, step) {
  ctx.beginPath(); ctx.moveTo(0, H0);
  for (var x = 0; x <= W0 + step; x += step) {
    var y = base + amp * (Math.sin(x * 0.0031 + seed) * 0.6 + Math.sin(x * 0.0089 + seed * 2.1) * 0.28 + Math.sin(x * 0.021 + seed * 3.7) * 0.12);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W0, H0); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function makeBg(kind) {
  if (bgCanvases[kind]) return bgCanvases[kind];
  var c = document.createElement('canvas'); c.width = W0; c.height = H0;
  var x = c.getContext('2d'), g;
  if (kind === 'day') {
    g = x.createLinearGradient(0, 0, 0, H0); g.addColorStop(0, '#6fb0e4'); g.addColorStop(0.55, '#cfe6f6'); g.addColorStop(0.7, '#eaf3e0'); g.addColorStop(1, '#e6eed2');
    x.fillStyle = g; x.fillRect(0, 0, W0, H0);
    g = x.createRadialGradient(1500, 260, 10, 1500, 260, 380); g.addColorStop(0, 'rgba(255,255,240,.95)'); g.addColorStop(1, 'rgba(255,255,240,0)');
    x.fillStyle = g; x.fillRect(0, 0, W0, H0);
    ridge(x, 640, 90, 1.2, '#b7d3a4', 12); ridge(x, 760, 70, 3.4, '#cfe3b8', 12); ridge(x, 900, 40, 5.1, '#dfe9c6', 12);
  } else {
    g = x.createLinearGradient(0, 0, 0, H0); g.addColorStop(0, '#0f1b36'); g.addColorStop(0.38, '#2b4570'); g.addColorStop(0.62, '#9a6c78'); g.addColorStop(0.72, '#d99b73'); g.addColorStop(1, '#3a3c4e');
    x.fillStyle = g; x.fillRect(0, 0, W0, H0);
    g = x.createRadialGradient(1380, 720, 20, 1380, 720, 620); g.addColorStop(0, 'rgba(255,205,150,.65)'); g.addColorStop(1, 'rgba(255,205,150,0)');
    x.fillStyle = g; x.fillRect(0, 0, W0, H0);
    ridge(x, 700, 110, 0.7, '#3b4766', 12); ridge(x, 800, 80, 2.9, '#222c47', 12); ridge(x, 930, 50, 4.6, '#10192f', 12);
    g = x.createLinearGradient(0, 720, 0, H0); g.addColorStop(0, 'rgba(8,12,24,0)'); g.addColorStop(1, 'rgba(8,12,24,.7)');
    x.fillStyle = g; x.fillRect(0, 720, W0, H0 - 720);
  }
  bgCanvases[kind] = c; return c;
}
function photoKind() { return state.bg === 'day' ? 'day' : 'dusk'; }
function paintBg() {
  var cx = cvBg.getContext('2d'); cx.clearRect(0, 0, W0, H0);
  if (state.bg !== 'checker') cx.drawImage(makeBg(photoKind()), 0, 0);
  frameEl.classList.toggle('checker', state.bg === 'checker');
}
function computeBgLum() {
  bgLum = null;
  if (state.bg === 'checker' || !L) return;
  var textsFree = L.els.filter(function (e) { return e.kind === 'text' && !e.on; });
  if (!textsFree.length) return;
  var o = LT.origin(L, state), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  textsFree.forEach(function (e) { x0 = Math.min(x0, e.bx + o.ox); y0 = Math.min(y0, e.y + o.oy); x1 = Math.max(x1, e.bx + e.w + o.ox); y1 = Math.max(y1, e.y + e.h + o.oy); });
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W0, Math.ceil(x1)); y1 = Math.min(H0, Math.ceil(y1));
  if (x1 <= x0 || y1 <= y0) return;
  try {
    var d = makeBg(photoKind()).getContext('2d').getImageData(x0, y0, x1 - x0, y1 - y0).data, arr = [];
    for (var i = 0; i < d.length; i += 16) arr.push(LT.lumRGB([d[i], d[i + 1], d[i + 2]]));
    arr.sort(function (a, b) { return a - b; });
    bgLum = arr[Math.floor(arr.length * 0.9)];
  } catch (e) { bgLum = null; }
}

/* ---------------------------------------------------------------- pipeline */
function total() { return LT.totalTime(state); }
function curT() { return state.motion === 'static' ? 0 : LT.clamp(t, 0, total()); }

function refresh() {
  state = LT.norm(state);
  if (state.motion === 'static') t = 0; else t = LT.clamp(t, 0, total());
  ensureGfx();
  L = LT.buildLayout(state, meas);
  computeBgLum();
  A = LT.audit(L, state, { bgLum: bgLum });
  syncControls(); renderThumbs(); renderChecks(); renderAlerts(); renderTimeline(); paintBg(); paint();
  scheduleEstimate(); persist();
}
function paint() {
  var ctx = cvOut.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W0, H0);
  if (!L) return;
  var G = LT.drawFrame(ctx, W0, H0, L, state, curT(), { logos: logos });
  var gx = cvGuides.getContext('2d'); gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, W0, H0);
  gx.lineWidth = 2; gx.setLineDash([10, 8]);
  if (guides.safe) {
    var mx = W0 * state.margin / 100, my = H0 * state.margin / 100;
    gx.strokeStyle = '#00E5FF'; gx.strokeRect(mx, my, W0 - 2 * mx, H0 - 2 * my);
  }
  if (guides.clear) {
    var lg = G.items.filter(function (i) { return i.kind === 'logo'; })[0];
    if (lg) {
      var o = LT.origin(L, state);
      gx.strokeStyle = '#FFE600'; gx.strokeRect(lg.zone.x + o.ox, lg.zone.y + o.oy, lg.zone.w, lg.zone.h);
      gx.setLineDash([]); gx.fillStyle = '#FFE600'; gx.font = '600 18px "Open Sans", sans-serif';
      gx.fillText('x = ' + lg.clear.toFixed(1) + ' px', lg.zone.x + o.ox, lg.zone.y + o.oy - 6);
    }
  }
}

/* ---------------------------------------------------------------- controls */
function setPressed(sel, val) { $$('button', $(sel)).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === String(val))); }); }
function syncControls() {
  var s = state, sd = LT.STYLES.filter(function (x) { return x.id === s.style; })[0];
  if ($('#inName').value !== s.name) $('#inName').value = s.name;
  if ($('#inTitle').value !== s.title) $('#inTitle').value = s.title;
  if ($('#inThird').value !== s.third) $('#inThird').value = s.third;
  $('#cName').textContent = s.name.length + '/120'; $('#cTitle').textContent = s.title.length + '/120'; $('#cThird').textContent = s.third.length + '/120';
  setPressed('#logoSeg', s.logoOn ? 'on' : 'off');
  $('#logoHint').textContent = !s.logoOn ? 'The logo is off. Turn it on to place the official logo on a solid plate.' :
    'Stacked logo only. The version switches automatically with its plate: full color on white, reversed white on navy, blue or black. The tagline version is never used.';
  syncDims(); syncType(); syncGfx();
  setPressed('#alignSeg', s.align); setPressed('#motionSeg', s.motion); setPressed('#bgSeg', s.bg);
  $('#rngSize').value = s.size; $('#oSize').textContent = Math.round(s.size * 100) + '%';
  $('#rngMargin').value = s.margin; $('#oMargin').textContent = s.margin + '%';
  $('#rngIn').value = s.tIn; $('#oIn').textContent = s.tIn.toFixed(2) + ' s';
  $('#rngHold').value = s.hold; $('#oHold').textContent = s.hold.toFixed(1) + ' s';
  $('#rngOut').value = s.tOut; $('#oOut').textContent = s.tOut.toFixed(2) + ' s';
  $('#animCtl').style.display = s.motion === 'animated' ? 'flex' : 'none';
  $('#transport').style.display = s.motion === 'animated' ? 'flex' : 'none';
  [$('#selIn'), $('#selOut')].forEach(function (sel, i) {
    var cur = i === 0 ? s.inPreset : s.outPreset;
    if (!sel.options.length) Object.keys(LT.PRESETS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = LT.PRESETS[k]; sel.appendChild(o); });
    $$('option', sel).forEach(function (o) { o.disabled = o.value === 'logofirst' && !s.logoOn; o.textContent = LT.PRESETS[o.value] + (o.value === 'logofirst' && !s.logoOn ? ' (needs logo on)' : ''); });
    sel.value = cur;
  });
  var hasPlateStyle = s.style === 'bar' || s.style === 'tab' || s.style === 'block';
  $$('button', $('#plateSw')).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === s.plate)); b.disabled = !hasPlateStyle && !s.logoOn; });
  $$('button', $('#accentSw')).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === s.accent)); });
  $('#plateHint').textContent = s.style === 'block' ? 'Sets the title block. The name block is always white with navy text. White gives a Blue Tint 60% title block with navy text.' :
    (hasPlateStyle ? 'White plates switch the text to navy and the logo to full color.' :
      (s.logoOn ? 'This style has no plate. The color applies to the logo tile.' : 'This style has no plate, so this setting only matters when the logo is on.'));
  $$('.sty').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-v') === s.style)); });
  $('#frame').setAttribute('data-bg', s.bg);
  $('#chkSafe').checked = guides.safe; $('#chkClear').checked = guides.clear;
  $('#btnPlay').textContent = playing ? 'Pause' : 'Play';
  $('#btnLoop').setAttribute('aria-pressed', String(loop));
  renderExportOptions();
}
var typeLine = 'name';
function showTab(id, focus) {
  $$('#tabs button').forEach(function (b) { var on = b.getAttribute('data-tab') === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  $$('#panel .psec').forEach(function (e) { e.hidden = e.getAttribute('data-tab') !== id; });
  $('#panel').scrollTop = 0;
  try { sessionStorage.setItem('lt-tab', id); } catch (e) { /* ignore */ }
}
function syncDims() {
  if (!L) return;
  var s = state, maxW = Math.round(W0 * (1 - 2 * s.margin / 100));
  $('#rngW').max = maxW; $('#rngW').value = s.autoW ? Math.round(L.ctrlW) : s.width; $('#rngW').disabled = s.autoW; $('#chkAutoW').checked = s.autoW;
  $('#oW').textContent = (s.autoW ? 'Auto ' : '') + Math.round(L.ctrlW) + ' px';
  $('#rngH').value = s.autoH ? Math.round(L.ctrlH) : s.height; $('#rngH').disabled = s.autoH; $('#chkAutoH').checked = s.autoH;
  $('#oH').textContent = (s.autoH ? 'Auto ' : '') + Math.round(L.ctrlH) + ' px';
  var what = { bar: 'Height is the plate height. Width is the whole graphic.', underline: 'Height is the logo tile. Width is the whole graphic, including the rule.', block: 'Height is the full stack of blocks. Width is the whole graphic.', bracket: 'Height and width size the bracket frame. The logo tile follows the height.', tab: 'Height is the plate height. Width is the whole graphic.' }[s.style];
  $('#dimHint').textContent = what + ' Sizes are in 1920 by 1080 pixels. Values too small for the text or logo are raised automatically.';
}
function syncType() {
  var c = state.text[typeLine];
  setPressed('#lineSeg', typeLine); setPressed('#capsSeg', c.caps);
  var ws = $('#weightSeg'), lab = { 400: 'Regular 400', 600: 'Semibold 600', 700: 'Bold 700' };
  ws.innerHTML = '';
  LT.WEIGHTS[typeLine].forEach(function (w) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-v', w); b.setAttribute('aria-pressed', String(c.weight === w)); b.textContent = lab[w];
    b.addEventListener('click', function () { tpatch({ weight: w }); }); ws.appendChild(b);
  });
  $('#rngTSize').value = c.size; $('#oTSize').textContent = c.size + '%';
  $('#rngTrack').value = c.track; $('#oTrack').textContent = (c.track > 0 ? '+' : '') + c.track;
  $('#rngLead').value = c.lead; $('#oLead').textContent = c.lead.toFixed(2);
  $('#chkKern').checked = c.kern;
}
function tpatch(o) { var tx = JSON.parse(JSON.stringify(state.text)); Object.assign(tx[typeLine], o); patch({ text: tx }); }
function patch(p) { Object.assign(state, p); refresh(); }
function changeStyle(id) {
  baseStyle = id;
  if (activeRow >= 0 && rows[activeRow] && rows[activeRow].style) { rows[activeRow].style = id; persistRows(); renderRundown(); }
  var sd = LT.STYLES.filter(function (x) { return x.id === id; })[0];
  var p = { style: id, inPreset: sd.sig, outPreset: sd.sig };
  if (sd.sig === 'logofirst' && !state.logoOn) { p.inPreset = 'slide'; p.outPreset = 'slide'; }
  patch(p);
}
function buildStatic() {
  var ps = $('#plateSw'), as = $('#accentSw');
  [['navy', 'Navy'], ['blue', 'Blue'], ['white', 'White'], ['black', 'Black']].forEach(function (p) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.setAttribute('data-v', p[0]); b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<i style="background:' + BR[p[0]] + '"></i>' + p[1]; b.addEventListener('click', function () { patch({ plate: p[0] }); }); ps.appendChild(b);
  });
  [['red', 'Red'], ['white', 'White'], ['tint', 'Blue Tint 60%']].forEach(function (p) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.setAttribute('data-v', p[0]); b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<i style="background:' + BR[p[0]] + '"></i>' + p[1]; b.addEventListener('click', function () { patch({ accent: p[0] }); }); as.appendChild(b);
  });
  var sg = $('#styleGrid');
  LT.STYLES.forEach(function (s) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'sty'; b.setAttribute('role', 'radio'); b.setAttribute('data-v', s.id);
    b.innerHTML = '<canvas width="480" height="270"></canvas><span>' + s.name + '</span>';
    b.addEventListener('click', function () { changeStyle(s.id); }); sg.appendChild(b);
  });
}
function renderThumbs() {
  $$('.sty').forEach(function (b) {
    var id = b.getAttribute('data-v'), sd = LT.STYLES.filter(function (x) { return x.id === id; })[0];
    var st = Object.assign({}, state, { style: id, motion: 'static' });
    var cv = $('canvas', b), cx = cv.getContext('2d');
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, 480, 270);
    if (state.bg === 'checker') { cx.fillStyle = '#d9dde5'; cx.fillRect(0, 0, 480, 270); cx.fillStyle = '#b9c0cf'; for (var yy = 0; yy < 270; yy += 16) for (var xx = ((yy / 16) % 2) * 16; xx < 480; xx += 32) cx.fillRect(xx, yy, 16, 16); }
    else cx.drawImage(makeBg(photoKind()), 0, 0, 480, 270);
    var Lt = LT.buildLayout(st, meas);
    LT.drawFrame(cx, 480, 270, Lt, LT.norm(st), 0, { logos: logos });
  });
}

/* ---------------------------------------------------------------- timeline */
function renderTimeline() {
  var tot = total();
  $('#scrub').max = String(tot || 1); $('#scrub').value = String(curT());
  $('#segBar').innerHTML = '<div class="s-in" style="flex:' + state.tIn + '">In ' + state.tIn.toFixed(2) + 's</div><div class="s-hold" style="flex:' + state.hold + '">Hold ' + state.hold.toFixed(1) + 's</div><div class="s-out" style="flex:' + state.tOut + '">Out ' + state.tOut.toFixed(2) + 's</div>';
  updateTime();
}
function updateTime() { $('#timeLbl').textContent = fmtT(curT()) + ' / ' + fmtT(total()) + ' s'; }
function setPlaying(on) {
  playing = on; $('#btnPlay').textContent = on ? 'Pause' : 'Play';
  if (on) { if (t >= total() - 0.001) t = 0; lastTs = 0; raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf);
}
function tick(ts) {
  if (!playing) return;
  if (!lastTs) lastTs = ts;
  var dt = Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts;
  t += dt * speed;
  var tot = total();
  if (t >= tot) { if (loop) t = t % tot; else { t = tot; setPlaying(false); } }
  $('#scrub').value = String(t); updateTime(); paint();
  if (playing) raf = requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------- checks and alerts */
function fmtRatio(r) { return r == null ? 'n/a' : r.toFixed(1) + ':1'; }
function renderChecks() {
  var rows = [], s = state, a = A;
  var bad = function (code) { return a.issues.some(function (i) { return i.code === code; }); };
  rows.push([bad('redblue') ? 'fail' : 'pass', 'Red never touches blue', bad('redblue') ? 'The red accent touches a blue or navy plate.' :
    'The red accent is always separated from blue and navy plates by clear space (closest gap ' + (a.minRedBlue > 1e8 ? 'n/a, no red next to blue' : Math.round(a.minRedBlue) + ' px') + '). Checked on ' + a.frames + ' frame' + (a.frames > 1 ? 's' : '') + '.']);
  if (s.logoOn) {
    rows.push([bad('logover') ? 'fail' : 'pass', 'Logo version matches its plate', 'Reversed white on navy, blue or black. Full color on white. Never recolored, stretched, rotated or given effects.']);
    var x = L.byId.logo.clear;
    rows.push([bad('clear') ? 'fail' : 'pass', 'Logo clear space', 'x = cap height of OXNARD UNION = ' + x.toFixed(1) + ' px at this size. ' + (bad('clear') ? 'Something enters the zone.' : 'Nothing enters it on any frame' + (a.minClear < 1e8 ? ' (closest element ' + Math.round(a.minClear) + ' px away).' : '.'))]);
  } else rows.push(['info', 'Logo', 'The logo is off.']);
  rows.push([bad('safe') ? 'fail' : 'pass', 'Title-safe area', bad('safe') ? 'The graphic extends past the safe margin.' : 'Inside the ' + s.margin + '% margin on every side.']);
  rows.push([fontsOk ? 'pass' : 'fail', 'Type', fontsOk ? 'Montserrat Bold for names, Open Sans for titles. No other fonts are used.' : 'Montserrat and Open Sans did not load. Check your connection. Exports are blocked until they load.']);
  var HEXN = {}; HEXN[BR.navy] = 'navy'; HEXN[BR.blue] = 'blue'; HEXN[BR.white] = 'white'; HEXN[BR.black] = 'black'; HEXN[BR.tint] = 'Blue Tint 60%';
  a.contrasts.forEach(function (c) {
    c.label = c.bg ? 'Text on ' + HEXN[c.bg] + (c.bg === BR.tint ? ' block' : ' plate') : 'Text on footage';
    var st2 = c.ratio == null ? 'info' : (c.ratio >= 4.5 ? 'pass' : 'warn');
    var sw = '<span class="cswatch" style="background:' + (c.bg || '#6b7280') + ';color:' + c.fg + '">Aa</span>';
    rows.push([st2, 'Contrast: ' + c.label.toLowerCase().replace('blue tint 60%','Blue Tint 60%'), sw + (c.bg ? 'Text on plate: ' + fmtRatio(c.ratio) + '. Needs 4.5:1.' :
      (c.ratio == null ? 'This style has no plate, so contrast depends on your footage. Keep the area behind the text dark.' : 'White text against the brightest 10% of the sample footage behind it: ' + fmtRatio(c.ratio) + '. Needs 4.5:1.'))]);
  });
  if (s.motion === 'animated') {
    var need = LT.minHold(s), words = LT.wordCount(s);
    rows.push([s.hold >= need ? 'pass' : 'warn', 'Read time', words + ' word' + (words === 1 ? '' : 's') + ' need at least ' + need.toFixed(1) + ' s on screen (0.3 s per word). Hold is ' + s.hold.toFixed(1) + ' s.']);
  }
  $('#checks').innerHTML = rows.map(function (r) {
    return '<li><span class="chip ' + r[0] + '">' + ({ pass: 'Pass', warn: 'Check', fail: 'Fail', info: 'Info' }[r[0]]) + '</span><div><b>' + r[1] + '</b><small>' + r[2] + '</small></div></li>';
  }).join('');
}
function renderAlerts() {
  var out = [], s = state;
  if (!fontsOk) out.push(['bad', 'Brand fonts not loaded', 'Montserrat and Open Sans could not be loaded, so exports are paused rather than using a substitute font.']);
  A.issues.forEach(function (i) { out.push(['bad', 'Brand rule', i.msg + ' (at ' + fmtT(i.t) + ' s).']); });
  A.contrasts.forEach(function (c) { if (c.ratio != null && c.ratio < 4.5) out.push(['warn', 'Low contrast', c.label + ' is ' + fmtRatio(c.ratio) + ', below the 4.5:1 minimum. Choose a darker background or a plate style.']); });
  if (s.motion === 'animated' && s.hold < LT.minHold(s)) out.push(['warn', 'Hold is too short', 'Viewers need about 0.3 s per word. Raise the hold to at least ' + LT.minHold(s).toFixed(1) + ' s.']);
  L.warnings.forEach(function (w) { out.push(['info', 'Text fit', w.charAt(0).toUpperCase() + w.slice(1) + '.']); });
  if (!s.name.trim() && !s.title.trim() && !s.third.trim()) out.push(['info', 'No text', 'Enter a name to see the graphic.']);
  $('#alerts').innerHTML = out.map(function (o) { return '<div class="alert ' + o[0] + '"><strong>' + o[1] + '.</strong> ' + o[2] + '</div>'; }).join('');
}

/* ---------------------------------------------------------------- matrix test */
var MVAR = [{ autoW: true, autoH: true }, { autoW: false, width: 520, autoH: false, height: 90 }, { autoW: false, width: 1300, autoH: false, height: 280 },
  { autoW: true, autoH: true, text: { name: { caps: 'upper', track: 120, kern: false, size: 120, lead: 1.5, weight: 600 }, title: { caps: 'lower', track: -30, lead: 1, weight: 400 } } }];
function runMatrix() {
  var btn = $('#btnMatrix'), out = $('#matrixOut'); btn.disabled = true; out.textContent = 'Testing...';
  var styles = LT.STYLES, combos = [], issues = {}, n = 0, frames = 0;
  styles.forEach(function (sd) { LT.PLATES.forEach(function (p) { LT.ACCENTS.forEach(function (ac) { [true, false].forEach(function (lo) { ['left', 'right'].forEach(function (al) {
    ['slide', 'wipe', 'linedraw', 'stagger', 'logofirst'].forEach(function (pr) { if (pr === 'logofirst' && !lo) return;
      MVAR.forEach(function (v) { combos.push(Object.assign({ style: sd.id, plate: p, accent: ac, logoOn: lo, align: al, inPreset: pr, outPreset: pr }, v)); }); }); }); }); }); }); });
  var i = 0;
  (function step() {
    var end = Math.min(combos.length, i + 40);
    for (; i < end; i++) {
      var st = LT.norm(Object.assign({}, state, combos[i], { motion: 'animated' }));
      var Lx = LT.buildLayout(st, meas), ax = LT.audit(Lx, st, {}); n++; frames += ax.frames;
      ax.issues.forEach(function (is) { issues[is.code] = (issues[is.code] || 0) + 1; });
    }
    if (i < combos.length) { out.textContent = 'Testing ' + i + ' of ' + combos.length + '...'; setTimeout(step, 0); }
    else {
      var bad = Object.keys(issues);
      out.textContent = n + ' combinations, ' + frames.toLocaleString() + ' frames scrubbed: ' + (bad.length ? 'issues found (' + bad.join(', ') + ')' : 'no red on blue, no clear-space intrusion, wrong logo version or safe-area overflow.');
      btn.disabled = false;
    }
  })();
}

/* ---------------------------------------------------------------- binary helpers */
function cat(arrs) { var n = 0; arrs.forEach(function (a) { n += a.length; }); var o = new Uint8Array(n), p = 0; arrs.forEach(function (a) { o.set(a, p); p += a.length; }); return o; }
var CRC = (function () { var t2 = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t2[n] = c >>> 0; } return t2; })();
function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function toU8(d) { if (d && d.arrayBuffer) return new Uint8Array(await d.arrayBuffer()); return ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : new Uint8Array(d); }
async function makeZip(files) {
  var parts = [], central = [], offset = 0, enc = new TextEncoder(), now = new Date();
  var dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  var dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  for (var i = 0; i < files.length; i++) {
    var data = await toU8(files[i].data), nm = enc.encode(files[i].path), crc = crc32(data);
    var h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    var c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nm);
    offset += 30 + nm.length + data.length;
  }
  var csize = 0; central.forEach(function (a) { csize += a.length; });
  var e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
}

/* ---- WebM (VP9 with alpha side data) muxer */
var te = new TextEncoder();
function idb(n) { var b = []; while (n > 0) { b.unshift(n & 255); n = Math.floor(n / 256); } return new Uint8Array(b); }
function szb(n) { var b = new Uint8Array(8); b[0] = 1; var v = n; for (var i = 7; i >= 1; i--) { b[i] = v % 256; v = Math.floor(v / 256); } return b; }
function el(id) { var body = cat(Array.prototype.slice.call(arguments, 1)); return cat([idb(id), szb(body.length), body]); }
function uintb(n) { var b = []; do { b.unshift(n & 255); n = Math.floor(n / 256); } while (n > 0); return new Uint8Array(b); }
function f64b(x) { var b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x); return b; }
function muxWebM(chunks, w, h, fps) {
  var frameMs = 1000 / fps, durMs = chunks.length * frameMs;
  var header = el(0x1A45DFA3, el(0x4286, uintb(1)), el(0x42F7, uintb(1)), el(0x42F2, uintb(4)), el(0x42F3, uintb(8)), el(0x4282, te.encode('webm')), el(0x4287, uintb(4)), el(0x4285, uintb(2)));
  var info = el(0x1549A966, el(0x2AD7B1, uintb(1000000)), el(0x4489, f64b(durMs)), el(0x4D80, te.encode('Lower Thirds Studio')), el(0x5741, te.encode('Lower Thirds Studio')));
  var tracks = el(0x1654AE6B, el(0xAE, el(0xD7, uintb(1)), el(0x73C5, uintb(1)), el(0x83, uintb(1)), el(0x9C, uintb(0)), el(0x86, te.encode('V_VP9')),
    el(0x23E383, uintb(Math.round(1e9 / fps))), el(0xE0, el(0xB0, uintb(w)), el(0xBA, uintb(h)), el(0x53C0, uintb(1)))));
  var clusters = [], cur = null, curStart = 0, prevMs = 0;
  chunks.forEach(function (c, i) {
    var ms = Math.round(i * frameMs);
    if (!cur || (c.key && i > 0)) { if (cur) clusters.push(el.apply(null, [0x1F43B675].concat(cur))); cur = [el(0xE7, uintb(ms))]; curStart = ms; }
    var rel = ms - curStart, blk = cat([new Uint8Array([0x81, (rel >> 8) & 255, rel & 255, 0x00]), c.data]);
    var parts = [el(0xA1, blk)];
    if (c.alpha) parts.push(el(0x75A1, el(0xA6, el(0xEE, uintb(1)), el(0xA5, c.alpha))));
    if (!c.key) { var d = -(ms - prevMs); parts.push(el(0xFB, new Uint8Array([(d >> 8) & 255, d & 255]))); }
    cur.push(el.apply(null, [0xA0].concat(parts))); prevMs = ms;
  });
  if (cur) clusters.push(el.apply(null, [0x1F43B675].concat(cur)));
  var seg = el.apply(null, [0x18538067, info, tracks].concat(clusters));
  return new Blob([header, seg], { type: 'video/webm' });
}

/* ---- MP4 (H.264) muxer */
function b32(n) { return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); }
function b16(n) { return new Uint8Array([(n >> 8) & 255, n & 255]); }
function asc(s) { return new Uint8Array(s.split('').map(function (c) { return c.charCodeAt(0); })); }
function bx(type) { var body = cat(Array.prototype.slice.call(arguments, 1)); return cat([b32(body.length + 8), asc(type), body]); }
function fbx(type, ver, flags) { return bx.apply(null, [type, new Uint8Array([ver, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255])].concat(Array.prototype.slice.call(arguments, 3))); }
function zeros(n) { return new Uint8Array(n); }
function muxMP4(samples, desc, w, h, fps) {
  var ts = fps * 1000, n = samples.length, durMs = Math.round(n * 1000 / fps);
  var matrix = cat([b32(0x10000), b32(0), b32(0), b32(0), b32(0x10000), b32(0), b32(0), b32(0), b32(0x40000000)]);
  var ftyp = bx('ftyp', asc('isom'), b32(0x200), asc('isom'), asc('iso2'), asc('avc1'), asc('mp41'));
  function moov(chunkOffset) {
    var mvhd = fbx('mvhd', 0, 0, b32(0), b32(0), b32(1000), b32(durMs), b32(0x10000), b16(0x100), zeros(10), matrix, zeros(24), b32(2));
    var tkhd = fbx('tkhd', 0, 3, b32(0), b32(0), b32(1), b32(0), b32(durMs), zeros(8), b16(0), b16(0), b16(0), b16(0), matrix, b32(w << 16), b32(h << 16));
    var mdhd = fbx('mdhd', 0, 0, b32(0), b32(0), b32(ts), b32(n * 1000), b16(0x55C4), b16(0));
    var hdlr = fbx('hdlr', 0, 0, b32(0), asc('vide'), zeros(12), asc('VideoHandler'), zeros(1));
    var vmhd = fbx('vmhd', 0, 1, b16(0), zeros(6));
    var dinf = bx('dinf', fbx('dref', 0, 0, b32(1), fbx('url ', 0, 1)));
    var avc1 = bx('avc1', zeros(6), b16(1), zeros(16), b16(w), b16(h), b32(0x480000), b32(0x480000), b32(0), b16(1), zeros(32), b16(0x18), b16(0xFFFF), bx('avcC', desc));
    var stsd = fbx('stsd', 0, 0, b32(1), avc1);
    var stts = fbx('stts', 0, 0, b32(1), b32(n), b32(1000));
    var keys = []; samples.forEach(function (s, i) { if (s.key) keys.push(b32(i + 1)); });
    var stss = fbx.apply(null, ['stss', 0, 0, b32(keys.length)].concat(keys));
    var stsc = fbx('stsc', 0, 0, b32(1), b32(1), b32(n), b32(1));
    var stsz = fbx.apply(null, ['stsz', 0, 0, b32(0), b32(n)].concat(samples.map(function (s) { return b32(s.data.length); })));
    var stco = fbx('stco', 0, 0, b32(1), b32(chunkOffset));
    var stbl = bx('stbl', stsd, stts, stss, stsc, stsz, stco);
    var minf = bx('minf', vmhd, dinf, stbl);
    var mdia = bx('mdia', mdhd, hdlr, minf);
    return bx('moov', mvhd, bx('trak', tkhd, mdia));
  }
  var msize = moov(0).length, off = ftyp.length + msize + 8, mdatLen = 0;
  samples.forEach(function (s) { mdatLen += s.data.length; });
  return new Blob([ftyp, moov(off), b32(mdatLen + 8), asc('mdat')].concat(samples.map(function (s) { return s.data; })), { type: 'video/mp4' });
}

/* ---- QuickTime Animation (qtrle, 32-bit ARGB with alpha) encoder and .mov muxer */
var qtBuf = null;
function qtrleFrame(cur, prev, W, H) { /* cur, prev: Uint32Array of RGBA pixels; prev null makes a full keyframe */
  var need = W * H * 5 + H * 64 + 64;
  if (!qtBuf || qtBuf.length < need) qtBuf = new Uint8Array(need);
  var b = qtBuf, p = 6, y, x;
  function skipCodes(n) { while (n > 0) { var c = Math.min(n, 254); b[p++] = 0; b[p++] = c + 1; n -= c; } }
  for (y = 0; y < H; y++) {
    var o = y * W, pos = 0, spans = [];
    if (!prev) spans.push(0, W);
    else {
      x = 0;
      while (x < W) {
        while (x < W && cur[o + x] === prev[o + x]) x++;
        if (x >= W) break;
        var s = x, last = x; x++;
        while (x < W) {
          if (cur[o + x] !== prev[o + x]) { last = x; x++; continue; }
          var j = x; while (j < W && cur[o + j] === prev[o + j]) j++;
          if (j >= W || j - x >= 4) break;
          x = j;
        }
        spans.push(s, last + 1); x = last + 1;
      }
    }
    var first = true;
    for (var k = 0; k < spans.length; k += 2) {
      var s0 = spans[k], e0 = spans[k + 1], gap = s0 - pos;
      if (first) { var f = Math.min(gap, 254); b[p++] = f + 1; skipCodes(gap - f); first = false; } else skipCodes(gap);
      var i = s0;
      while (i < e0) {
        var v = cur[o + i], r = 1;
        while (i + r < e0 && r < 127 && cur[o + i + r] === v) r++;
        if (r >= 3) { b[p++] = 256 - r; b[p++] = v >>> 24; b[p++] = v & 255; b[p++] = (v >> 8) & 255; b[p++] = (v >> 16) & 255; i += r; }
        else {
          var n = 0, st0 = i;
          while (i < e0 && n < 127) { if (i + 2 < e0 && cur[o + i] === cur[o + i + 1] && cur[o + i] === cur[o + i + 2]) break; i++; n++; }
          b[p++] = n;
          for (var q = st0; q < st0 + n; q++) { var w2 = cur[o + q]; b[p++] = w2 >>> 24; b[p++] = w2 & 255; b[p++] = (w2 >> 8) & 255; b[p++] = (w2 >> 16) & 255; }
        }
      }
      pos = e0;
    }
    if (first) b[p++] = 1;
    b[p++] = 255;
  }
  if (p & 1) b[p++] = 0;
  b[0] = p >>> 24; b[1] = (p >> 16) & 255; b[2] = (p >> 8) & 255; b[3] = p & 255; b[4] = 0; b[5] = 0;
  return b.slice(0, p);
}
function muxMOV(samples, w, h, fps) {
  var ts = fps * 1000, n = samples.length, durMs = Math.round(n * 1000 / fps);
  var matrix = cat([b32(0x10000), b32(0), b32(0), b32(0), b32(0x10000), b32(0), b32(0), b32(0), b32(0x40000000)]);
  var ftyp = bx('ftyp', asc('qt  '), b32(0x20050300), asc('qt  '));
  var cname = new Uint8Array(32); cname[0] = 9; cname.set(asc('Animation'), 1);
  function moov(chunkOffset) {
    var mvhd = fbx('mvhd', 0, 0, b32(0), b32(0), b32(1000), b32(durMs), b32(0x10000), b16(0x100), zeros(10), matrix, zeros(24), b32(2));
    var tkhd = fbx('tkhd', 0, 3, b32(0), b32(0), b32(1), b32(0), b32(durMs), zeros(8), b16(0), b16(0), b16(0), b16(0), matrix, b32(w << 16), b32(h << 16));
    var mdhd = fbx('mdhd', 0, 0, b32(0), b32(0), b32(ts), b32(n * 1000), b16(0), b16(0));
    var hdlr = fbx('hdlr', 0, 0, asc('mhlr'), asc('vide'), asc('appl'), b32(0), b32(0), new Uint8Array([12]), asc('VideoHandler'));
    var vmhd = fbx('vmhd', 0, 1, b16(0), zeros(6));
    var dhdlr = fbx('hdlr', 0, 0, asc('dhlr'), asc('alis'), asc('appl'), b32(0), b32(0), new Uint8Array([11]), asc('DataHandler'));
    var dinf = bx('dinf', fbx('dref', 0, 0, b32(1), fbx('alis', 0, 1)));
    var rle = bx('rle ', zeros(6), b16(1), b16(0), b16(0), asc('appl'), b32(0), b32(0x200), b16(w), b16(h), b32(0x480000), b32(0x480000), b32(0), b16(1), cname, b16(32), b16(0xFFFF));
    var stsd = fbx('stsd', 0, 0, b32(1), rle);
    var stts = fbx('stts', 0, 0, b32(1), b32(n), b32(1000));
    var keys = []; samples.forEach(function (s, i) { if (s.key) keys.push(b32(i + 1)); });
    var stss = fbx.apply(null, ['stss', 0, 0, b32(keys.length)].concat(keys));
    var stsc = fbx('stsc', 0, 0, b32(1), b32(1), b32(n), b32(1));
    var stsz = fbx.apply(null, ['stsz', 0, 0, b32(0), b32(n)].concat(samples.map(function (s) { return b32(s.data.length); })));
    var stco = fbx('stco', 0, 0, b32(1), b32(chunkOffset));
    var stbl = bx('stbl', stsd, stts, stss, stsc, stsz, stco);
    var minf = bx('minf', vmhd, dhdlr, dinf, stbl);
    var mdia = bx('mdia', mdhd, hdlr, minf);
    return bx('moov', mvhd, bx('trak', tkhd, mdia));
  }
  var msize = moov(0).length, off = ftyp.length + msize + 8, mdatLen = 0;
  samples.forEach(function (s) { mdatLen += s.data.length; });
  return new Blob([ftyp, moov(off), b32(mdatLen + 8), asc('mdat')].concat(samples.map(function (s) { return s.data; })), { type: 'video/quicktime' });
}
async function encodeMov(st, o, prog) {
  var Lx = LT.buildLayout(st, meas), tot = LT.totalTime(st), N = Math.round(tot * o.fps), W = o.W, H = o.H;
  var c = makeCanvas(W, H), ctx = c.getContext('2d', { willReadFrequently: true }), samples = [], prev = null, KEYEVERY = 15;
  for (var i = 0; i <= N; i++) {
    checkCancel();
    drawExport(ctx, W, H, Lx, st, Math.min(i / o.fps, tot), 'alpha');
    var img = ctx.getImageData(0, 0, W, H), cur = new Uint32Array(img.data.buffer, img.data.byteOffset, W * H);
    var key = i % KEYEVERY === 0;
    samples.push({ data: qtrleFrame(cur, key ? null : prev, W, H), key: key });
    if (!prev) prev = new Uint32Array(W * H);
    prev.set(cur);
    prog(1); if (i % 2 === 0) await sleep(0);
  }
  return muxMOV(samples, W, H, o.fps);
}

/* ---- GIF fallback for browsers without WebCodecs */
function gifPalette() {
  var pal = [], r, g, b, i;
  for (r = 0; r < 6; r++) for (g = 0; g < 6; g++) for (b = 0; b < 6; b++) pal.push([r * 51, g * 51, b * 51]);
  [BR.red, BR.blue, BR.navy, BR.tint, BR.white, BR.black, '#00B140', '#FFFFFF'].forEach(function (h2) { pal.push(LT.rgb(h2)); });
  for (i = 0; pal.length < 256; i++) { var v = Math.round(i * 255 / 31); pal.push([v, v, v]); }
  return pal;
}
function gifEncode(frames, w, h, delayCs) {
  var pal = gifPalette(), exact = {};
  pal.forEach(function (c, i) { if (i >= 216 && i < 224) exact[(c[0] << 16) | (c[1] << 8) | c[2]] = i; });
  var out = [asc('GIF89a'), new Uint8Array([w & 255, w >> 8, h & 255, h >> 8, 0xF7, 0, 0])];
  out.push(new Uint8Array(pal.reduce(function (a, c) { a.push(c[0], c[1], c[2]); return a; }, [])));
  out.push(new Uint8Array([0x21, 0xFF, 0x0B]), asc('NETSCAPE2.0'), new Uint8Array([3, 1, 0, 0, 0]));
  frames.forEach(function (d) {
    var idx = new Uint8Array(w * h);
    for (var i = 0, p = 0; i < idx.length; i++, p += 4) {
      var r = d[p], g = d[p + 1], b = d[p + 2], k = (r << 16) | (g << 8) | b;
      if (exact[k] !== undefined) idx[i] = exact[k];
      else if (r === g && g === b && r % 51 !== 0) idx[i] = 224 + Math.round(r * 31 / 255);
      else idx[i] = Math.round(r / 51) * 36 + Math.round(g / 51) * 6 + Math.round(b / 51);
    }
    out.push(new Uint8Array([0x21, 0xF9, 4, 0, delayCs & 255, delayCs >> 8, 0, 0]), new Uint8Array([0x2C, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0]), new Uint8Array([8]));
    var bytes = lzw(idx), pos = 0;
    while (pos < bytes.length) { var len = Math.min(255, bytes.length - pos); out.push(new Uint8Array([len]), bytes.subarray(pos, pos + len)); pos += len; }
    out.push(new Uint8Array([0]));
  });
  out.push(new Uint8Array([0x3B]));
  return new Blob(out, { type: 'image/gif' });
}
function lzw(idx) {
  var out = [], cur = 0, nb = 0, size = 9, next = 258, dict = new Map(), CLEAR = 256, EOI = 257;
  function put(code) { cur |= code << nb; nb += size; while (nb >= 8) { out.push(cur & 255); cur >>= 8; nb -= 8; } }
  put(CLEAR);
  var prefix = idx[0];
  for (var i = 1; i < idx.length; i++) {
    var k = idx[i], key = prefix * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    put(prefix);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { put(CLEAR); dict = new Map(); next = 258; size = 9; }
    prefix = k;
  }
  put(prefix); put(EOI); if (nb > 0) out.push(cur & 255);
  return new Uint8Array(out);
}

/* ---------------------------------------------------------------- export engine */
function makeCanvas(w, h) { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
async function canvasPNG(c) {
  var blob = c.convertToBlob ? await c.convertToBlob({ type: 'image/png' }) : await new Promise(function (r) { c.toBlob(r, 'image/png'); });
  return new Uint8Array(await blob.arrayBuffer());
}
function drawExport(ctx, W, H, Lx, st, tt, bgKind) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  if (bgKind === 'green') { ctx.fillStyle = GREEN; ctx.fillRect(0, 0, W, H); }
  else if (bgKind === 'photo') { ctx.drawImage(makeBg(photoKind()), 0, 0, W, H); }
  LT.drawFrame(ctx, W, H, Lx, st, tt, { logos: logos });
}
function resWH(r) { return r === '4k' ? [3840, 2160] : [1920, 1080]; }
function seqPlan(st, fps) {
  var nIn = Math.round(st.tIn * fps), nOut = Math.round(st.tOut * fps), nHold = Math.round(st.hold * fps), tot = LT.totalTime(st), i;
  var inT = [], outT = [], fullT = [], N = Math.round(tot * fps);
  for (i = 0; i <= nIn; i++) inT.push(i === nIn ? st.tIn : i / fps);
  for (i = 0; i <= nOut; i++) outT.push(i === nOut ? tot : st.tIn + st.hold + i / fps);
  for (i = 0; i <= N; i++) fullT.push(i === N ? tot : i / fps);
  return { inT: inT, outT: outT, fullT: fullT, nIn: nIn, nOut: nOut, nHold: nHold };
}
function pad4(n) { return String(n).padStart(4, '0'); }
function checkCancel() { if (cancelFlag) { var e = new Error('Export cancelled'); e.cancelled = true; throw e; } }

async function produceSeq(st, o, base, prog) {
  var Lx = LT.buildLayout(st, meas), wh = resWH(o.res), plan = seqPlan(st, o.fps), files = [];
  var sets = [];
  if (o.full) sets.push(['full', plan.fullT]); if (o.inOnly) sets.push(['in', plan.inT]); if (o.outOnly) sets.push(['out', plan.outT]);
  for (var s = 0; s < sets.length; s++) {
    var tag = sets[s][0], c = makeCanvas(wh[0], wh[1]), ctx = c.getContext('2d');
    for (var i = 0; i < sets[s][1].length; i++) {
      checkCancel(); drawExport(ctx, wh[0], wh[1], Lx, st, sets[s][1][i], 'alpha');
      files.push({ path: base + '/' + tag + '/' + base + '_' + tag + '_' + pad4(i + 1) + '.png', data: await canvasPNG(c) });
      prog(1); if (i % 3 === 0) await sleep(0);
    }
  }
  var tot = LT.totalTime(st);
  var readme = 'Lower Thirds Studio export for ' + (st.name || 'lower third') + '\r\n' +
    'Style: ' + st.style + ', ' + wh[0] + 'x' + wh[1] + ', ' + o.fps + ' fps, transparent PNG sequence\r\n\r\n' +
    'full/  one continuous clip: in (' + st.tIn + ' s), hold (' + st.hold + ' s), out (' + st.tOut + ' s). First and last frames are fully transparent.\r\n' +
    'in/    the in animation only. Its last frame is the finished graphic. Hold that frame in your editor for as long as you need.\r\n' +
    'out/   the out animation only. Its first frame is the finished graphic and its last frame is fully transparent.\r\n\r\n' +
    'Import: DaVinci Resolve and Premiere Pro treat the folder as an image sequence. Set the sequence frame rate to ' + o.fps + '.\r\n' +
    'ProRes 4444 for Final Cut Pro (needs ffmpeg):\r\n  ffmpeg -framerate ' + o.fps + ' -i full/' + base + '_full_%04d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le ' + base + '.mov\r\n';
  files.push({ path: base + '/README.txt', data: te.encode(readme) });
  files.push({ path: base + '/timing.json', data: te.encode(JSON.stringify({ fps: o.fps, width: wh[0], height: wh[1], inSeconds: st.tIn, holdSeconds: st.hold, outSeconds: st.tOut, totalSeconds: tot, inFrames: plan.inT.length, outFrames: plan.outT.length, fullFrames: plan.fullT.length }, null, 2)) });
  return files;
}
async function produceStill(st, o, base, prog) {
  var Lx = LT.buildLayout(st, meas), wh = resWH(o.res), c = makeCanvas(wh[0], wh[1]);
  drawExport(c.getContext('2d'), wh[0], wh[1], Lx, st, st.motion === 'static' ? 0 : st.tIn, 'alpha'); prog(1);
  return [{ path: base + '_' + wh[0] + 'x' + wh[1] + '.png', data: await canvasPNG(c), single: true }];
}
function avcCodec(w) { return w > 1920 ? 'avc1.640033' : 'avc1.64002A'; }
async function encodeVideo(st, o, prog) {
  var Lx = LT.buildLayout(st, meas), tot = LT.totalTime(st), N = Math.round(tot * o.fps), c = makeCanvas(o.W, o.H), ctx = c.getContext('2d');
  var chunks = [], desc = null, err = null, alpha = o.codec === 'vp9a';
  var cfg = alpha ? { codec: 'vp09.00.10.08', width: o.W, height: o.H, bitrate: o.bitrate, framerate: o.fps, alpha: 'keep' } :
    { codec: avcCodec(o.W), width: o.W, height: o.H, bitrate: o.bitrate, framerate: o.fps, avc: { format: 'avc' }, latencyMode: 'quality' };
  var enc = new VideoEncoder({
    output: function (chunk, meta) {
      var d = new Uint8Array(chunk.byteLength); chunk.copyTo(d);
      var it = { data: d, key: chunk.type === 'key' };
      if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = new Uint8Array(meta.decoderConfig.description);
      if (meta && meta.alphaSideData) it.alpha = new Uint8Array(meta.alphaSideData);
      chunks.push(it);
    }, error: function (e) { err = e; }
  });
  enc.configure(cfg);
  for (var i = 0; i <= N; i++) {
    checkCancel(); if (err) throw err;
    drawExport(ctx, o.W, o.H, Lx, st, Math.min(i / o.fps, tot), o.bg);
    var vf = new VideoFrame(c, { timestamp: Math.round(i * 1e6 / o.fps), duration: Math.round(1e6 / o.fps), alpha: alpha ? 'keep' : 'discard' });
    enc.encode(vf, { keyFrame: i % 30 === 0 }); vf.close(); prog(1);
    while (enc.encodeQueueSize > 6) await sleep(0);
    if (i % 3 === 0) await sleep(0);
  }
  await enc.flush(); enc.close();
  if (err) throw err;
  if (alpha) {
    if (!chunks.length || !chunks[0].alpha) throw new Error('This browser did not return alpha data from the VP9 encoder. Use the PNG sequence instead.');
    return muxWebM(chunks, o.W, o.H, o.fps);
  }
  if (!desc) throw new Error('The H.264 encoder returned no decoder configuration.');
  return muxMP4(chunks, desc, o.W, o.H, o.fps);
}
async function produceVideo(st, o, base, prog) {
  var wh = resWH(o.res), b = o.fps >= 60 ? 1.6 : 1, tot = LT.totalTime(st);
  if (o.fmt === 'webm') {
    var blob = await encodeVideo(st, { codec: 'vp9a', W: wh[0], H: wh[1], fps: o.fps, bg: 'alpha', bitrate: (wh[0] > 1920 ? 12e6 : 4e6) * b }, prog);
    return [{ path: base + '_alpha.webm', data: blob, single: true }];
  }
  if (o.fmt === 'mov') {
    var blobM = await encodeMov(st, { W: wh[0], H: wh[1], fps: o.fps }, prog);
    return [{ path: base + '_alpha.mov', data: blobM }];
  }
  if (o.fmt === 'mp4g') {
    var blob2 = await encodeVideo(st, { codec: 'avc', W: wh[0], H: wh[1], fps: o.fps, bg: 'green', bitrate: (wh[0] > 1920 ? 30e6 : 10e6) * b }, prog);
    return [{ path: base + '_green.mp4', data: blob2, single: true }];
  }
  /* review */
  if (cap.h264) {
    var blob3 = await encodeVideo(st, { codec: 'avc', W: 1280, H: 720, fps: 30, bg: 'photo', bitrate: 4e6 }, prog);
    return [{ path: base + '_review.mp4', data: blob3, single: true }];
  }
  var Lx = LT.buildLayout(st, meas), c = makeCanvas(640, 360), ctx = c.getContext('2d', { willReadFrequently: true }), frames = [], N = Math.round(tot * 15);
  for (var i = 0; i <= N; i++) { checkCancel(); drawExport(ctx, 640, 360, Lx, st, Math.min(i / 15, tot), 'photo'); frames.push(ctx.getImageData(0, 0, 640, 360).data); prog(1); if (i % 3 === 0) await sleep(0); }
  return [{ path: base + '_review.gif', data: gifEncode(frames, 640, 360, 7), single: true }];
}
function frameCount(st, o) {
  var tot = LT.totalTime(st);
  if (o.fmt === 'still') return 1;
  if (o.fmt === 'seq') { var p = seqPlan(st, o.fps), n = 0; if (o.full) n += p.fullT.length; if (o.inOnly) n += p.inT.length; if (o.outOnly) n += p.outT.length; return n; }
  if (o.fmt === 'review') return Math.round(tot * (cap.h264 ? 30 : 15)) + 1;
  return Math.round(tot * o.fps) + 1;
}
async function produce(st, o, base, prog) {
  if (o.fmt === 'still') return produceStill(st, o, base, prog);
  if (o.fmt === 'seq') return produceSeq(st, o, base, prog);
  return produceVideo(st, Object.assign({}, o), base, prog);
}

/* ---------------------------------------------------------------- saving */
async function saveFile(name, data) {
  if (dlCap) {
    try { await dlCap.save({ filename: name, data: data }); return 'saved'; }
    catch (e) { if (e && e.code === 'declined') return 'declined'; if (e && (e.code === 'rejected_extension' || e.code === 'bad_request')) throw e; }
  }
  if (window.self !== window.top) return 'unavailable';
  var blob = data instanceof Blob ? data : new Blob([data]), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 30000); return 'saved';
}
function setProg(done, totalN, label) {
  $('#progWrap').hidden = false; $('#progBar').style.width = Math.min(100, done / Math.max(1, totalN) * 100) + '%';
  $('#exStatus').textContent = (label || 'Rendering') + ': ' + done + ' of ' + totalN + ' frames (' + Math.round(done / Math.max(1, totalN) * 100) + '%)';
}
function currentExport() {
  var o = Object.assign({}, ex);
  if (state.motion === 'static') o.fmt = 'still';
  return o;
}
async function runExport(entries, isBatch) {
  if (busy) return;
  if (!fontsOk) { $('#exStatus').textContent = 'Fonts have not loaded, so export is paused.'; return; }
  var o = currentExport();
  if (o.fmt === 'seq' && !o.full && !o.inOnly && !o.outOnly) { $('#exStatus').textContent = 'Choose at least one sequence: full, in only or out only.'; return; }
  busy = true; cancelFlag = false; $('#btnExport').disabled = true; $('#btnBatch').disabled = true; $('#btnCancel').hidden = false; $('#exStatus').textContent = 'Starting...';
  try {
    var totalFrames = 0; entries.forEach(function (e) { totalFrames += frameCount(LT.norm(e), o); });
    var done = 0, all = [], used = {};
    for (var i = 0; i < entries.length; i++) {
      var st = LT.norm(entries[i]), base = slug(st.name) || 'lower-third';
      if (isBatch) { base = pad4(i + 1).slice(1) + '-' + base; }
      else if (used[base]) base += '-' + used[base]; used[base] = (used[base] || 0) + 1;
      var files = await produce(st, o, base, function (n) { done += n; setProg(done, totalFrames, isBatch ? 'Rendering ' + (i + 1) + ' of ' + entries.length : 'Rendering'); });
      all = all.concat(files);
    }
    var res;
    if (all.length === 1 && all[0].single && !isBatch) res = await saveFile(all[0].path, all[0].data);
    else {
      $('#exStatus').textContent = 'Packing zip...'; await sleep(10);
      var zname = (isBatch ? 'lower-thirds-batch' : (slug(entries[0].name) || 'lower-third')) + '-' + o.fmt + '.zip';
      var zip = await makeZip(all.map(function (f) { return { path: f.path, data: f.data }; }));
      res = await saveFile(zname, zip);
    }
    $('#progBar').style.width = '100%';
    $('#exStatus').textContent = res === 'declined' ? 'Save cancelled. Nothing was written.' : res === 'unavailable' ? 'Rendering finished, but this view cannot save files. Open the artifact from your Claude conversation or the Claude app to export.' : 'Done. ' + (all.length > 1 ? all.length + ' files packed and saved.' : 'File saved.');
  } catch (e) {
    $('#exStatus').textContent = e && e.cancelled ? 'Export cancelled.' : 'Export failed: ' + ((e && e.message) || e);
  }
  busy = false; $('#btnExport').disabled = false; $('#btnBatch').disabled = false; $('#btnCancel').hidden = true;
}

/* ---- estimate */
var estTimer = 0, estToken = 0;
function scheduleEstimate() { clearTimeout(estTimer); estTimer = setTimeout(estimate, 500); }
function fmtBytes(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
async function estimate() {
  var token = ++estToken, o = currentExport(), st = state, el2 = $('#estimate');
  if (!fontsOk || !L) return;
  var wh = resWH(o.res), tot = LT.totalTime(st), n = frameCount(st, o), txt = '';
  try {
    if (o.fmt === 'still' || o.fmt === 'seq') {
      var Lx = L, c = makeCanvas(wh[0], wh[1]), ctx = c.getContext('2d'), sz = [];
      var times = o.fmt === 'still' ? [st.motion === 'static' ? 0 : st.tIn] : [st.tIn * 0.5, st.tIn + st.hold / 2, st.tIn + st.hold + st.tOut * 0.5];
      for (var i = 0; i < times.length; i++) { drawExport(ctx, wh[0], wh[1], Lx, st, times[i], 'alpha'); sz.push((await canvasPNG(c)).length); }
      if (token !== estToken) return;
      if (o.fmt === 'still') txt = 'Estimated size: ' + fmtBytes(sz[0]) + ' (' + wh[0] + 'x' + wh[1] + ' PNG).';
      else { var p = seqPlan(st, o.fps), bytes = 0; if (o.full) bytes += (p.nIn + p.nOut + 2) * (sz[0] + sz[2]) / 2 + (p.nHold) * sz[1]; if (o.inOnly) bytes += (p.nIn + 1) * sz[0]; if (o.outOnly) bytes += (p.nOut + 1) * sz[2];
        txt = 'About ' + fmtBytes(bytes) + ' for ' + n + ' frames at ' + wh[0] + 'x' + wh[1] + ' (estimated from sample frames).'; }
    } else if (o.fmt === 'mov') {
      var cm = makeCanvas(wh[0], wh[1]), cx2 = cm.getContext('2d', { willReadFrequently: true }), kb = [];
      [st.tIn * 0.5, st.tIn + st.hold / 2].forEach(function (tt) { drawExport(cx2, wh[0], wh[1], L, st, tt, 'alpha'); var im = cx2.getImageData(0, 0, wh[0], wh[1]); kb.push(qtrleFrame(new Uint32Array(im.data.buffer, im.data.byteOffset, wh[0] * wh[1]), null, wh[0], wh[1]).length); });
      if (token !== estToken) return;
      var pl = seqPlan(st, o.fps), nk = Math.ceil(n / 15), moving = pl.nIn + pl.nOut + 2;
      txt = 'About ' + fmtBytes(nk * kb[1] + moving * kb[0] * 0.35 + (n - moving) * 4000) + ' before zipping, for ' + n + ' frames at ' + wh[0] + 'x' + wh[1] + ' (rough estimate).';
    } else {
      var rate = o.fmt === 'webm' ? (wh[0] > 1920 ? 12 : 4) : o.fmt === 'mp4g' ? (wh[0] > 1920 ? 30 : 10) : 4;
      var fpsF = o.fps >= 60 && o.fmt !== 'review' ? 1.6 : 1;
      txt = 'Up to about ' + fmtBytes(rate * fpsF * 1e6 / 8 * tot) + ' for ' + tot.toFixed(1) + ' s (upper estimate, flat graphics usually come out smaller).';
    }
  } catch (e) { txt = ''; }
  if (token === estToken) el2.textContent = txt + (isBatchCount() > 1 ? ' Batch: multiply by ' + isBatchCount() + '.' : '');
}


/* ---- export panel */
var FORMATS = [
  { id: 'still', name: 'PNG still', desc: 'Transparent, one frame', anim: false },
  { id: 'seq', name: 'PNG sequence (zip)', desc: 'Transparent. Best for Premiere, Resolve', anim: true },
  { id: 'mov', name: 'MOV with alpha (zip)', desc: 'QuickTime Animation, transparent. Premiere, Final Cut, Resolve, CapCut', anim: true },
  { id: 'webm', name: 'WebM with alpha', desc: 'Transparent video, Chrome and Edge', anim: true },
  { id: 'mp4g', name: 'MP4 on green', desc: 'Solid #00B140, key it in your editor', anim: true },
  { id: 'review', name: 'Review video', desc: 'With background, for sharing', anim: true }
];
function fmtAvailable(f) {
  if (state.motion === 'static') return f.id === 'still';
  if (f.id === 'still') return true;
  if (f.id === 'webm') return cap.webm;
  if (f.id === 'mp4g') return cap.h264;
  return true;
}
function buildExportGrid() {
  var g = $('#fmtGrid'); g.innerHTML = '';
  FORMATS.forEach(function (f) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fmt'; b.setAttribute('role', 'radio'); b.setAttribute('data-v', f.id);
    b.innerHTML = '<strong>' + f.name + '</strong><span></span>'; b.addEventListener('click', function () { if (fmtAvailable(f)) { ex.fmt = f.id; renderExportOptions(); scheduleEstimate(); } }); g.appendChild(b);
  });
}
function renderExportOptions() {
  var effective = state.motion === 'static' ? 'still' : ex.fmt;
  if (!fmtAvailable(FORMATS.filter(function (f) { return f.id === effective; })[0])) effective = 'seq';
  if (state.motion === 'animated') ex.fmt = effective;
  $$('.fmt').forEach(function (b) {
    var f = FORMATS.filter(function (x) { return x.id === b.getAttribute('data-v'); })[0], okf = fmtAvailable(f), sel = b.getAttribute('data-v') === effective;
    b.setAttribute('aria-checked', String(sel)); b.setAttribute('aria-disabled', String(!okf));
    var note = f.desc;
    if (state.motion === 'static' && f.id !== 'still') note = 'Set Motion to Animated to use this';
    else if (f.id === 'webm' && !cap.webm) note = cap.checked ? 'Not supported in this browser. Use the PNG sequence.' : 'Checking browser support...';
    else if (f.id === 'mp4g' && !cap.h264) note = cap.checked ? 'This browser has no H.264 encoder. Use the PNG sequence.' : 'Checking browser support...';
    else if (f.id === 'review' && cap.checked && !cap.h264) note = 'Animated GIF (this browser has no H.264 encoder)';
    $('span', b).textContent = note;
  });
  var o = $('#exOpts'), f2 = effective, h = '';
  var sel = function (id, label, opts, val) { return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '" style="min-width:130px">' + opts.map(function (x) { return '<option value="' + x[0] + '"' + (String(x[0]) === String(val) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>'; };
  if (f2 === 'still') h += sel('exRes', 'Size', [['1080', '1920 x 1080'], ['4k', '3840 x 2160']], ex.res);
  if (f2 === 'seq' || f2 === 'webm' || f2 === 'mp4g' || f2 === 'mov') { h += sel('exFps', 'Frame rate', [[30, '30 fps'], [60, '60 fps']], ex.fps) + sel('exRes', 'Size', [['1080', '1920 x 1080'], ['4k', '3840 x 2160']], ex.res); }
  if (f2 === 'seq') {
    h += '<div><span class="lbl">Include</span><div class="row"><label class="chk"><input type="checkbox" id="exFull"' + (ex.full ? ' checked' : '') + '> Full</label><label class="chk"><input type="checkbox" id="exIn"' + (ex.inOnly ? ' checked' : '') + '> In only</label><label class="chk"><input type="checkbox" id="exOut"' + (ex.outOnly ? ' checked' : '') + '> Out only</label></div></div>';
  }
  if (f2 === 'mov') h += '<p class="hint" style="margin:0">The .mov is packed inside a zip, because this viewer only saves a fixed list of file types. Unzip it, then import the .mov. Pick the Animation codec with alpha (Straight) if your editor asks.</p>';
  if (f2 === 'review') h += '<p class="hint" style="margin:0">' + (cap.h264 || !cap.checked ? '1280 x 720 MP4 over the sample background, 30 fps.' : '640 x 360 animated GIF over the sample background, 15 fps.') + '</p>';
  o.innerHTML = h;
  var bind = function (id, fn) { var e = $(id); if (e) e.addEventListener('change', function () { fn(e); scheduleEstimate(); }); };
  bind('#exFps', function (e) { ex.fps = +e.value; }); bind('#exRes', function (e) { ex.res = e.value; });
  bind('#exFull', function (e) { ex.full = e.checked; }); bind('#exIn', function (e) { ex.inOnly = e.checked; }); bind('#exOut', function (e) { ex.outOnly = e.checked; });
  $('#btnExport').textContent = f2 === 'still' ? 'Export PNG' : 'Export ' + FORMATS.filter(function (x) { return x.id === f2; })[0].name.replace(' (zip)', ' zip');
}
function refreshExportLabels() { rdInfo(); }
async function detectCodecs() {
  try {
    if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
      try { var r = await VideoEncoder.isConfigSupported({ codec: 'vp09.00.10.08', width: 1920, height: 1080, bitrate: 4e6, framerate: 30, alpha: 'keep' }); cap.webm = !!(r.supported && r.config && r.config.alpha === 'keep'); } catch (e) { cap.webm = false; }
      try { var r2 = await VideoEncoder.isConfigSupported({ codec: 'avc1.64002A', width: 1920, height: 1080, bitrate: 8e6, framerate: 30, avc: { format: 'avc' } }); cap.h264 = !!r2.supported; } catch (e) { cap.h264 = false; }
    }
  } finally { cap.checked = true; renderExportOptions(); }
}

/* ---------------------------------------------------------------- save / load JSON */
function exportJSON() {
  var o = Object.assign({ app: 'Lower Thirds Studio', version: 1 }, state);
  return JSON.stringify(o, null, 2);
}
function applyJSON(txt) {
  var o = JSON.parse(txt);
  if (!o || typeof o !== 'object') throw new Error('Not a saved design');
  state = LT.norm(o); baseStyle = state.style; t = state.tIn; refresh();
}
function initEvents() {
  function txt(id, key) { $(id).addEventListener('input', function (e) { var p = {}; p[key] = e.target.value; patch(p); if (activeRow >= 0 && rows[activeRow]) { rows[activeRow][key] = e.target.value; persistRows(); var inp = $('#rdTable tr[data-i="' + activeRow + '"] input[data-f="' + key + '"]'); if (inp && inp !== document.activeElement) inp.value = e.target.value; } }); }
  txt('#inName', 'name'); txt('#inTitle', 'title'); txt('#inThird', 'third');
  function seg(sel, fn) { $$('button', $(sel)).forEach(function (b) { b.addEventListener('click', function () { fn(b.getAttribute('data-v')); }); }); }
  seg('#logoSeg', function (v) {
    var p = { logoOn: v === 'on' };
    patch(p);
  });
  seg('#alignSeg', function (v) { patch({ align: v }); });
  seg('#motionSeg', function (v) { if (v === 'static') setPlaying(false); patch({ motion: v }); if (v === 'animated') { t = state.tIn; paint(); renderTimeline(); } });
  seg('#bgSeg', function (v) { patch({ bg: v }); });
  seg('#speedSeg', function (v) { speed = +v; setPressed('#speedSeg', v); });
  function rng(id, key) { $(id).addEventListener('input', function (e) { patch((function () { var o = {}; o[key] = +e.target.value; return o; })()); }); }
  var tabIds = ['content', 'look', 'type', 'motion'];
  $$('#tabs button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    b.addEventListener('keydown', function (e) {
      var i = tabIds.indexOf(b.getAttribute('data-tab')), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); showTab(tabIds[(i + d + 4) % 4], true); }
    });
  });
  var t0 = 'content'; try { t0 = sessionStorage.getItem('lt-tab') || 'content'; } catch (e) { /* ignore */ }
  showTab(tabIds.indexOf(t0) < 0 ? 'content' : t0);
  seg('#lineSeg', function (v) { typeLine = v; syncType(); });
  seg('#capsSeg', function (v) { tpatch({ caps: v }); });
  $('#rngTSize').addEventListener('input', function (e) { tpatch({ size: +e.target.value }); });
  $('#rngTrack').addEventListener('input', function (e) { tpatch({ track: +e.target.value }); });
  $('#rngLead').addEventListener('input', function (e) { tpatch({ lead: +e.target.value }); });
  $('#chkKern').addEventListener('change', function (e) { tpatch({ kern: e.target.checked }); });
  $('#btnTypeReset').addEventListener('click', function () { tpatch(JSON.parse(JSON.stringify(LT.TEXT_DEFAULTS[typeLine]))); });
  $('#chkAutoW').addEventListener('change', function (e) { patch(e.target.checked ? { autoW: true } : { autoW: false, width: Math.round(L.ctrlW) }); });
  $('#chkAutoH').addEventListener('change', function (e) { patch(e.target.checked ? { autoH: true } : { autoH: false, height: Math.round(L.ctrlH) }); });
  $('#rngW').addEventListener('input', function (e) { patch({ autoW: false, width: +e.target.value }); });
  $('#rngH').addEventListener('input', function (e) { patch({ autoH: false, height: +e.target.value }); });
  $('#btnRead').addEventListener('click', function () { patch({ hold: LT.clamp(Math.ceil(LT.minHold(state) * 2) / 2, 1, 15) }); });
  rng('#rngSize', 'size'); rng('#rngMargin', 'margin'); rng('#rngIn', 'tIn'); rng('#rngHold', 'hold'); rng('#rngOut', 'tOut');
  $('#selIn').addEventListener('change', function (e) { patch({ inPreset: e.target.value }); });
  $('#selOut').addEventListener('change', function (e) { patch({ outPreset: e.target.value }); });
  $('#btnPlay').addEventListener('click', function () { setPlaying(!playing); });
  $('#btnLoop').addEventListener('click', function () { loop = !loop; $('#btnLoop').setAttribute('aria-pressed', String(loop)); });
  $('#scrub').addEventListener('input', function (e) { setPlaying(false); t = +e.target.value; updateTime(); paint(); });
  $('#chkSafe').addEventListener('change', function (e) { guides.safe = e.target.checked; paint(); });
  $('#chkClear').addEventListener('change', function (e) { guides.clear = e.target.checked; paint(); });
  $('#btnMatrix').addEventListener('click', runMatrix);
  $('#btnExport').addEventListener('click', function () { runExport([state], false); });
  $('#btnCancel').addEventListener('click', function () { cancelFlag = true; });
  $('#btnBatch').addEventListener('click', function () {
    if (!rows.length) { $('#batchInfo').textContent = 'Add at least one row first.'; return; }
    runExport(rundownEntries(), true);
  });
  $('#btnGfx').addEventListener('click', function () { $('#fileGfx').click(); });
  $('#fileGfx').addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ''; handleGfxFile(f); });
  $('#btnGfxRm').addEventListener('click', function () { patch({ gfx: { on: false, src: '', aw: 0, ah: 0, size: 100 } }); });
  $('#chkGfx').addEventListener('change', function (e) { patch({ gfx: Object.assign({}, state.gfx, { on: e.target.checked }) }); });
  $('#rngGfx').addEventListener('input', function (e) { patch({ gfx: Object.assign({}, state.gfx, { size: +e.target.value }) }); });
  $('#btnSave').addEventListener('click', async function () {
    try { var r = await saveFile((slug(state.name) || 'lower-third') + '.json', exportJSON()); $('#exStatus').textContent = r === 'declined' ? 'Save cancelled.' : r === 'unavailable' ? 'This view cannot save files. Open the artifact from your Claude conversation or the Claude app.' : 'Design saved as ' + (slug(state.name) || 'lower-third') + '.json. Use Open saved design to bring it back.'; } catch (e) { $('#exStatus').textContent = 'Could not save the design: ' + (e.message || e); }
  });
  $('#btnLoad').addEventListener('click', function () { $('#fileLoad').click(); });
  $('#fileLoad').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () { try { applyJSON(String(fr.result)); $('#exStatus').textContent = 'Opened design ' + f.name; } catch (err) { $('#exStatus').textContent = 'That file is not a saved design from this app.'; } };
    fr.readAsText(f); e.target.value = '';
  });
  $('#btnReset').addEventListener('click', function () { state = LT.norm(LT.DEFAULTS); baseStyle = state.style; t = state.tIn; setPlaying(false); refresh(); });
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target.tagName || '')) && state.motion === 'animated') { e.preventDefault(); setPlaying(!playing); }
  });
}

/* ---------------------------------------------------------------- rundown (batch rows) */
function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function styleIdFrom(v) {
  v = String(v || '').trim().toLowerCase(); if (!v) return '';
  var hit = LT.STYLES.filter(function (x) { return x.id === v || x.name.toLowerCase() === v; })[0];
  return hit ? hit.id : (v === 'slate' || v === 'title slate' ? 'strip' : '');
}
function cleanRow(r) { r = r || {}; return { name: String(r.name || '').slice(0, 120), title: String(r.title || '').slice(0, 120), third: String(r.third || '').slice(0, 120), style: styleIdFrom(r.style) }; }
function persistRows() { try { localStorage.setItem(RKEY, JSON.stringify({ rows: rows })); } catch (e) { /* ignore */ } }
function parseDelimited(text, d) {
  var out = [], row = [], cur = '', q = false, i, c;
  text = String(text).replace(/\r\n?/g, '\n');
  for (i = 0; i < text.length; i++) {
    c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && cur === '') q = true;
    else if (c === d) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); out.push(row); row = []; cur = ''; }
    else cur += c;
  }
  row.push(cur); out.push(row);
  return out.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
}
function parseTable(text) {
  var first = String(text).split(/\r?\n/).filter(function (l) { return l.trim(); })[0] || '';
  var d = first.indexOf('\t') >= 0 ? '\t' : ((first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',');
  var grid = parseDelimited(text, d), map = { name: 0, title: 1, third: 2, style: 3 }, skipped = 0;
  if (grid.length) {
    var h = grid[0].map(function (x) { return String(x).trim().toLowerCase(); });
    var isHead = h.some(function (x) { return /^(name|full name|person|who)$/.test(x); });
    if (isHead) {
      map = { name: -1, title: -1, third: -1, style: -1 };
      h.forEach(function (x, i) {
        if (/^(name|full name|person|who)$/.test(x)) map.name = i;
        else if (/^(title|role|position|job title)$/.test(x)) map.title = i;
        else if (/^(third|third line|school|organization|org|department|line 3|subtitle|affiliation)$/.test(x)) map.third = i;
        else if (/^(style|type|look)$/.test(x)) map.style = i;
      });
      grid = grid.slice(1); skipped = 1;
    }
  }
  var out = grid.slice(0, 500).map(function (r) {
    function g(k) { return map[k] >= 0 && r[map[k]] != null ? String(r[map[k]]).trim() : ''; }
    return cleanRow({ name: g('name'), title: g('title'), third: g('third'), style: g('style') });
  }).filter(function (r) { return r.name || r.title || r.third; });
  return { rows: out, header: !!skipped };
}
function blankRow() { return { name: '', title: '', third: '', style: '' }; }
function isBlank(r) { return !r.name && !r.title && !r.third; }
function renderRundown() {
  var tb = $('#rdTable'), h = '<thead><tr><th scope="col" style="width:92px">#</th><th scope="col">Name</th><th scope="col">Title</th><th scope="col">Third line</th><th scope="col" style="width:150px">Style</th><th scope="col" style="width:' + (APP === 'live' ? 240 : 160) + 'px"><span class="sr">Actions</span></th></tr></thead><tbody>';
  if (!rows.length) h += '<tr><td colspan="6"><div class="empty">No rows yet. Use Add row, Paste table, Upload CSV or Example rundown.</div></td></tr>';
  rows.forEach(function (r, i) {
    var n = i + 1;
    h += '<tr data-i="' + i + '"' + (i === activeRow ? ' class="active"' : '') + '><td><div class="rdnum"><span class="grip" draggable="true" title="Drag to reorder" aria-hidden="true">&#8942;&#8942;</span><button type="button" class="show" data-act="show" aria-label="Show row ' + n + ' in the preview">' + n + '</button></div></td>' +
      '<td><input type="text" data-f="name" maxlength="120" value="' + esc(r.name) + '" aria-label="Name, row ' + n + '"></td>' +
      '<td><input type="text" data-f="title" maxlength="120" value="' + esc(r.title) + '" aria-label="Title, row ' + n + '"></td>' +
      '<td><input type="text" data-f="third" maxlength="120" value="' + esc(r.third) + '" aria-label="Third line, row ' + n + '"></td>' +
      '<td><select data-f="style" aria-label="Style, row ' + n + '"><option value="">Current style</option>' + LT.STYLES.map(function (sd) { return '<option value="' + sd.id + '"' + (r.style === sd.id ? ' selected' : '') + '>' + sd.name + '</option>'; }).join('') + '</select></td>' +
      '<td><div class="rdact">' + (APP === 'live' ? '<button type="button" class="ibtn tk" data-act="take" title="Put this row on air" aria-label="Take row ' + n + ' on air">TAKE</button>' : '') + '<button type="button" class="ibtn" data-act="up" aria-label="Move row ' + n + ' up"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button><button type="button" class="ibtn" data-act="down" aria-label="Move row ' + n + ' down"' + (i === rows.length - 1 ? ' disabled' : '') + '>&darr;</button><button type="button" class="ibtn" data-act="ins" title="Insert a row below" aria-label="Insert a row below row ' + n + '">+</button><button type="button" class="ibtn" data-act="del" title="Delete row" aria-label="Delete row ' + n + '">&times;</button></div></td></tr>';
  });
  tb.innerHTML = h + '</tbody>';
  rdInfo(); markAir();
}
function rdInfo() {
  var n = rows.length;
  $('#rdInfo').textContent = n ? n + (n === 1 ? ' row' : ' rows') + (activeRow >= 0 ? ', row ' + (activeRow + 1) + ' on preview' : '') : '';
  $('#batchInfo').textContent = n ? n + (n === 1 ? ' row' : ' rows') + ' ready.' : 'No rows yet.';
  $('#btnBatch').textContent = n ? 'Export all ' + n + ' ' + (n === 1 ? 'row' : 'rows') : 'Export all rows';
}
function markAir() { $$('#rdTable tbody tr[data-i]').forEach(function (tr) { tr.classList.toggle('air', !!(liveAir && liveAir.onAir && +tr.getAttribute('data-i') === liveAir.row)); }); }
function markActive() { $$('#rdTable tbody tr[data-i]').forEach(function (tr) { tr.classList.toggle('active', +tr.getAttribute('data-i') === activeRow); }); rdInfo(); }
function rowStyle(r) { return r.style || baseStyle; }
function setActive(i) {
  activeRow = i; markActive();
  if (i < 0 || !rows[i]) return;
  var r = rows[i];
  patch({ name: r.name, title: r.title, third: r.third, style: rowStyle(r) });
}
function rowsChanged(focusRow) {
  persistRows(); renderRundown(); scheduleEstimate(); refreshExportLabels();
  if (focusRow != null) { var inp = $('#rdTable tr[data-i="' + focusRow + '"] input[data-f="name"]'); if (inp) { inp.focus(); inp.scrollIntoView({ block: 'nearest' }); } }
}
function moveRow(from, to) {
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return;
  var r = rows.splice(from, 1)[0]; rows.splice(to, 0, r);
  if (activeRow === from) activeRow = to; else if (from < activeRow && to >= activeRow) activeRow--; else if (from > activeRow && to <= activeRow) activeRow++;
  rowsChanged();
}
function importRows(list, at, replaceBlank) {
  if (!list.length) return 0;
  var room = Math.max(0, 500 - rows.length + (replaceBlank && rows[at] && isBlank(rows[at]) ? 1 : 0)); list = list.slice(0, room);
  if (!list.length) return 0;
  if (replaceBlank && rows[at] && isBlank(rows[at])) { rows.splice(at, 1, ...list); }
  else { var pos = at == null ? rows.length : at + 1; rows.splice.apply(rows, [pos, 0].concat(list)); if (activeRow >= pos) activeRow += list.length; }
  rowsChanged(); return list.length;
}
function toCSV() {
  function q(x) { x = String(x == null ? '' : x); return /[",\r\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
  var out = ['Name,Title,Third line,Style'];
  if (!rows.length) out.push('Maria Gonzalez,Principal,Oxnard High School,', 'Float 1,Pacifica High School Marching Band,Presented by a community sponsor,Banner Strip', 'Intermission,We will be right back,Oxnard Union High School District,Split Plate');
  rows.forEach(function (r) { var sd = LT.STYLES.filter(function (x) { return x.id === r.style; })[0]; out.push([r.name, r.title, r.third, sd ? sd.name : ''].map(q).join(',')); });
  return out.join('\r\n') + '\r\n';
}
function initRundown() {
  var tb = $('#rdTable'), dragIdx = -1;
  tb.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var i = +b.closest('tr').getAttribute('data-i'), a = b.getAttribute('data-act');
    if (a === 'show') setActive(i);
    else if (a === 'take') liveTake(i);
    else if (a === 'up') moveRow(i, i - 1);
    else if (a === 'down') moveRow(i, i + 1);
    else if (a === 'ins') { rows.splice(i + 1, 0, blankRow()); if (activeRow > i) activeRow++; rowsChanged(i + 1); }
    else if (a === 'del') { rows.splice(i, 1); if (activeRow === i) activeRow = -1; else if (activeRow > i) activeRow--; rowsChanged(); }
  });
  tb.addEventListener('input', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-f'); if (!f || f === 'style') return;
    var i = +e.target.closest('tr').getAttribute('data-i'); rows[i][f] = e.target.value; persistRows();
    if (i === activeRow) { var p = {}; p[f] = e.target.value; patch(p); }
  });
  tb.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-f') !== 'style') return;
    var i = +e.target.closest('tr').getAttribute('data-i'); rows[i].style = e.target.value; persistRows();
    if (i === activeRow) patch({ style: rowStyle(rows[i]) });
  });
  tb.addEventListener('focusin', function (e) { /* keep the preview in step with the row being edited */
    var tr = e.target.closest && e.target.closest('tr[data-i]'); if (!tr || !e.target.getAttribute('data-f')) return;
    var i = +tr.getAttribute('data-i'); if (i !== activeRow) setActive(i);
  });
  tb.addEventListener('paste', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-f'); if (!f) return;
    var txt = (e.clipboardData && e.clipboardData.getData('text')) || '';
    if (!/[\t\n]/.test(txt.replace(/\s+$/, ''))) return;
    e.preventDefault();
    var i = +e.target.closest('tr').getAttribute('data-i'), res = parseTable(txt);
    var n = importRows(res.rows, i, true); $('#rdInfo').textContent = n ? 'Pasted ' + n + (n === 1 ? ' row.' : ' rows.') : 'Nothing to paste.';
  });
  tb.addEventListener('dragstart', function (e) {
    var g = e.target.closest && e.target.closest('.grip'); if (!g) { e.preventDefault(); return; }
    var tr = g.closest('tr'); dragIdx = +tr.getAttribute('data-i'); tr.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch (x) { /* ignore */ }
  });
  tb.addEventListener('dragover', function (e) {
    if (dragIdx < 0) return; var tr = e.target.closest('tr[data-i]'); if (!tr) return; e.preventDefault();
    $$('tr.dragover', tb).forEach(function (x) { x.classList.remove('dragover'); }); tr.classList.add('dragover');
  });
  tb.addEventListener('drop', function (e) {
    if (dragIdx < 0) return; var tr = e.target.closest('tr[data-i]'); if (!tr) return; e.preventDefault();
    var to = +tr.getAttribute('data-i'), from = dragIdx; dragIdx = -1; moveRow(from, to);
  });
  tb.addEventListener('dragend', function () { dragIdx = -1; $$('tr.dragover,tr.dragging', tb).forEach(function (x) { x.classList.remove('dragover', 'dragging'); }); });
  $('#rdAdd').addEventListener('click', function () { rows.push(blankRow()); rowsChanged(rows.length - 1); setActive(rows.length - 1); });
  $('#rdPasteBtn').addEventListener('click', function () { var p = $('#rdPaste'); p.hidden = !p.hidden; if (!p.hidden) $('#rdPasteIn').focus(); });
  $('#rdPasteCancel').addEventListener('click', function () { $('#rdPaste').hidden = true; });
  $('#rdPasteGo').addEventListener('click', function () {
    var res = parseTable($('#rdPasteIn').value), n = importRows(res.rows, null, false);
    $('#rdPasteInfo').textContent = n ? 'Added ' + n + (n === 1 ? ' row' : ' rows') + (res.header ? ' (header row skipped).' : '.') : 'No rows found. Paste cells with a name, title and third line.';
    if (n) { $('#rdPasteIn').value = ''; $('#rdPaste').hidden = true; }
  });
  $('#rdCsv').addEventListener('click', function () { $('#rdFile').click(); });
  $('#rdFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () { var res = parseTable(String(fr.result).replace(/^﻿/, '')), n = importRows(res.rows, null, false); $('#rdInfo').textContent = n ? 'Loaded ' + n + (n === 1 ? ' row' : ' rows') + ' from ' + f.name + '.' : 'No rows found in ' + f.name + '.'; };
    fr.readAsText(f); e.target.value = '';
  });
  $('#rdTemplate').addEventListener('click', async function () {
    try { var r = await saveFile('lower-thirds-rundown.csv', toCSV()); $('#rdInfo').textContent = r === 'declined' ? 'Save cancelled.' : r === 'unavailable' ? 'This view cannot save files.' : 'Saved lower-thirds-rundown.csv'; } catch (x) { $('#rdInfo').textContent = 'Could not save the design: ' + (x.message || x); }
  });
  $('#rdExample').addEventListener('click', function () {
    importRows([
      { name: 'Float 1', title: 'Oxnard High School Marching Band', third: 'Oxnard High School', style: 'strip' },
      { name: 'Float 2', title: 'Pacifica High School Dance Team', third: 'Pacifica High School', style: 'strip' },
      { name: 'Our Sponsors', title: 'Thank you to our parade sponsors', third: 'Presented by local community partners', style: 'split' },
      { name: 'Maria Gonzalez', title: 'Principal', third: 'Oxnard High School', style: '' },
      { name: 'Intermission', title: 'We will be right back', third: 'Oxnard Union High School District', style: 'split' }
    ].map(cleanRow), null, false);
  });
  $('#rdClear').addEventListener('click', function () { if (!rows.length) return; if (!window.__clearArmed) { window.__clearArmed = true; $('#rdClear').textContent = 'Click again to clear'; setTimeout(function () { window.__clearArmed = false; $('#rdClear').textContent = 'Clear all'; }, 3000); return; } window.__clearArmed = false; $('#rdClear').textContent = 'Clear all'; rows = []; activeRow = -1; rowsChanged(); });
  renderRundown();
}
function rundownEntries() { return rows.map(function (r) { return Object.assign({}, state, { name: r.name, title: r.title, third: r.third, style: rowStyle(r) }); }); }
function isBatchCount() { return rows.length; }

/* ---------------------------------------------------------------- custom graphic */
var gfxLoaded = '';
function ensureGfx() {
  var g = state.gfx;
  if (!g || !g.src) { gfxLoaded = ''; delete logos.gfx; return; }
  if (gfxLoaded === g.src) return;
  gfxLoaded = g.src;
  loadImg(g.src).then(function (i) { if (gfxLoaded === g.src) { logos.gfx = i; paint(); renderThumbs(); } }).catch(function () { /* ignore */ });
}
function syncGfx() {
  var g = state.gfx || {}, has = !!g.src;
  $('#gfxPrev').hidden = !has; $('#gfxSize').hidden = !has; $('#btnGfxRm').hidden = !has;
  $('#btnGfx').textContent = has ? 'Replace image' : 'Upload image';
  if (has && $('#gfxImg').getAttribute('src') !== g.src) $('#gfxImg').src = g.src;
  $('#chkGfx').checked = !!g.on; $('#rngGfx').value = g.size || 100; $('#oGfx').textContent = (g.size || 100) + '%';
}
async function handleGfxFile(file) {
  var st = $('#exStatus');
  if (!file) return;
  if (!/^image\//.test(file.type) && !/\.(png|jpe?g|webp|svg|gif)$/i.test(file.name)) { st.textContent = 'Choose a PNG, JPG, WebP, GIF or SVG image.'; return; }
  if (file.size > 8 * 1024 * 1024) { st.textContent = 'That image is over 8 MB. Choose a smaller file.'; return; }
  try {
    var isSvg = /svg/.test(file.type) || /\.svg$/i.test(file.name), url, aspect = 0;
    if (isSvg) {
      var txt = await file.text(); var vb = txt.match(/viewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
      if (vb && +vb[1] > 0 && +vb[2] > 0) aspect = +vb[1] / +vb[2];
      url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(txt)));
    } else {
      url = await new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result)); }; fr.onerror = rej; fr.readAsDataURL(file); });
    }
    var img = await loadImg(url), nw = img.naturalWidth || img.width || 300, nh = img.naturalHeight || img.height || 150;
    if (aspect) { nh = nw / aspect; }
    var k = Math.min(1, 640 / Math.max(nw, nh)), w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
    if (isSvg && k === 1) { var up = 640 / Math.max(nw, nh); w = Math.round(nw * up); h = Math.round(nh * up); }
    var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
    var out = c.toDataURL('image/png');
    patch({ gfx: { on: true, src: out, aw: w, ah: h, size: (state.gfx && state.gfx.size) || 100 } });
    st.textContent = 'Graphic added. It is kept with your design when you use Save my design.';
  } catch (e) { st.textContent = 'Could not read that image.'; }
}

/* ---------------------------------------------------------------- live output (OBS) */
var LCFG = 'ouhsd-lt-live-cfg', LMSG = 'ouhsd-lt-live-msg', LCH = 'ouhsd-lt-live';
var lbc = null; try { lbc = new BroadcastChannel(LCH); } catch (e) { lbc = null; }
var lseen = {};
function luid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function lsend(m) {
  m.id = luid(); lseen[m.id] = 1;
  try { if (lbc) lbc.postMessage(m); } catch (e) { /* ignore */ }
  try { localStorage.setItem(LMSG, JSON.stringify(m)); } catch (e) { /* too large or blocked, the channel above still works */ }
}
function llisten(fn) {
  function got(m) { if (!m || !m.id || lseen[m.id]) return; lseen[m.id] = 1; fn(m); }
  if (lbc) lbc.onmessage = function (ev) { got(ev.data); };
  window.addEventListener('storage', function (ev) { if (ev.key === LMSG && ev.newValue) { try { got(JSON.parse(ev.newValue)); } catch (e) { /* ignore */ } } });
}
function lcfgLoad() { var c = { key: '#00B140', auto: 0, adv: true }; try { var s = JSON.parse(localStorage.getItem(LCFG) || '{}'); if (s.key) c.key = s.key; if (s.auto != null) c.auto = +s.auto || 0; if (s.adv === false) c.adv = false; } catch (e) { /* ignore */ } return c; }
function lcfgSave(c) { try { localStorage.setItem(LCFG, JSON.stringify(c)); } catch (e) { /* ignore */ } }

/* The output window: nothing but the key color and the graphic. Add it to OBS as a Window Capture and key the color out. */
function runOutput() {
  document.body.className = 'output'; document.title = 'OUHSD Live Output';
  var root = document.createElement('div'); root.id = 'outRoot';
  var stage = document.createElement('div'); stage.id = 'outStage'; root.appendChild(stage);
  var hint = document.createElement('div'); hint.id = 'outHint';
  hint.innerHTML = '<b>Live output window</b><span>Press F for full screen. In OBS, add this window with Window Capture, then add a Chroma Key filter. Press H to hide this note.</span>';
  root.appendChild(hint); document.body.appendChild(root);
  var cfg = lcfgLoad();
  function setKey(k) { var c = k === 'transparent' ? 'transparent' : k; root.style.background = c; document.body.style.background = c; }
  setKey(cfg.key);
  function fit() { var k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080); stage.style.transform = 'translate(' + ((window.innerWidth - 1920 * k) / 2) + 'px,' + ((window.innerHeight - 1080 * k) / 2) + 'px) scale(' + k + ')'; }
  fit(); window.addEventListener('resize', fit);
  var player = Overlay.Player(stage, function (s) { lsend({ t: 'status', src: 'out', onAir: s.onAir, row: s.row }); });
  var hideT = setTimeout(function () { hint.hidden = true; }, 12000);
  function toggleFs() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ } }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'f' || e.key === 'F') toggleFs();
    else if (e.key === 'h' || e.key === 'H') { hint.hidden = !hint.hidden; clearTimeout(hideT); }
  });
  root.addEventListener('dblclick', toggleFs);
  llisten(function (m) {
    if (m.t === 'take' && m.entry) {
      if (m.key) { cfg.key = m.key; setKey(m.key); }
      Overlay.fontsReady().then(function () { player.take(m.entry, m.row, m.auto || 0); });
    } else if (m.t === 'clear') player.clear();
    else if (m.t === 'cfg' && m.key) { cfg.key = m.key; setKey(m.key); }
    else if (m.t === 'ping') { var s = player.status(); lsend({ t: 'pong', src: 'out', onAir: s.onAir, row: s.row }); }
  });
  Overlay.fontsReady().then(function () { lsend({ t: 'pong', src: 'out', onAir: false, row: -1 }); });
  window.__out = player;
}

/* The control side: TAKE and CLEAR, the cue, and the output window link */
function liveTake(i) {
  var e, row = -1;
  if (rows.length) { if (i == null) i = activeRow >= 0 ? activeRow : 0; row = i; var r = rows[i]; if (!r) return; e = Object.assign({}, state, { name: r.name, title: r.title, third: r.third, style: rowStyle(r) }); }
  else e = Object.assign({}, state);
  var cfg = lcfgLoad();
  lsend({ t: 'take', entry: e, row: row, auto: cfg.auto, key: cfg.key });
  if (row >= 0) setActive(cfg.adv ? Math.min(rows.length - 1, row + 1) : row);
}
function initLive() {
  var cfg = lcfgLoad(), outSeen = 0;
  $('#selKey').value = cfg.key; $('#selAuto').value = String(cfg.auto); $('#chkAdv').checked = cfg.adv;
  function save() { cfg.key = $('#selKey').value; cfg.auto = +$('#selAuto').value; cfg.adv = $('#chkAdv').checked; lcfgSave(cfg); }
  function pills() {
    var live = Date.now() - outSeen < 5000;
    var o = $('#outPill'); o.className = 'pill ' + (live ? 'ok' : 'warn'); o.textContent = live ? 'Output window connected' : 'No output window yet';
    var a = $('#airPill'); a.className = 'pill ' + (liveAir.onAir ? 'air' : 'off'); a.textContent = liveAir.onAir ? 'On air' : 'Off air';
    var c = $('#cueTxt'); var r = rows[activeRow];
    c.textContent = rows.length ? (r ? 'Next up: ' + (activeRow + 1) + '. ' + (r.name || '(no name)') : 'Pick a row to cue it') : 'No rundown rows. TAKE puts the text in the preview on air.';
    markAir();
  }
  $('#bTake').addEventListener('click', function () { liveTake(); });
  $('#bClear').addEventListener('click', function () { lsend({ t: 'clear' }); });
  $('#bPrev').addEventListener('click', function () { if (rows.length) setActive(Math.max(0, (activeRow < 0 ? 0 : activeRow) - 1)); });
  $('#bNext').addEventListener('click', function () { if (rows.length) setActive(Math.min(rows.length - 1, activeRow + 1)); });
  $('#selKey').addEventListener('change', function () { save(); lsend({ t: 'cfg', key: cfg.key }); });
  $('#selAuto').addEventListener('change', save); $('#chkAdv').addEventListener('change', save);
  var base = location.href.split('#')[0], selfUrl = (window.LT_SELF || '').replace(/#.*$/, '');
  $('#outUrl').value = base + '#output';
  if (selfUrl) { var lk = $('#outLink'); lk.href = selfUrl + '#output'; lk.hidden = false; }
  $('#btnOpenOut').addEventListener('click', function () {
    var w = null; try { w = window.open(base + '#output', 'ouhsd-lt-output', 'popup=yes,width=1280,height=720'); } catch (e) { w = null; }
    $('#outHelp').hidden = !!w; if (w) { try { w.focus(); } catch (e) { /* ignore */ } }
  });
  $('#btnCopyOut').addEventListener('click', function () {
    var inp = $('#outUrl'), st = $('#copyNote');
    function done(ok) { st.textContent = ok ? 'Address copied.' : 'Press Cmd+C to copy the selected address.'; }
    inp.focus(); inp.select();
    try { navigator.clipboard.writeText(inp.value).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  });
  window.addEventListener('keydown', function (e) {
    var tag = e.target.tagName;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space' || e.key === 'Enter') { if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return; e.preventDefault(); liveTake(); }
    else if (e.key === 'Escape') { e.preventDefault(); lsend({ t: 'clear' }); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); $('#bNext').click(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); $('#bPrev').click(); }
  });
  llisten(function (m) {
    if (m.src === 'out' && (m.t === 'pong' || m.t === 'status')) { outSeen = Date.now(); liveAir = { onAir: m.onAir, row: m.row }; pills(); }
  });
  setInterval(function () { lsend({ t: 'ping' }); pills(); }, 2000); lsend({ t: 'ping' });
  var oldMark = markActive; markActive = function () { oldMark(); pills(); };
  pills();
}

/* ---------------------------------------------------------------- boot */
if (OUTPUT) { runOutput(); return; }
buildStatic(); buildExportGrid(); initEvents(); initRundown(); syncControls(); if (APP === 'live') initLive();
if (window.claude && window.claude.use) { window.claude.use('downloads').then(function (d) { dlCap = d || null; }).catch(function () { dlCap = null; }); }
Promise.all([logoPromise, loadFonts()]).then(function () {
  return document.fonts.ready;
}).then(function () { return loadFonts(); }).then(function () { refresh(); detectCodecs(); });
refresh();
window.__LT = { get rows() { return rows; }, parseTable: parseTable, rundownEntries: rundownEntries, setActive: setActive,  get state() { return state; }, get L() { return L; }, get A() { return A; }, refresh: refresh, patch: patch, produce: produce, ex: ex, cap: cap, makeZip: makeZip, qtrleFrame: qtrleFrame, muxMOV: muxMOV, muxWebM: muxWebM, muxMP4: muxMP4, gifEncode: gifEncode, seqPlan: seqPlan, setT: function (x) { t = x; paint(); }, runExport: runExport, drawExport: drawExport, meas: meas, logos: logos };
})();
