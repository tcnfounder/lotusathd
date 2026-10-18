import { createAurora } from './aurora.js';
import { initCalm } from './calm.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const isCalm = () => root.hasAttribute('data-calm');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (!finePointer) root.classList.add('no-pointer');

function ready(fn) {
  if (window.gsap && window.ScrollTrigger) return fn();
  window.addEventListener('load', fn, { once: true });
}

ready(() => {
  const { gsap, ScrollTrigger, SplitText } = window;
  const hasGsap = !!(gsap && ScrollTrigger);
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);
    gsap.ticker.lagSmoothing(0); // progress by real time even on slow devices, so text never stays hidden
  }
  const motion = () => hasGsap && !isCalm();
  const loaderDone = window.__lotusLoader || Promise.resolve();

  /* ---------------- hero backdrop ---------------- */
  const hero = $('.hero');
  // start the GPU work only after the loader, so the loader never stutters
  let aurora = null;
  loaderDone.then(() => requestAnimationFrame(() => {
    aurora = createAurora($('[data-aurora]'), hero, {
      calm: isCalm(),
      onStill: (s) => hero.classList.toggle('is-still', s),
    });
    if (aurora) hero.classList.add('has-gl');
  }));

  /* ---------------- hero video ---------------- */
  const heroFig = $('[data-hero-video]');
  const heroVideo = $('video', heroFig);
  const soundBtn = $('[data-sound]');
  const soundLabel = $('[data-sound-label]');
  heroVideo.addEventListener('error', () => heroFig.classList.add('is-missing'));
  // in calm mode the video waits, still, until the visitor chooses to watch it
  const setSoundLabel = () => {
    soundLabel.textContent = !heroVideo.muted ? 'Sesi kapat' : (isCalm() && heroVideo.paused ? 'Videoyu izle' : 'Sesi aç');
  };
  if (isCalm()) heroVideo.pause();
  setSoundLabel();
  soundBtn.addEventListener('click', () => {
    const on = heroVideo.muted;
    heroVideo.muted = !on;
    if (on) { heroVideo.currentTime = 0; heroVideo.play().catch(() => {}); }
    soundBtn.setAttribute('aria-pressed', String(on));
    setSoundLabel();
    if (on) $$('[data-video] video').forEach((v) => v.pause());
  });

  /* ---------------- split headings ---------------- */
  const splits = [];
  const fontsReady = (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  if (hasGsap && SplitText) {
    $$('[data-split]').forEach((el) => {
      const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
      splits.push({ el, s });
    });
  }
  function animateSplits() {
    splits.forEach(({ el, s }) => {
      if (!motion()) return;
      const isHero = el.classList.contains('hero-title');
      if (isHero) {
        gsap.set(s.lines, { yPercent: 110 });
        loaderDone.then(() => gsap.to(s.lines, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.09, delay: 0.35 }));
        return;
      }
      gsap.from(s.lines, {
        yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
  }
  animateSplits();
  root.classList.remove('split-pending');

  // word-by-word "reading light" for the big quotes
  $$('[data-split-words]').forEach((el) => {
    if (!hasGsap || !SplitText) return;
    const s = SplitText.create(el, { type: 'words', wordsClass: 'word' });
    if (!isCalm()) {
      gsap.to(s.words, {
        opacity: 1, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
      });
    }
  });
  ScrollTrigger && ScrollTrigger.refresh();
  });

  /* ---------------- reveals ---------------- */
  const ro = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('[data-reveal]').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 4) * 0.09}s`);
    ro.observe(el);
  });

  /* ---------------- count up ---------------- */
  const co = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      co.unobserve(e.target);
      const end = +e.target.dataset.count;
      if (!motion()) return;
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.6, ease: 'expo.out', onUpdate: () => { e.target.textContent = Math.round(o.v); } });
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => co.observe(el));

  /* ---------------- marquee: speed follows scroll velocity ---------------- */
  let marqueeTween = null;
  const track = $('[data-marquee]');
  if (hasGsap) {
    marqueeTween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 38, repeat: -1 });
    if (isCalm()) marqueeTween.pause();
    ScrollTrigger.create({
      onUpdate: (self) => {
        if (isCalm()) return;
        const v = gsap.utils.clamp(-4, 4, self.getVelocity() / 400);
        gsap.to(marqueeTween, { timeScale: (self.direction || 1) * Math.max(1, Math.abs(v)), duration: 0.3, overwrite: true });
        gsap.to(marqueeTween, { timeScale: self.direction || 1, duration: 1.2, delay: 0.3 });
      },
    });
  }

  /* ---------------- scroll-linked scenes ---------------- */
  // kept so calm mode can park them at rest and bring them back later
  const scenes = [];
  if (hasGsap) {
    // portrait parallax (rest = scale 1, its end state)
    scenes.push({ t: gsap.fromTo('[data-parallax]', { scale: 1.08 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '[data-portrait]', start: 'top bottom', end: 'bottom top', scrub: true } }), rest: 1 });
    // hero drifts away (rest = in place, its start state)
    scenes.push({ t: gsap.to('.hero-visual', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } }), rest: 0 });
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: (s) => aurora && aurora.setScroll(s.progress) });
  }
  function setScenesCalm(on) {
    scenes.forEach(({ t, rest }) => {
      if (on) { t.scrollTrigger.disable(false); t.progress(rest); } else t.scrollTrigger.enable();
    });
  }
  setScenesCalm(isCalm());

  /* ---------------- Neden lotus: pinned scroll story ---------------- */
  const story = $('[data-story]');
  const storyCtl = story ? setupStory(story) : null;
  function setupStory(sec) {
    const q = (sel) => sec.querySelector(sel);
    const qa = (sel) => [...sec.querySelectorAll(sel)];
    const petals = qa('.s-flower .pt');
    const chapters = qa('[data-chapter]');
    const labels = qa('[data-sp]');
    const caption = q('[data-scene-caption]');
    const fill = q('[data-story-fill]');
    const hint = q('[data-story-hint]');

    if (!hasGsap) { sec.classList.add('is-static'); return null; }

    // the whole growth, 10 units long
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    gsap.set(qa('.s-stem, .s-roots path'), { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 });
    gsap.set(qa('.s-pad'), { scale: 0 });
    gsap.set(petals, { svgOrigin: '0 0', scale: 0, rotation: 0 });
    gsap.set(q('.s-glow'), { svgOrigin: '0 0', scale: .4 });

    // chapter 1: mud. the seed wakes, roots reach, silt stirs
    tl.to(q('.s-seedglow'), { opacity: 1, duration: 1.2 }, 1)
      .to(q('.s-seed'), { scale: 1.35, svgOrigin: '200 428', duration: 1.2, ease: 'sine.inOut' }, 1)
      .to(qa('.s-roots path'), { opacity: 1, duration: .1, stagger: .2 }, 1.3)
      .to(qa('.s-roots path'), { strokeDashoffset: 0, duration: 1.4, stagger: .2 }, 1.3)
      .to(qa('.s-silt circle'), { y: () => gsap.utils.random(-40, -12), x: () => gsap.utils.random(-14, 14), duration: 2.2, stagger: .04 }, 1)
      .to(q('.s-stem'), { opacity: 1, duration: .1 }, 2.2)
      .to(q('.s-stem'), { strokeDashoffset: .62, duration: 1.4 }, 2.2)

    // chapter 2: water. the murk clears, light arrives, the stem reaches the surface
      .to(q('.s-murk'), { opacity: 0, duration: 2.2 }, 3.5)
      .to(qa('.s-silt circle'), { opacity: 0, y: '+=30', duration: 1.6, stagger: .03 }, 3.5)
      .to(q('.s-bubbles'), { opacity: 1, duration: .4 }, 3.8)
      .to(qa('.s-bubbles circle'), { y: () => gsap.utils.random(-200, -150), duration: 2.4, stagger: .12 }, 3.8)
      .to(q('.s-bubbles'), { opacity: 0, duration: .4 }, 6)
      .to(q('.s-sun'), { opacity: .95, duration: 1.6 }, 4)
      .to(q('.s-rays'), { opacity: 1, duration: 1.8 }, 4.2)
      .to(q('[data-sky-top]'), { attr: { 'stop-color': '#FBF9FF' }, duration: 2 }, 4)
      .to(q('.s-stem'), { strokeDashoffset: 0, duration: 1.8 }, 4.4)
      .to(qa('.s-pad'), { scale: 1, duration: 1, stagger: .3, ease: 'back.out(1.6)' }, 5.4)
      .fromTo(qa('.s-ripples ellipse'), { attr: { rx: 20, ry: 3 }, opacity: .9 }, { attr: { rx: 120, ry: 16 }, opacity: 0, duration: 1.4, stagger: .35, immediateRender: false }, 5.6)

    // chapter 3: bloom. the bud rises, petals open, the mind glows at the heart
      .to(petals, { scale: 1, duration: 1.1, stagger: .05, ease: 'power2.out' }, 6.6)
      .to(petals, { rotation: (i, el) => +el.dataset.open, duration: 1.6, stagger: .06, ease: 'power2.inOut' }, 7.4)
      .to(q('.s-glow'), { opacity: 1, scale: 1, duration: 1.6 }, 7.6)
      .to(q('.s-mind'), { opacity: 1, duration: .8 }, 8.4)
      .to(q('.s-seedglow'), { opacity: .35, duration: 1 }, 7.6)
      .to(q('[data-sky-bottom]'), { attr: { 'stop-color': '#E1F3E4' }, duration: 1.6 }, 7.6)
      .to(qa('.s-sparks path'), { opacity: 1, scale: 1.4, duration: .4, stagger: .15, ease: 'power2.out' }, 8.6)
      .to(qa('.s-sparks path'), { opacity: .5, scale: 1, duration: .5, stagger: .15 }, 9.1)
      .to({}, { duration: .4 }, 9.6);

    const total = tl.duration();
    const cuts = [0, 1 / total, 3.5 / total, 6.6 / total];
    const names = ['Çamur', 'Çamur', 'Su', 'Çiçek'];
    let current = 0;
    function show(i) {
      if (i === current) return;
      const prev = chapters[current], next = chapters[i], dir = i > current ? 1 : -1;
      current = i;
      gsap.killTweensOf([prev, next]);
      gsap.to(prev, { autoAlpha: 0, y: -24 * dir, duration: .45, ease: 'power2.in', onComplete: () => prev.classList.remove('is-active') });
      next.classList.add('is-active');
      gsap.fromTo(next, { autoAlpha: 0, y: 30 * dir }, { autoAlpha: 1, y: 0, duration: .8, delay: .25, ease: 'expo.out' });
      gsap.fromTo(next.querySelectorAll('h3, p'), { y: 18 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: .8, delay: .3, stagger: .07, ease: 'expo.out' });
      caption.textContent = names[i];
      labels.forEach((l) => l.classList.toggle('is-on', +l.dataset.sp <= i));
    }

    let pinST = null;
    function resetChapters() {
      current = 0;
      chapters.forEach((c, i) => {
        const parts = [c, ...c.querySelectorAll('h3, p')];
        gsap.killTweensOf(parts);
        gsap.set(parts, { clearProps: 'all' });
        c.classList.toggle('is-active', i === 0);
      });
      labels.forEach((l) => l.classList.remove('is-on'));
      caption.textContent = names[0];
      fill.style.transform = '';
      if (hint) hint.style.opacity = '';
    }
    // calm: no pin, chapters stacked, flower fully open
    function toStatic() {
      if (pinST) { pinST.kill(true, true); pinST = null; }
      resetChapters();
      tl.progress(1);
      sec.classList.remove('is-animated');
      sec.classList.add('is-static');
    }
    function toAnimated() {
      if (pinST) return;
      sec.classList.remove('is-static');
      sec.classList.add('is-animated');
      resetChapters();
      tl.progress(0);
      chapters.forEach((c, i) => gsap.set(c, { autoAlpha: i === 0 ? 1 : 0 }));
      pinST = createPin();
    }

    if (motion()) toAnimated(); else toStatic();
    return { setCalm: (on) => (on ? toStatic() : toAnimated()) };

    function createPin() { return ScrollTrigger.create({
      trigger: sec,
      pin: q('[data-story-pin]'),
      start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * 3),
      scrub: .8,
      animation: tl,
      anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress;
        fill.style.transform = `scaleX(${p})`;
        let idx = 0;
        cuts.forEach((c, i) => { if (p >= c) idx = i; });
        show(idx);
        if (hint) hint.style.opacity = p > .05 ? 0 : 1;
      },
    }); }
  }

  /* ---------------- cards: tilt + spotlight ---------------- */
  if (finePointer) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        if (motion()) gsap.to(card, { rotateY: (x - 0.5) * 6, rotateX: (0.5 - y) * 6, y: -4, transformPerspective: 900, duration: 0.6, ease: 'power3.out' });
      });
      card.addEventListener('pointerleave', () => { if (hasGsap) gsap.to(card, { rotateY: 0, rotateX: 0, y: 0, duration: 0.8, ease: 'expo.out' }); });
    });
    // magnetic buttons
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        if (!motion()) return;
        const r = b.getBoundingClientRect();
        gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.5, ease: 'power3.out' });
      });
      b.addEventListener('pointerleave', () => { if (hasGsap) gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, .4)' }); });
    });
  }

  /* ---------------- header + reading progress ---------------- */
  const header = $('[data-header]');
  const bar = $('[data-progress-bar]');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > 30);
    const menuOpen = header.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 500 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  const navLinks = $$('.nav a[href^="#"]');
  const so = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${e.target.id}` ? 'true' : 'false'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) so.observe(s); });

  /* ---------------- calm mode ---------------- */
  // ADHD-friendly focus mode: still, soft, single column, one next step at a time
  const calmBtn = $('[data-calm-toggle]');
  const calm = initCalm({ root, onExit: () => setCalmMode(false) });
  calmBtn.setAttribute('aria-pressed', String(isCalm()));
  calm.sync(false);
  function setCalmMode(on) {
    // keep the reader on the same content across the layout change
    const anchor = [...document.querySelectorAll('[data-calm-section]')].reverse()
      .find((s) => s.getBoundingClientRect().top <= window.innerHeight * 0.38);
    root.toggleAttribute('data-calm', on);
    calmBtn.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('lotus-calm', on ? '1' : '0'); } catch (e) {}
    aurora && aurora.setCalm(on);
    if (marqueeTween) on ? marqueeTween.pause() : marqueeTween.play();
    if (on) {
      heroVideo.pause(); hero.classList.remove('is-still'); header.classList.remove('is-hidden');
      $$('[data-video] video').forEach((v) => v.pause());
    } else if (heroVideo.muted) heroVideo.play().catch(() => {});
    setSoundLabel();
    setScenesCalm(on);
    storyCtl && storyCtl.setCalm(on);
    if (hasGsap) {
      // scroll reveals (heading lines, quote words): in calm they are parked finished,
      // so no text is ever hidden or half-faded; out of calm they follow scroll again
      const parked = new Set(scenes.map((s) => s.t));
      gsap.globalTimeline.getChildren(true, true, false).forEach((t) => {
        if (!t.scrollTrigger || parked.has(t)) return;
        if (on) { t.scrollTrigger.disable(false); t.progress(1); } else t.scrollTrigger.enable();
      });
    }
    if (hasGsap) ScrollTrigger.refresh();
    if (anchor && window.scrollY > 0) anchor.scrollIntoView({ block: 'start' });
    calm.sync(true);
  }
  calmBtn.addEventListener('click', () => setCalmMode(!isCalm()));
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyS') { e.preventDefault(); setCalmMode(!isCalm()); }
  });

  /* ---------------- language switch: flip the coin, then go ---------------- */
  const lang = $('[data-lang]');
  if (lang) {
    lang.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      lang.classList.add('is-flipping');
      setTimeout(() => { window.location.href = lang.href; }, isCalm() ? 0 : 850);
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) lang.classList.remove('is-flipping'); });
  }

  /* ---------------- mobile menu ---------------- */
  const menuBtn = $('[data-menu-btn]');
  const nav = $('#menu');
  const setMenu = (open) => { menuBtn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); header.classList.toggle('menu-open', open); };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------------- portrait fallback ---------------- */
  const portrait = $('[data-portrait]');
  const pImg = $('img', portrait);
  const markMissing = () => portrait.classList.add('is-missing');
  pImg.addEventListener('error', markMissing);
  if (pImg.complete && pImg.naturalWidth === 0 && pImg.currentSrc) markMissing();

  /* ---------------- read more ---------------- */
  $$('[data-more]').forEach((wrap) => {
    const btn = $('[data-more-btn]', wrap), body = $('[data-more-body]', wrap), label = $('[data-more-label]', wrap);
    body.inert = true;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Kısaltarak oku' : 'Hikâyenin devamı';
      body.inert = !open;
      if (motion()) gsap.to(body, { height: open ? 'auto' : 0, duration: 0.7, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() });
      else body.style.height = open ? 'auto' : '0px';
    });
  });

  /* ---------------- FAQ: smooth open ---------------- */
  $$('.qa').forEach((d) => {
    const s = $('summary', d), body = $('.a-long', d);
    s.addEventListener('click', (e) => {
      if (!motion()) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, opacity: 0, duration: 0.45, ease: 'expo.out', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'all' }); } });
      } else {
        d.open = true;
        gsap.from(body, { height: 0, opacity: 0, duration: 0.6, ease: 'expo.out', clearProps: 'all' });
      }
    });
  });

  /* ---------------- gallery videos ---------------- */
  const cards = $$('[data-video]');
  cards.forEach((card) => {
    const video = $('video', card);
    $('.video-play', card).addEventListener('click', () => {
      cards.forEach((c) => { const v = $('video', c); if (v !== video) { v.pause(); } });
      heroVideo.muted = true; soundBtn.setAttribute('aria-pressed', 'false'); soundLabel.textContent = 'Sesi aç';
      video.muted = false; video.controls = true;
      video.play().catch(() => {});
      card.classList.add('is-playing');
    });
    video.addEventListener('ended', () => { card.classList.remove('is-playing'); video.controls = false; });
  });

  /* ---------------- service links pre-select the form ---------------- */
  const serviceSel = $('#f-service');
  if (serviceSel) $$('[data-service]').forEach((a) => a.addEventListener('click', () => {
    serviceSel.value = a.dataset.service;
    serviceSel.dispatchEvent(new Event('change', { bubbles: true }));
  }));

  /* ---------------- booking form ---------------- */
  const form = $('[data-form]');
  if (form) setupForm(form);
  function setupForm(form) {
  const required = $$('.field [required]', form);
  const consent = $('.consent input', form);
  const formBar = $('[data-form-bar]');
  const formCount = $('[data-form-count]');
  const status = $('[data-form-status]');
  const submit = $('[data-submit]');
  const done = $('[data-form-done]');

  const validField = (el) => {
    const v = el.value.trim();
    if (!v) return false;
    if (el.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (el.type === 'tel') return v.replace(/\D/g, '').length >= 7;
    return true;
  };
  const mark = (el, show) => {
    const f = el.closest('.field');
    const ok = validField(el);
    f.classList.toggle('is-valid', ok);
    if (show || f.classList.contains('is-invalid')) f.classList.toggle('is-invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok && f.classList.contains('is-invalid')));
    const err = $('.field-error', f); if (err) el.setAttribute('aria-describedby', err.id);
    return ok;
  };
  const progress = () => {
    const n = required.filter(validField).length;
    formCount.textContent = n;
    formBar.style.transform = `scaleX(${n / required.length})`;
  };
  required.forEach((el) => {
    el.addEventListener('input', () => { mark(el, false); progress(); });
    el.addEventListener('change', () => { mark(el, false); progress(); });
    el.addEventListener('blur', () => { if (el.value) mark(el, true); });
  });
  consent.addEventListener('change', () => consent.closest('.consent').classList.remove('is-invalid'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = ''; status.classList.remove('is-error');
    const bad = required.filter((el) => !mark(el, true));
    if (!consent.checked) consent.closest('.consent').classList.add('is-invalid');
    if (bad.length || !consent.checked) {
      (bad[0] || consent).focus();
      status.textContent = bad.length ? 'Eksik alanları tamamlar mısın?' : 'Devam etmek için onay kutusunu işaretle.';
      status.classList.add('is-error');
      return;
    }
    if ($('.hp', form).value) return; // bot
    submit.classList.add('is-loading');
    $('[data-submit-label]').textContent = 'Gönderiliyor';
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === 'false' || json.success === false) throw new Error(json.message || res.status);
      done.hidden = false;
      done.focus();
      form.reset(); progress();
      $$('.field', form).forEach((f) => f.classList.remove('is-valid'));
    } catch (err) {
      status.classList.add('is-error');
      status.innerHTML = 'Gönderilemedi. Lütfen tekrar dene ya da <a href="https://wa.me/18624471204" target="_blank" rel="noopener">WhatsApp’tan yaz</a>.';
    } finally {
      submit.classList.remove('is-loading');
      $('[data-submit-label]').textContent = 'Randevu talebini gönder';
    }
  });
  progress();
  }

  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  onScroll();
  if (hasGsap) document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
});
