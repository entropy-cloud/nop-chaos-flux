export const PRODUCTS = [
  { id: '1', name: 'iPhone 15 Pro', price: '¥8,999', tag: '新品', img: 'https://picsum.photos/seed/p1/200/200' },
  { id: '2', name: 'MacBook Air M3', price: '¥12,999', tag: '', img: 'https://picsum.photos/seed/p2/200/200' },
  { id: '3', name: 'AirPods Pro 2', price: '¥1,899', tag: '热卖', img: 'https://picsum.photos/seed/p3/200/200' },
  { id: '4', name: 'iPad mini', price: '¥4,999', tag: '', img: 'https://picsum.photos/seed/p4/200/200' },
  { id: '5', name: 'Apple Watch Ultra', price: '¥6,299', tag: '新品', img: 'https://picsum.photos/seed/p5/200/200' },
  { id: '6', name: 'HomePod mini', price: '¥749', tag: '', img: 'https://picsum.photos/seed/p6/200/200' },
];

export function productCard(p: (typeof PRODUCTS)[number]) {
  return {
    type: 'flex' as const,
    gap: 12,
    align: 'center',
    className: 'p-3 border-b border-border/40',
    body: [
      { type: 'image' as const, src: p.img, alt: p.name, className: 'w-16 h-16 rounded-lg object-cover shrink-0' },
      {
        type: 'flex' as const,
        direction: 'column' as const,
        gap: 4,
        className: 'flex-1 min-w-0',
        body: [
          {
            type: 'flex' as const,
            align: 'center' as const,
            gap: 6,
            body: [
              { type: 'text' as const, text: p.name, className: 'font-medium text-sm truncate' },
              ...(p.tag ? [{ type: 'badge' as const, text: p.tag, level: 'danger' as const }] : []),
            ],
          },
          { type: 'text' as const, text: p.price, className: 'text-red-500 font-bold text-sm' },
        ],
      },
      { type: 'button' as const, label: '加入购物车', size: 'sm' as const, className: 'shrink-0' },
    ],
  };
}

// ── Tab 1: 首页 — 电商信息流 ──

