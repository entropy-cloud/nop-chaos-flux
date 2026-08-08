# HCA8 Editor Panels 包级深审记录

> 日期：2026-08-08
> Mission：industrial-hmi-component-audit
> Work Item：HCA8. Editor panels 审计
> Plan：`docs/plans/2026-08-08-1230-1-industrial-hmi-hca8-editor-panels-audit.md`
> 审计对象：`packages/flux-renderers-industrial/src/editor/{palette,inspector,toolbox}/`（3 子目录 9 源文件，~1,112 行）
> 审计框架：`docs/skills/deep-audit-prompts.md` 23 维包级深审（align-distribute/z-order 追加维度 21）
> 基线：HEAD `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（97 test files / 1309 tests）

## 审计范围与维度适用性

editor panels 是 React UI 面板 + 纯逻辑适配器层，非注册 renderer。23 维中部分维度经裁剪后适用：

- **强相关维度（重点）**：11（UI 组件复用）/ 13（类型安全）/ 14（测试覆盖）/ 21（定位/数组算法正确性，align-distribute + z-order 必选）/ 22（集成接线）/ 23（测试有效性）/ 04（状态所有权）/ 19（错误传播）/ 20（a11y）。
- **适用但低产出**：01（依赖方向）/ 02（文件边界）/ 03（API 表面积）/ 05（响应式精度）/ 07（生命周期）/ 08（验证衔接）/ 09（renderer 契约，region UI 非 renderer → 裁剪）/ 10（样式 marker）/ 15（性能）/ 16（文档一致性）/ 17（命名）/ 18（跨包模式）。
- **不适用**：06（异步/取消——panels 无 async IO）/ 12（Slot 建模——非 form renderer）。

## 逐文件 finding 表

### palette/editor-palette.tsx（58 行）

| 维度              | 结论                                                                                                                                                | 证据（文件:行）                             | Triage       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------ |
| 11 UI 复用        | PASS — 使用 `@nop-chaos/ui` `Button`，无裸 HTML 交互控件                                                                                            | `editor-palette.tsx:2,43`                   | —            |
| 13 类型安全       | PASS — `EditorEngineRuntime` 为 type-only import                                                                                                    | `editor-palette.tsx:4`                      | —            |
| 04 状态所有权     | PASS — `idCounter` 为 ref（非 store 双源）；`listScadaSymbols()` 纯查询，React Compiler 自动 memoize（plan 0900-2 #20 已移除冗余 useMemo）          | `editor-palette.tsx:18-20`                  | —            |
| 09 renderer 契约  | N/A — region UI 非 renderer；marker `data-slot="scada-editor-palette"` + `nop-scada-editor-palette` 正确                                            | `editor-palette.tsx:41`                     | —            |
| 03 API 表面积     | MINOR — `onError` prop 声明且由父 `scada-editor-canvas.tsx:260` 传入 `handleError`，但 palette body 从不调用 `props.onError(...)`（无错误上浮路径） | `editor-palette.tsx:8`（声明）/ body 无调用 | **P3-PAL-1** |
| 15 性能/正确性    | MINOR — 拖入放置 id = `${type}-${idCounter.current}`，idCounter 为 per-instance ref；多 palette 实例或 id 已存在时依赖 validate 兜底（不主动查重）  | `editor-palette.tsx:28-29`                  | **P3-PAL-2** |
| 20 a11y           | MINOR — 可拖放 Button 有 `title`（tooltip），但 drag 操作无 `aria-label`/键盘放置路径                                                               | `editor-palette.tsx:48-51`                  | **P3-PAL-3** |
| #5/HCA7 P3-1 复核 | PASS — `title={def.name}`（displayName）仍成立，未回退为 `def.type`                                                                                 | `editor-palette.tsx:51`                     | —            |

### inspector/inspector-panel.tsx（85 行）

| 维度          | 结论                                                                                                                                                                                 | 证据（文件:行）             | Triage       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------------ |
| 11 UI 复用    | PASS — 分组 label 用 `<span>` + marker class，id/type 只读展示用 `<div>` + text class（均为展示型非交互控件，raw div/span 合理；交互控件经子 `InspectorField` 复用 `@nop-chaos/ui`） | `inspector-panel.tsx:44-47` | —            |
| 04 状态所有权 | PASS — 无 local state；每次 render 从 `runtime.session.workingConfig` 派生（sessionVersion bump 触发），无 store 双源                                                                | `inspector-panel.tsx:27-37` | —            |
| 05 响应式精度 | PASS — 父 canvas 经 sessionVersion bump 触发重渲染；注释说明不用 useMemo（React Compiler 自动 memoize + deps 需显式纳入 sessionVersion）                                             | `inspector-panel.tsx:27-28` | —            |
| 08 验证衔接   | PASS — `validateScadaConfig(runtime.session.workingConfig)` 单一事实源（runtime 复用点 #4），不新建第二套规则                                                                        | `inspector-panel.tsx:34`    | —            |
| 13 类型安全   | PASS — `selectedNodeId!` 非空断言由 `if (node && definition)` 守卫（node 派生需 selectedNodeId truthy），安全                                                                        | `inspector-panel.tsx:39,41` | —            |
| 03 API 表面积 | MINOR — `onError` prop 声明且父 `scada-editor-canvas.tsx:370` 传入，但 body 从不调用                                                                                                 | `inspector-panel.tsx:13`    | **P3-INS-1** |
| 15 性能       | ACCEPTABLE — `validateScadaConfig` 每次 render 跑全树；编辑器场景 + React Compiler memoize，非热路径缺陷                                                                             | `inspector-panel.tsx:34`    | —            |

### inspector/inspector-field.tsx（148 行）

| 维度          | 结论                                                                                                                                                                                                                                                                                                                                                                                                     | 证据（文件:行）                                               | Triage                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| 11 UI 复用    | PASS — `Input`/`Textarea`/`Switch`/`Label`/`NativeSelect`/`NativeSelectOption` 全部来自 `@nop-chaos/ui`；select 走 NativeSelect（E6 m-1 修正，无 raw `<select>`）                                                                                                                                                                                                                                        | `inspector-field.tsx:3,52-62`                                 | —                                     |
| 22 字段路由   | MINOR — `widget === 'slider'` 归入 number Input（documented M1 简化，:16 注释）；`textarea`/`point-ref`/`action-editor` 无显式分支，fall through 到默认 text Input。**注释 :16 声称 point-ref/action-editor 走 json-editor fallback，但代码实际走 text-input fallback**（注释/代码不符）。无 live symbol 显式声明这些 widget（symbols 全靠 `deriveWidget` 按 type 推导，无 `widget:` 字段），故为 latent | `inspector-field.tsx:16,68-88`；symbols grep `widget:` 零命中 | **P3-FLD-1**（注释/代码不符，latent） |
| 19 错误传播   | PASS — #6 基线复核：JsonEditorField parse 失败仅 `setParseError` + **不**调 onChange（不 corrupt workingConfig），草稿保留；parse 恢复成功清错                                                                                                                                                                                                                                                           | `inspector-field.tsx:126-138`                                 | —                                     |
| 04 状态所有权 | PASS — JsonEditorField 用 render-time derived state（prevValue 跟踪 + isSelfUpdate flag），React 19 推荐模式，无 useEffect 镜像                                                                                                                                                                                                                                                                          | `inspector-field.tsx:110-124`                                 | —                                     |
| 13 类型安全   | PASS — `value: unknown` + `String(value ?? '')` / `Boolean(value)` 窄化合理（动态 schema 边界）                                                                                                                                                                                                                                                                                                          | `inspector-field.tsx:6-11,80`                                 | —                                     |
| 15 正确性     | MINOR — number-input 清空时 `Number('')` = 0（写入 0 而非 undefined）；`type="number"` 已限制非法字符输入                                                                                                                                                                                                                                                                                                | `inspector-field.tsx:83`                                      | **P3-FLD-2**                          |
| 20 a11y       | MINOR — `<Label>` 与 `<Input>` 为兄弟节点，未经 `htmlFor`/`id` 关联（屏幕阅读器不读 label→input 关系）                                                                                                                                                                                                                                                                                                   | `inspector-field.tsx:73-74`                                   | **P3-FLD-3**                          |
| 14 测试覆盖   | PASS — widget 路由、onChange 类型、#6 parse 失败/恢复/草稿保留/外部同步全覆盖                                                                                                                                                                                                                                                                                                                            | `inspector-field.test.tsx`                                    | —                                     |

### inspector/schema-extractor.ts（142 行）

| 维度                 | 结论                                                                                                                                                                                                                                                                        | 证据（文件:行）               | Triage                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------- |
| 22 schema 抽取正确性 | PASS — `extractPanelFields` 按 props 声明顺序抽取，`deriveWidget` 按 type 穷尽映射（number/string/boolean/object/array + default text-input），defaults 权威源（definition.defaults > entry.defaultValue），虚拟字段注入（binding/state/animation/event），GROUP_ORDER 排序 | `schema-extractor.ts:57-107`  | —                      |
| 21 算法正确性        | PASS — 包围盒/分组推断/虚拟字段注入逻辑经单测验证穷尽                                                                                                                                                                                                                       | `schema-extractor.test.ts`    | —                      |
| 13 类型安全          | PASS — `definition.defaults as Record<string, unknown>` 为动态 schema 边界合理 cast                                                                                                                                                                                         | `schema-extractor.ts:89`      | —                      |
| 22 边界              | MINOR — 若 definition.props 显式声明 `bindings`/`states`/`animations`/`events` 键，injectVirtualField 会注入重复字段（同 key 出现两次）。live symbols 不在 props 声明这些键（经 compositePropSchema 验证），latent                                                          | `schema-extractor.ts:85-99`   | **P3-SCH-1**（latent） |
| 08 visibleWhen       | PASS — equals/in 条件穷尽；无条件返回 true                                                                                                                                                                                                                                  | `schema-extractor.ts:132-141` | —                      |

### inspector/field-errors.ts（51 行）

| 维度                 | 结论                                                                                                                                                                                                                                                                                                                                                                                                                               | 证据（文件:行）                                                                                                                             | Triage                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 21/22 错误归因正确性 | **DEFECT** — `findSymbolIndex` 对 group 子节点返回**父节点顶层索引**（`return i` 而非递归 childIdx），导致选中嵌套子节点时 prefix = `symbols[父索引].`。validate.ts 嵌套错误格式为 `symbols[N].children[M].field`（validate.ts:342），remainder = `children[M].field ...`，fieldKey = `children[M]`（split on `.`/空格 取首段）。该 key 不匹配任何 panel 字段 → **嵌套子节点选中时，字段级校验错误静默丢失**（不显示在对应字段上） | `field-errors.ts:42-50`（findSymbolIndex 返回 i）/ `field-errors.ts:27,33`（prefix + fieldKey）/ `validate.ts:341-342`（children[N] scope） | **P2-FE-1**                                      |
| 21 顶层正确性        | PASS — 顶层 symbol 归因正确（fieldKey = 实际字段名，单测覆盖）                                                                                                                                                                                                                                                                                                                                                                     | `field-errors.ts:27-36`；`field-errors.test.ts:23-29`                                                                                       | —                                                |
| 13 类型安全          | PASS — 纯逻辑，类型收敛                                                                                                                                                                                                                                                                                                                                                                                                            | `field-errors.ts:18-40`                                                                                                                     | —                                                |
| 14 测试覆盖          | GAP — 现有 group child 测试（`field-errors.test.ts:53-79`）用错误 `symbols[0].fill`（父索引 + 父字段）而非真实嵌套格式 `symbols[0].children[0].fill`，未暴露 P2-FE-1                                                                                                                                                                                                                                                               | `field-errors.test.ts:71`                                                                                                                   | **P3-FE-2**（测试假绿，随 P2-FE-1 修复一并补强） |

### toolbox/toolbox-panel.tsx（222 行）

| 维度           | 结论                                                                                                                                                                                                                                    | 证据（文件:行）                                         | Triage      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------- |
| 11 UI 复用     | PASS — `Button`/`ButtonGroup`/`Separator`/`Dialog*`/`Textarea` 全部来自 `@nop-chaos/ui`；`cn()` 合并                                                                                                                                    | `toolbox-panel.tsx:2,4,138`                             | —           |
| 04 状态所有权  | PASS — `statusMessage`/`importOpen`/`importText` 为 UI-local state（非 store 双源）；#21 复核：`canPaste` 从 `runtime.getClipboard()` canonical 派生（非 state mirror），父 bumpSessionVersion + statusMessage 变更触发重渲染保证反应式 | `toolbox-panel.tsx:33-43`                               | —           |
| 22 集成接线    | PASS — 五项工具按钮编排经 runtime 命令面/句柄（fit/center/zoom/align/distribute/zorder/copy/cut/paste/export/import/undo/redo/delete/group/ungroup），disabled prop + runtime 自守双重防护；导入确认对话框（T5）                        | `toolbox-panel.tsx:47-129,195-219`                      | —           |
| 19 错误传播    | PASS — runtime 方法返回 boolean（ok/no-op），经 statusMessage 上浮（i18n 文本）；导入失败 surfaces invalid-config                                                                                                                       | `toolbox-panel.tsx:93-98`                               | —           |
| 10 样式 marker | PASS — 根 `data-slot="scada-editor-toolbox"` + `nop-scada-editor-toolbox`；子标记 btn/sep/status/import-textarea + data-slot 查询锚点（design-toolbox.md §10 一致）                                                                     | `toolbox-panel.tsx:138,144,152,163,170,176,181,190,208` | —           |
| 03 API 表面积  | MINOR — `onError` prop 声明且父传入，但 body 从不调用（用 statusMessage 替代）                                                                                                                                                          | `toolbox-panel.tsx:13`                                  | **P3-TB-1** |
| 20 a11y        | MINOR — 图标按钮（⌅L/⤒/↔ 等）经 `title` 提供 accessible name；`aria-label` 更稳健但不构成 P0/P1                                                                                                                                         | `toolbox-panel.tsx:131-135`                             | **P3-TB-2** |

### toolbox/align-distribute.ts（150 行，维度 21 必选）

| 维度              | 结论                                                                                                                                                                          | 证据（文件:行）                                                                 | Triage      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------- |
| 21 定位算法正确性 | PASS — alignSelection：MIN_ALIGN_SELECTION=2 守卫；六方向数学正确（left=minX / right=maxRight-width / hcenter=hCenter-width/2 / top/bottom/vcenter 对称）；仅发实际位移 patch | `align-distribute.ts:57-110`；`align-distribute.test.ts:21-104`                 | —           |
| 21 分布算法       | PASS — distributeSelection：MIN_DISTRIBUTE_SELECTION=3 守卫；排序后首尾固定均布（start + span\*i/denom）；denom=0 单元素守卫；不正交轴                                        | `align-distribute.ts:117-150`；`align-distribute.test.ts:107-154`               | —           |
| 15 浮点           | MINOR — 位移判定 `Math.abs(newX-b.x) > 0`（精确 0 比较）；align/distribute 数学为简单 min/max/减法，输入为整数时无 float 尘，输入为浮点时理论上可发近零 patch                 | `align-distribute.ts:104-105,142-144`                                           | **P3-AD-1** |
| 18 跨包模式       | PASS — 产出 `ScadaConfigDiff` 结构（added/removed/updated），与 serialization/diff.ts 契约一致                                                                                | `align-distribute.ts:109,149`                                                   | —           |
| **#5 复核**       | **维持 watch-only residual**（详见下节）                                                                                                                                      | `align-distribute.ts:5-7`（文档化）/ `align-distribute.test.ts:156-185`（单测） | —           |

### toolbox/z-order.ts（144 行，维度 21 必选）

| 维度            | 结论                                                                                                                                                                                                                                                   | 证据（文件:行）                               | Triage |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------ |
| 21 数组索引操作 | PASS — empty selection 守卫 + missing id 守卫；toTop/toBottom = filter selected/unselected + recombine（保持相对顺序）；moveUp/moveDown = block-aware contiguous runs（splice 旋转，从高/低 lo 处理防索引漂移）；不 mutate 输入（`[...symbols]` 副本） | `z-order.ts:37-113`；`z-order.test.ts` 全覆盖 | —      |
| 21 幂等性       | PASS — toTop at end / moveUp at end / moveDown at start 均为 no-op（movedIds 空），单测验证                                                                                                                                                            | `z-order.test.ts:47-66`                       | —      |
| 13 类型安全     | PASS — ZOrderAction 联合类型穷尽 switch                                                                                                                                                                                                                | `z-order.ts:16,57-71`                         | —      |
| 14 测试覆盖     | PASS — 单选/多选/toTop/toBottom/moveUp/moveDown/no-op/不 mutate 全覆盖，断言精确数组顺序                                                                                                                                                               | `z-order.test.ts`                             | —      |

### toolbox/clipboard.ts（112 行）

| 维度                 | 结论                                                                                                                                         | 证据（文件:行）                                        | Triage |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ |
| 22 ID 分配唯一性     | PASS — buildClipboardPaste：`${node.id}-copy-${counter}`（编辑会话 counter 单调递增）；多次粘贴唯一；group 子节点递归 `${newId}-${child.id}` | `clipboard.ts:64-91,96-103`；`clipboard.test.ts:53-84` | —      |
| 04 深拷贝隔离        | PASS — #4 复核：cloneNodeDeep 递归 children + `structuredClone(custom)`（nested connections 数组不共享引用）                                 | `clipboard.ts:105-112`；`clipboard.test.ts:109-123`    | —      |
| 21 空 clipboard 守卫 | PASS — host 层（use-editor-engine）持 clipboard ref；buildClipboardPaste 由调用方保证 clipboard 非空（canPaste 守卫）                        | `clipboard.ts:64`；`toolbox-panel.tsx:43`              | —      |
| 14 测试覆盖          | PASS — 深拷贝隔离/ID 唯一/offset/children 递归/cut+paste 组合全覆盖                                                                          | `clipboard.test.ts`                                    | —      |

## #5 复核裁定（plan 0900-1 转交项）

**对象**：`align-distribute.ts` 跨层级混选 local 坐标限制（`alignSelection`/`distributeSelection` 扁平算法，不解析 group 嵌套相对坐标）。

**复核结论**：**维持 watch-only residual（M3 T1 文档化接受限制）**。证据：

1. **文档化注释仍在**：`align-distribute.ts:5-7` 明确注释「M3 采用扁平算法（T1 接受）：不解析 group 嵌套相对坐标，按图元顶层 bounds（x/y/width/height）计算」。
2. **单测仍覆盖且通过**：`align-distribute.test.ts:156-185` group-relative convergence 三测（顶层 symbols align left 正确 / 同 group 子节点 local space 自洽 / 跨层级混选 = 已知 M3 限制非回归）均断言精确值并通过。
3. **无 P1-C2/C3 回归迹象**：P1-C2/C3 修的是 selection 可达性 + fit/center 世界 bounds，未改 align-distribute 扁平语义；扁平算法对「同父兄弟」自洽（local 坐标系一致），仅「跨父容器混选」不对齐到世界坐标（文档化 M3 T1 trade-off，design-toolbox.md §12.1 T1 显式「接受 + 留 E9.1 实测」）。
4. **无新 live 渲染缺陷**：六方向对齐 + 分布数学经维度 21 复核正确（空/单/多元素守卫 + 包围盒/均布数学）。

**不升级修复**。维持 watch-only residual，归 HCA-CR 复验项（M3 后跨 group 嵌套对齐若提需求再评估世界坐标对齐）。

## Finding 汇总与 Triage

| 编号     | 严重程度 | 文件                                  | 一句话摘要                                                                                                            | 处置                                                                                                                          |
| -------- | -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| P2-FE-1  | **P2**   | `inspector/field-errors.ts:42-50`     | 嵌套子节点选中时字段级校验错误静默丢失（findSymbolIndex 返回父索引 → fieldKey=`children[M]` 不匹配任何字段）          | **fixed**（test-first，`field-errors.ts` findSymbolScopePath 返回完整 scope path；failing-first proof 2 测 + 旧假绿测试修正） |
| P3-FE-2  | P3       | `inspector/field-errors.test.ts:71`   | group child 测试用非真实嵌套错误格式，未暴露 P2-FE-1（假绿）                                                          | **fixed**（随 P2-FE-1 改用真实 `symbols[0].children[0].fill` 格式）                                                           |
| P3-FLD-1 | P3       | `inspector/inspector-field.tsx:16`    | 注释/代码不符：声称 point-ref/action-editor 走 json-editor fallback，实际走 text-input（latent，无 live symbol 触发） | residual-adjudicated at HCA-CR（watch-only latent，Successor: no）                                                            |
| P3-FLD-2 | P3       | `inspector/inspector-field.tsx:83`    | number-input 清空时 `Number('')`=0（写 0 而非 undefined）                                                             | residual-adjudicated at HCA-CR（documented 简化，Successor: no）                                                              |
| P3-FLD-3 | P3       | `inspector/inspector-field.tsx:73-74` | Label 与 Input 未经 htmlFor/id 关联（a11y）                                                                           | residual-adjudicated at HCA-CR（a11y watch-only，HCAX-2 已收口 canvas 主体，Successor: no）                                   |
| P3-SCH-1 | P3       | `inspector/schema-extractor.ts:85-99` | 若 props 显式声明 bindings/states 等键，injectVirtualField 注入重复字段（latent）                                     | residual-adjudicated at HCA-CR（latent watch-only，Successor: no）                                                            |
| P3-PAL-1 | P3       | `palette/editor-palette.tsx:8`        | onError prop 声明且父传入但从不调用                                                                                   | residual-adjudicated at HCA-CR（watch-only，Successor: no）                                                                   |
| P3-PAL-2 | P3       | `palette/editor-palette.tsx:28-29`    | 拖入 id 不主动查重（依赖 validate 兜底）                                                                              | residual-adjudicated at HCA-CR（watch-only，Successor: no）                                                                   |
| P3-PAL-3 | P3       | `palette/editor-palette.tsx:48-51`    | drag 操作无 aria-label/键盘放置路径（a11y）                                                                           | residual-adjudicated at HCA-CR（a11y watch-only，Successor: no）                                                              |
| P3-INS-1 | P3       | `inspector/inspector-panel.tsx:13`    | onError prop 声明且父传入但从不调用                                                                                   | residual-adjudicated at HCA-CR（watch-only，Successor: no）                                                                   |
| P3-TB-1  | P3       | `toolbox/toolbox-panel.tsx:13`        | onError prop 声明且父传入但从不调用                                                                                   | residual-adjudicated at HCA-CR（watch-only，Successor: no）                                                                   |
| P3-TB-2  | P3       | `toolbox/toolbox-panel.tsx:131-135`   | 图标按钮依赖 title 非 aria-label（a11y）                                                                              | residual-adjudicated at HCA-CR（a11y watch-only，Successor: no）                                                              |
| P3-AD-1  | P3       | `toolbox/align-distribute.ts:104-105` | 位移判定精确 0 比较（浮点输入理论上可发近零 patch）                                                                   | residual-adjudicated at HCA-CR（watch-only，整数坐标无 float 尘，Successor: no）                                              |

**P0/P1：零**。无当前已构成错误行为 / 安全违约 / 核心数据损坏 / 核心契约漂移 / 跨包边界错误的 live defect。

**基线复核**：先验修复 #6（inspector-field parse 失败不调 onChange）、#21（canPaste canonical clipboard 派生）、HCA7 P3-1（palette title=def.name）均复核仍成立。

## 喂入 HCA-BL（bug 候选）

- **P2-FE-1**（嵌套子节点校验错误归因）：非平凡根因（findSymbolIndex 返回值语义错误——对子节点返回父索引而非递归路径），可被重构再引入，跨 inspector/validate 边界。修复后建议 HCA-BL 归档为 `docs/bugs/NN-field-errors-nested-child-attribution.md`（HCA-BL 正式归档动作）。
- 其余 P3 为机械/局部问题，HCA-BL 留审计记录即可，不单独归档。

> **HCA-BL 回链（已闭环）**：P2-FE-1 已归档为 `docs/bugs/81-industrial-hmi-component-audit-nested-child-validation-error-attribution.md`（HCA-BL 裁定：归档——非显然根因（findSymbolIndex 返父索引）+ 跨 inspector/validate 边界 + 回归测试）。其余 P3 已裁定留痕（机械/局部，本审计记录内留痕，不单独归档）。

## Phase 3 - owner doc 一致性核对 + 先验修复回归抽查

### owner doc 一致性（design-toolbox.md §4.2/§4.3/§5/§10 + design-property-panel.md）

| 章节                                | live 核对结论                                                                                                                                                                                                                | drift?             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| design-toolbox.md §4.2.1 对齐/分布  | selection 包围盒 + 六方向 + 分布排序 = `align-distribute.ts:57-150` live 一致                                                                                                                                                | 无                 |
| design-toolbox.md §4.2.2 层级 z 序  | symbols 数组重排 + toTop/toBottom/moveUp/moveDown + 不调 leafer Editor = `z-order.ts:37-113` live 一致（doc 单元素描述 vs 代码 block-aware 为设计级简化，方向「朝末尾=顶层」一致）                                           | 无（行为意图一致） |
| design-toolbox.md §4.3 clipboard    | 深拷贝 + `${原id}-copy-${counter}` 新 id + +20/+20 offset + 不接 OS clipboard = `clipboard.ts:28-91` live 一致                                                                                                               | 无                 |
| design-toolbox.md §5 字段分类       | clipboard.symbols/operation/timestamp + 视口（runtime 派生）+ selection = `toolbox-panel.tsx` live 一致                                                                                                                      | 无                 |
| design-toolbox.md §10 样式 marker   | `nop-scada-editor-toolbox` + `data-slot` + 子标记 btn/sep/status/import-textarea = `toolbox-panel.tsx:138-208` live 一致                                                                                                     | 无                 |
| design-property-panel.md §4.3/§5/§6 | extractPanelFields 六类分组 + GROUP_ORDER + defaults 权威源 + validateScadaConfig 单源 = `schema-extractor.ts`/`inspector-panel.tsx` live 一致（PanelField 接口实现期将 `value` 移为独立 InspectorField prop，非行为 drift） | 无（接口精炼）     |

**结论**：受检章节与 live panels 无 drift，不需同步写入。

### 先验修复回归抽查

| 先验修复                                                    | live 核对                                                                                 | 测试                                                                                             |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| #6 inspector-field parse 失败仅 setParseError 不调 onChange | `inspector-field.tsx:134-137`（catch → setParseError，无 onChange）仍成立                 | `inspector-field.test.tsx:141-154`（onChange 未被调 + field-error 显示 + 草稿保留）PASS          |
| #21 canPaste canonical clipboard 派生                       | `toolbox-panel.tsx:43`（`runtime.getClipboard()?.symbols.length`，无 state mirror）仍成立 | `toolbox-panel.test.tsx:331-363`（Paste disabled→enabled after copy + 外部清空 re-disabled）PASS |
| HCA7 P3-1 palette title=def.name                            | `editor-palette.tsx:51`（`title={def.name}`）仍成立                                       | —                                                                                                |

**结论**：三条先验修复均复核仍成立，无回归。
