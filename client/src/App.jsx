import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards.jsx';
import CounterPage from './pages/CounterPage.jsx';
import CountersPage from './pages/CountersPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import { EmptyState, LoadingState } from './components/States.jsx';

// Recharts is heavy; load the History page (and its charts) on demand so the
// counter screen – what people open most on their phones – loads fast.
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'));

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="That page doesn’t exist."
      action={
        <Link to="/" className="btn-primary">
          Go to my counter
        </Link>
      }
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<CounterPage />} />
          <Route
            path="history"
            element={
              <Suspense fallback={<LoadingState />}>
                <HistoryPage />
              </Suspense>
            }
          />
          <Route path="counters" element={<CountersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
