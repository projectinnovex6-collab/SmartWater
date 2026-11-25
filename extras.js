(function () {
  'use strict';
  var D = document;
  if (!D.body.classList.contains('home')) return;
  var $ = function (s) { return D.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(D.querySelectorAll(s)); };
  var earn = function (id) { D.dispatchEvent(new CustomEvent('drip:earn', { detail: id })); };

  /* Ticker: duplicate the items so the loop is seamless */
  var track = $('.ticker-track');
  if (track) Array.prototype.slice.call(track.children).forEach(function (n) { track.appendChild(n.cloneNode(true)); });

  /* Cards glow where the pointer is (mouse devices only) */
  if (matchMedia('(hover: hover)').matches) {
    $$('.card, .member').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive: true });
    });
  }

  /* Fun-fact flip cards */
  var flips = 0;
  $$('.flip').forEach(function (f) {
    f.addEventListener('click', function () {
      var on = f.getAttribute('aria-pressed') !== 'true';
      f.setAttribute('aria-pressed', String(on));
      if (on && !f.dataset.seen) {
        f.dataset.seen = '1'; flips++;
        if (flips >= 3) earn('flipper');
      }
    });
  });

  /* "Make a leak" slider: illustrative numbers, Q1 fixed at 1.82 L/min */
  var range = $('#leakRange');
  if (range) {
    var lab = $('#lab'), out = $('#leakOut'), a = $('#lS1'), b = $('#lS2'), c = $('#lDP'), fill = $('#lFill'), verdict = $('#labVerdict'), was = false;
    var update = function () {
      var leak = +range.value, dp = 0.02 + leak * 0.0125, over = dp >= 0.4;
      out.textContent = leak + '%';
      a.textContent = '1.82';
      b.textContent = (1.82 - dp).toFixed(2);
      c.textContent = dp.toFixed(2);
      fill.style.transform = 'scaleX(' + Math.min(1, dp / 1.6) + ')';
      lab.classList.toggle('over', over);
      if (over !== was) {
        was = over;
        verdict.textContent = over
          ? 'ΔQ is at or above 0.40 L/min. If it stays there for 3 s, the leak is confirmed and the valve closes.'
          : 'Healthy: ΔQ is under 0.40 L/min, so the system just keeps watching.';
        verdict.classList.remove('pop'); void verdict.offsetWidth; verdict.classList.add('pop');
        if (over) earn('tinkerer');
      }
    };
    range.addEventListener('input', update);
    update();
  }
})();
