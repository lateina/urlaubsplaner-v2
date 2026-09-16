import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { firestoreService } from './services/firestoreService.js'

// Global Error Logging
window.onerror = function (message, source, lineno, colno, error) {
  firestoreService.logError({
    message: message?.toString() || 'Unknown Error',
    source,
    lineno,
    colno,
    stack: error?.stack || null,
    userAgent: navigator.userAgent,
    url: window.location.href,
    planerType: localStorage.getItem('last_planer_type') || 'unknown'
  });
  return false; // let default browser behavior happen
};

window.onunhandledrejection = function (event) {
  firestoreService.logError({
    message: event.reason?.message || event.reason?.toString() || 'Unhandled Promise Rejection',
    stack: event.reason?.stack || null,
    userAgent: navigator.userAgent,
    url: window.location.href,
    planerType: localStorage.getItem('last_planer_type') || 'unknown'
  });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Auto-reload on Service Worker update so PWA clients always run latest code
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
