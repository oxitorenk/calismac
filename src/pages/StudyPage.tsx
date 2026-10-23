import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContentRepository } from '../data/ContentRepository';
import type { CatalogEntry, ExamType, TestSession } from '../domain/models';
import { useContent } from '../app/useContent';
import { createTestSession } from '../domain/createTestSession';
import { answerQuestion } from '../domain/answerQuestion';
import { testResults } from '../domain/testResults';
import { AppShell } from '../components/AppShell';
import { CoursePage } from './CoursePage';
import type { CountSelection } from './QuestionCountPage';
import { CoursesPage } from './CoursesPage';
import { QuestionCountPage } from './QuestionCountPage';
import { TestPage } from './TestPage';
import { ResultsPage } from './ResultsPage';
import { WrongAnswersPage } from './WrongAnswersPage';

export function StudyPage({ repository, catalog, departmentId, courseIds: initialCourseIds, onExit, onBusy }: {
  repository: ContentRepository; catalog: CatalogEntry[]; departmentId: string; courseIds: string[];
  onExit: () => void; onBusy: (busy: boolean) => void;
}) {
  const [courseIds, setCourseIds] = useState(initialCourseIds);
  const [selection, setSelection] = useState<CountSelection | null>(null);
  const [returnPage, setReturnPage] = useState<'exam' | 'count'>('exam');
  const [exam, setExam] = useState<ExamType | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [page, setPage] = useState<'edit' | 'exam' | 'count' | 'test' | 'results' | 'wrong' | 'summary'>('exam');
  const load = useCallback(async () => {
    if (!exam) return [];
    return Promise.all(courseIds.map(async courseId => {
      const questions = await repository.getQuestionBank(departmentId, courseId, exam);
      if (!questions.length) throw new Error('Empty question bank');
      return questions;
    }));
  }, [repository, departmentId, courseIds, exam]);
  const { state: banks, retry } = useContent(load);
  const session = sessions[index];
  const busy = sessions.length > 0 && !completed;
  useEffect(() => { onBusy(busy); return () => onBusy(false); }, [busy, onBusy]);
  const courseName = (id: string) => catalog.find(entry => entry.departmentId === departmentId && entry.courseId === id)?.course ?? id;
  const title = page === 'edit' ? 'Dersleri düzenle' : page === 'exam' || page === 'count' ? 'Çalışma oluştur' : page === 'summary' ? 'Çalışma tamamlandı' : courseName(courseIds[index]);
  const countBank = useMemo(() => banks.status === 'ready'
    ? banks.data.length !== courseIds.length ? { status: 'loading' as const } : { status: 'ready' as const, data: banks.data.reduce((largest, bank) => bank.length > largest.length ? bank : largest, banks.data[0] ?? []) }
    : banks, [banks, courseIds.length]);
  function editCourses(from: 'exam' | 'count') { setReturnPage(from); setPage('edit'); }
  return <AppShell page={page} title={title} compact={page === 'test' || page === 'wrong'}
    contextLabel={exam && page !== 'edit' ? `${exam === 'midterm' ? 'Vize' : 'Final'} · ${page === 'summary' ? courseIds.length + ' ders tamamlandı' : page === 'count' || page === 'exam' ? courseIds.length + ' ders' : index + 1 + ' / ' + courseIds.length + ' ders'}` : undefined}
    backLabel={page === 'edit' ? 'Ayarlara dön' : page === 'count' ? 'Sınav Tipi' : page === 'wrong' ? 'Sonuçlar' : completed && page === 'results' ? 'Çalışma Özeti' : 'Dersler'}
    onBack={page === 'summary' ? undefined : () => page === 'edit' ? setPage(returnPage) : page === 'exam' ? editCourses('exam') : page === 'count' ? setPage('exam') : page === 'wrong' ? setPage('results') : completed && page === 'results' ? setPage('summary') : onExit()}>
    {page === 'edit' && <CoursesPage catalog={catalog} departmentId={departmentId} initialSelected={courseIds}
      onSelect={() => {}} onCancel={() => setPage(returnPage)} onStudy={ids => { setCourseIds(ids); setPage(returnPage); }} />}
    {(page === 'exam' || page === 'count') && <section className="study-itinerary" aria-label="Seçilen dersler">
      <div className="itinerary-heading"><h2>Ders sırası</h2><button className="back" onClick={() => editCourses(page)}>Dersleri düzenle</button></div>
      <ol>{courseIds.map(id => <li key={id}>{courseName(id)}</li>)}</ol>
    </section>}
    {page === 'exam' && <CoursePage onSelect={value => { setExam(value); setPage('count'); }} />}
    {page === 'count' && <>
      <QuestionCountPage bank={countBank} selection={selection} onSelectionChange={setSelection} courses={courseIds.map((id, i) => ({ name: courseName(id), available: banks.status === 'ready' ? banks.data[i]?.length ?? 0 : 0 }))} onRetry={retry} onStart={(count, all) => {
        if (banks.status !== 'ready' || !exam) return;
        setSessions(banks.data.map((bank, i) => createTestSession(bank, all ? bank.length : Math.min(count, bank.length), departmentId, courseIds[i], exam)));
        setPage('test');
      }} />
    </>}
    {page === 'test' && session && <TestPage key={`${index}-${session.currentQuestionIndex}`} session={session}
      onAnswer={option => setSessions(current => current.map((item, i) => i === index ? answerQuestion(item, option) : item))}
      onNext={() => {
        if (session.answers[session.currentQuestionIndex] === null) return;
        if (session.currentQuestionIndex === session.questions.length - 1) setPage('results');
        else setSessions(current => current.map((item, i) => i === index ? { ...item, currentQuestionIndex: item.currentQuestionIndex + 1 } : item));
      }} />}
    {page === 'results' && session && <ResultsPage session={session} onReview={() => setPage('wrong')} onCourses={onExit}
      continueLabel={completed ? 'Çalışma Özeti' : index + 1 < sessions.length ? `Sıradaki ders: ${courseName(courseIds[index + 1])}` : 'Çalışma sonuçlarını gör'}
      onContinue={() => {
        if (completed) setPage('summary');
        else if (index + 1 < sessions.length) { setIndex(index + 1); setPage('test'); }
        else { setCompleted(true); setPage('summary'); }
      }} />}
    {page === 'wrong' && session && <WrongAnswersPage session={session} onResults={() => setPage('results')} />}
    {page === 'summary' && <>
      <ul className="grouped-list study-summary">{sessions.map((item, itemIndex) => {
        const result = testResults(item);
        return <li key={item.courseId}><button className="list-button" onClick={() => { setIndex(itemIndex); setPage('results'); }}>
          <span className="summary-details"><strong>{courseName(item.courseId)}</strong><span>{item.questions.length} soruda {result.correct} doğru · %{Math.round(result.rate * 100)}</span></span>
          <svg className="disclosure" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button></li>;
      })}</ul>
      <button className="primary study-next" onClick={onExit}>Ders Seçimi</button>
    </>}
  </AppShell>;
}
