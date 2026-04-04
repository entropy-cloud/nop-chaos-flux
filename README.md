# NOP Chaos Flux

<div align="center">

**基于 Schema 驱动的现代化低代码渲染与设计器框架**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📖 项目简介

NOP Chaos Flux 是对百度 AMIS 低代码渲染器的现代化重写与架构升级，专注于：

- **Schema 驱动的声明式渲染**
- **Flow Designer（流程设计器）**
- **Report Designer + Spreadsheet（报表/表格设计器）**
- **内置调试与诊断工具**

> **定位**：面向现代前端工程与设计器场景的分层重构，强化 runtime + 领域包的清晰边界，而非简单的组件配置中心。

---

## ✨ 核心特性

### 通用渲染能力
- 🎨 **Schema 驱动渲染**：通过声明式 JSON Schema 组织页面、组件、动作与区域
- 📝 **表达式与模板编译**：统一编译与运行时执行能力（`flux-formula`）
- ⚡ **运行时与动作系统**：作用域、动作分发、表单状态与校验、请求执行
- 🐛 **内置调试器**：事件时间线、交互诊断、全局 API（用于开发与自动化）

### 设计器能力
- 🔄 **Flow Designer**：`designer-page` + `designer:*` 命名空间动作 + 可配置画布/工具栏/面板
- 📊 **Report Designer / Spreadsheet**：报表语义扩展叠加在 spreadsheet 能力之上
- 🎯 **可配置性强**：节点类型、端口、连线规则、工具栏、快捷键全部 JSON 配置驱动

---

## 🚀 相比 AMIS 的设计改进

### 设计优化

#### 1. 统一值语义
**AMIS**：使用 `xxxExpr`、`xxxOn` 等平行字段体系（如 `classNameExpr`、`disabledOn`）

**Flux**：单一字段，通过类型系统区分语义
```typescript
type CompiledValueNode<T> =
  | { kind: 'static-node'; value: T }
  | { kind: 'expression-node'; compiled: ... }
  | { kind: 'template-node'; compiled: ... }
```

#### 2. 全值树编译
**AMIS**：运行时解释执行，局部有缓存

**Flux**：编译时构建值树，静态子树零成本，动态子树尽量复用已有对象，避免新建新对象，这也自然避免了React组件重建。

#### 3. 作用域链查找
**Flux**：词法路径查找优先，仅在必要时合并对象

### 性能优化

| 优化项 | 实现方式 | 收益 |
|--------|----------|------|
| **编译时优化** | 表达式/模板/正则预编译 | 减少运行时解释开销 |
| **静态值快路径** | `isStatic: true` 直接返回值 | 零成本访问静态配置 |
| **对象复用** | 结果不变时保持对象引用 | 避免 React 组件重渲染 |
| **精准订阅** | `useScopeSelector` 选择器订阅 | 避免连锁重渲染 |
| **高频操作优化** | 防抖、取消、请求缓存 | 减少 API 调用和过期请求 |
| **增量更新** | 浅比较、结构共享 | 避免全局状态拷贝 |

### 技术栈升级

| 项目 | AMIS | Flux |
|------|------|------|
| React 版本 | 较老版本 | **React 19** |
| 状态管理 | MobX / 其他 | **Zustand 5.0**（更轻量） |
| 构建工具 | Webpack | **Vite 8.0**（更快） |
| TypeScript | 旧版本 | **TypeScript 5.9 strict** |
| 测试框架 | Jest / 其他 | **Vitest 3.2**（更快） |
| 包管理器 | npm / yarn | **pnpm 10.0**（更高效） |
| 样式系统 | 自定义 CSS-in-JS | **TailwindCSS 4.1**（原子化 CSS） |

### 可扩展性优化

#### 组件动作
```json
{ "action": "component:validate", "componentId": "form" }

```

#### 命名空间动作
```typescript
// 设计器专用动作
"designer:addNode"
"designer:export"

// 可通过 ActionScope 扩展
actionScope.register('customAction', handler);
```

#### ActionScope

`ActionScope` 是本项目一个比较特殊的设计：**动作作用域与数据作用域解耦**。

- **ActionScope** 负责“能调用什么动作”（内置动作、`component:<method>`、`designer:*`、导入库动作）
- **数据 Scope** 负责“当前有哪些数据”（通过 `data`、`data-source`、`input` 等运行时动态构建）

这种解耦带来两个好处：

