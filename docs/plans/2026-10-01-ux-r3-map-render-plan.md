# UX-R3 地图渲染修复（region 空白 / pin 黑点 / 离线底图退化）

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（MP-1/MP-2）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R3
> Related: `docs/components/map/design.md`（owner doc，落地时核对）

## Purpose

把 `#/map-demo` 从"区域着色空白、pin 纯黑圆点、无底图"修复为"区域 choropleth 可见着色、pin 有语义配色与描边、底图不可达时矢量层优雅呈现"，并补齐 map 实例的程序化断言锚点。

## Current Baseline

- 审计判定的"地图全坏"经深挖为**三个独立问题**（活页证据，`_tmp/ux-audit-2026-10-01/map-after-full-reload.png`）：
  - **RC-1 底图瓦片不可达（环境事实）**：`fetch('https://tile.openstreetmap.org/...')` 在本环境失败（无外网）。basemap TileLayer 无瓦片可绘 → 画布白底。演示的视觉完整性离线时依赖矢量层；且离线 basemap 可能不产生 `.ol-layers` canvas 子节点，图层计数必须用实例集合 `getLayers().getLength()` 而非 DOM 子节点数。
  - **RC-2 每图仅 1 图层（开放假设，Phase 1 实锤）**：region 两卡 + pin 卡各只有 1 个 layer（DOM 计数，受 RC-1 干扰），实例集合计数未测。备选假说：① 离线 basemap 在 DOM 不可见但存在于实例集合（则"1 层"实为 basemap，data layer 缺失另有原因）；② 装配时序缺陷。注意 init effect deps `[olApi, mapVisible]` 是装配 effect deps 的真子集且声明在前，"init 重跑而装配不重跑"的 StrictMode 假说已被 React 语义反驳（挂载期 olApi 未就绪双 pass 均早退；就绪后的 remount pass 对全部 effect 无差别重跑）——Phase 1 以 `getLayers().getLength()` + 层类型探针实锤。demo 8 个 region 名称与 china-provinces.json 8/8 匹配（35 features 含全部 8 省），features 非空。
  - **RC-3 pin/cluster 圆点纯黑（根因已有仓内记录）**：`resolveThemeColor`（map-renderer.tsx:40-56）以裸 `var(--token)` 探针取色，而本仓主题 token 是裸 HSL 三元组（shadcn 约定，消费形如 `hsl(var(--token))`）→ 计算值退化为 `rgb(0,0,0)`，guard 只排除透明色拦不住纯黑 → 四个主题色全黑。demo pin 卡 `cluster: true` + zoom 4 下 8 点聚成 3 个多成员 cluster（与 MP-2"3 个黑点"精确吻合），走 `buildClusterStyle`（map-layer-manager.ts:165-201）count>1 分支：fill = `withAlpha(theme.accent, 0.65)`，`withAlpha` 对非 hex 原样返回 → 黑进 Fill。该结论已被 `tests/e2e/map-dark-redraw.spec.ts:9-14` 头注释（plan 482 实测）记录在案。色阶管线（map-color.ts）输出恒合法 hex，排除。pivot 的 `resolveDesignTokens`（pivot-option.ts:376-403）为同型探针（潜在同型缺陷，跨包 follow-up 需裁定）。
- map 渲染器无实例暴露锚点（pivot 有 `__flux_pivot_<id>` 先例，map 包零命中）；`tests/e2e/map-dark-redraw.spec.ts` 已存在（主题重绘存活断言），无图层装配/配色专项 spec。
- 地图 canvas 渲染为异步（OL 首帧后建 canvas），早期探针"canvas=0"为 Vite 冷编译瞬态——诊断以实例探针为准。

## Goals

- StrictMode 下 remount 后图层装配完整（basemap + data 均在），SPA 导航与整页加载行为一致。
- pin/cluster 点位有语义配色（非纯黑）：主题色注入修复后 cluster 气泡为主题 accent 色、非聚合单点按色阶着色；region choropleth 按值着色可见。
- 底图瓦片不可达（离线/内网）时：矢量层完整渲染 + basemap 失败有一次性 dev 告警（已有）+ 演示页默认观感仍成立。
- map 渲染器暴露 `__flux_map_<schema-id>` 实例锚点（对齐 pivot 先例），新增 map e2e spec 程序化断言图层/要素/颜色。

