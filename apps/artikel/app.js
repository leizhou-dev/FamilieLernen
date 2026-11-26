'use strict';
/* Artikel lernen – der, die, das
   Lern-PWA für Bayern Klasse 1–5 (Grundwortschatz LehrplanPLUS + Erweiterung Kl. 5) */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const DAY = 864e5;
let RUN = 0;
const later = (fn, ms) => { const t = RUN; setTimeout(() => { if (t === RUN) fn(); }, ms); };
const today = () => new Date().toISOString().slice(0, 10);

const STUFEN = ['1/2', '3/4', '5'];
const STUFE_NAME = { '1/2': 'Klasse 1/2', '3/4': 'Klasse 3/4', '5': 'Klasse 5' };
const THEMEN = ['Tiere', 'Essen & Trinken', 'Körper', 'Menschen & Familie', 'Schule', 'Zuhause', 'Natur & Wetter',
  'Zeit', 'Kleidung', 'Stadt & Verkehr', 'Freizeit', 'Gedanken & Gefühle', 'Sonstiges'];
const WORTARTEN = ['Nomen', 'Verb', 'Adjektiv', 'Kleines Wort', 'Zahlwort'];
const AVATARE = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐨', '🐰', '🦄', '🐙', '🐳', '🦉', '🐞', '🚀', '⚽', '🌻', '🎸'];
const INTERVAL = [0, 0, 1, 3, 7, 21].map(d => d * DAY); // Fach 1..5
const ARTS = ['der', 'die', 'das'];

let WORDS = [], NOUNS = [], BYID = {};

/* ---------- Speicher ---------- */
// Familie lernt: eigener Speicher, getrennt vom alten „Artikel lernen“ (gleiche Domain!).
// Profile kommen aus der Familien-App; jedes Familienprofil hat eigenen Fortschritt.
const KEY = 'familie.artikel.v1';
const FAMILY_HOME = new URL('../../#/today', document.baseURI).href;
function toFamily() { location.href = FAMILY_HOME; }
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { S = null; }
if (!S) S = { profiles: [], current: null, data: {} };
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Speichern nicht möglich'); } }
function newData() {
  return {
    settings: { stufen: ['1/2', '3/4'], themen: [], wortarten: [...WORTARTEN], tts: true, farben: true, runde: 10, stimme: '' },
    art: {}, voc: {}, pl: {}, stars: 0, log: [], rounds: [], best: { rennen: 0 }, days: []
  };
}
const P = () => S.data[S.current];
const ST = () => P().settings;
function curProfile() { return S.profiles.find(p => p.id === S.current); }

function rec(kind, id) { return P()[kind][id]; }
function grade(kind, w, ok, mode) {
  const d = P();
  const r = d[kind][w.id] || (d[kind][w.id] = { b: 1, due: 0, ok: 0, err: 0 });
  if (ok) { r.ok++; r.b = Math.min(5, r.b + 1); } else { r.err++; r.b = 1; }
  r.due = Date.now() + INTERVAL[r.b];
  r.last = Date.now();
  d.log.push({ t: Date.now(), m: mode, w: w.id, ok: ok ? 1 : 0 });
  if (d.log.length > 6000) d.log.splice(0, d.log.length - 6000);
  if (!d.days.includes(today())) d.days.push(today());
  if (ok) addStars(1); else FAM?.day();
  save();
}
// Sterne und Tage in Folge gelten in „Familie lernt“ für alle Kurse gemeinsam
let FAM = null;
function addStars(n) { P().stars += n; if (FAM) { FAM.add(n); P().stars = FAM.get().stars; } }
function logRound(mode, ok, total) {
  P().rounds.push({ t: Date.now(), m: mode, ok, n: total });
  if (P().rounds.length > 500) P().rounds.shift();
  save();
}

/* ---------- Wortauswahl ---------- */
function nounPool(opts = {}) {
  const s = ST();
  return NOUNS.filter(w => s.stufen.includes(w.stufe) && (!s.themen.length || s.themen.includes(w.thema))
    && !w.nurPlural && (!opts.plural || w.plural));
}
function vocPool() {
  const s = ST();
  return WORDS.filter(w => s.stufen.includes(w.stufe) && s.wortarten.includes(w.wortart)
    && (w.wortart !== 'Nomen' || !s.themen.length || s.themen.includes(w.thema)));
}
function weakFirst(pool, kind, n) {
  const res = pool.map(w => { const r = rec(kind, w.id); return [w, (r ? r.b : 0.5) + Math.random() * 2.2]; })
    .sort((a, b) => a[1] - b[1]).slice(0, n).map(x => x[0]);
  return shuffle(res);
}
function duePool(pool, kind, n) {
  const now = Date.now();
  const due = pool.filter(w => { const r = rec(kind, w.id); return r && r.due <= now; }).sort((a, b) => rec(kind, a.id).due - rec(kind, b.id).due);
  const neu = shuffle(pool.filter(w => !rec(kind, w.id)));
  return shuffle([...due.slice(0, n), ...neu.slice(0, Math.max(0, n - due.length))]);
}
function dueCount(pool, kind) { const now = Date.now(); return pool.filter(w => { const r = rec(kind, w.id); return r && r.due <= now; }).length; }
function errorWords(pool, kind) {
  return pool.filter(w => { const r = rec(kind, w.id); return r && r.err > 0 && r.b <= 2; })
    .sort((a, b) => rec(kind, b.id).err - rec(kind, a.id).err);
}

/* ---------- Ton & Sprache ---------- */
let voice = null;
// Qualität einer Stimme: 3 = Premium, 2 = Erweitert, 1 = Standard, 0 = Spaßstimme (Eloquence/Novelty)
const FUN_VOICES = /^(Eddy|Flo|Grandma|Grandpa|Oma|Opa|Reed|Rocko|Sandy|Shelley|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph)\b/i;
function voiceQuality(v) {
  const id = `${v.name} ${v.voiceURI || ''}`;
  if (/premium/i.test(id)) return 3;
  if (/enhanced|erweitert|verbessert/i.test(id)) return 2;
  if (FUN_VOICES.test(v.name)) return 0;
  return 1;
}
const QUAL_LABEL = ['Spaßstimme', 'Standard', 'Erweitert', 'Premium'];
function germanVoices() {
  if (!window.speechSynthesis) return [];
  return speechSynthesis.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith('de'))
    .sort((a, b) => voiceQuality(b) - voiceQuality(a) || a.name.localeCompare(b.name, 'de'));
}
function pickVoice() {
  const vs = germanVoices();
  const pref = S.current && ST().stimme;
  // gespeicherte Stimme (voiceURI, früher: Name) – sonst beste Qualität, bevorzugt bekannte deutsche Stimmen
  voice = (pref && (vs.find(v => v.voiceURI === pref) || vs.find(v => v.name === pref)))
    || vs.filter(v => voiceQuality(v) > 0).sort((a, b) => voiceQuality(b) - voiceQuality(a) || (/Anna|Helena|Petra|Markus|Yannick|Martin/.test(b.name) - /Anna|Helena|Petra|Markus|Yannick|Martin/.test(a.name)))[0]
    || vs[0] || null;
}
if (window.speechSynthesis) {
  pickVoice();
  speechSynthesis.onvoiceschanged = () => { pickVoice(); if (location.hash === '#einstellungen' && !$('#stimme:focus')) { const y = scrollY; einstellungen(); scrollTo(0, y); } };
}
function say(text, rate = 0.9) {
  if (!window.speechSynthesis || !S.current || !ST().tts || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE'; if (voice) u.voice = voice; u.rate = rate;
  speechSynthesis.speak(u);
}
let actx;
function beep(ok) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const notes = ok ? [660, 880] : [300, 220];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = ok ? 'sine' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * .1); g.gain.exponentialRampToValueAtTime(0.18, t + i * .1 + .02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * .1 + .16);
      o.connect(g).connect(actx.destination); o.start(t + i * .1); o.stop(t + i * .1 + .18);
    });
  } catch (e) { }
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200); }


/* ---------- Bausteine (ipados27-ui) ---------- */
const isPhoto = w => /^https?:/.test(w.bild || '');
function picHTML(w) {
  if (!w.bild) return '';
  const cap = isPhoto(w) ? `<div class="credit">Foto: ${esc(w.bildQuelle.autor)} · ${esc(w.bildQuelle.lizenz)}</div>` : '';
  return `<div class="pic ${isPhoto(w) ? 'photo' : ''}"><img src="${esc(w.bild)}" alt="" draggable="false" onerror="const p=this.parentNode,c=p.nextElementSibling;if(c&&c.classList.contains('credit'))c.remove();p.remove()"></div>${cap}`;
}
function thumbHTML(w) {
  if (!w.bild) return `<span class="thumb empty">Aa</span>`;
  return `<span class="thumb ${isPhoto(w) ? 'photo' : ''}"><img src="${esc(w.bild)}" alt="" loading="lazy" draggable="false" onerror="this.parentNode.className='thumb empty';this.parentNode.textContent='Aa'"></span>`;
}
function artWord(w) { return w.artikel ? `<span class="art c-${w.artikel}">${w.artikel}</span>${esc(w.wort)}` : esc(w.wort); }
function fullText(w) { return w.artikel ? `${w.artikel} ${w.wort}` : w.wort; }
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function gapSentence(w) {
  if (!w.beispiel) return '';
  const re = new RegExp(`(^|[^A-Za-zÄÖÜäöüß])(${reEsc(w.wort)})(?=$|[^A-Za-zÄÖÜäöüß])`, 'i');
  if (!re.test(w.beispiel)) return '';
  return esc(w.beispiel.replace(re, (m, a, b) => a + '_'.repeat(Math.max(3, b.length))));
}
function ruleHTML(w) {
  let h = '';
  if (w.regel) h += w.ausnahme
    ? `<div class="fb-rule">💡 <b>Regel:</b> ${esc(w.regel)}<br>⚠️ Aber <b>${esc(fullText(w))}</b> ist eine Ausnahme – gut merken!</div>`
    : `<div class="fb-rule">💡 <b>Tipp:</b> ${esc(w.regel)}</div>`;
  if (w.hinweis) h += `<div class="fb-rule">ℹ️ ${esc(w.hinweis)}</div>`;
  return h;
}
function pageHeader(title, sub = '', trailing = '') {
  return `<div class="scroll-edge"><div class="se-side"></div><div class="se-title">${title}</div><div class="se-side end">${trailing}</div></div>
    <header class="large-header"><div class="lh-row"><div><h1 class="large-title">${title}</h1>${sub ? `<div class="lh-sub">${sub}</div>` : ''}</div>${trailing ? `<div class="lh-trailing">${trailing}</div>` : ''}</div></header>`;
}
function navBar(center = '', trailing = '', back = false) {
  return `<div class="navbar"><div class="nb-side"><button class="glass-btn" data-close aria-label="${back ? 'Zurück' : 'Beenden'}">${ico(back ? 'chevronLeft' : 'xmark', 20, 2.2)}</button></div>
    <div class="nb-center">${center}</div><div class="nb-side end">${trailing}</div></div>`;
}
function progressNav(i, n) {
  return navBar(`<div class="progress-track"><div class="progress-fill" style="width:${Math.round(i / n * 100)}%"></div></div>`, `<span class="counter">${Math.min(i + 1, n)}/${n}</span>`);
}
function group(header, rows, footer = '') {
  return `<section class="group">${header ? `<h2 class="group-header">${header}</h2>` : ''}<div class="group-body">${rows}</div>${footer ? `<p class="group-footer">${footer}</p>` : ''}</section>`;
}
function row({ icon = '', title = '', sub = '', detail, chev = false, attrs = '', cls = '' }) {
  const tag = attrs ? 'button' : 'div';
  return `<${tag} class="row${attrs ? ' tappable' : ''}${cls ? ' ' + cls : ''}" ${attrs}>${icon ? `<span class="row-icon">${icon}</span>` : ''}
    <span class="row-main">${title ? `<span class="row-title">${title}</span>` : ''}${sub ? `<span class="row-sub">${sub}</span>` : ''}</span>
    ${detail !== undefined ? `<span class="row-detail">${detail}</span>` : ''}${chev ? ico('chevronRight', 16, 2.4, 'row-chev') : ''}</${tag}>`;
}
function toggle(name, on) {
  return `<label class="toggle"><input type="checkbox" role="switch" data-toggle="${name}" ${on ? 'checked' : ''}><span class="toggle-track"><span class="toggle-thumb"></span></span></label>`;
}
function tileBtn(route, icon, color, title, desc, badge) {
  return `<button class="tile-btn" data-go="${route}"><span class="tile-top">${iconTile(icon, color, 40)}${badge ? `<span class="badge">${badge}</span>` : ''}</span>
    <span class="tile-title">${title}</span><span class="tile-desc">${desc}</span></button>`;
}
function setTitle(t) { document.title = t + ' – Artikel lernen'; }
function go(h) { if (location.hash === '#' + h) render(); else location.hash = h; }
let lastTab = 'home';
const closeTarget = () => lastTab;

