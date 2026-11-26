// 2. Rechenbegriffe  ·  3. Quadratzahlen
import { fmt, field, assert, isNat, apply, OP_ZH } from './core.js';

const FACHE = { 2: 'Doppelte', 3: 'Dreifache', 4: 'Vierfache', 5: 'Fünffache', 6: 'Sechsfache', 7: 'Siebenfache', 8: 'Achtfache', 9: 'Neunfache' };
const TEIL = { 2: 'zweiten', 3: 'dritten', 4: 'vierten', 5: 'fünften', 6: 'sechsten', 7: 'siebten', 8: 'achten', 9: 'neunten' };
const TEIL_NOM = { 3: 'dritte', 4: 'vierte', 5: 'fünfte', 6: 'sechste', 7: 'siebte', 8: 'achte', 9: 'neunte' };
const ZH_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
export { FACHE, TEIL, TEIL_NOM, ZH_NUM };
const OP_NAME_DE = { '+': 'Plus', '−': 'Minus', '·': 'Mal', ':': 'Geteilt' };
const OPS4 = ['+', '−', '·', ':'];

/* ---------- Wörter → Rechenart ---------- */
function words(k) {
  return [
    { w: 'addieren', op: '+' }, { w: 'dazuzählen', op: '+' }, { w: 'um … vergrößern', op: '+' },
    { w: 'subtrahieren', op: '−' }, { w: 'wegnehmen', op: '−' }, { w: 'um … vermindern', op: '−' },
    { w: 'multiplizieren', op: '·' }, { w: `das ${FACHE[k]}`, op: '·', fache: true }, { w: 'verdoppeln', op: '·' },
    { w: 'dividieren', op: ':' }, { w: `der ${TEIL_NOM[k]} Teil`, op: ':', teil: true }, { w: 'halbieren', op: ':' },
  ];
}
const wordOp = {
  id: 'R-wort', skill: 'begriffe', subskill: 'wort-rechenart',
  titleDe: 'Welche Rechenart?', titleZh: '词语对应哪种运算',
  params(r, level) {
    const k = r.int(3, 9);
    const all = words(k);
    const pool = level === 1 ? all.filter((x) => !x.fache && !x.teil) : all;
    let pickd = r.shuffle(pool).slice(0, 4);
    if (level >= 2 && !pickd.some((x) => x.fache || x.teil)) pickd[0] = r.pick(all.filter((x) => x.fache || x.teil));
    return { k, words: pickd.map((x) => x.w) };
  },
  build(p) {
    const all = words(p.k);
    const items = p.words.map((w) => all.find((x) => x.w === w));
    return {
      promptDe: 'Welches Rechenzeichen passt zum Wort?',
      layout: items.map((x, i) => [x.w, ' → ', { f: 'w' + (i + 1) }]),
      fields: items.map((x, i) => field('w' + (i + 1), 'choice', x.op, { options: OPS4, width: 1 })),
      solutionSteps: items.map((x, i) => ({ id: 'w' + (i + 1), de: `${x.w} → ${x.op}`, zh: `${x.w} → ${OP_ZH[x.op]}` })),
      hintsDe: ['Wird die Zahl größer oder kleiner? Mehrfach größer heißt mal, ein Teil davon heißt geteilt.', '„-fache“ und „verdoppeln“ → ·  ·  „Teil“ und „halbieren“ → :', 'Lösung: ' + items.map((x) => `${x.w} ${x.op}`).join(' · ')],
      hintsZh: ['数是变大还是变小？变成几倍用乘，取其中一份用除。', '“-fache”“verdoppeln”是乘；“Teil”“halbieren”是除。', '答案：' + items.map((x) => `${x.w} ${x.op}`).join('；')],
      explanationDe: items.map((x) => `${x.w}: ${x.op} (${OP_NAME_DE[x.op]})`).join('. ') + '.',
      explanationZh: items.map((x) => `${x.w}：${OP_ZH[x.op]}`).join('；') + '。',
      misconceptionTags: items.some((x) => x.fache || x.teil) ? ['times-vs-part'] : [],
    };
  },
  diagnose(item, resp) {
    const all = words(item.parameters.k);
    return item.parameters.words.some((w, i) => {
      const x = all.find((y) => y.w === w);
      return (x.op === '·' && resp['w' + (i + 1)] === ':') || (x.op === ':' && resp['w' + (i + 1)] === '·');
    }) ? ['times-vs-part'] : [];
  },
};

