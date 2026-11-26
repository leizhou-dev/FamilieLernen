import { STR, UI_LANGS } from './locales.js';

let lang = 'zh';
const HTML_LANG = { zh: 'zh-Hans', en: 'en', de: 'de' };

export function setLang(l) {
  lang = UI_LANGS.includes(l) ? l : 'zh';
  document.documentElement.lang = HTML_LANG[lang];
}
export const getLang = () => lang;

export function t(key, vars) {
  let s = STR[lang]?.[key] ?? STR.zh[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? '');
  return s;
}

/** 多语对象 {zh,en,de} → 当前界面语言；字符串原样返回 */
export function tr(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] ?? obj.en ?? obj.de ?? obj.zh ?? Object.values(obj)[0] ?? '';
}

/**
 * 选择解析文本。pref = 'auto' | 'zh' | 'en' | 'de'
 * 返回 {text, lang, fallback}；fallback=true 时界面需标明实际语言。
 */
export function pickExplain(explain, pref) {
  if (!explain) return null;
  if (typeof explain === 'string') return { text: explain, lang: null, fallback: false };
  const want = pref && pref !== 'auto' ? pref : lang;
  const order = [want, lang, 'de', 'en', 'zh'];
  for (const l of order) if (explain[l]) return { text: explain[l], lang: l, fallback: l !== want };
  return null;
}
