# 维度 12: 表单字段与 Slot 建模

## 深挖轮次

- 第 1 轮: table expandable region key, quickEdit region helper, CRUD slot resolver.
- 第 2 轮: table label/context, CRUD table slots, domain helpers.render templateNode, region/prop double channel, deep validate/analyze.
- 第 3 轮: table header/footer metadata, tree/tabs params/instancePath.
- 第 4 轮: detail-field/detail-view action fields not metadata.
- 第 5 轮: variant-field variants deep slots missing and ghost top-level content region.

## 维度复核结论

| 条目                                                      | 结论 | 说明                                                                                           |
| --------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| table expandable hand-written region key                  | 保留 | `schemas.ts:95-99`; deep normalizer lacks expandable declaration extraction                    |
| quickEdit body private helper region + params             | 保留 | `table-quick-edit-cell.tsx:74-79`; `schema-compiler/tables.ts:25-29` lacks params              |
| CRUD slot resolver copy and table slots not forwarded     | 保留 | `crud-renderer.tsx:208-234,254-301`                                                            |
| domain renderers use `helpers.render(templateNode)`       | 保留 | flow/report/word page renderers bypass `region.render()`                                       |
| report/flow region-prop double channel                    | 保留 | definitions declare region, renderer still reads `props.props.*` fallback                      |
| deep validate/analyze misses deep slots                   | 保留 | `shape-validation.ts` traverses direct fields, not `DEEP_FIELD_NORMALIZERS`                    |
| table header/footer missing explicit metadata             | 降级 | global default rules cover `header/footer`, but renderer-specific metadata is weak             |
| tree/tabs params/instancePath incomplete                  | 保留 | tree passes bindings no instancePath; tabs deep slots lack params/instancePath                 |
| detail-field/detail-view action fields not metadata       | 保留 | schema exposes `openAction/confirmAction/cancelAction`, definitions do not model them          |
| variant-field variants deep slots missing + ghost content | 保留 | `variants[].content/viewer` raw rendered; definition declares top-level `content` not consumed |

## 最终保留项

1. Extend deep region extraction/validation for table expandable, tabs, tree, variant-field.
2. Remove private helper `regions` and raw `templateNode` rendering paths.
3. Align schema action fields with metadata/event channels.
