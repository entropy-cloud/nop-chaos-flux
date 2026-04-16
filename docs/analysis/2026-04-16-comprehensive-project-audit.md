# 2026-04-16 项目文档与代码全面审计报告

> 审计范围：全仓库文档、workspace 包源码、测试、构建配置
> 初稿日期：2026-04-16
> 本次复核：基于 live repo 逐项回看，并删除/修正了已失效、表述过度或已被当前仓库证伪的条目

---

## 1. 文档问题

### 1.1 已确认且已在本次复核中修正的文档漂移

| # | 文件 | 复核结论 | 处理结果 |
|---|------|----------|----------|
| D-01 | `docs/architecture/styling-system.md` | `class-aliases` 实现路径写错，实际在 `packages/flux-core/src/class-aliases.ts` | 已修正 |
| D-02 | `docs/architecture/action-scope-and-imports.md` | 仍写 `ScopeRef.read()`，但 live contract 已拆成 `readVisible()` / `materializeVisible()` | 已修正 |
| D-03 | `docs/architecture/action-scope-and-imports.md` | 多处硬编码代码行号锚点失效 | 已改成稳定路径引用 |
| D-04 | `docs/index.md` | `dingtalk-workflow-tree` 与 `action-flow-tree` 条目重复 | 已删除重复项 |
| D-05 | `docs/logs/index.md` | 缺少 `04-08`、`04-09`、`04-10`、`04-13` 索引条目 | 已补齐 |

### 1.2 初稿中不准确、现已删除的条目

这些条目在 live repo 中不成立，或原描述过于绝对：

- 原 D-05：`docs/architecture/field-frame.md` 并未继续引用错误的 `field_frame.tsx` 路径，当前文档已对齐 `packages/flux-react/src/field-frame.tsx`。
- 原 D-06：`docs/index.md` 当前并未引用不存在的 `docs/architecture/hidden-field-policy-implementation.md`。
- 原 D-11：`docs/index.md` 的 `Active Source Of Truth` 并不存在原文所说的大面积遗漏；其中部分文档本来就不是 active owner doc。
- 原 D-12 ~ D-20、D-22、D-23：把 `docs/logs/`、`docs/analysis/`、`docs/discussions/` 这类历史/分析文件过长直接当 defect 不准确。它们是历史记录或分析材料，长度本身不是问题。

### 1.3 仍然成立的文档问题

| # | 问题 | 说明 | 严重度 |
|---|------|------|--------|
| ~~D-06~~ | ~~`word-editor` 缺少专属 owner 文档~~ | **已解决 (2026-04-16)**: 已创建 `docs/architecture/word-editor/design.md` 架构文档和 `docs/components/word-editor-page/design.md` 组件契约文档，并在 `docs/index.md` 中添加了路由入口。 | ~~High~~ |
| ~~D-07~~ | ~~`docs/architecture/form-validation.md` 超过 active owner doc 体积警戒线~~ | **已解决 (2026-04-16)**: 将详细 TypeScript 类型定义拆分到 `docs/references/form-validation-runtime-types.md`，主文档降至约 43 KB。 | ~~Medium~~ |
| ~~D-08~~ | ~~`AGENTS.md` 与 `docs/index.md` 的路由/规则存在重复维护面~~ | **已解决 (2026-04-16)**: 在 `docs/index.md` 添加了 "Routing Authority" 章节明确其为文档导航 owner；`AGENTS.md` 的路由表精简为操作性子集并明确指向 `docs/index.md` 作为权威来源。 | ~~Medium~~ |
| ~~D-09~~ | ~~`dialog` / `openDialog` 共存的文档表达仍需进一步收口~~ | **已解决 (2026-04-16)**: 在 `docs/architecture/action-scope-and-imports.md` 添加了明确的 "Schema authoring preference" 章节，声明新 schema 应优先使用 `openDialog`。 | ~~Low~~ |

### 1.4 本次复核新增的文档规则

为了避免后续重复误报，已把以下规则写入维护文档：

- `docs/logs/` 是 append-only 历史记录，文件长本身不是缺陷。
- size-based 文档清理应优先关注 active owner docs，而不是日志、讨论或分析材料。

