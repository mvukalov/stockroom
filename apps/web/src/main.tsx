import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { StartupErrorPage } from './pages/StartupErrorPage.tsx';
import './styles/index.css';

// Development and the static demo run on the MSW mock. A real-API build sets
// VITE_API_MODE=real, and Vite drops the import, so no mock code ships in it.
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_API_MODE === 'real') return;
  const { startMockWorker } = await import('./mocks/browser');
  await startMockWorker();
}

const root = createRoot(document.getElementById('root')!);

// The app renders only once the worker is ready, so no request bypasses the mock.
// Without it nothing could load, so the visitor gets the reason instead of the app.
void enableMocking().then(
  () => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  },
  (error: unknown) => {
    console.error('The mock API did not start.', error);
    root.render(
      <StrictMode>
        <StartupErrorPage />
      </StrictMode>,
    );
  },
);
