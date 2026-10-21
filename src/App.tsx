import { AppShell } from './components/AppShell';
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

const defaultRepository = new GoogleSheetsContentRepository();

export function App({ repository = defaultRepository }: { repository?: ContentRepository }) {
  const loadCatalog = useCallback(() => repository.getCatalog(), [repository]);
  const { state, retry } = useContent(loadCatalog);
  const [route, setRoute] = useState<Route>({ page: 'departments' });
  const [bank, setBank] = useState<ContentState<Question[]>>({ status: 'loading' });
  const requestId = useRef(0);
  const [session, setSession] = useState<TestSession | null>(null);
  const [pendingRoute, setPendingRoute] = useState<Route | null>(null);
  const incomplete = route.page === 'test' && session?.answers.some(answer => answer === null);
  function commitNavigation(target: Route, replace = false) {
    if (route.page === 'test' && target.page !== 'results') setSession(null);
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
      if (['test', 'results', 'wrong'].includes(target.page) && !session) target = { page: 'departments' };
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
    if (incomplete) window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [route, session, incomplete]);
  function selectExam(examType: ExamType) {
    if (route.page !== 'course' && route.page !== 'count') return;
    const id = ++requestId.current;
    setBank({ status: 'loading' });
    navigate({ ...route, page: 'count', examType });
    repository.getQuestionBank(route.departmentId, route.courseId, examType).then(
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
  return (
    <AppShell title={course ?? department ?? 'Çalışmaç'} backLabel={route.page === 'courses' ? 'Bölümler' : route.page === 'course' ? department : course} onBack={route.page === 'departments' ? undefined : () => navigate(parentRoute(route))}>
      {route.page === 'departments' && <h2>Bölümler</h2>}
      {state.status === 'loading' && <p role="status">Bölümler yükleniyor…</p>}
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
        <h2>{route.examType === 'midterm' ? 'Vize' : 'Final'}</h2>
        <QuestionCountPage bank={bank} onRetry={() => selectExam(route.examType)} onStart={count => {
          if (bank.status !== 'ready') return;
          setSession(createTestSession(bank.data, count, route.departmentId, route.courseId, route.examType));
          navigate({ ...route, page: 'test' });
        }} />
      </>}
      {route.page === 'test' && session && <TestPage session={session}
        onAnswer={optionIndex => setSession(current => current ? answerQuestion(current, optionIndex) : null)}
        onNext={() => {
          if (session.answers[session.currentQuestionIndex] === null) return;
          if (session.currentQuestionIndex === session.questions.length - 1) navigate({ ...route, page: 'results' });
          else setSession({ ...session, currentQuestionIndex: session.currentQuestionIndex + 1 });
        }}
      />}
      {route.page === 'results' && <h2>Sonuçlar</h2>}
      {state.status === 'ready' && route.page === 'courses' && <CoursesPage
        catalog={state.data}
        departmentId={route.departmentId}
        onSelect={courseId => navigate({ page: 'course', departmentId: route.departmentId, courseId })}
      />}
      {pendingRoute && <ExitConfirmation onContinue={() => setPendingRoute(null)} onExit={() => {
        commitNavigation(pendingRoute, true);
        setPendingRoute(null);
      }} />}
    </AppShell>
  );
}
