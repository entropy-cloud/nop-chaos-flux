# 深度审核汇总报告

## 审核范围

- 执行的维度：01 依赖图与包边界；02 模块职责与文件边界；03 API 表面积与契约一致性；04 状态所有权；05 响应式订阅精度；06 异步安全；07 生命周期；08 验证系统；09 渲染器契约；10 样式系统；11 UI 组件；12 字段与 Slot；13 类型安全；14 测试覆盖；15 安全与性能；16 文档一致性；17 命名术语；18 跨包模式；19 错误传播；20 可访问性。
- 覆盖的包：`flux-core`、`flux-formula`、`flux-compiler`、`flux-action-core`、`flux-runtime`、`flux-react`、`flux-renderers-basic`、`flux-renderers-form`、`flux-renderers-form-advanced`、`flux-renderers-data`、`flux-code-editor`、`flow-designer-core`、`flow-designer-renderers`、`spreadsheet-core`、`spreadsheet-renderers`、`report-designer-core`、`report-designer-renderers`、`word-editor-renderers`、`nop-debugger`、`ui`、`apps/playground`、`tests/e2e`、`docs`。
- 审核日期：2026-05-09
- 执行方式：20 个维度多轮迭代深挖 + 20 个维度独立复核 + 高风险逐项复核 / 低风险批量复核。最终汇总只使用已通过维度复核与必要子项复核的结论。

## 深挖统计

- 维度总数：20。
- 各维度深挖轮次：01=5轮；02=5轮；03=2轮；04=2轮；05=5轮；06=3轮；07=5轮；08=5轮；09=4轮；10=5轮；11=2轮；12=3轮；13=1轮；14=5轮；15=5轮；16=4轮；17=3轮；18=2轮；19=5轮；20=4轮。
- 深挖总轮次：75。
- 深挖总发现数：165。
- 零发现维度：13 类型安全。

## 复核统计

- 深挖发现总数：165。
- 已独立复核条目数：165；零发现维度复核 1 个。
- 维度级复核完成数：20。
- 子项逐条复核数：57。
- 批量复核覆盖条目数：12。
- 进入最终汇总：91 项。
- 降级后仍进入低优先级/观察项：01-10、02-04、06-06、10-11。
- 降级后未作为主汇总项：14-13、17-01。
- 驳回：16-02、16-09。

## P0 清单

| 编号  | 文件                                                                      | 结论                                                                                                  |
| ----- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 14-01 | `packages/flux-renderers-data/src/__tests__/use-table-controls.test.tsx`  | 778/779 行，超过 >700 测试硬阈值，覆盖 pagination/selection/sort/filter/expand 多个 controller。      |
| 14-02 | `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx` | 750/751 行，超过 >700 测试硬阈值，混合 submit/init/validation/surface scope 行为轴。                  |
| 14-03 | `packages/flux-compiler/src/schema-compiler-diagnostics.test.ts`          | 725/726 行，超过 >700 测试硬阈值，聚合 diagnostics、symbol table、host action、namespace validation。 |
| 14-04 | `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.test.ts`       | 717/718 行，超过 >700 测试硬阈值，混合 dialog/drawer/surface teardown/scope publication。             |

## P1 清单

| 编号  | 文件                                                                             | 结论                                                                                                              |
| ----- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 02-01 | 多个测试文件                                                                     | `pnpm check:oversized-code-files` 当前失败，4 个 >700 测试文件需按行为 owner 拆分。                               |
| 04-01 | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts`      | Spreadsheet resize 仍用 renderer-local 行列尺寸驱动 grid，绕过 core document resize owner。                       |
| 06-01 | `packages/flux-action-core/src/action-dispatcher/action-runners.ts`              | action retry 未接入父级 `AbortSignal`，取消后 retry delay/后续 attempt 仍可继续。                                 |
| 07-05 | `packages/flux-react/src/import-stack.ts`                                        | prepared import 安装失败缺少 rollback，已注册 namespace provider 可滞留。                                         |
| 08-01 | `packages/flux-runtime/src/surface-runtime.ts` 等                                | surface-root 非 form validation owner 用独立初始快照，字段变更后验证读取旧值。                                    |
| 08-02 | `packages/flux-runtime/src/form-runtime-owner.ts` 等                             | `validateAll`/`validateSubtree` 可绕过 transitional lifecycle，将 null model 当 clean success。                   |
| 08-03 | `packages/flux-runtime/src/projected-validation-runtime.ts` 等                   | projected non-form validation proxy 暴露未 rebased store/scope，子字段展示路径漂移。                              |
| 08-06 | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`      | variant-field 非 form owner 下缺少 projected `ValidationContext`。                                                |
| 08-09 | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`          | detail-view 非 form commit 后只写 parent scope，不触发父 validation owner 重校验。                                |
| 08-11 | `packages/flux-react/src/hooks.ts` 等                                            | generic validation owner refresh 清空 runtime registrations 后，non-form renderer 不订阅 modelGeneration 重注册。 |
| 08-12 | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`         | detail-field 已注册 generic child contract，但 confirm 被 `parentForm` 硬拦截。                                   |
| 08-13 | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`     | object-field 非 form async transformOut 最终写回后缺少 validation owner revalidation。                            |
| 19-01 | `packages/flow-designer-renderers/src/designer-command-adapter.ts`               | Flow Designer 复合插入事务缺少异常路径 rollback/finally。                                                         |
| 19-11 | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts` | table quick edit 未检查 `ActionResult.ok`，`ok:false` 会进入保存成功路径。                                        |

## 高频问题文件

