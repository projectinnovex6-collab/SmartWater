(function () {
  'use strict';
  var D = document;
  if (!D.body.classList.contains('home')) return;
  var $ = function (s) { return D.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(D.querySelectorAll(s)); };
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mouse = matchMedia('(hover: hover)').matches;
  var low = D.documentElement.getAttribute('data-perf') === 'low';
  var earn = function (id) { D.dispatchEvent(new CustomEvent('drip:earn', { detail: id })); };
  var seenOnce = function (el, fn, t) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: t || 0.3 });
    io.observe(el);
  };

  /* Ambient bubbles rising behind the page */
  if (!rm && !low) {
    var wrap = D.createElement('div'); wrap.className = 'bubbles'; wrap.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 10; i++) {
      var b = D.createElement('i'), s = 10 + Math.random() * 34;
      b.style.cssText = 'left:' + (Math.random() * 100) + '%;width:' + s + 'px;height:' + s + 'px;animation-duration:' + (16 + Math.random() * 18) + 's;animation-delay:-' + (Math.random() * 30) + 's;--dx:' + (Math.random() * 80 - 40) + 'px';
      wrap.appendChild(b);
    }
    D.body.insertBefore(wrap, D.body.firstChild);
  }

  /* Hero card tilts toward the pointer; main buttons lean toward it */
  if (mouse && !rm) {
    var hc = $('.hero-card');
    if (hc) {
      hc.addEventListener('pointermove', function (e) {
        var r = hc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        hc.style.transform = 'perspective(900px) rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)';
      });
      hc.addEventListener('pointerleave', function () { hc.style.transform = ''; });
    }
    $$('.btn-primary').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.12).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.2).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  /* Count-up numbers */
  $$('.stat-big b').forEach(function (b) {
    var n = +b.getAttribute('data-count'), pre = b.getAttribute('data-pre') || '', suf = b.getAttribute('data-suf') || '', comma = b.getAttribute('data-comma');
    var fmt = function (v) { return pre + (comma ? v.toLocaleString('en-IN') : v) + suf; };
    if (rm) { b.textContent = fmt(n); return; }
    b.textContent = fmt(0);
    seenOnce(b, function () {
      var t0 = null;
      requestAnimationFrame(function tick(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / 1400);
        b.textContent = fmt(Math.round(n * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      });
    }, 0.6);
  });

  /* Voltage to kPa calculator */
  var adc = $('#adcRange');
  if (adc) {
    var calc = $('#voltCalc'), out = $('#adcOut'), cAdc = $('#cAdc'), cV = $('#cV'), cK = $('#cK'), gK = $('#gKpa'), needle = $('#gNeedle'), gFill = $('#gFill'), note = $('#voltNote'), used = false;
    var update = function () {
      var a = +adc.value, v = a * 5 / 1023, k = Math.max(0, (v - 0.5) * 300), over = v > 4.5, kk = Math.min(1200, k), f = kk / 1200;
      out.textContent = a; cAdc.textContent = a; cV.textContent = v.toFixed(2) + ' V';
      cK.textContent = Math.round(kk) + ' kPa'; gK.textContent = Math.round(kk) + ' kPa';
      needle.style.transform = 'rotate(' + (-90 + f * 180) + 'deg)';
      gFill.style.strokeDasharray = (f * 100) + ' 100';
      calc.classList.toggle('over', over);
      note.textContent = over ? 'Above 4.5 V: beyond the sensor range of 1.2 MPa. Never exceed the sensor rating.'
        : v <= 0.5 ? 'At 0.5 V or below, the sensor reports zero pressure.'
        : kk >= 1199 ? 'Sensor maximum: 4.5 V is 1,200 kPa.' : '';
    };
    adc.addEventListener('input', function () { update(); if (!used) { used = true; earn('builder'); } });
    $$('#adcPresets button').forEach(function (b) {
      b.addEventListener('click', function () { adc.value = b.getAttribute('data-adc'); update(); if (!used) { used = true; earn('builder'); } });
    });
    update();
  }

  /* Depth explorer: P = rho g h */
  var dr = $('#depthRange');
  if (dr) {
    var tank = $('.tank'), liq = $('#tLiq'), dH = $('#dH'), eq = $('#dEq'), dRho = $('#dRho'), dP = $('#dP'), cmp = $('#dCmp');
    var DENS = { water: 1000, sea: 1025, mercury: 13600 }, kind = 'water', G = 9.8, dUsed = false;
    var upd = function () {
      var h = +dr.value, rho = DENS[kind], pa = rho * G * h, kpa = pa / 1000;
      dH.textContent = h.toFixed(1) + ' m';
      liq.style.transform = 'translateY(' + (198 - h * 62) + 'px)';
      eq.textContent = 'P = ' + rho.toLocaleString('en-US') + ' × 9.8 × ' + h.toFixed(1) + ' = ' + Math.round(pa).toLocaleString('en-US') + ' Pa';
      dRho.textContent = rho.toLocaleString('en-US') + ' kg/m³';
      dP.textContent = (kpa < 100 ? kpa.toFixed(1) : Math.round(kpa)) + ' kPa';
      cmp.textContent = kpa >= 15 ? 'This is above our 15 kPa alarm limit.' : 'This is below our 15 kPa alarm limit. Water needs about 1.5 m to reach it.';
    };
    dr.addEventListener('input', function () { upd(); if (!dUsed) { dUsed = true; earn('builder'); } });
    $$('#liqChips button').forEach(function (b) {
      b.addEventListener('click', function () {
        kind = b.getAttribute('data-liq'); tank.setAttribute('data-liq', kind);
        $$('#liqChips button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        upd();
      });
    });
    tank.setAttribute('data-liq', 'water'); upd();
  }

  /* Life of a leak: the line fills as you scroll */
  var tl = $('#tl');
  if (tl) {
    var items = $$('.tl-item'), drop = D.createElement('i'), queued = false;
    drop.className = 'tl-drop'; tl.appendChild(drop);
    var run = function () {
      queued = false;
      var r = tl.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * 0.62 - r.top) / r.height));
      tl.style.setProperty('--p', p.toFixed(3));
      items.forEach(function (it) { it.classList.toggle('on', p >= (it.offsetTop + 16) / tl.offsetHeight - 0.02); });
    };
    var ask = function () { if (!queued) { queued = true; requestAnimationFrame(run); } };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); run();
  }

  /* Cost bars grow when they come into view */
  var bars = $('#bars');
  if (bars) {
    $$('.bar').forEach(function (b, i) { b.style.setProperty('--i', i); });
    seenOnce(bars, function () { bars.classList.add('in'); }, 0.2);
  }

  /* Glossary: filter, search, open terms */
  var terms = $$('.term');
  if (terms.length) {
    var cat = 'all', q = '', opened = {}, count = 0, empty = $('#glossEmpty');
    var apply = function () {
      var shown = 0;
      terms.forEach(function (t) {
        var ok = (cat === 'all' || t.getAttribute('data-cat') === cat) && (!q || t.textContent.toLowerCase().indexOf(q) > -1);
        t.hidden = !ok;
        if (ok) { shown++; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
      });
      empty.hidden = shown > 0;
    };
    $$('#glossChips button').forEach(function (b) {
      b.addEventListener('click', function () {
        cat = b.getAttribute('data-cat');
        $$('#glossChips button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        apply();
      });
    });
    $('#glossSearch').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); apply(); });
    terms.forEach(function (t, i) {
      t.addEventListener('click', function () {
        var on = t.getAttribute('aria-expanded') !== 'true';
        t.setAttribute('aria-expanded', String(on));
        if (on && !opened[i]) { opened[i] = 1; if (++count >= 5) earn('scholar'); }
      });
    });
  }
})();
