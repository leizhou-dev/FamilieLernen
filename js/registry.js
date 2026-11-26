// 课程目录。新增课程（例如 Mathe、HSU）只需要在这里加一条，
// 结构化课程再在 content/<id>/course.json 放内容即可，不用改界面代码。
//
// kind:
//   'embedded'   —— 复制进来的完整 App（app/apps/<id>/），使用家庭档案和加密内容包
//   'external'   —— 外部 PWA，通过链接打开，进度留在原 App
//   'structured' —— 内置课程，使用「级别/阶段 → 单元 → 活动 → 题目」引擎
//   'mac'        —— 需要 Mac 的工具，打开方式待确认
//   'planned'    —— 预留占位，暂不可添加

export const COURSES = [
  {
    id: 'artikel',
    kind: 'embedded',
    icon: 'books',
    color: '#34c759',
    lang: 'de',
    audience: 'kids',
    title: { zh: 'Artikel lernen', en: 'Artikel lernen', de: 'Artikel lernen' },
    desc: {
      zh: '德语名词的 der / die / das 与词语记忆（巴伐利亚 4–5 年级）',
      en: 'der / die / das and word practice for Bavarian grades 4–5',
      de: 'der / die / das und Wörter lernen, Klasse 4–5 (Bayern)',
    },
    path: 'apps/artikel/',
    entries: [
      { id: 'kasten', icon: 'cards', title: { zh: '卡片盒', en: 'Card box', de: 'Karteikasten' }, path: '#kasten' },
      { id: 'quiz', icon: 'target', title: { zh: '冠词测验', en: 'Article quiz', de: 'Artikel-Quiz' }, path: '#quiz' },
      { id: 'story', icon: 'bookOpen', title: { zh: '故事', en: 'Stories', de: 'Geschichten' }, path: '#geschichten' },
      { id: 'fehler', icon: 'repeat', title: { zh: '错词', en: 'Mistakes', de: 'Fehlerwörter' }, path: '#fehler' },
    ],
  },
  {
    id: 'latein',
    kind: 'embedded',
    icon: 'scroll',
    color: '#b23a22',
    lang: 'la',
    audience: 'kids',
    title: { zh: 'Latein lernen', en: 'Latein lernen', de: 'Latein lernen' },
    desc: {
      zh: '拉丁语课本第 1–11 课：词卡、手写与选择题',
      en: 'Latin textbook lessons 1–11: flashcards, handwriting and quizzes',
      de: 'Lateinbuch Lektion 1–11: Karten, Handschrift und Quiz',
    },
    path: 'apps/latein/',
    entries: [],
  },
  {
    id: 'deutsch',
    kind: 'structured',
    icon: 'graduation',
    color: '#5856d6',
    lang: 'de',
    audience: 'adult',
    title: { zh: '德语 A1–B2', en: 'German A1–B2', de: 'Deutsch A1–B2' },
    desc: {
      zh: '级别 → 单元 → 活动：词汇、语法、听力、阅读、写作、口语',
      en: 'Levels → units → activities: vocabulary, grammar, listening, reading, writing, speaking',
      de: 'Stufen → Einheiten → Aktivitäten: Wortschatz, Grammatik, Hören, Lesen, Schreiben, Sprechen',
    },
    content: 'deutsch/course.json',
  },
  {
    id: 'mac-tools',
    kind: 'mac',
    hidden: true, // 暂时隐藏：保留配置，不在课程列表中显示
    icon: 'laptop',
    color: '#8e8e93',
    title: { zh: 'Mac 学习工具', en: 'Mac study tools', de: 'Mac-Lernwerkzeuge' },
    desc: {
      zh: '例如 CAD 刷题。具体打开方式待确认。',
      en: 'E.g. the CAD quiz. How it opens is still to be decided.',
      de: 'Z. B. das CAD-Quiz. Wie es geöffnet wird, ist noch offen.',
    },
    // 以后可填自定义 URL scheme，例如 'cadquiz://'
    launch: null,
    plan: {
      zh: '评估哪些功能可迁成 Web 课程，哪些继续由 Mac App 提供。',
      en: 'Decide which parts can become web courses and which stay in the Mac app.',
      de: 'Klären, was als Web-Kurs geht und was in der Mac-App bleibt.',
    },
  },
  {
    id: 'mathe',
    kind: 'planned',
    icon: 'plusminus',
    color: '#0a84ff',
    title: { zh: 'Mathe', en: 'Maths', de: 'Mathe' },
    desc: { zh: '预留：数学（Grundschule / 5 年级）', en: 'Planned: maths', de: 'Geplant: Mathe' },
  },
  {
    id: 'hsu',
    kind: 'planned',
    icon: 'globe',
    color: '#30b0c7',
    title: { zh: 'HSU', en: 'HSU', de: 'HSU' },
    desc: { zh: '预留：Heimat- und Sachunterricht', en: 'Planned: Heimat- und Sachunterricht', de: 'Geplant: Heimat- und Sachunterricht' },
  },
];

export const course = (id) => COURSES.find((c) => c.id === id);
/** 界面上显示的课程（hidden: true 的课程保留配置但不显示） */
export const visibleCourses = () => COURSES.filter((c) => !c.hidden);
export const addable = (c) => c.kind !== 'planned';
