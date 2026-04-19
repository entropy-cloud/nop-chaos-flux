# 深度审核汇总报告 — Runtime 核心模块

## 审核范围
- 执行的维度：全部 18 个维度
- 覆盖的包：flux-core、flux-formula、flux-runtime、flux-react（核心）；维度 09-12、18 自然覆盖 flux-renderers-*、flow-designer-*、spreadsheet-*、report-designer-*、word-editor-*、nop-debugger
- 审核日期：2026-04-18
- 执行方式：每个维度一个初审子 agent + 一个维度复核子 agent + 子项复核（与维度复核合并执行）
- 审核标识：kernel（runtime 核心模块深度审核）

## 复核统计
- 初审发现总数：约 90 项
- 已独立复核条目数：90（全部 18 维度完成初审+维度复核+子项复核）
- 保留：约 58 项
- 降级：约 16 项
- 驳回：约 12 项
- 信息级/备注：约 4 项

---

## P1 清单（按严重程度排序）

| # | 维度 | 文件 | 标题 | 备注 |
|---|------|------|------|------|
| 1 | 08 | form-runtime-owner.ts:194 | applyChangesAndRevalidate 缺路径所有权校验 | isPathOwned 存在未调用，违反文档契约 |
| 2 | 08 | detail-field.tsx:83, detail-view.tsx:99 | draft FormRuntime 未 dispose | async timer/Map 泄漏，无 useEffect 清理 |
| 3 | 02 | data-source-runtime.ts (696行) | 职责混合，两个独立状态机+工具函数 | 可拆为 shared-utils + formula-ctrl + api-ctrl |
| 4 | 14 | data-source-runtime.ts | 696行核心模块零单元测试 | grep 确认无任何测试引用 |
| 5 | 16 | AGENTS.md:289 | RendererComponentProps 导入来源错误 | 28+渲染器从 flux-core 导入，按文档写编译报错 |
| 6 | 16 | renderer-runtime.md:407 | useCurrentFormState 签名严重漂移 | 整个调用约定不同：selector-based vs no-arg getter |
| 7 | 10 | form-renderers.css:1-71 | nop-* 标记类携带隐式布局样式 | 4个标记类绑 display:grid/flex + gap |
| 8 | 10 | sonner.tsx:1 | 依赖 next-themes ThemeProvider | 违反主题独立性原则 |
| 9 | 10 | flow-designer-renderers (9文件) | 硬编码 hex 颜色 ~30处/16-18色值 | 完全绕过设计令牌系统 |

## P2 清单（按维度分组）

### 架构与模块边界 (01-03)

| # | 维度 | 文件 | 标题 |
|---|------|------|------|
| 1 | 01 | AGENTS.md | 依赖流文档与实际代码不一致 |
| 2 | 01 | packages/ui/package.json | ui 包反向依赖 flux-i18n |
| 3 | 02 | hooks.ts (430行) | 26个hook聚合，表单hook模板重复 |
| 4 | 02 | form-runtime*.ts (3处) | 错误重建逻辑3处重复（setValue/applyExternalErrors/executeSetValues） |
| 5 | 02 | runtime-factory.ts (483行) | 工厂内联实现过长，可提取 hostProjectionScope |
| 6 | 02 | flux-runtime/src/ | 48个顶层非测试文件，18个form文件建议子目录化 |
| 7 | 03 | renderer-hooks.ts:109 | RendererHookApi 缺 useCurrentFormState/useCurrentFormModelGeneration |

### 运行时与状态 (04-08)

| # | 维度 | 文件 | 标题 |
|---|------|------|------|
| 8 | 05 | hooks.ts:137 | useScopeSelector 无路径过滤（设计限制） |
| 9 | 06 | form-runtime-submit-flow.ts:191 | submitApi HTTP错误绕过 onSubmitError |
| 10 | 06 | runtime-action-helpers.ts:35 | 异步验证 API 调用缺少 AbortSignal |
| 11 | 08 | form-runtime-owner.ts:64 | revalidateDependents 不传递原始 reason |

### 渲染器与 UI (09-12)

