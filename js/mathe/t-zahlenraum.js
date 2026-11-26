// 1. Zahlenraum bis 100 000: Zahlenfolgen, Vergleichen, Ordnen, Nachbartausender/-zehntausender
import { fmt, fmtSigned, field, assert, isNat, MAX } from './core.js';

const SKILL = 'zahlenraum';

/* ---------- Zahlenfolge ---------- */
const seq = {
  id: 'Z-folge', skill: SKILL, subskill: 'zahlenfolge',
  titleDe: 'Zahlenfolgen ergänzen', titleZh: '补全等差数列',
  params(r, level) {
    const steps = level === 1 ? [1, 10, 100, 1000] : level === 2 ? [10, 50, 100, 500, 1000] : [25, 200, 250, 2500, 5000];
    const step = r.pick(steps) * (r.chance(level === 1 ? 0.3 : 0.5) ? -1 : 1);
    const len = 6;
    let start;
    if (level === 1) start = r.int(1, 90) * (Math.abs(step) >= 100 ? 100 : 10) + (Math.abs(step) === 1 ? r.int(0, 9) : 0);
    else {
      // Stufe 2/3: die Folge läuft über einen glatten Tausender bzw. Zehntausender
      const unit = Math.abs(step) >= 1000 ? 10000 : 1000;
      const k = r.int(1, len - 2);
      start = r.int(1, 9) * unit - step * k;
    }
    const blanks = level === 1 ? [4, 5] : level === 2 ? r.pick([[3, 4], [4, 5], [2, 3]]) : r.pick([[1, 4], [2, 5], [0, 3]]);
    return { start, step, len, blanks };
  },
  build(p) {
    const terms = Array.from({ length: p.len }, (_, i) => p.start + i * p.step);
    terms.forEach((t) => assert(isNat(t), 'außerhalb 0–100000'));
    const fields = p.blanks.map((i, k) => field('b' + (k + 1), 'number', terms[i], { step: 'term' + i, width: String(terms[i]).length }));
    fields.push(field('step', 'signed', p.step, { step: 'rule', width: 6 }));
    const line = [];
    terms.forEach((t, i) => { const bi = p.blanks.indexOf(i); line.push(bi >= 0 ? { f: 'b' + (bi + 1) } : fmt(t)); if (i < terms.length - 1) line.push(', '); });
    const known = terms.findIndex((_, i) => !p.blanks.includes(i) && !p.blanks.includes(i + 1) && i + 1 < terms.length);
    const up = p.step > 0;
    return {
      promptDe: 'Ergänze die Zahlenfolge und schreibe die Regel auf.',
      layout: [line, ['Regel: ', { f: 'step' }]],
      fields,
      solutionSteps: [
        { id: 'rule', de: `Von ${fmt(terms[known])} zu ${fmt(terms[known + 1])}: ${fmtSigned(p.step)}`, zh: `从 ${fmt(terms[known])} 到 ${fmt(terms[known + 1])}：${fmtSigned(p.step)}` },
        ...p.blanks.map((i) => ({ id: 'term' + i, de: `${fmt(terms[i - 1] ?? terms[i + 1])} ${i === 0 ? fmtSigned(-p.step) : fmtSigned(p.step)} = ${fmt(terms[i])}`, zh: `${fmt(terms[i])}` })),
      ],
      hintsDe: [
        'Schau dir zwei Nachbarzahlen an: Wird es größer oder kleiner – und um wie viel?',
        `Von ${fmt(terms[known])} zu ${fmt(terms[known + 1])} sind es ${fmtSigned(p.step)}.`,
        `Lösung: ${p.blanks.map((i) => fmt(terms[i])).join(', ')} · Regel ${fmtSigned(p.step)}`,
      ],
      hintsZh: [
        '看相邻的两个数：是变大还是变小？变了多少？',
        `从 ${fmt(terms[known])} 到 ${fmt(terms[known + 1])} 是 ${fmtSigned(p.step)}。`,
        `答案：${p.blanks.map((i) => fmt(terms[i])).join('、')}，规律 ${fmtSigned(p.step)}`,
      ],
      explanationDe: `Die Zahlen werden immer um ${fmt(Math.abs(p.step))} ${up ? 'größer' : 'kleiner'}. Die Regel heißt ${fmtSigned(p.step)}. Die Folge: ${terms.map(fmt).join(', ')}.`,
      explanationZh: `每次${up ? '增加' : '减少'} ${fmt(Math.abs(p.step))}，规律是 ${fmtSigned(p.step)}。完整数列：${terms.map(fmt).join('、')}。`,
      misconceptionTags: [],
      validationRules: [...p.blanks.map((i, k) => ({ field: 'b' + (k + 1), type: 'equals', value: terms[i] })), { field: 'step', type: 'equals', value: p.step, note: 'mit Vorzeichen' }],
    };
  },
};