落点：

- `docs/logs/index.md`
- `docs/references/maintenance-checklist.md`

---

## 2. 代码质量问题

### 2.1 生产代码中的调试输出

~~| # | 文件 | 位置 | 问题 |~~
~~|---|------|------|------|~~
~~| C-01 | `packages/word-editor-renderers/src/WordEditorPage.tsx` | 55 | `console.log('Loaded saved document:', savedDocument.savedAt)` |~~
~~| C-02 | 同上 | 131 | `console.log('Chart saved:', chart)` |~~
~~| C-03 | 同上 | 135 | `console.log('Code saved:', code)` |~~

**已解决 (2026-04-16)**: 三处 `console.log` 已从 `WordEditorPage.tsx` 删除。

### 2.2 静默吞错的 API resolver

~~| # | 文件 | 位置 | 问题 |~~
~~|---|------|------|------|~~
~~| C-04 | `packages/flux-code-editor/src/source-resolvers.ts` | 52, 83, 120, 157 | 四处 `dispatch(...).catch(() => {})` 静默吞错 |~~

**已解决 (2026-04-16)**: 提取了共享的 `useAsyncApiResolver<T>` helper，统一处理 `ajax` 请求。错误现在通过 `console.warn` 记录并通过 `{ items, error, loading }` 返回类型暴露给调用方。

### 2.3 Repo 级超大代码文件仍然存在

复核方式：直接运行仓库现有检查脚本 `node scripts/check-oversized-code-files.mjs`。

当前 live repo 仍超 500 行的 tracked code files：

| 文件 | 行数 | 性质 | 复核结论 |
|------|------|------|----------|
| `apps/playground/src/pages/DingTalkFlowDemo.tsx` | 712 | app/demo 页面 | 真实存在，但属于 playground 展示页，不应和核心运行时问题同级处理 |
| `apps/playground/src/pages/PerformanceTablePage.tsx` | 626 | app/demo 页面 | 同上 |
| `packages/nop-debugger/src/panel/styles-css.ts` | 606 | 生产代码 | 真实问题，且可维护性最差；大段内联 CSS 字符串不利于主题演进和局部修改 |
| `packages/flux-renderers-form/src/__tests__/form-array-validation.test.tsx` | 564 | 测试 | 真实存在，但属于测试拆分债务 |
| `packages/report-designer-core/src/__tests__/designer-core.test.ts` | 552 | 测试 | 同上 |
| `packages/report-designer-renderers/src/renderers.integration.test.tsx` | 540 | 测试 | 同上 |
| `packages/flow-designer-renderers/src/designer-command-adapter.ts` | 534 | 生产代码 | 真实问题；命令分发集中且分支过多，已影响可读性和后续扩展 |
| `packages/spreadsheet-core/src/core-dispatch.ts` | 528 | 生产代码 | 真实问题；中心 switch 继续膨胀时，命令边界会越来越难维护 |
| `packages/flux-runtime/src/index.test.ts` | 513 | 测试 | 真实但已接近阈值，优先级低于生产源码热点 |
| `packages/flux-formula/src/parser.ts` | 511 | 生产代码 | 真实存在，但只超 11 行，且 parser 天然比一般文件更难机械切分 |

与初稿相比，需要删除两类不准确表述：

- 不能再写“只有 4 个超过 500 行的文件”，因为 live repo 当前是 10 个 tracked code files 超标。
- 也不能把所有超标文件都一概视为同严重度 defect；测试文件、playground 页面、核心 parser 的处理优先级不同。

建议优先顺序：

1. 先处理 `styles-css.ts`、`designer-command-adapter.ts`、`core-dispatch.ts` 这 3 个生产热点。
2. `parser.ts` 先标记为 watch item，只有在继续改 parser 时再顺手拆，不建议为了 11 行差额做机械拆分。
3. 其余测试和 demo 页面按 owner plan 慢慢消化，不必挤进同一波 P0 修复。

### 2.4 已验证的类型逃逸点

初稿里"生产代码 64 处 any""12 处双重转型"的总量说法没有附 live 证据，过于武断。复核后保留为以下可直接定位的问题：

