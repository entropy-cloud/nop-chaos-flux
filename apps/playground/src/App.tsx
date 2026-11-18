import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import { createDefaultRegistry } from '@nop-chaos/flux-react';
import { DOMAIN_ROUTE_PAGES } from './domain-route-pages.js';
import { HomePage } from './pages/home-page';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { registerGraphRenderers } from '@nop-chaos/flux-renderers-graph';
import { registerMapRenderers } from '@nop-chaos/flux-renderers-map';
import { registerPivotRenderers } from '@nop-chaos/flux-renderers-pivot';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';
// Editor registration via `/editor` subpath (NOT main entry) — preserves bundle isolation:
// `@leafer-in/editor` stays out of the runtime `scada-canvas` bundle (design-architecture.md §4.4.1).
import { registerScadaEditorRenderers } from '@nop-chaos/flux-renderers-industrial/editor';

import { ThemeSwitcher } from './theme-switcher';
import { Toaster } from '@nop-chaos/ui';

import { ComponentLabPage } from './component-lab';
import { ComplexPagesShowcase } from './complex-pages';
import { AiGalleryPage } from './ai-gallery';
import { useRoute } from './use-route';
import type { RouteSpec } from './route-model';
import { readDiagnosticsEnabled } from './route-model';
import { Spinner } from '@nop-chaos/ui';

// Lazy-loaded: page-designer chunk pulls in the designer two-package stack plus a
// self-held renderer registry — only loaded on #/page-designer (S1 §11.1 keeps the
// main playground bundle free of designer code).
// Lazy-loaded: pulls in Tiptap/ProseMirror (~100KB) — only loaded when the
// user navigates to #/ai-rich-text. Keeps the main bundle Tiptap-free (mirrors
// the `./rich-text` opt-in subpath isolation at the app level).
// Lazy-loaded: pulls in leafer-ui canvas runtime (~heavy, requires browser CanvasRenderingContext2D) —
// only loaded when the user navigates to #/leafer-examples. Keeps the main bundle + App unit tests
// leafer-ui-free (mirrors report-designer / debugger-lab lazy isolation).
// Lazy-loaded: pulls in three.js WebGL runtime (~heavy, requires browser WebGLRenderingContext) —
// only loaded when the user navigates to #/three-canvas-demo (same isolation applies to
// #/three-industrial-demo, plan 534). Keeps the main bundle + App unit tests
// three-free (mirrors report-designer / debugger-lab / leafer-examples lazy isolation).
const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerMobileRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);
registerSchedulingRenderers(registry);
registerGraphRenderers(registry);
registerMapRenderers(registry);
registerPivotRenderers(registry);
registerScadaRenderers(registry);
registerScadaEditorRenderers(registry);

if (__FLUX_DEVTOOLS__ && typeof window !== 'undefined' && typeof window.__NOP_DEBUGGER__ === 'undefined') {
  window.__NOP_DEBUGGER__ = {
    enabled: true,
    defaultOpen: false,
    defaultTab: 'timeline',
    // ux-r6 G-1：默认停靠左下角，不占页面 header 区
    dock: 'bottom-left',
  };
}

// M7 production diagnostics: in trimmed bundles `__FLUX_DEVTOOLS__` is false,
// `devtoolsReady` resolves null, and route pages simply do not render (the
// shell owns the only user-visible chrome) — no same-shape stub is needed
// because nothing consumes a controller before the kernel lands.

// The real controller is delivered through `devtoolsReady` — a mutable module
// `let` re-assigned in an import callback is invisible to React's render model
// and to the React Compiler's memoization (treated as an immutable module
// binding), so consumers reading the variable after the load would still see
// the stub. The promise payload is the only trustworthy handoff channel.
const devtoolsReady: Promise<{ panel: (props: { controller: NopDebuggerController }) => ReactNode; controller: NopDebuggerController } | null> = __FLUX_DEVTOOLS__
  ? import('@nop-chaos/nop-debugger').then((module) => {
      const controller = module.createNopDebugger({
        id: 'playground-main',
        capturePerformance: false,
        exposeAutomationApi: true,
      });
      return { panel: module.NopDebuggerPanel, controller };
    })
  : Promise.resolve(null);

/** Lazily mounts the debugger panel once the kernel module loads (dev/test only). */
function DevToolsHost() {
  const [panelState, setPanelState] = useState<{ panel: (props: { controller: NopDebuggerController }) => ReactNode; controller: NopDebuggerController } | null>(null);
  useEffect(() => {
    if (!__FLUX_DEVTOOLS__) return;
    void devtoolsReady.then((ready) => {
      if (ready) setPanelState(ready);
    });
  }, []);
  if (!panelState) return null;
  return <panelState.panel controller={panelState.controller} />;
}

// Route pages receive the controller as a prop captured at render time. The
// kernel loads asynchronously, so the route host renders NOTHING until the
// readiness promise lands: pages mount exactly once, directly with the real
// controller. Two shapes are explicitly wrong here — (1) mounting pages on the
// stub and re-rendering later is an interaction race (pages may have focused /
// clicked / built fixture DOM when the tree re-renders under them); (2) React
// `use(devtoolsReady)` suspension does not settle reliably under the RTL/jsdom
// test environment (minimal `use(promise)` repro times out), so the handoff
// must be plain state + effect.
function RouteHost({ route, navigate }: { route: RouteSpec; navigate: (spec: RouteSpec) => void }) {
  const [controller, setController] = useState<NopDebuggerController | null>(null);
  useEffect(() => {
    if (!__FLUX_DEVTOOLS__) return;
    void devtoolsReady.then((ready) => {
      if (ready) setController(ready.controller);
    });
  }, []);
  if (!controller) return null;
  return <>{renderPage(route, navigate, controller)}</>;
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner />
    </div>
  );
}

