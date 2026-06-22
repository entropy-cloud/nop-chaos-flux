# Key Value 组件设计

## 1. 组件定位

- `key-value` 是键值对数组字段编辑器。
- 它适合配置项、headers、metadata 等字符串到字符串的小型映射场景。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `addLabel` 和 `uniqueKeys`，并在 validation contributor 中明确为 `array` 值类型。
- 更复杂的 value schema、嵌套对象编辑或类型化 key/value 不应直接塞进首版 `key-value`。

### Flux 决策表（X5 扩展，E3）

| 能力                                          | 首版决定                 | 理由                                                                                                                                                                                                                                                      |
| --------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minItems?: number`（缺省 `1`，覆盖原硬编码） | **实现**（E3）           | 列表字段标配约束；validation contributor 读 schema 而非硬编码 `1`。与 `array-editor` 同包同模式，对称收口。                                                                                                                                               |
| `maxItems?: number`（缺省无上限）             | **实现**（E3）           | 列表字段标配约束；达到 `maxItems` 时新增按钮 **disabled**（不隐藏，保留可发现性，见 Decision）。                                                                                                                                                          |
| 重排（上移 / 下移按钮）                       | **实现**（E3）           | 对接 form runtime `moveValue(name, from, to)`；边界 disabled（首行禁上移、末行禁下移）。与 `array-editor` 对称。                                                                                                                                          |
| `component:moveItem` 句柄                     | **实现**（X1-successor） | 句柄注册已由 X1-successor plan（`docs/plans/2026-06-22-1137-1-x1-successor-composite-editor-handles-plan.md`）收口：`component:addItem`/`removeItem`/`moveItem` 三 handle 经共享 `createCompositeFieldHandle` 工厂注册，与 `array-editor` 对称。详见 §8。 |
| 类型化 value cell / schema 驱动 value 输入器  | 不采纳（后续）           | 类型化 value 需独立 `valueSchema`/`valueRenderer` 协议；当前 `Array<{ id, key, value }>` 字符串模型已覆盖 headers/metadata 等小型映射场景。需类型化应升级为 `object-field` 数组或 `combo`，而不是在 `key-value` 偷塞任意 schema（DESIGN-ACK-NOT-IMPL）。  |
| 嵌套对象编辑（value 为 object）               | 不采纳（后续）           | 一旦需要对象级复杂值，应升级为 `array-field`/`combo`，而不是继续膨胀 `key-value`（见 §12）。                                                                                                                                                              |
| 拖拽重排（drag-and-drop）                     | 不采纳（后续）           | 上下移动按钮已满足 reorder 契约（可观测、对接 moveValue、a11y 友好）；`@dnd-kit` 已是依赖可用，drag 是 DX 糖而非契约必需，归后续增强（见 plan Deferred）。                                                                                                |
| 重复 key inline 实时高亮                      | 不采纳（后续）           | 提交时 `uniqueKeys` 校验消息已覆盖重复 key 检测；inline 实时高亮是 DX 增强，不影响契约成立，归后续优化。                                                                                                                                                  |

**Decision（reorder 机制，E3）**：采用**上下移动按钮**（非 drag），对接 form runtime `moveValue(name, from, to)`。无 form runtime（scope owner 回退模式）时**镜像现有 append/remove 的 scope-owner 回退路径**：调 `scope.update` 重排数组，按钮**保持 enabled**（Failure Path `movevalue-scope-fallback`）。

**Decision（maxItems UX，E3）**：达到 `maxItems` 时新增按钮 **disabled**（非隐藏），与达到 `minItems` 时删除按钮 disabled 对称；保留按钮可发现性。

## 3. Flux 中的 renderer/type 定义

- `type: 'key-value'`
- `sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `kind: 'field'`、`valueKind: 'array'`

## 4. schema 设计

- 继承 `InputSchema`，并增加 `addLabel`、`uniqueKeys`、`minItems?: number`（缺省 `1`）、`maxItems?: number`（缺省无上限）。
- 值模型是 `Array<{ id: string; key: string; value: string }>`，而不是普通对象字面量。
- `minItems`/`maxItems` 由 validation contributor 读取并产出 `kind: 'minItems'`/`kind: 'maxItems'` 规则；UI 层在达到 `minItems` 时禁用删除、达到 `maxItems` 时禁用新增。

## 5. 字段分类

- `label`: `value-or-region`
- `addLabel`、`uniqueKeys`、`minItems`、`maxItems`: `value`

## 6. regions 与 slot 约定

- 首版不需要 item-level region。
- 如果后续需要自定义 key/value 输入器，应优先拆出类型化配置而不是让 item 支持任意 schema。

## 7. 运行期状态归属

- 键值数组归 form runtime。
- 行内编辑态和新增草稿属于局部 UI 状态。
- 重排（上下移动）通过 form runtime `moveValue(name, from, to)` 写回；无 form runtime（scope owner 回退）时调 `scope.update` 重排。

## 8. 事件、动作与组件句柄能力

- 已落地对外句柄：`component:addItem`、`component:removeItem`、`component:moveItem`（X1-successor plan 收口，经共享 `createCompositeFieldHandle` 工厂 + `useCompositeFieldHandle` hook 注册；与 `array-editor` 同工厂同模式）。
- 对接路径与按钮同源：`addItem` → `currentForm.appendValue(name, pair)`（无 form runtime 时 `scope.update` 回退，pair = `{ id, key: '', value: '' }`）；`removeItem` → `currentForm.removeValue(name, index)`；`moveItem` → `currentForm.moveValue(name, from, to)`。
- handle args/result 形状（capability contract，与 `array-editor` 对称）：
  - `addItem`：args `{ value?: unknown }`（`value` 可选，缺省构造空 pair `{ id, key: '', value: '' }`）；成功返回 `data: { index }`（index 由 renderer 基于 `pairs.length` 派生）；达到 `maxItems` 时返回 `{ ok: true, skipped: true }`。
  - `removeItem`：args `{ index: number }`（必填）；达到 `minItems` 时返回 `{ ok: true, skipped: true }`；index 越界返回 `{ ok: false, code: 'index-out-of-bounds' }`。
  - `moveItem`：args `{ from: number, to: number }`（均必填）；越界返回 `{ ok: false, code: 'index-out-of-bounds' }`。
- **不发布 result FluxValueShape**（理由同 `array-editor` §8：action-adapter 对 result 形状强校验与 skipped 语义冲突；与既有 vocabulary 一致，仅发布 args 形状）。
- handle 在 `disabled`/`readOnly` 时返回 `{ ok: true, skipped: true }`（失败路径 `x1-composite-disabled`）。

## 9. 数据源、表达式、导入能力接入点

- 初始值可通过表达式或 form data 注入。
- 复杂映射来源应由 loader 先转成规范的键值数组。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-key-value` marker。
- 行布局和按钮样式应来自通用 UI 组件，不内嵌专用视觉协议。
- 每行上移按钮输出 `data-slot="key-value-move-up"` marker，下移按钮输出 `data-slot="key-value-move-down"` marker；删除按钮沿用 `Remove entry N` aria-label。

## 11. 实现拆分建议

- 数组值桥接、唯一键验证和行编辑壳层分模块实现。

## 12. 风险、取舍与后续阶段

- 一旦需要对象级复杂值，应该升级为 `array-editor` 或专用 editor，而不是继续膨胀 `key-value`。
