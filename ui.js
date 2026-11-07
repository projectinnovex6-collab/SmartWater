(function () {
  'use strict';
  var D = document, H = D.documentElement;
  if (!D.body.classList.contains('home')) return;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Tabs (arrow keys, Home, End) ---------- */
  function activate(tab, focus) {
    var list = tab.closest('[role="tablist"]');
    $$('[role="tab"]', list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.setAttribute('tabindex', on ? '0' : '-1');
      var p = D.getElementById(t.getAttribute('data-target'));
      if (p) p.hidden = !on;
    });
    if (focus) tab.focus();
  }
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activate(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); activate(n, true); }
      });
    });
  });
  /* Open the tab that holds an element, so links and the Drip tour can reach it */
  function reveal(id) {
    var el = D.getElementById(id); if (!el) return null;
    var panel = el.classList.contains('tabpanel') ? el : el.closest('.tabpanel');
    if (panel) { var tab = $('[role="tab"][data-target="' + panel.id + '"]'); if (tab) activate(tab); }
    return el;
  }
  window.UI = { reveal: reveal };
  if (location.hash.length > 1) {
    var target = reveal(decodeURIComponent(location.hash.slice(1)));
    if (target) setTimeout(function () { (target.closest('section') || target).scrollIntoView(); }, 60);
  }
  addEventListener('hashchange', function () { if (location.hash.length > 1) reveal(decodeURIComponent(location.hash.slice(1))); });

  /* ---------- Comfort settings ---------- */
  var nav = $('.nav');
  if (nav) {
    var btn = D.createElement('button'), pop = D.createElement('div');
    btn.className = 'settings-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Display settings'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'settingsPop'); btn.textContent = '⚙';
    pop.className = 'settings'; pop.id = 'settingsPop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Display settings');
    var title = D.createElement('h3'); title.textContent = 'Comfort settings'; pop.appendChild(title);

    var row = function (label, options, current, onPick, note) {
      var r = D.createElement('div'); r.className = 'set-row';
      var l = D.createElement('span'); l.textContent = label; r.appendChild(l);
      var seg = D.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', label);
      options.forEach(function (o) {
        var b = D.createElement('button'); b.type = 'button'; b.textContent = o[1]; b.setAttribute('aria-pressed', String(o[0] === current()));
        b.addEventListener('click', function () { onPick(o[0]); Array.prototype.forEach.call(seg.children, function (x, i) { x.setAttribute('aria-pressed', String(options[i][0] === o[0])); }); });
        seg.appendChild(b);
      });
      r.appendChild(seg);
      if (note) { var n = D.createElement('p'); n.className = 'set-note'; n.textContent = note; r.appendChild(n); }
      pop.appendChild(r);
    };
    row('Motion', [['calm', 'Calm'], ['lively', 'Lively']], function () { return H.dataset.motion === 'lively' ? 'lively' : 'calm'; },
      function (v) { H.dataset.motion = v; store.set('sw_motion', v); }, 'Calm hides background effects. Lively adds them back.');
    row('Text size', [['normal', 'Normal'], ['large', 'Large']], function () { return H.dataset.text === 'large' ? 'large' : 'normal'; },
      function (v) { if (v === 'large') H.dataset.text = 'large'; else delete H.dataset.text; store.set('sw_text', v); });
    row('Drip tips', [['off', 'Off'], ['on', 'On']], function () { return window.Drip && window.Drip.tips() ? 'on' : 'off'; },
      function (v) { if (window.Drip) window.Drip.setTips(v === 'on'); }, 'Drip answers when you tap it. Tips make it comment as you scroll.');
    nav.appendChild(btn); nav.appendChild(pop);
    var close = function () { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', function () { var open = pop.hidden; pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); } });
    D.addEventListener('click', function (e) {
      if (pop.hidden) return;
      var path = e.composedPath ? e.composedPath() : [];
      if (path.indexOf(pop) > -1 || path.indexOf(btn) > -1) return;
      close();
    });
  }

  /* ---------- Back to top ---------- */
  var top = D.createElement('button'), queued = false;
  top.className = 'to-top'; top.type = 'button'; top.setAttribute('aria-label', 'Back to top'); top.textContent = '↑';
  top.addEventListener('click', function () { scrollTo({ top: 0, behavior: rm ? 'auto' : 'smooth' }); });
  D.body.appendChild(top);
  addEventListener('scroll', function () {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; top.classList.toggle('show', scrollY > 900); });
  }, { passive: true });
})();
