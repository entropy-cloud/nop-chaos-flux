# 559 SCADA/3D 薄桥接架构收敛与演示丰富度对齐计划

> Plan Status: completed
> Last Reviewed: 2026-10-10
> Source: 用户 2026-10-10 指示(开源组件库演示远丰富于本仓库 scada/3d 演示;3d/scada 应是外部引擎的薄桥接,flux 提供数据驱动 + 第三方引擎 JSON 接入 + 数据源接入的无缝融合);docs/backlog/scada-3d-ux-parity-roadmap.md;docs/plans/530-534(全部 completed);开源对标调研(ThingsBoard SCADA symbols / FUXA-SVG-Widgets / RapidSCADA demo / three.js examples / R3F gallery / TresJS Lab)
> Related: docs/plans/530, 531, 532, 533, 534; docs/backlog/threejs-integration-roadmap.md

## Purpose

把 SCADA 与 3D 两条渲染器线收敛到「薄桥接」架构取向,并把演示内容从「能力验证载体」提升到「开源组件库官方示例水准」:

1. **3D**:three-canvas 增加原生 three.js SceneJSON(ObjectLoader)接入路径——three 编辑器/任意 DCC 导出的 JSON 直接渲染,flux 绑定按对象 name 注入数据;自研 tween/keyframe 冻结不再扩展;新演示全部走原生路径。
2. **SCADA**:内置符号库从 24 扩充到 37(对标 ThingsBoard 符号包结构:工艺/管件/电气/仪表族),图元 = leafer-ui 节点薄组合(现架构不变)。
3. **演示**:新增 SCADA 场景画廊(水处理/配电/产线三行业场景,实时模拟数据 + 告警联动 + 远程控制)与 3D 示例画廊(6 个示例,含原生 JSON / GLB / 数字孪生端到端),对齐「每个能力点一个可跑示例」的开源 gallery 范式。
4. **文档**:flux-guide 新增 SCADA 与 3D 两章用户指南(现状零覆盖)。

## Current Baseline(2026-10-10 实测)

- `flux-renderers-industrial`:运行态单 renderer `scada-canvas`;24 内置图元(base-shapes 10 / device 4 / instrument 4 / sensor-control 4 / pipe-junction 1 / group 1);点表+绑定+4 类动画(rotate/blink/flow/move)+状态机+增量 diff+十万级性能已落地;编辑器 palette 按 `category` 自动分组(五组 + other 兜底)。
- SCADA 演示 5 页:scada-demo(反应釜,~40 图元,1s 正弦定时器)、pressure-demo(tab1 工艺大屏 **4 个 static 死点无刷新无交互** / tab2 10k 性能)、perf/edge(测试载体)、editor-demo(5 图元初始场景)。
- `flux-renderers-3d`:引擎含 OrbitControls/GLTF/自研 TweenRegistry/自研 KeyframeClip/HoverHighlighter;**几何体仅 6 种,材质无 metalness/roughness/emissive,相机 controls schema 不可配,无 toneMapping,无 label**;`scene` 仅支持自定义 schema(`models[]` 图元声明),**无 three.js 原生 JSON 接入**。
- 3D 演示:three-canvas-demo(6 素色图元 + 10Hz 合成数据 + 离线 AI 按钮);three-industrial-demo **纯 DOM 无 3D 画面**,IndustrialAdapter(182 行)从未接到 3D 场景;仓库无真实 .glb 资产,唯一运行时演示引用为故意坏 URL(three-canvas-demo.tsx:64)——模型加载能力演示面为零。
- flux-guide:3D 零覆盖;SCADA 已有 `flux-guide/design-patterns/scada.md`(149 行组态 cookbook)与 `scada-editor.md`(100 行),但无系统化用户指南章,且不含 37 图元总表/画廊场景导览。
- e2e:scada 13 spec + three 4 spec,覆盖正确性/性能/UX,非演示丰富度。
- 路由:domain-route-entries.ts 为演示页注册中心,home 卡片自动派生。

