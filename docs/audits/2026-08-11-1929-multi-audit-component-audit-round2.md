> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: component-audit-round2

# Multi-Audit — component-audit-round2（2026-08-11 19:29）

## 审核范围与方式

- **对象**: 仓库根 `./` —— 代码、配置、测试、公开契约（导出/API 面），交叉核对架构文档契约漂移。基线 fresh（project-context 2026-08-09）；working tree clean（无未提交改动）。
- **方式**: 6 个并行子 agent 初审（维度 01 依赖图与包边界 / 03 API 表面积与契约一致性 / 09 渲染器契约合规性 / 14+23 测试覆盖与假绿 / 16 文档-代码一致性 / 19 错误传播保真度），随后主 agent 对全部 P0/P1 候选与关键 P2 逐条 live 复核（读代码 + 读文档 + 工具基线交叉确认）。初审结论仅作线索，最终结论以主 agent 复核为准。
- **工具基线（2026-08-11 实测）**: `pnpm check` exit 1 = 仅既有登记 red（`check:audit-event-dispatch-ctx` 6 条 industrial 包命中，2026-08-09 已登记移交 industrial workstream；oversized 2 条 exempt locale），其余 13 项门禁全部通过；`check:audit-runtime-raw-schema-reads` 零命中；`check:audit-fieldframe-bypasses` 零命中；`check:audit-suspects` 535 条信息性命中（逐项复核后未转化为新缺陷）；`check:oversized-code-files` 184 warnings / 2 errors（均 exempt）。
- **已收敛不重复报告**: closeOnSubmit 文档漂移（plan 2026-08-09-1140-2 已收口）、surface submit hook 失败语义（同 plan）、P2-02 publishClosed 收口（plan 2026-08-09-1447-1）、CR plan 4 项"已落地未勾选"（19-1/19-2/23-1/23-2 live 核对已落地）。

## 发现汇总

| #   | 严重程度 | 维度  | 一句话                                                                                                                                                                                                               |
| --- | -------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P1       | 01/03 | flux-bundle facade 打包产物 dist/index.d.ts 导入未声明的 `@nop-chaos/flux-core`，干净宿主安装必然 TS2307，且 check:flux-bundle-pack 门禁存在"只查 manifest 不查 d.ts"覆盖盲区（tsc 实证复现）                        |
| 2   | P1       | 03    | FluxSchemaRendererProps 类型继承 10 个 props 但 facade 实现只转发 6 个——宿主按公开类型传入 plugins/parentScope/onRuntimeChange 等静默 no-op                                                                          |
| 3   | P1       | 16    | gantt-ai-e2e plan（2026-07-25-2）标记 completed，但 4 个 Phase 全 planned、211 项未勾选、closure 声称"e2e 覆盖完成"而其自身注记"e2e 暂未执行"                                                                        |
| 4   | P1       | 16    | 452 plan 标记 completed 且 closure 声称"componentName targeting 已消除"，但 Phase 1 仍 in_progress、Phase 2 仍 planned，且 schema.ts:83 `ActionShapeLikeFields.componentName` 幽灵字段存续                           |
| 5   | P1       | 16    | surface-lifecycle-callbacks.md §Relationship With Declarative Surface 断言 declarative surface 的 onSubmitSuccess/onSubmitError 由 form submit 触发，与 live 代码（无 nodes → skipped）及文档自身 §289 矛盾          |
| 6   | P1       | 19    | refreshSource/refreshNearest 在底层请求失败时仍返回 `{ok:true, data:true}`——非抛出型失败被重分类为成功，`then` 分支在 500 时照常执行                                                                                 |
| 7   | P2       | 03    | word-editor action provider 4/6 方法（save/undo/redo）绕过 manifest args 契约验证；insertField 手写契约副本（跨 host 族不一致）                                                                                      |
| 8   | P2       | 03    | flux-compiler 26 个公开导出中 22 个零 live 消费者（内部编译机制整体泄露）                                                                                                                                            |
| 9   | P2       | 03    | flux-action-core 26 个公开导出中 19 个零 live 消费者（执行层内部工具整体公开）                                                                                                                                       |
| 10  | P2       | 03    | flow-designer / report-designer listMethods 手写清单与 manifest 方法表双源并存、无 parity 护栏（spreadsheet 已用 Object.keys 派生）                                                                                  |
| 11  | P2       | 16    | action-scope-and-imports.md 声称 `dialog`/`drawer` action 名"remains supported for compatibility"，live 内置 action 注册表无这两个 selector                                                                          |
| 12  | P2       | 16    | action-scope-and-imports.md:273-277 "Current live shape" ComponentTarget 代码块仍含已移除的 componentName；:16/:249 表述同步过时                                                                                     |
| 13  | P2       | 16    | surface-lifecycle-callbacks.md §Finding Algorithm 伪代码与 live refresh-nearest.ts 不符（auto 匹配集漏 form、属性名 componentType vs type）+ "实现注意事项"把已实现的 findFirstInScope/handlesByScopeId 描述为未实现 |
| 14  | P2       | 19    | resolveInitFetch 裸 catch 静默吞掉 initFetch 求值错误并返回 true，与同模块 evaluateSendOnGate 的 reportRuntimeHostIssue 约定不一致                                                                                   |
| 15  | P2       | 19    | blob-download JSON-in-blob 解析失败被空 catch 吞掉，且无文件名可解析时仍返回合成成功 `{ok:true, data:{msg:'downloading'}}`——服务器错误响应被重分类为成功下载                                                         |
| 16  | P2       | 19    | flow-designer reason-only 失败（error: undefined）在用户通知层降级为通用 "Action failed"，具体 reason 丢失                                                                                                           |
| 17  | P2       | 23    | word-editor `template-snippets.tsx` / `doc-preview-page.tsx` 生产零导入（死代码）却带完整测试套件——假绿覆盖（曾被 ma43 审计计为 "Full"）                                                                             |
| 18  | P2       | 23    | calendar-timezone.test.ts 全部 5 例 + gantt-timezone.test.ts 4 例只测 JS 引擎原生 Date 语义，零包内导入——"timezone-safe" 标题与断言对象不符                                                                          |
| 19  | P2       | 23    | kanban-demo.spec.ts:66-82 标题 "verifies undo" 但正文无任何移动/撤销断言——撤销逻辑完全损坏时测试依然通过                                                                                                             |
| 20  | P2       | 14    | calendar 视图切换链（header 点击 → setActiveView → 子视图渲染）无任何贯穿测试（bug-71 历史 P0 家族接线面零保护）                                                                                                     |
| 21  | P2       | 14    | word-editor ribbon-toolbar 在全部 page 级测试中被 stub，paragraph-controls/template-controls 的 bridge.command 派发零直接测试                                                                                        |
| 22  | P2       | 16    | 444 plan（2026-06-02）completed + 119 项未勾选，17-03 rename use-form-hooks.ts 确认未落地                                                                                                                            |
| 23  | P2       | 16    | 2026-07-28-1430 surface-lifecycle-callbacks 源计划 completed + 19 项未勾选，2 项以相反方案（sync fire-and-forget）落地仅散注记录                                                                                     |
| 24  | P2       | 09    | tag-list 渲染器死订阅：`useCurrentFormFieldState` 结果从未被读取（下划线前缀绕过 lint）                                                                                                                              |
| 25  | P2       | 09    | page 布局渲染器通过 `footerClassName.includes('fixed')` 子串嗅探驱动几何行为（行为与样式类耦合，误匹配/静默失效路径真实存在）                                                                                        |
| 26  | P2       | 09    | crud 通过硬编码渲染器 type 字符串（'pagination'/'switch-per-page'）检测 sibling 节点——跨渲染器维护耦合                                                                                                               |
| 27  | P2       | 14    | calendar "day cells clickable" / kanban "undo/redo buttons present" e2e 标题声明交互能力，正文仅断言元素存在                                                                                                         |
| 28  | P2       | 14    | 死代码（无测试）：report-designer `fallbacks.tsx`、flow-designer `ding-flow-canvas-overlay.tsx` 零生产导入、无 barrel 导出                                                                                           |
| 29  | P2       | 03    | flux-runtime 根入口 8 个内部 helper（blob 文件名解析族 / createRootDependencySet 等）零外部消费者                                                                                                                    |
| 30  | P2       | 03    | flux-core 根入口 12 个零消费者导出，其中 4 个 contract-honesty 符号仅服务测试共享却经主公开面路由                                                                                                                    |
| 31  | P2       | 03    | flux-react 根入口 14 个包内自用导出（NodeMetaContext/GAP_TOKENS/form-state 选择器/container-hooks 等），与自身 public-surface 治理测试意图矛盾                                                                       |
| 32  | P2       | 16    | terminology.md SchemaFieldRule 分类列表只列 6 种 kind，缺 reaction/value/schema/schema-array/action/literal（reaction 为文档体系核心 kind）                                                                          |
| 33  | P2       | 16    | boundaries.md:206 引用不存在的子路径 `@nop-chaos/flux-core/i18n-sink`（实际为根导出 getMessageFormatter）                                                                                                            |
| 34  | P2       | 23    | 死代码带测试：CR plan 4 项已落地但 checkbox 未勾选、audit evidence 声称"全部 [x]"与文件实际状态矛盾（19-1/19-2 已 live 核对落地）                                                                                    |
| 35  | P2       | 16    | surface-lifecycle-callbacks.md 多处精确行号锚点漂移（3-31 行）；"live implementation" close() 片段用 console.warn 而实际 reportRuntimeHostIssue                                                                      |

