import { TabShell } from './layouts/tab-shell';
import { HomePage } from './pages/home';
import { CategoryPage } from './pages/category';
import { CartPage } from './pages/cart';
import { ProfilePage } from './pages/profile';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { ForgotPasswordPage } from './pages/auth/forgot';
import { Placeholder } from './pages/placeholder';
import type { AuthRouteSpec, PageRouteSpec, TabKey, AuthPageKey } from './route-model';

interface TabViewProps {
  activeTab: TabKey;
  cartBadge: number;
  onTab: (tab: TabKey) => void;
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

export function TabView({ activeTab, cartBadge, onTab }: TabViewProps) {
  return (
    <TabShell activeTab={activeTab} cartBadge={cartBadge} onTab={onTab}>
      {renderTabPage(activeTab)}
    </TabShell>
  );
}

const AUTH_TITLES: Record<AuthPageKey, string> = {
  login: '登录',
  register: '注册',
  forgot: '忘记密码',
};

interface AuthViewProps {
  route: AuthRouteSpec;
  onBack: () => void;
  navigateAuth: (auth: AuthPageKey) => void;
  onLoggedIn: (returnTo?: string) => void;
  onReset: () => void;
}

export function AuthView({ route, onBack, navigateAuth, onLoggedIn, onReset }: AuthViewProps) {
  return (
    <div className="mall-app-shell nop-theme-root">
      <header className="mall-navbar">
        <button type="button" className="mall-navbar-side" onClick={onBack} aria-label="返回">
          ←
        </button>
        <span className="mall-navbar-title">{AUTH_TITLES[route.auth]}</span>
        <span className="mall-navbar-side" />
      </header>
      <main className="mall-app-main">
        {route.auth === 'login' ? (
          <LoginPage
            returnTo={route.returnTo}
            onBack={onBack}
            navigateAuth={navigateAuth}
            onLoggedIn={onLoggedIn}
          />
        ) : null}
        {route.auth === 'register' ? (
          <RegisterPage onBack={onBack} navigateAuth={navigateAuth} onLoggedIn={() => onLoggedIn()} />
        ) : null}
        {route.auth === 'forgot' ? (
          <ForgotPasswordPage onBack={onBack} navigateAuth={navigateAuth} onReset={onReset} />
        ) : null}
      </main>
    </div>
  );
}

export function PagePlaceholder({ route, onBack }: { route: PageRouteSpec; onBack: () => void }) {
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
        <Placeholder
          title={route.title ?? route.page}
          hint={`页面栈占位：page=${route.page}（push/pop）。M2+ 填充实体内容。`}
        />
      </main>
    </div>
  );
}
