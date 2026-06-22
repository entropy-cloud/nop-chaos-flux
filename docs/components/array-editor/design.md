# Array Editor 组件设计

## 1. 组件定位

- `array-editor` 是简单数组值编辑字段。
- 它负责一维列表项的新增、删除和重排，不承担复杂对象树编辑。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `itemLabel`，并把自身声明为 `array` 值字段，至少要求一项。
- 多列 item schema、自定义子表单和拖拽排序属于后续能力。

### Flux 决策表（X5 扩展，E3）

| 能力                                                             | 首版决定                 | 理由                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minItems?: number`（缺省 `1`，覆盖原硬编码）                    | **实现**（E3）           | 列表字段标配约束；validation contributor 读 schema 而非硬编码 `1`，允许业务配置 `minItems: 0`（可空数组）或 `minItems: 2`（至少两项）。                                                                                                                                                                                           |
| `maxItems?: number`（缺省无上限）                                | **实现**（E3）           | 列表字段标配约束；达到 `maxItems` 时新增按钮 **disabled**（不隐藏，保留可发现性，见 Decision）。                                                                                                                                                                                                                                  |
| 重排（上移 / 下移按钮）                                          | **实现**（E3）           | 对接 form runtime `moveValue(name, from, to)`；边界 disabled（首行禁上移、末行禁下移）。a11y 友好、可观测、契约最小。                                                                                                                                                                                                             |
| `component:moveItem` 句柄                                        | **实现**（X1-successor） | 句柄注册已由 X1-successor plan（`docs/plans/2026-06-22-1137-1-x1-successor-composite-editor-handles-plan.md`）收口：`component:addItem`/`removeItem`/`moveItem` 三 handle 经共享 `createCompositeFieldHandle` 工厂注册，对接 form runtime `appendValue`/`removeValue`/`moveValue`（scope owner 回退调 `scope.update`）。详见 §8。 |
| 多列 / 任意 per-item schema / tabs 模式 / 扁平值输出             | 不采纳（后续）           | 高端 Combo 能力，与 `array-field`/`combo`/`input-table` 边界冲突；当前 `Array<{ id, value }>` 单列模型已覆盖简单数组编辑。需复杂 item schema 应升级为 `array-field`（per-item form region），而不是在 `array-editor` 偷偷开放任意 region（DESIGN-ACK-NOT-IMPL）。                                                                 |
| 拖拽重排（drag-and-drop）                                        | 不采纳（后续）           | 上下移动按钮已满足 reorder 契约（可观测、对接 moveValue、a11y 友好）；`@dnd-kit` 已是 `flux-renderers-form-advanced` 依赖可用，drag 是 DX 糖而非契约必需，归后续增强（见 plan Deferred）。                                                                                                                                        |
| item 复制 / `deleteConfirmDialog` / `addable`-`removable` toggle | 不采纳（后续）           | 次要 UX，当前 remove + append 已覆盖核心编辑；删除确认属全局 UX 模式，应在 form runtime 或表层统一处理，不在 `array-editor` 内嵌。归后续。                                                                                                                                                                                        |

**Decision（reorder 机制，E3）**：采用**上下移动按钮**（非 drag），对接 form runtime `moveValue(name, from, to)`。无 form runtime（scope owner 回退模式）时**镜像现有 append/remove 的 scope-owner 回退路径**：调 `scope.update` 重排数组，按钮**保持 enabled**（Failure Path `movevalue-scope-fallback`），而非 disabled —— 因为 scope owner 模式下值仍可写，禁用会让用户误以为不可用。

**Decision（maxItems UX，E3）**：达到 `maxItems` 时新增按钮 **disabled**（非隐藏），与达到 `minItems` 时删除按钮 disabled 对称；保留按钮可发现性，让用户知道「可以新增/删除，只是当前受限」而非「没有这个能力」。视觉上沿用 shadcn `disabled` 态。

## 3. Flux 中的 renderer/type 定义

- `type: 'array-editor'`
- `sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `kind: 'field'`、`valueKind: 'array'`

