// 结构化课程：首页（级别路线）→ 级别 → 单元 → 活动
// 适用于德语，也适用于以后的 Mathe / HSU（把 stages 写成年级或主题即可）。
import * as S from '../store.js';
import { course } from '../registry.js';
import { t, tr } from '../i18n.js';
import { h, go, put, chip, group, row, segmented, barMeter, iconTile, ico, backLink, pageHeader } from '../ui.js';
import { loadCourse, loadUnit, hasItems, unitHasContent } from '../content.js';
import { avatarButton, rewardPills } from './common.js';

const TYPE = {
  vocab: ['textformat', 'var(--blue)'],
  grammar: ['puzzle', 'var(--purple)'],
  listening: ['headphones', 'var(--teal)'],
  reading: ['bookOpen', 'var(--green)'],
  writing: ['pencil', 'var(--orange)'],
  speaking: ['bubble', 'var(--pink)'],
  test: ['checkCircle', 'var(--red)'],
};
export const typeTile = (type, size = 34) => iconTile(...(TYPE[type] || ['circle', 'var(--gray)']), size);
export const typeIconName = (type) => (TYPE[type] || ['circle'])[0];

const enrolledIn = (id) => { const e = S.enrollment(id); return e && !e.hidden; };

function unitStats(courseId, unit) {
  const pr = S.progress(courseId);
  const acts = unit.activities || [];
  const ready = acts.filter(hasItems);
  return { total: acts.length, ready: ready.length, done: ready.filter((a) => pr.done[a.id]).length };
}

const codeTile = (code) => h('span', { class: 'code-tile' }, code);

export async function renderCourseHome(root, id) {
  const reg = course(id);
  const c = await loadCourse(id);
  const enrolled = enrolledIn(id);
  const levels = c.stages.filter((s) => s.kind !== 'track');
  const tracks = c.stages.filter((s) => s.kind === 'track');
  const saved = S.enrollment(id)?.meta?.level;
  const startLevel = levels.some((s) => s.id === saved) ? saved : levels[0].id;
  const pos = S.progress(id).pos;

  put(root, 'append',
    pageHeader(tr(reg.title), { sub: tr(reg.desc), leading: backLink('#/courses', t('nav.courses')), trailing: avatarButton() }),
    rewardPills(),
    enrolled && pos?.activityId
      ? h('button', { type: 'button', class: 'primary big', 'data-continue': id, onclick: () => go(`#/play/${id}/${pos.unitId}/${pos.activityId}`) },
          ico('play', 18, 2.2), t('common.continue'), h('span', { class: 'btn-sub' }, pos.activityTitle))
      : null,
    !enrolled ? h('button', { type: 'button', class: 'primary big', 'data-add': id, onclick: () => S.addCourse(id, { level: startLevel }) }, ico('plus', 18, 2.4), t('common.add')) : null,
    enrolled ? group(t('course.startLevel'), [h('div', { class: 'seg-row' },
      segmented(levels.map((s) => [s.id, s.code]), startLevel,
        (v) => { S.setCourseMeta(id, { level: v }); go(`#/s/${id}/stage/${v}`); }, 'data-level'))]) : null,
    tracks.length ? group(t('course.tracks'), tracks.map((s) => row({
      icon: iconTile(s.icon || 'bubble', 'var(--pink)', 40), title: tr(s.title),
      sub: t('course.unitsCount', { n: s.units.length }), chev: true, href: `#/s/${id}/stage/${s.id}`, attrs: { 'data-stage': s.id },
    }))) : null,
    group(t('course.route'), levels.map((s) => row({
      icon: codeTile(s.code), title: tr(s.title),
      sub: s.units.length ? t('course.unitsCount', { n: s.units.length }) : t('common.pending'),
      detail: s.id === startLevel ? chip(t('course.startLevel'), 'accent') : null,
      chev: true, href: `#/s/${id}/stage/${s.id}`, cls: s.id === startLevel ? 'current-stage' : '', attrs: { 'data-stage': s.id },
    }))),
    c.themes?.length ? group(t('course.themes'), [h('div', { class: 'row chips' }, c.themes.map((th) => chip(tr(th.title))))]) : null,
  );
}

