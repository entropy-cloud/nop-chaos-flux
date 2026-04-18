# [维度16] 文档-代码一致性 — 初审报告

## 发现清单

### P2 级（4 项）— 全部为 owner 漂移

1. **flux-runtime-module-boundaries.md**: 16 个文件/目录未纳入所有权映射（runtime-factory.ts, form-runtime-*.ts 系列, schema-compiler/ 目录等）
2. **form-runtime.ts 所有权过时**: 职责已拆分到独立模块但文档未更新
3. **index.ts 入口描述不符**: 实际仅 18 行 re-export，工厂在 runtime-factory.ts
4. **schema-compiler 子目录未记录**: 9 个子模块未反映在文档中

### P3 级（2 项）
5. **terminology.md** RendererHelpers 缺少 executeSource 方法描述
6. **terminology.md** RendererComponentProps 缺少 id/path/templateNode 字段

## 无漂移项
- AGENTS.md 包结构与实际完全匹配
- docs/plans/ 全部已收敛（无活跃计划）
- 核心术语定义与代码一致
