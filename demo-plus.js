/* demo-plus.js: quality-of-life features around the 3D model. It never touches the model code,
   except for wrapping the global logSer() to keep a full session log. */
(function () {
  'use strict';
  var D = document, h = D.documentElement;
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  function el(tag, cls, text) { var e = D.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var Prefs = window.SWPrefs || { get: function () { return {}; }, set: function () {}, reset: function () {} };

  /* ---------- toast + helpers ---------- */
  var host = el('div', 'toast-host'); host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); D.body.appendChild(host);
  function toast(msg) {
    var t = el('div', 'toast', msg); host.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2200); setTimeout(function () { t.remove(); }, 2700);
  }
  function copyText(text, ok) {
    function fallback() {
      var a = el('textarea'); a.value = text; a.style.cssText = 'position:fixed;opacity:0'; D.body.appendChild(a); a.select();
      try { D.execCommand('copy'); toast(ok); } catch (e) { toast('Copy failed'); } a.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(ok); }, fallback); else fallback();
  }
  function download(name, text, type) {
    var a = el('a'), url = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' }));
    a.href = url; a.download = name; D.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 600); toast('Saved ' + name);
  }

  /* ---------- About tabs, abstract copy / download / print ---------- */
  var tabs = $$('.tabs [role="tab"]');
  function pick(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    saveUI({ tab: tab.id });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { pick(t); });
    t.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
      if (n >= 0) { e.preventDefault(); pick(tabs[(n + tabs.length) % tabs.length], true); }
    });
  });
  function abstractText() {
    var paras = $$('#abText p').map(function (p) { return p.textContent.trim(); }).join('\n\n');
    return $('#abTitle').textContent + '\n' + $('#abBy').textContent + '\n\nAbstract\n\n' + paras + '\n\n' + $('#abKw').textContent.trim() + '\n';
  }
  function on(id, fn) { var b = $(id); if (b) b.addEventListener('click', fn); }
  on('#abCopy', function () { copyText(abstractText(), 'Abstract copied'); });
  on('#abDl', function () { download('smart-water-network-abstract.txt', abstractText()); });
  on('#abPrint', function () {
    tabs.forEach(function (t) { $('#' + t.getAttribute('aria-controls')).hidden = false; });
    D.body.dataset.print = 'about';
    var done = function () { delete D.body.dataset.print; var sel = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]; if (sel) pick(sel); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done); setTimeout(function () { window.print(); }, 50);
  });

  /* ---------- saved view (camera, labels, leak size, tab) ---------- */
  function saveUI(patch) { var o = {}; try { o = JSON.parse(ls('sw_demo_ui') || '{}') || {}; } catch (e) {} Object.assign(o, patch); lsSet('sw_demo_ui', JSON.stringify(o)); }
  $$('[data-v]').forEach(function (b) { b.addEventListener('click', function () { saveUI({ cam: b.getAttribute('data-v') }); }); });
  [['#zS', 'S'], ['#zL', 'L']].forEach(function (z) { on(z[0], function () { saveUI({ size: z[1] }); }); });
  on('#bLab', function () { setTimeout(function () { saveUI({ lab: $('#bLab').getAttribute('aria-pressed') === 'true' }); }, 0); });
  setTimeout(function () {
    var o = {}; try { o = JSON.parse(ls('sw_demo_ui') || '{}') || {}; } catch (e) {}
    if (o.tab && $('#' + o.tab)) pick($('#' + o.tab));
    if (o.cam && o.cam !== 'ov') { var c = $('[data-v="' + o.cam + '"]'); if (c) c.click(); }
    if (o.size === 'S' && $('#zS')) $('#zS').click();
    if (o.lab === false && $('#bLab') && $('#bLab').getAttribute('aria-pressed') === 'true') $('#bLab').click();
  }, 400);

  /* ---------- session log (full history of serial lines) ---------- */
  var log = [], t0 = Date.now();
  function plain(html) { var d = el('div'); d.innerHTML = String(html); return d.textContent; }
  /* the model calls window.swOnLog for every serial line, so none are lost */
  window.swOnLog = function (msg) { log.push({ t: new Date().toISOString(), s: ((Date.now() - t0) / 1000).toFixed(1), m: plain(msg) }); updCount(); };
  var ser = $('#ser'), tools = el('div', 'mini-actions'), cnt = el('span', 'cnt', '0 lines');
  function updCount() { cnt.textContent = log.length + (log.length === 1 ? ' line' : ' lines'); }
  function csv() {
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    return 'time,seconds_since_open,message\n' + log.map(function (r) { return [r.t, r.s, q(r.m)].join(','); }).join('\n') + '\n';
  }
  function report() {
    var g = function (id) { var n = D.getElementById(id); return n ? n.textContent.trim() : '-'; };
    return ['Smart Water Network: demo session report', 'Generated: ' + new Date().toLocaleString(), '',
      'Status: ' + g('st') + ' (valve ' + g('pv') + ')', 'Q1: ' + g('p1') + ' L/min, Q2: ' + g('p2') + ' L/min, difference (ΔQ): ' + g('pd') + ' L/min',
      'Leak events this device: ' + g('kpiE') + ', last alert: ' + g('kpiL'), 'Rule: ΔQ at or above 0.40 L/min for 3 s confirms a leak.',
      'Note: simulation, values are illustrative.', '', 'Recent log:', log.slice(-12).map(function (r) { return '  ' + r.m; }).join('\n')].join('\n');
  }
  function exportLog() { if (!log.length) { toast('Nothing logged yet. Open the leak tap first.'); return; } download('smart-water-session-log.csv', csv(), 'text/csv'); }
  if (ser) {
    [['Download log (CSV)', exportLog], ['Copy report', function () { copyText(report(), 'Report copied'); }],
     ['Clear log', function () { log = []; updCount(); toast('Session log cleared'); }]].forEach(function (a) {
      var b = el('button', '', a[0]); b.type = 'button'; b.addEventListener('click', a[1]); tools.appendChild(b);
    });
    tools.appendChild(cnt); ser.parentNode.insertBefore(tools, ser.nextSibling);
  }

  /* ---------- toast when the phone number is saved ---------- */
  var ps = $('#phoneSaved');
  if (ps) new MutationObserver(function () { var t = ps.textContent; if (/^Saved|saved for/i.test(t) || /Number saved/i.test(t)) toast('Phone number saved'); }).observe(ps, { childList: true, characterData: true, subtree: true });

  /* ---------- stage: fullscreen + accessibility ---------- */
  var stage = $('#stage'), full = false, fb;
  if (stage) {
    stage.tabIndex = 0; stage.setAttribute('aria-label', '3D model of the leak detection system. Drag to rotate, scroll to zoom. Press L to open the leak tap.');
    fb = el('button', 'stage-btn', '⛶'); fb.type = 'button'; fb.title = 'Fullscreen (F)'; fb.setAttribute('aria-label', 'Fullscreen'); stage.appendChild(fb);
    fb.addEventListener('click', function () { setFull(!full); });
  }
  function setFull(v) {
    if (!stage) return; full = v; stage.classList.toggle('is-full', v); D.body.classList.toggle('stage-full', v);
    fb.textContent = v ? '✕' : '⛶'; fb.setAttribute('aria-label', v ? 'Exit fullscreen' : 'Fullscreen');
    if (v && stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
    else if (!v && D.fullscreenElement && D.exitFullscreen) D.exitFullscreen().catch(function () {});
    setTimeout(function () { dispatchEvent(new Event('resize')); }, 80);
  }
  D.addEventListener('fullscreenchange', function () { if (!D.fullscreenElement && full) setFull(false); });

  /* ---------- top bar: theme, shortcuts, settings, share ---------- */
  var top = $('#topActions'), home = top && $('a', top);
  function add(label, txt, fn, opt) { var b = el('button', 'ib' + (opt ? ' opt' : ''), txt); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.addEventListener('click', fn); top.insertBefore(b, home); return b; }
  var THEMES = ['auto', 'light', 'dark'], ICON = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  function cycleTheme() { var t = THEMES[(THEMES.indexOf(Prefs.get().theme) + 1) % 3]; Prefs.set('theme', t); toast('Theme: ' + t); }
  var themeBtn, setBtn, pop;
  function syncTheme() { if (themeBtn) themeBtn.textContent = ICON[Prefs.get().theme] || '◐'; }
  if (top) {
    themeBtn = add('Switch theme (T)', 'Auto', cycleTheme);
    add('Keyboard shortcuts (?)', '?', showKeys, true);
    setBtn = add('Settings', '⚙', function () { togglePop(); });
    add('Share this page', '↗', function () {
      var data = { title: D.title, url: location.href };
      if (navigator.share) navigator.share(data).catch(function () {}); else copyText(location.href, 'Link copied');
    }, true);
    syncTheme();
  }

  /* settings popover */
  pop = el('div', 'sp-pop'); pop.id = 'spPop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Page settings');
  if (top) top.parentNode.appendChild(pop);
  function seg(label, key, opts, p) {
    pop.appendChild(el('p', 'lbl', label));
    var row = el('span', 'seg'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
    opts.forEach(function (o) { var b = el('button', '', o[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(p[key] === o[0])); b.addEventListener('click', function () { Prefs.set(key, o[0]); }); row.appendChild(b); });
    pop.appendChild(row);
  }
  function renderPop() {
    var p = Prefs.get(); pop.textContent = ''; pop.appendChild(el('h2', '', 'Page settings'));
    seg('Theme', 'theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], p);
    seg('Text size', 'text', [['s', 'A−'], ['m', 'A'], ['l', 'A+'], ['xl', 'A++']], p);
    seg('Motion', 'motion', [['auto', 'Auto'], ['calm', 'Calm'], ['off', 'Off']], p);
    var r = el('button', 'sp-row'); r.type = 'button'; r.setAttribute('role', 'switch'); r.setAttribute('aria-checked', String(p.contrast === 'high'));
    var t = el('span'); t.appendChild(el('b', '', 'High contrast')); t.appendChild(el('small', '', 'Stronger text and borders'));
    r.appendChild(t); r.appendChild(el('i', 'sp-sw')); r.addEventListener('click', function () { Prefs.set('contrast', p.contrast === 'high' ? 'off' : 'high'); }); pop.appendChild(r);
    var cl = el('button', 'sp-row', 'Clear saved number and session'); cl.type = 'button';
    cl.addEventListener('click', function () { var lo = $('#bLogout'); if (lo) { lo.click(); toast('Saved data cleared'); } }); pop.appendChild(cl);
    var f = el('div', 'sp-foot'), rb = el('button', '', 'Reset'), cb = el('button', '', 'Close'); rb.type = cb.type = 'button';
    rb.addEventListener('click', function () { Prefs.reset(); toast('Settings reset'); }); cb.addEventListener('click', function () { togglePop(false); });
    f.appendChild(rb); f.appendChild(cb); pop.appendChild(f);
    pop.appendChild(el('p', 'note', 'Shared with the home page. Motion changes fully apply after a reload.'));
  }
  function togglePop(v) {
    var open = v == null ? pop.hidden : v; pop.hidden = !open; if (setBtn) setBtn.setAttribute('aria-expanded', String(open));
    if (open) { renderPop(); var b = $('button', pop); if (b) b.focus(); } else if (setBtn) setBtn.focus();
  }
  addEventListener('swprefs', function () { syncTheme(); if (!pop.hidden) { var a = D.activeElement, idx = a && pop.contains(a) ? $$('button', pop).indexOf(a) : -1; renderPop(); if (idx >= 0) { var n = $$('button', pop)[idx]; if (n) n.focus(); } } });
  D.addEventListener('click', function (e) {
    var path = e.composedPath ? e.composedPath() : [];
    if (!pop.hidden && path.indexOf(pop) < 0 && !(setBtn && path.indexOf(setBtn) >= 0)) togglePop(false);
  });

  /* shortcuts dialog */
  var dlg = el('dialog', 'keys'); dlg.setAttribute('aria-labelledby', 'keysH');
  dlg.innerHTML = '<h2 id="keysH">Keyboard shortcuts</h2><dl>' + [
    ['L', 'Open the leak tap'], ['R', 'Repair and reset'], ['D', 'Play or stop the full demo'], ['1 – 4', 'Camera: overview, pipe, control, laptop'],
    ['G', 'Show or hide labels'], ['F', 'Fullscreen model'], ['E', 'Download the session log'], ['T', 'Switch theme'], ['?', 'Show this list'], ['Esc', 'Close panels']
  ].map(function (r) { return '<dt><kbd>' + r[0] + '</kbd></dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl><button type="button" class="ib" style="width:100%">Close</button>';
  D.body.appendChild(dlg);
  $('button', dlg).addEventListener('click', function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg && dlg.close) dlg.close(); });
  function showKeys() { if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', ''); }

  /* keyboard (L, R and D are handled by the model page itself) */
  D.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tn = (t.tagName || '').toLowerCase();
    if (e.key === 'Escape') { if (!pop.hidden) togglePop(false); if (full) setFull(false); return; }
    if (tn === 'input' || tn === 'textarea' || tn === 'select' || t.isContentEditable || dlg.open) return;
    var k = e.key.toLowerCase();
    if (e.key === '?') { e.preventDefault(); showKeys(); }
    else if (k >= '1' && k <= '4') { var b = $$('[data-v]')[+k - 1]; if (b) b.click(); }
    else if (k === 'g') { var l = $('#bLab'); if (l) l.click(); }
    else if (k === 'f') { setFull(!full); }
    else if (k === 'e') { exportLog(); }
    else if (k === 't') { cycleTheme(); }
  });
})();

