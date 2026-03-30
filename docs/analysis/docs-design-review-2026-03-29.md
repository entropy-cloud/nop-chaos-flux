# Docs 设计合理性与一致性审查

> 审查时间: 2026-03-29
> 审查范围: `docs/` 全部文档 + `packages/` 源码交叉验证
> 审查方法: 交叉引用验证、版本号核对、接口定义比对、断裂链接检测、源码-文档对比
> 审查基准分支: `fix-css-style`

---

## 一、整体设计合理性评价

**优点:**

1. **分层清晰**: `architecture/`、`references/`、`analysis/`、`plans/`、`bugs/`、`archive/` 六层结构职责分明，`docs/index.md` 的 "Read This First" 路由表非常实用
2. **核心架构设计优秀**: 统一值语义 (`CompiledValueNode`)、全值树编译、scope 链查找等设计思路正确，与 AMIS 形成清晰对比
3. **三作用域分离** (数据 Scope / ActionScope / ComponentHandleRegistry) 设计合理，避免了 `ScopeRef` 职责膨胀
4. **样式系统分层** (renderer marker class + Tailwind + CSS variables) 三权分立思路成熟
5. **Flow Designer 分层架构** (core / renderers / canvas adapters) 职责边界明确

---

## 二、P0 级问题

### 2.1 断裂的文档引用: `amis-core.md` 已重命名但引用未同步

`docs/architecture/amis-core.md` 已重命名为 `docs/architecture/flux-core.md` (见 `development-log.md:439`)，但以下文档的 "Related Documents" 和交叉引用**未同步更新**，指向不存在的文件:

| 文件 | 问题行 |
|------|--------|
| `docs/references/renderer-interfaces.md` | L229 |
| `docs/references/terminology.md` | L316 |
| `docs/references/maintenance-checklist.md` | L45, L61, L94, L118, L136, L284 (6处) |
| `docs/examples/user-management-schema.md` | L234 |
| `docs/references/expression-processor-notes.md` | L76 |
| `docs/analysis/excel-report-designer-research.md` | L518 |
| `docs/standardization.md` | L840 |
| `docs/component-list.md` | L755 |

**注意**: `docs/index.md` 和 `AGENTS.md` 已经正确使用 `flux-core.md`。问题仅出在 `references/`、`examples/`、`analysis/`、`standardization.md` 等二级文档。

**影响**: 读者点击 "Related Documents" 链接后找不到文件，破坏文档导航功能。

**修复方案**: 全局搜索 `amis-core.md`，在非 archive/plans 文档中替换为 `flux-core.md`。`docs/archive/` 和 `docs/plans/` 中的引用可保留（archive 有历史意义，plans 是历史记录）。

### 2.2 `field-frame.md` 的 Code Anchors 和 API 描述与实际代码完全脱节

这是本次源码审查发现的**最严重问题**。`field-frame.md` 的多个核心段落描述的是一个**从未存在的假想实现**。

**问题 1: Code Anchors 路径错误**

文档 L16-22 指向:
```
packages/flux-renderers-form/src/renderers/shared/field-frame.tsx  -- 不存在
packages/flux-renderers-form/src/renderers/shared/label.tsx        -- 不存在
packages/flux-renderers-form/src/renderers/shared/field-hint.tsx   -- 不存在
packages/flux-renderers-form/src/field-utils.tsx                   -- 不存在
```

实际 FieldFrame 位于:
```
packages/flux-react/src/field-frame.tsx  -- 正确路径
```

**问题 2: Component API 描述过时**

文档描述的接口:
```ts
interface FieldFrameProps {
  label?: ReactNode;
  labelTag?: 'span' | 'legend';
  required?: boolean;
  error?: string;           // 父组件传入
  showError?: boolean;      // 父组件传入
  hint?: ReactNode;
  showHint?: boolean;       // 父组件传入
  description?: ReactNode;
  validating?: boolean;     // 父组件传入
  className?: string;
  layout?: 'default' | 'checkbox' | 'radio';
  children: ReactNode;
}
```

