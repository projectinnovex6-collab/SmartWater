(function () {
  'use strict';
  var D = document;
  if (!D.body.classList.contains('home')) return;
  var $ = function (s) { return D.querySelector(s); };
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Everything is stored on the visitor's own device (localStorage) */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var name = store.get('sw_name') || '';
  var role = store.get('sw_role') || '';
  var hush = store.get('sw_hush') === '1';
  var last = store.get('sw_last') || '';
  var visits = +store.get('sw_visits') || 0;
  try {
    if (!sessionStorage.getItem('sw_seen')) { visits++; store.set('sw_visits', visits); sessionStorage.setItem('sw_seen', '1'); }
  } catch (e) { visits = visits || 1; }

  var greet = $('#greet'), greetText = $('#greetText'), greetBtn = $('#greetBtn');
  var line = $('#personaLine'), cta = $('#heroCta'), chips = Array.prototype.slice.call(D.querySelectorAll('#persona button'));
  var drip = $('#drip'), bub = $('#dripBubble'), txt = $('#dripText'), form = $('#dripForm'), input = $('#dripName');
  var btn = $('#dripBtn'), hushBtn = $('#dripHush'), eyes = $('#dripEyes'), sc = $('#scene');
  var ctaText = cta.textContent, ctaHref = cta.getAttribute('href'), lineDefault = line.textContent;

  /* ---------- Greeting ---------- */
  function renderGreeting() {
    var h = new Date().getHours();
    var base = h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Late-night learner';
    greetText.textContent = base + (name ? ', ' + name + '.' : '.');
    greetBtn.textContent = name ? 'Not you?' : 'Add your name';
    greet.hidden = false;
  }

  /* ---------- Visitor type ---------- */
  var P = {
    judge:   { line: 'Short on time? Remember three numbers: 2 sensors, 15 kPa, 3 s.', cta: 'Watch the live demo', href: 'demo.html' },
    student: { line: 'Start with the four steps below, then open the leak yourself in the demo.', cta: 'Learn the 4 steps', href: '#how' },
    teacher: { line: 'An Arduino, two pressure sensors and a solenoid valve. Prototype cost ≈ ₹3,500–4,200.', cta: 'See how it works', href: '#how' },
    curious: { line: 'Watch the card on the right: a leak opens and the system reacts within 3 seconds.', cta: 'Open interactive demo', href: 'demo.html' }
  };
  function applyRole(r) {
    role = P[r] ? r : '';
    chips.forEach(function (c) { c.setAttribute('aria-checked', String(c.getAttribute('data-role') === role)); });
    var p = P[role];
    line.textContent = p ? p.line : lineDefault;
    cta.textContent = p ? p.cta : ctaText;
    cta.setAttribute('href', p ? p.href : ctaHref);
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var r = c.getAttribute('data-role');
      if (r === role) { store.del('sw_role'); applyRole(''); return; }
      store.set('sw_role', r); applyRole(r);
      tipIndex = 0; say(roleHello(r), { ms: 6000 });
    });
  });
  function roleHello(r) {
    return r === 'judge' ? 'Welcome, judges! I kept it short for you.'
      : r === 'student' ? 'Hey, fellow student! Questions are the best part of science.'
      : r === 'teacher' ? 'Welcome, teacher! Everything here is meant to be explained.'
      : 'Curious is the best way to be. Look right!';
  }

  /* ---------- Drip: bubble, moods, tips ---------- */
  var timer, said = {}, tipIndex = 0;
  function say(text, o) {
    o = o || {};
    txt.textContent = text;
    form.hidden = !o.form;
    bub.hidden = false;
    bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
    clearTimeout(timer);
    if (!o.sticky) timer = setTimeout(function () { bub.hidden = true; }, o.ms || 7000);
  }
  function auto(text, o) { if (!hush) say(text, o); }
  function mood(m) { drip.setAttribute('data-mood', m); }

  var TIPS = [
    'ΔP = S1 − S2. A healthy short pipe only loses a few kPa.',
    'The leak is made with a ball valve, so the pipe is never cut.',
    'The 3-second window keeps short pump spikes from closing the valve.',
    'ESP32 can send an SMS-style alert when a leak is confirmed.',
    'Why did the pipe go to therapy? Too much pressure.',
    "I'd tell you another pipe joke, but it might leak.",
    "Fun fact: I'm 100% water. Handle with care."
  ];
  var ROLE_TIPS = {
    judge: 'The demo page has a live graph, a serial log and the algorithm steps lighting up.',
    student: 'In the demo, watch the algorithm steps light up one by one.'
  };
  function nextTip() {
    var list = ROLE_TIPS[role] ? [ROLE_TIPS[role]].concat(TIPS) : TIPS;
    return list[tipIndex++ % list.length];
  }
  btn.addEventListener('click', function () { wake(); say(nextTip(), { ms: 7500 }); });
  hushBtn.addEventListener('click', function () {
    hush = true; store.set('sw_hush', '1'); bub.hidden = true;
  });

  function setName(n) {
    name = n.replace(/\s+/g, ' ').trim().slice(0, 20);
    if (name) store.set('sw_name', name); else store.del('sw_name');
    renderGreeting();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!input.value.trim()) return;
    setName(input.value);
    hush = false; store.del('sw_hush');
    say('Nice to meet you, ' + name + '! Pick who you are, and I will tailor the page.', { ms: 6500 });
  });
  greetBtn.addEventListener('click', function () {
    if (name) { setName(''); input.value = ''; say('No problem! Want to tell me a different name?', { form: true, sticky: true }); }
    else { say('What should I call you?', { form: true, sticky: true }); input.focus(); }
  });

  /* ---------- Eyes follow the pointer, blink, fall asleep ---------- */
  var pupils = Array.prototype.slice.call(drip.querySelectorAll('.eye')), raf = false, px = 0, py = 0;
  function look() {
    raf = false;
    pupils.forEach(function (eye) {
      var r = eye.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var a = Math.atan2(py - cy, px - cx), d = Math.min(2.2, Math.hypot(px - cx, py - cy) / 40);
      eye.querySelector('.pupil').style.transform = 'translate(' + (Math.cos(a) * d).toFixed(2) + 'px,' + (Math.sin(a) * d).toFixed(2) + 'px)';
    });
  }
  D.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; if (!raf) { raf = true; requestAnimationFrame(look); } wake(); }, { passive: true });
  (function blink() {
    eyes.classList.add('blink');
    setTimeout(function () { eyes.classList.remove('blink'); }, 140);
    setTimeout(blink, 2500 + Math.random() * 3500);
  })();

  var idle;
  function wake() {
    clearTimeout(idle);
    if (drip.classList.contains('asleep')) { drip.classList.remove('asleep'); auto('Oh! You are back.', { ms: 3000 }); }
    idle = setTimeout(function () { drip.classList.add('asleep'); }, 30000);
  }
  ['scroll', 'keydown', 'touchstart'].forEach(function (ev) { addEventListener(ev, wake, { passive: true }); });

  /* ---------- Reacts to the hero scene ---------- */
  if (sc) {
    new MutationObserver(function () {
      var s = sc.getAttribute('data-state');
      mood(s === 'leak' || s === 'confirm' ? 'worried' : s === 'closed' ? 'proud' : 'happy');
      if (s === 'leak' && !said.leak) { said.leak = 1; auto('Uh-oh, the pressure is dropping!', { ms: 3200 }); }
      if (s === 'closed' && !said.closed) { said.closed = 1; auto('Valve closed. Leak contained!', { ms: 4000 }); }
    }).observe(sc, { attributes: true, attributeFilter: ['data-state'] });
  }

  /* ---------- Remembers where you stopped, comments on sections ---------- */
  var NAMES = { features: 'Features', how: 'How it works', team: 'Team' };
  var HINT = {
    features: 'Fun fact: two sensors on one pipe section are enough to spot a leak between them.',
    how: 'Four steps, one decision: read, subtract, wait, act.',
    team: 'Meet the humans who built all of this!'
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        store.set('sw_last', id);
        if (!said[id]) { said[id] = 1; auto(HINT[id], { ms: 5500 }); }
      });
    }, { threshold: 0.45 });
    Object.keys(NAMES).forEach(function (id) { var el = D.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- Logo easter egg: tap it 5 times ---------- */
  var logo = $('.logo'), taps = 0, tt;
  logo.addEventListener('click', function (e) {
    e.preventDefault();
    scrollTo({ top: 0, behavior: rm ? 'auto' : 'smooth' });
    taps++; clearTimeout(tt); tt = setTimeout(function () { taps = 0; }, 1300);
    if (taps >= 5) { taps = 0; splash(); }
  });
  function splash() {
    say('Splash! You found my secret.', { ms: 4000 });
    mood('proud');
    if (rm) return;
    for (var i = 0; i < 30; i++) {
      var d = D.createElement('i'), s = 8 + Math.random() * 10;
      d.className = 'splash-drop';
      d.style.cssText = 'left:' + (Math.random() * 100) + 'vw;width:' + s + 'px;height:' + (s * 1.4) + 'px;animation-delay:' + (Math.random() * 0.7) + 's;opacity:' + (0.5 + Math.random() * 0.5);
      D.body.appendChild(d);
      setTimeout((function (n) { return function () { n.remove(); }; })(d), 2600);
    }
  }

  /* ---------- Tab title with a bit of attitude ---------- */
  var title = D.title;
  D.addEventListener('visibilitychange', function () { D.title = D.hidden ? '💧 Psst… come back!' : title; });

  /* ---------- Forget me ---------- */
  $('#forget').addEventListener('click', function () {
    ['sw_name', 'sw_role', 'sw_last', 'sw_asked', 'sw_hush', 'sw_visits'].forEach(store.del);
    name = ''; role = ''; hush = false; last = ''; visits = 1;
    applyRole(''); renderGreeting();
    say('Done. I forgot everything. Fresh start!', { ms: 4500 });
  });

  /* ---------- Start ---------- */
  renderGreeting();
  if (role) applyRole(role);
  wake();
  setTimeout(function () {
    if (hush) return;
    if (name) {
      say('Welcome back, ' + name + '! This is visit #' + visits + '.' + (NAMES[last] ? ' You stopped at “' + NAMES[last] + '” last time.' : ''), { ms: 6500 });
    } else if (!store.get('sw_asked')) {
      store.set('sw_asked', '1');
      say("Hi, I'm Drip, this project's mascot. What should I call you?", { form: true, sticky: true });
    }
  }, 2600);
})();
