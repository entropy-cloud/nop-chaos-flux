import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerScadaRenderers, registerScadaSymbols } from '@nop-chaos/flux-renderers-industrial';
import {
  registerScadaEditorRenderers,
  createInMemoryTemplateStorage,
  createInMemoryStationStorage,
} from '@nop-chaos/flux-renderers-industrial/editor';
import { Button } from '@nop-chaos/ui';

// scada-editor-canvas 编辑器演示页（#/scada-editor-demo）——plan 522 完成态（L5.3/L5.4/L5.5）：
// palette 24 图元拖拽 + 端点拖拽连线 + inspector 六类字段（binding/state 结构化编辑面 L5.3）
// + toolbox 全套（含模板库 / 站点画面弹层 L5.4）+ statusBar + Edit/Preview 受控切换
// + preview 态模拟数据注入（previewMock 内置模拟源 + previewInject 句柄通道 L5.5）
// + save/export 输出可见 + onSessionChange 演示。

// plan 522 / L5.4：模板/站点内存 store（demo 级——刷新即失，宿主可注入持久化实现）。
const demoTemplateStorage = createInMemoryTemplateStorage();
const demoStationStorage = createInMemoryStationStorage();

// 初始组态：pipe-junction + 相邻设备图元，使端点拖拽连线可触发（W1）。
// plan 522 / L5.5：variables + 绑定图元（demo-live-text.text ← tank_level），preview 态数据注入可见。
// 模块级常量：mode 切换重建 schema 时保持 config 对象 identity 稳定，
// 避免触发 use-editor-engine 的 controlled config 推回（load 会重置会话 + 清空 undo 栈）。
const DEMO_INITIAL_CONFIG = {
  version: 1,
  variables: [
    { id: 'tank_level', source: 'static', value: 60 },
    { id: 'pump_running', source: 'static', value: true },
  ],
  symbols: [
    {
      id: 'demo-junction',
      type: 'scada-pipe-junction',
      x: 150,
      y: 170,
      width: 130,
      height: 52,
      custom: { connections: [] },
    },
    { id: 'demo-pump', type: 'scada-device-pump', x: 540, y: 140, width: 120, height: 120 },
    { id: 'demo-rect', type: 'scada-rect', x: 200, y: 330, width: 160, height: 100, fill: '#1565c0' },
    {
      id: 'demo-live-text',
      type: 'scada-text',
      x: 220,
      y: 368,
      // 静态占位取绑定初值格式化结果（tank_level=60, '%d'）——edit 态显示真实读数
      // 而非 "LIVE" 调试字样（ux-r10 SC-3 产品化裁定：绑定演示保留，静态文本产品化）。
      text: '60',
      textSize: 18,
      textColor: '#ffffff',
      bindings: { text: { point: 'tank_level', format: '%d' } },
    },
    { id: 'demo-ellipse', type: 'scada-ellipse', x: 620, y: 330, width: 80, height: 80, fill: '#e74c3c' },
  ],
};

// Load 按钮装载的固定 2 图元 config（保持既有演示能力）。
const DEMO_LOAD_CONFIG = {
  version: 1,
  variables: [],
  symbols: [
    { id: 'loaded-rect', type: 'scada-rect', x: 100, y: 100, width: 150, height: 100, fill: '#1565c0' },
    { id: 'loaded-text', type: 'scada-text', x: 120, y: 120, text: 'Loaded', textSize: 16, textColor: '#ffffff' },
  ],
};

