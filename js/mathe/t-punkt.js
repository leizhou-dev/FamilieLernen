// 6. Punkt vor Strich (inkl. Zehnerzahl als Teiler, Paare, Fehler finden)
import { fmt, field, assert, isNat, apply, parseNum } from './core.js';

const STRUCTS = ['a+b·c', 'a−b:c', 'a:b+c', 'a·b−c', 'a·b+c·d', 'a·b−c:d', 'a:b−c·d', 'a:b−c:d'];
const BY_LEVEL = { 1: ['a+b·c', 'a·b−c', 'a:b+c', 'a−b:c'], 2: STRUCTS, 3: STRUCTS };

function mulPair(r, level) {
  if (level === 1) return [r.int(2, 9), r.int(2, 9)];
  const p = [r.int(2, 9) * (r.chance(0.6) ? 10 : 1), r.int(2, 9)];
  return r.chance(0.5) ? p : [p[1], p[0]];
}
function divPair(r, level, tens) {
  const q = r.int(2, 9), e = r.int(2, 9);
  if (tens) return r.chance(0.75) ? [q * e * 10, e * 10] : [q * e * 100, e * 10]; // 420 : 60 = 7 · 3600 : 60 = 60
  if (level === 1) return [q * e, e];
  return r.chance(0.5) ? [q * e * 10, e] : [q * e, e];
}

