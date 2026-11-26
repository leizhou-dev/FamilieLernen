// 一键导入：把原来独立的「Artikel lernen」「Latein lernen」的进度复制到家庭档案。
// 原 App 只被读取，不会被修改。
//
// 来源：
//   1. 同一网站（leizhou-dev.github.io）上的存储：Artikel 的 localStorage「artikel-lernen-v1」，
//      Latein 的 IndexedDB「latein-lernen」。在 Mac / Safari 里通常能直接读到。
//      iPad / iPhone 主屏幕上的网页 App 各自隔离，读不到 → 用备份文件。
//   2. 备份文件：Latein 的「Sicherung」(.json)，Artikel 家长区的「Export als CSV」(.csv，按答题记录重建进度)。
import * as S from './store.js';
import { file as vaultFile } from './vault.js';

const ART_OLD = 'artikel-lernen-v1';
const ART_NEW = 'familie.artikel.v1';
const LAT_OLD = 'latein-lernen';
const latNew = (pid) => 'familie-latein-' + pid;

/* ---------- IndexedDB（与 idb-keyval 相同的结构：数据库 → 对象库「kv」） ---------- */
function idbOpen(name, create) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name);
    req.onupgradeneeded = () => { if (create) req.result.createObjectStore('kv'); else req.transaction.abort(); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbExists(name) {
  if (!indexedDB.databases) return true; // 旧浏览器：尝试打开（不存在时 abort，不会创建）
  return (await indexedDB.databases()).some((d) => d.name === name);
}
function idbGetAll(db, keys) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const st = tx.objectStore('kv');
    const out = {};
    keys.forEach((k) => { const r = st.get(k); r.onsuccess = () => { out[k] = r.result; }; });
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
  });
}
function idbPutAll(db, values) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const st = tx.objectStore('kv');
    for (const [k, v] of Object.entries(values)) if (v !== undefined) st.put(v, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- 来源 1：同一网站的存储 ---------- */
/** 返回 { artikel: [{ key, name, avatar, data }], latein: { progress, settings, stats } | null } */
export async function scanDevice() {
  const out = { artikel: [], latein: null };
  try {
    const old = JSON.parse(localStorage.getItem(ART_OLD) || 'null');
    for (const p of old?.profiles || []) {
      const d = old.data?.[p.id];
      if (d) out.artikel.push({ key: p.id, name: p.name, avatar: p.avatar, data: d });
    }
  } catch { /* 无 */ }
  try {
    if (await idbExists(LAT_OLD)) {
      const db = await idbOpen(LAT_OLD, false);
      const v = await idbGetAll(db, ['progress', 'settings', 'stats']);
      db.close();
      if (v.progress && Object.keys(v.progress).length) out.latein = v;
    }
  } catch { /* 无 */ }
  return out;
}

/* ---------- 来源 2：备份文件 ---------- */
export async function readBackupFile(f) {
  const text = (await f.text()).replace(/^﻿/, '');
  if (/\.json$/i.test(f.name) || text.trimStart().startsWith('{')) {
    const b = JSON.parse(text);
    if (b?.app !== 'latein-lernen' || typeof b.progress !== 'object') throw new Error('bad');
    return { artikel: [], latein: { progress: b.progress, settings: b.settings, stats: b.stats } };
  }
  return { artikel: artikelFromCSV(text), latein: null };
}

// —— Artikel CSV → 进度（重放答题记录，规则与 Artikel lernen 的 grade() 相同） ——
const DAY = 864e5;
const INTERVAL = [0, 0, 1, 3, 7, 21].map((d) => d * DAY);
const MODES = {
  'Artikel-Quiz': ['quiz', 'art'], 'Karteikasten': ['kasten', 'art'], 'Fehlerwörter': ['fehler', 'art'],
  'Sortieren': ['sort', 'art'], 'Zeitrennen': ['rennen', 'art'], 'Lückensätze': ['satz', 'art'],
  'Fehler finden': ['finden', 'art'], 'Geschichten': ['geschichte', 'art'], 'Mehrzahl': ['plural', 'pl'],
  'Hören & Schreiben': ['hoeren', 'voc'], 'Buchstabensalat': ['salat', 'voc'], 'Lernkarten': ['karten', 'voc'],
};
export function artikelNewData() {
  return {
    settings: { stufen: ['1/2', '3/4'], themen: [], wortarten: ['Nomen', 'Verb', 'Adjektiv', 'Kleines Wort', 'Zahlwort'], tts: true, farben: true, runde: 10, stimme: '' },
    art: {}, voc: {}, pl: {}, stars: 0, log: [], rounds: [], best: { rennen: 0 }, days: [],
  };
}
function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ';') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
function artikelFromCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length || rows[0][0] !== 'Profil' || rows[0][4] !== 'Wort') throw new Error('bad');
  const words = vaultFile('artikel/words.json');
  const byKey = new Map();
  for (const w of words) {
    byKey.set(`${w.wort}|${w.artikel || ''}`, w);
    if (!byKey.has(w.wort)) byKey.set(w.wort, w);
  }
  const profiles = new Map();
  for (const [name, datum, zeit, uebung, wort, artikel, ergebnis] of rows.slice(1)) {
    const mode = MODES[uebung];
    const w = byKey.get(`${wort}|${artikel}`) || byKey.get(wort);
    const dm = datum?.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!mode || !w || !dm) continue;
    const [h, mi, se] = (zeit || '0:0:0').split(':').map(Number);
    const t = new Date(+dm[3], +dm[2] - 1, +dm[1], h || 0, mi || 0, se || 0).getTime();
    if (!profiles.has(name)) profiles.set(name, []);
    profiles.get(name).push({ t, m: mode[0], kind: mode[1], w: w.id, ok: ergebnis === 'richtig' });
  }
  return [...profiles].map(([name, log]) => {
    log.sort((a, b) => a.t - b.t);
    const d = artikelNewData();
    for (const l of log) {
      const r = d[l.kind][l.w] || (d[l.kind][l.w] = { b: 1, due: 0, ok: 0, err: 0 });
      if (l.ok) { r.ok++; r.b = Math.min(5, r.b + 1); d.stars++; } else { r.err++; r.b = 1; }
      r.due = l.t + INTERVAL[r.b];
      r.last = l.t;
      d.log.push({ t: l.t, m: l.m, w: l.w, ok: l.ok ? 1 : 0 });
      const day = new Date(l.t).toISOString().slice(0, 10);
      if (!d.days.includes(day)) d.days.push(day);
    }
    return { key: 'csv:' + name, name, avatar: '', data: d };
  });
}