/* ---------- Ergebnis ---------- */
function resultView(mode, ok, total, wrong, again) {
  logRound(mode, ok, total);
  if (total > 0 && ok === total) addStars(3);
  save();
  const pct = total ? ok / total : 0;
  const face = pct === 1 ? '🏆' : pct >= .8 ? '🌟' : pct >= .5 ? '👍' : '💪';
  const msg = pct === 1 ? 'Alles richtig! +3 Bonussterne' : pct >= .8 ? 'Super gemacht!' : pct >= .5 ? 'Gut! Weiter so.' : 'Übung macht den Meister!';
  view.innerHTML = `${navBar(MODE[mode] || '')}
    <div class="result"><div class="big-emoji">${face}</div><div class="score">${ok} von ${total}</div><h2>${msg}</h2>
    ${wrong.length ? group('Diese Wörter üben wir noch', wrong.map(w => row({ icon: thumbHTML(w), title: artWord(w), sub: w.plural ? 'Mehrzahl: die ' + esc(w.plural) : (w.formen ? esc(w.formen) : ''), detail: ico('speaker', 20, 2), attrs: `data-say="${esc(fullText(w))}"` })).join('')) : ''}
    <div class="two"><button class="primary" id="again">${ico('repeat', 20, 2.2)} Nochmal</button><button class="secondary" data-close>Fertig</button></div></div>`;
  $('#again').onclick = again;
}
function emptyView(text) {
  view.innerHTML = `${navBar()}<div class="result"><div class="big-emoji">🙂</div><h2>${text}</h2>
    <div class="two"><button class="secondary" data-go="einstellungen">Auswahl ändern</button><button class="primary" data-close>Fertig</button></div></div>`;
}

/* ---------- Artikel-Quiz (auch Karteikasten & Fehlerwörter) ---------- */
function artikelRound(items, mode, again) {
  if (!items.length) return emptyView(mode === 'fehler' ? 'Keine Fehlerwörter – super! 🎉' : 'Keine Wörter für diese Auswahl.');
  let i = 0, ok = 0; const wrong = [];
  const show = () => {
    if (i >= items.length) return resultView(mode, ok, items.length, wrong, again);
    const w = items[i];
    const r = rec('art', w.id);
    view.innerHTML = `${progressNav(i, items.length)}
      <div class="stack">
        <div class="question">
          <button class="icon-btn q-speak" id="spk" aria-label="Vorlesen">${ico('speaker', 20, 2)}</button>
          <div class="q-meta"><span class="chip">${mode === 'kasten' ? (r ? 'Fach ' + r.b : 'Neu') : esc(w.thema)}</span>${r && r.err && mode !== 'kasten' ? '<span class="chip warn">Wiederholung</span>' : ''}</div>
          ${picHTML(w)}
          <div class="q-main" id="qw">${esc(w.wort)}</div>
          <div class="q-sub">Welcher Artikel passt?</div>
        </div>
        <div class="art-grid">${ARTS.map(a => `<button class="art-btn ${a}" data-a="${a}">${a}</button>`).join('')}</div>
        <div id="fb"></div>
      </div>`;
    $('#spk').onclick = () => say(w.wort);
    let done = false;
    $$('.art-btn').forEach(b => b.onclick = () => {
      if (done) return; done = true;
      const right = b.dataset.a === w.artikel;
      grade('art', w, right, mode); beep(right);
      $$('.art-btn').forEach(x => { x.classList.toggle('dim', x.dataset.a !== w.artikel); x.classList.toggle('right', x.dataset.a === w.artikel); });
      $('#qw').innerHTML = artWord(w);
      say(fullText(w));
      const pl = w.plural ? `<div class="fb-ex">Mehrzahl: die ${esc(w.plural)}</div>` : '';
      const fb = $('#fb');
      if (right) {
        ok++;
        const extra = w.ausnahme || w.hinweis;
        fb.innerHTML = `<div class="feedback ok"><div class="fb-title">${ico('checkCircle', 24, 2)} Richtig!</div><div class="fb-line">${artWord(w)}</div>${pl}${extra ? ruleHTML(w) : ''}
          ${extra ? `<div class="fb-actions"><button class="primary big" id="next">Weiter</button></div>` : ''}</div>`;
        if (!extra) { later(() => { i++; show(); }, 1100); return; }
      } else {
        wrong.push(w);
        fb.innerHTML = `<div class="feedback no"><div class="fb-title">${ico('xmark', 24, 2.2)} Leider falsch</div>
          <div class="fb-line">Es heißt: <b>${artWord(w)}</b></div>${pl}${ruleHTML(w)}<div class="fb-ex">${esc(w.beispiel || '')}</div>
          <div class="fb-actions"><button class="primary big" id="next">Weiter</button></div></div>`;
        $('.question').classList.add('shake');
      }
      $('#next').onclick = () => { i++; show(); };
      $('#next').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };
  show();
}

function kastenStart() {
  setTitle('Karteikasten');
  const pool = nounPool();
  const counts = [0, 0, 0, 0, 0];
  pool.forEach(w => { const r = rec('art', w.id); if (r) counts[r.b - 1]++; });
  const neu = pool.filter(w => !rec('art', w.id)).length;
  const due = dueCount(pool, 'art');
  view.innerHTML = `${navBar('Karteikasten')}
    ${pageHeader('Karteikasten', 'Richtig ➜ ein Fach weiter. Falsch ➜ zurück in Fach 1.')}
    <div class="boxes">${counts.map((c, k) => `<div class="stat"><span class="stat-n">${c}</span>Fach ${k + 1}<span class="small">${['sofort', '1 Tag', '3 Tage', '7 Tage', '21 Tage'][k]}</span></div>`).join('')}</div>
    ${group('', row({ icon: iconTile('repeat', 'var(--orange)', 30), title: 'Heute fällig', detail: due }) + row({ icon: iconTile('sparkles', 'var(--indigo)', 30), title: 'Neue Wörter', detail: neu }), 'Pro Runde kommen bis zu 15 Wörter dran – zuerst die fälligen, dann neue.')}
    <button class="primary big" id="los">Los geht's</button>`;
  $('#los').onclick = () => artikelRound(duePool(pool, 'art', 15), 'kasten', kastenStart);
}

/* ---------- Sortieren ---------- */
function sortieren() {
  setTitle('Sortieren');
  const pool = nounPool();
  let items = [];
  for (const a of ARTS) items.push(...weakFirst(pool.filter(w => w.artikel === a), 'art', 3));
  items = shuffle(items);
  if (!items.length) return emptyView('Keine Wörter für diese Auswahl.');
  let ok = 0; const wrong = new Set(); let selected = null;
  view.innerHTML = `${navBar('Sortieren', `<span class="counter" id="cnt">0/${items.length}</span>`)}
    <p class="center muted" style="margin:6px 0 16px">Ziehe jedes Wort in die richtige Kiste – oder tippe erst das Wort und dann die Kiste.</p>
    <div class="pile">${items.map(w => `<div class="chip-word ${w.bild ? '' : 'no-img'}" data-id="${w.id}">${w.bild ? thumbHTML(w) : ''}${esc(w.wort)}</div>`).join('')}</div>
    <div class="bins">${ARTS.map(a => `<div class="bin ${a}" data-a="${a}"><h4>${a}</h4></div>`).join('')}</div>`;
  let placed = 0;
  const drop = (chip, bin) => {
    const w = BYID[chip.dataset.id];
    if (bin.dataset.a === w.artikel) {
      if (!wrong.has(w.id)) ok++;
      grade('art', w, true, 'sort'); beep(true); say(fullText(w));
      chip.remove(); placed++; $('#cnt').textContent = `${placed}/${items.length}`;
      bin.insertAdjacentHTML('beforeend', `<div class="done">${esc(w.wort)}</div>`);
      if (!$$('.pile .chip-word').length) later(() => resultView('sort', ok, items.length, [...wrong].map(id => BYID[id]), sortieren), 700);
    } else {
      beep(false);
      if (!wrong.has(w.id)) { wrong.add(w.id); grade('art', w, false, 'sort'); }
      for (const el of [chip, bin]) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    }
  };
  $$('.chip-word').forEach(chip => {
    chip.addEventListener('pointerdown', e => {
      e.preventDefault();
      const rect = chip.getBoundingClientRect();
      const dx = e.clientX - rect.left, dy = e.clientY - rect.top;
      let moved = false, clone = null, over = null;
      const move = ev => {
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 8) return;
        if (!moved) { moved = true; clone = chip.cloneNode(true); clone.classList.add('drag'); clone.classList.remove('sel'); clone.style.width = rect.width + 'px'; document.body.appendChild(clone); chip.classList.add('ghost'); }
        clone.style.left = (ev.clientX - dx) + 'px'; clone.style.top = (ev.clientY - dy) + 'px';
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const b = el && el.closest('.bin');
        if (over && over !== b) over.classList.remove('hover');
        over = b; if (b) b.classList.add('hover');
      };
      const up = () => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        if (clone) clone.remove(); chip.classList.remove('ghost');
        if (over) over.classList.remove('hover');
        if (moved && over) drop(chip, over);
        else if (!moved) { $$('.chip-word').forEach(c => c.classList.remove('sel')); selected = chip; chip.classList.add('sel'); say(BYID[chip.dataset.id].wort); }
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    });
  });
  $$('.bin').forEach(bin => bin.addEventListener('click', () => { if (selected && selected.isConnected) { const c = selected; selected = null; c.classList.remove('sel'); drop(c, bin); } }));
}

/* ---------- Mehrzahl ---------- */
function umlaut(s) {
  const m = s.match(/(au|a|o|u)(?=[^aeiouäöü]*$)/i);
  if (!m) return s;
  const map = { au: 'äu', a: 'ä', o: 'ö', u: 'ü', Au: 'Äu', A: 'Ä', O: 'Ö', U: 'Ü' };
  return s.slice(0, m.index) + map[m[1]] + s.slice(m.index + m[1].length);
}
function pluralFakes(w) {
  const b = w.wort, u = umlaut(b), real = w.plural, st = b.replace(/e$/, '');
  const c = [b + 'e', b + 'en', b + 'n', b + 'er', b + 's', b, u + 'e', u + 'er', u, st + 'en', b + 'es'];
  return shuffle([...new Set(c)].filter(x => x !== real && !(b.endsWith('e') && x === b + 'e') && !/(.)\1\1/.test(x))).slice(0, 2);
}
function mehrzahl() {
  setTitle('Mehrzahl');
  const items = weakFirst(nounPool({ plural: true }), 'pl', ST().runde);
  if (!items.length) return emptyView('Keine Wörter für diese Auswahl.');
  let i = 0, ok = 0; const wrong = [];
  const show = () => {
    if (i >= items.length) return resultView('plural', ok, items.length, wrong, mehrzahl);
    const w = items[i];
    const opts = shuffle([w.plural, ...pluralFakes(w)]);
    view.innerHTML = `${progressNav(i, items.length)}<div class="stack">
      <div class="question"><button class="icon-btn q-speak" id="spk">${ico('speaker', 20, 2)}</button>
        <div class="q-meta"><span class="chip">Einzahl</span></div>${picHTML(w)}
        <div class="q-main">${artWord(w)}</div><div class="q-sub">Wie heißt die Mehrzahl?</div></div>
      <div class="options one">${opts.map(o => `<button class="option" data-o="${esc(o)}"><span class="die-word">die</span>${esc(o)}</button>`).join('')}</div>
      <div id="fb"></div></div>`;
    $('#spk').onclick = () => say(fullText(w));
    say(fullText(w));
    let done = false;
    $$('.option').forEach(b => b.onclick = () => {
      if (done) return; done = true;
      const right = b.dataset.o === w.plural;
      grade('pl', w, right, 'plural'); beep(right);
      $$('.option').forEach(x => { if (x.dataset.o === w.plural) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); else x.classList.add('dim'); });
      say('die ' + w.plural);
      if (right) { ok++; $('#fb').innerHTML = `<div class="feedback ok"><div class="fb-title">${ico('checkCircle', 24, 2)} Richtig!</div><div class="fb-line">${artWord(w)} – die ${esc(w.plural)}</div>${w.hinweis ? ruleHTML(w) : ''}</div>`; later(() => { i++; show(); }, 1300); }
      else {
        wrong.push(w);
        $('#fb').innerHTML = `<div class="feedback no"><div class="fb-title">${ico('xmark', 24, 2.2)} Nicht ganz</div><div class="fb-line">Richtig ist: <b>die ${esc(w.plural)}</b></div>${w.hinweis ? ruleHTML(w) : ''}<div class="fb-actions"><button class="primary big" id="next">Weiter</button></div></div>`;
        $('#next').onclick = () => { i++; show(); };
      }
    });
  };
  show();
}

