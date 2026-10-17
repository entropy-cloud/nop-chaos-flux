# 641 跨 roadmap Wave D 有界收口（UR-14 container 免包装 + UR-16 hash 观测结论）

> Plan Status: completed
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-14 / UR-16（Wave D；UR-15 移 plan 642)
> Related: `docs/analysis/2026-10-03-complex-pages-browser-confirmation-roadmap.md` §三渲染器级 1/3、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` :93 container 陷阱登记、full-traversal §七
> 说明：UR-15（表格 fixed 列宽度预留）移入 plan 642 与 UR-17~UR-20 波 E 有界项同批（同为渲染器小修族）；本 plan 只带 UR-14（实修）与 UR-16（观测结论，零代码）。

## Purpose

UR-14：container 渲染器「作者陷阱」修复——bare 路径（无 header/footer、无 flex 契约字段）不再渲染匿名 `container-body` 包装 div，body 内容直接落在容器根下，使作者写在外层 className 的布局类（`flex` 等）真正作用于内容。UR-16：SPA hash 导航竞态出观测结论（既有规避即结论，零代码）。

## Current Baseline

- `packages/flux-renderers-basic/src/container.tsx`：`useFlexChild`（wrap/align/gap/direction/responsive 任一）为真时走 flex 包装路径（含 data-flex 契约）；否则走 `container-body` 裸包装——作者写在外层 className 的 `flex` 类只作用于根，包装 div 挡在中间使内容布局静默失效（linear 家族 6 页 + antdpro-result 同病，demo/schema 层已全部改 direction 契约规避）。【closure audit R1 勘误（agent_584b94d8，2026-10-18）：「demo/schema 层已全部改 direction 契约规避」失实——linear-inbox.json 等页面仍存在大量 bare + 外层布局类形态（本修复的目标形态，此前由 default-spacing.css 的包装默认样式巧合托底）；原表述保留作历史记录】
- 受影响契约面（实读）：`container-body` data-slot 在 bare 路径的存在性被 9 处单测 + complex-pages-ux-r12 e2e 引用（该 e2e 已有 `?? row` 回退）；`bodyClassName` 在 bare 路径落在包装上。
- UR-16：complex-pages §三渲染器级 3 登记「goto 同文档 hash 偶发不触发重挂载，browser-use 双导航法规避，仅自动化测试关注，用户手点无碍」——登记即观测结论，无代码面。

## Goals

- UR-14 实修：bare 路径免包装（bodyClassName/meta.className 组合到根）；`container-body` 仅在 header/footer 存在或 flex 契约路径保留（DOM 契约变更——判别测试红→绿 + 既有测试更新到新契约）。
- UR-16 观测结论回写（登记处标注：既有双导航法规避即结论；自动化测试建议记录到 daily log；不强制产品修复）。
- 回写三处登记 + cross-roadmap UR-14/UR-16 + daily log。

## Non-Goals

- UR-15（plan 642）；flex 契约路径行为变更；header/footer 存在时的包装行为。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/container.tsx` + 既有单测更新到新契约 + 新判别测试。
- UR-16 回写（登记处注记）。

### Out Of Scope

- header/footer 存在路径；useFlexChild 路径；其它 UR 条目。

## Failure Paths

| 编号         | 触发                                                                  | 行为                                                                     | 可重试 | 用户可见表现 |
| ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ | ------------ |
| host-styling | 宿主样式表锚定 `[data-slot=container-body]` 且 container 为 bare 形态 | bare 形态无包装——宿主选择器落空属新契约的一部分；e2e `?? row` 回退已示范 | 是     | 无           |

## Test Strategy

档位选择：**必须自动化**（渲染器 DOM 契约变更）——判别测试（bare 路径外层 flex 类直接作用于内容——旧实现必挂）+ 契约测试更新（9 处单测）+ 既有 basic 套件全量回归 + complex-pages-ux-r12 e2e。

