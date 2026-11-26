import * as S from '../store.js';
import { UI_LANGS } from '../locales.js';
import { t } from '../i18n.js';
import { h, go, put, sheet, avatar, confirmBox, toast, group, row, segmented, ico, iconTile } from '../ui.js';
import { header } from './common.js';
import { lock } from '../vault.js';
import * as IMP from '../importer.js';

export const APP_VERSION = '0.2.0';

/** 点头像弹出的档案切换 */
export function openSwitcher() {
  const cur = S.current();
  let close;
  const body = h('div', {},
    group(null, S.profiles().map((p) => row({
      icon: avatar(p, 'md'), title: p.name, sub: `★ ${S.rewards(p.id).stars} · ${t('rw.days', { n: S.rewards(p.id).streak })}`,
      detail: p.id === cur.id ? ico('check', 20, 2.6, 'accent-ico') : null,
      onClick: () => { S.setCurrent(p.id); close(); }, cls: p.id === cur.id ? 'row-on' : '', attrs: { 'data-profile': p.id },
    }))),
    group(null, [row({
      icon: iconTile('plus', 'var(--green)', 30), title: t('settings.addProfile'), cls: 'row-accent',
      onClick: () => { close(); go('#/profile/new'); }, attrs: { 'data-switch-add': '' },
    }), row({
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
        onClick: () => go('#/profile/new'),
      }),
      row({
        icon: iconTile('trash', 'var(--red)', 30), title: t('settings.deleteProfile'), cls: 'row-destructive',
        onClick: async () => { if (await confirmBox(t('settings.deleteConfirm', { name: p.name }), { okText: t('common.delete'), danger: true })) S.removeProfile(p.id); },
      }),
    ].filter(Boolean)),
    group(t('settings.backup'), [
      row({ icon: iconTile('share', 'var(--blue)', 30), title: t('settings.export'), chev: true, onClick: () => {
        const blob = new Blob([S.exportJSON()], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `familie-lernen-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a); a.click(); a.remove();
      } }),
      row({ icon: iconTile('download', 'var(--indigo)', 30), title: t('settings.import'), chev: true, onClick: () => fileInput.click() }),
    ], t('settings.storageNote')),
    group(t('imp.title'), [row({
      icon: iconTile('download', 'var(--teal)', 30), title: t('imp.oneClick'), chev: true, cls: 'row-accent',
      attrs: { 'data-import': '' }, onClick: openImport,
    })], t('imp.sub')),
    group(t('settings.security'), [row({
      icon: iconTile('lock', 'var(--gray)', 30), title: t('settings.lock'), cls: 'row-accent', attrs: { 'data-lock': '' },
      onClick: async () => { if (await confirmBox(t('settings.lockConfirm'), { okText: t('settings.lock') })) { lock(); location.reload(); } },
    })]),
    fileInput,
    h('p', { class: 'muted small center' }, `${t('app.name')} · v${APP_VERSION}`),
  );
}

/* ---------- 一键导入（原 Artikel lernen / Latein lernen 的进度） ---------- */
export async function openImport() {
  const body = h('div', { class: 'import-sheet' }, h('p', { class: 'muted' }, t('imp.scanning')));
  const close = sheet(t('imp.title'), body);
  let found = { artikel: [], latein: null };
  try { found = await IMP.scanDevice(); } catch { /* 无 */ }
  const fromDevice = found.artikel.length > 0 || !!found.latein;

  const fileInput = h('input', {
    type: 'file', accept: '.json,.csv,application/json,text/csv', hidden: true, onchange: async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const r = await IMP.readBackupFile(f);
        found = { artikel: [...found.artikel, ...r.artikel], latein: r.latein || found.latein };
        draw(true);
      } catch { toast(t('imp.badFile')); }
      e.target.value = '';
    },
  });

  const profileSelect = (def, attr, newName) => {
    const sel = h('select', { [attr]: '' },
      h('option', { value: '' }, t('imp.skip')),
      S.profiles().map((p) => h('option', { value: p.id }, `${p.avatar} ${p.name}`)),
      newName ? h('option', { value: 'new' }, t('imp.newProfile', { name: newName })) : null);
    sel.value = def;
    return sel;
  };
  const cur = S.current().id;

  function draw(hasFile) {
    const any = found.artikel.length > 0 || !!found.latein;
    const selects = [];
    const rows = [];
    found.artikel.forEach((a, i) => {
      const match = S.profiles().find((p) => p.name.trim().toLowerCase() === (a.name || '').trim().toLowerCase());
      const def = match ? match.id : found.artikel.length === 1 ? cur : (i === 0 ? cur : '');
      const sel = profileSelect(def, 'data-import-artikel', a.name);
      selects.push(() => sel.value && { kind: 'artikel', entry: a, pid: sel.value });
      const sm = IMP.artikelSummary(a.data);
      rows.push(row({ icon: iconTile('books', '#34c759', 30), title: t('imp.oldProfile', { name: `${a.avatar || ''} ${a.name}`.trim() }),
        sub: t('imp.artikelRec', { n: sm.answers, s: sm.stars }), detail: sel }));
    });
    if (found.latein) {
      const sel = profileSelect(cur, 'data-import-latein');
      selects.push(() => sel.value && { kind: 'latein', entry: found.latein, pid: sel.value });
      const sm = IMP.lateinSummary(found.latein);
      rows.push(row({ icon: iconTile('scroll', '#b23a22', 30), title: 'Latein lernen', sub: t('imp.lateinRec', { n: sm.cards, s: sm.stars }), detail: sel }));
    }
    const go = h('button', { type: 'button', class: 'primary big', 'data-import-go': '', disabled: !any }, t('imp.do'));
    go.onclick = async () => {
      const jobs = selects.map((f) => f()).filter(Boolean);
      if (!jobs.length) return;
      const overwrite = jobs.some((j) => j.kind === 'artikel' && IMP.artikelHasProgress(j.pid));
      if (overwrite && !(await confirmBox(t('imp.replaceConfirm'), { okText: t('imp.do') }))) return;
      go.disabled = true;
      const done = [];
      for (const j of jobs) {
        if (j.pid === 'new') {
          const np = S.addProfile(j.entry.name, { avatar: j.entry.avatar || undefined, uiLang: S.current().uiLang });
          j.pid = np.id;
          S.setCurrent(cur);
        }
        const name = S.profiles().find((p) => p.id === j.pid)?.name;
        if (j.kind === 'artikel') { IMP.importArtikel(j.entry, j.pid); done.push(`Artikel → ${name}`); }
        else { await IMP.importLatein(j.entry, j.pid); done.push(`Latein → ${name}`); }
      }
      S.save();
      close();
      toast(t('imp.done', { list: done.join(', ') }));
    };
    put(body, 'replaceChildren',
      any ? group(hasFile && !fromDevice ? t('imp.fromFile') : t('imp.found'), rows, t('imp.replaceNote')) : h('p', { class: 'muted import-none' }, t('imp.none')),
      any ? go : null,
      group(t('imp.file'), [row({ icon: iconTile('share', 'var(--blue)', 30), title: t('imp.chooseFile'), chev: true, onClick: () => fileInput.click(), attrs: { 'data-import-file': '' } })],
        h('span', {}, t('imp.howLatein'), h('br'), t('imp.howArtikel'))),
      fileInput);
  }
  draw(false);
}
