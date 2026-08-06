# 3 button href 安全协议校验修复与同根裁决一致性（P1 → P0 重裁）

> Plan Status: completed（2 Phase 全 completed + 全量验证绿 + closure-audit pass（独立 fresh sub-agent task `ses_0291ef351ffe3AW46Hlq5jR0NC`，verdict approved，零 Blocker/零 Major，2 Minor 非阻塞））
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-0656-open-audit-component-audit.md`（F2 P1：同根安全缺陷 link 裁 P0 立即修复、button 裁 P2-3 延后 CR，裁决不一致且漏洞 live 暴露）、`docs/audits/per-component/button.md:40`（P2-3 登记）、`docs/audits/per-component/link.md`（P0-1 同源先例）、`packages/flux-renderers-basic/src/button.tsx:238-244`
> Related: `docs/plans/2026-08-06-0529-1-gate-truthfulness-and-finding-routing.md`（门禁/路由）、`docs/plans/2026-08-06-0529-2-scan-p1-doc-drift-and-coverage.md`（文档漂移）；CR（`docs/plans/2026-08-06-0329-1-cr-cross-family-centralized-remediation.md`）Phase 2 已有 button href test-first 条目——本 plan 按 checklist §3 的 P0 时限（安全缺陷当轮自动修复，不等批量）提前认领修复，CR Phase 2 该条改为交叉核对

## Purpose

收口 open audit F2（P1）：同一根因（href 数据绑定可注入 `javascript:`/`data:` URI 点击执行）在 `content/link` 被裁 P0 并当天修复（bug 80，`isSafeNavigationUrl` 白名单），在 `basic/button` 却被裁 P2-3 延后 CR，live 代码至今直出 `href`——裁决不一致且漏洞面暴露中（自 08-03 C1.3 登记起）。本 plan 按 checklist §3 的 P0 定义（安全漏洞/任意 URL → 审计当轮自动修复）对 button href 重裁为 P0，test-first 落地协议校验修复，并把「同根同型缺陷跨族时以已裁定 severity 为准」的裁决一致性规则写入审计卡/checklist 记录，防止同类不一致复发。

## Current Baseline

- **live 缺陷**：`packages/flux-renderers-basic/src/button.tsx:238-244`——`props.props.href` 存在时渲染 `<a href={props.props.href} target={props.props.target}>`，无任何 URL 协议校验；`javascript:`/`data:`/`vbscript:` URI 点击即在当前页面上下文执行（低代码 schema 常由服务端/第三方配置驱动，href 可绑定数据源记录）。
- **同源已修复先例**：`packages/flux-renderers-content/src/link.tsx:25-35` 已接 `isSafeNavigationUrl`（`flux-renderers-content/src/sanitize.ts`）白名单（http/https/mailto/tel/data: + 无 scheme 相对 URL，大小写不敏感；禁 javascript:/vbscript:/blob:/file:；不安全 href → undefined，label 保留、fail-safe 不可导航）；link 卡 P0-1 fixed + `docs/bugs/80` 记录。
- **裁决现状**：`docs/audits/per-component/button.md:40` P2-3「href URL 协议校验缺失（与 content link.tsx 同源，根因公共）→ 状态: open（shared，归 CR 集中裁决）」，组件卡已 closed；CR plan Goals 已登记 button 协议校验（Phase 2 test-first 条目），但按 checklist §3 该缺陷本应在 C1.3 轮裁 P0 并当轮修复。
- **helper 位置**：`isSafeNavigationUrl` 现位于 `flux-renderers-content`（`sanitize.ts`）；button 位于 `flux-renderers-basic`。basic → content 依赖方向为反向，不可直接 import（CR Non-Goals 已否决依赖反转）；需要 Decision 裁决复用路径（CR Phase 1 已有同类 Decision 候选：a) basic 包内联等价实现；b) 提升公共层；c) 依赖反转（否决））。

## Goals

- button href 不安全协议 URI 不再直出 `<a href>`（`javascript:`/`vbscript:` 等脚本执行 scheme 被拦截），与 link 修复后行为同构（白名单保留 + 不安全时 fail-safe）。
- test-first：先红（当前 `javascript:` 原样进 DOM）后绿，回归测试锁定修复行为。
- button 卡 P2-3 重裁为 P0 并回写状态（open → fixed）；「同根同型跨族 severity 一致性」规则记录进 button/link 卡或 checklist（可被 CG checklist v2 吸收）。
- CR plan Phase 2 的 button 条目与本 plan 交叉核对（本 plan 先行落地，CR 执行时只做回归验证）。

## Non-Goals

- **不修改 link.tsx / sanitize.ts 既有行为**（除非 Phase 1 Decision 裁定提升 helper 到公共层，此时只移动代码不改变语义，且需 CR Phase 1 裁决表联动）。
- **不做超出 href 协议的 button 安全面扩展**（P3-1 aria-disabled 等留 CR/卡内记录，不并入本 plan）。
- **不重开已 closed 的 button 卡**：只回写发现项状态与裁决，不重新执行 18 维审计。
- 不重复 CR Phase 1 的完整 Decision 流程（本 plan 只裁决 helper 位置这一个决策点，供 CR 联动）。

## Scope

### In Scope

- button href 协议校验修复（test-first）+ 回归测试。
- helper 位置 Decision（复用/内联/提升）+ 执行。
- button 卡 P2-3 → P0 重裁 + 状态回写 + 同根 severity 一致性规则记录。

### Out Of Scope

- link.tsx 行为变更、sanitize.ts 白名单语义变更（除非 helper 提升时的纯移动）。
- button 其他 P2/P3 发现（P2-1/P2-2 已 fixed、P3-1 留卡）。
- CR/CV/CG 其他 scope。

## Failure Paths

| 可测场景编号           | 触发                                                           | 行为（含状态码/错误码）                                                                           | 可重试 | 用户可见表现                      |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ | --------------------------------- |
| btn-href-unsafe-scheme | `href="javascript:alert(1)"` / `vbscript:` / `blob:` / `file:` | 不渲染 href（undefined），label/children 保留，不可导航                                           | 否     | 按钮/链接外观正常，点击无脚本执行 |
| btn-href-safe-scheme   | `href="https://..."` / `mailto:` / `tel:` / 相对 URL / `data:` | 保留 href 正常导航（与 link 白名单同口径；`data:` 口径联动 CR Phase 1 终裁，见 Phase 1 Decision） | 否     | 点击正常导航                      |
| btn-href-case-insens   | `JaVaScRiPt:` 混合大小写                                       | 同 unsafe 处理（白名单大小写不敏感）                                                              | 否     | 同 unsafe                         |
| btn-href-empty-string  | `href=""`（falsy）                                             | 与 link 同构：不渲染 href 分支、无导航（falsy 走 Button 分支），非 XSS 面                         | 否     | 普通按钮外观，无导航              |

## Test Strategy

本档选择：`必须自动化`

- 安全红线（XSS/任意 URL 面）：Proof 项（test-first 失败测试）必须先于 Fix（guide Rule 12）。
- 断言正确行为（不安全 URI 不落 href / 安全 URI 保留），非仅「不抛错」。
- 回归：basic 包既有 button 测试（button-enhancements/button-count-down/button-tooltip 等）零回归；CR Phase 2 button 条目交叉核对。

## Execution Plan

### Phase 1 - 裁决与 helper 位置 Decision

Status: completed
Targets: `docs/audits/per-component/button.md`、`docs/audits/per-component/link.md`（只读参照）、`packages/flux-renderers-content/src/sanitize.ts`（只读参照）

- Item Types: `Decision | Fix`

- [x] **Decision**：button 卡 P2-3 重裁为 **P0**——依据 checklist §3 P0 定义（安全漏洞/任意 URL → 当轮自动修复，不等批量）+ 同根 link 已裁 P0 的先例；回写 button.md:40 的 severity 与裁决说明，卡状态 open → fixed（修复落地后）。**落地**：`button.md:40` 已重写为 `[P2-3→P0 重裁]`，含 checklist §3 依据 + link 先例（bug 80）+ 状态 `fixed`（证据链完整）。
- [x] **Decision（helper 位置）**：裁定 `isSafeNavigationUrl` 复用路径——候选：a) basic 包内联等价实现（当前最稳妥：不跨包依赖、语义与 link 白名单对齐，成本 ~15 行）；b) 提升到公共层（flux-core/共享模块，涉及包边界 → 需 CR Phase 1 裁决表联动，超出本 plan 单独决策能力）；c) basic 依赖 content（依赖方向反转，沿用 CR 否决）。**终裁：b) 提升到 `flux-core/src/utils/url.ts` 公共层**——由 CR plan（`2026-08-06-0329-1` Phase 1 D5）联动裁决并执行（`cr-inventory-adjudication.md` D5 记录理由：flux-core 为 basic/content 共同依赖层、utils/ 已有同型纯函数 helper 惯例、content sanitize.ts 保留再导出零改动；`data:` 口径与 link 契约一致全放行）；本 plan 记录终裁并交叉核对（button.tsx 已接入、sanitize.test/link 测试零改动实证）。**`data:` 口径联动**：按 link 同构默认（白名单保留 `data:`）；CR Phase 1 D5 已终裁全放行（`data:text/csv` 下载链路契约 + opaque-origin 导航非同质风险），本 plan 断言与实现均已对齐。
- [x] **Decision（同根一致性规则）**：在 button.md 修复记录与 link.md 卡内各补一行「同根同型安全缺陷跨族时以已裁定 severity（P0）为准」的裁决说明，供 CG checklist v2 吸收为通用规则。**落地**：`button.md:40` 与 `link.md` P0-1 条目各补同根一致性规则行。

Exit Criteria:

- [x] button.md P2-3 已重裁为 P0（裁决说明 + checklist §3 依据）；helper 位置 Decision 有终裁记录；同根一致性规则已记录于两张卡。

### Phase 2 - test-first 修复

Status: completed
Targets: 新增 `packages/flux-renderers-basic/src/__tests__/button-href-safety.test.tsx`、`packages/flux-renderers-basic/src/button.tsx:238-244`

- Item Types: `Proof | Fix`

- [x] **Proof（test-first）**：新增 `button-href-safety.test.tsx`——断言 `javascript:`/`vbscript:`/`blob:`/`file:`（含 `JaVaScRiPt:` 混合大小写）不渲染进 href（undefined 或等价格式化剥离，与 link 同构）；`https:`/`mailto:`/`tel:`/相对 URL/`data:` 保留；先红（当前实现 javascript: 原样直出）后绿。**落地**：7 用例（javascript: / JaVaScRiPt: / vbscript: / blob:+file: / http-https-mailto-tel / 相对 URL×4 / data:）——CR Phase 2 落地时先红后绿（`de0725ba`），本 plan 补 blob:/file: 显式断言后全绿。
- [x] **Fix**：`button.tsx` href 分支接入协议校验（按 Phase 1 helper Decision：内联等价实现或复用提升后的 helper）；不安全 href → undefined（fail-safe：label/children 保留、不可导航），与 link.tsx 行为同构。**落地**：`button.tsx:239-250` 接入 flux-core `isSafeNavigationUrl`（复用提升后 helper），`renderAsAnchor` 仅判非空字符串、href 属性经白名单过滤——不安全协议 → anchor 形态保留但 href 为 undefined（不可导航），与 link.tsx:29-34 同构。
- [x] **Proof（回归）**：`pnpm --filter @nop-chaos/flux-renderers-basic test` 全绿（含既有 button 测试零回归）；`rg "javascript:" packages/flux-renderers-basic/src/button.tsx` 相关渲染路径零残留不安全 href 直传。**实测**：basic 包 48 files / 479 tests 全绿（含既有 button-enhancements/count-down/tooltip 等零回归）；`rg` 仅命中注释说明，无 href 直传。
- [x] **Fix（状态回写）**：button.md P2-3 状态 open → fixed（附 test-first 证据与 bug 引用）；若涉及 `docs/bugs/` 则按 00-bug-fix-note-writing-guide 记录新 bug note 或挂接 bug 80。**落地**：`button.md:40` 重裁 P0 + 状态 fixed（test-first 证据 + 挂接 bug 80——bug 80 note 的「Notes For Future Refactors」已覆盖 button-as-link 场景，无需新 note）。
- [x] **Fix（CR 交接记录）**：在 CR plan（`2026-08-06-0329-1`）Phase 2 button 条目处或 daily log 记录「本 plan 已落地 button href 修复，CR 执行时该条仅做回归验证、不重复实现」，防止 CR 执行者静默重做。**落地**：实际时序为 CR Phase 2 先行落地修复（`de0725ba`），本 plan 收口重裁/一致性规则/回归——交叉核对已记录于 CR plan Phase 2 条目（已含完整 test-first 证据）与本日 daily log（互引双向，无重复实现）。

Exit Criteria:

- [x] button-href-safety 测试全绿（安全/危险 URI 双向断言）；basic 包既有测试零回归；button.md 状态回写完成；CR plan 或 daily log 已记录交接（CR Phase 2 该条改为回归验证）。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_02c2275d7ffe5n5tvrpiU4HbD5`（round 1，fresh session，`pass-with-minors`，2026-08-06）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已全部处理——①Related `{1}`/`{2}` 占位符替换为实际 plan 路径；②Failure Paths `btn-href-empty-relative` 行改为 `btn-href-empty-string`（`href=""` falsy 走 Button 分支、与 link 同构不渲染 href，非 XSS 面）；③`data:` 口径补 CR Phase 1 终裁联动说明（Phase 1 Decision）；④CR 交接记录——Phase 2 新增 Fix 项：在 CR plan 或 daily log 记录「本 plan 已落地，CR 仅回归验证」，防止重复实现。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] button href 不安全协议 URI 不再直出（P1 → P0 缺陷修复，test-first 证据在案）
- [x] 安全/危险 URI 双向断言测试全绿；basic 包既有测试零回归
- [x] button 卡 P2-3 → P0 重裁 + 状态回写完成；同根 severity 一致性规则已记录
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs（button.md、link.md、daily log、如涉及 bugs/）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### helper 提升到公共层（若 Phase 1 裁 a 内联实现）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 内联等价实现已满足安全面（行为与 link 同构）；跨包公共 helper 属结构重构，需 CR Phase 1 裁决表联动，不构成安全缺口。
- Successor Required: `yes`
- Successor Path: CR plan Phase 1 Decision（button helper 位置）联动；若 CR 裁定提升，则本 plan 内联实现由 CR 迁移

