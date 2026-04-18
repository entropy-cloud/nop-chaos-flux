# 深度审核汇总报告

## 审核范围

- **执行的维度**: 01, 02, 03, 04, 05, 06, 07, 09, 10, 14, 15, 16, 17 (共13个维度)
- **覆盖的包**: 所有 22 个 workspace packages
- **审核日期**: 2026-04-17
- **执行方式**: 每个维度一个初审子 agent + 关键发现独立复核子 agent

## 复核统计

- **初审发现总数**: 47
- **已独立复核条目数**: 8 (关键 P2 发现)
- **保留**: 8
- **降级**: 0
- **驳回**: 0

---

## P0 清单（必须修复）

| 维度 | 文件 | 问题 | 说明 |
|------|------|------|------|
| 02 | `packages/flux-runtime/src/data-source-runtime.ts` | 超过 700 行限制 (681行) | 混合 6 个独立职责，必须拆分 |

---

## P1 清单（应尽快修复）

| 维度 | 文件 | 问题 | 说明 |
|------|------|------|------|
| 02 | `packages/flux-runtime/src/schema-compiler/shape-validation.ts` | 超过 500 行 (596行) | 需评估拆分 |
| 02 | `packages/flow-designer-renderers/src/designer-page.tsx` | 超过 500 行 (520行) | 需评估拆分 |

---

## P2 清单（按文件分组）

### 架构与模块边界

| 维度 | 文件 | 问题 |
|------|------|------|
| 01 | `packages/ui/package.json:30` | ui 包在 dependencies 中声明了 flux-i18n，违反独立 UI 层设计 |
| 02 | `packages/flux-renderers-basic/src/index.tsx` | 入口文件包含 180+ 行渲染器定义，应提取到 definitions.ts |
| 02 | `packages/flux-renderers-data/src/index.tsx` | 入口文件包含验证逻辑实现，应提取 |
| 03 | `packages/word-editor-core/src/index.ts` | 直接 re-export 第三方库类型，泄露实现细节 |
| 03 | `packages/flux-renderers-form/package.json` | test-support 导出到生产 API |
| 03 | `packages/flux-react/src/index.tsx` | 导出内部 Context 对象 |

### 运行时与状态

| 维度 | 文件 | 问题 |
|------|------|------|
| 05 | `packages/word-editor-renderers/src/WordEditorPage.tsx:70-87` | runtimeSnapshot 选择器每次返回新对象，缺少 equalityFn |
| 05 | `packages/flux-renderers-basic/src/loop.tsx:18-28` | renderBody 函数引用不稳定 |
| 06 | `packages/report-designer-core/src/core.ts:142-201` | refreshDerivedState 缺乏取消机制，存在竞态风险 |
| 07 | `packages/flux-renderers-basic/src/dynamic-renderer.tsx:31-58` | API 获取逻辑在 effect 中，应移至 runtime 层 |
| 07 | `packages/flux-code-editor/src/source-resolvers.ts:58-120` | 同上 |
| 07 | `packages/flux-react/src/use-node-source-props.ts:26-28` | effect 缺少依赖数组 |

### 性能

| 维度 | 文件 | 问题 |
|------|------|------|
| 15 | `packages/report-designer-core/src/runtime/metadata.ts:10-12` | cloneDocument 使用 JSON.stringify/parse 深拷贝 |

### 样式系统

| 维度 | 文件 | 问题 |
|------|------|------|
| 10 | `packages/flow-designer-renderers/src/designer-inspector.tsx:8-23` | 硬编码颜色值 |
| 10 | `packages/flow-designer-renderers/src/dingflow/*.tsx` | 多处硬编码颜色值 |

### 测试覆盖

| 维度 | 包 | 问题 |
|------|------|------|
| 14 | `flux-core` | 测试覆盖率仅 14.3% |
| 14 | `ui` | 测试覆盖率仅 2.7% |
| 14 | `flux-formula/compile.ts` | 无直接单元测试 |
| 14 | `flux-runtime/schema-compiler/` | 子模块测试薄弱 |

### 文档与命名

| 维度 | 文件 | 问题 |
|------|------|------|
| 16 | `AGENTS.md:34-51` | 依赖流描述与实际代码不一致 |
| 17 | `packages/flux-core/src/types/runtime.ts:320` | FormRuntime.setValue 参数名 `name` 应改为 `path` |
| 17 | `.d.ts files` | CompiledSchemaNode 类型别名残留 |

---

## 高频问题文件

以下文件在多个维度中被报告：

