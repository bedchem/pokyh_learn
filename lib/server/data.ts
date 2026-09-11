import 'server-only';

import { demoCourses, demoDashboard, demoQuestions, demoTeams, demoVocabulary } from '@/lib/demo-data';
import { backendFetch } from '@/lib/server/backend';
import { getServerConfig, isDemoMode } from '@/lib/server/config';
import type { Course, CourseSection, DashboardData, ReviewKind, ReviewQuestion, Team, VocabularyItem } from '@/lib/types';

type BackendSection = {
  id: string;
  title: string;
  summary: string;
  type: string;
  sortOrder: number;
  content?: unknown;
  updatedAt?: string;
};

type BackendCourse = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  subject?: string;
  language?: string;
  level?: string;
  visibility?: string;
  status?: string;
  updatedAt?: string;
  sections?: BackendSection[];
  _count?: { sections?: number; vocabulary?: number; enrollments?: number };
};

type BackendEnrollment = {
  status?: string;
  progressPercent?: number;
  completedSections?: number;
  lastOpenedAt?: string | null;
};

type BackendVocabulary = {
  id: string;
  courseId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  article?: string;
  partOfSpeech?: string;
  notes?: string;
  verificationStatus?: string;
  contextSentence?: string;
  readyForQuiz?: boolean;
};

type BackendReview = {
  entryId: string;
  courseId: string;
  direction: 'SOURCE_TO_TARGET' | 'TARGET_TO_SOURCE';
  prompt: string;
  sourceLanguage: string;
  targetLanguage: string;
  review?: { lastWasCorrect?: boolean } | null;
};

function pathFor(segment: string) {
  return `${getServerConfig().apiPrefix}${segment}`;
}

function accentFor(value: string) {
  const accents = ['coral', 'lavender', 'sun', 'mint'];
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return accents[hash % accents.length];
}

function asVisibility(value?: string): Course['visibility'] {
  const normalized = value?.toLocaleLowerCase('en-US');
  return normalized === 'team' || normalized === 'private' ? normalized : 'public';
}

function asState(value?: string): Course['state'] {
  if (value === 'ARCHIVED') return 'archived';
  if (value === 'DRAFT') return 'draft';
  return 'active';
}

function formatUpdatedAt(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function mapSection(section: BackendSection): CourseSection {
  return {
    id: section.id,
    title: section.title,
    summary: section.summary || '',
    type: section.type,
    sortOrder: section.sortOrder,
    content: section.content ?? {},
    updatedAt: section.updatedAt,
  };
}

function mapCourse(course: BackendCourse, enrollment?: BackendEnrollment | null, permissions?: { canEdit?: boolean; canManage?: boolean }): Course {
  const sections = course.sections?.map(mapSection);
  const moduleCount = sections?.length ?? course._count?.sections ?? 0;
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.summary || 'Eigener Lerninhalt, den du in deinem Tempo bearbeiten kannst.',
    language: course.language || course.subject || 'Lernkurs',
    sourceLanguage: 'Deutsch',
    level: course.level || 'Gemischt',
    accent: accentFor(course.id),
    category: course.subject || 'Eigene Inhalte',
    visibility: asVisibility(course.visibility),
    state: asState(course.status),
    modules: moduleCount,
    lessons: moduleCount,
    vocabularyCount: course._count?.vocabulary ?? 0,
    enrolledCount: course._count?.enrollments,
    progress: enrollment?.progressPercent,
    nextLesson: sections?.find((section) => section.type !== 'QUIZ')?.title ?? sections?.[0]?.title,
    canEdit: permissions?.canEdit,
    canManage: permissions?.canManage,
    isEnrolled: Boolean(enrollment),
    updatedAt: formatUpdatedAt(course.updatedAt),
    sections,
  };
}

