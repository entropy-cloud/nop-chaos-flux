# Final Review Results: Dimensions 01-05

> 状态：最终独立复核记录。基于第 1 轮完整重建正文、第 2-5 轮 raw findings 与 live repo 复核。第 5 轮达到本次执行上限，仍有新增，因此结论表述为“达到上限后进入复核”，不声称自然收敛。

## 维度 01

- **结论**: 零发现保留。
- **复核依据**: 输入文件中无 01-xx 条目，也无驳回项。

## 维度 02：模块职责与文件边界

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                                                                                           |
| ----- | -------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 02-01 | 保留     | P2           | `node-compiler.ts` 仍为 757 行并混合 runtime values、fields/regions、events/lifecycle、imports、validation、sources/reactions。标题、风险、建议维持。                              |
| 02-02 | 保留     | P3           | root entry 混合 public exports、config compilation、renderer definitions，但只有 154 行，属于可维护性问题，不是边界违规。                                                          |
| 02-03 | 保留     | P2           | `array-field.tsx` 仍混合 identity/keying、projection、validation owners、child contract、mutation、JSX。                                                                           |
| 02-04 | 保留     | P3           | report page renderer 集中 bridge/sync orchestration；架构允许该 owner model，因此仅保留 maintainability 风险。修订标题为“concentrates bridge/sync orchestration”。                 |
| 02-05 | 降级保留 | P2           | async-data 测试文件 755 行且混合多个 async 子系统；未复核到自动 hard failure，P1 过高。                                                                                            |
| 02-06 | 降级保留 | P2           | word-editor host-scope 测试 731 行且 fixture/host/save/recovery 混杂；P1 过高，保留为拆分候选。                                                                                    |
| 02-07 | 保留     | P2           | `input.tsx` 653 行，混合多控件、source error、validation factory、number logic、definitions。                                                                                      |
| 02-08 | 保留     | P2           | `variant-field.tsx` 620 行，混合 variant detection、transform、projection、hidden notifications、child contract、UI。                                                              |
| 02-09 | 保留     | P2           | `runtime-factory.ts` 仍吸收 prepared-import loading/cache/staticMeta/error wrapping。标题修订为 prepared-import loading/cache preparation。                                        |
| 02-10 | 降级保留 | P2           | debugger advanced inspect 测试 710 行并混合多类 inspector contracts；P1 过高。                                                                                                     |
| 02-11 | 保留     | P2           | `spreadsheet-grid.tsx` 598 行，集中 viewport、headers、selection keyboard、render/edit、drag/fill/drop、context menu。                                                             |
| 02-12 | 保留     | P2           | `reaction-runtime.ts` 同时含单 reaction state machine 与 registry lifecycle/debug/disposal owner。                                                                                 |
| 02-13 | 保留     | P2           | `import-stack.ts` 混合 normalize/load/cache、frame install、collision、rollback、alias binding。                                                                                   |
| 02-14 | 保留     | P2           | stable renderer `loop.tsx` 直接写入 `flux-react/unstable` 的 `StructuralLoopContext`。建议稳定 provider/helper。                                                                   |
| 02-15 | 保留     | P2           | form package public subpath 暴露 test support，且 import 会引入 Testing Library 和全局 i18n reset/init。标题修订为“public subpath exposes test support with global side effects”。 |
| 02-16 | 保留     | P2           | form renderer hook 直接组合 runtime form status summary/publication 细节，属责任边界泄漏。                                                                                         |

## 维度 03：API 表面积与契约一致性

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                                                                                                              |
| ----- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 03-01 | 保留     | P3           | form root barrel 暴露 renderer internals 和 field-utils；API width concern 成立。                                                                                                                     |
| 03-02 | 保留     | P2           | `subscribeToModelGeneration` 存在于 public types/runtime，reference docs 仍缺。                                                                                                                       |
| 03-03 | 保留     | P2           | `reactComponent` 只在初始 definitions 归一化，后续 registry/register 或 `SchemaRendererProps.registry` 可绕过。建议 React registry wrapper 或文档化 core-normalized registry。                        |
| 03-04 | 保留     | P2           | `FormErrorQuery` 是 public type/hook contract，但 reference docs 缺 shape/filter semantics。                                                                                                          |
| 03-05 | 修订保留 | P2           | 原“build 不产物”部分为误报：live `tsconfig.build.json` 不排除 `src/test-support.tsx`。保留问题修订为 public `test-support` subpath 依赖未声明的 `@testing-library/react` 且有顶层 i18n side effects。 |
| 03-06 | 保留     | P2           | 多个 package exports 声明 CSS subpaths，但 workspace alias/paths 只同步部分。                                                                                                                         |
| 03-07 | 保留     | P2           | `flux-i18n` locale public subpaths 缺 Vite/TS workspace alias/path。                                                                                                                                  |

## 维度 04：状态所有权与单一事实来源

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                                                                                                                                        |
| ----- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 04-01 | 保留     | P2           | spreadsheet edit cell/value 在 renderer state/refs 与 core snapshot 双轨，且 save 先清草稿后 dispatch。                                                                                                                         |
| 04-02 | 驳回     | 无           | report/spreadsheet dual-core bridge 被架构文档明确允许；canonical public truth 仍是 `document.spreadsheet`。仅可作为 maintainability/performance 跟踪。                                                                         |
| 04-03 | 保留     | P1           | tree mode `TreeDocument` 由 React state 与 core history 双重维护；`replaceDocumentWithHistory(nextDoc, treeDocument)` 后 `pushHistory()` 可能通过 React closure 读取旧 tree。建议 core-owned tree 或显式传入 history snapshot。 |
| 04-04 | 保留     | P2           | `variant-field` projected form/validation owner 路径仍注册 `recurse-submit` child contract，模糊 parent-owned field 与 child-owner submit orchestration。                                                                       |

## 维度 05：响应式订阅精度

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                                             |
| ----- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 05-01 | 保留     | P2           | form scope snapshot 读 values，但 broad `store.subscribe` 会被 field-state-only changes 唤醒。                                       |
| 05-02 | 保留     | P3           | non-form field fallback 读单 path，但 `useScopeSelector` 不传 `paths`。                                                              |
| 05-03 | 保留     | P3           | dialog/drawer surface host whole-scope subscription 成立，影响较低。                                                                 |
| 05-04 | 保留     | P3           | code editor form mode 仍创建 scope fallback subscription，且 non-form path broad subscribe。                                         |
| 05-05 | 保留     | P3           | `useScopeSelector` 的 `paths` 以数组引用参与 memo，会产生 resubscribe churn。                                                        |
| 05-06 | 保留     | P2           | scope-change path matcher 将 sibling paths 当命中，影响 path-aware subscription/data source/reaction。                               |
| 05-07 | 保留     | P3           | table visible columns selectors 读两个 state paths，但未传 `paths`。                                                                 |
| 05-08 | 保留     | P3           | tabs scope ownership hook 注释称订阅 specific path，但未传 `paths`，且非 scope mode 仍 broad subscribe。建议同时加 `enabled` guard。 |
