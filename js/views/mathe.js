// Mathe · Klasse 4 (Bayern): Startseite, Themen, Übungsrunde, Fehler wiederholen.
// Aufgaben werden vom Generator (js/mathe) erzeugt und bewertet; Aufgaben-Texte sind Deutsch,
// Erklärungen Deutsch und Chinesisch.
import * as S from '../store.js';
import { t, tr, getLang } from '../i18n.js';
import { h, go, put, group, row, chip, iconTile, ico, navBar, progressTrack, segmented, backLink, pageHeader } from '../ui.js';
import { avatarButton, rewardPills, starGain } from './common.js';
import { course } from '../registry.js';
import { SKILLS, LEVELS, skill, session, regenerate, template } from '../mathe/templates.js';
import { grade, TAGS } from '../mathe/grade.js';
import { fmt, paramKey } from '../mathe/core.js';

const ROUND = 8;

/* ---------- Speicher (pro Familienprofil, wie alle Kurse) ---------- */
function M() {
  const pr = S.progress('mathe');
  return (pr.mathe ||= { level: {}, stats: {}, tags: {}, wrong: {}, seen: [] });
}
const levelOf = (sk) => M().level[sk] || 1;
function saveResult(item, res, { review = false, hints = 0 } = {}) {
  const m = M();
  const st = (m.stats[item.skill] ||= { n: 0, final: 0, process: 0, processN: 0 });
  st.n++; st.final += res.finalScore;
  if (res.processScore != null) { st.process += res.processScore; st.processN++; }
  for (const tag of res.tags) m.tags[tag] = (m.tags[tag] || 0) + 1;
  S.addStars(res.finalOk ? 1 : 0, 'mathe'); // 星星与学习日：全家统一
  if (res.allOk && hints < 3) delete m.wrong[item.id];
  else if (!res.allOk) m.wrong[item.id] = { templateId: item.templateId, level: item.difficulty, params: item.parameters, seed: item.seed, at: Date.now(), tags: res.tags };
  if (!review) {
    m.seen.push(paramKey(item.templateId, item.difficulty, item.parameters));
    if (m.seen.length > 600) m.seen.splice(0, m.seen.length - 600);
  }
  S.touchCourse('mathe');
  S.save(true);
}
export const matheWrongCount = () => (S.enrollment('mathe') && !S.enrollment('mathe').hidden ? Object.keys(M().wrong).length : 0);

/* ---------- Startseite ---------- */
export function renderMatheHome(root) {
  const reg = course('mathe');
  if (!S.enrollment('mathe') || S.enrollment('mathe').hidden) S.addCourse('mathe');
  const m = M();
  const wrongN = Object.keys(m.wrong).length;
  const focus = topTags(3);
  put(root, 'append',
    pageHeader(tr(reg.title), { sub: t('m.sub'), leading: backLink('#/courses', t('nav.courses')), trailing: avatarButton() }),
    rewardPills(),
    h('div', { class: 'widget-grid' },
      widget({ hero: true, icon: 'sparkles', title: t('m.mix'), sub: t('m.mixSub'), cta: t('common.start'), href: '#/mathe/play/mix', attr: 'mix' }),
      widget({ icon: 'target', color: 'var(--orange)', title: t('m.focus'), sub: focus.length ? focus.map((x) => tagName(x[0])).join(' · ') : t('m.focusNone'), href: focus.length ? '#/mathe/play/focus' : null, attr: 'focus' }),
      widget({ icon: 'repeat', color: wrongN ? 'var(--red)' : 'var(--green)', count: wrongN || null, title: t('m.wrong'), sub: wrongN ? t('m.wrongSub', { n: wrongN }) : t('m.wrongNone'), href: wrongN ? '#/mathe/play/wrong' : null, attr: 'wrong' })),
    group(t('m.topics'), SKILLS.map((s) => {
      const st = m.stats[s.id];
      const sub = [LEVELS[levelOf(s.id)].de, st ? t('m.acc', { p: Math.round((st.final / st.n) * 100), n: st.n }) : null].filter(Boolean).join(' · ');
      return row({ icon: iconTile(s.icon, 'var(--blue)', 34), title: s.de, sub: getLang() === 'zh' ? `${s.zh} · ${sub}` : sub, chev: true, href: `#/mathe/skill/${s.id}`, attrs: { 'data-skill': s.id } });
    })),
    Object.keys(m.tags).length ? group(t('m.tags'), Object.entries(m.tags).sort((a, b) => b[1] - a[1]).map(([k, n]) =>
      row({ title: tagName(k), detail: chip('× ' + n, k === 'pending' ? '' : 'warn') })), t('m.tagsNote')) : null,
  );
}
function widget({ hero, icon, color, title, sub, count, cta, href, attr }) {
  return h('button', { type: 'button', class: 'widget' + (hero ? ' hero' : ''), disabled: !href, 'data-m': attr, onclick: () => href && go(href) },
    h('div', { class: 'widget-top' }, iconTile(icon, color || 'var(--accent)', hero ? 44 : 34), count ? h('span', { class: 'widget-count' }, count) : null),
    h('div', {}, h('div', { class: 'widget-title' }, title), sub ? h('div', { class: 'widget-sub' }, sub) : null),
    cta ? h('span', { class: 'widget-cta' }, cta, ' ', ico('chevronRight', 16, 2.4)) : null);
}
const tagName = (k) => (getLang() === 'zh' ? TAGS[k]?.zh : TAGS[k]?.de) || k;
function topTags(n) {
  return Object.entries(M().tags).filter(([k]) => k !== 'pending').sort((a, b) => b[1] - a[1]).slice(0, n);
}

