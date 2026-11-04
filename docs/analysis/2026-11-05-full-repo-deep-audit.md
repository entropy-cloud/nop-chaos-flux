# 2026-11-05 全仓深度审计（deep audit round）

> Status: final report
> Method: 全量门禁复跑（本会话实测）+ 4 个并行独立只读深审维度（文档-代码漂移 / 登记基线诚实性 / 运行时正确性 / 约定合规与测试缺口），关键发现由执行会话逐条对 live repo 复核后收编
> Verification baseline: `pnpm typecheck` / `lint` / `build` exit 0（46 包）；`pnpm test` **16,837 passed / 0 failed**（46 vitest project）；`pnpm check` exit 0（33 项 + test:scripts 200 passed / 2 skipped）；e2e 本轮未全量重跑（最近全量=2026-11-02，242 failed 逐红对账在案，见 §5 已知债务对账）
> Output: 本报告 → 5 份 remediation plan（856–860，见 §6）

## 1. 审计范围

| 维度               | 覆盖面                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 门禁实测           | typecheck / lint / build / test / check 全链（零新增未登记红）                                                                                                                                   |
| 文档-代码漂移      | quick-reference.md 抽查、docs/index.md 路由 ~120 行存活核验、三份 architecture owner doc 事实抽查、AGENTS.md 组件清单、codebase-map.md                                                           |
| 登记基线诚实性     | 11 个 registry（scanner-baselines / duplicates / oversized 豁免 / console / knip / deps / jsdom / metamodel-residue / ui-consistency-exemptions / wiring-allowlist / bundle-size）+ 4 份测试台账 |
| 运行时正确性       | flux-core / flux-runtime / flux-react / flux-action-core 全读 + flux-renderers-basic/form 抽读（7 类缺陷 hunt，逐 call path 追溯）                                                               |
| 约定合规与测试缺口 | AGENTS.md 强制约定（ui 组件替代 raw HTML / store 直访 / useEffect+setState 镜像）+ core 包 src:test 比 + 无测试公开导出 + 无断言测试                                                             |

## 2. 结论摘要

- **机械门禁层健康**：全链 exit 0，33 项 check 零新增红；7 类运行时缺陷 hunt 中 5 类零真实缺陷（见 §3.B），核心运行时硬化程度高。
- **但登记债务层出现系统性失真**：一次事件（2026-10-30 `dc4d8bf97` mall-mobile 退役）删除了 app，却从未收缩 scanner-baselines / duplicates-baseline，导致 **~119 单位登记债务容忍的是已删除或已修复的面**（82 scanner hits + 63 clones + 2 条死豁免）。期间两次本可顺手收缩的基线编辑会话（plan 822、818）均未做。
- **发现 1 个新的运行时缺陷机制**（F-B1 stale FormRuntime teardown 的 ownership-unaware unpublish，会清掉后继 runtime 刚发布的外部数据）+ 1 个未处理 rejection 通道（F-B2）。
- **参考文档出现成片漂移**：quick-reference.md 的 ScopeRef 幽灵成员、RendererRuntime 清单缺 ~14 个 live 成员、AGENTS.md 组件清单自"2026-10-31 regenerated"起就缺 2 个组件；头部"4/4 API spot-checks pass"新鲜度声称经不起复检。
- **AGENTS.md 强制约定存在 8 处 raw-HTML 绕过**（无扫描器覆盖，属规则-执行落差）+ 5 处 clear-cut useEffect+setState 镜像。
- **core 测试缺口具体到导出级**：flux-core（src:test 1.50）/ flux-formula（1.33）共 9 组公开导出零测试引用；4 个套件零断言。

## 3. Findings（全部经执行会话亲核；格式：编号 / 严重级 / 证据 / 后果）

### F-A 治理面：登记基线与豁免诚实性

