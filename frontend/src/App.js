import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(AppShell, { children: _jsx(Suspense, { fallback: _jsx(Loading, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/dsa", element: _jsx(DsaIndex, {}) }), _jsx(Route, { path: "/dsa/:id", element: _jsx(LessonPage, {}) }), _jsx(Route, { path: "/pattern-map", element: _jsx(PatternMapPage, {}) }), _jsx(Route, { path: "/problems", element: _jsx(ProblemsPage, {}) }), _jsx(Route, { path: "/problems/:id", element: _jsx(ProblemPage, {}) }), _jsx(Route, { path: "/system-design", element: _jsx(SystemDesignIndex, {}) }), _jsx(Route, { path: "/system-design/case-studies", element: _jsx(CaseStudiesPage, {}) }), _jsx(Route, { path: "/system-design/case-studies/:id", element: _jsx(CaseStudyPage, {}) }), _jsx(Route, { path: "/system-design/:id", element: _jsx(ConceptPage, {}) }), _jsx(Route, { path: "/practice", element: _jsx(PracticePage, {}) }), _jsx(Route, { path: "/interview", element: _jsx(InterviewPage, {}) }), _jsx(Route, { path: "/interview/tracks", element: _jsx(PrepTracksPage, {}) }), _jsx(Route, { path: "/interview/tracks/:id", element: _jsx(PrepTrackPage, {}) }), _jsx(Route, { path: "/interview/sets/:id", element: _jsx(PrepSetPage, {}) }), _jsx(Route, { path: "/interview/drill", element: _jsx(PrepDrillPage, {}) }), _jsx(Route, { path: "/interview/:id", element: _jsx(InterviewPage, {}) }), _jsx(Route, { path: "/progress", element: _jsx(ProgressPage, {}) }), _jsx(Route, { path: "/bookmarks", element: _jsx(BookmarksPage, {}) }), _jsx(Route, { path: "/search", element: _jsx(SearchPage, {}) }), _jsx(Route, { path: "/paths/:id", element: _jsx(PathPage, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }) }));
}
