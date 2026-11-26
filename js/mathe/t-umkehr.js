// 7. Zahlenrätsel / Umkehraufgaben: ein- und zweischrittige Rätsel, Pfeilketten.
// Erst wird eine gültige Startzahl mit Rechenkette erzeugt, dann der deutsche Text daraus.
// Ablauf für das Kind: Text verstehen → Rechnung mit □ → rückwärts rechnen → Probe.
import { fmt, field, assert, isNat, apply, parseNum, OPS } from './core.js';
import { FACHE, TEIL_NOM } from './t-begriffe.js';

const INV = { '+': '−', '−': '+', '·': ':', ':': '·' };
const OPS4 = ['+', '−', '·', ':'];

/** Schritt erzeugen, der auf x anwendbar ist (ganzzahlig, nicht negativ) */
function step(r, x, kinds) {
  for (let t = 0; t < 40; t++) {
    const kind = r.pick(kinds);
    if (kind === 'mul') { const k = r.int(3, 9); return { kind, op: '·', n: k }; }
    if (kind === 'dbl') return { kind, op: '·', n: 2 };
    if (kind === 'div') { const k = r.int(3, 9); if (x % k === 0) return { kind, op: ':', n: k }; continue; }
    if (kind === 'half') { if (x % 2 === 0) return { kind, op: ':', n: 2 }; continue; }
    if (kind === 'add') return { kind, op: '+', n: r.int(5, 49) };
    if (kind === 'sub') { if (x > 6) return { kind, op: '−', n: r.int(2, Math.min(49, x - 1)) }; continue; }
  }
  return { kind: 'add', op: '+', n: r.int(5, 30) };
}
const run = (x, steps) => steps.reduce((v, s) => apply(s.op, v, s.n), x);

/* ---------- deutscher Text aus der Rechenkette ---------- */
function oneStepText(s, r) {
  return {
    mul: `Das ${FACHE[s.n]} meiner Zahl ist ${fmt(r)}.`,
    div: `Der ${TEIL_NOM[s.n]} Teil meiner Zahl ist ${fmt(r)}.`,
    add: `Ich addiere ${fmt(s.n)} zu meiner Zahl und erhalte ${fmt(r)}.`,
    sub: `Ich vermindere meine Zahl um ${fmt(s.n)}. Das Ergebnis ist ${fmt(r)}.`,
    dbl: `Ich verdopple meine Zahl und erhalte ${fmt(r)}.`,
    half: `Die Hälfte meiner Zahl ist ${fmt(r)}.`,
  }[s.kind];
}
const FIRST = {
  mul: (s) => `nehme meine Zahl mal ${s.n}`, div: (s) => `teile meine Zahl durch ${s.n}`,
  add: (s) => `addiere ${fmt(s.n)} zu meiner Zahl`, sub: (s) => `vermindere meine Zahl um ${fmt(s.n)}`,
  dbl: () => 'verdopple meine Zahl', half: () => 'halbiere meine Zahl',
};
const SECOND = {
  mul: (s) => `nehme das Ergebnis mal ${s.n}`, div: (s) => `teile das Ergebnis durch ${s.n}`,
  add: (s) => `addiere ${fmt(s.n)}`, sub: (s) => `subtrahiere ${fmt(s.n)}`,
  dbl: () => 'verdopple das Ergebnis', half: () => 'halbiere das Ergebnis',
};
const ZH = {
  mul: (s) => `乘 ${s.n}`, div: (s) => `除以 ${s.n}`, add: (s) => `加 ${s.n}`, sub: (s) => `减 ${s.n}`, dbl: () => '乘 2（翻倍）', half: () => '除以 2（减半）',
};
function twoStepText(a, b, r, end) {
  return `Ich ${FIRST[a.kind](a)} und ${SECOND[b.kind](b)}. ${end ? `Dann erhalte ich ${fmt(r)}.` : `Das Ergebnis ist ${fmt(r)}.`}`;
}
/** Rechnung mit □ und Klammern passend zur Reihenfolge im Text */
export function forwardExpr(a, b) {
  const e1 = `□ ${a.op} ${fmt(a.n)}`;
  const needParens = OPS[b.op].point && !OPS[a.op].point;
  return needParens ? `(${e1}) ${b.op} ${fmt(b.n)}` : `${e1} ${b.op} ${fmt(b.n)}`;
}
function wrongExprs(a, b) {
  const right = forwardExpr(a, b);
  const out = new Set();
  // Klammern falsch / vergessen
  if (right.startsWith('(')) out.add(`□ ${a.op} ${fmt(a.n)} ${b.op} ${fmt(b.n)}`);
  else if (OPS[a.op].point && !OPS[b.op].point) out.add(`□ ${a.op} (${fmt(a.n)} ${b.op} ${fmt(b.n)})`);
  // Reihenfolge vertauscht
  out.add(forwardExpr(b, a));
  // Mal/Geteilt verwechselt
  const swap = (s) => ({ ...s, op: s.op === '·' ? ':' : s.op === ':' ? '·' : s.op === '+' ? '−' : '+' });
  out.add(forwardExpr(swap(a), b));
  out.delete(right);
  return [...out].slice(0, 2);
}

