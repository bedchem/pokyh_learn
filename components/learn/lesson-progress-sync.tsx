'use client';

import { useEffect } from 'react';

import { learnApi } from '@/lib/client/api';

export function LessonProgressSync({ courseId, completedSections, totalSections }: { courseId: string; completedSections: number; totalSections: number }) {
  useEffect(() => {
    const progressPercent = Math.round((completedSections / Math.max(1, totalSections)) * 100);
    void learnApi(`courses/${courseId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({
        completedSections,
        progressPercent,
        ...(progressPercent === 100 ? { status: 'COMPLETED' } : { status: 'ACTIVE' }),
      }),
    }).catch(() => undefined);
  }, [completedSections, courseId, totalSections]);

  return null;
}
