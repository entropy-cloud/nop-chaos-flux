# 维度 03：API 表面积与契约一致性

## 审核范围

检查所有包的公开导出接口、exports map 一致性、跨包契约匹配。

## 发现清单

### [维度03] spreadsheet 包使用 .js 后缀导入

- **文件**: `packages/spreadsheet-core/src/`, `packages/spreadsheet-renderers/src/`
- **证据片段**:
  ```ts
  import { xxx } from './some-module.js';
  ```
- **严重程度**: P2
- **现状**: spreadsheet 包（spreadsheet-core 和 spreadsheet-renderers）在内部导入中使用 `.js` 后缀，而项目其他所有包均不使用此后缀。
- **风险**: 不一致的风格增加新开发者困惑。在 Vite + pnpm workspace 环境下功能正常，但如果构建工具链变化可能产生问题。
- **建议**: 统一移除 `.js` 后缀以匹配项目其余部分。
- **为什么值得现在做**: 低成本一致性改进。
- **误报排除**: 不是 ESM 规范要求——项目使用 Vite 解析，无需 `.js` 后缀。
- **历史模式对应**: 项目统一使用无后缀导入。
- **参考文档**: AGENTS.md "ESM-first"
- **复核状态**: 维度复核通过

### [维度03] flux-react re-export flux-runtime 类型（已驳回）

- **现状**: 初审标记为问题，但复核确认这是有意设计——flux-react 作为渲染层需要透传 runtime 类型给消费者。
- **复核状态**: 已驳回

### [维度03] PathBinding 类型文档覆盖（已驳回）

- **现状**: 初审认为 PathBinding 类型缺少文档，但复核确认该类型已在 architecture docs 中有充分描述。
- **复核状态**: 已驳回

### [维度03] theme-tokens 空导出（已驳回）

- **现状**: theme-tokens 包的 index.ts 几乎为空，但这是正确设计——该包只提供 CSS 变量，不导出 JS 运行时。
- **复核状态**: 已驳回

## 总结评估

API 表面积整体收敛良好。1 个 P2 一致性问题（spreadsheet .js 后缀）。3 个初审发现经复核后驳回。无 P0/P1 问题。
