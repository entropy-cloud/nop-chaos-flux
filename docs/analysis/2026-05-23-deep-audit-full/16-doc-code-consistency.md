# 维度 16: 文档-代码一致性

## 第 1 轮（初审）

### [维度16-01] `deep-audit-prompts.md` 的结果归档示例仍只列到 18 号维度文件，和同文档声明的 20 维审核基线不一致

- **文件**: `docs/skills/deep-audit-prompts.md:241-259`
- **证据片段**:
  ```md
  docs/analysis/{year}-{month}-{day}-deep-audit-{简短标识}/
  ├── 01-dependency-graph.md
  ...
  ├── 18-cross-package.md
  └── summary.md
  ```
- **严重程度**: P1
- **现状**: 手册前文明确声明共有 20 个维度，并在后文提供了 19/20 的维度正文；但归档目录示例与命名规则部分仍遗漏 `19-error-propagation.md`、`20-accessibility.md`。
- **风险**: 后续 agent 若按该归档示例严格执行，会错误地产出 18 个维度文件或误判 19/20 的命名约定，直接影响 deep audit 结果完整性与自动汇总脚本编写。
- **建议**: 更新示例目录与命名说明，把 19/20 文件名补齐，确保和维度总览、附录 A、当前实际产出保持一致。
- **为什么值得现在做**: 当前任务就是按照该手册写 20 维结果；文档 drift 已直接影响执行者，不是理论性 docs cleanup。
- **误报排除**: calibration pattern 7 明确排除 future/draft docs，但这里不是 draft 文档，而是 active skill handbook；它已经被 `docs/index.md` 路由为 deep-audit 现行执行基线。
- **历史模式对应**: 对应维度 16 中“计划/手册状态失真会误导后续执行”的高价值 docs drift 模式。
- **参考文档**: `docs/index.md`；`docs/skills/deep-audit-prompts.md`；`docs/references/maintenance-checklist.md`。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度16-01]: 保留 (P1)。这是 active execution handbook 的真实 drift，不是 draft docs；且已直接影响本次归档命名与完整性判断。

## 子项复核结论

- [维度16-01]: 子项复核通过。建议作为文档基线修复项优先处理。

## 最终保留项

| 编号  | 严重程度 | 文件                                | 一句话摘要                               |
| ----- | -------- | ----------------------------------- | ---------------------------------------- |
| 16-01 | P1       | `docs/skills/deep-audit-prompts.md` | deep-audit 归档示例仍遗漏 19/20 维文件名 |
