# 维度01：依赖图与包边界 — 初审报告

**审核日期**: 2026-04-18
**审核范围**: flux-core、flux-formula、flux-runtime、flux-react

---

## 一、四个核心包完整依赖图

```
                        ┌─────────────┐
                        │  flux-core  │   (零 @nop-chaos/* 依赖)
                        │  @types/react (devDep)            │
                        └──────┬──────┘
                               │
                    ┌──────────┼──────────────────────────────────┐
                    │          │                                  │
                    ▼          ▼                                  ▼
            ┌──────────────┐  ┌──────────┐              (其他消费者：
            │ flux-formula │  │ flux-i18n│               renderers-*,
            │   deps:      │  │  (独立包) │               flow-designer,
            │   flux-core  │  │  零@nop-  │               debugger, ui
            └──────┬───────┘  │  chaos/*  │               等均依赖
                   │          └──────────┘               flux-core)
                   │               │
          ┌────────┤               │
          │        │               │
          ▼        │               │
  ┌───────────────┐│               │
  │ flux-runtime  ││               │
  │   deps:       ││               │
  │   flux-core   ││               │
  │   flux-formula││               │
  │   zustand     ││               │
  └───────┬───────┘│               │
          │        │               │
          └────────┼───────────────┤
                   │               │
                   ▼               ▼
          ┌────────────────────────────┐
          │        flux-react          │
          │   deps:                    │
          │     flux-core              │
          │     flux-formula           │
          │     flux-i18n              │
          │     flux-runtime           │
          │     ui                     │
          │     react                  │
          │     use-sync-external-store│
          └────────────┬───────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  renderers-*    │
              │  (basic/form/   │
              │   form-advanced/│
              │   data)         │
              └─────────────────┘
```

**关键发现**：`flux-i18n` 是独立包（零 `@nop-chaos/*` 依赖），不在 `flux-formula → flux-runtime` 链路上，而是被 `flux-react` 和 `ui` 直接消费。

---

## 二、违规清单

### [维度01] AGENTS.md 依赖流文档与实际代码不一致

- **文件**: `AGENTS.md`（Dependency Flow 章节）
- **严重程度**: **P2**
- **现状**: 文档声明的依赖链为 `flux-core → flux-formula → flux-i18n → flux-runtime → flux-react`，但实际代码中：
  - `flux-i18n` 不依赖 `flux-formula`（package.json 零 `@nop-chaos/*` 依赖，`src/` 中无任何 `@nop-chaos/` import）
  - `flux-runtime` 不依赖 `flux-i18n`（package.json 无声明，`src/` 中无 import）
  - `flux-react` 直接依赖 `flux-i18n`（`field-frame.tsx:7` 导入 `t`）
- **风险**: 开发者按文档放置新功能时可能放错包。
- **建议**: 将 AGENTS.md 中的 Dependency Flow 修改为与代码一致的菱形结构。

### [维度01] ui 包反向依赖域层 flux-i18n

- **文件**: `packages/ui/package.json`（第 18 行区域 `@nop-chaos/flux-i18n`）
- **严重程度**: **P2**
- **现状**: `ui` 包直接依赖 `@nop-chaos/flux-i18n`，在 6 个 UI 组件中调用 `t()` 翻译函数。
- **风险**: 作为底层共享 UI 库，耦合了业务域 i18n 系统。若要在非 flux 项目中复用 ui 组件，必须同时引入 `flux-i18n`。
- **建议**: 当前阶段可接受。如果未来 `ui` 包需要独立分发，考虑将 i18n 文本参数化。

### [维度01] word-editor-renderers 测试文件缺少 flux-formula 依赖声明

- **文件**: `packages/word-editor-renderers/package.json`
- **严重程度**: **P3**
- **现状**: 测试文件导入 `createFormulaCompiler` from `@nop-chaos/flux-formula`，但 package.json 未声明。
- **风险**: 在严格 pnpm 隔离模式下，vitest 运行时可能因模块解析失败而报错。
- **建议**: 将 `@nop-chaos/flux-formula` 添加为 devDependency。

---

## 三、合规确认

| 规则                                         | 结果       |
| -------------------------------------------- | ---------- |
| flux-core 无 @nop-chaos/\* 依赖              | **通过**   |
| flux-formula 仅依赖 flux-core                | **通过**   |
| flux-runtime 仅依赖 flux-core + flux-formula | **通过**   |
| flux-react 不依赖任何 renderers 包           | **通过**   |
| 跨包内部路径导入                             | **零实例** |
| 循环依赖                                     | **无**     |
| 构建产物泄漏                                 | **零**     |
| exports 字段一致性                           | **一致**   |
| tsconfig 齐全                                | **齐全**   |

---

## 四、总结评估

**整体评级：良好（GREEN）**

四个核心包的依赖边界总体清晰、无结构性缺陷。需要关注的两项 P2 问题均为文档与代码的不一致，而非代码本身的架构缺陷。

---

## 复核结论

| 发现                                  | 维度复核                               | 子项复核 | 最终严重程度 |
| ------------------------------------- | -------------------------------------- | -------- | ------------ |
| 发现1: AGENTS.md 依赖流文档错误       | 保留                                   | **成立** | P2           |
| 发现2: ui 包依赖 flux-i18n            | 保留                                   | **成立** | P2           |
| 发现3: word-editor-renderers 缺少依赖 | **驳回**（devDependencies 已正确声明） | —        | —            |
