/* EJ Portfolio script: small modules, one init. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } }
  };

  /* ---------- Sound (Web Audio, generated, no files) ---------- */
  const Sound = (() => {
    let ctx, last = 0, active = 0;
    const tones = {
      click:   [[520, 640, .07, .03]],
      nav:     [[440, 520, .08, .03]],
      theme:   [[392, 392, .09, .03], [587, 587, .11, .03, .07]],
      success: [[523, 523, .1, .035], [659, 659, .1, .035, .08], [784, 784, .16, .035, .16]],
      apple:   [[660, 990, .09, .04], [880, 1320, .12, .035, .07]],
      over:    [[330, 220, .22, .035]]
    };
    function play(kind = 'click') {
      try {
        const now = performance.now();
        if (now - last < 55 || active >= 4) return; // avoid pile-ups
        last = now;
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        (tones[kind] || tones.click).forEach(([f1, f2, dur, vol, delay = 0]) => {
          const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + delay;
          o.type = 'sine';
          o.frequency.setValueAtTime(f1, t);
          o.frequency.exponentialRampToValueAtTime(f2, t + dur * .8);
          g.gain.setValueAtTime(.0001, t);
          g.gain.exponentialRampToValueAtTime(vol, t + .01);
          g.gain.exponentialRampToValueAtTime(.0001, t + dur);
          o.connect(g); g.connect(ctx.destination);
          active++; o.onended = () => { active--; };
          o.start(t); o.stop(t + dur + .02);
        });
      } catch (e) { /* sound is optional */ }
    }
    // One delegated listener for all normal buttons and links.
    document.addEventListener('click', e => {
      const el = e.target.closest('a[href], button, [data-close-modal]');
      if (!el || el.disabled || el.hasAttribute('data-theme-choice') || el.id === 'copy-email' || el.id === 'snake-start' || el.id === 'snake-restart') return;
      play(el.matches('.nav-link, .brand, .back-top, a[href^="#"]') ? 'nav' : 'click');
    }, true);
    return { play };
  })();

  /* ---------- Theme ---------- */
  const Theme = (() => {
    const names = ['midnight', 'aurora', 'terminal', 'paper'];
    const metaColors = { midnight: '#071a36', aurora: '#1a0b3b', terminal: '#050a07', paper: '#f6efe2' };
    const listeners = [];
    function apply(name, animate) {
      if (!names.includes(name)) name = 'midnight';
      const root = document.documentElement;
      if (animate && !reduceMotion) { root.classList.add('theme-fade'); setTimeout(() => root.classList.remove('theme-fade'), 650); }
      root.dataset.theme = name;
      $$('.theme-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === name)));
      const meta = $('meta[name="theme-color"]'); if (meta) meta.content = metaColors[name];
      listeners.forEach(fn => fn(name));
    }
    $$('.theme-btn').forEach(b => b.addEventListener('click', () => {
      if (document.documentElement.dataset.theme === b.dataset.themeChoice) return;
      apply(b.dataset.themeChoice, true); store.set('ej-portfolio-theme', b.dataset.themeChoice); Sound.play('theme');
    }));
    apply(store.get('ej-portfolio-theme', 'midnight'), false);
    return { onChange: fn => listeners.push(fn) };
  })();

  /* ---------- Navigation, scroll progress, back-to-top ---------- */
  (() => {
    const toggle = $('.menu-toggle'), links = $('#nav-links');
    const setMenu = open => { toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu'); links.classList.toggle('is-open', open); };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    $$('.nav-link').forEach(l => l.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

    const navItems = $$('.nav-link');
    const obs = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      navItems.forEach(l => { const on = l.getAttribute('href') === '#' + en.target.id; l.classList.toggle('active', on); on ? l.setAttribute('aria-current', 'location') : l.removeAttribute('aria-current'); });
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(s => obs.observe(s));

    const bar = $('#scroll-progress'), top = $('#back-top'), tl = $('.timeline');
    let ticking = false;
    function onScroll() {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      top.classList.toggle('is-shown', scrollY > 600);
      if (tl) { const r = tl.getBoundingClientRect(); tl.style.setProperty('--tl', Math.min(100, Math.max(0, ((innerHeight * .6 - r.top) / r.height) * 100)) + '%'); }
      ticking = false;
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  })();

  /* ---------- Reveal on scroll ---------- */
  (() => {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) { items.forEach(i => i.classList.add('is-visible')); return; }
    const o = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-visible'); o.unobserve(en.target); } }), { threshold: .12 });
    items.forEach(i => o.observe(i));
  })();

  /* ---------- Hero text: typed nickname + rotating roles ---------- */
  (() => {
    const nameEl = $('#typed-name'), roleEl = $('#hero-role');
    if (reduceMotion) return;
    const nick = 'EJ'; let i = 0; nameEl.textContent = '';
    const type = () => { nameEl.textContent = nick.slice(0, ++i); if (i < nick.length) setTimeout(type, 280); };
    setTimeout(type, 500);
    const roles = ['Learning to Code', 'Future IT Professional', 'Exploring Technology']; let r = 0;
    setInterval(() => {
      roleEl.style.transition = 'opacity .25s'; roleEl.style.opacity = 0;
      setTimeout(() => { r = (r + 1) % roles.length; roleEl.textContent = roles[r]; roleEl.style.opacity = 1; }, 260);
    }, 2800);
  })();

  /* ---------- Interactive background, cursor, ripples ---------- */
  (() => {
    const canvas = $('#bg-canvas'), ctx = canvas.getContext('2d');
    const shapes = $$('#bg-shapes i'), glow = $('#cursor-glow'), ring = $('#cursor-ring'), dot = $('#cursor-dot');
    if (reduceMotion) { canvas.style.display = 'none'; return; }
    const mobile = !finePointer || innerWidth < 700;
    const COUNT = mobile ? 26 : 70, TRAIL_MAX = mobile ? 0 : 26;
    let W, H, dpr, colors = { a: '#3b9dff', b: '#22d3ee' };
    const m = { x: -999, y: -999, rx: -999, ry: -999, down: false, dx: 0, dy: 0, on: false };
    const drag = { x: 0, y: 0, tx: 0, ty: 0 };
    let parts = [], trail = [], ripples = [], raf = 0;

    const readColors = () => { const s = getComputedStyle(document.documentElement); colors = { a: s.getPropertyValue('--accent').trim(), b: s.getPropertyValue('--accent-2').trim() }; };
    Theme.onChange(() => requestAnimationFrame(readColors));
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() { parts = Array.from({ length: COUNT }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.8 + .8, c: Math.random() < .5 ? 'a' : 'b' })); }
    resize(); seed(); readColors();
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); seed(); }, 150); });

    function addRipple(x, y) { ripples.push({ x, y, r: 6, a: .7 }); if (ripples.length > 8) ripples.shift(); }
    addEventListener('pointermove', e => {
      m.dx = e.clientX - m.x; m.dy = e.clientY - m.y; m.x = e.clientX; m.y = e.clientY;
      if (!m.on) { m.on = true; m.rx = m.x; m.ry = m.y; if (finePointer) document.body.classList.add('cursor-on'); }
      if (m.down) { drag.tx = Math.max(-80, Math.min(80, drag.tx + m.dx * .6)); drag.ty = Math.max(-80, Math.min(80, drag.ty + m.dy * .6)); }
      if (TRAIL_MAX && e.pointerType !== 'touch') { trail.push({ x: m.x, y: m.y, life: 1 }); if (trail.length > TRAIL_MAX) trail.shift(); }
      document.body.classList.toggle('cursor-hover', !!e.target.closest('a, button, select, input, [role="button"]'));
    }, { passive: true });
    addEventListener('pointerdown', e => {
      m.down = true; m.x = e.clientX; m.y = e.clientY; m.on = true; document.body.classList.add('cursor-down'); addRipple(e.clientX, e.clientY);
      if (e.pointerType === 'touch') for (let i = 0; i < 4; i++) parts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3, r: 1.5, c: 'b', burst: 60 });
    }, { passive: true });
    const up = () => { m.down = false; document.body.classList.remove('cursor-down'); };
    addEventListener('pointerup', up, { passive: true }); addEventListener('pointercancel', up, { passive: true });
    document.addEventListener('pointerleave', () => { m.on = false; document.body.classList.remove('cursor-on'); });
    document.addEventListener('pointerenter', () => { if (finePointer && m.x > 0) document.body.classList.add('cursor-on'); });

    function frame() {
      ctx.clearRect(0, 0, W, H);
      // drag offset eases back to rest when released
      if (!m.down) { drag.tx *= .92; drag.ty *= .92; }
      drag.x += (drag.tx - drag.x) * .08; drag.y += (drag.ty - drag.y) * .08;
      const px = (m.x - W / 2) / W, py = (m.y - H / 2) / H;
      shapes.forEach(s => { const d = +s.dataset.depth; s.style.transform = `translate3d(${px * 60 * d + drag.x * d}px,${py * 60 * d + drag.y * d}px,0)`; });
      // cursor follower
      m.rx += (m.x - m.rx) * .18; m.ry += (m.y - m.ry) * .18;
      if (finePointer) {
        dot.style.transform = `translate3d(${m.x}px,${m.y}px,0)`;
        ring.style.transform = `translate3d(${m.rx}px,${m.ry}px,0)`;
        glow.style.transform = `translate3d(${m.rx}px,${m.ry}px,0)`;
      }
      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
        if (m.on && d2 < 14400 && d2 > 1) { const d = Math.sqrt(d2), f = (120 - d) / 120 * .9; p.vx += dx / d * f; p.vy += dy / d * f; }
        if (m.down) { p.vx += m.dx * .004; p.vy += m.dy * .004; }
        p.vx *= .96; p.vy *= .96; p.vx += (Math.random() - .5) * .02; p.vy += (Math.random() - .5) * .02;
        p.x += p.vx; p.y += p.vy;
        if (p.burst && --p.burst <= 0) { parts.splice(i, 1); continue; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
        ctx.globalAlpha = p.burst ? p.burst / 60 * .8 : .55; ctx.fillStyle = colors[p.c];
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      m.dx *= .8; m.dy *= .8;
      // smooth fading pointer trail
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i]; t.life -= .045;
        if (t.life <= 0) { trail.splice(i, 1); continue; }
        ctx.globalAlpha = t.life * .5; ctx.fillStyle = colors.b;
        ctx.beginPath(); ctx.arc(t.x, t.y, 1 + t.life * 3, 0, 6.283); ctx.fill();
      }
      // click ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]; r.r += 3.2; r.a -= .018;
        if (r.a <= 0) { ripples.splice(i, 1); continue; }
        ctx.globalAlpha = r.a; ctx.strokeStyle = colors.b; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();

    // Tilt on hero photo + project cards (desktop only)
    if (finePointer) {
      const tilt = (el, max) => {
        el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `rotateY(${x * max}deg) rotateX(${-y * max}deg)`; });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      };
      tilt($('#photo-frame'), 14); $$('.tilt').forEach(c => tilt(c, 6));
    }
  })();

  /* ---------- Certificates modal ---------- */
  (() => {
    const modal = $('#certificate-modal'), title = $('#modal-title'), detail = $('#modal-detail'), preview = $('#modal-preview');
    let lastFocus = null;
    const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); lastFocus && lastFocus.focus(); };
    $$('.cert-card').forEach(card => card.addEventListener('click', () => {
      lastFocus = card; title.textContent = card.dataset.title; detail.textContent = card.dataset.detail;
      const img = document.createElement('img'); img.src = card.dataset.image; img.alt = card.dataset.title;
      preview.replaceChildren(img);
      modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open');
      $('.modal-close', modal).focus();
    }));
    $$('[data-close-modal]', modal).forEach(b => b.addEventListener('click', close));
    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { e.preventDefault(); $('.modal-close', modal).focus(); }
    });
  })();

  /* ---------- Project filters ---------- */
  (() => {
    const btns = $$('.filter'), cards = $$('.project-card');
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      cards.forEach(c => { c.hidden = !(b.dataset.filter === 'all' || c.dataset.category === b.dataset.filter); });
    }));
  })();

  /* ---------- Copy email ---------- */
  (() => {
    const btn = $('#copy-email'), status = $('#copy-status');
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email; let ok = false;
      try { await navigator.clipboard.writeText(email); ok = true; } catch (e) {
        const t = document.createElement('textarea'); t.value = email; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; } t.remove();
      }
      status.textContent = ok ? 'Email copied to clipboard.' : 'Could not copy. Please copy it manually: ' + email;
      if (ok) Sound.play('success'); else Sound.play('click');
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
  })();

  /* ---------- Missing image fallback ---------- */
  $$('img').forEach(img => {
    const mark = () => img.classList.add('image-unavailable');
    img.addEventListener('error', mark, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) mark();
  });

  /* ---------- Snake & Apple ---------- */
  (() => {
    const canvas = $('#snake-canvas'), ctx = canvas.getContext('2d');
    const scoreEl = $('#snake-score'), bestEl = $('#snake-best'), overlay = $('#snake-overlay'), msg = $('#snake-message'), hint = $('#snake-hint');
    const startBtn = $('#snake-start'), restartBtn = $('#snake-restart');
    const cell = 20, cols = 16, rows = 12, SPEED = 130;
    let snake, apple, dir, nextDir, score, timer = null, running = false, over = false;
    let best = Number(store.get('ej-snake-best', 0)) || 0; bestEl.textContent = best;

    const placeApple = () => { do { apple = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }; } while (snake.some(p => p.x === apple.x && p.y === apple.y)); };
    function draw() {
      ctx.fillStyle = '#06101f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(150,190,235,.08)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= cols; x++) { ctx.moveTo(x * cell + .5, 0); ctx.lineTo(x * cell + .5, canvas.height); }
      for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * cell + .5); ctx.lineTo(canvas.width, y * cell + .5); }
      ctx.stroke();
      ctx.fillStyle = '#ff4d62'; ctx.beginPath(); ctx.arc(apple.x * cell + 10, apple.y * cell + 11, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#5be08a'; ctx.fillRect(apple.x * cell + 9, apple.y * cell + 1, 2, 4);
      snake.forEach((p, i) => { ctx.fillStyle = i === 0 ? '#d6ffe6' : '#43c97e'; ctx.beginPath(); ctx.roundRect(p.x * cell + 1, p.y * cell + 1, cell - 2, cell - 2, 5); ctx.fill(); });
    }
    function reset() {
      clearInterval(timer); timer = null; score = 0; scoreEl.textContent = 0; running = false; over = false;
      snake = [{ x: 7, y: 6 }, { x: 6, y: 6 }, { x: 5, y: 6 }]; dir = { x: 1, y: 0 }; nextDir = dir; placeApple(); draw();
      overlay.classList.remove('is-hidden'); msg.textContent = 'Ready?'; hint.textContent = 'Press Start or any arrow key'; startBtn.textContent = 'Start';
    }
    function end() {
      clearInterval(timer); timer = null; running = false; over = true; Sound.play('over');
      overlay.classList.remove('is-hidden'); msg.textContent = 'Game over'; hint.textContent = `You scored ${score}${score && score === best ? ' (new best!)' : ''}. Press Restart.`; startBtn.textContent = 'Play again';
    }
    function tick() {
      dir = nextDir; const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= cols || h.y >= rows || snake.some(p => p.x === h.x && p.y === h.y)) return end();
      snake.unshift(h);
      if (h.x === apple.x && h.y === apple.y) {
        score++; scoreEl.textContent = score; Sound.play('apple');
        if (score > best) { best = score; bestEl.textContent = best; store.set('ej-snake-best', best); }
        placeApple();
      } else snake.pop();
      draw();
    }
    function start() { if (running) return; if (over) reset(); overlay.classList.add('is-hidden'); running = true; startBtn.textContent = 'Running'; timer = setInterval(tick, SPEED); }
    function turn(name) {
      const d = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[name];
      if (!d || (d.x === -dir.x && d.y === -dir.y)) return;
      if (over) reset(); nextDir = d; if (!running) start();
    }
    startBtn.addEventListener('click', () => { Sound.play('click'); start(); });
    restartBtn.addEventListener('click', () => { Sound.play('click'); reset(); start(); });
    $$('[data-dir]').forEach(b => b.addEventListener('click', () => turn(b.dataset.dir)));
    const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    document.addEventListener('keydown', e => {
      if (!keys[e.key] || e.ctrlKey || e.metaKey || e.altKey) return;
      const r = $('#mini-game').getBoundingClientRect();
      if (r.top < innerHeight * .8 && r.bottom > innerHeight * .2 && !e.target.closest('input, textarea, select')) { e.preventDefault(); turn(keys[e.key]); }
    });
    reset();
  })();

  /* ---------- Footer: year + live clock ---------- */
  (() => {
    $('#year').textContent = new Date().getFullYear();
    const c = $('#footer-clock');
    const tick = () => { c.textContent = '· Local time ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    tick(); setInterval(tick, 1000 * 20);
  })();
})();
