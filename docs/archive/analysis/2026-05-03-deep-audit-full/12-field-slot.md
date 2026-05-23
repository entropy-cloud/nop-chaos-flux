# 维度 12：表单字段与 Slot 建模

## 初审摘要

- 初审发现 3 条线索：`report-inspector.body` 元数据与运行时消费不一致，`code-editor` 在 `wrap:true` 下重复绑定 meta，多个 form-advanced renderer 内层重复 `field-control` / `testid` / `cid`。

## 维度复核结论

- `report-inspector.body` 错分为 `prop` 但按 schema/slot 渲染，保留。
- `code-editor` 的 wrapper owner 冲突，保留。
- form-advanced 相关问题需要拆成多个子项复核，因此整体降级为“拆分后继续跟进”的模式化问题。

## 归档说明

- 本维度已完成独立维度复核。
- 仍需对 form-advanced 的三类子模式分别复核后再进入 summary。