| # | 文件 | 问题 |
|---|------|------|
| ~~C-05~~ | ~~`packages/flux-code-editor/src/types.ts`~~ | **已确认为有意设计 (2026-04-16)**: `expressionConfig`、`sqlConfig`、`options` 使用 `any` 是因为这些复杂配置对象不满足 `BaseSchema extends SchemaObject` 的索引签名约束 `[key: string]: SchemaValue`。已添加 JSDoc 解释原因，运行时验证由 `isVariableSourceRef`、`isFuncSourceRef`、`isSQLSchemaSourceRef` 等类型守卫完成。 |
| ~~C-06~~ | ~~`packages/flux-code-editor/src/source-resolvers.ts`~~ | **已解决 (2026-04-16)**: 提取了共享的 `useAsyncApiResolver<T>` helper，移除了所有 `as any` 和 untyped reducer patterns。 |
| ~~C-07~~ | ~~`packages/flux-code-editor/src/code-editor-renderer.tsx`~~ | **已解决 (2026-04-16)**: `code-editor-renderer.tsx` 不再包含 `as any` 或 `err: any`；`linter.ts` 中的 `err: any` 已改为 `err: unknown` 并使用 `instanceof Error` 检查。`format.ts` 中的 `as any` 已移除。 |
| ~~C-08~~ | ~~`packages/flux-react/src/hooks.ts`~~ | **已解决 (2026-04-16)**: `as unknown as S` 是有意的泛型桥接，用于将动态 scope 数据桥接到调用者指定的类型 `S`。已添加 JSDoc 明确说明这是类型边界的设计决策，类型责任由调用者的 selector 函数承担。 |
| ~~C-09~~ | ~~`packages/flux-renderers-basic/src/tabs.tsx` 等~~ | **已解决 (2026-04-16)**: 创建了 `useSchemaProps<S>()` helper 函数集中处理 `props.props as unknown as S` 的类型桥接，并添加了完整的 JSDoc 文档说明这是 `RendererComponentProps.props` 为 `Record<string, unknown>` 的架构设计结果。`tabs.tsx`、`table-renderer.tsx`、`ConditionBuilder.tsx` 已更新使用新 helper。 |

建议：

- ~~不要再报笼统总数，直接围绕 `flux-code-editor` 和 renderer schema cast 这两个真实热点建立后续修复计划。~~ **已解决 (2026-04-16)**
- ~~`flux-code-editor` 优先把配置对象和 ajax 结果面收窄成显式接口。~~ **已解决 (2026-04-16)**: 配置对象的 `any` 已添加 JSDoc 说明为有意设计；ajax 结果面已通过 `useAsyncApiResolver<T>` 泛型 helper 收窄。
- ~~renderer family 需要确认是 `RendererComponentProps` 设计问题，还是局部 schema helper 缺失。~~ **已解决 (2026-04-16)**: 确认为架构设计结果，已创建 `useSchemaProps<S>()` helper 集中管理类型桥接。

### 2.5 确认存在的重复实现

| # | 重复内容 | 位置 | 复核结论 |
|---|----------|------|----------|
| ~~C-10~~ | ~~图标解析逻辑（`toIconLookupKey` / `normalizeIconName` / `toLucideKey`）~~ | ~~`packages/flux-renderers-basic/src/icon.tsx` 与 `packages/flow-designer-renderers/src/designer-icon.tsx`~~ | **已解决 (2026-04-16)**: 提取了共享 helper 到 `packages/ui/src/lib/icon-utils.ts`，包含 `ICON_ALIAS_MAP`、`toIconLookupKey`、`normalizeIconName`、`toLucideKey`、`resolveLucideIcon`。两个原文件已简化为使用共享 helper。 |
| ~~C-11~~ | ~~code-editor API resolver 模式~~ | ~~`packages/flux-code-editor/src/source-resolvers.ts` 四处相同请求流程~~ | **已解决 (2026-04-16)**: 已提取 `useAsyncApiResolver<T>` helper 统一处理请求流程，和静默吞错问题在同一修复中解决。 |

