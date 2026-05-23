# 深度审核汇总报告

## 审核范围

- 执行的维度：01-20 全部维度
- 覆盖的包：`packages/*` 全量重点包与 `apps/playground`、`tests/e2e`
- 审核日期：2026-05-13
- 执行方式：按 `docs/skills/deep-audit-prompts.md` 执行 20 个维度的初审、必要深挖、维度复核、零发现复核与少量子项复核，共完成多批次并行 explore 审核

## 深挖统计

- 维度总数：20
- 各维度深挖轮次：
  01=2, 02=2, 03=1, 04=2, 05=2, 06=2, 07=2, 08=2, 09=1, 10=2, 11=1, 12=2, 13=2, 14=2, 15=2, 16=2, 17=1, 18=2, 19=2, 20=2
- 深挖总轮次：35
- 深挖总发现数：54

## 复核统计

- 深挖发现总数：54
- 已独立复核条目数：54
- 维度级复核完成数：20
- 子项逐条复核数：8
- 批量复核覆盖条目数：0
- 保留：49
- 降级：14
- 驳回：5

说明：

- 统计中的“保留/降级/驳回”按发现条目计数；降级后仍纳入最终保留项。
- 零发现维度：03、09，经独立复核后保留零发现结论。

## P0 清单（按文件分组）

无。

## P1 清单（按文件分组）

| 编号  | 文件                                                               | 一句话摘要                                                      |
| ----- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| 02-01 | `packages/flux-compiler/src/schema-compiler/node-compiler.ts`      | `node-compiler.ts` 超 700 行且混入多类编译职责                  |
| 02-04 | `scripts/verify-no-src-artifacts.mjs`                              | src 产物守卫脚本漏检 `.d.ts.map`                                |
| 05-01 | `packages/flux-react/src/hook-subscriptions.ts`                    | `paths` 被压成根键，嵌套路径订阅失真                            |
| 05-02 | `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`  | 非表单字段绑定退化为整 scope 订阅                               |
| 05-04 | `packages/flux-runtime/src/projected-scope-store.ts`               | `$form` 只读绑定在非值更新时可能暴露陈旧摘要                    |
| 06-01 | `packages/flux-runtime/src/form-runtime-submit-flow.ts`            | 父提交无法中止子校验，悬挂时会永久卡住提交态                    |
| 07-04 | `packages/flux-react/src/render-nodes.tsx`                         | fragment-scope 门闩仍依赖未受控 microtask 与 cleanup `setState` |
| 07-05 | `packages/flux-react/src/render-nodes.tsx`                         | fragment scope 身份切换时可能回退到 parent scope                |
| 08-01 | `packages/flux-runtime/src/form-runtime-owner.ts`                  | owner-level 校验在失活场景仍返回 clean success                  |
| 15-01 | `packages/report-designer-renderers/src/page-renderer.tsx:124-126` | 主路径用 `JSON.stringify` 做整份文档变更检测                    |

## P2 清单（按文件分组）