/* ---------- Zeitrennen ---------- */
function rennen() {
  setTitle('Zeitrennen');
  const pool = nounPool();
  if (!pool.length) return emptyView('Keine Wörter für diese Auswahl.');
  view.innerHTML = `${navBar('Zeitrennen')}<div class="result"><div class="big-emoji">⏱️</div>
    <h2>Wie viele schaffst du in 60 Sekunden?</h2><p class="muted">Dein Rekord: <b>${P().best.rennen || 0}</b></p>
    <button class="primary big" id="los" style="max-width:420px">Start</button></div>`;
  $('#los').onclick = () => {
    let queue = shuffle(pool), score = 0, total = 0, left = 60, ended = false; const wrong = [];
    const tick = setInterval(() => {
      left--; const t = $('#tmr'); if (t) { t.textContent = left + ' s'; t.classList.toggle('low', left <= 10); }
      if (left <= 0) end();
    }, 1000);
    const end = () => {
      if (ended) return; ended = true; clearInterval(tick);
      const rekord = score > (P().best.rennen || 0);
      if (rekord) P().best.rennen = score;
      addStars(Math.floor(score / 3)); logRound('rennen', score, total);
      view.innerHTML = `${navBar('Zeitrennen')}<div class="result"><div class="big-emoji">${rekord ? '🏆' : '⏱️'}</div>
        <div class="score">${score} richtig</div><h2>${rekord ? 'Neuer Rekord!' : 'Rekord: ' + P().best.rennen}</h2><p class="muted">+${Math.floor(score / 3)} Sterne</p>
        ${wrong.length ? group('Falsch beantwortet', wrong.slice(0, 12).map(w => row({ icon: thumbHTML(w), title: artWord(w) })).join('')) : ''}
        <div class="two"><button class="primary" id="again">${ico('repeat', 20, 2.2)} Nochmal</button><button class="secondary" data-close>Fertig</button></div></div>`;
      $('#again').onclick = rennen;
    };
    window.__stopTimer = () => { ended = true; clearInterval(tick); };
    const next = () => {
      if (ended) return;
      if (!queue.length) queue = shuffle(pool);
      const w = queue.pop();
      view.innerHTML = `${navBar(`<span class="timer${left <= 10 ? ' low' : ''}" id="tmr">${left} s</span>`, `<span class="pill">${ico('star', 18, 2)} ${score}</span>`)}
        <div class="stack"><div class="question">${picHTML(w)}<div class="q-main" id="qw">${esc(w.wort)}</div></div>
        <div class="art-grid">${ARTS.map(a => `<button class="art-btn ${a}" data-a="${a}">${a}</button>`).join('')}</div></div>`;
      let done = false;
      $$('.art-btn').forEach(b => b.onclick = () => {
        if (done || ended) return; done = true; total++;
        const right = b.dataset.a === w.artikel;
        grade('art', w, right, 'rennen'); beep(right);
        if (right) { score++; next(); }
        else { wrong.push(w); $('#qw').innerHTML = artWord(w); $$('.art-btn').forEach(x => x.classList.toggle('dim', x.dataset.a !== w.artikel)); later(next, 900); }
      });
    };
    next();
  };
}

/* ---------- Wörter: Hören & Schreiben ---------- */
function hoeren() {
  setTitle('Hören & Schreiben');
  const items = weakFirst(vocPool(), 'voc', ST().runde);
  if (!items.length) return emptyView('Keine Wörter für diese Auswahl.');
  let i = 0, ok = 0; const wrong = [];
  const speakWord = (w, rate) => say(w.artikel ? fullText(w) : w.wort, rate);
  const show = () => {
    if (i >= items.length) return resultView('hoeren', ok, items.length, wrong, hoeren);
    const w = items[i];
    const gap = gapSentence(w);
    view.innerHTML = `${progressNav(i, items.length)}<div class="stack">
      <div class="question">
        <div class="q-meta"><span class="chip">${esc(w.wortart)}</span></div>
        ${w.wortart === 'Nomen' ? picHTML(w) : ''}
        <div class="btn-row"><button class="primary small-btn" id="hear">${ico('speaker', 18, 2)} Hören</button>
          <button class="secondary small-btn" id="slow">${ico('turtle', 18, 2)} Langsam</button>
          ${w.beispiel ? `<button class="secondary small-btn" id="satz">${ico('bubble', 18, 2)} Satz</button>` : ''}</div>
        ${gap ? `<div class="gap-sentence">${gap}</div>` : ''}
      </div>
      <div class="field"><div class="field-label">${w.wortart === 'Nomen' ? 'Nomen ohne Artikel' : 'Deine Antwort'}</div>
        <input class="text-input typein" id="inp" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>
      <div class="key-bar">${['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map(c => `<button class="key">${c}</button>`).join('')}</div>
      <div id="fb"></div>
      <button class="primary big" id="check">Prüfen</button></div>`;
    const inp = $('#inp');
    $('#hear').onclick = () => speakWord(w);
    $('#slow').onclick = () => speakWord(w, .55);
    if ($('#satz')) $('#satz').onclick = () => say(w.beispiel);
    $$('.key').forEach(k => k.onclick = () => { const s = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, s) + k.textContent + inp.value.slice(inp.selectionEnd ?? s); inp.focus(); inp.setSelectionRange(s + 1, s + 1); });
    speakWord(w);
    setTimeout(() => inp.focus(), 50);
    let done = false;
    const check = () => {
      if (done) { i++; show(); return; }
      const v = inp.value.trim().replace(/\s+/g, ' ');
      if (!v) { inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); return; }
      done = true;
      const right = v === w.wort;
      grade('voc', w, right, 'hoeren'); beep(right);
      const ex = w.beispiel ? `<div class="fb-ex">${esc(w.beispiel)}</div>` : '';
      if (right) { ok++; $('#fb').innerHTML = `<div class="feedback ok"><div class="fb-title">${ico('checkCircle', 24, 2)} Richtig!</div><div class="fb-line">${artWord(w)}</div>${w.formen ? `<div class="fb-ex">${esc(w.formen)}</div>` : ''}${ex}</div>`; }
      else {
        wrong.push(w);
        const caseOnly = v.toLowerCase() === w.wort.toLowerCase();
        $('#fb').innerHTML = `<div class="feedback ${caseOnly ? 'almost' : 'no'}"><div class="fb-title">${ico(caseOnly ? 'triangle' : 'xmark', 24, 2)} ${caseOnly ? 'Fast! Groß oder klein?' : 'Nicht ganz'}</div>
          <div class="diff">${diffHTML(v, w.wort)}</div><div class="fb-line">Richtig: <b>${artWord(w)}</b></div>
          ${w.wortart === 'Nomen' ? '<div class="fb-ex">Nomen schreibt man groß.</div>' : ''}${ex}</div>`;
      }
      inp.blur();
      $('#check').textContent = 'Weiter';
    };
    $('#check').onclick = check;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  };
  show();
}
function diffHTML(a, b) {
  let h = '';
  for (let k = 0; k < Math.max(a.length, b.length); k++) h += `<span class="${a[k] === b[k] ? '' : 'x'}">${esc(a[k] ?? '·')}</span>`;
  return h;
}

