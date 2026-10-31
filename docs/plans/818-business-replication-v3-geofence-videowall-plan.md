# 818 M3-V3 IoT 围栏地图与视频墙页复刻（business-page-replication roadmap M3-V3）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-V3（依赖 M2 done；roadmap 现值 `todo`；交互验收收窄裁决见 roadmap V3 行说明列 + D4 §6.2；本 plan 激活时置 `planned`，收口置 `done`）
> Related: D1 总体设计；D4 §2.7（V3 页设计）/§3.4（axe 分支 C）/§4.3（iot 模块 V3 端点 + mp4 资产方案）/§5 V3（断言）/§6.2（临时形态边界）；R4 §1 L40、§2 G24-G26、§3 结论 2；plan 816/817（ReplIot 域 + delegate 先例）、plan 814（public/repl-assets 静态资产先例）、map-demo.spec.ts（`__flux_map_<id>` 实例句柄先例）

## Purpose

落地 M3-V3「IoT 围栏地图与视频墙页」（桌面，新 type 临时形态，axe 分支 C）：grid 左图右墙——左：`map` pin 模式设备点位（点击 pin → `checkFence` 判定 + 事件列表按设备过滤）+ 围栏回显 + `table` 围栏事件（interval 轮询增量）+ `timeline` 事件流；右：`video`×4 mp4 本地样例墙（card 包裹通道名 + status）+ `drawer` 通道树（tree，点播控制仅 UI 摆放）。绘制/轨迹/流媒体不做交互验收（D4 §6.2 显式收窄）。ReplIot 域扩展 V3 五端点（delegate）+ mp4/poster 静态资产 + focused e2e + axe 分支 C 实测裁决。收口为 roadmap §2 V3 `todo → planned → done`。

## Current Baseline

- 设施就绪：ReplIot 域 + delegate 拆分形态（plan 816/817：`mock-backend-repl-iot.ts` 主分支 + `mock-backend-repl-iot-v2.ts`，hooks 对象直传）；`apps/playground/public/repl-assets/`（plan 814 已建，Vite dev server 直接服务）；ffmpeg 8.1 可用（`/opt/homebrew/bin/ffmpeg`，D4 §4.3 mp4 主方案前提成立）。
- **map 渲染器 live 契约（2026-10-31 核对）**：`packages/flux-renderers-map/src/schemas.ts` L54-82——`mapType: 'pin'|'region'`、`pinData [{name,lat,lng,value?,…}]`、`cluster`（缺省 true）、`geojsonSource` 为 **ActionSchema**（非表达式；D4 片段① `"${fenceGeojson}"` 写法不成立）、`center [lng,lat]`、`zoom`、`onClick`（payload `map:feature-click {mapType,name,value,feature}`，L45-52）；**geojson 仅在 region 模式消费**（`map-renderer.tsx` L238：`if (mapType !== 'region' || !geojson) return`）——pin 地图无法同时叠加围栏 geojson；实例句柄 `window.__flux_map_<schema id> = { map }`（L75-89，map-demo.spec.ts L26-56 读 VectorLayer 要素先例）；basemap 缺省 OSM 瓦片，离线 `tileloaderror` 仅 console.warn 降级（map-layer-manager.ts L94-103）。
- **map 未注册到 complex-pages 渲染宿主**：`registerMapRenderers` 仅在 `apps/playground/src/App.tsx` / `pages/map-demo.tsx` 调用；复刻页走 `shared/render-host`（`showcaseRegistry`）——需补注册（M1 补注册 `registerScadaRenderers`、C3 补 `registerDashboardRenderers` 先例）。
- `video`（content schemas.ts L361-377：src/poster/controls/muted/loop）。
- 真实缺口：ReplIot 无 V3 端点；无 mp4 资产；无 V3 页/e2e。

## Goals

