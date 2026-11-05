# 856 商城域对照迭代批：独立参照实现并排对比后的差距收口

> Plan Status: completed（closure audit approved 2026-11-06；用户指令：独立子 agent 用开放技术实现最仿真对照页 → 并排对比 → 收口差距；plan 855 同域延续，对照页 `_tmp/pdd-reference/index.html`）
> Last Reviewed: 2026-11-06
> Source: 对照基准 `_tmp/pdd-reference/index.html`（独立子代理纯 HTML/CSS 实现的拼多多/京东级商详页）vs S1 实机并排截图（2026-11-05）

## Purpose

以独立实现的对照页为镜，收口 S1 与拼多多/京东级形态的九项差距。

## Current Baseline（并排对比差距清单，2026-11-05 实测）

| #   | 差距                  | 对照页形态                                  | S1 现状          |
| --- | --------------------- | ------------------------------------------- | ---------------- |
| G1  | 主图质感              | 金属中框+深色机身+屏幕反光+三摄+投影        | 渐变底+扁平剪影  |
| G2  | 商品标题卡缺失        | 商品名+红字卖点+已售件数                    | 无               |
| G3  | 价格三段式+自营标签   | ¥小/4999 特大红/.00 小 + 自营 + 已售 2.3万+ | 单号 1.35rem     |
| G4  | 促销胶囊行缺失        | 限时直降/满减/赠运费险                      | 无               |
| G5  | 领券票据条缺失        | 圆孔缺口券条                                | 无               |
| G6  | 规格芯片无色点        | 颜色芯片前色点圆                            | 纯文本芯片       |
| G7  | 已选回显行缺失        | "已选：曜石黑 128G ×1"                      | 无               |
| G8  | 吸底栏无图标列+等宽分 | 店铺/客服/收藏列 + 55/45 双胶囊             | 两等宽钮         |
| G9  | 首屏密度偏稀          | 画廊→价格卡→标题卡→规格 密集                | banner→画廊→面板 |

## Goals

- G1-G9 逐项落地（mock SVG 移植对照页手机绘制、schema 增标题卡/促销行/已选回显、CSS 三段式价格/色点/图标列/密度）。
- e2e 零弱化：新增区块不带断言依赖；既有 testid/值语义保留。
- S1 focused + 全量回归绿；并排复截图对比达标。

## Non-Goals

- V3 围栏形态、真实摄影素材（既有登记不变）；其它域页面。

## Test Strategy

必须自动化：S1 focused + 21 页全量 `--retries=0`；观感以并排截图评审。

## Execution Plan

### Phase 1 - 差距收口

Status: completed
Targets: mall-sku-picker.json / replication.css / mock-backend-repl-mall.ts / mall-sku-picker-host.tsx / replication-mall-sku-picker.spec.ts

- Item Types: `Fix`

- [x] G1 mock 手机 SVG 移植对照页绘制（金属中框/反光/三摄/投影），kind1/2 同步增强
- [x] G2/G4/G5 标题卡+促销胶囊行+领券条 schema 落地（落点改判：banner 与画廊之间，见执行中裁决①）
- [x] G3 价格三段式（`testid`/`repl-price` 落在三段式 flex 容器上，见执行中裁决②；小数段由数据派生）
- [x] G6/G7 色点 CSS + 已选回显行（颜色 + 容量双回显）
- [x] G8/G9 吸底栏图标列（icon/text 非 focusable 装饰）+ 55/45 分宽（`auto 11fr 9fr`）+ banner 密度收紧
- [x] G10（执行中新增）页面 body 全幅 + 面板内容内边距（见执行中裁决③）

Exit Criteria:

- [x] 十项差距逐项落地；S1 focused 12/12 绿；并排复截图差距清零或登记（自营标签/搜索浮层/缩略条登记于 Deferred）

执行中裁决（2026-11-06，接续 11-05 WIP 的复核会话）：

