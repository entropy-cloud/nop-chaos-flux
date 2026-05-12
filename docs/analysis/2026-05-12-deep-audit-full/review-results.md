# 2026-05-12 Deep Audit Stage-1 Review Results

> 状态：历史阶段性复核记录，已被 `final-review-results-01-05.md`、`final-review-results-06-10.md`、`final-review-results-11-15.md`、`final-review-results-16-20.md` 和 `summary.md` 取代。保留本文件仅用于追溯第 1 轮复核如何被后续深挖修订。

本文件记录 20 个维度第 1 轮初审后的独立复核结论。最终结论以 `summary.md` 和 `final-review-results-*.md` 为准。

## 维度复核结论

| 编号  | 结论       | 最终严重程度 | 复核依据                                                               |
| ----- | ---------- | ------------ | ---------------------------------------------------------------------- |
| 01    | 零发现保留 | 无           | 包级依赖、exports、build 配置、跨包私有导入未发现违规。                |
| 02-01 | 保留       | P2           | `node-compiler.ts` >700 且混合多类编译职责。                           |
| 02-02 | 降级保留   | P3           | root entry 过厚，但 definitions 属当前 stable surface。                |
| 02-03 | 保留       | P2           | `array-field.tsx` 混合 identity/projection/validation/UI。             |
| 02-04 | 降级保留   | P3           | page renderer 是 bridge 可维护性热点，但 owner docs 允许 bridge。      |
| 03-01 | 保留       | P3           | form root export 暴露底层 field helpers，表面积偏宽。                  |
| 03-02 | 保留       | P2           | public runtime type docs 缺 `subscribeToModelGeneration`。             |
| 04-01 | 保留       | P2           | spreadsheet editing local state/ref 与 core snapshot 双轨。            |
| 04-02 | 驳回       | 无           | report/spreadsheet dual core bridge 属 owner doc 支持形态。            |
| 05-01 | 保留       | P2           | form field state 更新唤醒 scope 数据订阅。                             |
| 05-02 | 保留       | P3           | non-form scope fallback 缺 path subscription。                         |
| 05-03 | 降级保留   | P3           | surface host 粗粒度订阅成立但风险较低。                                |
| 05-04 | 保留       | P3           | code editor form 模式仍有 scope fallback 订阅。                        |
| 06-01 | 保留       | P2           | AbortSignal 未传到底层 prepare/importLoader。                          |
| 06-02 | 保留       | P3           | report designer field source refresh 缺局部 stale guard。              |
| 06-03 | 保留       | P2           | auto-layout cleanup 未失效 layoutRequestRef。                          |
| 06-04 | 保留       | P2           | create dialog failure 无用户反馈。                                     |
| 07-01 | 降级保留   | P3           | React/source observer 生命周期边界偏 React，但 runtime observer 存在。 |
| 07-02 | 驳回       | 无           | `useSourceValue` 与当前 observer design 一致。                         |
| 07-03 | 保留       | P3           | parent AbortSignal listener settle 后未移除。                          |
| 07-04 | 保留       | P2           | ActionScope 缺 scope-level dispose。                                   |
| 07-05 | 保留       | P1           | render/useMemo 阶段写 fragment scope cache。                           |
| 08-01 | 保留       | P1           | form 内 validation owner 可能读祖先 context。                          |
| 08-02 | 保留       | P1           | disposed/unactivated validation 返回 clean success。                   |
| 08-03 | 降级保留   | P3           | summary-gate 行为契约歧义。                                            |
| 08-04 | 保留       | P1           | sync errors 被 async/debounce 阶段延后。                               |
| 09-01 | 降级保留   | P3           | flex semantic props 与 marker-only 口径存在张力。                      |
| 09-02 | 保留       | P2           | tree repeated region 缺 `instancePath`。                               |
| 09-03 | 降级保留   | P3           | tabs semantic event payload 一致性不足。                               |
| 09-04 | 降级保留   | P3           | CRUD refresh event payload 一致性不足。                                |
| 10-01 | 保留       | P2           | JSX BEM 状态/内部区域类残留。                                          |
| 10-02 | 保留       | P2           | CSS BEM selector 残留。                                                |
| 10-03 | 保留       | P3           | playground modifier class 与 data-\* 重复。                            |
| 11-01 | 保留       | P3           | debugger JSON viewer raw button。                                      |
| 12-01 | 保留       | P2           | FieldFrame chrome 读取 raw schema。                                    |
| 12-02 | 保留       | P1           | deep region 编译缺 `$slot` 符号表。                                    |
| 12-03 | 降级保留   | P2           | deep normalizers 仍在 compiler 表。                                    |
| 13-01 | 保留       | P2           | persisted datasets 未校验直接断言。                                    |
| 14-01 | 保留       | P3           | Component Lab manifest 漏 `input-number`。                             |
| 14-02 | 保留       | P3           | Component Lab write 覆盖声明失真。                                     |
| 15-01 | 保留       | P2           | report/spreadsheet sync 热路径全量 stringify。                         |
| 16-01 | 保留       | P2           | report designer alias docs 与 live code/tests 冲突。                   |
| 16-02 | 保留       | P2           | `inspectorPanels` docs 与 manifest/host-data/tests 冲突。              |
| 16-03 | 保留       | P1           | `setValues` 文档与 runtime behavior 冲突。                             |
| 17-01 | 降级保留   | P3           | `dataPath` legacy read 存在但非主 authoring contract。                 |
| 17-02 | 保留       | P2           | Button variant docs 与 live schema 冲突。                              |
| 17-03 | 降级保留   | P2           | toolbar variant 部分成立。                                             |
| 17-04 | 保留       | P3           | Button example 使用 `size: "md"`。                                     |
| 17-05 | 保留       | P3           | Flow Designer icon example PascalCase。                                |
| 17-06 | 降级保留   | P3           | `createFlowDesignerRegistry` 已在 docs 标为 residual。                 |
| 17-07 | 保留       | P2           | condition-builder operator ids snake_case。                            |
| 18-01 | 保留       | P2           | `$designer` scopeExport 与 live host projection 不一致。               |
| 19-01 | 保留       | P1           | request-backed action 跳过 action-layer retry。                        |
| 20-01 | 保留       | P2           | FieldFrame label 未关联复合控件。                                      |
| 20-02 | 保留       | P2           | Select/RadioGroup errors 未稳定关联 focus target。                     |
| 20-03 | 保留       | P2           | submit validation failure 无 first-error focus。                       |
| 20-04 | 保留       | P2           | condition-builder AND/OR 无 selected state ARIA。                      |
| 20-05 | 保留       | P2           | 删除子组按钮缺 `aria-label`。                                          |
| 20-06 | 保留       | P2           | interactive table row 缺 role/name/state。                             |
| 20-07 | 保留       | P2           | chart 缺数据文本替代。                                                 |

## 历史限制

- 本文件仅覆盖第 1 轮初审与当时的独立复核，不包含后续第 2-5 轮追加深挖。
- 后续最终复核已修订多个结论，例如 `12-02` 与 `16-04` 驳回、`19-01` 降级改窄、`03-05` 修订为 test-support subpath dependency/side-effect 问题。
- 本轮未进行代码修复，也未运行 typecheck/build/lint/test。
