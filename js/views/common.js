import * as S from '../store.js';
import { t, tr } from '../i18n.js';
import { h, avatar, iconTile, pageHeader, ico } from '../ui.js';
import { openSwitcher } from './settings.js';

export function avatarButton(withId = true) {
  const p = S.current();
  return h('button', { type: 'button', class: 'glass-btn with-text avatar-btn', id: withId ? 'avatar-btn' : null, 'aria-label': t('switch.title'), onclick: openSwitcher },
    avatar(p, 'sm'), h('span', { class: 'avatar-name' }, p.name));
}

/** 主页面标题（右侧带头像） */
export const header = (title, opts = {}) => pageHeader(title, { trailing: avatarButton(), ...opts });

/** 星星 + 连续学习天数（全家统一，覆盖所有课程） */
export function rewardPills(pid) {
  const r = S.rewards(pid);
  return h('div', { class: 'reward-pills' },
    h('span', { class: 'pill', 'data-stars': r.stars, title: t('rw.stars') }, ico('star', 20, 2, 'star-ico'), String(r.stars)),
    h('span', { class: 'pill', 'data-streak': r.streak, title: t('rw.streakTitle') }, h('span', { class: 'flame' }, ico('flame', 20, 2)), t('rw.days', { n: r.streak })));
}
export const starGain = (n) => h('span', { class: 'star-gain', 'data-star-gain': n }, '+' + n + ' ', ico('star', 15, 2, 'star-ico'));

export const courseTile = (c, size = 40) => iconTile(c.icon, c.color, size);
export const courseTitle = (c) => tr(c.title);