/* ---------- Wörter: Buchstabensalat ---------- */
function salat() {
  setTitle('Buchstabensalat');
  const items = weakFirst(vocPool().filter(w => w.wort.length >= 3 && w.wort.length <= 12 && !w.wort.includes(' ')), 'voc', ST().runde);
  if (!items.length) return emptyView('Keine Wörter für diese Auswahl.');
  let i = 0, ok = 0; const wrong = [];
  const show = () => {
    if (i >= items.length) return resultView('salat', ok, items.length, wrong, salat);
    const w = items[i];
    const letters = [...w.wort];
    let mix = shuffle(letters), tries = 0;
    while (mix.join('') === w.wort && tries++ < 10) mix = shuffle(letters);
    const gap = gapSentence(w);
    view.innerHTML = `${progressNav(i, items.length)}<div class="stack">
      <div class="question"><button class="icon-btn q-speak" id="spk">${ico('speaker', 20, 2)}</button>
        <div class="q-meta"><span class="chip">${esc(w.wortart)}</span></div>
        ${w.wortart === 'Nomen' ? picHTML(w) : ''}${gap ? `<div class="gap-sentence">${gap}</div>` : ''}
        <div class="slots">${letters.map(() => '<div class="slot"></div>').join('')}</div></div>
      <div class="letters">${mix.map((c, k) => `<button class="letter" data-k="${k}">${esc(c)}</button>`).join('')}</div>
      <div class="btn-row"><button class="secondary small-btn" id="back">${ico('delete', 18, 2)} Zurück</button></div>
      <div id="fb"></div></div>`;
    const typed = [];
    const speakIt = () => say(w.artikel ? fullText(w) : w.wort);
    $('#spk').onclick = speakIt; speakIt();
    const paint = () => $$('.slot').forEach((s, k) => { const has = typed[k] !== undefined; s.textContent = has ? mix[typed[k]] : ''; s.classList.toggle('f', has); });
    let done = false;
    $$('.letter').forEach(t => t.onclick = () => {
      if (done) return;
      typed.push(+t.dataset.k); t.classList.add('used'); paint();
      if (typed.length === letters.length) {
        done = true;
        const right = typed.map(k => mix[k]).join('') === w.wort;
        grade('voc', w, right, 'salat'); beep(right);
        if (right) { ok++; $('#fb').innerHTML = `<div class="feedback ok"><div class="fb-title">${ico('checkCircle', 24, 2)} Richtig!</div><div class="fb-line">${artWord(w)}</div></div>`; speakIt(); later(() => { i++; show(); }, 1300); }
        else {
          wrong.push(w);
          $('#fb').innerHTML = `<div class="feedback no"><div class="fb-title">${ico('xmark', 24, 2.2)} Nicht ganz</div><div class="fb-line">Richtig ist: <b>${artWord(w)}</b></div><div class="fb-actions"><button class="primary big" id="next">Weiter</button></div></div>`;
          $('#next').onclick = () => { i++; show(); };
        }
      }
    });
    $('#back').onclick = () => { if (done || !typed.length) return; const k = typed.pop(); $(`.letter[data-k="${k}"]`).classList.remove('used'); paint(); };
  };
  show();
}

/* ---------- Wörter: Lernkarten ---------- */
function karten() {
  setTitle('Lernkarten');
  const items = duePool(vocPool(), 'voc', ST().runde);
  if (!items.length) return emptyView('Keine Wörter für diese Auswahl.');
  let i = 0, ok = 0; const wrong = [];
  const show = () => {
    if (i >= items.length) return resultView('karten', ok, items.length, wrong, karten);
    const w = items[i];
    const gap = gapSentence(w);
    view.innerHTML = `${progressNav(i, items.length)}
      <div class="flip" id="flip"><div class="flip-in">
        <div class="face front question">
          <div class="q-meta"><span class="chip">${esc(w.wortart)}</span><span class="chip">${esc(STUFE_NAME[w.stufe])}</span></div>
          ${w.wortart === 'Nomen' ? picHTML(w) : ''}
          ${gap ? `<div class="gap-sentence">${gap}</div>` : ''}
          <button class="secondary small-btn" id="fhear">${ico('speaker', 18, 2)} Anhören</button>
          <div class="q-sub">Anfangsbuchstabe <b>${esc(w.wort[0])}</b> · ${w.wort.length} Buchstaben</div>
          <div class="q-sub">Stell dir vor, wie man das Wort${w.artikel ? ' mit Artikel' : ''} schreibt.</div>
          <span class="link">${ico('repeat', 18, 2)} Tippen zum Umdrehen</span>
        </div>
        <div class="face back question">
          <div class="q-main">${artWord(w)}</div>
          ${w.plural ? `<div class="q-sub">Mehrzahl: <b>die ${esc(w.plural)}</b></div>` : ''}
          ${w.formen ? `<div class="q-sub">${esc(w.formen)}</div>` : ''}
          ${w.beispiel ? `<div class="gap-sentence">${esc(w.beispiel)}</div>` : ''}
          ${w.artikel ? ruleHTML(w) : ''}
        </div></div></div>
      <div class="two" id="rate" style="visibility:hidden"><button class="danger" data-r="0">Noch üben</button><button class="good" data-r="1">Gewusst</button></div>`;
    say(w.wort);
    $('#fhear').onclick = e => { e.stopPropagation(); say(w.wort); };
    $('#flip').onclick = () => {
      const f = $('#flip'); f.classList.toggle('on');
      if (f.classList.contains('on')) { $('#rate').style.visibility = 'visible'; say(w.artikel ? fullText(w) : w.wort); }
    };
    $$('#rate button').forEach(b => b.onclick = () => {
      const right = b.dataset.r === '1';
      grade('voc', w, right, 'karten');
      if (right) ok++; else wrong.push(w);
      i++; show();
    });
  };
  show();
}

/* ---------- Wortliste ---------- */
function liste() {
  setTitle('Wortliste');
  let art = 'Alle', stufe = 'Alle', q = '';
  view.innerHTML = `${navBar('Wortliste', '', true)}
    <div class="stack" style="margin-top:6px">
    <input class="text-input search" id="q" placeholder="Wort suchen" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    <div class="pill-tabs static" id="fa">${['Alle', ...WORTARTEN].map(a => `<button class="${a === 'Alle' ? 'on' : ''}" data-v="${a}">${a === 'Kleines Wort' ? 'Kleine Wörter' : a}</button>`).join('')}</div>
    <div class="segmented" id="fs">${['Alle', ...STUFEN].map(a => `<button class="${a === 'Alle' ? 'on' : ''}" data-v="${a}">${a === 'Alle' ? 'Alle' : 'Kl. ' + a}</button>`).join('')}</div>
    </div><div id="lst"></div>`;
  const draw = () => {
    const ql = q.toLowerCase();
    const arr = WORDS.filter(w => (art === 'Alle' || w.wortart === art) && (stufe === 'Alle' || w.stufe === stufe) && (!ql || w.wort.toLowerCase().includes(ql)))
      .sort((a, b) => a.wort.localeCompare(b.wort, 'de'));
    $('#lst').innerHTML = group(`${arr.length} ${arr.length === 1 ? 'Wort' : 'Wörter'}`, arr.slice(0, 400).map(w => row({
      icon: thumbHTML(w), title: artWord(w),
      sub: w.plural ? 'die ' + esc(w.plural) : w.nurPlural ? 'nur Mehrzahl' : w.formen ? esc(w.formen) : esc(w.wortart),
      detail: `<span class="small">Kl. ${w.stufe}</span>`, attrs: `data-id="${w.id}"`
    })).join('') || row({ title: '<span class="muted">Nichts gefunden</span>' }), arr.length > 400 ? 'Die ersten 400 Treffer – bitte genauer suchen.' : '');
  };
  $('#lst').onclick = e => { const b = e.target.closest('[data-id]'); if (!b) return; const w = BYID[b.dataset.id]; say((w.artikel ? fullText(w) : w.wort) + '. ' + (w.beispiel || '')); };
  $('#q').oninput = e => { q = e.target.value.trim(); draw(); };
  const chipGroup = (id, set) => $(id).onclick = e => { const b = e.target.closest('button'); if (!b) return; $$(id + ' button').forEach(x => x.classList.toggle('on', x === b)); set(b.dataset.v); draw(); };
  chipGroup('#fa', v => art = v); chipGroup('#fs', v => stufe = v);
  draw();
}

/* ---------- Merkregeln ---------- */
function regeln() {
  setTitle('Merkregeln');
  const ex = (re, a, n = 4) => NOUNS.filter(w => w.artikel === a && re.test(w.wort)).slice(0, n).map(w => artWord(w)).join(', ');
  const R = [
    ['die', 'Wörter auf -ung, -heit, -keit, -schaft', /(ung|heit|keit|schaft)$/],
    ['die', 'Wörter auf -ion, -tät, -ik, -ie, -ei', /(ion|tät|ik|ie|erei|zei)$/],
    ['die', 'Viele Wörter auf -e (aber: der Hase, der Löwe, das Auge …)', /[^e]e$/],
    ['die', 'Weibliche Personen und Wörter auf -in', /(Frau|Oma|Mutter|Schwester|Tante|in)$/],
    ['das', 'Verkleinerungen auf -chen und -lein – immer das!', /(chen|lein)$/],
    ['das', 'Wörter auf -ment, -um, -nis', /(ment|eum|rum|nis)$/],
    ['das', 'Aus Verben gemacht: das Essen, das Lesen', /^(Essen|Lesen|Schwimmen|Wissen)$/],
    ['das', 'Viele Wörter mit Ge- vorne', /^Ge(müse|schenk|witter|bäude|birge|fühl)/],
    ['das', 'Metalle', /^(Gold|Eisen)$/],
    ['der', 'Tage, Monate und Jahreszeiten', /^(Montag|Freitag|Januar|Mai|Winter|Sommer|Herbst|Frühling)$/],
    ['der', 'Männliche Personen und Berufe auf -er', /^(Vater|Opa|Bruder|Onkel|Lehrer|Bäcker|Schüler|Verkäufer)$/],
    ['der', 'Wörter auf -ling, -or, -ig, -ich', /(ling|or|ig|ich)$/],
    ['der', 'Himmelsrichtungen', /^Norden$/],
  ];
  const A = (a, w) => artWord({ artikel: a, wort: w });
  view.innerHTML = `${navBar('Merkregeln', '', true)}${pageHeader('Merkregeln', 'Tricks für der, die, das')}
    <div class="card"><h3>Zusammengesetzte Wörter</h3>
      <p>Das <b>letzte</b> Wort bestimmt den Artikel:</p>
      <p>${A('das', 'Haus')} + ${A('die', 'Aufgabe')} → ${A('die', 'Hausaufgabe')}<br>${A('die', 'Sonne')} + ${A('die', 'Blume')} → ${A('die', 'Sonnenblume')}<br>${A('das', 'Fahrrad')} wegen ${A('das', 'Rad')}</p></div>
    ${ARTS.map(a => group(`<span class="rule-art c-${a}">${a}</span>`, R.filter(r => r[0] === a).map(r => row({ title: esc(r[1]), sub: ex(r[2], a) })).join(''))).join('')}
    <div class="tip">${ico('bulb', 24, 2)}<span>Lerne jedes Nomen immer <b>mit</b> Artikel und mit Farbe: <span class="c-der">blau = der</span>, <span class="c-die">rot = die</span>, <span class="c-das">grün = das</span>. In der Mehrzahl heißt es immer <b class="c-die">die</b>.</span></div>`;
}

