import type { ReactNode } from 'react';
import { back } from '../use-route';

export interface PageShellProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function PageShell({ title, children, footer }: PageShellProps) {
  return (
    <div className="mall-app-shell nop-theme-root">
      <header className="mall-navbar">
        <button type="button" className="mall-navbar-side" onClick={back} aria-label="返回">
          ←
        </button>
        <span className="mall-navbar-title">{title}</span>
        <span className="mall-navbar-side" />
      </header>
      <main className="mall-app-main mall-page">{children}</main>
      {footer}
    </div>
  );
}
