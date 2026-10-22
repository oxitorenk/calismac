import { StudyPage } from './pages/StudyPage';
import { AppShell } from './components/AppShell';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentRepository } from './data/ContentRepository';
import { GoogleSheetsContentRepository } from './data/GoogleSheetsContentRepository';
import { useContent } from './app/useContent';
import { parentRoute } from './app/navigation';
import type { Route } from './app/navigation';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { CoursesPage } from './pages/CoursesPage';
import { CoursePage } from './pages/CoursePage';
import { QuestionCountPage } from './pages/QuestionCountPage';
import type { ContentState } from './app/useContent';
import type { ExamType, Question, TestSession } from './domain/models';
import { createTestSession } from './domain/createTestSession';
import { TestPage } from './pages/TestPage';
import { answerQuestion } from './domain/answerQuestion';
import { ExitConfirmation } from './components/ExitConfirmation';
import { ResultsPage } from './pages/ResultsPage';
import { WrongAnswersPage } from './pages/WrongAnswersPage';

const defaultRepository = new GoogleSheetsContentRepository();

export function App({ repository = defaultRepository }: { repository?: ContentRepository }) {
  const loadCatalog = useCallback(() => repository.getCatalog(), [repository]);
  const { state, retry } = useContent(loadCatalog);
  const [route, setRoute] = useState<Route>({ page: 'departments' });
  const [bank, setBank] = useState<ContentState<Question[]>>({ status: 'loading' });
  const requestId = useRef(0);
  const [session, setSession] = useState<TestSession | null>(null);
  const [pendingRoute, setPendingRoute] = useState<Route | null>(null);
  const [studyBusy, setStudyBusy] = useState(false);
  const incomplete = studyBusy || route.page === 'test' && session?.answers.some(answer => answer === null);
  const activeTest = studyBusy || (route.page === 'test' && session !== null);
  function commitNavigation(target: Route, replace = false) {
    if (!['test', 'results', 'wrong'].includes(target.page)) setSession(null);
    if (target.page === 'count') loadBank(target);
    if (replace) window.history.replaceState({ calismacRoute: target }, '');
    else window.history.pushState({ calismacRoute: target }, '');
    setRoute(target);
  }
  function navigate(target: Route) {
    if (incomplete) setPendingRoute(target);
    else commitNavigation(target);
  }
  useEffect(() => {
    window.history.replaceState({ calismacRoute: { page: 'departments' } }, '');
  }, []);
  useEffect(() => {
    function onPop(event: PopStateEvent) {
      let target: Route = event.state?.calismacRoute ?? { page: 'departments' };
      if (target.page === 'test' || target.page === 'results' || target.page === 'wrong') {
        if (!session || session.departmentId !== target.departmentId || session.courseId !== target.courseId || session.examType !== target.examType) target = { page: 'departments' };
        else if (incomplete || (target.page !== 'test' && session.answers.some(answer => answer === null))) target = { ...target, page: 'count' };
      }
      if (incomplete) {
        window.history.pushState({ calismacRoute: route }, '');
        setPendingRoute(target);
      } else commitNavigation(target, true);
    }
    function onUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('popstate', onPop);
    if (activeTest) window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [route, session, incomplete, activeTest]);
  function selectExam(examType: ExamType) {
    if (route.page !== 'course' && route.page !== 'count') return;
    navigate({ ...route, page: 'count', examType });
  }
  function loadBank(selection: { departmentId: string; courseId: string; examType: ExamType }) {
    const id = ++requestId.current;
    setBank({ status: 'loading' });
    repository.getQuestionBank(selection.departmentId, selection.courseId, selection.examType).then(
      data => { if (requestId.current === id) setBank({ status: 'ready', data }); },
      () => { if (requestId.current === id) setBank({ status: 'error' }); },
    );
  }
  const department = state.status === 'ready' && 'departmentId' in route
    ? state.data.find(entry => entry.departmentId === route.departmentId)?.department
    : undefined;
  const course = state.status === 'ready' && 'courseId' in route
    ? state.data.find(entry => entry.courseId === route.courseId)?.course
    : undefined;
  if (route.page === 'study' && state.status === 'ready') return <>
    <StudyPage repository={repository} catalog={state.data} departmentId={route.departmentId} courseIds={route.courseIds}
      onBusy={setStudyBusy} onExit={() => navigate({ page: 'courses', departmentId: route.departmentId })} />
    {pendingRoute && <ExitConfirmation onContinue={() => setPendingRoute(null)} onExit={() => {
      setStudyBusy(false); commitNavigation(pendingRoute, true); setPendingRoute(null);
    }} />}
  </>;
  return (
    <AppShell
      page={route.page}
      compact={route.page === 'test' || route.page === 'wrong'}
      contextLabel={route.page === 'count' || route.page === 'test' || route.page === 'wrong' || route.page === 'results' ? `${route.examType === 'midterm' ? 'Vize' : 'Final'}${route.page !== 'test' && route.page !== 'count' && course ? ` · ${course}` : ''}` : undefined}
      title={route.page === 'results' ? 'Sonuçlar' : route.page === 'wrong' ? 'Yanlışlar' : course ?? department ?? 'Bölümler'}
      backLabel={route.page === 'courses' ? 'Bölümler' : route.page === 'wrong' ? 'Sonuçlar' : route.page === 'count' ? 'Sınav Tipi' : route.page === 'course' ? 'Dersler' : course}
      onBack={route.page === 'departments' || route.page === 'results' ? undefined : () => navigate(parentRoute(route))}
    >
      {state.status === 'loading' && <LoadingSkeleton variant="list" label="Bölümler yükleniyor…" />}
      {state.status === 'error' && <>
        <p role="alert">Bölümler yüklenemedi.</p>
        <button className="primary" onClick={retry}>Tekrar Dene</button>
      </>}
      {state.status === 'ready' && route.page === 'departments' && <DepartmentsPage
        catalog={state.data}
        onSelect={departmentId => navigate({ page: 'courses', departmentId })}
      />}
      {state.status === 'ready' && route.page === 'course' && <CoursePage onSelect={selectExam} />}
      {route.page === 'count' && <>
        <QuestionCountPage bank={bank} onRetry={() => selectExam(route.examType)} onStart={count => {
          if (bank.status !== 'ready') return;
          setSession(createTestSession(bank.data, count, route.departmentId, route.courseId, route.examType));
          navigate({ ...route, page: 'test' });
        }} />
      </>}
      {route.page === 'test' && session && <TestPage key={session.currentQuestionIndex} session={session}
        onAnswer={optionIndex => setSession(current => current ? answerQuestion(current, optionIndex) : null)}
        onNext={() => {
          if (session.answers[session.currentQuestionIndex] === null) return;
          if (session.currentQuestionIndex === session.questions.length - 1) navigate({ ...route, page: 'results' });
          else setSession({ ...session, currentQuestionIndex: session.currentQuestionIndex + 1 });
        }}
      />}
      {route.page === 'results' && session && <ResultsPage session={session}
        onReview={() => navigate({ ...route, page: 'wrong' })}
        onCourses={() => navigate({ page: 'courses', departmentId: route.departmentId })}
      />}
      {route.page === 'wrong' && session && <WrongAnswersPage session={session} onResults={() => navigate({ ...route, page: 'results' })} />}
      {state.status === 'ready' && route.page === 'courses' && <CoursesPage
        catalog={state.data}
        departmentId={route.departmentId}
        onStudy={courseIds => navigate({ page: 'study', departmentId: route.departmentId, courseIds })}
        onSelect={courseId => navigate({ page: 'course', departmentId: route.departmentId, courseId })}
      />}
      {pendingRoute && <ExitConfirmation onContinue={() => setPendingRoute(null)} onExit={() => {
        commitNavigation(pendingRoute, true);
        setPendingRoute(null);
      }} />}
    </AppShell>
  );
}
