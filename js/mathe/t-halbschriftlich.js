// 4. Halbschriftliches Multiplizieren  ·  5. Halbschriftliches Dividieren
// Offene Zerlegungen: jede mathematisch richtige Zerlegung wird angenommen.
// Bewertet werden getrennt: Zerlegung, Teilergebnisse, Summe, Endergebnis (+ Probe beim Dividieren).
import { fmt, field, assert, isNat, parseNum } from './core.js';
import { summarize } from './grade.js';

const MODE = { 1: 'a', 2: 'b', 3: 'c' }; // a: Zerlegung vorgegeben · b: selbst zerlegen (Zeilen vorgegeben) · c: ganz selbstständig

/** Stellenwert-Zerlegung: 246 → [200, 40, 6] (ohne Nullen) */
export function placeSplit(n) {
  const out = []; let m = 1;
  while (n > 0) { const d = n % 10; if (d) out.unshift(d * m); n = Math.floor(n / 10); m *= 10; }
  return out;
}
/** Zerlegung für das Dividieren: große Teile, die durch d teilbar sind (168 : 7 → 140 + 28) */
export function divSplit(n, d) {
  const out = []; let rest = n;
  for (let k = 2; k >= 0; k--) {
    const unit = d * 10 ** k;
    const m = Math.floor(rest / unit) * unit;
    if (m > 0 && k > 0) { out.push(m); rest -= m; }
  }
  if (rest > 0) out.push(rest);
  return out;
}

const num = (v) => parseNum(v);
function rowsIn(resp, max = 8) {
  const rows = [];
  for (let i = 0; i < max; i++) if (['part_' + i, 'prod_' + i, 'quo_' + i].some((k) => String(resp[k] ?? '').trim() !== '')) rows.push(i);
  return rows;
}

