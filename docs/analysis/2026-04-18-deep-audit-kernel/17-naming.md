# 维度17：命名与术语一致性 — 初审报告

**审核日期**: 2026-04-18

## 发现

### [维度17-1] .ts 文件命名风格混用（camelCase vs kebab-case）— P2
- **文件**: flux-react/src中4个文件 + word-editor-renderers中1个文件
- **冲突**: useNodeImports.ts(camelCase) vs use-node-source-props.ts(kebab-case)
- **建议**: 统一为kebab-case

### [维度17-2] ApiObject vs ApiSchema 双词汇 — P2
- **文件**: packages/flux-core/src/types/schema.ts:102
- **现状**: `export type ApiObject = ApiSchema`，两者均被活跃使用
- **建议**: 统一为ApiSchema

### [维度17-3] 废弃类型别名仍在公共API导出 — P3
- **文件**: packages/flux-core/src/types/renderer-compiler.ts:6-7
- **冲突**: CompiledSchemaMeta vs NodeMetaProgram；CompiledNodeRuntimeState vs NodeRuntimeState
- **建议**: 标记@deprecated或移除

### [维度17-4] 陈旧dist引用已不存在的CompiledSchemaNode — P3
- **文件**: nop-debugger和flux-react的dist文件
- **建议**: 重新构建以清除陈旧产物

## 通过检查项

| 检查维度 | 结论 |
|---------|------|
| ScopeRef/scope/scopeRef | ✅ 一致 |
| RendererRuntime vs RendererEnv | ✅ 不同概念 |
| TemplateNode | ✅ 源码统一 |
| FormRuntime vs FormStoreApi | ✅ 不同概念 |
| create* 工厂前缀 | ✅ 一致 |
| register* 注册前缀 | ✅ 一致 |
| use* 仅用于hooks | ✅ 81个全部合法 |
| JSON schema key camelCase | ✅ 一致 |

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: .ts 文件命名风格混用 | **保留** | **成立**（5个 camelCase hook vs kebab-case 约定） | P2 |
| F2: ApiObject vs ApiSchema 双词汇 | **保留** | **成立**（两者活跃使用，ApiObject 偏消费端 ApiSchema 偏实现端） | P2 |
| F3: 废弃类型别名公共 API | **保留** | **成立**（零导入，死导出） | P3 |
| F4: 陈旧 dist 引用 | **保留** | **成立**（2+4 孤立 dist 文件） | P3 |
