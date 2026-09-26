# Resizable 设计文档（flux 原生布局扩展 type）

> Status: active（plan 514 L4.6 落地）
> Last Reviewed: 2026-09-26
> Source: `docs/discussions/2026-09-26-l4-2-l4-6-calendar-grid-and-resizable-adjudication.md` §2；C1:36 G-J → C2 裁决表 :31 → D2-closure :72 登记链

## 1. 定位

`resizable` 是 schema 可表达的分栏布局原语：把 `@nop-chaos/ui` 的 react-resizable-panels 包装（`ResizablePanelGroup/Panel/Handle`）暴露为 renderer type，使「可拖拽分栏」从设计器内部 bespoke 实现升格为作者可声明的能力。归属 `flux-renderers-layout`（layout/actions 包章程）。

## 2. 与既有实现的对照

- workbench-shell / flow-designer designer-page-body / dashboard-editor 的指针分栏为**内部壳层 UI**，保留声明豁免不迁移（C2 回写⑮/513 移交注记同口径）——本 type 服务 schema 面，不统一内部实现。
- 拒绝的替代路由：flex/panel 增语义字段（方向/尺寸语义与 flex 正交，字段面纠结）；page 级 slot（越出页面壳层职责）。

## 3. Renderer 定义

- type：`resizable`；category `layout`；定义落 `flux-renderers-layout/src/layout-renderer-definitions.ts`（`resizableRendererDefinition` 命名导出 + 注册表项）。
- 无 AMIS 基线对照（flux 原生扩展，keyboard/batch-bar 先例）→ 不触发 matrix flip；retention 记录以本文档 + quick-reference 为准。

## 4. Schema

```json
{
  "type": "resizable",
  "direction": "horizontal",
  "persistStatePath": "$page.layout",
  "panels": [
    { "key": "nav", "defaultSize": 3, "min": 1, "max": 6, "body": [] },
    { "key": "main", "body": [] }
  ]
}
```

- `direction: 'horizontal' | 'vertical'`，缺省 horizontal。
- `panels[].key` 必填唯一（持久化槽位 + React key）；`defaultSize/min/max` 为**百分比**（以 `'35%'` 字符串形式传参；settle 时 flexGrow 归一化为百分比数组）；`panels[].body` 为面板 schema（编译为 region，经 `bodyRegionKey` 渲染）。
- `persistStatePath`：拖拽 settle 后把 flexGrow 归一化的百分比数组回写 scope；挂载读回种子（长度不匹配/全部非法 → 回落 defaultSize）。

## 5. 字段分类

| 字段                             | 类别                           | 说明                                                    |
| -------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `direction` / `persistStatePath` | prop                           | 布局轴 / 持久化通道                                     |
| `panels`                         | prop（schema-definition 数组） | `key/defaultSize/min/max` 字面规则 + `body` region 规则 |

## 6. Region

每 panel 的 `body` 编译为独立 region（`panels.<i>.body`），渲染时经 `props.regions[bodyRegionKey].render()` 输出；无独立 header/footer region（手柄由 renderer 自动生成）。

## 7. 状态归属

- 面板尺寸：react-resizable-panels 内部受控（flex 布局）；`persistStatePath` 仅做「settle 回写 + 挂载种子」，不建第二 state 通道。
- 选中/折叠等交互态：不适用（本 type 无选择语义）。

## 8. 事件句柄

无 schema 事件。手柄交互由库内建（指针 + 键盘方向键），aria-label 走 `flux.layout.resizeHandle`（zh/en）。

## 9. 数据源

无。面板 body 各自承载数据（由其内部 schema 决定）。

## 10. 样式 marker

`data-slot="resizable-root"`（meta testid/cid 挂载点——panels 库会用生成 id 覆写 group 的 testid，故 meta 属性在外层 div）/ `data-slot="resizable-panel-group"` / `data-slot="resizable-panel"`（`data-panel-key`）/ `data-slot="resizable-panel-handle"`。视觉沿用 ui resizable 包装的 Tailwind 类。

## 11. 实现拆分

- `resizable-renderer.tsx`（渲染面 + 种子/回写）；
- `layout-renderer-definitions.ts`（`resizableRendererDefinition`）；
- `schemas.ts`（`ResizableSchema`/`ResizablePanelSchema`）；
- 测试 `resizable-renderer.test.tsx` + e2e `resizable-layout.spec.ts`（键盘方向键调整断言）+ layout lab 场景。

## 12. 风险

- panels 库版本升级改变 Layout 语义（当前 v4.9 flexGrow 映射）→ 持久化数组失配，回落 defaultSize 兜底。
- panels 数量与持久化数组长度不一致 → 种子作废（回落 defaultSize）。
- 与 bespoke 分栏并存的双轨（声明豁免）——若未来统一迁移，属独立 plan。
