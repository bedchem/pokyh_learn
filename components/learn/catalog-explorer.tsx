'use client';

import { Filter, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CourseCard } from '@/components/ui/course-card';
import type { Course } from '@/lib/types';

const levels = ['Alle Stufen', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function CatalogExplorer({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('Alle Stufen');
  const [language, setLanguage] = useState('Alle Sprachen');
  const languages = ['Alle Sprachen', ...Array.from(new Set(courses.map((course) => course.language)))];
  const filtered = useMemo(() => courses.filter((course) => {
    const needle = query.trim().toLocaleLowerCase('de');
    const matchesSearch = !needle || `${course.title} ${course.description} ${course.category} ${course.language}`.toLocaleLowerCase('de').includes(needle);
    return matchesSearch && (level === 'Alle Stufen' || course.level === level) && (language === 'Alle Sprachen' || course.language === language);
  }), [courses, language, level, query]);

  return (
    <div className="catalog-explorer">
      <div className="catalog-toolbar">
        <label className="search-field"><Search size={18} /><span className="sr-only">Katalog durchsuchen</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kurse, Themen oder Sprache suchen" /></label>
        <div className="filter-group" aria-label="Katalog filtern"><Filter size={16} /><select value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select><select value={level} onChange={(event) => setLevel(event.target.value)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></div>
        <button className="icon-button catalog-filter-button" aria-label="Weitere Filter"><SlidersHorizontal size={18} /></button>
      </div>
      <div className="catalog-result-line"><span>{filtered.length} {filtered.length === 1 ? 'Kurs' : 'Kurse'} gefunden</span><a href="/create/course" className="button button--soft button--small"><Plus size={16} /> Eigenen Kurs erstellen</a></div>
      <div className="course-grid course-grid--catalog">{filtered.map((course) => <CourseCard course={course} key={course.id} />)}</div>
      {!filtered.length && <div className="catalog-no-results"><Search size={24} /><h2>Keine passenden Kurse</h2><p>Probiere einen anderen Begriff oder nimm einen Filter zurück.</p><button className="button button--soft" onClick={() => { setQuery(''); setLevel('Alle Stufen'); setLanguage('Alle Sprachen'); }}>Filter zurücksetzen</button></div>}
    </div>
  );
}