/* ---------- Text ↔ Rechnung ---------- */
function phrase(kind, a, b, v) {
  const P = {
    '+': [`Addiere ${fmt(b)} zu ${fmt(a)}.`, `Zähle zu ${fmt(a)} noch ${fmt(b)} dazu.`, `Vergrößere ${fmt(a)} um ${fmt(b)}.`],
    '−': [`Subtrahiere ${fmt(b)} von ${fmt(a)}.`, `Nimm von ${fmt(a)} ${fmt(b)} weg.`, `Vermindere ${fmt(a)} um ${fmt(b)}.`],
    '·': [`Multipliziere ${fmt(a)} mit ${b}.`, `Bilde das ${FACHE[b]} von ${fmt(a)}.`, b === 2 ? `Verdopple ${fmt(a)}.` : `Bilde das ${FACHE[b]} von ${fmt(a)}.`],
    ':': [`Dividiere ${fmt(a)} durch ${b}.`, `Bilde den ${TEIL[b]} Teil von ${fmt(a)}.`, b === 2 ? `Halbiere ${fmt(a)}.` : `Bilde den ${TEIL[b]} Teil von ${fmt(a)}.`],
  };
  return P[kind][v % 3];
}
function phraseZh(kind, a, b) {
  return { '+': `${fmt(a)} 加 ${fmt(b)}`, '−': `${fmt(a)} 减 ${fmt(b)}`, '·': `${fmt(a)} 的 ${b} 倍`, ':': `${fmt(a)} 的 ${b} 分之一` }[kind];
}
function operands(r, level, op) {
  if (op === '+' || op === '−') {
    const a = level === 1 ? r.int(20, 99) : r.int(100, 999); const b = level === 1 ? r.int(2, 19) : r.int(11, 99);
    return op === '−' ? [Math.max(a, b + 1), b] : [a, b];
  }
  const k = level === 1 ? 2 : r.int(2, 9);
  const base = level === 3 ? r.int(11, 99) : r.int(2, 12);
  return op === '·' ? [base, k] : [base * k, k];
}
const textExpr = {
  id: 'R-text', skill: 'begriffe', subskill: 'text-rechnung',
  titleDe: 'Text und Rechnung', titleZh: '文字与算式',
  params(r, level) {
    const op = level === 1 ? r.pick(['+', '−', '·', ':']) : r.pick(['·', ':', '+', '−', '·', ':']);
    const [a, b] = operands(r, level, op);
    return { op, a, b, v: r.int(0, 2), reverse: level === 3 && r.chance(0.5) };
  },
  build(p) {
    const res = apply(p.op, p.a, p.b);
    assert(isNat(res), 'Ergebnis');
    const swap = { '+': '−', '−': '+', '·': ':', ':': '·' }[p.op];
    const correct = `${fmt(p.a)} ${p.op} ${fmt(p.b)}`;
    const distract = [`${fmt(p.a)} ${swap} ${fmt(p.b)}`, `${fmt(p.b)} ${p.op} ${fmt(p.a)}`];
    if (p.op === '+' || p.op === '·') distract[1] = `${fmt(p.a)} ${p.op === '+' ? '·' : '+'} ${fmt(p.b)}`;
    const text = phrase(p.op, p.a, p.b, p.v);
    const base = {
      solutionSteps: [{ id: 'expr', de: `${text} → ${correct}`, zh: `${phraseZh(p.op, p.a, p.b)} → ${correct}` }, { id: 'res', de: `${correct} = ${fmt(res)}`, zh: `${correct} = ${fmt(res)}` }],
      hintsDe: ['Welches Wort im Satz sagt dir die Rechenart?', `Hier wird ${OP_NAME_DE[p.op].toLowerCase()} gerechnet: ${p.op}.`, `Lösung: ${correct} = ${fmt(res)}`],
      hintsZh: ['句子里哪个词告诉你用什么运算？', `这里用${OP_ZH[p.op]}：${p.op}。`, `答案：${correct} = ${fmt(res)}`],
      explanationDe: `„${text}“ bedeutet ${correct}. Das ergibt ${fmt(res)}.`,
      explanationZh: `“${text}”的意思是${phraseZh(p.op, p.a, p.b)}，算式 ${correct} = ${fmt(res)}。`,
      misconceptionTags: p.op === '·' || p.op === ':' ? ['times-vs-part'] : [],
    };
    if (!p.reverse) {
      const opts = [correct, ...distract];
      return {
        ...base,
        promptDe: `${text}\nWelche Rechnung passt? Rechne aus.`,
        layout: [[{ f: 'expr' }], ['Ergebnis: ', { f: 'res' }]],
        fields: [field('expr', 'choice', correct, { options: opts.sort(), step: 'expr', role: 'process' }), field('res', 'number', res, { step: 'res' })],
      };
    }
    const wrongText = phrase(swap, p.a, p.b, p.v);
    const otherText = p.op === '−' || p.op === ':' ? phrase(p.op === '−' ? '+' : '·', p.a, p.b, (p.v + 1) % 3) : phrase(p.op === '+' ? '−' : ':', p.a, p.b, (p.v + 2) % 3);
    const opts = [...new Set([text, wrongText, otherText])];
    assert(opts.length === 3, 'drei verschiedene Texte');
    return {
      ...base,
      promptDe: `Welcher Satz passt zur Rechnung ${correct}? Rechne auch aus.`,
      layout: [[{ f: 'expr' }], [correct, ' = ', { f: 'res' }]],
      fields: [field('expr', 'choice', text, { options: opts.sort(), step: 'expr', role: 'process' }), field('res', 'number', res, { step: 'res' })],
    };
  },
  diagnose(item, resp) {
    const p = item.parameters;
    if (p.op !== '·' && p.op !== ':') return [];
    const v = Number(String(resp.res || '').replace(/\s/g, ''));
    const other = p.op === '·' ? p.a / p.b : p.a * p.b;
    const pickedSwap = typeof resp.expr === 'string' && (resp.expr.includes(p.op === '·' ? ':' : '·') || /Teil|Halbiere|fache|Verdopple|Multipliziere|Dividiere/.test(resp.expr) && resp.expr !== item.answer.expr);
    return pickedSwap || v === other ? ['times-vs-part'] : [];
  },
};

