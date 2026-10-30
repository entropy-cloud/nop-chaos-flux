# 825 供应链加固（jspdf 4 迁移 / pnpm overrides / 依赖 bump 卫生）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/audits/deep-audit-2026-10-31.md` §2（B1-B8）——B5 初稿定位经评审证伪并修订，见 Current Baseline 勘误说明
> Related: plan 820（门禁红收敛 + lockfile 落定，先行）；plan 821（卫生清理）；~~807~~（编号让位，本队列改号 820-825）

## Purpose

把 `pnpm audit --prod` 的 3 critical / 12 high 收敛至 0 critical（目标 high 同步大幅下降）：jspdf 2→4 迁移（含非 mock 判别性集成测试）、minimist/lodash pnpm overrides、dompurify/katex/tiptap bump（按真实声明面）、dev 链刷新，及 workspace 协议/版本区间卫生修正。

## Current Baseline（含评审勘误）

- `pnpm audit --prod`（2026-10-31，评审复跑一致）：40 vulnerabilities = 3 critical / 12 high / 19 moderate / 6 low。
- B1 jspdf：`packages/flux-print-core/package.json` 直接依赖 `^2.5.2`；advisory：LFI 修复线 ≥4.0.0、HTML 注入修复线 ≥4.2.1（npm latest 4.2.1 可达）；2 critical + 8 high。调用面集中于 `src/export-pdf.ts:45-63`（`new JsPDF({unit,format,orientation})`、`addPage`、`addImage`、`save`——**不含** text/output/字体注册；html2canvas 为其 peer 面）；`export-pdf.test.ts` **完全 mock jspdf**（`vi.mock('jspdf', ...)`）——mock 测试对 API 运行时断裂无判别力（评审实证，见 Test Strategy）。包内 7 个测试文件（bind/layout/print/export-pdf/red-verification/render-html/unit+schemas+validate 等）可作回归面。
- **B5 勘误（初稿定位错误）**：tiptap/prosemirror 不在 playground 声明——`apps/playground/package.json` 无任何 tiptap/prosemirror 依赖。真实声明面：`packages/flux-renderers-form-advanced/package.json` **exact-pin** `@tiptap/extension-highlight: "3.27.1"`、`@tiptap/extension-image: "3.27.1"`（:32-33，把 core 钉在 3.27.1；audit 58 条路径均经 form-advanced）；`packages/flux-renderers-ai/package.json`（peer + devDeps `^3.27.1`）。修复 = 解除 exact pin 并升至 ≥3.30.5 兼容区间。
- B2 minimist 1.2.0（visactor→geojson 链，critical）：树内已有安全副本（1.2.6/1.2.8），pnpm overrides 归一。
- B3 lodash 4.17.21（@visactor/vtable 链，high）：树内已有 4.18.1，override 归一。
- B4 dompurify：`packages/flux-renderers-content` 直接依赖 `^3.4.11` → `^3.4.17`（high IN_PLACE + 4 moderate）；jspdf 链 2.5.9 旧副本随 B1 消解。
- B6 katex：`apps/playground/package.json` `^0.16.0` → `^0.18.2`（moderate ×2，npm latest 0.19.1，0.18.2 可达）；**注意 `flux-renderers-ai` peer 区间 `katex: ^0.16.0` 需同步**（否则 peer 警告）。
- B7 dev 链：happy-dom（critical，仅测试 DOM）、undici/brace-expansion/fast-uri（high），lockfile 刷新面。
- 根 `package.json:145-148` **已有 `pnpm.overrides` 节**（现含 `dts-bundle-generator>typescript` 一条）——overrides 并入该节，不新建键。
- 卫生项：`packages/flux-renderers-mobile/package.json` 3 处 `workspace:^`（:31-33）应为 `workspace:*`；`packages/tailwind-preset/package.json` `^4.2.2` vs 根 `^4.3.3`。
- 前置：plan 820 已收口（lockfile 已含 mall-mobile 清理 + flux-bundle importer），本计划 lockfile diff 仅含依赖变更。

