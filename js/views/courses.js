import * as S from '../store.js';
import { visibleCourses, course, addable } from '../registry.js';
import { t, tr } from '../i18n.js';
import { h, go, put, toast, confirmBox, chip, refresh, group, row, ico, backLink, pageHeader } from '../ui.js';
import { openExternal, courseHref, kindLabel } from '../nav.js';
import { header, courseTile, avatarButton } from './common.js';
import { continueButton } from './today.js';

export function renderCourses(root) {
  const enr = S.enrollments();
  const mine = visibleCourses().filter((c) => enr[c.id] && !enr[c.id].hidden);
  const hidden = visibleCourses().filter((c) => enr[c.id]?.hidden);
  const avail = visibleCourses().filter((c) => !enr[c.id]);

  const hide = async (c) => {
    if (await confirmBox(t('courses.hideConfirm', { name: tr(c.title) }), { okText: t('common.hide') })) {
      S.hideCourse(c.id);
      refresh();
    }
  };
  const add = (c, restored) => {
    S.addCourse(c.id);
    toast(t(restored ? 'courses.restored' : 'courses.added', { name: tr(c.title) }));
  };
  const courseRow = (c, detail, opts = {}) => row({
    icon: courseTile(c, 40), title: tr(c.title), sub: tr(c.desc), detail,
    href: c.kind === 'planned' ? null : courseHref(c), attrs: { 'data-course': c.id }, ...opts,
  });

  put(root, 'append',
    header(t('nav.courses')),
    group(t('courses.mine'), mine.length
      ? mine.map((c) => courseRow(c, [
        continueButton(c),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('common.hide'), title: t('common.hide'), 'data-hide': c.id, onclick: () => hide(c) }, ico('eyeSlash', 18, 2)),
      ]))
      : [row({ title: h('span', { class: 'muted' }, t('courses.emptyMine')) })]),
    avail.length ? group(t('courses.available'), avail.map((c) => courseRow(c, addable(c)
      ? h('button', { type: 'button', class: 'secondary sm', 'data-add': c.id, onclick: () => add(c, false) }, ico('plus', 16, 2.4), t('common.add'))
      : chip(t('common.comingSoon')), { cls: c.kind === 'planned' ? 'dim-row' : '' }))) : null,
    hidden.length ? group(t('courses.hidden'), hidden.map((c) => courseRow(c,
      h('button', { type: 'button', class: 'secondary sm', 'data-restore': c.id, onclick: () => add(c, true) }, t('common.restore')),
      { cls: 'dim-row' }))) : null,
  );
}

/** 独立 App / Mac 工具 的课程页 */
export function renderCourseDetail(root, id) {
  const c = course(id);
  if (!c) return go('#/courses');
  if (c.kind === 'structured') return go(`#/s/${id}`);
  const enrolled = S.enrollment(id) && !S.enrollment(id).hidden;
  const isMac = /Macintosh/.test(navigator.userAgent) && !('ontouchend' in document);

  put(root, 'append',
    pageHeader(tr(c.title), { sub: tr(c.desc), leading: backLink('#/courses', t('nav.courses')), trailing: avatarButton() }),
    h('div', { class: 'course-hero', style: { '--tile': c.color } }, courseTile(c, 64), h('span', { class: 'chip' }, kindLabel(c))),
    !enrolled ? h('button', { type: 'button', class: 'primary big', 'data-add': id, onclick: () => S.addCourse(id) }, t('common.add')) : null,
  );

  if (c.kind === 'external') {
    put(root, 'append',
      h('button', { type: 'button', class: 'primary big', 'data-open': c.id, onclick: () => openExternal(c) }, ico('share', 20, 2.2), t('ext.main')),
      c.entries?.length ? group(t('ext.entries'), c.entries.map((e) => row({
        icon: h('span', { class: 'icon-tile', style: { background: c.color, width: '30px', height: '30px' } }, ico(e.icon, 19, 2)),
        title: tr(e.title), chev: true, onClick: () => openExternal(c, e.path), attrs: { 'data-entry': e.id },
      }))) : null,
      h('p', { class: 'group-footer' }, t('ext.note')));
  } else if (c.kind === 'mac') {
    put(root, 'append', group(null, [
      row({ title: t('mac.note'), sub: !isMac ? t('mac.notOnMac') : null }),
      row({ icon: ico('laptop', 22, 2), title: t('common.open'), cls: c.launch ? 'row-accent tappable' : 'dim-row', onClick: c.launch ? () => (location.href = c.launch) : null }),
    ]));
  }
  if (c.plan) put(root, 'append', group(t('ext.plan'), [row({ title: h('span', { class: 'row-sub' }, tr(c.plan)) })]));
}
