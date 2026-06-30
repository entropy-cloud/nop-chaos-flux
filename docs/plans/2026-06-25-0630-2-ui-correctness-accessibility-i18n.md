# UI Package Correctness, Accessibility, And i18n Bridge Wiring

> Plan Status: completed
> Last Reviewed: 2026-06-25
> Source: `docs/audits/2026-06-24-2213-open-audit-components.md` (P0-2, P1-2, P1-3, P1-4, P1-5, P1-8, S-5, S-6)
> Related: `docs/plans/2026-06-25-0630-1-renderer-correctness-and-contract-guard.md`

## Purpose

收口 `packages/ui`（shadcn-based，零 `@nop-chaos/*` 依赖）中由 components 审计确认的 silent-correctness defect（Toaster props 覆盖、useDialogDrag body style 泄漏）、a11y 缺陷（Card/Carousel/Sidebar 键盘与捕获）、以及 i18n 注入桥（`setI18nGetter`）从未接线的跨包契约漂移（18 条 a11y chrome 串永久英文）。

## Current Baseline

起草前已对 live code 抽查核实：

- **Toaster 自毁**：`packages/ui/src/components/ui/sonner.tsx:39` 末尾 `{...props}` 覆盖了 `:16` className、`:17-23` icons、`:34-38` toastOptions；多数调用方 `<Toaster />` 无 props → 导出的 `TOASTER_Z_INDEX = 10000` 永不生效（P0-2，confirmed via live read）。
- **useDialogDrag 泄漏**：`use-dialog-drag.ts:170-171` set body `userSelect='none'`，仅在 `stopDrag`(`:125-126`) 还原；unmount cleanup(`:214-224`) 移除监听但不清 body style → 拖拽中途关闭则整文档不可选（P1-2）。
- **Card 交互无 a11y**：`card.tsx:5-25` 有 `onClick` 时点亮 `nop-haptic` 但无 `role`/`tabIndex`/`onKeyDown`（P1-3，WCAG 2.1.1）。
- **Carousel 捕获劫持**：`carousel.tsx:77-85,121` capture-phase `ArrowLeft/Right` `preventDefault()` 覆盖整区域，破坏 slide 内输入控件光标/滑块（P1-4）。
- **SidebarProvider Cmd/Ctrl+B 劫持**：`sidebar-context.tsx:68-78` 全局 `keydown` 无 target 过滤，输入框内 Cmd+B 被劫持（P1-5）。
- **i18n 桥死线**：`packages/ui/src/lib/i18n.ts:37-47` `setI18nGetter` 零生产调用方（repo-wide grep）；文档声称的 `packages/flux-bundle/src/index.tsx` 接线不存在（74 行文件未 import `@nop-chaos/ui`）。18 个 `ui` 组件的 `t('flux.*')` 永久解析为内置英文 map（P1-8）。
- **S-5**：`FieldTitle` 与 `FieldLabel` 都 emit `data-slot="field-label"` → CSS/test 选择器歧义。
- **S-6**：`ChartLegendContent`/`ChartTooltipContent` 用 `key={item.value}`/`key={name}` 可能碰撞导致行消失。

## Goals

- 修复 P0-2/P1-2 silent correctness（Toaster props 顺序、useDialogDrag body style 还原）。
- 收敛 P1-3/P1-4/P1-5 a11y（Card 键盘可达、Carousel 不劫持后代按键、Sidebar 不劫持输入态快捷键）。
- 对 i18n 桥（P1-8）作出明确契约裁定并落地：要么从 host 包接线 `setI18nGetter` 让 `ui` chrome 跟随 `flux-i18n`，要么显式文档化 `ui` chrome 为 English-only 并移除误导性 DI seam。
- 收敛 S-5/S-6 selector/key 歧义。

## Non-Goals

- 不重写 shadcn 组件视觉设计。
- 不改动 renderer 包代码（归 Plan 1）。
- 不做全包键盘/屏幕阅读器 a11y 专项（仅收敛本审计列出的 Card/Carousel/Sidebar 三例）。
- 不迁移 Sonner 版本或替换 toast 方案。

## Scope

### In Scope