/* ---------- Vergleichen ---------- */
function similar(r, level) {
  if (level === 1) {
    const a = r.int(1000, 99999); let b;
    do { b = r.chance(0.5) ? r.int(100, 9999) : r.int(10000, 99999); } while (String(b).length === String(a).length || b === a);
    return [a, b];
  }
  const a = r.int(10000, 99999);
  const s = String(a).split('');
  const pos = level === 2 ? r.int(1, 2) : r.int(3, 4);
  let d; do { d = r.int(0, 9); } while (String(d) === s[pos]);
  s[pos] = String(d);
  const b = +s.join('');
  return [a, b];
}
const compare = {
  id: 'Z-vergleichen', skill: SKILL, subskill: 'vergleichen',
  titleDe: 'Zahlen vergleichen', titleZh: '比较大小',
  params(r, level) {
    const pairs = [];
    while (pairs.length < 3) {
      const [a, b] = similar(r, level);
      if (b >= 0 && b <= MAX && !pairs.some((p) => p[0] === a && p[1] === b)) pairs.push(r.chance(0.5) ? [a, b] : [b, a]);
    }
    return { pairs };
  },
  build(p) {
    const rel = (a, b) => (a < b ? '<' : a > b ? '>' : '=');
    const fields = p.pairs.map(([a, b], i) => field('r' + (i + 1), 'choice', rel(a, b), { options: ['<', '>', '='], width: 1 }));
    return {
      promptDe: 'Setze <, > oder = ein.',
      layout: p.pairs.map(([a, b], i) => [fmt(a), ' ', { f: 'r' + (i + 1) }, ' ', fmt(b)]),
      fields,
      solutionSteps: p.pairs.map(([a, b], i) => ({ id: 'r' + (i + 1), de: `${fmt(a)} ${rel(a, b)} ${fmt(b)}`, zh: `${fmt(a)} ${rel(a, b)} ${fmt(b)}` })),
      hintsDe: ['Hat eine Zahl mehr Stellen? Dann ist sie größer.', 'Gleich viele Stellen: Vergleiche von links – zuerst die Zehntausender, dann die Tausender …', 'Lösung: ' + p.pairs.map(([a, b]) => `${fmt(a)} ${rel(a, b)} ${fmt(b)}`).join(' · ')],
      hintsZh: ['位数多的数更大。', '位数相同时从最高位比起：先比万位，再比千位……', '答案：' + p.pairs.map(([a, b]) => `${fmt(a)} ${rel(a, b)} ${fmt(b)}`).join('；')],
      explanationDe: 'Vergleiche immer von der höchsten Stelle aus. Die erste Stelle, die sich unterscheidet, entscheidet.',
      explanationZh: '比较大小要从最高位开始，第一个不同的数位决定大小。',
      misconceptionTags: ['high-digit'],
    };
  },
  diagnose(item, resp) {
    // falsch bei Zahlen, die sich erst an einer hohen Stelle unterscheiden, aber gleiche Endziffern haben → hohe Stelle übersehen
    return item.parameters.pairs.some(([a, b], i) => {
      const r = resp['r' + (i + 1)];
      if (!r || r === item.answer['r' + (i + 1)]) return false;
      return true;
    }) ? ['high-digit'] : [];
  },
};

/* ---------- Ordnen ---------- */
const order = {
  id: 'Z-ordnen', skill: SKILL, subskill: 'ordnen',
  titleDe: 'Zahlen ordnen', titleZh: '排序',
  params(r, level) {
    const n = 5; const set = new Set();
    const base = r.int(1, 8) * 10000;
    while (set.size < n) {
      let x;
      if (level === 1) x = r.pick([r.int(100, 999), r.int(1000, 9999), r.int(10000, 99999)]);
      else if (level === 2) x = r.int(10000, 99999);
      else x = base + r.int(0, 9) * 1000 + r.int(0, 999); // gleiche Zehntausender, enge Zahlen
      set.add(x);
    }
    return { nums: [...set], dir: r.pick(['asc', 'desc']) };
  },
  build(p) {
    const sorted = [...p.nums].sort((a, b) => (p.dir === 'asc' ? a - b : b - a));
    const fields = sorted.map((v, i) => field('p' + (i + 1), 'pick', String(v), { step: 'order', width: 6 }));
    const sign = p.dir === 'asc' ? ' < ' : ' > ';
    return {
      promptDe: p.dir === 'asc' ? 'Ordne die Zahlen. Beginne mit der kleinsten.' : 'Ordne die Zahlen. Beginne mit der größten.',
      answerType: 'order',
      layout: [sorted.flatMap((_, i) => (i ? [sign, { f: 'p' + (i + 1) }] : [{ f: 'p1' }]))],
      fields,
      extra: { choices: p.nums.map(String) },
      solutionSteps: [{ id: 'order', de: sorted.map(fmt).join(sign), zh: sorted.map(fmt).join(sign) }],
      hintsDe: ['Zähle zuerst die Stellen. Weniger Stellen = kleinere Zahl.', 'Bei gleich vielen Stellen: Vergleiche von links nach rechts, Stelle für Stelle.', 'Lösung: ' + sorted.map(fmt).join(sign)],
      hintsZh: ['先数位数，位数少的数小。', '位数相同就从左往右逐位比较。', '答案：' + sorted.map(fmt).join(sign)],
      explanationDe: `Richtig geordnet: ${sorted.map(fmt).join(sign)}. Immer zuerst die höchste Stelle vergleichen.`,
      explanationZh: `正确顺序：${sorted.map(fmt).join(sign)}。先比较最高位。`,
      misconceptionTags: ['high-digit'],
    };
  },
  diagnose(item, resp, res) {
    return Object.values(res.fields).some((f) => !f.ok && !f.empty) ? ['high-digit'] : [];
  },
};

