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

  /* Pulses to L/min (YF-S201: F = 7.5 x Q) */
  var adc = $('#adcRange');
  if (adc) {
    var out = $('#adcOut'), cAdc = $('#cAdc'), cV = $('#cV'), cK = $('#cK'), gK = $('#gKpa'), needle = $('#gNeedle'), gFill = $('#gFill'), note = $('#voltNote'), used = false;
    var update = function () {
      var a = +adc.value, q = a / 7.5, f = Math.min(1, q / 8);
      out.textContent = a; cAdc.textContent = a; cV.textContent = a + ' Hz';
      cK.textContent = q.toFixed(2) + ' L/min'; gK.textContent = q.toFixed(2) + ' L/min';
      needle.style.transform = 'rotate(' + (-90 + f * 180) + 'deg)';
      gFill.style.strokeDasharray = (f * 100) + ' 100';
      note.textContent = a === 0 ? 'No pulses means no flow: the pump is off or the valve is closed.'
        : q < 1 ? 'Below 1 L/min. The YF-S201 datasheet range is 1 to 30 L/min, so very small flows are less reliable.' : '';
    };
    adc.addEventListener('input', function () { update(); if (!used) { used = true; earn('builder'); } });
    $$('#adcPresets button').forEach(function (b) {
      b.addEventListener('click', function () { adc.value = b.getAttribute('data-adc'); update(); if (!used) { used = true; earn('builder'); } });
    });
    update();
  }

  /* Water lost by a leak: litres = rate x time */
  var dr = $('#depthRange');
  if (dr) {
    var liq = $('#tLiq'), dH = $('#dH'), eq = $('#dEq'), dRho = $('#dRho'), dP = $('#dP'), cmp = $('#dCmp');
    var SPAN = { conf: ['3 seconds', 3], hour: ['1 hour', 3600], day: ['1 day', 86400] }, kind = 'conf', dUsed = false;
    var fmtL = function (v) { return v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'); };
    var upd = function () {
      var r = +dr.value, s = SPAN[kind], L = r * s[1] / 60;
      dH.textContent = r.toFixed(2) + ' L/min';
      liq.style.transform = 'translateY(' + (198 - Math.min(1, L / 1000) * 186) + 'px)';
      eq.textContent = 'Lost = ' + r.toFixed(2) + ' L/min × ' + (s[1] / 60).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' min = ' + fmtL(L) + ' L';
      dRho.textContent = s[0]; dP.textContent = fmtL(L) + ' L';
      cmp.textContent = kind === 'conf' ? 'Only ' + fmtL(L) + ' L escapes during our 3 s confirmation, then the valve closes.' : 'About ' + Math.round(L / 20).toLocaleString('en-US') + ' buckets of 20 L. Without isolation, a leak keeps going.';
    };
    dr.addEventListener('input', function () { upd(); if (!dUsed) { dUsed = true; earn('builder'); } });
    $$('#liqChips button').forEach(function (b) {
      b.addEventListener('click', function () {
        kind = b.getAttribute('data-liq');
        $$('#liqChips button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        upd();
      });
    });
    upd();
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
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) bars.classList.add('in'); else if (e.boundingClientRect.top > 0) bars.classList.remove('in'); }); }, { threshold: 0.2 }).observe(bars);
    else bars.classList.add('in');
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
