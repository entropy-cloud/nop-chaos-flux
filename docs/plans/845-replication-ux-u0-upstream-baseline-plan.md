# 845 复刻页 UX 保真 U0：上游基准提取与方法定标

> Plan Status: completed
> Last Reviewed: 2026-11-04
> Source: docs/backlog/replication-ux-fidelity-roadmap.md（work item U0）
> Related: docs/backlog/business-page-replication-roadmap.md（二十一页来源，已收口）

## Purpose

为 replication-ux-fidelity roadmap 的 U1-U9 提供执行基准：上游商城移动端样式/交互基准卡落档、四份审计 skill 的角色分工定标、mobile 族三页对标口径裁决（S1↔goods-detail 逐页对标、W1/M3 移动形态组件级基准）、U1-U5 分组 plan 拆分裁决落档。

## Current Baseline

- 二十一页复刻页均在 `apps/playground/src/complex-pages/`（schema JSON 18 页 + host override 3 页 mobile：W1=`wms-pda-receiving`、M3=`mes-andon-material`、S1=`mall-sku-picker`）；页面级 CSS 落点 `replication.css`（repl-\* 类）。
- 上游素材实证存在：mall mobile 12 flux.yaml（`~/app/nop-app-mall-wt/nop-app-mall-master/app-mall-web/src/main/resources/_vfs/app/mall/mobile/`）；next 壳 `~/app/nop-chaos-next-wt/nop-chaos-next-master/apps/main/src/styles/index.css` L203 起 `.mall-*` 页面类 + V2 `--mall-*` 设计令牌（L992 起，含 dark 覆写）；TSX 对照在 flux 仓 git 历史（`dc4d8bf97` 退役提交，`dc4d8bf97^` 可读 `apps/mall-mobile` 全部源码）。
- 审计方法沉淀在案：`docs/skills/visual-page-quality-inspection-prompt.md`（页面级主方法，三步法 + A-H 评分卡）、`ux-design-pattern-audit-prompt.md`、`complex-component-display-operability-audit-prompt.md`、`interaction-state-audit-prompt.md`。
- R2 固化探针在仓：`tests/e2e/helpers/`（visual-contrast / form-actions-alignment / overlay-actions-alignment / interaction-state-probes + visual-assert / visual-theme）。
- 已知 UX 预警在册（roadmap §6）：I1 双按钮对、I2 趋势量纲、W3 透视列序、V3 围栏可视性、K2 横滚裁切、replication.css 深色主题未验证（P2 MIN-5）、S1 占位色块（未入册，U1 取证）。
- gap：上述上游素材从未被提取整理为 flux 仓内基准文档；21 页从未与上游做过并排比对；四 skill 在复刻页族的分工未定标。

## Goals

- `docs/analysis/replication-ux/upstream-mall-mobile-baseline.md` 落档：①mobile 族逐页对标卡 ≥3 页（S1↔goods-detail 逐区块对标、W1/M3 移动形态组件级基准卡）；②壳 `.mall-*`/`--mall-*` 令牌表（浅/深双套）+ flux 侧移植裁决（令牌移植 vs 等价类）；③TSX 对照实现要点速查；④四 skill 分工表；⑤21 页分组 plan 拆分裁决与依赖图。
- 方法口径定标：三步法 + A-H 评分卡 + 双主题 + 交互中间态在复刻页族的应用细则（含 desktop 族对齐 `replication.css` 令牌基线的口径）。

## Non-Goals

- 不执行任何页面修复（U1-U5 的事）。
- 不改上游 nop-app-mall / nop-chaos-next 仓任何文件。
- 不改 flux 渲染器、playground 页面代码、e2e 断言（U0 纯基准与文档）。
- 新 renderer type 缺口只登记不立项。

## Scope

### In Scope

- 新建 `docs/analysis/replication-ux/upstream-mall-mobile-baseline.md`（含上述五块交付）。
- roadmap §3 U0 状态回写（`todo`→`done` 需 closure audit；本 plan 内先推进执行）。
- daily log 收口记录。

### Out Of Scope

- U1-U5 页面修复 plan 的起草（仅落"拆分裁决"章节，plan 文件本身后续逐个起）。
- `replication.css` 任何修改。
- 上游仓库修改。

## Test Strategy

不适用：纯文档计划，无代码/行为变更（模板允许删除全量验证 Gates）。

## Execution Plan

### Phase 1 - 上游素材提取与基准卡撰写

Status: completed
Targets: `docs/analysis/replication-ux/upstream-mall-mobile-baseline.md`

- Item Types: `Decision | Proof`