- **A1 / Major**：`scripts/baselines/scanner-baselines.json` 容忍已删除 app 的债务。2026-10-28 notes 明确登记 "+26 react19 / +20 async / +25 discover / +5 test-leaks，全部在 restored apps/mall-mobile/** surface"（registry notes 第 9–11 行）；10-30 `dc4d8bf97` 退役该 app 时未收缩基线。live 实测（本会话 check log）：react19 **668** < 基线 694、async **351** < 373、discover **797** < 825、test-leaks **114\*\* < 120——82 条命中指向不存在的文件。gate 自身输出已提示 `entries can be shrunk (--update-baselines)`。
- **A2 / Major**：`scripts/baselines/duplicates-baseline.json` 登记 clones 597（2026-09-30 更新），live **534**（7251/315626 行，2.3%）——63 clone（10.6%）的虚假容忍；比例阈值 8% vs live 2.3% 使该 gate 双重失活。全仓最大单项收缩缺口。
- **A3 / Major**：`scripts/check-oversized-code-files.mjs` 5 条豁免中 2 条已死：`packages/flux-xlang-lang/generated/xlang.parser.js` 现 **17 行**（豁免理由描述的"机器生成 parser 表"形态已不存在）；`packages/flux-compiler/src/schema-compiler/node-compiler.ts` 现 **646 行**（低于 700 ERROR 阈值，豁免永不触发）。实际超限仅 3 文件（en-US.ts / zh-CN.ts / form-runtime-owner.ts，豁免理由仍成立）。
- **A4 / Minor**：scanner-baselines 违反自身"每次手改必须记 notes"协议——`find-non-retained-renderer-references` 160→161（2026-11-02，commit `1d3412fac`）无 notes 条目，`_header.lastUpdated` 仍为 2026-11-01。
- **A5 / Minor**：`knip-baseline.json` `_header.counts`（exports 346 / types 571）与其数组实况（341 / 566）漂移——plan 822 收缩后未更新头部。gate 按 identity diff，仅装饰性失真。
- **A6 / Minor**：`docs/testing/known-good-baselines.md` 基线表仍是占位符（"add the first row when a real full-green run lands"），而近期多个 commit 声称 full-green verification——该文件自设定的持久绿态登记职责从未履行。
- **A7 / Minor**：`docs/testing/e2e-baseline-ledger.md` 头部快照仍为 2026-10-26（unexpected 248）；2026-11-02 全量（242 failed / 1896 passed）已逐红对账但仅记录于 `docs/logs/2026/11-02.md`（3 条新红 complex-pages:180 / renderer-lab:114 / table-virtual-body:43 "登记不静默"），台账本体未更新——最新权威快照角色出现滞后。plan 836 Phase 4（台账基线刷新）在办，归其收口。

**Clean（已核验诚实，无需处理）**：console-log-baseline（27/27 文件存在、0 可收缩）、jsdom-pragma-whitelist（6/6）、metamodel-residue（11 条 0 死路径）、ui-consistency-exemptions（82 路径 0 缺失、74/82 引用 plan 出处）、wiring-allowlist（逐条解析到 live script）、deps-baseline（58 登记 = 58 live）、focus ledger（同步）、bundle-size（容差内）。plan 822 已把 knip/console 收紧到位——A1–A3 错过的正是同类处理。

### F-B 行为面：form 外部发布族

- **B1 / Major（本轮新发现机制）**：`packages/flux-runtime/src/form-runtime.ts:285-294` `clearExternalPublication()` 无所有权守卫——teardown 时无条件 `parentScope.update(valuesPath, undefined)` + `publishOwnerStatus(parentScope, statusPath, undefined)`。与 `packages/flux-renderers-form/src/renderers/form.tsx:134-157` 的 StrictMode 延迟 dispose 协议叠加：当 `valuesPath`/`statusPath`/`formId` 为动态表达式（如 `valuesPath: "${dialogArgs.key}.query"`）时，新 runtime 于渲染期创建并排队 publish（microtask #1），旧 runtime 的 dispose-check 排队为 #2，随后旧 teardown 把共享路径覆写为 undefined——**后继 runtime 已发布的数据对 siblings 消失**，直到用户再次编辑。判别场景：动态 valuesPath 的 ownedForm 重创建（deps 变化）后兄弟公式短暂/长期读空。
- **B2 / Minor**：`form.tsx:458`（提交成功路径）与 `:515`（submitOnChange debounce）`void deliverToSubmitTarget()` 无 `.catch`——`deliverToSubmitTarget`（:396-407）await 的 `handle.capabilities.invoke('querySubmit', …)` 契约允许 reject（`component-handle-core.ts:38-40`），是本仓除一处外全部走 `catch(reportRuntimeHostIssue)` 模式中的裸通道。
- **B3 / 已知债务（非新发现，引用）**：valuesPath 初始发布丢失 = P1-MA4.5-006，诚实棘轮 `values-path-integration.test.tsx` it.skip + RATCHET HISTORY 在案，successor 归属 audit-remediation-r2 roadmap **R3.x/MV**（plan 737 Deferred）。本轮不重复登记；plan 860 落地 B1 修复后将复跑 assertion-biting 探针，如实裁决其状态是否受 B1 修复影响。

