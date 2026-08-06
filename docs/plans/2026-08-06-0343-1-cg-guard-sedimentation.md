# CG — Guard 沉淀（pc-index 汇总索引 + 工具脚本升级 + lessons + checklist v2）

> Plan Status: completed（draft → active：独立子 agent 审查 pass-with-minors，零 Blocker/零 Major，Minor 全部处理，共识达成；2026-08-06 执行 run：5 Phase 全 completed + 全量验证绿，Plan Status → completed；closure-audit 由独立 fresh session CLOSURE_VERIFY 执行后收口——执行 session 不自审勾选 audit gate）
> Mission: component-audit
> Work Item: CG
> Last Reviewed: 2026-08-06
> Source: `docs/backlog/component-audit-roadmap.md`（CG Phase Details、Work Item Status、Cross-Cutting）、`docs/audits/arm-index.md`（上轮 arm 风格索引范式）、`docs/audits/component-audit-checklist.md`（18 维 v1）、`docs/lessons/README.md`（lessons 格式）
> Related: 前置依赖 CR（`docs/plans/2026-08-06-0329-1-...`）与 CV（`docs/plans/2026-08-06-0329-2-...`，均 active）；p2p3（`docs/plans/2026-08-05-1359-1-...`，active）输出为输入

## Purpose

在 CR 收口（裁决表 + shared/P2 修复 + 文档同步）与 CV 全量验证（full-green 基线）之后，把 component-audit mission 的成果沉淀为可持续复用的组织防护：① 为 113 张逐组件审计卡生成 arm 风格汇总索引 `docs/audits/per-component/pc-index.md`（与上轮 audit-remediation 的 `arm-index.md` 同范式，支持后续审计快速检索）；② 评估并落地执行期间暴露的新可机械化审计模式（若有），升级 `check:audit-*` 工具脚本基线；③ 将 CX-1..CX-12 与跨 plan 共性问题（bug 73/83/89 模式等）提炼为 lessons 写入 `docs/lessons/`；④ 把执行期经验回灌 `docs/audits/component-audit-checklist.md` 修订为 checklist v2（含 `docs/audits/per-component/README.md` 模板 v2）。收口后 roadmap CG 行标 `done`，component-audit mission 的 guard 层闭合。

## Current Baseline

- **组件卡状态**：113 张审计卡全部 `closed`（C0–C9 + CX-1..CX-12 全部 `done`，2026-08-06 live 核对：`docs/audits/per-component/*.md` 中 `状态: closed` 恰 113 处）；卡内发现均带 `状态: fixed`/`卡内记录` 标注与 plan/commit 引用。
- **CR/CV 前置**：CR 与 CV plan 已 `active`（2026-08-06-0329 起草，独立子 agent review pass-with-minors），未执行。CR 产出 `docs/audits/cr-inventory-adjudication.md` 裁决表（~110 处"归 CR"引用零未分类）；CV 产出 full-green 验证记录（daily log + full-green 标记提交）。本 plan 依赖二者收口后执行（CG 依赖边 CR → CV → CG）。
- **模板所有权**：`docs/audits/per-component/README.md` 明确声明"模板语义修订属 CG work item「checklist v2」，不得在 C\* 执行中擅自改动"——checklist v2 是本 plan 唯一合法修订点。
- **索引范式**：`docs/audits/arm-index.md`（audit-remediation 轮 M0–MG）为既有 master index 范式（Phase/Milestone Index + Package Cluster Index + P0/P1/P2 Finding Index + Audit Tool Baseline + 报告索引）；component-audit 轮尚无对等索引。
- **lessons 现状**：`docs/lessons/README.md` 内嵌 4 条 MR 派生 lessons（Audit-Remediation Lessons 节，MG 轮写入，无独立编号文件）；01 为 compiler lesson（独立编号文件）；component-audit 轮 lessons 未写入（Phase 3 新文件从 `02-` 起始编号，避免与 README 命名示例冲突）。
- **工具基线**：12 个 `check:audit-*` 脚本（`scripts/audit/*.mjs`，根 package.json scripts），C0（2026-08-02）记录基线数量（daily log），`pnpm check` 聚合其中部分；另有 `check:i18n-keys`/`check:oversized-code-files` 等独立检查。p2p3 plan 已修复 eslint i18n `words.exclude` 盲区（第 1 盲区）。
- **执行期暴露的新模式**（工具/清单升级候选输入）：bug 73 模式（单测绿但真实浏览器失败，C 阶段宿主专项 host-\*）；bug-83/CX-10 家族（schema 事件派发缺 `{ event, evaluationBindings, scope }` ctx，13+10 处派发补齐）；CX-9/CX-12（`kind:'reaction'` 字段未接线、无 ComponentHandle 注册）；CX-11（surface args 内嵌 schema body 急切求值，docs/bugs/89）；p2p3 data-slot 重复（15 文件）与 i18n 三盲区；C6.1 URL 协议校验（isSafeNavigationUrl）。
- **project-context.md**：freshness `fresh`，但 e2e 基线段仍为 C0 快照口径（9 pre-existing failed），CV full-green 后需回写。

