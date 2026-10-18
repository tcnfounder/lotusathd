/* =========================================================
   Sakin mod: ADHD dostu odak katmanı
   - Okuma odağı: okunan blok net, diğerleri soluk
   - Odak çubuğu: hangi bölümdesin, ne kadar kaldı, sıradaki adım
   - Ayarlar: yazı boyutu, satır aralığı, renk, görseller (cihazda saklanır)
   ========================================================= */

export const CALM_PREFS_KEY = 'lotus-calm-prefs';
const DEFAULTS = { focus: 'on', size: 'm', leading: 'normal', color: 'soft', media: 'show' };
const FIELDS = [
  { k: 'focus', label: 'Okuma odağı', hint: 'Okuduğun paragraf net kalır, diğerleri soluklaşır.', choices: [['on', 'Açık'], ['off', 'Kapalı']] },
  { k: 'size', label: 'Yazı boyutu', choices: [['m', 'Normal'], ['l', 'Büyük'], ['xl', 'Çok büyük']] },
  { k: 'leading', label: 'Satır aralığı', choices: [['normal', 'Normal'], ['wide', 'Geniş']] },
  { k: 'color', label: 'Renkler', hint: 'Fotoğraflar ve vurgu renkleri.', choices: [['soft', 'Yumuşak'], ['mono', 'Gri tonlu']] },
  { k: 'media', label: 'Fotoğraf ve video', hint: 'Gizleyince sayfada yalnızca metin kalır.', choices: [['show', 'Göster'], ['off', 'Gizle']] },
];
const WPM = 200;
const BOOK_URL = 'https://wa.me/18624471204';
const ICON = {
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 18l1.2-3.6A7 7 0 1 1 9 17.6z"/></svg>',
};

function loadPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(CALM_PREFS_KEY) || '{}') }; } catch (e) { return { ...DEFAULTS }; }
}
function savePrefs(p) { try { localStorage.setItem(CALM_PREFS_KEY, JSON.stringify(p)); } catch (e) {} }

