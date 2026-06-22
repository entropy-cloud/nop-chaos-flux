# Component Handle Vocabulary

> Flux `component:<method>` 句柄族统一词汇表。X1 plan（`docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md`）Phase 1 裁定落地。
>
> 本文是 component handle 命名的 source of truth。所有 renderer 的 `componentCapabilityContracts` 与 design.md §8 必须对齐本文术语。

## 适用范围

适用于通过 `ComponentHandleRegistry` 注册、可被 `component:<method>` action selector 调用的 owner-renderer 句柄。host/domain capability（`designer:*`/`spreadsheet:*`）归 `docs/architecture/capability-contract-model.md`，不在本文。

## 核心术语

### `clear`

- 语义：清空字段值到 **empty**（类型相关的空值）。
- empty 定义：字符串 → `''`；数字 → `undefined`（或 `null`，由 adapter 决定）；数组 → `[]`；对象 → `undefined`。
- 无 initial value 概念：`clear` 永远清空到 empty，不还原任何历史值。
- 失败路径 `x1-clear-disabled`：字段 `disabled` 或 `readOnly` 时 no-op，返回 `{ok:true, skipped:true}`。
- 适用：text/email/password/textarea/input-number（标量）、select（多选清空为 `[]`/单选清空为 `undefined`）、input-tree/tree-select（选中态清空为 `[]`）。

### `reset`

- 语义：还原字段到 **initial value**（form init 时的值或 `defaultValue`）。
- initial value 来源：form runtime init 时的值优先；否则 schema `defaultValue`；均无时 fallback 到 `clear` 行为（返回 `{ok:true, fellBackToDefault:true}`，失败路径 `x1-reset-no-initial`）。
- 与 `form.reset` 区别：`form.reset` 还原整个表单所有字段；`component:reset`（field-level）只还原单个字段。二者不冲突：field-level reset 是 form-level reset 的单点投影。
- 适用：text/email/password/textarea/input-number。

### `focus`

- 语义：DOM focus 目标控件 + accessibility announcement（无值语义）。
- 实现约束：focus 实际可聚焦的 trigger element（input/textarea 的 `<input>`/`<textarea>`；select 的 trigger；switch/checkbox-group/radio-group 的第一个 option 或 trigger；button 的 `<button>`；tree 的容器或 trigger）。
- 失败路径 `x1-focus-not-mounted`：目标已卸载，返回 `{ok:false, code:'not-mounted'}`，不抛异常。
- 失败路径 `x1-focus-hidden`：字段 `when:false`（不可见），返回 `{ok:false, code:'not-visible'}`，不强制滚动。
- 适用：全部 input 控件 + select + button。

### `open` / `close` / `toggle`

- 语义：surface 状态翻转（dialog/drawer）。
- `open`：使 surface 进入 open 态；已 open 时 no-op（返回 `{ok:true, skipped:true}`，失败路径 `x1-close-not-open` 的对偶）。
- `close`：使 surface 进入 closed 态；已 closed 时 no-op（失败路径 `x1-close-not-open`）。
- `toggle`：open ⇄ close 翻转。
- 寻址模型：通过 `componentId`/`componentName` 定位（最终寻址模型见 surface-owner.md §surface-handle-coexistence）。目标未注册或无法解析时失败路径 `x1-open-no-target`，返回 `{ok:false, code:'no-target'}`。
- 适用：dialog、drawer。

## 与既有 action API 的关系

### surface family（dialog/drawer）

`component:open`/`close`/`toggle` 与 runtime-owned `openDialog`/`openDrawer`/`closeSurface` **共存**：

- `openDialog`/`openDrawer`/`closeSurface`（action API）：**跨 target**，用于"从 A 组件操作 B surface"的场景，surface body 可在 action 内联声明（ad-hoc surface）。
- `component:open`/`close`/`toggle`（capability handle）：**同 component**，用于"操作已声明的 declarative dialog/drawer 实例"，target 必须是已渲染的 dialog/drawer renderer 节点。
- 二者最终 lower 到同一 `SurfaceRuntime` 内核（同一 surface stack、同一 focus/dismiss/scope 规则），不存在双状态源。
- authoring 建议：declarative dialog/drawer 用 `component:*`；ad-hoc 弹层用 `openDialog`。详见 `docs/architecture/surface-owner.md` §Surface Handle Coexistence。

### data-source refresh

`refreshSource`（action API）与 `component:refresh`（capability）**共存**（裁定 (a) 保留双入口 + 文档分层）：

- `refreshSource`（action API）：**跨 target**，按 `sourceName` 寻址 data-source registration，不依赖具体 renderer 实例。
- `component:refresh`（capability）：**同 component**，按 `componentId`/`componentName` 寻址 data-source renderer 实例。
- 二者最终 lower 到同一 `DataSourceController.refresh()`，返回值一致。
- 不 deprecate 任一入口：跨 target 场景（如"刷新所有名为 users 的 source"）action API 更合适；同实例场景（如"刷新当前 crud 的 data-source"）capability 更直接。

### code-editor clear/reset/focus

保持现状（已是 Flux 标准 vocabulary，无 rename 需求）：