/* ---------- Thema ---------- */
export function renderMatheSkill(root, id) {
  const s = skill(id);
  if (!s) return go('#/mathe');
  const lv = levelOf(id);
  const st = M().stats[id];
  put(root, 'append',
    pageHeader(s.de, { sub: s.zh, leading: backLink('#/mathe', tr(course('mathe').title)), trailing: avatarButton() }),
    group(t('m.level'), [h('div', { class: 'seg-row' }, segmented([1, 2, 3].map((l) => [l, String(l)]), lv, (v) => { M().level[id] = v; S.save(); }, 'data-mlevel'))],
      getLang() === 'zh' ? LEVELS[lv].textZh : LEVELS[lv].textDe),
    h('button', { type: 'button', class: 'primary big', 'data-mstart': id, onclick: () => go(`#/mathe/play/${id}`) }, ico('play', 18, 2.2), t('m.practice', { n: ROUND })),
    group(t('m.types'), s.templates.filter((tid) => (template(tid).levels || [1, 2, 3]).includes(lv)).map((tid) => {
      const tp = template(tid);
      return row({ title: tp.titleDe, sub: getLang() === 'zh' ? tp.titleZh : null });
    })),
    st ? group(t('m.stats'), [row({ title: t('m.acc', { p: Math.round((st.final / st.n) * 100), n: st.n }), sub: st.processN ? t('m.proc', { p: Math.round((st.process / st.processN) * 100) }) : null })]) : null,
  );
}

/* ---------- Übungsrunde ---------- */
export function renderMathePlay(root, mode) {
  document.body.classList.add('fullscreen');
  const m = M();
  let items = [];
  let title;
  if (mode === 'wrong') {
    items = Object.values(m.wrong).sort((a, b) => b.at - a.at).slice(0, ROUND).map((w) => regenerate(w.templateId, w.level, w.params, w.seed));
    title = t('m.wrong');
  } else if (mode === 'focus') {
    const tags = topTags(3).map((x) => x[0]);
    const tids = SKILLS.flatMap((s) => s.templates).filter((tid) => FOCUS[tid]?.some((tg) => tags.includes(tg)));
    const lvl = 2;
    items = session('mix', lvl, ROUND, { templates: tids.length ? tids : undefined, seen: new Set(m.seen) });
    title = t('m.focus');
  } else if (mode === 'mix') {
    items = SKILLS.flatMap((s) => session(s.id, levelOf(s.id), 2, { seen: new Set(m.seen) })).sort(() => Math.random() - 0.5).slice(0, ROUND + 2);
    title = t('m.mix');
  } else {
    const s = skill(mode);
    if (!s) return go('#/mathe');
    items = session(mode, levelOf(mode), ROUND, { seen: new Set(m.seen) });
    title = s.de;
  }
  if (!items.length) return go('#/mathe');
  runRound(root, { items, title, review: mode === 'wrong', back: mode === 'wrong' || mode === 'mix' || mode === 'focus' ? '#/mathe' : `#/mathe/skill/${mode}` });
}

