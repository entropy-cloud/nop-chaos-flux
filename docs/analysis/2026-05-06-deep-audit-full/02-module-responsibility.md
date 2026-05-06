# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

### P2 发现（2 个）

### [维度02] schema-compiler.ts 633行：compileSingleNode 混合所有节点编译步骤

- **文件**: `packages/flux-compiler/src/schema-compiler.ts`（633行）
- **严重程度**: P2
- **现状**: `compileSingleNode` 326行（185-511），包含字段分类、regions构建、props/action/lifecycle编译、scope plan、classAliases、imports plan、provider wrap、validation model、named action、source/reaction 等全部步骤。
- **建议**: 将 namedActionPlans 构建、importsPlan 构建、providerWrap 构建等段提取到 schema-compiler/ 子目录已有模块中。

### [维度02] form-store.ts 509行：三个不相关的 store 工厂共置

- **文件**: `packages/flux-runtime/src/form-store.ts`（509行）
- **严重程度**: P2
- **现状**: `createFormStore`（331行，含路径订阅系统）、`createPageStore`（26行）、`createSurfaceStore`（80行）三个独立工厂共置。路径订阅系统占文件 44%。
- **建议**: 将 `createPageStore` 和 `createSurfaceStore` 分别提取到 `page-store.ts` 和 `surface-store.ts`。

### P3 观察项（12 个）

| 文件 | 行数 | 说明 |
|------|------|------|
| runtime-factory.ts | 558 | orchestrator，prepareSchema 可提取 |
| hooks.ts | 539 | hooks 集合，职责单一 |
| form-runtime.ts | 511 | FormRuntime 组装层 |
| designer-xyflow-canvas.tsx | 577 | canvas 组件事件桥接 |
| spreadsheet-grid.tsx | 565 | 表格网格渲染组件 |
| word-editor-page.tsx | 538 | 编辑器页面 orchestrator |
| designer-page.tsx | 532 | designer 页面 orchestrator |
| parser.ts | 534 | 递归下降解析器，无需拆分 |
| reaction-runtime.ts | 523 | reaction 注册+registry |
| form-runtime-validation.ts | 523 | 验证执行引擎 |
| styles-css.ts | 505 | 纯 CSS 常量 |
| report-designer-demo.tsx | 505 | Playground demo |

### 正面发现

- 所有包 index.ts 为纯 re-export，无实现泄漏
- 编译器已提取 13 个子模块到 schema-compiler/ 目录
- 模块边界文档与代码一致
- 无非测试源码文件超过 700 行硬限制
