# 823 文档同步（owner/导航文档对齐 live + 深审报告落档）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/audits/deep-audit-2026-10-31.md` §5（E5-E9）——E9 初稿声称经评审证伪并修订，见 Current Baseline 勘误说明
> Related: plan 784（docs splitting owner——本计划不拆分任何超长文档）；~~805~~（编号让位，本队列改号 820-825）

## Purpose

把深审发现的 owner/导航文档漂移同步到 live baseline：AGENTS.md ui 组件清单补全、quick-reference 补 Last Reviewed、project-context 验证基线注记刷新、component-audit-roadmap 收口 banner、docs-garbled 按评审证实的真实构成分族处置（白名单合法词表 + 修真实缺陷 + 豁免生成物）；本审计报告（含勘误）与当日 daily log 一并落档。

## Current Baseline（含评审勘误）

- `AGENTS.md`「Available components」清单缺 ~23 个已导出组件族（评审抽查 8/23 确认存在：Accordion、ColorPicker、Command@command.tsx:180、JsonViewer、Menubar@menubar.tsx:258、Pagination@pagination.tsx:166、Rating、ToggleGroup；经 `packages/ui/src/index.ts` barrel `export *` 导出）；另有 ScrollMask、Toolbar controls、hooks/libs 等非组件导出未列。
- `docs/references/quick-reference.md` 无 "Last Reviewed" 标记（评审 grep 复核 exit 1）；内容抽查 4/4 准确（useRendererEnv@hooks.ts:90、useStrictMode@hooks.ts:190、useCurrentFormErrors@use-form-hooks.ts:225、SchemaFieldKind@flux-core/types/schema.ts）；自身 65,756 B 超拆分线，拆分归 784 口径。
- `docs/context/project-context.md` 头部 DV 基线停在 2026-08-09（评审精确匹配）。
- `docs/backlog/component-audit-roadmap.md`（201,652 B）48 项 done、0 未勾，无显式收口 banner；round-2 已拆分至 `component-audit-round2-roadmap.md`。
- **docs-garbled 25 项真实构成（评审逐条读 verdicts.json 勘误，初稿"全为 façade ç 误报"不成立；round-2 audit F2 计数勘误：实测基线为 26——本枚举漏计深审报告自身的 façade ç〔其落档后被自检〕，Goals/Exit 已按 26 口径）**：
  - 10 项 ç 族（façade，如 `docs/analysis/2026-05-24-deep-audit-full/02-module-responsibility.md` ×6）→ 合法词表白名单。
  - accented/Greek/German 字母族 11 文件（á ä è ü / α Δ β κ ε Σ δ ö，散布于 nlah-paper-source.txt、review-a.md、gate-3-review.md、r-msp article、swipe-cell/design.md、wa-13a/report.md（ε×5）、logs 08-04/08-08/10-19、664-mobile、stripe plan）→ 按文件语境逐族白名单（引用原文/数学符号，非乱码）。
  - **Cyrillic 同形字族（wa-15a/report.md：3 个 Cyrillic 字母 U+0444/U+0430/U+0441 替换 fac 造出一词）→ 疑似真实 homoglyph 缺陷，须逐处人工检视后修复或裁决**（不可白名单掩盖）。**执行期取证勘误（round-1 closure audit Major-2）**：wa-15a 实为合法 UTF-8（iconv 干净、零双编码标记），仅 line 285 一处词级 homoglyph（fac 三字母被 Cyrillic U+0444/U+0430/U+0441 替换）——初稿与深审报告的「真字节级损坏/整表双编码」描述系 `cat -v` 把正常中文多字节误读所致，已双处就地勘误；处置仍为保持检出（known-bad 自证样例），一词修复留 successor。
  - **1 个 zero-width joiner（`2026-10-24-0039-arm2-MA9.4-e2e-adversarial.md`）→ ~~真实不可见字符缺陷，删除该字符~~（执行期推翻：live 检视实证 U+200D 位于有意 emoji 序列示例 `👨‍👩‍` 内〔P3-obs-2 maxLength/UTF-16 论证本体〕，删除反而破坏语义 → 改判上下文豁免，裁决落 Deferred But Adjudicated）**。
  - 2 个 vendor 压缩 bundle（生成物 mojibake 观感）→ 按路径规则豁免（生成物不入检）。
