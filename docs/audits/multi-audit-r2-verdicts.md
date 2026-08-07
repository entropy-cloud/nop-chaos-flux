# multi-audit R2 裁决表（component-audit mission）

> Mission: component-audit | R2 轮次: 2026-08-06（plan `2026-08-06-0556-1-followup-backlog-and-r1-p2-routing.md` Phase 1/3/4）
> 范围: R1 扫描的全部 P2 候选（8 个维度文件、15 条 finding）R2 live 复核 + 路由裁决 + 终态
> 复核方式: 每条对 live 文件逐行核对（file:line 证据），与 R1 描述对照
> 17-3（utils/helpers 双命名观察项）R2 顺带复核：维持观察（见 §17-3），不进修复清单

## 裁决总表

| #     | finding                                                         | 来源维度文件               | R2 结论                      | 路由             | 终态                                                                        |
| ----- | --------------------------------------------------------------- | -------------------------- | ---------------------------- | ---------------- | --------------------------------------------------------------------------- |
| 01-03 | 3 个 root barrel 导出零外部消费者                               | 01-dependency-graph.md     | 属实                         | fix-in-this-plan | fixed（JSDoc + docs 条目，非结构性）                                        |
| 03-01 | 同上（与 01-03 同根）                                           | 03-api-surface.md          | 属实                         | fix-in-this-plan | fixed（与 01-03 一处处理）                                                  |
| 14-3  | `g5-g12-g17-data-lifecycle.test.tsx:211` innerHeight 无 restore | 14-test-coverage.md        | 属实                         | fix-in-this-plan | fixed（原值保存 + afterEach 恢复）                                          |
| 14-4  | canvas-bridge.test.tsx setup 膨胀 + 固定空快照 mock             | 14-test-coverage.md        | 属实                         | successor        | fixed（plan `2026-08-07-0819-1` Phase 5：test-support 提取 + 真实 fixture） |
| 15-1  | relayoutTree 全文档 JSON.stringify ×2 变更检测                  | 15-security-performance.md | 属实（非热路径）             | successor        | adjudicated（watch-only residual，plan `2026-08-07-0819-1` Phase 2）        |
| 15-2  | clampShellWidth NaN 无防护 + action-provider 放行 NaN           | 15-security-performance.md | 属实（fail-closed 缺口）     | successor        | fixed（plan `2026-08-07-0819-1` Phase 2：三处 Number.isFinite fail-closed） |
| 15-3  | barcode WASM 默认 URL 硬编码第三方 CDN                          | 15-security-performance.md | 属实（live 路径不可达）      | fix-in-this-plan | fixed（fail-closed：删除默认 URL 改抛错）                                   |
| 16-3  | quick-reference Package Directory Map 缺 ai/graph 行            | 16-doc-code-consistency.md | 属实                         | fix-in-this-plan | fixed                                                                       |
| 16-4  | timeline design.md 决策表残留「待实现」+ C5.2 卡注记            | 16-doc-code-consistency.md | 属实                         | fix-in-this-plan | fixed（设计文档 + 卡注记）                                                  |
| 16-5  | tree-mode.md 声称 projectAndLayoutTree 非 root export           | 16-doc-code-consistency.md | 属实（:228 措辞漂移）        | fix-in-this-plan | fixed（措辞修正）                                                           |
| 16-6  | roadmap 组件计数 113 未含 graph                                 | 16-doc-code-consistency.md | 属实                         | fix-in-this-plan | fixed（补 graph 说明）                                                      |
| 16-7  | plan 453 Last Reviewed 日期陈旧                                 | 16-doc-code-consistency.md | 属实                         | fix-in-this-plan | fixed                                                                       |
| 17-1  | terminology.md 缺 4 个高频新词条                                | 17-naming.md               | 属实                         | fix-in-this-plan | fixed                                                                       |
| 17-2  | graph 事件 payload type 命名空间不一致                          | 17-naming.md               | 属实                         | successor        | fixed（plan `2026-08-07-0819-1` Phase 4：graph:node-click 等命名空间化）    |
| 19-3  | designer JSON.parse 失败静默 null                               | 19-error-propagation.md    | 属实（reportHostIssue 可用） | successor        | fixed（plan `2026-08-07-0819-1` Phase 3：reportHostIssue + 错误文案）       |
| 23-3  | action-core 委托测试断言过弱                                    | 23-test-effectiveness.md   | 属实                         | fix-in-this-plan | fixed（断言强化）                                                           |

