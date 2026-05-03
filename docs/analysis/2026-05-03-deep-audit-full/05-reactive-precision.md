# 维度 05：响应式订阅精度

## 初审摘要

- 初审发现 7 条订阅过宽/额外写回线索，集中在 broad selector、whole-scope 订阅和 host status publication。

## 维度复核结论

- 5 条保留，2 条降级。
- 其中 `use-node-source-props` 重复触发 source controller、report-designer whole own-scope 订阅、designer toolbar full snapshot、spreadsheet/report status publish 依赖过宽均为高信号线索。

## 归档说明

- 本维度已完成独立维度复核。
- 由于其中多条会驱动实现调整，仍需后续子项复核后再纳入全局汇总；本文件仅存档线索与复核状态。
