import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle, Toaster, toast } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';

interface W4aMultimediaDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const SAMPLE_AUDIO_SRC =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const SAMPLE_VIDEO_SRC =
  'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAN2bW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAAMgAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAqB0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAAAwAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAADIAAAEAAABAAAAAAIYbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAyAAAACgBVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABw21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAYNzdGJsAAAAv3N0c2QAAAAAAAAAAQAAAK9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAMABIAAAASAAAAAAAAAABFUxhdmM2Mi4yOC4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAK/+EAGGdkAAqs2UR7ARAAAAMAEAAAAwMg8SJZYAEABmjr48siwP34+AAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAB5kAAAAAAAAAAYc3R0cwAAAAAAAAABAAAABQAAAgAAAAAUc3RzcwAAAAAAAAABAAAAAQAAADhjdHRzAAAAAAAAAAUAAAABAAAEAAAAAAEAAAoAAAAAAQAABAAAAAABAAAAAAAAAAEAAAIAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAFAAAAAQAAAChzdHN6AAAAAAAAAAAAAAAFAAAC2QAAAA0AAAAMAAAADAAAAAwAAAAUc3RjbwAAAAAAAAABAAADpgAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjIuMTIuMTAxAAAACGZyZWUAAAMSbWRhdAAAAq4GBf//qtxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjUgcjMyMjIgYjM1NjA1YSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjUgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0xIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj0yNSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAACNliIQAM//+3zL4FNaFDnRCM2R0vMJcdjcWv4MChiHwPrergQAAAAlBmiRsQr/+OlIAAAAIQZ5CeIX/ETEAAAAIAZ5hdEK/FLAAAAAIAZ5jakK/FLE=';

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

function slideDataUri(color: string, label: string): string {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="55%" fill="white" font-size="16" text-anchor="middle">${label}</text></svg>`,
    )
  );
}

export function W4aMultimediaDemoPage({ onBack }: W4aMultimediaDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 16,
          body: [
            {
              type: 'audio',
              testid: 'demo-audio',
              src: SAMPLE_AUDIO_SRC,
              controls: true,
              title: 'Sample audio track',
            },
            {
              type: 'audio',
              testid: 'demo-audio-empty',
            },
            {
              type: 'audio',
              testid: 'demo-audio-error',
              src: '/this-does-not-exist.mp3',
            },
            {
              type: 'video',
              testid: 'demo-video',
              src: SAMPLE_VIDEO_SRC,
              controls: true,
              muted: true,
              title: 'Sample video clip',
            },
            {
              type: 'video',
              testid: 'demo-video-empty',
            },
            {
              type: 'carousel',
              testid: 'demo-carousel',
              id: 'demo-carousel',
              autoPlay: false,
              loop: true,
              items: [
                { image: slideDataUri('#6366f1', 'Slide 1'), title: 'First', caption: 'Indigo' },
                { image: slideDataUri('#10b981', 'Slide 2'), title: 'Second', caption: 'Emerald' },
                { image: slideDataUri('#f59e0b', 'Slide 3'), title: 'Third', caption: 'Amber' },
              ],
            },
            {
              type: 'qrcode',
              testid: 'demo-qrcode',
              value: 'https://github.com/nop-chaos',
              size: 128,
              level: 'M',
              label: 'Scan to open repo',
            },
            {
              type: 'qrcode',
              testid: 'demo-qrcode-empty',
            },
            {
              type: 'qrcode',
              testid: 'demo-qrcode-alt',
              value: 'different-payload-42',
              size: 96,
              level: 'H',
            },
            {
              type: 'flex',
              direction: 'row',
              gap: 8,
              body: [
                {
                  type: 'button',
                  label: 'Prev (handle)',
                  testid: 'carousel-prev-handle',
                  onClick: { action: 'component:prev', componentId: 'demo-carousel' },
                },
                {
                  type: 'button',
                  label: 'Next (handle)',
                  testid: 'carousel-next-handle',
                  onClick: { action: 'component:next', componentId: 'demo-carousel' },
                },
                {
                  type: 'button',
                  label: 'Go to slide 3 (handle)',
                  testid: 'carousel-set-handle',
                  onClick: {
                    action: 'component:setValue',
                    componentId: 'demo-carousel',
                    args: { value: 2 },
                  },
                },
              ],
            },
          ],
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
        Multimedia Family (W4a)
      </p>
      <h1 className="m-0 mb-6">
        多媒体组 — audio / video / carousel / qrcode
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              多媒体族组件通过 <code>SchemaRenderer</code> 真实挂载到{' '}
              <code>flux-renderers-content</code>。audio/video 包裹原生媒体元素并输出 marker。
            </p>
            <div
              data-testid="w4a-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w4a-multimedia"
                schema={schema as never}
                env={env}
                formulaCompiler={formulaCompiler}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
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
                <strong>audio</strong> — 原生 <code>&lt;audio&gt;</code> + marker；
                <code>src</code>/<code>poster</code>/<code>autoPlay</code>/<code>loop</code>/
                <code>controls</code> + <code>title</code>；空/失败降级占位。
              </li>
              <li>
                <strong>video</strong> — 原生 <code>&lt;video&gt;</code> + marker；audio 基线 +{' '}
                <code>muted</code>（仅 video）。
              </li>
              <li>
                <strong>carousel</strong> — 复用 ui Carousel（embla，零新依赖）；items/autoPlay/
                interval/loop/controls/indicators + <code>component:next/prev/setValue</code> 句柄。
              </li>
              <li>
                <strong>qrcode</strong> — 轻量 QR 库（canvas）；value/size/level/foreground/
                background + label；单一 canonical 名 <code>qrcode</code>。
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </main>
  );
}
