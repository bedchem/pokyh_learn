import 'server-only';

import { demoCourses, demoDashboard, demoQuestions, demoTeams, demoVocabulary } from '@/lib/demo-data';
import type { Locale, ThemeMode } from '@/lib/i18n';
import { backendFetch } from '@/lib/server/backend';
import { getServerConfig, isDemoMode } from '@/lib/server/config';
import type { Course, CourseSection, DashboardData, LearningAnalytics, ReviewKind, ReviewQuestion, Team, VocabularyItem } from '@/lib/types';

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
  permissions?: { canEdit?: boolean; canManage?: boolean };
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
  canEdit?: boolean;
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

export type LearnAdminOverview = {
  stats: {
    courseCount: number;
    draftCount: number;
    publishedCount: number;
    enrollmentCount: number;
    vocabularyCount: number;
  };
  runtime: {
    webUntisOnly: boolean;
    dictionary: { enabled: boolean; provider: string; allowedPairs: string[] };
    legalGate: { enabled: boolean; ready: boolean; privacyNoticeVersion: string | null };
  };
  courses: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    subject: string;
    language: string;
    level: string;
    visibility: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    createdBy: string;
    updatedAt: string;
    creator: { username: string } | null;
    team: { id: string; name: string } | null;
    _count: { sections: number; vocabulary: number; enrollments: number; accessGrants: number };
    accessGrants: Array<{
      stableUid: string;
      permission: 'VIEW' | 'EDIT' | 'MANAGE';
      updatedAt: string;
      user: { username: string; isUntisUser: boolean } | null;
    }>;
  }>;
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
  return normalized === 'public' || normalized === 'team' ? normalized : 'private';
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
    canEdit: Boolean(entry.canEdit),
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
  return payload.courses.map((course) => mapCourse(course, course.enrollments?.[0], course.permissions));
}

async function getQuestionQueue(token: string, scope: 'WRONG' | 'DUE' | 'NEW', courseTitles: Map<string, string>) {
  const payload = await backendFetch<{ questions: BackendReview[] }>(pathFor(`/reviews?scope=${scope}&limit=20`), {
    token,
    cache: 'no-store',
  });
  return payload.questions.map((question) => mapQuestion(question, courseTitles, reviewKind(scope)));
}

export async function getCatalog(): Promise<Course[]> {
  if (isDemoMode()) return demoCourses.filter((course) => course.visibility === 'public' && course.state === 'active');
  const payload = await backendFetch<{ courses: BackendCourse[] }>(pathFor('/catalog'), {
    next: { revalidate: 60, tags: ['learn-catalog'] },
  });
  // The backend endpoint is already scoped to PUBLIC + PUBLISHED courses and
  // intentionally omits those authorization fields from its public card
  // payload. Keep the known public state in the view model so cards render the
  // correct label without reimplementing the backend's access predicate.
  return payload.courses.map((course) => mapCourse({ ...course, visibility: 'PUBLIC', status: 'PUBLISHED' }));
}