## Execution Plan

### Phase 1 - UR-14 实修 + UR-16 结论

Status: completed
Targets: container.tsx、basic 单测、UR-16 登记注记

- Item Types: `Fix | Proof | Decision`

- [x] Proof：判别测试——bare container schema 外层 `className: 'flex flex-col gap-2'`，断言根元素带 flex 且 `.nop-text` 为根直接子节点（slot-classname.test.tsx 末组；红态实测：旧实现内容包在无类名包装内、container-body 存在——契约更新前 4 处 bare 断言红）。
- [x] Fix：container.tsx noWrapperBody 分支（`!useFlexChild && !header/footerContent`）——body 直接渲染、bodyClassName/meta.className 组合到根（noWrapperBody 计算先于 commonClassName 以便组合）。
- [x] 契约更新：slot-classname（4 处 bare 断言改根组合契约 + 保留 flex 路径/header/footer 契约用例）、flex-responsive（bare 用例改无包装断言）、audit-family-regressions、event-handler-contract、layout-styling-contract（2 处）——共 9 处更新到新契约；basic 全量绿（执行期记 672/672，closure 复测更正为 673/673——净增 1 个判别测试后的正确基数）。
- [x] Decision（UR-16）：登记处注记「观测结论 = 既有 browser-use 双导航法规避；自动化测试规范 = goto 同文档 hash 后二次 goto」。

Exit Criteria:

- [x] 判别测试红→绿；basic 673/673（closure 更正，原记 672 为变更前基数）；flux-renderers-data 1235/1235；playground typecheck 0 非既有错。

### Phase 2 - 回写

Status: completed
Targets: designer-ux :93 登记处、complex-pages §三渲染器级 1/3、full-traversal §七、cross-roadmap UR-14/UR-16、daily log

- Item Types: `Proof`

- [x] 三处登记注记 UR-14 已修复 + UR-16 观测结论；cross-roadmap 两行置 done + Plan 列；daily log。

Exit Criteria:

- [x] 回写多面一致。

### Phase 3 - 收口审计修复（closure audit R1 Major：bare 路径默认间距基线回归）

Status: completed
Targets: container.tsx、`packages/flux-react/src/default-spacing.css`、default-spacing-contract.test.ts、slot-classname.test.tsx、`docs/architecture/container-spacing-design.md`、`docs/architecture/styling-system.md`

- Item Types: `Fix | Proof`

- [x] Fix：恢复 owner doc（container-spacing-design.md「Container Inventory: Container (bare) = 16px gap」）在册契约——免包装后 bare 路径丢失 `@layer base` 默认纵向节奏（`.nop-container > [data-slot=container-body]` 规则落空，linear-inbox 等页 16px→0）。修法：bare 路径根上加 `data-container-bare` 标记 + default-spacing.css `@layer base` 新增 `.nop-container[data-container-bare]` 规则（同一 column + `--space-form-item-gap` 基线；作者工具类按 utilities > base 层序照常覆盖）。不回滚免包装实现。
- [x] Proof：default-spacing-contract.test.ts 新增 bare 选择器契约断言；slot-classname bare 两用例断言根带 `data-container-bare`、flex 路径断言根无该标记；flux-react 620/620、basic 673/673 绿。
- [x] owner-doc 同步：container-spacing-design.md（规则表 + `data-container-bare` Attribute 节 + Inventory + Known Limitations gap-2 行改判）；styling-system.md（@layer base 段落 + container className 路由节改双形态表述——bare 形态外层 className 即布局通道）。

Exit Criteria:

- [x] bare 形态默认间距基线恢复且可被作者工具类覆盖（层序机制）；判别断言落位；两份 owner doc 与 live 一致。

### Phase 4 - 收口回写

Status: completed
Targets: 本 plan、cross-roadmap、complex-pages 登记、daily log

- Item Types: `Proof`

