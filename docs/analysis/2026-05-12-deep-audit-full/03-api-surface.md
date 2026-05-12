# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

初审发现 2 项，独立复核后均保留。

## 维度复核结论

- [03-01]: 保留为 P3。`flux-renderers-form` root barrel 公开底层 field handlers/helpers，表面积偏宽。
- [03-02]: 保留为 P2。`form-validation-runtime-types.md` 缺少已导出的 `subscribeToModelGeneration`。

## 最终保留项

| 编号  | 严重程度 | 文件                                               | 一句话摘要                                    |
| ----- | -------- | -------------------------------------------------- | --------------------------------------------- |
| 03-01 | P3       | `packages/flux-renderers-form/src/index.tsx`       | form root export 表面积偏宽                   |
| 03-02 | P2       | `docs/references/form-validation-runtime-types.md` | Store API 文档缺 `subscribeToModelGeneration` |