> **Supersession note（2026-08-06，closure 时点）**：本 Deferred 项的条件分支未发生——Phase 1 终裁为 b（提升到公共层），由 CR plan（0329-1）D5 联动执行并落地（`isSafeNavigationUrl` 现位于 `flux-core/src/utils/url.ts:23`，content sanitize.ts 再导出），本 plan 内联实现从未产生；该条目视为已消化，无 successor 债务。

## Non-Blocking Follow-ups

- button P3-1（href 模式 disabled 无 aria-disabled、修饰键可导航）仍留卡内记录，不并入本 plan。
- 同根 severity 一致性规则建议 CG checklist v2 吸收（本 plan 已在卡内记录，CG 可引用）。

## Closure

Status Note: completed（执行完成——2 Phase 全 completed。Phase 1：button 卡 P2-3 → P0 重裁回写 `button.md:40`（checklist §3 P0 依据 + link 先例），helper 位置终裁 b（提升 flux-core `utils/url.ts`，CR D5 联动执行，`data:` 口径全放行对齐），同根一致性规则记录于 button/link 两张卡。Phase 2：修复主体由 CR Phase 2 先行 test-first 落地（commit `de0725ba`，`button-href-safety.test.tsx` 先红后绿），本 plan 补 blob:/file: 显式断言（现 7 用例）并收口重裁/一致性规则/回归验证；CR 交接双向交叉核对，无重复实现。全量验证：typecheck/build/lint 32/32、test 59/59 task 全绿（basic 48 files/479 tests）、`pnpm check` 仅 14 既有 pre-existing oversized 零新增。owner docs（button.md/link.md/daily log）已同步 live baseline；Deferred 项因终裁 b 已消化（见 supersession note）。）

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent task `ses_0291ef351ffe3AW46Hlq5jR0NC`（closure audit，2026-08-06，执行 session 之外独立审核）
- Evidence: verdict `approved`——零 Blocker/零 Major；2 Minor 非阻塞（①daily log 预记 Plan Status→completed，已在本 Closure 节落地闭环；②Deferred 条目条件分支未发生，已补 supersession note 消化）。逐 Phase live repo 证据：button.tsx:3,239-250 接入 flux-core helper（href 白名单过滤、anchor 形态 fail-safe）、button-href-safety.test.tsx 7 用例双向断言、url.ts:23 白名单正则（大小写不敏感）、sanitize.ts 再导出零改动、button.md:40/link.md P0-1 重裁与一致性规则、plan 文本一致性（唯一未勾项即 audit gate 自身，执行 session 未自审）、deferred 诚实性、daily log 收口；接口 vs 语义抽查（渲染路径 + 测试行为而非仅签名）。

Follow-up:

- no remaining plan-owned work（helper 位置 successor 已由 CR D5 消化；P3-1 href 模式 disabled aria-disabled 留卡内记录，见 Non-Blocking Follow-ups）
- 同根 severity 一致性规则建议 CG checklist v2 吸收（本 plan 已在卡内记录，CG 可引用）。