| 编号  | 文件                                                                                    | 一句话摘要                                                      |
| ----- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 04-03 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`             | 本地 `userSelectedKey` 可长期覆盖父 owner 的真实 variant 分型   |
| 05-03 | `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts`          | 表格列状态遗漏 `paths` 导致热路径广订阅                         |
| 06-02 | `packages/flux-runtime/src/runtime-owned-factories.ts`                                  | 无 validation plan 的 page/surface 校验 Promise 可能永不 settle |
| 06-03 | `packages/flux-runtime/src/runtime-factory.ts`                                          | schema prepare 丢失 import loader 的 abort 透传                 |
| 06-04 | `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts`            | `parallel` 模式允许旧 run 先发布 stale 结果                     |
| 07-01 | `packages/flux-renderers-form/src/renderers/form-status-publication.ts`                 | form `statusPath` 发布仍由 renderer effect 维护                 |
| 07-03 | `packages/flux-renderers-basic/src/status-hooks.ts`                                     | 共享 `statusPath` hook 在更新时先清空再重发                     |
| 07-06 | `packages/flux-react/src/use-source-value.ts`                                           | source observer/controller 未跟随 runtime 替换重建              |
| 08-02 | `packages/flux-renderers-form-advanced/src/detail-view/projected-validation-runtime.ts` | projected `validateAll()` 泄漏为父 owner 全域校验               |
| 08-03 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`             | projected/inherit-owner 路径仍被注册成 child contract           |
| 08-04 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`             | hidden-branch 参与发现只扫描第一层具名子节点                    |
| 10-01 | `packages/flux-bundle/src/style.css`                                                    | 公共 bundle CSS 仍保留已失效的 BEM fallback selectors           |
| 10-02 | `packages/flux-react/src/node-renderer-resolved.tsx`                                    | `frameClassName` 不参与 `classAliases` 展开                     |
| 12-01 | `packages/flux-renderers-form-advanced/src/tag-list.tsx`                                | `tag-list` 仍违反 wrapped-field label 交互语义                  |
| 12-02 | `packages/flux-react/src/node-frame-wrapper.tsx`                                        | field chrome 仍混用 resolved props 与 raw schema fallback       |
| 12-04 | `packages/report-designer-renderers/src/renderers.tsx`                                  | `title` typing 仍窄于 live `value-or-region` metadata           |
| 13-01 | `packages/word-editor-core/src/document-io.ts`                                          | persisted 恢复仍把未校验文档 shape 提升为可信合同               |
| 13-02 | `packages/report-designer-renderers/src/page-renderer.tsx`                              | 报表/表格宿主入口仍把外部 schema 直接 cast 成 core 合同         |
| 13-03 | `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`                     | word-editor schema seed 仍把未校验初始数据提升为可信状态        |
| 14-01 | `tests/e2e/exploratory/interaction-tests.spec.ts`                                       | exploratory 交互用例仍大量依赖“可见才执行”                      |
| 14-02 | `tests/e2e/debug-collapsible.spec.ts`                                                   | 调试型 Playwright 脚本仍在主套件内执行                          |
| 14-03 | `packages/flow-designer-renderers/vitest.config.ts`                                     | UI 渲染器包仍默认 node 再靠 per-file happy-dom 覆盖             |
| 14-04 | `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts`                      | async-data omnibus test 仍混合多模块职责                        |
| 14-06 | `tests/e2e/exploratory/subagent-a-independent-review.spec.ts`                           | exploratory omnibus E2E 仍大量依赖条件分支与吞错                |
| 14-07 | `packages/report-designer-renderers/vitest.config.ts`                                   | UI renderer 包环境分裂模式仍在跨包复制                          |
| 15-03 | `packages/report-designer-renderers/src/page-renderer.tsx:272-278`                      | `refreshFieldSources()` 失败仅通知 UI，未结构化上报             |
| 15-04 | `packages/flow-designer-core/src/core-node-commands.ts`                                 | lifecycle hook 异常未进入结构化观测链路                         |
| 15-05 | `apps/playground/src/pages/ding-talk-flow-demo.tsx:56-99`                               | DingTalk overlay 计算仍有 O(E×N) 重复节点查找                   |
| 16-01 | `docs/architecture/renderer-runtime.md:517-586`                                         | owner doc 仍漏记已公开的 flux-react hooks                       |
| 16-02 | `docs/architecture/flux-runtime-module-boundaries.md:353-361`                           | 架构文档仍指向不存在的测试路径                                  |
| 16-05 | `docs/plans/132-runtime-schema-dependency-elimination-plan.md`                          | 多个 live plan 仍使用超出 guide 的状态字面量                    |
| 16-06 | `docs/plans/120-runtime-async-governance-convergence-plan.md:223`                       | Phase 7 状态超出枚举且与 closure note 矛盾                      |
| 16-07 | `docs/plans/182-deep-audit-full-3-mechanical-fixes-plan.md:103-111`                     | 仍使用未定义的 `skipped (false positive)` slice 状态            |
| 17-01 | `docs/components/form/example.json:46-49`                                               | 通用 button 示例仍使用不受支持的 `primary`                      |
| 18-03 | `packages/report-designer-renderers/src/renderers.tsx`                                  | package-owned 字段面板 CSS 仍未接到正常注册消费路径             |
| 19-01 | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                                 | submit follow-up handler 仍可能覆盖原始校验/提交失败            |
| 19-02 | `packages/flux-runtime/src/async-data/request-runtime.ts`                               | HTTP `ok:false` 仍被压缩成 message-only Error                   |
| 19-03 | `packages/flux-action-core/src/action-dispatcher/action-execution.ts`                   | 诊断回调在 catch 路径里仍可覆盖主错误                           |
| 20-01 | `packages/flux-react/src/field-frame.tsx`                                               | composite `FieldFrame` 仍缺程序化 label 关联                    |
| 20-02 | `packages/flux-renderers-form/src/renderers/input.tsx`                                  | `radio-group` source error 仍未关联到焦点目标                   |
| 20-03 | `packages/flux-renderers-form-advanced/src/tree-controls.tsx`                           | tree controls source error 仍未与焦点语义节点关联               |
| 20-04 | `packages/flux-renderers-form-advanced/src/tree-controls.tsx`                           | checkbox 模式仍暴露伪复选框死焦点                               |

## P3 清单（按文件分组）

| 编号  | 文件                                                                    | 一句话摘要                                                           |
| ----- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 01-02 | `packages/report-designer-renderers/package.json:20-34`                 | 测试源码导入 `@nop-chaos/flux-runtime` 但未在 manifest 声明          |
| 02-02 | `packages/flux-renderers-form/src/renderers/input.tsx`                  | 基础输入家族与配套 helper 仍集中在单文件                             |
| 02-03 | `packages/*/src/**/*.d.ts.map`                                          | 源目录混入声明映射产物，污染 source/dist 边界                        |
| 07-02 | `packages/flux-renderers-form/src/renderers/form-status-publication.ts` | `valuesPath` 快照发布仍由 renderer effect 承担                       |
| 07-07 | `packages/flux-runtime/src/runtime-factory.ts`                          | node/import-owned `ActionScope` 只有创建没有释放                     |
| 12-03 | `packages/flux-compiler/src/schema-compiler/tables.ts`                  | deep-region 规则仍分裂在 compiler-global renderer tables 中          |
| 14-05 | `packages/ui/vitest.config.ts`                                          | `@nop-chaos/ui` 仍缺 package-level coverage gate                     |
| 14-08 | `tests/e2e/code-editor.spec.ts`                                         | 主 E2E 仍混入资产采集 helper 型测试                                  |
| 14-09 | `packages/flow-designer-renderers/vitest.config.ts`                     | 多个活跃公共包仍无 coverage gate                                     |
| 16-03 | `docs/architecture/flow-designer/canvas-adapters.md:155-160`            | code anchor 仍使用不存在的大小写路径                                 |
| 16-04 | `docs/architecture/schema-file-validator.md:37-45`                      | 当前基线仍引用已移除的 `CompiledSchemaNode` 术语                     |
| 17-02 | `packages/flow-designer-core/src/types.ts`                              | `variant` 在通用按钮与 domain toolbar 间仍有两套 live authoring 词汇 |
| 17-03 | `packages/flow-designer-renderers/src/index.tsx:148-154`                | `createFlowDesignerRegistry` 命名仍与真实 register 语义冲突          |
| 18-01 | `docs/components/report-designer-page/design.md`                        | report-designer 根 marker 的 owner doc 与 live 实现仍漂移            |

## 高频问题文件（出现在多个维度中的文件）

| 文件                                                                         | 涉及维度 | 说明                                                                |
| ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| `packages/flux-react/src/render-nodes.tsx`                                   | 07       | fragment-scope 生命周期门闩与 scope identity 切换都存在风险         |
| `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`  | 04, 08   | 同时命中 owner 分型、validation contract、hidden participation 路径 |
| `packages/flux-renderers-form/src/renderers/form-status-publication.ts`      | 07       | 外部 publication 仍由 renderer effect 承担                          |
| `packages/report-designer-renderers/src/page-renderer.tsx`                   | 13, 15   | 同时命中 host 输入 cast、热路径 stringify、错误观测缺口             |
| `packages/flux-runtime/src/form-runtime-submit-flow.ts`                      | 06, 19   | 同时命中提交流程取消安全和错误保真度问题                            |
| `packages/flux-runtime/src/async-data/request-runtime.ts`                    | 19       | 共享请求底座仍压缩最终错误上下文                                    |
| `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts` | 06       | data-source authoritative-run gating 缺口                           |
| `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx`      | 11       | toolbar primitive 仍重造共享 UI 语义                                |
| `packages/flux-compiler/src/schema-compiler/node-compiler.ts`                | 02       | 编译主路径文件已重新膨胀到 >700 行                                  |
| `packages/flux-compiler/src/schema-compiler/tables.ts`                       | 12       | deep-region 规则仍集中在 compiler-global registry                   |
| `packages/flow-designer-renderers/vitest.config.ts`                          | 14       | 同时命中环境分裂与 coverage gate 缺口                               |
| `tests/e2e/exploratory/subagent-a-independent-review.spec.ts`                | 14       | 主路径 exploratory omnibus 假绿风险高                               |

## 跨维度模式（多个维度报告的同类问题）

- 运行时所有权已经收敛到 store/runtime 的能力，仍有部分 publication、validation、source resource 生命周期留在 React effect/hook 层。
- 多处公共入口仍把外部 schema、persisted data 或 host seed 直接 cast 成可信合同，缺少最小运行时 narrowing。
- 主路径错误与异步失败仍常被压缩成 UI 通知或 message-only Error，结构化诊断/错误保真度不足。
- 精确订阅能力已在底层 runtime 具备，但上层 hook/helper 仍存在若干 broad subscription / stale snapshot 漏点。
- 测试体系存在两类稳定问题：主路径 exploratory 假绿，以及 renderer/ui 包环境/coverage gate 不一致。
- 文档与计划状态枚举整体可用，但仍有多处 active owner doc / active plan 的路径漂移与状态字段失真。

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- `eval` / `new Function`：本轮人工复查无命中。
- 超过 700 行的大文件已有脚本与 ESLint 双重守卫，但仍需人工判断“是否职责混杂”。
- workspace manifest 依赖缺口已有脚本能力可覆盖，但仍有漏网条目，说明规则/覆盖面还不完全。

## 建议新增的自动化检查

- 为 `src` 目录构建产物守卫补上 `.d.ts.map`，并加回归 fixture。
- 为 `useScopeSelector(..., { paths })` 相关 helper 增加订阅精度回归测试，特别是 `$form` 非值变更的 stale snapshot 场景。
- 为 `parallel` data-source authoritative-run gating 增加“旧请求先返回”反向顺序测试，并把当前测试从“断言旧值先发布”改为“断言被 stale-drop”。
- 为 `variant-field` 加隐藏分支后代字段参与集回归测试，以及 projected/inherit-owner 不得注册 child contract 的契约测试。
- 为 `frameClassName` 和其他正式样式入口补 `classAliases` 展开测试。
- 为 form submit 生命周期和 action dispatcher 加“error hook / diagnostic hook 不得覆盖 primary failure”测试。
- 为主 E2E 引入 exploratory/debug 目录隔离或单独 Playwright project，避免默认 gate 混入调试脚本。

## 可暂缓项（有问题但 ROI 暂时不高）

- `01-02` manifest 缺口：低成本修复，但风险主要在更严格安装模式或发布环境。
- `02-02` 输入家族单文件、`02-03` `.d.ts.map` 污染症状：建议跟随 `02-04` 根因修复一起处理。
- `07-02` `valuesPath` renderer-owned publication：当前更像实现收敛债。
- `07-07` `ActionScope` retention：当前证据主要指向空壳对象累积，不是高危泄漏。
- `12-03` deep-region compiler-global registry：architecture debt 明显，但不构成立即用户故障。
- `14-05`、`14-08`、`14-09`：属于测试治理/信号质量问题，可与测试基础设施收敛一起处理。
- `16-03`、`16-04`、`17-02`、`17-03`、`18-01`：文档/命名 drift 明确，但优先级低于主路径运行时正确性问题。

## 误报排除清单（看起来像问题但不建议动）

- `01-01`：`flux-runtime -> flux-compiler / flux-action-core` 与当前 owner doc 一致，不应按旧理想层级图重报。
- `04-01`：`object-field` 的 adapted draft 模式属于当前 `transformIn/transformOut` 支持基线。
- `04-02`：tree mode 的外部 `TreeDocument` replace bridge 属于当前设计基线。
- `09`：renderer contract 本轮零发现，host/domain renderer 的本地 shell 与子运行时 boundary 属于允许模式。
- `15-02`：`apps/playground/src/flow-designer/flow-designer-canvas.tsx` 当前不在 live 页面调用链中。
- `18-02`：跨包 register API 未形成当前可证明的公共契约破坏，不能仅凭 target/reference doc 草案重报。

## 审核结论

- 本轮 20 维度深审后，最值得优先处理的集中在 5 个面：
  1. 运行时/React 边界上仍残留的 publication 与 lifecycle owner 漂移
  2. 外部 schema / persisted data / host seed 直接 cast 进入可信合同的动态边界
  3. data-source / submit / diagnostics 路径的异步一致性与错误保真度
  4. 精确订阅与 snapshot 缓存的主路径性能/正确性缺口
  5. 主 E2E 假绿与测试入口/coverage gate 治理问题
- 零发现维度为 `03 API 表面积`、`09 渲染器契约`，且都经过了独立复核。
- 所有结果均已按维度文件保留初审、深挖、复核与最终保留项，可直接作为后续 remediation 计划输入。
