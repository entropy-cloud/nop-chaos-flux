import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle, toast, Toaster } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';

interface MobileComponentsDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerMobileRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, message) => {
    const text = typeof message === 'string' ? message : String(message ?? '');
    if (level === 'error') toast.error(text || 'Error');
    else if (level === 'success') toast.success(text || 'Success');
    else if (level === 'warning') toast.warning?.(text || 'Warning');
    else toast.info?.(text || 'Info');
  },
};

export function MobileComponentsDemoPage({ onBack }: MobileComponentsDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'pull-refresh',
          testid: 'demo-pull-refresh',
          threshold: 50,
          pullingText: '下拉刷新',
          loosingText: '释放立即刷新',
          loadingText: '加载中...',
          successText: '刷新成功',
          onRefresh: { action: 'setValue', args: { path: 'refreshedAt', value: '${Date.now()}' } },
          body: [{ type: 'text', text: '主体内容 — 向下拖拽触发刷新', testid: 'pull-refresh-body-text' }],
        },
        {
          type: 'infinite-scroll',
          testid: 'demo-infinite-scroll',
          distance: 80,
          hasMore: true,
          loading: false,
          loadingText: '加载中...',
          finishedText: '没有更多了',
          onLoadMore: { action: 'setValue', args: { path: 'loadTrigger', value: '${Date.now()}' } },
          body: [{ type: 'text', text: '滚动到底部触发加载更多', testid: 'infinite-scroll-body-text' }],
        },
        {
          type: 'swipe-cell',
          testid: 'demo-swipe-cell',
          threshold: 30,
          closeOnOutside: true,
          body: [{ type: 'text', text: '主体内容 — 水平拖拽露出操作', testid: 'swipe-cell-body-text' }],
          left: [
            { type: 'button', label: '归档', variant: 'outline', size: 'sm', testid: 'swipe-cell-archive' },
          ],
          right: [
            { type: 'button', label: '删除', variant: 'destructive', size: 'sm', testid: 'swipe-cell-delete' },
          ],
        },
        {
          type: 'countdown',
          testid: 'demo-countdown',
          time: 30_000,
          format: 'mm:ss',
          prefix: '剩余 ',
          suffix: ' 结束',
          onFinish: { action: 'setValue', args: { path: 'finished', value: true } },
        },
        {
          type: 'notice-bar',
          testid: 'demo-notice-bar',
          text: '📣 Notice: M5 移动端原生组件 — pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar.',
          variant: 'info',
          closable: true,
          onClose: { action: 'setValue', args: { path: 'noticeClosed', value: true } },
        },
      ],
    }),
    [],
  );

  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        Back to Home
      </Button>
      <p className="mb-3 uppercase tracking-[0.16em] text-xs text-muted-foreground">
        Mobile Native Components (M5)
      </p>
      <h1 className="m-0 mb-6">
        移动端原生组件 — pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              每个移动端原生组件通过 <code>SchemaRenderer</code> 真实挂载。触摸设备上拖拽触发交互；桌面端可在
              Chrome DevTools 设备模拟器内验证。
            </p>
            <div
              data-testid="mobile-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
              style={{ minHeight: 240 }}
            >
              <SchemaRenderer
                schemaUrl="demo://mobile-components"
                schema={schema as never}
                env={env}
                formulaCompiler={formulaCompiler}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Component inventory</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <ul className="space-y-2">
              <li>
                <strong>pull-refresh</strong> — Container renderer; <code>useTouch</code> 驱动状态机；
                <code>onRefresh</code> action。
              </li>
              <li>
                <strong>infinite-scroll</strong> — Container renderer; IntersectionObserver sentinel；
                <code>hasMore</code>/<code>loading</code> props；<code>onLoadMore</code> action。
              </li>
              <li>
                <strong>swipe-cell</strong> — Container renderer; <code>body</code>/<code>left</code>/
                <code>right</code> regions；水平滑动；<code>closeOnOutside</code>。
              </li>
              <li>
                <strong>countdown</strong> — Display renderer; <code>time</code>/
                <code>targetTime</code>/<code>format</code>/<code>paused</code>/
                <code>autoStart</code>/<code>millisecond</code>；<code>onFinish</code> action。
              </li>
              <li>
                <strong>notice-bar</strong> — Display renderer; <code>variant</code>/
                <code>scrollable</code>/<code>closable</code>；CSS marquee 动画。
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Tip: 在 Chrome DevTools 设备模拟器内打开 iPhone 12 Pro (390×844)，触摸下拉/水平滑动以验证手势。
            </p>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </main>
  );
}