实际代码 (`packages/flux-react/src/field-frame.tsx:6-17`):
```ts
interface FieldFrameProps {
  name?: string;                    // 文档缺失
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  description?: ReactNode;
  layout?: 'default' | 'checkbox' | 'radio';
  validationBehavior?: CompiledValidationBehavior;  // 文档缺失
  className?: string;
  testid?: string;                  // 文档缺失
  children: ReactNode;
}
```

关键差异: 实际组件通过 `name` + `useOwnedFieldState` **自行订阅表单状态**，而不是由父组件传入 `error`/`showError`/`validating`。`showError` 的计算逻辑在组件内部根据 `validationBehavior` 自动完成。

**问题 3: CSS Class Mapping 表包含 BEM 状态类**

文档 L208-210 声称:
```
nop-field--invalid   -- State: has validation error
nop-field--touched   -- State: has been focused+blurred
nop-field--dirty     -- State: value changed
```

但实际代码 L80-83 使用的是 `data-*` 属性:
```tsx
data-field-visited={fieldState.visited || undefined}
data-field-touched={fieldState.touched || undefined}
data-field-dirty={fieldState.dirty || undefined}
data-field-invalid={showError || undefined}
```

这与 `bem-removal.md` 的规定完全一致，但 `field-frame.md` 还在描述已废弃的 BEM 方案。

**修复方案**: 重写 `field-frame.md`，更新 Code Anchors、Component API、Render Structure 和 CSS Class Mapping 表，对齐到 `packages/flux-react/src/field-frame.tsx` 的实际实现。

---

## 三、P1 级问题

### 3.1 Vite 版本号矛盾

| 文档位置 | 声明版本 | 状态 |
|----------|---------|------|
| `package.json` | `"vite": "^8.0.0"` | ✓ 正确 (事实来源) |
| `README.md` | Vite 8 | ✓ 正确 |
| `docs/architecture/frontend-baseline.md:23` | Vite 7 | ✗ 过时 |

**问题**: `frontend-baseline.md` 是 Active Source Of Truth 文档 (在 `index.md:38` 中标记)，却写的是过时的 Vite 7 版本号。

**修复方案**: 将 `frontend-baseline.md:23` 的 `Vite 7` 改为 `Vite 8`。

### 3.2 Debugger 全局变量名不一致

| 文档位置 | 使用的名称 | 是否与代码一致 |
|----------|-----------|---------------|
| `README.md:339` | `__NOP_DEBUGGER_API__` | ✓ |
| `docs/analysis/framework-debugger-design.md:715` | `__NOP_FLUX_DEBUGGER_API__` | ✗ |
| `docs/development-log.md:1092` | `__NOP_FLUX_DEBUGGER_API__` | ✗ |

**实际代码** (`packages/nop-debugger/src/automation.ts:98` 和 `packages/nop-debugger/src/types.ts:302`):
```ts
window.__NOP_DEBUGGER_API__ = automation;  // automation.ts
__NOP_DEBUGGER_API__?: NopDebuggerAutomationApi;  // types.ts Window 接口
```

代码明确使用 `__NOP_DEBUGGER_API__`（无 `FLUX` 前缀）。debugger 设计文档和开发日志中写的 `__NOP_FLUX_DEBUGGER_API__` 是错误的。

**修复方案**: 将 `framework-debugger-design.md` 中所有 `__NOP_FLUX_DEBUGGER_*` 统一为 `__NOP_DEBUGGER_*`。

### 3.3 `field-frame.md` 与 `bem-removal.md` 直接矛盾

`docs/architecture/field-frame.md` 的 CSS Class Mapping 表 (L198-211) 将 BEM 状态类列为**当前行为**:
```
nop-field--invalid, nop-field--touched, nop-field--dirty
```

但 `docs/architecture/bem-removal.md` (L177-223) 明确规定这些 BEM 状态类**必须删除**，替换为 `data-field-*` 属性。

实际代码已经采用了 `bem-removal.md` 的方案（`data-field-*` 属性），`field-frame.md` 严重过时。