export async function getCourse(slug: string, token?: string | null): Promise<Course | null> {
  if (isDemoMode()) return demoCourses.find((course) => course.slug === slug) ?? null;

  if (token) {
    try {
      const courses = await getMyCourses(token);
      const ownCourse = courses.find((course) => course.slug === slug);
      if (ownCourse) {
        const payload = await backendFetch<{ course: BackendCourse; enrollment: BackendEnrollment | null; permissions: { canEdit: boolean; canManage: boolean } }>(pathFor(`/courses/${encodeURIComponent(ownCourse.id)}`), {
          token,
          cache: 'no-store',
        });
        return mapCourse(payload.course, payload.enrollment, payload.permissions);
      }
    } catch {
      // A stale session must not make a public course disappear. Continue with
      // the public, backend-authorized catalogue lookup below.
    }
  }

  try {
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
    analytics: LearningAnalytics;
    courses: Array<{ status: string; progressPercent: number; completedSections: number; lastOpenedAt: string | null; course: BackendCourse }>;
  };
  const [me, dashboard] = await Promise.all([
    backendFetch<{ user: { username: string } }>(pathFor('/me'), { token, cache: 'no-store' }),
    backendFetch<DashboardPayload>(pathFor('/dashboard'), { token, cache: 'no-store' }),
  ]);
  const activeCourses = dashboard.courses.map((entry) => mapCourse(entry.course, entry));
  const courseTitles = new Map(activeCourses.map((course) => [course.id, course.title]));
  const wrongQuestions = await getQuestionQueue(token, 'WRONG', courseTitles).catch(() => []);
  return {
    displayName: me.user.username,
    dailyGoalMinutes: dashboard.profile.dailyGoalMinutes,
    analytics: dashboard.analytics,
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

export async function getReviewQuestions(
  token?: string | null,
  forceScope?: 'WRONG' | 'DUE' | 'NEW',
): Promise<ReviewQuestion[]> {
  if (isDemoMode()) return demoQuestions;
  if (!token) return [];
  const courses = await getMyCourses(token);
  const titles = new Map(courses.map((course) => [course.id, course.title]));
  if (forceScope) {
    return getQuestionQueue(token, forceScope, titles).catch(() => []);
  }
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
    isAdmin?: boolean;
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
    role: team.members[0]?.role === 'OWNER'
      ? 'owner'
      : (team.members[0]?.role === 'MANAGER' || payload.isAdmin) ? 'admin' : 'member',
    canManageMembers: team.members[0]?.role === 'OWNER' || Boolean(payload.isAdmin),
    courseCount: team._count.courses,
    accent: accentFor(team.id),
  }));
}

export async function getCourseOptions(token?: string | null): Promise<Course[]> {
  if (isDemoMode()) return demoCourses.filter((course) => course.isEnrolled || course.canEdit);
  if (!token) return [];
  return getMyCourses(token);
}

export async function getLearnIdentity(token?: string | null): Promise<{ username: string; isAdmin: boolean } | null> {
  if (!token) return null;
  if (isDemoMode()) return { username: 'Demo', isAdmin: true };
  const payload = await backendFetch<{ user: { username: string }; isAdmin: boolean }>(pathFor('/me'), {
    token,
    cache: 'no-store',
  });
  return { username: payload.user.username, isAdmin: payload.isAdmin };
}

export async function getLearnerSettings(token?: string | null): Promise<{
  username: string;
  profile: { dailyGoalMinutes: number; timezone: string; locale: Locale; theme: ThemeMode };
} | null> {
  if (!token) return null;
  if (isDemoMode()) return { username: 'Demo', profile: { dailyGoalMinutes: 20, timezone: 'Europe/Rome', locale: 'de', theme: 'system' } };
  const payload = await backendFetch<{
    user: { username: string };
    profile: { dailyGoalMinutes: number; timezone: string; locale?: Locale; theme?: ThemeMode };
  }>(pathFor('/me'), { token, cache: 'no-store' });
  return {
    username: payload.user.username,
    profile: {
      dailyGoalMinutes: payload.profile.dailyGoalMinutes,
      timezone: payload.profile.timezone,
      locale: payload.profile.locale ?? 'de',
      theme: payload.profile.theme ?? 'system',
    },
  };
}

export async function getLearnAdminOverview(token?: string | null): Promise<LearnAdminOverview | null> {
  if (!token) return null;
  if (isDemoMode()) {
    return {
      stats: { courseCount: 0, draftCount: 0, publishedCount: 0, enrollmentCount: 0, vocabularyCount: 0 },
      runtime: {
        webUntisOnly: true,
        dictionary: { enabled: false, provider: 'not configured', allowedPairs: [] },
        legalGate: { enabled: false, ready: false, privacyNoticeVersion: null },
      },
      courses: [],
    };
  }
  return backendFetch<LearnAdminOverview>(pathFor('/admin/overview'), { token, cache: 'no-store' });
}