| 文件 | 涉及维度 | 问题类型 |
|------|---------|----------|
| `packages/flux-runtime/src/data-source-runtime.ts` | 02 | 超大文件 |
| `packages/word-editor-renderers/src/WordEditorPage.tsx` | 05 | 订阅精度 |
| `packages/report-designer-core/src/core.ts` | 06, 15 | 竞态、性能 |
| `packages/flow-designer-renderers/src/dingflow/*` | 10 | 样式硬编码 |

---

## 跨维度模式（多个维度报告的同类问题）

### 模式 1: 数据获取逻辑在 React effect 中

- **涉及维度**: 06, 07
- **涉及文件**: dynamic-renderer.tsx, source-resolvers.ts, useSourceValue.ts
- **建议**: 统一将 API 请求逻辑下沉到 runtime 层，React 层只负责订阅结果

### 模式 2: 第三方库类型泄露

- **涉及维度**: 03
- **涉及文件**: word-editor-core/index.ts, canvas-editor-bridge.ts
- **建议**: 创建本地类型包装，隔离第三方依赖

### 模式 3: 入口文件包含实现逻辑

- **涉及维度**: 02, 03
- **涉及文件**: flux-renderers-basic/index.tsx, flux-renderers-data/index.tsx
- **建议**: 入口文件仅做 re-export，实现提取到独立模块

---

## 已自动化的检查项

以下检查已被 lint/check 脚本覆盖，不需要人工跟进：

1. **文件大小限额**: `pnpm check:oversized-code-files` + ESLint `max-lines: 700`
2. **BEM 命名检测**: 未发现违规
3. **cn() 使用**: 核心渲染器已统一使用
4. **Tailwind @source 覆盖**: 已正确配置

---

## 建议新增的自动化检查

1. **入口文件纯净度检查**: 检测 index.ts/index.tsx 中是否包含超过 50 行的实现逻辑
2. **第三方类型直接导出检测**: 检测 `export type { ... } from '非 @nop-chaos/* 包'`
3. **useEffect 依赖完整性**: 已有 ESLint exhaustive-deps，确保启用
4. **硬编码颜色值检测**: 检测 `#[0-9a-fA-F]{3,8}` 在 className 或 style 中的使用

---

## 可暂缓项

以下问题有真实风险但当前 ROI 不高：

| 维度 | 问题 | 原因 |
|------|------|------|
| 15 | TableRenderer/TreeRenderer 缺少虚拟化 | 当前数据规模有限，分页机制缓解 |
| 15 | 缺少 performance.mark/measure | 增强型需求，非阻塞 |
| 14 | flux-i18n 无测试 | 封装 i18next，逻辑简单 |

---

## 误报排除清单

以下初审发现经复核后确认为设计合理，不建议修改：

| 维度 | 发现 | 排除原因 |
|------|------|----------|
| 04 | VariantField 使用 useState 维护变体状态 | 符合"局部 UI 状态不构成违规"规则 |
| 04 | DesignerXyflowCanvas 的 localNodes/localEdges | react-flow 集成的标准模式 |
| 04 | SpreadsheetGrid 的滚动位置 useState | 纯 UI 渲染状态 |
| 04 | DetailField 的 draftForm | 符合 Phase 2 草稿隔离模式 |
| 09 | 渲染器内部布局样式 | 交互组件的 UI 壳层需要 |
| 10 | parser.ts 510 行 | 递归下降解析器的内聚单元，拆分会破坏可读性 |

---

## 整体评估

### 健康度评分

| 维度类别 | 评分 | 说明 |
|----------|------|------|
| 架构与模块边界 | B+ | 21/22 包依赖合规，有 1 处入口文件问题 |
| 运行时与状态 | A- | 状态管理良好，少量订阅精度和竞态问题 |
| 渲染器与 UI | A | 契约合规性优秀，仅样式硬编码需改进 |
| 工程质量 | B | 核心包测试良好，边缘包覆盖不足 |
| 文档与一致性 | B+ | 文档基本与代码同步，少量术语不一致 |

### 首要修复建议

1. **立即处理 (P0)**: 拆分 `data-source-runtime.ts`
2. **本周处理 (P2)**: 修复 `refreshDerivedState` 竞态、WordEditorPage 订阅精度
3. **迭代计划 (P2)**: 提升 flux-core/ui 测试覆盖、清理入口文件
4. **长期改进**: 迁移 dingflow 硬编码颜色到 CSS 变量

---

*报告生成时间: 2026-04-17*