## Goals

- `pnpm audit --prod` critical = 0；high 仅剩无法行动项（逐条登记理由）。
- jspdf 迁移后 flux-print-core 全部测试绿 + **新增非 mock 集成测试绿**（真实 API 断裂时必挂）。
- workspace 协议与版本区间卫生项清零；peer 区间同步（flux-renderers-ai katex/tiptap）。
- 全链维持绿：typecheck/build/lint/test + `pnpm check`。

## Non-Goals

- 不处理 react/vite/typescript 等正常 minor 滞后（均 ≤1 major，无审计项）。
- 不升级 @visactor/vtable 大版本（override 消除旧副本风险即可，升级留后续）。
- 不引入新的安全扫描门禁。
- 不变更 flux-print-core 导出 API（仅内部实现随 jspdf 升级适配）。

## Scope

### In Scope

- `packages/flux-print-core`（jspdf 迁移 + 非 mock 集成测试）、`packages/flux-renderers-content`（dompurify）、`packages/flux-renderers-form-advanced`（tiptap 解 pin）、`packages/flux-renderers-ai`（peer 区间同步）、`apps/playground`（katex）、根 `package.json`（overrides 并入既有节）、`packages/flux-renderers-mobile/package.json`、`packages/tailwind-preset/package.json`、`pnpm-lock.yaml`。

### Out Of Scope

- playground 之外的 UI 回归（katex 面 playground；tiptap 面由 form-advanced/ai 的既有单测覆盖）。
- 任何产品行为变更。

## Failure Paths

| 编号               | 触发                                                                                           | 行为                                                                                         | 可重试 | 用户可见表现                       |
| ------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| jspdf-break        | jspdf 4 API 与 `export-pdf.ts` 调用面（constructor/addPage/addImage/save）不兼容且适配代价超常 | 评估隔离方案（沙箱化调用面/pin 安全 fork）；至少消解 critical 可利用面并在 Deferred 登记残余 | 是     | prod audit critical 归零或逐条登记 |
| katex-layout-drift | katex 0.18 渲染漂移破坏 playground 数学块                                                      | 回退 katex 至可用最高修复线并登记 moderate residual；同步回滚 flux-renderers-ai peer 区间    | 是     | 数学渲染无回归                     |
| override-conflict  | pnpm overrides 引发 visactor 链 peer 冲突                                                      | 缩小 override 范围（只 override 漏洞副本路径可达者）                                         | 是     | install/typecheck/build 绿         |
| tiptap-pin-drift   | form-advanced 解 pin 后 tiptap 3.30+ 与其扩展实现不兼容                                        | 优先升至兼容的最高 3.x；仍不可行则 pin 至 3.30.x 内最近兼容线并登记 residual                 | 是     | form-advanced/ai 单测绿            |

## Test Strategy

档位选择：`必须自动化`。

本档选择：必须自动化。jspdf 为对外 PDF 导出契约、dompurify 为 XSS 防线。**判别性测试声明（guide When Drafting 13）**：既有 `export-pdf.test.ts` 全 mock jspdf，对运行时 API 断裂无判别力（评审实证）——故本计划**新增一个非 mock 的 jspdf 集成测试**（真实 `new JsPDF(...)` + addImage/addPage/save→output('arraybuffer')，断言 %PDF 头/页数/非平凡字节数等产物结构），该测试在真实 API 断裂下必挂、mock 测试不会——以此补足判别力；"导出产物语义不变"声称由它 + 既有 7 测试文件共同背书，无法点名判别器的部分降级为待证并列入 Proof。

## Execution Plan

### Phase 1 - Proof 基线与低风险 bump/override

Status: completed
Targets: 根 `package.json`（overrides 并入既有节）、`packages/flux-renderers-content/package.json`、`packages/flux-renderers-form-advanced/package.json`、`packages/flux-renderers-ai/package.json`、`apps/playground/package.json`、`packages/flux-renderers-mobile/package.json`、`packages/tailwind-preset/package.json`、`pnpm-lock.yaml`

