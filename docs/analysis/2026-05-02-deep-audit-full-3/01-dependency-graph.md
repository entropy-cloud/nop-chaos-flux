# 维度01：依赖图与包边界

## 维度复核结论

| 发现 | 判定    | 核心依据                                                       |
| ---- | ------- | -------------------------------------------------------------- |
| F1   | 驳回    | AGENTS.md 依赖链 + runtime-factory.ts 生产引用，代码与文档一致 |
| F2   | 驳回    | AGENTS.md 明确标注 flux-i18n -> ui，代码与文档一致             |
| F3   | 保留 P3 | 仅 test 文件引用，应从 dependencies 移至 devDependencies       |
| F4   | 保留 P3 | 仅 test 文件引用，应从 dependencies 移至 devDependencies       |

## 最终有效发现

### [维度01-F3] flux-renderers-form 将 flux-compiler 声明为正式依赖但仅用于测试

- **文件**: packages/flux-renderers-form/package.json
- **严重程度**: P3
- **复核状态**: 维度复核通过
- **现状**: flux-compiler 在 dependencies 中声明，但仅 test 文件引用
- **建议**: 迁移至 devDependencies

### [维度01-F4] flux-renderers-data 将 flux-compiler 声明为正式依赖但仅用于测试

- **文件**: packages/flux-renderers-data/package.json
- **严重程度**: P3
- **复核状态**: 维度复核通过
- **现状**: 同 F3
- **建议**: 迁移至 devDependencies