/* ---------- Fortschritt ---------- */
function streak() {
  if (FAM) return FAM.get().streak;
  const set = new Set(P().days); let n = 0; let d = new Date();
  if (!set.has(today())) d = new Date(Date.now() - DAY);
  while (set.has(d.toISOString().slice(0, 10))) { n++; d = new Date(d - DAY); }
  return n;
}
const tage = n => n + (n === 1 ? ' Tag' : ' Tage');
function dayChart(d) {
  const days = [];
  for (let k = 13; k >= 0; k--) { const dt = new Date(Date.now() - k * DAY).toISOString().slice(0, 10); days.push([dt, d.log.filter(l => new Date(l.t).toISOString().slice(0, 10) === dt).length]); }
  const mx = Math.max(1, ...days.map(x => x[1]));
  return `<div class="group-body"><div class="daychart">${days.map(([dt, n]) => `<div class="day" title="${n}"><div class="day-bar ${n ? '' : 'zero'}" style="height:${Math.max(4, n / mx * 100)}%"></div><span class="small muted">${new Date(dt).toLocaleDateString('de-DE', { weekday: 'narrow' })}</span></div>`).join('')}</div></div>`;
}
function fortschritt() {
  setTitle('Fortschritt');
  const d = P();
  const nouns = NOUNS.filter(w => !w.nurPlural);
  const learned = w => { const r = d.art[w.id]; return r && r.b >= 4; };
  const boxes = [0, 0, 0, 0, 0]; nouns.forEach(w => { const r = d.art[w.id]; if (r) boxes[r.b - 1]++; });
  const answers = d.log.length, right = d.log.filter(l => l.ok).length;
  const meter = (l, n, color = 'var(--green)') => `<span class="bar-meter"><span style="width:${n ? l / n * 100 : 0}%;background:${color}"></span></span>`;
  view.innerHTML = `${pageHeader('Fortschritt', esc(curProfile().avatar + ' ' + curProfile().name))}
    <div class="stat-grid">
      <div class="stat"><span class="stat-n">${ico('star', 22, 2)}${d.stars}</span>Sterne</div>
      <div class="stat"><span class="stat-n" style="color:var(--orange)">${ico('flame', 22, 2)}<span style="color:var(--label)">${streak()}</span></span>${streak() === 1 ? 'Tag' : 'Tage'} in Folge</div>
      <div class="stat"><span class="stat-n">${answers ? Math.round(right / answers * 100) : 0} %</span>richtig</div>
      <div class="stat"><span class="stat-n">${d.best.rennen || 0}</span>Rekord Zeitrennen</div>
    </div>
    <section class="group"><h2 class="group-header">Letzte 14 Tage</h2>${dayChart(d)}</section>
    <section class="group"><h2 class="group-header">Artikel-Karteikasten</h2>
      <div class="boxes">${boxes.map((c, k) => `<div class="stat"><span class="stat-n">${c}</span>Fach ${k + 1}</div>`).join('')}</div>
      <p class="group-footer">Ab Fach 4 gilt ein Wort als sicher. Sicher: ${nouns.filter(learned).length} von ${nouns.length} Nomen.</p></section>
    ${group('Artikel nach Themen', THEMEN.map(t => { const ws = nouns.filter(w => w.thema === t); const l = ws.filter(learned).length; return row({ title: t, detail: `${meter(l, ws.length)}<span class="small" style="min-width:52px;text-align:right">${l}/${ws.length}</span>` }); }).join(''))}
    ${group('Wörter richtig schreiben', STUFEN.map(s => { const ws = WORDS.filter(w => w.stufe === s); const l = ws.filter(w => { const r = d.voc[w.id]; return r && r.b >= 3; }).length; return row({ title: STUFE_NAME[s], detail: `${meter(l, ws.length, 'var(--accent)')}<span class="small" style="min-width:52px;text-align:right">${l}/${ws.length}</span>` }); }).join(''))}
    ${group('Letzte Runden', d.rounds.length ? d.rounds.slice(-10).reverse().map(r => row({ title: MODE[r.m] || r.m, sub: new Date(r.t).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }), detail: `${r.ok}/${r.n}` })).join('') : row({ title: '<span class="muted">Noch keine Runde gespielt</span>' }))}`;
  $$('.bar-meter').forEach(m => m.style.width = '120px');
}
const MODE = { quiz: 'Artikel-Quiz', kasten: 'Karteikasten', fehler: 'Fehlerwörter', sort: 'Sortieren', plural: 'Mehrzahl', rennen: 'Zeitrennen', hoeren: 'Hören & Schreiben', salat: 'Buchstabensalat', karten: 'Lernkarten', satz: 'Lückensätze', finden: 'Fehler finden', geschichte: 'Geschichten' };

