import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import {
  createSchemaRenderer,
  createDefaultRegistry,
} from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';

interface W2bDateFamilyDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

export function W2bDateFamilyDemoPage({ onBack }: W2bDateFamilyDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'w2bForm',
          data: {
            when: '2024-06-09',
            constrained: '2024-06-15',
            at: '2024-06-09 14:30',
            open: '08:30',
            range: '2024-06-01,2024-06-10',
          },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'input-date',
                  name: 'when',
                  label: 'Date (utc + clearable + DD/MM/YYYY display)',
                  displayFormat: 'DD/MM/YYYY',
                  utc: true,
                  clearable: true,
                  minDate: '2024-01-01',
                  maxDate: '2024-12-31',
                  testid: 'demo-input-date',
                },
                {
                  type: 'input-date',
                  name: 'constrained',
                  label: 'Bounded date (minDate 2024-06-10 / maxDate 2024-06-20)',
                  valueFormat: 'YYYY-MM-DD',
                  minDate: '2024-06-10',
                  maxDate: '2024-06-20',
                  testid: 'demo-input-date-bounded',
                },
                {
                  type: 'input-datetime',
                  name: 'at',
                  label: 'Datetime',
                  testid: 'demo-input-datetime',
                },
                {
                  type: 'input-time',
                  name: 'open',
                  label: 'Open time (minTime/maxTime)',
                  minTime: '06:00',
                  maxTime: '22:00',
                  testid: 'demo-input-time',
                },
                {
                  type: 'date-range',
                  name: 'range',
                  label: 'Date range (shortcuts)',
                  shortcuts: [
                    { label: 'Last 7 days', start: '2024-06-03', end: '2024-06-10' },
                    { label: 'Whole month', start: '2024-06-01', end: '2024-06-30' },
                  ],
                  testid: 'demo-date-range',
                },
                {
                  type: 'text',
                  testid: 'date-report',
                  text: 'date:${when ?? "—"}',
                },
                {
                  type: 'text',
                  testid: 'datetime-report',
                  text: 'datetime:${at ?? "—"}',
                },
                {
                  type: 'text',
                  testid: 'time-report',
                  text: 'time:${open ?? "—"}',
                },
                {
                  type: 'text',
                  testid: 'range-report',
                  text: 'range:${range ?? "—"}',
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
        Date Family (W2b)
      </p>
      <h1 className="m-0 mb-6">日期族 — input-date / input-datetime / input-time / date-range</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live renderer (schema-driven)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              4 个日期族组件通过 <code>SchemaRenderer</code> 真实挂载到 <code>flux-renderers-form</code>，
              共享同一日期底层（react-day-picker + 原生 Date/Intl，无重型日期库）。
              <code>date-range</code> 以 <code>rangeKind</code> 统一 date/datetime/time 三态。
            </p>
            <div
              data-testid="w2b-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w2b-date-family"
                schema={schema as never}
                env={{
                  fetcher: async function <T>() {
                    return { ok: true, status: 200, data: null as T };
                  },
                  notify: () => {},
                }}
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
                <strong>input-date</strong> — 单值日期字段；<code>valueFormat</code>/
                <code>displayFormat</code>、<code>minDate</code>/<code>maxDate</code>、
                <code>utc</code> 存储往返、<code>clearable</code>。
              </li>
              <li>
                <strong>input-datetime</strong> — 单值日期时间；复用日期底层 + 时分精度。
              </li>
              <li>
                <strong>input-time</strong> — 单值时间字段；<code>minTime</code>/<code>maxTime</code> 夹逼。
              </li>
              <li>
                <strong>date-range</strong> — canonical range owner；<code>rangeKind</code>
                切换 date/datetime/time，起止归一化，<code>delimiter</code> 拼接。
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
