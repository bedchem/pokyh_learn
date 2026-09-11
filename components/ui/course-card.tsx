import { ArrowUpRight, BookOpen, Lock, Users } from 'lucide-react';
import Link from 'next/link';

import type { Course } from '@/lib/types';

const visibilityLabel = {
  public: 'Katalog',
  team: 'Team',
  private: 'Privat',
};

export function CourseCard({ course, href, compact = false }: { course: Course; href?: string; compact?: boolean }) {
  const target = href || `/catalog/${course.slug}`;

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
        <span><BookOpen size={14} /> {course.lessons} Lektionen</span>
        <span>{course.visibility === 'team' ? <Users size={14} /> : <Lock size={13} />} {visibilityLabel[course.visibility]}</span>
      </div>
      {typeof course.progress === 'number' && (
        <div className="course-progress" aria-label={`${course.progress}% abgeschlossen`}>
          <span><b>{course.progress}%</b> abgeschlossen</span>
          <div className="progress-track"><i style={{ width: `${course.progress}%` }} /></div>
        </div>
      )}
    </Link>
  );
}
