# 01 依赖图与包边界

- 初审发现数: 0
- 维度复核: 完成
- 子项复核: 1
- 最终结果: 保留 1 / 降级 0 / 驳回 0

## 初审结论

- 零发现。初审确认当前 `packages/*/package.json` 依赖图、根导出风格、`*-core -> *-renderers` 边界、以及跨包私有 `src` 路径导入总体合规。
- 维度复核同意“`flux-runtime -> flux-compiler/flux-action-core` 是当前正式架构，不应判为违规”。

## 复核保留

### [维度01] workspace manifest 校验脚本误报合法子路径依赖

- **文件**: `scripts/check-workspace-manifest-deps.mjs:10,60,101`
- **证据片段**:
  ```js
  const workspaceImportPattern = /from\s+['"](@nop-chaos\/[^'"]+)['"]/g;
  imports.add(match[1]);
  if (!declared.has(specifier)) {
  ```
- **严重程度**: P1
- **现状**: 脚本直接拿完整 specifier 做依赖比对，会把 `@nop-chaos/flux-react/unstable` 这类合法导出子路径误判为“缺少依赖声明”。
- **风险**: 依赖治理工具持续误报，深度审核和 CI 会把合法公开子路径使用误当成包边界违规。
- **建议**: 在脚本里先把 workspace import 归一化到包根名，再和 `package.json` 依赖集合比对。
- **为什么值得现在做**: 这是当前边界治理自动化的误报源，已经会干扰人工审计和后续依赖规则收敛。
- **误报排除**: `packages/flux-react/package.json` 已明确导出 `./unstable`，相关消费包也都声明了根包 `@nop-chaos/flux-react`；这里是工具缺陷，不是真实越界。
- **历史模式对应**: 自动化校验与导出子路径模型不一致。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 子项复核通过

## 复核说明

- 已复核关键文件：`AGENTS.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`packages/flux-runtime/package.json`、`packages/flux-react/package.json`、`packages/*/package.json`。
- 未发现需报告的真实跨包 `src` 私有路径导入或 `*-core -> *-renderers` 反向依赖。
