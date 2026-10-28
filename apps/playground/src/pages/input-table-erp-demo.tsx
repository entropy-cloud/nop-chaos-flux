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

interface InputTableErpDemoPageProps {
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
    fetcher: async function <T>() {
      return { status: 0, data: null as T };
    },
    notify: () => {},
  } as never;
}

export function InputTableErpDemoPage({ onBack }: InputTableErpDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'orderForm',
          data: {
            orderId: 'SO-2026-0001',
            rows: [
              { sku: 'SKU-1001', qty: 2, price: 1299 },
              { sku: 'SKU-2002', qty: 1, price: 458 },
            ],
            totalAmount: 0,
            lastChanged: '',
          },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'text',
                  text: '订单号：${orderId}',
                  testid: 'erp-order-id',
                },
                {
                  type: 'input-table',
                  name: 'rows',
                  label: '订单明细 (input-table ERP 增强)',
                  testid: 'erp-input-table',
                  itemKey: 'sku',
                  columns: [
                    { label: '商品编码', name: 'sku', width: 180 },
                    { label: '数量', name: 'qty', width: 100 },
                    { label: '单价', name: 'price', width: 120 },
                    { label: '小计', computed: 'qty * price', width: 120 },
                    { label: '金额大写', width: 260 },
                  ],
                  item: [
                    { type: 'input-text', name: 'sku', placeholder: 'SKU', testid: 'erp-row-sku' },
                    { type: 'input-number', name: 'qty', placeholder: 'Qty', testid: 'erp-row-qty' },
                    { type: 'input-number', name: 'price', placeholder: 'Price', testid: 'erp-row-price' },
                    {
                      type: 'amount-in-words',
                      value: '${qty * price}',
                      testid: 'erp-row-words',
                    },
                  ],
                  summaryBinding: { field: 'totalAmount', column: 'qty', agg: 'sum' },
                  onRowChange: {
                    action: 'setValue',
                    args: { path: 'lastChanged', value: 'row ${index} field ${name} -> ${value}' },
                  },
                },
                {
                  type: 'text',
                  text: '订单总数量（summaryBinding 回写）：${totalAmount}',
                  testid: 'erp-total-amount',
                },
                {
                  type: 'text',
                  text: '最近行变更（onRowChange）：${lastChanged ?? "—"}',
                  testid: 'erp-last-changed',
                },
                {
                  type: 'amount-in-words',
                  value: '${totalAmount}',
                  testid: 'erp-total-words',
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
        Input Table ERP Enhancement (Plan 785)
      </p>
      <h1 className="m-0 mb-6">input-table ERP 行内编辑增强 — 合计行 / 从表联动 / 金额大写</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Live demo — ERP 订单从表</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              小计列为 <code>computed</code> 派生列（行作用域表达式，只读）；
              <code>summaryBinding</code> 把明细列聚合回写父表单字段；
              行字段变更派发 <code>onRowChange</code>（payload 经 evaluationBindings 裸名解析）；
              金额大写由 <code>amount-in-words</code> 渲染器展示。
            </p>
            <div
              data-testid="erp-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://input-table-erp"
                schema={schema as never}
                env={schemaEnv()}
                formulaCompiler={formulaCompiler}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