- `check-docs-garbled.mjs` **无白名单机制**（评审读脚本确认）→ 需最小侵入加词表/路径豁免（仅数据/词表，不改判定主链）；脚本 exit 码只反映 crash，**真实信号是 likely-garbled 计数**（当前 25；round-2 audit F2 勘误：本 plan 落档后实测基线 26，见 Goals 口径）。
- 本审计报告已写于 `docs/audits/deep-audit-2026-10-31.md`（D1/D3/E9 三处初稿声称已按评审就地勘误）；`docs/logs/2026/10-31.md` 待建。

## Goals

- AGENTS.md ui 清单与 `packages/ui/src/index.ts` 实况一致。
- quick-reference 具备 Last Reviewed 标记；project-context 具备 2026-10-31 基线注记。
- component-audit-roadmap 顶部有收口状态 banner。
- docs-garbled：25（实测基线 26——初稿枚举漏计深审报告自身的 façade ç，round-1 audit Minor-2 勘误）→ 每一条残留都有明确裁决（白名单/修复/豁免），likely-garbled 计数降至 ≤ 个位数且逐条可解释；wa-15a homoglyph 保持检出作为自证样例（一词修复留 successor）。
- 深审报告与 daily log 落档并被 docs 导航可达。

## Non-Goals

- 不拆分任何超长文档（plan 784 owner）。
- 不改写历史 completed plan（guide Rule 21）。
- 不新增门禁脚本（如 plan-id 唯一性检查——Follow-up）。

## Scope

### In Scope

- 上列 4 份文档修改 + `check-docs-garbled.mjs` 词表/路径豁免最小扩展 + 审计报告/daily log 落档 + ZWJ 上下文豁免（改判，见 baseline 勘误）+ Cyrillic 检视裁决（保持检出 + successor）。

### Out Of Scope

- docs 结构重组；历史文档回写；garbled 判定主链逻辑变更。

## Failure Paths

| 编号                | 触发                                                            | 行为                                                            | 可重试 | 用户可见表现   |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | ------ | -------------- |
| cyrillic-ambiguous  | wa-15a/report.md 的 Cyrillic 经检视属有意引用（如俄文原文引用） | 不改文本，按文件语境登记白名单 + 裁决注记                       | 是     | 计数下降且有据 |
| whitelist-overreach | 白名单后某已知真实乱码样例不再被报                              | 缩小白名单粒度（按词/按文件而非全局），以已知乱码样例自证检出力 | 是     | 检出力自证通过 |

## Test Strategy

不适用：文档与检查脚本词表修改，无运行时行为变更。验证以 check 脚本实测计数、白名单前后已知乱码样例检出自证、`check:active-doc-code-anchors` / `check:owner-doc-semantics` 为准；脚本改动后跑全量 `pnpm lint`。**勘误（round-1 audit Minor-1 / round-2 F1 就地落）**：scripts/\*.mjs 不在 lint 门禁覆盖面内（直查 eslint 对该脚本有 8 个既有错误、全在未触碰行）——门禁口径以全量 `pnpm lint` exit 0 为准，见 Phase 2 Exit 同款勘误。

## Execution Plan

### Phase 1 - owner/导航文档同步

Status: completed
Targets: `AGENTS.md`、`docs/references/quick-reference.md`、`docs/context/project-context.md`、`docs/backlog/component-audit-roadmap.md`

- Item Types: `Fix`

- [x] AGENTS.md ui 组件清单补全（重写为字母序 + "non-exhaustive" 口径标注 + 26 组件逐一 grep 验证存在于 `packages/ui/src/components/ui/`；regen 日期标注）
- [x] quick-reference.md 头部补 `> Last Reviewed: 2026-10-31`（含抽查出处回链）
- [x] project-context.md Documentation freshness 小节新增 2026-10-31 深审计轮验证基线注记（17,347/0、820 收敛 5 红、822 收缩、e2e 未全量重跑口径、C2 并行会话在飞提示），2026-08-09 DV 条目保留为历史记录
- [x] component-audit-roadmap.md 顶部补收口 banner（48 项 done、round-2 拆分、日期）

Exit Criteria:

- [x] AGENTS.md 清单中每个组件名都能在 `packages/ui/src/components/ui/` 找到（26 族逐一 grep 验证零 MISSING）
- [x] 四份文档各自可见新标记/新段落，内容与 live 一致
- [x] `pnpm check:active-doc-code-anchors` exit 0（375 active docs）

