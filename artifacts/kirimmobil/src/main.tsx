try {
  let _fetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    get() {
      return _fetch;
    },
    set(v) {
      _fetch = v;
    },
    configurable: true,
    enumerable: true,
  });
} catch {}

window.addEventListener('error', (event) => {
  if (
    event.filename?.includes('chrome-extension://') ||
    event.message?.includes('chrome-extension://')
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason &&
    (String(reason).includes('chrome-extension://') ||
      (reason.stack && reason.stack.includes('chrome-extension://')))
  ) {
    event.preventDefault();
  }
});

import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error) => {
    const errStr = String(error);
    if (errStr.includes('chrome-extension://') || (error instanceof Error && error.stack?.includes('chrome-extension://'))) {
      return;
    }
    console.error('Uncaught error:', error);
  },
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    const errStr = String(error);
    if (errStr.includes('chrome-extension://')) {
      return;
    }
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
