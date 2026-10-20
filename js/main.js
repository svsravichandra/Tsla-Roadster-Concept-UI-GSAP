/* Roadster — interactive concept
 * GSAP 3.13 · ScrollTrigger · MotionPath · DrawSVG · SplitText · CustomEase
 * v2: the October 15, 2026 reveal — cold-gas thrusters and a vacuum underbody
 */
(async () => {
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, SplitText, CustomEase, MotionPathPlugin);

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
  // the stunt car lives inside a larger SVG scene, so it takes the artwork without its own <svg>
  $('.rider-art').appendChild(tpl.content.querySelector('.car-art').cloneNode(true));
  const carIn = slot => ({
    svg: $('.car', slot) || slot,
    body: $('.car-body', slot),
    spokes: $$('.spokes', slot),
    lines: $$('.ln', slot),
    fills: $$('.body, .glass', slot),
    moving: $$('.car-body, .wheel, .plumes, .suction', slot),
    plumes: {
      rear: $$('.plume-rear', slot),
      down: $$('.plume-down', slot),
      front: $$('.plume-front', slot),
      all: $$('.plume', slot),
    },
    suction: $$('.suction path', slot),
  });
  // spin each wheel around its hub, not its (asymmetric) bounding box
  const hub = (i, el) => (el.closest('.wheel-f') ? '908 318' : '302 318');
  // plumes grow out of their nozzle: rear ones (car tail is on the left) from their right edge, downward ones from the top
  const plumeOrigin = (i, el) => (el.classList.contains('plume-rear') ? '100% 50%' : el.classList.contains('plume-front') ? '0% 50%' : '50% 0%');
  const hero = carIn($('[data-car-hero]'));
  const launch = carIn($('[data-car-launch]'));
  const ghostCar = carIn($('[data-car-ghost]'));
  const stunt = carIn($('.rider'));
  const config = carIn($('[data-car-config]'));
  $('.rider').classList.add('trim-rocket');

  // one short burst of cold gas
  const burst = (els, dur = .5) => gsap.timeline()
    .fromTo(els, { opacity: 0, scale: .2, transformOrigin: plumeOrigin }, { opacity: 1, scale: 1, duration: dur * .3, ease: 'power3.out', stagger: .03 })
    .to(els, { opacity: 0, scale: 1.4, duration: dur * .7, ease: 'power1.in' });

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
    $('[data-run-time]').textContent = '0.81';
    $('[data-run-mph]').textContent = '60';
    $('[data-ghost-mph]').textContent = '26';
    $('[data-lead]').textContent = '+20';
    gsap.set('.launch-verdict', { opacity: 1, position: 'relative', left: 0, top: 0, xPercent: 0, yPercent: 0, transform: 'none' });
    $$('.odo').forEach(el => { el.textContent = el.dataset.odo + (el.dataset.suffix || ''); });
    $$('.stunt-steps li').forEach(li => li.classList.add('is-on'));
    gsap.set('.rider', { x: 260, y: 760, scaleX: -1 });
    root.classList.add('reduce');
    buildDecor();
    initConfigurator();
    initCtaDistance();
    return;
  }

  /* ---------------------------------------------------------------
   * Intro: count 0 → 0.81 s in exactly 0.81 real seconds
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
      // a small hop on cold gas once the paint is on
      .add(burst(hero.plumes.down, .9), 2.9)
      .to(hero.moving, { y: -26, duration: .35, ease: 'power2.out' }, 2.9)
      .to(hero.moving, { y: 0, duration: .9, ease: 'settle' }, 3.25)
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
        t: .81, duration: .81, ease: 'none',
        onUpdate() {
          loaderTime.textContent = run0.t.toFixed(2);
          loaderMph.textContent = String(Math.round(run0.t / .81 * 60)).padStart(2, '0');
          launchBoost = run0.t * 10;
        },
      })
      .to('.loader-bar span', { scaleX: 1, duration: .81, ease: 'none' }, 0)
      .to('.loader-after', { opacity: 1, duration: .3 }, '+=.08')
      .add(() => { launchBoost = 0; })
      .to('.loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '+=1.3')
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
   * Launch: scroll scrubs 0 → 1.9 s. The red car (0–60 in 0.81 s, as
   * shown at the reveal) races the dashed 2017 promise (1.9 s).
   * ------------------------------------------------------------- */
  const runTime = $('[data-run-time]'), runMph = $('[data-run-mph]'), ghostMph = $('[data-ghost-mph]');
  const tlFill = $('.tl-fill');
  const marks = $$('.tl-mark');
  const trackLines = $('.track-lines');
  const carEl = $('.launch-car:not(.launch-ghost)'), ghostEl = $('.launch-ghost');
  const flash = $('.launch-flash');
  const leadEl = $('[data-lead]'), verdict = $('.launch-verdict');
  gsap.set(verdict, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  const T_END = 1.9, T60 = .81;

  // constant acceleration to 60, then the new car keeps at least 60 while it leaves the frame.
  // Speeds above 60 were not published, so the readout holds at 60.
  const mphNew = t => Math.min(60, 60 * t / T60);
  const distNew = t => (t <= T60 ? 30 * t * t / T60 : 30 * T60 + 60 * (t - T60));
  const mphOld = t => 60 * t / 1.9;
  const distOld = t => 30 * t * t / 1.9;
  const D_REF = distOld(T_END); // the ghost ends near the right edge

  const run = { t: 0 };
  let passed60 = false;
  function renderRun() {
    const t = run.t;
    const mph = mphNew(t), d = distNew(t), dg = distOld(t);
    runTime.textContent = t.toFixed(2);
    runMph.textContent = Math.round(mph);
    ghostMph.textContent = Math.round(mphOld(t));
    tlFill.style.transform = `scaleX(${t / T_END})`;
    marks[0].classList.toggle('is-hit', t >= T60);
    marks[1].classList.toggle('is-hit', t >= T_END - .001);

    const span = innerWidth * .78, startX = innerWidth * .03;
    gsap.set(carEl, { x: startX + d / D_REF * span, skewX: -Math.min(8, mph / 8) });
    gsap.set(ghostEl, { x: startX + dg / D_REF * span });
    const squat = Math.max(0, 1 - t / .6) * Math.min(1, t * 10);
    gsap.set(launch.body, { rotation: -1.8 * squat, transformOrigin: '15% 80%' });
    gsap.set(launch.spokes, { rotation: d * 50, svgOrigin: hub });
    gsap.set(ghostCar.spokes, { rotation: dg * 50, svgOrigin: hub });
    // rear thrusters fire through the launch, flickering like venting gas
    const firing = t > .01 && t < T60 + .05;
    gsap.set(launch.plumes.rear, { opacity: firing ? .55 + Math.random() * .45 : 0, scaleX: firing ? .7 + Math.random() * .5 : .2, transformOrigin: '100% 50%' });
    trackLines.style.backgroundPositionX = `${-d * 24}px`;
    // the 2026 car's lead over the 2017 promise; distances are in mph·s, and 1 mph·s = 1.4667 ft
    leadEl.textContent = '+' + Math.round((d - dg) * 1.4667);
    // the verdict lands as the 2017 car finally reaches 60
    const v = gsap.utils.clamp(0, 1, (t - 1.62) / .25);
    gsap.set(verdict, { opacity: v, y: (1 - v) * 24 });
    gsap.set('.launch-readouts', { opacity: 1 - v * .75 });
    launchBoost = mph / 7;

    if (t >= T60 && !passed60) {
      passed60 = true;
      gsap.fromTo(flash, { opacity: .55, scale: .8 }, { opacity: 0, scale: 1.25, duration: .9, ease: 'expo.out' });
    } else if (t < T60) passed60 = false;
  }
  renderRun();

  gsap.timeline({
    scrollTrigger: {
      trigger: '.launch', start: 'top top', end: '+=240%', pin: true, scrub: .7,
      onLeave: () => { launchBoost = 0; renderRun(); },
      onLeaveBack: () => { launchBoost = 0; },
    },
  }).to(run, { t: T_END, ease: 'none', onUpdate: renderRun });

  /* ---------------------------------------------------------------
   * Stunt: the reveal sequence. Climb → inverted → release → roll → land.
   * The rider's origin is the tyre contact point, so the motion path is
   * literally the surface the wheels touch.
   * ------------------------------------------------------------- */
  buildDecor();
  const rider = $('.rider');
  const steps = $$('.stunt-steps li');
  gsap.set(rider, { svgOrigin: '0 0' });
  gsap.set(stunt.suction, { opacity: 0 });
  // phones: crop the scene to the ramp so the car isn't tiny
  if (innerWidth < 900) $('.stunt-svg').setAttribute('viewBox', '80 90 1000 740');
  const stuntTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.stunt', start: 'top top', end: '+=340%', pin: true, scrub: .6 },
    // read the step from the smoothed timeline, not the raw scroll position, so the label matches the car
    onUpdate: () => {
      const t = stuntTl.time();
      const at = t < 3.3 ? 0 : t < 6 ? 1 : t < 6.7 ? 2 : t < 8.1 ? 3 : 4;
      steps.forEach((li, i) => li.classList.toggle('is-on', i === at));
    },
  });
  stuntTl
    .to(rider, { motionPath: { path: '#ride', autoRotate: true }, duration: 6 }, 0)
    .to(stunt.spokes, { rotation: 1800, svgOrigin: hub, duration: 6 }, 0)
    .fromTo('.ride', { drawSVG: '0% 100%' }, { drawSVG: '100% 100%', duration: 6 }, 0)
    // vacuum suction shows from the bottom of the ramp until release
    .to(stunt.suction, { opacity: 1, duration: .3, stagger: .05 }, 1.8)
    .to(stunt.suction, { y: 8, duration: .25, repeat: 13, yoyo: true, stagger: .06 }, 2.1)
    .to(stunt.suction, { opacity: 0, duration: .2 }, 6.05)
    // upside-down on the ceiling is the same picture as a mirrored, flipped car: swap so the roll reads as a roll
    .set(rider, { rotation: 0, scaleX: -1, scaleY: -1 }, 6)
    .to(rider, { x: 260, duration: 2.6, ease: 'power1.out' }, 6.1)
    .to(rider, { y: 760, duration: 2.6, ease: 'power2.in' }, 6.1)
    .to(rider, { scaleY: 1, duration: 1.3, ease: 'power2.inOut' }, 6.7)
    .fromTo(stunt.plumes.down, { opacity: 0, scale: .2, transformOrigin: '50% 0%' }, { opacity: 1, scale: 1, duration: .25, stagger: .05, ease: 'power2.out' }, 7.9)
    .to(stunt.plumes.down, { scaleY: 1.3, duration: .2, repeat: 3, yoyo: true }, 8.15)
    .to(stunt.plumes.down, { opacity: 0, duration: .3 }, 8.7)
    .to(stunt.body, { y: 10, duration: .15, ease: 'power2.in' }, 8.7)
    .to(stunt.body, { y: 0, duration: .5, ease: 'settle' }, 8.85)
    .to({}, { duration: .6 });
  gsap.from('.stunt-title', { yPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.stunt', start: 'top 70%' } });

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

  // panel i: ten thrusters, venting at random like an attitude-control system
  const thrustPanel = $('.panel-thrust');
  const jetTl = gsap.timeline({ paused: true, repeat: -1 });
  $$('.jets circle', thrustPanel).forEach(c => {
    const puff = c.nextElementSibling;
    jetTl.add(burst(puff, .7), Math.random() * 3);
  });
  gsap.timeline({ scrollTrigger: { trigger: thrustPanel, containerAnimation: hScroll, start: 'left 65%' }, onComplete: () => jetTl.play() })
    .from($('.plan-body', thrustPanel), { drawSVG: '50% 50%', duration: 1.4, ease: 'power3.inOut' })
    .from($$('.plan-tank, .plan-label', thrustPanel), { scale: 0, transformOrigin: '50% 50%', duration: .7, ease: 'back.out(2)' }, '-=.5')
    .from($$('.jets line', thrustPanel), { drawSVG: '0%', duration: .6, stagger: .03 }, '-=.3')
    .from($$('.jets circle', thrustPanel), { scale: 0, transformOrigin: '50% 50%', duration: .5, stagger: .05, ease: 'back.out(3)' }, '-=.5');

  // panel ii: inverted car, arrows pulling toward the ceiling
  const suctionCar = carIn($('[data-car-suction]'));
  gsap.to(suctionCar.suction, { y: 10, duration: .5, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: .1 });
  gsap.from('.suction-car', {
    yPercent: 60, opacity: 0, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.panel-suction', containerAnimation: hScroll, start: 'left 60%' },
  });

  // panel iii: seats pop in, Rocket's jets light up
  gsap.from('.panel-seats .seat', {
    scale: 0, transformOrigin: '50% 50%', duration: .7, ease: 'back.out(2.2)', stagger: .12,
    scrollTrigger: { trigger: '.panel-seats', containerAnimation: hScroll, start: 'left 55%' },
  });
  gsap.from('.panel-seats .plan-body', {
    drawSVG: '0%', duration: 1.4, ease: 'power3.inOut', stagger: .15,
    scrollTrigger: { trigger: '.panel-seats', containerAnimation: hScroll, start: 'left 75%' },
  });
  gsap.from('.panel-seats .plan-jet, .rocket-jets circle', {
    scale: 0, transformOrigin: '50% 50%', duration: .4, ease: 'back.out(3)', stagger: .04,
    scrollTrigger: { trigger: '.panel-seats', containerAnimation: hScroll, start: 'left 45%' },
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

    // trim → reservation, nozzles, and a demonstration burst
    const priceEl = $('[data-price-out]'), specEl = $('[data-trim-spec]');
    const slot = $('[data-car-config]');
    const price = { v: 50000 };
    const fmtPrice = v => '$' + Math.round(v).toLocaleString('en-US');
    $$('.edition-btn').forEach(btn => btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      $$('.edition-btn').forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-checked', b === btn); });
      const trim = btn.dataset.trim, to = +btn.dataset.price;
      slot.classList.toggle('trim-thrust', trim === 'thrust');
      slot.classList.toggle('trim-rocket', trim === 'rocket');
      specEl.textContent = btn.dataset.spec;
      gsap.killTweensOf(price);
      if (!to) { priceEl.textContent = 'Invite only'; }
      else if (reduce) { price.v = to; priceEl.textContent = fmtPrice(to); }
      else {
        if (!/\$/.test(priceEl.textContent)) price.v = 0;
        gsap.to(price, { v: to, duration: 1.1, ease: 'expo.out', snap: { v: 100 }, onUpdate: () => { priceEl.textContent = fmtPrice(price.v); } });
      }
      if (reduce) return;
      if (trim === 'thrust') {
        burst(config.plumes.rear, .8);
        gsap.timeline().to(config.moving, { x: 40, duration: .25, ease: 'power3.out' }).to(config.moving, { x: 0, duration: 1, ease: 'settle' });
      } else if (trim === 'rocket') {
        burst(config.plumes.all, 1.1);
        gsap.timeline().to(config.moving, { y: -60, duration: .4, ease: 'power2.out' }).to(config.moving, { y: 0, duration: 1.1, ease: 'settle' });
      }
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

  /* Generated SVG detail: ramp ribs, ceiling hatching, thruster positions */
  function buildDecor() {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    };
    const ribs = $('.ramp-ribs');
    for (let a = 90; a >= -90; a -= 10) {
      const r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      el('line', { x1: 700 + 300 * c, y1: 460 + 300 * s, x2: 700 + 340 * c, y2: 460 + 340 * s }, ribs);
    }
    for (let x = 400; x < 700; x += 24) el('line', { x1: x, y1: 160, x2: x + 14, y2: 120 }, ribs);
    const hatch = $('.suction-ceiling .hatch');
    for (let x = 0; x < 1200; x += 30) el('line', { x1: x, y1: 100, x2: x + 22, y2: 70 }, hatch);

    // ten thruster points spaced around the plan outline, each venting outward
    const outline = $('.panel-thrust .plan-body'), jets = $('.panel-thrust .jets');
    const len = outline.getTotalLength();
    for (let i = 0; i < 10; i++) {
      const l = (i + .5) / 10 * len;
      const p = outline.getPointAtLength(l), q = outline.getPointAtLength((l + 2) % len);
      let nx = q.y - p.y, ny = p.x - q.x;
      const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
      // make the normal point away from the car's centre
      if ((p.x - 531) * nx + (p.y - 210) * ny < 0) { nx = -nx; ny = -ny; }
      el('line', { x1: p.x, y1: p.y, x2: 585, y2: 210 }, jets);
      el('circle', { cx: p.x, cy: p.y, r: 11 }, jets);
      const ang = Math.atan2(ny, nx) * 180 / Math.PI;
      el('ellipse', { cx: p.x + nx * 46, cy: p.y + ny * 46, rx: 44, ry: 16, transform: `rotate(${ang} ${p.x + nx * 46} ${p.y + ny * 46})` }, jets);
    }
    // move dashed feed lines under the jets
    $$('.jets line', jets.parentNode).forEach(l => jets.prepend(l));

    const rocket = $('.rocket-jets');
    const rOutline = rocket.parentNode.querySelector('.plan-body');
    const rLen = rOutline.getTotalLength();
    for (let i = 0; i < 10; i++) {
      const p = rOutline.getPointAtLength((i + .5) / 10 * rLen);
      el('circle', { cx: p.x, cy: p.y, r: 12 }, rocket);
    }
  }

  /* "In the time you've spent here…" */
  function initCtaDistance() {
    const el = $('[data-cta-distance]');
    const t0 = performance.now();
    const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      el.textContent = fmt.format(230 * s / 3600) + ' miles';
    }, 100);
  }
})();