| # | 维度 | 文件 | 标题 |
|---|------|------|------|
| 12 | 09 | crud-renderer.tsx:155-159 | 硬编码 $crud scope 写入绕过 statusPath |
| 13 | 09 | variant-field.tsx:253-274 | 手动构建 nop-field 绕过 FieldFrame（丢 label 语义/required） |
| 14 | 10 | word-editor-renderers | 硬编码 Tailwind 颜色类（降级：专用面板） |
| 15 | 10 | flow-designer-nodes.css | ~25+ BEM __/-- 违规（playground） |
| 16 | 10 | styles.css:426-442 | nop-code-editor BEM 修饰符 |
| 17 | 10 | designer-toolbar.tsx:138 | 标记类混合布局 |
| 18 | 10 | nop-debugger styles-css.ts | ~14处原始 hex 绕过 CSS 变量 |
| 19 | 10 | DesignerXyflowNode.tsx:131 | bg-white/96 破坏暗色模式 |
| 20 | 10 | designer-palette/inspector.tsx | 标记类混合 flex/h-full |
| 21 | 10 | WordEditorPage.tsx:326 | 标记类混合 h-screen/overflow-hidden |
| 22 | 12 | array-field.tsx:346 | item 区域缺 params 声明，与 loop/tree 模式不一致 |

### 工程质量 (13-15)

| # | 维度 | 文件 | 标题 |
|---|------|------|------|
| 23 | 13 | node-runtime.ts:54 | state?: any 丢失精确类型 |
| 24 | 13 | action-runtime-handlers.ts:226 | navigate 签名与实际使用不匹配 |
| 25 | 14 | flux-core path-binding.ts | coverage include 列出但无测试 |
| 26 | 14 | manifest.ts (281行) | 诊断清单构建零测试 |
| 27 | 14 | flux-react node-renderer/render-nodes | 核心渲染路径无独立测试（集成测试覆盖 happy path） |

### 文档与一致性 (16-18)

| # | 维度 | 文件 | 标题 |
|---|------|------|------|
| 28 | 16 | flux-runtime-module-boundaries.md | 8个 form-runtime-* 文件未记录 |
| 29 | 16 | renderer-runtime.md | useScopeSelector 签名漂移（缺 S 泛型+options） |
| 30 | 16 | renderer-runtime.md | RenderRegionHandle.render() 缺3字段 |
| 31 | 16 | renderer-runtime.md | RenderFragmentOptions 漂移（缺3字段+data未标deprecated） |
| 32 | 16 | flux-runtime-module-boundaries.md | runtime-factory.ts 483行零文档 |
| 33 | 16 | flux-runtime-module-boundaries.md | schema-compiler/ 9文件未记录 |
| 34 | 17 | flux-react/src/ | 5个 camelCase hook 文件 vs kebab-case 约定 |
| 35 | 17 | schema.ts:102 | ApiObject vs ApiSchema 双词汇活跃使用 |
| 36 | 18 | flux-code-editor | 唯一缺少 register* 的渲染器包 |
| 37 | 18 | table/chart/tree-renderer | fallback 硬编码英文（i18n key 已存在可直接替换） |

## P3 清单（精选高价值项）

| # | 维度 | 文件 | 标题 |
|---|------|------|------|
| 1 | 02 | shape-validation.ts (596行) | 职责偏重但已位于子目录，内聚（降级自P2） |
| 2 | 04 | form-runtime.ts:70 | lastChange 在验证更新时携带过时上下文 |
| 3 | 04 | status-hooks.ts:5 | useStatusPathPublication 无清理函数 |
| 4 | 06 | reaction-runtime.ts:108 | Reaction runReaction 未处理 Promise rejection |
| 5 | 06 | imports.ts:158 | Import 模块加载不支持取消 |
| 6 | 07 | schema-renderer.tsx:115 | import 预加载 effect 中 props.env 依赖 |
| 8 | 08 | form-state.ts + field-frame.tsx | shouldShowFieldError 重复实现（3处） |
| 9 | 08 | form-runtime-owner.ts:186 | supersedeLowerPriorityWork 范围偏宽（降级自P2） |
| 10 | 09 | crud-renderer.tsx:163,188 | 硬编码中文 fallback '暂无数据' |
| 11 | 09 | variant-field/detail-view/detail-field | 3处 RendererDefinition.component as any |
| 12 | 10 | designer-theme.css | 标记类携带视觉样式但全通过CSS变量（降级） |
| 13 | 12 | variant-field.tsx | 手动构建 nop-field（部分合理） |
| 14 | 12 | detail-view.tsx:280 | 内联 field rule vs formLabelFieldRule |
| 15 | 13 | action-runtime-handlers.ts:102 | 冗余 as any |
| 16 | 13 | data-source-runtime.ts:643 | setTimeout/setInterval 返回类型混淆 |
| 17 | 13 | node-renderer-effects.ts:67 | lifecycleActions unknown 应收窄 |
| 18 | 15 | field-frame.tsx:70 | aggregateError 全量 store 订阅 |
| 19 | 15 | hooks.ts:166 | useOwnScopeSelector getSnapshot 未 memo |
| 20 | 17 | renderer-compiler.ts:6-7 | 废弃类型别名零导入，死导出 |
| 21 | 17 | dist/ | 陈旧 dist 引用 CompiledSchemaNode |
| 22 | 18 | flow-designer-core/nop-debugger | 不使用 Zustand（可解释差异） |
| 23 | 18 | code-editor + validation/message.ts | 系统性验证消息 i18n 缺失 |
| 24 | 18 | nop-debugger panel.tsx | FILTER_LABELS 硬编码英文（同文件已用 t()） |