// W4：Edit/Preview 受控切换——mode prop 按钮组（schema 内按钮组 + setValue 写 modeVar）。
// mode 经 `${modeVar || "edit"}` 表达式（动态 prop）消费：scope 变更 → 画布 props 重解析 →
// use-editor-engine 的 controlled mode 推回（P1-09）触发 runtime.switchMode。
// 注意不能改用「schema 对象整体替换 + 静态 mode 字面量」实现切换——静态节点的 resolved props
// 在节点已挂载后被缓存，静态字面量变更不会重解析（实测 mode 停留 edit）。
const DEMO_SCHEMA = {
    type: 'page',
    body: [
      {
        type: 'flex',
        direction: 'column',
        className: 'gap-3',
        body: [
          {
            type: 'flex',
            direction: 'row',
            className: 'flex-wrap items-center gap-2',
            body: [
              {
                // W2：Save 结果可见化——component:save 返回 serializedConfig，经 then → setValue 写入
                // 页内变量 saveOutput（${result.data} 取上一动作返回值），由下方 collapse 输出区展示。
                // 注意：事件 args 中的 `${event.*}` 模板在 raw 事件通道不参与求值（求值 scope 不含 event），
                // 故 serializedConfig 经 result.data 通道展示，onSave 事件本身以 toast 演示。
                type: 'button',
                label: 'Save',
                testid: 'editor-btn-save',
                onClick: {
                  action: 'component:save',
                  componentId: 'editor-canvas',
                  then: [
                    { action: 'setValue', args: { path: 'saveOutput', value: '${result.data}' } },
                  ],
                },
              },
              {
                type: 'button',
                label: 'Load',
                testid: 'editor-btn-load',
                onClick: {
                  action: 'component:load',
                  componentId: 'editor-canvas',
                  args: { config: DEMO_LOAD_CONFIG },
                },
              },
              {
                // W3：导出可见化——消费 component:exportConfig 句柄，把返回 JSON 经 then → setValue
                // 写入页内变量 exportOutput，由下方 collapse 输出区展示。
                type: 'button',
                label: '导出配置到页面',
                testid: 'editor-btn-export',
                onClick: {
                  action: 'component:exportConfig',
                  componentId: 'editor-canvas',
                  then: [
                    { action: 'setValue', args: { path: 'exportOutput', value: '${result.data}' } },
                  ],
                },
              },
              {
                type: 'button',
                label: 'Edit',
                testid: 'editor-mode-edit',
                onClick: { action: 'setValue', args: { path: 'modeVar', value: 'edit' } },
              },
              {
                type: 'button',
                label: 'Preview',
                testid: 'editor-mode-preview',
                onClick: { action: 'setValue', args: { path: 'modeVar', value: 'preview' } },
              },
              {
                // plan 522 / L5.5：host 数据注入句柄通道——preview 态向画布注入一次静态值
                //（demo 模拟源 previewMock 已自动随机游走注入；此按钮演示宿主主动注入）。
                type: 'button',
                label: '注入预览数据',
                testid: 'editor-btn-inject',
                onClick: {
                  action: 'component:previewInject',
                  componentId: 'editor-canvas',
                  args: { values: { tank_level: 42, pump_running: true } },
                },
              },
              {
                type: 'button',
                label: '清除注入',
                testid: 'editor-btn-clear-inject',
                onClick: { action: 'component:previewClear', componentId: 'editor-canvas' },
              },
            ],
          },
          {
            type: 'scada-editor-canvas',
            id: 'editor-canvas',
            width: 960,
            height: 520,
            mode: '${modeVar || "edit"}',
            config: DEMO_INITIAL_CONFIG,
            // plan 522 / L5.5：preview 态内置模拟源（进入 preview 自动随机游走注入 tank_level/pump_running；
            // 离开 preview / 卸载自动停止 + 场景还原）。preview 态画布只读（R5 双态隔离）。
            previewMock: { intervalMs: 800 },
            // plan 522 / L5.4：demo 内存模板库 / 站点存储（toolbox「模板」「画面」弹层消费）。
            // `as never`：宿主回调对象非 JSON SchemaValue（registry as never 同型 cast 惯例）。
            templateStorage: demoTemplateStorage as never,
            stationStorage: demoStationStorage as never,
            // W2：onSave / onSessionChange 事件接线演示。事件 args 不引用 `${event.*}` 模板
            // （求值 scope 不含 event——见上方 Save 按钮注释），payload 经 Save 的 result.data 通道可见；
            // 会话变更以静态值写 sessionDirty，由 collapse 输出区反应式展示。
            events: {
              onSave: {
                action: 'showToast',
                args: { level: 'success', message: 'scada-editor: save 已提交（onSave 已派发）' },
              },
              onSessionChange: {
                action: 'setValue',
                args: { path: 'sessionDirty', value: true },
              },
            },
          },
          {
            // W3/W2 输出区：可折叠（collapse，layout renderers）；默认全部展开使输出立即可见。
            type: 'collapse',
            className: 'mt-1',
            defaultValue: ['export', 'save', 'session'],
            items: [
              {
                key: 'export',
                title: '导出 JSON（component:exportConfig）',
                body: [
                  {
                    type: 'text',
                    text: '${exportOutput}',
                    testid: 'editor-output-export',
                    className: 'font-mono text-xs break-all whitespace-pre-wrap',
                  },
                ],
              },
              {
                key: 'save',
                title: '保存 serializedConfig（onSave）',
                body: [
                  {
                    type: 'text',
                    text: '${saveOutput}',
                    testid: 'editor-output-save',
                    className: 'font-mono text-xs break-all whitespace-pre-wrap',
                  },
                ],
              },
              {
                key: 'session',
                title: '会话变更状态（onSessionChange）',
                body: [
                  {
                    type: 'text',
                    text: '会话已变更：${sessionDirty}',
                    testid: 'editor-output-session',
                    className: 'font-mono text-xs break-all',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
};

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerLayoutRenderers(registry);
registerScadaRenderers(registry);
registerScadaSymbols();
registerScadaEditorRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

function makeDemoEnv(): RendererEnv {
  return {
    fetcher: async <T,>() => ({ status: 0, data: {} as T }),
    notify: (_level, message) => console.log('[scada-editor-demo]', message),
    navigate: () => undefined,
  };
}

interface ScadaEditorDemoPageProps {
  onBack: () => void;
}

export function ScadaEditorDemoPage({ onBack }: ScadaEditorDemoPageProps) {
  const env = useMemo(() => makeDemoEnv(), []);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button
          variant="outline"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Industrial HMI Editor · M3
        </p>
        <h1 className="m-0 mb-2">scada-editor-demo 编辑器演示页</h1>
        {/* ux-r10 SC-3/G-4：开发态说明收进折叠说明——打开即画布，不用 ~300 字内部文档挡首屏 */}
        <details className="mb-4 text-sm text-[var(--nop-body-copy)]">
          <summary className="cursor-pointer select-none text-[13px] font-medium opacity-80">
            编辑器能力速览（点开查看操作说明与提交语义）
          </summary>
          <p className="mt-2 leading-relaxed">
            编辑器完整能力演示：palette 图元库（24 内置图元，拖拽放置）· 画布编辑（单选/框选/拖动/缩放/旋转/成组）
            · <strong>连线</strong>——按住「管道接头」端点拖到相邻设备（水泵/阀门）释放即可创建连线 ·
            toolbox 工具箱（对齐×6/分布×2/z-order×4/复制剪切粘贴/undo-redo/导入导出/连接管理/撤销历史/图层树/
            <strong>模板库</strong>/<strong>站点画面</strong>）· inspector 属性面板（六类字段 +
            <strong>绑定/状态结构化编辑面</strong>：点引用选择器 + 表达式编辑分离 + junction 连线只读列表）·
            statusBar（视口/模式/选区/历史深度）。
          </p>
          <p className="mt-2 text-[13px] leading-relaxed opacity-80">
            提交语义：commitPolicy 缺省为 manual——编辑停留在 working copy，点 Save 提交并派发 onSave（保存结果见下方
            「保存 serializedConfig」折叠区）。Edit/Preview 按钮组受控切换 mode prop：preview 态画布只读（R5 双态隔离），
            且 <strong>模拟数据源自动注入</strong>（tank_level 正弦游走 → 液位读数实时变化；「注入预览数据」按钮演示
            component:previewInject 宿主通道，切回 Edit 画布自动还原）。模板库/站点画面为 demo 内存存储——刷新即失。
          </p>
        </details>
        <div className="mt-2">
          <SchemaRenderer
            schemaUrl="playground://pages/scada-editor-demo"
            schema={DEMO_SCHEMA}
            env={env}
            registry={registry as never}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
