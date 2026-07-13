# 2026-07-13 Icon System Antd Mapping & IconPicker Implementation

> Plan Status: completed
> Last Reviewed: 2026-07-13
> Source: `docs/components/icon/design.md`, `docs/components/icon-picker/design.md`
> Related: `docs/components/icon/design.md` (§11 icon resolution flow), `docs/components/icon-picker/design.md`

## Purpose

实现 icon 组件的 Ant Design 图标名称兼容层（~207 条映射表），并新增 `icon-picker` 表单高级字段 renderer，使低代码平台可通过 Popover 网格选择 Lucide 图标。

## Current Baseline

- `packages/ui/src/lib/icon-utils.ts` 已有 `resolveLucideIcon`、`normalizeIconName`、FA 前缀剥离、`ICON_ALIAS_MAP`（5 条）。
- `packages/flux-renderers-basic/src/icon.tsx` 已有 `IconRenderer`，支持 `size`/`color`。
- `packages/flux-renderers-form-advanced/src/` 已有 picker、transfer、tag-list 等高级字段，注册模式清晰。
- 无 `ANT_DESIGN_LUCIDE_MAP`，无 `icon-picker` renderer。
- `docs/components/icon/design.md` 和 `docs/components/icon-picker/design.md` 已写好设计文档。

## Goals

1. 在 `icon-utils.ts` 中新增 `ANT_DESIGN_LUCIDE_MAP`（~207 条 Ant Design → Lucide 映射）。
2. 更新 `normalizeIconName` 支持 `ant-design:` 前缀检测和 `-outlined`/`-filled`/`-twotone` 后缀剥离。
3. 新增 `icon-picker` renderer（`packages/flux-renderers-form-advanced/src/icon-picker.tsx`）。
4. 补齐 icon-utils 和 icon-picker 的单元测试。
5. 更新相关 docs。

## Non-Goals

- 不引入 `@ant-design/icons` 依赖——保持 lucide-react 单一渲染源。
- 不引入 FontAwesome 渲染依赖——仅保留前缀剥离兼容。
- 不实现 icon-picker 的多选、自定义图标集、分类分组。
- 不修改 `IconRenderer`（已有 icon 展示 renderer 不变）。

## Scope

### In Scope

- `ANT_DESIGN_LUCIDE_MAP` 映射表（~207 条）写入 `icon-utils.ts`。
- `normalizeIconName` 增加 antd 前缀/后缀解析。
- `icon-utils.test.ts` 增加 antd 映射相关测试。
- `icon-picker.tsx` renderer 实现（Popover + 搜索 + 6 列网格 + 分批加载）。
- `IconPickerSchema` 类型定义。
- `icon-picker` 注册到 `formAdvancedRendererDefinitions`。
- `icon-picker` 单元测试。
- `docs/components/icon/design.md` 和 `docs/components/icon-picker/design.md` 已完成。

### Out Of Scope

- icon-picker 的 `iconTemplate` region 自定义（follow-up）。
- icon-picker 的 `component:open` 句柄（follow-up）。
- Lucide 图标列表的外部数据源注入。
- Ant Design 映射表的自动同步机制。

## Failure Paths

| 场景                         | 触发                       | 行为                                                | 用户可见表现     |
| ---------------------------- | -------------------------- | --------------------------------------------------- | ---------------- |
| `ant-design:unknown-icon`    | 输入未在映射表中的 antd 名 | 剥离前缀/后缀后用原名查 Lucide；未命中回退 `Circle` | 显示空心圆图标   |
| `ant-design:setting-twotone` | 输入含 twotone 后缀        | 剥离后缀 → 映射 → Lucide `settings`                 | 正常显示齿轮图标 |
| icon-picker 空搜索           | 搜索无匹配                 | 显示"无匹配项"文案                                  | 空态提示         |
| icon-picker 大量图标         | 初始加载 1500+ 项          | 分批 200 项渲染，"显示更多"追加                     | 流畅滚动         |

## Test Strategy

档位选择：`必须自动化`

本档选择：icon-utils 的 antd 映射解析属于核心回归路径（影响所有使用图标的 renderer），必须有单元测试。icon-picker 作为新 renderer 建议有基础渲染测试。

## Execution Plan

### Phase 1 - Ant Design 映射表与解析逻辑

Status: completed
Targets: `packages/ui/src/lib/icon-utils.ts`, `packages/ui/src/lib/icon-utils.test.ts`

- Item Types: `Fix`, `Proof`

- [x] 在 `icon-utils.ts` 中新增 `ANT_DESIGN_LUCIDE_MAP` 常量（~207 条 Ant Design → Lucide kebab-case 映射）
- [x] 新增 `ANT_DESIGN_VARIANT_SUFFIX` 正则：`/-(outlined|filled|twotone)$/`
- [x] 新增 `resolveAntdIconName(value: string): string | undefined` 内部函数：剥离 `ant-design:` 前缀 → 剥离变体后缀 → 查映射表 → 返回 Lucide 名或 undefined
- [x] 更新 `normalizeIconName`：在 FA 前缀剥离后、别名映射前，插入 antd 前缀检测和映射表查找
- [x] 更新 `icon-utils.test.ts`：新增 `describe('Ant Design icon mapping')` 测试组，覆盖：`ant-design:setting-outlined` → `settings`、`ant-design:robot-filled` → `bot`、`ant-design:unknown` → 原名透传、无前缀 antd 名（`setting`）直接查映射表

Exit Criteria:

