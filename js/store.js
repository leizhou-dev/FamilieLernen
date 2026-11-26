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

function defaults() {
  const profiles = [
    makeProfile('Kind 1', '🦊', COLORS[0]),
    makeProfile('Kind 2', '🐼', COLORS[1]),
    makeProfile('Ich', '🦉', COLORS[2]),
  ];
  return { schema: SCHEMA, lastProfileId: profiles[0].id, profiles, enroll: {}, progress: {} };
}

function migrate(s) {
  // 预留：以后 schema 升级在这里逐级迁移
  if (!s.schema) s.schema = SCHEMA;
  s.enroll ||= {};
  s.progress ||= {};
  return s;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : defaults();
  } catch {
    state = defaults();
  }
  if (!state.profiles.length) state = defaults();
  if (!state.profiles.find((p) => p.id === state.lastProfileId)) state.lastProfileId = state.profiles[0].id;
  save(true);
  return state;
}

export function save(silent = false) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
  if (!silent) listeners.forEach((fn) => fn(state));
}

export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const getState = () => state;

/* ---------- 档案 ---------- */
export const profiles = () => state.profiles;
export const current = () => state.profiles.find((p) => p.id === state.lastProfileId) || state.profiles[0];
export function setCurrent(id) { state.lastProfileId = id; save(); }
export function updateProfile(id, patch) {
  const p = state.profiles.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
  save();
}
export function addProfile(name) {
  const i = state.profiles.length;
  const p = makeProfile(name, AVATARS[i % AVATARS.length], COLORS[i % COLORS.length], current()?.uiLang || 'zh');
  state.profiles.push(p);
  save();
  return p;
}
export function removeProfile(id) {
  if (state.profiles.length <= 1) return false;
  state.profiles = state.profiles.filter((p) => p.id !== id);
  delete state.enroll[id];
  delete state.progress[id];
  if (state.lastProfileId === id) state.lastProfileId = state.profiles[0].id;
  save();
  return true;
}

/* ---------- 选课 ---------- */
const enrollOf = (pid) => (state.enroll[pid] ||= {});
export function enrollments(pid = current().id) { return enrollOf(pid); }
export function enrollment(courseId, pid = current().id) { return enrollOf(pid)[courseId] || null; }
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

/* ---------- 备份 ---------- */
export const exportJSON = () => JSON.stringify(state, null, 2);
export function importJSON(text) {
  const s = migrate(JSON.parse(text));
  if (!Array.isArray(s.profiles) || !s.profiles.length) throw new Error('invalid');
  state = s;
  save();
}
