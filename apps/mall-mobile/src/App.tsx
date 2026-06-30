import { useCallback } from 'react';
import { useRoute, back } from './use-route';
import { activeTabFromRoute, type TabKey, type AuthPageKey } from './route-model';
import { useMallStore } from './store';
import { getAppEnv } from './env-instance';
import { TabView, AuthPlaceholder, PagePlaceholder } from './router-views';

getAppEnv();

export function App() {
  const [route, navigate] = useRoute();
  const cartBadge = useMallStore((s) => s.cartBadge);

  const onTab = useCallback((tab: TabKey) => navigate({ kind: 'tab', tab }, { replace: true }), [navigate]);
  const navigateAuth = useCallback(
    (auth: AuthPageKey) => navigate({ kind: 'auth', auth }),
    [navigate],
  );

  if (route.kind === 'auth') {
    return (
      <AuthPlaceholder
        route={route}
        onBack={back}
        navigateAuth={navigateAuth}
        onLogin={() => {
          useMallStore.getState().setAuth({
            accessToken: 'stub-token',
            userInfo: { userId: 'stub', userName: 'stub' },
          });
          const dest = route.returnTo && route.returnTo !== '/' ? route.returnTo : '/tab/home';
          const target = dest.startsWith('#') ? dest : `#${dest}`;
          window.location.hash = target.startsWith('#') ? target.slice(1) : target;
        }}
      />
    );
  }

  if (route.kind === 'page') {
    return <PagePlaceholder route={route} onBack={back} />;
  }

  return (
    <TabView
      activeTab={activeTabFromRoute(route)}
      cartBadge={cartBadge}
      onTab={onTab}
      onBack={back}
      navigateAuth={navigateAuth}
      onLogin={() => navigateAuth('login')}
    />
  );
}
