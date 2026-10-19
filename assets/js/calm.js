/* =========================================================
   Sakin mod: ADHD dostu odak katmanı
   - Okuma odağı: okunan blok net, diğerleri soluk
   - Odak çubuğu: hangi bölümdesin, ne kadar kaldı, sıradaki adım
   - Ayarlar: yazı boyutu, satır aralığı, renk, görseller (cihazda saklanır)
   ========================================================= */

export const CALM_PREFS_KEY = 'lotus-calm-prefs';
const PLACE_KEY = 'lotus-calm-place';
const DEFAULTS = { focus: 'on', size: 'm', leading: 'normal', color: 'soft', media: 'show', return: 'on' };
const FIELDS = [
  { k: 'return', label: 'Kaldığın yer', hint: 'Başka sekmeye geçip döndüğünde, dalıp gittiğinde ya da günler sonra geldiğinde nerede kaldığını gösterir. Bilgi bu cihazdan çıkmaz.', choices: [['on', 'Açık'], ['off', 'Kapalı']] },
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
    s.el.scrollIntoView({ block: 'start', behavior: 'instant' });
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

    if (blocks.length) {
      let best = null, bestD = Infinity;
      for (const b of blocks) {
        if (b.closest('[inert]')) continue; // kapalı "devamı" metni görünmez
        const br = b.getBoundingClientRect();
        if (!br.height) continue;
        const d = br.top <= line && br.bottom >= line ? 0 : Math.min(Math.abs(br.top - line), Math.abs(br.bottom - line));
        if (d < bestD) { bestD = d; best = b; }
      }
      if (prefs.focus !== 'off') setReading(best);
      notePlace(best, cur.name);
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

  /* =======================================================
     Kaldığın yer: dikkat dağılınca geri dönüş köprüsü
     ADHD'de zor olan ayrılmak değil, geri dönüp nerede kaldığını bulmak.
     Site üç anı fark eder ve tek dokunuşla tam o satıra döndürür:
     başka sekmeye geçip dönmek, sayfada dalıp gitmek, günler sonra yeniden gelmek.
     Hiçbir şey sunucuya gitmez; yer yalnızca bu cihazda saklanır.
     ======================================================= */
  const AWAY_MIN = 20 * 1000;        // bu kadar kısa ayrılıklar sayılmaz
  const IDLE_MIN = 3 * 60 * 1000;    // sayfa açıkken hiç hareket yoksa "dalıp gitme"
  const VISIT_MAX = 14 * 864e5;      // iki haftadan eski ziyaretler hatırlanmaz

  let place = null;                  // { i: blok sırası, t: metin, s: bölüm }
  let leftAt = 0, lastInput = Date.now(), idleShown = false, placeTimer = 0;

  const card = document.createElement('section');
  card.className = 'calm-return';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'calm-return-title');
  card.innerHTML = `
    <p class="calm-return-kicker" data-r-kicker></p>
    <h2 id="calm-return-title" data-r-title></h2>
    <p class="calm-return-text" data-r-text></p>
    <blockquote class="calm-return-quote"><span data-r-section></span><p data-r-quote></p></blockquote>
    <div class="calm-return-actions">
      <button class="calm-btn calm-btn-main" type="button" data-r-go>Kaldığım yerden devam et</button>
      <button class="calm-btn" type="button" data-r-close>Kapat</button>
    </div>`;
  document.body.append(card);
  const $r = (s) => card.querySelector(s);

  function snippet(n) {
    const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 110 ? t.slice(0, 108).replace(/\s+\S*$/, '') + '…' : t;
  }
  function notePlace(n, sectionName) {
    if (!n) return;
    // kısa etiketler ("Su", "Çiçek") yer değildir; bir sonraki gerçek cümleyi al
    let i = blocks.indexOf(n);
    const usable = (b) => snippet(b).length >= 15 && !b.closest('[inert]') && b.getBoundingClientRect().height > 0;
    while (blocks[i + 1] && !usable(blocks[i])) i++;
    n = blocks[i];
    const sec = n.closest('[data-calm-section]');
    if (sec) sectionName = sec.dataset.calmSection;
    // sayfanın en üstündeyken "yer" kaydetmeye değmez
    if (i < 1 && window.scrollY < 200) return;
    if (place && place.i === i) return;
    place = { i, t: snippet(n), s: sectionName };
    clearTimeout(placeTimer);
    placeTimer = setTimeout(savePlace, 600);
  }
  function savePlace() {
    clearTimeout(placeTimer);
    if (!place || !isOn()) return;
    try { localStorage.setItem(PLACE_KEY, JSON.stringify({ ...place, at: Date.now() })); } catch (e) {}
  }
  window.addEventListener('pagehide', savePlace);
  function minutesText(ms) {
    const m = Math.round(ms / 60000);
    if (m < 1) return 'Bir dakikaya yakın';
    if (m < 60) return `${m} dakikadır`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} saat ${r} dakikadır` : `${h} saattir`;
  }
  function agoText(ms) {
    const d = Math.floor(ms / 864e5);
    if (d < 1) {
      const h = Math.floor(ms / 36e5);
      return h < 1 ? 'Biraz önce' : `${h} saat önce`;
    }
    return d === 1 ? 'Dün' : `${d} gün önce`;
  }
  function showReturn(kind, ms, p) {
    if (!isOn() || prefs.return === 'off' || !p || !blocks[p.i]) return;
    const copy = {
      away: {
        kicker: `${minutesText(ms)} başka bir yerdeydin`,
        title: 'Tekrar hoş geldin.',
        text: 'Bu çok normal. ADHD’de zor olan ayrılmak değil, geri dönüp nerede kaldığını bulmak. O yüzden senin yerine biz hatırladık:',
      },
      idle: {
        kicker: `${minutesText(ms)} sayfa hiç kıpırdamadı`,
        title: 'Dalıp gitmiş olabilirsin.',
        text: 'Hiç sorun değil, zihnin biraz gezindi. Kaldığın satır burada:',
      },
      visit: {
        kicker: `${agoText(ms)} buradaydın`,
        title: 'Geçen sefer burada kalmıştın.',
        text: 'Baştan okumana gerek yok. İstersen tam bıraktığın yerden devam et:',
      },
    }[kind];
    $r('[data-r-kicker]').textContent = copy.kicker;
    $r('[data-r-title]').textContent = copy.title;
    $r('[data-r-text]').textContent = copy.text;
    $r('[data-r-section]').textContent = p.s || '';
    $r('[data-r-quote]').textContent = `“${p.t}”`;
    card.dataset.target = String(p.i);
    openPanel(false);
    card.hidden = false;
    $r('[data-r-go]').focus({ preventScroll: true });
  }
  function closeReturn() { card.hidden = true; }

  $r('[data-r-close]').addEventListener('click', () => { closeReturn(); ui.settings.focus({ preventScroll: true }); });
  $r('[data-r-go]').addEventListener('click', () => {
    const n = blocks[+card.dataset.target];
    closeReturn();
    if (!n) return;
    n.scrollIntoView({ block: 'center', behavior: 'instant' });
    blocks.forEach((b) => b.classList.remove('calm-landed'));
    n.classList.add('calm-landed');
    setReading(n);
    n.setAttribute('tabindex', '-1');
    n.focus({ preventScroll: true });
    setTimeout(() => n.classList.remove('calm-landed'), 8000);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !card.hidden) closeReturn(); });

  // 1 · başka sekmeye, uygulamaya geçip dönmek
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { leftAt = Date.now(); savePlace(); return; }
    const away = leftAt ? Date.now() - leftAt : 0;
    leftAt = 0;
    lastInput = Date.now();
    if (away >= AWAY_MIN && place) showReturn('away', away, place);
  });

  // 2 · sayfa açıkken dalıp gitmek: uzun süre hiç hareket yoksa, ilk harekette sor
  const onInput = () => {
    const idle = Date.now() - lastInput;
    lastInput = Date.now();
    if (!document.hidden && idle >= IDLE_MIN && !idleShown && card.hidden && place) {
      idleShown = true; // bir ziyarette bir kez yeter
      showReturn('idle', idle, place);
    }
  };
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, onInput, { passive: true }));
  window.addEventListener('scroll', () => { if (card.hidden) onInput(); }, { passive: true });

  // 3 · günler sonra yeniden gelmek
  function offerLastVisit() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(PLACE_KEY) || 'null'); } catch (e) {}
    if (!saved || !saved.at || !blocks[saved.i]) return;
    const ago = Date.now() - saved.at;
    if (ago < 30 * 60 * 1000 || ago > VISIT_MAX) return; // aynı oturum ya da çok eski
    if (window.scrollY > 300) return; // tarayıcı zaten oraya götürdüyse sorma
    // metin değiştiyse yanlış yere götürme
    if (snippet(blocks[saved.i]) !== saved.t) return;
    showReturn('visit', ago, saved);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  applyPrefs();
  let visitChecked = false;

  return {
    /* sakin mod açıldığında ya da kapandığında çağrılır */
    sync(announce) {
      if (isOn()) {
        lastText = '';
        if (!visitChecked) { visitChecked = true; offerLastVisit(); }
        update();
        if (announce) ui.live.textContent = 'Sakin mod açık. Hareket durdu, sayfa tek kolona indi. Ayarlar ekranın altında.';
      } else {
        openPanel(false);
        closeReturn();
        setReading(null);
        if (announce) ui.live.textContent = '';
      }
    },
  };
}
