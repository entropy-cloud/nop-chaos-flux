import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { App } from './App';
import '@nop-chaos/ui/styles.css';
import './styles.css';

// Initialize i18n before rendering
initFluxI18n();

// Mount theme attributes so theme-tokens data-theme selectors resolve
// (provides --success / --warning / --info defaults used by Tailwind bg-* classes).
// Tech debt: dark mode toggle is a separate plan; this only sets the default.
document.documentElement.setAttribute('data-theme', 'classic');
document.documentElement.setAttribute('data-mode', 'light');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