### 3.4 `maintenance-checklist.md` 引用已废弃概念 `stylePresets`

`docs/references/maintenance-checklist.md:208`:
```
- adding or modifying `stylePresets` mechanism
```

但项目已明确选择 `classAliases` 作为最终方案（`styling-system.md:188` 的 "Why `classAliases` (not `styles` or `stylePresets`)" 章节）。

**修复方案**: 将 `maintenance-checklist.md:208` 的 `stylePresets` 替换为 `classAliases`。

### 3.5 `frontend-baseline.md` 包列表严重过时

`docs/architecture/frontend-baseline.md:40-52` 的 Workspace Shape 只列了 7 个包:
```
flux-core, flux-formula, flux-runtime, flux-react,
flux-renderers-basic, flux-renderers-form, flux-renderers-data
```

实际仓库 (`fix-css-style` 分支) 有 **16 个包**:

| 缺失的包 | 所属模块 |
|----------|---------|
| `nop-debugger` | 调试工具 |
| `flow-designer-core` | 流程设计器 |
| `flow-designer-renderers` | 流程设计器 |
| `spreadsheet-core` | 电子表格 |
| `spreadsheet-renderers` | 电子表格 |
| `report-designer-core` | 报表设计器 |
| `report-designer-renderers` | 报表设计器 |
| `tailwind-preset` | 样式系统 |
| `ui` | UI 组件库 (shadcn/ui) |

**修复方案**: 更新 `frontend-baseline.md` 的包列表，或改为引用 README 中的完整结构。

---

## 四、P2 级问题

### 4.1 `ComponentHandleRegistry` 接口: 文档与代码三方不一致

三方描述的差异如下:

| 特性 | 实际代码 (`flux-core/src/types.ts`) | `action-scope-and-imports.md` | `component-resolution.md` |
|------|----------|----------|----------|
| `id: string` | ✓ | ✗ 未提及 | ✓ |
| `parent` 链 | ✓ | ✗ | ✓ |
| `register` options | `cid?, templateId?, instanceKey?, dynamicLoaded?` | 无参数 | `isDynamic?, instanceKey?` (不同字段名) |
| `register` 返回值 | `() => void` (注销函数) | `void` (无返回) | `number` (返回 cid) |
| `cleanupDynamic` | ✓ | ✗ | ✗ |
| `resolve` 入参 | `ComponentTarget` | `ComponentTarget` | `ResolvedTarget` (不同名) |
| 内部 Map 结构 | 封装在闭包内 | ✗ 未涉及 | 暴露为公开字段 |

实际代码是两者的**综合演进版**:
- 采纳了 `component-resolution.md` 的 `_cid`/`_templateId`/`_instanceKey` 设计思路
- 将内部 Map 封装在 `createComponentHandleRegistry()` 工厂闭包中（不暴露为公开接口）
- 比 `action-scope-and-imports.md` 的简化接口多了 `register` options 和 `cleanupDynamic`

**建议**: 
1. 在 `component-resolution.md` 头部添加说明，明确本文是 "早期设计草稿"，接口以 `flux-core/src/types.ts` 为准
2. 更新 `action-scope-and-imports.md` 的 "Recommended shape" 接口定义，对齐到实际代码

### 4.2 Action 命名分隔符混用

`docs/architecture/action-scope-and-imports.md` 内部同时使用了两种命名格式:
- `:` 分隔符: `designer:addNode` (L260-262)
- `.` 分隔符: `demo.open`、`chart.render` (L264-265)

文档 L269 声明 "优先使用 `:` 作为分隔符"，但 L264-265 仍使用 `.` 格式作为 "Preferred examples"。

不过文档 L271 已加说明: "imported library examples describe namespace-plus-method intent, but the implementation should normalize on one dispatch syntax"。这说明 `.` 格式仅是 imported library 场景的示例，不是最终规范。

**建议**: 将 `demo.open`/`chart.render` 明确标注为 "imported library 示例（非最终格式）"，避免读者误解为推荐格式。