## 4. schema 设计

- 继承 `InputSchema`，并增加 `itemLabel`、`minItems?: number`（缺省 `1`）、`maxItems?: number`（缺省无上限）。
- 当前值模型是 `Array<{ id: string; value: string }>`。
- `minItems`/`maxItems` 由 validation contributor 读取并产出 `kind: 'minItems'`/`kind: 'maxItems'` 规则；UI 层在达到 `minItems` 时禁用删除、达到 `maxItems` 时禁用新增。
- 后续如需复杂 item schema，建议单独设计 `itemSchema` / `itemRenderer`，不要直接复用任意 region。

## 5. 字段分类

- `label`: `value-or-region`
- `itemLabel`、`minItems`、`maxItems`: `value`

## 6. regions 与 slot 约定

- 首版没有 item-level region。
- 复杂 item 渲染不应在现有数组编辑器里偷偷开放任意 schema。

## 7. 运行期状态归属

- 数组值归 form runtime。
- 行编辑中的草稿值、拖拽态和焦点态属于局部 UI 状态。
- 重排（上下移动）通过 form runtime `moveValue(name, from, to)` 写回；无 form runtime（scope owner 回退）时调 `scope.update` 重排。

## 8. 事件、动作与组件句柄能力

- 已落地对外句柄：`component:addItem`、`component:removeItem`、`component:moveItem`（X1-successor plan 收口，经共享 `createCompositeFieldHandle` 工厂 + `useCompositeFieldHandle` hook 注册；卸载时 unregister）。
- 对接路径与按钮同源：`addItem` → `currentForm.appendValue(name, item)`（无 form runtime 时 `scope.update` 回退）；`removeItem` → `currentForm.removeValue(name, index)`；`moveItem` → `currentForm.moveValue(name, from, to)`。
- handle args/result 形状（capability contract）：
  - `addItem`：args `{ value?: unknown }`（`value` 可选，缺省构造空 item `{ id, value: '' }`）；成功返回 `data: { index }`（index 由 renderer 基于 append 后 `items.length` 派生，`appendValue()` 返回 void）；达到 `maxItems` 时返回 `{ ok: true, skipped: true }`（不绕过约束）。
  - `removeItem`：args `{ index: number }`（必填）；达到 `minItems` 时返回 `{ ok: true, skipped: true }`；index 越界返回 `{ ok: false, code: 'index-out-of-bounds' }`。
  - `moveItem`：args `{ from: number, to: number }`（均必填）；越界返回 `{ ok: false, code: 'index-out-of-bounds' }`。
- **不发布 result FluxValueShape**（与 `clear`/`reset`/`focus`/`open` 既有 vocabulary 一致）：action-adapter 对已发布 result 形状做强校验（`matchesFluxValueShape(result.data, result)`），而 `maxItems`/`minItems` 受限时须返回 `{ ok: true, skipped: true }`（无 data）；为兼容 skipped 语义且与既有句柄族一致，contract 仅发布 `args` 形状做 payload 校验，`data` 作为信息性返回（成功时含 `index`，供 action graph 后续节点读取）。
- handle 在 `disabled`/`readOnly` 时返回 `{ ok: true, skipped: true }`（失败路径 `x1-composite-disabled`），与按钮 disabled 态一致。

## 9. 数据源、表达式、导入能力接入点

- 初始值来自 form data 或表达式。
- 若业务数据不是规范数组项，优先由 loader 做投影。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-array-editor` marker。
- 列表行视觉复用 Button/Input/Field 等现有 UI primitives。
- 每行上移按钮输出 `data-slot="array-editor-move-up"` marker，下移按钮输出 `data-slot="array-editor-move-down"` marker；删除按钮沿用 `Remove` aria-label。

## 11. 实现拆分建议

- 数组操作桥接、项校验和行 UI 组件拆开维护。

## 12. 风险、取舍与后续阶段

- 如果演进为“万能重复子表单”，会和 `form`/`table`/复杂 editor 边界冲突，需要明确分层。