**运行时正确性 hunt 其余 5 类零真实缺陷**（检查位点数）：①未清理订阅/observer（~16 位点全有 cleanup）；②floating promise（dispatch 链 `action-execution.ts:414-570` 全 await，仅 B2）；③unsafe optional chaining（0）；④stale closure（keyboard/source-prop/lifecycle 协议全部追认 sound）；⑤共享对象突变（tabs/org-data/renderer-helpers 全 copy-on-write）；⑥等值误用（parseInt 无 radix 0 处、deepEqual WeakMap 环守卫 sound）；⑦吞错 catch（仅 3 处 bare catch 且均返回定义 fallback）。另顺带追认：composite store shadowing、use-sync-external-store-with-selector fork 忠实、withTimeout/withRetry 定时器卫生、bug163 delegateWrites 落地。

### F-C 文档面：参考文档漂移

- **C1 / Major**：`docs/references/quick-reference.md:752` ScopeRef 块声称 `dispose(): void`——`packages/flux-core/src/types/scope.ts:33-54` 无此成员（且 doc 漏掉 live 的 `source?` lineage 字段）。
- **C2 / Major**：quick-reference.md:309-376 自称"complete `RendererRuntime`"清单，缺 ~14 个 live 成员（`prepareSchema?` / `allocateMountedCid` / `createHostProjectionScope` / `releaseActionScope` / `createComponentHandleRegistry` / `resolvePreparedImports` / `ensureImportedNamespaces` / `getImportedExpressionBindings` / `releaseImportedNamespaces` / `createSourceObserver` / `disposeOwnedPage` / `findFirstInScope` / `registerRendererReaction` / `setEnv`）vs `flux-core/src/types/renderer-core.ts:242-404`。
- **C3 / Major**：AGENTS.md:147 组件清单（自称 "regenerated 2026-10-31, plan 823"）缺 `DropdownMenu`（barrel dropdown-menu.js :23 实导出）；`components/toolbar/` 目录在 barrel（:61）但**无 `Toolbar` 同名符号**（仅导出 TextFormatControls/AlignmentControls/ClipboardControls/UndoRedoControls）——清单落笔时已不完整。〔执行期勘正（plan 857 closure audit）：初判"缺 2 个组件"中 Toolbar 一项系路径级核验误报，真实缺口为 DropdownMenu 1 项 + toolbar 目录命名误导。〕
- **C4 / Minor ×8**：quick-reference.md:3 头部 "4/4 API spot-checks pass"（2026-10-31）新鲜度声称被 C1/C2 证伪；flux-core.md:126 公式 scope 代理拦截危险键声称（守卫实际在 `flux-formula/src/evaluator.ts`/`builtins.ts`，scope.ts 是 EvalContext 工厂）；`helpers.dispatch` 签名缺 `CompiledActionProgram`、`executeSource` 缺 `signal?: AbortSignal`（renderer-core.ts:81-88）；`events` 值可 undefined（:204）；FormRuntime 缺 `subscribeToModelGeneration?`/`setRefreshHandler`/`refresh()`/`validateField`/`validateForm` 的 `options?: { signal? }`；ValidationScopeRuntime 缺 4 成员；SurfaceRuntime 缺 `triggerHook?`/`setSurfaceForm?`/`getSurfaceForm?`；`FormStatusSummary` 缺 `id?`/`name?`/`visited`；`createScopeStore`/`createScopeRef` 归属写成 flux-core（实际 `flux-runtime/src/scope.ts`）。
- **C5 / Minor（本会话补录）**：`docs/references/quick-reference.md` 实测 **65.9 KB**，超出 AGENTS.md 自身"docs 40 KB 以下、50 KB 拆分"阈值一倍——仓库最大文档债务；本轮 C1–C4 修漂移会使其继续增长，拆分裁决归 plan 857 显式记账。

**Clean**：docs/index.md 路由表前 ~120 行零死链；codebase-map.md 全部入口/脆弱文件（含三处 `'use no memo'`）实存且在位；renderer-runtime.md 4 项抽查、styling-system.md 5 项抽查、flux-core.md 9 项抽查、AGENTS.md hooks 表/包清单/技术栈断言全部核实成立。

### F-D 约定面：AGENTS 强制约定的执行落差