- [x] 提取 mall 12 flux.yaml 逐页结构（顶层容器/区块清单/移动交互组件用法/内联色值），重点深挖 home/goods-detail/cart 三页
- [x] 提取 next 壳 `.mall-*` 页面类完整定义与 `--mall-*` V2 令牌表（浅/深双套）
- [x] 从 git 历史 `dc4d8bf97^` 提取 TSX 对照实现要点（页面骨架/SKU 求交/画廊/倒计时/价格三段式/吸底栏/数量钳制）
- [x] 撰写 S1↔goods-detail 逐页对标卡（逐区块：上游形态 ↔ flux 复刻页现状锚点 ↔ 对齐判据）
- [x] 撰写 W1/M3 移动形态组件级基准卡（导航/吸底栏/触控目标 ≥44px/品牌令牌/列表密度五轴，roadmap §4 判据 2 裁决固化）
- [x] 令牌表 + flux 侧移植裁决章节（replication.css 令牌移植口径，供 U1-U5/U6 引用）
- [x] TSX 对照要点速查章节

Exit Criteria:

- [x] baseline 文档落档且五块交付齐全；对标卡中每个"上游形态"条目有上游文件/类名/色值出处；"flux 现状"条目有 flux 仓文件锚点

### Phase 2 - 方法定标与拆分裁决

Status: completed
Targets: 同上文档（方法章）+ roadmap §3 回写

- Item Types: `Decision`

- [x] 四 skill 分工表落档（页面级三步法主方法 / 源码 UX 模式补充 / 组件级可操作深挖 / 交互态四态审计——各自触发时机与产出物）
- [x] 评分卡应用细则（A-H 各维在复刻页族的判据基线：B3/D 维以 `.mall-*` 令牌表为基准；desktop 族对齐 `replication.css` 令牌基线口径）
- [x] U1-U5 分组拆分裁决落档（roadmap 既定分组 5/5/5/3 确认 + 依赖图引用 + 字母后缀拆批预授权引用）
- [x] 21 页程序化枚举清单固化进文档（供 U7 对账直接引用）

Exit Criteria:

- [x] 方法章 + 拆分裁决章 + 21 页清单落档；roadmap §3 U0 行状态在 closure audit 后回写（§6 勘误附注已就地落档）

## Draft Review Record

- Reviewer / Agent: agent_3293e4e8（fresh session）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed: F-1（21 页构成修正：host override 实为 4 页——W1/M3/S1 mobile + K1 desktop host，schema-only 17 页；roadmap §6 原句就地勘误附注）、F-2（baseline 文档锚点写全 `complex-pages/replication/` 子目录路径）、F-3（仓外 worktree 不可达时 Failure Path：以本 plan 引用记录的提取结果为兜底素材，标注来源降级）——均已在执行中消化

## Closure Gates

> 纯文档计划：`pnpm test`/`lint`/`typecheck`/`build` 按 guide 删除。为保守起见保留 `pnpm check`（防 docs 体积等静态门禁破线）。

- [x] baseline 文档五块交付齐全且出处可核（上游类名/色值/git 历史锚点逐一对照——closure audit 抽核 10+ 条全过）
- [x] roadmap §3 U0 行状态回写为 `done`（closure audit 通过后同 commit）
- [x] daily log 收口记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm check`（docs 40KB 限制等静态门禁零新增命中）

## Deferred But Adjudicated

（无——本 plan 无代码变更，无 deferred 候选）

## Non-Blocking Follow-ups

- U1-U5 各 execution plan 起草时直接引用 baseline 文档；如执行中发现基准卡缺维度，按字母后缀拆批预授权滚动补卡。

## Closure

Status Note: 纯文档计划，两个 Phase completed、Exit Criteria 全勾；closure audit（独立 fresh 子代理 agent_0b8f5e5a）verdict approved（零 Blocker/Major，1 Minor 不阻塞）；roadmap §3 U0 → done 同 commit 回写。

Closure Audit Evidence:

- Auditor / Agent: agent_0b8f5e5a（fresh session）
- Evidence: 抽核 10+ 条上游声称逐一对 live repo / 上游仓 / git 历史核实（令牌表逐值、.mall-\* 结构类逐字符、goods-detail 529 行、秒杀伪进度表达式原文命中、dc4d8bf97^ 89 文件、4 host override 与 registry 吻合）；U0 exit 口径六项逐项成立；pnpm check exit 0 实跑（200 passed/2 skipped）；1 Minor（--mall-success/gold dark 列未逐一实抽，低风险，U1 消费时按 §8 勘误流程处理）。

Follow-up:

- no remaining plan-owned work（U1 起由后续 plan 承载）