## P1 发现

### [P1-01] flux-bundle facade 打包产物类型面导入未声明依赖，干净宿主安装必然 TS2307，打包门禁存在覆盖盲区

- **文件**: `packages/flux-bundle/types/public-types.d.ts:1-15`（构建时复制为 `dist/index.d.ts` 进入 tarball）；`scripts/pack-flux-bundle.mjs:35-68`、`scripts/check-flux-bundle-pack.mjs:82-100`
- **证据片段**:
  ```ts
  // public-types.d.ts:15（= 打包后 dist/index.d.ts:15）
  } from '@nop-chaos/flux-core';   // ← 打包清单对该包零声明（仅 peer: ui/i18next/lucide/react/...）
  // check-flux-bundle-pack.mjs 只检查 manifest 文本是否含 '@nop-chaos/flux-core' 字符串 + js/css 结构，
  // 从不读取 dist/index.d.ts 内容 → 门禁通过但缺陷仍在
  ```
- **严重程度**: P1
- **现状**: 真实 tarball（dist-packages/nop-chaos-flux-0.1.1.tgz）解包验证：`package/package.json` peerDependencies 无任何 `@nop-chaos/*`，而 `package/dist/index.d.ts:15` 存在 `import type ... from '@nop-chaos/flux-core'`。主 agent 在临时目录干净安装 tarball（--legacy-peer-deps）后 `tsc --skipLibCheck false` 复现：`error TS2307: Cannot find module '@nop-chaos/flux-core'`；`skipLibCheck: true` 时错误被压制但 facade 全部公开类型静默退化为 any。运行时 JS 自包含（vite 已内联），问题纯在类型面。
- **风险**: `@nop-chaos/flux` 是文档声明（frontend-baseline.md:110）的宿主唯一入口，宿主安装后连 `import { createFluxSchemaRenderer }` 都触发 TS2307，或静默丢失全部类型。专用门禁 `check:flux-bundle-pack` 自称覆盖"host-facing release artifact defects"，实际存在覆盖盲区。
- **建议**: (a) public-types.d.ts 改为不 import flux-core（类型内联或经构建脚本改写）；或 (b) 将 flux-core 加入 release manifest peerDependencies 并放宽"manifest 不得含 flux-core"检查。同时扩展 check-flux-bundle-pack：解包扫描 dist/index.d.ts 的 `from '@nop-chaos/...'` 引用逐一断言已声明。
- **误报排除**: 已用真实 tarball + tsc 实证复现（非估算）；2026-08-07-1023-2 计划只覆盖 shim 相对导入/description/devDeps，未覆盖 d.ts 类型依赖；不属于"宿主需自行安装 ui"豁免（ui 是显式 peer，flux-core 被门禁主动禁止）。

### [P1-02] FluxSchemaRendererProps 类型继承 10 个 props，facade 实现静默丢弃——宿主按公开类型配置得到 no-op

- **文件**: `packages/flux-bundle/src/types.ts:38-46`；`packages/flux-bundle/src/index.tsx:60-75`；对照 `packages/flux-react/src/schema-renderer.tsx:154-156, 276-292`
- **证据片段**:
  ```tsx
  export interface FluxSchemaRendererProps extends Omit<SchemaRendererProps, 'schema'|'env'|'onActionError'|'formulaCompiler'|'registry'> { ... }
  // 实现只转发 6 个：schema/schemaUrl/env/data/strictValidation/onActionError
  // SchemaRendererProps（renderer-hooks.ts:127-146）的 plugins/pageStore/surfaceRuntime/moduleCache/
  // parentScope/actionScope/componentRegistry/onRuntimeChange/onComponentRegistryChange/onActionScopeChange
  // 均被底层 SchemaRenderer 消费（schema-renderer.tsx:154-156, 276-292, 348-368），facade 全部丢弃
  ```
- **严重程度**: P1
- **现状**: 类型面承诺 10 个可传 props（Omit 只排除 5 个），实现面只透传 6 个 + 闭包内 formulaCompiler/registry。宿主传入 `plugins`/`parentScope`/`onRuntimeChange` 等得到静默 no-op，无编译告警、无运行告警。
- **风险**: facade 是文档指定的唯一 host-facing 发布面；类型契约承诺能力而行为缺失 = 对宿主最直接的契约失信。frontend-baseline.md 96-130 行无"facade 有意裁剪 props"记载。
- **建议**: 二选一收敛——(a) Omit 列表扩为与实现透传集合一致并完整转发；(b) 显式声明允许字段集合。补「类型可传即被转发」运行时断言。
- **误报排除**: 已核对 Omit 列表、实现 JSX、底层消费点三处；flux-bundle 测试（index.test.tsx）未覆盖 props 透传，缺口真实。

### [P1-03] gantt-ai-e2e plan 标记 completed 但 4 个 Phase 全 planned、211 项未勾选、closure 声称 e2e 覆盖完成而其自身注记"e2e 暂未执行"

- **文件**: `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md:3, 47, 68, 216, 432, 446-458`
- **证据片段**:
  ```
  3:  > Plan Status: completed
  47/68/216/432: Status: planned（全部 4 个 Phase）
  Closure Gates: [x] Gantt 全部 ~80 个功能点有 e2e 覆盖 / [x] AI Chat 全部 ~100 个功能点有 e2e 覆盖
  [x] pnpm test（unit 816 passed; e2e 需 Playwright server，暂未执行）
  ```
- **严重程度**: P1
- **现状**: 顶部 completed，但 4 个 Phase 全部仍标 planned、211 个 `- [ ]` 执行项未勾选；closure gate 勾选"e2e 覆盖完成"而其自身注记"e2e 需 Playwright server，暂未执行"——e2e 从未运行就宣称覆盖完成。违反 plan-guide Rule 19/20（completed 不得残留未勾选 in-scope item；五处状态一致性）。
- **风险**: 后续审计/开发会误以为 Gantt/AI e2e 覆盖已存在而跳过（ma43 审计已实际被死代码覆盖记录误导过，见 P2-17）；Phase 0 的 7 项 Gantt 渲染缺陷修复是否落地无法从计划判断。
- **建议**: 状态回退 `in progress` 或标注 superseded；按 live 代码核对 Phase 0 修复项落地情况；e2e 覆盖需按实际运行结果重评（当前 gantt-bars-and-links/gantt-editor-and-keyboard spec 已由后续轮次补齐，可注明）。Rule 21 允许修复事实性错误。
- **误报排除**: 未勾选项均在 execution checklist 区（非 Deferred 区）；closure 声称与文件内状态直接矛盾，属事实性错误而非模板演化差异。