/* ---------- Multiplizieren ---------- */
const mult = {
  id: 'M-halbschriftlich', skill: 'multiplizieren', subskill: 'halbschriftlich',
  titleDe: 'Halbschriftlich multiplizieren', titleZh: '半笔算乘法',
  params(r, level) {
    const a = level === 3 ? r.int(6, 9) : r.int(2, 9);
    let b;
    if (level === 1) b = r.chance(0.5) ? r.int(12, 99) : r.int(1, 3) * 100 + r.int(1, 9) * 10 + r.int(1, 9);
    else if (level === 2) {
      // mit Null oder mit Übertrag beim Addieren der Teilergebnisse
      b = r.chance(0.5) ? r.int(1, 9) * 100 + r.pick([0, r.int(1, 9) * 10]) + r.pick([0, r.int(1, 9)]) : r.int(1, 9) * 100 + r.int(4, 9) * 10 + r.int(4, 9);
      if (b % 100 === 0) b += r.int(1, 9);
    } else b = r.int(1, 9) * 100 + r.int(0, 9) * 10 + r.int(0, 9);
    return { a, b, mode: MODE[level] };
  },
  build(p) {
    assert(p.a >= 2 && p.a <= 9 && p.b >= 10 && p.b <= 999, 'Faktoren');
    const parts = placeSplit(p.b);
    assert(parts.length >= 2, 'mindestens zwei Teile');
    const prods = parts.map((x) => p.a * x);
    const sum = prods.reduce((s, x) => s + x, 0);
    assert(sum === p.a * p.b && isNat(sum), 'Summe');
    const fields = [];
    parts.forEach((x, i) => {
      if (p.mode !== 'a') fields.push(field('part_' + i, 'number', x, { role: 'process', step: 'split' }));
      fields.push(field('prod_' + i, 'number', p.a * x, { role: 'process', step: 'prod_' + i }));
    });
    fields.push(field('sum', 'number', sum, { role: 'process', step: 'sum' }), field('final', 'number', sum, { step: 'final' }));
    const steps = parts.map((x, i) => `${p.a} · ${fmt(x)} = ${fmt(prods[i])}`);
    const addLine = `${prods.map(fmt).join(' + ')} = ${fmt(sum)}`;
    return {
      promptDe: p.mode === 'a' ? `Rechne halbschriftlich: ${p.a} · ${fmt(p.b)}. Die Zerlegung ist schon da.`
        : p.mode === 'b' ? `Rechne halbschriftlich: ${p.a} · ${fmt(p.b)}. Zerlege die große Zahl selbst.`
          : `Rechne halbschriftlich: ${p.a} · ${fmt(p.b)}.`,
      answerType: 'split-mult',
      fields,
      extra: { widget: { kind: 'mult', a: p.a, b: p.b, rows: parts, given: p.mode === 'a', open: p.mode === 'c' } },
      solutionSteps: [...parts.map((x, i) => ({ id: 'prod_' + i, de: steps[i], zh: steps[i] })), { id: 'sum', de: addLine, zh: addLine }, { id: 'final', de: `${p.a} · ${fmt(p.b)} = ${fmt(sum)}`, zh: `${p.a} · ${fmt(p.b)} = ${fmt(sum)}` }],
      hintsDe: [
        `Zerlege ${fmt(p.b)} nach Stellen: Hunderter, Zehner, Einer.`,
        `${fmt(p.b)} = ${parts.map(fmt).join(' + ')}. Rechne jeden Teil mal ${p.a}.`,
        `Lösung: ${steps.join(' · ')} · ${addLine}`,
      ],
      hintsZh: [
        `把 ${fmt(p.b)} 按数位拆开：百、十、个。`,
        `${fmt(p.b)} = ${parts.map(fmt).join(' + ')}，每一部分都乘 ${p.a}。`,
        `答案：${steps.join('；')}；${addLine}`,
      ],
      explanationDe: `Zerlegen: ${fmt(p.b)} = ${parts.map(fmt).join(' + ')}. Teilrechnungen: ${steps.join(', ')}. Zusammenzählen: ${addLine}. Also ${p.a} · ${fmt(p.b)} = ${fmt(sum)}.`,
      explanationZh: `拆分：${fmt(p.b)} = ${parts.map(fmt).join(' + ')}。分别计算：${steps.join('，')}。相加：${addLine}。所以 ${p.a} · ${fmt(p.b)} = ${fmt(sum)}。`,
      misconceptionTags: ['table-error', 'sum-error'],
      validationRules: [
        ...(p.mode === 'a' ? [] : [{ type: 'splitSum', fields: 'part_*', equals: p.b, note: 'jede Zerlegung in positive Teile mit Summe b' }]),
        { type: 'eachProduct', fields: 'prod_*', factor: p.a, of: 'part_*' },
        { type: 'sumOf', field: 'sum', of: 'prod_*' },
        { type: 'equals', field: 'final', value: sum },
      ],
    };
  },
  grade(item, resp) {
    const { a, b, rows: given, given: isGiven } = item.widget;
    const idx = isGiven ? given.map((_, i) => i) : rowsIn(resp);
    const parts = idx.map((i) => (isGiven ? given[i] : num(resp['part_' + i])));
    const prods = idx.map((i) => num(resp['prod_' + i]));
    const fields = {};
    const splitOk = isGiven || (parts.length >= 2 && parts.every((x) => Number.isInteger(x) && x > 0) && parts.reduce((s, x) => s + x, 0) === b);
    idx.forEach((i, k) => {
      if (!isGiven) fields['part_' + i] = { ok: splitOk, empty: !String(resp['part_' + i] ?? '').trim(), expected: null };
      fields['prod_' + i] = { ok: Number.isInteger(parts[k]) && prods[k] === a * parts[k], empty: !String(resp['prod_' + i] ?? '').trim(), expected: Number.isInteger(parts[k]) ? a * parts[k] : null };
    });
    const prodSum = prods.reduce((s, x) => s + (Number.isFinite(x) ? x : NaN), 0);
    const sumV = num(resp.sum); const finalV = num(resp.final);
    fields.sum = { ok: Number.isFinite(prodSum) && sumV === prodSum, empty: !String(resp.sum ?? '').trim(), expected: prodSum };
    fields.final = { ok: finalV === a * b, empty: !String(resp.final ?? '').trim(), expected: a * b };
    const checks = [...(isGiven ? [] : [splitOk]), ...idx.map((i) => fields['prod_' + i].ok), fields.sum.ok];
    const res = summarize({ fields: [{ id: 'final', role: 'final', points: 1 }] }, fields, checks);
    res.allOk = res.finalOk && checks.every(Boolean);
    res.custom = true;
    const tags = [];
    const prodsOk = idx.every((i) => fields['prod_' + i].ok);
    if (splitOk && prodsOk && !fields.sum.empty && !fields.sum.ok) tags.push('sum-error');
    if (splitOk && prodsOk && fields.sum.ok && !fields.final.ok && !fields.final.empty) tags.push('sum-error');
    if (!prodsOk && idx.some((i) => !fields['prod_' + i].empty && !fields['prod_' + i].ok)) tags.push('table-error');
    if (!isGiven && !splitOk && parts.length) tags.push('split-missing');
    if (!fields.final.empty && (fields.sum.empty || idx.some((i) => fields['prod_' + i].empty) || !idx.length)) tags.push('missing-step');
    res.tags = tags;
    res.processScore = checks.length ? checks.filter(Boolean).length / checks.length : 0;
    return res;
  },
};