### 4.3 中英文混用

同一层级的 `architecture/` 文档语言不统一:

| 文档 | 语言 |
|------|------|
| `flux-core.md`、`renderer-runtime.md`、`form-validation.md` | 英文 |
| `flow-designer/design.md`、`flow-designer/collaboration.md` | 中文 |
| `bem-removal.md` | 中文 |
| `styling-system.md`、`theme-compatibility.md` | 英文 |
| `component-resolution.md` | 中文 |
| `field-frame.md` | 英文 |

**建议**: 统一核心架构文档为英文，flow-designer 和中文特有的设计文档可保留中文。至少确保 `docs/index.md` 路由表的语言描述与文档实际语言一致。

### 4.4 `index.md` 与 `AGENTS.md` 路由表重复

`docs/index.md` 的 "Read This First" 表和 `AGENTS.md` 的 "Documentation Routing" 表覆盖范围高度重叠但粒度不同。维护两份路由表容易造成不同步（事实上已出现不同步——`index.md` 引用的已是正确的 `flux-core.md`，而 `references/` 下的文档仍在引用 `amis-core.md`）。

**建议**: 只保留一份主路由表（建议放在 `AGENTS.md`），`index.md` 只做简要导航入口。

### 4.5 缺少全局实现状态视图

`flux-core.md` 有 "What Is Current Versus Future" 章节，但其他文档缺少类似区分。例如 `action-scope-and-imports.md` 有完整的迁移 Phase 1/2/3，但读者无法快速判断当前处于哪个阶段。

**建议**: 在 `docs/index.md` 顶部维护一个全局实现状态矩阵，标注各模块的 "已实现 / 进行中 / 规划中" 状态。

---

## 五、问题统计

| 类别 | 数量 | 严重性 | 是否为本次源码审查新发现 |
|------|------|--------|----------------------|
| 断裂的文档引用 (amis-core.md) | 14+ 处 | P0 | 否 |
| `field-frame.md` Code Anchors + API 完全脱节 | 1 份文档 | P0 | **是** |
| 版本号不一致 (Vite 7 vs 8) | 3 处 | P1 | 否 |
| 全局变量名不一致 | 2 处 | P1 | 否 |
| 文档间直接矛盾 (field-frame vs bem-removal) | 1 对 | P1 | 否 |
| 已废弃概念残留 (stylePresets) | 2 处 | P1 | 否 |
| 包列表不完整 | 1 处 | P1 | 否 |
| `ComponentHandleRegistry` 接口三方不一致 | 1 组 | P2 | **是** |
| 命名风格不一致 | 2 处 | P2 | 否 |
| 中英文混用 | 6+ 文件 | P2 | 否 |
| 路由表重复维护 | 2 处 | P2 | 否 |
| 缺少全局状态视图 | 1 处 | P2 | 否 |

---

## 六、优先修复建议

### 第一轮 (纯文档修复，15 分钟内)

1. 全局替换 `docs/architecture/amis-core.md` → `docs/architecture/flux-core.md` (排除 `docs/archive/` 和 `docs/plans/`)
2. 修复 `frontend-baseline.md:23` 的 `Vite 7` → `Vite 8`
3. 修复 `framework-debugger-design.md` 中的 `__NOP_FLUX_DEBUGGER_*` → `__NOP_DEBUGGER_*`
4. 修复 `maintenance-checklist.md:208` 的 `stylePresets` → `classAliases`

### 第二轮 (需审阅源码，30 分钟)

5. **重写 `field-frame.md`**: 更新 Code Anchors 到 `packages/flux-react/src/field-frame.tsx`，重写 Component API、Render Structure、CSS Class Mapping 表，对齐到实际代码
6. 更新 `frontend-baseline.md` 的包列表 (16 个包)

### 第三轮 (需讨论，待定)

7. 更新 `component-resolution.md` 头部说明 + `action-scope-and-imports.md` 的 ComponentHandleRegistry 接口定义
8. 统一 action 命名分隔符示例
9. 制定文档语言统一策略