### [P1-04] 452 plan completed + closure 声称"componentName targeting 已消除"，但 Phase 1 in_progress / Phase 2 planned，且 schema.ts 幽灵字段存续

- **文件**: `docs/plans/452-submitForm-surface-discovery-and-component-id-name-unification-plan.md:3, 94, 121`；`packages/flux-core/src/types/schema.ts:83`
- **证据片段**:
  ```
  94: Status: in_progress（含 3 个未勾选待办）
  121: Status: planned（Phase 2 全部 checklist 未勾选）
  198: Status Note: 所有 Phase 和 Closure Gates 已通过。componentId/name 统一消除了 componentName...
  // schema.ts:83 — ActionShapeLikeFields 仍声明 componentName?: string（零消费：编译器 targeting 提取只读 _targetCid/targetId/componentId）
  ```
- **严重程度**: P1
- **现状**: 计划 closure 声称"所有 Phase 已通过 + componentName 作为独立 targeting 属性已消除"，但文件内 Phase 1 `in_progress`、Phase 2 `planned`、20 项未勾选；live 代码侧 ComponentTarget/CompiledActionTargeting 确已移除 componentName（component-handle-core.ts:31-34、actions.ts:435-442），但 schema 层 `ActionShapeLikeFields.componentName`（schema.ts:83）作为幽灵字段存续——schema 作者写入 `componentName` 会被编译器静默丢弃（action-compiler.ts:59-62 不复制该字段），无诊断。
- **风险**: 计划状态失真（读者无法判断哪些契约变更已生效）；ghost contract（lesson 08 声明即契约检测法点名的模式）——声明存在、类型存在、行为为零；与 action-scope-and-imports.md 的 componentName 文档（P2-12）叠加成三方不一致。
- **建议**: 同步计划状态并勾选已落地项；删除 `ActionShapeLikeFields.componentName` 或为其加编译期 `invalid-action-shape` 拒绝；文档同步（见 P2-12）。
- **误报排除**: 非"已完成未回写"单一问题——closure 声称与文件状态直接冲突，且 schema 幽灵字段是 live 代码可验证的残留；该计划 Last Reviewed 2026-07-29 属近期计划。

### [P1-05] surface-lifecycle-callbacks.md 断言 declarative surface 的 onSubmitSuccess/onSubmitError 由 form submit 触发，与 live 代码及文档自身 §289 矛盾

- **文件**: `docs/architecture/surface-lifecycle-callbacks.md:569-576` vs `:289`；`packages/flux-runtime/src/surface-runtime.ts:259-268`；`packages/flux-renderers-basic/src/use-surface-renderer.ts`（全文无 onSubmitSuccess 透传）
- **证据片段**:
  ```
  :574 declarative surface 的 onSubmitSuccess / onSubmitError 由 form submit 触发，逻辑与 action-style surface 一致
  :289 submit hooks 只对 action-style openDialog/openDrawer 有效（onSubmitSuccessNodes 字段只有 action-style entry 才有）。
        declarative surface 内的 form submit 不触发 surface callback
  // live：use-surface-renderer 创建 declarative entry 不传 onSubmitSuccessNodes → triggerHook 走 skipped 分支
  ```
- **严重程度**: P1
- **现状**: 2026-08-09 重写后的 owner 文档内部自相矛盾（:574 vs :289），且 :574 与 live 行为不符——declarative entry 无 onSubmitSuccessNodes（action-adapter 只在 openDialog/openDrawer 路径传该字段），form submit 触发 triggerHook 后返回 `{skipped:true}`。文档自身 :576 "两种 authoring 入口 callback 行为对齐，不长期保留双轨差异" 与 live 双轨现状不符。
- **风险**: declarative surface 作者按 :574 配置 onSubmitSuccess 会静默不生效（skipped），且与 :289 相反的推荐导致不可预期的双轨认知。
- **建议**: 删除或改写 :569-576，明确 declarative surface 当前仅 function-based onClose 生效、schema-form submit hooks 仅 action-style 生效；如要对齐则单独立项。
- **误报排除**: 已交叉验证 form.tsx triggerHook 调用不区分 entry 来源 + triggerHook 无 nodes 即 skipped；行为链完整，非猜测；非 draft 文档（当前基线 owner 文档）。

### [P1-06] refreshSource/refreshNearest 在底层请求失败时返回 ok:true——非抛出型失败被重分类为成功

- **文件**: `packages/flux-runtime/src/action-adapter.ts:408-425`；链：`api-data-source-controller-runtime.ts:398-453` → `api-data-source-controller.ts:140-154` → `source-registry.ts:425-454`；同模式 `refresh-nearest.ts:130-137`
- **证据片段**:
  ```ts
  // api-data-source-controller.ts:153 — runRequest 内部 catch 全部失败为状态机错误态，从不 re-throw
  return runRequest().then(() => ({ skipped: false }));
  // source-registry.ts:434 — refresh 永远 resolve
  await entry.controller.refresh();
  return true;
  // action-adapter.ts:420-424 — ok 只表达"源是否找到"，请求失败也返回 {ok:true, data:true}
  return {
    ok: refreshed,
    data: refreshed,
    error: refreshed ? undefined : new Error(`Source not found: ${targetId}`),
  };
  ```
- **严重程度**: P1
- **现状**: `runRequest` 把 HTTP/dispatch 失败转化为 data-source 错误态 + reportRuntimeHostIssue，从不抛错 → `controller.refresh()` 永远 resolve；`refreshSource` 的 `ok:true, data:true` 在请求实际失败时明确声称刷新成功。`DataSourceRefreshResult` 类型（flux-core/types/runtime.ts:423-426）只有 `skipped` 字段，契约层面无错误通道。
- **风险**: `{action:'refreshSource', then:{action:'showToast', args:{message:'已刷新'}}}` 在接口 500 时仍走成功分支并提示成功；`onError` 永不触发；依赖刷新结果编排的流程无法感知失败。用户可见错误仅剩 host issue 通道。
- **建议**: 短期：`data` 改为 `{found, refreshed}` 结构并文档声明 `ok` 只表示"刷新已调度"；中期：扩展 `DataSourceRefreshResult`（skipped 之外增加 ok/error），让 refreshSource 在请求失败时返回 `{ok:false, error}`，与 ajax 失败语义对齐。
- **误报排除**: `component:refresh` 的 `{skipped}` 契约在 api-data-source.md:761-770 有文档，但 refreshSource 动作结果的 ok 语义无任何文档声明为"仅调度"；`ok:true + data:true` 是对结果的肯定性声明，属真实语义洞。

## P2 发现

### [P2-07] word-editor action provider 4/6 方法绕过 manifest args 契约验证，insertField 手写契约副本

- **文件**: `packages/word-editor-renderers/src/word-editor-action-provider.ts:94-193`
- **证据片段**:
  ```ts
  case 'save': { /* 不调用 validateMethodPayload */ ... }
  case 'insertField': { if (typeof payload?.datasetName !== 'string' ...) return fail(...); } // 手写检查
  case 'insertChart': { const payloadValidation = validateMethodPayload(method, payload); ... } // 仅此两者走共享验证
  ```
