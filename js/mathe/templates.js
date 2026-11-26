// Mathe · Wissensbereiche, Vorlagen-Register, Generator, Prüfung.
import { rng, makeItem, paramKey, InvalidParams, newSeed, MAX } from './core.js';
import zahlenraum from './t-zahlenraum.js';
import begriffe from './t-begriffe.js';
import halbschriftlich from './t-halbschriftlich.js';
import punkt from './t-punkt.js';
import umkehr from './t-umkehr.js';
import { grade } from './grade.js';

export const TEMPLATES = [...zahlenraum, ...begriffe, ...halbschriftlich, ...punkt, ...umkehr];
const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));
export const template = (id) => BY_ID.get(id);

/** Wissensbereiche (Klasse 4, Bayern) mit ihren Vorlagen und Stufen */
export const SKILLS = [
  { id: 'zahlenraum', de: 'Zahlenraum bis 100 000', zh: '10 万以内的数', icon: 'chart', templates: ['Z-folge', 'Z-vergleichen', 'Z-ordnen', 'Z-nachbar1000', 'Z-nachbar10000'] },
  { id: 'begriffe', de: 'Rechenbegriffe', zh: '运算词语', icon: 'textformat', templates: ['R-wort', 'R-text', 'R-ergaenzen', 'R-richtung'] },
  { id: 'quadrat', de: 'Quadratzahlen', zh: '平方数', icon: 'table', templates: ['Q-ergebnis', 'Q-faktor', 'Q-erkennen'] },
  { id: 'multiplizieren', de: 'Halbschriftlich multiplizieren', zh: '半笔算乘法', icon: 'puzzle', templates: ['M-halbschriftlich'] },
  { id: 'dividieren', de: 'Halbschriftlich dividieren', zh: '半笔算除法', icon: 'cards', templates: ['D-halbschriftlich'] },
  { id: 'punktvorstrich', de: 'Punkt vor Strich', zh: '先乘除后加减', icon: 'target', templates: ['P-ausdruck', 'P-paar', 'P-fehler'] },
  { id: 'umkehr', de: 'Zahlenrätsel & Umkehraufgaben', zh: '数字谜与逆运算', icon: 'repeat', templates: ['U-einschritt', 'U-zweischritt', 'U-pfeil'] },
];
export const skill = (id) => SKILLS.find((s) => s.id === id);

/** Stufen-Beschreibung (für Oberfläche und Doku) */
export const LEVELS = {
  1: { de: 'Stufe 1 · mit Hilfen', zh: '第 1 级 · 有支架', textDe: 'Zerlegung, Rechnung oder Pfeilkette sind vorgegeben, nur wenige Lücken.', textZh: '提供拆分、算式或箭头支架，只填少量空格。' },
  2: { de: 'Stufe 2 · selbstständig', zh: '第 2 级 · 独立完成', textDe: 'Selbst zerlegen, mit Übertrag, Folgen über Tausender, zwei Schritte rückwärts.', textZh: '独立拆分，包含进位、跨整千的数列和两步逆运算。' },
  3: { de: 'Stufe 3 · gemischt', zh: '第 3 级 · 综合', textDe: 'Gemischte Aufgaben, Zehnerzahl als Teiler, Fehler finden, Text ↔ Rechnung.', textZh: '混合运算、整十数除法、改错、文字与算式互译。' },
};

/* ---------- Erzeugen ---------- */
export function build(tpl, level, params, seed) {
  return makeItem(tpl, level, params, seed, tpl.build(params, level));
}

/** Eine Aufgabe aus Vorlage + Stufe + Seed. Ungültige Parameter → nächster Seed (deterministisch). */
export function generate(templateId, level, seed = newSeed()) {
  const tpl = template(templateId);
  for (let i = 0; i < 200; i++) {
    const s = (seed + i) >>> 0;
    try {
      const params = tpl.params(rng(s), level);
      return build(tpl, level, params, s);
    } catch (e) { if (!(e instanceof InvalidParams)) throw e; }
  }
  throw new Error('Keine gültige Aufgabe für ' + templateId);
}

/** Gespeicherte Aufgabe wiederherstellen (für „Fehler wiederholen“): gleiche Parameter, gleiches Item */
export function regenerate(templateId, level, params, seed) {
  return build(template(templateId), level, params, seed);
}

/**
 * Übungsrunde: n Aufgaben aus einem Bereich (oder gemischt), ohne Doppelte.
 * opts.seen = Set normalisierter Parameter-Schlüssel (über mehrere Runden), opts.templates = Auswahl
 */
