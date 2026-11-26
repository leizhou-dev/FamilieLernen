// Mathe · Kern: Zufall mit Seed, Zahlenformat, Eingabe-Parser, Rechenzeichen, Item-Bau.
// Läuft im Browser und in Node (für die Massenprüfung) – kein DOM.

/* ---------- Zufall (reproduzierbar über den Seed) ---------- */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => { const a2 = [...arr]; for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; },
  };
  return r;
}
export const newSeed = () => (Math.random() * 2 ** 32) >>> 0;

/* ---------- Zahlen ---------- */
export const MAX = 100000;
const NNBSP = ' ';
/** 48 800 · ab 5 Stellen mit schmalem Leerzeichen gruppiert (wie im Schulbuch), 4-stellig ohne */
export function fmt(n) {
  const neg = n < 0;
  const s = String(Math.abs(n));
  const g = s.length >= 5 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP) : s;
  return (neg ? '−' : '') + g;
}
export const fmtSigned = (n) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));

/** Eingabe → Zahl. Ignoriert Leerzeichen am Rand und Tausender-Leerzeichen (auch „48.800“). NaN wenn ungültig. */
export function parseNum(raw, { signed = false } = {}) {
  if (raw == null) return NaN;
  let s = String(raw).replace(/[\s   ]/g, '').replace(/[−–]/g, '-');
  if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const re = signed ? /^[+-]\d+$/ : /^\d+$/;
  if (!re.test(s)) return NaN;
  return parseInt(s, 10);
}

/* ---------- Rechenzeichen ---------- */
export const OPS = {
  '+': { sym: '+', f: (a, b) => a + b, inv: '−', point: false },
  '−': { sym: '−', f: (a, b) => a - b, inv: '+', point: false },
  '·': { sym: '·', f: (a, b) => a * b, inv: ':', point: true },
  ':': { sym: ':', f: (a, b) => (b !== 0 && a % b === 0 ? a / b : NaN), inv: '·', point: true },
};
export const apply = (op, a, b) => OPS[op].f(a, b);
export const OP_ZH = { '+': '加', '−': '减', '·': '乘', ':': '除以' };

/* ---------- Prüfen beim Erzeugen ---------- */
export class InvalidParams extends Error {}
export function assert(cond, msg) { if (!cond) throw new InvalidParams(msg); }
export const isNat = (n) => Number.isInteger(n) && n >= 0 && n <= MAX;

/* ---------- Item ---------- */
function canonical(o) {
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
  return JSON.stringify(o);
}
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
/** normalisierte Parameter → Schlüssel zum Entdoppeln */
export const paramKey = (templateId, level, params) => templateId + '|' + level + '|' + canonical(params);

/**
 * Baut das vollständige Item. Pflichtfelder laut Spezifikation:
 * id, templateId, skill, subskill, difficulty, parameters, promptDe, answerType, fields, answer,
 * solutionSteps, hintsDe, hintsZh, explanationDe, explanationZh, misconceptionTags, validationRules
 * (+ seed, layout für die Darstellung).
 */
export function makeItem(tpl, level, params, seed, spec) {
  const key = paramKey(tpl.id, level, params);
  const fields = spec.fields || [];
  const answer = spec.answer || Object.fromEntries(fields.filter((f) => f.answer !== undefined).map((f) => [f.id, f.answer]));
  return {
    id: `${tpl.id}-L${level}-${hash(key)}`,
    templateId: tpl.id,
    skill: tpl.skill,
    subskill: tpl.subskill,
    difficulty: level,
    parameters: params,
    seed,
    promptDe: spec.promptDe,
    answerType: spec.answerType || 'fields',
    layout: spec.layout || [],
    fields,
    answer,
    solutionSteps: spec.solutionSteps || [],
    hintsDe: spec.hintsDe,
    hintsZh: spec.hintsZh,
    explanationDe: spec.explanationDe,
    explanationZh: spec.explanationZh,
    misconceptionTags: spec.misconceptionTags || [],
    validationRules: spec.validationRules || fields.map((f) => ({ field: f.id, type: f.rule?.type || 'equals' })),
    ...(spec.extra || {}),
  };
}

/** Feld-Helfer: number | signed | choice | pick (Reihenfolge) | multi (Mehrfachauswahl) */
export function field(id, kind, answer, { step, role = 'final', points = 1, options, width, rule, label } = {}) {
  return { id, kind, answer, step: step || id, role, points, options, width: width || String(answer ?? '').length || 3, rule, label };
}
