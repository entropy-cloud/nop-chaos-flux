# 813 M3-S2 商城分销后台页复刻（business-page-replication roadmap M3-S2）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-S2（依赖 M2 done；前置 S1 done——ReplMall 域分支已建，本计划扩展 S2 子集端点）
> Related: D1 总体设计；D4 §2.2/§4.1/§5 S2（S2 页设计+端点+断言）；R2 §3 S2；R4 §1 L35、§2 G6/G17；plan 812（mall 域 mock 先例）

## Purpose

落地 M3-S2「商城分销后台页」（桌面直接组合）：dashboard 业绩卡（stat-tile×4+echarts 趋势）+ crud 佣金明细（query-filter+batch-bar+审核 dialog）+ download 导出（G6 服务端报表）+ pivot-table 层级透视（cell-click 下钻）+ tree 三级关系树 + qrcode 邀请码 + input-table 佣金规则配置（合计≠100% 拦截）+ 提现审核/打回 dialog + PAGE_DATA 权限层裁剪（G17）。ReplMall 域扩展 S2 端点 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 S2 状态 `planned → done`。

## Current Baseline

- 设施就绪：replication 六件套、`/r/ReplMall__` 分支已建（plan 812，`mock-backend-repl-mall.ts` 单工厂多段形态可直挂第二 handler 或同分支内分段）、W3 库存台账导出 CSV data-url 先例（`mock-backend-repl-wms-stock.ts` L163-169：`data:text/csv` + download action form-3 路径；e2e replication-wms-stock-ledger.spec 交互③）、dashboard 族 render-host 注册（C3/M1）、pivot 注册+`pivot:cell-click` 事件桥（pivot-events.ts L11，payloadType 在案）、tree/qrcode 渲染器在（data-renderer-definitions L456 / content-renderer-definitions L653）、download action 在（built-in-actions L273）、I1 batch-bar 先例（`itam-asset-inventory.json`：selectionPath definition 级必填 + actions + countTemplate 子作用域——D4 §2.4 MAJ-13 契约）、PAGE_DATA 机制（page-data.ts）。
- D4 §2.2 S2 设计（D5 勘误 MAJ-10/11/14 已内嵌）：dashboard stat-tile×4+echarts line → crud 佣金明细 → 导出 download → pivot-table（source 表达式绑定+字符串 rowDimensions+indicators aggregationType 大写+totals.row 对象）→ tree 三级+qrcode → 提现审核/打回 dialog → input-table 佣金规则 → PAGE_DATA 权限层（visible `${tenantRole === 'merchant'}`）。
- D4 §4.1 S2 端点：commissionPage（≥25 行）/commissionExport（CSV data-url，REPL_MALL_EXPORT_EMPTY）/distPivot/distTree/commissionRules（GET+POST，合计≠100%→REPL_MALL_RULE_INVALID）/payoutAudit（空原因→REPL_MALL_PAYOUT_REJECTED_REQUIRED）。
- D4 §5 S2 断言：①筛选/分页计数+首行字段；②导出 commissionExport+1+download 触发；③pivot cell click 下钻 dialog 按 event.value 过滤；④规则提交 payload 断言+合计≠100% RULE_INVALID toast；⑤打回空原因 PAYOUT_REJECTED_REQUIRED；focus：审批 dialog 焦点落入+Esc 返回、导出按钮 tab 首站。
- live 能力盘点（2026-10-31 起草核对）：GridSchema/cards 等已核（812）；pivot `onCellClick` payloadType `pivot:cell-click`（payload 含 cell 值——实现期以 live payload 键核对）；tree {data,childrenKey,labelField}；qrcode {value,size}。

## Goals

- ReplMall 域扩展 S2 六端点（含 CSV 导出与三错误分支）+ `page-schemas/mall-distribution.json` + entry + e2e `tests/e2e/replication-mall-distribution.spec.ts` + axe 分支 A 登记。
- e2e 断言按 D4 §5 S2 清单（①-⑤ + focus 两条）+ G15/G17 近似面（权限裁剪 visible、batch-bar 结算入口）。

## Non-Goals

- 不实现 O1 及后续页；不做真实结算批处理调度（G17 以 batch-bar action 模拟近似，登记归 missing-components 线不动 retention）；不做多租户权限真机制（G17 visible 裁剪近似）。