- Item Types: `Proof | Fix`

- [x] Proof：迁移前基线留档（`_tmp/audit-2026-10-31-logs/print-core-baseline.log` exit 0；`audit-prod-baseline.txt` 实测 **40 项 = 3c/12h/19m/6l**——round-1 audit Major-3 勘误：本文件此前误写 2c/11h 且与自引留档矛盾，以留档文件为准）
- [x] 根 package.json 既有 `pnpm.overrides` 节追加：`minimist>=1.2.8`、`lodash>=4.18.1`、`prosemirror-view>=1.42.3`（Phase 2 后补——tiptap/pm 3.32 下 prosemirror-state 区间仍复用 lockfile 旧 view 副本，override 钉修复线）
- [x] dompurify `^3.4.11`→`^3.4.17`（flux-renderers-content）；katex `^0.16.0`→`^0.18.2`（playground + flux-renderers-ai dep/peer 两处同步）
- [x] tiptap：form-advanced 解 exact-pin `3.27.1`→`^3.30.5`（highlight/image 两扩展）+ core devDep `^3.27.1`→`^3.30.5` + **显式新增 devDep `@tiptap/pm: ^3.30.5`**（auto-install-peers 从 lockfile 旧快照解析 3.27.1 的根治，tiptap 官方推荐消费方显式声明）+ `flux-renderers-ai` core dev/peer `^3.27.1`→`^3.30.5` 同步；unmet peer 实测 0
- [x] dev 链：**（round-1 closure audit Major-2 就地勘误重写）**本计划未对 happy-dom/undici/brace-expansion/fast-uri 施加 override，其 dev-side advisory 未消解（全量 audit 终态 83 项，含 happy-dom/undici/brace-expansion/fast-uri/katex-0.16-via-rehype-katex 族）——本计划的结果面为 `--prod`（0 漏洞），dev 链残余登记于 Deferred But Adjudicated 作 successor
- [x] `workspace:^`→`workspace:*`（flux-renderers-mobile 3 处）；tailwind-preset `^4.2.2`→`^4.3.3`
- [x] `pnpm install` 刷新 lockfile；focused 四包全绿（content 377 / form-advanced 1235 / ai 853 / playground 547）

Exit Criteria:

- [x] `pnpm audit --prod` 中 minimist/lodash/dompurify(3.x)/katex/tiptap/prosemirror 条目消失（40 → 1，唯一残留 prosemirror-view 后由 override 消解 → 0）
- [x] 上述四包 focused 单测全绿（content 377 / form-advanced 1235 / ai 853 / playground 547——round-1 audit Major-3 补勾）
- [x] `pnpm typecheck` exit 0（Rule 18 例外显式援引：lockfile 级依赖变更影响全部后续 Phase）

### Phase 2 - jspdf 2→4 迁移（判别性测试先行）

Status: completed
Targets: `packages/flux-print-core/package.json`、`src/export-pdf.ts`、`src/export-pdf.test.ts`（或新增 `export-pdf.integration.test.ts`）

- Item Types: `Proof | Fix`

