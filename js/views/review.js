import { t, tr } from '../i18n.js';
import { h, go, put, group, row, ico } from '../ui.js';
import { collectReview } from './play.js';
import { typeTile } from './structured.js';
import { course } from '../registry.js';
import { header } from './common.js';

const itemRows = (entries) => entries.slice(0, 30).map((e) => row({
  icon: typeTile(e.activity.type, 30),
  title: h('span', { lang: 'de' }, e.item.prompt || e.item.front || e.item.scenario || e.item.id),
  sub: `${tr(course(e.courseId).title)} · ${e.activity.title}`,
  attrs: { 'data-review-item': e.item.id },
}));

function section(title, count, key, entries, btnLabel, empty, primary) {
  return h('section', { class: 'review-section' },
    h('div', { class: 'section-head' },
      h('h2', { class: 'section-title' }, title, h('span', { class: 'count', 'data-count': key }, count)),
      count ? h('button', { type: 'button', class: (primary ? 'primary' : 'secondary') + ' sm', 'data-review': key, onclick: () => go('#/review/' + key) },
        ico(key === 'fav' ? 'star' : 'repeat', 16, 2.2), btnLabel) : null),
    group(null, count ? itemRows(entries) : [row({ title: h('span', { class: 'muted' }, empty) })]));
}

export async function renderReview(root) {
  const [wrong, fav] = await Promise.all([collectReview('wrong'), collectReview('fav')]);
  put(root, 'append',
    header(t('nav.review')),
    section(t('review.wrong'), wrong.length, 'wrong', wrong, t('review.startWrong'), t('review.emptyWrong'), true),
    section(t('review.fav'), fav.length, 'fav', fav, t('review.startFav'), t('review.emptyFav'), false),
    h('p', { class: 'group-footer' }, t('review.extNote')),
  );
}
