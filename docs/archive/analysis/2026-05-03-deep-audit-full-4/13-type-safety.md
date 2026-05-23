# 维度13 类型安全与动态边界

- 初审发现数: 3
- 复核结果: 保留 2 / 降级 1 / 驳回 0

### [维度13] spreadsheet/report-designer host action provider 用 `any` 打穿命令边界

- **文件**: `packages/spreadsheet-renderers/src/page-renderer.tsx:49-68,99-110`, `packages/report-designer-renderers/src/page-renderer.tsx:51-91,127-146`
- **证据片段**:

```ts
const result = await dispatch({ type: `spreadsheet:${method}`, ...args } as any);
```

- **严重程度**: P1
- **分类**: 危险
- **现状**: namespaced host action 把 `Record<string, unknown>` 直接拼成命令对象，再 `as any` 下传到 core dispatch。
- **真实风险**: method/payload 漂移只能在更深 runtime 层才暴露，破坏 host capability 的静态边界。
- **建议**: 参照 `flow-designer` / `word-editor` 建显式 command adapter，先把 payload 映射成本地联合类型，再调用 core command union。
- **为什么值得现在做**: 这是 complex host family 的真实动态边界失守点。
- **误报排除**: 不是反对低代码动态性；问题在边界后面已存在精确命令类型却被 `any` 抹掉。
- **历史模式对应**: typed command boundary erased by provider glue。
- **参考文档**: `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/capability-projection-manifest.md`
- **复核状态**: `维度复核通过`

### [维度13] report-designer inspector shell 用 `props as any` 掩盖 schema/type 漂移

- **文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:52-55`, `packages/report-designer-renderers/src/report-designer-inspector.tsx:8-14`, `packages/report-designer-renderers/src/schemas.ts:30-35`
- **证据片段**:

```tsx
<ReportInspectorRenderer {...(props as any)} props={{ ...props.props, body: ... }} />
```

- **严重程度**: P2
- **分类**: 可疑
- **现状**: shell 通过 `as any` 直接伪装子 renderer props，同时 `body` 公开类型与实际消费的 `SchemaInput` 不一致。
- **真实风险**: 子 renderer 契约变更时缺少编译期保护，schema/public type 会持续偏离真实行为。
- **建议**: 显式构造子 renderer props，并把 `ReportInspectorSchema.body` 改成真实消费类型。
- **为什么值得现在做**: 这是运行时能工作、但类型系统和文档同时失真的典型入口。
- **误报排除**: 不是普通 props 重组；这里同时出现跨 schema 透传和公开类型漂移。
- **历史模式对应**: adapter hides contract mismatch with any.
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `维度复核通过`

### [维度13] `flux-code-editor` 已有精确配置类型却仍把 schema 字段写成 `any`

- **文件**: `packages/flux-code-editor/src/types.ts:27-44,50-178`
- **证据片段**:

```ts
expressionConfig?: any;
sqlConfig?: any;
```

- **严重程度**: P3
- **分类**: 可疑
- **现状**: 同文件已经定义并导出 `ExpressionEditorConfig` / `SQLEditorConfig`，但公开 schema 字段仍退化成 `any`。
- **真实风险**: 调用方失去补全和校验，公共类型说明力偏弱。
- **建议**: 让 `expressionConfig/sqlConfig` 直接使用已存在的精确类型；`options` 至少收紧到 `Record<string, unknown>`。
- **为什么值得现在做**: 这是低成本的公开类型收敛项。
- **误报排除**: 不是追杀所有开放 schema 袋子；这里只针对同文件已有精确类型却没接到公开面。
- **历史模式对应**: precise local type not connected to public schema.
- **参考文档**: `docs/components/code-editor/design.md`
- **复核状态**: `已降级`