/* ---------- Dividieren ---------- */
const div = {
  id: 'D-halbschriftlich', skill: 'dividieren', subskill: 'halbschriftlich',
  titleDe: 'Halbschriftlich dividieren', titleZh: '半笔算除法',
  params(r, level) {
    const d = r.int(2, 9);
    let q;
    if (level === 1) { do { q = r.int(11, 49); } while (d * q > 99 || d * q < 20); }
    else if (level === 2) { do { q = r.int(12, 99); } while (d * q < 100 || d * q > 999); }
    else { do { q = r.int(21, 199); } while (d * q < 300 || d * q > 999); }
    return { d, n: d * q, mode: MODE[level] };
  },
  build(p) {
    assert(p.d >= 2 && p.d <= 9 && p.n % p.d === 0 && p.n >= 10 && p.n <= 999, 'teilbar, 2–3-stellig');
    const q = p.n / p.d;
    const parts = divSplit(p.n, p.d);
    assert(parts.length >= 2 && parts.every((x) => x % p.d === 0) && parts.reduce((s, x) => s + x, 0) === p.n, 'Zerlegung');
    const quos = parts.map((x) => x / p.d);
    const fields = [];
    parts.forEach((x, i) => {
      if (p.mode !== 'a') fields.push(field('part_' + i, 'number', x, { role: 'process', step: 'split' }));
      fields.push(field('quo_' + i, 'number', x / p.d, { role: 'process', step: 'quo_' + i }));
    });
    fields.push(field('sum', 'number', q, { role: 'process', step: 'sum' }), field('final', 'number', q, { step: 'final' }),
      field('probe', 'number', p.n, { role: 'process', step: 'probe', rule: { type: 'apply', from: 'final', ops: [['·', p.d]] } }));
    const lines = parts.map((x, i) => `${fmt(x)} : ${p.d} = ${fmt(quos[i])}`);
    const full = `${fmt(p.n)} : ${p.d} = ${parts.map((x) => `${fmt(x)} : ${p.d}`).join(' + ')} = ${quos.map(fmt).join(' + ')} = ${fmt(q)}`;
    return {
      promptDe: p.mode === 'a' ? `Rechne halbschriftlich: ${fmt(p.n)} : ${p.d}. Die Zerlegung ist schon da. Mache die Probe.`
        : p.mode === 'b' ? `Rechne halbschriftlich: ${fmt(p.n)} : ${p.d}. Zerlege so, dass jeder Teil durch ${p.d} teilbar ist. Mache die Probe.`
          : `Rechne halbschriftlich: ${fmt(p.n)} : ${p.d}. Mache die Probe.`,
      answerType: 'split-div',
      fields,
      extra: { widget: { kind: 'div', n: p.n, d: p.d, rows: parts, given: p.mode === 'a', open: p.mode === 'c' } },
      solutionSteps: [...parts.map((x, i) => ({ id: 'quo_' + i, de: lines[i], zh: lines[i] })), { id: 'sum', de: full, zh: full }, { id: 'probe', de: `Probe: ${fmt(q)} · ${p.d} = ${fmt(p.n)}`, zh: `验算：${fmt(q)} · ${p.d} = ${fmt(p.n)}` }],
      hintsDe: [
        `Suche eine große Zahl, die durch ${p.d} teilbar ist und in ${fmt(p.n)} hineinpasst (z. B. ein Zehnfaches von ${p.d}).`,
        `${fmt(p.n)} = ${parts.map(fmt).join(' + ')}. Teile jeden Teil durch ${p.d}.`,
        `Lösung: ${full} · Probe: ${fmt(q)} · ${p.d} = ${fmt(p.n)}`,
      ],
      hintsZh: [
        `找一个能被 ${p.d} 整除、又不超过 ${fmt(p.n)} 的大数（例如 ${p.d} 的整十倍）。`,
        `${fmt(p.n)} = ${parts.map(fmt).join(' + ')}，每一部分都除以 ${p.d}。`,
        `答案：${full}；验算：${fmt(q)} · ${p.d} = ${fmt(p.n)}`,
      ],
      explanationDe: `Zerlege ${fmt(p.n)} in Zahlen, die durch ${p.d} teilbar sind: ${parts.map(fmt).join(' + ')}. Teile jede Zahl: ${lines.join(', ')}. Zähle die Ergebnisse zusammen: ${fmt(q)}. Andere Zerlegungen sind auch richtig, wenn jeder Teil durch ${p.d} teilbar ist und alle Teile zusammen ${fmt(p.n)} ergeben. Probe: ${fmt(q)} · ${p.d} = ${fmt(p.n)}.`,
      explanationZh: `把 ${fmt(p.n)} 拆成能被 ${p.d} 整除的数：${parts.map(fmt).join(' + ')}。分别相除：${lines.join('，')}。把各部分的商相加得 ${fmt(q)}。只要每一部分都能被 ${p.d} 整除、加起来等于 ${fmt(p.n)}，其他拆法也对。验算：${fmt(q)} · ${p.d} = ${fmt(p.n)}。`,
      misconceptionTags: ['split-missing', 'table-error', 'missing-step'],
      validationRules: [
        ...(p.mode === 'a' ? [] : [{ type: 'splitSum', fields: 'part_*', equals: p.n, eachDivisibleBy: p.d }]),
        { type: 'eachQuotient', fields: 'quo_*', divisor: p.d, of: 'part_*' },
        { type: 'sumOf', field: 'sum', of: 'quo_*' },
        { type: 'equals', field: 'final', value: q },
        { type: 'probe', field: 'probe', expr: 'final · d', mustEqual: p.n },
      ],
    };
  },
  grade(item, resp) {
    const { n, d, rows: given, given: isGiven } = item.widget;
    const idx = isGiven ? given.map((_, i) => i) : rowsIn(resp);
    const parts = idx.map((i) => (isGiven ? given[i] : num(resp['part_' + i])));
    const quos = idx.map((i) => num(resp['quo_' + i]));
    const fields = {};
    const partsValid = parts.every((x) => Number.isInteger(x) && x > 0 && x % d === 0);
    const partsSum = parts.reduce((s, x) => s + x, 0);
    const splitOk = isGiven || (parts.length >= 2 && partsValid && partsSum === n);
    idx.forEach((i, k) => {
      if (!isGiven) fields['part_' + i] = { ok: splitOk && Number.isInteger(parts[k]) && parts[k] % d === 0, empty: !String(resp['part_' + i] ?? '').trim(), expected: null };
      fields['quo_' + i] = { ok: Number.isInteger(parts[k]) && parts[k] % d === 0 && quos[k] === parts[k] / d, empty: !String(resp['quo_' + i] ?? '').trim(), expected: Number.isInteger(parts[k]) && parts[k] % d === 0 ? parts[k] / d : null };
    });
    const quoSum = quos.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);
    const sumV = num(resp.sum); const finalV = num(resp.final); const probeV = num(resp.probe);
    fields.sum = { ok: sumV === quoSum && quos.every(Number.isFinite), empty: !String(resp.sum ?? '').trim(), expected: quoSum };
    fields.final = { ok: finalV === n / d, empty: !String(resp.final ?? '').trim(), expected: n / d };
    fields.probe = { ok: Number.isFinite(finalV) && probeV === finalV * d, empty: !String(resp.probe ?? '').trim(), expected: Number.isFinite(finalV) ? finalV * d : n };
    const checks = [...(isGiven ? [] : [splitOk]), ...idx.map((i) => fields['quo_' + i].ok), fields.sum.ok, fields.probe.ok];
    const res = summarize({ fields: [{ id: 'final', role: 'final', points: 1 }] }, fields, checks);
    res.allOk = res.finalOk && checks.every(Boolean);
    res.custom = true;
    const tags = [];
    // eine Zahl beim Zerlegen vergessen / ein Teilergebnis nicht mitaddiert
    if (!isGiven && parts.length && partsValid && partsSum !== n) tags.push('split-missing');
    if (quos.length > 1 && Number.isFinite(sumV) && sumV !== quoSum && quos.some((x) => sumV === quoSum - x)) tags.push('split-missing');
    if (Number.isFinite(finalV) && finalV !== n / d && quos.some((x) => finalV === quoSum - x) && quos.every(Number.isFinite)) tags.push('split-missing');
    if (idx.some((i) => !fields['quo_' + i].empty && !fields['quo_' + i].ok)) tags.push('table-error');
    if (!fields.final.empty && (fields.probe.empty || fields.sum.empty || idx.some((i) => fields['quo_' + i].empty) || !idx.length)) tags.push('missing-step');
    res.tags = [...new Set(tags)];
    res.processScore = checks.length ? checks.filter(Boolean).length / checks.length : 0;
    return res;
  },
};

export default [mult, div];