function mapVocabulary(entry: BackendVocabulary): VocabularyItem {
  const verification = entry.verificationStatus === 'VERIFIED'
    ? 'verified'
    : entry.verificationStatus === 'FLAGGED'
      ? 'manual'
      : 'pending';
  return {
    id: entry.id,
    courseId: entry.courseId,
    source: entry.sourceText,
    sourceLanguage: entry.sourceLanguage,
    targetLanguage: entry.targetLanguage,
    article: entry.article || undefined,
    partOfSpeech: entry.partOfSpeech || undefined,
    contextSentence: entry.contextSentence,
    note: entry.notes || undefined,
    state: verification === 'verified' ? 'learning' : 'new',
    validation: verification,
    readyForQuiz: Boolean(entry.readyForQuiz),
  };
}

function reviewKind(scope: 'WRONG' | 'DUE' | 'NEW'): ReviewKind {
  return scope === 'WRONG' ? 'mistake' : scope === 'NEW' ? 'new' : 'due';
}

function mapQuestion(question: BackendReview, courseTitles: Map<string, string>, kind: ReviewKind): ReviewQuestion {
  return {
    id: question.entryId,
    courseId: question.courseId,
    prompt: question.prompt,
    direction: question.direction,
    sourceLanguage: question.sourceLanguage,
    targetLanguage: question.targetLanguage,
    courseTitle: courseTitles.get(question.courseId) || 'Dein Kurs',
    kind,
  };
}

async function getMyCourses(token: string): Promise<Course[]> {
  const payload = await backendFetch<{ courses: Array<BackendCourse & { enrollments?: BackendEnrollment[] }> }>(pathFor('/courses'), {
    token,
    cache: 'no-store',
  });
  return payload.courses.map((course) => mapCourse(course, course.enrollments?.[0]));
}

async function getQuestionQueue(token: string, scope: 'WRONG' | 'DUE' | 'NEW', courseTitles: Map<string, string>) {
  const payload = await backendFetch<{ questions: BackendReview[] }>(pathFor(`/reviews?scope=${scope}&limit=20`), {
    token,
    cache: 'no-store',
  });
  return payload.questions.map((question) => mapQuestion(question, courseTitles, reviewKind(scope)));
}

export async function getCatalog(): Promise<Course[]> {
  if (isDemoMode()) return demoCourses;
  const payload = await backendFetch<{ courses: BackendCourse[] }>(pathFor('/catalog'), {
    next: { revalidate: 60, tags: ['learn-catalog'] },
  });
  return payload.courses.map((course) => mapCourse(course));
}

export async function getCourse(slug: string, token?: string | null): Promise<Course | null> {
  if (isDemoMode()) return demoCourses.find((course) => course.slug === slug) ?? null;

  try {
    if (token) {
      const courses = await getMyCourses(token);
      const ownCourse = courses.find((course) => course.slug === slug);
      if (ownCourse) {
        const payload = await backendFetch<{ course: BackendCourse; enrollment: BackendEnrollment | null; permissions: { canEdit: boolean; canManage: boolean } }>(pathFor(`/courses/${encodeURIComponent(ownCourse.id)}`), {
          token,
          cache: 'no-store',
        });
        return mapCourse(payload.course, payload.enrollment, payload.permissions);
      }
    }

    const payload = await backendFetch<{ course: BackendCourse }>(pathFor(`/catalog/${encodeURIComponent(slug)}`), {
      next: { revalidate: 60, tags: [`learn-course-${slug}`] },
    });
    return mapCourse(payload.course);
  } catch {
    return null;
  }
}

