'use client';

import { Filter, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CourseCard } from '@/components/ui/course-card';
import { useLearnPreferences } from '@/components/providers/learn-preferences';
import type { Course } from '@/lib/types';

export function CatalogExplorer({ courses, authenticated = false }: { courses: Course[]; authenticated?: boolean }) {
  const { locale, t } = useLearnPreferences();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');
  const [language, setLanguage] = useState('ALL');
  const levels = [{ value: 'ALL', label: t('catalog.allLevels') }, ...['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((value) => ({ value, label: value }))];
  const languages = [{ value: 'ALL', label: t('catalog.allLanguages') }, ...Array.from(new Set(courses.map((course) => course.language))).map((value) => ({ value, label: value }))];
  const filtered = useMemo(() => courses.filter((course) => {
    const needle = query.trim().toLocaleLowerCase(locale);
    const matchesSearch = !needle || `${course.title} ${course.description} ${course.category} ${course.language}`.toLocaleLowerCase(locale).includes(needle);
    return matchesSearch && (level === 'ALL' || course.level === level) && (language === 'ALL' || course.language === language);
  }), [courses, language, level, locale, query]);

  return (
    <div className="catalog-explorer">
      <div className="catalog-toolbar">
        <label className="search-field"><Search size={18} /><span className="sr-only">{t('catalog.searchLabel')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('catalog.searchPlaceholder')} /></label>
        <div className="filter-group" aria-label={t('catalog.filterLabel')}><Filter size={16} /><select value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={level} onChange={(event) => setLevel(event.target.value)}>{levels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
      </div>
      <div className={`catalog-result-line${authenticated ? '' : ' catalog-result-line--public'}`}><span>{filtered.length === 1 ? t('catalog.resultOne') : t('catalog.resultMany', { count: String(filtered.length) })}</span>{authenticated && <Link href="/create/course" className="button button--soft button--small"><Plus size={16} /> {t('catalog.create')}</Link>}</div>
      <div className="course-grid course-grid--catalog">{filtered.map((course) => <CourseCard course={course} href={`/catalog/${course.slug}`} key={course.id} showProgress={false} />)}</div>
      {!filtered.length && <div className="catalog-no-results"><Search size={24} /><h2>{t('catalog.noResults')}</h2><p>{t('catalog.noResultsBody')}</p><button className="button button--soft" onClick={() => { setQuery(''); setLevel('ALL'); setLanguage('ALL'); }}>{t('catalog.reset')}</button></div>}
    </div>
  );
}
