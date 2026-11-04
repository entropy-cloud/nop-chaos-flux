# 852 复刻页 UX 保真 U6：系统性归族与设计系统层整改

> Plan Status: draft
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U6）+ U1-U5 五份走查报告 §共性根因/§残留 汇总
> Related: 845-851（U0-U5/U7）

## Purpose

U1-U5 跨页共性 findings 强制归族：族级修复一次落地（replication.css 归族 + 渲染器级共性缺陷就地修复），消除"只修实例"残留；组件族共性根因就地修复渲染器（非保护区）或登记 improvement-analysis（保护区）。

## Current Baseline（U1-U5 登记汇总，live 核对 2026-11-04）

- **族 A：裸 HSL 分量令牌 × 渲染器样式通道**（三处同根因，最深面）：
  - `flux-renderers-pivot/src/pivot-option.ts` `resolveDesignTokens()` probe 读 `var(--background)` 裸分量 invalid → 恒回退 light fallback → 深色 pivot canvas 白底（W3/I2 实证，u2 F-W3-1/u3 F-I2-2）。
  - `flux-renderers-layout/src/styles.css` ~12 处 bare `var()` 引用 HSL 分量令牌 → steps/wizard 八态状态色失效（V2 实证，u5 F-V2-1；replication.css 已页面级 `.nop-steps/.nop-wizard` hsl(var()) 覆盖兜底）。
  - `flux-renderers-mobile/src/floating-panel.tsx` inline `background: var(--nop-floating-panel-bg)` 无 fallback（u1 F-S1-3；replication.css 已页面级定义变量兜底）。
- **族 B：ui ChartContainer `aspect-video` × 定高** → svg 宽钉扎横裁切（C3 实证，u2 F-C3-1；页面级 aspect-ratio:auto 兜底）。packages/ui 公共导出面/样式契约为保护区（mission 授权约束）→ 只登记不立项。
- **族 C：`--repl-mall-*` 令牌作用域**：定义在 `.repl-mobile-canvas-screen`（mobile 画布）上，desktop 商城域页（S2 `.repl-mall-dist`）无继承通道 → u4 重复定义作用域块。令牌组应上提共享作用域（`:root`/主题根），两处收敛。
- **族 D：kanban 列 min-width CSS 钳制 schema columnWidth**（flux kanban 渲染器 CSS 钉 280px max 360，u3 F-K2-1 登记）→ 渲染器级评估或登记。
- **族 E：crud queryForm 双动作按钮对**（`crud-query-actions.tsx` 合成对 × carrier 默认 actions 同屏重复，u3 F-I1-1 登记；页面级 actions:[] 已兜底）→ 渲染器级评估或登记。
- **族 F：replication.css 自身收敛**（P2 MIN-5 在册）：浅色硬编码直值 → 令牌变量引用收敛；`hsl(var())` 写法全量复核（improvement-analysis 2026-11-04 条目要求）。
- **族 G：watch-only residual**（保留不修，逐项带 Why Not Blocking）：4px 表格盒模型伪影、深色 echarts 轴标签低对比、V3 深色 basemap 恒浅灰、O1 深色低置信浅底、W1 表单桌面形态/无导航头、pivot 表头截断、steps process/finish 同色实心（设计形态）。
- 21 页 replication spec 族在仓全绿基线（U1-U5 批后累计 39+48+51+50+21=209 test）。

## Goals

- 族 A 渲染器级就地修复（pivot/layout/mobile 三包，非保护区）：修后 replication.css 的 V2 覆盖块与 floating-panel 变量兜底可移除或保留为防御层（逐条裁决记录）。
- 族 C/F replication.css 归族：令牌上提共享作用域、浅色硬编码收敛变量引用、`hsl(var())` 全量。
- 族 B/E/D：保护区/需设计裁决项登记 improvement-analysis（当轮 append），不静默降级。
- 归族表落档（族→修复落点→验证），深色主题 P2 MIN-5 复核销单。
- 21 页 replication spec 全量 `--retries=0` 复跑绿（U7 前回归底座）。

## Non-Goals

- packages/ui 公共导出面/样式契约改动（族 B 只登记）。
- 各页面级实例修复回滚（已落地且 e2e 绿）。
- U7 复检（后续 plan 851 承载）。

## Scope

### In Scope

