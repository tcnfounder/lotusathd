import { createAurora } from './aurora.js';

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

  /* ---------------- hero backdrop ---------------- */
  const hero = $('.hero');
  const aurora = createAurora($('[data-aurora]'), hero, {
    calm: isCalm(),
    onStill: (s) => hero.classList.toggle('is-still', s),
  });

  /* ---------------- hero video ---------------- */
  const heroFig = $('[data-hero-video]');
  const heroVideo = $('video', heroFig);
  const soundBtn = $('[data-sound]');
  const soundLabel = $('[data-sound-label]');
  heroVideo.addEventListener('error', () => heroFig.classList.add('is-missing'));
  if (isCalm()) heroVideo.pause();
  soundBtn.addEventListener('click', () => {
    const on = heroVideo.muted;
    heroVideo.muted = !on;
    if (on) { heroVideo.currentTime = 0; heroVideo.play().catch(() => {}); }
    soundBtn.setAttribute('aria-pressed', String(on));
    soundLabel.textContent = on ? 'Sesi kapat' : 'Sesi aç';
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
      gsap.from(s.lines, {
        yPercent: 110, duration: isHero ? 1.4 : 1.1, ease: 'expo.out', stagger: 0.09, delay: isHero ? 0.25 : 0,
        scrollTrigger: isHero ? undefined : { trigger: el, start: 'top 88%', once: true },
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
  if (motion()) {
    // journey path draws as you read
    const path = $('[data-draw]');
    if (path) {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '[data-journey]', start: 'top 80%', end: 'bottom 55%', scrub: true } });
    }
    // two trainings merge into one approach
    gsap.fromTo('.roots-merge span:nth-child(1)', { x: -80 }, { x: 0, ease: 'none', scrollTrigger: { trigger: '[data-roots]', start: 'top 85%', end: 'center 50%', scrub: true } });
    gsap.fromTo('.roots-merge span:nth-child(2)', { x: 80 }, { x: 0, ease: 'none', scrollTrigger: { trigger: '[data-roots]', start: 'top 85%', end: 'center 50%', scrub: true } });
    // portrait parallax
    gsap.fromTo('[data-parallax]', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '[data-portrait]', start: 'top bottom', end: 'bottom top', scrub: true } });
    // hero drifts away
    gsap.to('.hero-visual', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: (s) => aurora && aurora.setScroll(s.progress) });
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

  /* ---------------- header, progress, stem, time-left ---------------- */
  const header = $('[data-header]');
  const bar = $('[data-progress-bar]');
  const stem = $('.stem');
  const stemFill = $('[data-stem-fill]');
  const footer = $('.site-footer');
  const sections = $$('main > section[id]').filter((s) => s.id !== 'top');
  const words = sections.map((s) => (s.innerText || '').split(/\s+/).filter(Boolean).length);
  const timeEl = $('[data-time-left]');
  let lastY = 0, lastMin = -1;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > 30);
    const menuOpen = header.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 500 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;
    stem.classList.toggle('is-visible', y > hero.offsetHeight * 0.6);
    stem.classList.toggle('is-footer', y + window.innerHeight > footer.offsetTop + 120);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, y / max) : 0;
    bar.style.transform = `scaleX(${p})`;
    stemFill.style.transform = `scaleY(${p})`;
    const mid = y + window.innerHeight * 0.5;
    let rem = 0;
    sections.forEach((s, i) => { rem += words[i] * Math.min(1, Math.max(0, (s.offsetTop + s.offsetHeight - mid) / s.offsetHeight)); });
    const min = Math.max(0, Math.round(rem / 200));
    if (min !== lastMin) { lastMin = min; timeEl.textContent = min < 1 ? '1 dk’dan az' : `~${min} dk`; }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  const stemLinks = $$('[data-stem-link]');
  const navLinks = $$('.nav a[href^="#"]');
  const order = stemLinks.map((a) => a.dataset.stemLink);
  const so = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const idx = order.indexOf(e.target.id);
      stemLinks.forEach((a, i) => { a.classList.toggle('is-active', i === idx); a.classList.toggle('is-passed', i < idx); });
      navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${e.target.id}` ? 'true' : 'false'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  order.forEach((id) => { const s = document.getElementById(id); if (s) so.observe(s); });

  /* ---------------- calm mode ---------------- */
  const calmBtn = $('[data-calm-toggle]');
  calmBtn.setAttribute('aria-pressed', String(isCalm()));
  calmBtn.addEventListener('click', () => {
    const on = !isCalm();
    root.toggleAttribute('data-calm', on);
    calmBtn.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('lotus-calm', on ? '1' : '0'); } catch (e) {}
    aurora && aurora.setCalm(on);
    if (marqueeTween) on ? marqueeTween.pause() : marqueeTween.play();
    if (on) { heroVideo.pause(); hero.classList.remove('is-still'); $$('[data-video] video').forEach((v) => v.pause()); }
    else heroVideo.play().catch(() => {});
    if (on && hasGsap) gsap.globalTimeline.getChildren(true, true, false).forEach((t) => { if (t.scrollTrigger) t.progress(1); });
  });

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
  $$('[data-service]').forEach((a) => a.addEventListener('click', () => {
    serviceSel.value = a.dataset.service;
    serviceSel.dispatchEvent(new Event('change', { bubbles: true }));
  }));

  /* ---------------- booking form ---------------- */
  const form = $('[data-form]');
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

  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  onScroll();
  if (hasGsap) document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
});
