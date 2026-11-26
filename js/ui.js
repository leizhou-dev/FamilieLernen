// DOM 小工具 + ipados27-ui 组件（与 _shared/ipados27-ui/components 的 Preact 组件对应，纯 JS 版）
import { t } from './i18n.js';
import { ico } from './icons.js';
export { ico, iconTile } from './icons.js';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv); }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false || c === '') continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** append / replaceChildren，跳过 null/false */
export function put(el, method, ...kids) {
  el[method](...kids.flat(Infinity).filter((k) => k != null && k !== false && k !== ''));
}

export const go = (hash) => { location.hash = hash; };

let _refresh = () => {};
export const setRefresh = (fn) => { _refresh = fn; };
export const refresh = () => _refresh();

/* ---------- ipados27-ui 组件 ---------- */

/** 大标题；trailing 放右侧（例如头像按钮），leading 放返回链接 */
export function pageHeader(title, { sub, trailing, leading } = {}) {
  return h('header', { class: 'large-header' },
    leading ? h('div', { class: 'lh-leading' }, leading) : null,
    h('div', { class: 'lh-row' },
      h('div', {}, h('h1', { class: 'large-title' }, title), sub ? h('div', { class: 'lh-sub' }, sub) : null),
      trailing ? h('div', { class: 'lh-trailing' }, trailing) : null));
}

export const backLink = (href, label) =>
  h('a', { class: 'link back-link', href }, ico('chevronLeft', 18, 2.4), label);

/** 分组列表 */
export function group(header, rows, footer, attrs = {}) {
  return h('section', { class: 'group', ...attrs },
    header ? h('h2', { class: 'group-header' }, header) : null,
    h('div', { class: 'group-body' }, rows),
    footer ? h('p', { class: 'group-footer' }, footer) : null);
}

/**
 * 列表行。href → 整行可点；detail 里的按钮不会触发整行。
 */
export function row({ icon, title, sub, detail, chev, href, onClick, cls = '', attrs = {} }) {
  const tappable = href || onClick;
  const el = h('div', {
    class: 'row' + (tappable ? ' tappable' : '') + (cls ? ' ' + cls : ''),
    role: tappable ? 'link' : null, tabindex: tappable ? '0' : null, ...attrs,
  },
  icon ? h('span', { class: 'row-icon' }, icon) : null,
  h('span', { class: 'row-main' },
    title != null ? h('span', { class: 'row-title' }, title) : null,
    sub ? h('span', { class: 'row-sub' }, sub) : null),
  detail != null ? h('span', { class: 'row-detail' }, detail) : null,
  chev ? ico('chevronRight', 16, 2.4, 'row-chev') : null);
  if (tappable) {
    const act = () => (onClick ? onClick() : go(href));
    el.addEventListener('click', (e) => { if (!e.target.closest('button, a, input, label')) act(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === el) act(); });
  }
  return el;
}

export function segmented(options, value, onPick, attr = 'data-value') {
  return h('div', { class: 'segmented', role: 'radiogroup' }, options.map(([v, label]) =>
    h('button', { type: 'button', class: v === value ? 'on' : '', role: 'radio', 'aria-checked': String(v === value), [attr]: v, onclick: () => onPick(v) }, label)));
}

export function navBar({ leading, center, trailing }) {
  const nb = h('div', { class: 'navbar' },
    h('div', { class: 'nb-side' }, leading),
    h('div', { class: 'nb-center' }, center),
    h('div', { class: 'nb-side end' }, trailing));
  return nb;
}

export const chip = (text, cls = '') => h('span', { class: 'chip' + (cls ? ' ' + cls : '') }, text);

export function progressTrack(fraction) {
  return h('div', { class: 'progress-track', role: 'progressbar', 'aria-valuenow': Math.round(fraction * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 },
    h('div', { class: 'progress-fill', style: { width: Math.round(fraction * 100) + '%' } }));
}

export function barMeter(fraction, color = 'var(--accent)') {
  return h('span', { class: 'bar-meter' }, h('span', { style: { width: Math.round(fraction * 100) + '%', background: color } }));
}

/* ---------- 弹出层 / 提示 ---------- */

export function toast(msg) {
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2200);
}

/** 底部弹出层；返回 close() */
export function sheet(title, body, { onClose } = {}) {
  const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 250); onClose?.(); };
  const wrap = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === wrap) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': title || null },
      h('div', { class: 'sheet-head' },
        h('h2', {}, title),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('common.close'), onclick: close }, ico('xmark', 18, 2.4))),
      h('div', { class: 'sheet-body' }, body)));
  document.body.append(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  return close;
}

export function confirmBox(message, { okText = t('common.done'), danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; resolve(v); close(); };
    const close = sheet('', h('div', { class: 'confirm' },
      h('p', {}, message),
      h('div', { class: 'two' },
        h('button', { type: 'button', class: 'secondary', onclick: () => finish(false) }, t('common.cancel')),
        h('button', { type: 'button', class: danger ? 'bad' : 'primary', 'data-ok': '', onclick: () => finish(true) }, okText))),
    { onClose: () => { if (!done) { done = true; resolve(false); } } });
  });
}

export function promptBox(title, placeholder = '') {
  return new Promise((resolve) => {
    let done = false;
    const input = h('input', { class: 'text-input', placeholder, enterkeyhint: 'done' });
    const finish = (v) => { if (done) return; done = true; resolve(v); close(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) finish(input.value.trim()); });
    const close = sheet(title, h('div', { class: 'confirm' }, input,
      h('div', { class: 'two' },
        h('button', { type: 'button', class: 'secondary', onclick: () => finish(null) }, t('common.cancel')),
        h('button', { type: 'button', class: 'primary', 'data-ok': '', onclick: () => input.value.trim() && finish(input.value.trim()) }, t('common.save')))),
    { onClose: () => { if (!done) { done = true; resolve(null); } } });
    setTimeout(() => input.focus(), 50);
  });
}

export const avatar = (p, size = '') =>
  h('span', { class: 'avatar ' + size, style: { background: p.color }, 'aria-hidden': 'true' }, p.avatar);
