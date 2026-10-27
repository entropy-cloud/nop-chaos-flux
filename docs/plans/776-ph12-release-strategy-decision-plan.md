# 776 PH-12 发布策略裁定（decision-only）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-12（D 组 decision-only；"即使结论是不做也必须产出显式 non-goal 文档"）
> Related: 裁定仓库的发布形态：是否向 npm 发布、版本/changeset 机制、凭据通道、source map 是否随产物发布。现状全部为空白且无文档化决策。

## Purpose

注：roadmap D 组正文写"43 包"，live 复测为 **45**（closure 时就地勘误 roadmap）。

- 45 个 `packages/*/package.json` **全部 `private: true`**，零 `publishConfig`，版本统一 `0.1.0`；根 `package.json` `private: true`；无 `.changeset/`；无 `.npmrc` registry 配置。
- 唯一宿主可见产物：`@nop-chaos/flux`（flux-bundle）经 `scripts/pack-flux-bundle.mjs` 打成 `dist-packages/nop-chaos-flux-<ver>.tgz`，由 `check:flux-bundle-pack`（形状）与 `check:bundle-size`（体积，plan 761）守护；`files: ["dist","README.md"]`。
- tarball 内含 `index.js.map`（10.3MB，≈60% 体积）——plan 761 Deferred 移交本项。
- 无 npm 凭据通道、无 CI publish job。

## Current Baseline

2026-10-27 live（HEAD `234fa21fa`）：

- 新 owner doc `docs/architecture/release-strategy-decision.md`：①**裁定 A：当前不向 npm 发布**（全私有、tarball 分发），版本 `0.1.0` 冻结直至首次外部发布；②**裁定 B：changeset 不引入**，直至裁定 A 翻转——翻转触发条件写明（出现外部宿主需 registry 安装 / 需要独立版本节奏）；③**裁定 C：source map 继续随 tarball 发布**（宿主可调试优先；体积由 `check:bundle-size` 守护，tarballBytes 含 map 已登记），翻转条件 = 宿主反馈下载体积问题或首次 npm 发布；④凭据通道 = 无（non-goal，随裁定 A 翻转时立项）。
- roadmap PH-12 回写。

## Goals

- 发布形态三项裁定落 owner doc（不发布 / 不引 changeset / source map 随 tarball，各含理由与翻转条件）
- `docs/architecture/release-strategy-decision.md`（新） 落地（最终态表述）
- roadmap PH-12 行回写 + daily log

## Non-Goals

- 不向 npm 发布、不引入 changeset、不改 package.json / pack 脚本
- `docs/architecture/release-strategy-decision.md`（新） 之外的任何文档
- 裁定翻转后的 successor 实施（触公共导出面/包边界者 plan-first + 人确认）

## Scope

### In Scope

- `docs/architecture/release-strategy-decision.md`（新）
- roadmap PH-12 行回写、daily log

### Out Of Scope

- 不向 npm 发布、不引入 changeset、不改 package.json / pack 脚本
- 裁定翻转后的 successor 实施（触公共导出面/包边界者 plan-first + 人确认）

## Failure Paths

不适用：纯裁定文档，无运行时行为变更。

## Test Strategy

本档选择：`不适用：纯文档裁定，无行为变更`（Closure Gates 仅保留 `pnpm check`，含 `check:active-doc-code-anchors` / `check:owner-doc-semantics` / 文档体积门）。

## Execution Plan

### Phase 1 - Decision：裁定落 owner doc

Status: planned
Targets: `docs/architecture/release-strategy-decision.md`（新）

- Item Types: `Decision`

- [x] 裁定 A/B/C/D 落 owner doc（见上方产物）。
- [x] `docs/index.md` 登记行已落。

Exit Criteria:

- [ ] 裁定节存在且与 live 事实一致（closure audit 逐条核对）。

### Phase 2 - 回写

Status: planned
Targets: roadmap、daily log

- Item Types: `Fix`

- [ ] roadmap PH-12 `todo`→`planned`（active 时记）→`done`；daily log。

Exit Criteria:

- [x] `pnpm check` exit 0（R2 与 closure audit 各自复跑） exit 0。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agents（R1 `agent_646f9eab`、R2 `agent_804bb21c`，四 plan 同批判定），2026-10-27
- Verdict: R1 `fail`（系统性 Major：Goals/Non-Goals/In/Out 内容旋转 + 各自 Minor）→ R2 `pass`
- Rounds: 2
- Findings addressed: Major——四节内容旋转全修正；Minor——776 index.md 强制登记 + 43→45 勘误注、777 无消费者明示、778 锚偏移复验注、779 全路径。R2 独立复核四裁定文档与 live 事实一致。

## Closure Gates

- [x] 裁定文档落 owner doc，含显式 non-goal / 条件与 successor 触发
- [x] 裁定依据的 live 事实逐条可核（R2 独立抽查）
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——R1 `agent_646f9eab` 四 `fail` → 修订 → R2 `agent_804bb21c` 四 `pass` → closure `agent_5d539ac8`（2026-10-27，见 §Closure）；原始行：（四 plan 合并：R1 `agent_646f9eab` 四 `fail` → 修订 → R2 `agent_804bb21c` 四 `pass` → closure `agent_5d539ac8`：777/778/779 `approved`，776 经 index.md 孤儿行修复后由原审计者复核确认）
- [x] `pnpm check`

## Deferred But Adjudicated

### 首次 npm 发布的实施

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 裁定 A 为"不发布"，实施项无触发；翻转条件已写明。
- Successor Required: `no`（条件触发时立项）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 裁定落 owner doc（最终态），R2 `pass` + closure audit `approved`（776 经孤儿行修复复核）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_5d539ac8`（2026-10-27）
- Evidence: 45 包 private / 无 changeset / tarball 含 index.js.map / 无凭据逐条核实；发现 docs/index.md 孤儿行 Major → 修复（移入路由表 :43）后原审计者复核确认 `approved`；`pnpm check` exit 0 复跑

Follow-up:

undefined
