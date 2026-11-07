import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState, LoadingState } from './States.jsx';

function BootScreen() {
  const { status, retry } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center">
      {status === 'error' ? (
        <ErrorState title="Can’t reach the server" error={{ message: 'Check your connection and try again.' }} onRetry={retry} />
      ) : (
        <LoadingState label="Starting up…" />
      )}
    </div>
  );
}

/** Only for logged-in users; others are sent to /login (and come back after). */
export function ProtectedRoute() {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status !== 'ready') return <BootScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Login/Register: logged-in users skip straight to the app. */
export function PublicOnlyRoute() {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <BootScreen />;
  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  return <Outlet />;
}
