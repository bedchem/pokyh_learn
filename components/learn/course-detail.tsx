'use client';

import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, Lock, PencilLine, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';

import { EnrollmentButton } from '@/components/learn/enrollment-button';
import { useLearnPreferences } from '@/components/providers/learn-preferences';
import type { Course } from '@/lib/types';

export function CourseDetail({
  course,
  enrolled = false,
  authenticated = false,
  catalogContext = false,
}: {
  course: Course;
  enrolled?: boolean;
  authenticated?: boolean;
  catalogContext?: boolean;
}) {
  const { t } = useLearnPreferences();
  const sections = course.sections || [];
  const isEnrolled = enrolled || Boolean(course.isEnrolled);
  const nextSection = sections[Math.min(Math.max(course.completedSections ?? 0, 0), Math.max(sections.length - 1, 0))];
  const continueHref = nextSection ? `/courses/${course.slug}/learn/${nextSection.id}` : `/courses/${course.slug}`;
  const hasTeamVisibility = course.visibility === 'team';
  const isItalianCourse = course.language.toLocaleLowerCase('it-IT').startsWith('ital');

  const signInReturnTo = catalogContext ? `/catalog/${course.slug}` : `/courses/${course.slug}`;

  return <div className="page-wrap course-detail-page">
    <Link className="back-link" href={isEnrolled ? '/courses' : '/catalog'}><ArrowLeft size={16} /> {isEnrolled ? t('courseDetail.backCourses') : t('courseDetail.backCatalog')}</Link>
    <section className={`course-hero course-hero--${course.accent}`}>
      <div className="course-hero__content"><span className="course-language">{course.language} · {course.level}</span><h1>{course.title}</h1><p>{course.description}</p><div className="course-hero__meta"><span><BookOpen size={16} /> {course.modules === 1 ? t('courseDetail.sectionsOne') : t('courseDetail.sectionsMany', { count: String(course.modules) })}</span><span><Clock3 size={16} /> {t('courseDetail.ownPace')}</span><span>{hasTeamVisibility ? <Users size={16} /> : <Lock size={15} />} {hasTeamVisibility ? t('courseDetail.forTeam') : course.visibility === 'public' ? t('courseDetail.inCatalog') : t('courseDetail.private')}</span></div><div className="course-hero__actions">{isEnrolled ? <EnrollmentButton courseId={course.id} courseSlug={course.slug} continueHref={continueHref} enrolled /> : authenticated ? <EnrollmentButton courseId={course.id} courseSlug={course.slug} continueHref={continueHref} enrolled={false} /> : <Link href={`/sign-in?returnTo=${encodeURIComponent(signInReturnTo)}`} className="button button--dark">{t('courseDetail.signInAdd')} <ArrowRight size={17} /></Link>}{(isEnrolled || course.canEdit) && <Link href={`/courses/${course.slug}/vocabulary`} className="button button--plain">{t('courseDetail.viewVocabulary')}</Link>}{course.canEdit && <Link href={`/courses/${course.slug}/edit`} className="button button--plain"><PencilLine size={16} /> {t('courseDetail.editCourse')}</Link>}</div></div><div className="course-hero__motif" aria-hidden="true"><span>{isItalianCourse ? 'la' : '•'}</span><i>{isItalianCourse ? 'il' : '·'}</i><b>{isItalianCourse ? 'lo' : '—'}</b></div>
    </section>
    <section className="course-detail-grid"><article className="panel curriculum-panel"><div className="panel-heading"><div><p className="section-kicker">{t('courseDetail.learningPath')}</p><h2>{t('courseDetail.learnAtPace')}</h2></div>{course.canEdit && <Link className="button button--soft button--small" href={`/courses/${course.slug}/edit`}><PencilLine size={15} /> {t('courseDetail.edit')}</Link>}</div>{sections.length ? <ol className="lesson-path">{sections.map((section, index) => { const isNext = section.id === nextSection?.id; return <li key={section.id} className={isNext && isEnrolled ? 'is-next' : ''}><span>{isNext && isEnrolled ? <Check size={15} /> : index + 1}</span><div><b>{section.title}</b><small>{section.summary || t(`section.${section.type.toLocaleLowerCase('en-US')}`) || t('courseDetail.genericSection')}</small></div>{isEnrolled ? <Link className={isNext ? 'button button--dark button--small' : 'text-link'} href={`/courses/${course.slug}/learn/${section.id}`}>{isNext ? <>{t('courseDetail.start')} <ArrowRight size={15} /></> : t('courseDetail.open')}</Link> : <Lock size={16} />}</li>; })}</ol> : <div className="inline-empty"><Sparkles size={18} /><div><b>{t('courseDetail.emptyTitle')}</b><p>{t('courseDetail.emptyBody')}</p></div></div>}</article><aside className="course-side-stack"><article className="panel info-panel"><span className="icon-orb icon-orb--rose"><Sparkles size={18} /></span><h2>{t('courseDetail.learn')}</h2>{sections.length ? <ul>{sections.slice(0, 3).map((section) => <li key={section.id}>{section.title}</li>)}</ul> : <p>{t('courseDetail.learnEmpty')}</p>}</article><article className="panel course-creator"><span>{t('courseDetail.status')}</span><b>{course.state === 'draft' ? t('courseDetail.draft') : course.state === 'archived' ? t('courseDetail.archived') : t('courseDetail.active')}</b><p>{course.updatedAt ? t('courseDetail.updated', { date: course.updatedAt }) : t('courseDetail.updatedFallback')}</p></article></aside></section>
  </div>;
}
