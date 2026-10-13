/* DOM and CSS renderer for the live output window: same layout engine as the preview, drawn as HTML with CSS keyframes */
window.Overlay = (function () {
var LT = window.LT, LOGOS = window.LOGO_SRC, base = {};
var meas = document.createElement('canvas').getContext('2d');
var EASE_IN = 'cubic-bezier(.215,.61,.355,1)', EASE_OUT = 'cubic-bezier(.55,.055,.675,.19)';
var BASE_ADJ = { '"Open Sans"': 0.388, 'Montserrat': 0.3585 };
var NS = 0;

function fontsReady() {
  return Promise.all(['600 40px Montserrat', '700 40px Montserrat', '400 40px "Open Sans"', '600 40px "Open Sans"'].map(function (f) { return document.fonts.load(f); })).then(function () { return document.fonts.ready; });
}

/* ------------------------------------------------------------ renderer: layout geometry from the same engine as the Studio, drawn as HTML and CSS */
function buildGraphic(entry) {
  var st = LT.norm(Object.assign({}, base, entry)), L = LT.buildLayout(st, meas), o = LT.origin(L, st), s = st.size, dir = L.dir;
  var animated = st.motion === 'animated', id = 'g' + (++NS), kf = [], kfN = 0;
  var tin = st.tIn * 1000, tout = st.tOut * 1000;
  var WT = { 'in': LT.winTable(st.inPreset, st.tIn), out: LT.winTable(st.outPreset, st.tOut) };
  var PRE = { 'in': st.inPreset, out: st.outPreset };
  function W(ph, eid) { var T = WT[ph]; return T[eid] || (eid === 'gfx' ? (T.logo || T.plate) : (T.plate || T.tile || T.accent)); }
  function tm(ph, w) { var T = ph === 'in' ? tin : tout; return ph === 'in' ? { d: w[0] * T, t: (w[1] - w[0]) * T } : { d: (1 - w[1]) * T, t: (w[1] - w[0]) * T }; }
  var root = document.createElement('div'); root.className = 'g'; root.id = id;
  root.style.cssText = 'left:' + o.ox + 'px;top:' + o.oy + 'px;width:' + L.w + 'px;height:' + L.h + 'px';
  var gA = document.createElement('div'), gB = document.createElement('div'); gA.className = gB.className = 'grp'; root.appendChild(gA); root.appendChild(gB);
  var anims = [];   /* {el, ph, list[]} */
  function add(el, ph, prop, from, to, win, ease) {
    if (!animated) return;
    var t = tm(ph, win), name = id + 'k' + (++kfN), a = ph === 'in' ? from : to, b = ph === 'in' ? to : from;
    kf.push('@keyframes ' + name + '{from{' + prop + ':' + a + '}to{' + prop + ':' + b + '}}');
    push(el, ph, name + ' ' + t.t.toFixed(1) + 'ms ' + (ph === 'in' ? EASE_IN : EASE_OUT) + ' ' + t.d.toFixed(1) + 'ms both');
  }
  function addMask(el, ph, win) {
    if (!animated) return;
    var t = tm(ph, win), name = id + 'k' + (++kfN), A = 'inset(0 -4px)', B = 'inset(-2000px)';
    kf.push('@keyframes ' + name + '{' + (ph === 'in' ? '0%,99%{clip-path:' + A + '}100%{clip-path:' + B + '}' : '0%{clip-path:' + B + '}1%,100%{clip-path:' + A + '}') + '}');
    push(el, ph, name + ' ' + t.t.toFixed(1) + 'ms linear ' + t.d.toFixed(1) + 'ms both');
  }
  function push(el, ph, str) { var rec = anims.filter(function (x) { return x.el === el && x.ph === ph; })[0]; if (!rec) { rec = { el: el, ph: ph, list: [] }; anims.push(rec); } rec.list.push(str); }
  function px(n) { return (Math.round(n * 100) / 100) + 'px'; }
  function has(k) { return !!L.byId[k]; }

  ['in', 'out'].forEach(function (ph) {
    var pre = PRE[ph], plated = has('plate'), baseId = plated ? 'plate' : has('tile') ? 'tile' : 'accent';
    /* group motion */
    if (pre === 'slide') {
      var dx = -(plated ? 70 : 40) * s * dir;
      add(gA, ph, 'transform', 'translateX(' + px(dx) + ')', 'translateX(0px)', W(ph, baseId).m);
      if (has('plate2')) {
        var same = has('tile') || L.lockB;
        add(gB, ph, 'transform', 'translateX(' + px(same ? dx : -70 * s * dir) + ')', 'translateX(0px)', same ? W(ph, baseId).m : W(ph, 'plate2').m);
      }
    } else if (pre === 'wipe') {
      [['A', gA, L.spanA, 'plate'], ['B', gB, L.spanB, 'plate2']].forEach(function (g) {
        var sp = g[2]; if (!sp || !has(g[3])) return;
        var x0 = sp.x, x1 = sp.x + sp.w, full = 'inset(0 ' + px(L.w - x1) + ' 0 ' + px(x0) + ')';
        var zero = dir > 0 ? 'inset(0 ' + px(L.w - x0) + ' 0 ' + px(x0) + ')' : 'inset(0 ' + px(L.w - x1) + ' 0 ' + px(x1) + ')';
        add(g[1], ph, 'clip-path', zero, full, W(ph, g[3]).m);
      });
    } else if (pre === 'logofirst' && L.logo && L.logoBack && L.spanA && plated) {
      var sp = L.spanA, bk = L.logoBack, x0b = sp.x, x1b = sp.x + sp.w;
      var from = 'inset(0 ' + px(L.w - Math.min(x1b, bk.x + bk.w)) + ' 0 ' + px(Math.max(x0b, bk.x)) + ')', to = 'inset(0 ' + px(L.w - x1b) + ' 0 ' + px(x0b) + ')';
      add(gA, ph, 'clip-path', from, to, W(ph, 'plate').m);
    }
  });

  function group(on) { return on === 'plate2' ? gB : gA; }
  L.els.forEach(function (e) {
    var el, grp;
    if (e.kind === 'plate') {
      el = document.createElement('div'); el.className = 'e'; el.style.cssText = 'left:' + e.x + 'px;top:' + e.y + 'px;width:' + e.w + 'px;height:' + e.h + 'px;background:' + e.color;
      grp = e.id === 'plate2' ? gB : gA; grp.appendChild(el);
      ['in', 'out'].forEach(function (ph) { add(el, ph, 'opacity', '0', '1', W(ph, e.id).a); });
    } else if (e.kind === 'rule') {
      el = document.createElement('div'); el.className = 'e'; el.style.cssText = 'left:' + e.x + 'px;top:' + e.y + 'px;width:' + e.w + 'px;height:' + e.h + 'px;background:' + e.color + ';transform-origin:' + (e.from === 'right' ? '100% 0' : '0 0');
      gA.appendChild(el);
      ['in', 'out'].forEach(function (ph) {
        add(el, ph, 'opacity', '0', '1', W(ph, 'accent').a);
        if (/^(wipe|linedraw|logofirst)$/.test(PRE[ph])) add(el, ph, 'transform', e.from === 'top' ? 'scaleY(0)' : 'scaleX(0)', 'none', W(ph, 'accent').m);
      });
    } else if (e.kind === 'brackets') {
      el = document.createElement('div'); el.className = 'e'; el.style.cssText = 'left:' + e.x + 'px;top:' + e.y + 'px;width:' + e.w + 'px;height:' + e.h + 'px'; gA.appendChild(el);
      var Wd = e.w, Hd = e.h, a = e.arm, t = e.t;
      var bars = [[0, 0, a, t, '0 0', 'X'], [0, 0, t, a, '0 0', 'Y'], [Wd - a, 0, a, t, '100% 0', 'X'], [Wd - t, 0, t, a, '0 0', 'Y'], [0, Hd - t, a, t, '0 0', 'X'], [0, Hd - a, t, a, '0 100%', 'Y'], [Wd - a, Hd - t, a, t, '100% 0', 'X'], [Wd - t, Hd - a, t, a, '0 100%', 'Y']];
      bars.forEach(function (b) {
        var d = document.createElement('div'); d.className = 'e'; d.style.cssText = 'left:' + Math.round(b[0]) + 'px;top:' + Math.round(b[1]) + 'px;width:' + Math.round(b[2]) + 'px;height:' + Math.round(b[3]) + 'px;background:' + e.color + ';transform-origin:' + b[4]; el.appendChild(d);
        ['in', 'out'].forEach(function (ph) { if (/^(wipe|linedraw|logofirst)$/.test(PRE[ph])) add(d, ph, 'transform', 'scale' + b[5] + '(0)', 'none', W(ph, 'accent').m); });
      });
      ['in', 'out'].forEach(function (ph) { add(el, ph, 'opacity', '0', '1', W(ph, 'accent').a); });
    } else if (e.kind === 'logo' || e.kind === 'image') {
      el = document.createElement('img'); el.className = 'e'; el.alt = '';
      el.src = e.kind === 'logo' ? LOGOS[e.tone === 'w' ? 'sw' : 'sc'] : st.gfx.src;
      el.style.cssText = 'left:' + e.x + 'px;top:' + e.y + 'px;width:' + e.w + 'px;height:' + e.h + 'px';
      (e.back === 'plate2' ? gB : gA).appendChild(el);
      var key = e.kind === 'logo' ? 'logo' : 'gfx';
      ['in', 'out'].forEach(function (ph) { add(el, ph, 'opacity', '0', '1', W(ph, key).a); });
    } else if (e.kind === 'text') {
      var m = document.createElement('div'); m.className = 'tm'; m.style.cssText = 'left:' + e.bx + 'px;top:' + e.y + 'px;width:' + (e.w + 2) + 'px;height:' + e.h + 'px';
      var tt = document.createElement('div'); tt.className = 't';
      var adj = BASE_ADJ[e.family] || 0.36;
      tt.style.cssText = 'top:' + px((0.33 - adj) * e.size) + ';height:' + e.h + 'px;line-height:' + e.h + 'px;font:' + e.weight + ' ' + e.size + 'px/' + e.h + 'px ' + e.family + ',sans-serif;color:' + e.color + ';letter-spacing:' + (e.pos ? (st.text[e.id].track / 1000) + 'em' : '0') + ';font-kerning:' + (e.kern === false ? 'none' : 'normal') + ';';
      tt.textContent = e.text; m.appendChild(tt); group(e.on).appendChild(m);
      ['in', 'out'].forEach(function (ph) {
        var w = W(ph, e.id), pre = PRE[ph];
        add(m, ph, 'opacity', '0', '1', w.a);
        if (pre === 'slide') add(tt, ph, 'transform', 'translateX(' + px(-(e.on ? 20 : 28) * s * dir) + ')', 'none', w.m);
        else if (pre === 'wipe') { add(tt, ph, 'transform', 'translateY(' + px(e.h * 0.8) + ')', 'none', w.m); addMask(m, ph, w.m); }
        else if (pre === 'stagger' || pre === 'logofirst') add(tt, ph, 'transform', 'translateY(' + px(10 * s) + ')', 'none', w.m);
      });
    }
  });
  var styleEl = document.createElement('style'); styleEl.textContent = kf.join('\n');
  var maxIn = 0, maxOut = 0;
  anims.forEach(function (a) { a.list.forEach(function (x) { var p = x.split(' '); var t = parseFloat(p[1]), d = parseFloat(p[p.length - 2]); if (a.ph === 'in') maxIn = Math.max(maxIn, t + d); else maxOut = Math.max(maxOut, t + d); }); });
  return { root: root, style: styleEl, anims: anims, st: st, animated: animated, inMs: animated ? Math.max(maxIn, tin) : 0, outMs: animated ? Math.max(maxOut, tout) : 0 };
}
function applyPhase(g, ph) {
  g.anims.forEach(function (a) { a.el.style.animation = ''; });
  if (!g.animated) return;
  g.anims.forEach(function (a) { if (a.ph === ph) a.el.style.animation = a.list.join(','); });
}

/* ------------------------------------------------------------ player: on-air state machine */
function Player(stage, onChange) {
  var cur = null, timer = 0, token = 0, row = -1;
  function mount(entry) {
    var g = buildGraphic(entry); g.row = row;
    document.head.appendChild(g.style); stage.appendChild(g.root);
    /* hide everything until the in-phase starts so nothing flashes at the final state */
    applyPhase(g, 'in'); return g;
  }
  function unmount(g) { if (g.root.parentNode) g.root.parentNode.removeChild(g.root); if (g.style.parentNode) g.style.parentNode.removeChild(g.style); }
  function out(g, done) {
    clearTimeout(timer);
    applyPhase(g, 'out');
    var mine = ++token;
    setTimeout(function () { unmount(g); if (done) done(); }, g.outMs + 60);
  }
  var api = {
    take: function (entry, r, auto) {
      clearTimeout(timer); var go = function () {
        row = r == null ? -1 : r; cur = mount(entry); onChange && onChange(api.status());
        if (auto > 0) timer = setTimeout(api.clear, cur.inMs + auto * 1000);
      };
      if (cur) { var old = cur; cur = null; onChange && onChange(api.status()); out(old, go); } else go();
    },
    clear: function () { clearTimeout(timer); if (!cur) return; var old = cur; cur = null; out(old); onChange && onChange(api.status()); },
    status: function () { return { onAir: !!cur, row: cur ? cur.row : -1 }; }
  };
  return api;
}
return { buildGraphic: buildGraphic, applyPhase: applyPhase, Player: Player, fontsReady: fontsReady, setBase: function (b) { base = b || {}; } };
})();