interface RouteErrorBoundaryProps {
  /** Route identity; a change resets a caught error so navigation recovers. */
  routeKey: string;
  children: ReactNode;
}

/**
 * Shell-level guard around the lazy route outlet (R3-U5): a failed/stale chunk
 * after a redeploy renders a reload fallback instead of a white screen.
 */
class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    if (this.state.error && prevProps.routeKey !== this.props.routeKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center"
          data-testid="route-error-boundary"
          role="alert"
        >
          <p className="text-lg font-medium">{t('flux.app.routeErrorTitle')}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t('flux.app.routeErrorDescription')}
          </p>
          <Button type="button" onClick={() => window.location.reload()}>
            {t('flux.app.routeErrorReload')}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function DomainNotFound({ domainId, onBack }: { domainId: string; onBack: () => void }) {
  return (
    <div
      className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center"
      data-testid="domain-not-found"
    >
      <p className="text-lg font-medium">{t('flux.app.domainNotFoundTitle', { domain: domainId })}</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {t('flux.app.domainNotFoundDescription')}
      </p>
      <Button type="button" onClick={onBack}>
        {t('flux.app.backHome')}
      </Button>
    </div>
  );
}

function renderPage(route: RouteSpec, navigate: (spec: RouteSpec) => void, debuggerController: NopDebuggerController) {
  const goHome = () => navigate({ kind: 'home' });
  const diagnosticsEnabled =
    typeof window !== 'undefined' ? readDiagnosticsEnabled(window.location.search) : false;

  switch (route.kind) {
    case 'home':
      return (
        <HomePage
          onNavigate={(target) => {
            if (target.kind === 'lab') {
              navigate({ kind: 'lab' });
            } else if (target.kind === 'showcase') {
              navigate({ kind: 'showcase' });
            } else if (target.kind === 'ai-gallery') {
              navigate({ kind: 'ai-gallery' });
            } else {
              navigate({ kind: 'domain', domainId: target.domainId });
            }
          }}
        />
      );
    case 'lab':
      return (
        <ComponentLabPage
          activeRendererId={null}
          onSelectRenderer={(id) => navigate({ kind: 'lab-renderer', rendererId: id })}
          onBack={goHome}
        />
      );
    case 'lab-renderer':
      return (
        <ComponentLabPage
          activeRendererId={route.rendererId}
          onSelectRenderer={(id) => navigate({ kind: 'lab-renderer', rendererId: id })}
          onBack={goHome}
        />
      );
    case 'showcase':
      return (
        <ComplexPagesShowcase
          activePageId={null}
          onSelectPage={(id) => navigate({ kind: 'showcase-page', pageId: id })}
          onBack={goHome}
        />
      );
    case 'showcase-page':
      return (
        <ComplexPagesShowcase
          activePageId={route.pageId}
          onSelectPage={(id) => navigate({ kind: 'showcase-page', pageId: id })}
          onBack={goHome}
        />
      );
    case 'ai-gallery':
      return (
        <AiGalleryPage
          activeDemoId={null}
          onSelectDemo={(id) => navigate({ kind: 'ai-gallery-demo', demoId: id })}
          onBack={goHome}
        />
      );
    case 'ai-gallery-demo':
      return (
        <AiGalleryPage
          activeDemoId={route.demoId}
          onSelectDemo={(id) => navigate({ kind: 'ai-gallery-demo', demoId: id })}
          onBack={goHome}
        />
      );
    case 'domain': {
      const renderDomain = DOMAIN_ROUTE_PAGES[route.domainId];
      return renderDomain ? (
        renderDomain({ debuggerController, goHome, diagnosticsEnabled })
      ) : (
        <DomainNotFound domainId={route.domainId} onBack={goHome} />
      );
    }
  }
}

export function App() {
  const [route, navigate] = useRoute();
  // Full route identity (kind + every discriminated id) — a tripped boundary
  // must reset on ANY navigation, including same-kind id switches like
  // #/lab/form → #/lab/button.
  const routeKey = JSON.stringify(route);

  return (
    <div className="nop-theme-root">
      <RouteErrorBoundary routeKey={routeKey}>
        <Suspense fallback={<PageFallback />}>
          <RouteHost route={route} navigate={navigate} />
        </Suspense>
      </RouteErrorBoundary>
      <ThemeSwitcher />
      <DevToolsHost />
      {/* Host-channels contract (plan 512 L3.4): the app shell owns the ONLY
         persistent <Toaster/> — route swaps must not kill in-flight toasts.
         Page/host components must not mount their own. */}
      <Toaster />
    </div>
  );
}

// M7 production diagnostics: `__FLUX_DEVTOOLS__` is a vite define macro —
// production builds replace it with `false`, trimming the full debugger kernel
// to a same-shape no-op controller (see scripts/check-devtools-tree-shake.mjs).
declare const __FLUX_DEVTOOLS__: boolean;