## 逐条 R2 复核证据

### 01-03 / 03-01（同根，API 表面积）

- **R2 复核**: `rg` 全仓实证——
  - `createCrudNormalizedSourceContext`（`flux-renderers-data/src/index.tsx:14`）：仅自身包单测 `crud-renderer-state.unit.test.tsx:6,116,122` 引用（从模块文件导入），src 之外（playground/宿主/e2e/其他包）零消费者。
  - `GAP_TOKENS`（`flux-react/src/index.tsx:105`，`resolve-gap.ts:1`）：生产代码零消费者（`resolveGap` 有消费者 `flex.tsx:5`、`container.tsx`，但 `GAP_TOKENS` 仅 docs 示例 `styling-system.md:660` 引用）。
  - `normalizeProgressValue` / `NormalizedProgress`（`flux-renderers-content/src/index.ts:38`，`progress.tsx:6,21`）：仅自身包 `progress.tsx:39` + 单测引用，src 之外零消费者。
- **R2 结论**: 属实，R1 扫描结论成立（3 符号 root barrel 公开但全仓零外部消费者）。
- **路由**: fix-in-this-plan（默认方案 a：补 JSDoc + docs 条目，保持导出；摘除 root 导出属公共 API 面结构性变更，ask-first 边界，不静默执行）。
- **终态**: fixed — 3 处定义点补 JSDoc（说明导出意图 + 当前消费面），裁决记录于本表（docs 条目）。

### 14-3（测试隔离）

- **R2 复核**: `g5-g12-g17-data-lifecycle.test.tsx` afterEach 仅 `cleanup()` + `vi.restoreAllMocks()`（:15-18）；`:211` `window.innerHeight = 600` 赋值后全文件无 restore 路径。R1 描述与 live 一致。
- **R2 结论**: 属实。
- **路由**: fix-in-this-plan。
- **终态**: fixed — 原值保存 + afterEach 恢复。

### 14-4（flow-designer 测试 setup）

- **R2 复核**: `canvas-bridge.test.tsx` 588 行（R1 记 589，live 实测 588）；`:1-212` 为 mock/常量/渲染辅助区（约 36%）；`:91` `useDesignerSnapshotSelector` mock 固定空快照 `{ doc: { nodes: [], edges: [] } }`。R1 描述属实。
- **R2 结论**: 属实。
- **路由**: successor — flow-designer 域（非 component-audit 113 组件授权面），提取 test-support.tsx + 真实 fixture 属结构性测试重构。
- **终态**: registered（successor 路径见 §successor）。

### 15-1（flow-designer 性能）

- **R2 复核**: `tree-session-impl.ts:310-311` live 属实——relayoutTree 对 `{nodes, edges}` 全文档两次 `JSON.stringify` 做变更检测（:310 previous / :311 next / :312 比较）。用户触发路径（非渲染热循环），大文档 O(n) 序列化 ×2。
- **R2 结论**: 属实，但非热路径。
- **路由**: successor — flow-designer 域代码优化（修订计数/浅比较）。
- **终态**: registered。

### 15-2（flow-designer fail-closed 缺口）