- ReplIot 域扩展 V3 五端点（D4 §4.3 逐名，delegate `mock-backend-repl-iot-v3.ts`）：`ReplIot__devicePins`（get）/`ReplIot__fenceList`（get）/`ReplIot__fenceEvents`（get，interval 增量）/`ReplIot__checkFence`（post，`REPL_IOT_DEVICE_NOT_FOUND`）/`ReplIot__videoChannels`（get）+ 写镜像 + `appendFenceEvent(event)` 钩子。
- 静态资产：`public/repl-assets/sample-clip-{1..4}.mp4`（ffmpeg testsrc 程序化生成，2s/320×180/H.264/静音，单个 <100KB）+ `sample-poster-{1..4}.png`；生成命令记入 plan 与 D4 勘误（可复现）。
- render-host 补注册 map 渲染器；`page-schemas/iot-geofence-videowall.json` + entry + e2e `tests/e2e/replication-iot-geofence-videowall.spec.ts`；axe 分支 C 实测裁决（≤30s 纳入棘轮 / >30s 排除并登记 excludedRoutes，耗时证据入 plan）。
- e2e 覆盖 D4 §5 V3 清单（①-④ + focus 三条），`--retries=0` 全绿。

## Non-Goals

- 围栏绘制/顶点编辑（G24）、轨迹回放（G25）、流媒体起停流/HLS/FLV/RTSP/GB28181 与 iframe（G26，keep-out）——D4 §6.2 显式收窄，不做交互验收；不改 map 渲染器以支持 pin+geojson 叠加（登记为 improvement 候选，不越权）。

## Scope

### In Scope

- ReplIot V3 五端点（delegate）+ 钩子；mp4/poster 资产；render-host map 补注册；V3 页 schema + entry + e2e；axe 分支 C 实测裁决；roadmap §2 V3 回写；D4 §2.7/§4.3/§5/§6.2 勘误就地落档，**逐名**：① geojsonSource 为 action（非表达式），返回 FeatureCollection；② pin 模式不消费 geojson → 围栏回显改为同页第二张 region 模式地图（geojsonSource → fenceList 圆形 FeatureCollection，regionData 按 fenceName 着色）；pin+围栏单图叠加登记 `docs/components/existing-components-improvement-analysis.md` map 族候选（只登记）；③ pin 点击 e2e 经 `__flux_map_<id>` 读要素坐标换算像素后真实点击（cluster 关闭避免聚合吞要素）；④ `fenceList` 返回 `{fences, fenceGeojson}` 中 FeatureCollection 的取用面（geojsonSource action 结果须为 FeatureCollection 本体——mock 提供独立 geojson 视图或 action 指向 FeatureCollection 字段，以 live sanitize 口径为准）；⑤ map 补注册 render-host；⑥ checkFence 载荷 `${event.value}` → `${event.name}`（pin 点击 payload.name 取自 pinData.name = deviceId，value 不承载设备键）。fenceList 取用面执行期优先落「mock 独立 geojson 视图直接返回 FeatureCollection 本体」分支（live `sanitizeGeojsonActionResult` 要求 result.data 为 FeatureCollection 本体）。

### Out Of Scope

- 地图绘制/轨迹/流媒体交互；map 渲染器能力扩展；C2 calendar 时区窗口红（plan 814 Deferred，归 P1）；并行会话 WIP。

## Failure Paths

| 编号             | 触发                | 行为                                                                                | 可重试 | 用户可见表现            |
| ---------------- | ------------------- | ----------------------------------------------------------------------------------- | ------ | ----------------------- |
| device-not-found | checkFence 未知设备 | `status:1 REPL_IOT_DEVICE_NOT_FOUND`                                                | 否     | 错误 toast              |
| basemap-offline  | OSM 瓦片不可达      | map-layer-manager `tileloaderror` console.warn，矢量层照常渲染（map-demo 口径）     | —      | 底图空白、点位/围栏照常 |
| axe-timeout      | V3 axe 分析 >30s    | D4 §3.4 排除裁决：ROUTES 移除 + 注释 + `_header.excludedRoutes` 登记；功能 e2e 照常 | —      | 基线 JSON 登记排除理由  |
| e2e-fail         | focused e2e 失败    | 定位修复 → 重跑至绿（`--retries=0`）；以 live 为准并勘误 D4                         | 是     | e2e 全绿                |

