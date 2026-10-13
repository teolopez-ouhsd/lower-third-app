/* Lower Thirds Studio core: layout, timeline, drawing, audit. Pure functions of (state, time). */
(function (root) {
'use strict';

var BR = { red: '#E20031', blue: '#0033A1', navy: '#001F61', tint: '#99ADD9', white: '#FFFFFF', black: '#000000' };
var W0 = 1920, H0 = 1080;
/* cap = cap height of "OXNARD UNION" measured from the official files, in each file's own SVG units */
var LOGO = {
  s: { vbW: 750.8333, vbH: 438.16667, cap: 64.23 }
};
var STYLES = [
  { id: 'bar', name: 'Clean Bar', sig: 'slide' },
  { id: 'underline', name: 'Underline', sig: 'linedraw' },
  { id: 'block', name: 'Highlight Block', sig: 'wipe' },
  { id: 'bracket', name: 'Bracket Frame', sig: 'linedraw' },
  { id: 'tab', name: 'Logo Tab', sig: 'logofirst' },
  { id: 'strip', name: 'Banner Strip', sig: 'wipe' },
  { id: 'split', name: 'Split Plate', sig: 'linedraw' }
];
var PRESETS = { slide: 'Slide and fade', wipe: 'Wipe reveal', linedraw: 'Line draw', stagger: 'Stagger', logofirst: 'Logo first' };
var PLATES = ['navy', 'blue', 'white', 'black'];
var ACCENTS = ['red', 'white', 'tint'];
var FAM_NAME = 'Montserrat', FAM_BODY = '"Open Sans"';

var DEFAULTS = {
  name: 'Maria Gonzalez', title: 'Principal', third: 'Oxnard High School',
  style: 'bar', logoOn: true, motion: 'animated',
  inPreset: 'slide', outPreset: 'slide', tIn: 0.6, hold: 4, tOut: 0.4,
  plate: 'navy', accent: 'red', align: 'left', size: 1, margin: 7.5, bg: 'dusk',
  autoW: true, width: 900, autoH: true, height: 160, text: null,
  gfx: { on: false, src: '', aw: 0, ah: 0, size: 100 }
};

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
function easeIn(x) { return x * x * x; }

function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lumRGB(c) {
  var v = c.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contrastL(l1, l2) { var hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
function contrastHex(a, b) { return contrastL(lumRGB(rgb(a)), lumRGB(rgb(b))); }

function norm(raw) {
  var st = Object.assign({}, DEFAULTS, raw || {});
  st.size = clamp(+st.size || 1, 0.7, 1.4);
  st.margin = clamp(+st.margin || 7.5, 5, 10);
  st.tIn = clamp(+st.tIn, 0.2, 3); st.tOut = clamp(+st.tOut, 0.2, 3); st.hold = clamp(+st.hold, 1, 15);
  if (!STYLES.some(function (x) { return x.id === st.style; })) st.style = STYLES[0].id;
  if (PLATES.indexOf(st.plate) < 0) st.plate = 'navy';
  if (ACCENTS.indexOf(st.accent) < 0) st.accent = 'red';
  if (!PRESETS[st.inPreset]) st.inPreset = 'slide';
  if (!PRESETS[st.outPreset]) st.outPreset = 'slide';
  var sd = STYLES.filter(function (x) { return x.id === st.style; })[0] || STYLES[0];
  st.style = sd.id;
  delete st.shape;
  st.autoW = st.autoW !== false; st.autoH = st.autoH !== false;
  st.width = clamp(Math.round(+st.width || 900), 360, Math.round(W0 * (1 - 2 * st.margin / 100)));
  st.height = clamp(Math.round(+st.height || 160), 60, 400);
  st.text = normText(st.text);
  var g0 = Object.assign({ on: false, src: '', aw: 0, ah: 0, size: 100 }, st.gfx || {});
  g0.src = String(g0.src || ''); g0.aw = +g0.aw || 0; g0.ah = +g0.ah || 0; g0.size = clamp(Math.round(+g0.size || 100), 40, 100);
  g0.on = !!(g0.on && g0.src && g0.aw > 0 && g0.ah > 0);
  st.gfx = g0;
  if (['dusk', 'day', 'checker', 'custom'].indexOf(st.bg) < 0) st.bg = 'dusk';
  st.logoOn = !!st.logoOn;
  if (!st.logoOn) { if (st.inPreset === 'logofirst') st.inPreset = 'slide'; if (st.outPreset === 'logofirst') st.outPreset = 'slide'; }
  st.align = st.align === 'right' ? 'right' : 'left';
  st.motion = st.motion === 'static' ? 'static' : 'animated';
  st.name = String(st.name || ''); st.title = String(st.title || ''); st.third = String(st.third || '');
  return st;
}

var TEXT_KEYS = ['name', 'title', 'third'];
var WEIGHTS = { name: [600, 700], title: [400, 600], third: [400, 600] };
var TEXT_DEFAULTS = {
  name: { caps: 'as', track: 0, kern: true, size: 100, lead: 1.2, weight: 700 },
  title: { caps: 'as', track: 0, kern: true, size: 100, lead: 1.3, weight: 600 },
  third: { caps: 'as', track: 0, kern: true, size: 100, lead: 1.3, weight: 400 }
};
function normText(inp) {
  var out = {};
  TEXT_KEYS.forEach(function (k) {
    var d = TEXT_DEFAULTS[k], r = (inp && inp[k]) || {};
    var wt = +r.weight; if (WEIGHTS[k].indexOf(wt) < 0) wt = d.weight;
    var tr = +r.track; if (!isFinite(tr)) tr = d.track;
    var sz = +r.size; if (!isFinite(sz) || !sz) sz = d.size;
    var ld = +r.lead; if (!isFinite(ld) || !ld) ld = d.lead;
    out[k] = {
      caps: (r.caps === 'upper' || r.caps === 'lower') ? r.caps : 'as',
      track: clamp(Math.round(tr), -100, 400), kern: r.kern === false ? false : true,
      size: clamp(Math.round(sz), 50, 200), lead: clamp(Math.round(ld * 20) / 20, 0.9, 2.5), weight: wt
    };
  });
  return out;
}
function applyCase(t, caps) { return caps === 'upper' ? t.toUpperCase() : caps === 'lower' ? t.toLowerCase() : t; }

function logoGeom(w) { var m = LOGO.s; return { w: w, h: w * m.vbH / m.vbW, clear: w * m.cap / m.vbW }; }
function fitLogo(boxH, padMin, maxW) {
  var m = LOGO.s, aspect = m.vbW / m.vbH, c1 = (m.cap / m.vbW) * aspect;
  var h = boxH - 2 * padMin;
  if (c1 * h > padMin) h = boxH / (1 + 2 * c1);
  var w = Math.min(h * aspect, maxW);
  return logoGeom(w);
}
function logoKey(shape, tone) { return shape + tone; }

/* text measuring with kerning and tracking (tracking is thousandths of an em, applied between glyphs) */
function setFont(ctx, weight, fam, px, kern) { ctx.font = weight + ' ' + px + 'px ' + fam; try { ctx.fontKerning = kern ? 'normal' : 'none'; } catch (e) {} }
function measureT(ctx, text, weight, fam, size, kern, trk) {
  setFont(ctx, weight, fam, size, kern);
  var w = ctx.measureText(text).width, n = Array.from(text).length;
  return w + Math.max(0, n - 1) * trk * size / 1000;
}
function charPos(ctx, text, weight, fam, size, kern, trk) {
  setFont(ctx, weight, fam, size, kern);
  var cs = Array.from(text), px = trk * size / 1000, pos = [], pre = '';
  for (var i = 0; i < cs.length; i++) {
    pre += cs[i];
    pos.push(ctx.measureText(pre).width - ctx.measureText(cs[i]).width + i * px);
  }
  return { chars: cs, pos: pos };
}
function fitText(ctx, text, weight, fam, size, minSize, maxW, kern, trk) {
  var s = size, w = measureT(ctx, text, weight, fam, s, kern, trk);
  while (w > maxW && s > minSize) { s -= 1; w = measureT(ctx, text, weight, fam, s, kern, trk); }
  var t = text, trunc = false;
  if (w > maxW) {
    var lo = 0, hi = text.length;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (measureT(ctx, text.slice(0, mid).replace(/\s+$/, '') + '…', weight, fam, s, kern, trk) <= maxW) lo = mid; else hi = mid - 1;
    }
    t = text.slice(0, lo).replace(/\s+$/, '') + '…'; trunc = true; w = measureT(ctx, t, weight, fam, s, kern, trk);
  }
  var cp = trk !== 0 ? charPos(ctx, t, weight, fam, s, kern, trk) : null;
  return { text: t, size: s, w: w, truncated: trunc, chars: cp ? cp.chars : null, pos: cp ? cp.pos : null };
}

/* ------------------------------------------------------------------ layout */
function buildLayout(raw, ctx) {
  var st = norm(raw), s = st.size;
  var P = st.plate, plateHex = BR[P];
  var inkOnPlate = P === 'white' ? BR.navy : BR.white;
  var accHex = BR[st.accent];
  var availW = W0 * (1 - 2 * st.margin / 100);
  var G = st.gfx, gk = G.size / 100, gGap = 14 * s;
  if (G.on) availW -= Math.ceil(240 * s * gk + 32 * s + gGap);
  var els = [], warnings = [], logoBack = null, ctrlH = 0, rowY = 0, lockB = false;
  var logoOn = st.logoOn, shape = 's';
  var fixW = st.autoW ? null : Math.min(st.width, availW), fixH = st.autoH ? null : st.height;

  function warn(m) { if (warnings.indexOf(m) < 0) warnings.push(m); }
  function pickH(nat, min) {
    if (fixH == null) return nat;
    if (fixH < min) { warn('Height was raised to fit the text and logo'); return min; }
    return fixH;
  }
  function pickW(nat, min) {
    if (fixW == null) return nat;
    if (fixW < min) { warn('Width was raised to fit the logo and text'); return Math.min(min, availW); }
    return fixW;
  }

  function textBlock(maxW, color, align, which, quiet) {
    maxW = Math.max(60, maxW);
    var defs = [
      ['name', st.name, FAM_NAME, 54, 34, 4],
      ['title', st.title, FAM_BODY, 30, 22, 2],
      ['third', st.third, FAM_BODY, 24, 18, 0]
    ];
    var items = [], gaps = {};
    defs.forEach(function (d) {
      if (which && which.indexOf(d[0]) < 0) return;
      var cfg = st.text[d[0]];
      var tx = applyCase(d[1].replace(/\s+/g, ' ').trim(), cfg.caps);
      if (!tx) return;
      var base = d[3] * s * cfg.size / 100, mn = d[4] * s * cfg.size / 100;
      var f = fitText(ctx, tx, cfg.weight, d[2], base, mn, maxW, cfg.kern, cfg.track);
      if (!quiet) {
        if (f.truncated) warn(d[0] + ' was shortened with an ellipsis to fit');
        else if (f.size < base) warn(d[0] + ' was reduced to ' + Math.round(f.size) + ' px to fit');
      }
      gaps[d[0]] = d[5] * s;
      items.push({ id: d[0], text: f.text, size: f.size, weight: cfg.weight, family: d[2], w: f.w, h: f.size * cfg.lead, chars: f.chars, pos: f.pos, kern: cfg.kern });
    });
    var w = 0, h = 0;
    items.forEach(function (it, i) { w = Math.max(w, it.w); h += it.h + (i < items.length - 1 ? gaps[it.id] : 0); });
    return { items: items, w: w, h: h, gaps: gaps, color: color, align: align };
  }
  function placeText(tb, x, y, blockW, onMap) {
    var cy = y;
    tb.items.forEach(function (it) {
      var bx = tb.align === 'left' ? x : x + (blockW - it.w) / 2;
      var ax = tb.align === 'left' ? bx : bx + it.w / 2;
      els.push({ id: it.id, kind: 'text', text: it.text, size: it.size, weight: it.weight, family: it.family,
        ax: ax, bx: bx, y: cy, w: it.w, h: it.h, align: tb.align, color: tb.color, on: onMap ? onMap[it.id] : null,
        chars: it.chars, pos: it.pos, kern: it.kern });
      cy += it.h + tb.gaps[it.id];
    });
  }
  function plate(id, x, y, w, h, color) { els.push({ id: id, kind: 'plate', x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), color: color }); }
  function logo(x, y, lg, tone, back) {
    els.push({ id: 'logo', kind: 'logo', x: x, y: y, w: lg.w, h: lg.h, clear: lg.clear, tone: tone, shape: 's', back: back });
  }
  function rule(x, y, w, h, from) { els.push({ id: 'accent', kind: 'rule', x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), color: accHex, from: from }); }

  var tb, lg;
  if (st.style === 'bar') {
    var padX = 40 * s, padY = 26 * s, accW = 6 * s, gapA = 10 * s;
    var lg0 = logoOn ? logoGeom(132 * s) : null;
    var lgap0 = lg0 ? Math.max(44 * s, lg0.clear + 30 * s) : 0;
    var extraW = accW + gapA + 2 * padX + (lg0 ? lg0.w + lgap0 : 0);
    var wFix = fixW == null ? null : pickW(0, extraW + 150 * s);
    tb = textBlock(wFix != null ? wFix - extraW : Math.min(1000 * s, availW - extraW), inkOnPlate, 'left');
    var natH = Math.max(tb.h + 2 * padY, lg0 ? lg0.h + 2 * Math.max(lg0.clear, 20 * s) : 0, 110 * s);
    var pH = pickH(natH, Math.max(tb.h + 20 * s, 80 * s));
    lg = lg0;
    if (lg && lg.h + 2 * Math.max(lg.clear, 14 * s) > pH + 0.01) lg = fitLogo(pH, 14 * s, 132 * s);
    var lgap = lg ? Math.max(44 * s, lg.clear + 30 * s) : 0;
    var pW = wFix != null ? wFix - accW - gapA : Math.max(2 * padX + (lg ? lg.w + lgap : 0) + tb.w, 360 * s);
    var px = accW + gapA;
    plate('plate', px, 0, pW, pH, plateHex);
    rule(0, 0, accW, pH, 'top');
    var cx = px + padX;
    if (lg) {
      logo(cx, (pH - lg.h) / 2, lg, P === 'white' ? 'c' : 'w', 'plate');
      logoBack = { x: cx - Math.max(lg.clear, 22 * s), y: 0, w: lg.w + 2 * Math.max(lg.clear, 22 * s), h: pH };
      cx += lg.w + lgap;
    }
    placeText(tb, cx, (pH - tb.h) / 2, tb.w, { name: 'plate', title: 'plate', third: 'plate' });
    ctrlH = pH;
  } else if (st.style === 'underline') {
    var ruleT = 4 * s, gapR = 14 * s, gapT = 28 * s;
    var tbq = textBlock(1000 * s, BR.white, 'left', null, true);
    var cH1 = tbq.h + gapR + ruleT, tileW = 0, tileH = pickH(cH1, cH1);
    if (logoOn) {
      lg = fitLogo(tileH, 18 * s, 170 * s);
      var tp = Math.max(lg.clear, 22 * s);
      tileW = Math.ceil(lg.w + 2 * tp);
      plate('tile', 0, 0, tileW, tileH, plateHex);
      logo(tp, (tileH - lg.h) / 2, lg, P === 'white' ? 'c' : 'w', 'tile');
      logoBack = { x: 0, y: 0, w: tileW, h: tileH };
    }
    var tx0 = logoOn ? tileW + gapT : 0;
    var wFixU = fixW == null ? null : pickW(0, tx0 + 200 * s);
    tb = textBlock(wFixU != null ? wFixU - tx0 : Math.min(1000 * s, availW - tx0), BR.white, 'left');
    var contentH = tb.h + gapR + ruleT, ty = (tileH - contentH) / 2;
    placeText(tb, tx0, ty, tb.w, null);
    rule(tx0, ty + tb.h + gapR, wFixU != null ? wFixU - tx0 : Math.max(tb.w, 240 * s), ruleT, 'left');
    ctrlH = tileH;
  } else if (st.style === 'block') {
    var bx = 32 * s, by = 14 * s, gapB = 6 * s, ovT = 4 * s, ovG = 8 * s;
    var hasName = !!st.name.trim(), hasSub = !!(st.title.trim() || st.third.trim());
    if (!hasName && !hasSub) hasName = true;
    var nq = textBlock(900 * s, BR.navy, 'left', ['name'], true), sq = textBlock(900 * s, BR.white, 'left', ['title', 'third'], true);
    var nH0 = hasName ? nq.h + 2 * by : 0, sH0 = hasSub ? sq.h + 24 * s : 0;
    var nBlocks = (hasName ? 1 : 0) + (hasSub ? 1 : 0);
    var stackNat = nH0 + sH0 + (nBlocks === 2 ? gapB : 0);
    var stackMin = (hasName ? nq.h + 16 * s : 0) + (hasSub ? sq.h + 12 * s : 0) + (nBlocks === 2 ? gapB : 0);
    if (logoOn) stackMin = Math.max(stackMin, 84 * s);
    var stackH = pickH(Math.max(stackNat, logoOn ? 84 * s : 0), stackMin);
    var extraH = (stackH - stackNat) / nBlocks;
    var nH = hasName ? nH0 + extraH : 0, sH = hasSub ? sH0 + extraH : 0;
    var tileWB = 0;
    if (logoOn) {
      lg = fitLogo(stackH, 16 * s, 150 * s);
      var tpB = Math.max(lg.clear, 20 * s);
      tileWB = Math.ceil(lg.w + 2 * tpB);
      plate('tile', 0, ovT + ovG, tileWB, stackH, BR.white);
      logo(tpB, ovT + ovG + (stackH - lg.h) / 2, lg, 'c', 'tile');
      logoBack = { x: 0, y: ovT + ovG, w: tileWB, h: stackH };
    }
    var X0 = logoOn ? tileWB + gapB : 0;
    var blockWFix = fixW == null ? null : pickW(0, X0 + 240 * s) - X0;
    var txW = (blockWFix != null ? blockWFix : Math.min(900 * s, availW - X0)) - 2 * bx;
    var nameTb = textBlock(txW, BR.navy, 'left', ['name']);
    var subTb = textBlock(txW, P === 'white' ? BR.navy : BR.white, 'left', ['title', 'third']);
    var yy = ovT + ovG, nW = 0;
    if (hasName) {
      nW = blockWFix != null ? blockWFix : Math.max(2 * bx + nameTb.w, 240 * s);
      plate('plate', X0, yy, nW, nH, BR.white);
      placeText(nameTb, X0 + bx, yy + (nH - nameTb.h) / 2, nameTb.w, { name: 'plate' });
      rule(X0, 0, nW, ovT, 'left'); yy += nH + gapB;
    }
    if (hasSub) {
      var sW = blockWFix != null ? blockWFix : Math.max(2 * bx + subTb.w, 200 * s);
      plate('plate2', X0, yy, sW, sH, P === 'white' ? BR.tint : plateHex);
      placeText(subTb, X0 + bx, yy + (sH - subTb.h) / 2, subTb.w, { title: 'plate2', third: 'plate2' });
      if (!hasName) rule(X0, 0, sW, ovT, 'left');
    }
    ctrlH = stackH; rowY = ovT + ovG;
  } else if (st.style === 'bracket') {
    var fpx = 44 * s, fpy = 30 * s, arm = 30 * s, bt = 3 * s, tgap = 18 * s;
    var tbq2 = textBlock(900 * s, BR.white, 'center', null, true);
    var fH = pickH(tbq2.h + 2 * fpy, tbq2.h + 28 * s), fx = 0, tW = 0;
    if (logoOn) {
      lg = fitLogo(fH, 18 * s, 150 * s);
      var tp2 = Math.max(lg.clear, 22 * s);
      tW = Math.ceil(lg.w + 2 * tp2);
      plate('tile', 0, 0, tW, fH, plateHex);
      logo(tp2, (fH - lg.h) / 2, lg, P === 'white' ? 'c' : 'w', 'tile');
      logoBack = { x: 0, y: 0, w: tW, h: fH };
      fx = tW + tgap;
    }
    var wFixB = fixW == null ? null : pickW(0, fx + 300 * s);
    tb = textBlock(wFixB != null ? wFixB - fx - 2 * fpx : Math.min(900 * s, availW - fx - 2 * fpx), BR.white, 'center');
    var fW = wFixB != null ? wFixB - fx : Math.max(tb.w + 2 * fpx, 380 * s);
    els.push({ id: 'accent', kind: 'brackets', x: Math.round(fx), y: 0, w: Math.round(fW), h: Math.round(fH), t: bt, arm: arm, color: accHex });
    placeText(tb, fx + (fW - tb.w) / 2, (fH - tb.h) / 2, tb.w, null);
    ctrlH = fH;
  } else if (st.style === 'strip') {
    var xpx = 36 * s, xpy = 18 * s, midG = 40 * s;
    var q1 = textBlock(1000 * s, inkOnPlate, 'left', ['name', 'title'], true);
    var hasThird = !!st.third.trim();
    var sH3 = pickH(Math.max(q1.h + 2 * xpy, 96 * s), Math.max(q1.h + 16 * s, 72 * s));
    var tw3 = 0;
    if (logoOn) {
      lg = fitLogo(sH3, 14 * s, 120 * s);
      var tp3 = Math.max(lg.clear, 16 * s); tw3 = Math.ceil(lg.w + 2 * tp3);
      plate('tile', 0, 0, tw3, sH3, BR.white);
      logo(tp3, (sH3 - lg.h) / 2, lg, 'c', 'tile');
      logoBack = { x: 0, y: 0, w: tw3, h: sH3 };
    }
    var W3 = fixW == null ? availW : pickW(0, tw3 + 420 * s);
    var pW3 = W3 - tw3, inner = pW3 - 2 * xpx;
    var thirdTb = hasThird ? textBlock(inner * 0.4, inkOnPlate, 'left', ['third']) : { items: [], w: 0, h: 0, gaps: {} };
    var leftTb = textBlock(inner - (hasThird ? thirdTb.w + midG : 0), inkOnPlate, 'left', ['name', 'title']);
    plate('plate', tw3, 0, pW3, sH3, plateHex);
    placeText(leftTb, tw3 + xpx, (sH3 - leftTb.h) / 2, leftTb.w, { name: 'plate', title: 'plate' });
    if (hasThird) placeText(thirdTb, tw3 + pW3 - xpx - thirdTb.w, (sH3 - thirdTb.h) / 2, thirdTb.w, { third: 'plate' });
    rule(0, sH3 + 8 * s, W3, 4 * s, 'left');
    ctrlH = sH3;
  } else if (st.style === 'split') {
    var px2 = 36 * s, py2 = 22 * s;
    var hasN = !!st.name.trim(), hasS = !!(st.title.trim() || st.third.trim());
    if (!hasN && !hasS) hasN = true;
    var colB = P === 'white' ? BR.tint : BR.white;
    var qa = textBlock(1000 * s, inkOnPlate, 'left', ['name'], true), qb = textBlock(1000 * s, BR.navy, 'left', ['title', 'third'], true);
    var hRow = Math.max(hasN ? qa.h : 0, hasS ? qb.h : 0);
    var sH4 = pickH(Math.max(hRow + 2 * py2, 100 * s), Math.max(hRow + 16 * s, 72 * s));
    var tw4 = 0;
    if (logoOn) {
      lg = fitLogo(sH4, 14 * s, 130 * s);
      var tp4 = Math.max(lg.clear, 18 * s); tw4 = Math.ceil(lg.w + 2 * tp4);
      plate('tile', 0, 0, tw4, sH4, plateHex);
      logo(tp4, (sH4 - lg.h) / 2, lg, P === 'white' ? 'c' : 'w', 'tile');
      logoBack = { x: 0, y: 0, w: tw4, h: sH4 };
    }
    var n1 = hasN ? Math.max(qa.w + 2 * px2, 200 * s) : 0, n2 = hasS ? Math.max(qb.w + 2 * px2, 200 * s) : 0;
    var w1 = n1, w2 = n2;
    var Wtot = fixW == null ? null : pickW(0, tw4 + (hasN ? Math.max(260 * s, 2 * px2 + 130) : 0) + (hasS ? Math.max(220 * s, 2 * px2 + 130) : 0));
    if (Wtot != null) { var av = Wtot - tw4; w1 = hasN && hasS ? av * n1 / (n1 + n2) : (hasN ? av : 0); w2 = av - w1; }
    else { var cap2 = availW - tw4, sum2 = n1 + n2; if (sum2 > cap2) { w1 = n1 * cap2 / sum2; w2 = n2 * cap2 / sum2; } }
    w1 = Math.round(w1); w2 = Math.round(w2);
    var tbA = hasN ? textBlock(w1 - 2 * px2, inkOnPlate, 'left', ['name']) : null;
    var tbB = hasS ? textBlock(w2 - 2 * px2, BR.navy, 'left', ['title', 'third']) : null;
    var xx = tw4;
    if (hasN) { plate('plate', xx, 0, w1, sH4, plateHex); placeText(tbA, xx + px2, (sH4 - tbA.h) / 2, tbA.w, { name: 'plate' }); xx += w1; }
    if (hasS) { plate('plate2', xx, 0, w2, sH4, colB); placeText(tbB, xx + px2, (sH4 - tbB.h) / 2, tbB.w, { title: 'plate2', third: 'plate2' }); xx += w2; }
    rule(0, sH4 + 8 * s, xx, 4 * s, 'left');
    ctrlH = sH4; lockB = true;
  } else { /* tab */

    var tpx = 44 * s, tpy = 30 * s;
    var isW = P === 'white', tileHex = isW ? BR.navy : BR.white;
    var tbq3 = textBlock(1000 * s, inkOnPlate, 'left', null, true);
    var plH = pickH(Math.max(tbq3.h + 2 * tpy, 132 * s), Math.max(tbq3.h + 24 * s, 84 * s));
    var tileW2 = 16 * s;
    if (logoOn) {
      lg = fitLogo(plH, 18 * s, 220 * s);
      tileW2 = Math.ceil(lg.w + 2 * Math.max(lg.clear, 18 * s));
      plate('tile', 0, 0, tileW2, plH, tileHex);
      logo((tileW2 - lg.w) / 2, (plH - lg.h) / 2, lg, isW ? 'w' : 'c', 'tile');
      logoBack = { x: 0, y: 0, w: tileW2, h: plH };
    } else {
      plate('tile', 0, 0, tileW2, plH, tileHex);
    }
    var wFixT = fixW == null ? null : pickW(0, tileW2 + 2 * tpx + 150 * s);
    tb = textBlock(wFixT != null ? wFixT - tileW2 - 2 * tpx : Math.min(1000 * s, availW - tileW2 - 2 * tpx), inkOnPlate, 'left');
    var plW = wFixT != null ? wFixT - tileW2 : Math.max(2 * tpx + tb.w, 320 * s);
    plate('plate', tileW2, 0, plW, plH, plateHex);
    rule(0, plH + 8 * s, tileW2 + plW, 4 * s, 'left');
    placeText(tb, tileW2 + tpx, (plH - tb.h) / 2, tb.w, { name: 'plate', title: 'plate', third: 'plate' });
    ctrlH = plH;
  }

  if (G.on) {
    var xEnd = -1e9;
    els.forEach(function (e) { if (e.kind === 'plate' || e.kind === 'rule' || e.kind === 'brackets') xEnd = Math.max(xEnd, e.x + e.w); });
    var gh = ctrlH, gpad = 16 * s, asp = G.aw / G.ah;
    var bw = 240 * s * gk, bh = Math.max(10, gh - 2 * gpad) * gk;
    var gw = Math.min(bw, bh * asp), ghh = gw / asp;
    var gtw = Math.ceil(gw + 2 * gpad);
    var gx0 = Math.round(xEnd + (st.style === 'underline' ? 28 * s : gGap));
    plate('gfxTile', gx0, rowY, gtw, gh, BR.white);
    els.push({ id: 'gfx', kind: 'image', x: gx0 + (gtw - gw) / 2, y: rowY + (gh - ghh) / 2, w: gw, h: ghh, back: 'gfxTile' });
  }

  /* normalise to origin */

  var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  els.forEach(function (e) {
    var ex = e.kind === 'text' ? e.bx : e.x;
    x0 = Math.min(x0, ex); y0 = Math.min(y0, e.y); x1 = Math.max(x1, ex + e.w); y1 = Math.max(y1, e.y + e.h);
  });
  els.forEach(function (e) { if (e.kind === 'text') { e.bx -= x0; e.ax -= x0; } else e.x -= x0; e.y -= y0; });
  if (logoBack) { logoBack.x -= x0; logoBack.y -= y0; }
  var Lw = x1 - x0, Lh = y1 - y0;

  var dir = 1;
  if (st.align === 'right') {
    dir = -1;
    els.forEach(function (e) {
      if (e.kind === 'text') {
        e.bx = Lw - e.bx - e.w;
        e.align = e.align === 'left' ? 'right' : e.align;
        e.ax = e.align === 'right' ? e.bx + e.w : e.align === 'left' ? e.bx : e.bx + e.w / 2;
      } else {
        e.x = Lw - e.x - e.w;
        if (e.from === 'left') e.from = 'right';
      }
    });
    if (logoBack) logoBack.x = Lw - logoBack.x - logoBack.w;
  }
  var byId = {};
  els.forEach(function (e) { byId[e.id] = e; });
  function span(ids) {
    var xs0 = 1e9, xs1 = -1e9, found = false;
    ids.forEach(function (id) { var e = byId[id]; if (e) { found = true; xs0 = Math.min(xs0, e.x); xs1 = Math.max(xs1, e.x + e.w); } });
    return found ? { x: xs0, w: xs1 - xs0 } : null;
  }
  var lgEl = byId.logo || null;
  return {
    st: st, els: els, byId: byId, w: Lw, h: Lh, dir: dir, warnings: warnings,
    hasPlate: !!byId.plate, spanA: span(['plate', 'tile', 'gfxTile']), lockB: lockB, spanB: span(['plate2']),
    logo: lgEl ? { cx: lgEl.x + lgEl.w / 2 } : null, logoBack: logoBack, ctrlH: ctrlH, ctrlW: Lw
  };
}

/* ---------------------------------------------------------------- timeline */
function winTable(preset, d) {
  var T = {};
  function set(id, a, m) { T[id] = { a: a, m: m || a }; }
  if (preset === 'slide') {
    set('plate', [0, .7]); set('plate2', [.12, .82]); set('tile', [0, .7]); set('accent', [.05, .7]);
    set('logo', [.1, .75]); set('name', [.3, .95]); set('title', [.4, 1]); set('third', [.5, 1]);
  } else if (preset === 'wipe') {
    set('accent', [0, .1], [0, .5]); set('plate', [.1, .2], [.1, .7]); set('tile', [.1, .2], [.1, .7]);
    set('plate2', [.25, .35], [.25, .85]); set('logo', [.6, 1]);
    set('name', [.4, .5], [.4, .95]); set('title', [.5, .6], [.5, 1]); set('third', [.6, .7], [.6, 1]);
  } else if (preset === 'linedraw') {
    set('accent', [0, .1], [0, .45]); set('plate', [.35, .8]); set('tile', [.35, .8]); set('plate2', [.45, .9]);
    set('logo', [.5, .95]); set('name', [.55, 1]); set('title', [.65, 1]); set('third', [.75, 1]);
  } else if (preset === 'stagger') {
    var sg = Math.min(0.15 / d, 0.25);
    set('plate', [0, .3]); set('plate2', [0, .3]); set('tile', [0, .3]); set('accent', [0, .3]);
    set('logo', [.05, .35]); set('name', [0, 1 - 2 * sg]); set('title', [sg, 1 - sg]); set('third', [2 * sg, 1]);
  } else { /* logofirst */
    set('tile', [0, .3]); set('plate', [0, .3], [.25, .8]); set('plate2', [0, .3], [.25, .8]);
    set('logo', [0, .3]); set('accent', [.3, .5], [.3, .8]);
    set('name', [.55, .9]); set('title', [.65, .95]); set('third', [.75, 1]);
  }
  return T;
}
function vis(w, phase, tn) {
  var den = Math.max(1e-6, w[1] - w[0]);
  if (phase === 'in') return easeOut(clamp((tn - w[0]) / den, 0, 1));
  return 1 - easeIn(clamp((tn - (1 - w[1])) / den, 0, 1));
}
function totalTime(st) { return st.motion === 'static' ? 0 : st.tIn + st.hold + st.tOut; }

function frameGeometry(L, st, t) {
  var s = st.size, dir = L.dir, phase = 'hold', tn = 1;
  if (st.motion === 'animated') {
    if (t < st.tIn) { phase = 'in'; tn = clamp(t / st.tIn, 0, 1); }
    else if (t > st.tIn + st.hold) { phase = 'out'; tn = clamp((t - st.tIn - st.hold) / st.tOut, 0, 1); }
  }
  var preset = phase === 'out' ? st.outPreset : st.inPreset;
  var W = winTable(preset, phase === 'out' ? st.tOut : st.tIn);
  function V(id) {
    if (phase === 'hold') return { a: 1, m: 1 };
    var w = W[id] || (id === 'gfx' ? (W.logo || W.plate) : (W.plate || W.tile || W.accent));
    return { a: vis(w.a, phase, tn), m: vis(w.m, phase, tn) };
  }
  var has = function (id) { return !!L.byId[id]; };
  var plated = has('plate');
  var base = plated ? 'plate' : has('tile') ? 'tile' : 'accent';
  var gdx = 0, dx2 = 0;
  if (preset === 'slide' && phase !== 'hold') {
    gdx = -(1 - V(base).m) * (plated ? 70 : 40) * s * dir;
    if (has('plate2')) dx2 = (has('tile') || L.lockB) ? gdx : -(1 - V('plate2').m) * 70 * s * dir;
  }
  function clipRange(group) {
    var span = group === 'A' ? L.spanA : L.spanB;
    if (!span || phase === 'hold') return null;
    var id = group === 'A' ? (plated ? 'plate' : null) : 'plate2';
    if (!id) return null;
    var m = V(id).m, x0 = span.x + (group === 'A' ? gdx : dx2), x1 = x0 + span.w;
    if (preset === 'wipe') return dir > 0 ? [x0, x0 + m * span.w] : [x1 - m * span.w, x1];
    if (preset === 'logofirst' && group === 'A' && L.logo && L.logoBack) {
      var ax = L.logo.cx + gdx, bk = L.logoBack;
      var lo = Math.min(bk.x + gdx, ax - m * (ax - x0)), hi = Math.max(bk.x + bk.w + gdx, ax + m * (x1 - ax));
      return [clamp(lo, x0, x1), clamp(hi, x0, x1)];
    }
    return null;
  }
  var clipA = clipRange('A'), clipB = clipRange('B');
  function rClip(r) { return r ? { x0: r[0], x1: r[1], y0: -1e5, y1: 1e5 } : null; }
  var items = [];
  /* plates */
  L.els.forEach(function (e) {
    if (e.kind !== 'plate') return;
    var grpB = e.id === 'plate2', v = V(e.id), dx = grpB ? dx2 : gdx;
    items.push({ id: e.id, kind: 'plate', x: e.x + dx, y: e.y, w: e.w, h: e.h, color: e.color, alpha: v.a, clip: rClip(grpB ? clipB : clipA), dx: dx });
  });
  var plateItem = {};
  items.forEach(function (it) { plateItem[it.id] = it; });
  /* accent */
  var acc = L.byId.accent;
  if (acc) {
    var va = V('accent'), p = 1;
    if (preset === 'wipe' || preset === 'linedraw' || preset === 'logofirst') p = phase === 'hold' ? 1 : va.m;
    var ai = { id: 'accent', kind: acc.kind, x: acc.x + gdx, y: acc.y, w: acc.w, h: acc.h, color: acc.color, alpha: va.a, p: p, from: acc.from, t: acc.t, arm: acc.arm, dx: gdx };
    var rects = [];
    if (acc.kind === 'rule') {
      var rx = ai.x, ry = ai.y, rw = acc.w, rh = acc.h;
      if (ai.from === 'top') rh = acc.h * p;
      else if (ai.from === 'right') { rx = ai.x + acc.w * (1 - p); rw = acc.w * p; }
      else rw = acc.w * p;
      rects.push({ x: rx, y: ry, w: rw, h: rh });
    } else {
      var al = acc.arm * p, tt = acc.t, X = ai.x, Y = ai.y, Wd = acc.w, Hd = acc.h;
      rects.push({ x: X, y: Y, w: al, h: tt }, { x: X, y: Y, w: tt, h: al },
        { x: X + Wd - al, y: Y, w: al, h: tt }, { x: X + Wd - tt, y: Y, w: tt, h: al },
        { x: X, y: Y + Hd - tt, w: al, h: tt }, { x: X, y: Y + Hd - al, w: tt, h: al },
        { x: X + Wd - al, y: Y + Hd - tt, w: al, h: tt }, { x: X + Wd - tt, y: Y + Hd - al, w: tt, h: al });
    }
    ai.rects = rects;
    items.push(ai);
  }
  /* logo */
  var lgE = L.byId.logo;
  if (lgE) {
    var vl = V('logo'), backId = lgE.back, back = plateItem[backId], vb = V(backId);
    var dxl = backId === 'plate2' ? dx2 : gdx;
    var zone = { x: lgE.x + dxl - lgE.clear, y: lgE.y - lgE.clear, w: lgE.w + 2 * lgE.clear, h: lgE.h + 2 * lgE.clear };
    var okBack = !!back && zone.x >= back.x - 0.01 && zone.y >= back.y - 0.01 && zone.x + zone.w <= back.x + back.w + 0.01 && zone.y + zone.h <= back.y + back.h + 0.01;
    var cl = back ? back.clip : null;
    var okClip = !cl || (zone.x >= cl.x0 - 0.01 && zone.x + zone.w <= cl.x1 + 0.01);
    var alpha = (okBack && okClip) ? Math.min(vl.a, vb.a) : 0;
    items.push({ id: 'logo', kind: 'logo', x: lgE.x + dxl, y: lgE.y, w: lgE.w, h: lgE.h, clear: lgE.clear, tone: lgE.tone, shape: lgE.shape, back: backId, alpha: alpha, zone: zone, gated: !(okBack && okClip), backColor: back ? back.color : null, dx: dxl });
  }
  /* custom graphic */
  var gE = L.byId.gfx;
  if (gE) {
    var vg = V('gfx'), gb = plateItem.gfxTile, vgb = V('gfxTile');
    var gz = { x: gE.x + gdx, y: gE.y, w: gE.w, h: gE.h };
    var gok = !!gb && gz.x >= gb.x - 0.01 && gz.y >= gb.y - 0.01 && gz.x + gz.w <= gb.x + gb.w + 0.01 && gz.y + gz.h <= gb.y + gb.h + 0.01;
    var gcl = gb ? gb.clip : null, gokc = !gcl || (gz.x >= gcl.x0 - 0.01 && gz.x + gz.w <= gcl.x1 + 0.01);
    items.push({ id: 'gfx', kind: 'image', x: gz.x, y: gz.y, w: gz.w, h: gz.h, alpha: (gok && gokc) ? Math.min(vg.a, vgb.a) : 0 });
  }
  /* text */
  L.els.forEach(function (e) {
    if (e.kind !== 'text') return;

    var v = V(e.id), onId = e.on, cont = onId ? plateItem[onId] : null;
    var cdx = onId === 'plate2' ? dx2 : (onId ? gdx : (preset === 'slide' ? gdx : 0));
    var ex = 0, ey = 0;
    if (phase !== 'hold') {
      if (preset === 'slide') ex = -(1 - v.m) * (onId ? 20 : 28) * s * dir;
      else if (preset === 'stagger' || preset === 'logofirst') ey = (1 - v.m) * 10 * s;
      else if (preset === 'wipe') ey = (1 - v.m) * e.h * 0.8;
    }
    if (onId && preset === 'slide') { /* plate carries it; extra offset only */ }
    var mask = null;
    if (preset === 'wipe' && phase !== 'hold') mask = { x0: e.bx + cdx - 4, x1: e.bx + e.w + cdx + 4, y0: e.y, y1: e.y + e.h };
    var cl2 = cont ? cont.clip : null, clip = null;
    if (cl2 && mask) clip = { x0: Math.max(cl2.x0, mask.x0), x1: Math.min(cl2.x1, mask.x1), y0: mask.y0, y1: mask.y1 };
    else if (cl2) clip = cl2; else if (mask) clip = mask;
    var alpha = v.a; if (cont) alpha = Math.min(alpha, cont.alpha);
    items.push({ id: e.id, kind: 'text', text: e.text, size: e.size, weight: e.weight, family: e.family,
      ax: e.ax + cdx + ex, bx: e.bx + cdx + ex, y: e.y + ey, w: e.w, h: e.h, align: e.align, color: e.color,
      chars: e.chars, pos: e.pos, kern: e.kern, alpha: alpha, clip: clip, on: onId, baseY: e.y, box: { x: e.bx + cdx + ex, y: e.y + ey, w: e.w, h: e.h }, cdx: cdx });
  });
  return { items: items, phase: phase, preset: preset, t: t };
}

function origin(L, st) {
  var mx = W0 * st.margin / 100, my = H0 * st.margin / 100;
  return { ox: L.dir > 0 ? mx : W0 - mx - L.w, oy: H0 - my - L.h };
}

/* ----------------------------------------------------------------- drawing */
function drawFrame(ctx, W, H, L, st, t, opts) {
  opts = opts || {};
  var k = W / W0, G = frameGeometry(L, st, t), o = origin(L, st);
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.translate(o.ox, o.oy);
  G.items.forEach(function (it) {
    if (it.alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = it.alpha;
    if (it.clip) { ctx.beginPath(); ctx.rect(it.clip.x0, it.clip.y0, it.clip.x1 - it.clip.x0, it.clip.y1 - it.clip.y0); ctx.clip(); }
    if (it.kind === 'plate') {
      ctx.fillStyle = it.color; ctx.fillRect(it.x, it.y, it.w, it.h);
    } else if (it.kind === 'rule' || it.kind === 'brackets') {
      ctx.fillStyle = it.color;
      it.rects.forEach(function (r) { if (r.w > 0 && r.h > 0) ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.max(1, Math.round(r.w)), Math.max(1, Math.round(r.h))); });
    } else if (it.kind === 'image') {
      var gimg = opts.logos && opts.logos.gfx;
      if (gimg) ctx.drawImage(gimg, it.x, it.y, it.w, it.h);
    } else if (it.kind === 'logo') {
      var img = opts.logos && opts.logos[logoKey(it.shape, it.tone)];
      if (img) ctx.drawImage(img, it.x, it.y, it.w, it.h);
    } else if (it.kind === 'text') {
      setFont(ctx, it.weight, it.family, it.size, it.kern !== false);
      ctx.fillStyle = it.color; ctx.textBaseline = 'alphabetic';
      var by = it.y + it.h / 2 + it.size * 0.33;
      if (it.pos) { ctx.textAlign = 'left'; for (var ci = 0; ci < it.chars.length; ci++) ctx.fillText(it.chars[ci], it.bx + it.pos[ci], by); }
      else { ctx.textAlign = it.align; ctx.fillText(it.text, it.ax, by); }
    }
    ctx.restore();
  });
  ctx.restore();
  return G;
}

/* ------------------------------------------------------------------- audit */
function rectGap(a, b) {
  var dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
  var dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
  return Math.sqrt(dx * dx + dy * dy);
}
function rectsIntersect(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
function visiblePlate(it) {
  var r = { x: it.x, y: it.y, w: it.w, h: it.h };
  if (it.clip) { var x0 = Math.max(r.x, it.clip.x0), x1 = Math.min(r.x + r.w, it.clip.x1); r.x = x0; r.w = Math.max(0, x1 - x0); }
  return r;
}
function isBlueFamily(hex) { return hex === BR.blue || hex === BR.navy; }

function audit(L, st, opts) {
  opts = opts || {};
  var found = {}, order = [];
  function add(code, msg, t) { if (!found[code]) { found[code] = { code: code, msg: msg, t: t }; order.push(code); } }
  var total = totalTime(st), step = 1 / 30, frames = 0, s = st.size;
  var times = [];
  if (st.motion === 'static') times.push(0);
  else {
    for (var tt = 0; tt < st.tIn; tt += step) times.push(tt);
    times.push(st.tIn, st.tIn + st.hold);
    for (var t2 = st.tIn + st.hold; t2 < total; t2 += step) times.push(t2);
    times.push(total);
  }
  var minRedBlue = 1e9, minClear = 1e9, logoShown = 0, gatedFrames = 0;
  times.forEach(function (t) {
    frames++;
    var G = frameGeometry(L, st, t), items = G.items;
    var plates = items.filter(function (i) { return i.kind === 'plate' && i.alpha > 0.02; });
    var acc = items.filter(function (i) { return (i.kind === 'rule' || i.kind === 'brackets') && i.alpha > 0.02; })[0];
    var lg = items.filter(function (i) { return i.kind === 'logo'; })[0];
    /* 1. red against blue or navy */
    if (acc && acc.color === BR.red) {
      plates.forEach(function (p) {
        if (!isBlueFamily(p.color)) return;
        var vp = visiblePlate(p);
        if (vp.w <= 0) return;
        acc.rects.forEach(function (r) { var g = rectGap(r, vp); minRedBlue = Math.min(minRedBlue, g); if (g < 4 * s) add('redblue', 'Red accent touches a blue or navy plate', t); });
      });
    }
    /* 2. logo version and backing */
    if (lg && lg.alpha > 0.02) {
      logoShown++;
      var want = lg.backColor === BR.white ? 'c' : 'w';
      if (lg.tone !== want) add('logover', 'Logo version does not match its plate color', t);
      if (lg.tone === 'c' && lg.backColor !== BR.white) add('logover', 'Full-color logo is not on white', t);
      /* clear space: nothing else may enter the zone */
      var z = lg.zone;
      items.forEach(function (o) {
        if (o === lg || o.alpha <= 0.02) return;
        if (o.id === lg.back) return;
        if (o.kind === 'plate') { if (rectsIntersect(visiblePlate(o), z)) add('clear', 'A plate edge enters the logo clear space', t); minClear = Math.min(minClear, rectGap(visiblePlate(o), lg)); return; }
        if (o.kind === 'rule' || o.kind === 'brackets') { o.rects.forEach(function (r) { if (rectsIntersect(r, z)) add('clear', 'An accent line enters the logo clear space', t); minClear = Math.min(minClear, rectGap(r, lg)); }); return; }
        if (o.kind === 'text') { if (rectsIntersect(o.box, z)) add('clear', 'Text enters the logo clear space', t); minClear = Math.min(minClear, rectGap(o.box, lg)); }
      });
    }
    if (lg && lg.alpha <= 0.02 && lg.gated) gatedFrames++;
  });
  /* 3. final-state checks */
  var Gf = frameGeometry(L, st, st.motion === 'static' ? 0 : st.tIn + 0.001);
  var o = origin(L, st), mx = W0 * st.margin / 100, my = H0 * st.margin / 100;
  if (L.w > W0 - 2 * mx + 0.5) add('safe', 'Graphic extends outside the title-safe area', 0);
  if (o.ox < mx - 0.5 || o.oy < my - 0.5 || o.ox + L.w > W0 - mx + 0.5 || o.oy + L.h > H0 - my + 0.5) add('safe', 'Graphic extends outside the title-safe area', 0);
  Gf.items.forEach(function (it) {
    if (it.kind !== 'text') return;
    if (it.on) {
      var pl = Gf.items.filter(function (p) { return p.id === it.on; })[0];
      if (!pl || it.box.x < pl.x - 0.5 || it.box.x + it.box.w > pl.x + pl.w + 0.5) add('overflow', 'Text overflows its plate', 0);
    }
  });
  /* contrast */
  var contrasts = [];
  L.els.forEach(function (e) {
    if (e.kind !== 'text') return;
    var bg = null, label = e.id;
    if (e.on) { var pe = L.byId[e.on]; bg = pe.color; }
    var key = e.color + '|' + (bg || 'footage');
    if (contrasts.some(function (c) { return c.key === key; })) return;
    var ratio = null;
    if (bg) ratio = contrastHex(e.color, bg);
    else if (opts.bgLum != null) ratio = contrastL(lumRGB(rgb(e.color)), opts.bgLum);
    contrasts.push({ key: key, fg: e.color, bg: bg, ratio: ratio, label: label });
  });
  return { issues: order.map(function (c) { return found[c]; }), frames: frames, contrasts: contrasts, minRedBlue: minRedBlue, minClear: minClear, logoShown: logoShown, gatedFrames: gatedFrames, warnings: L.warnings };
}

function wordCount(st) { var t = (st.name + ' ' + st.title + ' ' + st.third).trim(); return t ? t.split(/\s+/).length : 0; }
function minHold(st) { return Math.ceil(wordCount(st) * 0.3 * 10) / 10; }

root.LT = {
  BR: BR, W0: W0, H0: H0, LOGO: LOGO, STYLES: STYLES, PRESETS: PRESETS, PLATES: PLATES, ACCENTS: ACCENTS, DEFAULTS: DEFAULTS, TEXT_DEFAULTS: TEXT_DEFAULTS, WEIGHTS: WEIGHTS, normText: normText,
  norm: norm, buildLayout: buildLayout, frameGeometry: frameGeometry, drawFrame: drawFrame, origin: origin,
  winTable: winTable, audit: audit, totalTime: totalTime, contrastHex: contrastHex, contrastL: contrastL, lumRGB: lumRGB, rgb: rgb,
  wordCount: wordCount, minHold: minHold, clamp: clamp, logoKey: logoKey, FAM_NAME: FAM_NAME, FAM_BODY: FAM_BODY
};
})(typeof window !== 'undefined' ? window : globalThis);
