# 维度 17：命名与术语一致性

- 初审发现：2
- 维度复核：完成
- 子项复核：建议继续围绕 stale dist/public typings 与 legacy action naming 透明度展开

## 保留

1. [维度复核通过] 仓库中的 stale `dist/*.d.ts` 仍泄漏旧术语 `CompiledSchemaNode`，与 live 源码/文档已统一的 `TemplateNode` 基线不一致。

2. [维度复核通过] 旧写入字段兼容（`componentPath`、顶层 `value/values` 等）的文档透明度不足；参考约定与兼容实现之间没有完全讲清 owner precedence。

## 降级

1. [已降级] `action-compiler.ts` 对旧命名的兼容不宜直接定性为“正式契约已统一、代码偷偷偏离”；更准确地说，是参考文档、类型契约与兼容实现三层尚未完全对齐。

## 复核摘要

- 保留：2
- 降级：1
- 驳回：0
