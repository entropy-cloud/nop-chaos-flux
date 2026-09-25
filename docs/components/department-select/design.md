# department-select

> Status: runtime（missing-components L2.1，plan 505，2026-09-25 flip）
> Owner package: `@nop-chaos/flux-renderers-form`
> 数据面契约: `docs/architecture/org-data-source-protocol.md`（plan 504；与 user-select 共享同一实现）

## 1. 组件定位

组织架构部门选择器：在服务端拥有的部门层级树中懒加载浏览并选择部门（单选/多选），产出部门 id 作为表单值。realism 基准为钉钉 DepartmentField：层级懒加载、逐级导航、可配置的非叶子部门可选。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无对位 type；`tree-select` 是通用树选择（`childrenSource` 懒加载通道），但无分页/搜索/回显解析契约与 org normalizer。协议 §8 裁决：org 族一律走本协议通道，**不复用、不混用** `childrenSource`，两者互不迁移。
- 钉钉 DepartmentField：逐级进入 + 面包屑 + 多选。本实现 v1 核心即此；部门人员数角标、可见范围权限过滤不在 v1。

## 3. Flux 中的 renderer/type 定义

`type: 'department-select'`，与 user-select 同载于 `renderers/org/org-renderer-definitions.ts`，共享渲染核心 `OrgSelectRendererControl` 与面板 `OrgSelectPanel`——第二呈现配置：`selectableTypes` 默认 `['department']`，部门行同时具备「勾选 + 下钻」两个动作。

## 4. schema 设计

```json
{
  "type": "department-select",
  "name": "costCenter",
  "label": "成本中心",
  "multiple": true,
  "sourceChildren": {
    "action": "ajax",
    "args": {
      "url": "/api/dept/children",
      "params": {
        "orgNodeId": "${orgNodeId}",
        "orgDepth": "${orgDepth}",
        "orgPage": "${orgPage}",
        "orgPageSize": "${orgPageSize}"
      }
    }
  },
  "sourceSearch": {
    "action": "ajax",
    "args": { "url": "/api/dept/search", "params": { "searchQuery": "${searchQuery}" } }
  },
  "sourceResolve": {
    "action": "ajax",
    "args": { "url": "/api/dept/resolve", "params": { "orgValues": "${orgValues}" } }
  }
}
```

字段语义与 user-select 完全同构（`OrgSelectSchema` 公共契约）；差异仅在 `selectableTypes` 默认值。搜索合并模式 `searchMergeMode`（append/replace，默认 append）与 select `searchSource` 近似异位词警示同 user-select design.md §2。

## 5. 字段分类

同 user-select（§5）：值/呈现/数据面/语义四类，公共契约 `OrgSelectSchema`；唯一默认差异 `selectableTypes: ['department']`——非部门类型节点仅导航；未标注 type 的节点视为通用可选。

## 6. regions 与 slot 约定

无 region（同 user-select §6）。

## 7. 运行期状态归属

同 user-select（§7）：值在 form，导航/懒加载缓存/echo 池在组件内部。空 children 响应把节点标记「已加载（空）」，再展开不重发（协议 §5 空页缓存）。

## 8. 事件、动作与组件句柄能力

组件句柄：`clear` / `reset` / `focus` / `open`（同 user-select §8）。

## 9. 数据源、表达式、导入能力接入点

数据面唯一入口是协议三操作，共享实现模块与 user-select / region 完全同一份（`renderers/org/`，协议 §9 零分叉）；`orgDepth` 语义供分级取数（region 将复用）。IO 经 ActionSchema 派发 → host fetcher。

## 10. 样式与 DOM marker 约定

与 user-select 完全同一套 marker 集（§10）；面板行按 `data-node-type` 呈现差异。

## 11. 实现拆分建议

无新增文件——完全复用 `renderers/org/` 共享模块与面板，仅薄包装 + 定义注册（第 3 节）。

## 12. 风险、取舍与后续阶段

- v1 取舍：非叶子部门默认可选（provider 需要仅叶子可选时以 `leaf` 标记 + selectableTypes 组合表达）；不做可见范围权限过滤。
- 风险同 user-select（§12）。

## 13. 响应式行为

同 user-select（§13）。
