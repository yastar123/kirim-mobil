import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const isIgnoredError = (err: unknown): boolean => {
  if (!err) return false;
  const str = (
    String(err) +
    ' ' +
    ((err as any)?.message || '') +
    ' ' +
    ((err as any)?.stack || '') +
    ' ' +
    ((err as any)?.filename || '')
  ).toLowerCase();
  return (
    str.includes('chrome-extension://') ||
    str.includes('cannot set property fetch') ||
    str.includes('which has only a getter') ||
    str.includes('websocket')
  );
};

window.addEventListener('error', (event) => {
  if (isIgnoredError(event.error || event)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return true;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  if (isIgnoredError(event.reason)) {
    event.preventDefault();
    event.stopPropagation();
  }
});

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error) => {
    if (isIgnoredError(error)) {
      return;
    }
    console.warn('Uncaught error:', error);
  },
  onCaughtError: (error) => {
    if (isIgnoredError(error)) {
      return;
    }
  },
}).render(<App />);