- **R2 复核**: `shell-controls.ts:17-24` clampShellWidth `Math.min(Math.max(width, min), max)` — `Math.max(NaN, min) === NaN`，无 Number.isFinite 守卫；`designer-action-provider.ts:447-453` `typeof args.paletteWidth === 'number'` 对 NaN 放行（NaN 是 number）；`designer-command-adapter.ts:256-264` `!== undefined` 继续放行 → `setPaletteWidth(NaN)` → 幂等守卫恒 false → 每次 dispatch 都 emit NaN。R1 描述属实。
- **R2 结论**: 属实 — confirmed fail-closed defect（schema-callable action 路径可注入 NaN，拖拽路径恒有限数不受影响）。
- **路由**: successor — flow-designer 域代码修复（Number.isFinite 守卫 + `{ok:false,reason:'invalid-width'}`），成本 <15 分钟但属其他 owner 域；按 Deferred But Adjudicated 契约：confirmed defect 显式 successor 登记，不降级为非阻断。
- **终态**: registered（显式 successor + 路径）。

### 15-3（barcode WASM 默认 URL）

- **R2 复核**: `prepare-wasm-utils.ts:3` `DEFAULT_WASM_URL = 'https://unpkg.com/...'` 属实；`:44` `const url = wasmUrl ?? DEFAULT_WASM_URL`。可达性核对：唯一生产调用点 `barcode-scanner-overlay.tsx:116-117` 有 `if (wasmUrl)` 守卫，`barcode-input.tsx:270,343` 恒传 `resolved.wasmUrl`（schema prop）→ **live 路径默认值不可达**；fetcher 注入已 fail-closed（`:47` 无 fetcher 即 throw，契约测试锁定）。但默认 endpoint 硬编码违反 INV-1 精神且未在任何架构文档记录（R5 缺口），resetWasmPromise() 无参路径仍引用 DEFAULT_WASM_URL（`prepare-wasm.test.ts:104-117` 锁定该语义）。
- **R2 结论**: 属实（文档化/R5 缺口 + 硬编码 endpoint），live 不可达。
- **路由**: fix-in-this-plan — 方案 a：删除 DEFAULT_WASM_URL，prepareWasm 要求显式 wasmUrl（未提供 → fail-closed throw）。live 路径行为不变（调用点恒传）。
- **终态**: fixed（fail-closed + focused 测试先红后绿）。

### 16-3（文档漂移）

- **R2 复核**: `quick-reference.md:14-44` Package Directory Map 列 basic/form/form-advanced/data/mobile/content/layout/scheduling + ui/code-editor/i18n/nop-debugger 等，无 flux-renderers-ai、无 flux-renderers-graph 行。R1 描述与 live 一致。
- **R2 结论**: 属实。
- **路由**: fix-in-this-plan。
- **终态**: fixed — 补两行（layer 7）。

### 16-4（文档漂移）

- **R2 复核**: `timeline/design.md:27-28` 决策表「受控当前事件」「点击 seek」仍标「采纳（v2 立约，待实现）」；头部 `:3-4` 已声明 v2 实现（plan `2026-08-04-2030-2`）；`timeline-renderer.tsx:201,243` 恒发 data-ownership；C5.2 卡 `per-component/timeline.md:44`「无 data-ownership 副作用 | 结果: pass」被 v2 恒发契约推翻（e2e `c5-2-host-surfaces.spec.ts:201` 注释已记 v2 恒发）。R1 描述属实。
- **R2 结论**: 属实。
- **路由**: fix-in-this-plan — 纯文档（设计文档文本 + 卡注记；e2e 断言面归 CR Phase 5，本 plan 不触碰）。
- **终态**: fixed。

### 16-5（文档漂移）

- **R2 复核**: `tree-mode.md:228`「projectAndLayoutTree 不是 root export；renderer 只能通过 createTreeDesignerCore、tree commands、replaceTreeFromHost 与 relayoutTree 间接触发」（R1 记 :222，live 为 :228，行号漂移）；`:33,:215` 亦标「core-private」；反证 `flow-designer-core/src/index.ts:9-10` 显式导出 projectAndLayoutTree/validateTreeDocument/canonicalizeTreeDocument/isJsonSafeTreePayload/resolveTreeNodeFootprint。渲染器侧确实未直接导入（「间接触发」一半成立）。
- **R2 结论**: 属实 — 文档对公共 API 边界描述与实际导出面矛盾。
- **路由**: fix-in-this-plan — 纯文档措辞修正（「root export 但渲染器须经 core 会话间接使用」）。
- **终态**: fixed。