- `packages/ui/src/components/ui/sonner.tsx`（P0-2）
- `packages/ui/src/components/ui/use-dialog-drag.ts`（P1-2）
- `packages/ui/src/components/ui/card.tsx`（P1-3）
- `packages/ui/src/components/ui/carousel.tsx`（P1-4）
- `packages/ui/src/components/ui/sidebar-context.tsx`（P1-5）
- `packages/ui/src/lib/i18n.ts` + host 接线或文档化（P1-8）
- `FieldTitle`/`FieldLabel` slot 歧义（S-5）
- `ChartLegendContent`/`ChartTooltipContent` key 碰撞（S-6）

### Out Of Scope

- `ui` 内未被审计点名的组件。
- renderer 侧（Plan 1）/ docs（Plan 3）。

## Failure Paths

| 场景编号            | 触发                                | 行为                                                          | 可重试 | 用户可见表现                        |
| ------------------- | ----------------------------------- | ------------------------------------------------------------- | ------ | ----------------------------------- |
| p0-2-toaster-zindex | toast 渲染                          | zIndex 应用为 10000，theme/icons/className 生效               | 否     | toast 层级正确、图标为自定义 lucide |
| p1-2-drag-unmount   | 拖拽 dialog 中途 unmount            | body userSelect 在 cleanup 还原                               | 否     | 文档恢复可选                        |
| p1-5-sidebar-bold   | 输入框内按 Cmd+B                    | 不被 SidebarProvider 拦截 preventDefault                      | 否     | 原生输入行为保留                    |
| p1-8-i18n-chrome    | 非 en locale 下打开 dialog/carousel | chrome 文案跟随 flux-i18n（接线方案）或稳定英文（文档化方案） | 否     | 屏幕阅读器语言符合预期              |

## Test Strategy

档位选择：**建议有测**

理由：Toaster/useDialogDrag 属组件行为回归，应有 focused 测试；a11y 改动以行为抽查 + 既有测试为主；i18n 桥属契约裁定，接线后需验证 `t()` 走 `flux-i18n`。非鉴权/公共 API 核心回归，故不强制 must-automate，但 P0-2/P1-2 应有断言。

## Execution Plan

### Phase 1 - Silent Correctness (P0-2, P1-2)

Status: completed
Targets: `packages/ui/src/components/ui/sonner.tsx`、`use-dialog-drag.ts`

- Item Types: `Proof`、`Fix`

- [x] (Proof) 新增 Toaster 测试：渲染 `<Toaster />` 后断言应用了 `TOASTER_Z_INDEX`、自定义 className、icons（证明 `{...props}` 不再覆盖默认）。
- [x] (Fix) `sonner.tsx` 将 `{...props}` 移到最前（先 spread，再用 `cn('toaster group', props.className)` 合并、用 props 值兜底 icons/style/toastOptions），确保不覆盖调用方传入的 className 也不丢默认配置（P0-2）。
- [x] (Fix) `use-dialog-drag.ts` 在 unmount cleanup（`:214-224`）还原 body `userSelect`/`-webkit-user-select`（与 `stopDrag` 同一还原逻辑）（P1-2）。新增“拖拽中 unmount 后 body 可选”测试。

Exit Criteria:

- [x] Toaster 默认配置（zIndex/icons/className）在 focused 测试中断言生效。
- [x] useDialogDrag unmount 后 body `user-select` 复原的测试通过。

### Phase 2 - Accessibility (P1-3, P1-4, P1-5)

Status: completed
Targets: `packages/ui/src/components/ui/card.tsx`、`carousel.tsx`、`sidebar-context.tsx`

- Item Types: `Fix`

- [x] (Fix) `card.tsx` 当传 `onClick` 时补 `role="button"`、`tabIndex={0}`、`onKeyDown`（Enter/Space 触发 click）（P1-3）。
- [x] (Fix) `carousel.tsx:77-85,121` ArrowLeft/Right 处理改为：仅当事件 target 非 input/textarea/contenteditable/select/range 时拦截，或改用 WAI-APG roving tabindex 模式（P1-4）。
- [x] (Fix) `sidebar-context.tsx:68-78` Cmd/Ctrl+B 监听加 target 过滤：当 target 为 input/textarea/contenteditable/editable 时跳过（P1-5）。

Exit Criteria:

- [x] Card 键盘可达（Enter/Space 激活）；Carousel 不再劫持后代输入按键；Sidebar 不在输入态劫持 Cmd+B。
- [x] 至少 Card（Enter/Space 激活）与 Sidebar（输入框内 Cmd+B 不被 preventDefault）各有一条 focused 断言测试，匹配“建议有测”档位。

### Phase 3 - i18n Bridge Contract Decision (P1-8)