export async function renderStage(root, id, stageId) {
  const c = await loadCourse(id);
  const stage = c.stages.find((s) => s.id === stageId);
  if (!stage) return go(`#/s/${id}`);
  const isTrack = stage.kind === 'track';
  put(root, 'append', pageHeader(isTrack ? tr(stage.title) : `${stage.code} · ${tr(stage.title)}`, { leading: backLink(`#/s/${id}`, tr(course(id).title)), trailing: avatarButton() }),
    stage.desc ? h('div', { class: 'card stage-desc' }, h('p', {}, tr(stage.desc))) : null);
  if (!stage.units.length) {
    put(root, 'append', emptyCard(t('course.noUnits'), 'stage'));
    return;
  }
  const units = await Promise.all(stage.units.map((u) => loadUnit(id, u.id)));
  // 按 group 分组（保持原顺序，相邻的同组单元放在一起）
  const runs = [];
  for (const u of units) {
    if (runs.length && runs.at(-1).group === (u.group || null)) runs.at(-1).units.push(u);
    else runs.push({ group: u.group || null, units: [u] });
  }
  const unitRow = (u) => {
    const st = unitStats(id, u);
    const ready = unitHasContent(u);
    return row({
      title: [u.title, u.internal ? [' ', chip(t('common.internal'), 'warn')] : null],
      sub: ready ? h('span', { class: 'unit-sub' }, t('course.ready', { a: st.ready, b: st.total }), barMeter(st.ready ? st.done / st.ready : 0)) : null,
      detail: ready ? null : chip(t('common.pending')),
      chev: ready, href: `#/s/${id}/unit/${u.id}`,
      cls: 'unit-row' + (ready ? '' : ' disabled'), attrs: { 'data-unit': u.id },
    });
  };
  put(root, 'append', runs.map((r, i) => group(r.group || (i === 0 ? t('course.units') : null), r.units.map(unitRow))));
}

export function emptyCard(text, kind) {
  return h('div', { class: 'card empty-card', 'data-empty': kind },
    iconTile('sparkles', 'var(--gray)', 48), h('p', { class: 'muted' }, text), chip(t('common.pending')));
}

export async function renderUnit(root, id, unitId) {
  const u = await loadUnit(id, unitId);
  if (!u) return go(`#/s/${id}`);
  const c = await loadCourse(id);
  const stage = c.stages.find((s) => s.id === u.stageId);
  const pr = S.progress(id);
  put(root, 'append', pageHeader(u.title, {
    sub: u.internal ? chip(t('common.internal'), 'warn') : null,
    leading: backLink(`#/s/${id}/stage/${stage.id}`, stage.kind === 'track' ? tr(stage.title) : `${stage.code} · ${tr(stage.title)}`), trailing: avatarButton(),
  }));
  if (!u.activities.length) { put(root, 'append', emptyCard(t('common.pending'), 'unit')); return; }

  put(root, 'append', group(t('course.activities'), u.activities.map((a) => {
    const ready = hasItems(a);
    const at = pr.actPos[a.id] || 0;
    const done = !!pr.done[a.id];
    const status = !ready ? null : done ? t('common.completed') : at > 0 ? t('common.inProgress') : null;
    const href = `#/play/${id}/${u.id}/${a.id}` + (done ? '?restart=1' : '');
    return row({
      icon: typeTile(a.type, 34), title: a.title,
      sub: [t('type.' + a.type), ready ? ' · ' + t('common.items', { n: a.items.length }) : '', status ? ' · ' + status : ''].join(''),
      detail: ready
        ? h('button', { type: 'button', class: (done ? 'secondary' : 'primary') + ' sm', 'data-start': a.id, onclick: () => go(href) },
            done ? ico('checkCircle', 16, 2.2) : null, at > 0 && !done ? t('common.continue') : t('common.start'))
        : chip(t('common.pending')),
      href: ready ? href : null, cls: 'activity-row' + (ready ? '' : ' disabled'), attrs: { 'data-activity': a.id },
    });
  })));
}
