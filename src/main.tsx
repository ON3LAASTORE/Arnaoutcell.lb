import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import {
  isChunkLoadError,
  isTransientNetworkOrSocketError,
  shouldTriggerChunkRecoveryReload,
} from './utils/errorHandlingHelpers';

declare global {
  interface Window {
    __oaaGlobalErrorHandlersRegistered?: boolean;
  }
}

if (typeof window !== 'undefined' && !window.__oaaGlobalErrorHandlersRegistered) {
  window.__oaaGlobalErrorHandlersRegistered = true;

  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
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
    },
    { capture: true }
  );

  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      const errPayload = event.error ?? event.message;
      if (isTransientNetworkOrSocketError(errPayload, event.filename)) {
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
    },
    { capture: true }
  );
}

createRoot(document.getElementById('root')!).render(
  <ChunkErrorBoundary label="root-app">
    <App />
  </ChunkErrorBoundary>
);

