// Brücke für eingebaute Apps (apps/artikel, apps/latein):
// liefert das aktuelle Familienprofil und die entschlüsselten Inhalte,
// und merkt sich in der Familien-App, dass dieser Kurs zuletzt geöffnet wurde.
import * as S from './store.js';
import * as V from './vault.js';

const FAMILY_HOME = new URL('../#/today', import.meta.url).href;

export async function enter(courseId) {
  S.load();
  const status = await V.init();
  if (status !== 'ready') {
    // Gesperrt / offline beim ersten Start → Familien-App zeigt die Passwort-Seite
    location.replace(FAMILY_HOME);
    return new Promise(() => {});
  }
  if (!S.current()) { location.replace(FAMILY_HOME); return new Promise(() => {}); }
  const e = S.enrollment(courseId);
  if (!e || e.hidden) S.addCourse(courseId);
  S.touchCourse(courseId);
  S.save(true);
  const p = S.current();
  return {
    profile: { id: p.id, name: p.name, avatar: p.avatar, color: p.color, uiLang: p.uiLang },
    file: V.file,
    familyHome: FAMILY_HOME,
    // 星星和连续天数：全家统一，覆盖所有课程
    rewards: {
      add: (n) => S.addStars(n, courseId, p.id),
      day: () => S.markDay(courseId, p.id),
      seed: (stars, days) => S.seedRewards(courseId, stars, days, p.id),
      get: () => S.rewards(p.id),
    },
  };
}
