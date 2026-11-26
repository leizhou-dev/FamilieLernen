import * as S from './store.js';
import { t, setLang } from './i18n.js';
import { h, ico, setRefresh, put } from './ui.js';
import { renderToday } from './views/today.js';
import { renderCourses, renderCourseDetail } from './views/courses.js';
import { renderCourseHome, renderStage, renderUnit } from './views/structured.js';
import { renderPlay, renderReviewPlay } from './views/play.js';
import { renderReview } from './views/review.js';
import { renderSettings } from './views/settings.js';
import { avatarButton } from './views/common.js';
import * as vault from './vault.js';

const ROUTES = [
  [/^\/today$/, 'today', renderToday],
  [/^\/courses$/, 'courses', renderCourses],
  [/^\/course\/([\w-]+)$/, 'courses', renderCourseDetail],
  [/^\/s\/([\w-]+)$/, 'courses', renderCourseHome],
  [/^\/s\/([\w-]+)\/stage\/([\w-]+)$/, 'courses', renderStage],
  [/^\/s\/([\w-]+)\/unit\/([\w-]+)$/, 'courses', renderUnit],
  [/^\/play\/([\w-]+)\/([\w-]+)\/([\w-]+)$/, 'courses', renderPlay, true],
  [/^\/review$/, 'review', renderReview],
  [/^\/review\/(wrong|fav)$/, 'review', renderReviewPlay, true],
  [/^\/settings$/, null, renderSettings],
];

const TABS = [['today', 'house'], ['courses', 'books'], ['review', 'repeat']];

// ipados27-ui 页面框架：.shell > main > .screen，外加悬浮 Tab 栏和滚动时出现的顶栏
const appRoot = document.getElementById('app');
const screen = h('div', { class: 'screen', id: 'view' });
const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Bereiche' });
const edge = h('div', { class: 'scroll-edge', 'aria-hidden': 'true' });
const shell = h('div', { class: 'shell' }, edge, h('main', {}, screen), tabbar);

function drawTabbar(tab) {
  tabbar.replaceChildren(...TABS.map(([id, icon]) =>
    h('a', { class: 'tab' + (tab === id ? ' on' : ''), href: '#/' + id, 'data-tab': id, 'aria-current': tab === id ? 'page' : null },
      ico(icon, 25, tab === id ? 2.1 : 1.7), h('span', { class: 'tab-label' }, t('nav.' + id)))));
}

function drawEdge() {
  const title = screen.querySelector('.large-title');
  put(edge, 'replaceChildren', h('div', { class: 'se-side' }), h('div', { class: 'se-title' }, title?.textContent || ''),
    h('div', { class: 'se-side end' }, title ? avatarButton(false) : null));
}
const onScroll = () => {
  const show = !document.body.classList.contains('fullscreen') && window.scrollY > 44;
  edge.classList.toggle('show', show);
  edge.setAttribute('aria-hidden', String(!show));
  document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 4);
};
window.addEventListener('scroll', onScroll, { passive: true });

let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  const p = S.current();
  setLang(p.uiLang);
  document.title = t('app.name');
  const raw = location.hash.replace(/^#/, '') || '/today';
  const [path, qs] = raw.split('?');
  const query = new URLSearchParams(qs || '');
  const match = ROUTES.map(([re, tab, fn, full]) => ({ m: path.match(re), tab, fn, full })).find((r) => r.m);
  if (!match) { location.replace('#/today'); return; }

  const view = h('div', { class: 'view' });
  try {
    await match.fn(view, ...match.m.slice(1), query);
  } catch (e) {
    console.error(e);
    view.append(h('div', { class: 'card empty-card' }, ico('triangle', 36, 2), h('p', { class: 'muted small' }, String(e.message || e))));
  }
  if (seq !== renderSeq) return; // 已被更新的渲染取代
  document.body.classList.toggle('fullscreen', !!match.full);
  drawTabbar(match.tab);
  screen.replaceChildren(view);
  drawEdge();
  onScroll();
}

/* ---------- 家庭密码（与 Latein lernen 相同的解锁页） ---------- */
function unlockScreen(status) {
  setLang(S.current().uiLang);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const err = h('p', { class: 'err', role: 'alert' });
  let card;
  if (status === 'locked') {
    const input = h('input', { type: 'password', autocomplete: 'current-password', placeholder: t('unlock.placeholder'), 'aria-label': t('unlock.placeholder'), id: 'unlock-pw' });
    const btn = h('button', { class: 'primary big', type: 'submit', disabled: true }, t('unlock.open'));
    input.addEventListener('input', () => { btn.disabled = !input.value; err.textContent = ''; });
    const form = h('form', {}, h('p', { class: 'muted' }, t('unlock.prompt')), input, err, btn);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!input.value) return;
      btn.disabled = true; btn.textContent = t('unlock.busy');
      const r = await vault.unlock(input.value);
      if (r === 'ok') return start();
      err.textContent = t('unlock.wrong');
      btn.disabled = false; btn.textContent = t('unlock.open');
      input.select();
    });
    card = [form];
    setTimeout(() => input.focus(), 100);
  } else {
    card = [h('p', { class: 'muted' }, t(status === 'offline' ? 'unlock.offline' : 'unlock.missing')),
      h('button', { class: 'primary big', type: 'button', onclick: boot }, t('unlock.retry'))];
  }
  put(appRoot, 'replaceChildren', h('div', { class: 'center-screen unlock' },
    h('div', { class: 'aurora-bg' }),
    h('div', { class: 'glass-card' },
      h('img', { src: 'icons/icon-192.png', width: 96, height: 96, alt: '', class: 'unlock-icon' }),
      h('h1', {}, t('app.name')),
      card,
      !standalone ? h('p', { class: 'muted small install-hint' }, t('unlock.installHint')) : null)));
}

let started = false;
function start() {
  appRoot.replaceChildren(shell);
  if (!started) {
    started = true;
    setRefresh(render);
    S.onChange(render);
    window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
  }
  render();
}


async function boot() {
  const status = await vault.init();
  if (status === 'ready') start();
  else unlockScreen(status);
}

S.load();
boot();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