### 16-6（文档漂移）

- **R2 复核**: `roadmap:63`「组件合计 113（basic 16 / content 19 / data 8 / layout 7 / form 21 / form-advanced 19 / mobile 5 / ai 14 / scheduling 4）」；graph 已注册（`graph-definitions.ts:6` type 'graph'）→ 注册合计应为 114；graph 由 G1 plan（`2026-08-04-2030-1`）独立闭环。R1 描述属实。
- **R2 结论**: 属实。
- **路由**: fix-in-this-plan — roadmap 补 graph 说明（同口径同步 :109 组件清单节）。
- **终态**: fixed。

### 16-7（日期字段）

- **R2 复核**: `plan 453:3` Last Reviewed: 2026-08-05；文件 :200 completed 2026-08-06（提交 07e4a7fc）。R1 描述属实。
- **R2 结论**: 属实（事实性日期错误）。
- **路由**: fix-in-this-plan。
- **终态**: fixed — 2026-08-05 → 2026-08-06。

### 17-1（术语缺口）

- **R2 复核**: `terminology.md`（547 行）rg 零命中 TB/LR/WorkbenchShell/TreeDocument/受控当前事件；这些词在 tree-mode.md:144（TB|LR）、:275-283、timeline design.md:11、designer-workbench-shell.md:72、flux-react/src/index.tsx:91（WorkbenchShell 导出）高频使用。R1 描述属实。
- **R2 结论**: 属实。
- **路由**: fix-in-this-plan — 补 4-6 条词条。
- **终态**: fixed。

### 17-2（graph 事件 payload）

- **R2 复核**: `graph-renderer.tsx:157` `fullPayload = { type, nodeId, node }` — `type` 为事件字段名（'onNodeClick'），非命名空间值（graph:node-click）；`design.md:165-171` payload 表（onNodeClick/onNodeDoubleClick/onSelectionChange）未含 type 字段。renderer-runtime.md:697-700 要求命名空间 type（如 ai:conversation-click）。R1 描述属实。
- **R2 结论**: 属实 — 命名与文档 shape 双缺口。
- **路由**: successor — graph 域（G1 plan 链），命名空间化需与 normalizeActionEvent 'custom' 合成规则对齐，属行为契约变更。
- **终态**: registered。

### 19-3（flow-designer 错误传播）

- **R2 复核**: `designer-page-body.tsx:193-200` `JSON.parse(core.exportDocument())` catch → null，dialog 打开但内容空；同文件 :219 已有 `reportHostIssue` 工具且 :267,:292,:301,:332 多处使用 → **reportHostIssue 在 designer-renderers 可用**（R1 复核问题「可用性」答案：可用）。R1 描述属实。
- **R2 结论**: 属实 — 结构化失败缺失（catch→null 无上报）。
- **路由**: successor — flow-designer 域代码修复（catch 中 reportHostIssue + 错误文案展示）。
- **终态**: registered。

### 23-3（测试断言过弱）

- **R2 复核**: `action-core.test.ts:315-320` 标题「delegates update and merge to original scope」仅 `not.toThrow` ×2；`withEvaluationBindings` 委托契约（update/merge 应落原 scope、bindings 可见）无正向断言。R1 描述属实。
- **R2 结论**: 属实 — 断言面与标题不符，重构为静默 no-op 仍全绿。
- **路由**: fix-in-this-plan（公共层契约测试，Must automate）。
- **终态**: fixed — 断言 `wrapped.get('x') === 99` + merge 同理 + bindings 可见。