## Goals

- `docs/audits/per-component/pc-index.md` 建成：113 张卡逐卡一条索引行（组件/包/家族/状态/发现计数），P0/P1/P2/P3 发现索引（arm 风格），CX-1..CX-12 共性模式索引，family/package 汇总表，审计工具基线表，与 plans/bugs/e2e 交叉引用。
- 工具脚本升级：执行期新模式的机械化可行性评估记录；落地的新 `check:audit-*`（或既有脚本扩展）基线输出记录；不可机械化项显式记录理由（零悬空）。
- `docs/lessons/` 新增 ≥3 条 component-audit lessons（按 README 格式：Problem Context / Decisive Evidence / Correct Decision Rule / Preventive Checklist），覆盖 bug 73 模式、事件 ctx 家族（CX-10）、surface args 求值（CX-11）等执行期最可复用模式。
- `component-audit-checklist.md` v2 修订落地（维度增补/措辞修正 + 变更记录），`per-component/README.md` 模板 v2 同步。
- roadmap CG 行 `todo → done`（closure-audit pass 后收口）；project-context.md 基线段回写（依赖 CV full-green 结果）；daily log 记录交付物。

## Non-Goals

- **不做产品代码变更**：不动 renderers/runtime/core 行为；本 plan 唯一的代码落点是 `scripts/audit/` 工具脚本与根 package.json 脚本注册（若评估落地）。
- **不重开审计**：不重跑 18 维、不重审已 closed 卡、不为新发现开新卡（新发现若出现，记录并归 successor，不静默吞掉）。
- **不处理 `pnpm check` 既有 pre-existing red**（如 `check:oversized-code-files` 14 文件 >700 行，CV Phase 1 记录在案）——治理归属 successor，非本 plan 修复面。
- **不重构 CI/管道**：不做 pipeline 级改动，工具升级限定在 scripts + package.json 脚本层面。
- **不创建新 skill 提示词**：审计方法沉淀走 checklist v2 + lessons（skills 归独立维护，同 MG 先例）。

## Scope

### In Scope

- `docs/audits/per-component/pc-index.md` 创建（含逐卡索引、发现索引、CX-n 索引、工具基线、交叉引用）。
- 新机械化审计模式评估 + 落地（`scripts/audit/*.mjs` + package.json）+ 基线输出记录 + 不可机械化项决策记录。
- `docs/lessons/` ≥3 条 component-audit lessons + README 索引条目。
- `docs/audits/component-audit-checklist.md` v2 修订 + `docs/audits/per-component/README.md` 模板 v2 同步。
- `docs/backlog/component-audit-roadmap.md` CG 行收口、`docs/context/project-context.md` 基线回写、daily log 记录、`docs/index.md` 路由核对（pc-index 是否需要登记）。

### Out Of Scope

- 产品代码行为修复（含 CR 裁决遗留的 `defer-other` successor 项）。
- 已 closed 卡的复核重开。
- `pnpm check` 既有 red 集治理。
- 新组件/新能力/新审计轮次。

## Failure Paths

> 不适用：本 plan 为文档沉淀 + 内部静态检查脚本，无外部 IO、鉴权、错误码契约。工具脚本若有输出格式/退出码问题，由 Phase 2 Exit Criteria 的运行冒烟验证兜底。

