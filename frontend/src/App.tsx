import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Loading } from './components/ui';

/**
 * Route-level code splitting.
 *
 * Visualiser engines and interactive widgets are only pulled in with the page that uses them,
 * which keeps the initial bundle small as the content library grows (§39 of the brief).
 */
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DsaIndex = lazy(() => import('./pages/DsaIndex'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const PatternMapPage = lazy(() => import('./pages/PatternMapPage'));
const ProblemsPage = lazy(() => import('./pages/ProblemsPage'));
const ProblemPage = lazy(() => import('./pages/ProblemPage'));
const SystemDesignIndex = lazy(() => import('./pages/SystemDesignIndex'));
const ConceptPage = lazy(() => import('./pages/ConceptPage'));
const CaseStudiesPage = lazy(() => import('./pages/CaseStudiesPage'));
const CaseStudyPage = lazy(() => import('./pages/CaseStudyPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const InterviewPage = lazy(() => import('./pages/InterviewPage'));
const PrepTracksPage = lazy(() => import('./pages/PrepTracksPage'));
const PrepTrackPage = lazy(() => import('./pages/PrepTrackPage'));
const PrepSetPage = lazy(() => import('./pages/PrepSetPage'));
const PrepDrillPage = lazy(() => import('./pages/PrepDrillPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const PathPage = lazy(() => import('./pages/PathPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

export function App() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dsa" element={<DsaIndex />} />
          <Route path="/dsa/:id" element={<LessonPage />} />
          <Route path="/pattern-map" element={<PatternMapPage />} />
          <Route path="/problems" element={<ProblemsPage />} />
          <Route path="/problems/:id" element={<ProblemPage />} />
          <Route path="/system-design" element={<SystemDesignIndex />} />
          <Route path="/system-design/case-studies" element={<CaseStudiesPage />} />
          <Route path="/system-design/case-studies/:id" element={<CaseStudyPage />} />
          <Route path="/system-design/:id" element={<ConceptPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/interview" element={<InterviewPage />} />
          {/* Static segments first: "/interview/:id" would otherwise match "tracks" and "drill". */}
          <Route path="/interview/tracks" element={<PrepTracksPage />} />
          <Route path="/interview/tracks/:id" element={<PrepTrackPage />} />
          <Route path="/interview/sets/:id" element={<PrepSetPage />} />
          <Route path="/interview/drill" element={<PrepDrillPage />} />
          <Route path="/interview/:id" element={<InterviewPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/paths/:id" element={<PathPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