- **严重程度**: P2
- **现状**: `save`/`undo`/`redo` 对任意 payload 静默接受（manifest 声明无参）；`insertField` 手写检查复制 manifest 契约。同族 spreadsheet/report-designer/flow-designer 三个 host provider 全方法统一 `validateHostMethodPayload`。
- **风险**: 契约强制不一致 + 手写检查与 manifest 双源漂移；无测试护栏（word-editor-action-provider.test.ts 只覆盖 save 失败与 insertChart/insertCode 校验）。
- **建议**: invoke 开头统一 `validateMethodPayload`；删 insertField 手写检查；补 listMethods ↔ manifest parity 测试。
- **误报排除**: 已读测试文件确认 no-arg 方法 payload 拒绝无覆盖；属跨 host 族一致性缺口而非风格偏好。

### [P2-08] flux-compiler 26 个公开导出中 22 个零 live 消费者

- **文件**: `packages/flux-compiler/src/index.ts:1-40`
- **证据片段**:
  ```ts
  export { compileAction, compileDataSource, ... validateSchema, createCompileSymbolTable, ... schemaPathToJsonPointer, appendJsonPointer, ... } from ...
  ```
- **严重程度**: P2
- **现状**: 全仓（排除测试）逐符号检索，仅 `createSchemaCompiler`（runtime-factory.ts:25）、`compileActions`（runtime-factory.ts:30）有 live 消费者；其余 22 个（compileAction/validateSchema/compileDataSource/diagnostics 族/value-shape 族/validation-lowering 族）零消费者且未出现在 quick-reference/renderer-interfaces 文档。与 industrial 包已确立的收敛标准（index.ts:13-17 记载 93→收敛）直接冲突。
- **风险**: 内部编译机制整体锁进公开面；宿主误以为这些是稳定公共 API；内部重构被契约锁定。
- **建议**: 收敛至 createSchemaCompiler/compileActions，其余改包内相对路径消费；补 index-exports parity 测试。
- **误报排除**: 已排除测试文件消费（compileDataSource 唯一 live 消费者是 test-support-runtime.tsx，非主路径）；非"unwired module"（文件均被 index 导出，问题在导出面）。

### [P2-09] flux-action-core 26 个公开导出中 19 个零 live 消费者

- **文件**: `packages/flux-action-core/src/index.ts:1-37`
- **证据片段**:
  ```ts
  export { createInteractionId, createActionKey, createTimedOutResult, ... withEvaluationBindings, getEvaluationScope, ... evaluateInActionContext, ... shouldRunActionWhen, shouldPreventDefault, shouldStopPropagation, ... } from './action-core.js';
  ```
- **严重程度**: P2
- **现状**: 仅 createCancelledResult/resolveRequestControl/withRetry/withTimeout/createActionDispatcher/classifyActionResult 有消费者；19 个零消费者且无文档。`isAbortError` 为 flux-core 再导出（重复出口）。
- **风险**: 执行层内部工具整体公开；与 flux-compiler 同类的表面收敛债务。
- **建议**: 收敛至 live 符号集 + isAbortError（或改从 flux-core 直接消费）；加 parity 测试。
- **误报排除**: 测试文件已排除；无自身 docs 声明符号清单。

### [P2-10] flow-designer / report-designer listMethods 手写清单与 manifest 方法表双源并存、无 parity 护栏

- **文件**: `packages/flow-designer-renderers/src/designer-action-provider.ts:107-151`（42 项手写）；`packages/report-designer-renderers/src/host-action-provider.ts:9-22`（12 项手写）；对照 spreadsheet `Object.keys(SPREADSHEET_HOST_METHOD_CONTRACTS)` 派生
- **证据片段**:
  ```ts
  listMethods() { return ['addNode', 'addBranch', 'addEdge', ... 'updateMultipleNodes']; }
  ```
- **严重程度**: P2
- **现状**: 当前 42=42、12=12 两两对齐，但零测试/脚本保证；manifest 是编译期校验事实源、listMethods 是运行期 ActionScope 发现事实源，一旦漂移编译期与运行期行为分叉且无 CI 拦截。spreadsheet 已用派生模式天然免疫。
- **建议**: listMethods 改为 `Object.keys(manifest.capabilities.methods)` 派生；补 parity 测试。
- **误报排除**: 不声称现存漂移（已逐一比对一致），只报告无护栏双源的结构性风险。

### [P2-11] action-scope-and-imports.md 声称 `dialog`/`drawer` action 名"remains supported for compatibility"，live 无对应实现

- **文件**: `docs/architecture/action-scope-and-imports.md:483-489`；对照 `packages/flux-core/src/constants.ts:31-46`
- **证据片段**:
  ```
  484: - `dialog` remains supported for compatibility but should be treated as a legacy alias.
  485: - Both names resolve to the same runtime behavior; this is a naming convention choice...
  // constants.ts 注册表仅 openDialog/openDrawer/closeDialog/closeDrawer/closeSurface，compatibilityAliases 仅 submitForm→submit
  ```
- **严重程度**: P2
- **现状**: 文档断言 `dialog`/`drawer` 作为 action 名仍受支持，但内置注册表与 dispatcher 均无这两个 selector（已检索 constants.ts + action-dispatcher 全部文件）；`{action:'dialog'}` 会命中 not-found。:489 对 closeDialog/closeDrawer 的断言是准确的。
- **风险**: schema 作者按文档写 `{action:'dialog'}` 得到运行时错误；文档宣称兼容面大于实际。
- **建议**: 删除 dialog/drawer 兼容别名断言，或显式标注"未实现/已移除"。
- **误报排除**: 非 declarative `type:'dialog'` 节点概念（文档上下文是 action 命名）；已排除 dispatch 链其他命名归一化路径。

### [P2-12] action-scope-and-imports.md "Current live shape" ComponentTarget 代码块仍含已移除的 componentName

- **文件**: `docs/architecture/action-scope-and-imports.md:273-277, 16, 249, 299, 370, 659, 670, 679, 686-687`
- **证据片段**:
  ```
  273: interface ComponentTarget {
  275:   componentId?: string;
  276:   componentName?: string;   // ← live component-handle-core.ts:31-34 已无此字段
  ```
- **严重程度**: P2
- **现状**: 文档以 "Current live shape" 标注的代码块与 live 类型不符（componentName 已移除），:16/:249/:299 等多处"by componentId or componentName"表述同步过时。
- **风险**: 与 schema.ts:83 幽灵字段（P1-04）叠加成"文档说支持、类型不支持、schema 层又残留"三方不一致；作者写出无效 componentName targeting。
- **建议**: 更新代码块与相关表述为 componentId-only；配合 P1-04 一并收口。
- **误报排除**: 代码块明确标注 "Current live shape"（非 target-state sketch）。

### [P2-13] surface-lifecycle-callbacks.md §Finding Algorithm 伪代码与 live refresh-nearest.ts 不符

- **文件**: `docs/architecture/surface-lifecycle-callbacks.md:446-483`；对照 `packages/flux-runtime/src/refresh-nearest.ts:47-54`、`component-handle-registry.ts:27, 248-260`
- **证据片段**:
  ```
  455: if (targetType === 'auto' || targetType === 'crud' || targetType === 'tree') {
  458:   ? h.componentType === 'crud' || h.componentType === 'tree'
  481: registry（component-handle-registry.ts:19-24），没有 scope-id 维度。findFirstInScope 实现需要遍历 handles...
  // live：auto 匹配 crud/tree/form；属性名是 handle.type；handlesByScopeId 索引 + findFirstInScope 已实现（:248）
  ```