## Test Strategy

本档选择：`不适用：计划主体为文档沉淀（pc-index / lessons / checklist v2），无产品行为变更；Phase 2 若落地工具脚本，属纯内部静态检查工具（不进产品包、不进类型面），其验收即"脚本运行 + 输出断言"（写入 Phase 2 Exit Criteria），不引入 vitest 层`

- 校验方式：pc-index/lessons/checklist v2 以 repo-observable 一致性检查为验收（grep 计数对账、`check:active-doc-code-anchors` 类锚点校验、链接解析）；工具脚本以运行输出为验收。
- 全量 typecheck/build/test 不适用（无产品代码变更），按 plan guide「纯文档计划」条款从 Closure Gates 剔除；`pnpm lint` 保留为仓库级检查（其 runner 聚合 `check-active-doc-code-anchors` 等，与 Phase 1/5 验收相关；注意 eslint 配置仅匹配 `**/*.{ts,tsx}`，`scripts/audit/*.mjs` 不在 lint 覆盖内——脚本验收以运行输出 + 命中样本抽查为准）。

## Execution Plan

### Phase 1 - pc-index.md 汇总索引

Status: completed
Targets: `docs/audits/per-component/pc-index.md`、`docs/audits/per-component/*.md`（113 卡）、`docs/audits/arm-index.md`（范式）、`docs/backlog/component-audit-roadmap.md`

- Item Types: `Decision | Proof | Fix`

- [x] **Decision**：确定 pc-index 结构（参照 arm-index 范式 + component-audit 特有维度）：① Family/Work-Item 汇总表（C0–C9/CX-n → plan 文件 → 审计卡清单 → 宿主 e2e 场景）；② 逐组件卡索引表（type/包/家族/状态/发现计数 P0/P1/P2/P3/宿主场景结果）；③ 发现索引（P0/P1 全部 + 代表性 P2/P3，含 fixed 状态与修复引用）；④ CX-1..CX-12 共性模式索引（根因/影响面/修复 plan/bug 引用）；⑤ 审计工具基线表；⑥ 与 `docs/audits/cr-inventory-adjudication.md`（CR 产出）的衔接说明。
- [x] **Proof**：以 grep 机械核对计数——`docs/audits/per-component/*.md` 卡数 = 113、`状态: closed` = 113、逐家族 P0/P1/P2/P3 发现数（`- [P<n>-<seq>]` 模式按卡统计）、`docs/bugs/` 引用与 `statusPath` 等关键交叉引用存在；计数记录为 pc-index 数据源。**实测**：卡数 113 / closed 113；发现 P0 ×4 / P1 ×128 / P2 ×225 / P3 ×149（脚本对账，statistics 卡 P2 实为 2 条——编号 P2-2/P2-4 跳号，初始汇总 226 修正为 225）。
- [x] **Fix**：创建 `pc-index.md`，逐卡一行索引（含 file:line 可验证链接），发现索引与 CX-n 索引全覆盖（CX-1..CX-12 无遗漏），工具基线表引用 C0 daily log 与各 C\* plan 最新验证记录。
- [x] **Fix**：链接与锚点自检（`check:active-doc-code-anchors` 对 pc-index 引用路径零失效；手工抽查 ≥3 条 `文件:行` 引用可解析）。**实测**：anchors 308 docs 零失效；抽查 ai-feedback.tsx:41 / cards-renderer.tsx:157 / barcode-input.tsx:113 可解析。

Exit Criteria:

- [x] `pc-index.md` 存在，逐卡索引恰好 113 行（grep 对账一致），CX-1..CX-12 索引完整，P0/P1 发现零遗漏（计数与卡内 grep 一致）。**实测**：113 行 = 113 卡（脚本对账 0 mismatch）；CX 12 行；P0/P1 索引 132 条 = 132 实有发现，零缺失零多余；列合计 P0 4 / P1 128 / P2 225 / P3 149 与汇总一致。
- [x] 抽查 ≥3 条卡引用与 ≥1 条 bug 引用可解析（锚点校验零失效）。**实测**：anchors 全绿 + 3 条 file:line 抽查通过。

### Phase 2 - 工具脚本升级评估与落地

