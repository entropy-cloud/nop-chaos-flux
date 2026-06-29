import { Button, Toaster } from '@nop-chaos/ui';
import {
  SchemaRenderer,
  formulaCompiler,
  registry,
  createEnv,
} from './m5-showcase-shared';
import APP_SCHEMA from '../schemas/m5-showcase-app.json';

interface M5MobileShowcaseDemoPageProps {
  onBack: () => void;
}

const env = createEnv();

export function M5MobileShowcaseDemoPage({ onBack }: M5MobileShowcaseDemoPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-white">
          ← Back
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Mobile Showcase</p>
          <h1 className="text-sm font-semibold text-white m-0">M1–M5 移动端组件全景</h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center gap-8 p-6 lg:p-10">
        <div
          data-testid="phone-frame"
          className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-800 bg-black shadow-2xl shrink-0"
          style={{ width: 390, height: 844 }}
        >
          <div className="absolute top-0 inset-x-0 z-[100] flex justify-center pt-2 pointer-events-none">
            <div className="w-32 h-7 bg-black rounded-full" />
          </div>
          <div className="relative w-full h-full overflow-hidden bg-background" style={{ transform: 'translateZ(0)' }}>
            <SchemaRenderer
              schemaUrl="playground://m5-showcase/app"
              schema={APP_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
              registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
              env={env}
              formulaCompiler={formulaCompiler}
            />
          </div>
          <div className="absolute bottom-1 inset-x-0 z-[100] flex justify-center pointer-events-none">
            <div className="w-36 h-1 bg-zinc-400 rounded-full" />
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">架构说明</p>
            <div className="space-y-3 text-xs text-zinc-400">
              <p>整个应用由 <strong className="text-white">单个外部 JSON schema</strong> 驱动，无 React 组装代码。</p>
              <p>
                <strong className="text-zinc-200">数据加载：</strong>
                <code className="text-primary">data-source</code> 组件通过 <code className="text-primary">action: 'ajax'</code> 调用 <code className="text-primary">env.fetcher</code>，fetcher 根据 URL 返回 mock 数据。
              </p>
              <p>
                <strong className="text-zinc-200">Tab 切换：</strong>
                <code className="text-primary">tabs</code> 绑定 <code className="text-primary">valueOwnership: 'scope'</code>，底部 tabbar 通过 <code className="text-primary">setValue</code> action 切换。
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Mock API</p>
            <div className="space-y-1.5 text-[11px] text-zinc-400 font-mono">
              <p>GET  /api/products   → 商品列表</p>
              <p>GET  /api/categories → 分类列表</p>
              <p>GET  /api/cart       → 购物车</p>
              <p>POST /api/cart/add   → 加入购物车</p>
              <p>GET  /api/profile    → 用户信息</p>
              <p>GET  /api/orders     → 订单列表</p>
              <p>POST /api/order/submit → 提交订单</p>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">JSON 结构</p>
            <pre className="text-[11px] text-zinc-400 overflow-x-auto leading-relaxed">
{`page (schemas/m5-showcase-app.json)
├── data-source ×5 (→ fetcher mock)
│   ├── /api/products
│   ├── /api/categories
│   ├── /api/cart
│   ├── /api/profile
│   └── /api/orders
├── body:
│   └── tabs (scope-bound)
│       ├── tab[home]:     pull-refresh + loop
│       ├── tab[category]: loop + icon list
│       ├── tab[cart]:     loop + checkbox + submit
│       └── tab[profile]:  service + collapse + switch
└── footer:
    └── flex → setValue('currentTab')`}
            </pre>
          </div>
        </div>
      </div>

      <Toaster />
    </main>
  );
}
