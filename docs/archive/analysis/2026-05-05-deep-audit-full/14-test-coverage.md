# 维度 14：测试覆盖与质量

## 初审

- 初审提出 4 条：report designer e2e 闭环缺口、`flux-action-core` 缺少 coverage threshold、重复 e2e setup、`action-dispatcher.test.ts` 过大。

## 维度复核

- 保留：`flux-action-core` 缺少与 runtime/compiler 一致的 coverage threshold 治理。
- 降级：report designer 关键路径 e2e 不足、重复 setup 膨胀。
- `action-dispatcher.test.ts` 过大已在维度02记账，这里不重复升级。

## 最终结论

### [维度14] `flux-action-core` 缺少 coverage threshold 治理闸门

- **文件**: `packages/flux-action-core/vitest.config.ts:1-5`, `packages/flux-runtime/vitest.config.ts:5-15`, `packages/flux-compiler/vitest.config.ts:5-15`
- **证据片段**:
  ```ts
  export default createSharedVitestConfig({ environment: 'node' });
  ```
- **严重程度**: P2
- **现状**: 同属核心链路的 `flux-runtime` 与 `flux-compiler` 都有 80/80/80/80 coverage threshold，但 `flux-action-core` 没有。
- **风险**: 回归保护面退化时缺少与相邻核心包一致的治理闸门。
- **建议**: 为 `flux-action-core` 补齐 coverage threshold，或明确记录例外理由。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: `维度复核通过`

### [维度14] report designer 的关键用户路径缺少 e2e 闭环

- **文件**: `docs/architecture/report-designer/design.md:248-255`, `tests/e2e/report-designer-demo.spec.ts:11-112`
- **证据片段**:
  ```md
  用户从字段面板拖拽字段 -> ... -> report-designer:dropFieldToTarget -> ...
  ```
- **严重程度**: P3
- **现状**: 包内单测/集成测存在，但字段拖拽到 cell、import/export、完整 inspector->canvas 闭环的 e2e 仍偏弱。
- **风险**: 多包协作路径更容易在真实 UI 集成中回归。
- **建议**: 按拖拽、round-trip、inspector/canvas 三条链路补高层测试。
- **参考文档**: `docs/architecture/report-designer/design.md`
- **复核状态**: `已降级`

### [维度14] 多个 e2e 文件重复登录/启动前置

- **文件**: `tests/e2e/word-editor.spec.ts`, `tests/e2e/word-editor-template-expr.spec.ts`, `tests/e2e/word-editor-dataset.spec.ts`, `tests/e2e/flow-designer-ui.spec.ts`
- **证据片段**:
  ```ts
  // repeated sign-in / open-page setup across multiple specs
  ```
- **严重程度**: P3
- **现状**: 多个 spec 复制了近似相同的登录与页面启动逻辑。
- **风险**: 增加 flaky 面与维护成本，但当前更偏测试 hygiene。
- **建议**: 后续抽成 shared Playwright helper / fixture。
- **参考文档**: `AGENTS.md`
- **复核状态**: `已降级`
