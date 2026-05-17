# 维度 17：命名与术语一致性

## 第 1 轮（初审）

### [维度17-01] active examples 仍使用 `visibleOn`，但当前规范已把 `xxxOn` 视为非规范写法

- **文件**: `docs/examples/action-flow-tree.md:479`；`docs/examples/dingtalk-workflow-tree.md:397,403`
- **证据片段**:
  ```md
  "visibleOn": "data.when != null"
  ```
- **严重程度**: P1
- **现状**: active example doc 仍教授 `visibleOn`，而 `flux-json-conventions.md` 已要求用 base field + `${...}`。
- **风险**: 新 schema author 会从 active examples 学到被当前规范否定的词汇/写法。
- **建议**: 统一改成 `visible: "${...}"`。
- **为什么值得现在做**: 这是用户最容易 copy-paste 的 active examples。
- **误报排除**: 不涉及 archive / AMIS 比较材料；仅针对 active examples。
- **历史模式对应**: active example teaches deprecated vocabulary。
- **参考文档**: `docs/references/flux-json-conventions.md`
- **复核状态**: 未复核

### [维度17-02] alert 组件文档仍用根字段 `variant`，但架构词汇已把 alert severity 定义为 `level`

- **文件**: `docs/components/alert/design.md:10,20,25`；`docs/components/alert/example.json:3`
- **证据片段**:
  ```md
  建议正式字段为 variant、title、body、actions、icon、closable。
  ```
- **严重程度**: P1
- **现状**: active component docs 与 `variant-vocabulary.md` 对 alert severity 词汇不一致。
- **风险**: component docs、architecture docs 和未来 renderer 实现会围绕两个不同字段名分叉。
- **建议**: 统一到一个 canonical 词汇，优先对齐 architecture 中的 `level`。
- **为什么值得现在做**: 这是术语层面的当前基线冲突。
- **误报排除**: 不涉及按钮内部 `variant` 等其他上下文；仅针对 alert renderer 自身 severity 字段。
- **历史模式对应**: dual vocabulary in active docs。
- **参考文档**: `docs/architecture/variant-vocabulary.md`
- **复核状态**: 未复核

### [维度17-03] `dataPath` 兼容接受已在复核中驳回，不进入最终保留项

- **文件**: `packages/flux-code-editor/src/types.ts:188-193`
- **证据片段**:
  ```ts
  export function resolveSourceRefPath(sourceRef: {
    path?: string;
    /** @deprecated Use path instead. */
    dataPath?: string;
  }): string | undefined {
  ```
- **严重程度**: P3
- **现状**: code 仍保留 `dataPath` fallback，但 active docs/examples 已收敛到 `path`。
- **风险**: 若误保留为最终问题，会把显式 deprecated compatibility 当成未收口 naming defect。
- **建议**: 驳回，不进入最终保留项。
- **为什么值得现在做**: 维持最终报告只包含 active-doc/live-contract 冲突。
- **误报排除**: 这是有意兼容层且未见 active docs 持续教授 `dataPath`。
- **历史模式对应**: deprecated compatibility correctly rejected。
- **参考文档**: `docs/references/flux-json-conventions.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度17-01]：保留 (P1)。active examples 的命名/写法漂移成立。
- [维度17-02]：保留 (P1)。alert severity 词汇在 active docs 中冲突。
- [维度17-03]：驳回。`dataPath` 兼容接受属于显式 deprecated fallback。

## 最终保留项

| 编号  | 严重程度 | 文件                                    | 一句话摘要                                                    |
| ----- | -------- | --------------------------------------- | ------------------------------------------------------------- |
| 17-01 | P1       | `docs/examples/action-flow-tree.md:479` | active examples 仍教授 `visibleOn`                            |
| 17-02 | P1       | `docs/components/alert/design.md:20`    | alert severity 在 active docs 中同时使用 `variant` 与 `level` |
