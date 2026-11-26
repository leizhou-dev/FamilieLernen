// ipados27-ui 图标（移植自 _shared/ipados27-ui/components/Icons.tsx，1.0.1）
// 下方「本 App 新增」部分是额外画的图标，风格一致。
const P = {
  house: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>',
  books: '<rect x="3.5" y="4" width="4.5" height="16" rx="1"/><rect x="8" y="4" width="4.5" height="16" rx="1"/><path d="m13.6 5.2 4.3-1.1 3.6 14.6-4.3 1.1z"/>',
  scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7"/><path d="M6 4a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2Z"/><path d="M7 20a2 2 0 0 1-2-2V7"/><path d="M10 9h6M10 12.5h6M10 16h4"/>',
  chart: '<path d="M4 20h16"/><rect x="5.5" y="12" width="3" height="6" rx=".8"/><rect x="10.5" y="7" width="3" height="11" rx=".8"/><rect x="15.5" y="4" width="3" height="14" rx=".8"/>',
  speaker: '<path d="M4 9.5h3l4.5-4v13l-4.5-4H4z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  xmark: '<path d="m6.5 6.5 11 11"/><path d="m17.5 6.5-11 11"/>',
  chevronLeft: '<path d="m14.5 5-7 7 7 7"/>',
  chevronRight: '<path d="m9.5 5 7 7-7 7"/>',
  repeat: '<path d="M4.5 11a7.5 7.5 0 0 1 13-4.5L19.5 9"/><path d="M19.5 4v5h-5"/><path d="M19.5 13a7.5 7.5 0 0 1-13 4.5L4.5 15"/><path d="M4.5 20v-5h5"/>',
  sparkles: '<path d="M10 3.5 11.6 8.4 16.5 10l-4.9 1.6L10 16.5 8.4 11.6 3.5 10l4.9-1.6Z"/><path d="M17.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  share: '<path d="M12 3.5v11"/><path d="m8 7.5 4-4 4 4"/><path d="M8.5 10H6.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1h-2"/>',
  download: '<path d="M12 3.5v11"/><path d="m8 10.5 4 4 4-4"/><path d="M8.5 10H6.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1h-2"/>',
  pencil: '<path d="M15.5 4.5l4 4L9 19l-5 1 1-5z"/><path d="m13.5 6.5 4 4"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 9.5h.01M9 9.5h.01M12 9.5h.01M15 9.5h.01M18 9.5h.01M6.5 12.5h.01M9.5 12.5h.01M12.5 12.5h.01M15.5 12.5h.01M8 15h8"/>',
  checklist: '<path d="m3.5 6.5 1.5 1.5 3-3"/><path d="m3.5 13.5 1.5 1.5 3-3"/><path d="M11 7h9.5M11 14h9.5"/><path d="M4 19.5h4M11 19.5h9.5"/>',
  cards: '<rect x="3" y="6.5" width="13" height="14" rx="2.2"/><path d="M7 6.5V5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/>',
  trash: '<path d="M4.5 6.5h15"/><path d="M9.5 6.5V4.5h5v2"/><path d="M6.5 6.5l1 13a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-13"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M3.5 14.5h17M12 4.5v15"/>',
  wrench: '<path d="M14.5 4a4.5 4.5 0 0 0-4.2 6.1L4 16.4V20h3.6l6.3-6.3A4.5 4.5 0 0 0 20 9.5l-3 1-2.5-2.5 1-3Z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  graduation: '<path d="m2.5 9 9.5-5 9.5 5-9.5 5z"/><path d="M6.5 11v5c1.5 1.6 3.4 2.5 5.5 2.5s4-.9 5.5-2.5v-5"/><path d="M21.5 9v6"/>',
  bulb: '<path d="M9 17.5h6"/><path d="M10 20.5h4"/><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2V17h5v-.7c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3.5Z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l1-1"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.8 2.7L16 9.5"/>',
  triangle: '<path d="M12 4 21 19.5H3Z"/><path d="M12 10v4M12 16.8h.01"/>',
  // —— 本 App 新增 ——
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5s1.1-6.1 3.5-8.5Z"/>',
  laptop: '<rect x="4.5" y="5" width="15" height="10.5" rx="1.8"/><path d="M2.5 19h19"/>',
  plusminus: '<path d="M7 4v7M3.5 7.5h7"/><path d="M13.5 16.5h7"/><path d="m4 20 16-16"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4" height="6.5" rx="1.5"/>',
  bookOpen: '<path d="M12 6.5c-1.8-1.4-4.4-2-7.5-2v13c3.1 0 5.7.6 7.5 2 1.8-1.4 4.4-2 7.5-2v-13c-3.1 0-5.7.6-7.5 2Z"/><path d="M12 6.5v13"/>',
  bubble: '<path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3.5V16.5h0a2 2 0 0 1-2-2Z"/>',
  puzzle: '<path d="M5 8.5h3.2a2 2 0 1 1 3.6 0H15v3.3a2 2 0 1 1 0 3.6V19H5v-3.6a2 2 0 1 0 0-3.6Z"/>',
  textformat: '<path d="M4 19 9 5l5 14"/><path d="M5.8 14h6.4"/><path d="M15.5 12.5a2.5 2.5 0 1 1 5 0V19M20.5 15.5h-2.6a2 2 0 1 0 0 3.5h2.6"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v2.5"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  play: '<path d="M8 5.5v13l10-6.5Z"/>',
  person: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeSlash: '<path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.3 1M21.5 12s-3.5 6.5-9.5 6.5c-1.6 0-3-.4-4.3-1"/><path d="m4 20 16-16"/>',
};

const NS = 'http://www.w3.org/2000/svg';

export function ico(name, size = 24, weight = 1.8, cls = '') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ico' + (cls ? ' ' + cls : ''));
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', weight);
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = P[name] || P.circle || '<circle cx="12" cy="12" r="8.5"/>';
  return svg;
}

export function iconTile(name, color, size = 34) {
  const span = document.createElement('span');
  span.className = 'icon-tile';
  Object.assign(span.style, { background: color, width: size + 'px', height: size + 'px' });
  span.append(ico(name, Math.round(size * 0.62), 2));
  return span;
}