/* ---------- einschrittig ---------- */
const one = {
  id: 'U-einschritt', skill: 'umkehr', subskill: 'raetsel-1',
  titleDe: 'Zahlenrätsel (ein Schritt)', titleZh: '一步数字谜',
  params(r, level) {
    const kinds = level === 1 ? ['mul', 'div', 'dbl', 'half'] : ['mul', 'div', 'add', 'sub', 'dbl', 'half'];
    const kind = r.pick(kinds);
    const big = level === 1 ? 9 : level === 2 ? 15 : 25;
    if (kind === 'div') { const k = r.int(3, 9); return { x: k * r.int(2, big), s: { kind, op: ':', n: k } }; }
    if (kind === 'half') return { x: 2 * r.int(3, big * 3), s: { kind, op: ':', n: 2 } };
    const x = r.int(level === 1 ? 3 : 6, level === 1 ? 12 : level === 2 ? 40 : 99);
    return { x, s: step(r, x, [kind]) };
  },
  build(p, level) {
    const r = apply(p.s.op, p.x, p.s.n);
    assert(isNat(r) && apply(INV[p.s.op], r, p.s.n) === p.x, 'umkehrbar');
    const fwd = `□ ${p.s.op} ${fmt(p.s.n)} = ${fmt(r)}`;
    const inv = `${fmt(r)} ${INV[p.s.op]} ${fmt(p.s.n)} = ${fmt(p.x)}`;
    const scaffold = level === 1;
    const fields = scaffold ? [] : [
      field('fop', 'choice', p.s.op, { options: OPS4, role: 'process', step: 'forward', width: 1 }),
      field('fn', 'number', p.s.n, { role: 'process', step: 'forward' }),
      field('fr', 'number', r, { role: 'process', step: 'forward' }),
    ];
    fields.push(field('x', 'number', p.x, { step: 'inverse' }),
      field('probe', 'number', r, { role: 'process', step: 'probe', rule: { type: 'apply', from: 'x', ops: [[p.s.op, p.s.n]] } }));
    return {
      promptDe: oneStepText(p.s, r) + '\nWie heißt meine Zahl?',
      layout: [
        scaffold ? ['Rechnung: ', fwd] : ['Rechnung: □ ', { f: 'fop' }, ' ', { f: 'fn' }, ' = ', { f: 'fr' }],
        ['Meine Zahl: ', { f: 'x' }],
        ['Probe: (deine Zahl) ', `${p.s.op} ${fmt(p.s.n)} = `, { f: 'probe' }],
      ],
      fields,
      solutionSteps: [
        { id: 'forward', de: `Text als Rechnung: ${fwd}`, zh: `把文字写成算式：${fwd}` },
        { id: 'inverse', de: `Rückwärts: ${inv}`, zh: `逆运算：${inv}` },
        { id: 'probe', de: `Probe: ${fmt(p.x)} ${p.s.op} ${fmt(p.s.n)} = ${fmt(r)}`, zh: `验算：${fmt(p.x)} ${p.s.op} ${fmt(p.s.n)} = ${fmt(r)}` },
      ],
      hintsDe: ['Schreib den Satz als Rechnung mit □ für meine Zahl.', `${fwd}. Rechne rückwärts mit der Umkehraufgabe (${INV[p.s.op]}).`, `Lösung: ${inv}. Probe: ${fmt(p.x)} ${p.s.op} ${fmt(p.s.n)} = ${fmt(r)}`],
      hintsZh: ['用 □ 表示我的数，把句子写成算式。', `${fwd}。用逆运算（${INV[p.s.op]}）倒推。`, `答案：${inv}。验算：${fmt(p.x)} ${p.s.op} ${fmt(p.s.n)} = ${fmt(r)}`],
      explanationDe: `Im Text: ${fwd}. Rückwärts rechnest du mit der Umkehraufgabe: ${inv}. Meine Zahl ist ${fmt(p.x)}.`,
      explanationZh: `题目：我的数${ZH[p.s.kind](p.s)}得 ${fmt(r)}，即 ${fwd}。倒推用逆运算：${inv}。我的数是 ${fmt(p.x)}。`,
      misconceptionTags: p.s.op === '·' || p.s.op === ':' ? ['times-vs-part', 'missing-step'] : ['missing-step'],
    };
  },
  diagnose(item, resp) {
    const p = item.parameters; const r = apply(p.s.op, p.x, p.s.n);
    const v = parseNum(resp.x);
    const tags = [];
    if ((p.s.op === '·' || p.s.op === ':') && (v === apply(p.s.op, r, p.s.n) || (resp.fop && resp.fop !== p.s.op && INV[resp.fop] === p.s.op))) tags.push('times-vs-part');
    return tags;
  },
};