## Scope

### In Scope

- ReplMall S2 端点扩展 + S2 页 schema + entry + e2e + axe 分支 A 登记；PAGE_DATA['mall-distribution'] 注入；roadmap §2 S2 回写；D4 勘误就地落档（**显式含 §2.2 片段② 三面**：event.value→cellHeaderPaths、顶层 totals→dataConfig.totals、openDialog url→body table；及 §5 ⑤ 拦截口径——MAJ-1/MAJ-2）。

### Out Of Scope

- 其余 6 页；结算批处理真调度；租户权限真机制。

## Failure Paths

| 编号        | 触发                    | 行为                                                                         | 可重试 | 用户可见表现 |
| ----------- | ----------------------- | ---------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail    | focused e2e 失败        | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D4 | 是     | e2e 全绿     |
| pivot-click | pivot cell click 不可达 | 以 C3 先例（dispatchEvent/坐标点击）勘误 D4 断言口径，不静默                 | 是     | 下钻可达     |
| payload 面  | 提交载荷模板/域链不符   | 按 812 已证 includeScope/表单域链口径调整并勘误 D4                           | 是     | 载荷解析     |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - S2 页全链实现

Status: completed
Targets: `mock-backend-repl-mall.ts`（S2 端点扩展）、`page-data.ts`（PAGE_DATA['mall-distribution']）、`page-schemas/mall-distribution.json`、`complex-pages-entries.ts`、`tests/e2e/replication-mall-distribution.spec.ts`、axe spec ROUTES/JSON

- Item Types: `Fix | Proof`

- [x] mock 扩展：ReplMall 分支内加 S2 段（端点逐名对齐 D4 §4.1）——`commissionPage`（get，≥27 行确定性 ladder：orderNo/distributorName/level 1-3/rate/commissionAmount/status，分页+level/distributor 过滤参数）/`commissionExport`（post，行集→CSV data-url，返回 `{url, filename, downloadUrl}` 双字段名（url 对齐 runtime form-3 直下读取面，downloadUrl 对齐 D4/显式 then 链），空集→REPL_MALL_EXPORT_EMPTY）/`distPivot`（get，level×distributor 行集）/`distTree`（get，三级 children[]）/`commissionRules`（get 规则集+post 校验三列合计=100%→RULE_INVALID，写镜像 lastCommissionRulesBody）/`payoutAudit`（post，approve/reject；reject 空原因→PAYOUT_REJECTED_REQUIRED 服务端兜底〔UI 面由 required 拦截，K3 口径〕，写镜像 lastPayoutAuditBody）；showcase-env 分支不变（同工厂内分段）
- [x] PAGE_DATA['mall-distribution'] 注入（tenantRole='merchant' + 场次/状态静态选项）；entry
- [x] schema JSON（D4 §2.2 组件树：dashboard stat-tile×4（GMV/佣金/人数/待结算，decimals 显式）+ echarts line 趋势/crud 佣金明细（**query-filter 首个 JSON 用法**（flux-guide/design-patterns/page-templates.md 模板出处；复刻页现用 crud 内建 queryForm——live 先例 standard-crud/itam）+level/状态筛选+分页+batch-bar 结算入口（**I1 口径** selectionPath+actions+countTemplate）+operation 审核 openDialog）/导出按钮（ajax commissionExport→then download ${result.data.downloadUrl}）/pivot-table（source 表达式绑定 `${distPivotRows?.items ?? []}`〔M-1 信封解包〕+字符串 rowDimensions level,distributorName+indicators SUM/COUNT 大写词表+**dataConfig.totals.row 对象**〔顶层 totals 无效——PivotTableSchema 无此键，W3 已证 dataConfig 路径〕+onCellClick→**W3 已证链**：setValue drillDistributor=`${cellHeaderPaths?.rowHeaderPaths?.[1]?.value ?? ''}`→openDialog（body table/ARRAYFILTER 按 drillDistributor 过滤；**不用 event.value**——click_cell payload 的 value 是聚合数非维度键，live 已证面是 cellHeaderPaths，W3 交互②））/tree 三级（distTree 数据）+qrcode 邀请码/提现审核打回 dialog（form+textarea 原因必填+approve/reject→payoutAudit）/佣金规则配置区（**M2 已证链**：form 包裹具名 input-table〔品类/区间/三级比例〕+按钮 submitForm+form submitAction 显式 data 映射 `${rules}`提交 commissionRules+onError showToast RULE_INVALID——input-table 裸放绑定落空为已知 live 缺口 D6 MIN-2；mock 择字段消费/多余键容忍）/权限层区块 visible`${tenantRole === 'merchant'}`；testid `<pageId>-<element>`；strict 零 error）
- [x] e2e spec（D4 §5 S2 清单：前置〔dashboard 四卡+crud 行集+pivot/tree/qrcode 可见+三端点计数〕/交互① query-filter 筛选→行数变化+首行字段+commissionPage 计数增长/交互② 导出→commissionExport 计数+1+W3 已证三面（toast/hook 镜像/data-url 形状）为验收本体+waitForEvent('download') 附加断言〔tests/ 零先例，宿主 <a download>.click() 面已核 blob-download.ts L48-58〕/交互③ pivot cell click→drillDistributor 写回（cellHeaderPaths 提取）+下钻 dialog 打开且数据命中点击维值/交互④ 规则改比例→提交 payload 断言；改合计≠100%→RULE_INVALID toast/交互⑤ 审核 dialog reject 空原因→**required 前端拦截**（payoutAudit 计数不变+dialog 停留，K3 已证口径；PAYOUT_REJECTED_REQUIRED 保留为服务端兜底，whitespace-only 输入绕 required 断言端点分支）+填写后成功/交互⑥ 权限层双区块判别：merchant 区块可见且非 merchant 区块不渲染（PAGE_DATA 注入 tenantRole，visible 裁剪两视图）/focus ① 审核 dialog 焦点落入+Esc 返回/focus ② 导出按钮 tab 可达（按最终 DOM 序可达即可）；显式 --retries=0）
- [x] axe 分支 A 登记：ROUTES + `complex-pages/mall-distribution` JSON 键（首跑实测回填+\_notes）
- [x] 验证：focused e2e `--retries=0` 全绿 + axe spec 绿 + S1 回归 + playground unit + strict 校验

