import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button } from '@nop-chaos/ui';
import { notifyWithToast } from './notify-toast.js';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';

interface M7WheelPickersDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerMobileRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { status: 0, data: null as T };
  },
  notify: notifyWithToast,
};

const DEMO_SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'wheel-picker',
      label: '颜色 / 尺码',
      name: 'sku',
      testid: 'm7-wheel-picker',
      placeholder: '选择颜色与尺码',
      columns: [
        [
          { label: '红', value: 'red' },
          { label: '绿', value: 'green' },
          { label: '蓝', value: 'blue' },
        ],
        [
          { label: 'S', value: 's' },
          { label: 'M', value: 'm' },
          { label: 'L', value: 'l' },
        ],
      ],
    },
    {
      type: 'wheel-date-picker',
      label: '日期',
      name: 'date',
      testid: 'm7-wheel-date',
      min: '2026-01-01',
      max: '2026-12-31',
      placeholder: '选择日期',
    },
    {
      type: 'wheel-time-picker',
      label: '时间',
      name: 'time',
      testid: 'm7-wheel-time',
      minuteStep: 5,
      placeholder: '选择时间',
    },
    {
      type: 'wheel-cascader',
      label: '省市级联',
      name: 'region',
      testid: 'm7-wheel-cascader',
      placeholder: '选择省市',
      options: [
        {
          label: '江苏省',
          value: 'js',
          children: [
            { label: '南京市', value: 'nj' },
            { label: '苏州市', value: 'sz' },
          ],
        },
        {
          label: '浙江省',
          value: 'zj',
          children: [
            { label: '杭州市', value: 'hz' },
            { label: '宁波市', value: 'nb' },
          ],
        },
      ],
    },
    {
      type: 'picker-view',
      testid: 'm7-picker-view',
      value: [2],
      columns: [
        [
          { label: '周一', value: 1 },
          { label: '周二', value: 2 },
          { label: '周三', value: 3 },
          { label: '周四', value: 4 },
          { label: '周五', value: 5 },
        ],
      ],
    },
  ],
};

export function M7WheelPickersDemoPage({ onBack }: M7WheelPickersDemoPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-white">
          ← Back
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Wheel Pickers (M7)</p>
          <h1 className="text-sm font-semibold text-white m-0">
            M7 滚轮家族 — picker-view / wheel-picker / date / time / cascader
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center gap-8 p-6 lg:p-10">
        <div
          data-testid="m7-phone-frame"
          className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-800 bg-black shadow-2xl shrink-0"
          style={{ width: 390, height: 844 }}
        >
          <div
            className="relative w-full h-full overflow-y-auto bg-background"
            data-testid="m7-frame-scroll"
            style={{ transform: 'translateZ(0)' }}
          >
            <div className="p-3 space-y-3">
              <SchemaRenderer
                schemaUrl="playground://m7-wheel-pickers/app"
                schema={DEMO_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
                registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
                env={env}
                formulaCompiler={formulaCompiler}
              />
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">内核（M6 底座）</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              WheelView：rAF quartEaseOut 可打断惯性（300ms/15px 触发、0.003 减速）、nearest 行吸附、
              受控回写抑制（拖拽中外部写入不打断）、touchcancel 回弹不提交。
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">弹层壳</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              useGlobalZIndex 栈位 + useLockScroll 滚动锁 + nop-safe-bottom + 取消/确认工具栏；
              一个内核支撑 picker/date/time/cascader 四组件（arco 结构）。
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">命名裁定</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              `picker` 已被 form-advanced 占用、`cascader` 被 L2.6 保留 → wheel- 家族实名；
              详见 docs/components/wheel-picker/design.md §2/§7。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
