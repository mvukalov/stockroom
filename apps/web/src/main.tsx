import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles/index.css';

// Development and the static demo run on the MSW mock. A real-API build sets
// VITE_API_MODE=real, and Vite drops the import, so no mock code ships in it.
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_API_MODE === 'real') return;
  const { startMockWorker } = await import('./mocks/browser');
  await startMockWorker();
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