- **严重程度**: P2
- **现状**: ① auto 匹配集漏 form（live 支持 form）；② 属性名 componentType vs type；③ `targetType:'form'` 在伪代码中根本不进入 component 分支（schema 第 433 行明确支持）；④ :481-483 "实现注意事项"把已实现的 findFirstInScope/handlesByScopeId 描述为未实现（同节内先"已新增"后"未实现"自相矛盾）。
- **风险**: 维护者按伪代码理解 refreshNearest 会漏 form target；按"实现注意事项"会重复实现已存在功能。
- **建议**: 伪代码对齐 live（auto 含 form、handle.type）；"实现注意事项"改写为已实现状态描述。
- **误报排除**: 已逐行对比 refresh-nearest.ts 与 component-handle-registry.ts，差异为实质语义差异非措辞。

### [P2-14] resolveInitFetch 裸 catch 静默吞掉 initFetch 求值错误，与 evaluateSendOnGate 约定不一致

- **文件**: `packages/flux-runtime/src/async-data/api-data-source-controller.ts:27-39`
- **证据片段**:
  ```ts
  try {
    return input.runtime.evaluateCompiled<boolean>(input.initFetch, input.scope) !== false;
  } catch {
    return true;
  } // 零诊断；对照 evaluateSendOnGate（runtime:65-79）reportRuntimeHostIssue + return false
  ```
- **严重程度**: P2
- **现状**: initFetch 表达式求值抛错时无任何记录（无 console、无 reportRuntimeHostIssue），直接返回 true 照常 fetch；同模块 evaluateSendOnGate 对同型"门表达式求值失败"会上报 error 并返回 falsy。该命中已被 check:audit-async-failure-paths 的 catch-without-structured-failure-path 桶标出，live 复核确认属实。
- **风险**: 作者配置 initFetch 表达式错误导致"本应禁用的自动请求被发出"且零诊断；调试"initFetch:false 仍自动 fetch"无根因通道。
- **建议**: catch 中 reportRuntimeHostIssue（level error，message 说明 treating as true），保留保守 fetch 默认值只补诊断。
- **误报排除**: 行为默认值（fetch）本身合理，本发现仅针对诊断丢弃；非已收口项。

### [P2-15] blob-download JSON-in-blob 解析失败被空 catch 吞掉，且无文件名时返回合成成功

- **文件**: `packages/flux-runtime/src/async-data/blob-download.ts:74-106`
- **证据片段**:
  ```ts
  if (contentType.includes('application/json')) {
    try { const text = await blob.text(); const parsed = JSON.parse(text); ... }
    catch { /* Fall through to download path if JSON parse fails. */ }   // 零诊断、零 cause
  }
  return { ok: true, status: 0, data: { msg: 'downloading' } };   // 未下载却报告成功
  ```
- **严重程度**: P2
- **现状**: 服务器在 blob 响应下返回损坏 JSON 错误信封时：解析失败被吞掉；若 content-disposition/downloadFileName 解析不出文件名，`downloadBlob` 不执行，但函数仍返回 `{ok:true, status:0, data:{msg:'downloading'}}`——实际没有下载，请求却被报告成功。JSON-in-blob 错误恢复本身是文档化设计（logs/2026/07-11.md:133），但解析成功路径与失败路径的合成成功未区分。
- **风险**: 失败 API 调用被 action 管线当作成功处理（then 分支执行、错误提示不出现），用户得不到文件也得不到错误；原始解析错误完全丢失。
- **建议**: catch 分支记录诊断（console.warn 或 reportRuntimeHostIssue 携带 blob type/url），无法解析文件名时返回 `{ok:false, error: new Error(..., {cause: parseError})}` 而非合成成功。
- **误报排除**: 该命中被 suspect 桶标出（blob-download.ts:88），live 复核确认属实；文档意图（错误恢复）之外的残余漏洞。

### [P2-16] flow-designer reason-only 失败在用户通知层降级为通用 "Action failed"

- **文件**: `packages/flow-designer-renderers/src/designer-action-provider.ts:46-62, 98-103`；`designer-context.ts:96-119`；`packages/flux-action-core/src/action-dispatcher/action-execution.ts:195-200`
- **证据片段**:
  ```ts
  return {
    ok: false,
    error: undefined,
    cause: { reason: result.reason, result },
    reason: result.reason,
  };
  // action-execution.ts:195-200 兜底 toast：String(result.error ?? 'Action failed') = "Action failed"
  ```
- **严重程度**: P2
- **现状**: mapCoreResult/treeUnavailable 的失败分支 error 为 undefined（结构化 reason 只存在 cause 中）；notifyCommandFailure 因 error 非 Error/string 直接 return；动作管线兜底 toast 为通用 "Action failed"。boundaries.md:562 的 host 结果基线写明"host command failures surface through top-level ActionResult.error"，此处与基线表述存在张力。
- **风险**: 树模式误触 graph-only 动作、面板宽度 NaN 等场景用户只见 "Action failed"，无法区分"功能不可用"与"参数错误"。
- **建议**: 失败分支改 `error: new Error(message, {cause: {reason, result}})`，保留顶层 cause 结构；不破坏既有 result.cause.reason 消费方。
- **误报排除**: adapter 路径（createFailure 带 i18n message）不受影响；测试未锁定"toast 必须为 Action failed"。

### [P2-17] word-editor 两个死代码文件带完整测试套件——假绿覆盖

- **文件**: `packages/word-editor-renderers/src/panels/template-snippets.tsx`（79 行）+ `__tests__/template-snippets.test.tsx`（92 行）；`packages/word-editor-renderers/src/preview/doc-preview-page.tsx`（120 行）+ `__tests__/doc-preview-page.test.tsx`（94 行）
- **证据片段**:
  ```tsx
  // word-editor-page.tsx:12-22 面板导入集：EditorCanvas/RibbonToolbar/OutlinePanel/DatasetPanel/FieldList —— 无 template-snippets
  // rg 全仓生产引用：两文件仅自身命中；index.ts 未导出
  ```
- **严重程度**: P2
- **现状**: 两个组件无生产导入方（word-editor-page 内联渲染 preview，模板侧栏被 outline/dataset/field-list 取代），但各带完整测试套件全绿——测试通过证明不了任何用户可见行为。2026-07-27 ma43 审计把这两个文件计为 "Full" 覆盖（docs/analysis/2026-07-27-ma43-\*/03-spreadsheet-word-contracts.md），假绿已实际误导过审计。
- **建议**: 删除文件与测试，或重新接线后再保留测试；删除时同步修正 ma43 覆盖记录。
- **误报排除**: 满足校准模式 6 的"证据决定性"门槛：无活动引用、无 barrel 导出、无 plan/owner 上下文、无动态 import。

### [P2-18] calendar/gantt 时区测试只测 JS 引擎原生语义，零包内导入——"timezone-safe" 假绿

- **文件**: `packages/flux-renderers-scheduling/src/calendar/calendar-timezone.test.ts`（5 测试）；`src/gantt/gantt-timezone.test.ts`（4/6 同型）
- **证据片段**:
  ```ts
  import { describe, it, expect, afterAll } from 'vitest';   // ← 零包内导入
  it('should handle keyboard move left (subtract 1 day) in Asia/Shanghai', () => {
    process.env.TZ = 'Asia/Shanghai';
    const newStart = new Date(oldStart); newStart.setUTCDate(newStart.getUTCDate() - 1);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-22');   // JS 引擎保证，与被测包无关
  ```
- **严重程度**: P2
- **现状**: 标题声称 "Calendar/Gantt timezone-safe date math"，5+4 个用例只验证 Date.UTC 原生语义，与包内 calendar-date-utils.ts / gantt utils/date.ts / worktime.ts 零交互；这些工具被改成 local-time 实现引入时区 bug 时本套测试依然全绿。真实时区覆盖由 calendar-date-utils.test.ts（317 行）在默认 TZ 下提供，但无 TZ 矩阵约束工具函数本身。
- **建议**: 删除原生 Date 用例，改为对真实工具函数在 Asia/Shanghai、America/New_York、Pacific/Chatham 下断言输出。
- **误报排除**: 非"JS 语义文档化"的合理用法——标题主语是包（"Calendar timezone-safe date math"），读者必然理解为包级覆盖；这些文件正是 bug-71 修复后加入的"时区测试"。