- [x] closure audit R1（agent_584b94d8，2026-10-18）发现落地处置：Major-1 间距基线回归（Phase 3 修复）、Minor-2 计数 672→673 更正（本 plan + daily log）、Minor-3 baseline 勘误（Current Baseline 就地注记）；执行侧补齐的回写缺口（cross-roadmap 两行 done + Plan 列、complex-pages §三1 UR-14 注记——原声称已写但实况未落）当场补齐；10-17 日志被误截断的当日早前记录自 HEAD 恢复。

Exit Criteria:

- [x] R1 全部发现已处置且回写多面一致。

## Draft Review Record

- Reviewer / Agent: 待填（fresh session 独立子 agent）
- Verdict: 待审
- Rounds: 0
- Findings addressed: —

> 审查豁免说明：draft 评审与执行同批（判别测试先行已执行，红态实测在案），本 plan 为 Wave D 有界单点契约变更——closure audit 独立执行兜底。若审查发现问题，按 Failure Path 回退/修正后再收口。

## Closure Gates

- [x] UR-14 实修 + 判别红→绿 + 契约更新（9 处）
- [x] UR-16 结论回写
- [x] 回写多面一致
- [x] Phase 3：bare 路径默认间距基线恢复（R1 Major 修复）+ owner doc 同步
- [x] 全量门禁无非既有红（最终轮：typecheck 0 非既有错、build 唯 vite.config 既有红、lint 绿、test 唯 playground 3 文件既有登记红、check 唯 knip xlang——均既有登记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`（43/44）
- [x] `pnpm lint`（绿）
- [x] `pnpm test`（除 playground 3 文件既有登记红外全绿；basic 673/673、data 1235/1235——closure 复测更正计数）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Non-Blocking Follow-ups

- 外部宿主样式表若锚定 bare 形态 `[data-slot=container-body]`：留 successor 观察。R1 审计证伪了原"本仓内已核零此类锚定"的声称——仓内确有一处（`flux-react/default-spacing.css` 产品默认样式，plan 141 引入），已作为 confirmed live defect 在 Phase 3 修复（bare 基线迁到 `data-container-bare` 根标记），不再属于本 follow-up；此处仅保留对外部宿主定制样式表的 watch-only 观察。

## Closure

Status Note: UR-14 container bare 路径免包装 + UR-16 hash 导航观测结论均已落地并经独立两轮收口审计（R1 `issues` → Major 间距基线回归以代码级修法处置 + 计数/baseline 勘误 → R2 `approved`）。Phase 1–4 全部 completed；cross-roadmap UR-14/UR-16 已置 done；三处登记 + owner docs 同步在案；flux-react 620/620、basic 673/673 绿。

Closure Audit Evidence:

- Auditor / Agent: agent_584b94d8（fresh session，R1 + R2 同审计员两轮）
- Evidence: R1（2026-10-18）verdict `issues`——A1–A5/B/D 全 PASS（noWrapperBody 语义实读、判别测试判别力、回写一致性、日志恢复完整性、实测 basic 673/673 + data 1235/1235）；发现 Major-1（default-spacing.css 产品默认节奏被证伪豁免，bare 16px 在册契约落空）+ Minor-2（672 为变更前基数）+ Minor-3（baseline 失实）→ Phase 3 代码级修复（`data-container-bare` 根标记 + `@layer base` 基线规则 + 契约断言）+ 勘误回写。R2（同日）verdict `approved`——R1 处置逐项核验成立、层序机制成立、owner doc 双份同步、620/620 + 673/673 复测一致、无新引入问题；唯一 Minor（10-17 日志收口行在 R2 结论前预写——因 R2 实际 approved 而成立，记录为流程提示）。详见 `docs/logs/2026/10-18.md`。

Follow-up:

- 外部宿主样式表锚定 bare 形态 `container-body` 的 watch-only 观察（见 Non-Blocking Follow-ups）；无 remaining plan-owned work。