const expr = {
  id: 'P-ausdruck', skill: 'punktvorstrich', subskill: 'ausdruck',
  titleDe: 'Punkt vor Strich', titleZh: '先乘除后加减',
  params(r, level) {
    const s = r.pick(BY_LEVEL[level]);
    const tens = level === 3 && r.chance(0.6);
    const p = { s };
    const pt = (kind) => (kind === '·' ? mulPair(r, level) : divPair(r, level, tens));
    const ops = s.match(/[·:]/g);
    p.x = pt(ops[0]);
    if (ops.length === 2) p.y = pt(ops[1]);
    else p.c = r.int(level === 1 ? 5 : 20, level === 1 ? 60 : 400);
    return p;
  },
  build(p) {
    const ops = p.s.match(/[·:]/g);
    const v1 = apply(ops[0], ...p.x);
    const v2 = p.y ? apply(ops[1], ...p.y) : null;
    assert(Number.isInteger(v1) && (v2 === null || Number.isInteger(v2)), 'teilbar');
    const strich = p.s.includes('+') ? '+' : '−';
    const firstIsPoint = /^a[·:]/.test(p.s);
    let tokensExpr, left, right, line2;
    const t1 = `${fmt(p.x[0])} ${ops[0]} ${fmt(p.x[1])}`;
    if (p.y) {
      const t2 = `${fmt(p.y[0])} ${ops[1]} ${fmt(p.y[1])}`;
      tokensExpr = `${t1} ${strich} ${t2}`; left = v1; right = v2;
      line2 = [{ f: 'i1' }, ` ${strich} `, { f: 'i2' }];
    } else if (firstIsPoint) {
      tokensExpr = `${t1} ${strich} ${fmt(p.c)}`; left = v1; right = p.c;
      line2 = [{ f: 'i1' }, ` ${strich} ${fmt(p.c)}`];
    } else {
      tokensExpr = `${fmt(p.c)} ${strich} ${t1}`; left = p.c; right = v1;
      line2 = [`${fmt(p.c)} ${strich} `, { f: 'i1' }];
    }
    const res = apply(strich, left, right);
    assert(isNat(res) && isNat(v1) && (v2 === null || isNat(v2)), 'nicht negativ');
    const fields = [field('i1', 'number', v1, { role: 'process', step: 'point1' })];
    if (p.y) fields.push(field('i2', 'number', v2, { role: 'process', step: 'point2' }));
    fields.push(field('final', 'number', res, { step: 'final' }));
    const mid = p.y ? `${fmt(v1)} ${strich} ${fmt(v2)}` : firstIsPoint ? `${fmt(v1)} ${strich} ${fmt(p.c)}` : `${fmt(p.c)} ${strich} ${fmt(v1)}`;
    const full = `${tokensExpr} = ${mid} = ${fmt(res)}`;
    const tensDiv = [p.x, p.y].some((pr, k) => pr && ops[k] === ':' && pr[1] % 10 === 0);
    return {
      promptDe: 'Rechne. Denk an „Punkt vor Strich“: Rechne zuerst Mal und Geteilt.',
      layout: [[tokensExpr], ['= ', ...line2, ' = ', { f: 'final' }]],
      fields,
      solutionSteps: [
        { id: 'point1', de: `${t1} = ${fmt(v1)}`, zh: `先算 ${t1} = ${fmt(v1)}` },
        ...(p.y ? [{ id: 'point2', de: `${fmt(p.y[0])} ${ops[1]} ${fmt(p.y[1])} = ${fmt(v2)}`, zh: `再算 ${fmt(p.y[0])} ${ops[1]} ${fmt(p.y[1])} = ${fmt(v2)}` }] : []),
        { id: 'final', de: `${mid} = ${fmt(res)}`, zh: `最后算 ${mid} = ${fmt(res)}` },
      ],
      hintsDe: [
        'Punkt vor Strich: Welche Rechnungen mit · oder : siehst du? Die kommen zuerst.',
        `Rechne zuerst ${t1}${p.y ? ` und ${fmt(p.y[0])} ${ops[1]} ${fmt(p.y[1])}` : ''}.${tensDiv ? ' Bei einer Zehnerzahl als Teiler: Streiche bei beiden Zahlen eine Null.' : ''}`,
        `Lösung: ${full}`,
      ],
      hintsZh: [
        '先乘除后加减：先找出带 · 或 : 的部分。',
        `先算 ${t1}${p.y ? ` 和 ${fmt(p.y[0])} ${ops[1]} ${fmt(p.y[1])}` : ''}。${tensDiv ? '除数是整十数时，被除数和除数可以同时去掉一个 0。' : ''}`,
        `答案：${full}`,
      ],
      explanationDe: `Zuerst die Punktrechnung${p.y ? 'en' : ''}: ${t1} = ${fmt(v1)}${p.y ? `, ${fmt(p.y[0])} ${ops[1]} ${fmt(p.y[1])} = ${fmt(v2)}` : ''}. Dann die Strichrechnung: ${mid} = ${fmt(res)}.${tensDiv ? ' Tipp: 420 : 60 ist so viel wie 42 : 6 – beide Zahlen ohne die Null.' : ''}`,
      explanationZh: `先算乘除：${t1} = ${fmt(v1)}${p.y ? `，${fmt(p.y[0])} ${ops[1]} ${fmt(p.y[1])} = ${fmt(v2)}` : ''}。再算加减：${mid} = ${fmt(res)}。${tensDiv ? '提示：420 : 60 和 42 : 6 结果一样，两个数同时去掉一个 0。' : ''}`,
      misconceptionTags: [...(tensDiv ? ['tens-division-zero'] : []), 'table-error'],
      extra: { exprText: tokensExpr },
    };
  },
  diagnose(item, resp, res) {
    const p = item.parameters; const ops = p.s.match(/[·:]/g); const tags = [];
    [[p.x, 'i1', 0], [p.y, 'i2', 1]].forEach(([pr, f, k]) => {
      if (!pr || res.fields[f]?.ok || res.fields[f]?.empty) return;
      const v = parseNum(resp[f]); const want = apply(ops[k], ...pr);
      if (ops[k] === ':' && pr[1] % 10 === 0 && v === want * 10) tags.push('tens-division-zero');
      else tags.push('table-error');
    });
    // von links nach rechts gerechnet (Punkt vor Strich nicht beachtet)
    const fin = parseNum(resp.final);
    if (!res.fields.final.ok && Number.isFinite(fin) && fin === leftToRight(item)) tags.push('order-of-ops');
    return tags;
  },
};
function leftToRight(item) {
  const toks = item.exprText.replace(/ /g, '').split(' ');
  let v = Number(toks[0]);
  for (let i = 1; i < toks.length; i += 2) v = apply(toks[i], v, Number(toks[i + 1]));
  return v;
}

