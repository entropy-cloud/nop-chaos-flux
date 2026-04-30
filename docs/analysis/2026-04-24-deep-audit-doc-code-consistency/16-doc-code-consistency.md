# 维度 16：文档-代码一致性审核报告

**审核日期**: 2026-04-24
**执行方式**: 3 个初审子 agent（批次 A/B/C 并行） + 3 个维度复核子 agent + 3 个 P1 子项逐条复核子 agent

---

## 复核统计

| 指标             | 数值       |
| ---------------- | ---------- |
| 初审发现总数     | 16         |
| 已独立复核条目数 | 16         |
| 维度级复核完成数 | 3          |
| 子项逐条复核数   | 4（P1 项） |
| 保留             | 16         |
| 降级             | 0          |
| 驳回             | 0          |

---

## P0 清单

无 P0 级别发现。

---

## P1 清单

### [16-A-3] Hooks 列表缺少 useDataSourceStatus 和 useCurrentValidationScope

- **文档路径**: `docs/architecture/renderer-runtime.md:471-508`
- **代码路径**: `packages/flux-react/src/hooks.ts:207,389`
- **漂移类型**: 行为不一致
- **文档描述**: Current Hooks 段列出 26 个 hook，未包含这两个
- **代码现状**: 两者均为公开导出的核心 API，`useCurrentValidationScope` 是 validation owner 查找的核心入口
- **建议**: 在 Current Hooks 段补充这两个 hook 的签名和语义说明
- **复核状态**: 维度复核通过 + 子项逐条复核通过

### [16-A-4] SchemaRendererProps 缺少 schemaUrl、moduleCache、onRuntimeChange

- **文档路径**: `docs/architecture/renderer-runtime.md:795-811`
- **代码路径**: `packages/flux-core/src/types/renderer-hooks.ts:147-165`
- **漂移类型**: 行为不一致
- **文档描述**: 列出 14 个字段
- **代码现状**: 实际有 17 个字段，其中 `schemaUrl` 是必填字段
- **建议**: 更新文档补充这三个字段
- **复核状态**: 维度复核通过 + 子项逐条复核通过

### [16-B-2] AGENTS.md 包列表缺少 flux-action-core 和 flux-compiler

- **文档路径**: `AGENTS.md:9-32`
- **代码路径**: `packages/flux-action-core/package.json`, `packages/flux-compiler/package.json`
- **漂移类型**: owner 漂移
- **文档描述**: 列出 22 个包
- **代码现状**: `packages/` 下有 24 个包，缺少 `flux-action-core`（5 个源文件）和 `flux-compiler`（25 个源文件）
- **建议**: 在 Workspace Packages 中添加这两个包的描述
- **复核状态**: 维度复核通过 + 子项逐条复核通过

### [16-B-3] AGENTS.md 依赖流描述与实际 package.json 不一致

- **文档路径**: `AGENTS.md:34-52`
- **代码路径**: 多个 `packages/*/package.json`
- **漂移类型**: 行为不一致
- **文档描述**: 依赖链为 `flux-core -> flux-formula -> flux-i18n -> flux-runtime`
- **代码现状**:
  - `flux-i18n` 不依赖 `flux-formula`（仅依赖 `flux-core`）
  - `flux-runtime` 不依赖 `flux-i18n`（依赖 `flux-action-core`, `flux-compiler`）
  - `ui` 不依赖 `tailwind-preset` 和 `theme-tokens`
  - 缺少 `flux-compiler` 和 `flux-action-core` 的依赖边
- **建议**: 更新依赖流图为：
  ```
  flux-core -> flux-formula -> flux-compiler -> flux-action-core -> flux-runtime -> flux-react -> flux-renderers-*
  flux-core -> flux-i18n -> ui, flux-react
  ```
- **复核状态**: 维度复核通过 + 子项逐条复核通过

---

## P2 清单

### [16-A-1] import-stack.ts 文件所有权缺失

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md`
- **代码路径**: `packages/flux-runtime/src/import-stack.ts`（457 行）
- **漂移类型**: owner 漂移
- **现状**: 该文件管理 ImportFrame/ImportStack 生命周期，是 runtime-factory 的核心组装依赖，但未在模块边界文档中登记
- **建议**: 在 "Action/capability/import host boundaries" 段新增条目
- **复核状态**: 维度复核通过

### [16-A-2] form-runtime 拆分文件所有权缺失

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md`
- **代码路径**: `packages/flux-runtime/src/form-runtime-*.ts`（15 个文件中 8 个未列出）
- **漂移类型**: owner 漂移
- **现状**: 文档列出 7 个 form-runtime 文件，实际有 15 个。缺失文件包括 submit-flow、field-ops、lifecycle、values、submit、status、types、array-ops
- **建议**: 按功能分组补充所有缺失文件
- **复核状态**: 维度复核通过

### [16-A-5] ValidationCompileContribution 接口不存在

- **文档路径**: `docs/architecture/form-validation.md:522-534`
- **代码路径**: N/A（接口不存在，实际使用 `ValidationContributor`）
- **漂移类型**: 术语过时/行为不一致
- **现状**: 文档描述的 Phase 3 目标接口未标注为实现状态，开发者按文档搜索会找不到代码
- **建议**: 在 "Compile-Time Collection" 段添加实现状态标注
- **复核状态**: 维度复核通过（降级建议：从 P2 标注为文档标注改进）

### [16-A-6] Render Context Split 缺少 ValidationContext 和 ImportFrameContext