## Test Strategy

必须自动化：本页 e2e 即验收本体（交互 + focus；axe 按分支 C 实测裁决），显式 `--retries=0` 全绿；strict schema 校验零诊断。e2e 以独立 `PLAYWRIGHT_PORT` + `--output=_tmp/...` 运行（共享工作树）。

## Execution Plan

### Phase 1 - V3 页全链实现

Status: completed
Targets: `apps/playground/src/complex-pages/shared/mock-backend-repl-iot-v3.ts`（新 delegate）、`mock-backend-repl-iot.ts`（接入）、`shared/render-host`（map 补注册）、`apps/playground/public/repl-assets/sample-clip-{1..4}.mp4` + `sample-poster-{1..4}.png`（新）、`page-schemas/iot-geofence-videowall.json`（新）、`complex-pages-entries.ts`、`tests/e2e/replication-iot-geofence-videowall.spec.ts`（新）、`tests/e2e/a11y-axe-baseline.spec.ts` + `__fixtures__/axe-baseline.json`

- Item Types: `Fix | Proof`

- [x] mock delegate `mock-backend-repl-iot-v3.ts`：`devicePins`（6 台 `{deviceId,name,latitude,longitude,fenceId}` 投影 pinData `{name,lat,lng,value}`）/`fenceList`（3 个圆形围栏 `{fenceId,fenceName,centerLat,centerLng,radiusMeters}` + FeatureCollection 视图〔toCircleGeojson 多边形近似，properties.name=fenceName〕）/`fenceEvents`（会话事件 `{eventId,deviceId,eventType:'enter'|'exit'|'dwell',ts,distanceMeters}`；`appendFenceEvent(event)` 钩子追加——下一轮询增量）/`checkFence`（post `{deviceId}` → `{deviceId,inside,distanceMeters}`，按设备坐标与所属围栏半径确定性计算；未知 → DEVICE_NOT_FOUND；写镜像 `lastCheckFenceBody`）/`videoChannels`（4 路 `{channelId,name,status:'online',streamUrl:'/repl-assets/sample-clip-N.mp4'}`）
- [x] 资产：ffmpeg testsrc 生成 `sample-clip-{1..4}.mp4`（4 路不同 testsrc 参数：testsrc/testsrc2/smptebars/rgbtestsrc，2s，320×180，H.264 yuv420p，静音，单个 <100KB）+ 同源首帧 `sample-poster-{1..4}.png`；生成命令记入执行期适配段
- [x] render-host 补注册 `registerMapRenderers`（`apps/playground/src/complex-pages/shared/render-host*`）
- [x] schema JSON：data-sources（devicePins / fenceEvents interval 5000 silent / videoChannels）；`grid` 左图右墙 `3fr 2fr`——左：pin 地图（id `iot-geofence-videowall-map`，cluster false，center 设备群中心，onClick → setValue selectedDevice=`${event.name}` + ajax checkFence + setValue fenceCheck=`${result.data}`）+ 判定结果文本 + 围栏回显 region 地图（id `iot-geofence-videowall-fence-map`，geojsonSource action → fenceList FeatureCollection，regionData 按 fenceName）+ 事件 table（source 按 selectedDevice ARRAYFILTER）+ timeline 事件流；右：video-grid 2×2（card 包裹通道名 + status + video controls muted poster）+ 通道树按钮 → drawer（tree videoChannels）；testid `iot-geofence-videowall-<element>`；strict 零诊断
- [x] entry（category `business-replication`）
- [x] e2e spec（D4 §5 V3）：前置〔两张地图实例句柄在位 + pin 要素数 = 6 + 围栏 region 要素数 = fenceGeojson features 数 3（④）+ 端点计数〕/交互① 经 `__flux_map_<id>` 换算 pin 像素真实点击 → checkFence +1 + 载荷 deviceId + 判定文本（inside/distance）+ 事件列表按设备过滤/交互② 视频墙：`<video>` 计数 = 4 + src 含 `/repl-assets/sample-clip-` + 页内无 iframe/交互③ `appendFenceEvent` → 下一轮询 fenceEvents 计数增长 + 事件行数 +1 + timeline 增长（timeout ≥ interval + 余量）/交互④ 围栏回显要素计数/focus ① map 画布容器 tab 可达抽样 ② video controls 可聚焦 1 条 ③ 通道 drawer 焦点落 tree 首项 + Esc 返回；（勘误：D4 §5 V3 清单无拒绝分支断言，spec 全部测试零 console 容差收尾——`allowConsoleErrors` 未使用；DEVICE_NOT_FOUND 仅 mock 层实现）；`--retries=0`
- [x] axe 分支 C 实测：ROUTES 纳入 + 计时；≤30s → JSON 从首跑计数起棘轮；>30s → 排除裁决（ROUTES 移除 + 注释 + `_header.excludedRoutes` 登记 + 耗时证据入执行期适配段）
- [x] 验证：focused e2e `--retries=0` 全绿 + axe spec 绿 + replication 全族回归 + strict 校验

