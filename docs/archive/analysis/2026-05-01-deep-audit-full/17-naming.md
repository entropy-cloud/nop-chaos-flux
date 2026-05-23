# 17 命名与术语一致性

## 复核结论

- 保留: 2
- 降级: 2
- 驳回: 0

## 保留

### `name` vs `dataPath` 仍在活跃文档与审核手册中并存

- 文件: `docs/architecture/api-data-source.md`, `docs/references/terminology.md`, `docs/skills/deep-audit-prompts.md`
- 结论: 保留，P1
- 依据: live code 已收敛到 `name`，但 active docs 与 audit guidance 仍持续提及 `dataPath`。

### `CompiledSchemaNode` 仍出现在活跃审核指导中

- 文件: `docs/skills/deep-audit-prompts.md`
- 结论: 保留，P2
- 依据: architecture baseline 已明确当前术语为 `TemplateNode`，audit prompt 仍要求检查 `CompiledSchemaNode / compiledNode / templateNode`。

## 已降级

### `closeSurface` vs `closeDialog`

- 文件: `docs/references/flux-json-conventions.md`, `docs/references/terminology.md`
- 结论: 已降级
- 依据: live runtime 明确支持 alias；问题集中在 reference doc 没把“首选 `closeSurface`”说清楚。

### `action-backed` vs `API-backed`

- 文件: `docs/architecture/api-data-source.md`, `docs/references/terminology.md`
- 结论: 已降级
- 依据: 更像作者视角与执行路径视角混写，而非 live code 双词汇冲突。