### 17-3（观察项，顺带复核）

- **R2 复核**: `utils.ts` / `date-utils.ts` vs `tree-node-helpers.ts` / `kanban-helpers.ts` / `field-utils/` 双命名并存现状未变；R1 已裁「维持观察」，不进 R2 清单。本轮顺带复核维持观察（命名定约归 CR Phase 4 可选治理）。
- **R2 结论**: 维持观察（与 R1 一致）。
- **路由**: keep（观察项）。

## 路由分类汇总

### fix-in-this-plan（10 项）

01-03/03-01（JSDoc+docs）、14-3、15-3、16-3、16-4、16-5、16-6、16-7、17-1、23-3 — 对应 plan Phase 2/3 落地，终态见各条。

### successor（5 项）

- **14-4 / 15-1 / 15-2 / 19-3** → flow-designer owner plan 链（453 后续 / workbench-shell / future 治理 plan，登记于 `docs/plans/2026-08-06-0556-1-...md` Deferred But Adjudicated）
- **17-2** → graph G1 plan 链（`2026-08-04-2030-1` 后续）

successor 登记理由：非 component-audit 113 组件授权面（flow-designer/graph 属其他 owner 域）；本 plan 完成 R2 复核 + 裁决表登记（零静默）；15-2 为 confirmed defect，按 Deferred But Adjudicated 契约显式 successor 登记，不降级为非阻断。

### keep（1 项）

- **17-3**（观察项，维持观察）

## 终态核对（2026-08-06）

- fix-in-this-plan 10 项全部落地：F3/F4 见 plan Phase 2；01-03/14-3/15-3/16-3/16-4/16-5/16-6/16-7/17-1/23-3 见 plan Phase 3。
- successor 5 项已承接并收口（plan `2026-08-07-0819-1`，2026-08-07）：14-4/15-2/17-2/19-3 → fixed；15-1 → adjudicated（watch-only residual）；终态明细见下表，证据见 `docs/logs/2026/08-07.md`。
- 裁决表与 plan Phase 1/3/4 结果一致，无未分类项。

## 终态明细（fixed / keep / successor）

