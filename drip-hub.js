(function () {
  'use strict';
  var D = document;
  if (!D.body.classList.contains('home') || !window.Drip) return;
  var Drip = window.Drip, rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return D.querySelector(s); };
  var drip = $('#drip'), panel = $('#dripPanel'), body = $('#dpBody'), title = $('#dpTitle'), back = $('#dpBack'), closeBtn = $('#dpClose'), btn = $('#dripBtn'), bub = $('#dripBubble');
  if (!panel) return;

  function el(tag, cls, text) { var e = D.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function button(label, cls, fn) { var b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function clear() { while (body.firstChild) body.removeChild(body.firstChild); }
  function pop(n) { n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function act(label, icon, fn) { var b = el('button', 'dp-act'); b.type = 'button'; b.appendChild(el('span', 'dp-ic', icon)); b.appendChild(el('span', '', label)); b.addEventListener('click', fn); return b; }

  var TITLES = { menu: "Drip's toolbox", fact: 'Fun fact', quiz: 'Quiz', tour: 'Guided tour', ask: 'Ask Drip', badges: 'My badges', style: 'Style', convert: 'Unit converter', timing: '3-second challenge', progress: 'My progress' };
  var VIEWS = {};
  function show(v, arg) {
    panel.setAttribute('data-v', v); clear();
    back.hidden = v === 'menu'; title.textContent = TITLES[v];
    VIEWS[v](arg); panel.scrollTop = 0;
  }
  function open() {
    panel.hidden = false; bub.hidden = true; btn.setAttribute('aria-expanded', 'true'); show('menu');
    var f = body.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  function shut() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); clearGlow(); }
  function toggle() { if (panel.hidden) open(); else shut(); }
  back.addEventListener('click', function () { clearGlow(); show('menu'); });
  closeBtn.addEventListener('click', shut);
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { shut(); btn.focus(); } });
  D.addEventListener('click', function (e) {
    if (panel.hidden) return;
    /* A button that rebuilds the panel removes itself from the page, so check the path the click took, not where the target is now. */
    var path = e.composedPath ? e.composedPath() : [];
    if (path.indexOf(drip) > -1 || drip.contains(e.target) || e.target.isConnected === false) return;
    shut();
  });

  /* ----- Menu ----- */
  VIEWS.menu = function () {
    var g = el('div', 'dp-grid');
    g.appendChild(act('Fun fact', '💡', function () { show('fact'); }));
    g.appendChild(act('Quiz me', '🧠', function () { show('quiz', { i: 0, s: 0 }); }));
    g.appendChild(act('Take the tour', '🧭', function () { show('tour', 0); }));
    g.appendChild(act('Ask Drip', '💬', function () { show('ask'); }));
    g.appendChild(act('My badges', '🏅', function () { show('badges'); }));
    g.appendChild(act('Style', '🎨', function () { show('style'); }));
    g.appendChild(act('Converter', '🔁', function () { show('convert'); }));
    g.appendChild(act('3-second challenge', '⏱', function () { show('timing'); }));
    g.appendChild(act('Glossary', '📖', function () { shut(); go('glossary'); }));
    g.appendChild(act('My progress', '📈', function () { show('progress'); }));
    g.appendChild(act('Share this site', '📤', function () { share(); }));
    g.appendChild(act('Do a trick', '✨', function () { shut(); trick(); }));
    g.appendChild(act('Sound: ' + (Drip.sound() ? 'on' : 'off'), '🔊', function () { Drip.setSound(!Drip.sound()); if (Drip.sound()) Drip.beep('good'); show('menu'); }));
    g.appendChild(act('Tips: ' + (Drip.tips() ? 'on' : 'off'), '💡', function () { Drip.setTips(!Drip.tips()); show('menu'); }));
    body.appendChild(g);
    body.appendChild(el('p', 'dp-note', 'Press D to open or close me, Esc to close.'));
  };

  /* ----- Fun facts ----- */
  VIEWS.fact = function () {
    var card = el('div', 'dp-card', Drip.nextFact()); card.setAttribute('aria-live', 'polite');
    body.appendChild(card);
    body.appendChild(button('Another one', 'dp-btn', function () { card.textContent = Drip.nextFact(); pop(card); Drip.beep('soft'); }));
    if ('speechSynthesis' in window) body.appendChild(button('Read aloud', 'dp-btn alt', function () {
      try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(card.textContent)); } catch (e) {}
    }));
  };

  /* ----- Quiz ----- */
  var QZ = [
    { q: 'Which ΔP starts the leak timer?', o: ['5 kPa', '15 kPa', '50 kPa'], a: 1 },
    { q: 'How long must ΔP stay high?', o: ['1 second', '3 seconds', '10 seconds'], a: 1 },
    { q: 'In P = ρgh, what is g?', o: ['Acceleration due to gravity', 'The height of the pipe', 'The density of water'], a: 0 },
    { q: 'How does the demo make a leak?', o: ['It cuts the pipe', 'A ball-valve leak tap', 'It drills a hole'], a: 1 },
    { q: 'ΔP is…', o: ['S1 + S2', 'S1 − S2', 'S2 × 2'], a: 1 }
  ];
  VIEWS.quiz = function (st) {
    if (st.i >= QZ.length) return quizEnd(st.s);
    var q = QZ[st.i];
    body.appendChild(el('p', 'dp-prog', 'Question ' + (st.i + 1) + ' of ' + QZ.length));
    body.appendChild(el('p', 'dp-q', q.q));
    var opts = shuffle(q.o.map(function (t, k) { return { t: t, ok: k === q.a }; }));
    var box = el('div', 'dp-opts'), fb = el('p', 'dp-fb', ''), done = false;
    fb.setAttribute('aria-live', 'polite');
    opts.forEach(function (o) {
      var b = button(o.t, 'dp-opt', function () {
        if (done) return; done = true;
        if (o.ok) { b.classList.add('ok'); st.s++; Drip.beep('good'); Drip.mood('proud'); fb.textContent = 'Correct!'; }
        else {
          b.classList.add('no'); Drip.beep('bad'); Drip.mood('worried'); fb.textContent = 'Not quite. The right answer is highlighted.';
          Array.prototype.forEach.call(box.children, function (x, k) { if (opts[k].ok) x.classList.add('ok'); });
        }
        var nx = button(st.i + 1 < QZ.length ? 'Next question' : 'See my score', 'dp-btn', function () { Drip.mood('happy'); show('quiz', { i: st.i + 1, s: st.s }); });
        body.appendChild(nx); nx.focus({ preventScroll: true });
      });
      box.appendChild(b);
    });
    body.appendChild(box); body.appendChild(fb);
  };
  function quizEnd(s) {
    var best = +Drip.store.get('sw_best') || 0;
    if (s > best) { best = s; Drip.store.set('sw_best', String(s)); }
    body.appendChild(el('p', 'dp-score', s + ' / ' + QZ.length));
    body.appendChild(el('p', 'dp-q', s === QZ.length ? 'Perfect! Drip is doing a happy dance.' : s >= 4 ? 'Great job!' : s >= 2 ? 'Good start. Take the tour, then play again.' : 'Every expert starts here. Read the steps and try again!'));
    body.appendChild(el('p', 'dp-note', 'Best score: ' + best + ' / ' + QZ.length));
    if (s >= 4) Drip.earn('quiz');
    body.appendChild(button('Play again', 'dp-btn', function () { show('quiz', { i: 0, s: 0 }); }));
  }

  /* ----- Guided tour ----- */
  var TOUR = [
    ['features', 'These are the three big ideas behind the model.'],
    ['explore', 'Drag the slider to make a leak and watch ΔP change.'],
    ['volts', 'Be the Arduino: turn a number into voltage and then kPa.'],
    ['depth', 'See how depth and liquid change the pressure: P = ρgh.'],
    ['how', 'The four steps the Arduino repeats, over and over.'],
    ['timeline', 'The whole story of a leak, from the first drip to the shut valve.'],
    ['facts', 'Flip the cards for fun facts.'],
    ['parts', 'Everything inside the prototype.'],
    ['cost', 'What each part costs, with GST.'],
    ['glossary', 'Words you need, and where they appear.'],
    ['faq', 'Common questions, answered.'],
    ['team', 'And the people who built it!']
  ];
  var glow = null;
  function clearGlow() { if (glow) glow.classList.remove('hl'); glow = null; }
  function go(id) {
    var el = window.UI ? window.UI.reveal(id) : D.getElementById(id); if (!el) return;
    var sec = el.closest('section') || el;
    clearGlow();
    sec.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' });
    var h = sec.querySelector('h2');
    if (h) { glow = h; h.classList.remove('hl'); void h.offsetWidth; h.classList.add('hl'); }
  }
  VIEWS.tour = function (i) {
    var t = TOUR[i]; go(t[0]);
    body.appendChild(el('p', 'dp-prog', 'Stop ' + (i + 1) + ' of ' + TOUR.length));
    body.appendChild(el('p', 'dp-q', t[1]));
    if (i > 0) body.appendChild(button('Back', 'dp-btn alt', function () { show('tour', i - 1); }));
    if (i < TOUR.length - 1) body.appendChild(button('Next stop', 'dp-btn', function () { show('tour', i + 1); }));
    else body.appendChild(button('Finish', 'dp-btn', function () { clearGlow(); show('menu'); Drip.say('Tour done! Now you know your way around.', { ms: 4000 }); }));
  };

  /* ----- Ask Drip (offline keyword matching over what this site knows) ----- */
  var KB = [
    { k: ['15', 'kpa', 'threshold', 'limit'], a: 'A healthy short pipe only loses a few kPa between S1 and S2. 15 kPa sits clearly above that, so it trips only when something is really wrong. It is tuned by testing.' },
    { k: ['3 s', '3', 'second', 'timer', 'wait', 'spike', 'false'], a: 'The leak must last 3 seconds. That window ignores short pump spikes, so the valve is not closed by mistake.' },
    { k: ['sensor', 's1', 's2', 'node', 'pressure'], a: 'There are two pressure sensors, S1 and S2, one at each end of the pipe section being watched. A leak lowers the pressure at S2.' },
    { k: ['rho', 'density', 'formula', 'pgh', 'gravity', 'fluid'], a: 'Fluid pressure is P = ρgh: density times gravity (9.8 m/s²) times height. Water adds about 9.8 kPa per metre, so 15 kPa is about 1.5 m of water.' },
    { k: ['arduino', 'brain', 'adc', 'sample', 'average'], a: 'The Arduino averages 20 ADC samples from each sensor, converts them to kPa, subtracts S2 from S1 and decides what to do.' },
    { k: ['esp32', 'alert', 'mobile', 'sms', 'telegram', 'blynk', 'phone', 'notify'], a: 'The ESP32 add-on can send a mobile alert (for example through Telegram or Blynk) when a leak is confirmed.' },
    { k: ['cost', 'price', 'budget', 'rupee', 'rs', 'cheap', 'gst'], a: 'The prototype costs about ₹4,850 including GST (₹4,852 added up, with no LCD), using prices checked on Indian e-markets in November 2026. The two pressure sensors are the biggest cost.' },
    { k: ['valve', 'solenoid', 'nc', 'close', 'isolate', 'relay'], a: 'On a leak the Arduino switches the relay on, which cuts power to the normally-closed valve, so it closes and the loss stops.' },
    { k: ['tap', 'ball', 'cut', 'create', 'simulate'], a: 'On stage the leak comes from a ball valve (the leak tap) between S1 and S2. The pipe is never cut.' },
    { k: ['lcd', 'display', 'screen', 'dummy', 'simulation', 'simulated', 'real', 'hardware'], a: 'The web demo is a dummy simulation. Nothing is connected to real hardware, and the model has no LCD display.' },
    { k: ['adc', 'volt', 'voltage', '1023', 'analog', 'convert', 'maths', 'math'], a: 'The sensor gives 0.5 V at 0 kPa and 4.5 V at 1,200 kPa. The Arduino reads volts = ADC × 5 ÷ 1023, then kPa = (volts − 0.5) × 300.' },
    { k: ['psi', 'bar', 'unit', 'units', 'pascal', 'atmosphere', 'atm'], a: '1 kPa = 1,000 Pa, 100 kPa = 1 bar, and 1 kPa is about 0.145 psi. One atmosphere is 101.325 kPa. Try my converter in the toolbox.' },
    { k: ['calibrate', 'calibration', 'zero'], a: 'Calibration means recording each sensor reading with the pump off, so every later reading starts from zero.' },
    { k: ['latch', 'reset', 'latched'], a: 'The alarm is latched: it stays on until a person checks the pipe and presses reset.' },
    { k: ['diode', '1n4007', 'spike', 'flyback'], a: 'A 1N4007 diode goes across the valve, stripe toward +12 V. It soaks up the voltage spike when the valve power is cut.' },
    { k: ['pump', 'adapter', 'supply', 'power'], a: 'A 12 V adapter powers the pump and the valve. The Arduino and its sensors run on 5 V, kept separate from the 12 V side by the relay.' },
    { k: ['safe', 'safety', 'rating', 'mpa', 'maximum'], a: 'Never exceed the sensor rating of 1.2 MPa. Keep the 12 V and 5 V sides separate, and fit the diode across the valve.' },
    { k: ['hammer', 'surge'], a: 'Water hammer is a pressure surge when flowing water is stopped suddenly. It is why valves should close with care.' },
    { k: ['demo', 'try', 'laptop', 'tablet', '3d'], a: 'The interactive demo runs in your browser on a phone, tablet or laptop. Open a leak, watch the timer, then repair and reset.' },
    { k: ['team', 'who', 'built', 'made', 'student'], a: 'Built by Jitamitra Das, Aditya Bhusan Behera and Bignesh Acharya of DAV Public School, CDA.' },
    { k: ['school', 'dav', 'cda'], a: 'The team is from DAV Public School, CDA.' },
    { k: ['name', 'mascot', 'drip', 'you'], a: 'I am Drip, a very small water droplet with a very big job: explaining leaks.' },
    { k: ['hello', 'hi', 'hey'], a: 'Hello! Ask me about the threshold, the timer, the sensors, the valve or the cost.' },
    { k: ['joke', 'funny'], a: 'Why did the pipe go to therapy? Too much pressure.' },
    { k: ['fact', 'fun', 'know'], a: null }
  ];
  function norm(s) { return ' ' + s.toLowerCase().replace(/₹/g, ' rs ').replace(/ρ/g, ' rho ').replace(/[^a-z0-9]+/g, ' ').trim() + ' '; }
  function hit(n, k) { return k.length <= 3 ? n.indexOf(' ' + k + ' ') > -1 : n.indexOf(' ' + k) > -1; }
  function answer(q) {
    var n = norm(q), best = null, score = 0;
    KB.forEach(function (e) { var sc = e.k.filter(function (k) { return hit(n, k); }).length; if (sc > score) { score = sc; best = e; } });
    if (!best) return "Hmm, I don't know that one yet. Try asking about the threshold, the 3-second timer, the sensors, the formula P = ρgh, the valve or the cost.";
    return best.a === null ? Drip.nextFact() : best.a;
  }
  var asked = 0;
  VIEWS.ask = function () {
    var out = el('div', 'dp-card', 'Ask me anything about how it works.'); out.setAttribute('aria-live', 'polite');
    var form = el('form', 'dp-form'), input = el('input'); input.type = 'text'; input.maxLength = 80; input.placeholder = 'Ask about the project…'; input.setAttribute('aria-label', 'Your question');
    var go = el('button', 'dp-btn', 'Ask'); go.type = 'submit';
    form.appendChild(input); form.appendChild(go);
    function run(q) {
      q = q.trim(); if (!q) return;
      out.textContent = answer(q); pop(out); Drip.beep('soft');
      if (++asked >= 3) Drip.earn('chatty');
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); input.value = ''; });
    body.appendChild(form); body.appendChild(out);
    var chips = el('div', 'dp-chips');
    ['Why 15 kPa?', 'Why 3 seconds?', 'What is ρgh?', 'Is the demo real?', 'How much does it cost?'].forEach(function (q) { chips.appendChild(button(q, 'dp-chip', function () { run(q); })); });
    body.appendChild(chips);
  };

  /* ----- Badges ----- */
  VIEWS.badges = function () {
    var all = Drip.badges(), got = Drip.earned();
    body.appendChild(el('p', 'dp-prog', got.length + ' of ' + all.length + ' earned'));
    var bar = el('div', 'dp-bar'), fillb = el('i'); fillb.style.width = '0%'; bar.appendChild(fillb); body.appendChild(bar);
    setTimeout(function () { fillb.style.width = (got.length / all.length * 100) + '%'; }, 60);
    var g = el('div', 'dp-badges');
    all.forEach(function (b) {
      var on = got.indexOf(b.id) > -1, d = el('div', 'dp-badge' + (on ? ' on' : ''));
      d.appendChild(el('span', 'dp-bi', on ? b.i : '🔒')); d.appendChild(el('strong', '', b.n)); d.appendChild(el('small', '', b.d)); g.appendChild(d);
    });
    body.appendChild(g);
  };

  /* ----- Style: accent colour + accessory ----- */
  var ACC = [['Aqua', '#43c6d9'], ['Mint', '#5fd38d'], ['Sunny', '#f2b84b'], ['Coral', '#ff8a7a'], ['Violet', '#a58bff']];
  function setAcc(hex) { D.documentElement.style.setProperty('--acc', hex); Drip.store.set('sw_acc', hex); Drip.beep('soft'); }
  function setAcs(v) { if (v === 'none') { drip.removeAttribute('data-acc'); Drip.store.del('sw_acs'); } else { drip.setAttribute('data-acc', v); Drip.store.set('sw_acs', v); } Drip.beep('soft'); }
  var saved = Drip.store.get('sw_acs'); if (saved === 'cap' || saved === 'shades') drip.setAttribute('data-acc', saved);
  VIEWS.style = function () {
    var cur = (Drip.store.get('sw_acc') || '#43c6d9').toLowerCase();
    body.appendChild(el('p', 'dp-prog', 'Accent colour for the whole page'));
    var row = el('div', 'dp-swatches');
    ACC.forEach(function (a) {
      var b = button('', 'dp-sw', function () { setAcc(a[1]); show('style'); });
      b.style.background = a[1]; b.setAttribute('aria-label', a[0]); b.setAttribute('aria-pressed', String(a[1] === cur)); row.appendChild(b);
    });
    body.appendChild(row);
    body.appendChild(el('p', 'dp-prog', "Drip's accessory"));
    var now = drip.getAttribute('data-acc') || 'none', chips = el('div', 'dp-chips');
    [['none', 'None'], ['cap', 'Grad cap'], ['shades', 'Shades']].forEach(function (a) {
      var c = button(a[1], 'dp-chip', function () { setAcs(a[0]); show('style'); }); c.setAttribute('aria-pressed', String(now === a[0])); chips.appendChild(c);
    });
    body.appendChild(chips);
  };

  /* ----- Tricks ----- */
  function trick() {
    var t = ['t-spin', 't-flip', 't-jump'][Math.floor(Math.random() * 3)];
    btn.classList.add(t); Drip.beep('good');
    Drip.say(['Ta-da!', 'Wheee!', 'Splash dance!'][Math.floor(Math.random() * 3)], { ms: 2500 });
    setTimeout(function () { btn.classList.remove(t); }, 1600);
  }

  /* ----- Unit converter ----- */
  VIEWS.convert = function () {
    var F = { kpa: 1, pa: 0.001, bar: 100, psi: 6.894757, m: 9.80665, atm: 101.325 }, NAMES = { kpa: 'kPa', pa: 'Pa', bar: 'bar', psi: 'psi', m: 'm of water', atm: 'atm' };
    body.appendChild(el('p', 'dp-prog', 'Type a pressure and pick its unit'));
    var row = el('div', 'dp-row'), inp = el('input'), sel = el('select');
    inp.type = 'number'; inp.value = '15'; inp.step = 'any'; inp.setAttribute('aria-label', 'Value');
    Object.keys(F).forEach(function (k) { var o = el('option', '', NAMES[k]); o.value = k; sel.appendChild(o); });
    sel.setAttribute('aria-label', 'Unit'); row.appendChild(inp); row.appendChild(sel); body.appendChild(row);
    var out = el('div', 'dp-out'); body.appendChild(out);
    function fmt(v) { return v === 0 ? '0' : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : +v.toPrecision(4) + ''; }
    function run() {
      var kpa = (parseFloat(inp.value) || 0) * F[sel.value];
      while (out.firstChild) out.removeChild(out.firstChild);
      Object.keys(F).forEach(function (k) { if (k === sel.value) return; var d = el('div', '', NAMES[k]); d.appendChild(el('b', '', fmt(kpa / F[k]))); out.appendChild(d); });
    }
    inp.addEventListener('input', run); sel.addEventListener('change', run); run();
    body.appendChild(el('p', 'dp-note', 'Metres of water use 9.80665 kPa per metre (about 9.8).'));
  };

  /* ----- 3-second challenge ----- */
  VIEWS.timing = function () {
    body.appendChild(el('p', 'dp-q', 'The Arduino waits exactly 3 seconds. Can you? Press Start, then press Stop when you think 3 seconds have passed. No peeking: the clock is hidden.'));
    var ball = el('div', 'dp-pulse'); ball.hidden = true; body.appendChild(ball);
    var res = el('div', 'dp-card', 'Best so far: ' + (Drip.store.get('sw_tbest') ? Drip.store.get('sw_tbest') + ' s off' : 'none yet')); res.setAttribute('aria-live', 'polite'); body.appendChild(res);
    var t0 = 0, run = false;
    var go2 = button('Start', 'dp-btn', function () {
      if (!run) { run = true; t0 = performance.now(); go2.textContent = 'Stop'; ball.hidden = false; res.textContent = 'Counting…'; }
      else {
        run = false; var el2 = (performance.now() - t0) / 1000, err = Math.abs(el2 - 3); go2.textContent = 'Try again'; ball.hidden = true;
        var best = parseFloat(Drip.store.get('sw_tbest')); if (isNaN(best) || err < best) { best = err; Drip.store.set('sw_tbest', err.toFixed(2)); }
        res.textContent = 'You stopped at ' + el2.toFixed(2) + ' s (' + err.toFixed(2) + ' s off). Best: ' + best.toFixed(2) + ' s off.'; pop(res);
        if (err <= 0.15) { Drip.earn('timing'); } else { Drip.beep('soft'); }
      }
    });
    body.appendChild(go2);
  };

  /* ----- Progress ----- */
  VIEWS.progress = function () {
    var p = Drip.progress(), got = Drip.earned().length, all = Drip.badges().length;
    function meter(label, a, b) {
      body.appendChild(el('p', 'dp-prog', label + ': ' + a + ' of ' + b));
      var bar = el('div', 'dp-bar'), f = el('i'); f.style.width = '0%'; bar.appendChild(f); body.appendChild(bar);
      setTimeout(function () { f.style.width = (a / b * 100) + '%'; }, 60);
    }
    meter('Sections visited', Math.min(p.secs.length, p.total), p.total);
    meter('Badges earned', got, all);
    var best = Drip.store.get('sw_best'), tb = Drip.store.get('sw_tbest');
    body.appendChild(el('p', 'dp-q', 'Quiz best: ' + (best ? best + ' / 5' : 'not played yet')));
    body.appendChild(el('p', 'dp-q', '3-second challenge best: ' + (tb ? tb + ' s off' : 'not tried yet')));
  };

  /* ----- Share ----- */
  function share() {
    var data = { title: D.title, text: 'Smart Water Network: a pipe leak detector built with pressure sensors and an Arduino.', url: location.href.split('#')[0] };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    var done = function () { Drip.say('Link copied! Send it to a friend.', { ms: 3500 }); shut(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data.url).then(done, function () { Drip.say('Copy this address from your browser bar.', { ms: 3500 }); });
    else Drip.say('Copy this address from your browser bar.', { ms: 3500 });
  }

  /* ----- Keyboard shortcut: D ----- */
  D.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'input' && tag !== 'textarea' && tag !== 'select') toggle();
  });

  window.DripHub = { toggle: toggle, open: open, close: shut };
})();
