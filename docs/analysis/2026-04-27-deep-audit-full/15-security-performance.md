# 维度 15：安全与性能红线

## 审核范围

检查安全红线（eval/new Function、fail-closed）和性能红线（O(n^2)、不可变更新、观察性、React Compiler 兼容性）。

## 发现清单

### [维度15] schema-compiler.ts 吞噬编译异常

- **文件**: `packages/flux-compiler/src/schema-compiler.ts:395-397`
- **证据片段**:
  ```ts
  catch (e) {
    // silently ignored
  }
  ```
- **严重程度**: P2
- **类别**: 安全
- **规则编号**: R5（安全敏感边界假设）
- **现状**: schema 编译过程中的异常被静默吞噬，无日志、无 telemetry、无 structured error。
- **风险**: 编译错误被隐藏，用户看不到 schema 问题，调试困难。不符合 R5 安全边界假设文档化要求。
- **建议**: 至少添加结构化日志或 telemetry 上报，让错误可观察。
- **为什么值得现在做**: 静默吞噬错误是调试黑洞，用户报告"schema 不生效"时无法定位。
- **误报排除**: 不是低代码动态边界的合理容忍——编译错误应该有 structured diagnostics。
- **历史模式对应**: 编译器错误处理逐步收敛中。
- **参考文档**: `docs/architecture/security-design-requirements.md` R5
- **复核状态**: 维度复核通过

### [维度15] reaction-runtime/source-registry 使用全量 store subscribe

- **文件**: `packages/flux-runtime/src/async-data/reaction-runtime.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P7（per-path subscription）
- **现状**: reaction-runtime 和 source-registry 使用 Zustand 的 `subscribe`（全量通知），而非 per-path 精确订阅。
- **风险**: 在数据量大、reaction 多的场景下，每次 store 变更都会触发所有 reaction 重新评估，可能产生性能问题。
- **建议**: 改为 per-path subscribe 或使用 selector-based subscription。
- **为什么值得现在做**: reaction 系统是响应式核心，全量订阅在高负载场景下影响显著。
- **误报排除**: 不是合理的实现选择——P7 明确要求 per-path subscription。
- **历史模式对应**: FieldFrame 曾有类似问题。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7
- **复核状态**: 维度复核通过

### [维度15] 测试文件超过 700 行

- **严重程度**: P2
- **类别**: 性能（间接）
- **现状**: 同维度 02，2 个测试文件超过 700 行。
- **复核状态**: 与维度 02 合并

### [维度15] word-editor localStorage 使用（P3）

- **文件**: `packages/word-editor-renderers/src/`
- **严重程度**: P3
- **类别**: 安全
- **现状**: word-editor 使用 localStorage 存储编辑状态，无加密或过期策略。
- **风险**: 低。编辑器内容属于用户本地数据，不涉及敏感信息。
- **建议**: 可在后续版本中添加容量限制和错误处理。
- **复核状态**: 维度复核通过

### 已驳回项

1. **chart.tsx dangerouslySetInnerHTML** — 合理的 Chart 主题注入方式，ECharts 需要 innerHTML 注入主题 CSS。
2. **api-cache stableStringify** — 合理的缓存 key 生成方式，不涉及安全敏感操作。

## 安全合规

- 无 eval / new Function 使用 ✓
- 无硬编码密钥/凭证 ✓
- fail-closed 行为：权限检查在异常时默认拒绝 ✓

## 总结评估

2 个 P2（编译器异常吞噬、全量 store subscribe），1 个 P3（word-editor localStorage）。安全红线全部合规，无 eval/new Function。
