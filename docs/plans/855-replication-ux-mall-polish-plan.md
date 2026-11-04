# 855 商城域视觉 polish 批（用户指令：修复所有问题——对标拼多多级观感）

> Plan Status: active（用户 2026-11-04 明确指令"修复所有问题"直接立项；roadmap §8 字母后缀拆批预授权沿用，U9 开放审计 + 用户复查指认的 cosmetics 清单为 findings 来源）
> Last Reviewed: 2026-11-04
> Source: U9 开放审计（docs/audits/replication-ux-u9-open-audit.md m-9-3/m-9-4）+ U8 深审（m-1-2 progress 蓝条/m-1-3 !important 债）+ 用户实机复查指认（规格选择器纯文本/面板开发术语/CTA 观感/素材占位感/首屏密度）
> Related: 846（U1）、849（U4）、852（U6）、854（U9）

## Purpose

商城域（S1 优先）+ 已登记 cosmetics residual 的观感收敛：把"结构性达标"推进到"消费级观感"。

## Current Baseline

- U0-U9 全 done，21 页 spec 209/209 绿。S1 面板现状：规格为 picker-view 双轮（纯文本行观感）、caption 带开发术语（"求交定位 SKU/锚点"）、"SKU："裸键值行、秒杀横幅 progress 默认蓝、场次 pill 蓝色选中态偏离品牌色、商品图为渐变+几何剪影占位；M1/S2 stat-tile 面板 title 与 tile label 双写；`.repl-mall-btn-*` !important 债在册。
- 断言依赖：stock-badge 含"缺货/有货"、sku 文本含 `sku-\d{3}`、seckill-progress testid 可见、场次徽标文案跟随——均以 testid/值语义断言，非文案字面（V3 spec 注释已勘误）。

## Goals

- S1：规格选择器芯片化（button-group-select 双组，wheel→chip 交互裁决）、面板文案产品化（去术语）、SKU 行产品化、progress/场次品牌化、商品占位素材升级（分层器形剪影+光影）、首屏密度收紧。
- M1/S2：stat-tile 面板 title 双写消除（沿用 u2 F-C3-2 先例：面板 chrome 空 title 不渲染）。
- `.repl-mall-btn-*` !important 债消除（提高特异性替代）。
- 21 页 replication spec 全量 `--retries=0` 回归绿。

## Non-Goals

- 真实商品摄影素材（无离线资产，占位升级为高质感程序化器形图，真实素材接入登记不立项）。
- V3 围栏实心圆形态（region 渲染样式为渲染器级，维持已登记 residual）。
- 其它域页面；packages/ui。

## Scope

### In Scope

- `mall-sku-picker.json`（chips/文案）、`replication.css`（chips/progress/场次/按钮债）、`mock-backend-repl-mall.ts`（素材）、`page-data.ts`/`page-data-mes.ts`（S2/M1 title 双写）、`replication-mall-sku-picker.spec.ts`（wheel→chip 交互裁决）。

### Out Of Scope

- packages/\*（V3 形态维持登记）、其它域、真实图床接入。

## Test Strategy

必须自动化：S1 spec focused `--retries=0` + 21 页全量回归；断言调整仅限 wheel→chip 物理前置与文案解析同步（语义不弱化，逐条裁决注）。

## Execution Plan

### Phase 1 - S1 polish + M1/S2 title 双写

Status: in progress
Targets: 上述 In Scope 文件

- Item Types: `Fix`

- [x] S1 schema：caption"选择规格"、双 picker-view → 双 button-group-select 芯片（testid/值绑定/skuId 派生保留）、SKU 行产品化
- [x] replication.css：chips 芯片态（选中品牌渐变描边）、progress 金色/白色轨道、场次 pill 金色选中、按钮 !important → 高特异性选择器
- [x] mock 素材升级：按 seed 分类型器形（手机/笔记本/耳机）+ 光影层次
- [x] M1/S2 stat-tile title 双写消除
- [x] S1 spec：wheel→chip 交互裁决（clickSpecChip helper + 解析同步 sku-\d{3} 正则；语义不弱化裁决注）

Exit Criteria:

- [x] S1 focused `--retries=0` 绿（12/12，closure audit 独立实跑复核）+ 实机截图复查（chips/文案/CTA/progress/素材逐项消失）

### Phase 2 - 全量回归与收口

Status: completed

- Item Types: `Proof`

- [x] 21 页 replication spec 全量 `--retries=0` 绿；typecheck/lint/vitest/check
- [x] daily log；closure audit（独立子 agent round-1 issues〔3 Major〕→ 修复 → round-2 approved）；同 commit

Exit Criteria:

- [x] 全量绿 + closure audit approved + 同 commit

## Failure Paths

| 场景                      | 触发                                               | 行为                                                      | 可重试 | 用户可见表现   |
| ------------------------- | -------------------------------------------------- | --------------------------------------------------------- | ------ | -------------- |
| chip-onchange-unsupported | button-group-select schema onChange 不派发 actions | 回退 name 绑定 + skuId 改读时派生表达式（面板展示已同源） | 是     | 交互面语义不变 |
| visual-breaks-e2e         | 视觉修复破坏断言                                   | 断言为准回退/调实现                                       | 是     | 全绿为最终态   |

## Closure Gates

- [x] Phase 1-2 Exit Criteria 全勾
- [x] 21 页 spec 全量绿；门禁零新增
- [x] daily log 收口记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

### 真实商品摄影素材接入

- Classification: `out-of-scope improvement`
- Why Not Blocking: 离线环境无真实图床资产；程序化器形图已达"非占位感"目标；真实素材接入需资产管线决策
- Successor Required: `yes`
- Successor Path: 资产管线决策后另立 plan

### V3 围栏实心圆形态

- Classification: `watch-only residual`
- Why Not Blocking: region 渲染样式为渲染器级（D4 §6.2 非交互裁决页面）；已登记 improvement-analysis
- Successor Required: `no`

## Closure

Status Note: 商城域 polish 全落地（S1 规格芯片化/文案产品化/payload 内联求交收紧、progress 金色、场次 pill 品牌化、素材二代器形图、M1/S2 stat-tile title 双写消除、!important 债消除）；S1 12/12 + 全量 209/209 `--retries=0` + vitest 569/569 + 五门禁绿；closure audit round-1 issues（3 Major：dist 按钮 !important 残留/mock SVG 拼接 bug/提交范围）→ 修复 → round-2 approved。

Closure Audit Evidence:

- Auditor / Agent: agent_4d3f8123（独立 fresh session closure auditor）
- Evidence: round-1 抽核发现 dist 档 !important 残留、mock 模板拼接真 bug（"' + '" 字面 token 入 SVG）、提交范围风险——全部修复；round-2 live 实证（grep 零残留/S1 12/12 与 mall-distribution+mes-shopfloor 20/20 独立实跑/单测 5/5）；prettier 两 .ts 缩进按审计必办项修正。

Follow-up:

- 真实商品摄影素材接入（Deferred，Successor: yes——资产管线决策后另立 plan）；V3 围栏形态与 progress/!important 债余项在 improvement-analysis/注释在案。
