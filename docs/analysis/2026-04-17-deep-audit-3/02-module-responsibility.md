# 维度 02：模块职责与文件边界

## 超大文件清单

### P0 - 必须拆分

#### [维度02] data-source-runtime.ts 超过700行限制
- **文件**: `packages/flux-runtime/src/data-source-runtime.ts`
- **行数**: 681 行
- **严重程度**: P0
- **现状**: 混合 6 个独立职责：
  1. 合并策略工具函数 (行27-97)
  2. 结果映射逻辑 (行99-180)
  3. 初始状态创建与 scope 写入工具 (行180-220)
  4. API 数据源控制器 (行320-656)
  5. Formula 数据源控制器 (行222-318)
  6. Source 执行器 (行659-681)
- **建议**: 拆分为：
  - `data-source-utils.ts` - 合并策略、结果映射、scope 写入工具
  - `data-source-api-controller.ts` - API 数据源控制器实现
  - `data-source-formula-controller.ts` - Formula 数据源控制器实现
  - `data-source-runtime.ts` - 入口聚合与公共类型 re-export

---

### P1 - 需评估拆分

#### [维度02] shape-validation.ts 超过500行
- **文件**: `packages/flux-runtime/src/schema-compiler/shape-validation.ts`
- **行数**: 596 行
- **严重程度**: P1
- **现状**: Schema 编译器的形状验证模块
- **建议**: 按验证类型拆分为子模块

#### [维度02] designer-page.tsx 超过500行
- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx`
- **行数**: 520 行
- **严重程度**: P1
- **现状**: 包含配置规范化函数、快捷键匹配工具、主组件
- **建议**: 将工具函数提取到 `designer-utils.ts`

---

### P2 - 已评估保持现状

#### [维度02] parser.ts - 解析器的合理例外
- **文件**: `packages/flux-formula/src/parser.ts`
- **行数**: 510 行
- **严重程度**: P2
- **现状**: 递归下降表达式解析器，所有方法属于单一 Parser 类
- **建议**: **保持现状**。解析器作为完整的语法分析单元，拆分会破坏可读性。

---

### P3 - 观察

- `packages/flux-runtime/src/form-runtime-owner.ts` - 496 行
- `packages/flux-runtime/src/form-runtime.ts` - 494 行
- `packages/flow-designer-core/src/core.ts` - 484 行
- `packages/flux-runtime/src/runtime-factory.ts` - 483 行

---

## 入口文件问题清单

### [维度02] flux-renderers-basic/index.tsx 包含渲染器定义常量
- **文件**: `packages/flux-renderers-basic/src/index.tsx`
- **行数**: 226 行
- **严重程度**: P2
- **现状**: 入口文件包含约180行的 `basicRendererDefinitions` 数组
- **建议**: 将定义提取到 `definitions.ts`

### [维度02] flux-renderers-data/index.tsx 包含验证逻辑实现
- **文件**: `packages/flux-renderers-data/src/index.tsx`
- **行数**: 183 行
- **严重程度**: P2
- **现状**: 入口文件包含 JSON Pointer 工具函数和 `validateTableSchema` 验证器
- **建议**: 将验证逻辑提取到 `table-schema-validator.ts`

---

## 良好实践示例（仅做 re-export）

- `packages/flux-core/src/index.ts` (36行)
- `packages/flux-runtime/src/index.ts` (18行)
- `packages/flux-i18n/src/index.ts` (18行)
- `packages/flux-react/src/index.tsx` (61行)
- `packages/flow-designer-core/src/index.ts` (10行)