Status: completed
Targets: `scripts/audit/*.mjs`、根 `package.json`（scripts）、`docs/logs/2026/08-06.md`（基线记录）

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：逐项评估执行期新模式的可机械化性——① bug-83/CX-10 事件派发 ctx 缺失（静态可查性：`dispatch(` 调用点核对 ctx 参数形状，可行性待实证，假阳性需评估）；② CX-9/CX-12 `kind:'reaction'` 字段接线（可查：reaction 声明 vs ComponentHandle 注册对照，可行性待实证）；③ data-slot 重复（p2p3 已修 15 文件，可评估 DOM 唯一性静态检查）；④ i18n 盲区（第 1 盲区已由 p2p3 eslint 修复；第 2/3 盲区裁决归属 CR，本 plan 执行时已收口，仅登记不重复评估）；⑤ sanitize/URL 协议（C6.1 P0-1 link href `javascript:` URI → `isSafeNavigationUrl` 为手工审计发现、脚本零覆盖，评估是否新建立项）；⑥ 其他（如有）。每条产出 `mechanize | extend-existing | not-mechanizable(理由)` 裁定，记录于 plan。
  - **裁定记录（零悬空，2026-08-06 实证）**：
    1. **事件派发 ctx（bug-83/CX-10 家族）→ `not-mechanizable`**：balanced-paren 参数提取可行（`props.events.<name>?.(...)` 91 调用点全量扫描），但 `packages/flux-renderers-*` 命中 ~33 处单参/空参派发点，**逐条与 closed 卡对账 100% 落在已裁决 pass 面**——combo/input-table/transfer/picker（C3.x 卡 dim 7「空参派发，无 payload 契约声明」裁决）、upload-field 链（design §8.1 单参契约）、button/notice-bar/link/card（原生 DOM 事件转发 + normalizeActionEvent 裁决，notice-bar 卡在 CX-10 约定结晶后的 C7 仍裁定 pass）→ 无法区分"契约化单参派发"与"真缺口"，硬性门禁假阳性 100%；需 AST 语义分析（eventContracts 载荷键 × ctx 键交叉验证）→ Non-Blocking Follow-ups 已登记。**替代防护**：checklist v2 维度 7 + lessons 03 Preventive Checklist + 既有 test-first 事件 ctx 断言纪律。
    2. **reaction 接线（CX-9/CX-12）→ `not-mechanizable`**：definition→renderer 跨文件映射需启发式、接线语义（reactionsRef 捕获 + ready() + ComponentHandle 注册）需 AST；当前 9 个 reaction 键（crud loadAction、diff-view ×4、gantt ×4、calendar ×5）全部已接线，机械化收益低。**替代防护**：checklist v2 维度 7 三件套核验项 + lessons 05。
    3. **data-slot 重复 → `not-mechanizable`**：需 JSX 结构分析（根元素 vs FieldFrame 包裹关系）；行级共现仅 variant-field-view.tsx 1 个合法样本，静态误报率高。**替代防护**：checklist v2 维度 5 唯一性人工检查项。
    4. **i18n 盲区 → 登记不重复评估**：第 1 盲区（`words.exclude` CJK）p2p3 已 eslint 修复（`^(?!.*[\u4e00-\u9fa5])[\s\d\W]*$`）；第 2/3 盲区（aria-.\* 放行 / jsx-text-only 不查 JS 字面量）CR 已收口（裁决表 17 handled-by-p2p3 + Phase 4 i18n 实证清零 + CX-7 useFluxTranslation 前缀归一化根因修复）；naive rg 无法区分注释与字面量（分析报告 §8.5 裁"暂不引入"）。**替代防护**：checklist v2 维度 9 盲区记录 + rg 兜底做法。
    5. **URL/sanitize 协议 → 分拆裁定**：动态 href 面（P0-1 真实形态）不可静态追踪（数据流）→ `not-mechanizable`，运行时 `isSafeNavigationUrl` 白名单兜底；**INV-1 直连浏览器 IO → `mechanize`（新建立项）**——`packages/flux-renderers-*` 非测试文件扫描 fetch/XMLHttpRequest/axios/localStorage/sessionStorage/indexedDB/window.open/history.pushState/WebSocket/EventSource/RTCPeerConnection/navigator.sendBeacon/location 导航，**基线零命中**（字符串/注释忽略，负样本 9 模式全检出实证）→ 零/低假阳性，命中即红。
    6. **其他 → 无新增候选**（执行期其余模式均已归入 ①–⑤ 或已由 p2p3/CR 收口）。
