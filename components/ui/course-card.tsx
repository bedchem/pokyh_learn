'use client';

import { ArrowUpRight, BookOpen, Lock, Users } from 'lucide-react';
import Link from 'next/link';

import { useLearnPreferences } from '@/components/providers/learn-preferences';
import type { Course } from '@/lib/types';

export function CourseCard({
  course,
  href,
  compact = false,
  showProgress = true,
}: {
  course: Course;
  href?: string;
  compact?: boolean;
  showProgress?: boolean;
}) {
  const { t } = useLearnPreferences();
  const target = href || `/courses/${course.slug}`;

  return (
    <Link className={`course-card course-card--${course.accent} ${compact ? 'course-card--compact' : ''}`} href={target}>
      <div className="course-card__topline">
        <span className="course-language">{course.language} · {course.level}</span>
        <span className="course-link" aria-hidden="true"><ArrowUpRight size={17} /></span>
      </div>
      <div className="course-card__body">
        <h3>{course.title}</h3>
        <p>{course.description}</p>
      </div>
      <div className="course-card__meta">
        <span><BookOpen size={14} /> {t('courseCard.lessons', { count: String(course.lessons) })}</span>
        <span>{course.visibility === 'team' ? <Users size={14} /> : <Lock size={13} />} {t(`courseCard.${course.visibility}`)}</span>
      </div>
      {showProgress && typeof course.progress === 'number' && (
        <div className="course-progress" aria-label={`${course.progress}% ${t('courseCard.complete')}`}>
          <span><b>{course.progress}%</b> {t('courseCard.complete')}</span>
          <div className="progress-track"><i style={{ width: `${course.progress}%` }} /></div>
        </div>
      )}
    </Link>
  );
}