## Goals

- three-canvas 支持 `scene: { json }`(three.js SceneJSON/ObjectLoader 格式)直接渲染;场景内带 name 的对象自动注册为绑定目标,既有 bindings/events/scope 数据驱动机制原样工作。
- 自研 tween/keyframe **冻结**(不再新增能力、新演示不再示范),保留既有行为与测试——它们承担「离散数据更新 → 连续过渡」的桥接胶水职责。
- 内置 SCADA 符号 24 → 37:新增 tank/heat-exchanger/conveyor/gate-valve/check-valve(设备族)、pipe-elbow/pipe-tee/pipe-cross(管件族)、breaker/transformer(新电气族)、trend/numeric(仪表族)、alarm-light(传感控制族);编辑器 palette/inspector 零改动自动识别(除电气族分组标签与 i18n)。
- 新增 `scada-gallery-demo`:三行业场景(水处理泵房/配电监控/灌装产线),共享信号模拟器,实时数据 + 状态机告警闪烁 + 远程控制(setPointValue)+ 趋势/LED 仪表。
- 新增 `three-gallery-demo`:6 个 tab 示例(图元材质 / 灯光阴影 / 原生 JSON / GLB 加载 / 关键帧交互+label / 数字孪生泵站 = IndustrialAdapter 合成 socket 端到端驱动 3D 场景)。
- pressure-demo tab1 从 static 死数据升级为绑定 + 模拟数据驱动。
- flux-guide 新增 `19-scada.md`、`20-three-canvas.md` 用户指南;owner docs(design-symbols / design-renderer)同步新契约。

## Non-Goals

