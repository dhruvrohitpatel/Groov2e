import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/density.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App/>
    </ErrorBoundary>
  </StrictMode>,
);

// Hide loading spinner once React has mounted
const spinner = document.getElementById('loading-spinner');
if (spinner) {
  spinner.classList.add('hidden');
}
