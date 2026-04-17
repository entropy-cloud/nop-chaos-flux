# 09 渲染器契约合规性

- Task ID: `ses_268f5ada6ffeRRI3Twt0r9zM7a`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Revalidated on: `2026-04-17`

# 维度09复核结论：渲染器契约合规性

本文件已按当前代码与当前架构文档重新复核。

复核基线：

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/styling-system.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/variant-field.md`

## 本次处理结果

### 已确认并修复

1. `page-renderer`
   - 问题仍存在：渲染路径中直接通过 `scope.get('refreshTick')` 进行 imperative read。
   - 修复：改为 `useScopeSelector(...)` 订阅 `refreshTick`，并用订阅值生成 `summary`。
   - 代码：`packages/flux-renderers-basic/src/page.tsx:13-18`

2. `tree-select-renderer`
   - 问题仍存在：清空操作使用 `span + role="button" + tabIndex` 伪造交互按钮。
   - 修复：改为真实 `Button` 组件，保留清空行为并阻止触发器误打开。
   - 代码：`packages/flux-renderers-form-advanced/src/tree-controls.tsx:181-227`

3. `tag-list-renderer`
   - 问题仍存在：当前选中值通过 `readCheckboxGroupValue(scope, name)` 从 scope imperative 读取。
   - 修复：改为直接消费 `useFormFieldController(...).value` 返回的响应式字段值。
   - 代码：`packages/flux-renderers-form-advanced/src/tag-list.tsx:16-24`

4. `array-editor-renderer`
   - 问题仍存在：字段值通过本地 `useState` 保存镜像，再与 store/scope 同步。
   - 修复：移除本地值镜像，列表完全由 `useCurrentFormState` / `useScopeSelector` 的外部值派生，仅保留 `ref` 供注册与校验回调读取最新值。
   - 代码：`packages/flux-renderers-form-advanced/src/array-editor.tsx:148-239`

5. `key-value-renderer`
   - 问题仍存在：字段值通过本地 `useState` 保存镜像，再与 store/scope 同步。
   - 修复：移除本地值镜像，键值对列表完全由订阅值派生，仅保留 `ref` 供注册与校验回调读取最新值。
   - 代码：`packages/flux-renderers-form-advanced/src/key-value.tsx:213-333`

6. `condition-builder-renderer`
   - 问题仍存在：条件树值通过本地 `useState` 保存副本，再与 form/scope 同步。
   - 修复：移除本地值副本，改为完全消费订阅态字段值；`ref` 仅用于 `registerField` 回调读取最新值。
   - 代码：`packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx:54-112`

7. `loop-renderer` / `recurse-renderer`
   - 原问题：通过 `flux-renderers-basic` 包内私有 `StructuralLoopContext` 共享递归结构协议。
   - 修复：将结构递归上下文能力提升为 `flux-react` 标准上下文与 hook（`StructuralLoopContext` / `useStructuralLoopContext`），并把相关类型提升到 `flux-core` 公共契约（`StructuralLoopBindings` / `StructuralLoopRenderContext`）。
   - 代码：`packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/{contexts.ts,hooks.ts,index.tsx}`, `packages/flux-renderers-basic/src/{loop.tsx,recurse.tsx,structural-loop.tsx}`

## 复核后确认“原结论已过时或需重分类”的项

1. `table-renderer`
   - 原文定位已过时。`packages/flux-renderers-data/src/table-renderer.tsx` 现已是薄编排层，不再包含原报告列出的那批大段 root 级隐式布局/视觉类。
   - 现状：样式问题如果要继续追踪，应下沉到拆分后的子组件复核，如 `TableHeaderRow.tsx`、`TableBodyRows.tsx`、`TableLoadingOverlay.tsx`、`TablePaginationBar.tsx`。
   - 结论：保留“表格子结构仍存在样式契约风险”，但删除“当前 `table-renderer.tsx` 145-150,192-240,300-325,390-401,499-500 仍违规”的旧结论。

2. `detail-field-renderer`
   - 原文将 renderer 本地管理 `open` / `draftForm` / `confirming` / `draftError` 认定为契约违规。
   - 当前架构文档已明确：Phase 2 基线允许 `detail-field` / `detail-view` 通过 renderer-level draft isolation 创建临时 `FormRuntime`，并由 renderer 管理打开/确认/取消流程。
   - 参考：`docs/architecture/form-validation.md:301-347,898-932`
   - 结论：该项不应继续记为当前缺陷，应重分类为“当前实现符合现阶段架构，未来 Phase 3 再考虑 owner/runtime 下沉”。

3. `detail-view-renderer`
   - 结论与 `detail-field-renderer` 相同。
   - 当前实现属于现阶段允许的 staged owner 方案，不再记为当前缺陷。

4. `tree-renderer`
   - 原文把节点缩进、节点行布局和按钮外观一并归类为“renderer 不应拥有的隐式样式”。
   - 复核后认为该结论过严。`tree` 按组件设计是带 UI 壳层和层级交互的 renderer，本身就负责节点缩进、展开/收起和层级结构展示，而不是纯 marker-only 透明壳。
   - 其中 `paddingInlineStart` 这类按 `depth` 动态计算的缩进样式，属于合理的实现与性能折中；`open` 本地状态也属于节点级交互 owner 的正常局部状态。
   - 参考：`docs/components/tree/design.md:5-7,84,106-117`
   - 结论：不再把当前 `tree-renderer` 的局部状态和动态缩进实现继续记为 renderer-contract 缺陷。若未来引入专门的 `@nop-chaos/ui` Tree 组件，可再评估哪些视觉细节应继续下沉到 UI 层。

5. `variant-field-renderer`
   - 原文把 `userSelectedKey` / `detectedKey` 这类 renderer 本地状态视为“复杂字段关键状态不应由 renderer 本地持有”。
   - 复核后认为该结论不成立。当前架构文档把 `variant-field` 定位为 inline live-edit、多态值切换控件：它不创建独立 draft runtime，默认只挂载当前 active variant subtree，切换和检测都由控件自身协调。
   - 在这个边界下，`userSelectedKey` / `detectedKey` 属于控件级瞬时交互状态，而不是与 form store 并存的第二份字段值事实源。
   - 参考：`docs/architecture/variant-field.md:23-27,105-122,123-138`
   - 结论：不再把当前 `variant-field-renderer` 的局部状态继续记为 renderer-contract 缺陷。若未来引入更明确的 variant owner/runtime substrate，可再评估是否值得外提。

## 复核后确认“问题仍存在，但本次未直接重构”的项

当前无剩余已确认的 renderer-contract 缺陷。

## 当前保留的问题清单

当前无。

## 本次不再保留为缺陷的旧条目

- `table-renderer` 原文件定位与问题描述已过时，需要按拆分后子组件重新审计
- `detail-field-renderer` 现阶段实现符合 `form-validation` 当前基线
- `detail-view-renderer` 现阶段实现符合 `form-validation` 当前基线
- `tree-renderer` 当前局部状态与动态缩进实现符合 `tree` 组件的 UI owner 边界，不再继续记为 renderer-contract 缺陷
- `variant-field-renderer` 当前局部状态符合 `variant-field` 的 inline live-edit / active-subtree owner 边界，不再继续记为 renderer-contract 缺陷

## 建议的后续动作

1. 单独开一轮 `table-*` 的 styling contract 复核，按拆分后的子组件重新记账，不再沿用旧行号。
2. 若未来新增共享 Tree UI 组件，再评估 `tree-renderer` 里哪些视觉职责应继续下沉到 UI 层。
3. 若未来形成更明确的 variant owner/runtime substrate，再评估 `variant-field` 是否值得把 active variant 协调从 renderer 内外提。
