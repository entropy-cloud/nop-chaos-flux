# 维度 11: UI 组件使用合规性

## 深挖轮次

- 第 1 轮: input-number stepper raw `<button>` candidate; raw file/color/spreadsheet/table spacer exceptions.
- 第 2 轮: 无新增。

## 维度复核结论

| 条目                                | 结论 | 严重程度 | 证据                                                                                             |
| ----------------------------------- | ---- | -------- | ------------------------------------------------------------------------------------------------ |
| input-number stepper raw `<button>` | 保留 | P2       | `packages/flux-renderers-form/src/renderers/input.tsx:502,514`; `@nop-chaos/ui` exports `Button` |
| Word Editor `input[type=file]`      | 驳回 | -        | browser native file picker exception                                                             |
| Word Editor `input[type=color]`     | 驳回 | -        | browser native color picker exception                                                            |
| Spreadsheet raw table/input/button  | 驳回 | -        | high-performance host surface exception                                                          |

## 最终保留项

- Replace input-number stepper raw buttons with `@nop-chaos/ui` `Button` or a ui-owned input group subcomponent.