- **不扩展自研 tween/keyframe 能力**(冻结;three 原生动画体系由 SceneJSON/GLTF clip 路径承接)。
- 告警体系 schema 级建模(限值/分级/确认链/告警表组件)——演示层用状态机 + DOM 告警条表达,schema 层留 successor。
- 编辑器 inspector 动画编辑面 / 变量(点表)管理面板 / 用户自定义符号入库。
- 后处理(bloom/SSAO)/HDR envMap/天空盒、DRACO/KTX2 解压、IFC/BIM、物理引擎、真 LLM provider、真实 WebSocket 后端。
- SCADA 「原生 leafer JSON 透传」符号类型(记 follow-up)。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/symbols/**`(13 新图元 + 类别扩展)、`src/editor/palette/palette-filter.ts` 分组、i18n 键。
- `packages/flux-renderers-3d/src/schemas.ts`、`engine/scene-manager.ts`、`engine/primitive-factory.ts`、`engine/`(label sprite)、renderer 组件接线。
- `apps/playground/src/pages/scada-gallery-demo.tsx`、`three-gallery-demo.tsx`、`scada-industrial-simulator.ts`、`three-gallery-schemas.ts`、pressure-demo 升级、domain-route-entries/pages。
- `apps/playground/package.json`(新增 three 依赖,供 GLTFExporter round-trip 演示)。
- `flux-guide/19-scada.md`、`flux-guide/20-three-canvas.md`、`flux-guide/README.md` 索引。
- owner docs:`docs/components/industrial-hmi/design-symbols.md`、`docs/components/threejs-integration/design-renderer.md`。
- 新增单测(符号/引擎/解析)+ 新增 e2e(scada-gallery、three-gallery)+ 受影响既有 e2e 修正。

### Out Of Scope

- flux-core/runtime 公共契约变更;flow-designer/report-designer;性能基准重测(scada-perf spec 口径不变)。
- 编辑器能力新增(见 Non-Goals);既有 5 个 SCADA 演示页重构(仅 pressure-demo tab1 数据面升级)。

## Failure Paths

| 编号                | 触发                        | 行为                                                  | 可重试                   | 用户可见表现            |
| ------------------- | --------------------------- | ----------------------------------------------------- | ------------------------ | ----------------------- |
| scene-json-invalid  | `scene.json` 非法/解析抛错  | onError({code:'scene-json-invalid'}) + 错误 UI,不白屏 | 否(修正 schema 后重渲染) | empty/error region 内容 |
| scene-json-no-webgl | SceneJSON 路径 WebGL 不可用 | 与既有 webgl-unavailable 同路                         | 否                       | 错误诊断                |
| glb-load-failed     | GLB url 404/损坏            | 既有 model-load-failed 诊断路径不变                   | 否                       | 错误 UI(现有能力)       |
| sim-script-error    | 模拟器表达式异常            | 演示页 try/catch,点值保持上次值                       | 是(下个 tick)            | 数值停更不崩页          |

## Test Strategy

档位选择(三选一):`建议有测`

本档选择:建议有测——新符号/新引擎面为普通功能;但 SceneJSON 解析与注册(新公共契约)按「必须自动化」补判别性单测(旧实现下 `scene.json` 直接报错/忽略,新实现渲染并注册 name 对象)。演示页以 e2e 冒烟(挂载/关键断言)覆盖。

## Execution Plan

### Phase 1 - SCADA 符号库扩充(24 → 37)

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/{device,pipe,instrument,sensor-control}/`、`symbols/symbol-types.ts`、`symbols/register-builtin.ts`、`editor/palette/palette-filter.ts`、i18n 资源

- Item Types: `Fix | Proof`

- [x] `ScadaSymbolCategory` 增加 `'electrical'`;palette 分组与 CATEGORY_LABEL_KEYS + i18n 键补电气族标签(缺省键回退 other 的行为保留)
- [x] 设备族 5 图元(`createDeviceSymbol` 装配器):`scada-device-tank`(罐体+液位内胆,level fraction prop)、`scada-device-heat-exchanger`(壳管式)、`scada-device-conveyor`(带面+滚筒,run 态 rotate)、`scada-device-gate-valve`(闸板开度 prop)、`scada-device-check-valve`(流向翻板,flow 态)
- [x] 管件族 3 图元:`scada-pipe-elbow`(90° 弯头)、`scada-pipe-tee`(三通)、`scada-pipe-cross`(四通),复用 pipe 惯例(可绑 flow 流动动画)
- [x] 电气族 2 图元(`createDeviceSymbol` + category electrical):`scada-elec-breaker`(合/分闸状态形态)、`scada-elec-transformer`(双绕组)
- [x] 仪表族 2 图元:`scada-instrument-trend`(value prop 内部环形缓冲 + polyline 历史,applyProps 增量重绘)、`scada-instrument-numeric`(LED 数值,value/unit/format/digits)
- [x] 传感控制族 1 图元:`scada-sensor-control-alarm-light`(警灯,alarm 态 blink + 光晕)
- [x] 13 图元全部注册进 `builtinScadaSymbolDefinitions`;每个图元 focused 单测(创建/尺寸 resize 钩子/状态样式/专属 prop 路由),对齐既有 device-symbols.test.ts 粒度
- [x] Proof:registry 计数单测 24→37;palette 分组单测(电气族新组出现);`registerScadaRenderers` 后编辑器 palette 渲染含新组(现有 editor 测试基建复用)

Exit Criteria:

- [x] `registerBuiltinScadaSymbols()` 后 `symbol-registry` 含 37 图元;13 个新 type 可创建、resize/状态/专属 prop 单测绿
- [x] 编辑器 palette 出现「电气」分组且 13 新图元出现在对应分组(单测证据)
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿

### Phase 2 - 3D 薄桥接:SceneJSON 接入 + 契约扩充

Status: completed
Targets: `packages/flux-renderers-3d/src/schemas.ts`、`engine/scene-manager.ts`、`engine/primitive-factory.ts`、`engine/label-sprite.ts`(新)、`renderer/three-canvas.tsx`、`ai/threejs-schema.json`

- Item Types: `Fix | Decision | Proof`

- [x] Decision:scene 双形态裁定并落 schemas 注释——`{ models: [...] }`(既有自定义图元,兼容保留)与 `{ json: <SceneJSON> }`(three 原生,ObjectLoader 直载,二选一);bindings/events 对 json 路径按对象 `name` 寻址,管理模型注册遍历 scene 图谱(name 唯一性约定写入契约)
- [x] SceneJSON 解析装配:parse 失败 → `scene-json-invalid` onError;装配后 traverse 注册带 name 的 Object3D 进 models Map(与既有 pending 绑定队列/ready latch/tween 队列兼容;实现要点:`scene-manager.ts:249` 的 `[...config.models]` 需先按形态分流避免 json 形态 TypeError;name 对象合成最小 ModelConfig,id=name、interactive 缺省 false 保持既有拾取门控,交互需求由 schema 显式约定;SceneJSON 自带相机与 `CameraConfig` 必填字段的归一规则写入契约注释)
- [x] `PrimitiveMaterialConfig` 增加 `metalness/roughness/emissive/emissiveIntensity`(standard 材质);`CameraConfig` 增加 `controls?: { autoRotate?, autoRotateSpeed?, minDistance?, maxDistance?, maxPolarAngle?, enablePan? }` 并接入 controlsFactory 后配置;`EnvironmentConfig` 增加 `toneMapping?: 'none' | 'aces' | 'reinhard'`(缺省维持现状)
- [x] `PrimitiveGeometryType` 增加 `tube`(points+radius+segments,CatmullRomCurve3)与 `capsule`(radius/length)
- [x] `ModelConfig` 增加 `label?: string`:CanvasTexture Sprite 挂为模型子节点(engine/label-sprite.ts),受 visible 绑定联动
- [x] Decision:renderer 侧空态判别支持 json 形态——`three-canvas.tsx:44-45` 现以 `scene.models` 数组判 isEmpty,json 形态会被误判 empty(empty 覆盖层遮挡画布且错误 UI 被门控);裁定 json 存在且解析通过即非空,`data-three-scene-state` 断言由 e2e 承载(three-gallery.spec expectTabReady 断言 json tab ready,结构上排除 empty)
- [x] 单测:json 解析成功/失败判别(旧实现无 json 形态,必挂)、name 对象注册与绑定寻址、材质新字段、controls 配置、toneMapping、tube/capsule 工厂、label sprite 挂载与清理(dispose 链)
- [x] `ai/threejs-schema.json` 校验 schema 同步新字段

Exit Criteria:

- [x] `{ json }` 场景渲染并使 bindings 按 name 生效(单测:绑定写入 name 对象属性值变化)
- [x] 新契约字段单测绿;`pnpm --filter @nop-chaos/flux-renderers-3d test` 全绿
- [x] 既有 `models[]` 路径行为不变(既有套件零回归,判别 = 新 json 判别测试)

### Phase 3 - SCADA 演示画廊

Status: completed
Targets: `apps/playground/src/pages/scada-industrial-simulator.ts`(新)、`scada-gallery-demo.tsx`(新)、`scada-pressure-demo.tsx`、`domain-route-entries.ts`、`domain-route-pages.tsx`

- Item Types: `Fix | Proof`

- [x] 共享信号模拟器 `scada-industrial-simulator.ts`:tag 化信号源(sine/random-walk/square/step-event)+ 周期 tick + 手动故障注入,供画廊/pressure 复用
- [x] `scada-gallery-demo.tsx` 三场景 tab:①水处理泵房(新 tank×2/pump/gate-valve/check-valve/elbow/tee/trend/numeric/alarm-light + 启停控制 setPointValue + 液位联锁 + DOM 告警条)②配电监控(transformer/breaker 合分闸 + 母线 + 负荷 progress + 过载告警)③灌装产线(conveyor run + 光电计数 + 灌装阀 + 堆叠灯);全场景模拟器驱动非 static
- [x] pressure-demo tab1:4 个 static 变量改为模拟器 + 绑定 + 动画;核对/修正 `scada-pressure-demo.spec.ts` 断言
- [x] 路由注册 `scada-gallery` entry + lazy 页面;home 卡片自动派生
- [x] e2e `scada-gallery.spec.ts`:三 tab 图元挂载/实时值变化/告警联动/控制按钮写穿(trend 环形缓冲增长断言由包内单测 expanded-symbols.test.ts 承载)

Exit Criteria:

- [x] 三场景全部实时数据驱动(无全 static 场景);新图元在新场景中被真实使用
- [x] `scada-gallery.spec.ts` 绿;`scada-pressure-demo.spec.ts` 修正后绿(sweep 105 passed 零回归)

### Phase 4 - 3D 示例画廊

Status: completed
Targets: `apps/playground/src/pages/three-gallery-schemas.ts`(新)、`three-gallery-demo.tsx`(新)、`apps/playground/package.json`、路由两文件

- Item Types: `Fix | Proof`

- [x] 6 tab:①图元与材质(metalness/roughness 球格 + tube/capsule + toneMapping 对照)②灯光阴影(三点布光 + 阴影)③原生 three.js JSON(`{ json }` 场景 + name 绑定驱动,展示 ObjectLoader 路径)④GLB 加载(GLTFExporter 现场导出内置组合场景 → url 喂第二画布 initialAnimation 播放,零外部资产)⑤关键帧与交互(state/event clip + hover/click + label 标注)⑥数字孪生泵站(IndustrialAdapter + 合成 openSocket → 绑定驱动泵旋转/罐液位/告警 emissive 变色 + 点击出详情面板——three-industrial-demo 数据源与 3D 场景首次端到端打通)
- [x] 路由注册 `three-gallery` + lazy;playground 声明 three(0.186.0)+ `@types/three`(0.186.0)依赖
- [x] e2e `three-gallery.spec.ts`(6 tab,schemas 实体文件为 three-gallery-schemas.tsx):canvas ready/像素非零(SwiftShader 口径)/json tab 绑定生效(GLB tab 导出-加载完成态)/twin tab 标签镜像随 socket 帧变化

Exit Criteria:

- [x] 6 示例页全部可跑且 e2e 断言绿;数字孪生 tab 完成数据源→3D 端到端联动
- [x] 既有 three 4 spec 零回归

### Phase 5 - 用户文档与 owner docs

Status: completed
Targets: `flux-guide/19-scada.md`、`flux-guide/20-three-canvas.md`、`flux-guide/README.md`、`docs/components/industrial-hmi/design-symbols.md`、`docs/components/threejs-integration/design-renderer.md`

- Item Types: `Fix`

- [x] `19-scada.md`(系统化用户指南):符号库总表(37 图元分类)/点表与绑定/状态机与动画/编辑器操作/三画廊场景 schema 节选;与既有 cookbook 分工——`design-patterns/scada.md`、`scada-editor.md` 保持原位,19 章链接引用不重复其内容,README 双索引互链
- [x] `20-three-canvas.md`:scene 双形态(models 自定义 vs json 原生)/材质灯光相机契约/绑定与关键帧/GLTF/数字孪生接入(IndustrialAdapter)/6 示例导览
- [x] README 索引补两章;design-symbols.md 符号清单补 13 图元;design-renderer.md 增 SceneJSON/材质/controls/toneMapping/label 契约节

Exit Criteria:

- [x] 两新章落盘且 < 40KB,示例配置与 live 代码行为一致(抽查);owner docs 新契约节与实现一致

### Phase 6 - 收口

Status: completed
Targets: 全仓库

- Item Types: `Proof`

- [x] 全量门禁五项(`pnpm typecheck` / `build` / `lint` / `test` / `check`)通过且零新增红——结果只记入 Closure Gates,不在此双记账
- [x] 受影响 e2e 全量:`npx playwright test tests/e2e/ --grep "scada|three" --retries=1`(grep 命中文件与测试名,实际 25 spec 文件)——105 passed / 0 failed(1 flaky 已加固复跑绿);画廊新 8 用例(3+5)
- [x] dev log `docs/logs/2026/10-10.md` 收口条目;提交(full-green verification)
- [ ] 独立子代理 closure audit(fresh session)通过后置 `completed`

Exit Criteria:

- [ ] 五门禁零新增红;closure audit 证据落 plan

## Draft Review Record

- Reviewer / Agent: independent sub-agent(fresh session,agent_b225c292)
- Verdict: `revised`(首轮 0 Blocker / 3 Major / 4 Minor;M1 flux-guide scada cookbook 已存在→改分工链接策略、M2 e2e 计数 12→13、M3 renderer 空态判别缺项;Minor m1-m4 并入修订)
- Rounds: 1
- Findings addressed: M1(Phase 5 改为与 design-patterns/scada.md、scada-editor.md 链接分工 + baseline 更正)/ M2(Phase 6 与 closure 清单 13)/ M3(Phase 2 增 renderer 空态判别 item + Decision)/ m1(.glb 措辞)/ m2(SceneJSON 落地要点并入 item)/ m3(@types/three)/ m4(Phase 6 不双记账)

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复(本次无既存 live defect,新增项以 Phase 内单测/e2e 收口)
- [x] 所有 in-scope confirmed contract drifts 已收敛(SceneJSON 契约、材质/相机/label/tube/capsule 契约、13 新图元契约均落 schemas/registry + 单测)
- [x] 行为/契约结果已达成(Phase 1-5 Exit Criteria 全勾)
- [x] 必要 focused verification 已完成(新符号 13 组、3D 引擎新面、两画廊 e2e)
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline(design-symbols / design-renderer / flux-guide 两章)
- [x] 由独立子 agent(fresh session)执行的 closure-audit 已完成并记录证据;执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

(暂无;执行中改判当场落本节)

## Non-Blocking Follow-ups

- SCADA `leafer-json` 透传符号类型(原生 LeaferJSON 直接入画,进一步薄桥接)——需先核 leafer 反序列化 API,不影响本轮契约
- 告警体系 schema 建模(限值/分级/确认链)+ 告警表图元(successor plan)
- 编辑器 inspector 动画编辑 / 点表管理面板 / 自定义符号入库
- post-processing / HDR envMap / DRACO-KTX2 / IFC(需契约变更评审)
- `ReconnectionManager.retryCount` getter、hover 高亮 schema 暴露、3D 主题联动(plan 533/534 遗留,与本轮正交)

## Closure

Status Note: 2026-10-10 收口。五个 Phase 全部 completed;五门禁(typecheck/build/lint/test/check)exit 0 零新增红;scada+three e2e sweep 105 passed/0 failed;独立 closure audit(1 Major = 记录数字口径,0 Blocker)按裁决完成 M-1 勘误(sweep grep 集合口径 + 画廊新 8 用例)与 m-1/m-2/m-3 顺带修正后 approved 实质成立,本 plan 置 completed。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent(fresh session,agent_4b2ba8f9,commit afde79407 = HEAD 审计)
- Evidence: 审计报告 verdict `revise`(1 Major M-1 e2e 记录口径 / 3 Minor m-1 e2e 承载层级、m-2 trend 单测承载层级、m-3 .tsx 文件名)——全部为 docs-only 记录修正,实质 Exit Criteria 逐条经直接观测证实(审计实跑 industrial 1720/1720、3d 237/237 分支 90.27%、playground 411/411、i18n 30/30、console-baseline exit 0、gallery+pressure 抽检 11/11);M-1 勘误 = dev log 与本 plan 修正为可复现 sweep 口径(--grep "scada|three" 25 文件 / 105 passed / 画廊新 8 用例);m-1/m-2/m-3 随同修正。审计员明示:M-1 修正后 Closure Gates audit 条目可勾、Plan Status 可置 completed。

Follow-up:

- 见 Non-Blocking Follow-ups