### Phase 2 - docs-garbled 分族处置与审计落档

Status: completed
Targets: `scripts/check-docs-garbled.mjs`（词表/路径豁免）、`docs/audits/2026-10-24-0039-arm2-MA9.4-e2e-adversarial.md`（ZWJ）、`docs/audits/workaround-code-smell/wa-15a/report.md`（Cyrillic 检视）、`docs/audits/deep-audit-2026-10-31.md`、`docs/logs/2026/10-31.md`

- Item Types: `Fix | Decision | Proof`

- [x] 词表/路径豁免落地（数据 + 单点旁路，classify/score/threshold 主链不动）：BENIGN_LETTERS（Latin-1 重音字母 + 希腊字母——引用原文/数学公式语境）；BENIGN_ZWJ_EMOJI_CONTEXT（ZWJ 处于 emoji 代理对行 = 有意 emoji 示例，注意 /u 标志下代理对按码点合并需去 /u 按码元匹配——实现勘误已注释在案）；BENIGN_VENDOR_PATH_PREFIXES（docs/ppts/assets/js/ 生成物 2 bundle）
- [x] **ZWJ 处置勘误（评审前提被 live 检视推翻）**：该 U+200D 并非损坏——其位于对抗性 spec 的 emoji ZWJ 语义示例 `"👨‍👩‍"` 内（P3-obs-2 maxLength/UTF-16 论证本体），删除反而破坏文档语义 → 处置从"删除"改判为**上下文豁免**；就地落本节与深审报告 E9 勘误
- [x] Cyrillic 检视裁决（Failure Path cyrillic-ambiguous 实际走向）：wa-15a/report.md 实证为**合法 UTF-8 + 单词级 homoglyph**（iconv 干净/零双编码标记；line 285 一词：fac 三字母被 Cyrillic 同形字 U+0444/U+0430/U+0441 替换）——round-1 closure audit Major-2 推翻初稿「真字节级损坏」取证（系 `cat -v` 误读中文多字节所致）；处置仍为**保持被检出**作为词表白名单常驻自证样例，一词修复留 successor（落 Deferred）
- [x] Proof 自证：白名单落地后 likely-garbled 26 → **1**，唯一残留恰为 wa-15a（真缺陷保持检出——检出力未受损的实证）；needs-review 低分残留（score 2-4）逐条为 benign 语境非门禁项
- [ ] 深审报告 §7 Deferred 表终态回填——round-1 audit Minor-3 勘误：本项按「收口时回填」预勾属过早（824/825 尚未收口），**改判移交 plan 825 收口 commit 承接**，本 plan 不再持有该项
- [x] `docs/logs/2026/10-31.md` 建立：深审计启动、验证链实测、各 plan 收口摘要、单测计数（820 收口时建档，本 plan 持续追加）

Exit Criteria:

- [x] `pnpm check:docs-garbled` likely-garbled 计数 26 → 1（每条残留有裁决落点：wa-15a = known-bad 自证样例）
- [x] 已知乱码样例仍被检出（wa-15a 实证，记录于本节与深审报告 E9 勘误）
- [x] `pnpm lint` exit 0（全量实测；勘误：scripts/\*.mjs 实际不在 lint 门禁覆盖面内——直查 eslint 对本脚本报 8 个既有 no-undef/unused 错误〔URL/console/process，全在未触碰行〕，这正是它们从未红过的原因；本计划新增代码不引入新 lint 面）
- [x] `docs/logs/2026/10-31.md` 存在且含当日验证链计数；深审报告与 daily log 互相引用

## Draft Review Record

- Reviewer / Agent: 独立子代理 round-2（general-purpose fresh session，2026-10-31）
- Verdict: `pass-with-minors`（round-1 `fail`：1 Major，修订后复审确认收敛）
- Rounds: 2
- Findings addressed: Major-1（garbled 构成证伪）修订后复审确认五族分解与 verdicts.json 逐条吻合（并修正：ç 族实为 10 文件、wa-13a 归 accented 族计 11 文件、ZWJ 文件路径前缀 docs/audits）；Cyrillic 实证为词级同形字（:285，Cyrillic U+0444/U+0430/U+0441 替换 fac），走检视-修复/裁决双路径；Minor（lint 入 Closure Gates、计数信号口径）已修订

