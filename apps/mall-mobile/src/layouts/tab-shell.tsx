import type { ReactNode } from 'react';
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import type { TabKey } from '../route-model';
import { TAB_ORDER, TAB_META } from '../route-model';

interface TabShellProps {
  activeTab: TabKey;
  cartBadge: number;
  onTab: (tab: TabKey) => void;
  children: ReactNode;
}

const TAB_ICONS: Record<TabKey, typeof Home> = {
  home: Home,
  category: LayoutGrid,
  cart: ShoppingCart,
  profile: User,
};

export function TabShell({ activeTab, cartBadge, onTab, children }: TabShellProps) {
  return (
    <div className="mall-app-shell nop-theme-root">
      <main className="mall-app-main">{children}</main>
      <nav className="mall-tabbar" style={{ gridTemplateColumns: `repeat(${TAB_ORDER.length}, 1fr)` }}>
        {TAB_ORDER.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const isActive = tab === activeTab;
          const meta = TAB_META[tab];
          return (
            <button
              key={tab}
              type="button"
              className={`mall-tabbar-item${isActive ? ' is-active' : ''}`}
              onClick={() => onTab(tab)}
              aria-label={meta.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="mall-tabbar-icon">
                <Icon size={22} />
              </span>
              <span className="mall-tabbar-label">{meta.label}</span>
              {tab === 'cart' && cartBadge > 0 ? (
                <span className="mall-tabbar-badge" aria-label={`购物车 ${cartBadge} 件`}>
                  {cartBadge > 99 ? '99+' : cartBadge}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>
    </div>
  );
}