原 C-11、C-12 那类“看起来相似”的 overlay/test mock 条目，本次没有继续保留为正式问题，因为复核证据不足以支持“应当提取”为确定结论。

---

## 3. 测试问题

### 3.1 真实存在的测试缺口

| # | 问题 | 说明 | 严重度 |
|---|------|------|--------|
| ~~T-01~~ | ~~`@nop-chaos/ui` 包没有任何测试文件~~ | **已解决 (2026-04-16)**: 添加了 `icon-utils.test.ts` (28 测试) 和 `utils.test.ts` (15 测试)，共 43 个测试覆盖图标解析和 `cn()` 类合并逻辑。 | ~~High~~ |
| ~~T-02~~ | ~~`@nop-chaos/flux-core` 测试面偏窄~~ | **已解决 (2026-04-16)**: 从 6 个测试文件扩展到 8 个：新增 `compiled-cid.test.ts` (15 测试) 和 `constants.test.ts` (9 测试)，覆盖 CID 状态管理和 META_FIELDS 常量。 | ~~Medium~~ |
| ~~T-03~~ | ~~只有 `flux-formula` 配置了覆盖率阈值~~ | **已解决 (2026-04-16)**: `flux-core` 现在也配置了 coverage thresholds (60% branches/functions/lines/statements)，覆盖 `class-aliases.ts`、`compiled-cid.ts`、`constants.ts`、`validation-model.ts`、`path-binding.ts`、`instance-path.ts`。 | ~~Medium~~ |
| ~~T-04~~ | ~~`packages/flux-runtime/vitest.config.js` 是残留编译产物~~ | **已解决 (2026-04-16)**: 已删除 `.js` 文件，保留正确的 `.ts` 版本。 | ~~Low~~ |

### 3.2 初稿中应删除或降级的测试条目

- 原 T-04“`flux-code-editor` 无 vitest.config”描述为事实成立，但不是明确缺陷。它目前依靠包级 `vitest run` 默认配置运行，属于一致性问题，不是功能错误。
- 原 T-06“`word-editor-renderers` 未使用共享配置工厂”不应作为审计问题保留。当前它有独立 `vitest.config.ts` 是因为需要 `setupFiles`，这更像工具层一致性机会，而不是质量缺陷。

---

## 4. 构建与依赖问题

### 4.1 仍然成立的问题

| # | 问题 | 说明 | 严重度 |
|---|------|------|--------|
| ~~B-01~~ | ~~`word-editor-renderers` 把 `@types/use-sync-external-store` 放在 `dependencies`~~ | **已解决 (2026-04-16)**: 已移动到 `devDependencies`。 | ~~Low~~ |
| ~~B-02~~ | ~~`flux-core` 使用 React type import，但 `package.json` 未声明 `react`~~ | **已解决 (2026-04-16)**: 添加了 `@types/react` 作为 `devDependencies`。 | ~~Medium~~ |
| ~~B-03~~ | ~~`flux-react` 和 `nop-debugger` 的 `react-dom` 可能是未使用依赖~~ | **已解决 (2026-04-16)**: 确认未使用，已从两个包的 `dependencies` 中移除。 | ~~Low~~ |
| ~~B-04~~ | ~~`flow-designer-core` / `flow-designer-renderers` 的 `tsconfig.json` 有冗余覆盖~~ | **已解决 (2026-04-16)**: 移除了 `noEmit: true` 下无效的 `rootDir`、`outDir`、`declaration`、`composite`、`declarationMap` 配置。 | ~~Low~~ |
| ~~B-05~~ | ~~`tailwind-preset` 的 build/export 语义不清晰~~ | **已解决 (2026-04-16)**: 明确为源码直出包，移除了 `build` 脚本和 `tsconfig.build.json`。 | ~~Medium~~ |
| ~~B-06~~ | ~~`nop-debugger/tsconfig.build.json` 里把 `@nop-chaos/ui` 路径钉到 `packages/ui/dist/index.d.ts`~~ | **已解决 (2026-04-16)**: 移除了硬编码路径映射，依赖正常的 workspace 解析。 | ~~Low~~ |