/* ---------- Paare: 360 : 6 und 360 : 60 ---------- */
const pair = {
  id: 'P-paar', skill: 'punktvorstrich', subskill: 'zehner-teiler-paar', levels: [2, 3],
  titleDe: 'Geteilt durch Zehnerzahlen', titleZh: '整十数除法对比',
  params(r) { return { q: r.int(2, 9), e: r.int(2, 9), big: r.chance(0.3) }; },
  build(p) {
    const n = p.q * p.e * (p.big ? 100 : 10);
    const a = n / p.e, b = n / (p.e * 10);
    assert(Number.isInteger(a) && Number.isInteger(b) && isNat(n), 'teilbar');
    return {
      promptDe: 'Rechne beide Aufgaben. Was fällt dir auf?',
      layout: [[`${fmt(n)} : ${p.e} = `, { f: 'x' }], [`${fmt(n)} : ${p.e * 10} = `, { f: 'y' }]],
      fields: [field('x', 'number', a), field('y', 'number', b)],
      solutionSteps: [{ id: 'x', de: `${fmt(n)} : ${p.e} = ${fmt(a)}`, zh: `${fmt(n)} : ${p.e} = ${fmt(a)}` }, { id: 'y', de: `${fmt(n)} : ${p.e * 10} = ${fmt(b)}`, zh: `${fmt(n)} : ${p.e * 10} = ${fmt(b)}` }],
      hintsDe: ['Der zweite Teiler ist zehnmal so groß. Was passiert dann mit dem Ergebnis?', `Ist der Teiler 10-mal so groß, wird das Ergebnis 10-mal so klein: ${fmt(n)} : ${p.e * 10} = ${fmt(n / 10)} : ${p.e}.`, `Lösung: ${fmt(a)} und ${fmt(b)}`],
      hintsZh: ['第二个除数是第一个的 10 倍，商会怎样？', `除数扩大 10 倍，商就缩小到原来的十分之一：${fmt(n)} : ${p.e * 10} = ${fmt(n / 10)} : ${p.e}。`, `答案：${fmt(a)} 和 ${fmt(b)}`],
      explanationDe: `${fmt(n)} : ${p.e} = ${fmt(a)}, aber ${fmt(n)} : ${p.e * 10} = ${fmt(b)}. Probe: ${fmt(b)} · ${p.e * 10} = ${fmt(n)}. Beim Teilen durch ${p.e * 10} hat das Ergebnis eine Null weniger.`,
      explanationZh: `${fmt(n)} : ${p.e} = ${fmt(a)}，但 ${fmt(n)} : ${p.e * 10} = ${fmt(b)}。验算：${fmt(b)} · ${p.e * 10} = ${fmt(n)}。除以 ${p.e * 10} 时，商少一个 0。`,
      misconceptionTags: ['tens-division-zero'],
    };
  },
  diagnose(item, resp) {
    const b = item.answer.y;
    return parseNum(resp.y) === b * 10 || parseNum(resp.x) === b ? ['tens-division-zero'] : [];
  },
};