执行期适配（以 live 为准；D4 §2.7「V3 实现勘误」11 条 + §5 就地注；评审逐名六项全部落档为勘误 1-6）：

- **离线确定性底图**：缺省 OSM 瓦片在 e2e 网络沙箱被拒（`net::ERR_CONNECTION_REFUSED` ×12 计入 console.error）→ 两张地图 `basemap.url` 指向本地空白瓦片 `public/repl-assets/map-tile-blank.png`（ffmpeg color 源生成），不扩大 fixtures known-noise 口径（勘误 7）。
- **点位叠压**：DEV-1001/DEV-1002 在 zoom 9 下约 5px 间距、点击命中上层点位 → DEV-1002 外移至 31.24/121.65（仍在 800m 围栏外，判定语义不变）（勘误 3）。
- **资产生成命令**（可复现）：`ffmpeg -f lavfi -i "<testsrc|testsrc2|smptebars|rgbtestsrc>=size=320x180:rate=15:duration=2" -c:v libx264 -pix_fmt yuv420p -an -preset veryslow -crf 30 -movflags +faststart sample-clip-N.mp4`（3-21KB）+ 同源单帧 `sample-poster-N.png`（勘误 9）。
- **axe 分支 C**：首跑 axe analyze ≈650 ms（≪30 s）→ 纳入棘轮，基线 aria-required-attr 5 + color-contrast 8（勘误 10）。
- **scanner 名称碰撞**：`find-non-retained-renderer-references` 158→160（flux geo `map` ×2 被误判为 matrix L225 遗留 AMIS mapping 别名）→ `scripts/baselines/scanner-baselines.json` 手工登记 + reRegistrationNotes（勘误 11）。
- **improvement 登记**：pin+geojson 单图叠加候选写入 `docs/components/existing-components-improvement-analysis.md` §3（地图族 P3，demand-gated）。
- timeline/tree 由 mock 投影（formula 无对象字面量，勘误 8）；video 断言改读 `HTMLVideoElement.controls` 属性（布尔属性匹配器口径）。
- 收口时点 `pnpm check` 唯一红为并行会话未跟踪 `scripts/__tests__/check-test-barrels.test.ts`（check:test-barrels），本 diff 零触达。

Exit Criteria:

- [x] V3 页可达可交互且列表页收录，strict validation 零诊断
- [x] focused e2e `--retries=0` 全绿（`__replIotCalls` 计数 + checkFence 写镜像 + 轮询增量断言在；视频墙存在性 + 无 iframe 断言在）
- [x] axe 分支 C 裁决落地（纳入棘轮或排除登记，二选一且附耗时证据）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_1251fb88-c508-4f60-aa54-8c6dc87df20c）
- Verdict: pass（零 Blocker / 零 Major / 3 Minor）
- Rounds: 1
- Findings addressed: Minor-① checkFence 载荷 event.value→event.name 偏离补入逐名勘误 ⑥；Minor-② map-layer-manager 行号校准 L94-103；Minor-③ fenceList 取用面钉死「mock 独立 geojson 视图返回 FeatureCollection 本体」分支。