/* ---------- Elternbereich ---------- */
let elternOK = false;
function eltern() {
  setTitle('Elternbereich');
  if (!elternOK) {
    const a = 6 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 7);
    view.innerHTML = `${navBar('', '', true)}<div class="aurora-bg"></div><div class="center-screen" style="min-height:70vh"><div class="glass-card">
      ${iconTile('lock', 'var(--accent)', 56)}<h1>Nur für Eltern</h1><p class="muted">Bitte rechne: <b>${a} × ${b}</b></p>
      <form id="gate"><input id="pin" inputmode="numeric" autocomplete="off" placeholder="Ergebnis"><button class="primary big">Öffnen</button></form></div></div>`;
    $('#gate').onsubmit = e => { e.preventDefault(); if (+$('#pin').value === a * b) { elternOK = true; eltern(); } else { $('#pin').classList.add('shake'); setTimeout(() => $('#pin').classList.remove('shake'), 400); } };
    return;
  }
  const d = P();
  const errs = kind => Object.entries(d[kind]).filter(([, r]) => r.err > 0).sort((x, y) => y[1].err - x[1].err).slice(0, 15).filter(([id]) => BYID[id])
    .map(([id, r]) => row({ icon: thumbHTML(BYID[id]), title: artWord(BYID[id]), sub: `${r.ok}× richtig · Fach ${r.b}`, detail: `<span style="color:var(--red);font-weight:600">${r.err}× falsch</span>` })).join('');
  view.innerHTML = `${navBar('', '', true)}${pageHeader('Elternbereich', `${esc(curProfile().avatar)} ${esc(curProfile().name)}`)}
    <div class="stat-grid">
      <div class="stat"><span class="stat-n">${d.log.length}</span>Antworten</div>
      <div class="stat"><span class="stat-n">${d.log.length ? Math.round(d.log.filter(l => l.ok).length / d.log.length * 100) : 0} %</span>richtig</div>
      <div class="stat"><span class="stat-n">${d.days.length}</span>${d.days.length === 1 ? 'Übungstag' : 'Übungstage'}</div>
      <div class="stat"><span class="stat-n">${d.stars}</span>Sterne</div></div>
    <section class="group"><h2 class="group-header">Aktivität (Antworten pro Tag)</h2>${dayChart(d)}</section>
    ${group('Häufigste Fehler – Artikel', errs('art') || row({ title: '<span class="muted">Noch keine Fehler</span>' }))}
    ${group('Häufigste Fehler – Schreiben', errs('voc') || row({ title: '<span class="muted">Noch keine Fehler</span>' }))}
    ${group('Verwaltung',
    row({ icon: iconTile('download', 'var(--blue)', 30), title: 'Export als CSV', sub: 'Alle Antworten aller Profile', chev: true, attrs: 'id="csv"' }) +
    row({ icon: iconTile('gear', 'var(--gray)', 30), title: 'Einstellungen', chev: true, attrs: 'data-go="einstellungen"' }) +
    row({ icon: iconTile('doc', 'var(--indigo)', 30), title: 'Quellen & Lizenzen', chev: true, attrs: 'data-go="quellen"' }))}
    ${group('', row({ title: 'Fortschritt zurücksetzen', attrs: 'id="reset"', cls: 'row-destructive' }), 'Zurücksetzen löscht Sterne, Karteikasten und Statistik dieses Profils. Die Einstellungen bleiben.')}`;
  $('#csv').onclick = exportCSV;
  $('#reset').onclick = () => { if (confirm(`Fortschritt von ${curProfile().name} wirklich löschen?`)) { const s = d.settings; S.data[S.current] = newData(); S.data[S.current].settings = s; save(); toast('Zurückgesetzt'); go('home'); } };
}
function exportCSV() {
  const rows = [['Profil', 'Datum', 'Uhrzeit', 'Übung', 'Wort', 'Artikel', 'Ergebnis']];
  for (const p of S.profiles) for (const l of (S.data[p.id]?.log || [])) {
    const w = BYID[l.w]; const dt = new Date(l.t);
    rows.push([p.name, dt.toLocaleDateString('de-DE'), dt.toLocaleTimeString('de-DE'), MODE[l.m] || l.m, w ? w.wort : l.w, w?.artikel || '', l.ok ? 'richtig' : 'falsch']);
  }
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `artikel-lernen-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- Einstellungen ---------- */
function einstellungen() {
  setTitle('Einstellungen');
  const s = ST();
  const voices = germanVoices();
  const cur = voice ? voice.voiceURI : '';
  const better = voices.some(v => voiceQuality(v) >= 2);
  const pick = (g, v, label, on) => row({ title: label, detail: on ? `<span style="color:var(--accent)">${ico('check', 20, 2.4)}</span>` : '', attrs: `data-g="${g}" data-v="${esc(v)}"` });
  view.innerHTML = `${navBar('', '', true)}${pageHeader('Einstellungen')}
    ${group('Klassen', STUFEN.map(x => pick('stufen', x, STUFE_NAME[x], s.stufen.includes(x))).join(''), 'Klasse 1/2 und 3/4: Grundwortschatz LehrplanPLUS Bayern. Klasse 5: Erweiterung.')}
    ${group('Themen', pick('themen', '*', 'Alle Themen', !s.themen.length) + THEMEN.map(x => pick('themen', x, x, s.themen.includes(x))).join(''), 'Gilt für die Nomen.')}
    ${group('Wortarten beim Wörter-Lernen', WORTARTEN.map(x => pick('wortarten', x, x === 'Kleines Wort' ? 'Kleine Wörter (aber, mit, nicht …)' : x, s.wortarten.includes(x))).join(''))}
    ${group('Üben',
    row({ icon: iconTile('checklist', 'var(--orange)', 30), title: 'Wörter pro Runde', detail: `<select id="runde">${[5, 10, 15, 20].map(n => `<option ${n === s.runde ? 'selected' : ''}>${n}</option>`).join('')}</select>` }) +
    row({ icon: iconTile('speaker', 'var(--green)', 30), title: 'Vorlesen', detail: toggle('tts', s.tts) }) +
    row({ icon: iconTile('bubble', 'var(--teal)', 30), title: 'Stimme', sub: voice ? `Jetzt: ${esc(voice.name)} · ${QUAL_LABEL[voiceQuality(voice)]}` : 'Keine deutsche Stimme gefunden',
      detail: `<select id="stimme"><option value="">Automatisch (beste)</option>${voices.map(v => `<option value="${esc(v.voiceURI)}" ${s.stimme && (v.voiceURI === s.stimme || v.name === s.stimme) ? 'selected' : ''}>${voiceQuality(v) === 3 ? '★ ' : ''}${esc(v.name)} – ${QUAL_LABEL[voiceQuality(v)]}</option>`).join('')}</select>` }) +
    row({ icon: iconTile('sparkles', 'var(--pink)', 30), title: 'Farben für der/die/das', sub: '<span class="c-der">blau</span> · <span class="c-die">rot</span> · <span class="c-das">grün</span>', detail: toggle('farben', s.farben) }) +
    row({ title: 'Stimme testen', attrs: 'id="test"', cls: 'row-accent' }))}
    <div class="tip">${ico('bulb', 24, 2)}<span><b>Mehr Stimmen:</b> Die App nutzt die deutschen Stimmen dieses Geräts (${voices.length} gefunden${better ? '' : ', noch keine in hoher Qualität'}).
      Weitere Stimmen laden: <b>Einstellungen → Bedienungshilfen → Lesen &amp; Sprechen → Stimmen → Deutsch</b>
      (bei älteren Systemen „Gesprochene Inhalte“). Am natürlichsten klingt <b>Anna (Premium)</b>, außerdem gibt es z.&nbsp;B. Helena, Petra, Markus und Yannick.
      Danach die App einmal ganz schließen und neu öffnen. Siri-Stimmen stehen für Web-Apps leider nicht zur Verfügung.</span></div>`;
  $$('[data-g]').forEach(b => b.onclick = () => {
    const g = b.dataset.g, v = b.dataset.v;
    if (g === 'themen' && v === '*') s.themen = [];
    else {
      const arr = s[g]; const k = arr.indexOf(v);
      if (k >= 0) { if (g !== 'themen' && arr.length === 1) return toast('Mindestens eins auswählen'); arr.splice(k, 1); } else arr.push(v);
    }
    save(); const y = scrollY; einstellungen(); scrollTo(0, y);
  });
  $$('[data-toggle]').forEach(t => t.onchange = () => { s[t.dataset.toggle] = t.checked; save(); applyColors(); });
  $('#runde').onchange = e => { s.runde = +e.target.value; save(); };
  $('#stimme').onchange = e => { s.stimme = e.target.value; save(); pickVoice(); say('der Hund, die Katze, das Pferd'); const y = scrollY; einstellungen(); scrollTo(0, y); };
  $('#test').onclick = () => say('der Hund, die Katze, das Pferd');
}
function applyColors() { document.body.classList.toggle('nocolor', !!S.current && !ST().farben); }

/* ---------- Profile ---------- */
function profile() {
  setTitle('Profile');
  if (!S.profiles.length) return neuesProfil();
  view.innerHTML = `${S.current ? navBar('', '', true) : ''}${pageHeader('Wer übt?')}
    ${group('Profile', S.profiles.map(p => row({ icon: `<span class="avatar">${esc(p.avatar)}</span>`, title: esc(p.name), sub: `${S.data[p.id]?.stars || 0} Sterne`, detail: p.id === S.current ? `<span style="color:var(--accent)">${ico('check', 20, 2.4)}</span>` : '', attrs: `data-pid="${p.id}"` })).join('') +
    row({ icon: iconTile('person', 'var(--accent)', 30), title: 'Neues Profil', attrs: 'id="neu"', cls: 'row-accent' }))}`;
  $$('[data-pid]').forEach(b => b.onclick = () => { S.current = b.dataset.pid; save(); pickVoice(); applyColors(); go('home'); });
  $('#neu').onclick = neuesProfil;
}
function neuesProfil() {
  setTitle('Neues Profil');
  document.body.classList.add('exercise');
  let av = AVATARE[Math.floor(Math.random() * AVATARE.length)];
  view.innerHTML = `${S.profiles.length ? navBar('', '', true) : ''}<div class="aurora-bg"></div><div class="center-screen" style="min-height:80vh"><div class="glass-card">
    <div style="font-size:64px;line-height:1" id="avbig">${av}</div><h1>Hallo! Wie heißt du?</h1>
    <form id="np"><input id="name" maxlength="20" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Dein Name">
    <div class="field-label" style="text-align:left;margin-top:6px">Such dir ein Bild aus</div>
    <div class="avatars">${AVATARE.map(a => `<button type="button" class="${a === av ? 'on' : ''}">${a}</button>`).join('')}</div>
    <button class="primary big">Los geht's</button></form></div></div>`;
  $$('.avatars button').forEach(b => b.onclick = () => { av = b.textContent; $('#avbig').textContent = av; $$('.avatars button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#np').onsubmit = e => {
    e.preventDefault();
    const name = $('#name').value.trim();
    if (!name) { $('#name').classList.add('shake'); setTimeout(() => $('#name').classList.remove('shake'), 400); return; }
    const id = 'p' + Date.now().toString(36);
    S.profiles.push({ id, name, avatar: av }); S.data[id] = newData(); S.current = id; save(); applyColors(); go('home');
  };
}

/* ---------- Quellen ---------- */
function quellen() {
  setTitle('Quellen & Lizenzen');
  const photos = WORDS.filter(isPhoto);
  view.innerHTML = `${navBar('', '', true)}${pageHeader('Quellen & Lizenzen')}<div class="credits">
    ${group('Wortschatz', row({ title: 'Klasse 1/2 und 3/4', sub: 'Grundwortschatz aus dem LehrplanPLUS Grundschule Bayern (ISB)' }) + row({ title: 'Klasse 5', sub: 'Eigene Erweiterung mit häufigen Wörtern der 5. Klasse' }), 'Beispielsätze, Merkregeln und Themen wurden für diese App erstellt.')}
    ${group('Bilder', row({ title: '<a href="https://openmoji.org" target="_blank" rel="noopener">OpenMoji</a>', sub: 'Hochschule für Gestaltung Schwäbisch Gmünd · CC BY-SA 4.0' }) +
    photos.map(w => row({ icon: thumbHTML(w), title: esc(w.wort), sub: `${esc(w.bildQuelle.autor)} · ${esc(w.bildQuelle.lizenz)}`, detail: `<a href="${esc(w.bildQuelle.seite)}" target="_blank" rel="noopener">Wikimedia</a>` })).join(''), 'Abstrakte Wörter (z. B. die Angst, die Freiheit) haben absichtlich kein Bild.')}
    ${group('Gestaltung', row({ title: 'ipados27-ui', sub: 'Gemeinsame Gestaltung der Lern-Apps im Stil von iPadOS 27' }))}</div>`;
}

/* ---------- Satz-Übungen (Offline-Fragenpool uebungen.json) ---------- */
let UEB = { saetze: {}, geschichten: [] };
const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
function fillSentence(s, w, art = w.artikel, cls = '') {
  const i = s.indexOf('{}');
  const before = s.slice(0, i), after = s.slice(i + 2);
  const atStart = !before.trim() || /[.!?]\s*$/.test(before);
  const a = atStart ? capFirst(art) : art;
  return { before, after, a, html: `${esc(before)}<b class="${cls}">${esc(a)} ${esc(w.wort)}</b>${esc(after)}`, text: `${before}${a} ${w.wort}${after}` };
}
function pickSentence(w) { const l = UEB.saetze[w.id] || []; return l[Math.floor(Math.random() * l.length)]; }
function satzPool() { return nounPool().filter(w => (UEB.saetze[w.id] || []).length); }

function lueckensaetze() {
  setTitle('Lückensätze');
  const items = weakFirst(satzPool(), 'art', ST().runde);
  if (!items.length) return emptyView('Keine Sätze für diese Auswahl.');
  let i = 0, ok = 0; const wrong = [];
  const show = () => {
    if (i >= items.length) return resultView('satz', ok, items.length, wrong, lueckensaetze);
    const w = items[i]; const s = pickSentence(w); const f = fillSentence(s, w);
    const gapCap = f.a !== w.artikel;
    view.innerHTML = `${progressNav(i, items.length)}<div class="stack">
      <div class="question"><button class="icon-btn q-speak" id="spk" aria-label="Vorlesen">${ico('speaker', 20, 2)}</button>
        <div class="q-meta"><span class="chip">Lückensatz</span></div>${picHTML(w)}
        <div class="sentence" id="sent">${esc(f.before)}<span class="gap">___</span> ${esc(w.wort)}${esc(f.after)}</div>
        <div class="q-sub">Welcher Artikel fehlt?</div></div>
      <div class="art-grid">${ARTS.map(a => `<button class="art-btn ${a}" data-a="${a}">${gapCap ? capFirst(a) : a}</button>`).join('')}</div>
      <div id="fb"></div></div>`;
    $('#spk').onclick = () => say(w.wort);
    let done = false;
    $$('.art-btn').forEach(b => b.onclick = () => {
      if (done) return; done = true;
      const right = b.dataset.a === w.artikel;
      grade('art', w, right, 'satz'); beep(right);
      $$('.art-btn').forEach(x => { x.classList.toggle('dim', x.dataset.a !== w.artikel); x.classList.toggle('right', x.dataset.a === w.artikel); });
      $('#sent').innerHTML = fillSentence(s, w, w.artikel, 'c-' + w.artikel).html;
      say(f.text);
      if (right) { ok++; $('#fb').innerHTML = `<div class="feedback ok"><div class="fb-title">${ico('checkCircle', 24, 2)} Richtig!</div><div class="fb-line">${artWord(w)}</div>${w.ausnahme || w.hinweis ? ruleHTML(w) + '<div class="fb-actions"><button class="primary big" id="next">Weiter</button></div>' : ''}</div>`; if (!(w.ausnahme || w.hinweis)) { later(() => { i++; show(); }, 1800); return; } }
      else { wrong.push(w); $('#fb').innerHTML = `<div class="feedback no"><div class="fb-title">${ico('xmark', 24, 2.2)} Leider falsch</div><div class="fb-line">Es heißt: <b>${artWord(w)}</b></div>${ruleHTML(w)}<div class="fb-actions"><button class="primary big" id="next">Weiter</button></div></div>`; }
      $('#next').onclick = () => { i++; show(); };
    });
  };
  show();
}

function fehlerFinden() {
  setTitle('Fehler finden');
  const items = weakFirst(satzPool(), 'art', ST().runde);
  if (!items.length) return emptyView('Keine Sätze für diese Auswahl.');
  let i = 0, ok = 0; const wrong = [];
  const show = () => {
    if (i >= items.length) return resultView('finden', ok, items.length, wrong, fehlerFinden);
    const w = items[i]; const s = pickSentence(w);
    const korrekt = Math.random() < 0.45;
    const shown = korrekt ? w.artikel : shuffle(ARTS.filter(a => a !== w.artikel))[0];
    view.innerHTML = `${progressNav(i, items.length)}<div class="stack">
      <div class="question"><div class="q-meta"><span class="chip">Fehler finden</span></div>${picHTML(w)}
        <div class="sentence" id="sent">${fillSentence(s, w, shown, 'mark').html}</div>
        <div class="q-sub">Stimmt der Artikel?</div></div>
      <div class="two"><button class="good big" data-k="1">${ico('check', 22, 2.4)} Stimmt</button><button class="bad big" data-k="0">${ico('xmark', 22, 2.4)} Falsch</button></div>
      <div id="fb"></div></div>`;
    let done = false;
    $$('[data-k]').forEach(b => b.onclick = () => {
      if (done) return; done = true;
      const right = (b.dataset.k === '1') === korrekt;
      grade('art', w, right, 'finden'); beep(right);
      $$('[data-k]').forEach(x => x.classList.toggle('dim-btn', x !== b));
      const corr = fillSentence(s, w, w.artikel, 'c-' + w.artikel);
      say(corr.text);
      const head = right
        ? `<div class="fb-title">${ico('checkCircle', 24, 2)} ${korrekt ? 'Richtig – der Satz stimmt!' : 'Gut gefunden!'}</div>`
        : `<div class="fb-title">${ico('xmark', 24, 2.2)} ${korrekt ? 'Doch, der Satz war richtig.' : 'Da war ein Fehler versteckt.'}</div>`;
      if (right) ok++; else wrong.push(w);
      $('#fb').innerHTML = `<div class="feedback ${right ? 'ok' : 'no'}">${head}<div class="fb-line">${corr.html}</div>${!korrekt && !right ? ruleHTML(w) : ''}
        ${right && korrekt ? '' : '<div class="fb-actions"><button class="primary big" id="next">Weiter</button></div>'}</div>`;
      if (right && korrekt) { later(() => { i++; show(); }, 1600); return; }
      $('#next').onclick = () => { i++; show(); };
    });
  };
  show();
}

function geschichten(idx) {
  setTitle('Geschichten');
  const all = UEB.geschichten;
  if (!all.length) return emptyView('Keine Geschichten gefunden.');
  if (idx === undefined) {
    // Fehlerwörter zuerst: Geschichten, die schwierige Wörter enthalten, stehen oben
    const errIds = new Set(errorWords(NOUNS, 'art').map(w => w.id));
    const done = P().stories || {};
    const list = all.map((g, k) => ({ g, k, hard: g.teile.filter(p => p.id && errIds.has(p.id)).length }))
      .sort((a, b) => b.hard - a.hard || (done[a.k] ? 1 : 0) - (done[b.k] ? 1 : 0) || a.k - b.k);
    view.innerHTML = `${navBar('Geschichten')}${pageHeader('Geschichten', 'Setze die richtigen Artikel in die Geschichte ein.')}
      ${group('', list.map(({ g, k, hard }) => row({
        icon: iconTile('doc', done[k] ? 'var(--green)' : 'var(--accent)', 30), title: esc(g.titel),
        sub: `${g.teile.filter(p => typeof p === 'object').length} Lücken${done[k] ? ` · zuletzt ${done[k]}` : ''}`,
        detail: hard ? `<span class="chip warn">${hard} schwer</span>` : '', chev: true, attrs: `data-story="${k}"`
      })).join(''), 'Geschichten mit deinen Fehlerwörtern stehen oben.')}`;
    $$('[data-story]').forEach(b => b.onclick = () => geschichten(+b.dataset.story));
    return;
  }
  const g = all[idx];
  const gaps = g.teile.filter(p => typeof p === 'object');
  const ans = new Array(gaps.length).fill(null);
  let active = 0, checked = false;
  const capAt = k => { // Großschreibung am Satzanfang
    let n = -1, before = '';
    for (const p of g.teile) { if (typeof p === 'object') { n++; if (n === k) break; before = ''; } else before += p; }
    return !before.trim() && k === 0 || /[.!?–]\s*$/.test(before);
  };
  const paint = () => {
    let n = -1;
    $('#story').innerHTML = g.teile.map(p => {
      if (typeof p !== 'object') return esc(p);
      n++;
      const a = ans[n]; const cap = capAt(n);
      const shownA = a ? (cap ? capFirst(a) : a) : '___';
      let cls = 'sgap';
      if (checked) cls += a === p.artikel ? ' ok' : ' no';
      else if (n === active) cls += ' active';
      if (a && !checked) cls += ' c-' + a;
      const fix = checked && a !== p.artikel ? ` <span class="fix c-${p.artikel}">${cap ? capFirst(p.artikel) : p.artikel}</span>` : '';
      return `<button class="${cls}" data-g="${n}"><span class="sa">${shownA}</span>${fix} ${esc(p.wort)}</button>`;
    }).join('');
    $$('#story [data-g]').forEach(b => b.onclick = () => { if (checked) return; active = +b.dataset.g; paint(); });
    const filled = ans.filter(Boolean).length;
    $('#cnt').textContent = `${filled}/${gaps.length}`;
    $('#check').disabled = filled < gaps.length || checked;
  };
  view.innerHTML = `${navBar(esc(g.titel), `<span class="counter" id="cnt"></span>`)}
    <div class="stack" style="margin-top:8px">
      <div class="card story" id="story"></div>
      <div class="art-grid" id="pick">${ARTS.map(a => `<button class="art-btn ${a}" data-a="${a}">${a}</button>`).join('')}</div>
      <div id="fb"></div>
      <div class="two"><button class="secondary" id="read">${ico('speaker', 20, 2)} Vorlesen</button><button class="primary" id="check" disabled>Prüfen</button></div>
    </div>`;
  $$('#pick .art-btn').forEach(b => b.onclick = () => {
    if (checked) return;
    ans[active] = b.dataset.a;
    const next = ans.findIndex((x, k) => !x && k > active);
    active = next >= 0 ? next : Math.max(0, ans.findIndex(x => !x));
    paint();
  });
  const fullStory = () => { let n = -1; return g.teile.map(p => typeof p === 'object' ? (n++, (capAt(n) ? capFirst(p.artikel) : p.artikel) + ' ' + p.wort) : p).join(''); };
  $('#read').onclick = () => say(checked ? fullStory() : g.teile.map(p => typeof p === 'object' ? '… ' + p.wort : p).join(''), .85);
  $('#check').onclick = () => {
    checked = true;
    let ok = 0; const wrong = [];
    gaps.forEach((p, k) => {
      const right = ans[k] === p.artikel; if (right) ok++;
      const w = p.id && BYID[p.id];
      if (w) { grade('art', w, right, 'geschichte'); if (!right) wrong.push(w); }
    });
    beep(ok === gaps.length);
    P().stories = P().stories || {}; P().stories[idx] = `${ok}/${gaps.length}`;
    logRound('geschichte', ok, gaps.length);
    if (ok === gaps.length) addStars(3);
    save(); paint();
    $('#pick').style.display = 'none';
    $('#fb').innerHTML = `<div class="feedback ${ok === gaps.length ? 'ok' : ok >= gaps.length / 2 ? 'almost' : 'no'}">
      <div class="fb-title">${ico(ok === gaps.length ? 'checkCircle' : 'triangle', 24, 2)} ${ok} von ${gaps.length} richtig${ok === gaps.length ? ' – super! +3 Sterne' : ''}</div>
      ${wrong.length ? `<div class="fb-line">Merke dir: ${wrong.map(w => artWord(w)).join(', ')}</div>` : ''}
      <div class="fb-actions"><button class="primary big" id="more">Nächste Geschichte</button></div></div>`;
    $('#check').textContent = 'Fertig'; $('#check').disabled = false; $('#check').onclick = () => geschichten();
    $('#more').onclick = () => geschichten((idx + 1) % all.length);
    say(fullStory(), .9);
  };
  paint();
}

/* ---------- Tabs: Heute / Artikel / Wörter / Fortschritt / Mehr ---------- */
const TABS = [['home', 'house', 'Heute'], ['artikel', 'target', 'Artikel'], ['woerter', 'books', 'Wörter'], ['fortschritt', 'chart', 'Fortschritt'], ['mehr', 'ellipsis', 'Mehr']];
function drawTabbar(active) {
  $('#tabbar').innerHTML = TABS.map(([id, icon, label]) => `<button class="tab${id === active ? ' on' : ''}" data-go="${id}" ${id === active ? 'aria-current="page"' : ''}>${ico(icon, 25, id === active ? 2.1 : 1.7)}<span class="tab-label">${label}</span></button>`).join('');
}
function filterSummary() {
  const s = ST();
  return `${s.stufen.map(x => 'Kl. ' + x).join(' + ')} · ${s.themen.length ? s.themen.length + ' Themen' : 'alle Themen'}`;
}
function home() {
  setTitle('Heute');
  const p = curProfile();
  const np = nounPool(), vp = vocPool();
  const dueArt = dueCount(np, 'art'), dueVoc = dueCount(vp, 'voc'), fehlerN = errorWords(np, 'art').length;
  const datum = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const st = streak();
  const started = np.some(w => rec('art', w.id));
  view.innerHTML = `${pageHeader(`Hallo ${esc(p.name)}!`, datum, `<span class="pill">${ico('star', 20, 2)} ${P().stars}</span>${st ? `<span class="pill"><span style="color:var(--orange);display:flex">${ico('flame', 20, 2)}</span>${st}</span>` : ''}`)}
    <div class="widget-grid">
      <button class="widget hero ${!dueArt && started ? 'success' : ''}" data-go="kasten">
        <div class="widget-top">${iconTile('tray', 'var(--accent)', 44)}${dueArt ? `<span class="widget-count">${dueArt}</span>` : ''}</div>
        <div><div class="widget-title">Karteikasten</div><div class="widget-sub">${dueArt ? `${dueArt} Artikel sind heute fällig` : started ? 'Alles wiederholt – jetzt neue Wörter lernen!' : 'Starte mit deinen ersten Wörtern'}</div></div>
        <span class="widget-cta">Jetzt starten ${ico('chevronRight', 16, 2.4)}</span></button>
      <button class="widget" data-go="quiz"><div class="widget-top">${iconTile('target', 'var(--der)', 34)}</div>
        <div><div class="widget-title">Artikel-Quiz</div><div class="widget-sub">der, die oder das?</div></div></button>
      <button class="widget" data-go="karten"><div class="widget-top">${iconTile('cards', 'var(--orange)', 34)}${dueVoc ? `<span class="widget-count">${dueVoc}</span>` : ''}</div>
        <div><div class="widget-title">Lernkarten</div><div class="widget-sub">${dueVoc ? 'Wörter sind fällig' : 'Wörter merken'}</div></div></button>
    </div>
    ${group('Heute', row({ icon: iconTile('bandage', 'var(--red)', 30), title: 'Fehlerwörter', sub: fehlerN ? 'Was noch schwerfällt' : 'Keine – super!', detail: fehlerN || '', chev: true, attrs: 'data-go="fehler"' }) +
    row({ icon: iconTile('doc', 'var(--indigo)', 30), title: 'Geschichte lesen', sub: 'Artikel in einer Geschichte einsetzen', chev: true, attrs: 'data-go="geschichten"' }) +
    row({ icon: iconTile('timer', 'var(--teal)', 30), title: 'Zeitrennen', sub: `Rekord: ${P().best.rennen || 0}`, chev: true, attrs: 'data-go="rennen"' }) +
    row({ icon: iconTile('gear', 'var(--gray)', 30), title: 'Auswahl', sub: filterSummary(), detail: `${np.length} Nomen`, chev: true, attrs: 'data-go="einstellungen"' }))}`;
}
function artikelTab() {
  setTitle('Artikel');
  const np = nounPool();
  const dueArt = dueCount(np, 'art'), fehlerN = errorWords(np, 'art').length;
  view.innerHTML = `${pageHeader('der · die · das', `${np.length} Nomen · ${filterSummary()}`)}
    <div class="tile-grid three">
      ${tileBtn('quiz', 'target', 'var(--der)', 'Artikel-Quiz', 'Bild ansehen, Artikel tippen')}
      ${tileBtn('sortieren', 'squares', 'var(--das)', 'Sortieren', 'Wörter in die richtige Kiste ziehen')}
      ${tileBtn('kasten', 'tray', 'var(--accent)', 'Karteikasten', 'Jeden Tag ein bisschen', dueArt)}
      ${tileBtn('mehrzahl', 'people', 'var(--purple)', 'Mehrzahl', 'ein Hund – viele Hunde')}
      ${tileBtn('rennen', 'timer', 'var(--teal)', 'Zeitrennen', '60 Sekunden – wie viele?')}
      ${tileBtn('fehler', 'bandage', 'var(--die)', 'Fehlerwörter', 'Was noch schwerfällt', fehlerN)}
    </div>
    <h2 class="section-title">Im Satz üben</h2>
    <div class="tile-grid three">
      ${tileBtn('saetze', 'bubble', 'var(--orange)', 'Lückensätze', 'Der passende Artikel im Satz')}
      ${tileBtn('finden', 'magnifier', 'var(--pink)', 'Fehler finden', 'Stimmt der Artikel im Satz?')}
      ${tileBtn('geschichten', 'doc', 'var(--indigo)', 'Geschichten', `${UEB.geschichten.length} Geschichten mit Lücken`)}
    </div>
    ${group('', row({ icon: iconTile('bulb', 'var(--yellow)', 30), title: 'Merkregeln', sub: '-ung → die, -chen → das …', chev: true, attrs: 'data-go="regeln"' }))}`;
}
function woerterTab() {
  setTitle('Wörter');
  const vp = vocPool(); const dueVoc = dueCount(vp, 'voc');
  view.innerHTML = `${pageHeader('Wörter lernen', `${vp.length} Wörter · ${ST().wortarten.length === WORTARTEN.length ? 'alle Wortarten' : ST().wortarten.join(', ')}`)}
    <div class="tile-grid">
      ${tileBtn('hoeren', 'headphones', 'var(--blue)', 'Hören & Schreiben', 'Wort anhören und richtig schreiben')}
      ${tileBtn('salat', 'shuffle', 'var(--pink)', 'Buchstabensalat', 'Buchstaben ordnen')}
      ${tileBtn('karten', 'cards', 'var(--orange)', 'Lernkarten', 'Umdrehen und merken', dueVoc)}
      ${tileBtn('liste', 'magnifier', 'var(--indigo)', 'Wortliste', 'Alle Wörter ansehen und anhören')}
    </div>`;
}
function mehrTab() {
  setTitle('Mehr');
  const p = curProfile();
  view.innerHTML = `${pageHeader('Mehr')}
    ${group('', row({ icon: `<span class="avatar">${esc(p.avatar)}</span>`, title: esc(p.name), sub: 'Profil wechseln in „Familie lernt“', chev: true, attrs: 'data-family' }))}
    ${group('', row({ icon: iconTile('gear', 'var(--gray)', 30), title: 'Einstellungen', sub: filterSummary(), chev: true, attrs: 'data-go="einstellungen"' }) +
    row({ icon: iconTile('bulb', 'var(--yellow)', 30), title: 'Merkregeln', chev: true, attrs: 'data-go="regeln"' }) +
    row({ icon: iconTile('magnifier', 'var(--indigo)', 30), title: 'Wortliste', chev: true, attrs: 'data-go="liste"' }))}
    ${group('', row({ icon: iconTile('lock', 'var(--accent)', 30), title: 'Elternbereich', sub: 'Statistik, Export, Verwaltung', chev: true, attrs: 'data-go="eltern"' }) +
    row({ icon: iconTile('doc', 'var(--blue)', 30), title: 'Quellen & Lizenzen', chev: true, attrs: 'data-go="quellen"' }))}`;
}

/* ---------- Router ---------- */
const TAB_ROUTES = { home, artikel: artikelTab, woerter: woerterTab, fortschritt, mehr: mehrTab };
const ROUTES = {
  ...TAB_ROUTES, profile, einstellungen, eltern, regeln, liste, quellen,
  quiz: () => { setTitle('Artikel-Quiz'); const g = () => artikelRound(weakFirst(nounPool(), 'art', ST().runde), 'quiz', g); g(); },
  fehler: () => { setTitle('Fehlerwörter'); const g = () => artikelRound(errorWords(nounPool(), 'art').slice(0, ST().runde), 'fehler', g); g(); },
  kasten: kastenStart, sortieren, mehrzahl, rennen, hoeren, salat, karten,
  saetze: lueckensaetze, finden: fehlerFinden, geschichten: () => geschichten(),
};
function render() {
  RUN++;
  if (window.__stopTimer) { window.__stopTimer(); window.__stopTimer = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  let r = (location.hash || '#home').slice(1);
  if (r === 'profile') { toFamily(); return; }
  if (!S.current || !S.data[S.current]) { toFamily(); return; }
  if (S.current) { const d = P(); for (const k of ['art', 'voc', 'pl']) d[k] = d[k] || {}; applyColors(); }
  const isTab = r in TAB_ROUTES;
  if (isTab) { lastTab = r; drawTabbar(r); }
  document.body.classList.toggle('exercise', !isTab);
  (ROUTES[r] || home)();
  if (isTab) $('.large-header')?.insertAdjacentHTML('afterbegin', `<div class="lh-leading"><button class="glass-btn with-text" data-family aria-label="Familie lernt">${ico('chevronLeft', 20, 2.2)}<span>Familie</span></button></div>`);
  window.scrollTo(0, 0);
  onScroll();
}
function onScroll() {
  const y = window.scrollY;
  $$('.scroll-edge').forEach(el => el.classList.toggle('show', y > 44));
  $$('.navbar').forEach(el => el.classList.toggle('scrolled', y > 4));
}
window.addEventListener('scroll', onScroll, { passive: true });
document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]');
  if (c) { e.preventDefault(); go(closeTarget()); return; }
  if (e.target.closest('[data-family]')) { e.preventDefault(); toFamily(); return; }
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const s = e.target.closest('[data-say]');
  if (s) say(s.dataset.say);
});
window.addEventListener('hashchange', render);