## Non-Goals

- 不引入本地瓦片离线包/自建底图服务（basemap 离线退化 = 无底图白底 + 矢量层，属可接受降级）。
- 不改 OL 版本与 map schema 公共字段。
- 不处理 world-countries 数据集内容正确性。

## Scope

### In Scope

- `packages/flux-renderers-map/src/map-renderer.tsx`（实例暴露 + 装配时序修复）
- `packages/flux-renderers-map/src/map-layer-manager.ts`（如诊断指向样式/装配缺陷）
- `apps/playground/src/pages/map-demo.tsx`（如需演示配置收敛）
- `tests/e2e/map-demo.spec.ts`（新增）
- `docs/components/map/design.md`、`docs/analysis/2026-10-01-playground-designer-ux-audit.md`（MP-1/MP-2 改判与补注）

### Out Of Scope

- 瓦片代理/镜像服务
- map 主题 token 链路重构（map-color 管线本身已验证健全）

## Failure Paths

| 可测场景编号            | 触发                                                    | 行为                                                                                                                  | 可重试                   | 用户可见表现            |
| ----------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------- |
| map-basemap-unreachable | 底图瓦片请求失败（离线/内网）                           | 既有 tileloaderror 一次性告警保持；矢量数据层独立渲染不受影响                                                         | 是（网络恢复后瓦片出现） | 白底 + 矢量要素完整可见 |
| map-remount-assembly    | 实例生命周期重建（StrictMode 双挂载 / mapVisible 翻转） | 任何存活的 map 实例都完成图层装配（basemap + data），与单次挂载渲染一致（行为要求；Phase 1 实锤后决定是修复还是加固） | 否                       | 渲染结果与挂载路径无关  |

## Test Strategy

档位选择：`建议有测`

map 渲染器现有单测 mock OL（构造/装配逻辑可单测装配时序处置）；视觉效果与实例状态用 e2e 程序化断言（实例暴露 + `getLayers`/`forEachFeature` 探针为主——canvas 像素判据已被 `map-dark-redraw.spec.ts:9-14` 实测否决）。新增 spec 与既有 dark-redraw spec 分工：dark-redraw 管主题重绘存活，新 spec 管图层装配与配色。

## Execution Plan

### Phase 1 - 诊断实锤与可观测性

Status: completed
Targets: `packages/flux-renderers-map/src/map-renderer.tsx`

- Item Types: `Proof`, `Fix`

- [x] 暴露 `__flux_map_<schema-id>` 实例锚点（对齐 pivot exposeInstance 先例 + clearExposedInstance 生命周期；map-renderer.tsx exposeMapInstance/clearExposedMapInstance，init/cleanup 挂钩）
- [x] 活页探针实锤（结论记入 daily log）：
  - **RC-2 撤销**：实例集合口径下三张图均 `layerCount=2`（TileLayer/XYZ + VectorLayer），装配时序无缺陷——此前"1 层"是离线 basemap 无 canvas 子节点 + data canvas 异步出现的 DOM 口径假象。StrictMode 假说正式排除。
  - **region 空白真因（新增 RC-A）**：`map-layer-manager.ts:148` `readFeatures(featureCollection)` 未传投影选项——GeoJSON 4326 坐标被当 3857 视图坐标（中国经纬度值当作米 → 数值极小 → 要素塌缩在原点附近），fitView 对塌缩 extent fit 到 maxZoom 10 → 视口内无要素可绘（白屏 + 中央一点）。region 卡 8 features、自定义卡 2 features 已确认在 source 中（实例探针 `getFeatures().length`）。
  - **RC-3 维持**：cluster 气泡黑填充来自 resolveThemeColor 裸 var 探针（修复前黑色证据：canvas 中央采样 `[0,0,0,128]` 半透明黑 + 主题四色全黑的静态分析）；pin 经 `fromLonLat` 正确投影所以点位可见但色黑。
