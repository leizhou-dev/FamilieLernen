import * as S from './store.js';
import { course } from './registry.js';
import { t, tr } from './i18n.js';
import { go } from './ui.js';

export function openExternal(c, path = '') {
  S.touchCourse(c.id);
  S.save(true);
  if (c.kind === 'embedded') { location.href = c.path + path; return; } // 同一个 App 内打开
  window.open(c.url + path, '_blank', 'noopener');
}

/** 课程卡片/首页的「继续」 */
export function continueCourse(courseId) {
  const c = course(courseId);
  if (!c) return;
  if (c.kind === 'external' || c.kind === 'embedded') return openExternal(c);
  if (c.kind === 'mathe') { S.touchCourse(courseId); return go('#/mathe'); }
  if (c.kind === 'structured') {
    const pos = S.progress(courseId).pos;
    S.touchCourse(courseId);
    if (pos?.unitId && pos?.activityId) return go(`#/play/${courseId}/${pos.unitId}/${pos.activityId}`);
    return go(`#/s/${courseId}`);
  }
  go(`#/course/${courseId}`);
}

/** 「上次学到」文字 */
export function whereLabel(courseId) {
  const c = course(courseId);
  const pos = c.kind === 'structured' ? S.progress(courseId).pos : null;
  if (pos?.activityTitle) return `${pos.activityTitle} (${(pos.index || 0) + 1})`;
  return tr(c.title);
}

export const courseHref = (c) => (c.kind === 'structured' ? `#/s/${c.id}` : c.kind === 'mathe' ? '#/mathe' : `#/course/${c.id}`);
export const kindLabel = (c) => t('kind.' + (['structured', 'embedded', 'mathe'].includes(c.kind) ? 'native' : c.kind));
