'use client';

import { Archive, BookOpenCheck, CheckCircle2, Eye, KeyRound, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { learnApi } from '@/lib/client/api';
import type { LearnAdminOverview } from '@/lib/server/data';

function statusLabel(status: LearnAdminOverview['courses'][number]['status']) {
  if (status === 'PUBLISHED') return 'Veröffentlicht';
  if (status === 'ARCHIVED') return 'Archiviert';
  return 'Entwurf';
}

function timestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function LearnAdminConsole({ overview, username }: { overview: LearnAdminOverview; username: string }) {
  const router = useRouter();
  const [courses, setCourses] = useState(overview.courses);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function setLifecycle(course: LearnAdminOverview['courses'][number], status: 'PUBLISHED' | 'ARCHIVED') {
    setPending(`lifecycle:${course.id}`);
    setNotice(null);
    try {
      await learnApi(`courses/${course.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setCourses((current) => current.map((item) => item.id === course.id ? { ...item, status } : item));
      setNotice(`${course.title} ist jetzt ${statusLabel(status).toLocaleLowerCase('de-DE')}.`);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Der Kursstatus konnte nicht geändert werden.');
    } finally {
      setPending(null);
    }
  }

  async function grantAccess(event: FormEvent<HTMLFormElement>, courseId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userId = String(form.get('userId') || '').trim();
    const permission = String(form.get('permission') || 'VIEW');
    if (!userId) return;

    setPending(`grant:${courseId}`);
    setNotice(null);
    try {
      await learnApi('admin/course-access', {
        method: 'POST',
        body: JSON.stringify({ courseId, userId, permission }),
      });
      event.currentTarget.reset();
      setNotice('Zugriff wurde serverseitig gespeichert. Es werden ausschließlich bestätigte WebUntis-Konten akzeptiert.');
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Der Zugriff konnte nicht vergeben werden.');
    } finally {
      setPending(null);
    }
  }

  async function revokeAccess(courseId: string, stableUid: string) {
    setPending(`revoke:${courseId}:${stableUid}`);
    setNotice(null);
    try {
      await learnApi(`admin/course-access/${courseId}/${encodeURIComponent(stableUid)}`, { method: 'DELETE' });
      setCourses((current) => current.map((course) => course.id === courseId
        ? { ...course, accessGrants: course.accessGrants.filter((grant) => grant.stableUid !== stableUid) }
        : course));
      setNotice('Die direkte Kursfreigabe wurde entfernt. Team- oder Katalogzugriff bleibt davon getrennt.');
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Die Freigabe konnte nicht entfernt werden.');
    } finally {
      setPending(null);
    }
  }

  async function deleteCourse(course: LearnAdminOverview['courses'][number]) {
    const confirmation = window.prompt(`Dauerhaft löschen: Tippe exakt „${course.slug}“ ein.`);
    if (confirmation === null) return;
    if (confirmation !== course.slug) {
      setNotice('Keine Löschung: Der Kurs-Slug stimmt nicht exakt überein.');
      return;
    }

    setPending(`delete:${course.id}`);
    setNotice(null);
    try {
      await learnApi(`admin/courses/${course.id}`, { method: 'DELETE', body: JSON.stringify({ confirmation }) });
      setCourses((current) => current.filter((item) => item.id !== course.id));
      setNotice(`${course.title} wurde dauerhaft gelöscht.`);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Der Kurs konnte nicht gelöscht werden.');
    } finally {
      setPending(null);
    }
  }

  return <div className="learn-admin-console">
    <section className="learn-admin-console__intro panel"><div><p className="section-kicker">Pokyh Learn Verwaltung</p><h1>Getrennt, nachvollziehbar und serverseitig abgesichert.</h1><p>Angemeldet als {username}. Diese Oberfläche verwaltet ausschließlich Learn-Kurse, Freigaben und deren Lebenszyklus – nicht die übrigen Pokyh-Daten.</p></div><span className="admin-shield"><ShieldCheck size={18} /> Bestätigter Admin</span></section>

    {notice && <div className="inline-notice" role="status"><CheckCircle2 size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label="Hinweis schließen">×</button></div>}

    <section className="learn-admin-stats" aria-label="Learn Kennzahlen"><article className="panel"><BookOpenCheck size={21} /><span>Kurse</span><b>{overview.stats.courseCount}</b><small>{overview.stats.publishedCount} veröffentlicht · {overview.stats.draftCount} Entwürfe</small></article><article className="panel"><UsersRound size={21} /><span>Einschreibungen</span><b>{overview.stats.enrollmentCount}</b><small>Lernfortschritt bleibt pro Person getrennt</small></article><article className="panel"><KeyRound size={21} /><span>Vokabeleinträge</span><b>{overview.stats.vocabularyCount}</b><small>Quizantworten bleiben redaktionell servergeführt</small></article></section>

    <section className="learn-admin-runtime panel"><div><p className="section-kicker">Laufzeitregeln</p><h2>Schutzrahmen</h2></div><dl><div><dt>Identitäten</dt><dd>{overview.runtime.webUntisOnly ? 'Nur bestätigte WebUntis-Konten' : 'Konfiguration prüfen'}</dd></div><div><dt>Rechtsfreigabe</dt><dd>{overview.runtime.legalGate.enabled ? overview.runtime.legalGate.ready ? `Produktiv-Gate bereit · Hinweis ${overview.runtime.legalGate.privacyNoticeVersion || 'ohne Version'}` : 'Produktiv-Gate sperrt Anmeldungen: Betreiberkonfiguration vervollständigen' : 'Im aktuellen Umfeld deaktiviert'}</dd></div><div><dt>Wörterbuch</dt><dd>{overview.runtime.dictionary.enabled ? `${overview.runtime.dictionary.provider} · ${overview.runtime.dictionary.allowedPairs.join(', ') || 'keine Sprachpaare'}` : 'Deaktiviert – redaktionelle Antworten bleiben möglich'}</dd></div><div><dt>Freigaben</dt><dd>Direkte Rechte, Teams und Katalogsichtbarkeit werden getrennt ausgewertet</dd></div></dl></section>

    <section className="learn-admin-courses"><div className="panel-heading"><div><p className="section-kicker">Kursmanagement</p><h2>{courses.length ? `${courses.length} zuletzt bearbeitete Kurse` : 'Noch keine Learn-Kurse'}</h2></div></div>{courses.length ? <div className="learn-admin-course-list">{courses.map((course) => <article className="panel learn-admin-course" key={course.id}><header><div><span className={`state-badge state-badge--${course.status === 'PUBLISHED' ? 'learning' : course.status === 'ARCHIVED' ? 'mistake' : 'new'}`}>{statusLabel(course.status)}</span><h3>{course.title}</h3><p>{course.subject || 'Ohne Fach'} · {course.language || 'Sprache offen'} · von {course.creator?.username || 'unbekannt'}</p></div><small>Aktualisiert {timestamp(course.updatedAt)}</small></header><div className="learn-admin-course__facts"><span><BookOpenCheck size={15} /> {course._count.sections} Abschnitte</span><span><KeyRound size={15} /> {course._count.vocabulary} Vokabeln</span><span><UsersRound size={15} /> {course._count.enrollments} Lernende</span><span><Eye size={15} /> {course.visibility.toLocaleLowerCase('de-DE')}</span>{course.team && <span>Team: {course.team.name}</span>}</div><div className="learn-admin-course__actions">{course.status !== 'PUBLISHED' && <button type="button" className="button button--dark button--small" disabled={pending !== null} onClick={() => setLifecycle(course, 'PUBLISHED')}><BookOpenCheck size={15} /> Veröffentlichen</button>}{course.status === 'PUBLISHED' && <button type="button" className="button button--soft button--small" disabled={pending !== null} onClick={() => setLifecycle(course, 'ARCHIVED')}><Archive size={15} /> Archivieren</button>}<button type="button" className="button button--danger button--small" disabled={pending !== null} onClick={() => deleteCourse(course)}><Trash2 size={15} /> Löschen</button></div><section className="learn-admin-course__access"><div><p className="section-kicker">Direkte Kursfreigaben</p><p>Username oder stabile Pokyh-ID eingeben. Nur echte, bestätigte WebUntis-Konten können Zugang erhalten.</p></div><form onSubmit={(event) => grantAccess(event, course.id)}><label><span className="sr-only">POKYH Username oder stabile ID</span><input name="userId" maxLength={100} required placeholder="POKYH Username oder stabile ID" /></label><label><span className="sr-only">Berechtigung</span><select name="permission" defaultValue="VIEW"><option value="VIEW">Lesen</option><option value="EDIT">Inhalte bearbeiten</option><option value="MANAGE">Verwalten</option></select></label><button className="button button--soft button--small" type="submit" disabled={pending !== null}><KeyRound size={15} /> Freigeben</button></form>{course.accessGrants.length ? <ul>{course.accessGrants.map((grant) => <li key={grant.stableUid}><span><b>{grant.user?.username || grant.stableUid}</b><small>{grant.permission.toLocaleLowerCase('de-DE')} · {grant.user?.isUntisUser ? 'WebUntis bestätigt' : 'nicht bestätigt'}</small></span><button type="button" className="text-link text-link--danger" disabled={pending !== null} onClick={() => revokeAccess(course.id, grant.stableUid)}>Entfernen</button></li>)}</ul> : <small className="learn-admin-course__empty">Keine direkte Freigabe. Katalog- und Teamzugriff werden separat geregelt.</small>}</section></article>)}</div> : <div className="inline-empty"><BookOpenCheck size={18} /><div><b>Die Learn-Verwaltung ist bereit.</b><p>Erstelle den ersten Kurs im Kursstudio. Er wird zunächst privat als Entwurf angelegt.</p></div></div>}</section>
  </div>;
}