// welche Vorlagen welche Schwerpunkte üben (für „Meine Schwerpunkte“)
const FOCUS = {
  'P-ausdruck': ['tens-division-zero', 'table-error', 'order-of-ops'], 'P-paar': ['tens-division-zero'], 'P-fehler': ['tens-division-zero', 'table-error', 'missing-step'],
  'M-halbschriftlich': ['table-error', 'sum-error', 'missing-step'], 'D-halbschriftlich': ['split-missing', 'table-error', 'missing-step'],
  'R-wort': ['times-vs-part'], 'R-text': ['times-vs-part'], 'R-ergaenzen': ['times-vs-part'], 'R-richtung': ['times-vs-part'],
  'U-einschritt': ['times-vs-part', 'missing-step'], 'U-zweischritt': ['inverse-order', 'times-vs-part', 'missing-step'], 'U-pfeil': ['inverse-order'],
  'Z-vergleichen': ['high-digit'], 'Z-ordnen': ['high-digit'], 'Q-ergebnis': ['table-error'], 'Q-faktor': ['table-error'],
};

function explainLang() {
  const p = S.current();
  const pref = p.explainLang && p.explainLang !== 'auto' ? p.explainLang : p.uiLang;
  return pref === 'zh' ? 'zh' : 'de';
}

function runRound(root, { items, title, review, back }) {
  const queue = [...items];
  let i = 0; let finals = 0; let total = 0;
  const bar = h('div', {});
  const body = h('div', { class: 'play-body' });
  put(root, 'append', bar, body);

  const show = () => {
    const item = queue[i];
    bar.replaceChildren(navBar({
      leading: h('a', { class: 'glass-btn', href: back, 'aria-label': t('common.close') }, ico('xmark', 20, 2.2)),
      center: h('div', { class: 'nb-progress' }, h('span', { class: 'nb-title' }, title), progressTrack(i / queue.length)),
      trailing: h('span', { class: 'counter' }, `${i + 1}/${queue.length}`),
    }));
    const resp = {};
    const ui = renderItem(item, resp);
    let hints = 0;
    const hintBox = h('div', { class: 'm-hints' });
    const hintBtn = h('button', { type: 'button', class: 'secondary', 'data-hint': '' }, ico('bulb', 18, 2), t('m.hint'));
    hintBtn.onclick = () => {
      hints = Math.min(3, hints + 1);
      const zh = explainLang() === 'zh';
      hintBox.append(h('div', { class: 'tip m-hint', 'data-hint-level': hints }, ico('bulb', 20, 2),
        h('div', {}, h('div', { lang: 'de' }, item.hintsDe[hints - 1]), zh ? h('div', { class: 'muted small' }, item.hintsZh[hints - 1]) : null)));
      if (hints >= 3) hintBtn.disabled = true;
      hintBtn.lastChild.textContent = hints === 1 ? t('m.hint2') : t('m.hint3');
    };
    const check = h('button', { type: 'button', class: 'primary', 'data-mcheck': '' }, t('common.check'));
    const actions = h('div', { class: 'm-actions' }, hintBtn, check);
    const after = h('div', { class: 'm-after' });
    check.onclick = () => {
      ui.collect();
      const res = grade(item, resp);
      ui.mark(res);
      saveResult(item, res, { review, hints });
      total++; if (res.finalOk) finals++;
      actions.remove();
      const next = h('button', { type: 'button', class: 'primary big', 'data-mnext': '' }, i + 1 < queue.length ? t('common.next') : t('common.done'), ico('chevronRight', 18, 2.4));
      next.onclick = () => { if (i + 1 < queue.length) { i++; show(); window.scrollTo(0, 0); } else finish(); };
      // Ursache unklar → Nachfrage: gleiche Zahlen mit Rechenweg-Hilfe
      let follow = null;
      if (res.pending && !item.followUp) {
        const f = followUp(item);
        if (f) { queue.splice(i + 1, 0, f); follow = h('p', { class: 'banner m-follow' }, ico('pencil', 20, 2), h('span', { lang: 'de' }, 'Zeig mir deinen Rechenweg: Die nächste Aufgabe hat dieselben Zahlen, mit Hilfen.')); }
      }
      put(after, 'replaceChildren', feedback(item, res, hints), follow, h('div', { class: 'sticky-bottom' }, next));
    };
    put(body, 'replaceChildren',
      item.followUp ? h('p', { class: 'muted small' }, t('m.followUp')) : null,
      h('div', { class: 'card m-card', 'data-mitem': item.id, 'data-template': item.templateId },
        h('div', { class: 'q-meta' }, chip(template(item.templateId).titleDe), chip(LEVELS[item.difficulty].de.split(' ·')[0])),
        h('p', { class: 'm-prompt', lang: 'de' }, item.promptDe),
        ui.el),
      hintBox, actions, after);
  };
  const finish = () => {
    const perfect = total > 0 && finals === total;
    if (perfect) S.addStars(3, 'mathe');
    S.save(true);
    bar.replaceChildren(navBar({ leading: h('a', { class: 'glass-btn', href: back }, ico('xmark', 20, 2.2)), center: h('div', { class: 'nb-progress' }, h('span', { class: 'nb-title' }, title), progressTrack(1)) }));
    put(body, 'replaceChildren', h('div', { class: 'result', 'data-mfinished': '' },
      h('div', { class: 'big-emoji' }, finals === total ? '🏆' : '🎉'),
      h('h2', { lang: 'de' }, 'Geschafft!'),
      h('p', { class: 'muted' }, t('m.result', { a: finals, b: total })),
      h('div', { class: 'reward-line' }, starGain(finals + (perfect ? 3 : 0)), perfect ? h('span', { class: 'muted small' }, t('rw.bonus')) : null),
      rewardPills(),
      h('div', { class: 'result-actions' },
        h('a', { class: 'primary big', href: back }, t('common.done')))));
  };
  show();
}