- [x] **Fix（落地项）**：对裁定 `mechanize`/`extend-existing` 的模式，在 `scripts/audit/` 新增或扩展脚本（遵循既有 `.mjs` 风格与输出格式），并在根 package.json 注册；不新增 `pnpm check` 聚合项除非该检查达到零/低假阳性（避免 CI 噪音）。**落地**：`scripts/audit/find-renderer-browser-io.mjs`（shared.mjs 基础设施 + isCodePosition 注释/字符串忽略 + 规则表），根 package.json 注册 `check:audit-renderer-browser-io` 并加入 `pnpm check` 聚合（报告 + 命中 exit 1，对齐 oversized 先例；eslint 仅匹配 ts/tsx，脚本不在 lint 覆盖内——验收以运行输出为准）。
- [x] **Proof**：运行新/扩展脚本，记录基线输出（命中数 + 抽查命中样本真实性 ≥2 条）；对 `not-mechanizable` 项记录理由与替代防护（写入 checklist v2 / lessons）。**实测**：`pnpm check:audit-renderer-browser-io` 基线 **0 命中**（唯一近邻命中为注释，isCodePosition 正确忽略）；负样本 9 模式（fetch/localStorage/WebSocket/location.href/history.pushState/window.open/indexedDB/sendBeacon/XMLHttpRequest）全检出 + 注释忽略实证；基线记录写入 `docs/logs/2026/08-06.md` CG 条目与 pc-index 工具基线表。not-mechanizable 替代防护已落入 checklist v2（维度 5/7/9/16）与 lessons 02–05。
- [x] **Fix**：`pnpm lint` 全仓通过（含新脚本落地后的 repo-level runner 完整性；脚本本身不在 eslint 覆盖内，验收以运行输出为准）；`pnpm check` 聚合项（如有新增）无新增 red。**实测**：`pnpm lint` 32/32 全绿；新脚本零命中绿色，`pnpm check` 聚合仅在既有 pre-existing red 处终止（oversized 16 文件 / workspace-manifest-deps 5 ERROR，CV 基线在案），**零新增 red**。

Exit Criteria:

- [x] 裁定记录完整（每模式一行裁定 + 理由），零悬空；落地脚本运行输出与基线记录一致（抽查命中样本真实）。**实测**：6 项裁定全记录（上）；脚本 0 命中 + 负样本 9/9 检出 + 注释忽略，与 daily log 基线一致。
- [x] `pnpm lint` 绿；新增脚本不引入 `pnpm check` 新增 red（或显式记录为 watch-only）。**实测**：lint 32/32；新脚本命中即红语义（当前零命中），非 watch-only——`pnpm check` 聚合无新增 red。

### Phase 3 - lessons 写入（≥3 条）

Status: completed
Targets: `docs/lessons/`（新增编号文件 + README 索引）

- Item Types: `Fix`（文档）

- [x] 候选 lessons（≥3 条落地，从执行期证据最强的模式选取）：① **bug 73 模式**——"单测绿但真实浏览器失败"（宿主专项 host-\* 机制与 DOM programmatic 断言纪律）；② **bug-83/CX-10 事件 ctx 家族**——schema 事件派发必须携带 `{ event, evaluationBindings, scope }`，否则 action args 模板不可解析（13+10 处补齐实证）；③ **CX-11 surface args 急切求值**——内嵌 schema body 会被 compilePayload 模板化，`__nopPreserveLiteral` envelope 契约（docs/bugs/89）；④ **CX-9/CX-12 reaction 接线**——`kind:'reaction'` 字段必须接线 + ComponentHandle 注册；⑤ p2p3 data-slot 重复 / i18n lint 盲区（第 1 盲区正则修复为 eslint 配置防 CJK 漏检的样板）。**落地 4 条**：`02-unit-green-but-real-browser-broken-bug-73-pattern.md`（①）、`03-schema-event-dispatch-requires-event-evaluation-bindings-scope-ctx.md`（②）、`04-surface-args-embedded-schema-body-eager-evaluation-cx-11.md`（③）、`05-reaction-field-wiring-requires-ready-and-component-handle.md`（④）；⑤ 的 i18n 盲区细节已并入 lessons 03 Related Files 与 checklist v2 维度 9 记录（不单列文件）。
- [x] 每条按 `docs/lessons/README.md` 推荐章节撰写（Problem Context / Initial Judgment / Decisive Evidence / Correct Decision Rule / Preventive Checklist / Related Files），文件命名 `0N-<slug>.md` 递增。
- [x] README 索引节追加新条目（含简短摘要）。**实测**：Index 节 5 条（01 + 02–05）+ 新增「Component-Audit Lessons（CG）」摘要节（含 02–05 各一句摘要）。

