# 813 M3-S2 商城分销后台页复刻（business-page-replication roadmap M3-S2）

> Plan Status: active
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

Status: planned
Targets: `mock-backend-repl-mall.ts`（S2 端点扩展）、`page-data.ts`（PAGE_DATA['mall-distribution']）、`page-schemas/mall-distribution.json`、`complex-pages-entries.ts`、`tests/e2e/replication-mall-distribution.spec.ts`、axe spec ROUTES/JSON

- Item Types: `Fix | Proof`

- [ ] mock 扩展：ReplMall 分支内加 S2 段（端点逐名对齐 D4 §4.1）——`commissionPage`（get，≥27 行确定性 ladder：orderNo/distributorName/level 1-3/rate/commissionAmount/status，分页+level/distributor 过滤参数）/`commissionExport`（post，行集→CSV data-url，返回 `{url, filename, downloadUrl}` 双字段名（url 对齐 runtime form-3 直下读取面，downloadUrl 对齐 D4/显式 then 链），空集→REPL_MALL_EXPORT_EMPTY）/`distPivot`（get，level×distributor 行集）/`distTree`（get，三级 children[]）/`commissionRules`（get 规则集+post 校验三列合计=100%→RULE_INVALID，写镜像 lastCommissionRulesBody）/`payoutAudit`（post，approve/reject；reject 空原因→PAYOUT_REJECTED_REQUIRED 服务端兜底〔UI 面由 required 拦截，K3 口径〕，写镜像 lastPayoutAuditBody）；showcase-env 分支不变（同工厂内分段）
- [ ] PAGE_DATA['mall-distribution'] 注入（tenantRole='merchant' + 场次/状态静态选项）；entry
- [ ] schema JSON（D4 §2.2 组件树：dashboard stat-tile×4（GMV/佣金/人数/待结算，decimals 显式）+ echarts line 趋势/crud 佣金明细（**query-filter 首个 JSON 用法**（flux-guide/design-patterns/page-templates.md 模板出处；复刻页现用 crud 内建 queryForm——live 先例 standard-crud/itam）+level/状态筛选+分页+batch-bar 结算入口（**I1 口径** selectionPath+actions+countTemplate）+operation 审核 openDialog）/导出按钮（ajax commissionExport→then download ${result.data.downloadUrl}）/pivot-table（source 表达式绑定 `${distPivotRows?.items ?? []}`〔M-1 信封解包〕+字符串 rowDimensions level,distributorName+indicators SUM/COUNT 大写词表+**dataConfig.totals.row 对象**〔顶层 totals 无效——PivotTableSchema 无此键，W3 已证 dataConfig 路径〕+onCellClick→**W3 已证链**：setValue drillDistributor=`${cellHeaderPaths?.rowHeaderPaths?.[1]?.value ?? ''}`→openDialog（body table/ARRAYFILTER 按 drillDistributor 过滤；**不用 event.value**——click_cell payload 的 value 是聚合数非维度键，live 已证面是 cellHeaderPaths，W3 交互②））/tree 三级（distTree 数据）+qrcode 邀请码/提现审核打回 dialog（form+textarea 原因必填+approve/reject→payoutAudit）/佣金规则配置区（**M2 已证链**：form 包裹具名 input-table〔品类/区间/三级比例〕+按钮 submitForm+form submitAction 显式 data 映射 `${rules}`提交 commissionRules+onError showToast RULE_INVALID——input-table 裸放绑定落空为已知 live 缺口 D6 MIN-2；mock 择字段消费/多余键容忍）/权限层区块 visible`${tenantRole === 'merchant'}`；testid `<pageId>-<element>`；strict 零 error）
- [ ] e2e spec（D4 §5 S2 清单：前置〔dashboard 四卡+crud 行集+pivot/tree/qrcode 可见+三端点计数〕/交互① query-filter 筛选→行数变化+首行字段+commissionPage 计数增长/交互② 导出→commissionExport 计数+1+W3 已证三面（toast/hook 镜像/data-url 形状）为验收本体+waitForEvent('download') 附加断言〔tests/ 零先例，宿主 <a download>.click() 面已核 blob-download.ts L48-58〕/交互③ pivot cell click→drillDistributor 写回（cellHeaderPaths 提取）+下钻 dialog 打开且数据命中点击维值/交互④ 规则改比例→提交 payload 断言；改合计≠100%→RULE_INVALID toast/交互⑤ 审核 dialog reject 空原因→**required 前端拦截**（payoutAudit 计数不变+dialog 停留，K3 已证口径；PAYOUT_REJECTED_REQUIRED 保留为服务端兜底，whitespace-only 输入绕 required 断言端点分支）+填写后成功/交互⑥ 权限层双区块判别：merchant 区块可见且非 merchant 区块不渲染（PAGE_DATA 注入 tenantRole，visible 裁剪两视图）/focus ① 审核 dialog 焦点落入+Esc 返回/focus ② 导出按钮 tab 可达（按最终 DOM 序可达即可）；显式 --retries=0）
- [ ] axe 分支 A 登记：ROUTES + `complex-pages/mall-distribution` JSON 键（首跑实测回填+\_notes）
- [ ] 验证：focused e2e `--retries=0` 全绿 + axe spec 绿 + S1 回归 + playground unit + strict 校验

Exit Criteria:

- [ ] S2 页可达可交互且列表页收录，strict validation 零 error
- [ ] focused e2e `--retries=0` 全绿（\_\_replMallCalls 计数证据在；download 触发断言在）
- [ ] axe 分支 A 基线登记绿

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_3434858e-a161-4426-b6d9-988b56f6b79d）
- Verdict: pass（零 Blocker / 零 Major / 2 Minor）
- Rounds: 1
- Findings addressed: Minor-① roadmap S2 现值描述 `planned→done` 不准（live 为 `todo`）——Baseline 已就地修正为 todo→planned→done 序列；Minor-② 「roadmap 置 planned」系激活动作非 Phase 1 退出证据——已移出 Exit Criteria，随本条 activation commit 落地。

## Closure Gates

- [ ] in-scope 工作全部落地（S2 页 + mock 扩展 + roadmap 回写）
- [ ] 行为/契约结果已达成（D4 §5 S2 断言清单全绿，--retries=0）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；D4 勘误如有）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`（触达面零新增红口径）
- [ ] `pnpm test`（触达面零新增红口径）
- [ ] `pnpm check`（触达面零新增红口径）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: `watch-only residual`（layout contract-honesty 加载失败——807 Deferred HEAD 既有红环境级 ELOOP，与本计划触达面零交集）
- Why Not Blocking: 不适用（现无已知红；收口实跑零新增口径维持）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- G17 结算批处理/租户权限近似 → missing-components 登记线（既有归属，本计划不扩约）

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