## 驳回清单

| # | 维度 | 原始发现 | 排除理由 |
|---|------|---------|---------|
| 1 | 04 | statusPath 双写入 | 命令式/声明式互斥 |
| 2 | 08 | draftError 组件本地 state | 瞬时对话框 UI 反馈，组件 state 正确 |
| 3 | 08 | computeScopeState ready 语义 | ready 语义正确，canSubmit 单独处理 touched |
| 4 | 09 | CrudRenderer 内部区域 marker class | 设计意图，与所有渲染器一致 |
| 5 | 14 | fake timers 隔离性 | afterEach 是 Vitest 标准推荐模式 |
| 6 | 18 | console.warn 前缀不一致 | 仅开发者诊断消息，纯装饰性 |

## 高频问题文件

| 文件 | 出现维度数 | 关键问题 |
|------|-----------|---------|
| form-runtime-owner.ts | 4 (04, 08x3) | lastChange 语义、路径所有权、验证并行、supersede 范围 |
| data-source-runtime.ts | 4 (02, 06, 14, 13) | 职责混合、无测试、signal 缺失、timer 类型 |
| hooks.ts | 4 (02, 05, 13, 15) | 模板重复、路径过滤、类型断言、memo 不一致 |
| field-frame.tsx | 3 (08, 12, 15) | shouldShowFieldError 重复、订阅精度 |
| form-renderers.css | 2 (09, 10) | 标记类携带布局 |
| renderer-runtime.md | 1 (16x6) | 6处文档漂移 |
| flux-renderers-data | 2 (09, 18) | $crud scope + fallback 英文 |
| flow-designer-renderers | 2 (09, 10x3) | 硬编码颜色 + BEM 违规 |

## 跨维度模式

### 1. 订阅精度天花板
维度05和15共同发现：`useScopeSelector` 全量订阅 + `useCurrentFormState` 全量广播是两个最主要的性能瓶颈入口。热路径已通过 `scopeChangeHitsDependencies` 精确优化，但通用 API 层缺乏路径级订阅能力。

### 2. 异步取消不完整
维度06发现 AbortController 已在 request-runtime、data-source、React 层全面采用，但异步验证和 Reaction 的取消链路尚未闭合。

### 3. 验证系统边界校验
维度08发现验证系统核心质量高，但 `applyChangesAndRevalidate` 路径所有权校验缺失是架构契约违反。draft FormRuntime 未 dispose 是资源泄漏风险。

### 4. 样式系统违规集中
维度10发现3个P1级样式违规：form-renderers.css 标记类携带布局、sonner.tsx 依赖 next-themes、flow-designer 大量硬编码颜色。加上8个P2项，样式系统是本次审核发现密度最高的维度。

### 5. 文档-代码漂移严重
维度16发现2个P1级文档错误（AGENTS.md 导入来源、useCurrentFormState 签名）和6个P2级漂移。renderer-runtime.md 和 flux-runtime-module-boundaries.md 是漂移最严重的两份文档。

### 6. i18n 覆盖不完整
维度18和09共同发现：table/chart/tree 渲染器 fallback、code-editor 验证消息、nop-debugger FILTER_LABELS 均硬编码英文，而项目 i18n key 已存在可直接使用。flux-runtime/validation/message.ts 的验证消息也是系统性硬编码。

### 7. 渲染器契约一致性高
维度09确认 41 个渲染器中 38 个完全合规（93%），仅 3 个有问题。维度11确认 UI 组件使用 100% 合规。维度12确认 38/41 field metadata 合规。

### 8. 类型边界收敛机会
维度13发现四个核心包的 any 使用总体合理，但 `navigate` 签名不匹配和 `state?: any` 是值得收敛的明确机会。

## 已自动化的检查项

