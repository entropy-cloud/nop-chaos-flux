# 维度 12：表单字段与 Slot 建模

## 第 1 轮（初审）

初审发现 3 项，独立复核后均保留。

## 维度复核结论

- [12-01]: 保留为 P2。FieldFrame chrome 读取 raw schema。
- [12-02]: 保留为 P1。deep region 编译缺 `$slot` 符号表。
- [12-03]: 降级保留为 P2。deep normalizers 仍在 compiler 表。

## 最终保留项

| 编号  | 严重程度 | 文件                                                          | 一句话摘要                                      |
| ----- | -------- | ------------------------------------------------------------- | ----------------------------------------------- |
| 12-01 | P2       | `packages/flux-react/src/node-frame-wrapper.tsx`              | FieldFrame 部分输入绕过 resolved props          |
| 12-02 | P1       | `packages/flux-compiler/src/schema-compiler/node-compiler.ts` | deep parameterized region 缺 `$slot` 编译上下文 |
| 12-03 | P2       | `packages/flux-compiler/src/schema-compiler/tables.ts`        | deep region rules 所有权仍在 compiler 表        |
