import { TabShell } from './layouts/tab-shell';
import { HomePage } from './pages/home';
import { CategoryPage } from './pages/category';
import { CartPage } from './pages/cart';
import { ProfilePage } from './pages/profile';
import { Placeholder } from './pages/placeholder';
import type { AuthRouteSpec, PageRouteSpec, TabKey } from './route-model';

interface RouterDeps {
  activeTab: TabKey;
  cartBadge: number;
  onTab: (tab: TabKey) => void;
  onBack: () => void;
  navigateAuth: (auth: 'login' | 'register' | 'forgot') => void;
  onLogin: () => void;
}

function renderTabPage(tab: TabKey) {
  switch (tab) {
    case 'home':
      return <HomePage />;
    case 'category':
      return <CategoryPage />;
    case 'cart':
      return <CartPage />;
    case 'profile':
      return <ProfilePage />;
  }
}

export function TabView(deps: RouterDeps) {
  return (
    <TabShell activeTab={deps.activeTab} cartBadge={deps.cartBadge} onTab={deps.onTab}>
      {renderTabPage(deps.activeTab)}
    </TabShell>
  );
}

export function AuthPlaceholder({
  route,
  onBack,
  navigateAuth,
  onLogin,
}: {
  route: AuthRouteSpec;
  onBack: () => void;
  navigateAuth: (auth: 'login' | 'register' | 'forgot') => void;
  onLogin: () => void;
}) {
  const titles: Record<AuthRouteSpec['auth'], string> = {
    login: '登录',
    register: '注册',
    forgot: '忘记密码',
  };
  return (
    <div className="mall-app-shell nop-theme-root">
      <header className="mall-navbar">
        <button type="button" className="mall-navbar-side" onClick={onBack} aria-label="返回">
          ←
        </button>
        <span className="mall-navbar-title">{titles[route.auth]}</span>
        <span className="mall-navbar-side" />
      </header>
      <main className="mall-app-main mall-page">
        <Placeholder
          title={titles[route.auth]}
          hint={`Phase 3 将落地 ${titles[route.auth]} 表单（消费 LoginApi）。returnTo=${route.returnTo ?? '/'}（登录后回到原意图）。`}
        />
        <div className="mt-4 flex flex-col gap-2">
          {route.auth !== 'login' && (
            <button type="button" className="mall-touch-target" onClick={() => navigateAuth('login')}>
              去登录
            </button>
          )}
          {route.auth !== 'register' && (
            <button type="button" className="mall-touch-target" onClick={() => navigateAuth('register')}>
              去注册
            </button>
          )}
          {route.auth !== 'forgot' && (
            <button type="button" className="mall-touch-target" onClick={() => navigateAuth('forgot')}>
              忘记密码
            </button>
          )}
          <button type="button" className="mall-touch-target" onClick={onLogin}>
            模拟登录（写入 store，测试半游客编排）
          </button>
        </div>
      </main>
    </div>
  );
}

export function PagePlaceholder({
  route,
  onBack,
}: {
  route: PageRouteSpec;
  onBack: () => void;
}) {
  return (
    <div className="mall-app-shell nop-theme-root">
      <header className="mall-navbar">
        <button type="button" className="mall-navbar-side" onClick={onBack} aria-label="返回">
          ←
        </button>
        <span className="mall-navbar-title">{route.title ?? route.page}</span>
        <span className="mall-navbar-side" />
      </header>
      <main className="mall-app-main mall-page">
        <Placeholder title={route.title ?? route.page} hint={`页面栈占位：page=${route.page}（push/pop）。M2+ 填充实体内容。`} />
      </main>
    </div>
  );
}
