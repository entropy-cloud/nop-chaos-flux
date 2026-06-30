import { useCallback } from 'react';
import { useRoute, back } from './use-route';
import { activeTabFromRoute, type TabKey, type AuthPageKey } from './route-model';
import { useMallStore } from './store';
import { getAppEnv } from './env-instance';
import { TabView, AuthView, PagePlaceholder } from './router-views';

getAppEnv();

function applyReturnTo(returnTo?: string) {
  const dest = returnTo && returnTo !== '/' ? returnTo : '/tab/home';
  const normalized = dest.startsWith('#') ? dest.slice(1) : dest;
  window.location.hash = normalized;
}

export function App() {
  const [route, navigate] = useRoute();
  const cartBadge = useMallStore((s) => s.cartBadge);

  const onTab = useCallback(
    (tab: TabKey) => navigate({ kind: 'tab', tab }, { replace: true }),
    [navigate],
  );
  const navigateAuth = useCallback(
    (auth: AuthPageKey, returnTo?: string) =>
      navigate({ kind: 'auth', auth, ...(returnTo ? { returnTo } : {}) }),
    [navigate],
  );
  const onLoggedIn = useCallback((returnTo?: string) => applyReturnTo(returnTo), []);
  const onReset = useCallback(() => navigate({ kind: 'auth', auth: 'login' }), [navigate]);

  if (route.kind === 'auth') {
    return (
      <AuthView
        route={route}
        onBack={back}
        navigateAuth={navigateAuth}
        onLoggedIn={onLoggedIn}
        onReset={onReset}
      />
    );
  }

  if (route.kind === 'page') {
    return <PagePlaceholder route={route} onBack={back} />;
  }

  return <TabView activeTab={activeTabFromRoute(route)} cartBadge={cartBadge} onTab={onTab} />;
}
