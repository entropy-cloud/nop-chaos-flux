# E4.1 — ECharts 完整功能（map+GeoJSON/candlestick/graph/sunburst/themeRiver/custom）

> Plan Status: completed
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/echarts-integration-roadmap.md`（E4.1）, `analysis/echarts-migration-analysis.md`（rev 3, §3.4 内置加载机制桥接例外, §1.2）
> Related: 前置 E1.1/E2.1/E3.1（均 completed）；后续 E5.1/E5.2

## Purpose

落地 roadmap E4.1 六种类型：map（含 GeoJSON 注册桥接——裁决 A2 的内置加载机制例外）、candlestick、graph、sunburst、themeRiver、custom。map 是本计划唯一的新代码面（GeoJSON 经 scope 表达式绑定 + `registerMap` 桥接）；其余五种与 E3.1 同构，以真实编译链 fixture + lab 场景证明可验证可用。

## Current Baseline

- E1.1：setup 已注册 MapChart、CandlestickChart、GraphChart、SunburstChart、ThemeRiverChart、CustomChart 及 GeoComponent/SingleAxisComponent 等所需组件；option 原生透传。
- E2.1：dataset 绑定（二维数组形态已在 boxplot fixture 验证）、事件桥接、`empty` 插槽、flux 主题可用；`getECharts()` 目前只导出 `{ init, dispose }`——**无 registerMap 桥接**。
- 裁决 A2 例外条款：map 的 GeoJSON 属 echarts 内置加载机制，所需地图数据经 scope（宿主经 data-source 加载）表达式绑定提供，渲染器负责 `registerMap` 桥接，不做组件级 fetch。
- custom series 的 `renderItem` 是函数，JSON schema 无法表达—— sanctioned 路径是 option 整体经表达式绑定由宿主（xui:imports 注册的 builder）提供，渲染器只消费求值结果。
- themeRiver 需要 option 级 `singleAxis` 坐标系（组件已注册）；candlestick 惯用二维数组（K 线 OHLC）dataset；graph/sunburst 为 series 内嵌数据形态。

## Goals

- `map` 类型可用：schema 级 `map: { name, geoJson }`（geoJson 为 scope 表达式绑定），渲染器在 init 前完成 `registerMap(name, geoJson)` 幂等注册；GeoJSON 未就绪时走显式空态降级。
- candlestick/graph/sunburst/themeRiver/custom 各有真实编译链 fixture 证明 setOption 组合 option 正确；custom 以表达式绑定 option 的形态覆盖。
- lab page 新增 6 个场景；playground 与包级测试全绿。

## Non-Goals

- GeoJSON 的组件级 fetch/缓存层（宿主 data-source 负责）；行政区划内置数据分发。
- E5.1 的包体裁剪与文档；E5.2 nop-datav。
- 渲染器行为重构（map 桥接外预期零改动）。

## Scope

### In Scope

- Fix：`echarts-setup.ts` 的 `getECharts()` 增加 `registerMap` 导出；`echarts-schemas.ts` 增加 `map?: { name: string; geoJson: SchemaValue }`（geoJson 表达式绑定，类型经 SchemaObject 宽化）；`echarts-renderer-definition.ts` fields 增加 `map`（prop）；`echarts-schema-validation.ts` 增加 map 形态诊断（name 非 string / geoJson 缺失）。
- Fix：`echarts-renderer.tsx` 在 init 前解析 `props.props.map`（geoJson 字符串表达式经 `helpers.evaluate`；对象按已解析处理），`registerMap(name, geoJson)` 幂等注册（真实分发链依赖 GeoComponent 已 use——lab 场景承担该链路证明）；解析失败/形态非法 → console.warn + 显式空态降级（Failure Path map-geojson-unavailable）。`map` 字段仅注册地图数据，不注入/改写 `option.series[].map`——series 与地图名的关联由作者在 option 中声明同名引用。
- Proof：`echarts-full-features.test.tsx`（新建，真实编译链 + mocked echarts-setup）——map（geoJson 经 `${worldGeo}` 绑定，断言 registerMap 被调用且 option.series 为 map 类型）、candlestick（OHLC 二维数组 dataset）、graph（nodes/links/categories）、sunburst（层级 data）、themeRiver（[date, value, name] 点集 + singleAxis）、custom（option 整体经 `${boundOption}` 表达式绑定，宿主提供 renderItem）各至少一例。
- Proof：lab page 新增 6 个场景（map 场景内联一份极小 GeoJSON 于 scenario data，经表达式绑定）；playground 与包级测试全绿。

### Out Of Scope

- 渲染器 dataset/事件/主题行为变更（E2.1 已落地，map 复用）。
- GeoJSON 数据源管理与分发。

## Failure Paths

| 场景编号                | 触发                                       | 行为                                                                                                                                                                                                   | 可重试 | 用户可见表现                                   |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------- |
| map-geojson-unavailable | `map.geoJson` 解析失败或形态非法（非对象） | console.warn（渲染器侧；真实链路中未注册地图由 echarts 以 console.error 报告），不调用 registerMap，渲染显式空态（不 init）；map 解析纳入 init gating，geoJson 就绪后重新走 init+registerMap+setOption | 是     | 空态占位                                       |
| map-name-missing        | `map.name` 缺失或非字符串                  | 结构校验（authoring 期 warning 诊断）+ 渲染器侧 warn，跳过注册按无 map 数据渲染                                                                                                                        | 是     | series 按 echarts 语义渲染（可能空白），不崩溃 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`。理由：registerMap 桥接是公共契约（A2 例外条款的唯一代码落点）；Proof 先行，fixture 为交付物。