Status: completed
Targets: `packages/ui/src/lib/i18n.ts`、`packages/flux-i18n/src/i18n.ts`、`apps/playground/src/main.tsx`、`docs/architecture/frontend-baseline.md`

- Item Types: `Decision`、`Fix`、`Proof`

- [x] (Decision) 裁定 i18n 桥方案（二选一）：
  - **方案 A（接线，推荐）**：在 facade/host 包（如 `flux-bundle`）启动时调用 `setI18nGetter` 接通 `@nop-chaos/flux-i18n` 的 `t`，使 18 条 `ui` chrome 跟随 host locale。
  - **方案 B（文档化）**：显式声明 `ui` chrome 为 English-only，移除 `setI18nGetter` DI seam 与误导性日志/归档声明，owner docs 同步。
  - **裁定：方案 A（接线）**。Re-audit live repo 发现桥已于 2026-05-19（commit `3924be5d`）接线：`flux-i18n` 的 `initFluxI18n()` 通过 `bindUiI18n(instance)` 写入与 `ui` 共享的 `Symbol.for('nop.ui.i18nBridge')` 全局槽，`ui` 的 `t()` 据此走 `flux-i18n`。审计 P1-8 的 grep 仅查 `setI18nGetter`，漏掉了 `bindUiI18n`。
- [x] (Fix) 按裁定落地：方案 A 则在**全部** bootstrap/host 接线点（`flux-bundle/src/index.tsx` AND `apps/playground` 启动处，或抽到共享 init）调用 `setI18nGetter`，使 dev 与生产 surface 都本地化（审计已确认 playground 绕过 flux-bundle，仅接 flux-bundle 会留 dev 盲区）；方案 B 则移除 seam。
  - 落地：接线点为 `flux-i18n` 的 `initFluxI18n()`（共享 init，`bindUiI18n`）；dev surface `apps/playground/src/main.tsx` 已调用 `initFluxI18n()`。架构上 `flux-bundle` 是渲染 facade，刻意不持有 i18n init；生产 host 按与 playground 相同方式 compose `flux-i18n`（见下条 owner docs）。
- [x] (Proof) 验证选定方案：方案 A 断言非 en locale 下 `ui` chrome `t()` 走 `flux-i18n`；方案 B 断言 docs 与代码一致（无悬空 DI seam）。
  - 证据：`packages/flux-i18n/src/i18n-contract.test.ts` 新增 zh-CN 用例断言 `ui` 的 `t('flux.carousel.label')==='轮播图'`、`t('flux.dialog.close')==='关闭'`（这些值不在 `ui` 内置英文 map 中，只有桥真正路由才可能成立），直接证伪“permanently English”。
- [x] 同步 owner docs（`docs/architecture/styling-system.md` / 国际化相关章节，按实际改动）。
  - 在 `docs/architecture/frontend-baseline.md` 新增“UI i18n Bridge Contract”章节，记录真实接线机制（`Symbol.for('nop.ui.i18nBridge')` + `initFluxI18n` 的 `bindUiI18n`）、host 义务（启动时调用 `initFluxI18n`）与 `flux-bundle` 刻意不持有 i18n init 的边界，消除 doc↔code 矛盾。

Exit Criteria:

- [x] i18n 桥契约状态明确（接线或 English-only 文档化），代码与 docs 一致，无 doc↔code 矛盾。

### Phase 4 - Selector And Key Hygiene (S-5, S-6)

Status: completed
Targets: `packages/ui` 内 `FieldTitle`/`FieldLabel`、`ChartLegendContent`/`ChartTooltipContent`

- Item Types: `Fix`

- [x] (Fix) S-5 `FieldTitle` 与 `FieldLabel` 的 `data-slot` 改为各自唯一（如 `field-title` vs `field-label`），消除歧义。
  - 落地：`FieldTitle` 改为 `data-slot="field-title"`（`FieldLabel` 保留 `field-label`）；`fieldVariants` 的 horizontal/responsive 选择器同步追加 `*:data-[slot=field-title]:flex-auto` 以保持原布局行为；新增“distinct data-slots” focused 断言。