export function initCalm({ root, onExit }) {
  let prefs = loadPrefs();
  const isOn = () => root.hasAttribute('data-calm');

  /* bölümler */
  const sections = [...document.querySelectorAll('[data-calm-section]')].map((el) => ({
    el,
    name: el.dataset.calmSection,
    words: (el.textContent || '').trim().split(/\s+/).length,
    head: el.querySelector('h1, h2, .big-quote'),
  }));

  /* okuma blokları */
  const blocks = [];
  document.querySelectorAll('[data-calm-text]').forEach((box) => {
    box.querySelectorAll('h1, h2, h3, p, li, blockquote').forEach((n) => {
      if (n.tagName !== 'BLOCKQUOTE' && n.closest('blockquote')) return;
      if (n.tagName === 'LI' && n.querySelector('p, h3')) return;
      n.classList.add('calm-block');
      blocks.push(n);
    });
  });

  /* odak çubuğu */
  const dock = document.createElement('div');
  dock.className = 'calm-dock';
  dock.setAttribute('role', 'navigation');
  dock.setAttribute('aria-label', 'Sakin mod gezinme');
  dock.innerHTML = `
    <p class="calm-where"><span class="calm-step" data-c-step></span><span class="calm-name" data-c-name></span><span class="calm-time" data-c-time></span></p>
    <button class="calm-btn calm-btn-main" type="button" data-c-next>${ICON.down}<span>Sonraki<span class="calm-next-name" data-c-next-name></span></span></button>
    <a class="calm-btn calm-btn-main" href="${BOOK_URL}" target="_blank" rel="noopener" data-c-book hidden>${ICON.chat}<span>Randevu al</span></a>
    <button class="calm-btn calm-btn-icon" type="button" data-c-settings aria-controls="calm-panel" aria-expanded="false" aria-label="Sakin mod ayarları">${ICON.gear}</button>
    <span class="sr" aria-live="polite" data-c-live></span>`;
  const $d = (s) => dock.querySelector(s);
  const ui = {
    step: $d('[data-c-step]'), name: $d('[data-c-name]'), time: $d('[data-c-time]'),
    next: $d('[data-c-next]'), nextName: $d('[data-c-next-name]'), book: $d('[data-c-book]'),
    settings: $d('[data-c-settings]'), live: $d('[data-c-live]'),
  };

  /* ayarlar paneli */
  const panel = document.createElement('section');
  panel.className = 'calm-panel';
  panel.id = 'calm-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'calm-panel-title');
  panel.innerHTML = `
    <div class="calm-panel-head"><h2 id="calm-panel-title">Sakin mod ayarları</h2>
      <button class="calm-btn calm-btn-icon" type="button" data-c-close aria-label="Kapat">${ICON.close}</button></div>
    <div class="calm-panel-body">
      ${FIELDS.map((f) => `
        <fieldset class="calm-field"><legend>${f.label}</legend>${f.hint ? `<p>${f.hint}</p>` : ''}
          <div class="calm-seg">${f.choices.map(([v, t]) => `<label><input type="radio" name="calm-${f.k}" value="${v}"><span>${t}</span></label>`).join('')}</div>
        </fieldset>`).join('')}
      <p class="calm-note">Sakin modda hareket ve otomatik video durur, sayfa tek kolona iner. Ayarların bu cihazda saklanır.</p>
      <div class="calm-panel-foot">
        <button class="calm-btn" type="button" data-c-reset>Varsayılana dön</button>
        <button class="calm-btn" type="button" data-c-exit>Sakin moddan çık</button>
      </div>
    </div>`;

  document.body.append(dock, panel);

  function applyPrefs() {
    Object.keys(DEFAULTS).forEach((k) => root.setAttribute(`data-calm-${k}`, prefs[k]));
    FIELDS.forEach((f) => {
      const r = panel.querySelector(`input[name="calm-${f.k}"][value="${prefs[f.k]}"]`);
      if (r) r.checked = true;
    });
  }

  function openPanel(open) {
    panel.hidden = !open;
    ui.settings.setAttribute('aria-expanded', String(open));
    if (open) (panel.querySelector('input:checked') || panel.querySelector('button')).focus();
  }

  panel.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.name || !t.name.startsWith('calm-')) return;
    prefs = { ...prefs, [t.name.slice(5)]: t.value };
    savePrefs(prefs);
    applyPrefs();
    requestUpdate();
  });
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-c-close]')) { openPanel(false); ui.settings.focus(); }
    if (e.target.closest('[data-c-reset]')) { prefs = { ...DEFAULTS }; savePrefs(prefs); applyPrefs(); requestUpdate(); }
    if (e.target.closest('[data-c-exit]')) { openPanel(false); onExit && onExit(); }
  });
  ui.settings.addEventListener('click', () => openPanel(panel.hidden));
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('.calm-panel, [data-c-settings]')) openPanel(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { openPanel(false); ui.settings.focus(); }
  });

  /* sıradaki bölüme geç; odağı başlığa taşı (ekran okuyucu için) */
  let currentIdx = 0;
  ui.next.addEventListener('click', () => {
    const s = sections[currentIdx + 1];
    if (!s) return;
    s.el.scrollIntoView({ block: 'start' });
    if (s.head) {
      s.head.setAttribute('tabindex', '-1');
      s.head.focus({ preventScroll: true });
    }
  });

  /* durum güncelleme: bölüm, kalan süre, okunan blok */
  let raf = 0, lastText = '';
  function requestUpdate() {
    if (raf || !isOn()) return;
    raf = requestAnimationFrame(() => { raf = 0; update(); });
  }
  function update() {
    const vh = window.innerHeight;
    const line = vh * 0.38;
    let idx = 0;
    sections.forEach((s, i) => { if (s.el.getBoundingClientRect().top <= line) idx = i; });
    // sayfanın sonuna gelindiyse son bölüm
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = sections.length - 1;
    currentIdx = idx;

    const cur = sections[idx];
    const r = cur.el.getBoundingClientRect();
    const within = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height)));
    let words = cur.words * (1 - within);
    for (let i = idx + 1; i < sections.length; i++) words += sections[i].words;
    const min = Math.ceil(words / WPM);

    const text = `${idx + 1}/${sections.length}|${cur.name}|${min}`;
    if (text !== lastText) {
      lastText = text;
      ui.step.textContent = `${idx + 1}/${sections.length}`;
      ui.name.textContent = cur.name;
      ui.time.textContent = idx === sections.length - 1 || min < 1 ? '· son bölüm' : `· ~${min} dk kaldı`;
      const nxt = sections[idx + 1];
      ui.next.hidden = !nxt;
      ui.book.hidden = !!nxt;
      ui.nextName.textContent = nxt ? `: ${nxt.name}` : '';
      ui.next.setAttribute('aria-label', nxt ? `Sonraki bölüm: ${nxt.name}` : 'Sonraki bölüm');
    }

    if (prefs.focus !== 'off' && blocks.length) {
      let best = null, bestD = Infinity;
      for (const b of blocks) {
        const br = b.getBoundingClientRect();
        if (!br.height) continue;
        const d = br.top <= line && br.bottom >= line ? 0 : Math.min(Math.abs(br.top - line), Math.abs(br.bottom - line));
        if (d < bestD) { bestD = d; best = b; }
      }
      setReading(best);
    }
  }
  function setReading(n) {
    blocks.forEach((b) => b.classList.toggle('is-reading', b === n));
  }

  // tıklanan ya da klavyeyle odaklanılan blok öne çıkar
  document.addEventListener('click', (e) => {
    if (!isOn() || prefs.focus === 'off') return;
    const b = e.target.closest('.calm-block');
    if (b) setReading(b);
  });
  document.addEventListener('focusin', (e) => {
    if (!isOn() || prefs.focus === 'off') return;
    const b = e.target.closest && e.target.closest('[data-calm-text]') && e.target.closest('.calm-block, p, li');
    if (b && b.classList.contains('calm-block')) setReading(b);
  });

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  applyPrefs();

  return {
    /* sakin mod açıldığında ya da kapandığında çağrılır */
    sync(announce) {
      if (isOn()) {
        lastText = '';
        update();
        if (announce) ui.live.textContent = 'Sakin mod açık. Hareket durdu, sayfa tek kolona indi. Ayarlar ekranın altında.';
      } else {
        openPanel(false);
        setReading(null);
        if (announce) ui.live.textContent = '';
      }
    },
  };
}