- **文档路径**: `docs/architecture/renderer-runtime.md:701-721`
- **代码路径**: `packages/flux-react/src/contexts.ts`
- **漂移类型**: 行为不一致
- **现状**: 文档列出 7 个 context，实际有 13 个。关键缺失包括 ValidationContext（验证架构核心）和 ImportFrameContext（导入边界核心）
- **建议**: 更新为完整的 13 个 context 列表
- **复核状态**: 维度复核通过

### [16-B-1] 术语 CompiledRegion 在代码中不存在，实际类型名为 TemplateRegion

- **文档路径**: `docs/references/terminology.md:67-71`
- **代码路径**: `packages/flux-core/src/types/node-identity.ts:44`
- **漂移类型**: 术语过时
- **现状**: 术语文档使用 `CompiledRegion`，代码使用 `TemplateRegion`（29 处引用），`CompiledRegion` 在源码中零引用
- **建议**: 更新为 `TemplateRegion`
- **复核状态**: 维度复核通过

### [16-C-1] Bug #19 修复模式回归

- **文档路径**: `docs/bugs/19-code-editor-label-click-forwarding-triggers-fullscreen-fix.md:55-58`
- **代码路径**: `packages/flux-code-editor/src/code-editor-renderer.tsx:159`, `code-editor-toolbar.tsx:43-90`
- **漂移类型**: 行为不一致（Bug 修复模式被回退）
- **现状**: code-editor 在 `wrap: true` 下使用了 `<Button>`（渲染为 HTML `<button>`），而 Bug #19 注意事项明确禁止此用法。没有任何 CSS/frameWrap/rootTag 机制提供防护
- **建议**: 恢复为 `<span role="button" tabIndex={0}>` 或传入 `rootTag="div"`
- **复核状态**: 维度复核通过

### [16-C-2] flux-core.md ScopeRef 接口缺少 merge、replace、readonly value

- **文档路径**: `docs/architecture/flux-core.md:286-298`
- **代码路径**: `packages/flux-core/src/types/scope.ts:33-47`
- **漂移类型**: 行为不一致
- **现状**: 文档中的 ScopeRef 缺少 `merge()`、`replace?()` 方法和 `readonly` 修饰符
- **建议**: 更新文档中 ScopeRef 类型片段
- **复核状态**: 维度复核通过

---

## P3 清单

### [16-A-8] RendererComponentProps.path 类型精度差异

- **文档**: `path: string` vs **代码**: `path: SchemaPath`
- **建议**: 文档使用 `SchemaPath`
- **复核状态**: 维度复核通过

### [16-A-9] SchemaFieldRule 的 params 和 isolate 字段未描述

- **文档**: field-metadata-slot-modeling.md 未提及 `params` 和 `isolate`
- **代码**: `packages/flux-core/src/types/schema.ts:47-67` 中存在
- **复核状态**: 维度复核通过

### [16-A-10] 次要辅助文件所有权缺失

- **现状**: projected-scope-store、error-utils 等辅助文件未在 module-boundaries 登记
- **建议**: 暂不补充，待职责增长后再登记
- **复核状态**: 维度复核通过

### [16-C-3] flux-core.md ScopeChange 缺少 revision

- **文档**: ScopeChange 缺少 `revision?: number`
- **代码**: `packages/flux-core/src/types/scope.ts:6` 中存在
- **复核状态**: 维度复核通过

### [16-B-8] Plan 134 接近 closure（观察项）

- **现状**: Phase 1-4 completed，Phase 5-7 核心代码已完成但文档/audit 待办未关闭
- **建议**: 完成剩余文档工作后执行 closure audit
- **复核状态**: 维度复核通过

---

## 确认无偏差项

| 文档                               | 检查内容                          | 结论               |
| ---------------------------------- | --------------------------------- | ------------------ |
| `styling-system.md`                | classAliases 递归展开、scope 继承 | 完全一致           |
| `styling-system.md`                | marker class 规则（零样式纯标记） | 完全一致           |
| `styling-system.md`                | stack-_/hstack-_ 别名值           | 完全一致           |
| `AGENTS.md`                        | 路由表路径有效性                  | 全部 20 个路径有效 |
| `scope-ownership-and-isolation.md` | scope 隔离契约                    | 完全一致           |
| Bug #01-33                         | 历史注意事项有效性                | 除 #19 外全部有效  |

---

## 交叉观察

1. **AGENTS.md 是最严重的文档漂移源**：包列表缺少 2 个包（flux-action-core, flux-compiler），依赖流图有 4 条虚假边和 2 条缺失边。作为所有 agent 的首要参考文档，这个问题会级联影响所有基于 AGENTS.md 的决策。

2. **验证架构三文档联动漂移**：`renderer-runtime.md`（hooks/context 列表） → `form-validation.md`（验证模型） → `flux-runtime-module-boundaries.md`（文件所有权）存在连锁漂移。`useCurrentValidationScope` 和 `ValidationContext` 是连接验证架构的桥梁，但在 hooks 列表和 context 分区中都缺失。

3. **Bug #19 修复模式回归**：code-editor 中 `<Button>` 的使用恢复了原始 bug 的触发条件，但可能尚未被用户报告（因为需要特定的 FieldFrame + label 包裹组合才会触发）。

4. **flux-core.md 接口片段滞后**：ScopeRef 和 ScopeChange 的文档定义落后于代码实现，缺少 `merge`、`replace`、`revision` 等近期添加的字段。
