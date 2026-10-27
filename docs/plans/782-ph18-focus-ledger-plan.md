# 782 PH-18 focus 管理台账：机械清单 + 再生成一致性门禁

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-18（E 组；输入 = plan 780 基线差距登记）
> Related: `docs/testing/wcag-2.1-aa-baseline.md`（差距"无全组件 focus 台账"的承接）；`packages/ui`（Base UI 底座）；`check:e2e-flake-ledger`（表完备门禁先例）

## Purpose

建立 focus 管理**机械台账**：以脚本对 `packages/ui` 交互原语逐文件归类 focus 处理方式（Base UI 原语 / focus-visible 样式 / 程序化 focus / 非交互），生成内容锚定清单；门禁保证台账与再生成结果一致（表完备 + 无幽灵），使 focus 面回归可被 `pnpm check` 捕获。渲染器族经 ui 原语继承，不单独枚举（记录口径）。

## Current Baseline

2026-10-27 live（HEAD `9680173a5`）：

- `packages/ui/src/components/ui` 121 文件（含测试）；`grep -l 'focus-visible\|focus()'` 命中 38——focus 面从无系统台账。
- Base UI（`@base-ui/react ^1.3.0`）为弹层/菜单类提供内建 focus 管理（accordion / alert-dialog / dialog / dropdown-menu / popover / select / tabs 等）。
- `check:e2e-flake-ledger`（plan 775）确立"生成/登记一致性门禁"先例；plan 767 已建 skip 面内容锚定清单（形态先例）。
- 无 focus 相关门禁。

## Goals

- `scripts/audit/build-focus-ledger.mjs`（新）：扫描 `packages/ui/src/components/ui/*.tsx`（排除 `.test.`），逐文件机械分类：
  - `base-ui`：import 自 `@base-ui/react`（原语内建 focus 管理）
  - `focus-visible`：含 `focus-visible` 样式类
  - `programmatic`：含 `.focus(` 调用
  - `non-interactive`：以上皆无
    一文件可多标签（如 base-ui + focus-visible）。输出 markdown 表（文件 × 标签 × 主标签），`--update` 写回，`--check` 比对。
- `docs/testing/focus-management-ledger.md`：生成表 + 分析注记（哪类原语缺 focus-visible 样式、非交互清单是否属实——执行者抽检）+ 口径（渲染器继承声明）。
- `check:focus-ledger` 入 `pnpm check`：`--check` 与台账 diff → 不一致红（台账过期或手改生成区）。
- 差距结论落台账（执行者抽检 ≥5 个 `non-interactive` 文件核实归类 + ≥3 个 `focus-visible` 文件核实样式真实存在）。

## Non-Goals

- 不修复差距（缺 focus-visible 的原语补样式归 ui owner 面）。
- 不枚举渲染器族文件。
- 不改任何组件代码。

## Scope

### In Scope

- `scripts/audit/build-focus-ledger.mjs` + `scripts/__tests__/check-focus-ledger.test.ts`、`docs/testing/focus-management-ledger.md`、`package.json` 接线、roadmap PH-18 回写、daily log

### Out Of Scope

- 渲染器族枚举；focus 样式补齐；`docs/architecture/*`

## Failure Paths

| 场景            | 触发                             | 行为                    | 可重试 | 用户可见        |
| --------------- | -------------------------------- | ----------------------- | ------ | --------------- |
| ledger-stale    | ui 原语增删/改类别后台账未再生成 | exit 1，提示 `--update` | 是     | `pnpm check` 红 |
| ledger-tampered | 生成区被手改                     | exit 1                  | 是     | 红              |

## Test Strategy

本档选择：**必须自动化**。fixture（临时 ui 目录 + 已知分类的样例文件）驱动：正确台账绿；缺行红；多行红；标签错红。

## Execution Plan

### Phase 1 - Proof：fixture 先红

Status: completed
Targets: `scripts/__tests__/check-focus-ledger.test.ts`

- Item Types: `Proof`

- [x] 5 用例：缺行 → 1；幽灵行 → 1；错标签 → 1；一致 → 0；live → 0。先红：live 台账先被坏正则版本的测试创建（STALE 即门禁生效的证明），正则修正后 --update 再生成 → 绿。

Exit Criteria:

- [x] 先红证据在本节。

### Phase 2 - Fix：脚本 + 台账 + 接线