/* ---- v3: live-state mirror, ripples, loading veil, scroll reveal ---- */
(function () {
  'use strict';
  var D = document, h = D.documentElement;
  function $(s) { return D.querySelector(s); }
  var still = function () { return h.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches; };

  /* body[data-state] follows the simulation: ok | check | leak */
  var st = $('#st');
  function mirror() {
    var t = (st.textContent || '').toLowerCase(), s = /leak|alarm|closed/.test(t) ? 'leak' : /confirm/.test(t) ? 'check' : 'ok';
    if (D.body.dataset.state !== s) { D.body.dataset.state = s; st.classList.remove('bump'); void st.offsetWidth; st.classList.add('bump'); }
  }
  if (st) { new MutationObserver(mirror).observe(st, { childList: true, characterData: true, subtree: true }); mirror(); }
  var ke = $('#kpiE');
  if (ke) new MutationObserver(function () { ke.classList.remove('bump'); void ke.offsetWidth; ke.classList.add('bump'); }).observe(ke, { childList: true, characterData: true, subtree: true });

  /* button press ripple */
  D.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.tb button, .ib, .about-actions button, .mini-actions button, .sp-foot button');
    if (!b || still()) return;
    var r = b.getBoundingClientRect(), n = Math.max(r.width, r.height) * 2, i = D.createElement('i');
    i.className = 'ink'; i.style.cssText = 'width:' + n + 'px;height:' + n + 'px;left:' + (e.clientX - r.left - n / 2) + 'px;top:' + (e.clientY - r.top - n / 2) + 'px';
    b.appendChild(i); setTimeout(function () { i.remove(); }, 600);
  }, { passive: true });

  /* loading veil on the 3D stage */
  var stage = $('#stage');
  if (stage) {
    var veil = D.createElement('div'); veil.className = 'stage-load'; veil.setAttribute('aria-hidden', 'true');
    veil.innerHTML = '<i></i><span>Loading 3D model…</span>'; stage.appendChild(veil);
    var clear = function () { setTimeout(function () { veil.classList.add('done'); setTimeout(function () { veil.remove(); }, 600); }, 500); };
    if (D.readyState === 'complete') clear(); else addEventListener('load', clear);
    setTimeout(clear, 8000);
  }

  /* About section: reveal when it scrolls into view, rest again when you scroll back above it */
  var about = $('#about');
  if (about && 'IntersectionObserver' in window && !still()) {
    h.classList.add('fx-ready');
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) about.classList.add('fx-in'); else if (e.boundingClientRect.top > 0) about.classList.remove('fx-in'); });
    }, { threshold: 0.08 }).observe(about);
  }
})();