1. 动作能力可以独立扩展，不需要绑定到某个固定数据树  
2. 可以通过 `xui:import` 把外部库动作挂载到当前 ActionScope，而不污染数据 Scope

简化理解：**数据 Scope 管值，ActionScope 管能力**。

#### 可配置设计器
Flow Designer 和 Report Designer 都通过 JSON 配置驱动，无需修改代码即可定制。

---

## 🛠️ 技术栈

- **前端框架**：React 19
- **类型系统**：TypeScript 5.9（strict）
- **状态管理**：Zustand 5.0
- **构建工具**：Vite 8.0
- **测试框架**：Vitest 3.2 + Playwright 1.54
- **包管理器**：pnpm 10.0（workspace）
- **样式系统**：TailwindCSS 4.1
- **流程图**：@xyflow/react

---

## 📁 仓库结构

```text
flow-designer2/
├── apps/
│   └── playground/              # 统一演示入口（Flow/Report/Flux Basic/Debugger）
├── packages/
│   ├── flux-core               # 核心类型与约定（纯类型，无运行时代码）
│   ├── flux-formula            # 表达式/模板编译与执行
│   ├── flux-runtime            # 运行时（动作、请求、表单、校验）
│   ├── flux-react              # React 渲染层（hooks, contexts）
│   ├── flux-renderers-basic    # 基础渲染器（page, text, container 等）
│   ├── flux-renderers-form     # 表单渲染器
│   ├── flux-renderers-data     # 数据渲染器
│   ├── flow-designer-core      # 图文档与设计器核心能力（纯逻辑，不依赖 React）
│   ├── flow-designer-renderers # Flow Designer 渲染器接线
│   ├── spreadsheet-core        # Spreadsheet 核心
│   ├── spreadsheet-renderers   # Spreadsheet 渲染器
│   ├── report-designer-core    # Report 语义核心
│   ├── report-designer-renderers # Report Designer 渲染器
│   ├── nop-debugger            # 调试器面板与 API
│   └── tailwind-preset         # 样式预设
└── docs/                        # 架构、参考、分析、示例、开发日志
```

### 包依赖关系

```
flux-core (类型定义)
    ↓
flux-formula (表达式编译/求值)
    ↓
flux-runtime (Zustand stores, 验证, 动作)
    ↓
flux-react (React 渲染层)
    ↓
flux-renderers-* (各种渲染器)
    ↓
nop-debugger (调试工具)
    ↓
apps/playground (开发环境)
```

---

## 🏃 快速开始

### 环境要求

- **Node.js**：建议使用当前 LTS 版本
- **pnpm**：10.0+

### 安装与启动

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

默认会启动 `apps/playground`，访问 http://localhost:5173

### 验证安装

```bash
# 类型检查
pnpm typecheck

# 构建
pnpm build

# 运行测试
pnpm test

# E2E 测试
pnpm test:e2e
```

---

## 📋 常用命令

### Workspace 级命令

在仓库根目录执行：

```bash
pnpm dev            # 启动 playground
pnpm typecheck      # 全 workspace 类型检查
pnpm build          # 全 workspace 构建
pnpm test           # 全 workspace 单测
pnpm test:e2e       # Playwright e2e（无头模式）
pnpm test:e2e:headed # Playwright e2e（有头模式）
pnpm lint           # 全 workspace lint
pnpm clean          # 清理 node_modules/dist
```

### 单包命令

按包执行示例：

```bash
# Flow Designer 相关
pnpm --filter @nop-chaos/flow-designer-core test
pnpm --filter @nop-chaos/flow-designer-renderers typecheck

# Flux Runtime 相关
pnpm --filter @nop-chaos/flux-runtime test
pnpm --filter @nop-chaos/flux-react build

# Playground
pnpm --filter @nop-chaos/flux-playground dev
```

---

## 🧩 实现落地点（源码）


### 1) 设计器核心能力

- `packages/flow-designer-core/src/core.ts`
  - 节点/边增删改、undo/redo、dirty tracking、save/restore、export JSON

### 2) 动作分发与扩展

- `packages/flux-runtime/src/action-runtime.ts`
  - 内置动作（`setValue` / `ajax` / `submitForm`）
  - 组件动作（`component:<method>`）
  - 命名空间动作（如 `designer:*`）
- `packages/flux-runtime/src/action-scope.ts`
  - `ActionScope` 与 `registerNamespace`（动作能力注册）