Exit Criteria:

- [x] `docs/lessons/` 新增 ≥3 条文件，均含 Correct Decision Rule + Preventive Checklist 节；README 索引含全部新条目。**实测**：4 条新文件（02–05）均含 6 节全结构；README Index + CG 摘要节同步。

### Phase 4 - checklist v2 修订

Status: completed
Targets: `docs/audits/component-audit-checklist.md`、`docs/audits/per-component/README.md`

- Item Types: `Decision | Fix`

- [x] **Decision**：汇总 v1 执行期短板（以执行证据为准）：维度 7（事件与 action 契约）增补"派发必须携带 `{ event, evaluationBindings, scope }` ctx + 模板键可解析验证"；维度 5（DOM 契约）增补 data-slot 唯一性（FieldFrame 包裹 vs 独立）；维度 12（组合宿主）将 bug 73 专项检查从"每族新增"固化为"每卡必检"语言；维度 9（i18n）记录 eslint 盲区与 `rg` 兜底做法；维度 16（测试质量）增补"事件 ctx/模板解析"断言要求；其余维度按执行经验微调（措辞/示例），不做维度编号重构（避免历史卡引用失效）。**落地**：维度 5 增补 data-slot 唯一性裁决句；维度 7 增补 ctx 第二参 + 豁免留痕规则 + reaction 三件套接线 + useImperativeHandle 否定；维度 9 增补三盲区记录 + rg 兜底命令；维度 12 改"每卡必检"语言 + bug 73 专项检查要素；维度 16 增补双参契约断言 + 宿主模板键真机解析；维度 18 增补 `check:audit-renderer-browser-io` 引用；裁决表/自动修复纪律仅措辞未动语义。
- [x] **Fix**：修订 `component-audit-checklist.md` 为 v2（顶部标注版本/修订日期/变更摘要节），P0/P1/P2/P3 裁决表与自动修复纪律保持 v1 语义不变（仅措辞）。**落地**：标题标 v2 + 头部版本声明 + 「变更摘要（v1 → v2）」表（5 维变更 + 依据），维度编号未重构。
- [x] **Fix**：`docs/audits/per-component/README.md` 模板 v2 同步（更新模板语义修订声明指向 v2；历史卡不回写，只更新模板本体）。**落地**：标题「审计卡模板 v2（修订于 CG，2026-08-06）」+ 声明改为"checklist v2 落盘副本、修订仅经 CG work item、v1→v2 变更见 checklist 变更摘要节"；模板本体未动。
- [x] **Fix**：`docs/backlog/component-audit-roadmap.md` 若引用 checklist v1 模板则同步措辞（只改引用口径，不改状态区）。**核对**：roadmap 仅以 `component-audit-checklist.md`（无版本限定）引用，无 checklist v1 措辞 → 无需同步（记录在案）。

Exit Criteria:

- [x] `component-audit-checklist.md` 标注 v2 + 变更摘要节存在；README 模板 v2 与 checklist 语义一致；历史审计卡未回写（确认 git diff 无 per-component/\*.md 改动）。**实测**：v2 标注 + 变更摘要节落地；README 模板 v2 与 checklist 变更摘要一致；git diff 确认 per-component/ 仅 README.md（模板本体）与新增 pc-index.md，113 张审计卡零改动。

