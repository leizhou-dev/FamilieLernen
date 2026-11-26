// 练习引擎：词卡、客观题（选择/填空）、开放练习（写作）、口语。
// 听力/阅读的材料放在 activity.stimulus，题目照常放在 items。
import * as S from '../store.js';
import { course } from '../registry.js';
import { t, tr, pickExplain } from '../i18n.js';
import { h, go, put, toast, ico, chip, navBar, progressTrack, group, row } from '../ui.js';
import { loadUnit, hasItems, findItems } from '../content.js';
import { typeTile, typeIconName } from './structured.js';

const GRADED = new Set(['card', 'choice', 'input']);
const norm = (s) => String(s).trim().replace(/\s+/g, ' ').replace(/[.!?。]+$/, '');

/* ---------- 朗读 / 录音 ---------- */
function speak(text, lang = 'de-DE') {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/^[\wÄÖÜäöüß]+:\s*/gm, ''));
  u.lang = lang;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

function recorder() {
  const box = h('div', { class: 'stack-sm' });
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    box.append(h('p', { class: 'muted small' }, t('play.recordUnavailable')));
    return box;
  }
  let rec = null; let chunks = []; let url = null;
  const audio = h('audio', { controls: true, hidden: true });
  const label = () => [ico('mic', 20, 2.2), t('play.record')];
  const btn = h('button', { type: 'button', class: 'secondary big', 'data-record': '' }, label());
  btn.onclick = async () => {
    if (rec?.state === 'recording') { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      rec = new MediaRecorder(stream); chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((x) => x.stop());
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
        audio.src = url; audio.hidden = false;
        btn.className = 'secondary big';
        btn.replaceChildren(...label());
      };
      rec.start();
      btn.className = 'bad big';
      btn.replaceChildren(ico('stop', 20, 2.2), t('play.stop'));
    } catch { toast(t('play.recordUnavailable')); }
  };
  box.append(btn, audio, h('p', { class: 'muted small center' }, t('play.recordNote')));
  return box;
}

/* ---------- 材料 ---------- */
function stimulusBlock(activity, open) {
  const st = activity?.stimulus;
  if (!st) return null;
  const box = h('details', { class: 'card stimulus', open: open || null },
    h('summary', {}, typeTile(activity.type, 28), h('span', {}, activity.type === 'listening' ? t('type.listening') : t('play.text'))));
  if (st.text) box.append(h('p', { class: 'de-text', lang: 'de' }, st.text));
  if (activity.type === 'listening') {
    if (st.audio) box.append(h('audio', { controls: true, src: st.audio, preload: 'none' }));
    else if (st.transcript) {
      box.append(h('div', { class: 'listen-row' },
        h('button', { type: 'button', class: 'primary', 'data-tts': '', onclick: () => speak(st.transcript) }, ico('play', 18, 2.2), t('play.listen')),
        h('span', { class: 'muted small' }, t('play.ttsNote'))));
    }
    if (st.transcript) {
      const tx = h('p', { class: 'de-text', lang: 'de', hidden: true }, st.transcript);
      const tb = h('button', { type: 'button', class: 'link' }, t('play.showTranscript'));
      tb.onclick = () => { tx.hidden = !tx.hidden; tb.textContent = t(tx.hidden ? 'play.showTranscript' : 'play.hideTranscript'); };
      box.append(tb, tx);
    }
  }
  return box;
}

function explainBlock(explain) {
  const ex = pickExplain(explain, S.current().explainLang);
  if (!ex) return null;
  return h('div', { class: 'explain', 'data-explain-lang': ex.lang || '' },
    h('small', {}, ex.fallback && ex.lang ? t('play.explainIn', { lang: t('lang.' + ex.lang) }) : t('play.explain')),
    h('p', {}, ex.text));
}

function feedback(ok, answer, explain) {
  return h('div', { class: 'feedback ' + (ok ? 'ok' : 'no'), 'data-result': ok ? 'ok' : 'bad' },
    h('div', { class: 'fb-title' }, ico(ok ? 'checkCircle' : 'xmark', 24, 2.2), ok ? t('play.correct') : t('play.wrong')),
    ok ? null : h('p', {}, t('play.answerIs', { a: answer })),
    explainBlock(explain));
}