| #              | 终态                               | 落地证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01-03/03-01    | fixed                              | JSDoc 已补 3 处定义点：`crud-renderer-state.ts:264`、`flux-react/src/resolve-gap.ts:1`、`flux-renderers-content/src/progress.tsx:21`（均注明「stable public utility / maintenance surface」+ 裁决表引用）；保持 root 导出（方案 a，非结构性）                                                                                                                                                                                                                           |
| 14-3           | fixed                              | `g5-g12-g17-data-lifecycle.test.tsx:211-223` 原值保存 + try/finally 恢复；data 包 723 测试绿                                                                                                                                                                                                                                                                                                                                                                            |
| 14-4           | fixed                              | `canvas-bridge.test.tsx` 测试重构（plan `2026-08-07-0819-1` Phase 5）：mock/渲染辅助区提取为 `canvas-bridge-test-support.tsx`（227 行），`:91` 固定空快照 mock 改走真实 fixture `createSnapshot()`（非空文档快照），主文件 588→325 行、setup 区 36%→~18.5%（<40% 达标），8 个既有用例语义保持 + typecheck/全包测试绿                                                                                                                                                    |
| 15-1           | adjudicated（watch-only residual） | `tree-session-impl.ts:310-311` 变更检测裁决（plan `2026-08-07-0819-1` Phase 2）：`version` 为 semver 字符串非修订计数、浅比较无法检测坐标漂移 → 计数比较不可等价，显式记录 watch-only residual（非热路径）；新增双分支等价测试 3 条（no-op/changed/version 不变仍 emit）锁定语义                                                                                                                                                                                        |
| 15-2           | fixed                              | NaN fail-closed 修复（plan `2026-08-07-0819-1` Phase 2）：`shell-controls.ts` `clampShellWidth` 加 `Number.isFinite` 守卫（非有限数返回当前已存宽度、不 emit）+ `shell-state.ts` `resolveShellWidth` 同守卫；`designer-action-provider.ts` 对 NaN 返回 `{ok:false, reason:'invalid-width'}`（拦截于 payload 校验前），`designer-command-adapter.ts:256-264` 校验升级 `Number.isFinite` 同 reason 拒绝；test-first 先红后绿（core-ui-state 2 条 + action-provider 3 条） |
| 15-3           | fixed                              | `prepare-wasm-utils.ts` 删除 `DEFAULT_WASM_URL`，`prepareWasm` 未提供 wasmUrl → fail-closed throw；`resetWasmPromise()` 无参改全清缓存；test-first 先红（2 fail）后绿，scheduling 包 868 测试绿                                                                                                                                                                                                                                                                         |
| 16-3           | fixed                              | `quick-reference.md:29-30` 补 flux-renderers-ai / flux-renderers-graph 两行（layer 7）                                                                                                                                                                                                                                                                                                                                                                                  |
| 16-4           | fixed                              | `timeline/design.md:27-28` 改「已实现（v2）」+ 引用 v2 plan；`per-component/timeline.md:44` 补 v2 事后注记（data-ownership 恒发契约；e2e 断言面归 CR Phase 5）                                                                                                                                                                                                                                                                                                          |
| 16-5           | fixed                              | `tree-mode.md:228` 改「root export（index.ts:9-10）但渲染器必须经 core 会话间接使用」；`:33,:215`「core-private」措辞同步修正                                                                                                                                                                                                                                                                                                                                           |
| 16-6           | fixed                              | `roadmap:63` 补「注册合计 114 = 113 逐卡范围 + graph 1（G1 plan 独立闭环）」；`:109` 组件清单节同口径同步                                                                                                                                                                                                                                                                                                                                                               |
| 16-7           | fixed                              | `plan 453:3` Last Reviewed 2026-08-05 → 2026-08-06                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 17-1           | fixed                              | `terminology.md` 补 4 条词条（TB/LR、TreeDocument/TreeDocumentSession、受控当前事件、WorkbenchShell），风格与既有词条一致                                                                                                                                                                                                                                                                                                                                               |
| 17-2           | fixed                              | graph 事件 payload type 命名空间化（plan `2026-08-07-0819-1` Phase 4）：`graph-renderer.tsx` `GRAPH_EVENT_PAYLOAD_TYPES` 映射（`graph:node-click`/`graph:node-double-click`/`graph:selection-change`），事件键名（`onNodeClick` 等）不变；`graph-definitions.ts` eventContracts payload 补 `type` 字段；`docs/components/graph/design.md` §8.1 payload 表同步；test-first 3 条契约测试先红后绿 + 既有 ctx 断言更新                                                      |
| 19-3           | fixed                              | `designer-page-body.tsx` JSON.parse 失败结构化上报（plan `2026-08-07-0819-1` Phase 3）：catch 分支走 `reportHostIssue`（reason `designer-json-export-parse-failed`）+ dialog 内 `designer-json-panel-error` 错误文案（新增 i18n key `flux.flowDesigner.flowJsonParseError` en/zh），不再静默空内容；正常路径行为不变；test-first 先红后绿 2 条                                                                                                                          |
| 23-3           | fixed                              | `action-core.test.ts:315-323` 断言强化：mock scope update/merge 真实现 + `wrapped.get('x')===99` + `scope.get('x')===99` + merge 同理 + bindings 可见；action-core 包 207 测试绿                                                                                                                                                                                                                                                                                        |
| 17-3（观察项） | keep                               | 双命名并存现状维持观察（与 R1 一致），命名定约归 CR Phase 4 可选治理                                                                                                                                                                                                                                                                                                                                                                                                    |

> 全部 landing 记录见 `docs/logs/2026/08-06.md`（本 plan 收口节）。
