/**
 * raw-control-element exemption baseline for `find-ui-consistency-gaps.mjs`
 * (plan 864 G9 split: the raw-control registrations outgrew the 700-line gate
 * ceiling of `ui-consistency-exemptions.mjs` when appended — pure data, split
 * by responsibility per repo convention; merged back into `EXEMPTIONS` there).
 *
 * Adjudicated pre-existing raw `<button|select|textarea|label>` instances;
 * every entry carries a reason + adjudication backlink (`source`) and a
 * `count` = the registered-day live instance count (2026-11-10 reconciliation:
 * 30 files / 44 instances). Growth beyond `count` fails the gate; a
 * same-file remove+add that keeps the count constant stays a code-review
 * responsibility.
 */

export const RAW_CONTROL_EXEMPTIONS = [
  // --- raw-control-element (plan 864 G9) -------------------------------------
  // plan 859 D3 裁决的机械门禁在本 plan 落地：现存 raw 控件全部登记为已裁决形态
  // （859 migrate/exception 收口余量 + mobile 手势域 / 日历 gridcell / 设计器
  // 与调试面板工具域），规则只防新增。`count` = 登记日 live 对账数
  // （2026-11-10，30 文件 / 44 实例）；文件内实例增长超过 count 即红。同文件
  // 删一加一（实例数不变）不可见，由代码评审把关。
  {
    path: 'packages/flux-renderers-form/src/renderers/org/region-columns.tsx',
    rule: 'raw-control-element',
    count: 2,
    reason: 'plan 859 例外 #7/#8：错误句内 retry 文字链接与行内截断节点标签（text-level affordance，ui Button 控件盒对行内/句内位过重）',
    source: 'plan 859 收口例外清单（#7 句内文字链接 / #8 行内截断标签）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-form/src/renderers/org/org-select-panel.tsx',
    rule: 'raw-control-element',
    count: 4,
    reason: 'plan 859 例外 #12（行内截断标签）+ #17（句内文字链接）；:239/:253 为 859 迁移形态 BreadcrumbLink render={<button type="button" />}（面包屑链接渲染面，非独立 raw 控件）',
    source: 'plan 859 收口例外清单（#12/#17）+ 迁移形态（Breadcrumb/BreadcrumbLink）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-form/src/renderers/cron-editor-renderer.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'plan 859 例外 #19：cron 分档选择器 segmented radio（role="radio" + roving tabindex + 容器方向键处理；ui ToggleGroup 是 pressed 语义、RadioGroupItem 是圆点 radio，均破坏该契约）',
    source: 'plan 859 收口例外清单（#19 segmented radio）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-industrial/src/editor/context-menu.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'plan 859 例外 #21：SCADA canvas 引擎右键菜单 menuitem（canvas 定位/键盘强耦合，DropdownMenuItem 不适用）',
    source: 'plan 859 收口例外清单（#21 canvas 引擎菜单）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'detail-view 行内查看触发器（inline viewer trigger，text-level affordance 口径：flex 行内左对齐标签位，ui Button 控件盒布局过重）',
    source: 'plan 864 G9 豁免登记（执行期裁决，同 plan 859 行内 affordance 判例口径）',
  },
  {
    path: 'packages/flux-renderers-form-advanced/src/picker-renderer.tsx',
    rule: 'raw-control-element',
    count: 2,
    reason: 'picker tag chip 复合控件内部按钮（chip 内 truncate 标签展开 + chip 移除 ×；chip 内嵌位非独立动作按钮，无 ui 对应物）',
    source: 'plan 864 G9 豁免登记（执行期裁决：复合控件内部控件）',
  },
  // mobile 手势/自绘交互域：数字键盘、滚轮选择器、动作面板——自绘触控交互，
  // ui 无语义等价物（plan 859「判定可接受」对照面同口径）。
  {
    path: 'packages/flux-renderers-mobile/src/action-sheet.tsx',
    rule: 'raw-control-element',
    count: 3,
    reason: 'mobile 动作面板自绘触控行（手势域，ui 无语义等价物；plan 859 对照面口径）',
    source: 'plan 859「判定可接受」对照面（mobile 手势域）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-mobile/src/number-keyboard.tsx',
    rule: 'raw-control-element',
    count: 2,
    reason: 'mobile 数字键盘按键（自绘触控键盘，手势域，ui 无对应物）',
    source: 'plan 859「判定可接受」对照面（mobile 手势域）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-mobile/src/wheel-cascader.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'mobile 滚轮选择器滚轮行（手势域，ui 无对应物）',
    source: 'plan 859「判定可接受」对照面（mobile 手势域）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-mobile/src/wheel-date-picker.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'mobile 滚轮选择器滚轮行（手势域，ui 无对应物）',
    source: 'plan 859「判定可接受」对照面（mobile 手势域）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-mobile/src/wheel-picker.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'mobile 滚轮选择器滚轮行（手势域，ui 无对应物）',
    source: 'plan 859「判定可接受」对照面（mobile 手势域）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-mobile/src/wheel-time-picker.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'mobile 滚轮选择器滚轮行（手势域，ui 无对应物）',
    source: 'plan 859「判定可接受」对照面（mobile 手势域）；plan 864 G9 豁免登记',
  },
  // scheduling 日历 gridcell：日历格可点单元（month-view 3 处 + grid-view 1 处）。
  {
    path: 'packages/flux-renderers-scheduling/src/calendar/components/calendar-grid-view.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: '日历 gridcell 可点格（role="gridcell" 网格语义，ui 无对应物；plan 859 对照面口径）',
    source: 'plan 859「判定可接受」对照面（日历 gridcell）；plan 864 G9 豁免登记',
  },
  {
    path: 'packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx',
    rule: 'raw-control-element',
    count: 3,
    reason: '日历月视图 gridcell/事件 chip 可点格（role="gridcell" 网格语义，ui 无对应物）',
    source: 'plan 859「判定可接受」对照面（日历 gridcell）；plan 864 G9 豁免登记',
  },
  // 设计器与调试面板工具域：flow/page/print/report 设计器画布周边、
  // flux-react 上下文菜单 surface、xlang 调试面板、AI 调试面板——工具型 UI，
  // 不进产品渲染面。
  {
    path: 'packages/flow-designer-renderers/src/designer-edge-row.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'flow 设计器边行工具按钮（设计器工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/flow-designer-renderers/src/designer-node-card.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'flow 设计器节点卡工具按钮（设计器工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-context-menu.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'flow 设计器画布右键菜单 menuitem（canvas 定位强耦合，同 plan 859 #21 口径）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，同 plan 859 #21 canvas 菜单判例）',
  },
  {
    path: 'packages/flux-print-renderers/src/print-designer.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'print 设计器工具按钮（设计器工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/flux-react/src/context-menu-surface.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: '框架层上下文菜单 surface menuitem（受控定位 surface，同 plan 859 #21 canvas 菜单口径）',
    source: 'plan 864 G9 豁免登记（框架受控 surface，同 plan 859 #21 判例）',
  },
  {
    path: 'packages/flux-xlang-debug/src/panel/call-stack-panel.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'xlang 调试面板工具按钮（调试工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/flux-xlang-debug/src/panel/control-buttons.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'xlang 调试面板工具按钮（调试工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/flux-xlang-debug/src/panel/debug-panel.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'xlang 调试面板工具按钮（调试工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/flux-xlang-debug/src/panel/eval-input.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'xlang 调试面板求值提交按钮（调试工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/flux-xlang-debug/src/panel/variables-tree.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'xlang 调试面板变量树工具按钮（调试工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/nop-debugger-ai/src/panel/patch-queue.tsx',
    rule: 'raw-control-element',
    count: 5,
    reason: 'AI 调试面板 patch 队列工具按钮组（调试工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/nop-debugger-ai/src/panel/session.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'AI 调试面板会话工具按钮（调试工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/page-designer-renderers/src/page-designer-context-menu.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'page 设计器画布右键菜单 menuitem（canvas 定位强耦合，同 plan 859 #21 口径）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，同 plan 859 #21 canvas 菜单判例）',
  },
  {
    path: 'packages/page-designer-renderers/src/palette-panel.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'page 设计器组件面板项（设计器工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/page-designer-renderers/src/structure-tree.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'page 设计器结构树行（设计器工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
  {
    path: 'packages/report-designer-nop-report/src/renderers.tsx',
    rule: 'raw-control-element',
    count: 1,
    reason: 'report 设计器工具按钮（设计器工具域）',
    source: 'plan 864 G9 豁免登记（设计器/调试工具域，执行期裁决）',
  },
];
