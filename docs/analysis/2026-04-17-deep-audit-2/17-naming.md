# [维度17] 命名与术语一致性 — 初审报告

## 发现清单

### P2 级（2 项）
1. **flux-react/src hook 文件名混用**: useNodeImports.ts (camelCase) vs use-node-source-props.ts (kebab-case) — 应统一为 kebab-case
2. **子目录 React 组件文件名混用**: ConditionBuilder.tsx, TablePaginationBar.tsx 等 (PascalCase) vs 同包根目录 kebab-case — 应统一

### P3 级（2 项）
3. **废弃别名** CompiledSchemaMeta / CompiledNodeRuntimeState 仍导出
4. **测试辅助** createScope 应为 createScopeRef 或 createTestScopeRef

## 确认一致项
- ScopeRef/RendererRuntime/FormRuntime 命名清晰
- create*/register*/use* 模式统一
- Context 命名统一
- 跨包 Store 命名分层一致