function followUp(item) {
  const tpl = template(item.templateId);
  const p = item.parameters;
  let f = null;
  if (item.templateId === 'M-halbschriftlich' || item.templateId === 'D-halbschriftlich') f = regenerate(tpl.id, 1, { ...p, mode: 'a' }, item.seed);
  else if (item.templateId.startsWith('U-einschritt') || item.templateId.startsWith('U-zweischritt')) f = regenerate(tpl.id, 1, p, item.seed);
  if (f) f.followUp = true;
  return f;
}

/* ---------- Rückmeldung ---------- */
function feedback(item, res, hints) {
  const lang = explainLang();
  const exp = h('div', { class: 'm-explain' });
  const showExp = (l) => {
    exp.replaceChildren(
      h('div', { class: 'm-steps' }, item.solutionSteps.map((s) => h('div', { class: 'm-step', lang: l === 'zh' ? 'zh-Hans' : 'de' }, l === 'zh' ? s.zh : s.de))),
      h('p', { lang: l === 'zh' ? 'zh-Hans' : 'de' }, l === 'zh' ? item.explanationZh : item.explanationDe));
  };
  showExp(lang);
  const seg = segmented([['de', 'Deutsch'], ['zh', '中文']], lang, (v) => { seg.querySelectorAll('button').forEach((b) => { const on = b.dataset.elang === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); showExp(v); }, 'data-elang');
  const proc = res.processScore;
  return h('div', { class: 'feedback ' + (res.allOk ? 'ok' : res.finalOk ? 'almost' : 'no'), 'data-mresult': res.allOk ? 'ok' : res.finalOk ? 'almost' : 'bad' },
    h('div', { class: 'fb-title', lang: 'de' }, ico(res.allOk ? 'checkCircle' : res.finalOk ? 'checkCircle' : 'xmark', 24, 2.2),
      res.allOk ? 'Richtig!' : res.finalOk ? 'Ergebnis richtig – schau dir den Rechenweg an.' : 'Noch nicht ganz.', res.finalOk ? starGain(1) : null),
    h('div', { class: 'm-scores' },
      chip(`${t('m.final')}: ${res.finalScore === 1 ? '✓' : Math.round(res.finalScore * 100) + ' %'}`, res.finalScore === 1 ? 'okc' : 'warn'),
      proc != null ? chip(`${t('m.process')}: ${Math.round(proc * 100)} %`, proc === 1 ? 'okc' : 'warn') : null,
      hints ? chip(t('m.hintsUsed', { n: hints })) : null),
    res.tags.length ? h('div', { class: 'm-tags' }, res.tags.map((k) => chip(tagName(k), 'warn'))) : null,
    h('div', { class: 'm-explain-head' }, h('span', { class: 'field-label' }, t('m.explain')), seg),
    exp);
}

/* ---------- Darstellung der Aufgabe ---------- */
function numInput(f, resp, extraCls = '') {
  const el = h('input', { class: 'm-in ' + extraCls, inputmode: 'numeric', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': f.id, 'data-field': f.id, style: { '--w': Math.max(2, Math.min(7, f.width || 3)) } });
  el.addEventListener('input', () => { resp[f.id] = el.value; });
  return el;
}

function renderItem(item, resp) {
  const els = {};
  const byId = Object.fromEntries(item.fields.map((f) => [f.id, f]));
  const wrap = h('div', { class: 'm-body' });

  if (item.widget) return splitWidget(item, resp);

  const make = (f) => {
    if (f.kind === 'number') return (els[f.id] = numInput(f, resp));
    if (f.kind === 'signed') {
      let sign = '';
      const inp = numInput(f, resp, 'signed');
      const s = segmented([['+', '+'], ['−', '−']], null, (v) => { sign = v; s.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.sign === v)); sync(); }, 'data-sign');
      s.classList.add('m-sign');
      const sync = () => { resp[f.id] = inp.value.trim() ? (sign === '−' ? '-' : sign === '+' ? '+' : '') + inp.value.trim() : ''; };
      inp.addEventListener('input', sync);
      const box = h('span', { class: 'm-signed', 'data-field': f.id }, s, inp);
      els[f.id] = box;
      return box;
    }
    if (f.kind === 'choice') {
      const long = f.options.some((o) => o.length > 2);
      const box = h('span', { class: 'm-choice' + (long ? ' long' : ''), 'data-field': f.id, role: 'radiogroup' }, f.options.map((o) =>
        h('button', { type: 'button', 'data-opt': o, lang: 'de', onclick: (e) => { resp[f.id] = o; box.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, o)));
      els[f.id] = box;
      return box;
    }
    if (f.kind === 'pick') {
      const slot = h('button', { type: 'button', class: 'm-slot', 'data-field': f.id, onclick: () => { if (resp[f.id]) { resp[f.id] = undefined; slot.textContent = ''; refreshChips(); } } });
      els[f.id] = slot;
      return slot;
    }
    if (f.kind === 'multi') {
      resp[f.id] = [];
      const box = h('div', { class: 'm-multi', 'data-field': f.id }, f.options.map((o) =>
        h('button', { type: 'button', class: 'm-chip', 'data-opt': o, onclick: (e) => {
          const set = new Set(resp[f.id]); set.has(o) ? set.delete(o) : set.add(o); resp[f.id] = [...set];
          e.currentTarget.classList.toggle('on', set.has(o));
        } }, fmt(Number(o)))));
      els[f.id] = box;
      return box;
    }
    return h('span', {}, '?');
  };

  // Ordnen: Zahlen antippen → nächster freier Platz
  let chipsBox = null;
  const refreshChips = () => {
    if (!chipsBox) return;
    const used = new Set(item.fields.map((f) => resp[f.id]).filter(Boolean));
    chipsBox.querySelectorAll('button').forEach((b) => { b.disabled = used.has(b.dataset.opt); });
  };
  if (item.answerType === 'order') {
    chipsBox = h('div', { class: 'm-multi m-pick' }, item.choices.map((o) => h('button', { type: 'button', class: 'm-chip', 'data-opt': o, onclick: () => {
      const f = item.fields.find((x) => !resp[x.id]);
      if (!f) return;
      resp[f.id] = o; els[f.id].textContent = fmt(Number(o)); refreshChips();
    } }, fmt(Number(o)))));
  }

  put(wrap, 'append', chipsBox, item.layout.map((line) => h('div', { class: 'm-line' + (item.answerType === 'order' ? ' m-order' : '') }, line.map((tok) => (typeof tok === 'string' ? h('span', { class: 'm-text', lang: 'de' }, tok) : make(byId[tok.f]))))));

  return {
    el: wrap,
    collect() { for (const f of item.fields) if (f.kind === 'number' && els[f.id]) resp[f.id] = els[f.id].value; },
    mark(res) {
      for (const f of item.fields) {
        const el = els[f.id]; const r = res.fields[f.id];
        if (!el || !r) continue;
        el.classList.add(r.ok ? 'ok' : 'bad');
        el.querySelectorAll?.('button').forEach((b) => { b.disabled = true; });
        if (el.tagName === 'INPUT') el.disabled = true;
        if (!r.ok && f.kind !== 'multi' && f.kind !== 'pick' && f.rule?.type !== 'apply') el.after(h('span', { class: 'm-correct', lang: 'de' }, '→ ' + (f.kind === 'signed' ? (f.answer > 0 ? '+' : '−') + fmt(Math.abs(f.answer)) : typeof f.answer === 'number' ? fmt(f.answer) : f.answer)));
        if (f.kind === 'multi') el.querySelectorAll('button').forEach((b) => b.classList.toggle('should', f.answer.includes(b.dataset.opt)));
        if (f.kind === 'pick' && !r.ok) el.after(h('span', { class: 'm-correct' }, '→ ' + fmt(Number(f.answer))));
      }
      chipsBox?.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    },
  };
}

/* ---------- Halbschriftlich: Zeilen-Widget ---------- */
function splitWidget(item, resp) {
  const w = item.widget;
  const mult = w.kind === 'mult';
  const els = {};
  const inp = (id, width = 4) => (els[id] = numInput({ id, width }, resp));
  const rowsBox = h('div', { class: 'm-rows' });
  let count = 0;
  const addRow = () => {
    const i = count++;
    const part = w.given ? h('span', { class: 'm-text' }, fmt(w.rows[i])) : inp('part_' + i, mult ? 3 : 4);
    rowsBox.append(h('div', { class: 'm-line', 'data-row': i },
      mult ? [h('span', { class: 'm-text' }, `${w.a} · `), part, h('span', { class: 'm-text' }, ' = '), inp('prod_' + i, 5)]
        : [part, h('span', { class: 'm-text' }, ` : ${w.d} = `), inp('quo_' + i, 3)]));
  };
  const n0 = w.open ? 2 : w.rows.length;
  for (let k = 0; k < n0; k++) addRow();
  const addBtn = w.open ? h('button', { type: 'button', class: 'link m-addrow', 'data-addrow': '', onclick: () => { if (count < 6) addRow(); } }, ico('plus', 16, 2.4), h('span', { lang: 'de' }, 'Zeile hinzufügen')) : null;
  const head = mult ? `${w.a} · ${fmt(w.b)}` : `${fmt(w.n)} : ${w.d}`;
  const el = h('div', { class: 'm-body m-split' },
    h('div', { class: 'm-line m-head' }, h('span', { class: 'm-text' }, head)),
    w.given ? h('p', { class: 'muted small', lang: 'de' }, `${mult ? fmt(w.b) : fmt(w.n)} = ${w.rows.map(fmt).join(' + ')}`) : null,
    rowsBox, addBtn,
    h('div', { class: 'm-line m-sum' }, h('span', { class: 'm-text', lang: 'de' }, mult ? 'Teilergebnisse zusammen: ' : 'Teilergebnisse zusammen: '), inp('sum', mult ? 5 : 3)),
    h('div', { class: 'm-line m-final' }, h('span', { class: 'm-text' }, `${head} = `), inp('final', 5)),
    !mult ? h('div', { class: 'm-line m-probe' }, h('span', { class: 'm-text', lang: 'de' }, `Probe: (dein Ergebnis) · ${w.d} = `), inp('probe', 4)) : null);
  return {
    el,
    collect() { for (const [id, e] of Object.entries(els)) resp[id] = e.value; },
    mark(res) {
      for (const [id, e] of Object.entries(els)) {
        const r = res.fields[id];
        e.disabled = true;
        if (r) e.classList.add(r.ok ? 'ok' : 'bad');
        if (r && !r.ok && r.expected != null && !id.startsWith('part_')) e.after(h('span', { class: 'm-correct' }, '→ ' + fmt(r.expected)));
      }
      addBtn?.remove();
    },
  };
}

