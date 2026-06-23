import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle, toast, Toaster } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererComponentProps, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import {
  InfiniteScrollRenderer,
  registerMobileRenderers,
} from '@nop-chaos/flux-renderers-mobile';
import type { InfiniteScrollSchema } from '@nop-chaos/flux-renderers-mobile';

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
        // OA-07: infinite-scroll is now driven by a real controllable host
        // (InfiniteScrollDemoHost below) instead of the previous static
        // hasMore:true / loading:false literals that produced a runaway loop.
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
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
              />
              <InfiniteScrollDemoHost />
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

// OA-07: a real controllable host for the infinite-scroll renderer.
//
// The previous demo used static `hasMore: true, loading: false` literals with
// no host state, which (before the renderer in-flight guard) produced a
// runaway onLoadMore loop and (after the guard) a degenerate stuck demo.
// This host owns the loading/hasMore/items state, simulates bounded async
// pagination, and stops after MAX_PAGES so the demo never loops.
const MAX_PAGES = 3;
const PAGE_SIZE = 4;
const LOAD_DELAY_MS = 400;

function buildPageItems(page: number): string[] {
  const start = page * PAGE_SIZE;
  return Array.from({ length: PAGE_SIZE }, (_, i) => `条目 ${start + i + 1}`);
}

function InfiniteScrollDemoHost() {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<string[]>(() => buildPageItems(0));
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleLoadMore = useCallback(() => {
    // Ignore requests while a page is already in-flight or once finished.
    if (loading || !hasMore) return;
    setLoading(true);
    timerRef.current = setTimeout(() => {
      const nextPage = page + 1;
      setItems((prev) => [...prev, ...buildPageItems(nextPage)]);
      setPage(nextPage);
      setLoading(false);
      // Finite pagination: stop after MAX_PAGES so the demo never loops.
      setHasMore(nextPage + 1 < MAX_PAGES);
    }, LOAD_DELAY_MS);
  }, [loading, hasMore, page]);

  const rendererProps: RendererComponentProps<InfiniteScrollSchema> = {
    id: 'demo-infinite-scroll',
    path: 'demo.infinite-scroll',
    schema: { type: 'infinite-scroll' },
    templateNode: {} as RendererComponentProps<InfiniteScrollSchema>['templateNode'],
    node: {} as RendererComponentProps<InfiniteScrollSchema>['node'],
    props: {
      distance: 80,
      hasMore,
      loading,
      loadingText: '加载中...',
      finishedText: '没有更多了',
    } as RendererComponentProps<InfiniteScrollSchema>['props'],
    meta: { testid: 'demo-infinite-scroll' } as RendererComponentProps<InfiniteScrollSchema>['meta'],
    regions: {
      body: {
        key: 'body',
        templateNode: null,
        render: () => (
          <div data-testid="infinite-scroll-body-text">
            {items.map((item) => (
              <div key={item} className="border-b border-border/60 py-2">
                {item}
              </div>
            ))}
          </div>
        ),
      },
    },
    events: { onLoadMore: handleLoadMore as never },
    helpers: {} as RendererComponentProps<InfiniteScrollSchema>['helpers'],
  };

  return <InfiniteScrollRenderer {...rendererProps} />;
}