- **D1 / Major（规则-执行落差）**：raw HTML 绕过 `@nop-chaos/ui`。初判"8 文件 10 处"经 plan 859 draft review 的全包 grep 复盘**勘正为 23 处 / 11 文件**（原枚举打包失真且漏 org-select-panel 7 处 / region-columns 3 处 / cron:221 / region-renderer:97——初判方法为抽样式 spot check，非全量盘点；全量清单见 `docs/plans/859-renderer-convention-compliance-plan.md` Current Baseline 表）。代表性位点：
  1. `packages/flux-renderers-data/src/crud-query-actions.tsx:19,27` —— 两枚 raw `<button>` 手抄 Button 样式面（`bg-primary text-primary-foreground hover:bg-primary/90`）
  2. `packages/flux-renderers-ai/src/renderers/ai-bubble/assistant-actions.tsx:43,53` —— copy/retry 两枚无样式 raw `<button>`
  3. `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx:220` —— scroll-to-bottom raw `<button>`
  4. `packages/flux-renderers-3d/src/renderer/three-canvas.tsx:211` —— retry raw `<button>`（同文件已 import Spinner 未 import Button）
  5. `packages/flux-renderers-form/src/renderers/org/region-columns.tsx:24` —— retry raw `<button>`
  6. `packages/flux-renderers-form/src/renderers/cron-editor-renderer.tsx:280` —— raw `<select>`（同文件已 import Button/Input；ui 有 Select/NativeSelect）
  7. `packages/flux-renderers-industrial/src/editor/context-menu.tsx:165` —— 手搓 menuitem `<button>`（ui 有 DropdownMenu/Menubar）
  8. `packages/flux-renderers-industrial/src/editor/toolbox/layers-panel.tsx:80` + `editor/palette/editor-palette.tsx:158` —— 同文件已 import Button 却另用 raw `<button>`

  判定为可接受的对照面（不立项）：`<input type="file">` sr-only 触发、`type="hidden"` 值镜像（shadcn 标准形态，ui 无对应物）；scheduling 日历 gridcell / mobile 手势域控件（无语义等价物）。

- **D2 / Minor**：clear-cut useEffect+setState 镜像 5 处（AGENTS "prefer render-time derivation"）：`flux-renderers-scheduling/src/kanban/hooks/use-kanban-filter.ts:12-14`（prop-mirror）与 `:19-21`（冗余态，debouncedValue 可直用）；`flux-renderers-content/src/media-shared.tsx:23-26`（src 变化重置 errored）；`flux-renderers-mobile/src/number-keyboard.tsx:25-28`（open prop-mirror）；`flux-renderers-content/src/qrcode.tsx:49-50`（failed 重置挂在 canvas effect 上）。
- **D3 / Follow-up（登记类）**：不存在覆盖 raw-control-element 绕过的扫描器规则（ui-consistency-exemptions 仅登记颜色/错误文案类）。是否新增机械规则属优化项，D1 修复后视残留面裁决。

**Clean**：store 直访零违规（渲染器对 flux-runtime/core 的导入全部是受认可工厂/`import type`）；ai 包 `engine.getState()` 针对自有 MessageEngine（useSyncExternalStore 源），非 flux store。

### F-E 测试面：core 测试缺口

- **E1 / Major**：高杠杆公开导出零测试引用（repo 全域 grep 确认 0 测试导入；flux-core src:test 比 1.50、flux-formula 1.33 为六个高 stakes 包中最差两个）：
  1. `flux-formula/src/bind-ast.ts:100` `bindAst`（依赖绑定 pass，index.ts 公开导出）
  2. `flux-formula/src/parser-node-factories.ts` `createSourceLocation`/`createLiteralNode`/`createIdentifierNode`/`createMemberExpressionNode`
  3. `flux-core/src/value-adapter.ts:437` `isCompiledActionProgram`
  4. `flux-core/src/constants.ts:94` `isCanonicalBuiltInActionName`
  5. `flux-core/src/validation-model.ts:16` `normalizeHiddenFieldPolicy`
  6. `flux-core/src/json-merge/identity.ts:73` `identityCompositeKey`
  7. `flux-core/src/json-merge/types.ts:82,92` `resolveContext`/`joinPath`
  8. `flux-core/src/types/compiled-renderer-contract.ts:46` `toCompiledRendererContract`（RM-1 单源派生，仅类型级测试）
  9. `flux-core/src/utils/schema.ts:9,13` `isSchemaArray`/`isSchemaInput` + `format-registry.ts:72` `formatRegistry` + `booleanMappingAdapter`
- **E2 / Minor**：无断言测试 4 处——`flux-renderers-industrial/src/editor/renderer/editor-engine.test.ts:215,324,411,431`（4 套件调方法后 destroy，零 expect）；`flux-renderers-3d/src/engine/scene-manager-branches3.test.ts:51`（rAF 路径零断言）；`flux-renderers-industrial/src/engine/scada-engine-events-declarations.test.ts:92`（"should not emit"仅靠不崩溃，无 handler-absence spy）。
- **E3 / 备注（不立项）**：type-only 断言测试（`expectTypeOf` 族，如 `renderer-contract-types.test.ts`）是刻意模式——fail 在 typecheck 层，不改。

