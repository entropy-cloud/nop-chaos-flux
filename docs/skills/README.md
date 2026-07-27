# Skills And Prompt Index

## Purpose

`docs/skills/` collects reusable internal prompts, review playbooks, and audit templates for recurring work in this repo.

Use these files as **method selectors**:

1. decide the task route from `docs/index.md` and the relevant owner docs first
2. then choose the smallest reusable prompt that matches the work method
3. do not use a skill as a substitute for requirement, design, or architecture truth

## Read First

Before using any prompt here, read:

1. `AGENTS.md`
2. `docs/index.md`
3. the owner doc for the area you are touching

## By Task

| If you need to...                                                                                               | Read this first                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Diagnose a bug, flaky test, runtime failure, or cross-layer diagnostic mismatch                                 | `docs/skills/bug-diagnosis-prompt.md`                                                                                                            |
| Run a shorter live execution of the bug diagnosis workflow                                                      | `docs/skills/bug-diagnosis-execution-template.md`                                                                                                |
| Implement a feature or fix via contract-driven test-first slices                                                | `docs/skills/test-first-implementation-prompt.md`                                                                                                |
| Explore the codebase for contract violations by writing failing tests first                                     | `docs/skills/exploratory-contract-testing-prompt.md`                                                                                             |
| Explore the playground and component lab for real E2E failures                                                  | `docs/skills/exploratory-e2e-testing-prompt.md`                                                                                                  |
| Run a broad open-ended adversarial review driven by live code signals                                           | `docs/skills/open-ended-adversarial-review-prompt.md`                                                                                            |
| Review a diff against both repo standards and the originating spec / plan                                       | `docs/skills/diff-standards-and-spec-review-prompt.md`                                                                                           |
| Review whether a high-level plan or design has been compressed into a testable implementation contract          | `docs/skills/implementation-contract-review-prompt.md`                                                                                           |
| Run a structured multi-dimensional deep audit                                                                   | `docs/skills/deep-audit-prompts.md`                                                                                                              |
| Audit code quality with focus on real implementation quality, not metrics theater                               | `docs/skills/code-quality-audit-prompt.md`                                                                                                       |
| Verify a complex interactive renderer (gantt/kanban/calendar/designer) actually displays correctly and operates | `docs/skills/complex-component-display-operability-audit-prompt.md`                                                                              |
| Discover high-ROI architecture deepening opportunities                                                          | `docs/skills/architecture-deepening-review-prompt.md`                                                                                            |
| Turn a plan or design direction into a user-selectable question document                                        | `docs/skills/plan-grilling-question-document-prompt.md`                                                                                          |
| Conduct a multi-round interactive grilling that converges a fuzzy requirement, saved to `docs/discussions/`     | `docs/skills/discussion-grilling-prompt.md`                                                                                                      |
| Audit whether unit tests really protect stable contracts                                                        | `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`                                                                              |
| Review React 19 usage against project-specific best practices                                                   | `docs/skills/react19-best-practices-review.md`                                                                                                   |
| Audit UX patterns, interaction quality, or whether a surface still looks like generic AI-safe output            | `docs/skills/ux-design-pattern-audit-prompt.md`                                                                                                  |
| Review docs for accuracy, strength, and decision quality                                                        | `docs/skills/doc-evaluation.md`, `docs/skills/plan-grilling-question-document-prompt.md`, `docs/skills/diff-standards-and-spec-review-prompt.md` |
| Review or clean up deprecated features                                                                          | `docs/skills/deprecated-feature-cleanup.md`                                                                                                      |
| Review branch integration / merge handling guidance                                                             | `docs/skills/branch-merge.md`                                                                                                                    |
| Design a comprehensive audit-remediation roadmap with milestones, work items, and mission config                | `docs/skills/audit-remediation-roadmap-authoring-prompt.md`                                                                                      |
| Discover refactor targets or request refactor direction                                                         | `docs/skills/code-refactor-discovery-prompt.md`, `docs/skills/architecture-deepening-review-prompt.md`, `docs/skills/code-refactor-prompt.md`    |
| Run AI tone / filler review on generated text                                                                   | `docs/skills/ai-tone-and-filler-review.md`                                                                                                       |
| Explore next-gen low-code attractors and capability opportunities                                               | `docs/skills/next-gen-lowcode-attractor-discovery-prompt.md`                                                                                     |

## Skill Selection Guardrails

Several skills overlap in name. Pick by the question you are answering, not by keyword similarity:

