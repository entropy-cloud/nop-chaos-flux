import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import {
  createSchemaRenderer,
  createDefaultRegistry,
} from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';

interface W3dAdvancedInputFamilyDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

function schemaEnv() {
  return {
    fetcher: async function <T>(api: any, ctx: any) {
      // Mock upload bridge: the renderer dispatches uploadAction with a child
      // scope carrying __uploadFile; the action's `api` is the ApiSchema (url
      // directly on api, not nested under args).
      const body = ctx?.scope?.readOwn?.() ?? {};
      const url = api?.url;
      if (url === '/api/upload' || url === '/api/upload-image') {
        const file = body.__uploadFile ?? { name: 'demo.txt', size: 12 };
        return {
          ok: true,
          status: 200,
          data: {
            url: `https://cdn.example.com/${file.name}`,
            name: file.name,
            size: file.size,
          } as T,
        };
      }
      if (url === '/api/upload-fail') {
        return { ok: false, status: 500, data: { message: 'Upload rejected' } as T };
      }
      return { ok: true, status: 200, data: null as T };
    },
    notify: () => {},
  } as any;
}

export function W3dAdvancedInputFamilyDemoPage({ onBack }: W3dAdvancedInputFamilyDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'w3dForm',
          data: {
            month: '2024-06',
            quarter: '2024-Q3',
            year: '2024',
            monthRange: '2024-01,2024-06',
            md: '# Hello\n\nThis is **markdown** with a `code` span.',
            file: undefined,
            image: undefined,
            rich: '<p>Initial <strong>rich</strong> text.</p>',
          },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'input-month',
                  name: 'month',
                  label: 'Month (clearable + bounded)',
                  clearable: true,
                  minDate: '2024-01',
                  maxDate: '2024-12',
                  testid: 'demo-input-month',
                },
                {
                  type: 'input-quarter',
                  name: 'quarter',
                  label: 'Quarter',
                  testid: 'demo-input-quarter',
                },
                {
                  type: 'input-year',
                  name: 'year',
                  label: 'Year',
                  testid: 'demo-input-year',
                },
                {
                  type: 'input-month',
                  name: 'monthRange',
                  label: 'Month range (selectionMode=range)',
                  selectionMode: 'range',
                  testid: 'demo-input-month-range',
                },
                { type: 'text', testid: 'month-report', text: 'month:${month ?? "—"}' },
                { type: 'text', testid: 'quarter-report', text: 'quarter:${quarter ?? "—"}' },
                { type: 'text', testid: 'year-report', text: 'year:${year ?? "—"}' },
                { type: 'text', testid: 'range-report', text: 'range:${monthRange ?? "—"}' },
              ],
            },
          ],
        },
        {
          type: 'form',
          name: 'w3dMdForm',
          data: {
            md: '# Hello\n\nThis is **markdown** with a `code` span.',
          },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'markdown-editor',
                  name: 'md',
                  label: 'Markdown editor (split edit + preview)',
                  viewMode: 'split',
                  testid: 'demo-markdown-editor',
                },
                { type: 'text', testid: 'md-report', text: 'md:${md ?? "—"}' },
              ],
            },
          ],
        },
        {
          type: 'form',
          name: 'w3dEditorForm',
          data: {
            rich: '<p>Initial <strong>rich</strong> text.</p>',
            rich2: '',
          },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'editor',
                  name: 'rich',
                  label: 'TipTap WYSIWYG editor (outputFormat html)',
                  outputFormat: 'html',
                  testid: 'demo-editor',
                },
                {
                  type: 'editor',
                  name: 'rich2',
                  label: 'Editor — scratchpad (empty start)',
                  outputFormat: 'html',
                  testid: 'demo-editor-scratch',
                },
                {
                  type: 'text',
                  testid: 'rich-report',
                  text: 'rich:${rich ?? "—"}',
                },
                {
                  type: 'text',
                  testid: 'rich2-report',
                  text: 'rich2:${rich2 ?? "—"}',
                },
              ],
            },
          ],
        },
        {
          type: 'form',
          name: 'w3dUploadForm',
          data: {
            file: undefined,
            image: undefined,
          },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'input-file',
                  name: 'file',
                  label: 'File upload (valueMode url)',
                  valueMode: 'url',
                  uploadAction: {
                    action: 'ajax',
                    args: { url: '/api/upload', method: 'post' },
                  },
                  testid: 'demo-input-file',
                },
                {
                  type: 'input-image',
                  name: 'image',
                  label: 'Image upload (thumbnail preview)',
                  uploadAction: {
                    action: 'ajax',
                    args: { url: '/api/upload-image', method: 'post' },
                  },
                  testid: 'demo-input-image',
                },
                {
                  type: 'text',
                  testid: 'file-report',
                  text: 'file:${file ?? "—"}',
                },
                {
                  type: 'text',
                  testid: 'image-report',
                  text: 'image:${image ?? "—"}',
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
        Advanced Input Family (W3d)
      </p>
      <h1 className="m-0 mb-6">
        高级输入族 — period / markdown-editor / upload / editor
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Live demo — period family + markdown-editor + upload + editor</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              period 输入复用 W2b date 底层（<code>RangeKind</code> 扩展 month/quarter/year），
              单值/范围由 <code>selectionMode</code> 区分。markdown-editor 预览区通过运行时组合
              <code>markdown</code> renderer 渲染（<code>helpers.render</code>），
              <code>flux-renderers-form</code> 不直接依赖 react-markdown。
            </p>
            <div
              data-testid="w3d-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w3d-advanced-input-family"
                schema={schema as never}
                env={schemaEnv()}
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
                <strong>input-month</strong> — 月字段 family owner；native month 输入，
                <code>YYYY-MM</code> 存储往返，<code>selectionMode</code> 区分单值/范围。
              </li>
              <li>
                <strong>input-quarter</strong> — 季度字段 family owner；year + quarter 选择，
                <code>YYYY-Qq</code> 存储，季度↔日期归一化。
              </li>
              <li>
                <strong>input-year</strong> — 年份字段；<code>YYYY</code> 存储。
              </li>
              <li>
                <strong>markdown-editor</strong> — markdown 源码编辑 + 预览（运行时组合
                <code>markdown</code> renderer）。
              </li>
              <li>
                <strong>input-file / input-image</strong> — 上传字段，
                <code>uploadAction</code> action 下沉桥接，pending/result/error 状态机。
              </li>
              <li>
                <strong>editor</strong> — TipTap WYSIWYG 富文本，html/json 序列化 + sanitize 门禁。
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>markdown-editor composition note</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              预览区通过运行时组合 <code>markdown</code> renderer 渲染（<code>helpers.render</code>
              ），<code>flux-renderers-form</code> 不直接依赖 react-markdown，保证与
              <code>markdown</code> 渲染一致性。工具栏在光标位插入 markdown 语法；预览异常降级为纯文本。
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Upload family — input-file / input-image</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              上传走显式 <code>uploadAction</code> action 下沉（请求不下沉进字段 JSX），
              renderer 只桥接 action 派发与结果写回。pending→result/error 状态机；
              <code>valueMode</code> url/object/array；input-image 在基线上加缩略图预览 +
              <code>crop</code> 扩展点预留。演示见上方 live demo 区的 upload 表单。
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>editor — TipTap WYSIWYG</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              TipTap WYSIWYG 富文本，<code>outputFormat</code> html（默认，存储 HTML 经
              <code>sanitizeHtml</code> 受控）/ json（TipTap JSON）。工具栏 bridge 复用
              <code>@nop-chaos/ui</code> Button；<code>readOnly</code> 不可编辑。
              演示见上方 live demo 区的 editor 表单。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