- `packages/flux-runtime/src/imports.ts`
  - `xui:import` 导入外部动作库到 ActionScope（与数据 Scope 解耦）

### 3) 作用域与订阅

- `packages/flux-react/src/hooks.ts`
  - `useScopeSelector` 等订阅能力
- `packages/flux-core/src/types.ts`
  - `ScopeRef`、`ApiObject` 等核心契约

### 4) 调试与自动化接口

- `packages/nop-debugger/src/automation.ts`
- `packages/nop-debugger/src/controller.ts`
  - 全局 API、错误缓冲区与调试器自动化能力

---

## 📚 文档索引

### 入口文档
- **[docs/index.md](docs/index.md)** - 文档导航总入口
- **[docs/logs/index.md](docs/logs/index.md)** - 开发日志（最近变更记录）

### 架构文档
- **[docs/architecture/flux-core.md](docs/architecture/flux-core.md)** - Flux 核心架构
- **[docs/architecture/renderer-runtime.md](docs/architecture/renderer-runtime.md)** - 渲染器运行时
- **[docs/architecture/form-validation.md](docs/architecture/form-validation.md)** - 表单验证
- **[docs/architecture/action-scope-and-imports.md](docs/architecture/action-scope-and-imports.md)** - 动作作用域

### Flow Designer
- **[docs/architecture/flow-designer/design.md](docs/architecture/flow-designer/design.md)** - 设计架构
- **[docs/architecture/flow-designer/config-schema.md](docs/architecture/flow-designer/config-schema.md)** - 配置 Schema
- **[docs/architecture/flow-designer/api.md](docs/architecture/flow-designer/api.md)** - API 文档
- **[docs/architecture/flow-designer/collaboration.md](docs/architecture/flow-designer/collaboration.md)** - 协作机制

### Report Designer
- **[docs/architecture/report-designer/design.md](docs/architecture/report-designer/design.md)** - 设计架构
- **[docs/architecture/report-designer/contracts.md](docs/architecture/report-designer/contracts.md)** - 契约定义

### 参考资料
- **[docs/references/terminology.md](docs/references/terminology.md)** - 术语表
- **[docs/references/renderer-interfaces.md](docs/references/renderer-interfaces.md)** - 渲染器接口
- **[docs/references/flux-json-conventions.md](docs/references/flux-json-conventions.md)** - JSON 约定

### 示例
- **[docs/examples/user-management-schema.md](docs/examples/user-management-schema.md)** - 用户管理 Schema 示例

---

## 🧪 测试和调试

### 内置调试器

**固定的错误缓冲区**：
```typescript
{
  keepEarliest: 3,  // 保留最早的错误
  keepLatest: 5     // 保留最新的错误
}
```

**AI/自动化可访问**：
```typescript
// 全局 API
window.__NOP_DEBUGGER_API__.getPinnedErrors();
window.__NOP_DEBUGGER_API__.getLatestFailedRequest();
window.__NOP_DEBUGGER_API__.getRecentFailures({ limit: 5 });
```

### Playwright E2E 测试

```bash
# 无头模式
pnpm test:e2e

# 有头模式（可视化调试）
pnpm test:e2e:headed
```

---

## 🔧 开发约定

### 代码规范

- **ESM-first**：`"type": "module"`
- **TypeScript strict**：严格类型检查
- **无注释**：除非用户明确要求
- **遵循现有代码风格**：在每个文件中模仿现有风格

### 包结构

每个包遵循：
```
packages/<name>/
  src/
    index.ts          # 公共导出
    index.test.ts     # 测试（同位置或 __tests__/）
  tsconfig.json       # 类型检查配置
  tsconfig.build.json # 构建配置
  package.json
```

### 导入规范

- 使用 workspace 协议：`"@nop-chaos/flux-core": "workspace:*"`
- 包内使用相对路径

### 状态管理

- 使用 Zustand vanilla stores（非 React context stores）
- Store 是框架无关的
- 使用 `use-sync-external-store` 进行 React 订阅

### 测试

- 使用 Vitest
- 测试文件：`*.test.ts` 或 `*.test.tsx`
- 优先同位置测试或 `__tests__/` 目录


## 📄 许可协议

本项目采用 MIT 许可协议 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

本项目受到百度 AMIS 的启发，但进行了全面的架构重写和性能优化。感谢 AMIS 团队为低代码领域做出的贡献。
