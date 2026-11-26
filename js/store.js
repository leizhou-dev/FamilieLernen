// 本地存储：档案、选课、学习记录（按 档案 × 课程 隔离）
// 内容（content/）与进度（这里）分开保存；进度只引用稳定编号。

const KEY = 'familienlernen.v1';
const SCHEMA = 1;
const listeners = new Set();
let state = null;

const AVATARS = ['🦊', '🐼', '🦉', '🐯', '🐨', '🐸', '🐙', '🦄', '🐧', '🦁', '🐳', '🌻'];
const COLORS = ['#ff9f0a', '#30b0c7', '#5e5ce6', '#34c759', '#ff375f', '#af52de', '#0a84ff', '#a2845e'];
export { AVATARS, COLORS };

const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const now = () => Date.now();

function makeProfile(name, avatar, color, uiLang = 'zh') {
  return { id: uid('p'), name, avatar, color, uiLang, explainLang: 'auto', createdAt: now() };
}

/** 设备语言 → 界面语言默认值 */
export function deviceLang() {
  const l = (navigator.language || '').toLowerCase();
  return l.startsWith('zh') ? 'zh' : l.startsWith('de') ? 'de' : l.startsWith('en') ? 'en' : 'zh';
}

// 第一次打开时没有档案：和 Artikel lernen / Latein lernen 一样，由用户自己创建
function defaults() {
  return { schema: SCHEMA, lastProfileId: null, profiles: [], enroll: {}, progress: {} };
}

function migrate(s) {
  if (!s.schema) s.schema = SCHEMA;
  s.enroll ||= {};
  s.progress ||= {};
  // 0.1–0.3 版会自动建三个默认档案（Kind 1 / Kind 2 / Ich）。从没用过的就去掉。
  if (!s.noDefaults) {
    const DEF = new Set(['Kind 1', 'Kind 2', 'Ich']);
    const used = (id) => Object.keys(s.enroll[id] || {}).length || Object.keys(s.progress[id] || {}).length;
    s.profiles = (s.profiles || []).filter((p) => !(DEF.has(p.name) && !used(p.id) && !hasEmbeddedProgress(p.id)));
    s.noDefaults = true;
  }
  return s;
}

function hasEmbeddedProgress(pid) {
  try { return !!JSON.parse(localStorage.getItem('familie.artikel.v1') || 'null')?.data?.[pid]; } catch { return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : defaults();
  } catch {
    state = defaults();
  }
  state.noDefaults = true;
  seedNative();
  if (!state.profiles.find((p) => p.id === state.lastProfileId)) state.lastProfileId = state.profiles[0]?.id || null;
  save(true);
  return state;
}

// 更新前已有的德语 / Mathe 记录：按答对次数补上星星，按答题日期补上学习日（每门课只补一次）
function seedNative() {
  for (const p of state.profiles) {
    const r = rewardsOf(p.id);
    if (r.nativeSeeded) continue; // 只在引入星星功能时执行一次
    r.nativeSeeded = Date.now();
    const pr = state.progress[p.id] || {};
    for (const [cid, c] of Object.entries(pr)) {
      if (r.seeded[cid] || cid === 'artikel' || cid === 'latein') continue;
      let stars = 0; const days = new Set();
      for (const a of Object.values(c.answers || {})) { if (a.ok) stars++; if (a.at) days.add(dayKey(a.at)); }
      for (const o of Object.values(c.open || {})) if (o.at) days.add(dayKey(o.at));
      if (c.mathe) for (const st of Object.values(c.mathe.stats || {})) stars += Math.round(st.final || 0);
      if (stars || days.size) { r.seeded[cid] = Date.now(); r.stars += stars; r.byCourse[cid] = (r.byCourse[cid] || 0) + stars; days.forEach((d) => { r.days[d] = (r.days[d] || 0) + 1; }); }
      else r.seeded[cid] = Date.now();
    }
  }
}

export function save(silent = false) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
  if (!silent) listeners.forEach((fn) => fn(state));
}

export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const getState = () => state;

/* ---------- 档案 ---------- */
export const profiles = () => state.profiles;
export const current = () => state.profiles.find((p) => p.id === state.lastProfileId) || state.profiles[0] || null;
export function setCurrent(id) { state.lastProfileId = id; save(); }
export function updateProfile(id, patch) {
  const p = state.profiles.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
  save();
}
export function addProfile(name, { avatar, color, uiLang } = {}) {
  const i = state.profiles.length;
  const p = makeProfile(name, avatar || AVATARS[i % AVATARS.length], color || COLORS[i % COLORS.length], uiLang || current()?.uiLang || deviceLang());
  state.profiles.push(p);
  state.lastProfileId = p.id;
  rewardsOf(p.id).nativeSeeded = Date.now();
  save();
  return p;
}
export function removeProfile(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  delete state.enroll[id];
  delete state.progress[id];
  if (state.lastProfileId === id) state.lastProfileId = state.profiles[0]?.id || null;
  save();
  return true;
}

