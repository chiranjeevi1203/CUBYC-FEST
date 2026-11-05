import { leaving } from './lib/canonicalHost';
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/system/ErrorBoundary';
import { BACKEND } from './store/useAuth';
import './index.css';

// /festadmin is its own app (no 3D, no chatbot), loaded only there.
const isAdmin = BACKEND && /^\/festadmin(\/|$)/.test(window.location.pathname);
const AdminApp = isAdmin ? lazy(() => import('./admin/AdminApp')) : null;

// On an old address the page is already moving to the real one: don't start the site here.
if (!leaving)
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        {isAdmin ? (
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        ) : (
          <App />
        )}
      </ErrorBoundary>
    </StrictMode>,
  );