## Execution Plan

### Phase 1 - map GeoJSON 桥接（唯一代码面）

Status: completed
Targets: `packages/flux-renderers-data/src/echarts-setup.ts`, `packages/flux-renderers-data/src/echarts-schemas.ts`, `packages/flux-renderers-data/src/echarts-schema-validation.ts`, `packages/flux-renderers-data/src/echarts-renderer-definition.ts`, `packages/flux-renderers-data/src/echarts-renderer.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-schema-validation.test.ts`, `packages/flux-renderers-data/src/__tests__/echarts-renderer.unit.test.tsx`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：validator map 形态诊断 + 渲染器 registerMap 桥接的 mocked 单测（geoJson 表达式求值 → registerMap 调用；未就绪 → 空态且零 init）先写先红。（4 用例先红确认）
- [x] Fix：setup `getECharts()` 增加 `registerMap`；schema/validator/定义/渲染器按 Scope 落地；既有单测回归（默认无 map 行为不变）。
- [x] Proof（转绿）：新增与既有 echarts 单测全绿。

Exit Criteria:

- [x] map 桥接有 mocked 单测证明（registerMap 先于 init 调用 + geoJson 未就绪空态降级 + 晚到 geoJson 重走 init），validator 诊断有断言。
- [x] 既有 echarts 单测全绿（无回归）。

### Phase 2 - 六类型 fixture 与 lab 场景

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/echarts-full-features.test.tsx`, `apps/playground/src/component-lab/renderers/echarts-lab-page.tsx`

- Item Types: `Proof`

- [x] Proof（先红）：`echarts-full-features.test.tsx` 覆盖 map（表达式绑定 GeoJSON + registerMap 断言 + map series）、candlestick（OHLC 二维数组 dataset）、graph（nodes/links/categories）、sunburst（层级 data）、themeRiver（点集 + singleAxis）、custom（`${customOption}` 表达式绑定 option，宿主提供 renderItem——review 探针已证明函数经真实编译链保真）各至少一例。（验证型交付：proof 工件为新增，6/6 一次转绿，无渲染器代码缺陷触发）
- [x] Proof：lab page 新增 6 场景（map 场景经 scenario data 表达式绑定极小 GeoJSON）。
- [x] Proof（转绿）：fixture 全绿；playground 测试全绿（33 files / 347 tests）。

Exit Criteria:

- [x] 6 类型各有真实编译链 setOption 结构断言且全绿；map 场景覆盖表达式绑定 GeoJSON。
- [x] lab page 场景可用且 playground 测试全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，round 1）
- Verdict: `pass-with-minors`（零 Blocker/Major；5 Minor 已由起草者合并）
- Rounds: 1
- Findings addressed: Minor-1 lab 场景承担 GeoComponent→registerMap 真实分发链证明（Scope 注明）；Minor-2 Failure Path 可重试语义明确「map 解析纳入 init gating，geoJson 就绪后重走 init」；Minor-3 `map` 字段仅注册数据不注入 option.series（Scope 注明）；Minor-4 Follow-up 补 out-of-scope improvement 标签；Minor-5 map-name-missing 措辞对齐 echarts 真实输出级别（console.error）。另：审查者以临时探针实证 custom series 函数值经真实编译链保真到达 setOption（探针已清理）。

## Closure Gates

- [x] 所有 in-scope 项已落地：map GeoJSON 桥接 + 六类型 fixture + lab 场景
- [x] 行为/契约结果已达成：Failure Paths 2 条行为有单测证明；六类型 setOption 结构断言全绿
- [x] 必要 focused verification 已完成：full-features fixture（6）/ map 桥接（3）/ validator 诊断（4）全绿；包级 152 files / 1124 tests 全绿
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（roadmap E4.1 → done、daily log 收口记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（audit verdict: approved，1 Minor 为收口序列说明，已按其执行）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（turbo eslint 37/37；i18n 既有 4 键红同前，零新增）
- [x] `pnpm test`（68/68 tasks，约 11,544 tests / 0 failed）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- GeoJSON 数据的宿主侧缓存/按需加载策略（data-source 层职责，渲染器不做）→ out-of-scope improvement。
- custom series 的 schema 级 renderItem 声明糖（当前 sanctioned 路径为表达式绑定 option）→ out-of-scope improvement，待有已裁决需求时立项。

## Closure

Status Note: 2026-09-13 收口。map GeoJSON 桥接（A2 例外条款代码化：表达式绑定 + registerMap 先于 init + init gating + 降级空态）与六类型（candlestick/graph/sunburst/themeRiver/custom-renderItem 保真）fixture 全部落地。仓库级验证：typecheck 37/37、build 37/37、turbo eslint 37/37、test 68/68 tasks（约 11,544 tests / 0 failed）。audit Minor（gate 前瞻勾选的收口序列）已按其执行——本段即收口终态。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-13）
- Evidence: verdict `approved`。独立实跑：full-features + renderer.unit + schema-validation 3 files / 40 tests 全绿（map 桥接 3 + validator map 4 + 六类型 6 含其中）；renderer.tsx 行为抽查（mapInfo 求值/init gating/registerMap 先于 init 的 invocationCallOrder 断言/晚到 geoJson 重走 init）；六类型结构断言逐个核对；lab 六场景确认；daily log 与 roadmap planned 状态核对；deferred 分类诚实。

Follow-up:

- GeoJSON 宿主侧缓存策略（out-of-scope improvement）；custom renderItem schema 糖（out-of-scope improvement）——与 Non-Blocking Follow-ups 同项。
- no remaining plan-owned work
