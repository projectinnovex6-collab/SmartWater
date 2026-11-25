(function () {
  'use strict';
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* ---------- Header: scroll progress, shadow, active link ---------- */
  var header = $('.site-header');
  if (header) {
    var bar = document.createElement('div');
    bar.className = 'progress';
    header.appendChild(bar);
    var links = $$('.nav-links a[href*="#"]');
    var home = $('.nav-links a[href="index.html"]');
    var secs = links.map(function (a) { return document.getElementById(a.hash.slice(1)); });
    var queued = false;
    var update = function () {
      queued = false;
      var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle('scrolled', y > 8);
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      var cur = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= 140) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
      if (home) home.classList.toggle('active', cur === -1);
    };
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Mobile menu + keep device info fresh ---------- */
  var nav = $('.nav'), navLinks = $('.nav-links');
  if (nav && navLinks) {
    navLinks.id = 'navLinks';
    var btn = document.createElement('button');
    btn.className = 'menu-btn'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Menu'); btn.setAttribute('aria-controls', 'navLinks'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    nav.appendChild(btn);
    var setMenu = function (open) { navLinks.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', function () { setMenu(!navLinks.classList.contains('open')); });
    navLinks.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 700) setMenu(false); });
  }
  var dq = false;
  var redetect = function () {
    if (dq || !window.__detect) return;
    dq = true;
    requestAnimationFrame(function () { dq = false; window.__detect(); });
  };
  window.addEventListener('resize', redetect);
  window.addEventListener('orientationchange', redetect);

  /* ---------- Scroll reveals (home page only) ---------- */
  if (!rm && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add('in');
        else if (e.boundingClientRect.top > 0) e.target.classList.remove('in'); /* scrolled back up past it: rest position */
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    $$('.home .section h2, .home .section .sub, .home .card, .home .step, .home .member, .home .cta-band, .home .flip, .home .lab, .home .faq details, .home .term, .home .stat-big, .home .calc')
      .forEach(function (el) {
        var i = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.setProperty('--d', (el.matches('.card, .step, .member, .flip, .term, .stat-big') ? i * 110 : 0) + 'ms');
        el.classList.add('rv');
        io.observe(el);
      });
  } else {
    $$('.home .step').forEach(function (s) { s.classList.add('in'); });
  }

  /* ---------- Count-up for hero stats ---------- */
  if (!rm) {
    $$('.home .stat b').forEach(function (b) {
      var m = b.textContent.match(/^(\d+(?:\.\d+)?)(.*)$/);
      if (!m) return;
      var n = +m[1], suffix = m[2], t0 = null, dp = (m[1].split('.')[1] || '').length;
      b.textContent = (0).toFixed(dp) + suffix;
      setTimeout(function () {
        requestAnimationFrame(function tick(t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / 1100);
          b.textContent = (n * (1 - Math.pow(1 - p, 3))).toFixed(dp) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        });
      }, 1000);
    });
  }

  /* ---------- Hero scene: looping leak → confirm → isolate story ---------- */
  var sc = $('#scene');
  if (!sc) return;
  var v1 = $('#v1'), v2 = $('#v2'), tm = $('#tm'), fill = $('#dpFill'), dpt = $('#dpTxt'), chip = $('#chipText');
  var TL = [['normal', 3200], ['leak', 1000], ['confirm', 3000], ['closed', 3600]];
  var TOTAL = TL.reduce(function (a, s) { return a + s[1]; }, 0);
  var LABEL = {
    normal: 'Monitoring',
    leak: 'Outlet flow dropping',
    confirm: 'ΔQ above 0.40 L/min · confirming',
    closed: 'Leak confirmed · valve closed'
  };
  var inView = false, s1 = 1.82, s2 = 1.81, t = 0, last = 0, run = false, cur = '';

  function goal(st, time) {
    var j = Math.sin(time / 430) * 0.02;
    if (st === 'normal') return [1.82 + j, 1.81 + j];
    if (st === 'leak') return [1.82, 1.05];
    if (st === 'confirm') return [1.81 + j, 0.55 + j];
    return [0, 0]; /* valve closed: no flow */
  }

  function paint() {
    var d = Math.max(0, s1 - s2);
    v1.textContent = s1.toFixed(2);
    v2.textContent = s2.toFixed(2);
    dpt.textContent = d.toFixed(2) + ' L/min';
    fill.style.transform = 'scaleX(' + Math.min(1, Math.max(0.02, d / 2)) + ')';
    sc.classList.toggle('over', d >= 0.4);
  }

  function frame(now) {
    if (!run) return;
    var dt = Math.min(64, now - last);
    last = now;
    t += dt;
    var m = t % TOTAL, acc = 0, st = 'normal', el = 0;
    for (var i = 0; i < TL.length; i++) {
      if (m < acc + TL[i][1]) { st = TL[i][0]; el = m - acc; break; }
      acc += TL[i][1];
    }
    if (st !== cur) { cur = st; sc.setAttribute('data-state', st); chip.textContent = LABEL[st]; }
    tm.textContent = st === 'confirm' ? Math.max(1, Math.ceil((3000 - el) / 1000)) : st === 'closed' ? '✓' : '3';
    var g = goal(st, t), k = 1 - Math.exp(-dt / 220);
    s1 += (g[0] - s1) * k;
    s2 += (g[1] - s2) * k;
    paint();
    requestAnimationFrame(frame);
  }

  function start() {
    if (run || rm) return;
    run = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { run = false; }
  window.__springLeak = function () { t = 3200; if (!run) start(); };

  if (rm) {
    /* Reduced motion: show one calm, finished state instead of looping */
    sc.setAttribute('data-state', 'closed');
    chip.textContent = LABEL.closed;
    tm.textContent = '✓';
    s1 = 0; s2 = 0; paint();
    return;
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; inView ? start() : stop(); }, { threshold: 0.2 }).observe(sc);
  } else { inView = true; start(); }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : (inView && start()); });
})();
