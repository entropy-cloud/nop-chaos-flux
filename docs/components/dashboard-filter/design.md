# Dashboard Filter 编排约定

> 来源：`docs/analysis/2026-08-09-bi-control-support-analysis.md`（编排层三件套：dashboard-filter = 组合 + 约定，不新增控件）、plan `2026-08-09-bi-kpi-filter-chart-enhance-plan.md` Phase 3
> 落地：2026-08-09（约定文档 + example.json + scope 联动走查单测 + playground 示例页）
> 走查单测：`packages/flux-renderers-data/src/__tests__/dashboard-filter-walkthrough.test.tsx`

## 1. 定位

- `dashboard-filter` 是**编排约定**（非新 renderer type）：多个筛选控件（select/date-range/input-\* 等字段控件）组合成一个"看板级筛选器"，筛选值写入**共享 page scope**，消费端（data-source/chart/table/stat-tile）经 `${filter.xxx}` 表达式联动。
- 复用 `crud` queryForm「表单 → query summary → 请求参数」的模式语义，但**筛选值的目标是共享 scope 而非 crud 内部 owner path**——因此多消费端（多 data-source、多 chart）共享同一份筛选状态。

## 2. 筛选模型裁定（Decision）

| 项       | 裁定                                                                                                                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 载体     | 普通 `form`（字段控件需要 field runtime：label/校验/值协议），页面级放置                                                                                                                                               |
| 发布     | 表单 `valuesPath: 'filter'` —— form runtime 把字段值**持续发布到父级（page）scope 的 `filter` 对象**（form-runtime `setupExternalPublication`，值变更即发布）                                                          |
| 读取     | 消费端一律 `${filter?.xxx}`（**null-safe 必选**：`${filter.xxx}` 在 filter 未发布时求值抛错，页面出现表达式失败——走查实测确认）                                                                                        |
| 联动     | data-source 的 action args 引用 `${filter?.region}` → 运行时依赖收集（根级 `filter`）→ scope 变更命中依赖 → **自动重载**（`source-registry` 订阅链，无需手动 refresh——走查单测断言 fetcher 在纯 scope 写入后自动二调） |
| 提交语义 | 值变更即发布即联动（`valuesPath` 连续发布）；若需"显式提交"节奏（避免逐字段触发请求），用表单内部 `submitAction`/`debounce` 控制发布时机（见 §4.2）                                                                    |
| 重置     | 表单 reset（字段值清空）→ 发布空值 → 消费端按空筛选渲染全量（Failure Path dashboard-filter-no-link 的"等价未筛"形态）                                                                                                  |

## 3. scope key 命名约定

- 共享筛选值统一挂在 `filter` 根下：`filter.region`、`filter.period`、`filter.status`。
- 消费端引用同构 key：data-source args `params: { region: '${filter?.region}' }`、chart `source: '${filter?.xxx}'` 表达式同理。
- **key 失配诊断（Failure Path dashboard-filter-no-link）**：`source-registry` 在注册期从 data-source action 原始 schema 扫描 `${filter?.key}` 引用；当共享 `filter` 对象已存在（表单已发布过）且新变更落在 `filter` 根上、而引用的 `filter.<key>` 在 scope 中缺失时，`console.warn` 一次性输出
  `[dashboard-filter-no-link] Data source "…" references filter key "filter.xxx", which is not present in the shared filter scope.`（按 sourceId+key report-once，不刷屏）。
- 注意：运行时依赖收集把表达式路径归一化到根（`filter.product` → `filter`），无法给出具体 key——故采用注册期源码扫描（`CompiledActionNode.source` 保留作者原文）实现精确 key 诊断。

## 4. 与 crud 的复用边界

- crud 的 `queryForm` 是 **crud 内部 owner**（`$_crud.<id>.query.*`，T24 命名空间隔离），服务单页 CRUD 的查询表单 + 表格 + 分页闭环。
- dashboard-filter 是**页面级共享筛选**，面向多消费端看板。两者并存：
  - 单 CRUD 场景 → 用 crud queryForm（不引 dashboard-filter）。
  - 看板场景（多 chart/多 table/stat-tile 共享筛选）→ 用 dashboard-filter 约定；页面内如有 CRUD 需要跟随筛选，其 data-source 同样引用 `${filter?.xxx}`。
- 选择判据：筛选状态是否需要被**跨控件共享**。不需要 → crud queryForm；需要 → dashboard-filter。

## 5. 最小可运行示例（example.json）

`docs/components/dashboard-filter/example.json`：2 个筛选（select region + date-range period 含相对预设）→ data-source `/api/sales`（args 引用 `${filter?.region}`/`${filter?.period}`）→ chart + table 联动；playground 示例页（`component-lab` `dashboard-filter` 路由，`dashboard-filter-lab-page.tsx`）含 mock fetcher 按 region 过滤。

## 6. 验证

- 走查单测 4 条全绿：
  1. `valuesPath` 发布：兄弟节点读到 `filter.region`，初始请求携带初始筛选值。
  2. 共享 scope 写入 → data-source 自动重载（断言 fetcher 二次调用且请求带新参数，**零手动 refresh**）。
  3. key 失配 → `dashboard-filter-no-link` dev warn（精确到 key，report-once）；正常链接零告警。
  4. 未发布筛选 → 消费端按空筛选渲染全量（无告警无报错）。

## 7. panel-chrome 组合基线（Follow-up 记录，Phase 4 裁定支撑）

- 面板外壳 = `card` regions 组合（title + header + body + actions），刷新 = header 内按钮触发 data-source 重载——组合基线已够用，panel-chrome 独立控件化待"组合重复 >3 次且样式语义无原语"时评估（裁定记录见 `docs/components/card/design.md` §8.1/§12 与 plan Phase 4）。
- **刷新按钮裁定（2026-08-09，plan Phase 4 Decision）**：**不新增 card `refreshAction` 字段，采用纯组合**——header region 放 Button + `refreshSource` action（`targetId` 寻址 data-source name，作者面字段为 action 顶层 `targetId`，非 args）。
- **完整示例（图表卡片 + 刷新 + 筛选联动，走查单测 `card-refresh-convention.test.tsx`）**：筛选表单（`valuesPath: 'filter'`）→ data-source（args 引用 `${filter?.xxx}`，自动重载）→ card（header 内刷新按钮 `{ action: 'refreshSource', targetId: 'sales' }` + body 内 chart）——手动刷新与筛选自动联动**正交共存**（刷新携带当前筛选参数；筛选变更自动重载无需点刷新）。