- [x] 依据诊断结论定稿 Phase 2 修复清单（本 Phase Exit 允许修订 Phase 2 条目，修订记录在 plan 内——Phase 2 已按 RC-A/RC-3 结论改写）

Exit Criteria:

- [x] 实例锚点可用且随卸载清理（`__flux_map_demoChinaSales`/`demoStorePins`/`demoCustomGeojson` 探针通过）
- [x] 根因有探针级证据：RC-2 撤销（装配无缺陷）、新增 RC-A 投影缺失（readFeatures 无选项）、RC-3 维持（resolveThemeColor）
- [x] Phase 2 条目与诊断结论一致（已改写）

### Phase 2 - 装配时序与渲染修复

Status: completed
Targets: `packages/flux-renderers-map/src/map-renderer.tsx`, `packages/flux-renderers-map/src/map-layer-manager.ts`, `apps/playground/src/pages/map-demo.tsx`

- Item Types: `Fix`

- [x] 修复 RC-A 投影缺失：`readFeatures` 补 `{ dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }`（map-layer-manager.ts:148-155）；新增投影选项断言用例先红后绿（ol-fake 模块级 lastGeoJsonReadOptions 记录）
- [x] 修复 RC-3 黑主题：抽出纯函数 `resolveTokenColor`（裸 HSL 三元组包装 `hsl()`、完整色值直通、空/非法回退 fallback），`resolveThemeColor` 改读 `getPropertyValue` token 原始值；新增 3 组纯函数用例先红后绿（`resolve-token-color.test.ts`）；pivot `resolveDesignTokens` 同型探针的跨包复核已登记 Non-Blocking Follow-ups（见下节）
- [x] demo 修复后观感复核：region choropleth 8 省色阶着色（广东省深紫 #7b1fa2 等）、fitView zoom 4.59 全国视野、cluster 气泡 accent 蓝带计数、stroke `hsl(214 32% 91%)` 解析正常、离线白底矢量完整（截图 `_tmp/ux-audit-2026-10-01/map-fixed.png` + 实例探针色值证据）
- [x] 单元测试：装配时序处置（Phase 1 实锤 RC-2 撤销 → 判加固分支，绿色回归由 e2e map-demo/map-dark-redraw 钉住；红-first 由 RC-3 投影/主题测试承担）；包测试 64 tests 全绿（审计实跑）
- [x] 浏览器实测：region 卡 choropleth 着色可见、pin 卡圆点有语义色、各图 `getLayers().getLength()` = basemap + data（实例集合口径；截图 `_tmp/ux-audit-2026-10-01/map-fixed.png` + 探针色值）

Exit Criteria:

- [x] StrictMode 下 remount 实例图层完整（Phase 1 实锤装配本无缺陷：三图 layerCount=2；e2e 回归锚钉住）
- [x] pin 黑点消失、region 着色可见（截图 + 探针色值证据存 `_tmp/`：regionFill #7b1fa2、stroke hsl 解析、cluster 蓝色带计数）
- [x] `pnpm --filter @nop-chaos/flux-renderers-map test` 全绿（5 files / 64 tests）

### Phase 3 - e2e 回归网与文档同步

Status: completed
Targets: `tests/e2e/map-demo.spec.ts`, `docs/components/map/design.md`, `docs/analysis/2026-10-01-playground-designer-ux-audit.md`

- Item Types: `Proof`, `Follow-up`

- [x] 新增 `tests/e2e/map-demo.spec.ts` 2 用例全过（与既有 `map-dark-redraw.spec.ts` 共存分工）：实例锚点断言（layerCount=2、region 8 要素、zoom<7、fill 合法 hex 非黑；cluster 填充非退化黑）、`assertTrackedPageErrors`
- [x] owner doc 同步：`docs/components/map/design.md` §4.2（readFeatures 投影契约）与 §5（resolveTokenColor 主题解析）已补记；审计报告 MP-1/MP-2 行与根因节改判（RC-A 投影/RC-3 主题注入/RC-1 环境事实分立）
- [x] MP-2 中底图离线部分移入 `Deferred But Adjudicated`（离线瓦片包 out-of-scope，见 Deferred 节）