const qMain = (text) => h('div', { class: 'q-main' + (text.length > 22 ? ' long' : ''), lang: 'de' }, text);

/* ---------- 单题 ---------- */
function renderItem(item, activity, saved, answered) {
  const wrap = h('div', { class: 'item', 'data-item': item.id, 'data-kind': item.kind });
  const meta = h('div', { class: 'q-meta' }, chip(t('type.' + activity.type)));

  if (item.kind === 'card') {
    const back = pickExplain(item.back, S.current().explainLang);
    const card = h('button', { type: 'button', class: 'flashcard', 'data-flip': '' },
      h('div', { class: 'face front' }, h('span', { class: 'q-main', lang: 'de' }, item.front), h('span', { class: 'q-sub' }, t('play.flip'))),
      h('div', { class: 'face back' }, h('span', { class: 'q-sub', lang: 'de' }, item.front), h('span', { class: 'q-main' }, back?.text || ''),
        back?.fallback && back.lang ? chip(t('lang.' + back.lang)) : null));
    const actions = h('div', { class: 'two', hidden: true },
      h('button', { type: 'button', class: 'bad', 'data-grade': 'no', onclick: () => { lock(); answered(false); } }, ico('xmark', 20, 2.4), t('play.dontKnow')),
      h('button', { type: 'button', class: 'good', 'data-grade': 'yes', onclick: () => { lock(); answered(true); } }, ico('check', 20, 2.4), t('play.know')));
    const lock = () => actions.querySelectorAll('button').forEach((b) => (b.disabled = true));
    card.onclick = () => { card.classList.toggle('flipped'); actions.hidden = false; };
    put(wrap, 'append', card,
      h('div', { class: 'center' }, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Vorlesen', onclick: () => speak(item.front) }, ico('speaker', 20, 2))),
      actions);
  }

  else if (item.kind === 'choice') {
    const q = h('div', { class: 'question' }, meta, qMain(item.prompt));
    const opts = h('div', { class: 'options' });
    item.options.forEach((o, i) => opts.append(h('button', {
      type: 'button', class: 'option', lang: 'de', 'data-option': i,
      onclick: () => {
        const ok = i === item.answer;
        opts.querySelectorAll('button').forEach((b, j) => {
          b.disabled = true;
          if (j === item.answer) b.classList.add('right');
          else if (j === i) b.classList.add('wrong');
          else b.classList.add('dim');
        });
        wrap.append(feedback(ok, item.options[item.answer], item.explain));
        answered(ok);
      },
    }, o)));
    put(wrap, 'append', q, opts);
  }

  else if (item.kind === 'input') {
    const input = h('input', { class: 'text-input', lang: 'de', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: t('play.typeHere'), enterkeyhint: 'done' });
    const btn = h('button', { type: 'button', class: 'primary big', 'data-check': '' }, t('common.check'));
    const check = () => {
      if (!input.value.trim() || input.disabled) return;
      const answers = [].concat(item.answer);
      const ok = answers.some((a) => norm(a) === norm(input.value));
      input.disabled = true; btn.hidden = true;
      input.classList.add(ok ? 'right' : 'wrong');
      wrap.append(feedback(ok, answers[0], item.explain));
      answered(ok);
    };
    btn.onclick = check;
    input.addEventListener('keydown', (e) => e.key === 'Enter' && check());
    put(wrap, 'append', h('div', { class: 'question' }, meta, qMain(item.prompt)),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, t('play.yourAnswer')), input), btn);
    setTimeout(() => input.focus({ preventScroll: true }), 60);
  }

  else if (item.kind === 'open') {
    const ta = h('textarea', { class: 'text-input open-input', rows: 6, lang: 'de', placeholder: t('play.typeHere') });
    ta.value = saved?.text || '';
    const btn = h('button', { type: 'button', class: 'primary big', 'data-submit': '' }, t('common.submit'));
    btn.onclick = () => {
      answered(null, ta.value);
      btn.hidden = true;
      toast(t('play.saved'));
      put(wrap, 'append', item.reference ? h('div', { class: 'card ref-card' }, h('div', { class: 'field-label' }, t('play.reference')), h('p', { lang: 'de' }, item.reference)) : null,
        explainBlock(item.explain));
    };
    put(wrap, 'append', h('div', { class: 'question' }, meta, qMain(item.prompt)),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, t('play.yourAnswer')), ta), btn);
  }

  else if (item.kind === 'speak') {
    put(wrap, 'append',
      h('div', { class: 'question' }, meta, h('div', { class: 'q-sub' }, t('play.scenario')), qMain(item.scenario)),
      item.phrases?.length ? group(t('play.phrases'), item.phrases.map((p) => row({
        icon: ico('speaker', 20, 2), title: h('span', { lang: 'de' }, p), onClick: () => speak(p), cls: 'row-accent',
      }))) : null,
      recorder());
    answered(null, '[speaking]');
  }
  return wrap;
}