- [x] (Fix) S-6 `ChartLegendContent`/`ChartTooltipContent` 的 `key` 改用稳定唯一标识（index 或复合 key），避免 `item.value`/`name` 碰撞致行消失。
  - 落地：新增 `payloadItemKey(item)` helper（复合 `dataKey|name|color|type`，稳定且唯一），`ChartTooltipContent` 与 `ChartLegendContent` 的 React key 均改用它；不使用数组 index（仓库 `react/no-array-index-key` 为不可降级硬约束），新增“duplicate values 仍渲染全部行”回归断言。

Exit Criteria:

- [x] 两个 slot/key 歧义项收敛；相关渲染测试通过。

## Draft Review Record

- Reviewer / Agent: independent sub-agent `ses_1043a3fa9ffefCvrUN4uNSexM3` (fresh session)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - [Minor] Phase 2 a11y Exit 仅手动抽查 → 已补 Card(Enter/Space)/Sidebar(Cmd+B 不拦截) focused 断言测试。
  - [Minor] Phase 3 Option A 未枚举 host 接线点 → 已写明 flux-bundle AND playground/共享 init 全部接线点。
  - [Minor] P0-2 fix 方向可能覆盖调用方 className → 已改为 `cn('toaster group', props.className)` 合并而非覆盖。

## Closure Gates

- [x] P0-2/P1-2 silent correctness 已修复且带 focused 测试（行为断言）。
- [x] P1-3/P1-4/P1-5 a11y 行为收敛（键盘可达 + 不劫持后代/输入态）。
- [x] i18n 桥（P1-8）契约已裁定并落地，代码与 docs 一致。
- [x] S-5/S-6 歧义收敛。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect。
- [x] 受影响 owner docs 已同步。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 起草阶段无可裁定 deferred 项。

## Non-Blocking Follow-ups

- `ui` 全包键盘/屏幕阅读器 a11y 专项 pass（超出本计划三例范围）。

## Closure

Status Note: 四 Phase 全部落地并通过独立 fresh-session closure-audit（verdict `approved`）。P0-2（Toaster props 自毁）/P1-2（useDialogDrag body 泄漏）silent correctness 修复 + focused 行为断言；P1-3（Card 键盘可达）/P1-4（Carousel 不劫持后代输入键）/P1-5（Sidebar 不劫持输入态 Cmd+B）a11y 收敛；P1-8 裁定为方案 A（接线）——re-audit 确认桥已由 `flux-i18n` `initFluxI18n`→`bindUiI18n`（共享 `Symbol.for('nop.ui.i18nBridge')`，playground 已调）接线，zh-CN Proof 证伪“permanently English”，owner-doc 补真实契约；S-5（FieldTitle slot 唯一化）/S-6（Chart 复合 key，lint-safe 不用 index）歧义收敛。全量 `typecheck/build/lint/test` 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子 agent `ses_100dd52f2ffeyQ7JJkdoG3z1yl`（closure audit of 本 plan；未参与执行）。
- Evidence: verdict `approved`。逐条 live file:line 证据复核每 Phase exit criteria ——
  - P1（sonner.tsx:30-44 spread-first 合并；use-dialog-drag.ts:225-226 cleanup 还原 body style；sonner.test.tsx:25-68 / use-dialog-drag.test.tsx:34-45 行为断言）；
  - P2（card.tsx:23-36 role/tabIndex/onKeyDown；carousel.tsx:84-86 editable-target 过滤；sidebar-context.tsx:73-75；focus-target.ts:6-25 共享 helper；card/carousel/sidebar 三组 focused 断言）；
  - P3（ui/src/lib/i18n.ts:19-47 桥；flux-i18n/src/i18n.ts:20,44-48,93 bindUiI18n；main.tsx:9 initFluxI18n；i18n-contract.test.ts:58-67 zh-CN 非平凡 Proof 审计复跑通过；frontend-baseline.md:123-130 契约章节与代码一致）；
  - P4（field.tsx:111 vs :97 slot 分离 + cva 选择器保布局；chart.tsx:366-376 payloadItemKey 复合 key + :217/:315 应用、无 array index 满足硬约束；field.test.tsx:50-60 / chart.test.tsx:48-67 断言）。
  - 审计复跑：`@nop-chaos/ui` 132/37、`@nop-chaos/flux-i18n` 25/2 全绿，ui lint/build clean。substantive gates 全真，无 silent deferred，i18n 为真实 fix 非 hand-wave。

Follow-up:

- no remaining plan-owned work
- `ui` 全包键盘/屏幕阅读器 a11y 专项 pass（超出本计划三例范围，见 Non-Blocking Follow-ups；confirmed live defect 不得出现在这里）