/* ---------- zweischrittig ---------- */
const two = {
  id: 'U-zweischritt', skill: 'umkehr', subskill: 'raetsel-2',
  titleDe: 'Zahlenrätsel (zwei Schritte)', titleZh: '两步数字谜',
  params(r, level) {
    for (let t = 0; t < 50; t++) {
      const x = r.int(level === 1 ? 4 : 10, level === 3 ? 90 : 60);
      const a = step(r, x, ['mul', 'div', 'add', 'sub', 'dbl', 'half']);
      const m = apply(a.op, x, a.n);
      const b = step(r, m, a.op === '·' || a.op === ':' ? ['add', 'sub'] : ['mul', 'dbl', 'half', 'div']);
      const res = apply(b.op, m, b.n);
      if (isNat(m) && isNat(res) && res > 0 && res <= 2000) return { x, a, b, end: r.chance(0.5) };
    }
    return { x: 53, a: { kind: 'sub', op: '−', n: 16 }, b: { kind: 'dbl', op: '·', n: 2 }, end: true };
  },
  build(p, level) {
    const m = apply(p.a.op, p.x, p.a.n);
    const r = apply(p.b.op, m, p.b.n);
    assert(isNat(m) && isNat(r), 'Zwischenergebnis');
    const back1 = apply(INV[p.b.op], r, p.b.n);
    const back2 = apply(INV[p.a.op], back1, p.a.n);
    assert(back1 === m && back2 === p.x, 'Umkehrung in umgekehrter Reihenfolge');
    const fwd = `${forwardExpr(p.a, p.b)} = ${fmt(r)}`;
    const opts = [forwardExpr(p.a, p.b), ...wrongExprs(p.a, p.b)];
    assert(new Set(opts).size === opts.length && opts.length >= 2, 'Auswahl');
    const scaffold = level === 1;
    const fields = [];
    if (!scaffold) fields.push(field('fexpr', 'choice', forwardExpr(p.a, p.b), { options: opts.sort(), role: 'process', step: 'forward' }));
    if (!scaffold) fields.push(field('iop2', 'choice', INV[p.b.op], { options: OPS4, role: 'process', step: 'back1', width: 1 }));
    fields.push(field('m', 'number', m, { role: 'process', step: 'back1' }));
    if (!scaffold) fields.push(field('iop1', 'choice', INV[p.a.op], { options: OPS4, role: 'process', step: 'back2', width: 1 }));
    fields.push(field('x', 'number', p.x, { step: 'back2' }),
      field('probe', 'number', r, { role: 'process', step: 'probe', rule: { type: 'apply', from: 'x', ops: [[p.a.op, p.a.n], [p.b.op, p.b.n]] } }));
    const text = twoStepText(p.a, p.b, r, p.end);
    return {
      promptDe: text + '\nWie heißt meine Zahl? Rechne rückwärts – den letzten Schritt zuerst.',
      layout: [
        scaffold ? ['Rechnung: ', fwd] : ['Rechnung: ', { f: 'fexpr' }, ` = ${fmt(r)}`],
        scaffold ? ['1. rückwärts: ', `${fmt(r)} ${INV[p.b.op]} ${fmt(p.b.n)} = `, { f: 'm' }] : ['1. rückwärts: ', `${fmt(r)} `, { f: 'iop2' }, ` ${fmt(p.b.n)} = `, { f: 'm' }],
        scaffold ? ['2. rückwärts: ', '(Ergebnis) ', `${INV[p.a.op]} ${fmt(p.a.n)} = `, { f: 'x' }] : ['2. rückwärts: ', '(Ergebnis) ', { f: 'iop1' }, ` ${fmt(p.a.n)} = `, { f: 'x' }],
        ['Probe: ', `${forwardExpr(p.a, p.b).replace('□', 'deine Zahl')} = `, { f: 'probe' }],
      ],
      fields,
      solutionSteps: [
        { id: 'forward', de: `Text als Rechnung: ${fwd}`, zh: `写成算式：${fwd}` },
        { id: 'back1', de: `Letzten Schritt zuerst umkehren: ${fmt(r)} ${INV[p.b.op]} ${fmt(p.b.n)} = ${fmt(m)}`, zh: `先倒推最后一步：${fmt(r)} ${INV[p.b.op]} ${fmt(p.b.n)} = ${fmt(m)}` },
        { id: 'back2', de: `Dann den ersten Schritt: ${fmt(m)} ${INV[p.a.op]} ${fmt(p.a.n)} = ${fmt(p.x)}`, zh: `再倒推第一步：${fmt(m)} ${INV[p.a.op]} ${fmt(p.a.n)} = ${fmt(p.x)}` },
        { id: 'probe', de: `Probe: ${fmt(p.x)} ${p.a.op} ${fmt(p.a.n)} = ${fmt(m)}, ${fmt(m)} ${p.b.op} ${fmt(p.b.n)} = ${fmt(r)}`, zh: `验算：${fmt(p.x)} ${p.a.op} ${fmt(p.a.n)} = ${fmt(m)}，${fmt(m)} ${p.b.op} ${fmt(p.b.n)} = ${fmt(r)}` },
      ],
      hintsDe: [
        'Was passiert zuerst mit meiner Zahl, was danach? Rückwärts fängst du beim letzten Schritt an.',
        `${fwd}. Zuerst ${INV[p.b.op]} ${fmt(p.b.n)} rechnen, dann ${INV[p.a.op]} ${fmt(p.a.n)}.`,
        `Lösung: ${fmt(r)} ${INV[p.b.op]} ${fmt(p.b.n)} = ${fmt(m)}, ${fmt(m)} ${INV[p.a.op]} ${fmt(p.a.n)} = ${fmt(p.x)}`,
      ],
      hintsZh: [
        '我的数先经过什么运算，后经过什么运算？倒推要从最后一步开始。',
        `${fwd}。先算 ${INV[p.b.op]} ${fmt(p.b.n)}，再算 ${INV[p.a.op]} ${fmt(p.a.n)}。`,
        `答案：${fmt(r)} ${INV[p.b.op]} ${fmt(p.b.n)} = ${fmt(m)}，${fmt(m)} ${INV[p.a.op]} ${fmt(p.a.n)} = ${fmt(p.x)}`,
      ],
      explanationDe: `Im Text: zuerst ${p.a.op} ${fmt(p.a.n)}, dann ${p.b.op} ${fmt(p.b.n)}: ${fwd}. Rückwärts kehrst du die Schritte in umgekehrter Reihenfolge um: ${fmt(r)} ${INV[p.b.op]} ${fmt(p.b.n)} = ${fmt(m)}, dann ${fmt(m)} ${INV[p.a.op]} ${fmt(p.a.n)} = ${fmt(p.x)}.`,
      explanationZh: `题目顺序：先${ZH[p.a.kind](p.a)}，再${ZH[p.b.kind](p.b)}：${fwd}。倒推要按相反的顺序用逆运算：${fmt(r)} ${INV[p.b.op]} ${fmt(p.b.n)} = ${fmt(m)}，再 ${fmt(m)} ${INV[p.a.op]} ${fmt(p.a.n)} = ${fmt(p.x)}。`,
      misconceptionTags: ['inverse-order', 'missing-step', ...(['·', ':'].includes(p.a.op) || ['·', ':'].includes(p.b.op) ? ['times-vs-part'] : [])],
    };
  },
  diagnose(item, resp) {
    const p = item.parameters; const r = run(p.x, [p.a, p.b]);
    const v = parseNum(resp.x); const tags = [];
    const wrongOrder = apply(INV[p.b.op], apply(INV[p.a.op], r, p.a.n), p.b.n);
    if (Number.isFinite(v) && v === wrongOrder && wrongOrder !== p.x) tags.push('inverse-order');
    if (resp.fexpr && resp.fexpr === forwardExpr(p.b, p.a)) tags.push('inverse-order');
    const sameDir = apply(p.a.op, apply(p.b.op, r, p.b.n), p.a.n);
    if (Number.isFinite(v) && v === sameDir && [p.a.op, p.b.op].some((o) => o === '·' || o === ':')) tags.push('times-vs-part');
    if ((resp.iop2 && resp.iop2 === p.b.op && (p.b.op === '·' || p.b.op === ':')) || (resp.iop1 && resp.iop1 === p.a.op && (p.a.op === '·' || p.a.op === ':'))) tags.push('times-vs-part');
    return tags;
  },
};