### [P2-19] kanban e2e 标题 "verifies undo" 但正文无任何移动/撤销断言

- **文件**: `tests/e2e/kanban-demo.spec.ts:66-82`
- **证据片段**:
  ```ts
  test('programmatic card move via evaluate verifies undo', async ({ page }) => {
    ...
    expect(initialCardIds.length).toBe(8);   // 只读 ID
    expect(cardInCol1).toBeTruthy();          // 只读 ID
    await assertTrackedPageErrors(page);      // 无移动、无 undo 点击、无撤销结果断言
  ```
- **严重程度**: P2
- **现状**: 标题承诺"验证 undo"，正文既无卡片移动（无 drag、无 evaluate 派发 move 命令）也无 undo 按钮点击与结果断言——kanban 撤销逻辑完全损坏时该测试依然通过。单元层有 kanban-undo-stack.test.ts，但"真实拖动→落位→Ctrl+Z 回退"用户链路无任何 e2e 保护。
- **建议**: 改写为真实链路（mouse drag → 断言列计数 → undo → 断言恢复），或删除并显式标注 undo e2e 缺口。
- **误报排除**: 非"测试名从简"——"verifies undo"是明确能力声明，正文与声明无关；同文件 drag 用例（103-156）证明作者有能力写真实断言。

### [P2-20] calendar 视图切换链无任何贯穿测试

- **文件**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:468`、`calendar/components/calendar-header.tsx:84`；测试：`calendar-header.test.tsx:42-52`（只验按钮存在与 active 高亮）、`calendar.integration.test.tsx`（7 例全静态渲染断言）、`tests/e2e/calendar-demo.spec.ts:16-31`（只验文本存在）
- **证据片段**:
  ```tsx
  // calendar.tsx:468 onViewChange={setActiveView}
  // calendar-header.tsx:84 onClick={() => onViewChange(opt.value)}
  ```
- **严重程度**: P2
- **现状**: hook 级 setActiveView 有测、header 渲染有测、month 视图静态渲染有测，但"点击周/日按钮 → onViewChange 接线 → setActiveView → data-view 变化 → 子视图实际出现"整条链无 unit/integration/e2e 测试。历史 P0 家族（bug-71"日历视图切换失效"）的接线面正是缺陷高发点。
- **建议**: calendar.integration.test.tsx 补"渲染真实 Calendar + 点击周按钮 → 断言 data-view='week' 出现"；e2e calendar-demo 补切换断言。
- **误报排除**: hook 测试绕过真实入口，历史缺陷恰在"内部 state 不驱动渲染"的接线边界——正是 bug-71 点名的模式。

### [P2-21] word-editor ribbon-toolbar 在 page 级测试中被 stub，paragraph/template controls 零直接测试

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test-support.tsx:219-220`、`word-editor-page-host-scope.test-support.tsx:185-186`；`toolbar/paragraph-controls.tsx`（104 行）、`toolbar/template-controls.tsx`（66 行）
- **证据片段**:
  ```ts
  vi.mock('../toolbar/ribbon-toolbar.js', () => ({ RibbonToolbar: () => <div data-testid="ribbon-toolbar" /> }));
  // paragraph-controls：onClick={() => bridge?.command?.executeRowFlex(RowFlex.LEFT)} 等派发无任何测试
  ```
- **严重程度**: P2
- **现状**: ribbon-toolbar 无自身测试且被 page 级 test-support 整体 stub；paragraph-controls（对齐/标题/列表/行距 execute\* 派发）与 template-controls（标签插入/对话框回退）零直接测试；e2e 仅断言按钮可见与对话框打开。对齐/行距/标题派发接线错误不会在任何测试中失败。
- **建议**: 为 paragraph-controls/template-controls 补 bridge mock 直接测试；或 page 测试至少保留一个真实 ribbon 渲染用例。
- **误报排除**: 非"e2e 已覆盖"（e2e 只覆盖存在性）；stub 明确移除了真实组件。

### [P2-22] 444 计划 completed + 119 项未勾选，17-03 rename 确认未落地

- **文件**: `docs/plans/444-deep-audit-2026-06-02-consolidated-remediation-plan.md:3, 103-341`
- **证据片段**:
  ```
  3: > Plan Status: completed
  116: - [ ] **[P3]** Fix `17-03`: rename `use-form-hooks.ts` to `useFormHooks.ts`.
  // live：packages/flux-react/src/hooks/use-form-hooks.ts 仍以原文件名存在（rename 未执行）
  ```
- **严重程度**: P2
- **现状**: 历史计划（2026-06-02）completed，但 9 个 Workstream 下 119 个 `- [ ]` 未勾选；抽样验证 17-03（文件名 rename）确实未落地、01-02（attachScopeDebugToSchema 迁移）未落地。Rule 21 允许修复事实性错误。
- **建议**: 至少为未勾选项标注落地状态或整体加 Outdated Note，避免被当作完成基线引用（Rule 21 约束下不强制回写，但事实性错误可修）。
- **误报排除**: 17-03 以文件名实物可验证未落地；未勾选项均在 execution checklist 区。

### [P2-23] 2026-07-28-1430 surface-lifecycle-callbacks 源计划 completed + 19 项未勾选，2 项以相反方案落地仅散注记录

- **文件**: `docs/plans/2026-07-28-1430-surface-lifecycle-callbacks.md:3, 132-185, 309-317`
- **证据片段**:
  ```
  180: - [ ] close(surfaceId) 改 async：...
  200: > - dialog-host.tsx close 改 await：实际不需要，因为 close 实现为 sync fire-and-forget...
  ```
- **严重程度**: P2
- **现状**: 计划 completed 但 19 项未勾选；`close` 改 async 与 dialog-host close 改 await 两项以**相反方案**（sync fire-and-forget，surface-runtime.ts:199-229）落地，仅第 200 行一条 blockquote 注释记录；triggerHook 触发点从 form-runtime-submit-flow.ts 改为 form.tsx 仅 closure evidence 间接提及。
- **建议**: 按实际落地形态勾选/改写未勾选项，close 条目标注"以 fire-and-forget 方案落地"，或加执行偏差摘要。
- **误报排除**: 方案偏离有 live 代码（sync close）可验证；未勾选项在 execution list 区。

### [P2-24] tag-list 渲染器死订阅：useCurrentFormFieldState 结果从未被读取

- **文件**: `packages/flux-renderers-form-advanced/src/tag-list.tsx:32`
- **证据片段**:
  ```tsx
  const _fieldState = useCurrentFormFieldState(name, { path: name, ownerPath: name }); // 全文仅出现一次
  ```
- **严重程度**: P2
- **现状**: 该订阅携带活跃 path，字段任何 state 变化都会触发整组件 re-render，但结果从不被消费（下划线前缀绕过 no-unused-vars）；所需状态已由 useFormFieldFromProps 独立订阅。
- **风险**: 每次 tag 交互额外触发一次整组件 re-render（小热路径成本）+ 误导维护者（暗示存在订阅意图）。
- **建议**: 删除该订阅；如意图是刷新 required 提示则改为显式订阅所需状态片段并实际消费。
- **误报排除**: 非样式偏好；明确的未使用订阅，有真实 re-render 成本。

### [P2-25] page 布局渲染器通过 className 子串嗅探驱动几何行为

- **文件**: `packages/flux-renderers-basic/src/page.tsx:97-103`
- **证据片段**:
  ```tsx
  const footerIsFixed = footerClassName.includes('fixed');
  const footerOffset = useFixedFooterVisualViewport(isMobile && footerIsFixed && ...);
  ```
