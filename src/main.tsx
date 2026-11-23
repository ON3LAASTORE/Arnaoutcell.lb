import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import {
  isChunkLoadError,
  isTransientNetworkOrSocketError,
  shouldTriggerChunkRecoveryReload,
} from './utils/errorHandlingHelpers';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (isTransientNetworkOrSocketError(event.reason)) {
      event.preventDefault();
      return;
    }

    if (
      isChunkLoadError(event.reason) &&
      shouldTriggerChunkRecoveryReload(Date.now(), window.sessionStorage)
    ) {
      event.preventDefault();
      window.location.reload();
    }
  });

  window.addEventListener('error', (event: ErrorEvent) => {
    const errPayload = event.error ?? event.message;
    if (isTransientNetworkOrSocketError(errPayload)) {
      event.preventDefault();
      return;
    }

    if (
      isChunkLoadError(errPayload) &&
      shouldTriggerChunkRecoveryReload(Date.now(), window.sessionStorage)
    ) {
      event.preventDefault();
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <ChunkErrorBoundary label="root-app">
    <App />
  </ChunkErrorBoundary>
);

