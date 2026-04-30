# 18 跨包模式一致性

## 复核结论

- 保留: 1
- 降级: 1
- 驳回: 1

## 保留

### report designer fallback string policy 与 peer domain 不一致

- 文件: `packages/report-designer-renderers/src/report-designer-inspector.tsx`, `packages/report-designer-renderers/src/field-panel-renderer.tsx`
- 结论: 保留，P2
- 依据: 同包内其他 renderer 已大量使用 `flux.reportDesigner.*`；这里只保留硬编码英文 fallback，造成跨包与包内都不一致。

## 已降级

### `flux-code-editor` registration helper 与 common helper style 不同

- 文件: `packages/flux-code-editor/src/index.ts`
- 结论: 已降级
- 依据: outward contract 仍是 definitions array + register 函数；差异只在 helper 实现风格。

## 已驳回 / 重述

### word editor i18n namespace 破坏 `flux.*` 规则

- 结论: 驳回原说法，重述为低优先级 key-style inconsistency
- 依据: `t('wordEditor.*')` 与 `t('flux.wordEditor.*')` 最终都归入同一 `flux` namespace；真实问题是同包内 key 写法不统一，而不是命名空间 wiring 坏掉。
