import { leaving } from './lib/canonicalHost';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/system/ErrorBoundary';
import './index.css';

// On an old address the page is already moving to the real one: don't start the site here.
if (!leaving) createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
