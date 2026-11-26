import * as S from '../store.js';
import { UI_LANGS } from '../locales.js';
import { t } from '../i18n.js';
import { h, go, put, sheet, avatar, confirmBox, promptBox, toast, group, row, segmented, ico, iconTile } from '../ui.js';
import { header } from './common.js';
import { lock } from '../vault.js';

export const APP_VERSION = '0.2.0';

/** 点头像弹出的档案切换 */
export function openSwitcher() {
  const cur = S.current();
  let close;
  const body = h('div', {},
    group(null, S.profiles().map((p) => row({
      icon: avatar(p, 'md'), title: p.name, sub: t('lang.' + p.uiLang),
      detail: p.id === cur.id ? ico('check', 20, 2.6, 'accent-ico') : null,
      onClick: () => { S.setCurrent(p.id); close(); }, cls: p.id === cur.id ? 'row-on' : '', attrs: { 'data-profile': p.id },
    }))),
    group(null, [row({
      icon: iconTile('gear', 'var(--gray)', 30), title: t('switch.manage'), chev: true,
      onClick: () => { close(); go('#/settings'); }, attrs: { 'data-settings': '' },
    })]));
  close = sheet(t('switch.title'), body);
}

export function renderSettings(root) {
  const p = S.current();
  const upd = (patch) => S.updateProfile(p.id, patch);
  const name = h('input', { class: 'inline-input', value: p.name, 'data-field': 'name', maxlength: 24, 'aria-label': t('settings.name') });
  name.addEventListener('change', () => name.value.trim() && upd({ name: name.value.trim() }));

  const fileInput = h('input', {
    type: 'file', accept: 'application/json', hidden: true, onchange: async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!(await confirmBox(t('settings.importConfirm'), { danger: true }))) return;
      try { S.importJSON(await f.text()); toast(t('settings.importOk')); } catch { toast(t('settings.importBad')); }
    },
  });

  put(root, 'append',
    header(t('settings.title')),
    group(t('settings.profile'), [
      row({ icon: avatar(p, 'lg'), title: name }),
      h('div', { class: 'seg-row' }, h('div', { class: 'field-label' }, t('settings.avatar')),
        h('div', { class: 'emoji-grid' }, S.AVATARS.map((a) =>
          h('button', { type: 'button', class: 'emoji' + (a === p.avatar ? ' on' : ''), onclick: () => upd({ avatar: a }) }, a)))),
      h('div', { class: 'seg-row' }, h('div', { class: 'field-label' }, t('settings.color')),
        h('div', { class: 'emoji-grid' }, S.COLORS.map((c) =>
          h('button', { type: 'button', class: 'swatch' + (c === p.color ? ' on' : ''), style: { background: c }, 'aria-label': c, onclick: () => upd({ color: c }) })))),
    ]),
    group(t('settings.uiLang'), [h('div', { class: 'seg-row' },
      segmented(UI_LANGS.map((l) => [l, t('lang.' + l)]), p.uiLang, (v) => upd({ uiLang: v }), 'data-ui-lang'))]),
    group(t('settings.explainLang'), [h('div', { class: 'seg-row' },
      segmented([['auto', t('settings.explainAuto')], ...UI_LANGS.map((l) => [l, t('lang.' + l)])], p.explainLang || 'auto', (v) => upd({ explainLang: v }), 'data-explain-lang'))]),
    group(t('settings.profiles'), [
      ...S.profiles().map((x) => row({
        icon: avatar(x, 'md'), title: x.name, sub: t('lang.' + x.uiLang),
        detail: x.id === p.id ? ico('check', 20, 2.6, 'accent-ico') : null, onClick: () => S.setCurrent(x.id), cls: x.id === p.id ? 'row-on' : '',
      })),
      row({
        icon: iconTile('plus', 'var(--green)', 30), title: t('settings.addProfile'), cls: 'row-accent', attrs: { 'data-add-profile': '' },
        onClick: async () => { const n = await promptBox(t('settings.addProfile'), t('settings.newProfileName')); if (n) S.setCurrent(S.addProfile(n).id); },
      }),
      S.profiles().length > 1 ? row({
        icon: iconTile('trash', 'var(--red)', 30), title: t('settings.deleteProfile'), cls: 'row-destructive',
        onClick: async () => { if (await confirmBox(t('settings.deleteConfirm', { name: p.name }), { okText: t('common.delete'), danger: true })) S.removeProfile(p.id); },
      }) : null,
    ].filter(Boolean)),
    group(t('settings.backup'), [
      row({ icon: iconTile('share', 'var(--blue)', 30), title: t('settings.export'), chev: true, onClick: () => {
        const blob = new Blob([S.exportJSON()], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `familie-lernen-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a); a.click(); a.remove();
      } }),
      row({ icon: iconTile('download', 'var(--indigo)', 30), title: t('settings.import'), chev: true, onClick: () => fileInput.click() }),
    ], t('settings.storageNote')),
    group(t('settings.security'), [row({
      icon: iconTile('lock', 'var(--gray)', 30), title: t('settings.lock'), cls: 'row-accent', attrs: { 'data-lock': '' },
      onClick: async () => { if (await confirmBox(t('settings.lockConfirm'), { okText: t('settings.lock') })) { lock(); location.reload(); } },
    })]),
    fileInput,
    h('p', { class: 'muted small center' }, `${t('app.name')} · v${APP_VERSION}`),
  );
}