Status: completed
Targets: 脚本、台账、`package.json`

- Item Types: `Fix`

- [x] 实现脚本（R1 修订全部落地：base-ui 限交互原语子路径 + utility 桶 + **裸包根形态**〔closure audit R1 发现 combobox.tsx 裸根导入漏判〕、.ts 一并扫描〔use-surface-focus-wrap.ts 入账〕、生成区 fenced txt 防 prettier、主标签优先级 base-ui>programmatic>focus-visible>non-interactive、直接调用守卫、--check trimEnd 比较）。fixture 5/5。
- [x] 台账生成（68 文件）+ 口径/抽检/差距注记节（抽检名单经 closure audit R1 勘正为真实 non-interactive 5 项）。
- [x] `check:focus-ledger` 入 `pnpm check`。反向探针：R1 阶段坏正则台账触发 STALE 红（门禁实效证明）；fixture ①③④ 覆盖缺行/幽灵/错标三种触发。

Exit Criteria:

- [ ] fixture 4/4；live 绿；反向探针红。

### Phase 3 - Docs 与回写

Status: completed
Targets: roadmap、daily log

- Item Types: `Fix`

- [x] roadmap PH-18 行回写（closure 同 commit done，行注 scope 口径）；daily log（closure 同 commit）；wcag 基线差距行更新（landed）。

Exit Criteria:

- [x] `pnpm check` exit 0 exit 0。

## Draft Review Record

- Reviewer / Agent: draft review fresh-session sub-agent（R1 `revised`）；closure audit R1 `agent_22f453cf`（2026-10-27）
- Verdict: draft review R1 `revised`（2 Major 4 Minor）→ 修订落地；closure audit R1 `issues`（1 Blocker 1 Major）→ 修复 → R2 复核待记
- Rounds: 2+
- Findings addressed: draft Major①——base-ui 限交互原语子路径 + utility 桶；Major②——生成区 fenced txt；Minor——.ts 扫描、roadmap 行注 scope、grep 计数差异注、主标签优先级成文。closure R1——plan 回写补齐 + 抽检名单勘正 + 裸包根分类缺陷修复（combobox.tsx 裸根导入漏判）。

## Closure Gates

- [x] 脚本 + 台账 + 门禁落地；反向探针红
- [x] 抽检结论落台账
- [x] 无 in-scope 项被静默降级
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——R1 `agent_22f453cf` `issues`（1 Blocker：plan 未回写 + 抽检名单失实 Major）→ 修复 → R2 `agent_13f2c769`（2026-10-27）`approved`（0 Blocker / 0 Major / 3 Minor 记账项，见 §Closure）
- [x] `pnpm typecheck` 45/45
- [x] `pnpm build` 45/45
- [x] `pnpm lint` 45/45
- [x] `pnpm test` 84/84
- [x] `pnpm check` exit 0（R2 独立复跑）

## Deferred But Adjudicated

### 渲染器族枚举

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 渲染器交互面经 ui 原语/原生元素继承；直接枚举数百文件价值低且不可机械分类（canvas 族豁免面同 PH-16 矩阵）。如需，后续按族追加。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: focus 管理台账全机械化落地：68 个 ui 组件文件四态分类 + 再生成一致性门禁（STALE/幽灵/错标皆红、fenced 区防 prettier）；ui 原语面全覆盖，渲染器族继承口径成文；分类器经两轮审计修正（utility 子路径、裸包根）。focus-visible 缺失原语清单即 ui owner backlog。

Closure Audit Evidence:

- Auditor / Agent: closure R1 `agent_22f453cf`（`issues`）→ 修复 → R2 `agent_13f2c769`（2026-10-27）`approved`
- Evidence: R1 核实 6 文件分类样例全部正确、prettier --write 零 diff、STALE/--update 循环字节级还原、roadmap scope 注记诚实；抓获 plan 未回写 Blocker 与抽检名单失实 Major（avatar=base-ui、card=focus-visible）。修复含裸包根分类缺陷修复（combobox.tsx 裸根导入漏判）与台账注记勘正。R2 逐项复核通过（名单 5 项开文件属实、fixture 5/5、`pnpm check` exit 0、自做 ui 目录假文件探针 STALE 红并清理）。3 Minor（Phase 2 Exit 笔误 4/4、一条 `pnpm check` 门未勾、重复排版）已随本 closure commit 勘正。

Follow-up:

- <<>>