export function session(skillId, level, n = 8, opts = {}) {
  const seen = opts.seen || new Set();
  const fits = (id) => (template(id).levels || [1, 2, 3]).includes(level);
  const pool = (opts.templates || (skillId === 'mix' ? TEMPLATES.map((t) => t.id) : skill(skillId).templates)).filter(fits);
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 30) {
    const tid = pool[out.length % pool.length];
    const it = generate(tid, level);
    const key = paramKey(it.templateId, level, it.parameters);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return opts.shuffle === false ? out : out.sort(() => Math.random() - 0.5);
}

/* ---------- Prüfen ---------- */
/** Musterantwort aus den gespeicherten Lösungen (für die Selbstprüfung) */
export function referenceResponse(item) {
  const resp = {};
  if (item.widget) {
    item.widget.rows.forEach((x, i) => {
      if (!item.widget.given) resp['part_' + i] = String(x);
      if (item.widget.kind === 'mult') resp['prod_' + i] = String(item.widget.a * x);
      else resp['quo_' + i] = String(x / item.widget.d);
    });
    resp.sum = String(item.answer.sum);
    resp.final = String(item.answer.final);
    if (item.widget.kind === 'div') resp.probe = String(item.widget.n);
    return resp;
  }
  for (const f of item.fields) {
    if (f.kind === 'multi') resp[f.id] = [...f.answer];
    else if (f.kind === 'signed') resp[f.id] = (f.answer >= 0 ? '+' : '-') + Math.abs(f.answer);
    else resp[f.id] = String(f.answer);
  }
  return resp;
}

const REQUIRED = ['id', 'templateId', 'skill', 'subskill', 'difficulty', 'parameters', 'promptDe', 'answerType', 'fields', 'answer', 'solutionSteps', 'hintsDe', 'hintsZh', 'explanationDe', 'explanationZh', 'misconceptionTags', 'validationRules'];

/** Prüft ein Item vollständig. Gibt eine Liste von Fehlern zurück (leer = gültig). */
export function validateItem(item) {
  const err = [];
  for (const k of REQUIRED) if (item[k] === undefined || item[k] === null || item[k] === '') err.push('fehlt: ' + k);
  if (!Array.isArray(item.hintsDe) || item.hintsDe.length !== 3) err.push('hintsDe: 3 Stufen');
  if (!Array.isArray(item.hintsZh) || item.hintsZh.length !== 3) err.push('hintsZh: 3 Stufen');
  const ids = item.fields.map((f) => f.id);
  if (new Set(ids).size !== ids.length) err.push('Feld-IDs nicht eindeutig');
  const inLayout = new Set(item.layout.flat().filter((t) => t && typeof t === 'object').map((t) => t.f));
  for (const id of inLayout) if (!ids.includes(id)) err.push('Layout verweist auf unbekanntes Feld ' + id);
  if (!item.widget) for (const id of ids) if (!inLayout.has(id)) err.push('Feld nicht im Layout: ' + id);
  for (const f of item.fields) {
    if (f.kind === 'number') { if (!Number.isInteger(f.answer) || f.answer < 0 || f.answer > MAX) err.push(`Zahl außerhalb 0–${MAX}: ${f.id}=${f.answer}`); }
    else if (f.kind === 'signed') { if (!Number.isInteger(f.answer) || f.answer === 0) err.push('Schrittweite ungültig'); }
    else if (f.kind === 'choice') { if (!f.options?.includes(f.answer)) err.push('Auswahl ohne richtige Option: ' + f.id); if (new Set(f.options).size !== f.options.length) err.push('doppelte Optionen: ' + f.id); }
    else if (f.kind === 'multi') { if (!f.answer.every((a) => f.options.includes(a))) err.push('Mehrfachauswahl'); }
    else if (f.kind === 'pick') { if (!item.choices?.includes(f.answer)) err.push('Ordnen: Zahl fehlt'); }
    if (!f.step) err.push('Feld ohne Schritt: ' + f.id);
    if (!['final', 'process'].includes(f.role)) err.push('Feld ohne Rolle: ' + f.id);
  }
  for (const s of item.solutionSteps) for (const k of ['de', 'zh']) if (/NaN|undefined/.test(s[k])) err.push('Lösungsschritt enthält NaN/undefined');
  for (const k of ['promptDe', 'explanationDe', 'explanationZh', ...[0, 1, 2].map((i) => 'h' + i)]) {
    const v = k.startsWith('h') ? item.hintsDe[+k[1]] + item.hintsZh[+k[1]] : item[k];
    if (/NaN|undefined|\[object/.test(v)) err.push('Text kaputt: ' + k);
  }
  // Musterlösung muss voll bewertet werden, leere Antwort darf nicht richtig sein
  try {
    const ok = grade(item, referenceResponse(item));
    if (!ok.allOk || ok.finalScore !== 1) err.push('Musterlösung wird nicht als richtig erkannt');
    const empty = grade(item, {});
    if (empty.finalOk) err.push('leere Antwort gilt als richtig');
  } catch (e) { err.push('Bewertung wirft Fehler: ' + e.message); }
  return err;
}
