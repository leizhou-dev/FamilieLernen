// Mathe · Bewertung: Feld für Feld, Ergebnis- und Rechenweg-Punkte, Fehlerursachen-Tags.
import { parseNum, apply } from './core.js';
import { template } from './templates.js';

export const TAGS = {
  'tens-division-zero': { de: 'Zehnerzahl als Teiler: eine Null zu viel im Ergebnis', zh: '整十数除法的商多写一个 0' },
  'table-error': { de: 'Einmaleins-Fehler wird in die große Rechnung übernommen', zh: '乘除口诀错误向大算式传递' },
  'sum-error': { de: 'Teilergebnisse richtig, aber falsch addiert', zh: '部分积正确但最后求和错误' },
  'split-missing': { de: 'Beim Zerlegen eine Zahl oder ein Teilergebnis vergessen', zh: '除法拆分时漏写数字或漏加部分商' },
  'times-vs-part': { de: '„-fache“ und „Teil“ verwechselt', zh: '混淆“几倍”与“几分之一”' },
  'inverse-order': { de: 'Beim Rückwärtsrechnen die Reihenfolge vertauscht', zh: '两步倒推时逆运算顺序错误' },
  'high-digit': { de: 'Beim Ordnen nicht zuerst die höchste Stelle verglichen', zh: '排序时漏比较高位' },
  'missing-step': { de: 'Rechenschritt oder Probe fehlt', zh: '漏答步骤或验算' },
  'order-of-ops': { de: '„Punkt vor Strich“ nicht beachtet (von links nach rechts gerechnet)', zh: '没有先乘除后加减（从左往右算了）' },
  'pending': { de: 'Ursache noch unklar – Rechenweg zeigen lassen', zh: '原因待确认' },
};

export function readValue(f, raw) {
  if (f.kind === 'number') return parseNum(raw);
  if (f.kind === 'signed') return parseNum(raw, { signed: true });
  return raw ?? null;
}
const isEmpty = (raw) => raw == null || String(raw).trim() === '' || (Array.isArray(raw) && !raw.length);

function expectedFor(f, resp, fieldsById) {
  const r = f.rule;
  if (r?.type === 'apply') {
    // Probe: Wert aus einem anderen Feld (Antwort des Kindes) durch die Rechenkette schicken
    let v = readValue(fieldsById[r.from], resp[r.from]);
    for (const [op, n] of r.ops) v = Number.isFinite(v) ? apply(op, v, n) : NaN;
    return v;
  }
  return f.answer;
}

/** Standard-Bewertung für answerType fields / order / multi */
export function gradeFields(item, resp) {
  const byId = Object.fromEntries(item.fields.map((f) => [f.id, f]));
  const fields = {};
  for (const f of item.fields) {
    const raw = resp[f.id];
    const empty = isEmpty(raw);
    let ok = false;
    const expected = expectedFor(f, resp, byId);
    if (!empty) {
      if (f.kind === 'multi') {
        const a = [...(raw || [])].map(String).sort().join('|');
        ok = a === [...f.answer].map(String).sort().join('|');
      } else {
        const v = readValue(f, raw);
        ok = f.kind === 'number' || f.kind === 'signed' ? Number.isFinite(v) && v === expected : String(v) === String(expected);
      }
    }
    fields[f.id] = { ok, empty, expected };
  }
  return summarize(item, fields);
}

export function summarize(item, fields, extraProcess = []) {
  const fin = item.fields.filter((f) => f.role === 'final');
  const proc = item.fields.filter((f) => f.role === 'process');
  const score = (list) => (list.length ? list.reduce((s, f) => s + (fields[f.id]?.ok ? f.points : 0), 0) / list.reduce((s, f) => s + f.points, 0) : null);
  const procChecks = [...proc.map((f) => !!fields[f.id]?.ok), ...extraProcess];
  return {
    fields,
    finalScore: score(fin) ?? 1,
    processScore: procChecks.length ? procChecks.filter(Boolean).length / procChecks.length : null,
    finalOk: fin.every((f) => fields[f.id]?.ok),
    allOk: item.fields.every((f) => fields[f.id]?.ok) && extraProcess.every(Boolean),
    tags: [],
  };
}

/** Haupteinstieg: bewerten + Fehlerursachen bestimmen */
export function grade(item, resp) {
  const tpl = template(item.templateId);
  const res = tpl.grade ? tpl.grade(item, resp) : gradeFields(item, resp);
  const tags = new Set(res.tags || []);
  if (!res.allOk && tpl.diagnose) for (const t of tpl.diagnose(item, resp, res) || []) tags.add(t);
  // Schritt / Probe leer gelassen, Ergebnis aber eingetragen
  if (!res.custom) {
    const anyFinalFilled = item.fields.some((f) => f.role === 'final' && !res.fields[f.id]?.empty);
    if (anyFinalFilled && item.fields.some((f) => f.role === 'process' && res.fields[f.id]?.empty)) tags.add('missing-step');
  }
  // nur das Endergebnis falsch und keine Ursache erkennbar → „Ursache noch unklar“ + Nachfrage
  if (!res.finalOk && !tags.size) tags.add('pending');
  res.tags = [...tags];
  res.pending = tags.has('pending');
  return res;
}
