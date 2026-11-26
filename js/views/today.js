import * as S from '../store.js';
import { visibleCourses, course } from '../registry.js';
import { t, tr, getLang } from '../i18n.js';
import { h, go, put, ico, iconTile, group, row } from '../ui.js';
import { continueCourse, whereLabel, courseHref, kindLabel } from '../nav.js';
import { header, courseTile } from './common.js';

const LOCALE = { zh: 'zh-CN', en: 'en-GB', de: 'de-DE' };

export function continueButton(c, cls = 'primary sm') {
  return h('button', { type: 'button', class: cls, 'data-continue': c.id, onclick: () => continueCourse(c.id) },
    c.kind === 'external' ? t('common.open') : t('common.continue'));
}

function widget({ icon, color, title, sub, count, hero, cta, onClick, attrs = {}, style }) {
  return h('button', { type: 'button', class: 'widget' + (hero ? ' hero' : ''), onclick: onClick, style, ...attrs },
    h('div', { class: 'widget-top' }, iconTile(icon, color || 'var(--accent)', hero ? 44 : 34),
      count ? h('span', { class: 'widget-count' }, count) : null),
    h('div', {}, h('div', { class: 'widget-title' }, title), sub ? h('div', { class: 'widget-sub' }, sub) : null),
    cta ? h('span', { class: 'widget-cta' }, cta, ' ', ico('chevronRight', 16, 2.4)) : null);
}

export function renderToday(root) {
  const p = S.current();
  const enr = S.enrollments();
  const mine = visibleCourses().filter((c) => enr[c.id] && !enr[c.id].hidden);
  const recentId = S.recentCourseId();
  const recent = recentId && enr[recentId] && !enr[recentId].hidden && !course(recentId)?.hidden ? course(recentId) : null;
  const wrongCount = mine.filter((c) => c.kind === 'structured').reduce((n, c) => n + S.openWrong(c.id).length, 0);
  const date = new Date().toLocaleDateString(LOCALE[getLang()], { weekday: 'long', day: 'numeric', month: 'long' });

  put(root, 'append',
    header(t('today.hello', { name: p.name }), { sub: date }),
    h('div', { class: 'widget-grid' },
      recent
        ? widget({
          hero: true, icon: recent.icon, color: 'transparent', title: tr(recent.title),
          sub: t('today.continueSub', { where: whereLabel(recent.id) }), cta: t('today.continue'),
          onClick: () => continueCourse(recent.id), attrs: { id: 'hero-continue' },
          style: { '--accent': recent.color, '--accent-2': `color-mix(in srgb, ${recent.color} 55%, #fff)` },
        })
        : widget({ hero: true, icon: 'sparkles', title: t('today.goCourses'), sub: t('today.noRecent'), cta: t('nav.courses'), onClick: () => go('#/courses') }),
      widget({
        icon: 'repeat', color: wrongCount ? 'var(--orange)' : 'var(--green)', count: wrongCount || null,
        title: t('nav.review'), sub: wrongCount ? t('today.reviewDue', { n: wrongCount }) : t('today.reviewNone'),
        onClick: () => go('#/review'), attrs: { 'data-widget': 'review' },
      }),
      widget({
        icon: 'books', color: 'var(--indigo)', count: mine.length || null, title: t('nav.courses'),
        sub: mine.length ? t('today.myCourses') : t('courses.emptyMine'), onClick: () => go('#/courses'),
      })),
    mine.length ? group(t('today.myCourses'), mine.map((c) => row({
      icon: courseTile(c, 34), title: tr(c.title), sub: kindLabel(c), href: courseHref(c),
      detail: continueButton(c), attrs: { 'data-course': c.id },
    }))) : null,
  );
}