/* ---------- 会话 ---------- */
function runSession(root, { title, icon, entries, startIndex = 0, closeHref, fromReview = false, onIndex, onFinish }) {
  let index = Math.min(startIndex, entries.length - 1);
  let correct = 0; let graded = 0;
  const bar = h('div', {});
  const body = h('div', { class: 'play-body' });
  put(root, 'append', bar, body);
  const close = () => h('a', { class: 'glass-btn', href: closeHref, 'aria-label': t('common.close') }, ico('xmark', 20, 2.2));

  const show = () => {
    const e = entries[index];
    const pr = S.progress(e.courseId);
    const ref = { unitId: e.unitId, activityId: e.activity.id };
    onIndex?.(index, e);
    const isFav = !!pr.fav[e.item.id];
    const fav = h('button', { type: 'button', class: 'glass-btn fav', 'aria-label': t(isFav ? 'play.unfav' : 'play.fav'), 'aria-pressed': String(isFav), 'data-fav': '' },
      ico('star', 20, 2, isFav ? 'star-ico' : ''));
    fav.onclick = () => {
      const on = S.toggleFav(e.courseId, e.item.id, ref);
      fav.replaceChildren(ico('star', 20, 2, on ? 'star-ico' : ''));
      fav.setAttribute('aria-pressed', String(on));
    };
    bar.replaceChildren(navBar({
      leading: close(),
      center: h('div', { class: 'nb-progress' }, h('span', { class: 'nb-title' }, ico(icon || typeIconName(e.activity.type), 16, 2), title), progressTrack(index / entries.length)),
      trailing: [h('span', { class: 'counter' }, `${index + 1}/${entries.length}`), fav],
    }));

    const next = h('button', { type: 'button', class: 'primary big', 'data-next': '', disabled: true },
      index + 1 < entries.length ? t('common.next') : t('common.done'), ico('chevronRight', 18, 2.4));
    next.onclick = () => {
      if (index + 1 < entries.length) { index++; show(); window.scrollTo(0, 0); }
      else finish();
    };
    const answered = (ok, text) => {
      if (ok === null) S.recordOpen(e.courseId, e.item.id, text, ref);
      else {
        S.recordAnswer(e.courseId, e.item.id, ok, ref, fromReview);
        graded++; if (ok) correct++;
      }
      next.disabled = false;
    };
    const firstOfActivity = fromReview || index === 0 || entries[index - 1]?.activity !== e.activity;
    put(body, 'replaceChildren',
      fromReview ? h('p', { class: 'muted small center' }, t('review.from', { where: `${tr(course(e.courseId).title)} · ${e.activity.title}` })) : null,
      e.activity.stimulus ? stimulusBlock(e.activity, firstOfActivity) : null,
      renderItem(e.item, e.activity, pr.open[e.item.id], answered),
      h('div', { class: 'sticky-bottom' }, next));
    S.save(true);
  };

  let finishActions = () => null;
  const finish = () => {
    onFinish?.();
    S.save(true);
    bar.replaceChildren(navBar({ leading: close(), center: h('div', { class: 'nb-progress' }, h('span', { class: 'nb-title' }, title), progressTrack(1)) }));
    put(body, 'replaceChildren', h('div', { class: 'result', 'data-finished': '' },
      h('div', { class: 'big-emoji' }, '🎉'),
      h('h2', {}, fromReview ? t('review.done') : t('play.finished')),
      graded ? h('p', { class: 'muted' }, t('play.score', { a: correct, b: graded })) : null,
      h('div', { class: 'result-actions' }, finishActions())));
  };
  show();
  return { setFinishActions: (fn) => { finishActions = fn; } };
}