## Closure Gates

- [x] Phase 1/2 Exit Criteria 全勾（唯一未勾项 §7 回填改判移交 plan 825 收口 commit 承接——其收口时回填深审报告 §7 Deferred 表；plan 825 已加收纳行，round-2 audit F3）
- [x] `pnpm check:docs-garbled` / `check:active-doc-code-anchors` / `check:owner-doc-semantics` exit 0，likely-garbled 残留逐条有裁决
- [x] `pnpm lint` exit 0（全量；scripts 不在 lint 门禁面——直查既有错误见 Phase 2 勘误）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（round-1 issues 2M+3m → 修订；round-2 issues F1-F4 → 修复；round-3 issues F5〔提交时自检出风险〕→ 修复；round-4 approved 零 findings，含 commit-time 模拟验证）

## Deferred But Adjudicated

### adversarial plan ZWJ 的处置改判（删除 → 上下文豁免）

- Classification: `watch-only residual`
- Why Not Blocking Closure: round-1 closure audit Major-1 记账——执行期推翻「真缺陷须删」前提：live 检视实证该 U+200D 位于对抗性 spec 的有意 emoji 序列示例 `👨‍👩‍` 内（P3-obs-2 maxLength/UTF-16 论证本体），删除会破坏文档语义；改为 BENIGN_ZWJ_EMOJI_CONTEXT 上下文豁免（该文件已从 candidates/verdicts 消失）。语义零损失，检出力由 wa-15a 自证样例背书。
- Successor Required: `no`

### wa-15a 词级 Cyrillic 同形字（U+0444/U+0430/U+0441 替换 fac）的一词修复

- Classification: `optimization candidate`
- Why Not Blocking Closure: 审计确认该文件为合法 UTF-8、缺陷仅一词（line 285），本计划将其保留为白名单检出力自证样例（known-bad proof）——修复后 likely-garbled 归零、自证样例消失，需另建自证口径；一词修复与自证口径重建一并由下次触达 workaround-ledger 的轮次承接。
- Successor Required: `yes`
- Successor Path: 下次触达 workaround-code-smell ledger 的 functional/治理轮次

## Non-Blocking Follow-ups

- plan-id 唯一性检查脚本（新门禁契约，需独立裁决；2026-10-31 已实际发生 802 撞号，见 deep-audit E3）
- quick-reference 拆分（784 口径）

## Closure

Status Note: AGENTS.md ui 清单刷新（52 族字母序+非穷举口径，26 新增逐一 grep 验证）、quick-reference Last Reviewed、project-context 2026-10-31 深审基线注记、component-audit-roadmap 收口 banner 落位；docs-garbled 词表/路径豁免落地（数据+旁路不改主链）：likely-garbled 26→1，唯一残留 wa-15a 为词级 Cyrillic 同形字真缺陷、保持检出作为常驻自证样例；ZWJ 处置改判上下文豁免（评审删除前提被 live 检视推翻，落 Deferred）。closure audit 四轮（issues→issues→issues→approved）：round-2 抓出修复未落地与 audit 门预勾、round-3 抓出提交时自检出风险（plan 自引 Cyrillic 字形）——全部闭环，commit-time 模拟确认写回后门禁证据保持真实。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_2f7202ff（round-1 issues 2M+3m）→ agent_8018f3be（round-2 issues F1-F4）→ agent_e1722b04（round-3 issues F5）→ agent_0bd0a020（round-4 approved 零 findings）
- Evidence: round-4 直观测验——plan 零 Cyrillic 码点（U+0400-052F 全程扫描）；checker likely-garbled=1（wa-15a）；以 checker 自身 classify/benign/score/verdict 链对 plan 全文做提交时模拟 = 0 非良性出现（不进 candidates）；F1-F4 修复在位（lint 勘误双处一致、26 计数注记、825 收纳行 :122、audit 门未预勾）；round-1/2 的 Major 项（ZWJ Deferred 记账、wa-15a 取证勘误传播面）复核确认

Follow-up:

- wa-15a 词级 homoglyph 一词修复 + 自证口径重建（Deferred 已登记，successor=下次触达 workaround-ledger 轮次）
- plan-id 唯一性检查脚本、quick-reference 拆分（784 口径）——见 Non-Blocking Follow-ups