| 文件                                          | 相关发现                                               | 模式                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `packages/flux-runtime/src/*validation*`      | 08-01、08-02、08-03、08-11、08-13                      | generic validation owner 与 projected runtime 生命周期/路径一致性问题。                              |
| `packages/flux-renderers-form-advanced/src/*` | 02-03、05-05、08-06、08-09、08-12、08-13、19-15、20-08 | composite/advanced field 同时暴露 validation、value adaptation、accessibility、error fidelity 风险。 |
| `packages/flux-react/src/*`                   | 05-01、05-13、05-16、07-01、07-02、07-06、10-05        | React/runtime 边界的 path precision、source lifecycle、global CSS scope 问题。                       |
| `packages/flow-designer-renderers/src/*`      | 02-04、07-05、10-08、10-09、10-12、19-01               | Flow Designer nested schema scope、import lifecycle、transaction safety、styling config drift。      |
| `packages/flux-renderers-data/src/*`          | 01-11、05-03、09-02、14-01、15-01、19-11               | Table/CRUD controller、event payload、test size、save result handling集中。                          |
| `packages/flux-code-editor/src/*`             | 10-04、12-02、14-09、14-14、14-18、15-08               | Code editor styling, slot content, SQL execution/completion, test isolation gaps。                   |
| `tests/e2e/*`                                 | 14-05、14-07、14-11、14-12、14-16、14-17               | 默认 e2e 集合包含诊断/dump/screenshot/弱断言用例。                                                   |
| `docs/*`                                      | 16-01、16-03、16-05、16-08、16-11、17-02               | active docs routing、hook list、plan status、terminology 与 live code 漂移。                         |

## 跨维度模式

- Validation owner 泛化不完整：non-form/generic owner 与 form-only lifecycle hook 混用，导致值读取、registration、child contract、commit/revalidation 多处断裂。
- Path-aware subscription 被 root 粒度 producer 或错误 dependency 声明抵消：`useScopeSelector`、`scope.replace`、`scope.merge`、fragment bindings、external data replace 都存在精度退化。
- Renderer event payload 缺少语义 event：多个 renderer 以 `null`/`undefined` 触发公开事件，导致 `ActionContext.event` 不稳定。
- Nested schema scope 不一致：Flow Designer edge/createDialog body 未继承 `classAliases`，slot typing 与 metadata 对不齐。
- CSS selector scope 漂移：包级 CSS 多处使用裸 `data-slot` 或非 root-scoped selector，影响主题独立性与 DOM marker contract。
- Non-throw `ActionResult` 失败未检查或被压缩：quick edit、variant detect、data source、create dialog、value adapter 等路径丢失失败上下文。
- 测试质量两极化：一方面 4 个 >700 文件阻断硬检查；另一方面默认 e2e 中存在诊断型、截图型或弱断言用例。

## 已自动化的检查项

- `pnpm check:oversized-code-files` 已覆盖 >700 文件红线，本次确认当前仍失败。
- TypeScript suppress 注释与危险 `any` 没有发现正式问题，维度 13 零发现经独立复核保留。
- Playwright 默认 `testDir` 已能发现诊断型 spec 是否进入默认 gate，但缺少对“无断言/弱断言”的静态门禁。

## 建议新增的自动化检查

- 增加 workspace dependency/import consistency 检查，覆盖测试文件跨包 import 是否在 manifest 中声明 dev dependency。
- 增加 renderer event payload lint，禁止公开 renderer event 以 `null`/`undefined` 作为 event 参数进入 `props.events.*`。
- 增加 CSS selector scope 检查，禁止 package stylesheet 裸 `[data-slot=...]`，要求 root marker 或 package root scope。
- 增加 fake timer / console spy cleanup 检查，要求 `afterEach(vi.useRealTimers/restoreAllMocks)` 或 `try/finally`。
- 增加 e2e no-diagnostic-spec/no-assertion 规则，阻止 `debug|diag|screenshot|dump` 类测试进入默认 gate。
- 增加 docs plan status 枚举与 docs link/anchor 校验，避免 active docs 指向不存在路径或 draft docs 被 routing 使用。
- 增加 path-aware subscription smoke tests，覆盖 `scope.merge`、`scope.replace`、fragment bindings 与 `props.data` update 的 changed path 精度。

## 可暂缓项

- 01-10：未导出的 `@nop-chaos/flux-renderers-form/test-support` 测试 alias，当前 private workspace 已有 `tsconfig`/Vite alias 支撑，保留为 P3。
- 02-04：`flow-designer-renderers/src/index.tsx` 入口内联 definitions，降为 P2 入口纯度/膨胀风险。
- 06-06：report designer toolbar `void dispatch`/不检查 `ok`，默认 save 是本地导出，降为 P3/P2 边界观察项。
- 10-11：`report-field-panel.css` 裸 slot selector，根节点已有 `.nop-report-designer` 与 token fallback，作为低优先级 scope cleanup。
- 11-01、11-02：低风险 UI 组件一致性项，可与 accessibility/button cleanup 批处理。
- 14-13：minimap E2E 固定等待有明确断言且无 flake 证据，降为 P3。
- 17-01：condition-builder operator snake_case 属于 DSL token，不作为普通 JSON key 主修复项。

## 误报排除清单

- 13 类型安全：生产代码中的 `any` 主要位于低代码动态边界、scope/form values、公式/host 注入和异构 renderer/action/schema 桥接，未达正式 finding 门槛。
- 16-02：Plan 232 已同步为允许枚举 `completed`，原 status 漂移线索驳回。
- 16-09：Plan 233 已同步为 `completed`，Phase/checklist 与代码迁移状态已更新，原 planned/半迁移漂移驳回。
- 20 子项复核已重新绑定当前 `20-accessibility.md` 的实际 10 条发现，旧的 pagination/array-editor/table overlay 等候选不进入本报告。
