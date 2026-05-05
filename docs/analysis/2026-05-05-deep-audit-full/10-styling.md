# 维度 10：样式系统合规性

## 初审

- 初审保留 2 条。

## 维度复核

- 保留：palette 包外依赖 playground 私有 gradient。
- 保留：当前 gradient-by-id 方案覆盖不完整。
- 降级：playground legacy BEM CSS 仍被全局导入，但更偏示例层技术债。

## 最终结论

### [维度10] flow designer palette 依赖 playground 私有 gradient 样式

- **文件**: `packages/flow-designer-renderers/src/designer-palette.tsx:109-113`, `apps/playground/src/styles-theme-utilities.css:40-62`
- **证据片段**:
  ```tsx
  className={cn('w-8 h-8 ...', `nop-gradient-${nt.id}`)}
  ```
- **严重程度**: P1
- **现状**: reusable package 里的视觉依赖落在 `apps/playground` 私有样式里。
- **风险**: 脱离 playground 时 palette 图标底色丢失。
- **建议**: 将 gradient/appearance 迁回 package 样式入口或由 `config.nodeTypes[].appearance` 驱动。
- **参考文档**: `docs/architecture/theme-compatibility.md`, `docs/architecture/styling-system.md`
- **复核状态**: `维度复核通过`

### [维度10] palette 的 `id -> gradient` 视觉映射覆盖不完整

- **文件**: `apps/playground/src/styles-theme-utilities.css:40-62`, `apps/playground/src/schemas/dingtalk-workflow-tree-schema.json:96-326`, `apps/playground/src/schemas/action-flow-tree-schema.json:116-226`
- **证据片段**:
  ```css
  .nop-gradient-start { ... }
  .nop-gradient-end { ... }
  .nop-gradient-task { ... }
  ```
- **严重程度**: P2
- **现状**: 真实 node type id 多于已定义 gradient 类。
- **风险**: 部分 palette 节点当前就会落到无匹配视觉类的路径。
- **建议**: 统一 node appearance 映射规则，不再依赖不完整的硬编码 class 集。
- **参考文档**: `docs/architecture/flow-designer/design.md`
- **复核状态**: `维度复核通过`

### [维度10] playground 仍全局导入 legacy BEM 风格 flow designer CSS

- **文件**: `apps/playground/src/styles-theme-utilities.css:1`, `apps/playground/src/flow-designer-nodes.css:13-217`
- **证据片段**:
  ```css
  @import './flow-designer-nodes.css';
  .nop-dt-node--initiator .nop-dt-node__header { ... }
  ```
- **严重程度**: P3
- **现状**: legacy BEM 选择器仍存在于示例层全局导入链路。
- **风险**: 持续和当前 marker/data-slot 协议并行，增加迁移噪音。
- **建议**: 作为 playground 样式技术债单独收口，不升级为 package 主缺陷。
- **参考文档**: `docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: `已降级`