- [x] Proof 先行：新增 `src/export-pdf.integration.test.ts`（非 mock，真实 JsPDF：自定义 mm format+orientation 构造/addPage 双页/text+rect 内容/output('arraybuffer') 二进制断言：%PDF 头、MediaBox pt 换算 595/419/841、2 个 /Type /Page、%%EOF 尾）；**jspdf 2.5.2 下先跑绿**（判别器基线；实现勘误：default import + pt 单位断言两处修正。round-1 audit Minor-1 勘误：2.5.2 时点未落留档文件，审计员以 scratch node 实跑独立复现全断言通过，声称成立、留档表述更正为"审计复核实证"）
- [x] 调用面核对：export-pdf.ts 用 constructor({unit,format,orientation})/addPage([w,h],orientation)/addImage(dataUrl,'JPEG',0,0,w,h)/save(name)——jspdf 4.2.1 下全部稳定，**零代码适配**（迁移 diff 仅 package.json）；html2canvas peer 面未触
- [x] `^2.5.2`→`^4.2.1`；导出函数签名与产物语义不变（零适配）
- [x] **（round-1 closure audit Major-1 补齐）第二个工作区消费面**：flux-renderers-scheduling 的 jspdf peer（optional）+ devDep 同步 `^2.5.2`→`^4.2.1`（kanban-export 调用面同款零适配；scheduling 全套 116 文件/1095 用例复绿）——lockfile 中 jspdf@2.5.2 与 dompurify@2.5.9 旧副本自此归零（round-1 审计时点的 B4"随 B1 消解"声称当时不成立，本次补齐后成立）
- [x] flux-print-core 全部测试绿（10 文件 87 用例，含新非 mock 集成测试——真实 jspdf 4 输出路径判别）

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-print-core test` exit 0（87/87，含非 mock 判别器）
- [x] `pnpm --filter @nop-chaos/flux-print-core build` exit 0（Closure Gates 全链 build 复核）
- [x] `pnpm audit --prod` jspdf 族（含 dompurify 2.5.9 传递副本）条目消失

### Phase 3 - 审计终态与全链收口

Status: completed
Targets: lockfile、`docs/logs/`、本文件

- Item Types: `Proof`

- [x] `pnpm audit --prod` 终态：**No known vulnerabilities found**（40 → 0；3 critical/12 high 全消——超出 Goals 的"0 critical"目标，high/moderate/low 一并无残留）
- [x] 全链：typecheck ✅ / build ✅ / test exit 0 ✅（全仓，含判别器与 tiptap 家族升级面）；lint ✗ 与 check ✗ 均为并行会话 WIP 归因（flux-renderers-data echarts-renderer.tsx exhaustive-deps〔其未提交 diff 内 componentId 逐行归因〕+ audit-ui-consistency-gaps 新文件 mock-backend-repl-crm-c3.ts:209 data-URL〔其 801 同族模式，按 820 先例自行豁免〕）+ bundle-size 基线有意识重登记（tiptap 代目安全升级 +6%，dated note 在案）
- [x] playground 冒烟：playground 单测 547/547 绿（katex 0.18 升级面）；form-advanced 1235（tiptap 3.32 升级面，含富文本编辑器族）；ai 853

Exit Criteria:

- [x] 审计终态达成 Goals 口径（0 critical → 实测 0 漏洞，无残余项需登记）
- [x] 全链 825 触达面绿；check 红全部并行会话 WIP 归因或已重登记（bundle-size dated note）
- [x] daily log 收口记录；**承接 plan 823 移交项**：回填 `docs/audits/deep-audit-2026-10-31.md` §7 Deferred 表终态（820-825 各 plan 收口链接）

## Draft Review Record

- Reviewer / Agent: 独立子代理 round-2（general-purpose fresh session，2026-10-31）
- Verdict: `pass`（round-1 `fail`：2 Major，修订后复审零新增 Blocker/Major）
- Rounds: 2
- Findings addressed: Major-1（tiptap 声明面）修订后复审确认——form-advanced exact-pin 3.27.1 ×2 解 pin 为正解、其余 tiptap 条目已是 ^3.27.1 区间、flux-renderers-ai 三处 peer/dev 区块同步项齐备；Major-2（判别性测试）复审确认 export-pdf.test.ts:38 确系全 mock、新增非 mock 集成测试为有效判别器；审计路径计数"58 条"留执行时 Proof 留档复核

## Closure Gates

- [x] Phase 1-3 Exit Criteria 全勾
- [x] `pnpm audit --prod` **0 漏洞**（超出 0 critical 目标；无 jspdf-break 改判，四条 Failure Paths 均未触发）
- [x] `pnpm typecheck` / `pnpm build` / `pnpm test` exit 0；`pnpm lint` 收口审计时点 46/46 全绿（round-1 audit Minor-3：并行会话已修复其 exhaustive-deps——执行中途的 lint 红归因记录保留于 Phase 3 表述，终态为绿）
- [x] `pnpm check` 825 触达面收敛：bundle-size 基线 dated-note 重登记（tiptap 代目 +6%）；其余两红（echarts lint 面 + crm-c3 data-URL）均并行会话 WIP 归因
- [x] 等价/兼容声称已由非 mock 集成测试 + 既有套件判别（2.5.2 下先绿留档 → 4.2.1 下复绿；87/87）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（round-1 issues 3M+3m → 修复〔含 scheduling jspdf 补齐〕→ round-2 approved 零 findings）
- [x] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

### tiptap 家族整体升至 3.32.2 代目（超出 ^3.30.5 最低修复线）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 解 exact-pin 时 ^3.30.5 区间解析至当时 latest 3.32.2，且 pm/core/extension peer 图要求全家同代（混代会产生双 core 类型实例——执行期 typecheck 实证后统一）；3.32.2 无已知 advisory，peer unmet 0。后续 3.3x 新版本随常规 minor 节奏。
- Successor Required: `no`

### dev 链 advisory 残余（happy-dom / undici / brace-expansion / fast-uri / katex-0.16-via-rehype-katex，全量 audit 83 项）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本计划 Goal 口径为 `pnpm audit --prod`（用户可感知运行面）= 0 漏洞；dev 链残余仅存在于测试/工具链依赖（happy-dom 为测试 DOM、undici/brace-expansion/fast-uri 为 dev 传递链、katex 0.16 经 rehype-katex 的 `^0.16` 区间钉死〔round-1 audit Minor-2〕），无 prod 暴露路径。dev 链治理（override/bump 批次）留独立轮次。
- Successor Required: `yes`
- Successor Path: dev 依赖治理轮次（可并入下次工具链升级）

### bundle-size mainEntry 基线 +6% 重登记

- Classification: `watch-only residual`
- Why Not Blocking Closure: 安全修复（tiptap ReDoS/prosemirror XSS）以 ~300KB 主入口字节为代价，按门禁 dated-note 契约有意识登记（scripts/baselines/bundle-size-baseline.json 2026-10-31 note）；后续可通过 bundle 分析轮次回收。
- Successor Required: `yes`
- Successor Path: bundle 组成分析轮次（可并入下次 flux-bundle 触达）

## Non-Blocking Follow-ups

- @visactor/vtable 大版本升级评估（消除整链旧副本）
- react 19.3 / vitest 5.0.5 / vite 8.3.5 等 minor 例行跟进

## Closure

Status Note: `pnpm audit --prod` 40（3c/12h）→ **0 漏洞**（超出 0 critical 目标）；jspdf 2.5.2→4.2.1 双消费面（print-core + scheduling）零适配迁移，判别性非 mock 集成测试双向实证；dompurify/katex/tiptap 家族/workspace 协议/版本区间全收敛；lockfile 中 jspdf@2.5.2、dompurify@2.5.9 归零。closure audit round-1 issues（3M+3m：scheduling 第二消费面未登记、dev-chain 文本失实、漏勾框与数字勘误）→ 全部修复（含 scheduling bump + 1095 用例复绿）→ round-2 approved 零 findings。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_a8f37e95（round-1 issues）→ agent_018ab179（round-2 approved 零 findings）
- Evidence: round-1 全部代码声称直观测验成立（audit 0 复跑、87/87 含判别器〔2.5.2 scratch 实跑双向验证〕、8 manifest diff 逐一吻合、归因核实）；round-1 三 Major 修复逐项复验（scheduling 116 文件/1095 绿、lockfile 零旧副本、83 dev 残余数字精确吻合 Deferred、lint 46/46 绿）；基线留档 `audit-prod-baseline.txt` 3c/12h 与勘误后文本一致；审计证据日志 `_tmp/audit-2026-10-31-logs/closure-audit-*.log`

Follow-up:

- dev 链 advisory 残余（83 项 watch-only）→ dev 依赖治理轮次
- bundle-size mainEntry +6% 回收 → bundle 组成分析轮次
- katex 0.16 dev 传递（rehype-katex 区间钉死）随 dev 治理轮次