/* ---------- Nachbartausender / Nachbarzehntausender ---------- */
function neighbor(unit) {
  const name = unit === 1000 ? 'Nachbartausender' : 'Nachbarzehntausender';
  return {
    id: unit === 1000 ? 'Z-nachbar1000' : 'Z-nachbar10000', skill: SKILL, subskill: name.toLowerCase(),
    titleDe: name, titleZh: unit === 1000 ? '相邻整千数' : '相邻整万数',
    params(r, level) {
      let n;
      do {
        if (level === 1) n = r.int(1, 99) * 1000 + r.int(101, 899);
        else if (level === 2) n = r.int(1, 98) * 1000 + r.pick([r.int(1, 99), r.int(901, 999), r.int(0, 9) * 100 + r.int(0, 9)]);
        else n = unit === 10000 ? r.int(0, 9) * 10000 + r.pick([r.int(1, 999), r.int(9001, 9999), r.int(100, 9900)]) : r.int(0, 99) * 1000 + r.pick([r.int(1, 30), r.int(970, 999)]);
      } while (n % unit === 0 || n <= 0 || n >= MAX);
      return { n, unit };
    },
    build(p) {
      const lo = Math.floor(p.n / p.unit) * p.unit;
      const hi = lo + p.unit;
      assert(lo < p.n && p.n < hi && hi <= MAX, 'Grenzen müssen die Zahl einschließen');
      return {
        promptDe: `Bestimme die ${name} von ${fmt(p.n)}.`,
        layout: [[{ f: 'lo' }, ' < ', fmt(p.n), ' < ', { f: 'hi' }]],
        fields: [field('lo', 'number', lo, { width: 6 }), field('hi', 'number', hi, { width: 6 })],
        solutionSteps: [{ id: 'lo', de: `kleinerer ${name.slice(0, -0)}: ${fmt(lo)}`, zh: `较小的：${fmt(lo)}` }, { id: 'hi', de: `größerer: ${fmt(hi)}`, zh: `较大的：${fmt(hi)}` }],
        hintsDe: [
          unit === 1000 ? 'Welche glatten Tausenderzahlen liegen direkt vor und nach der Zahl?' : 'Welche glatten Zehntausenderzahlen liegen direkt vor und nach der Zahl?',
          unit === 1000 ? `Schau auf die Tausender: ${fmt(p.n)} hat ${Math.floor(p.n / 1000)} Tausender.` : `Schau auf die Zehntausender: ${fmt(p.n)} hat ${Math.floor(p.n / 10000)} Zehntausender.`,
          `Lösung: ${fmt(lo)} < ${fmt(p.n)} < ${fmt(hi)}`,
        ],
        hintsZh: [
          unit === 1000 ? '紧挨着这个数、前后最近的整千数是多少？' : '紧挨着这个数、前后最近的整万数是多少？',
          unit === 1000 ? `看千位：${fmt(p.n)} 有 ${Math.floor(p.n / 1000)} 个千。` : `看万位：${fmt(p.n)} 有 ${Math.floor(p.n / 10000)} 个万。`,
          `答案：${fmt(lo)} < ${fmt(p.n)} < ${fmt(hi)}`,
        ],
        explanationDe: `${fmt(p.n)} liegt zwischen ${fmt(lo)} und ${fmt(hi)}. Die Stellen nach den ${unit === 1000 ? 'Tausendern' : 'Zehntausendern'} werden zu Nullen (kleinerer Nachbar), der größere Nachbar ist ${fmt(p.unit)} mehr.`,
        explanationZh: `${fmt(p.n)} 在 ${fmt(lo)} 和 ${fmt(hi)} 之间。把${unit === 1000 ? '千位' : '万位'}后面的数都变成 0 得到较小的，再加 ${fmt(p.unit)} 得到较大的。`,
        validationRules: [{ field: 'lo', type: 'equals', value: lo }, { field: 'hi', type: 'equals', value: hi }, { type: 'strict', note: 'lo < n < hi' }],
      };
    },
  };
}

export default [seq, compare, order, neighbor(1000), neighbor(10000)];