① **标题卡落点**：放在促销 banner 与画廊之间而非"画廊与面板之间"——SKU 面板为底部浮层，画廊之后已无稳定的文档流位置；首屏密度预算（画廊 280 + 无限滚动哨兵首载）只允许标题卡位于滚动区之前。
② **价格断言面**：`mall-sku-picker-price` 与 `repl-price` 落在三段式 flex 容器上（S1 断言 `toContainText('¥3799')` 对容器文本 `¥3799.00` 成立）；WIP 中 `.00` 为硬编码，非整数价会渲染成 `3799.5.00`——已改为 `INT(...)` 整数段 + `MOD(ROUND(p*100),100)` 补零小数段。
③ **复核会话发现的 WIP 实现缺陷（已修）**：(a) G6 色点选择器要求 `.repl-mall-chips` 与 `data-testid` 同元素，实际 testid 在外层 field label 上 → `::before` content=none，改为后代选择器；(b) G8 grid `columns: "1fr 1fr"` 放 3 个 item 折成两行（高 109px），与 `.repl-mall-panel-lift { bottom: 64px }` 冲突、面板压栏 → 改 `auto 11fr 9fr` 单行（61px）；(c) page-body 默认 16px 内边距使内容内缩而浮层面板全幅定位（面板文字贴边、吸底栏下 16px 空隙）→ 页面 `bodyClassName: "p-0"` 全幅（对照页形态）+ 面板内容 `padding: 0 12px 12px`；(d) G5 只做成一枚胶囊、`.repl-mall-coupon` 为死规则 → 改为真实券条行；(e) G7 只回显颜色 → 颜色 + 容量；(f) `mallSkuImage` 遗留 `hue`/`hue2` 死变量致 playground lint 红 → 删除；(g) 死规则 `.repl-sticky-footer [data-slot='button-group-select-options']`（吸底栏内无该 slot）→ 删除；(h) JSON 两处缩进破损 → prettier 归一。
④ **S1 画布断言改判**：`375×667 → 375×780`（spec 内带裁决注释）；固定手机框完整呈现的语义不变，仅高度档位升级以容纳标题卡与首载哨兵——属有意的断言值更新，非弱化。

### Phase 2 - 回归与收口

Status: completed

- Item Types: `Proof`

- [x] 21 页全量 `--retries=0` 绿（209/209，修复前后各一轮）；门禁过（playground typecheck/lint 0、vitest 58 files/569、`pnpm check` exit 0）
- [x] daily log（`docs/logs/2026/11-06.md`）；closure audit（独立子 agent）；同 commit

Exit Criteria:

- [x] 全量绿 + closure audit approved + 同 commit

## Failure Paths

| 场景              | 触发           | 行为                | 可重试 | 用户可见表现 |
| ----------------- | -------------- | ------------------- | ------ | ------------ |
| visual-breaks-e2e | 新区块破坏断言 | 断言为准回退/调实现 | 是     | 全绿为最终态 |

## Draft Review Record

- Reviewer / Agent: 用户指令直接立项（对照迭代）；差距清单为用户可见事实，非审计 findings
- Verdict: `active`（用户"继续"指令 + 855 拆批预授权沿用）
- Rounds: —
- Findings addressed: —
- 勘注（2026-11-06）：本 plan 由用户指令直接立项、未经独立 draft review；guide 的 Plan Review Rule 对此无豁免条款——本次由独立 closure audit 回溯覆盖 draft review 的实质检查面（声称-实况对账、引用准确性、landing 核验）。

## Closure Gates

- [x] Phase 1-2 Exit Criteria 全勾
- [x] 21 页 spec 全量绿；门禁零新增
- [x] daily log 收口记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

### 自营标签 / 顶部搜索浮层 / 画廊缩略条（对照页有、S1 无）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 对照页形态提及（G3 行含"+ 自营"）但未列为独立交付项；顶部搜索浮层/缩略条不在 G1–G9 清单内；纯装饰面，无交互语义缺口；S1 的价格/画廊/搜索交互契约已由既有 e2e 覆盖
- Successor Required: `no`
- Successor Path: —

### 真实摄影素材

- Classification: `out-of-scope improvement`
- Why Not Blocking: 无离线资产；G1 已达"非占位感"参照形态
- Successor Required: `yes`
- Successor Path: 资产管线决策后另立 plan

## Closure

Status Note: G1–G10 全部落地；复核会话发现并修复 WIP 中 8 处实现缺陷（色点选择器失配、吸底栏折行压面板、page-body 内缩、价格 `.00` 硬编码、券条/回显未完成、lint 红、死规则）；S1 12/12、21 页 209/209（`--retries=0`）、playground typecheck/lint/vitest 569、`pnpm check` exit 0。closure audit Minor 已随收口处理：`--tall` 修饰类改为 `data-canvas="tall"` 属性（styling contract：状态用 data-\* 而非修饰类）、头注释缩进、Deferred 理由措辞、Draft Review Record 勘注。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子代理（closure audit，2026-11-06）
- Evidence: verdict **approved**（0 Blocker / 0 Major / 5 Minor）；独立复跑 S1 12/12、21 页 209/209、playground lint/typecheck 0、vitest 569/569、`pnpm check` exit 0；G1–G10 与裁决③(a)–(h) 逐条打开文件核验、价格派生公式手算（3799 / 3799.5 / 99.05）、11 条新增 CSS 规则全部在用、e2e 零弱化（667→780 带裁决注释）。记录见 `docs/logs/2026/11-06.md`。

Follow-up:

- no remaining plan-owned work（Deferred 两条均为 out-of-scope improvement）。