/* ---------- Rechnung ergänzen ---------- */
const complete = {
  id: 'R-ergaenzen', skill: 'begriffe', subskill: 'rechnung-ergaenzen',
  titleDe: 'Rechnung ergänzen', titleZh: '补全算式',
  params(r, level) {
    const kind = level === 1 ? r.pick(['plus', 'minus', 'doppelt', 'halb']) : r.pick(['fache', 'teil', 'fache', 'teil', 'plus', 'minus']);
    const k = r.int(3, 9);
    const n = level === 3 ? r.int(11, 40) : r.int(2, 12);
    const m = level === 1 ? r.int(2, 30) : r.int(12, 120);
    return { kind, k, n, m };
  },
  build(p) {
    let text, a, op, b;
    if (p.kind === 'fache') { a = p.n; op = '·'; b = p.k; text = `Das ${FACHE[p.k]} von ${fmt(a)} ist □.`; }
    else if (p.kind === 'teil') { a = p.n * p.k; op = ':'; b = p.k; text = `Der ${TEIL_NOM[p.k]} Teil von ${fmt(a)} ist □.`; }
    else if (p.kind === 'doppelt') { a = p.m; op = '·'; b = 2; text = `Verdopple ${fmt(a)}. Du erhältst □.`; }
    else if (p.kind === 'halb') { a = p.m * 2; op = ':'; b = 2; text = `Halbiere ${fmt(a)}. Du erhältst □.`; }
    else if (p.kind === 'plus') { a = p.m * 3; op = '+'; b = p.m; text = `Vergrößere ${fmt(a)} um ${fmt(b)}. Du erhältst □.`; }
    else { a = p.m * 3; op = '−'; b = p.m; text = `Vermindere ${fmt(a)} um ${fmt(b)}. Du erhältst □.`; }
    const res = apply(op, a, b);
    assert(isNat(res), 'Ergebnis');
    return {
      promptDe: text + '\nSchreibe die Rechnung und rechne aus.',
      layout: [[fmt(a), ' ', { f: 'op' }, ' ', fmt(b), ' = ', { f: 'res' }]],
      fields: [field('op', 'choice', op, { options: OPS4, role: 'process', width: 1 }), field('res', 'number', res)],
      solutionSteps: [{ id: 'op', de: `${fmt(a)} ${op} ${fmt(b)}`, zh: `${fmt(a)} ${op} ${fmt(b)}` }, { id: 'res', de: `= ${fmt(res)}`, zh: `= ${fmt(res)}` }],
      hintsDe: ['Welches Wort sagt dir die Rechenart?', `Hier rechnest du ${fmt(a)} ${op} ${fmt(b)}.`, `Lösung: ${fmt(a)} ${op} ${fmt(b)} = ${fmt(res)}`],
      hintsZh: ['哪个词告诉你用什么运算？', `这里算 ${fmt(a)} ${op} ${fmt(b)}。`, `答案：${fmt(a)} ${op} ${fmt(b)} = ${fmt(res)}`],
      explanationDe: `${text.replace('□', fmt(res))} Rechnung: ${fmt(a)} ${op} ${fmt(b)} = ${fmt(res)}.`,
      explanationZh: `算式：${fmt(a)} ${op} ${fmt(b)} = ${fmt(res)}（${OP_ZH[op]}）。`,
      misconceptionTags: op === '·' || op === ':' ? ['times-vs-part'] : [],
    };
  },
  diagnose(item, resp) {
    const f = item.answer.op;
    return (f === '·' && resp.op === ':') || (f === ':' && resp.op === '·') ? ['times-vs-part'] : [];
  },
};