export const HOME_PAGE_SCHEMA = {
  type: 'page',
  testid: 'showcase-page-home',
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
      testid: 'showcase-home-tabs',
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
              body: PRODUCTS.slice(0, 4).map(productCard),
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
  footerClassName: 'nop-tabbar fixed bottom-0 inset-x-0 nop-safe-bottom bg-background border-t z-50',
  footer: {
    type: 'flex',
    justify: 'around',
    className: 'h-14',
    items: [
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '首页', icon: 'home', onClick: { action: 'navigate', args: { url: '/home' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '分类', icon: 'grid', onClick: { action: 'navigate', args: { url: '/discover' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '购物车', icon: 'shopping-cart', onClick: { action: 'navigate', args: { url: '/cart' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '我的', icon: 'user', onClick: { action: 'navigate', args: { url: '/profile' } } },
    ],
  },
};

// ── Tab 2: 发现 — 滑动操作 + 倒计时 ──

const FLASH_SALE_ITEMS = [
  { id: 'f1', name: '蓝牙耳机', price: '¥99', original: '¥299' },
  { id: 'f2', name: '充电宝 20000mAh', price: '¥79', original: '¥199' },
  { id: 'f3', name: '手机壳', price: '¥19', original: '¥59' },
];

export const DISCOVER_PAGE_SCHEMA = {
  type: 'page',
  testid: 'showcase-page-discover',
  body: [
    {
      type: 'notice-bar',
      testid: 'showcase-discover-notice',
      text: '🔥 限时秒杀进行中，倒计时结束即恢复原价！',
      variant: 'warning',
      scrollable: true,
      speed: 50,
    },
    {
      type: 'flex',
      justify: 'between',
      align: 'center',
      className: 'px-3 py-2',
      body: [
        { type: 'text', text: '⚡ 限时秒杀', className: 'font-bold' },
        {
          type: 'flex',
          align: 'center',
          gap: 4,
          body: [
            { type: 'text', text: '距结束', className: 'text-xs text-muted-foreground' },
            { type: 'countdown', testid: 'showcase-discover-countdown', time: 3600_000, format: 'HH:mm:ss' },
          ],
        },
      ],
    },
    ...FLASH_SALE_ITEMS.map((item) => ({
      type: 'swipe-cell' as const,
      testid: `showcase-discover-swipe-${item.id}`,
      threshold: 30,
      closeOnOutside: true,
      body: [
        {
          type: 'flex' as const,
          gap: 12,
          align: 'center',
          className: 'p-3',
          body: [
            {
              type: 'flex' as const,
              direction: 'column' as const,
              gap: 4,
              className: 'flex-1',
              body: [
                { type: 'text' as const, text: item.name, className: 'font-medium text-sm' },
                {
                  type: 'flex' as const,
                  align: 'center' as const,
                  gap: 8,
                  body: [
                    { type: 'text' as const, text: item.price, className: 'text-red-500 font-bold text-sm' },
                    { type: 'text' as const, text: item.original, className: 'text-xs text-muted-foreground line-through' },
                  ],
                },
              ],
            },
            { type: 'button' as const, label: '抢购', variant: 'destructive' as const, size: 'sm' as const },
          ],
        },
      ],
      right: [
        { type: 'button' as const, label: '收藏', variant: 'outline' as const, size: 'sm' as const },
        { type: 'button' as const, label: '删除', variant: 'destructive' as const, size: 'sm' as const },
      ],
    })),
    { type: 'separator', label: '推荐好物' },
    {
      type: 'swipe-cell',
      testid: 'showcase-discover-swipe-left',
      threshold: 30,
      closeOnOutside: true,
      body: [
        {
          type: 'flex',
          gap: 12,
          align: 'center',
          className: 'p-3 border-b border-border/40',
          body: [
            { type: 'image', src: 'https://picsum.photos/seed/rec1/100/100', alt: '推荐', className: 'w-12 h-12 rounded-lg object-cover' },
            { type: 'text', text: '向右滑动可置顶', className: 'text-sm flex-1' },
          ],
        },
      ],
      left: [
        { type: 'button', label: '置顶', variant: 'outline', size: 'sm' },
      ],
    },
  ],
  footerClassName: 'nop-tabbar fixed bottom-0 inset-x-0 nop-safe-bottom bg-background border-t z-50',
  footer: {
    type: 'flex',
    justify: 'around',
    className: 'h-14',
    items: [
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '首页', icon: 'home', onClick: { action: 'navigate', args: { url: '/home' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '分类', icon: 'grid', onClick: { action: 'navigate', args: { url: '/discover' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '购物车', icon: 'shopping-cart', onClick: { action: 'navigate', args: { url: '/cart' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '我的', icon: 'user', onClick: { action: 'navigate', args: { url: '/profile' } } },
    ],
  },
};

// ── Tab 3: 表单 — 触摸友好表单 ──

export const FORM_PAGE_SCHEMA = {
  type: 'page',
  testid: 'showcase-page-form',
  toolbarClassName: 'nop-navbar sticky top-0 nop-safe-top bg-background z-50',
  header: {
    type: 'flex',
    justify: 'between',
    align: 'center',
    className: 'h-11 px-3',
    items: [
      { type: 'button', variant: 'ghost', icon: 'arrow-left', className: 'w-11 h-11 nop-haptic' },
      { type: 'text', text: '填写订单', className: 'flex-1 text-center font-medium' },
      { type: 'text', text: '', className: 'w-11' },
    ],
  },
  body: [
    {
      type: 'form',
      testid: 'showcase-form',
      data: {
        name: '',
        phone: '',
        email: '',
        address: '',
        gender: '',
        agree: false,
        quantity: 1,
      },
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 0,
          className: 'bg-background',
          body: [
            { type: 'input-text', name: 'name', label: '收货人', placeholder: '请输入姓名', required: true },
            { type: 'input-text', name: 'phone', label: '手机号', placeholder: '请输入手机号', inputMode: 'tel', required: true },
            { type: 'input-email', name: 'email', label: '邮箱', placeholder: '请输入邮箱' },
            { type: 'textarea', name: 'address', label: '详细地址', placeholder: '请输入省市区及详细地址' },
          ],
        },
        { type: 'separator' },
        {
          type: 'flex',
          direction: 'column',
          gap: 0,
          className: 'bg-background',
          body: [
            {
              type: 'radio-group',
              name: 'gender',
              label: '性别',
              options: [
                { label: '男', value: 'male' },
                { label: '女', value: 'female' },
                { label: '保密', value: 'other' },
              ],
            },
            { type: 'input-number', name: 'quantity', label: '购买数量', placeholder: '请选择数量' },
          ],
        },
        { type: 'separator' },
        {
          type: 'flex',
          direction: 'column',
          gap: 0,
          className: 'bg-background',
          body: [
            { type: 'checkbox', name: 'agree', label: '同意', option: { label: '我已阅读并同意《用户协议》和《隐私政策》' } },
            { type: 'switch', name: 'notify', label: '接收订单通知' },
          ],
        },
        { type: 'separator' },
        {
          type: 'flex',
          direction: 'column',
          gap: 8,
          className: 'p-3',
          body: [
            { type: 'steps', testid: 'showcase-form-steps', value: 1, items: [{ title: '填写信息', description: '当前' }, { title: '确认订单', description: '' }, { title: '完成支付', description: '' }] },
          ],
        },
      ],
    },
  ],
  footerClassName: 'nop-submit-bar fixed bottom-0 inset-x-0 h-14 nop-safe-bottom bg-background border-t px-3 z-50',
  footer: {
    type: 'flex',
    align: 'center',
    justify: 'between',
    items: [
      { type: 'flex', align: 'center', items: [{ type: 'text', text: '合计：', className: 'text-sm' }, { type: 'text', text: '¥8,999', className: 'text-red-500 font-bold' }] },
      { type: 'button', variant: 'default', label: '提交订单', className: 'h-12 px-8 nop-haptic', testid: 'showcase-form-submit' },
    ],
  },
};

// ── Tab 4: 我的 — 个人中心 ──

export const PROFILE_PAGE_SCHEMA = {
  type: 'page',
  testid: 'showcase-page-profile',
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
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 8,
              className: 'p-2',
              body: [
                {
                  type: 'flex',
                  justify: 'between',
                  align: 'center',
                  body: [
                    { type: 'text', text: '订单 #20240101', className: 'text-sm' },
                    { type: 'status', value: 'shipped', labelMap: { shipped: '已发货', pending: '待发货', completed: '已完成' }, levelMap: { shipped: 'info', pending: 'warning', completed: 'success' } },
                  ],
                },
                {
                  type: 'flex',
                  justify: 'between',
                  align: 'center',
                  body: [
                    { type: 'text', text: '订单 #20240102', className: 'text-sm' },
                    { type: 'status', value: 'completed', labelMap: { shipped: '已发货', pending: '待发货', completed: '已完成' }, levelMap: { shipped: 'info', pending: 'warning', completed: 'success' } },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: '⚙️ 账户设置',
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 0,
              className: 'p-2',
              body: [
                {
                  type: 'flex',
                  justify: 'between',
                  align: 'center',
                  className: 'py-2',
                  body: [
                    { type: 'text', text: '通知设置', className: 'text-sm' },
                    { type: 'switch', name: 'notifications', testid: 'showcase-profile-notify' },
                  ],
                },
                {
                  type: 'flex',
                  justify: 'between',
                  align: 'center',
                  className: 'py-2',
                  body: [
                    { type: 'text', text: '深色模式', className: 'text-sm' },
                    { type: 'switch', name: 'darkMode' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    { type: 'separator' },
    {
      type: 'flex',
      direction: 'column',
      gap: 0,
      className: 'bg-background',
      body: [
        {
          type: 'flex',
          justify: 'between',
          align: 'center',
          className: 'p-3',
          body: [
            { type: 'text', text: '帮助中心', className: 'text-sm' },
            { type: 'icon', icon: 'chevron-right', className: 'text-muted-foreground' },
          ],
        },
        {
          type: 'flex',
          justify: 'between',
          align: 'center',
          className: 'p-3',
          body: [
            { type: 'text', text: '联系客服', className: 'text-sm' },
            { type: 'icon', icon: 'chevron-right', className: 'text-muted-foreground' },
          ],
        },
        {
          type: 'flex',
          justify: 'between',
          align: 'center',
          className: 'p-3',
          body: [
            { type: 'text', text: '关于我们', className: 'text-sm' },
            { type: 'icon', icon: 'chevron-right', className: 'text-muted-foreground' },
          ],
        },
      ],
    },
    { type: 'separator' },
    { type: 'empty', testid: 'showcase-profile-empty', description: '暂无更多内容' },
  ],
  footerClassName: 'nop-tabbar fixed bottom-0 inset-x-0 nop-safe-bottom bg-background border-t z-50',
  footer: {
    type: 'flex',
    justify: 'around',
    className: 'h-14',
    items: [
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '首页', icon: 'home', onClick: { action: 'navigate', args: { url: '/home' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '分类', icon: 'grid', onClick: { action: 'navigate', args: { url: '/discover' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '购物车', icon: 'shopping-cart', onClick: { action: 'navigate', args: { url: '/cart' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '我的', icon: 'user', onClick: { action: 'navigate', args: { url: '/profile' } } },
    ],
  },
};

// ── 分类页 ──

export const CATEGORIES = [
  { name: '手机数码', icon: 'smartphone', count: 128 },
  { name: '电脑办公', icon: 'laptop', count: 86 },
  { name: '家用电器', icon: 'tv', count: 204 },
  { name: '服饰鞋包', icon: 'shirt', count: 312 },
  { name: '食品饮料', icon: 'coffee', count: 156 },
  { name: '美妆个护', icon: 'sparkles', count: 98 },
  { name: '运动户外', icon: 'dumbbell', count: 67 },
  { name: '图书文具', icon: 'book-open', count: 245 },
];

export const CATEGORY_PAGE_SCHEMA = {
  type: 'page',
  testid: 'showcase-page-category',
  toolbarClassName: 'nop-navbar sticky top-0 nop-safe-top bg-background z-50',
  header: {
    type: 'flex',
    justify: 'between',
    align: 'center',
    className: 'h-11 px-3',
    items: [
      { type: 'text', text: '', className: 'w-11' },
      { type: 'text', text: '商品分类', className: 'flex-1 text-center font-medium' },
      { type: 'icon', icon: 'search', className: 'w-11 h-11 nop-haptic flex items-center justify-end' },
    ],
  },
  body: [
    {
      type: 'flex',
      direction: 'column',
      gap: 0,
      className: 'bg-background',
      body: CATEGORIES.map((cat) => ({
        type: 'flex' as const,
        justify: 'between' as const,
        align: 'center' as const,
        className: 'p-3 border-b border-border/40 nop-haptic',
        body: [
          {
            type: 'flex' as const,
            align: 'center' as const,
            gap: 12,
            body: [
              { type: 'icon' as const, icon: cat.icon, className: 'text-primary' },
              { type: 'text' as const, text: cat.name, className: 'text-sm' },
            ],
          },
          {
            type: 'flex' as const,
            align: 'center' as const,
            gap: 4,
            body: [
              { type: 'text' as const, text: `${cat.count}`, className: 'text-xs text-muted-foreground' },
              { type: 'icon' as const, icon: 'chevron-right', className: 'text-muted-foreground' },
            ],
          },
        ],
      })),
    },
  ],
  footerClassName: 'nop-tabbar fixed bottom-0 inset-x-0 nop-safe-bottom bg-background border-t z-50',
  footer: {
    type: 'flex',
    justify: 'around',
    className: 'h-14',
    items: [
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '首页', icon: 'home', onClick: { action: 'navigate', args: { url: '/home' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '分类', icon: 'grid', onClick: { action: 'navigate', args: { url: '/discover' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '购物车', icon: 'shopping-cart', onClick: { action: 'navigate', args: { url: '/cart' } } },
      { type: 'button', variant: 'ghost', className: 'flex-col h-14 w-16 nop-haptic', label: '我的', icon: 'user', onClick: { action: 'navigate', args: { url: '/profile' } } },
    ],
  },
};

// ── 购物车页 ──

export const CART_ITEMS = [
  { id: 'c1', name: 'iPhone 15 Pro', price: '¥8,999', qty: 1, img: 'https://picsum.photos/seed/c1/100/100' },
  { id: 'c2', name: 'AirPods Pro 2', price: '¥1,899', qty: 2, img: 'https://picsum.photos/seed/c2/100/100' },
  { id: 'c3', name: 'MagSafe 充电器', price: '¥399', qty: 1, img: 'https://picsum.photos/seed/c3/100/100' },
];

export const CART_PAGE_SCHEMA = {
  type: 'page',
  testid: 'showcase-page-cart',
  toolbarClassName: 'nop-navbar sticky top-0 nop-safe-top bg-background z-50',
  header: {
    type: 'flex',
    justify: 'between',
    align: 'center',
    className: 'h-11 px-3',
    items: [
      { type: 'text', text: '', className: 'w-11' },
      { type: 'text', text: '购物车 (3)', className: 'flex-1 text-center font-medium' },
      { type: 'button', variant: 'ghost', label: '编辑', className: 'w-11 h-11 nop-haptic' },
    ],
  },
  body: CART_ITEMS.map((item) => ({
    type: 'flex' as const,
    gap: 12,
    align: 'center' as const,
    className: 'p-3 border-b border-border/40',
    body: [
      { type: 'checkbox' as const, name: `cart-${item.id}`, option: { label: '' }, className: 'shrink-0' },
      { type: 'image' as const, src: item.img, alt: item.name, className: 'w-16 h-16 rounded-lg object-cover shrink-0' },
      {
        type: 'flex' as const,
        direction: 'column' as const,
        gap: 4,
        className: 'flex-1 min-w-0',
        body: [
          { type: 'text' as const, text: item.name, className: 'text-sm font-medium truncate' },
          { type: 'text' as const, text: item.price, className: 'text-red-500 font-bold text-sm' },
        ],
      },
      {
        type: 'flex' as const,
        align: 'center' as const,
        gap: 8,
        body: [
          { type: 'button' as const, label: '-', size: 'sm' as const, variant: 'outline' as const },
          { type: 'text' as const, text: `${item.qty}`, className: 'text-sm w-6 text-center' },
          { type: 'button' as const, label: '+', size: 'sm' as const, variant: 'outline' as const },
        ],
      },
    ],
  })),
  footerClassName: 'nop-submit-bar fixed bottom-0 inset-x-0 h-14 nop-safe-bottom bg-background border-t px-3 z-50',
  footer: {
    type: 'flex',
    align: 'center',
    justify: 'between',
    items: [
      { type: 'checkbox', name: 'selectAll', option: { label: '全选' } },
      { type: 'flex', align: 'center', items: [{ type: 'text', text: '合计：', className: 'text-sm' }, { type: 'text', text: '¥11,297', className: 'text-red-500 font-bold' }] },
      { type: 'button', variant: 'default', label: '结算(3)', className: 'h-12 px-6 nop-haptic' },
    ],
  },
};
