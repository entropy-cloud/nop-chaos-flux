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

interface W4cCompositeFormFamilyDemoPageProps {
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
      return { ok: true, status: 200, data: null as T };
    },
    notify: () => {},
  } as never;
}

export function W4cCompositeFormFamilyDemoPage({ onBack }: W4cCompositeFormFamilyDemoPageProps) {
  const schema = useMemo(
    () => ({
      type: 'page',
      body: [
        {
          type: 'form',
          name: 'comboForm',
          data: {
            contacts: [
              { name: 'Alice', phone: '13800000001' },
              { name: 'Bob', phone: '13800000002' },
            ],
          },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'combo',
                  name: 'contacts',
                  label: 'Contacts (combo)',
                  addable: true,
                  removable: true,
                  reorderable: true,
                  testid: 'demo-combo',
                  items: [
                    { type: 'input-text', name: 'name', placeholder: 'Name', testid: 'combo-name' },
                    { type: 'input-text', name: 'phone', placeholder: 'Phone', testid: 'combo-phone' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'form',
          name: 'tableForm',
          data: {
            rows: [
              { sku: 'A1', amount: 3 },
              { sku: 'B2', amount: 5 },
            ],
          },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'input-table',
                  name: 'rows',
                  label: 'Line items (input-table)',
                  columns: [{ label: 'SKU' }, { label: 'Amount' }],
                  rowKey: 'sku',
                  addable: true,
                  removable: true,
                  reorderable: true,
                  testid: 'demo-input-table',
                  item: [
                    { type: 'input-text', name: 'sku', placeholder: 'SKU', testid: 'row-sku' },
                    { type: 'input-number', name: 'amount', placeholder: 'Amount', testid: 'row-amount' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'form',
          name: 'transferForm',
          data: { roles: ['editor'] },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'transfer',
                  name: 'roles',
                  label: 'Roles (transfer)',
                  multiple: true,
                  searchable: true,
                  valueKey: 'id',
                  labelKey: 'title',
                  testid: 'demo-transfer',
                  options: [
                    { id: 'admin', title: 'Admin' },
                    { id: 'editor', title: 'Editor' },
                    { id: 'viewer', title: 'Viewer' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'form',
          name: 'pickerForm',
          data: { owner: undefined, reviewers: [] },
          body: [
            {
              type: 'flex',
              direction: 'column',
              gap: 12,
              body: [
                {
                  type: 'picker',
                  name: 'owner',
                  label: 'Owner (picker, single)',
                  pickerDialog: { title: 'Pick owner' },
                  valueKey: 'id',
                  labelKey: 'title',
                  testid: 'demo-picker',
                  options: [
                    { id: 'u1', title: 'Alice' },
                    { id: 'u2', title: 'Bob' },
                    { id: 'u3', title: 'Carol' },
                  ],
                },
                {
                  type: 'picker',
                  name: 'reviewers',
                  label: 'Reviewers (picker, multiple)',
                  multiple: true,
                  pickerDialog: { title: 'Pick reviewers' },
                  testid: 'demo-picker-multi',
                  options: [
                    { label: 'Alice', value: 'alice' },
                    { label: 'Bob', value: 'bob' },
                    { label: 'Carol', value: 'carol' },
                  ],
                },
                { type: 'text', testid: 'picker-owner-report', text: 'owner:${owner ?? "—"}' },
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
        Composite Form Family (W4c)
      </p>
      <h1 className="m-0 mb-6">
        复合表单族 — combo / input-table / transfer / picker
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Live demo — combo / input-table / transfer / picker</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              combo / input-table 复用 array-field 的 staged owner 内核（
              <code>createItemScope</code> / <code>createItemFormProxy</code> +
              <code>currentForm.append/remove/moveValue</code> + staged validation），经 canonical
              <code>addItem/removeItem/moveItem</code> 句柄对外。transfer/picker 新建最小 valueKey/labelKey
              归一化 helper（<code>option-normalize.ts</code>），不复用 select 下拉协议。
            </p>
            <div
              data-testid="w4c-renderer-host"
              className="rounded-lg border border-dashed border-primary/40 bg-muted/40 p-3"
            >
              <SchemaRenderer
                schemaUrl="demo://w4c-composite-form-family"
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
                <strong>combo</strong> — 重复对象/复合项字段编辑器；卡片堆叠，<code>items</code> region，
                canonical addItem/removeItem/moveItem。
              </li>
              <li>
                <strong>input-table</strong> — 表格型对象数组字段编辑器；行内编辑 + 列定义，
                canonical addItem/removeItem/moveItem（addRow/removeRow/moveRow 别名）。
              </li>
              <li>
                <strong>transfer</strong> — 双栏穿梭选择字段；valueKey/labelKey 归一化 + 搜索。
              </li>
              <li>
                <strong>picker</strong> — 弹层选择字段；dialog surface + valueKey/labelKey，
                open/clear 经 <code>useInputComponentHandle</code>。
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Boundary notes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              combo vs array-editor（标量项）/ array-field（底层 staged owner）；input-table vs 通用
              <code>table</code>（数据展示，非字段 owner）；transfer vs select/tree-select（无 valueKey/labelKey，
              固定 <code>{`{label,value}`}</code>）；picker vs dialog/drawer（picker 是字段值选择壳，复用 dialog surface）。
              边界裁定见各 design.md §1/§12。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