/* ---------- Text-Rechnung vs. Rückwärts-Rechnung ---------- */
const direction = {
  id: 'R-richtung', skill: 'begriffe', subskill: 'vorwaerts-rueckwaerts',
  titleDe: 'Was steht im Text – wie rechne ich zurück?', titleZh: '正向运算与逆运算',
  params(r, level) {
    const kind = level === 1 ? r.pick(['plus', 'minus']) : r.pick(['fache', 'teil', 'fache', 'teil', 'plus', 'minus']);
    return { kind, k: r.int(3, 9), x: level === 1 ? r.int(10, 60) : r.int(3, 15), n: r.int(5, 40) };
  },
  build(p) {
    let text, op, b;
    if (p.kind === 'fache') { op = '·'; b = p.k; text = `Das ${FACHE[p.k]} meiner Zahl ist ${fmt(p.x * p.k)}.`; }
    else if (p.kind === 'teil') { op = ':'; b = p.k; text = `Der ${TEIL_NOM[p.k]} Teil meiner Zahl ist ${fmt(p.x)}.`; }
    else if (p.kind === 'plus') { op = '+'; b = p.n; text = `Ich addiere ${fmt(b)} zu meiner Zahl und erhalte ${fmt(p.x + p.n)}.`; }
    else { op = '−'; b = p.n; text = `Ich vermindere meine Zahl um ${fmt(b)} und erhalte ${fmt(p.x)}.`; }
    const x = p.kind === 'teil' ? p.x * p.k : p.kind === 'minus' ? p.x + p.n : p.x; // gesuchte Zahl
    const r = apply(op, x, b);
    const inv = { '+': '−', '−': '+', '·': ':', ':': '·' }[op];
    assert(isNat(r) && apply(inv, r, b) === x, 'Umkehrung');
    return {
      promptDe: text + '\nWelche Rechnung steht im Text? Wie rechnest du zurück?',
      layout: [['Im Text: □ ', { f: 'fop' }, ` ${fmt(b)} = ${fmt(r)}`], ['Rückwärts: ', `${fmt(r)} `, { f: 'iop' }, ` ${fmt(b)} = `, { f: 'x' }]],
      fields: [
        field('fop', 'choice', op, { options: OPS4, role: 'process', step: 'forward', width: 1 }),
        field('iop', 'choice', inv, { options: OPS4, role: 'process', step: 'inverse', width: 1 }),
        field('x', 'number', x, { step: 'inverse' }),
      ],
      solutionSteps: [
        { id: 'forward', de: `Im Text (vorwärts): □ ${op} ${fmt(b)} = ${fmt(r)}`, zh: `题目描述的正向运算：□ ${op} ${fmt(b)} = ${fmt(r)}` },
        { id: 'inverse', de: `Rückwärts mit der Umkehraufgabe: ${fmt(r)} ${inv} ${fmt(b)} = ${fmt(x)}`, zh: `求原数用逆运算：${fmt(r)} ${inv} ${fmt(b)} = ${fmt(x)}` },
      ],
      hintsDe: ['Schreib zuerst genau auf, was mit der Zahl passiert ist.', `Im Text steht ${op}. Rückwärts rechnest du das Gegenteil: ${inv}.`, `Lösung: □ ${op} ${fmt(b)} = ${fmt(r)}  →  ${fmt(r)} ${inv} ${fmt(b)} = ${fmt(x)}`],
      hintsZh: ['先写出这个数经历了什么运算。', `题目里是 ${op}，倒推要用相反的运算：${inv}。`, `答案：□ ${op} ${fmt(b)} = ${fmt(r)} → ${fmt(r)} ${inv} ${fmt(b)} = ${fmt(x)}`],
      explanationDe: `Der Text beschreibt die Rechnung vorwärts: □ ${op} ${fmt(b)} = ${fmt(r)}. Um die Zahl zu finden, rechnest du rückwärts mit der Umkehraufgabe ${inv}: ${fmt(r)} ${inv} ${fmt(b)} = ${fmt(x)}.`,
      explanationZh: `题目描述的是正向运算：□ ${op} ${fmt(b)} = ${fmt(r)}。要求原来的数，就用逆运算 ${inv}：${fmt(r)} ${inv} ${fmt(b)} = ${fmt(x)}。`,
      misconceptionTags: op === '·' || op === ':' ? ['times-vs-part'] : [],
    };
  },
  diagnose(item, resp) {
    const op = item.answer.fop;
    if (op !== '·' && op !== ':') return [];
    return resp.fop === item.answer.iop || resp.iop === op ? ['times-vs-part'] : [];
  },
};

