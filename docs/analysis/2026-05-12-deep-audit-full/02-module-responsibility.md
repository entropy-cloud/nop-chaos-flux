# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

初审发现 4 项，独立复核后保留 2 项、降级保留 2 项。

## 维度复核结论

- [02-01]: 保留为 P2。`node-compiler.ts` >700 且混合 runtime value、node、action、import、validation、data-source/reaction 编译职责。
- [02-02]: 降级为 P3。`flow-designer-renderers/src/index.tsx` root entry 过厚，但 definitions 属当前 stable surface。
- [02-03]: 保留为 P2。`array-field.tsx` 混合 item identity、scope/form/validation projection、UI。
- [02-04]: 降级为 P3。`report-designer-renderers/src/page-renderer.tsx` 是 report/spreadsheet bridge 可维护性热点，但 owner docs 允许 bridge。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                        | 一句话摘要                                     |
| ----- | -------- | --------------------------------------------------------------------------- | ---------------------------------------------- |
| 02-01 | P2       | `packages/flux-compiler/src/schema-compiler/node-compiler.ts`               | >700 行且混合多类编译职责                      |
| 02-02 | P3       | `packages/flow-designer-renderers/src/index.tsx`                            | root entry 过厚                                |
| 02-03 | P2       | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` | ArrayField 混合 identity/runtime/validation/UI |
| 02-04 | P3       | `packages/report-designer-renderers/src/page-renderer.tsx`                  | report/spreadsheet bridge 可维护性热点         |