执行期适配（2026-10-31，以 live 为准；D4 §2.2「S2 实现勘误」10 条就地落档）：

- query-filter→crud：内嵌 form 提交管线中 `setValue` 写 form 本层作用域、到不了页面作用域 → 改 crud 外部提交通道 `component:querySubmit` + `args.values`，crud loadAction 读 `${query.level/status/distributor}`（交互① 请求参数镜像 `lastCommissionPageParams` 实证）。
- 佣金规则：form 初始 `data` 为快照（规则表首帧空）→ form `loadAction` GET commissionRules，input-table `name: items`，提交映射 `{rules: "${items}"}`（原文 `${rules}` 改名）。
- 导出：crud 查询状态私有（`$_crud.<id>.query`）无公开读取面 → 导出全量；`REPL_MALL_EXPORT_EMPTY` 由 consume-once 钩子 `forceExportEmpty` 触发（交互②b）。PAGE_DATA 注入实为 tenantRole + dashboard panels + 趋势静态序列（状态/层级选项内联 schema，原文「场次/状态静态选项」措辞就地更正）。
- 审核 dialog：单 form（textarea required）+ 驳回/通过双按钮 `setValue auditResult`→`component:submit`，submitAction 成功链 refreshNearest crud + closeSurface。
- pivot 无列维：colHeaderPaths 仅指标一层、表头 1 行（spec 定位口径适配）。
- 预期 console 噪声登记：交互②b/④/⑤ 三个拒绝分支各 `allowConsoleErrors(1)`（W3 ③b 先例，onActionError 上报）。
- `pnpm check` 新增命中 1：`data-blob-href-without-download` @ mock-backend-repl-mall.ts（CSV data URL 生成点）→ 按 W3/C3/I2 同款误报裁决登记 `scripts/audit/ui-consistency-exemptions.mjs`（交互② download 事件实证无顶层导航）。

Exit Criteria:

