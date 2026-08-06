# 维度 23: 测试有效性与假绿（component-audit mission 多维审计）

> Mission: component-audit | 初审轮次: R1（sub-agent `ses_02c812994ffee185FvUK72EqHz`）

## 第 1 轮（初审）

### [维度23-1] xui-roles-plugin：死代码带完整测试套件（12 测试），且 plan 声称的宿主注册路径不可达

- **文件**: `packages/flux-runtime/src/plugins/xui-roles-plugin.ts:1-119` + `xui-roles-plugin.test.ts:1-150`
- **严重程度**: P1（假绿：测试存在 → 修复者误以为功能可用；plan 451 声称 Phase 4 宿主插件注册接线已通过，但注册入口不可达）
- **证据片段**:
  ```ts
  // xui-roles-plugin.ts — 真实可运行实现（beforeCompile 剪除 xui:roles 拒绝节点）
  export function createXuiRolesPlugin(options: nOptions = {}): RendererPlugin { ... }
  // src/index.ts 16 个 export 无 plugins；package.json exports 无深路径
  ```
- **现状**: `createXuiRolesPlugin` 全仓仅被自身实现与测试引用；不导出 barrel、无 exports 深路径；宿主无法导入注册。
- **风险**: 与 bug 71 "死代码带测试的假覆盖"模式同族；真实宿主按文档注册会编译失败。
- **建议**: 从 src/index.ts 导出（补 barrel 契约测试），或从 src 删除并归档测试；二选一。
- **误报排除**: 已满足 calibration 6 强证据门槛——无源引用、无 barrel、无 exports 路径、plan 声称的接线实际不可达。

### [维度23-2] gantt/components 死代码家族：export-handles / resource-load-view / filter-bar / scheduler-config（约 485 行，3 个带测试），C9 提交信息过度声称

- **文件**: `packages/flux-renderers-scheduling/src/gantt/components/export-handles.tsx:1-116`（+test）、resource-load-view.tsx、resource-load-grid.tsx、resource-load-timeline.tsx、filter-bar.tsx（+test）、scheduler-config.tsx（+test）
- **严重程度**: P1（死代码带测试 + 提交信息与实际代码不符）
- **证据片段**:
  ```ts
  // export-handles.tsx：真实实现（PNG/PDF/Excel 导出 + abort/守卫）
  export async function exportToPng(element: HTMLElement | null, options?: ExportOptions): Promise<void> { ... }
  // gantt.tsx 实际 handle：仅 zoomIn/zoomOut/scrollToToday/scrollToTask（:230-315）
  for (const key of ['zoomIn', 'zoomOut', 'scrollToToday', 'scrollToTask']) { ... }
  ```
- **现状**: 6 个组件文件在 scheduling 包内零生产导入（grep 仅命中自身与测试）；07-22 深审点名该家族（bug 71），d67897ba 删了一半（useKanbanAdder 等）但保留此残留；C9 提交声称 "reaction wiring (…print/exportPNG)" 但 gantt 侧 export-handles 从未接线（仅 calendar.tsx:156-158 接线）。
- **风险**: 假绿阻碍修复（用户点导出无反应时排查成本高）；提交信息误导。
- **建议**: 二选一：接线（gantt handle 增加 exportPNG capability + toolbar 按钮）或删除组件与测试；resource-load.ts 纯函数（205 行有效测试）可保留但移除死 UI 消费者。
- **误报排除**: 非 unwired intermediate module——自 07-20~23 创建以来从未接线，设计文档不承诺 gantt 导出。

### [维度23-3] action-core 委托测试只断言 not.toThrow，标题与断言不符

- **文件**: `packages/flux-action-core/src/__tests__/action-core.test.ts:315-320`
- **严重程度**: P2（断言过弱）
- **证据片段**:
  ```ts
  it('delegates update and merge to original scope', () => {
    const scope = createMockScope({ x: 1 });
    const wrapped = withEvaluationBindings(scope, { y: 2 });
    expect(() => wrapped.update('x', 99)).not.toThrow();
    expect(() => wrapped.merge({ x: 99 })).not.toThrow();
  });
  ```
- **现状**: 标题承诺"委托到原 scope"，断言仅验证"不抛异常"；若重构把 update 变静默 no-op，测试依旧全绿。
- **风险**: withEvaluationBindings 是 evaluationBindings 公共能力，委托断裂会导致事件参数绑定写入丢失。
- **建议**: 改为断言 scope 内 x===99 或 mock scope 的 update 被正确调用；补"bindings 可见"正向断言。
- **误报排除**: 其余 19 个仅 not.toThrow 测试（幂等 dispose/stopScan、未知 frameId no-op、空 ref 守卫）属合法负面契约，不报告；仅此一例标题承诺正向行为。

## 维度 23 零发现结论（R1）

- 固化缺陷断言：bug 71 的日历缺陷值断言已修复（calendar-layout-utils.test.ts 现断言 width===100 与标题一致）；timeline v2 / tree writeback / graph / C9 新增断言均未发现"断言=缺陷值"。
- 集成边界 mock：graph mock 外部库但捕获 props 断言接线（合理）；gantt.test 已移除 bug 71 点名的 GanttLayout 包装器 mock；carousel mock Carousel 但有 w4a e2e 兜底。
- 同义反复：`expect(true).toBe(true)` 零命中；snapshot 零命中。
- 时区敏感：calendar-date-utils 显式 UTC；ai-bubble 测试内派生期望；无 TZ 断言。
- E2E 验证可信度：全部 host-surfaces 真实浏览器 + programmatic DOM；无 debug scope dump。

## 维度复核结论

已路由（2026-08-06，0529-1 Phase 3 登记区 + `docs/backlog/component-audit-roadmap.md`「扫描发现路由登记」）：23-1/23-2 R2 复核确认属实 → 已追加 CR plan Phase 3 checklist（0529-1 Phase 4 吸收机制）；23-3（P2 候选）R2 复核完成（plan `2026-08-06-0556-1` Phase 1），属实 → 本 plan 内 fixed（action-core 委托断言强化，先红后绿），裁决见 `docs/audits/multi-audit-r2-verdicts.md`。
