# user-select

> Status: runtime（missing-components L2.1，plan 505，2026-09-25 flip）
> Owner package: `@nop-chaos/flux-renderers-form`
> 数据面契约: `docs/architecture/org-data-source-protocol.md`（plan 504；本组件是其首个消费方）

## 1. 组件定位

组织架构人员选择器：在服务端拥有的部门树/人员列表中检索并选择人员（单选/多选），产出人员 id（数组）作为表单值。面向 OA 审批、指派、抄送等场景。realism 基准为钉钉 InnerContact：搜索置顶、部门为导航层、人员为选择层、离职人员灰显不可选。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无对位 type（`select` + `source` 可拼出平铺人员列表，但无树导航/懒加载/回显解析契约）。
- 钉钉 InnerContact：搜索 + 部门导航 + 人员多选 + 禁选提示。本实现取 v1 核心（懒加载/搜索/回显/禁选/selectableTypes）；钉钉的拼音联想、虚拟部门、越级搜索不在 v1。
- 与 `select`/`tree-select` 的边界见协议 §8：`sourceSearch` 字段名与 select 的 `searchSource` 是**刻意区分的近似异位词**（org 族统一用 `source*` 前缀族），schema 作者注意勿混写。

## 3. Flux 中的 renderer/type 定义

`type: 'user-select'`，定义于 `renderers/org/org-renderer-definitions.ts`（`orgSelectRendererDefinitions`），共享渲染核心 `OrgSelectRendererControl`（`renderers/org/org-select-control.tsx`），`wrap: true`（标准字段 frame）。

## 4. schema 设计

```json
{
  "type": "user-select",
  "name": "approver",
  "label": "审批人",
  "multiple": true,
  "clearable": true,
  "selectableTypes": ["user"],
  "pageSize": 50,
  "sourceChildren": {
    "action": "ajax",
    "args": {
      "url": "/api/org/children",
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
    "args": { "url": "/api/org/search", "params": { "searchQuery": "${searchQuery}" } }
  },
  "sourceResolve": {
    "action": "ajax",
    "args": { "url": "/api/org/resolve", "params": { "orgValues": "${orgValues}" } }
  },
  "extraParams": { "corpId": "${tenantId}" }
}
```

要点：三个 source 字段均为标准 ActionSchema；scope 变量（`orgNodeId`/`orgDepth`/`searchQuery`/`orgPage`/`orgPageSize`/`orgValues`）由渲染器注入，连接器参数经 `${...}` 模板显式引用（与 select `searchSource` 的 `${searchQuery}` 先例一致）。字段语义详见 `OrgSelectSchema`（`src/schemas-org.ts`）。

## 5. 字段分类

- 值字段：`name`（必绑）、`value`（初值，单选 id / 多选 id 数组）。
- 呈现 prop：`label`/`placeholder`/`clearable`/`multiple`/`searchable`/`description`/`readOnly`/`required`/`disabled`。
- 数据面 prop：`options`（静态 OrgNode，宽容解析）/`sourceChildren`/`sourceSearch`/`sourceResolve`/`searchMergeMode`/`pageSize`/`extraParams`。
- 语义 prop：`selectableTypes`（默认 `['user']`——部门节点仅导航不可选；未标注 type 的节点视为通用可选）。

## 6. regions 与 slot 约定

无 region。选项行渲染未来若需自定义（头像/工号模板）将以 `optionTemplate` slot 扩展，v1 不开放。

## 7. 运行期状态归属

- 选中值：form 字段值（`useFormFieldFromProps`，单选 `choiceSingleAdapter` / 多选 `checkboxGroupAdapter`）。
- 面板导航栈（当前路径）、搜索词、加载态、节点懒加载缓存、echo 池：组件内部 state（`useOrgData`），零写入 scope。
- 面板开关：组件内部 state；句柄 `open` 可编程打开。

## 8. 事件、动作与组件句柄能力

组件句柄：`clear`（清为 undefined）、`reset`（回绑当前值）、`focus`（聚焦触发钮）、`open`（打开面板）。无内置事件动作；选择结果经表单值通道发布。

## 9. 数据源、表达式、导入能力接入点

数据面唯一入口是协议三操作（§9 零分叉：normalizer/envelope/变量注入/终止判定/错误键全部消费 `renderers/org/` 共享模块，禁止 fork）。`extraParams` 字符串值在派发时刻于表单 scope 求值。IO 经 ActionSchema 派发 → host fetcher，INV-1 合规，不直连网络。

## 10. 样式与 DOM marker 约定

Widget 自建样式（完整 UI 控件）。marker：`nop-org-select-field` 根类 + `data-slot="org-select-trigger|value|chip|clear|panel|search|breadcrumb|list|node|node-check|node-name|expand|loading|empty|error|retry|load-more|done"`；无 BEM；视觉类 Tailwind；`data-node-id`/`data-node-type`/`data-disabled`/`data-checked` 承载测试锚点。

## 11. 实现拆分建议

`renderers/org/`：`org-data-protocol.ts`（纯函数）+ `use-org-source.ts`（三 hooks）+ `use-org-data.ts`（复合数据面）+ `org-select-panel.tsx`（共享面板）+ `org-select-control.tsx`（渲染核心）+ 两个薄 renderer 包装 + `org-renderer-definitions.ts`。单文件 ≤500 行。

## 12. 风险、取舍与后续阶段

- v1 取舍：Popover 面板（不做移动端 Sheet 双形态——`useIsMobile` 先例存在，待需求）；搜索行不提供树导航（仅可选中）；无拼音联想。
- 分页仅提供 loadMore 追加，不做页码 UI。
- 风险：连接器未按变量名契约返回 `{nodes}` envelope 时静默为空——协议 §4.2 不做第二层猜测，靠 adapter 改写。

## 13. 响应式行为

触发钮宽度随容器；面板固定 `w-80`（窄容器下仍可用）。移动端专用形态 demand-gated。