/* ---------- Pfeilketten ---------- */
const chain = {
  id: 'U-pfeil', skill: 'umkehr', subskill: 'pfeilkette',
  titleDe: 'Pfeilketten', titleZh: '箭头运算链',
  params(r, level) {
    for (let t = 0; t < 60; t++) {
      const len = level === 3 ? 3 : 2;
      const x = r.int(3, 40);
      const steps = []; let v = x;
      for (let i = 0; i < len; i++) {
        const prev = steps.at(-1);
        const kinds = prev && (prev.op === '·' || prev.op === ':') ? ['add', 'sub'] : ['mul', 'div', 'add', 'sub'];
        const s = step(r, v, kinds); steps.push(s); v = apply(s.op, v, s.n);
      }
      const vals = [x]; steps.forEach((s) => vals.push(apply(s.op, vals.at(-1), s.n)));
      if (vals.every((n) => isNat(n) && n <= 1000)) {
        const hide = level === 1 ? (r.chance(0.5) ? [len] : [1, len]) : level === 2 ? [0, 1] : r.pick([[0, 1, 2], [0, 1], [1, 2]]);
        return { x, steps, hide };
      }
    }
    return { x: 7, steps: [{ kind: 'mul', op: '·', n: 3 }, { kind: 'add', op: '+', n: 12 }], hide: [0] };
  },
  build(p) {
    const vals = [p.x]; p.steps.forEach((s) => vals.push(apply(s.op, vals.at(-1), s.n)));
    vals.forEach((v) => assert(isNat(v), 'Werte'));
    assert(p.hide.length < vals.length, 'mindestens eine Zahl sichtbar');
    const line = [];
    vals.forEach((v, i) => {
      line.push(p.hide.includes(i) ? { f: 'v' + i } : fmt(v));
      if (i < p.steps.length) line.push(` —(${p.steps[i].op} ${fmt(p.steps[i].n)})→ `);
    });
    const fields = p.hide.map((i) => field('v' + i, 'number', vals[i], { step: 'v' + i, role: 'final' }));
    const backwards = p.hide.includes(0);
    const known = vals.map((v, i) => !p.hide.includes(i));
    return {
      promptDe: backwards ? 'Ergänze die Pfeilkette. Rechne rückwärts mit den Umkehraufgaben.' : 'Ergänze die Pfeilkette.',
      layout: [line],
      fields,
      extra: { chainKnown: known },
      solutionSteps: p.hide.map((i) => ({ id: 'v' + i, de: i === 0 ? `${fmt(vals[1])} ${INV[p.steps[0].op]} ${fmt(p.steps[0].n)} = ${fmt(vals[0])}` : `${fmt(vals[i - 1])} ${p.steps[i - 1].op} ${fmt(p.steps[i - 1].n)} = ${fmt(vals[i])}`, zh: `${fmt(vals[i])}` })),
      hintsDe: [
        backwards ? 'Gehe von hinten nach vorne. Jede Rechnung drehst du um: + wird −, · wird :.' : 'Rechne von links nach rechts, Pfeil für Pfeil.',
        backwards ? `Rückwärts: ${p.steps.map((s) => `${INV[s.op]} ${fmt(s.n)}`).reverse().join(', dann ')}.` : `Erster Schritt: ${fmt(vals[0])} ${p.steps[0].op} ${fmt(p.steps[0].n)} = ${fmt(vals[1])}.`,
        `Lösung: ${vals.map(fmt).join(' → ')}`,
      ],
      hintsZh: [
        backwards ? '从后往前算，每一步都用逆运算：+ 变 −，· 变 :。' : '从左往右，一个箭头一个箭头地算。',
        backwards ? `倒推：${p.steps.map((s) => `${INV[s.op]} ${fmt(s.n)}`).reverse().join('，再')}。` : `第一步：${fmt(vals[0])} ${p.steps[0].op} ${fmt(p.steps[0].n)} = ${fmt(vals[1])}。`,
        `答案：${vals.map(fmt).join(' → ')}`,
      ],
      explanationDe: `Die ganze Kette: ${vals.map((v, i) => (i < p.steps.length ? `${fmt(v)} ${p.steps[i].op} ${fmt(p.steps[i].n)}` : fmt(v))).join(' → ')}.${backwards ? ' Rückwärts nimmst du die Umkehraufgaben in umgekehrter Reihenfolge.' : ''}`,
      explanationZh: `完整的运算链：${vals.map(fmt).join(' → ')}。${backwards ? '倒推时按相反顺序使用逆运算。' : ''}`,
      misconceptionTags: backwards && p.steps.length > 1 ? ['inverse-order'] : [],
    };
  },
  diagnose(item, resp) {
    const p = item.parameters;
    if (!p.hide.includes(0)) return [];
    const vals = [p.x]; p.steps.forEach((s) => vals.push(apply(s.op, vals.at(-1), s.n)));
    const end = vals.at(-1);
    const v = parseNum(resp.v0);
    // Umkehraufgaben in der falschen Reihenfolge
    const wrong = p.steps.reduce((acc, s) => apply(INV[s.op], acc, s.n), end);
    if (p.steps.length > 1 && Number.isFinite(v) && v === wrong && wrong !== p.x) return ['inverse-order'];
    return [];
  },
};

export default [one, two, chain];
