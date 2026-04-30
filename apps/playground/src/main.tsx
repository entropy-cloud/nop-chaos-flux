import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { App } from './app';
import '@nop-chaos/ui/styles.css';
import './styles.css';

// Initialize i18n before rendering
initFluxI18n();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
