# input-city

> Status: runtime（missing-components L2.2，plan 506，2026-09-25 flip）
> Owner package: `@nop-chaos/flux-renderers-form`
> 数据面契约: `docs/architecture/org-data-source-protocol.md`（与 user-select/department-select 共享同一实现，QA.3 零分叉复核对象）

## 1. 组件定位

省市区级联选择器：在 host 提供的行政区划数据中逐级浏览并选定一层节点（省/市/区均可作为值），产出节点 id 字符串。物流/账单地址场景。dataset-coupled：数据来源与持久缓存归 host，渲染器仅会话内缓存已加载层级。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS `input-city`：基于内置行政区数据集的级联选择（allowCity/allowDistrict/extractValue）。本实现**不内置数据集**——数据面走 org 协议三操作（host 经 ActionSchema 提供省市区数据），其余交互对齐：全层级可选、一级提交。
- Vant `Area`：移动端滚轮。本实现以 CSS scroll-snap 自建滚轮列（form 包内 widget 自建样式，不进 ui 公共导出），响应式分支沿 tree-select 的 `useIsMobile` 双形态先例。
- 定名依据（plan 506 命名决议）：matrix §5 既有行名 + AMIS 源类型均为 `input-city`；`region` 与渲染契约既有 slot 词汇（`kind: 'region'`/`props.regions`）冲突，弃用。

## 3. Flux 中的 renderer/type 定义

`type: 'input-city'`，定义于 `renderers/org/org-renderer-definitions.ts`（`inputCityRendererDefinition`），组件 `InputCityRenderer`（`renderers/org/region-renderer.tsx`），`wrap: true`。

## 4. schema 设计

```json
{
  "type": "input-city",
  "name": "region",
  "label": "所在地区",
  "clearable": true,
  "sourceChildren": {
    "action": "ajax",
    "args": {
      "url": "/api/region/children",
      "params": {
        "orgNodeId": "${orgNodeId}",
        "orgDepth": "${orgDepth}",
        "orgPage": "${orgPage}",
        "orgPageSize": "${orgPageSize}"
      }
    }
  },
  "sourceResolve": {
    "action": "ajax",
    "args": { "url": "/api/region/resolve", "params": { "orgValues": "${orgValues}" } }
  },
  "extraParams": { "dataset": "china-2026" }
}
```

`InputCitySchema` = `Omit<OrgSelectSchema, 'sourceSearch' | 'multiple' | 'searchable' | 'searchMergeMode'>` 的窄化接口：**本 type 无 `sourceSearch`**（级联浏览为主，协议 §1 region 行 search 可选语义的窄化选择）、无多选/可搜索/合并模式。分级即协议 `orgDepth` 语义（0=省、1=市、2=区），不得另立分级字段。

## 5. 字段分类

- 值字段：`name`（必绑）、`value`（选中层节点 id 字符串）。
- 呈现 prop：`label`/`placeholder`/`clearable`/`description`/`readOnly`/`required`/`disabled`。
- 数据面 prop：`options`（静态 OrgNode）/`sourceChildren`/`sourceResolve`/`pageSize`/`extraParams`。
- 语义 prop：`selectableTypes`（默认空 = 全层级可选，协议 §3；provider 可用 type 标注 + 该字段收窄可层级）。

## 6. regions 与 slot 约定

无 region。

## 7. 运行期状态归属

- 值：form 字段（`choiceSingleAdapter`）。
- 列导航路径、选中路径表（id→层级链）、wheel 各列选择：组件内部 state，零 scope 写入。
- 层级数据缓存：`useOrgData` 会话内 nodeStates（空页缓存/重试语义与 org 族一致）。

## 8. 事件、动作与组件句柄能力

组件句柄：`clear` / `reset` / `focus` / `open`。选择结果经表单值通道发布。

## 9. 数据源、表达式、导入能力接入点

数据面唯一入口是协议三操作（children/resolve；**无 search**），全部消费 505 共享模块 `renderers/org/`（`useOrgData`），本组件零新增解析/注入/终止实现。回显路径三通道（plan 506「回显路径机制裁决」）：①会话内选择路径表；②初值 resolve 返回节点后消费 `extra.path`（`OrgNode[]`，祖先→自身——协议 §3 `extra`「消费端按需读取」授权，provider 可选提供，**非协议词表强制**）；③降级原始值字符串（协议 §7）。

## 10. 样式与 DOM marker 约定

Widget 自建样式。marker：`nop-input-city-field` 根类 + `data-slot="region-trigger|value|clear|panel|backdrop|columns|column|node|node-name|node-expand|load-more|loading|empty|error|retry|wheel|wheel-sheet|wheel-column|wheel-confirm"`；行级 `data-node-id`/`data-node-type`/`data-selected`/`data-disabled` 测试锚点；无 BEM。

## 11. 实现拆分建议

`renderers/org/` 内三文件：`region-renderer.tsx`（核心：触发钮/echo 路径表/响应式分支）、`region-columns.tsx`（桌面列面板）、`region-wheel.tsx`（移动滚轮 Sheet）。滚轮定值：CSS scroll-snap + 滚动停止 120ms 计时取最近项；点击与程序滚动后 600ms 抑制窗防覆盖显式选择。

## 12. 风险、取舍与后续阶段

- v1 取舍：单选（AMIS input-city 亦单选）；无搜索面板；wheel 以原生滚动实现（无惯性动量曲线定制）；`extra.path` 为 provider 可选约定。
- 风险：scrollend 事件兼容不均 → 计时器兜底（已实现）；服务端层级深度 >3 时列数截断于 3（v1 只承载省市区三级，协议变量不设上限但本组件 UI 以 3 级为界）。

## 13. 响应式行为

`useIsMobile` 分支：桌面 Popover 式列面板（absolute + backdrop 关闭）；移动端底部 Sheet + 三列滚轮 + 确认钮。两形态共享同一渲染核心与数据面。
