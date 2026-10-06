import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
// leafer animate 插件全局注册（plan 530 S1 D-530-1）：scada 交互覆盖物的 `set(data, transition)`
// 120ms 过渡依赖本插件重写；未加载宿主侧覆盖物即时终态（契约降级路径）。
import '@leafer-in/animate';
import { App } from './App';
import { applyTheme, readStoredTheme } from './theme';
import '@nop-chaos/ui/styles.css';
import './styles.css';

// Initialize i18n before rendering
initFluxI18n();

// Mount theme attributes before render so theme-tokens data-theme/data-mode
// selectors resolve. The persisted (or default classic/light) state comes from
// the runtime theme switcher in App (G-I, plan 471 V1-F3).
applyTheme(readStoredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
