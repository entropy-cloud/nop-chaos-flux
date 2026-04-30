# 维度 15：安全与性能红线

## 初审概览

- 初审候选：2
- 维度复核：1 条保留，1 条降级

## 条目复核

### [降级] range field drop 存在平方级放大

- **关键文件**: `packages/report-designer-core/src/runtime/metadata.ts`
- **说明**: 问题成立，但更准确地说是重复复制当前 sheet 的 cell metadata 表，而非每次复制整张全局 metadata map。

### [保留] `stopWhen` 求值异常被吞掉并继续轮询

- **关键文件**: `packages/flux-runtime/src/data-source-runtime.ts:415-425,561-563,622-628`
- **说明**: 异常对外不可观测，且退化行为是静默继续执行。