**Clean**：flux-runtime（0.59）/ flux-action-core（0.57）覆盖率形态良好；flow-designer-core 1.88 属非 flux core 面另行观察。

## 4. 根因归因

1. **基线失真的主因是单事件 + 流程缺口**：mall-mobile 退役 commit 只删了 app，没有"退役必须收缩登记基线"的检查点；而 registry 的 reRegistrationNotes 协议只有"加债要记"，没有"减面要缩"的对称纪律。plan 822/818 两次编辑相邻值时也未触发全表收缩复核。
2. **参考文档漂移的主因是清单型文档的维护模型**：quick-reference 手抄 type 清单 vs live 类型文件，无机械核对；"regenerated on <date>"声称给了虚假新鲜感。AGENTS.md 组件清单同理（清单比 barrel 少 2 项的时间点即落笔日）。
3. **约定落差的因是规则无机械执行**：AGENTS 把"不得 raw HTML"写成 MANDATORY，但扫描器只覆盖颜色/文案类，按钮/下拉绕过无 gate 可见，8 处积压均发生在新包（ai/3d/industrial）与旧包边角。
4. **B1 缺陷是外部发布语义的对称性缺口**：publication 有 `Object.is` 去重（:262）但没有 unpublish 的所有权判定——发布与撤回不对称。

## 5. 已知债务对账（防重复登记）

| 既有归属                                                                    | 状态                   | 与本轮关系                                                                    |
| --------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| P1-MA4.5-006 valuesPath 初始发布丢失（R3.x/MV successor，plan 736/737/824） | live，诚实棘轮 it.skip | B1 是**新机制**（unpublish 侧），不动 R3.x/MV 归属；plan 860 修 B1 后复跑探针 |
| plan 836 Phase 3/4（e2e 漂移族 11 项 + 台账基线刷新）                       | open（在办）           | A7 的台账刷新归其 Phase 4，plan 856 只加头部指引注记不越权                    |
| mall-mobile UX pass 登记债务                                                | app 已删除，moot       | 即 A1 收缩的依据                                                              |
| watch-only e2e perf ×3（gantt/kanban）                                      | 裁决终态               | 无新证据，不动                                                                |
| improvement-analysis 清单                                                   | 归后续治理轮           | 本轮新登记见 plan 859 D3 / §6                                                 |

## 6. 工作项裁决 → plans

按"同一结果面合并、不同 closure 面拆分"（plan guide Rule 22/25）合并为 5 份 plan，编号按执行顺序：

| Plan                                         | 结果面                                               | 覆盖 findings                       | 风险                  |
| -------------------------------------------- | ---------------------------------------------------- | ----------------------------------- | --------------------- |
| `856-gate-baseline-honesty-plan.md`          | 登记基线/豁免诚实收缩 + 绿态台账履行                 | A1–A6（A7 头部注记，主体归 836-P4） | 低（registry/docs）   |
| `857-reference-docs-sync-plan.md`            | quick-reference / AGENTS.md / flux-core.md 对齐 live | C1–C4                               | 低（纯文档）          |
| `858-core-test-debt-plan.md`                 | core 包导出级测试补齐 + 无断言套件修复               | E1–E2                               | 低-中（纯测试）       |
| `859-renderer-convention-compliance-plan.md` | raw-HTML 绕过迁移 ui 组件 + effect 镜像消除          | D1–D2（D3 裁决）                    | 中（触渲染器 DOM 面） |
| `860-form-publication-unpublish-plan.md`     | 外部发布撤回所有权修复                               | B1–B2（B3 复探）                    | 中-高（运行时行为）   |

执行顺序即编号序（风险递增；859 在 858 后，使 858 的测试基建先于 859 的行为改动就位）。

## 7. 审计局限

- e2e 本轮未全量重跑（57m 级成本）；以 11-02 全量逐红对账 + `check:e2e-flake-ledger` 绿为 e2e 侧基线证据。plan 859/860 触及面执行时按需跑 focused e2e。
- 运行时 hunt 覆盖 core 五包 + 两个渲染器包抽读；其余渲染器包（mobile/content/scheduling/ai/industrial…）仅按约定维度扫描，未做同深度行为追溯。
- 移动端/设计器族（flow-designer、report-designer、word-editor）不在本轮深读范围，其 owner doc 抽查仅覆盖文件存活。