## Closure Gates

- [x] in-scope 工作全部落地（V3 页 + ReplIot V3 段 + 资产 + map 补注册 + roadmap 回写）
- [x] 行为/契约结果已达成（D4 §5 V3 断言清单全绿，`--retries=0`：focused 7/7）
- [x] 必要 focused verification 已完成（focused 7/7 + axe 28/28〔分支 C 纳入〕+ strict 65/65 + playground unit 567/567；replication 全族 203/204，唯一失败 C2 calendar 既有时区窗口红）
- [x] 不存在被静默降级的 in-scope 缺口（收窄项均有 D4 §6.2 显式裁决出处）
- [x] 受影响 owner docs 已同步（daily log；D4 §2.7 V3 勘误 11 条——含评审逐名六项 + §5 就地注；improvement-analysis 地图族候选登记；scanner-baselines 登记）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（agent_c0f9ab08，approved）
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（exit 0，86/86；playground unit 567/567）
- [x] `pnpm check`（本 diff 零新增未登记命中：scanner 名称碰撞 +2 已登记；执行时点残留红 check:test-barrels 为并行会话未跟踪文件——closure audit 时点已被并行会话落地消除，复跑 exit 0）

## Deferred But Adjudicated

### （继承）C2 calendar 时区窗口红 / 并行会话 WIP

- Classification: `watch-only residual`
- Why Not Blocking Closure: plan 814/816/817 已裁决——均与本 plan 触达面零交集；复现按同口径归因。
- Successor Required: `yes`
- Successor Path: roadmap M3-P1 开发阶段深度审计

### 并行会话 check:test-barrels 红

- Classification: `watch-only residual`
- Why Not Blocking Closure: `scripts/__tests__/check-test-barrels.test.ts`（未跟踪）属并行会话 830-836 队列 WIP，本 plan 零触达；plan 817 closure audit 亦已独立指认同一归因。
- Successor Required: `no`
- Successor Path: 不适用（归并行会话自有收口义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- map pin+geojson 单图叠加 → improvement-analysis map 族候选（demand-gated）

## Closure

Status Note: V3 页全链落地（ReplIot V3 delegate 五端点 + mp4/poster/空白瓦片资产 + render-host map 补注册 + schema strict 零诊断 + entry + focused e2e 7 测试 + axe 分支 C 实测纳入棘轮），D4 §5 V3 断言清单（①-④ + focus 三条）全部 `--retries=0` 实跑通过；D4 §6.2 收窄（绘制/轨迹/流媒体）原样保留、无静默删功能；评审逐名六项 + 执行期五项共 11 条勘误就地落档；pin+围栏单图叠加登记 improvement 地图族候选；scanner 名称碰撞 +2 登记。独立 closure audit approved，无剩余 plan-owned work。M3 六个复刻页（S2/O1/O2/V1/V2/V3）至此全部收口。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（agent_c0f9ab08-f0dc-462f-822c-655cb8c67689）
- Evidence: verdict **approved**（零 Blocker / 零 Major / 3 Minor）。审计员独立实跑 focused 7/7、axe `-g geofence` 绿、strict 65/65、scanner Found 160（命中恰为本页两处 map）、`pnpm check` exit 0、typecheck/lint exit 0、playground unit 567/567、replication 全族（C2 既有红复现 + S1 负载抖动单跑复绿）；资产体积与可复现命令双落档核验；离线底图未扩大 known-noise。Minor-①（plan e2e 条目「allowConsoleErrors 按 W3 登记」措辞超出 live）——已就地勘误；Minor-②（S1 负载抖动，同 817 M1 族）——非本 plan 触达面，归 P1 flake 面复核；Minor-③（check 红时点描述）——已刷新。

Follow-up:

- no remaining plan-owned work（Non-Blocking：全量 test:e2e、C2 calendar 时区窗口根因、replication 族负载抖动面〔M1/S1〕归 M3-P1；map pin+geojson 叠加归 improvement 地图族候选）