/* ---------- 写入家庭档案 ---------- */
export function artikelSummary(d) {
  return { answers: d.log?.length || 0, stars: d.stars || 0, words: Object.keys(d.art || {}).length + Object.keys(d.voc || {}).length };
}
export function lateinSummary(v) {
  return { cards: Object.keys(v.progress || {}).length, stars: v.stats?.stars || 0 };
}

/** 当前家庭档案在新 Artikel 里是否已有进度 */
export function artikelHasProgress(pid) {
  try { return !!JSON.parse(localStorage.getItem(ART_NEW) || 'null')?.data?.[pid]?.log?.length; } catch { return false; }
}

export function importArtikel(oldEntry, pid) {
  let s;
  try { s = JSON.parse(localStorage.getItem(ART_NEW) || 'null'); } catch { s = null; }
  s ||= { profiles: [], current: null, data: {} };
  const fp = S.profiles().find((p) => p.id === pid);
  if (!s.profiles.some((p) => p.id === pid)) s.profiles.push({ id: pid, name: fp.name, avatar: fp.avatar });
  s.data[pid] = structuredClone(oldEntry.data);
  localStorage.setItem(ART_NEW, JSON.stringify(s));
  S.addCourse('artikel', {}, pid);
}

export async function importLatein(v, pid) {
  const db = await idbOpen(latNew(pid), true);
  await idbPutAll(db, { progress: v.progress, settings: v.settings, stats: v.stats });
  db.close();
  S.addCourse('latein', {}, pid);
}