// Daten und Profil aus der Familien-App (entschlüsseltes content.enc.json)
import(new URL('../../js/bridge.js', document.baseURI).href).then(b => b.enter('artikel')).then(ctx => {
  const ws = ctx.file('artikel/words.json');
  let ue = null; try { ue = ctx.file('artikel/uebungen.json'); } catch (e) { }
  WORDS = ws; NOUNS = ws.filter(w => w.wortart === 'Nomen');
  ws.forEach(w => BYID[w.id] = w);
  if (ue) UEB = ue;
  const fp = ctx.profile;
  const p = S.profiles.find(x => x.id === fp.id);
  if (p) Object.assign(p, { name: fp.name, avatar: fp.avatar }); else S.profiles.push({ id: fp.id, name: fp.name, avatar: fp.avatar });
  if (!S.data[fp.id]) S.data[fp.id] = newData();
  S.current = fp.id;
  FAM = ctx.rewards;
  FAM.seed(P().stars || 0, P().days || []); // bisherige Sterne/Tage einmalig übernehmen
  P().stars = FAM.get().stars;
  save(); pickVoice(); applyColors();
  if (!location.hash || location.hash === '#profile') location.replace('#home');
  render();
}).catch(e => { view.innerHTML = '<p style="padding:24px">Wörter konnten nicht geladen werden. Bitte neu laden.</p>'; console.error(e); });
// Offline-Caching übernimmt der Service Worker der Familien-App.
