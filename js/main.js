/* Roadster — interactive concept
 * GSAP 3.13 · ScrollTrigger · DrawSVG · SplitText · CustomEase
 */
(async () => {
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, SplitText, CustomEase);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  CustomEase.create('launch', 'M0,0 C0.5,0 0.2,1 1,1');
  CustomEase.create('settle', 'M0,0 C0.12,0.6 0.2,1.12 0.42,1.04 0.6,0.98 0.8,1 1,1');

  /* ---------------------------------------------------------------
   * Cars: one SVG template cloned into every slot
   * ------------------------------------------------------------- */
  const tpl = $('#car-tpl');
  $$('[data-car]').forEach(slot => slot.appendChild(tpl.content.cloneNode(true)));
  const carIn = slot => ({
    svg: $('.car', slot),
    body: $('.car-body', slot),
    spokes: $$('.spokes', slot),
    lines: $$('.ln', slot),
    fills: $$('.body, .glass', slot),
    roof: $('.roof', slot),
  });
  // spin each wheel around its hub, not its (asymmetric) bounding box
  const hub = (i, el) => (el.closest('.wheel-f') ? '302 318' : '908 318');
  const hero = carIn($('[data-car-hero]'));
  const launch = carIn($('[data-car-launch]'));
  const roofCar = carIn($('[data-car-roof]'));
  const config = carIn($('[data-car-config]'));

  /* ---------------------------------------------------------------
   * Paint: one hex drives four gradient stops via CSS variables
   * ------------------------------------------------------------- */
  const mix = (a, b, t) => gsap.utils.interpolate(a, b, t);
  function applyPaint(c) {
    root.style.setProperty('--paint', c);
    root.style.setProperty('--paint-hi', mix(c, '#ffffff', .32));
    root.style.setProperty('--paint-lo', mix(c, '#000000', .55));
    root.style.setProperty('--paint-deep', mix(c, '#000000', .8));
  }
  let currentPaint = '#c8101c';
  applyPaint(currentPaint);

  /* ---------------------------------------------------------------
   * Global scroll velocity → wind, nav speedo, marquee
   * ------------------------------------------------------------- */
  let scrollVel = 0;      // smoothed px/s
  let launchBoost = 0;    // set by the launch section
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => { scrollVel = self.getVelocity(); },
  });

  const speedEl = $('[data-scroll-mph]');
  let shownMph = 0;

  /* Wind: thin streaks whose speed follows scroll velocity */
  const canvas = $('.wind');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const streaks = [];
  function sizeCanvas() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * DPR;
    H = canvas.height = innerHeight * DPR;
  }
  function seedStreaks() {
    streaks.length = 0;
    const n = innerWidth < 700 ? 26 : 54;
    for (let i = 0; i < n; i++) {
      streaks.push({ x: Math.random() * W, y: Math.random() * H, len: 20 + Math.random() * 120, v: .4 + Math.random() * 1.2, a: .03 + Math.random() * .1 });
    }
  }
  sizeCanvas(); seedStreaks();
  addEventListener('resize', () => { sizeCanvas(); seedStreaks(); });

  let windSpeed = 1;
  gsap.ticker.add((time, dt) => {
    scrollVel *= .92;
    const abs = Math.min(4000, Math.abs(scrollVel));

    // nav speedometer
    const target = Math.min(999, abs / 22);
    shownMph += (target - shownMph) * .12;
    speedEl.textContent = String(Math.round(shownMph)).padStart(3, '0');

    if (reduce) return;
    const targetWind = Math.min(14, 1 + abs / 320 + launchBoost);
    windSpeed += (targetWind - windSpeed) * .08;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = DPR;
    const k = dt / 16.67;
    for (const s of streaks) {
      s.x -= s.v * windSpeed * 3 * DPR * k;
      const len = s.len * DPR * Math.min(6, .4 + windSpeed * .5);
      if (s.x + len < 0) { s.x = W + Math.random() * 200; s.y = Math.random() * H; }
      ctx.strokeStyle = `rgba(236,235,230,${Math.min(.3, s.a * (.2 + windSpeed * .2))})`;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + len, s.y); ctx.stroke();
    }
  });

  /* ---------------------------------------------------------------
   * Cursor
   * ------------------------------------------------------------- */
  if (finePointer && !reduce) {
    const cur = $('.cursor');
    const dot = $('.cursor-dot'), ring = $('.cursor-ring');
    const dx = gsap.quickTo(dot, 'x', { duration: .08 }), dy = gsap.quickTo(dot, 'y', { duration: .08 });
    const rx = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
    addEventListener('pointermove', e => { cur.classList.add('is-on'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('pointerover', e => cur.classList.toggle('is-hover', !!e.target.closest('a, button, .config-car')));
  }

  /* ---------------------------------------------------------------
   * Reduced motion: static, fully legible page
   * ------------------------------------------------------------- */
  if (reduce) {
    $('.loader').remove();
    $('[data-run-time]').textContent = '1.90';
    $('[data-run-mph]').textContent = '60';
    $$('.odo').forEach(el => { el.textContent = el.dataset.odo + (el.dataset.suffix || ''); });
    root.classList.add('reduce');
    initConfigurator();
    initCtaDistance();
    return;
  }

  /* ---------------------------------------------------------------
   * Intro: count 0 → 1.90 s in exactly 1.9 real seconds
   * ------------------------------------------------------------- */
  root.classList.add('is-loading');
  const heroLoose = $$('.sill, .roof, .car-shadow, .hub', $('[data-car-hero]'));
  gsap.set(hero.lines, { drawSVG: '0%' });
  gsap.set(hero.fills, { fillOpacity: 0 });
  gsap.set(heroLoose, { opacity: 0 });
  gsap.set('.hero-word', { opacity: 0 });
  gsap.set('.hero-meta > *, .hero-lede, .hero-stats li, .hero-scroll', { y: 24, opacity: 0 });
  gsap.set('.nav', { opacity: 0 });

  function heroIn() {
    // split after webfonts load so character boxes match the final metrics
    const chars = new SplitText('.hero-word', { type: 'chars', charsClass: 'char' }).chars;
    gsap.set('.hero-word', { opacity: 1 });
    const tl = gsap.timeline({ onComplete: () => root.classList.remove('is-loading') });
    tl.from(chars, { yPercent: 110, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: .05 })
      .to(hero.lines, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut', stagger: .04 }, .1)
      .to(hero.fills, { fillOpacity: 1, duration: 1.1, ease: 'power2.out' }, 1.25)
      .to(heroLoose, { opacity: 1, duration: .8 }, 1.4)
      .from(hero.spokes, { rotation: -540, svgOrigin: hub, duration: 2.2, ease: 'expo.out' }, .3)
      .from(hero.body, { y: -8, duration: 1.2, ease: 'settle' }, 1.6)
      .to('.nav', { opacity: 1, duration: .8 }, 1.2)
      .to('.hero-meta > *, .hero-lede, .hero-stats li, .hero-scroll', { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: .07 }, 1.3);
    return tl;
  }

  function startIntro() {
    const run0 = { t: 0 };
    const loaderTime = $('[data-loader-time]'), loaderMph = $('[data-loader-mph]');
    const intro = gsap.timeline();
    intro
      .to(run0, {
        t: 1.9, duration: 1.9, ease: 'none',
        onUpdate() {
          loaderTime.textContent = run0.t.toFixed(2);
          loaderMph.textContent = String(Math.round(run0.t / 1.9 * 60)).padStart(2, '0');
          launchBoost = run0.t * 4;
        },
      })
      .to('.loader-bar span', { scaleX: 1, duration: 1.9, ease: 'none' }, 0)
      .to('.loader-after', { opacity: 1, duration: .3 }, '+=.08')
      .add(() => { launchBoost = 0; })
      .to('.loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '+=.75')
      .add(heroIn(), '-=.55')
      .add(() => $('.loader').remove());
    $('.loader-skip').addEventListener('click', () => { launchBoost = 0; intro.progress(1); });
  }
  // wait for webfonts so every SplitText below measures real glyphs
  await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  startIntro();

  /* Hero: pointer parallax + scroll exit */
  const heroCar = $('.hero-car');
  gsap.set(heroCar, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  if (finePointer) {
    const px = gsap.quickTo(heroCar, 'x', { duration: 1.2, ease: 'power3' });
    const pr = gsap.quickTo(heroCar, 'rotation', { duration: 1.2, ease: 'power3' });
    const tx = gsap.quickTo('.hero-title', 'x', { duration: 1.6, ease: 'power3' });
    $('.hero').addEventListener('pointermove', e => {
      const n = e.clientX / innerWidth - .5;
      px(n * 50); pr(n * 1.4); tx(n * -40);
    });
  }
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to(heroCar, { x: () => innerWidth * .55, ease: 'power2.in' }, 0)
    .to(hero.spokes, { rotation: 900, svgOrigin: hub, ease: 'power2.in' }, 0)
    .to('.hero-title', { yPercent: -30, opacity: 0, ease: 'none' }, 0)
    .to('.hero-foot', { y: -60, opacity: 0, ease: 'none' }, 0);

  /* ---------------------------------------------------------------
   * Launch: scroll scrubs a 0 → 4.2 s run
   * ------------------------------------------------------------- */
  const runTime = $('[data-run-time]'), runMph = $('[data-run-mph]');
  const tlFill = $('.tl-fill');
  const marks = $$('.tl-mark');
  const trackLines = $('.track-lines');
  const launchCarEl = $('.launch-car');
  const flash = $('.launch-flash');
  const T_END = 4.2;

  // piecewise-linear speed through the two claimed points
  const mphAt = t => (t <= 1.9 ? 60 * t / 1.9 : 60 + 40 * (t - 1.9) / 2.3);
  // integral of the speed curve, in mph·s
  const distAt = t => (t <= 1.9 ? 30 * t * t / 1.9 : 57 + 60 * (t - 1.9) + 20 * (t - 1.9) ** 2 / 2.3);
  const D_END = distAt(T_END);

  const run = { t: 0 };
  let passed60 = false;
  function renderRun() {
    const t = run.t, mph = mphAt(t), d = distAt(t);
    runTime.textContent = t.toFixed(2);
    runMph.textContent = Math.round(mph);
    tlFill.style.transform = `scaleX(${t / T_END})`;
    marks[0].classList.toggle('is-hit', t >= 1.9);
    marks[1].classList.toggle('is-hit', t >= T_END - .001);

    const carW = launchCarEl.offsetWidth;
    const startX = innerWidth * .04;
    const x = startX + (d / D_END) * (innerWidth - startX + carW * .1);
    const launchPhase = Math.max(0, 1 - t / 1.2) * Math.min(1, t * 6); // squat right after launch
    gsap.set(launchCarEl, { x, skewX: -Math.min(8, mph / 10) });
    gsap.set(launch.body, { rotation: -1.6 * launchPhase, transformOrigin: '85% 80%' });
    gsap.set(launch.spokes, { rotation: d * 22, svgOrigin: hub });
    trackLines.style.backgroundPositionX = `${-d * 9}px`;
    launchBoost = mph / 9;

    if (t >= 1.9 && !passed60) {
      passed60 = true;
      gsap.fromTo(flash, { opacity: .55, scale: .8 }, { opacity: 0, scale: 1.25, duration: .9, ease: 'expo.out' });
    } else if (t < 1.9) passed60 = false;
  }
  renderRun();

  gsap.timeline({
    scrollTrigger: {
      trigger: '.launch', start: 'top top', end: '+=260%', pin: true, scrub: .7,
      onLeave: () => { launchBoost = 0; },
      onLeaveBack: () => { launchBoost = 0; },
    },
  }).to(run, { t: T_END, ease: 'none', onUpdate: renderRun });

  /* ---------------------------------------------------------------
   * Statement: words light up as you read
   * ------------------------------------------------------------- */
  const stmt = new SplitText('[data-scrub-words]', { type: 'words', wordsClass: 'word' });
  gsap.to(stmt.words, {
    opacity: 1, stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.statement-text', start: 'top 80%', end: 'bottom 55%', scrub: true },
  });

  /* Section titles: masked line reveals */
  $$('[data-split]').forEach(el => {
    const s = new SplitText(el, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  /* ---------------------------------------------------------------
   * Numbers: mechanical odometers
   * ------------------------------------------------------------- */
  $$('.odo').forEach(el => {
    const value = el.dataset.odo, suffix = el.dataset.suffix || '';
    el.setAttribute('aria-label', value + suffix);
    el.textContent = '';
    const strips = [];
    [...value].forEach(ch => {
      if (/\d/.test(ch)) {
        const col = document.createElement('span');
        col.className = 'odo-col';
        col.setAttribute('aria-hidden', 'true');
        const strip = document.createElement('span');
        strip.className = 'odo-strip';
        for (let i = 0; i < 20; i++) strip.insertAdjacentHTML('beforeend', `<span>${i % 10}</span>`);
        col.appendChild(strip); el.appendChild(col);
        strips.push({ strip, target: 10 + +ch });
      } else {
        el.insertAdjacentHTML('beforeend', `<span class="odo-static" aria-hidden="true">${ch}</span>`);
      }
    });
    if (suffix) el.insertAdjacentHTML('beforeend', `<span class="odo-static odo-suffix" aria-hidden="true">${suffix}</span>`);

    const tl = gsap.timeline({ paused: true });
    strips.forEach(({ strip, target }, i) => {
      tl.fromTo(strip, { yPercent: 0 }, { yPercent: -target * 5, duration: 1.6 + (strips.length - i) * .22, ease: 'expo.out' }, i * .06);
    });
    const statics = $$('.odo-static', el);
    if (statics.length) tl.from(statics, { opacity: 0, duration: .6 }, .4);
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => tl.play() });
  });
  gsap.from('.num p', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.num-grid', start: 'top 80%' } });

  /* ---------------------------------------------------------------
   * Anatomy: horizontal track
   * ------------------------------------------------------------- */
  const track = $('.anatomy-track');
  const travel = () => track.scrollWidth - innerWidth;
  const hScroll = gsap.to(track, {
    x: () => -travel(), ease: 'none',
    scrollTrigger: { trigger: '.anatomy', start: 'top top', end: () => '+=' + travel(), pin: true, scrub: .8, invalidateOnRefresh: true },
  });

  // panel i: motors
  const motorsPanel = $('.panel-motors');
  gsap.timeline({ scrollTrigger: { trigger: motorsPanel, containerAnimation: hScroll, start: 'left 65%' } })
    .from($('.plan-body', motorsPanel), { drawSVG: '50% 50%', duration: 1.4, ease: 'power3.inOut' })
    .from($$('.plan-wheel', motorsPanel), { scaleY: 0, transformOrigin: '50% 50%', duration: .6, stagger: .06, ease: 'back.out(2)' }, '-=.6')
    .from($$('.motor', motorsPanel), { scale: 0, transformOrigin: '50% 50%', duration: .8, stagger: .12, ease: 'back.out(2.4)' }, '-=.3')
    .from($$('.plan-flow', motorsPanel), { opacity: 0, duration: .4 }, '-=.2');
  gsap.to('.plan-flow', { strokeDashoffset: -32, duration: .5, ease: 'none', repeat: -1 });
  gsap.to('.motor circle', { attr: { 'stroke-width': 6 }, duration: .6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: .2 });

  // panel ii: roof lifts off, a dashed ghost marks where it was, then it drops into the trunk
  const ghost = roofCar.roof.cloneNode();
  ghost.setAttribute('class', 'roof-ghost');
  roofCar.roof.before(ghost);
  gsap.set(ghost, { drawSVG: '0%' });
  gsap.timeline({ scrollTrigger: { trigger: '.panel-roof', containerAnimation: hScroll, start: 'left 60%', end: 'right 75%', scrub: true } })
    .to(roofCar.roof, { y: -130, x: 40, rotation: -8, transformOrigin: '50% 100%', ease: 'power2.out', duration: 1 })
    .to(ghost, { drawSVG: '100%', ease: 'none', duration: .6 }, .2)
    .to(roofCar.roof, { y: 28, x: 300, rotation: 4, scale: .8, ease: 'power2.inOut', duration: 1 })
    .to(roofCar.roof, { opacity: 0, duration: .25 }, '-=.25');

  // panel iii: seats pop in
  gsap.from('.panel-seats .seat', {
    scale: 0, transformOrigin: '50% 50%', duration: .7, ease: 'back.out(2.2)', stagger: .12,
    scrollTrigger: { trigger: '.panel-seats', containerAnimation: hScroll, start: 'left 55%' },
  });
  gsap.from('.panel-seats .plan-body', {
    drawSVG: '0%', duration: 1.4, ease: 'power3.inOut',
    scrollTrigger: { trigger: '.panel-seats', containerAnimation: hScroll, start: 'left 75%' },
  });

  // panel copy
  $$('.panel:not(.panel-intro) .panel-copy').forEach(copy => {
    gsap.from(copy.children, {
      y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08,
      scrollTrigger: { trigger: copy, containerAnimation: hScroll, start: 'left 80%' },
    });
  });

  initConfigurator();
  initCtaDistance();

  /* ---------------------------------------------------------------
   * CTA: velocity-reactive marquee + magnetic button
   * ------------------------------------------------------------- */
  const marquee = gsap.to('.marquee-inner', { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });
  let mDir = 1;
  gsap.ticker.add(() => {
    if (Math.abs(scrollVel) > 30) mDir = scrollVel > 0 ? 1 : -1;
    const ts = mDir * (1 + Math.min(14, Math.abs(scrollVel) / 120));
    marquee.timeScale(gsap.utils.interpolate(marquee.timeScale(), ts, .1));
  });

  const magnet = $('.magnet');
  if (finePointer) {
    const mx = gsap.quickTo(magnet, 'x', { duration: .5, ease: 'power3' });
    const my = gsap.quickTo(magnet, 'y', { duration: .5, ease: 'power3' });
    const lx = gsap.quickTo($('span', magnet), 'x', { duration: .5, ease: 'power3' });
    const ly = gsap.quickTo($('span', magnet), 'y', { duration: .5, ease: 'power3' });
    addEventListener('pointermove', e => {
      const r = magnet.getBoundingClientRect();
      const cx = r.left + r.width / 2 - gsap.getProperty(magnet, 'x');
      const cy = r.top + r.height / 2 - gsap.getProperty(magnet, 'y');
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const near = Math.hypot(dx, dy) < r.width * 1.1;
      mx(near ? dx * .35 : 0); my(near ? dy * .35 : 0);
      lx(near ? dx * .15 : 0); ly(near ? dy * .15 : 0);
    });
  }
  magnet.addEventListener('click', e => {
    e.preventDefault();
    gsap.timeline()
      .to(magnet, { scale: .9, duration: .12 })
      .to(magnet, { scale: 1, duration: .8, ease: 'elastic.out(1, .4)' });
    $('span', magnet).textContent = 'Concept only';
  });

  addEventListener('load', () => ScrollTrigger.refresh());

  /* ---------------------------------------------------------------
   * Configurator: paint, edition, drag-to-roll
   * ------------------------------------------------------------- */
  function initConfigurator() {
    const nameEl = $('[data-paint-name]');
    const swatches = $$('.swatch');
    const carWrap = $('.config-car');
    let nameSplit = reduce ? null : new SplitText(nameEl, { type: 'chars', charsClass: 'char' });

    swatches.forEach(btn => btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      swatches.forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-checked', b === btn); });
      const from = currentPaint, to = btn.dataset.paint;
      currentPaint = to;

      if (reduce) { applyPaint(to); nameEl.textContent = btn.dataset.name; return; }

      const p = { t: 0 };
      gsap.to(p, { t: 1, duration: .9, ease: 'power2.inOut', onUpdate: () => applyPaint(mix(from, to, p.t)) });

      // suspension dip + wheel nudge, like the car settled on fresh paint
      gsap.timeline()
        .to(config.body, { y: 5, duration: .18, ease: 'power2.in' })
        .to(config.body, { y: 0, duration: 1.1, ease: 'elastic.out(1.1, .35)' });

      // name swap
      gsap.to(nameSplit.chars, {
        yPercent: -110, duration: .45, ease: 'power3.in', stagger: .02,
        onComplete: () => {
          nameSplit.revert();
          nameEl.textContent = btn.dataset.name;
          nameSplit = new SplitText(nameEl, { type: 'chars', charsClass: 'char' });
          gsap.from(nameSplit.chars, { yPercent: 110, duration: .8, ease: 'expo.out', stagger: .025 });
        },
      });
    }));

    // edition → price
    const priceEl = $('[data-price-out]');
    const price = { v: 200000 };
    $$('.edition-btn').forEach(btn => btn.addEventListener('click', () => {
      $$('.edition-btn').forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-checked', b === btn); });
      const to = +btn.dataset.price;
      if (reduce) { price.v = to; priceEl.textContent = to.toLocaleString('en-US'); return; }
      gsap.to(price, {
        v: to, duration: 1.1, ease: 'expo.out', snap: { v: 100 },
        onUpdate: () => { priceEl.textContent = Math.round(price.v).toLocaleString('en-US'); },
      });
    }));

    if (reduce) return;

    // reveal
    gsap.from(config.svg, { xPercent: -60, opacity: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.config', start: 'top 55%' } });
    gsap.from(config.spokes, { rotation: -720, svgOrigin: hub, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.config', start: 'top 55%' } });

    // drag to roll: wheels turn by distance travelled, springs back on release
    carWrap.style.touchAction = 'pan-y';
    carWrap.style.cursor = 'grab';
    let startX = 0, baseX = 0, dragging = false;
    const WHEEL_R = 74 * (carWrap.offsetWidth / 1200 || 1);
    const roll = x => {
      gsap.set(config.svg, { x });
      gsap.set(config.spokes, { rotation: x / WHEEL_R * 57.3, svgOrigin: hub });
      gsap.set(config.body, { rotation: gsap.utils.clamp(-1.5, 1.5, (x - baseX) * -.01), transformOrigin: '50% 90%' });
    };
    carWrap.addEventListener('pointerdown', e => {
      dragging = true; startX = e.clientX; baseX = gsap.getProperty(config.svg, 'x');
      gsap.killTweensOf([config.svg, config.spokes, config.body]);
      carWrap.setPointerCapture(e.pointerId); carWrap.style.cursor = 'grabbing';
    });
    carWrap.addEventListener('pointermove', e => {
      if (!dragging) return;
      const lim = innerWidth * .3;
      const raw = baseX + (e.clientX - startX);
      roll(gsap.utils.clamp(-lim, lim, raw));
    });
    const release = () => {
      if (!dragging) return;
      dragging = false; carWrap.style.cursor = 'grab';
      const p = { x: gsap.getProperty(config.svg, 'x') };
      gsap.to(p, { x: 0, duration: 1.6, ease: 'elastic.out(1, .5)', onUpdate: () => roll(p.x) });
      gsap.to(config.body, { rotation: 0, duration: 1.2, ease: 'elastic.out(1, .3)' });
    };
    carWrap.addEventListener('pointerup', release);
    carWrap.addEventListener('pointercancel', release);
  }

  /* "In the time you've spent here…" */
  function initCtaDistance() {
    const el = $('[data-cta-distance]');
    const t0 = performance.now();
    const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      el.textContent = fmt.format(250 * s / 3600) + ' miles';
    }, 100);
  }
})();