/* ---------- 活动练习 ---------- */
export async function renderPlay(root, courseId, unitId, activityId, query) {
  const unit = await loadUnit(courseId, unitId);
  const activity = unit?.activities.find((a) => a.id === activityId);
  if (!activity || !hasItems(activity)) return go(`#/s/${courseId}/unit/${unitId}`);
  if (!S.enrollment(courseId) || S.enrollment(courseId).hidden) S.addCourse(courseId);

  const pr = S.progress(courseId);
  let start = query.get('restart') === '1' ? 0 : pr.actPos[activityId] || 0;
  if (start >= activity.items.length) start = 0;

  const entries = activity.items.map((item) => ({ item, activity, courseId, unitId }));
  const unitHref = `#/s/${courseId}/unit/${unitId}`;
  const ready = unit.activities.filter(hasItems);
  const nextAct = ready[ready.indexOf(activity) + 1];

  const s = runSession(root, {
    title: activity.title, icon: typeIconName(activity.type), entries, startIndex: start, closeHref: unitHref,
    onIndex: (i) => S.setPosition(courseId, { unitId, activityId, index: i, activityTitle: activity.title }),
    onFinish: () => {
      S.markDone(courseId, activityId);
      // 「继续」指向下一个活动；没有下一个则回到本活动开头
      S.setPosition(courseId, nextAct
        ? { unitId, activityId: nextAct.id, index: S.progress(courseId).actPos[nextAct.id] || 0, activityTitle: nextAct.title }
        : { unitId, activityId, index: 0, activityTitle: activity.title });
    },
  });
  s.setFinishActions(() => [
    nextAct ? h('button', { type: 'button', class: 'primary big', 'data-next-activity': '', onclick: () => go(`#/play/${courseId}/${unitId}/${nextAct.id}`) },
      ico(typeIconName(nextAct.type), 20, 2.2), nextAct.title) : null,
    h('button', { type: 'button', class: 'secondary big', onclick: () => go(`#/play/${courseId}/${unitId}/${activityId}?restart=1&t=${Date.now()}`) }, ico('repeat', 20, 2.2), t('play.again')),
    h('a', { class: 'link center-link', href: unitHref }, t('play.backUnit')),
  ].filter(Boolean));
}

/* ---------- 复习 ---------- */
export async function collectReview(mode) {
  const out = [];
  for (const [cid, e] of Object.entries(S.enrollments())) {
    if (e.hidden || course(cid)?.kind !== 'structured') continue;
    const pr = S.progress(cid);
    const refs = mode === 'fav' ? Object.entries(pr.fav).map(([id, f]) => ({ id, ...f })) : S.openWrong(cid);
    const found = await findItems(cid, refs);
    out.push(...found.map((f) => ({ ...f, unitId: f.unit.id })));
  }
  return out;
}

export async function renderReviewPlay(root, mode) {
  let entries = await collectReview(mode);
  if (mode === 'wrong') entries = entries.filter((e) => GRADED.has(e.item.kind));
  if (!entries.length) return go('#/review');
  const s = runSession(root, {
    title: mode === 'fav' ? t('review.startFav') : t('review.startWrong'), icon: mode === 'fav' ? 'star' : 'repeat',
    entries, closeHref: '#/review', fromReview: true,
  });
  s.setFinishActions(() => [h('a', { class: 'primary big', href: '#/review' }, t('common.done'))]);
}
