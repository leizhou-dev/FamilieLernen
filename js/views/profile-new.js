// 新建档案：和 Artikel lernen 一样，打开后自己创建（名字 + 头像），另外选界面语言。
import * as S from '../store.js';
import { UI_LANGS } from '../locales.js';
import { t, setLang } from '../i18n.js';
import { h, put, segmented, go, backLink } from '../ui.js';

export function renderNewProfile(root, _q, { first = false, onDone } = {}) {
  const hasProfiles = S.profiles().length > 0;
  let avatar = S.AVATARS[Math.floor(Math.random() * S.AVATARS.length)];
  let lang = S.current()?.uiLang || S.deviceLang();
  setLang(lang);

  const big = h('div', { class: 'np-avatar' }, avatar);
  const name = h('input', { id: 'np-name', maxlength: 24, autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: t('np.name'), 'aria-label': t('np.name') });
  const avatars = h('div', { class: 'np-avatars' }, S.AVATARS.map((a) => h('button', {
    type: 'button', class: a === avatar ? 'on' : '', 'data-avatar': a,
    onclick: (e) => { avatar = a; big.textContent = a; avatars.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); },
  }, a)));
  const langSeg = () => segmented(UI_LANGS.map((l) => [l, t('lang.' + l)]), lang, (v) => {
    lang = v; setLang(v);
    // 文案即时切换
    const keep = name.value;
    put(root, 'replaceChildren', ...build());
    name.value = keep;
  }, 'data-np-lang');

  const submit = (e) => {
    e.preventDefault();
    const n = name.value.trim();
    if (!n) { name.classList.add('shake'); setTimeout(() => name.classList.remove('shake'), 400); name.focus(); return; }
    const color = S.COLORS[S.profiles().length % S.COLORS.length];
    S.addProfile(n, { avatar, color, uiLang: lang });
    if (onDone) onDone(); else go('#/today');
  };

  const build = () => [
    h('div', { class: 'aurora-bg' }),
    h('div', { class: 'center-screen np-screen' },
      h('div', { class: 'glass-card' },
        !first && hasProfiles ? h('div', { class: 'np-back' }, backLink('#/settings', t('settings.title'))) : null,
        big,
        h('h1', {}, first ? t('np.welcome') : t('np.hello')),
        first ? h('p', { class: 'muted' }, t('np.sub')) : null,
        h('form', { id: 'np-form', onsubmit: submit },
          name,
          h('div', { class: 'field-label np-label' }, t('np.avatar')),
          avatars,
          h('div', { class: 'field-label np-label' }, t('settings.uiLang')),
          langSeg(),
          h('button', { class: 'primary big', type: 'submit', 'data-np-go': '' }, t('np.start'))))),
  ];
  put(root, 'append', ...build());
  setTimeout(() => name.focus(), 120);
}
