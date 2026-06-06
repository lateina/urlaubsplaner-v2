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

// Service worker registration is handled automatically by vite-plugin-pwa