---

## 5. 样式与主题问题

### 5.1 真实存在的 Flow Designer 主题债务

初稿把这部分统称为“样式系统违规”过重了，复核后更准确的说法是：

- `flow-designer-renderers` 中确实存在大量硬编码颜色、半透明背景和渐变。
- 这些问题的核心风险不是“所有 inline style 都违规”，而是它们绕开了 token/theme 体系，降低 host 主题接管能力。

已确认的代表性位置：

| # | 文件 | 典型问题 |
|---|------|----------|
| S-01 | `packages/flow-designer-renderers/src/designer-inspector.tsx` | 节点类型颜色表直接写死 `#576a95`、`#ff943e`、`#3296fa` 等 |
| S-02 | `packages/flow-designer-renderers/src/designer-page.tsx` | 页面背景使用硬编码 `linear-gradient(...rgba...)` |
| S-03 | `packages/flow-designer-renderers/src/designer-palette.tsx` | 多处 `rgba(255,255,255,...)` 卡片背景与阴影 |
| S-04 | `packages/flow-designer-renderers/src/designer-toolbar.tsx` | 玻璃态背景和 blur 全部内联写死 |
| S-05 | `packages/flow-designer-renderers/src/dingflow/*` | `bg-[#3296fa]`、`#cacaca`、`#e0e0e0` 等颜色散落在多个 DingFlow 组件 |
| S-06 | `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx` | 画布装饰背景、MiniMap 颜色、Background 颜色直接写死 |

建议：

- 先把“语义色”抽成 CSS 变量或 theme token，而不是一上来追求把所有内联样式完全删掉。
- 优先收敛 `designer-inspector`、`designer-toolbar`、DingFlow 系列，因为这些最容易被宿主感知成“主题不跟随”。
- 动态尺寸、位置、transform 一类 style 仍然可以保留；问题重点在颜色和 host chrome 背景。

### 5.2 `nop-debugger` 需要降级为“主题可移植性债务”，不是直接违规

初稿把 `nop-debugger/src/panel/styles-css.ts` 直接定性为“样式系统违规”并不准确。

复核后的更准确结论：

- 该文件确实大量硬编码 debugger 私有调色板。
- 但 `nop-debugger` 本身是相对自带主题的隔离子系统，不能简单套用普通 renderer 的 marker-only 约束。
- 因此这里更像“未来若要接入 host 主题，需要进一步 token 化”的 theming debt，而不是当前契约 bug。

---

## 6. 优先级建议

### P0

- ~~删除 `WordEditorPage.tsx` 中 3 处生产 `console.log`~~ **已解决 (2026-04-16)**
- ~~修复 `source-resolvers.ts` 4 处静默吞错~~ **已解决 (2026-04-16)**

### P1

- ~~为 `word-editor` 补 dedicated architecture/component owner docs~~ **已解决 (2026-04-16)**
- 为 `@nop-chaos/ui` 增加最小 smoke/render 覆盖
- 清理 `flux-runtime/vitest.config.js`
- 收口 `flux-code-editor` 的 `any` / `as any` 热点
- 处理 `styles-css.ts`、`designer-command-adapter.ts`、`core-dispatch.ts` 三个生产超大文件热点

### P2

- ~~让 `form-validation.md` 按子主题拆分或建立明确 successor docs~~ **已解决 (2026-04-16)**
- 为 `flux-core` 增补测试
- 为 `flux-runtime`、`flux-react` 评估是否增加 coverage gate
- 梳理 Flow Designer 颜色/token 收口路线
- 清理 `react-dom` / `react` / `@types/use-sync-external-store` 这些依赖声明细节

---

## 7. 复核说明

本次对原报告做了两类修正：

1. 删除了被 live repo 证伪的条目。
2. 把“看起来像问题”但本质上是历史材料、工具一致性、或已接受权衡的内容，降级为更准确的表述。

特别说明：

- 日志、分析、讨论类文件很长是正常现象，不应再作为默认审计问题提出。
- 这条规则已记录到 `docs/logs/index.md` 与 `docs/references/maintenance-checklist.md`，用于约束后续审计口径。