| If you are deciding…                                                                  | Use                                                     | Do NOT use                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Is this plan ready to execute?"                                                      | `implementation-contract-review-prompt.md`              | `deep-audit-prompts.md` (that audits live code, not a draft)                                                                                                                                              |
| "Is the landed code actually correct?"                                                | `deep-audit-prompts.md`                                 | `implementation-contract-review-prompt.md` (that reviews a plan, not code)                                                                                                                                |
| "Find unknown problems by probing live code"                                          | `open-ended-adversarial-review-prompt.md`               | `deep-audit-prompts.md` (that uses a fixed checklist)                                                                                                                                                     |
| "Does this complex renderer display correctly and can users operate it?"              | `complex-component-display-operability-audit-prompt.md` | `deep-audit-prompts.md` dimensions 21/22/23 (when you already plan a full audit) or `flux-component-design-review-prompt.md` (pre-implementation design review, not post-implementation functional check) |
| "Did we hit a real bug?"                                                              | `bug-diagnosis-prompt.md`                               | `exploratory-e2e-testing-prompt.md` (that finds symptoms, not root cause)                                                                                                                                 |
| "Is this React 19 usage correct?"                                                     | `react19-best-practices-review.md`                      | `code-quality-audit-prompt.md` (broader, less specific)                                                                                                                                                   |
| "Should this surface be refactored?"                                                  | `code-refactor-discovery-prompt.md`                     | `architecture-deepening-review-prompt.md` (that targets module seams, not a single surface)                                                                                                               |
| "Multi-round grilling that converges a requirement and saves to `docs/discussions/`?" | `discussion-grilling-prompt.md`                         | `plan-grilling-question-document-prompt.md` (one-shot question pack to `docs/analysis/`, not interactive) or `.opencode/skills/nop-deep-interview` (fuzziness-scored, chat-only)                          |

Rule: when two skills could both apply, prefer the **narrower** one. A skill is a _method selector_ — it never replaces the owner doc or active requirement as the source of truth.

## Recommended Starting Set

For the most common engineering work in this repo, start with:

1. `docs/skills/bug-diagnosis-prompt.md`
2. `docs/skills/test-first-implementation-prompt.md`
3. `docs/skills/exploratory-contract-testing-prompt.md`
4. `docs/skills/exploratory-e2e-testing-prompt.md`
5. `docs/skills/open-ended-adversarial-review-prompt.md`
6. `docs/skills/deep-audit-prompts.md`

## 项目定制化层（nop-chaos-flux）

使用涉及审计、修复或本章定制化引用的 skill 时，必须将以下信息注入上下文：

### 验证命令

| 目的                          | 命令                                                |
| ----------------------------- | --------------------------------------------------- |
| 安装依赖                      | `pnpm install`                                      |
| 类型检查（全量）              | `pnpm typecheck`                                    |
| 构建（全量）                  | `pnpm build`                                        |
| 测试（单元）                  | `pnpm test`                                         |
| E2E 测试                      | `pnpm test:e2e`                                     |
| Lint                          | `pnpm lint`                                         |
| 全量检查                      | `pnpm check`                                        |
| 审计可疑点                    | `pnpm check:audit-suspects`                         |
| 审计 runtime 裸 schema 读取   | `pnpm check:audit-runtime-raw-schema-reads`         |
| 审计 FieldFrame 绕过          | `pnpm check:audit-fieldframe-bypasses`              |
| 审计异步失败路径              | `pnpm check:audit-async-failure-paths`              |
| 审计硬编码类型分发            | `pnpm check:audit-hardcoded-type-dispatch`          |
| 审计 renderer 标记缺失        | `pnpm check:audit-missing-renderer-markers`         |
| 审计测试全局泄漏              | `pnpm check:audit-test-global-leaks`                |
| 审计性能可疑点                | `pnpm check:audit-performance-suspects`             |
| 审计样式可疑点                | `pnpm check:audit-styling-suspects`                 |
| 审计非 retained renderer 引用 | `pnpm check:audit-non-retained-renderer-references` |
| 审计 reactive render reads    | `pnpm check:audit-reactive-render-reads`            |
| 审计 React 19 优化候选        | `pnpm check:audit-react19-optimization-candidates`  |
| 依赖分析                      | `pnpm audit:deps`                                   |
| 死代码/死导出检测             | `pnpm audit:knip`                                   |
| 变异测试                      | `pnpm audit:mutants`                                |
| Semgrep SAST                  | `pnpm audit:semgrep`                                |
| React Doctor                  | `pnpm audit:react-doctor`                           |

### 命名约定

- 包前缀：`@nop-chaos/<name>`
- 源码目录：`packages/<name>/src/`
- 公共导出面：`packages/<name>/src/index.ts`
- Renderer 定义：`packages/<name>/src/<name>-renderer-definitions.ts`
- 测试文件：`*.test.ts` / `*.test.tsx`，可并列或置于 `__tests__/`
- 工作空间协议：`"@nop-chaos/flux-core": "workspace:*"`
- 内部导入：同包内使用相对路径

### 包层级管线

```
flux-core → flux-formula → flux-compiler → flux-action-core → flux-runtime → flux-react → flux-renderers-*
```

### 保护区域（来自 `docs/context/ai-autonomy-policy.md`）

| 区域                                                       | 规则         |
| ---------------------------------------------------------- | ------------ |
| `packages/flux-core/src/`（编译期：scope、表达式、schema） | `plan-first` |
| Schema/contract validation                                 | `plan-first` |
| `packages/ui/src/index.ts`（公共 UI 组件导出）             | `ask-first`  |
| Renderer 定义字段                                          | `plan-first` |
| 样式契约（marker classes、`data-slot`、no BEM）            | `plan-first` |
| 认证/安全边界                                              | `ask-first`  |

