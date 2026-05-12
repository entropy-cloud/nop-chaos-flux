# Final Review Results: Dimensions 16-20

> 状态：最终独立复核记录。基于第 1 轮完整重建正文、第 2-5 轮 raw findings 与 live repo 复核。第 5 轮达到本次执行上限，仍有新增，因此结论表述为“达到上限后进入复核”，不声称自然收敛。

## 误报与修订

- [16-04] 驳回：`formulaCompiler.compileExpression()` 会通过 `normalizeExpressionSource()` 接受 pure `${...}` adaptor examples。
- [19-01] 降级并改窄：广义 “ajax skips retry” 表述误导；ajax 已委托 request runtime retry 且有测试。剩余问题主要是 `submitForm` action-level retry 被跳过。

## 维度 16：文档-代码一致性

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                |
| ----- | -------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| 16-01 | 保留     | P2           | report designer docs 宣传 top-level `selection`/`target` aliases，但 live host scope 不发布。           |
| 16-02 | 保留     | P2           | `inspectorPanels` docs 标为 non-canonical/implementation lag，但 live host scope 仍 schema-visible。    |
| 16-03 | 保留     | P1           | `setValues.args.path` 在 form context 被忽略，explicit author intent 失效。                             |
| 16-04 | 驳回     | 无           | API adaptor `${...}` examples 被 live formula compiler 接受；原 finding 忽略 expression normalization。 |

## 维度 17：命名与术语一致性

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                                       |
| ----- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 17-01 | 保留     | P3           | code editor source refs 保留 legacy `dataPath` fallback；建议标 deprecated/legacy。                                            |
| 17-02 | 保留     | P2           | generic Button docs 用 `primary/danger`，live `ButtonSchema` 使用 shadcn variants。                                            |
| 17-03 | 降级保留 | P3           | toolbar button variants 是独立 semantic vocabulary，但未与 generic Button terminology 区分清楚。                               |
| 17-04 | 保留     | P3           | Button example 使用 unsupported `size: "md"`。                                                                                 |
| 17-05 | 保留     | P3           | Flow Designer icon examples 用 PascalCase，与 kebab-case convention 冲突。                                                     |
| 17-06 | 保留     | P3           | `createFlowDesignerRegistry()` 名称暗示 create，但实际 mutates/registers into existing registry；docs 已标 deferred residual。 |
| 17-07 | 降级保留 | P3           | condition-builder operator IDs 是 snake_case DSL tokens，作为 convention exception 需文档化或 alias。                          |
| 17-08 | 降级保留 | P3           | historical discussion example 使用 `navigate.args.to`；live action 接受 `url/back`。因在 `docs/discussions`，降级为低风险。    |

## 维度 18：跨包模式一致性

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                     |
| ----- | -------- | ------------ | -------------------------------------------------------------------------------------------- |
| 18-01 | 保留     | P2           | Flow Designer declares `$designer` scope export，但 live host scope 不发布。                 |
| 18-02 | 保留     | P2           | Spreadsheet manifest 只列 core-supported commands 子集，tooling underreports valid actions。 |
| 18-03 | 保留     | P2           | Spreadsheet action provider forwards arbitrary methods，但 `listMethods()` 返回空。          |
| 18-04 | 保留     | P2           | Report Designer action provider hides all supported methods from discovery。                 |

## 维度 19：错误传播保真度

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                                           |
| ----- | -------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 19-01 | 降级保留 | P2           | 修订为 `submitForm` action-level retry 被跳过；ajax retry 已委托 request runtime，不再作为主问题。                                 |
| 19-02 | 保留     | P2           | Word editor save catch all errors 返回 null，action provider 映射为泛化失败，丢失 quota/security/serialization/bridge root cause。 |

## 维度 20：可访问性 (WCAG)

| 编号  | 复核结论 | 最终严重程度 | 修订意见                                                                                                    |
| ----- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| 20-01 | 保留     | P2           | FieldFrame labels 在 composite/rootTag=`div` controls 上未程序化关联。                                      |
| 20-02 | 保留     | P2           | Select/RadioGroup error associations 分裂在 wrapper 与 focus target 之间。                                  |
| 20-03 | 保留     | P2           | submit validation failure 不 focus first invalid field。                                                    |
| 20-04 | 保留     | P2           | condition-builder AND/OR selected state visual-only。                                                       |
| 20-05 | 保留     | P2           | condition-builder remove subgroup action 缺 explicit accessible name。                                      |
| 20-06 | 保留     | P2           | interactive table rows 缺 control semantics 与 expanded state。                                             |
| 20-07 | 保留     | P2           | chart 有 accessible name，但无 data equivalent。                                                            |
| 20-08 | 降级保留 | P3           | word editor icon-only toolbar buttons 依赖 `title` 而非 explicit `aria-label`；title 可能提供名称，故降级。 |
| 20-09 | 保留     | P2           | DingFlow add-node popover 缺 keyboard dismissal/focus management/menu semantics。                           |
| 20-10 | 保留     | P2           | Spreadsheet grid 可能让 `aria-activedescendant` 指向未挂载 virtualized cell。                               |
| 20-11 | 保留     | P3           | Word document preview back buttons 依赖 `title` 而非 explicit `aria-label`。                                |