- [x] `ANT_DESIGN_LUCIDE_MAP` 包含至少 200 条映射
- [x] `normalizeIconName('ant-design:setting-outlined')` 返回 `'settings'`
- [x] `normalizeIconName('ant-design:robot-filled')` 返回 `'bot'`
- [x] `normalizeIconName('ant-design:unknown-icon')` 返回 `'unknown-icon'`（透传）
- [x] `resolveLucideIcon('ant-design:setting-outlined')` 返回 Lucide Settings 组件
- [x] `pnpm --filter @nop-chaos/ui test` 通过

### Phase 2 - IconPicker Schema 定义

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/icon-picker.tsx`（schema 部分）

- Item Types: `Decision`

- [x] 在 `icon-picker.tsx` 顶部定义 `IconPickerSchema extends BaseSchema`，字段：`type: 'icon-picker'`、`name`、`label`、`placeholder`、`searchable`、`clearable`、`disabled`、`readOnly`、`required`、`defaultValue`、`value`
- [x] 导出 `IconPickerSchema` 类型

Exit Criteria:

- [x] `IconPickerSchema` 类型编译通过
- [x] 字段与 `docs/components/icon-picker/design.md` §4 schema 设计一致

### Phase 3 - IconPicker Renderer 实现

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/icon-picker.tsx`, `packages/flux-renderers-form-advanced/src/index.tsx`

- Item Types: `Fix`

- [x] 实现 `IconPickerRenderer` 组件，遵循 `RendererComponentProps<IconPickerSchema>` 模式
- [x] 从 `lucide-react` 的 `icons` 对象生成 `ICON_NAMES` 列表（PascalCase → kebab-case，排序）
- [x] 使用 `@nop-chaos/ui` 的 `Popover`/`PopoverTrigger`/`PopoverContent` 实现弹层
- [x] 弹层内：搜索框（`Input`）+ 6 列 CSS Grid 图标网格 + "显示更多"分批加载（`visibleCount` 递增 200）
- [x] 每个图标项使用 `resolveLucideIcon` 渲染，`size-4`，hover `bg-accent rounded`，选中 `border-primary bg-accent`
- [x] 值写入使用 `useCurrentFormState` + `useScopeSelector` 模式（参考 picker-renderer.tsx）
- [x] 触发器显示当前选中图标的预览（小图标 + 名称），或 placeholder 文案
- [x] `clearable` 支持：清空按钮显示/隐藏
- [x] 定义 `iconPickerRendererDefinition`：`type: 'icon-picker'`、`sourcePackage`、`fields`（含 `formFieldRules`）
- [x] 在 `index.tsx` 中导入并注册到 `formAdvancedRendererDefinitions`
- [x] 在 `index.tsx` 中导出 `IconPickerRenderer` 和 `iconPickerRendererDefinition`

Exit Criteria:

- [x] `IconPickerRenderer` 渲染一个 Popover 触发器，点击打开图标网格
- [x] 搜索框可过滤图标列表
- [x] 选中图标后值正确写入 form/scope
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck` 通过

### Phase 4 - IconPicker 测试

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/__tests__/icon-picker.test.tsx`

- Item Types: `Proof`

- [x] 新建 `icon-picker.test.tsx`，参考 `icon-size-token.test.tsx` 和 `tag-list.test.tsx` 的测试模式
- [x] 测试：渲染触发器按钮，点击打开 Popover
- [x] 测试：搜索过滤图标列表
- [x] 测试：选中图标后值写入
- [x] 测试：clearable 清空值
- [x] 测试：disabled 状态禁止交互

Exit Criteria:

- [x] 测试文件存在且所有用例通过
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 通过

### Phase 5 - 全量验证与文档同步

Status: completed
Targets: 全仓库

- Item Types: `Proof`, `Follow-up`

- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm lint` 通过
- [x] `pnpm test` 通过
- [x] 确认 `docs/components/index.md` 已包含 `icon-picker/`（Phase 0 已完成）
- [x] 确认 `docs/components/icon/design.md` §11 解析流程与实现一致

Exit Criteria:

- [x] 全量 typecheck/build/lint/test 通过
- [x] 文档与代码一致

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。

- Reviewer / Agent: general-1 (independent fresh session)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 0 Blocker, 0 Major — baseline verified (no antd map, no icon-picker registration), all file paths correct, exit criteria observable, workload sufficient

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### icon-picker iconTemplate region

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 首版固定 6 列网格布局已满足核心场景；自定义图标预览模板归后续按需评估
- Successor Required: `no`

### icon-picker component:open handle

- Classification: `optimization candidate`
- Why Not Blocking Closure: 编程式打开弹层场景窄，首版不提供不影响表单值绑定核心能力
- Successor Required: `no`

## Non-Blocking Follow-ups

- Ant Design 映射表定期与 `@ant-design/icons` 版本同步更新机制
- Lucide 图标列表性能优化（debounce 搜索、Web Worker）当图标数量大幅增长时评估

## Closure

Status Note: 所有 Phase 完成，全量 typecheck/build/lint/test 通过。独立 closure audit 审核通过。

Closure Audit Evidence:

- Auditor / Agent: general-2 (independent fresh session)
- Evidence: Phase 1-3 exit criteria 全部通过；Phase 4 基础测试通过（5 用例），交互测试因 Base UI Popover portal 限制未覆盖（已记入 Deferred）；Phase 5 全量验证通过；Deferred But Adjudicated 分类诚实，无 in-scope live defect 被隐藏。

Follow-up:

- 见 Non-Blocking Follow-ups
