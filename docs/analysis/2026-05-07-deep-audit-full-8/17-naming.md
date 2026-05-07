# 维度 17: 命名与术语一致性

## 深挖轮次

- 第 1 轮: playground Badge examples use `label/variant`; icon config uses PascalCase。
- 第 2 轮: 无新增。

## 维度复核结论

| 条目                               | 结论 | 严重程度 | 证据                                                                                                                          |
| ---------------------------------- | ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Badge examples use `label/variant` | 保留 | P2       | Badge schema/renderer use `text/level`; playground examples still use invalid `label/variant` in multiple component lab pages |
| Icon config uses PascalCase        | 保留 | P2       | schema/docs require kebab-case; `toIconLookupKey()` does not split PascalCase, so multi-word icons can fallback               |

## 最终保留项

- Update playground component-lab schemas to use `badge.text/level` and kebab-case icon names。
