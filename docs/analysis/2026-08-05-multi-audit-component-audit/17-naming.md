# 维度 17: 命名与术语一致性（component-audit mission 多维审计）

> Mission: component-audit | 初审轮次: R1（sub-agent `ses_02c80f6afffexBdD3gc73mjMPe`）

## 第 1 轮（初审）

### [维度17-1] 新概念未进 terminology.md（TB/LR、受控当前事件、WorkbenchShell、TreeDocument）

- **文件**: `docs/references/terminology.md`（无 TB/LR/timeline/graph/WorkbenchShell/TreeDocument 词条）vs `docs/architecture/flow-designer/tree-mode.md:144`（direction TB|LR）、`:275-283`（MIN_SPLIT_GAP）、`docs/components/timeline/design.md:11`、`docs/architecture/designer-workbench-shell.md:72`、`packages/flux-react/src/index.tsx:91`（WorkbenchShell 导出）
- **严重程度**: P2
- **证据片段**: TB/LR 出现在 3+ 架构文档（tree-mode.md、dingflow-visual-spec.md、graph/design.md）；"受控当前事件"横跨 timeline design + steps 同构说明；WorkbenchShell 是 flux-react 公共导出。
- **现状**: terminology.md 宣称"defines the most important terms used across the active flux architecture documents"，4 个跨文件高频新词均无词条；维护清单 Quick Review Questions 第 5 问未被 G1/G2/453 计划执行。
- **建议**: 补 4-6 条词条（TB/LR、受控当前事件、WorkbenchShell、TreeDocument/TreeDocumentSession）。
- **误报排除**: 维度 17 步骤 7 显式要求核查；这是维护清单未执行的合规性缺口。

### [维度17-2] graph 事件 payload 的 type 字段命名与命名空间约定不一致（design.md §8.1 未含该字段）

- **文件**: `packages/flux-renderers-graph/src/graph-renderer.tsx:152-157` vs `docs/components/graph/design.md:165-171` vs `docs/architecture/renderer-runtime.md:697-700`（要求命名空间 type，如 ai:conversation-click）
- **严重程度**: P2
- **证据片段**:
  ```ts
  const fullPayload: GraphNodeSelectionPayload = { type, nodeId, node }; // type='onNodeClick' 字段名
  // design.md: "| onNodeClick | { nodeId, node }（node 为完整节点数据）|"
  ```
- **现状**: 实现带 type 但用事件字段名（onNodeClick）而非命名空间语义值（graph:node-click）；design.md payload 表未含 type 字段。
- **风险**: 事件监控/调试器无法从 type 区分来源域；文档与实现 shape 不一致。
- **建议**: design.md §8.1 补 type 字段说明；如命名空间化需与 normalizeActionEvent 'custom' 合成规则对齐。
- **误报排除**: 校准模式 10（跨包一致性）范畴，但新包趁新统一成本最低。

### [维度17-3] utils vs helpers 双命名并存（观察项）

- **文件**: `packages/flux-renderers-basic/src/utils.ts`、`packages/flux-renderers-form/src/renderers/date/date-utils.ts` vs `packages/flux-renderers-data/src/tree-node-helpers.ts`、`packages/flux-renderers-scheduling/src/kanban/kanban-helpers.ts`、`packages/flux-renderers-form/src/field-utils/`
- **严重程度**: P2（观察项，2026-05-24 命名审计已核查未列缺陷）
- **现状**: 同一家族内 _-utils.ts 与 _-helpers.ts 并存；quick-reference.md:52 只对测试文件命名定约。
- **建议**: 如 CR Phase 4 做命名治理可一次性定约；否则维持观察。
- **误报排除**: 校准模式 10——"包 B 与包 A 不同"不构成当前缺陷，仅记录。

## 维度 17 其余核查结论（R1）

- ScopeRef/scope、RendererRuntime/runtime/env、templateNode（CompiledSchemaNode 全仓零引用）、FormStoreApi/FormRuntime、PageStoreApi/PageRuntime 全部与 terminology 一致。
- dataPath 零残留；itemsSource 零代码残留；schema 事件字段全部 onXxx。
- camelCase/namespace:suffix/kebab-case 图标约定一致；registerXxxRenderers 与 create* 前缀一致；文件命名全部 *-renderer.tsx + \*.test.ts(x)。
- 跨包命名空间 designer:/report-designer:/spreadsheet: 一致；graph 包 schema 类型与 design.md 一致。

## 维度复核结论

R2 复核完成（2026-08-06，plan `2026-08-06-0556-1` Phase 1），裁决见 `docs/audits/multi-audit-r2-verdicts.md`：17-1 属实（terminology.md 缺 4 条词条，本 plan 内已补 TB/LR、TreeDocument/TreeDocumentSession、受控当前事件、WorkbenchShell）；17-2 属实（graph payload type 命名空间不一致，successor 登记至 graph G1 plan 链）；17-3 维持观察（keep）。
