import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { Toaster } from '@nop-chaos/ui';
import { App } from './App';
import './styles.css';

initFluxI18n();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>,
);