Exit Criteria:

- [x] map e2e 全过（2 passed）
- [x] MP-1/MP-2 行与 live 事实一致；Deferred 字段完整
- [x] `docs/components/map/design.md` §4.2/§5 与实现一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，plan review 共 2 轮）
- Verdict: `pass`（第 1 轮 revised：3 Major；第 2 轮全部解决，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R3-M1（RC-2 降级为开放假设，StrictMode 机制假说撤回，Failure Paths 改行为要求）；R3-M2（RC-3 根因按仓内记录确认为 resolveThemeColor 裸 var 探针缺陷，修复主方向改 hsl() 包装，Goal 拆分 cluster/单点承诺）；R3-M3（Baseline 更正 map-dark-redraw.spec.ts 已存在，新 spec 分工）。残留 2 条措辞 Minor（Phase 1 探针职责时序、先红后绿条件分支）已随执行前修订落实。

## Closure Gates

- [x] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（投影选项断言 + resolveTokenColor 3 用例先红后绿；装配时序经 Phase 1 实锤无缺陷，以 e2e 回归锚钉住——记录在 daily log）
- [x] 浏览器/e2e 实测证据存档（`_tmp/ux-audit-2026-10-01/map-fixed.png`；e2e map-demo 2 passed + map-dark-redraw 1 passed）
- [x] `pnpm typecheck`（exit 0，2026-10-01，pipefail 实跑）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0；首轮 init effect exhaustive-deps 报 props.id 缺失，补入 deps 后归零）
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（零新增红项）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- 本地/离线瓦片底图方案（独立评估）
- map world-countries 数据集质量复核
- pivot `resolveDesignTokens`（pivot-option.ts:376-405）裸 `var(--token)` 同型探针复核（closure audit ISSUE-4 登记：与 map resolveThemeColor 修复同型，需独立裁定——pivot 现有测试绿、live 表现待查，不阻塞本 plan）

## Deferred But Adjudicated

### 离线底图瓦片方案

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 瓦片不可达为环境事实（无外网），矢量层在离线下完整渲染即为可接受降级；本地瓦片包/自建底图属独立基础设施决策。
- Successor Required: `no`
- Successor Path: 归 roadmap R10 或独立评估（Non-Blocking Follow-ups 已登记）。

## Closure

Status Note: 2026-10-01 收口。诊断反转（StrictMode 假说撤回）后实锤双根因：readFeatures 缺投影（RC-A）与 resolveThemeColor 裸 var 探针（RC-3）；离线瓦片为环境事实按 Deferred 登记。投影/主题双修复带先红后绿测试，新增 map e2e 2 用例与既有 dark-redraw 分工共存，owner doc/审计报告同步。全量门禁实跑全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session closure audit，2026-10-01，两轮：第 1 轮 `issues`（4 条纯文本项：2 处漏勾选、1 处 gate 漏勾、1 处虚假交叉引用——代码/测试零返工，live 证据全过）；修订后第 2 轮 `approved`）
- Evidence: 审计员实跑 map 包 5 files/64 tests 全绿、typecheck 42/42 exit 0（pipefail）、map lint exit 0、pnpm check exit 0、playwright map-demo 2 + map-dark-redraw 1 = 3 passed；逐条核对 Phase 1/2/3 Exit Criteria（exposeMapInstance 挂钩与 deps、readFeatures 双投影键、resolveTokenColor 正则逐段抽查、resolveThemeColor 调用链、e2e 断言、design.md §4.2/§5、审计报告 :123-124/:133）；resolveTokenColor 正则对 '217 91% 60%' 匹配成立；Deferred 诚实性核查通过。记录于 `docs/logs/2026/10-01.md`。