| 检查 | 工具 | 覆盖维度 |
|------|------|---------|
| 文件大小阈值 | `pnpm check:oversized-code-files` | 02 |
| ESLint max-lines | `pnpm lint` | 02 |
| 无 eval/new Function | grep 检测 | 15 |
| @ts-expect-error 无注释 | eslint 规则 | 13 |

## 建议新增的自动化检查

1. **依赖方向检查脚本**：验证 AGENTS.md 声明的依赖方向与实际 package.json 一致（覆盖维度01）
2. **store 全量订阅检测**：标记 `useCurrentFormState` 中直接返回 `state.values` 的用法（覆盖维度15）
3. **FormRuntime dispose 完整性检查**：静态分析 `createFormRuntime` 调用点是否在所有退出路径有 dispose（覆盖维度08）
4. **nop-* 标记类零样式规则**：CSS postcss 插件检查 nop-* 类不含 display/gap/padding/margin（覆盖维度10）
5. **i18n 硬编码字符串检测**：标记渲染器中的中英文硬编码 fallback（覆盖维度18）

## 可暂缓项

- ui → flux-i18n 的层级倒置（P2，所有消费者在 monorepo 内）
- useScopeSelector 无路径过滤（P2，需 API 层面增强，影响面广）
- data-source-runtime.ts 文件拆分（P1 但不影响功能，需规划）
- shape-validation.ts 文件拆分（P3，已位于子目录，超700行时再行动）
- parser.ts 文件大小（P3，解析器固有复杂度）
- flow-designer-core/nop-debugger 不用 Zustand（P3，可解释差异）
- 废弃类型别名清理（P3，零导入死导出）

## 误报排除清单

| 原始发现 | 排除理由 |
|---------|---------|
| useResolvedContainer 渲染阶段写 ref | 本地 ref 写入幂等，无外部可观察副作用 |
| useSourceValue 缺少 controller 抽象 | 单 source 标准 AbortController 模式 |
| ref 更新 effect 无依赖数组 | React 标准 "latest ref" 惯用写法 |
| DialogHost 内联不稳定引用 | subscribe/getSnapshot 实际稳定 |
| NodeRendererResolved selector 内联 | 关键函数已 memo，订阅精度最高 |
| executeSource 缺少 signal | signal 可通过 ctx 传递 |
| CrudRenderer 子区域 nop-* marker | 设计意图，与所有渲染器一致 |
| draftError 组件本地 state | 瞬时 UI 反馈，组件 state 正确 |
| computeScopeState ready 语义 | 语义正确，canSubmit 单独处理 |
| fake timers afterEach 隔离 | Vitest 标准推荐模式 |
| console.warn 前缀不一致 | 纯装饰性，遵循模块身份命名 |

---

## 整体评估

**Runtime 核心模块健康度：良好**

四个核心包的架构设计质量显著高于同类项目平均水平：

1. **依赖边界清晰**：严格单向 DAG，零跨包内部路径导入，零循环依赖
2. **状态架构扎实**：form values / fieldStates / scope snapshot 职责清晰，无双状态镜像
3. **异步安全基线高**：AbortController 全面采用，提交并发保护有回归测试
4. **渲染层设计优秀**：NodeRenderer 的 `scopeChangeHitsDependencies` 依赖过滤是代码库中订阅精度最高的实现
5. **验证系统核心完善**：generation-aware stale suppression、debounce bypass、hidden field policy 均正确实现
6. **渲染器契约合规率高**：41 个渲染器中 38 个完全合规（93%），UI 组件使用 100% 合规
7. **类型安全边界合理**：any 使用集中在低代码动态边界，可收敛项明确

主要改进方向（按 ROI 排序）：

1. **applyChangesAndRevalidate 路径所有权校验**（P1，架构契约违反，修复成本低）
2. **draft FormRuntime dispose 缺失**（P1，资源泄漏，修复成本低）
3. **AGENTS.md + renderer-runtime.md 文档修正**（P1，误导性最大，修复成本最低）
4. **form-renderers.css 标记类去样式化**（P1，renderer package 发布前必修）
5. **sonner.tsx 去除 next-themes 依赖**（P1，主题独立性）
6. **submitApi onSubmitError 不可达**（P2，功能缺陷）
7. **table/chart/tree fallback i18n 化**（P2，i18n key 已存在，改动极小）
8. **data-source-runtime.ts 拆分 + 测试**（P1，影响面大需规划）
9. **异步验证 AbortSignal 管道**（P2，竞态防护）
10. **flow-designer 硬编码颜色迁移至 CSS 变量**（P1，工作量大但可分批）
