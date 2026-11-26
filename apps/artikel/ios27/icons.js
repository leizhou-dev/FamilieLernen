/* ipados27-ui · Icons als reines JavaScript (Port von components/Icons.tsx, Version 1.0.0)
   + einige zusätzliche Icons für „Artikel lernen“ (unten markiert). */
const IOS27_ICONS = {
  house: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>',
  books: '<rect x="3.5" y="4" width="4.5" height="16" rx="1"/><rect x="8" y="4" width="4.5" height="16" rx="1"/><path d="m13.6 5.2 4.3-1.1 3.6 14.6-4.3 1.1z"/>',
  chart: '<path d="M4 20h16"/><rect x="5.5" y="12" width="3" height="6" rx=".8"/><rect x="10.5" y="7" width="3" height="11" rx=".8"/><rect x="15.5" y="4" width="3" height="14" rx=".8"/>',
  speaker: '<path d="M4 9.5h3l4.5-4v13l-4.5-4H4z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  xmark: '<path d="m6.5 6.5 11 11"/><path d="m17.5 6.5-11 11"/>',
  chevronLeft: '<path d="m14.5 5-7 7 7 7"/>',
  chevronRight: '<path d="m9.5 5 7 7-7 7"/>',
  repeat: '<path d="M4.5 11a7.5 7.5 0 0 1 13-4.5L19.5 9"/><path d="M19.5 4v5h-5"/><path d="M19.5 13a7.5 7.5 0 0 1-13 4.5L4.5 15"/><path d="M4.5 20v-5h5"/>',
  sparkles: '<path d="M10 3.5 11.6 8.4 16.5 10l-4.9 1.6L10 16.5 8.4 11.6 3.5 10l4.9-1.6Z"/><path d="M17.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.4-5.4 3.6-7.8.4 1.6 1.2 2.6 2.2 3.1C11.5 7.3 13 5 15 3c.2 3.1 3.5 5.6 3.5 11.9 0 3.5-2.6 6.1-6.5 6.1Z"/>',
  download: '<path d="M12 3.5v11"/><path d="m8 10.5 4 4 4-4"/><path d="M8.5 10H6.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1h-2"/>',
  pencil: '<path d="M15.5 4.5l4 4L9 19l-5 1 1-5z"/><path d="m13.5 6.5 4 4"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 9.5h.01M9 9.5h.01M12 9.5h.01M15 9.5h.01M18 9.5h.01M6.5 12.5h.01M9.5 12.5h.01M12.5 12.5h.01M15.5 12.5h.01M8 15h8"/>',
  checklist: '<path d="m3.5 6.5 1.5 1.5 3-3"/><path d="m3.5 13.5 1.5 1.5 3-3"/><path d="M11 7h9.5M11 14h9.5"/><path d="M4 19.5h4M11 19.5h9.5"/>',
  cards: '<rect x="3" y="6.5" width="13" height="14" rx="2.2"/><path d="M7 6.5V5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/>',
  trash: '<path d="M4.5 6.5h15"/><path d="M9.5 6.5V4.5h5v2"/><path d="M6.5 6.5l1 13a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-13"/>',
  magnifier: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  wrench: '<path d="M14.5 4a4.5 4.5 0 0 0-4.2 6.1L4 16.4V20h3.6l6.3-6.3A4.5 4.5 0 0 0 20 9.5l-3 1-2.5-2.5 1-3Z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  graduation: '<path d="m2.5 9 9.5-5 9.5 5-9.5 5z"/><path d="M6.5 11v5c1.5 1.6 3.4 2.5 5.5 2.5s4-.9 5.5-2.5v-5"/><path d="M21.5 9v6"/>',
  bulb: '<path d="M9 17.5h6"/><path d="M10 20.5h4"/><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2V17h5v-.7c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3.5Z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l1-1"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.8 2.7L16 9.5"/>',
  triangle: '<path d="M12 4 21 19.5H3Z"/><path d="M12 10v4M12 16.8h.01"/>',
  /* ---- Ergänzungen für Artikel lernen ---- */
  person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  people: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  tray: '<path d="M3.5 13.5 6 5.5h12l2.5 8"/><path d="M3.5 13.5v5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-5h-5.5a3 3 0 0 1-6 0Z"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2"/><path d="M9.5 3h5"/><path d="m18.5 6.5 1.5-1.5"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4" height="6.5" rx="1.5"/>',
  textformat: '<path d="M3 19 8 5l5 14"/><path d="M4.8 14h6.4"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M21 12v7"/>',
  shuffle: '<path d="M3.5 7h3.5c4.5 0 5.5 10 10 10h3.5"/><path d="M3.5 17h3.5c1.6 0 2.7-1.3 3.6-3"/><path d="M13.4 10c.9-1.7 2-3 3.6-3h3.5"/><path d="m18 4.5 2.5 2.5-2.5 2.5"/><path d="m18 14.5 2.5 2.5-2.5 2.5"/>',
  squares: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  bandage: '<rect x="2.6" y="8.2" width="18.8" height="7.6" rx="3.8" transform="rotate(-45 12 12)"/><path d="M10.6 10.6h.01M13.4 13.4h.01M13.4 10.6h.01M10.6 13.4h.01"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.6"/>',
  ellipsis: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  doc: '<path d="M6.5 3.5h7l4 4v12a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"/><path d="M13.5 3.5v4h4"/><path d="M8.5 12.5h7M8.5 16h5"/>',
  turtle: '<path d="M5 15.5c0-4 3.1-7 7-7s7 3 7 7Z"/><path d="M19 15.5h1.5a1.5 1.5 0 0 0 0-3H19"/><path d="M7 15.5 6 18.5M17 15.5l1 3M10 15.5v2M14 15.5v2"/>',
  bubble: '<path d="M4 6.5a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5Z"/>',
  delete: '<path d="M8.5 5.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11L3.5 12Z"/><path d="m11 9.5 5 5M16 9.5l-5 5"/>',
};
function ico(name, size = 24, weight = 1.8, cls = '') {
  return `<svg class="ico${cls ? ' ' + cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IOS27_ICONS[name] || ''}</svg>`;
}
function iconTile(name, color, size = 34) {
  return `<span class="icon-tile" style="background:${color};width:${size}px;height:${size}px">${ico(name, Math.round(size * 0.62), 2)}</span>`;
}