- [x] S2 页可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（\_\_replMallCalls 计数证据在；download 触发断言在）
- [x] axe 分支 A 基线登记绿

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_3434858e-a161-4426-b6d9-988b56f6b79d）
- Verdict: pass（零 Blocker / 零 Major / 2 Minor）
- Rounds: 1
- Findings addressed: Minor-① roadmap S2 现值描述 `planned→done` 不准（live 为 `todo`）——Baseline 已就地修正为 todo→planned→done 序列；Minor-② 「roadmap 置 planned」系激活动作非 Phase 1 退出证据——已移出 Exit Criteria，随本条 activation commit 落地。

## Closure Gates

- [x] in-scope 工作全部落地（S2 页 + mock 扩展 + roadmap 回写）
- [x] 行为/契约结果已达成（D4 §5 S2 断言清单全绿，--retries=0：focused 10/10）
- [x] 必要 focused verification 已完成（focused 10/10 + axe 23/23 + replication 全族回归 165/165 + strict 60/60 + playground unit 562/562）
- [x] 不存在被静默降级的 in-scope 缺口
- [x] 受影响 owner docs 已同步（daily log 2026-10-31；D4 §2.2 S2 实现勘误 10 条 + §5 S2 就地勘误注）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（agent_43de8ba1，approved）
- [x] `pnpm typecheck`（46/46 exit 0）
- [x] `pnpm build`（46/46 exit 0）
- [x] `pnpm lint`（46/46 exit 0）
- [x] `pnpm test`（触达面零新增红：58/60 tasks，唯一失败 flux-renderers-layout contract-honesty ELOOP 系 807 Deferred 在案环境红，diff 零 packages/ 改动零交集）
- [x] `pnpm check`（exit 0；新增 data-blob 误报已按先例登记豁免）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: `watch-only residual`（layout contract-honesty 加载失败——807 Deferred HEAD 既有红环境级 ELOOP，与本计划触达面零交集）
- Why Not Blocking: 不适用（现无已知红；收口实跑零新增口径维持）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

### 导出跟随当前筛选条件

- Classification: `out-of-scope improvement`
- Why Not Blocking: D4 §5 ② 验收面为「commissionExport 计数+1+download 触发」，不含按筛选导出；crud 查询状态私有于 `$_crud.<id>.query`、页面级按钮无公开读取面，导出全量为 G6 服务端报表的诚实形态（mock 端点仍接受过滤参数）。
- Successor Required: `no`
- Successor Path: 不适用（若需要，归 crud 查询状态公开读取面的 improvement 登记线）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- G17 结算批处理/租户权限近似 → missing-components 登记线（既有归属，本计划不扩约）

## Closure

Status Note: S2 页全链落地（ReplMall S2 六端点 + PAGE_DATA + schema strict 零诊断 + entry + focused e2e 10 测试 + axe 分支 A 登记），D4 §5 S2 断言清单（①-⑤ + 交互⑥ 权限裁剪 + focus 两条）全部以 `--retries=0` 实跑通过；执行期 live 契约偏差（query-filter→crud 走 component:querySubmit、form 初始 data 快照→loadAction、导出与筛选解耦、pivot 无列维表头层级等）已在 D4 §2.2「S2 实现勘误」10 条与 §5 就地勘误注落档；唯一 Deferred（导出跟随筛选）分类 out-of-scope improvement 有明确理由。独立 closure audit approved，无剩余 plan-owned work。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（agent_43de8ba1-3f37-4a2f-9bc8-272e02356b6b）
- Evidence: verdict **approved**（零 Blocker / 零 Major / 2 Minor）。审计员实跑 focused e2e 10/10 `--retries=0`、axe `-g mall-distribution` 绿、strict 60/60；逐项核对六端点/钩子/PAGE_DATA/schema/豁免/D4 勘误；e2e 断言诚实性逐条审查（① 请求参数镜像+精确行数、② 真实 download 事件、③ 坐标点击+排他断言、④ payload 逐字段、⑤ 计数精确为 0、⑥ toHaveCount(0)）。Minor-1（daily log 条目须随收口提交实际补入）——已补入 `docs/logs/2026/10-31.md`；Minor-2（focus ② 口径适配未入 D4 §5 勘误注）——已补句。

Follow-up:

- no remaining plan-owned work（Non-Blocking：全量 test:e2e 归 P1；G17 结算批处理/租户权限近似归 missing-components 登记线）
