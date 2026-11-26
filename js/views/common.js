import * as S from '../store.js';
import { t, tr } from '../i18n.js';
import { h, avatar, iconTile, pageHeader } from '../ui.js';
import { openSwitcher } from './settings.js';

export function avatarButton(withId = true) {
  const p = S.current();
  return h('button', { type: 'button', class: 'glass-btn with-text avatar-btn', id: withId ? 'avatar-btn' : null, 'aria-label': t('switch.title'), onclick: openSwitcher },
    avatar(p, 'sm'), h('span', { class: 'avatar-name' }, p.name));
}

/** 主页面标题（右侧带头像） */
export const header = (title, opts = {}) => pageHeader(title, { trailing: avatarButton(), ...opts });

export const courseTile = (c, size = 40) => iconTile(c.icon, c.color, size);
export const courseTitle = (c) => tr(c.title);