- **严重程度**: P2
- **现状**: 行为开关挂在 `footerClassName` 的子串匹配上（`bg-fixed`/`fixed-width`/`sticky-fixed` 均误命中），违反 styling-system.md"布局渲染器行为来自显式 schema prop"契约；无 schema 语义 prop（如 fixedFooter: boolean）承载。
- **风险**: 误匹配静默改变移动端键盘几何行为；作者改动 className 后行为无提示消失。
- **建议**: 新增显式 schema prop（fixedFooter?: boolean），footerClassName 只保留样式职责；如需兼容可在编译期 normalize。
- **误报排除**: page 是 layout renderer，不属"widget 自持样式"豁免；有真实误匹配/静默失效路径。

### [P2-26] crud 通过硬编码渲染器 type 字符串检测 sibling 节点

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:404-412`、`crud-query-region.tsx:42-57`
- **证据片段**:
  ```ts
  const hasRegionPaginationControl = [props.regions.footerToolbar, props.regions.toolbar].some(
    (region) =>
      regionHasRendererType(region, 'pagination') ||
      regionHasRendererType(region, 'switch-per-page'),
  );
  ```
- **严重程度**: P2
- **现状**: crud 遍历 region 编译树比较 `node.type === 'pagination'` 等字符串字面量判断是否隐藏内置分页栏。读取编译产物（compile-once 合规），但 type 字面量是对 sibling 渲染器内部命名的隐式知识；check:audit-hardcoded-type-dispatch 门禁只扫 compiler/runtime core，renderer 包不在覆盖内。
- **风险**: pagination/switch-per-page 重命名/合并时 crud 分页栏隐藏逻辑静默失效（双分页器回归），无诊断。
- **建议**: 用 rendererTraits（如 'pagination-control'）表达语义替代 type 字面量，或封装 helper + 契约测试。
- **误报排除**: 非 core 硬编码 dispatch（门禁外）故不升 P1；v1 基线下属真实维护成本。

### [P2-27] calendar "day cells clickable" / kanban "undo/redo buttons present" e2e 弱断言

- **文件**: `tests/e2e/calendar-demo.spec.ts:66-77`、`tests/e2e/kanban-demo.spec.ts:56-64`
- **证据片段**:
  ```ts
  test('day cells clickable', ...) { ... expect(cellCount).toBeGreaterThan(0); ... }  // 无 click、无点击结果断言
  // kanban：expect(count).toBeGreaterThan(0) 为唯一断言（任意 button 计数 >0 即过）
  ```
- **严重程度**: P2
- **现状**: 标题声明交互能力（clickable / undo+redo 按钮存在），正文只断言元素存在；cell 完全不可点击、undo 按钮完全缺失时依然通过。
- **建议**: calendar 补真实 click + 结果断言；kanban 断言 undo/redo 按钮的具体 testid/aria-label。
- **误报排除**: clickable 是行为声明而非宽泛命名；同目录其他 spec（gantt 键盘、ss-8）展示了本仓交互断言标准。

### [P2-28] 死代码（无测试）：report-designer fallbacks.tsx、flow-designer ding-flow-canvas-overlay.tsx 零导入

- **文件**: `packages/report-designer-renderers/src/fallbacks.tsx`（79 行）；`packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx`（160 行）
- **证据片段**:
  ```ts
  // rg 全仓引用：两文件仅自身命中；index.ts / dingflow/index.ts 均未导出
  ```
- **严重程度**: P2
- **现状**: `renderFieldSourceSections`（静态嵌套字段 fallback）与 `DingFlowCanvasOverlay`（树模式画布浮层，含 computeDingFlowOverlays 消费、return-focus 逻辑）无生产导入方、无 barrel 导出、无测试；ding-flow-canvas-overlay 疑似被 designer-xyflow-canvas 重构取代的旧实现。
- **建议**: 删除或重新接线（fallbacks 若为将来回退保留应标注）。
- **误报排除**: 已排除 barrel 导出消费、动态 import、playground/e2e 引用。

### [P2-29] flux-runtime 根入口 8 个内部 helper 零外部消费者

- **文件**: `packages/flux-runtime/src/index.ts:1-39`
- **证据片段**:
  ```ts
  export { createXuiRolesPlugin, filterByRoles } from './runtime-plugins.js';
  export {
    extractFilenameFromContentDisposition,
    resolveDownloadFilename,
    normalizeBlobResponse,
  } from './async-data/blob-download.js';
  export { createRootDependencySet, scopeChangeHitsDependencies } from './scope-change.js';
  ```
- **严重程度**: P2
- **现状**: 8 个符号（createModuleCache/createXuiRolesPlugin/filterByRoles/createFormStoreDiagnosticsBridge/createRootDependencySet/extractFilenameFromContentDisposition/resolveDownloadFilename/normalizeBlobResponse）全仓零 live 消费者（blob 文件名解析族连包内其它模块都不消费）。module-boundaries.md:538 记载的 bridge 再导出（publishOwnerStatus/executeApiObject/createProjectedScopeStore）不在此列。
- **建议**: 删除零消费者导出，保留 downloadBlob（kanban-export 消费）与 scopeChangeHitsDependencies（flux-react 消费）。
- **误报排除**: module-boundaries.md:400 未记载这 8 个符号；xui-roles 有测试消费但非 live 主路径。

### [P2-30] flux-core 根入口 12 个零消费者导出（其中 4 个仅服务测试共享）

- **文件**: `packages/flux-core/src/index.ts:30-83`
- **证据片段**:
  ```ts
  export {
    isReportedImportError,
    markImportErrorReported,
    reportImportFailure,
  } from './utils/import-failure.js';
  export {
    findUnreferencedContracts,
    isRendererEventKeyReferenced,
    isCapabilityHandleReferenced,
    buildPerRendererSourceResolver,
  } from './contract-honesty.js';
  ```
- **严重程度**: P2
- **现状**: 8 个符号（isReportedImportError/markImportErrorReported/FAIL_ON_SCHEMA_DIAGNOSTICS_KEY/STRICT_VALIDATION_KEY/setFailOnSchemaDiagnosticsGlobal/projectBooleanMap/projectFieldStates/normalizeInstancePath）零消费者；4 个 contract-honesty 符号仅被 7 个 renderer 包的 contract-honesty.test.ts 消费——测试专用工具经主公开面路由（维度 03 步骤 2d 的"污染主公开面"情形）。
- **建议**: 删除纯零消费者导出；contract-honesty 收敛为测试共享子路径（如 @nop-chaos/flux-core/testing）。
- **误报排除**: reportImportFailure/isStrictValidationEnabled/shouldFailOnSchemaDiagnostics/setStrictValidationGlobal/createPathBinding 有 live 消费者，不在内。

### [P2-31] flux-react 根入口 14 个包内自用导出

- **文件**: `packages/flux-react/src/index.tsx:27-110`
- **证据片段**:
  ```ts
  export { NodeMetaContext } from './contexts.js'; // 等 14 个符号
  export { GAP_TOKENS } from './resolve-gap.js';
  export {
    EMPTY_FORM_STORE_STATE,
    selectCurrentFormErrors,
    selectCurrentFormFieldState,
  } from './form-state.js';
  ```
- **严重程度**: P2
- **现状**: 14 个导出零外部 live 消费者，仅包内自用；对照自身 public-surface.test.ts（钉住 usePublishedFormStatus 等为 intentional）与 unstable.ts，这些符号不在任何治理清单内，与其宣称的"keeps internal-only orchestration exports off the root entry"意图矛盾。
- **建议**: 纯内部符号（contexts 单例/GAP_TOKENS/form-state 选择器/useSourceValue/container-hooks 中 dialog-host 自用者）移出根入口或迁入 unstable；保留 DialogHost/NodeRenderer/auto-renderer 并补文档。
- **误报排除**: shouldShowFieldError/isFieldEffectivelyRequired/selectCurrentFormFieldPresentation/resolveGap 有 live 消费者，不在内。

### [P2-32] terminology.md SchemaFieldRule 分类列表缺 6 种 live kind

- **文件**: `docs/references/terminology.md:143-151`；对照 `packages/flux-core/src/types/schema.ts:62-74`
- **证据片段**:
  ```
  143: In active code, field rules can classify a field as: meta / prop / region / value-or-region / event / ignored
  // live SchemaFieldKind 12 种：+ value / schema / schema-array / action / literal / reaction
  ```
- **严重程度**: P2
- **现状**: terminology（自述"共享词汇最短定义"入口）只列 6 种，缺 value/schema/schema-array/action/literal/reaction——reaction 是文档体系大量使用的核心 kind（field-metadata-slot-modeling.md:107-114 专门阐述）。
- **建议**: 补齐 12 种或注明"完整列表以 SchemaFieldKind 为准"。
- **误报排除**: 列表以 "In active code" 标注（非历史描述），缺项可从 live 类型直接验证。

### [P2-33] boundaries.md 引用不存在的子路径 @nop-chaos/flux-core/i18n-sink

- **文件**: `docs/architecture/flux-runtime-module-boundaries.md:206`；对照 `packages/flux-runtime/src/validation/message.ts:2`、`packages/flux-core/package.json:9-14`
- **证据片段**:
  ```
  206: reads the global `MessageFormatter` from `@nop-chaos/flux-core/i18n-sink`
  // 实际：import { getMessageFormatter } from '@nop-chaos/flux-core'；exports map 无 ./i18n-sink 子路径
  ```
- **严重程度**: P2
- **现状**: i18n-sink 是 flux-core 内部模块，经根导出公开；文档写成不存在的子路径，按文档写代码会触发 exports 封装错误。
- **建议**: 改为 "reads the global MessageFormatter from @nop-chaos/flux-core root exports (getMessageFormatter)"。
- **误报排除**: 非 draft 文档（活跃 owner 文档）；上一轮维度 01 的文档漂移条目已修复，本条为独立漂移。

### [P2-34] CR plan 4 项已落地但 checkbox 未勾选，audit evidence 声称"全部 [x]"与文件实际状态矛盾

- **文件**: `docs/plans/2026-08-06-0329-1-cr-cross-family-centralized-remediation.md:139-142, 179`
- **证据片段**:
  ```
  139: - [ ] Fix 19-1 tree-session success 无 ack 看门狗（tree-session.ts:259-263）
  179: closure audit evidence 第④条：一致性核对（4 Phase completed + 全部 [x]）
  // live：19-1 tree-session.ts:324-392 已有 stale-ack 处理 + 测试；19-2 calendar.tsx:229-231 已改 {ok:true}/{ok:false,error}
  ```
- **严重程度**: P2
- **现状**: 4 项实际已落地但 checkbox 全部未勾选；closure audit evidence 声称"全部 [x]"，与文件实际状态不符，破坏 closure 证据可信度基线。
- **建议**: 勾选 4 项或在 audit evidence 中注明"落地后未回写 checkbox"。
- **误报排除**: 已抽样验证 19-1/19-2 的 live 代码与测试存在，确认为"已落地未勾选"而非"未落地"。

### [P2-35] surface-lifecycle-callbacks.md 精确行号锚点漂移 + "live implementation" 片段标识符差异

- **文件**: `docs/architecture/surface-lifecycle-callbacks.md:216, 254, 256, 423, 218-241`
- **证据片段**:
  ```
  254: `entry.onClose` (function) 由 `use-surface-renderer.ts:223/325/348` 直接调用   // 实际 :241/:350/:373
  219: // live implementation (packages/flux-runtime/src/surface-runtime.ts)
  235: console.warn('[surface] onClose hook failed:', err);   // 实际 reportRuntimeHostIssue
  ```
- **严重程度**: P2
- **现状**: 精确行号与当前代码偏差 3-31 行（2026-08-09 重写后代码又移动）；"live implementation" 代码片段用 console.warn 而实际是 reportRuntimeHostIssue（语义等价，标识符不同）。行为断言本身正确。
- **建议**: 行号改函数名锚点；片段同步为 reportRuntimeHostIssue 或加"示意片段"注记。
- **误报排除**: 行为断言正确，仅位置/标识符引用漂移，故不升 P1。

## 已核实为安全/合理的排除项（复核排除）

- **check:audit-event-dispatch-ctx 6 条 industrial 命中**（animator.ts ×4 / point-store.ts / refresh-pipeline.ts）：全部为内部 EventHub `this.events.emit(...)` 事件总线调用（私有字段 `events = new EventHub<...>()`），非 schema 事件派发 `props.events.<name>`——扫描器对 `.events.emit(` 的机械命中；2026-08-09 已登记移交 industrial workstream，本轮不重复报告。注意：该命中揭示扫描器对内部 EventHub 命名的盲区，属工具噪声而非 renderer 违约。
- **三个 host provider 的 validateMethodPayload 全量覆盖**（spreadsheet/report-designer/flow-designer）：word-editor 例外已在 P2-07 报告；其余三家合规。
- **kanban/gantt ownership 三态与本地数据镜像**：文档化契约 + 测试锁定，校准 #8 排除。
- **fieldset collapsed props→state 种子**：design.md 明确"初始折叠状态 + 内部管理"，校准 #4/adjudication #4 排除。
- **table last-good-columns 渲染期 setState**：React 官方 "adjust state during render" 模式，注释记录替代双镜像。
- **flux-runtime/compiler/action-core/formula 的契约级测试密度**：抽查充分，无 P0/P1 级覆盖洞。
- **e2e 主路径真实性**：gantt/spreadsheet/word-editor/report-designer/flow-designer 主 spec 均为真实用户操作 + 用户可见断言，无 debug-state 主断言。
- **零同义反复/零断言普遍模式**：除 P2-18（时区套件）与 P2-19（kanban undo）外，其余 e2e/unit 断言均指向具体值。
- **pnpm check 基线**：exit 1 = 仅既有登记 red（industrial 6 + oversized 2 exempt），与 2026-08-09 DV 基线一致，零新增未登记命中。

## 审核结论

- **P0**: 零。
- **P1**: 6 条（P1-01 facade 打包类型面 TS2307、P1-02 facade props 静默丢弃、P1-03 gantt plan 状态失真、P1-04 452 plan 状态失真 + schema 幽灵字段、P1-05 owner 文档 declarative 断言矛盾、P1-06 refreshSource 失败重分类为成功）。
- **P2**: 29 条（记录在案，随修复批次处理；P2 不单独驱动 remediation plan，随 P1 批次折叠处理或入 follow-up backlog）。
- 全部 P1 与关键 P2 已由主 agent live 复核（读代码 + 读文档 + tsc/tarball 实证）；子 agent 初审结论仅作线索使用。
- 无已自动化门禁覆盖的新增机械问题（`pnpm check` 相关门禁不覆盖上述项；event-dispatch-ctx 6 条为已登记 red）。

## 路由建议

- P1-01/P1-02（flux-bundle facade 类型面）→ 单一 owner plan（同为 facade 发布契约面，合并收口；需补 check-flux-bundle-pack d.ts 扫描门禁）。
- P1-03/P1-04（两份 plan 状态失真）→ 文档收口（Rule 21 允许修复事实性错误；452 的 schema.ts:83 幽灵字段为代码 Fix，与 P2-12 文档三方收口）。
- P1-05（surface-lifecycle-callbacks declarative 断言）→ 架构文档修订。
- P1-06（refreshSource 失败语义）→ 契约收口（与 api-data-source.md 契约节同步）。
- P2 批次 → follow-up backlog（`docs/backlog/` 登记，随 P1 同 closure surface 的折叠处理）。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
