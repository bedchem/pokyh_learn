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

export interface DashboardData {
  displayName: string;
  streakDays: number;
  weeklyGoal: number;
  weeklyGoalProgress: number;
  dueReviews: number;
  mistakesToReview: number;
  minutesThisWeek: number;
  progressSeries: Array<{ label: string; value: number }>;
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
  courseCount: number;
  accent: string;
}

export interface ApiProblem {
  error: string;
  status?: number;
  requestId?: string;
}
