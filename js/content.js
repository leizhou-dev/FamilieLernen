// 结构化课程内容加载（只读，来自解密后的 content.enc.json）。进度不写在这里。
import { course as regCourse } from './registry.js';
import { file, hasFile } from './vault.js';

const courseCache = new Map();
const unitCache = new Map();

export async function loadCourse(id) {
  if (courseCache.has(id)) return courseCache.get(id);
  const reg = regCourse(id);
  const p = Promise.resolve().then(() => {
    const c = file(reg.content);
    c._base = reg.content.replace(/[^/]+$/, '');
    return c;
  });
  courseCache.set(id, p);
  return p;
}

/** 返回带 activities 的单元；无内容文件时 activities = [] */
export async function loadUnit(courseId, unitId) {
  const key = courseId + '/' + unitId;
  if (unitCache.has(key)) return unitCache.get(key);
  const p = (async () => {
    const c = await loadCourse(courseId);
    const { unit, stage } = findUnit(c, unitId) || {};
    if (!unit) return null;
    let activities = unit.activities || [];
    if (unit.file && hasFile(c._base + unit.file)) activities = file(c._base + unit.file).activities || [];
    return { ...unit, stageId: stage.id, activities };
  })();
  unitCache.set(key, p);
  return p;
}

export function findUnit(c, unitId) {
  for (const stage of c.stages) {
    const unit = stage.units.find((u) => u.id === unitId);
    if (unit) return { unit, stage };
  }
  return null;
}

export const hasItems = (a) => Array.isArray(a.items) && a.items.length > 0;
export const unitHasContent = (u) => u.activities?.some(hasItems);

/** 按题目编号在课程里查找（用于复习）；返回 {item, activity, unit} */
export async function findItems(courseId, refs) {
  const out = [];
  const byUnit = new Map();
  for (const r of refs) {
    if (!byUnit.has(r.unitId)) byUnit.set(r.unitId, []);
    byUnit.get(r.unitId).push(r);
  }
  for (const [unitId, list] of byUnit) {
    const unit = await loadUnit(courseId, unitId);
    if (!unit) continue;
    for (const r of list) {
      const activity = unit.activities.find((a) => a.id === r.activityId) ||
        unit.activities.find((a) => a.items?.some((i) => i.id === r.id));
      const item = activity?.items?.find((i) => i.id === r.id);
      if (item) out.push({ item, activity, unit, courseId });
    }
  }
  return out;
}