- `clear`：清空 editor content 到 `''`。
- `reset`：还原到 mount 时捕获的 initial value（`initialValueRef`）。
- `focus`：focus CodeMirror EditorView。
- 这些方法与本文 vocabulary 完全一致，E2h watch-only residual 收口。

## 字段类型裁定表

| 字段类型                               | `clear`          | `reset` | `focus` | `open`/`close`/`toggle`                | 理由                                                                                                                                                                                                                                      |
| -------------------------------------- | ---------------- | ------- | ------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| text/email/password/textarea           | ✅               | ✅      | ✅      | —                                      | 标量，clear/reset/focus 语义清晰                                                                                                                                                                                                          |
| input-number                           | ✅               | ✅      | ✅      | —                                      | 标量                                                                                                                                                                                                                                      |
| select（单选/多选）                    | ✅               | —       | ✅      | ✅(`open` 打开下拉)                    | clear 清空 selection；open 打开 dropdown menu；reset 语义对 controlled options 不清，故不暴露                                                                                                                                             |
| checkbox-group/radio-group/switch      | —                | —       | ✅      | —                                      | boolean/choice，clear/reset 语义不清（清空 selection？置 false？），只暴露 focus                                                                                                                                                          |
| input-tree/tree-select                 | ✅               | —       | ✅      | —                                      | clear 清空 selection 数组；reset 因 tree state 复杂（含 expand 态）不暴露；focus tree 容器                                                                                                                                                |
| button                                 | —                | —       | ✅      | —                                      | 无值语义，只 focus                                                                                                                                                                                                                        |
| dialog/drawer                          | —                | —       | —       | ✅                                     | surface，open/close/toggle                                                                                                                                                                                                                |
| code-editor                            | ✅               | ✅      | ✅      | —                                      | 已有，保持现状                                                                                                                                                                                                                            |
| form/table/crud/chart/data-source/tabs | （既有，不扩展） |         |         |                                        | 见各自 design.md                                                                                                                                                                                                                          |
| array-editor/key-value                 | —                | —       | —       | —（`addItem`/`removeItem`/`moveItem`） | 复合字段编辑器；三 handle 对接 form runtime `appendValue`/`removeValue`/`moveValue`，args 形状见各自 design.md §8。经共享 `createCompositeFieldHandle` 工厂注册（X1-successor plan）。不发布 result FluxValueShape（兼容 skipped 语义）。 |

## Failure Paths 汇总

| code                        | 触发                                                                             | 行为                                                        |
| --------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `not-mounted`               | `component:focus` 目标已卸载                                                     | `{ok:false, code:'not-mounted'}`                            |
| `not-visible`               | `component:focus` 目标 `when:false`                                              | `{ok:false, code:'not-visible'}`                            |
| `skipped`                   | clear 在 disabled/readOnly / close 在已 closed / open 在已 open                  | `{ok:true, skipped:true}`                                   |
| `fellBackToDefault`         | reset 无 initial value                                                           | `{ok:true, fellBackToDefault:true}`                         |
| `no-target`                 | surface open 目标未注册                                                          | `{ok:false, code:'no-target'}`                              |
| `payload-validation-failed` | payload 不匹配 published FluxValueShape                                          | runtime adapter reject（既有行为）                          |
| `index-out-of-bounds`       | `component:removeItem`/`moveItem`（array-editor/key-value）的 index/from/to 越界 | `{ok:false, code:'index-out-of-bounds'}`，不调 form runtime |
| `x1-composite-disabled`     | array-editor/key-value handle 在 `disabled`/`readOnly` 时被调                    | `{ok:true, skipped:true}`（与按钮 disabled 态一致）         |

## 命名规则

- handle 名一律 **小写连字符**（`clear`/`reset`/`focus`/`open`/`close`/`toggle`/`refresh`/`submit`/`validate`/`setValue`/`getValue`/`getValues`/`setValues`/`getSelection`/`setSelection`/`resize`/`cancel`/`start`）。
- 复合字段编辑器（array-editor/key-value）handle 用 **`addItem`/`removeItem`/`moveItem`**（item 级操作，与 design.md §8 既有措辞一致，避免与 form-level `add`/`remove` 混淆）。args 形状：`addItem` `{ value?: unknown }`、`removeItem` `{ index: number }`、`moveItem` `{ from: number, to: number }`。
- 既有 camelCase 方法（`setValue`/`getValue`/`getValues`/`setValues`/`getSelection`/`setSelection`/`getEditorView`）保留（它们是"动作型"语义，非 vocabulary 核心词），不强制 rename。
- 新增 handle 优先用本文核心词；动作型语义（如 `resize`/`cancel`/`start`）允许保留特化名。

## 参考

- 基础设施：`packages/flux-core/src/types/component-handle-core.ts`、`packages/flux-core/src/types/renderer-definition-types.ts:121`。
- runtime 校验：`packages/flux-runtime/src/action-adapter.ts:349-428`（payload + result validation）。
- compiler 校验：`packages/flux-compiler/src/schema-compiler/action-selector-validation.ts`。
- 既有 handle 注册范本：`packages/flux-runtime/src/form-component-handle.ts`、`packages/flux-code-editor/src/code-editor-renderer/use-code-editor-handle.ts`。
- surface 共存关系：`docs/architecture/surface-owner.md`。
