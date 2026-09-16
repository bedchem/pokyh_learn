export type CourseVisibility = 'public' | 'team' | 'private';
export type CourseState = 'active' | 'draft' | 'archived';
export type ReviewKind = 'due' | 'mistake' | 'new';

export interface CourseSection {
  id: string;
  title: string;
  summary: string;
  type: 'LESSON' | 'VOCABULARY' | 'GRAMMAR' | 'QUIZ' | string;
  sortOrder: number;
  content: unknown;
  updatedAt?: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  language: string;
  sourceLanguage: string;
  level: string;
  accent: string;
  category: string;
  visibility: CourseVisibility;
  state: CourseState;
  modules: number;
  lessons: number;
  vocabularyCount: number;
  enrolledCount?: number;
  progress?: number;
  nextLesson?: string;
  ownerName?: string;
  canEdit?: boolean;
  canManage?: boolean;
  isEnrolled?: boolean;
  updatedAt?: string;
  sections?: CourseSection[];
}

// First-party analytics are deliberately count-only. Raw quiz answers and
// answer keys stay out of this frontend contract.
export interface LearningAnalytics {
  range: '7d' | '28d' | '90d';
  timezone: string;
  dataAvailableSince: string | null;
  totals: {
    attempts: number;
    answers: number;
    correctAnswers: number;
    accuracyPercent: number | null;
    activeDays: number;
    streakDays: number;
  };
  days: Array<{
    dayKey: string;
    attempts: number;
    answers: number;
    correctAnswers: number;
  }>;
  queues: {
    due: number;
    wrong: number;
    fresh: number;
    nextDueAt: string | null;
  };
  recommendation: {
    kind: 'due' | 'wrong' | 'new' | 'continue' | 'none';
    count: number;
    href: string;
  };
  courses: Array<{
    courseId: string;
    slug: string;
    title: string;
    attempts: number;
    answers: number;
    correctAnswers: number;
    accuracyPercent: number | null;
  }>;
}

export interface DashboardData {
  displayName: string;
  // This is a learner preference, not observed time-tracking. The UI must not
  // present it as a measured number of minutes.
  dailyGoalMinutes: number;
  analytics: LearningAnalytics;
  activeCourses: Course[];
  reviewCards: Array<{
    id: string;
    prompt: string;
    context: string;
    kind: ReviewKind;
    courseTitle: string;
  }>;
}

export interface VocabularyItem {
  id: string;
  courseId: string;
  source: string;
  sourceLanguage: string;
  targetLanguage: string;
  article?: string;
  partOfSpeech?: string;
  contextSentence?: string;
  note?: string;
  state: 'new' | 'learning' | 'due' | 'mastered' | 'mistake';
  dueAt?: string;
  validation?: 'verified' | 'pending' | 'manual';
  readyForQuiz: boolean;
  canEdit?: boolean;
}

export interface ReviewQuestion {
  id: string;
  courseId: string;
  prompt: string;
  direction: 'SOURCE_TO_TARGET' | 'TARGET_TO_SOURCE';
  sourceLanguage: string;
  targetLanguage: string;
  courseTitle: string;
  kind: ReviewKind;
  hint?: string;
  // Demo-only presentation metadata. Production questions deliberately omit
  // answer keys; grading and feedback come from the server.
  demoAnswer?: string;
  demoAcceptedAnswers?: string[];
  demoExplanation?: string;
  article?: string;
  example?: string;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  role: 'owner' | 'admin' | 'member';
  // True only for this team's actual OWNER or a platform administrator —
  // narrower than `role === 'admin'`, which also covers a team MANAGER who
  // cannot add members. Gates the member-management UI.
  canManageMembers: boolean;
  courseCount: number;
  accent: string;
}

export interface ApiProblem {
  error: string;
  status?: number;
  requestId?: string;
}
