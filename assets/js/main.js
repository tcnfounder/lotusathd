import { createPond } from './pond.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const isCalm = () => root.hasAttribute('data-calm');

// wait for deferred GSAP scripts
function ready(fn) {
  if (window.gsap && window.ScrollTrigger) return fn();
  window.addEventListener('load', fn, { once: true });
}

ready(() => {
  const { gsap, ScrollTrigger } = window;
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- pond (WebGL hero) ---------------- */
  const hero = $('.hero');
  const hint = $('[data-still-hint]');
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) root.classList.add('no-pointer');

  const pond = createPond($('[data-pond]'), hero, {
    calm: isCalm(),
    onStill: (still) => hero.classList.toggle('is-still', still),
  });
  if (pond) hero.classList.add('has-gl');

  /* ---------------- intro: one orchestrated moment ---------------- */
  const introEls = $$('[data-intro]');
  if (pond) setTimeout(() => pond.setBloom(isCalm() ? 0.85 : 0.55), isCalm() ? 0 : 150);

  /* ---------------- bloom follows the scroll through the hero ---------------- */
  if (ScrollTrigger && pond) {
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onUpdate: (self) => { if (!isCalm()) pond.setBloom(0.55 + self.progress * 0.45); },
    });
  }

  /* ---------------- header state ---------------- */
  const header = $('[data-header]');
  const progressBar = $('[data-progress-bar]');
  const stem = $('.stem');
  const stemFill = $('[data-stem-fill]');
  function onScroll() {
    const y = window.scrollY;
    const heroH = hero.offsetHeight;
    header.classList.toggle('is-solid', y > heroH - 80);
    stem.classList.toggle('is-visible', y > heroH * 0.6);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, y / max) : 0;
    progressBar.style.transform = `scaleX(${p})`;
    stemFill.style.transform = `scaleY(${p})`;
    updateTimeLeft();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- time left (time-blindness aid) ---------------- */
  const WPM = 200;
  const sections = $$('main > section[id]').filter((s) => s.id !== 'top');
  const words = sections.map((s) => (s.innerText || '').split(/\s+/).filter(Boolean).length);
  const timeEl = $('[data-time-left]');
  let lastMin = -1;
  function updateTimeLeft() {
    const mid = window.scrollY + window.innerHeight * 0.5;
    let remaining = 0;
    sections.forEach((s, i) => {
      const top = s.offsetTop, h = s.offsetHeight;
      const frac = Math.min(1, Math.max(0, (top + h - mid) / h));
      remaining += words[i] * frac;
    });
    const min = Math.max(0, Math.round(remaining / WPM));
    if (min !== lastMin) {
      lastMin = min;
      timeEl.textContent = min < 1 ? '1 dk’dan az' : `~${min} dk`;
    }
  }

  /* ---------------- section tracking: stem + nav ---------------- */
  const stemLinks = $$('[data-stem-link]');
  const navLinks = $$('.nav a[href^="#"]');
  const order = stemLinks.map((a) => a.dataset.stemLink);
  const tracked = order.map((id) => document.getElementById(id)).filter(Boolean);
  const so = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const idx = order.indexOf(e.target.id);
      stemLinks.forEach((a, i) => {
        a.classList.toggle('is-active', i === idx);
        a.classList.toggle('is-passed', i <= idx);
      });
      navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${e.target.id}` ? 'true' : 'false'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  tracked.forEach((s) => so.observe(s));

  /* ---------------- calm mode ---------------- */
  const calmBtn = $('[data-calm-toggle]');
  calmBtn.setAttribute('aria-pressed', String(isCalm()));
  calmBtn.addEventListener('click', () => {
    const on = !isCalm();
    root.toggleAttribute('data-calm', on);
    calmBtn.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('lotus-calm', on ? '1' : '0'); } catch (e) {}
    pond && pond.setCalm(on);
    if (on) hero.classList.remove('is-still');
    $$('video').forEach((v) => { if (on && !v.paused) v.pause(); });
  });

  /* ---------------- mobile menu ---------------- */
  const menuBtn = $('[data-menu-btn]');
  const nav = $('#menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------------- "read more" (chunked story) ---------------- */
  $$('[data-more]').forEach((wrap) => {
    const btn = $('[data-more-btn]', wrap);
    const body = $('[data-more-body]', wrap);
    const label = $('[data-more-label]', wrap);
    body.setAttribute('aria-hidden', 'true');
    body.inert = true;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Kısaltarak oku' : 'Hikâyenin devamı';
      body.inert = !open;
      body.setAttribute('aria-hidden', String(!open));
      if (gsap && !isCalm()) {
        gsap.to(body, {
          height: open ? 'auto' : 0, duration: 0.7, ease: 'expo.out',
          onComplete: () => { body.classList.toggle('is-open', open); ScrollTrigger && ScrollTrigger.refresh(); },
        });
      } else {
        body.style.height = open ? 'auto' : '0px';
        body.classList.toggle('is-open', open);
      }
    });
  });

  /* ---------------- services: petals + tabs ---------------- */
  const tabs = $$('[role="tab"]');
  const petals = $$('.petal');
  function selectTab(name, focus) {
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (on) {
        panel.hidden = false;
        if (gsap && !isCalm()) gsap.fromTo(panel, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
        if (focus) t.focus();
      } else panel.hidden = true;
    });
    petals.forEach((p) => p.classList.toggle('is-active', p.dataset.petal === name));
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j].dataset.tab, true); }
    });
  });
  petals.forEach((p) => p.addEventListener('click', () => selectTab(p.dataset.petal)));
  selectTab('bireysel');

  /* ---------------- videos: one at a time ---------------- */
  const cards = $$('[data-video]');
  cards.forEach((card) => {
    const video = $('video', card);
    const btn = $('.video-play', card);
    btn.addEventListener('click', () => {
      cards.forEach((c) => { const v = $('video', c); if (v !== video && !v.paused) v.pause(); });
      video.controls = true;
      video.play().catch(() => {});
      card.classList.add('is-playing');
    });
    video.addEventListener('pause', () => { if (video.ended) { card.classList.remove('is-playing'); video.controls = false; } });
  });

  /* ---------------- quiet reveals for the sequence only ---------------- */
  const journey = $('.journey');
  const jo = new IntersectionObserver(([e]) => { if (e.isIntersecting) { journey.classList.add('in-view'); jo.disconnect(); } }, { rootMargin: '0px 0px -15% 0px' });
  jo.observe(journey);

  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  onScroll();
});