/* ---------- Fehler finden: Quotient verbessern + Probe ---------- */
const fix = {
  id: 'P-fehler', skill: 'punktvorstrich', subskill: 'fehler-finden', levels: [3],
  titleDe: 'Fehler finden', titleZh: '改错',
  params(r) {
    const q = r.int(2, 9), e = r.int(2, 9);
    return { q, e, kind: r.pick(['zero', 'zero', 'table']), name: r.pick(['Tim', 'Lea', 'Ben', 'Mia', 'Paul', 'Emma']), sign: r.pick([1, -1]) };
  },
  build(p) {
    const n = p.q * p.e * 10, dv = p.e * 10;
    const wrong = p.kind === 'zero' ? p.q * 10 : p.q + p.sign;
    assert(wrong > 0 && wrong !== p.q && n % dv === 0, 'falsches Ergebnis');
    return {
      promptDe: `${p.name} rechnet: ${fmt(n)} : ${dv} = ${fmt(wrong)}.\nDas stimmt nicht. Verbessere und mache die Probe mit einer Malaufgabe.`,
      layout: [[`Richtig: ${fmt(n)} : ${dv} = `, { f: 'q' }], ['Probe: ', { f: 'pq' }, ` · ${dv} = `, { f: 'probe' }]],
      fields: [
        field('q', 'number', p.q, { step: 'fix' }),
        field('pq', 'number', p.q, { role: 'process', step: 'probe' }),
        field('probe', 'number', n, { role: 'process', step: 'probe', rule: { type: 'apply', from: 'pq', ops: [['·', dv]] } }),
      ],
      solutionSteps: [{ id: 'fix', de: `${fmt(n)} : ${dv} = ${p.q}`, zh: `${fmt(n)} : ${dv} = ${p.q}` }, { id: 'probe', de: `Probe: ${p.q} · ${dv} = ${fmt(n)}`, zh: `验算：${p.q} · ${dv} = ${fmt(n)}` }],
      hintsDe: [`Mach zuerst die Probe mit ${p.name}s Ergebnis: ${fmt(wrong)} · ${dv} = ?`, `${fmt(wrong)} · ${dv} = ${fmt(wrong * dv)} – das ist nicht ${fmt(n)}. Rechne ${fmt(n / 10)} : ${p.e}.`, `Lösung: ${fmt(n)} : ${dv} = ${p.q}, Probe ${p.q} · ${dv} = ${fmt(n)}`],
      hintsZh: [`先用 ${p.name} 的结果验算：${fmt(wrong)} · ${dv} = ?`, `${fmt(wrong)} · ${dv} = ${fmt(wrong * dv)}，不等于 ${fmt(n)}。算 ${fmt(n / 10)} : ${p.e}。`, `答案：${fmt(n)} : ${dv} = ${p.q}，验算 ${p.q} · ${dv} = ${fmt(n)}`],
      explanationDe: p.kind === 'zero'
        ? `${p.name} hat eine Null zu viel geschrieben. ${fmt(n)} : ${dv} ist so viel wie ${fmt(n / 10)} : ${p.e} = ${p.q}. Probe: ${p.q} · ${dv} = ${fmt(n)}.`
        : `${p.name} hat sich im Einmaleins verrechnet. ${fmt(n)} : ${dv} = ${fmt(n / 10)} : ${p.e} = ${p.q}. Probe: ${p.q} · ${dv} = ${fmt(n)}.`,
      explanationZh: p.kind === 'zero'
        ? `${p.name} 的商多写了一个 0。${fmt(n)} : ${dv} 等于 ${fmt(n / 10)} : ${p.e} = ${p.q}。验算：${p.q} · ${dv} = ${fmt(n)}。`
        : `${p.name} 的乘法口诀算错了。${fmt(n)} : ${dv} = ${fmt(n / 10)} : ${p.e} = ${p.q}。验算：${p.q} · ${dv} = ${fmt(n)}。`,
      misconceptionTags: p.kind === 'zero' ? ['tens-division-zero', 'missing-step'] : ['table-error', 'missing-step'],
      extra: { shownWrong: wrong },
    };
  },
  diagnose(item, resp) {
    const v = parseNum(resp.q);
    if (v === item.answer.q * 10 || v === item.shownWrong && item.parameters.kind === 'zero') return ['tens-division-zero'];
    if (Number.isFinite(v) && v !== item.answer.q) return ['table-error'];
    return [];
  },
};

export default [expr, pair, fix];
