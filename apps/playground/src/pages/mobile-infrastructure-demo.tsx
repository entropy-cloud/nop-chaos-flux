import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
  Toaster,
} from '@nop-chaos/ui';

interface MobileInfrastructureDemoPageProps {
  onBack: () => void;
}

export function MobileInfrastructureDemoPage({ onBack }: MobileInfrastructureDemoPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        Back to Home
      </Button>
      <p className="mb-3 uppercase tracking-[0.16em] text-xs text-muted-foreground">
        Mobile Infrastructure (M0.1)
      </p>
      <h1 className="m-0 mb-6">移动端基础设施 — safe-area / hairline / haptics / z-index</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>M0.1a safe-area 辅助类</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              四个辅助类（<code>nop-safe-top</code> / <code>nop-safe-bottom</code> /{' '}
              <code>nop-safe-left</code> / <code>nop-safe-right</code>）通过{' '}
              <code>env(safe-area-inset-*)</code> 适配 notch 设备。在非 notch 设备上降级为 0，不影响布局。
            </p>
            <div
              data-testid="safe-area-preview"
              className="rounded-lg bg-muted/60 p-3 text-xs"
              style={{ ['--safe-area-preview' as string]: 'env(safe-area-inset-top)' }}
            >
              <div className="nop-safe-top border border-dashed border-primary/50">
                nop-safe-top (padding-top: env(safe-area-inset-top))
              </div>
              <div className="nop-safe-bottom mt-2 border border-dashed border-primary/50">
                nop-safe-bottom
              </div>
              <div className="nop-safe-left mt-2 border border-dashed border-primary/50">
                nop-safe-left
              </div>
              <div className="nop-safe-right mt-2 border border-dashed border-primary/50">
                nop-safe-right
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: 在 Chrome DevTools 设备模拟器里打开 iPhone 14 Pro / Dynamic Island 机型，可看到 notch 区域的 padding 生效。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>M0.1b hairline 0.5px 细线</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              <code>nop-hairline</code> + <code>nop-hairline--top/right/bottom/left</code> 通过{' '}
              <code>::after</code> 伪元素 + <code>transform: scaleY/scaleX(0.5)</code> 在高 DPI 屏渲染
              0.5px 细线。颜色由 <code>--nop-hairline-color</code> 控制，默认走主题 border 色。
            </p>
            <div data-testid="hairline-preview" className="flex flex-col gap-3 p-3">
              <div className="nop-hairline nop-hairline--top rounded-sm bg-muted/40 p-2 text-xs">
                nop-hairline--top
              </div>
              <div className="nop-hairline nop-hairline--bottom rounded-sm bg-muted/40 p-2 text-xs">
                nop-hairline--bottom
              </div>
              <div className="nop-hairline nop-hairline--left rounded-sm bg-muted/40 p-2 text-xs">
                nop-hairline--left
              </div>
              <div className="nop-hairline nop-hairline--right rounded-sm bg-muted/40 p-2 text-xs">
                nop-hairline--right
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: 缩放窗口或用 Retina 屏查看，细线比普通 1px border 更细。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>M0.1c haptics 触感反馈</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              <code>nop-haptic</code> 类（<code>transition: opacity 0.1s ease</code> +{' '}
              <code>cursor: pointer</code> + <code>:active &#123; opacity: 0.7 &#125;</code>）。Button
              默认启用；Card 在传入 <code>onClick</code> 时启用；disabled 状态不响应（<code>:active</code>{' '}
              天然不触发）。
            </p>
            <div data-testid="haptic-preview" className="flex flex-wrap gap-3 p-3">
              <Button onClick={() => undefined} data-testid="haptic-button" variant="default">
                按压 Default
              </Button>
              <Button onClick={() => undefined} variant="outline">
                按压 Outline
              </Button>
              <Button disabled>Disabled (无反馈)</Button>
              <Card onClick={() => undefined} className="flex-1 p-3 text-xs">
                可点击的 Card（按压有反馈）
              </Card>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: 用手指或鼠标点击按钮/卡片，opacity 短暂降到 0.7。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>M0.1d global z-index 栈</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              <code>useGlobalZIndex()</code> 自增计数器（基线 2000，对齐 Vant）。12 个 overlay 组件已从扁平{' '}
              <code>z-50</code> 迁移到计数器取值；<code>Toaster</code> 固定 10000（toast/notify 顶层）。
              多浮层叠加按打开顺序正确叠放，toast 永远盖在最顶层。
            </p>
            <div data-testid="zindex-preview" className="flex flex-wrap gap-2 p-3">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button>Open Dialog</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dialog (z 取自计数器)</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 p-4 text-sm">
                    <p>
                      Dialog 已打开。下面在 dialog 内开 popover，再触发一条 toast，验证叠加顺序：
                      toast &gt; dialog &gt; popover。
                    </p>
                    <Popover>
                      <PopoverTrigger render={<Button variant="outline">Open Popover</Button>} />
                      <PopoverContent>
                        <p className="text-xs">Popover 内容（计数器取值高于 dialog）。</p>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      onClick={() => toast.success('Toast（固定顶层 z=10000）')}
                    >
                      Show toast
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: 打开 dialog → 在 dialog 里开 popover → 触发 toast。toast 应永远在最顶层。
            </p>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </main>
  );
}