### Phase 5 - 收口与 roadmap

Status: completed
Targets: `docs/logs/2026/08-06.md`、`docs/backlog/component-audit-roadmap.md`（CG 行）、`docs/context/project-context.md`、`docs/index.md`

- Item Types: `Fix | Follow-up`

- [x] **Fix**：daily log 记录 CG 交付物（pc-index/工具基线/lessons/checklist v2 + 各验证计数）。**落地**：`docs/logs/2026/08-06.md` 顶部新增 CG 执行完毕条目（Phase 1–5 交付 + 验证计数 + 裁定矩阵摘要 + closure-audit 待独立执行注记）。
- [x] **Fix**：`project-context.md` 基线段回写（以 CV full-green 实测为准：e2e 计数、组件审计 mission 状态；freshness 保持/确认 `fresh`，按 AI autonomy 政策——回写仅限 CV 已实测事实）。**落地**：基线段改为 CV full-green 实测（typecheck/build/lint 32/32、test 59/59（10,397 passed/0 failed）、e2e 1054 passed/43 skipped/6 watch-only 归因清单、component-lab 334/1/2、smoke 111/111、host-surfaces 42/42）+ component-audit mission 全 done 状态 + pnpm check pre-existing red 集；freshness 保持 `fresh`。
- [x] **Fix**：`docs/index.md` 路由核对——pc-index 若应登记则追加一行（`docs/audits/` 区），否则记录"无需登记"。**落地**：登记（`docs/audits/` 目录角色行追加 arm-index + per-component/pc-index + 逐组件卡 + checklist v2 说明）。
- [x] **Follow-up**：roadmap CG 行 `todo → done`（由独立 closure-audit pass 后收口动作完成，本 plan 不自行勾选 audit gate）。**落地**：roadmap CG 行 `planned → done` + 执行证据注记（2026-08-06 执行 run，closure-audit 由独立 fresh session CLOSURE_VERIFY 收口）。

Exit Criteria:

- [x] daily log CG 条目存在且数据与实测一致；project-context.md 基线段与 CV full-green 结果一致；docs/index.md 路由核对记录在案；roadmap CG 行已 `done`。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_02c89f98dfferqzlqgSzg7E6zl`（独立 fresh session plan review，2026-08-06）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已全部处理——①Phase 2 ⑤ URL/sanitize 前提纠正（C6.1 P0-1 为手工审计发现、脚本零覆盖，改为"评估是否新建立项"）；②`pnpm lint` 覆盖范围澄清（eslint 仅匹配 ts/tsx，`scripts/audit/*.mjs` 不在覆盖内，脚本验收以运行输出 + 样本抽查为准，lint 作为 repo-level 检查保留）；③i18n 第 2/3 盲区裁决归属 CR（执行时已收口），措辞改为"仅登记不重复评估"；④oversized-code-files 延期条目补充与 CV"归 CR/CG 治理"记录的衔接精化（治理归属独立 successor）；⑤lessons 基线措辞修正（MR lessons 为 README 内嵌 4 条、无独立编号文件），Phase 3 新文件从 `02-` 起始编号。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。本 plan 为纯文档 + 内部工具脚本计划（无产品代码变更），按 guide「纯文档计划」条款剔除 typecheck/build/test 门禁；`pnpm lint` 保留（Phase 2 有脚本/配置改动时须绿）。

- [x] `docs/audits/per-component/pc-index.md` 存在且覆盖全部 113 卡（grep 对账一致）+ CX-1..CX-12 索引完整
- [x] 工具脚本升级裁定记录完整（零悬空）；落地脚本运行输出与基线一致，`pnpm lint` 绿
- [x] `docs/lessons/` ≥3 条 component-audit lessons + README 索引更新
- [x] `component-audit-checklist.md` v2 + `per-component/README.md` 模板 v2 落地（历史卡未回写）
- [x] daily log CG 记录 + project-context.md 基线段与 CV full-green 一致 + docs/index.md 路由核对
- [x] roadmap CG 行 `todo → done`
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项（发现的 confirmed live defect 必须显式归 successor，不得藏在 non-blocking 区）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（由独立 fresh session CLOSURE_VERIFY 于 2026-08-06 勾选，证据见 Closure Audit Evidence）
- [x] `pnpm lint`（若 Phase 2 落地脚本/配置改动）——32/32 全绿

## Deferred But Adjudicated

### `pnpm check` 既有 pre-existing red（check:oversized-code-files 14 文件等）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 属治理债而非本 mission 引入的缺陷；CV Phase 1 已记录对照基线并标注"归 CR/CG 治理"——本条目将其精化：治理归属独立 successor（非 CG 本 plan 范围，CG 只做 guard 沉淀），与 CV 记录不矛盾；与 component-audit 结果面无耦合。
- Successor Required: `yes`
- Successor Path: 未来治理/优化 plan（非 component-audit 路线；本 plan Non-Blocking Follow-ups 登记）

### 无法机械化检测的模式（事件派发 ctx、reaction 接线等的静态检测盲区，若裁定 not-mechanizable）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 经实证裁定当前 grep/AST 手段假阳性率不可接受（记录于 Phase 2 决策），替代防护已落入 checklist v2 维度与 lessons 的 Preventive Checklist；不构成 supported baseline 缺陷。
- Successor Required: `no`（checklist v2 人工检查项已覆盖；若未来工具能力提升可再评估）

## Non-Blocking Follow-ups

- `check:oversized-code-files` 14 文件治理（>700 行）登记为独立治理 successor，不并入本 plan。
- pc-index 未来可扩展为脚本生成（若卡格式再冻结一轮）；本轮手写 + grep 对账即可。
- 事件派发 ctx / reaction 接线的静态检测工具，待 AST 工具链能力提升后再评估。

## Closure

Status Note: 执行完成（2026-08-06 执行 run：5 Phase 全 completed；pc-index 113 卡对账一致 + P0/P1 零遗漏 + CX-1..CX-12 完整；工具裁定 6 项零悬空 + `check:audit-renderer-browser-io` 落地（基线零命中，负样本 9/9 检出）；lessons 02–05 四条 + README 索引；checklist v2 + 模板 v2（历史卡未回写）；project-context/docs-index/daily log 收口；roadmap CG 行 done）。全量验证：`pnpm lint` 32/32 绿、`pnpm test` 59/59 task 绿、`pnpm typecheck` 32/32 绿、`check:active-doc-code-anchors` 零失效（按 guide「纯文档计划」条款剔除 build 门禁；无产品代码变更）。

Closure Audit Evidence: 独立 fresh session（mission-driver CLOSURE_VERIFY，2026-08-06）closure-audit pass：① plan-check 严格模式由 1 unchecked → 0 unchecked（仅余 audit gate 由本审计勾选）；② live repo 核对——pc-index.md 逐卡索引 113 行 = 113 卡、`状态: closed` 113（README/pc-index 自身排除后 grep 对账）、CX-1..CX-12 索引 12 行完整、P0/P1 索引全量；`scripts/audit/find-renderer-browser-io.mjs` 真实实现（9 规则 + isCodePosition）已注册 package.json 并聚合 `pnpm check`，运行基线零命中 exit 0；lessons 02–05 均含 Correct Decision Rule/Preventive Checklist/Related Files（每文件 3/3 节）；checklist v2 头部版本 + 变更摘要节 + README 模板 v2 落地；daily log / project-context（CV full-green 1054 passed）/ docs/index.md 路由 / roadmap CG 行 `done` 全部一致；③ git diff 确认 per-component/ 仅 README.md（模板本体）与新 pc-index.md，113 张审计卡零改动；④ 5 Phase Status 与 Exit Criteria 全 `[x]`、无静默降级（Deferred 分类诚实：out-of-scope improvement + watch-only residual，均附 Why Not Blocking Closure）。

Follow-up:

- `check:oversized-code-files` 16 文件治理（>700 行，CV 实测 2026-08-06）登记为独立治理 successor，不并入本 plan。
- pc-index 未来可扩展为脚本生成（若卡格式再冻结一轮）；本轮手写 + grep 对账即可。
- 事件派发 ctx / reaction 接线的静态检测工具，待 AST 工具链能力提升后再评估（Phase 2 已实证裁定 not-mechanizable 并记录命中样本分类）。