## 已知失败模式

来自 `docs/lessons/` 和 `docs/bugs/` 的高频复现问题，skill 使用者在规划审计或修复时应主动检查。每条附有检测方法、防护建议及关联 lesson 参考。

1. **React Strict Mode 双触发导致状态损坏** —— `useEffect` 清理与 pending 异步回调的竞争条件（例：Gantt bars 渲染 bug）
   - 检测：React Strict Mode 下观察 `useEffect` cleanup + re-run 时序，检查异步回调中是否有 stale closure
   - 防护：`useEffect` 中使用 ref 或 cleanup flag 防止 cleanup 后的回调修改状态

2. **'use no memo' 文件误改** —— `node-renderer-resolved.tsx`、`render-nodes.tsx`、`dynamic-renderer.tsx` 使用 `'use no memo'` 声明，React Compiler 不得重写其 memo 化
   - 检测：grep 检查 `'use no memo'` 文件是否被 React Compiler 自动重写
   - 防护：修改这些文件时显式验证 `'use no memo'` 声明未被移除；PR review 中重点检查

3. **公共导出面未经 plan** —— `packages/*/src/index.ts` 是受保护区域，修改前必须有 plan 和 owner doc
   - 检测：grep 检查 `packages/*/src/index.ts` 变更历史
   - 防护：修改 `index.ts` 前须创建 plan 并引用 owner doc

4. **样式类名硬编码 / BEM 命名漂移** —— 布局 renderer 只应发射 marker 类，不使用硬编码 `gap-4`、`flex`、`p-4` 等；BEM 风格 `--` 修饰符违反 no-BEM 政策
   - 检测：grep 搜索 `--` 在 CSS class 中的使用；`check:audit-styling-suspects` 扫描 bare selector
   - 防护：lint rule 禁止 CSS 中使用 `--` 修饰符命名；review checklist 检查 marker class vs visual class 分离
   - 关联 lesson: `docs/lessons/README.md#02-bem-naming-drift-in-css-class-selectors`

5. **Tailwind v4 monorepo `@source` 遗漏** —— 新增包时必须更新 `apps/playground/src/styles.css` 中的 `@source` 指令
   - 检测：新包创建后检查 `styles.css` 中是否已添加 `@source` 指向新包路径
   - 防护：新增包 checklist 第一项："Add @source to playground styles.css"

6. **store.parse / store.destroy 生命周期不匹配** —— Zustand 在 Strict Mode 下初始化与销毁的时序问题
   - 检测：Zustand store 初始化/销毁日志追踪
   - 防护：对 Zustand store 添加 `isMounted` guard 或显式生命周期管理

7. **异步路径未处理失败 / void-promise 缺少错误路由注释** —— `async` 函数中缺少 try-catch 导致静默失败；fire-and-forget `void` 调用缺少结构化错误路由说明
   - 检测：`check:audit-async-failure-paths` 扫描；grep 搜索 `void ` 在 async 上下文中的使用
   - 防护：所有 `void` 前缀的 async 调用必须附带 `// Errors routed through <mechanism>` 注释；empty catch 块应通过 ESLint `no-empty` 规则禁止
   - 关联 lesson: `docs/lessons/README.md#03-async-void-promise-without-structured-error-routing`

8. **测试全局泄漏** —— 测试间共享全局状态导致交叉污染（`check:audit-test-global-leaks` 可扫描）
   - 检测：`check:audit-test-global-leaks` 扫描
   - 防护：测试使用 `beforeEach`/`afterEach` 清理全局状态

9. **文档契约漂移** —— 架构文档（field-frame.md, form-validation.md 等）包含与 live code 不一致的 API 名、类型引用或行为声明，误导依赖该文档的 AI agent 或开发者
   - 检测：MA6 文档一致性审计——交叉验证每个 doc claim 与 live repo 代码签名、类型及行为
   - 防护：修改公共 API 或 renderer 行为时，同步更新对应 `docs/architecture/` 文档；PR checklist 加入 doc-review 步骤
   - 关联 lesson: `docs/lessons/README.md#05-documentation-contract-drift-from-live-code`

10. **硬编码字符串绕过 i18n** —— 渲染器组件使用硬编码中文/英文字符串替代 `t()` 调用，导致多语言支持断裂
    - 检测：grep 搜索渲染器文件中的中文字符串或硬编码英文字符串（非 `t()` 调用）
    - 防护：所有用户可见字符串必须通过 `t()` 函数引用；`check:i18n-keys` 可验证 key 是否已定义

## Notes

1. Prefer the shorter, narrower prompt when two prompts could both apply.
2. If the task is a local straightforward fix, you often do not need a reusable prompt at all.
3. For bug work, prefer `bug-diagnosis-prompt.md` before jumping directly to exploratory testing.
4. For E2E failures, pair the relevant prompt with `docs/references/e2e-test-diagnostic-guide.md` and `docs/testing/e2e-standards.md`.