- `packages/flux-renderers-pivot`、`packages/flux-renderers-layout`、`packages/flux-renderers-mobile` 的样式/令牌解析共性修复（含判别性单测：旧实现必挂）。
- `apps/playground/src/complex-pages/shared/replication.css` 归族整改。
- `docs/components/existing-components-improvement-analysis.md` 登记更新。
- 归族表文档（`docs/analysis/replication-ux/u6-family-remediation.md`）。

### Out Of Scope

- packages/ui、flux-core（保护区）；页面 schema 实例重修；上游仓。

## Test Strategy

必须自动化：族 A 渲染器修复各配判别性单测（旧实现下必挂：pivot 深色令牌解析出非 light 值、layout styles 编译产物含 hsl(var())、floating-panel fallback 存在）；21 页 spec 全量复跑为回归底座。

## Execution Plan

### Phase 1 - 归族表与渲染器级修复（族 A，含 D/E 裁决）

Status: planned
Targets: 三渲染器包 + improvement-analysis + 归族表

- Item Types: `Fix | Decision`

- [ ] 归族表落档（族 A-G → 修复落点 → 验证方式 → 状态）
- [ ] 族 A-1 pivot `resolveDesignTokens` 令牌解析修复（hsl 包裹/解析兼容两种令牌格式）+ 判别单测（旧实现必挂）
- [ ] 族 A-2 flux-renderers-layout styles.css bare var() 全量 hsl(var()) 化 + 判别单测；replication.css V2 覆盖块移除裁决（移除后 spec 反向验证仍绿则移除，否则保留并记录）
- [ ] 族 A-3 floating-panel inline background 补 fallback + 单测；replication.css 变量兜底保留为防御层（裁决记录）
- [ ] 族 D/E 渲染器级评估：可低风险就地修则修+单测；否则登记 improvement-analysis（写明 Why Not Blocking）
- [ ] 族 B 登记 improvement-analysis（保护区裁决）

Exit Criteria:

- [ ] 三包修复落地 + 判别单测绿；归族表落档；D/E/B 裁决完成（修或登记，无悬空）

### Phase 2 - replication.css 归族（族 C/F）

Status: planned
Targets: replication.css

- Item Types: `Fix`

- [ ] `--repl-mall-*` 令牌上提共享作用域，mobile canvas 与 S2 `.repl-mall-dist` 两处作用域收敛
- [ ] 浅色硬编码直值收敛变量引用（P2 MIN-5）；`hsl(var())` 写法全量复核
- [ ] 深色主题全量复核（数据面截图抽检 + computed style）

Exit Criteria:

- [ ] 归族后 replication.css 零重复令牌定义块、零非防御性硬编码；深色抽检通过

### Phase 3 - 回归硬门与收口

Status: planned
Targets: 21 页 replication spec 全量

- Item Types: `Proof`

- [ ] 21 页 replication spec 全量 `--retries=0` 复跑绿
- [ ] `pnpm typecheck`/`build`/`lint`/`test` + `pnpm check` 全过
- [ ] daily log；closure audit（独立子 agent）；roadmap §3 U6 回写同 commit

Exit Criteria:

- [ ] 全量绿 + 门禁零新增 + closure audit approved + 同 commit 回写

## Failure Paths

| 场景                      | 触发                               | 行为                                    | 可重试 | 用户可见表现   |
| ------------------------- | ---------------------------------- | --------------------------------------- | ------ | -------------- |
| renderer-fix-breaks-pages | 渲染器修复破坏页面 e2e             | 判别单测+全量 spec 定位，回退该族改登记 | 是     | 全量绿为最终态 |
| token-событие-regression  | 令牌上提后 mobile/desktop 主题串扰 | 作用域隔离回退，逐主题取证              | 是     | 双主题正确     |

## Draft Review Record

- Reviewer / Agent: （待独立子 agent 审查）
- Verdict: 待审
- Rounds: —
- Findings addressed: —

## Closure Gates

- [ ] Phase 1-3 Exit Criteria 全勾
- [ ] 归族表全族处置完成（修/登记，无"只修实例"残留）
- [ ] 21 页 spec 全量 `--retries=0` 绿
- [ ] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check` 全过
- [ ] roadmap §3 U6 回写 `done` 同 commit
- [ ] daily log 收口记录
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

（无——执行中推翻条目当场落本节）

## Non-Blocking Follow-ups

- 族 G watch-only residual 清单随 U7 复检复核。

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent: （待独立审计）
- Evidence: —

Follow-up:

- （待收口）