/* ---------- Quadratzahlen ---------- */
const sqResult = {
  id: 'Q-ergebnis', skill: 'quadrat', subskill: 'ergebnis',
  titleDe: 'Quadratzahlen ausrechnen', titleZh: '计算平方数',
  params(r, level) { return { ns: r.shuffle(level === 1 ? [1, 2, 3, 4, 5, 10] : [3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 4) }; },
  build(p) {
    return {
      promptDe: 'Rechne aus.',
      layout: p.ns.map((n, i) => [`${n} · ${n} = `, { f: 'q' + (i + 1) }]),
      fields: p.ns.map((n, i) => field('q' + (i + 1), 'number', n * n)),
      solutionSteps: p.ns.map((n, i) => ({ id: 'q' + (i + 1), de: `${n} · ${n} = ${n * n}`, zh: `${n} · ${n} = ${n * n}` })),
      hintsDe: ['Eine Zahl mal sich selbst – das ist eine Quadratzahl.', 'Denk an das Einmaleins: z. B. 7 · 7 = 49.', 'Lösung: ' + p.ns.map((n) => `${n} · ${n} = ${n * n}`).join(' · ')],
      hintsZh: ['一个数乘它自己，得到平方数。', '想乘法口诀，例如 7 · 7 = 49。', '答案：' + p.ns.map((n) => `${n} · ${n} = ${n * n}`).join('；')],
      explanationDe: 'Quadratzahlen: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100.',
      explanationZh: '平方数：1、4、9、16、25、36、49、64、81、100。',
      misconceptionTags: ['table-error'],
    };
  },
};
const sqFactor = {
  id: 'Q-faktor', skill: 'quadrat', subskill: 'gleicher-faktor',
  titleDe: 'Gleiche Faktoren finden', titleZh: '找相同的因数',
  params(r, level) { return { ns: r.shuffle(level === 1 ? [2, 3, 4, 5, 10] : [4, 5, 6, 7, 8, 9, 10]).slice(0, 2) }; },
  build(p) {
    const fields = []; const layout = [];
    p.ns.forEach((n, i) => {
      fields.push(field(`a${i + 1}`, 'number', n, { step: 'q' + i }), field(`b${i + 1}`, 'number', n, { step: 'q' + i }));
      layout.push([{ f: `a${i + 1}` }, ' · ', { f: `b${i + 1}` }, ` = ${n * n}`]);
    });
    return {
      promptDe: 'Beide Faktoren sind gleich. Ergänze.',
      layout, fields,
      solutionSteps: p.ns.map((n, i) => ({ id: 'q' + i, de: `${n} · ${n} = ${n * n}`, zh: `${n} · ${n} = ${n * n}` })),
      hintsDe: ['Welche Zahl mal sich selbst ergibt das Ergebnis?', 'Probiere: 6 · 6, 7 · 7, 8 · 8 …', 'Lösung: ' + p.ns.map((n) => `${n} · ${n} = ${n * n}`).join(' · ')],
      hintsZh: ['哪个数乘它自己等于这个结果？', '试试 6 · 6、7 · 7、8 · 8……', '答案：' + p.ns.map((n) => `${n} · ${n} = ${n * n}`).join('；')],
      explanationDe: p.ns.map((n) => `${n * n} ist eine Quadratzahl: ${n} · ${n} = ${n * n}.`).join(' '),
      explanationZh: p.ns.map((n) => `${n * n} 是平方数：${n} · ${n} = ${n * n}。`).join(''),
      misconceptionTags: ['table-error'],
      validationRules: p.ns.flatMap((n, i) => [{ field: `a${i + 1}`, type: 'equals', value: n }, { field: `b${i + 1}`, type: 'equals', value: n }, { type: 'sameValue', fields: [`a${i + 1}`, `b${i + 1}`] }]),
    };
  },
};
const sqIdentify = {
  id: 'Q-erkennen', skill: 'quadrat', subskill: 'erkennen',
  titleDe: 'Quadratzahlen erkennen', titleZh: '识别平方数',
  params(r) {
    const sq = r.shuffle([1, 4, 9, 16, 25, 36, 49, 64, 81, 100]).slice(0, 3);
    const non = r.shuffle([12, 18, 20, 24, 27, 32, 40, 45, 48, 50, 54, 63, 72, 80, 90]).slice(0, 4);
    return { nums: r.shuffle([...sq, ...non]) };
  },
  build(p) {
    const isSq = (n) => Number.isInteger(Math.sqrt(n)) && Math.sqrt(n) <= 10;
    const ans = p.nums.filter(isSq);
    assert(ans.length >= 2, 'mindestens zwei Quadratzahlen');
    return {
      promptDe: 'Tippe alle Quadratzahlen an.',
      answerType: 'multi',
      layout: [[{ f: 'sel' }]],
      fields: [field('sel', 'multi', ans.map(String), { options: p.nums.map(String) })],
      solutionSteps: ans.map((n) => ({ id: 'sel', de: `${n} = ${Math.sqrt(n)} · ${Math.sqrt(n)}`, zh: `${n} = ${Math.sqrt(n)} · ${Math.sqrt(n)}` })),
      hintsDe: ['Eine Quadratzahl ist eine Zahl mal sich selbst.', 'Die Quadratzahlen bis 100: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100.', 'Lösung: ' + ans.join(', ')],
      hintsZh: ['平方数是一个数乘它自己的结果。', '100 以内的平方数：1、4、9、16、25、36、49、64、81、100。', '答案：' + ans.join('、')],
      explanationDe: ans.map((n) => `${n} = ${Math.sqrt(n)} · ${Math.sqrt(n)}`).join(', ') + '. Die anderen Zahlen sind keine Quadratzahlen.',
      explanationZh: ans.map((n) => `${n} = ${Math.sqrt(n)} · ${Math.sqrt(n)}`).join('，') + '。其他数不是平方数。',
      misconceptionTags: [],
    };
  },
};

export default [wordOp, textExpr, complete, direction, sqResult, sqFactor, sqIdentify];
