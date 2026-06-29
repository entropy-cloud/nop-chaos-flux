import { PRODUCTS, CATEGORIES, CART_ITEMS, productCard } from './m5-mobile-showcase-schemas';

// ── 公共 tabbar footer（4 个按钮，每个通过 setValue 切换 scope 变量） ──

function tabbarFooter(activePath: string) {
  return {
    type: 'flex',
    justify: 'around',
    className: 'h-14',
    items: [
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '首页', icon: 'home', testid: 'tabbar-home', onClick: { action: 'setValue', args: { path: activePath, value: 'home' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '分类', icon: 'grid', testid: 'tabbar-category', onClick: { action: 'setValue', args: { path: activePath, value: 'category' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '购物车', icon: 'shopping-cart', testid: 'tabbar-cart', onClick: { action: 'setValue', args: { path: activePath, value: 'cart' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '我的', icon: 'user', testid: 'tabbar-profile', onClick: { action: 'setValue', args: { path: activePath, value: 'profile' } } },
    ],
  };
}

const TABBAR_CLASS = 'nop-tabbar fixed bottom-0 inset-x-0 nop-safe-bottom bg-background border-t z-50';

// ── 完整的单 JSON 应用 ──

export const APP_SCHEMA = {
  type: 'page',
  testid: 'showcase-app',
  data: { currentTab: 'home' },
  body: [
    {
      type: 'tabs',
      testid: 'showcase-app-tabs',
      valueOwnership: 'scope',
      valueStatePath: 'currentTab',
      items: [
        // ── 首页 tab ──
        {
          key: 'home',
          title: '首页',
          body: [
            {
              type: 'notice-bar',
              testid: 'showcase-home-notice',
              text: '🎉 全场满 500 减 50，限时优惠进行中！',
              variant: 'info',
              closable: true,
            },
            {
              type: 'tabs',
              testid: 'showcase-home-inner-tabs',
              items: [
                {
                  key: 'recommend',
                  title: '推荐',
                  body: [
                    {
                      type: 'pull-refresh',
                      testid: 'showcase-home-refresh',
                      threshold: 50,
                      pullingText: '下拉刷新',
                      loosingText: '释放立即刷新',
                      loadingText: '加载中...',
                      successText: '刷新成功',
                      body: PRODUCTS.map(productCard),
                    },
                  ],
                },
                {
                  key: 'hot',
                  title: '热门',
                  body: PRODUCTS.slice(2, 6).map(productCard),
                },
                {
                  key: 'new',
                  title: '新品',
                  body: PRODUCTS.filter((p) => p.tag === '新品').map(productCard),
                },
              ],
            },
          ],
        },
        // ── 分类 tab ──
        {
          key: 'category',
          title: '分类',
          body: [
            { type: 'text', text: '商品分类', className: 'font-bold p-3 pb-0' },
            {
              type: 'flex',
              direction: 'column',
              gap: 0,
              body: CATEGORIES.map((cat) => ({
                type: 'flex',
                justify: 'between',
                align: 'center',
                className: 'p-3 border-b border-border/40 nop-haptic',
                body: [
                  {
                    type: 'flex',
                    align: 'center',
                    gap: 12,
                    body: [
                      { type: 'icon', icon: cat.icon, className: 'text-primary' },
                      { type: 'text', text: cat.name, className: 'text-sm' },
                    ],
                  },
                  {
                    type: 'flex',
                    align: 'center',
                    gap: 4,
                    body: [
                      { type: 'text', text: `${cat.count}`, className: 'text-xs text-muted-foreground' },
                      { type: 'icon', icon: 'chevron-right', className: 'text-muted-foreground' },
                    ],
                  },
                ],
              })),
            },
          ],
        },
        // ── 购物车 tab ──
        {
          key: 'cart',
          title: '购物车',
          body: [
            {
              type: 'flex',
              justify: 'between',
              align: 'center',
              className: 'px-3 py-2',
              body: [
                { type: 'text', text: '', className: 'w-11' },
                { type: 'text', text: '购物车 (3)', className: 'flex-1 text-center font-medium' },
                { type: 'button', variant: 'ghost', label: '编辑' },
              ],
            },
            ...CART_ITEMS.map((item) => ({
              type: 'flex',
              gap: 12,
              align: 'center',
              className: 'p-3 border-b border-border/40',
              body: [
                { type: 'checkbox', name: `cart-${item.id}`, option: { label: '' }, className: 'shrink-0' },
                { type: 'image', src: item.img, alt: item.name, className: 'w-16 h-16 rounded-lg object-cover shrink-0' },
                {
                  type: 'flex',
                  direction: 'column',
                  gap: 4,
                  className: 'flex-1 min-w-0',
                  body: [
                    { type: 'text', text: item.name, className: 'text-sm font-medium truncate' },
                    { type: 'text', text: item.price, className: 'text-red-500 font-bold text-sm' },
                  ],
                },
                {
                  type: 'flex',
                  align: 'center',
                  gap: 8,
                  body: [
                    { type: 'button', label: '-', size: 'sm', variant: 'outline' },
                    { type: 'text', text: `${item.qty}`, className: 'text-sm w-6 text-center' },
                    { type: 'button', label: '+', size: 'sm', variant: 'outline' },
                  ],
                },
              ],
            })),
            {
              type: 'separator',
            },
            {
              type: 'flex',
              justify: 'between',
              align: 'center',
              className: 'px-3 py-2',
              body: [
                { type: 'checkbox', name: 'selectAll', option: { label: '全选' } },
                { type: 'flex', align: 'center', items: [{ type: 'text', text: '合计：', className: 'text-sm' }, { type: 'text', text: '¥11,297', className: 'text-red-500 font-bold' }] },
                { type: 'button', variant: 'default', label: '结算(3)', className: 'h-12 px-6 nop-haptic' },
              ],
            },
          ],
        },
        // ── 我的 tab ──
        {
          key: 'profile',
          title: '我的',
          body: [
            {
              type: 'flex',
              gap: 16,
              align: 'center',
              className: 'p-4 bg-gradient-to-r from-primary/10 to-primary/5',
              body: [
                { type: 'image', src: 'https://picsum.photos/seed/avatar/100/100', alt: '头像', className: 'w-16 h-16 rounded-full object-cover' },
                {
                  type: 'flex',
                  direction: 'column',
                  gap: 4,
                  body: [
                    { type: 'text', text: '张三', className: 'font-bold text-lg' },
                    { type: 'text', text: 'VIP 会员 · 积分 2,880', className: 'text-xs text-muted-foreground' },
                  ],
                },
              ],
            },
            {
              type: 'flex',
              justify: 'around',
              className: 'py-4 border-b border-border/40',
              body: [
                { type: 'flex', direction: 'column', align: 'center', body: [{ type: 'text', text: '3', className: 'font-bold text-lg' }, { type: 'text', text: '待付款', className: 'text-xs text-muted-foreground' }] },
                { type: 'flex', direction: 'column', align: 'center', body: [{ type: 'text', text: '1', className: 'font-bold text-lg' }, { type: 'text', text: '待发货', className: 'text-xs text-muted-foreground' }] },
                { type: 'flex', direction: 'column', align: 'center', body: [{ type: 'text', text: '2', className: 'font-bold text-lg' }, { type: 'text', text: '待收货', className: 'text-xs text-muted-foreground' }] },
                { type: 'flex', direction: 'column', align: 'center', body: [{ type: 'text', text: '0', className: 'font-bold text-lg' }, { type: 'text', text: '退换/售后', className: 'text-xs text-muted-foreground' }] },
              ],
            },
            { type: 'separator' },
            {
              type: 'collapse',
              testid: 'showcase-profile-collapse',
              items: [
                {
                  title: '📋 我的订单',
                  body: [{
                    type: 'flex', direction: 'column', gap: 8, className: 'p-2',
                    body: [
                      { type: 'flex', justify: 'between', align: 'center', body: [{ type: 'text', text: '订单 #20240101', className: 'text-sm' }, { type: 'text', text: '已发货', className: 'text-xs text-blue-500' }] },
                      { type: 'flex', justify: 'between', align: 'center', body: [{ type: 'text', text: '订单 #20240102', className: 'text-sm' }, { type: 'text', text: '已完成', className: 'text-xs text-green-500' }] },
                    ],
                  }],
                },
                {
                  title: '⚙️ 账户设置',
                  body: [{
                    type: 'flex', direction: 'column', gap: 0, className: 'p-2',
                    body: [
                      { type: 'flex', justify: 'between', align: 'center', className: 'py-2', body: [{ type: 'text', text: '通知设置', className: 'text-sm' }, { type: 'switch', name: 'notifications' }] },
                      { type: 'flex', justify: 'between', align: 'center', className: 'py-2', body: [{ type: 'text', text: '深色模式', className: 'text-sm' }, { type: 'switch', name: 'darkMode' }] },
                    ],
                  }],
                },
              ],
            },
            { type: 'separator' },
            {
              type: 'flex', direction: 'column', gap: 0,
              body: [
                { type: 'flex', justify: 'between', align: 'center', className: 'p-3', body: [{ type: 'text', text: '帮助中心', className: 'text-sm' }, { type: 'icon', icon: 'chevron-right', className: 'text-muted-foreground' }] },
                { type: 'flex', justify: 'between', align: 'center', className: 'p-3', body: [{ type: 'text', text: '联系客服', className: 'text-sm' }, { type: 'icon', icon: 'chevron-right', className: 'text-muted-foreground' }] },
                { type: 'flex', justify: 'between', align: 'center', className: 'p-3', body: [{ type: 'text', text: '关于我们', className: 'text-sm' }, { type: 'icon', icon: 'chevron-right', className: 'text-muted-foreground' }] },
              ],
            },
            { type: 'empty', testid: 'showcase-profile-empty', description: '暂无更多内容' },
          ],
        },
      ],
    },
  ],
  footerClassName: TABBAR_CLASS,
  footer: tabbarFooter('currentTab'),
};