/* ---------- 选课 ---------- */
const enrollOf = (pid) => (state.enroll[pid] ||= {});
export function enrollments(pid = current()?.id) { return enrollOf(pid); }
export function enrollment(courseId, pid = current()?.id) { return enrollOf(pid)[courseId] || null; }
export function addCourse(courseId, meta = {}, pid = current().id) {
  const e = enrollOf(pid);
  if (e[courseId]) { e[courseId].hidden = false; Object.assign(e[courseId].meta ||= {}, meta); }
  else e[courseId] = { addedAt: now(), lastAt: 0, hidden: false, meta };
  save();
}
export function hideCourse(courseId, pid = current().id) {
  const e = enrollOf(pid)[courseId];
  if (e) { e.hidden = true; save(); }
}
export function setCourseMeta(courseId, patch, pid = current().id) {
  const e = enrollOf(pid)[courseId];
  if (e) { Object.assign(e.meta ||= {}, patch); save(); }
}
export function touchCourse(courseId, pid = current().id) {
  const e = enrollOf(pid)[courseId];
  if (e) { e.lastAt = now(); save(true); }
}
export function recentCourseId(pid = current().id) {
  const list = Object.entries(enrollOf(pid)).filter(([, e]) => !e.hidden && e.lastAt).sort((a, b) => b[1].lastAt - a[1].lastAt);
  return list[0]?.[0] || null;
}

/* ---------- 学习记录 ---------- */
export function progress(courseId, pid = current().id) {
  const byP = (state.progress[pid] ||= {});
  return (byP[courseId] ||= { pos: null, actPos: {}, done: {}, answers: {}, wrong: {}, fav: {}, open: {} });
}

/** 记录学习位置：用于「继续」 */
export function setPosition(courseId, pos) {
  const pr = progress(courseId);
  pr.pos = { ...pos, at: now() };
  if (pos.activityId != null) pr.actPos[pos.activityId] = pos.index;
  touchCourse(courseId);
  save(true);
}

export function markDone(courseId, activityId) {
  const pr = progress(courseId);
  pr.done[activityId] = now();
  pr.actPos[activityId] = 0;
  save(true);
}

/** 记录一题答案；ref = {unitId, activityId} */
export function recordAnswer(courseId, itemId, ok, ref, fromReview = false) {
  addStars(ok ? 1 : 0, courseId);
  const pr = progress(courseId);
  pr.answers[itemId] = { ok, at: now() };
  if (!ok) {
    const w = pr.wrong[itemId] || { n: 0 };
    pr.wrong[itemId] = { ...w, ...ref, n: w.n + 1, at: now(), resolved: 0 };
  } else if (pr.wrong[itemId] && !pr.wrong[itemId].resolved) {
    pr.wrong[itemId].resolved = now();
    pr.wrong[itemId].byReview = fromReview;
  }
  save(true);
}

export function recordOpen(courseId, itemId, text, ref) {
  markDay(courseId);
  const pr = progress(courseId);
  pr.open[itemId] = { text, at: now(), ...ref };
  save(true);
}

export function toggleFav(courseId, itemId, ref) {
  const pr = progress(courseId);
  if (pr.fav[itemId]) delete pr.fav[itemId];
  else pr.fav[itemId] = { at: now(), ...ref };
  save(true);
  return !!pr.fav[itemId];
}

export function openWrong(courseId, pid = current().id) {
  return Object.entries(progress(courseId, pid).wrong).filter(([, w]) => !w.resolved).map(([id, w]) => ({ id, ...w }));
}

/* ---------- 星星与连续学习天数（按家庭档案，覆盖所有课程） ----------
   规则（与 Artikel lernen / Latein lernen 相同）：答对 1 颗星，一整轮全对再奖励 3 颗；
   当天做过任何练习就算一个学习日。新课程只需调用 addStars / markDay。 */
export function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function rewardsOf(pid) {
  const all = (state.rewards ||= {});
  return (all[pid] ||= { stars: 0, days: {}, byCourse: {}, seeded: {} });
}
export function markDay(courseId, pid = current()?.id) {
  if (!pid) return;
  const r = rewardsOf(pid); const k = dayKey();
  r.days[k] = (r.days[k] || 0) + 1;
  save(true);
}
export function addStars(n, courseId, pid = current()?.id) {
  if (!pid) return;
  const r = rewardsOf(pid);
  if (n > 0) { r.stars += n; r.byCourse[courseId] = (r.byCourse[courseId] || 0) + n; }
  r.days[dayKey()] = (r.days[dayKey()] || 0) + 1;
  save(true);
}
/** 已有进度（更新前积累的星星和学习日）只计入一次 */
export function seedRewards(courseId, stars, days = [], pid = current()?.id) {
  if (!pid) return false;
  const r = rewardsOf(pid);
  if (r.seeded[courseId]) return false;
  r.seeded[courseId] = Date.now();
  addRewardsRaw(stars, days, courseId, pid);
  return true;
}
/** 直接加入星星和学习日（例如从原 App 导入时） */
export function addRewardsRaw(stars, days = [], courseId = 'import', pid = current()?.id) {
  const r = rewardsOf(pid);
  const n = Math.max(0, Math.round(stars || 0));
  r.stars += n; r.byCourse[courseId] = (r.byCourse[courseId] || 0) + n;
  for (const d of days) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) r.days[d] = (r.days[d] || 0) + 1;
  save(true);
}
export function streak(pid = current()?.id) {
  if (!pid) return 0;
  const days = rewardsOf(pid).days;
  const d = new Date();
  if (!days[dayKey(d.getTime())]) d.setDate(d.getDate() - 1); // 今天还没练：从昨天算起
  let n = 0;
  while (days[dayKey(d.getTime())]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function rewards(pid = current()?.id) {
  if (!pid) return { stars: 0, streak: 0, today: 0 };
  const r = rewardsOf(pid);
  return { stars: r.stars, streak: streak(pid), today: r.days[dayKey()] || 0, byCourse: { ...r.byCourse } };
}

/* ---------- 备份 ---------- */
export const exportJSON = () => JSON.stringify(state, null, 2);
export function importJSON(text) {
  const s = migrate(JSON.parse(text));
  if (!Array.isArray(s.profiles) || !s.profiles.length) throw new Error('invalid');
  state = s;
  save();
}
