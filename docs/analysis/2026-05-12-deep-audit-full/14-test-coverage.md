# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

初审发现 2 项，独立复核后均保留。

## 维度复核结论

- [14-01]: 保留为 P3。Component Lab manifest 漏 `input-number`。
- [14-02]: 保留为 P3。Component Lab write 覆盖声明与 spec 不一致。

## 最终保留项

| 编号  | 严重程度 | 文件                                           | 一句话摘要                             |
| ----- | -------- | ---------------------------------------------- | -------------------------------------- |
| 14-01 | P3       | `tests/e2e/component-lab/coverage-manifest.ts` | manifest 漏已上线 `input-number` route |
| 14-02 | P3       | `tests/e2e/component-lab/coverage-manifest.ts` | write 覆盖声明失真                     |