export async function getDashboard(token?: string | null): Promise<DashboardData | null> {
  if (isDemoMode()) return demoDashboard;
  if (!token) return null;

  type DashboardPayload = {
    profile: { dailyGoalMinutes: number; dailyStreak: number };
    stats: { dueReviewCount: number };
    recentAttempts: Array<{ totalQuestions: number }>;
    courses: Array<{ status: string; progressPercent: number; completedSections: number; lastOpenedAt: string | null; course: BackendCourse }>;
  };
  const [me, dashboard] = await Promise.all([
    backendFetch<{ user: { username: string } }>(pathFor('/me'), { token, cache: 'no-store' }),
    backendFetch<DashboardPayload>(pathFor('/dashboard'), { token, cache: 'no-store' }),
  ]);
  const activeCourses = dashboard.courses.map((entry) => mapCourse(entry.course, entry));
  const courseTitles = new Map(activeCourses.map((course) => [course.id, course.title]));
  const wrongQuestions = await getQuestionQueue(token, 'WRONG', courseTitles).catch(() => []);
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const todayIndex = (new Date().getDay() + 6) % 7;
  const answeredToday = dashboard.recentAttempts.reduce((total, attempt) => total + attempt.totalQuestions, 0);

  return {
    displayName: me.user.username,
    streakDays: dashboard.profile.dailyStreak,
    weeklyGoal: Math.max(1, dashboard.profile.dailyGoalMinutes),
    weeklyGoalProgress: Math.min(dashboard.profile.dailyGoalMinutes, answeredToday),
    dueReviews: dashboard.stats.dueReviewCount,
    mistakesToReview: wrongQuestions.length,
    minutesThisWeek: answeredToday,
    progressSeries: days.map((label, index) => ({ label, value: index === todayIndex ? answeredToday : 0 })),
    activeCourses,
    reviewCards: wrongQuestions.slice(0, 3).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      context: 'Eine Antwort braucht noch eine gezielte Wiederholung.',
      kind: question.kind,
      courseTitle: question.courseTitle,
    })),
  };
}

export async function getVocabulary(token?: string | null, courseId?: string): Promise<VocabularyItem[]> {
  if (isDemoMode()) return courseId ? demoVocabulary.filter((item) => item.courseId === courseId) : demoVocabulary;
  if (!token) return [];
  const courseIds = courseId ? [courseId] : (await getMyCourses(token)).map((course) => course.id);
  const entries = await Promise.all(courseIds.map(async (id) => {
    const payload = await backendFetch<{ entries: BackendVocabulary[] }>(pathFor(`/vocabulary?courseId=${encodeURIComponent(id)}&limit=100`), {
      token,
      cache: 'no-store',
    });
    return payload.entries.map(mapVocabulary);
  }));
  return entries.flat();
}

export async function getReviewQuestions(token?: string | null): Promise<ReviewQuestion[]> {
  if (isDemoMode()) return demoQuestions;
  if (!token) return [];
  const courses = await getMyCourses(token);
  const titles = new Map(courses.map((course) => [course.id, course.title]));
  for (const scope of ['WRONG', 'DUE', 'NEW'] as const) {
    const questions = await getQuestionQueue(token, scope, titles);
    if (questions.length) return questions;
  }
  return [];
}

export async function getTeams(token?: string | null): Promise<Team[]> {
  if (isDemoMode()) return demoTeams;
  if (!token) return [];
  const payload = await backendFetch<{
    teams: Array<{
      id: string;
      name: string;
      description: string;
      members: Array<{ role: string }>;
      _count: { members: number; courses: number };
    }>;
  }>(pathFor('/teams'), { token, cache: 'no-store' });
  return payload.teams.map((team) => ({
    id: team.id,
    slug: team.id,
    name: team.name,
    description: team.description,
    memberCount: team._count.members,
    role: team.members[0]?.role === 'OWNER' ? 'owner' : team.members[0]?.role === 'MANAGER' ? 'admin' : 'member',
    courseCount: team._count.courses,
    accent: accentFor(team.id),
  }));
}

export async function getCourseOptions(token?: string | null): Promise<Course[]> {
  if (isDemoMode()) return demoCourses.filter((course) => course.isEnrolled || course.canEdit);
  if (!token) return [];
  return getMyCourses(token);
}
