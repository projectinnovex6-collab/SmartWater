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
    teacher: { line: 'An Arduino, two pressure sensors and a solenoid valve. Prototype cost ≈ ₹4,850 with GST.', cta: 'See how it works', href: '#how' },
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

  var FACTS = [
    "Only about 3% of Earth's water is fresh, and most of it is frozen or underground.",
    'One tap dripping once per second can waste over 11,000 litres in a year (US EPA WaterSense).',
    'Fluid pressure is P = ρgh: about 9.8 kPa for every metre of water height.',
    'So our 15 kPa alarm limit is about the pressure of a 1.5 m column of water.',
    'Close a valve very fast and the moving water can send a pressure surge down the pipe. It is called water hammer.',
    'A normally-closed solenoid valve shuts by itself when its power is cut.',
    'Air pressure at sea level is about 101 kPa.',
    'Many pressure sensors measure how a thin diaphragm bends.',
    'Classic Arduino boards read analog inputs as numbers from 0 to 1023.',
    'Averaging 20 readings smooths electrical noise, so one odd value cannot cause a false alarm.',
    'About 60% of an adult human body is water.',
    'Water is densest at about 4 °C.',
    'Why did the pipe go to therapy? Too much pressure.',
    "I'd tell you another pipe joke, but it might leak.",
    "Fun fact: I'm 100% water. Handle with care.",
    'The pascal (Pa) is named after the French scientist Blaise Pascal.',
    'High up a mountain the air pressure is lower, so water boils at a lower temperature.',
    'Every 10 m or so of sea water adds about one atmosphere (roughly 100 kPa).',
    'One standard atmosphere is 101.325 kPa.',
    'A water molecule is two hydrogen atoms and one oxygen atom: H₂O.',
    'One litre of water has a mass of about one kilogram, which is why its density is about 1000 kg/m³.',
    'A diode across a valve coil soaks up the voltage spike when the power is cut.',
    'The ATmega328P chip on an Arduino Uno runs at 16 MHz.',
    'Our sensor outputs 0.5 V at 0 kPa and 4.5 V at 1,200 kPa. The Arduino turns that into kPa with simple maths.',
    'Straws work because your mouth lowers the pressure inside and the air outside pushes the drink up.'
  ];
  var fi = Math.floor(Math.random() * FACTS.length) - 1;
  function nextFact() { fi = (fi + 1) % FACTS.length; return FACTS[fi]; }
  var ROLE_TIPS = {
    judge: 'The demo page has a live graph, a serial log and the algorithm steps lighting up.',
    student: 'In the demo, watch the algorithm steps light up one by one.'
  };
  function nextTip() { return ROLE_TIPS[role] && Math.random() < 0.25 ? ROLE_TIPS[role] : nextFact(); }
  btn.addEventListener('click', function () { wake(); if (window.DripHub) window.DripHub.toggle(); else say(nextTip(), { ms: 7500 }); });
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
  var NAMES = { features: 'Features', explore: 'Try it', volts: 'Voltage to kPa', depth: 'Depth and pressure', how: 'How it works', timeline: 'Life of a leak', facts: 'Did you know?', parts: 'What is inside', cost: 'Cost', glossary: 'Glossary', faq: 'Questions', team: 'Team' };
  var HINT = {
    features: 'Fun fact: two sensors on one pipe section are enough to spot a leak between them.',
    explore: 'Go on, drag the slider. Find the exact moment it becomes a leak!',
    volts: 'Be the Arduino: turn a number into kPa. The needle has a little bounce.',
    depth: 'Change the liquid. Mercury is 13.6 times denser than water!',
    how: 'Four steps, one decision: read, subtract, wait, act.',
    timeline: 'Scroll slowly: the line fills as the leak story moves along.',
    facts: 'Tap a card to flip it. I collect these.',
    parts: 'The leak tap lets us make a leak without ever cutting the pipe.',
    cost: 'Prices were checked on Indian e-markets, with GST included.',
    glossary: 'Tap a term to see where it appears in our project.',
    faq: 'Tap me and choose Ask Drip. I answer questions too.',
    team: 'Meet the humans who built all of this!'
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.closest('section').id;
        store.set('sw_last', id); seen(id);
        if (!said[id]) { said[id] = 1; auto(HINT[id], { ms: 5500 }); }
      });
    }, { threshold: 0.6 });
    Object.keys(NAMES).forEach(function (id) { var el = D.getElementById(id), h = el && el.querySelector('h2'); if (h) io.observe(h); });
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
    setTimeout(function () { earn('secret'); }, 1800);
    drops(30);
  }
  function drops(n) {
    if (rm) return;
    for (var i = 0; i < n; i++) {
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
    ['sw_name', 'sw_role', 'sw_last', 'sw_asked', 'sw_hush', 'sw_visits', 'sw_badges', 'sw_secs', 'sw_best', 'sw_acc', 'sw_acs', 'sw_sound'].forEach(store.del);
    earned = []; secs = []; soundOn = false;
    D.documentElement.style.removeProperty('--acc'); drip.removeAttribute('data-acc');
    name = ''; role = ''; hush = false; last = ''; visits = 1;
    applyRole(''); renderGreeting();
    say('Done. I forgot everything. Fresh start!', { ms: 4500 });
  });

  /* ---------- Badges, sound and the API the toolbox uses ---------- */
  var BADGES = [
    { id: 'explorer', i: '🧭', n: 'Explorer', d: 'Visit every section of the page' },
    { id: 'flipper', i: '🃏', n: 'Fact finder', d: 'Flip 3 fun-fact cards' },
    { id: 'tinkerer', i: '🔧', n: 'Tinkerer', d: 'Push the leak slider past 15 kPa' },
    { id: 'quiz', i: '🏆', n: 'Quiz whiz', d: 'Score 4 or more in the quiz' },
    { id: 'chatty', i: '💬', n: 'Chatty', d: 'Ask Drip 3 questions' },
    { id: 'secret', i: '💦', n: 'Splash!', d: 'Find the secret on the logo' },
    { id: 'timing', i: '⏱', n: 'Perfect timing', d: 'Stop the 3-second challenge within 0.15 s' },
    { id: 'builder', i: '🛠', n: 'Number cruncher', d: 'Use the voltage or depth explorer' },
    { id: 'scholar', i: '🎓', n: 'Scholar', d: 'Open 5 glossary terms' }
  ];
  var earned = (store.get('sw_badges') || '').split(',').filter(Boolean);
  var secs = (store.get('sw_secs') || '').split(',').filter(Boolean);
  var soundOn = store.get('sw_sound') === '1', ac;
  function beep(kind) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime;
      var f = kind === 'good' ? [520, 780] : kind === 'bad' ? [260, 170] : [420, 600];
      o.type = 'sine';
      o.frequency.setValueAtTime(f[0], now); o.frequency.exponentialRampToValueAtTime(f[1], now + 0.12);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.1, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      o.connect(g); g.connect(ac.destination); o.start(now); o.stop(now + 0.22);
    } catch (e) {}
  }
  function earn(id) {
    var b = BADGES.filter(function (x) { return x.id === id; })[0];
    if (!b || earned.indexOf(id) > -1) return;
    earned.push(id); store.set('sw_badges', earned.join(','));
    beep('good'); mood('proud'); drops(14);
    say('Badge unlocked: ' + b.i + ' ' + b.n + '!', { ms: 4500 });
  }
  function seen(id) {
    if (secs.indexOf(id) < 0) { secs.push(id); store.set('sw_secs', secs.join(',')); }
    if (Object.keys(NAMES).every(function (k) { return secs.indexOf(k) > -1; })) earn('explorer');
  }
  D.addEventListener('drip:earn', function (e) { earn(e.detail); });
  window.Drip = {
    say: say, auto: auto, mood: mood, earn: earn, beep: beep, nextFact: nextFact, store: store,
    badges: function () { return BADGES; }, earned: function () { return earned.slice(); },
    sound: function () { return soundOn; }, setSound: function (v) { soundOn = !!v; store.set('sw_sound', v ? '1' : '0'); },
    role: function () { return role; }, confetti: drops,
    progress: function () { return { secs: secs.slice(), total: Object.keys(NAMES).length }; }
  };

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
