# HCA6 Symbol Shapes 包级深审记录

> Audit Date: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA6. Symbol shapes 审计
> Plan: `docs/plans/2026-08-08-1121-1-industrial-hmi-hca6-symbol-shapes-audit.md`
> Scope: `packages/flux-renderers-industrial/src/symbols/` 5 族 27 源文件（base-shapes 11 + device 5 + instrument 5 + sensor-control 5 + pipe 1）
> Baseline: HEAD 2026-08-08，`pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（97 test files / 1307 tests）
> Dimension Set: `docs/skills/deep-audit-prompts.md` 23 维（symbol shapes 非复杂交互层，维度 21-23 可选触发；本层未强制触发，几何正确性按维度 21 抽查）

## 审计方法

逐文件过 23 维重点维度（几何正确性 / applyProps 路由正确性 / diff-resize 响应 / 状态驱动视觉 / 动画绑定 / create/applyProps 幂等与对称 / 类型安全），按族分组审查。抽查边界值（空 props / width=0 / height=0 / rotation=NaN / points=[] / value 超量程 / 无匹配 state / 无 imageUrl / 无 videoUrl / 深嵌套 group）。每条 finding 带 `文件:行` 证据。所有 finding 已 triage 为 P0/P1/P2/P3。

**default applyProps 路径基线（审计前核对）**：`scada-engine.ts:208-212` + `config-adapter.ts:157-161`——`definition.applyProps` 存在则调用，否则回落 `node.set(toNodePatch(node, patch))`。故无自定义 applyProps 的 base 图元（rect/round-rect/ellipse/polygon/text/image/video）width/height 经 `toNodePatch` 直接 `node.set({width,height})` 写节点，响应正确。

## 逐文件 finding 表

### base-shapes/common.ts（32 行）— toShapeAttrs 共享映射

| 维度          | 结论                                                                                                                                                                                                                                                                                                                          | 证据              | Triage |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------ |
| 03 映射穷尽性 | `toShapeAttrs` direct keys 13 个（x/y/width/height/rotation/visible/opacity/fill/stroke/strokeWidth/shadow/text/dashOffset）+ scale→scaleX/scaleY + strokeDash→dashPattern + fillStyle→fill（覆盖 fill 色值简写，I8.1）。base 图元 create 共用；text/image 等在 create 内追加专属键（fontSize/textAlign/url）。穷尽且无遗漏。 | `common.ts:5-30`  | 零发现 |
| 14 边界值     | `if (value !== undefined)` 守卫每键，undefined 跳过不发射空值。fillStyle 优先于 fill（后写覆盖）。                                                                                                                                                                                                                            | `common.ts:22,30` | 零发现 |

### base-shapes/rect.ts（35 行）— 矩形

| 维度          | 结论                                                                                                                                       | 证据            | Triage |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------ |
| 21 几何正确性 | create 经 toShapeAttrs + width/height 缺省兜底 100。无自定义 applyProps → default 路径 toNodePatch 写节点。width/height binding 响应正确。 | `rect.ts:29-34` | 零发现 |
| 14 边界值     | width=0 → Rect({width:0}) leafer 退化空图形，无 NaN/崩溃。                                                                                 | `rect.ts:31-32` | 零发现 |

### base-shapes/round-rect.ts（36 行）— 圆角矩形

| 维度          | 结论                                                                                         | 证据               | Triage |
| ------------- | -------------------------------------------------------------------------------------------- | ------------------ | ------ |
| 21 几何正确性 | 同 rect + cornerRadius=8 常量。create/applyProps 一致（无自定义 applyProps，default 路径）。 | `round-rect.ts:33` | 零发现 |

### base-shapes/ellipse.ts（35 行）— 椭圆

| 维度          | 结论                                                                           | 证据               | Triage |
| ------------- | ------------------------------------------------------------------------------ | ------------------ | ------ |
| 21 几何正确性 | 同 rect 模式。width/height → Ellipse 包围盒。default applyProps 路径响应正确。 | `ellipse.ts:29-34` | 零发现 |

### base-shapes/line.ts（65 行）— 线段

| 维度          | 结论                                                                                                                                                                                                                                                             | 证据                  | Triage                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------- |
| 21 几何正确性 | create：width/height → points `[0,0,width,height]`（LINE_DEFAULT_WIDTH=100/HEIGHT=0）。applyProps：width/height 变更重算 points，保留另一维度（读 currentPoints[2]/[3]）。defaultGeometryPoints resolver 与 create 同源常量。create/applyProps/bounds 三路同源。 | `line.ts:12-14,36-64` | 零发现（0900-2 B2 先验修复回归点） |
| 14 边界值     | height=0 → points=[0,0,100,0]，零高线段，defaultGeometryPoints 保证 fit 不退化（0900-2 D1）。                                                                                                                                                                    | `line.ts:10,60-63`    | 零发现                             |

### base-shapes/arrow.ts（65 行）— 箭头

| 维度          | 结论                                                                | 证据                | Triage |
| ------------- | ------------------------------------------------------------------- | ------------------- | ------ |
| 21 几何正确性 | 与 line 同构 + endArrow=true。applyProps 重算 points 与 line 同型。 | `arrow.ts:44,48-58` | 零发现 |

### base-shapes/pipe.ts（69 行）— 管道

| 维度          | 结论                                                                                                                    | 证据                  | Triage |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| 21 几何正确性 | 与 line/arrow 同构 + strokeCap='round' + fill→stroke 兜底（fill 定义而 stroke 未定义时）。applyProps 重算 points 同型。 | `pipe.ts:45-49,52-62` | 零发现 |
| 03 映射       | fill→stroke 兜底分支：defaults 同时声明 fill+stroke='#3f7b5a'，正常路径两键均在；分支仅对 author 只填 fill 的场景生效。 | `pipe.ts:46-48`       | 零发现 |

### base-shapes/polygon.ts（45 行）— 多边形

| 维度          | 结论                                                                                                                                                                        | 证据                     | Triage                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------- |
| 21 几何正确性 | create：`custom.points`（数组）优先，否则 DEFAULT_TRIANGLE。defaultGeometryPoints 返 DEFAULT_TRIANGLE（bounds 路径同源）。无 width/height schema 字段（points 驱动几何）。  | `polygon.ts:12-16,38-44` | 零发现                                 |
| 14 边界值     | `custom.points=[]`（空数组）→ `Array.isArray([])=true` → points=[]，leafer 退化空图形（不可见，无崩溃）。author-controlled 输入，空数组语义合理（author 显式清空 points）。 | `polygon.ts:41`          | P3-3（author-controlled，无 fallback） |

### base-shapes/text.ts（86 行）— 文本

| 维度          | 结论                                                                                                                                                                                                                                                                                                       | 证据                  | Triage |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| 21 几何正确性 | create：textSize→fontSize、align→textAlign、fontFamily/fontWeight 透传、textColor→fill（fill 未定义时）。自动宽（width 未定义）下 center/right 对齐：measureTextWidth 测量 → 设 width + 平移 x 到对齐锚。measureTextWidth 浏览器用 canvas measureText，happy-dom 回退 `length*fontSize*0.6` 确定性启发式。 | `text.ts:14-36,59-85` | 零发现 |
| 14 边界值     | 空文本（text=''）+ center 对齐：measured=0，width=0，x=origin。退化但不崩溃。                                                                                                                                                                                                                              | `text.ts:35,71-82`    | 零发现 |
| 13 类型安全   | measureTextWidth try/catch 守卫 canvas 不可用（happy-dom）→ 落 fallback。metrics.width 经 `Number.isFinite && > 0` 守卫。                                                                                                                                                                                  | `text.ts:27-34`       | 零发现 |

### base-shapes/image.ts（52 行）— 图片

| 维度        | 结论                                                                                                                                                    | 证据               | Triage           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------- |
| 22 IO 边界  | URL 经 `engine.resolveImageUrl` 桥接（INV-1，引擎不直调 fetch）。无 engine → 直用 url。占位 background 灰块（加载中/失败均保持）。                      | `image.ts:36-41`   | 零发现           |
| 19 错误处理 | `node.on('error')` → 占位 + loadFailed=true。loadFailed 无画布级消费者（P1-8 契约冲突，I16 统一接线，design-symbols.md §9 已记录 Deferred）。非新缺陷。 | `image.ts:43-49`   | 不报告（已收敛） |
| 14 边界值   | 无 url（custom.url 空/非字符串）→ 不设 url，占位保留。                                                                                                  | `image.ts:9-12,36` | 零发现           |

### base-shapes/video.ts（44 行）— 视频

| 维度          | 结论                                                                                                                | 证据             | Triage |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| 21 几何正确性 | 静态占位帧（Rect + fill 占位色），stroke/strokeWidth guarded（0900-2 P2-7）。真实视频解码归 I10。URL 暂存节点属性。 | `video.ts:34-42` | 零发现 |
| 14 边界值     | 无 url → 不设 url，占位保留。                                                                                       | `video.ts:39`    | 零发现 |

### device/common.ts（75 行）— 设备族装配器

| 维度               | 结论                                                                                                                                                         | 证据                    | Triage |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------ |
| 04 parts 所有权    | `partsOf = new WeakMap<LeafNode, CompositeParts>()`，create 时 set，applyProps 时 get。node GC → parts 自动 GC。无泄漏。                                     | `common.ts:48,63-66,69` | 零发现 |
| 03 applyProps 路由 | `options.applyProps?.()` 图元专属增量钩子先执行 → `applyCompositeProps` 通用路由。valve 阀芯开度经此钩子。                                                   | `common.ts:68-73`       | 零发现 |
| 状态/动画声明      | `deviceStates`（run/stop/fault+blink）+ `deviceRunRotateAnimation`（run 态 rotate）。声明层由框架消费（HCA5 visual-state / HCA3 animator），shape 层只声明。 | `common.ts:24-34`       | 零发现 |

### device/motor.ts（57 行）— 电机

| 维度          | 结论                                                                                                                     | 证据                   | Triage                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ---------------------------- |
| 21 几何正确性 | body=Rect（cornerRadius=8）+ rotor=Ellipse（半径=min(w,h)\*0.3，中心 w/2,h/2）。create 与 resize hook 同源（0.3 系数）。 | `motor.ts:21-42,48-54` | 零发现                       |
| diff-resize   | `parts.resize` hook 注册（重算 body + rotor 中心/半径）。width/height 经 applyProps 响应。                               | `motor.ts:48-54`       | 零发现（0900-2 P2-4 回归点） |

### device/pump.ts（58 行）— 水泵

| 维度          | 结论                                                                                                                               | 证据                  | Triage |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| 21 几何正确性 | body=Rect（cornerRadius=w*0.5 圆形）+ impeller=Ellipse（半径=min(w,h)*0.32）。resize hook 重算 body（含 cornerRadius）+ impeller。 | `pump.ts:21-42,48-55` | 零发现 |
| diff-resize   | `parts.resize` hook 注册。                                                                                                         | `pump.ts:48`          | 零发现 |

### device/valve.ts（70 行）— 阀门

| 维度               | 结论                                                                                                                                                                     | 证据                   | Triage |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------ |
| 21 几何正确性      | body=Rect + core=Rect（开度阀芯，rotation=(1-openRatio)\*90）。resize hook 重算 body + core 相对锚点（保留 openRatio rotation）。                                        | `valve.ts:25-47,53-63` | 零发现 |
| 03 applyProps 路由 | `applyOptions.rotationTarget='root'` → symbol rotation 走 root（不与 core openRatio rotation 冲突）。applyProps 钩子：custom.openRatio → core rotation（先于通用路由）。 | `valve.ts:21,66-69`    | 零发现 |
| diff-resize        | `parts.resize` hook 注册。                                                                                                                                               | `valve.ts:53`          | 零发现 |

### device/fan.ts（68 行）— 风机

| 维度          | 结论                                                                                                                                  | 证据                 | Triage |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------ |
| 21 几何正确性 | body=Rect + blades=Group（4 扇叶 Ellipse，半径=min(w,h)*0.32，rotation=index*90）。resize hook 重算 body + blades 中心 + 各扇叶尺寸。 | `fan.ts:21-50,56-65` | 零发现 |
| diff-resize   | `parts.resize` hook 注册。                                                                                                            | `fan.ts:56`          | 零发现 |

### instrument/common.ts（48 行）— 仪表族装配器

| 维度            | 结论                                                                                                          | 证据                 | Triage |
| --------------- | ------------------------------------------------------------------------------------------------------------- | -------------------- | ------ |
| 04 parts 所有权 | WeakMap 同 device 模式。applyProps 钩子先于 applyCompositeProps。                                             | `common.ts:25,36-46` | 零发现 |
| 03 路由         | 无默认 states/animation 声明（仪表族状态色由实例声明或绑定消费）。量程换算归绑定层（bindings scale/format）。 | `common.ts:29-35`    | 零发现 |

### instrument/gauge.ts（77 行）— 仪表盘

| 维度          | 结论                                                                                                                                                     | 证据                   | Triage |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ |
| 21 几何正确性 | body=Ellipse（表盘）+ needle=Line（指针 points=[0,0,0,-r*0.72]）+ label=Text。半径=min(w,h)/2。resize hook 重算 body 表盘 + needle points + label 锚点。 | `gauge.ts:30-58,66-74` | 零发现 |
| diff-resize   | `parts.resize` hook 注册（无 extent part）。                                                                                                             | `gauge.ts:66`          | 零发现 |

### instrument/level.ts（68 行）— 液位计

| 维度          | 结论                                                                                                                                                                                                                        | 证据                   | Triage                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------ |
| 21 几何正确性 | body=Rect（罐体）+ liquid=Rect（液柱 extent part，y 锚定罐底）+ label=Text。applyProps 钩子：height → liquid.y=tankHeight-height（锚底），applyCompositeProps 路由 height→extent（liquid.height）。两步协作出正确液柱填充。 | `level.ts:28-56,63-67` | 零发现                                     |
| diff-resize   | extent part（liquid）注册。width/height→extent（既定语义，P2-4 Decision）。                                                                                                                                                 | `level.ts:38,59`       | 零发现（HCA5 P3-2：有 extent，非静默丢弃） |
| 14 边界值     | width 变更 → liquid.width=newWidth（create 有 width-4 内边距，applyProps 无）。液柱内边距在容器 resize 时丢失（cosmetic）。height（绑定值）路径正确，非容器 resize。                                                        | `level.ts:42,63-67`    | P3-2（cosmetic，容器 resize 非主用例）     |

### instrument/thermometer.ts（87 行）— 温度计

| 维度          | 结论                                                                                                                                                                                               | 证据                            | Triage                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------ |
| 21 几何正确性 | tube=Rect（cornerRadius=w/2）+ liquid=Rect（extent，BULB_RESERVE=-24 锚定感温泡顶）+ bulb=Ellipse + label=Text。create 与 applyProps 共用 BULB_RESERVE 单一常量（0900-2 P2-9 消除首帧 8px 跳变）。 | `thermometer.ts:12,35-74,82-86` | 零发现                         |
| diff-resize   | extent part（liquid）注册。                                                                                                                                                                        | `thermometer.ts:46,77`          | 零发现（HCA5 P3-2：有 extent） |
| 14 边界值     | 同 level：width 变更丢失 liquid 内边距（cosmetic）。                                                                                                                                               | `thermometer.ts:50`             | P3-2（cosmetic）               |

### instrument/progress.ts（62 行）— 进度条

| 维度          | 结论                                                                                                                                   | 证据                | Triage                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------ |
| 21 几何正确性 | track=Rect（body，cornerRadius=h/2）+ bar=Rect（extent，x=2,y=2,width=0,height=h-4）+ label=Text。width 绑定 → bar.width（进度填充）。 | `progress.ts:28-55` | 零发现                         |
| diff-resize   | extent part（bar）注册。无 applyProps 钩子（width→bar 既定语义）。                                                                     | `progress.ts:39,58` | 零发现（HCA5 P3-2：有 extent） |
| 14 边界值     | height 变更 → bar.height=newHeight（create 有 height-4 内边距，applyProps 无）。cosmetic。                                             | `progress.ts:44`    | P3-2（cosmetic）               |

### sensor-control/common.ts（64 行）— 传感控制族装配器

| 维度  | 结论                                                                                                               | 证据                    | Triage |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------ |
| 04/03 | WeakMap + applyProps 路由同 device/instrument 模式。`sensorControlStates`（run/stop/fault+blink）同 deviceStates。 | `common.ts:17-24,37-63` | 零发现 |

### sensor-control/sensor.ts（52 行）— 传感器

| 维度          | 结论                                                                                                  | 证据                    | Triage |
| ------------- | ----------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| 21 几何正确性 | stem=Rect（body）+ probe=Ellipse（x=w/2,y=10,size=w\*0.6）。resize hook 重算 body + probe 中心/尺寸。 | `sensor.ts:18-38,45-49` | 零发现 |
| diff-resize   | `parts.resize` hook 注册。                                                                            | `sensor.ts:45`          | 零发现 |

### sensor-control/indicator.ts（61 行）— 指示灯

| 维度          | 结论                                                                                                                                                                      | 证据                       | Triage                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------- |
| 21 几何正确性 | lamp=Ellipse（body，状态色目标）+ housing=Rect（背景层）。子序 [housing,lamp]（0653-2 P1-2 修复：原序 lamp 被 housing 遮挡）。resize hook 重算 housing + lamp 中心/尺寸。 | `indicator.ts:21-50,53-58` | 零发现（P1-2 先验修复回归点） |
| diff-resize   | `parts.resize` hook 注册。                                                                                                                                                | `indicator.ts:53`          | 零发现                        |

### sensor-control/switch.ts（76 行）— 开关

| 维度          | 结论                                                                                                                                                                           | 证据                          | Triage                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ----------------------------------------- |
| 21 几何正确性 | base=Rect（body，cornerRadius=h/2）+ lever=Rect（core，on/off 位态）。applyProps 钩子：custom.on → lever.x。resize hook 重算 body + lever，按 lever.x 推断 on/off 位态重定位。 | `switch.ts:24-50,55-67,70-75` | 零发现                                    |
| diff-resize   | `parts.resize` hook 注册。                                                                                                                                                     | `switch.ts:55`                | 零发现                                    |
| 14 边界值     | resize hook 用 `lever.x !== LEVER_OFF_X(3)` 推断 on/off。width===height 时 on 位 x=w-h+3=3=LEVER_OFF_X → 误判 off。需 width===height 边界（默认 48×28 不触发）。               | `switch.ts:60-62`             | P3-1（边缘 case，author-controlled 尺寸） |

### sensor-control/button.ts（54 行）— 按钮

| 维度          | 结论                                                                                                                        | 证据                    | Triage |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| 21 几何正确性 | base=Rect（body）+ cap=Rect（x=4,y=3,width=w-8,height=h-6 内边距）。resize hook 重算 body + cap 宽高（保留 x=4/y=3 锚点）。 | `button.ts:18-39,46-51` | 零发现 |
| diff-resize   | `parts.resize` hook 注册。                                                                                                  | `button.ts:46`          | 零发现 |

### pipe/pipe-junction.ts（118 行）— 管道接头

| 维度                          | 结论                                                                                                                                                                                                                                                                                                                         | 证据                             | Triage                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| 21 几何正确性                 | body=Rect + stubs=Line[]（连接点，points 按 connection 归一化坐标 × width/height 派生）。create 几何正确。                                                                                                                                                                                                                   | `pipe-junction.ts:62-89`         | 零发现                                                                                  |
| 03 applyProps 路由            | flow/dashOffset/strokeWidth 增量路由到 stubs（0900-2 P2-8）。flowPatch(enabled/dash 消费)。                                                                                                                                                                                                                                  | `pipe-junction.ts:26-30,102-115` | 零发现（P2-8 先验修复回归点）                                                           |
| diff-resize（HCA5 P3-2 复核） | applyProps 调 `applyCompositeProps(node, {root, body}, props)`——parts **无 extent、无 resize hook**。width/height 经 applyCompositeProps 的 EXTENT_FIELDS 分支 → `parts.resize?.()` undefined → **静默丢弃**。body 不 resize、stubs 不重算。`setSymbolProps(id,{width})` / width 绑定 → 接头几何 stuck 在 create-time 尺寸。 | `pipe-junction.ts:95-98,116`     | **P2-1**（live 渲染缺陷：public setSymbolProps / width 绑定静默失效，单文件低成本修复） |
| 14 边界值                     | connections=[] → stubs=[]，仅 body。无崩溃。                                                                                                                                                                                                                                                                                 | `pipe-junction.ts:73-75,78`      | 零发现                                                                                  |

## HCA5 P3-2 per-shape 裁定表（23 行）

> HCA5 P3-2（`composite.ts:72-77`）：无 extent part 且无 `parts.resize` hook 时，width/height 静默丢弃。本表逐图元核查 12 composite + 1 pipe-junction + 10 base-shapes。

| #   | 图元                     | 族                                             | extent part? | resize hook?                         | width/height 响应路径                          | 裁定                                  |
| --- | ------------------------ | ---------------------------------------------- | ------------ | ------------------------------------ | ---------------------------------------------- | ------------------------------------- |
| 1   | device-motor             | composite                                      | 否           | 是（motor.ts:48）                    | resize hook 重算 body+rotor                    | ✅ confirmed OK                       |
| 2   | device-pump              | composite                                      | 否           | 是（pump.ts:48）                     | resize hook 重算 body+impeller                 | ✅ confirmed OK                       |
| 3   | device-valve             | composite                                      | 否           | 是（valve.ts:53）                    | resize hook 重算 body+core                     | ✅ confirmed OK                       |
| 4   | device-fan               | composite                                      | 否           | 是（fan.ts:56）                      | resize hook 重算 body+blades                   | ✅ confirmed OK                       |
| 5   | instrument-gauge         | composite                                      | 否           | 是（gauge.ts:66）                    | resize hook 重算 body+needle+label             | ✅ confirmed OK                       |
| 6   | instrument-level         | composite                                      | 是（liquid） | 否（extent 路由）                    | width/height→liquid（既定语义）                | ✅ confirmed OK（by-design P2-4）     |
| 7   | instrument-thermometer   | composite                                      | 是（liquid） | 否（extent 路由）                    | width/height→liquid（既定语义）                | ✅ confirmed OK（by-design P2-4）     |
| 8   | instrument-progress      | composite                                      | 是（bar）    | 否（extent 路由）                    | width/height→bar（既定语义）                   | ✅ confirmed OK（by-design P2-4）     |
| 9   | sensor-control-sensor    | composite                                      | 否           | 是（sensor.ts:45）                   | resize hook 重算 body+probe                    | ✅ confirmed OK                       |
| 10  | sensor-control-indicator | composite                                      | 否           | 是（indicator.ts:53）                | resize hook 重算 housing+lamp                  | ✅ confirmed OK                       |
| 11  | sensor-control-switch    | composite                                      | 否           | 是（switch.ts:55）                   | resize hook 重算 base+lever                    | ✅ confirmed OK                       |
| 12  | sensor-control-button    | composite                                      | 否           | 是（button.ts:46）                   | resize hook 重算 body+cap                      | ✅ confirmed OK                       |
| 13  | pipe-junction            | pipe（非 composite，借用 applyCompositeProps） | 否           | **否**                               | **静默丢弃**（EXTENT_FIELDS→resize?.() no-op） | ❌ **P2-1 升级修复**（见 finding 表） |
| 14  | rect                     | base                                           | N/A          | N/A（default 路径）                  | toNodePatch→node.set({width,height})           | ✅ confirmed OK                       |
| 15  | round-rect               | base                                           | N/A          | N/A（default 路径）                  | toNodePatch→node.set({width,height})           | ✅ confirmed OK                       |
| 16  | ellipse                  | base                                           | N/A          | N/A（default 路径）                  | toNodePatch→node.set({width,height})           | ✅ confirmed OK                       |
| 17  | line                     | base                                           | N/A          | 是（line.ts:46，自定义 applyProps）  | width/height→重算 points                       | ✅ confirmed OK                       |
| 18  | arrow                    | base                                           | N/A          | 是（arrow.ts:48，自定义 applyProps） | width/height→重算 points                       | ✅ confirmed OK                       |
| 19  | pipe                     | base                                           | N/A          | 是（pipe.ts:52，自定义 applyProps）  | width/height→重算 points                       | ✅ confirmed OK                       |
| 20  | text                     | base                                           | N/A          | N/A（default 路径）                  | toNodePatch→node.set({width})                  | ✅ confirmed OK                       |
| 21  | polygon                  | base                                           | N/A          | N/A（default 路径）                  | 无 width/height schema（custom.points 驱动）   | ✅ N/A                                |
| 22  | image                    | base                                           | N/A          | N/A（default 路径）                  | toNodePatch→node.set({width,height})           | ✅ confirmed OK                       |
| 23  | video                    | base                                           | N/A          | N/A（default 路径）                  | toNodePatch→node.set({width,height})           | ✅ confirmed OK                       |

**HCA5 P3-2 复核结论**：12 个 composite 族图元中，9 个注册了 resize hook（motor/pump/valve/fan/gauge/sensor/indicator/switch/button），3 个声明了 extent part（level/thermometer/progress）——**全部不静默丢弃**。HCA5 P3-2 的 composite 族子集完全消解。10 个 base-shapes 中，3 个 points-based（line/arrow/pipe）自定义 applyProps 重算 points，其余 7 个走 default toNodePatch 路径响应 width/height（polygon 无 width/height schema）——**全部响应正确**。唯一缺口：**pipe-junction**（借用 applyCompositeProps 但 parts 无 extent/resize）→ 升级 P2-1 修复。

## Finding Triage 汇总

| ID   | 严重程度 | 文件                                               | 一句话摘要                                                                                                                                                         | 处置                                                                                                      |
| ---- | -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| P2-1 | P2       | `pipe-junction.ts:95-98,116`                       | pipe-junction applyProps 调 applyCompositeProps 传 parts 无 extent/resize → width/height 静默丢弃（body 不 resize、stubs 不重算），setSymbolProps/width 绑定 stuck | **fixed**（Phase 2）：failing-first proof → 补 width/height resize 逻辑（重算 body + stubs points）→ 转绿 |
| P3-1 | P3       | `switch.ts:60-62`                                  | resize hook 用 `lever.x !== 3` 推断 on/off，width===height 时 on 位 x=3 误判 off（边缘 case）                                                                      | 归 HCA-CR（watch-only，默认 48×28 不触发）                                                                |
| P3-2 | P3       | `level.ts:42`/`thermometer.ts:50`/`progress.ts:44` | extent 族容器 width/height 变更丢失 create-time 内边距（cosmetic，容器 resize 非主绑定用例）                                                                       | 归 HCA-CR（cosmetic watch-only）                                                                          |
| P3-3 | P3       | `polygon.ts:41`                                    | `custom.points=[]` 空数组 → 空图形无 fallback（author-controlled）                                                                                                 | 归 HCA-CR（author-controlled）                                                                            |
| P3-4 | P3       | `composite.ts:53-56`/`common.ts:20-22`             | rotation/几何 NaN 无守卫直传 leafer（defense in depth，binding 层应产合法值）                                                                                      | 归 HCA-CR（防御纵深）                                                                                     |

**P0/P1 live defect：零。** symbol shapes 层经 0900-2（几何/属性 P2）+ HCA5（框架 P1）先验修复后，无 P0/P1 live defect。审计确认的 P2-1（pipe-junction resize）当场 test-first 修复（Phase 2）。

## Phase 2 修复记录

### P2-1 pipe-junction width/height resize（HCA5 P3-2 升级修复）

- **failing-first proof**：`pipe/pipe-symbols.test.ts` 新增 `scada-pipe-junction width/height resize` describe 块，2 test。修复前 `setSymbolProps('j1',{width:160,height:80})` 后 body.width 仍为 80（静默丢弃）→ 断言 160 失败（`Expected: 160, Received: 80`）。
- **fix 落点**：`pipe/pipe-junction.ts`：
  - `JunctionState` 增 `connections: ScadaPipeConnection[]` 字段（:19-23），create 时 `junctionState.set(root, { body, stubs, connections })`（:105）。
  - applyProps 增 width/height resize 分支（:108-124）：重算 `body.{width,height}` + 各 stub `points`（按 connection 归一化坐标 × 新尺寸派生，与 create 同公式）。
  - import 增 `setAttrs`（:2）。
- **修复后验证**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（97 test files / 1309 tests，+2 regression）。

## 先验修复回归抽查点

以下先验修复构成本 plan Current Baseline，Phase 3 抽查其行为仍成立：

- 0900-2 P2-4 composite resize hook 路由（motor/pump/valve/fan/gauge/sensor/indicator/switch/button 9 个 resize hook + level/thermometer/progress 3 个 extent part）→ 经 P2-1 pipe-junction 修复后，23 图元 width/height 响应全覆盖。
- 0900-2 B2 points-based applyProps 重算（line/arrow/pipe 3 个）→ `line.ts:46-56`/`arrow.ts:48-58`/`pipe.ts:52-62`，回归测试在 base-shapes style-refinement.test.ts 全绿。
- 0900-2 P2-9 thermometer BULB_RESERVE 单一常量（create↔applyProps 一致）→ `thermometer.ts:12,49,85`。
- 0653-2 P1-2 indicator 子序 swap（lamp 不被 housing 遮挡）→ `indicator.ts:42-50`。
- HCA5 P1-1 fontFamily/fontWeight/align diff 守卫 → `check-scada-symbol-keys.mjs`（text.ts 消费此三字段）。

## owner doc 一致性核对（Phase 3 item 1）

核对 `docs/components/industrial-hmi/design-symbols.md` §4.4/§5/§10 与 live shapes：

| 契约                                                                                  | doc 位置                     | live 位置                                                       | 结论                                                                      |
| ------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| §4.4 23 图元分类映射（10 base + 4 device + 4 instrument + 4 sensor-control + 1 pipe） | §4.4（line 163-169）         | `register-builtin.ts:13-48`（24 entries = 23 shapes + 1 group） | 一致                                                                      |
| §5 字段分类（geometry/style/text/flow/custom/states/bindings/animations/events）      | §5（line 173-182）           | `symbol-types.ts:16-45`（ScadaSymbolProps）                     | 一致                                                                      |
| §10 points-based width/height 契约（line/arrow/pipe 重算 points）                     | §10（line 214，B2 Decision） | `line.ts:46-56`/`arrow.ts:48-58`/`pipe.ts:52-62`                | 一致                                                                      |
| §10 复合族 resize 契约（P2-4 Decision）                                               | §10（line 215）              | `composite.ts:72-77` + 9 resize hook + 3 extent part            | 一致（composite 族子集，pipe-junction 非 composite 不在此 Decision 范围） |
| §10 create/update 几何一致契约（BULB_RESERVE/video guard/stub strokeWidth）           | §10（line 216）              | `thermometer.ts:12`/`video.ts:36`/`pipe-junction.ts:85`         | 一致                                                                      |
| §10 getSymbolProps 读写对称（P2-10）                                                  | §10（line 217）              | `symbol-factory.ts:54-105`（HCA5 已核）                         | 一致                                                                      |

**结论：无 drift。** §4.4 23 图元分类与 register-builtin 一致；§10 P2-4 复合族 resize Decision 范围为 composite 族（device/instrument/sensor-control），pipe-junction（pipe 族，自定义 applyProps）不在此 Decision 范围，其 width/height 响应由 P2-1 修复落地（code-level fix，审计记录已文档化，非 doc drift）。doc 无需同步。

## 先验修复回归抽查（Phase 3 item 2）

`pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（97 test files / 1309 tests）。覆盖先验修复的回归测试文件均绿：

- `pipe/pipe-symbols.test.ts`（425 行）— P2-1 pipe-junction resize（新增）+ P2-8 stub strokeWidth + B2 flow diff 链路。
- `device/device-symbols.test.ts`（524 行）— P2-4 device resize hook（motor/pump/valve/fan）。
- `instrument/instrument-symbols.test.ts`（376 行）— P2-4 instrument resize hook（gauge）+ extent routing（level/thermometer/progress）+ P2-9 BULB_RESERVE。
- `sensor-control/sensor-control-symbols.test.ts`（399 行）— P2-4 sensor-control resize hook + P1-2 indicator 子序 swap。
- `base-shapes/style-refinement.test.ts`（107 行）— B2 points-based applyProps（line/arrow/pipe）。
- `state-visual.test.ts`（HCA5 范围）— visual-state STYLE_RESET_DEFAULTS 穷尽守卫。

**回归抽查通过**：0900-2 几何/属性 P2 + HCA5 P1-1 漏键守卫行为均仍成立。

## 喂入 HCA-BL（Phase 3 item 3）

> 正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片。以下为本层 finding 喂入清单。

| 候选                                     | 复杂/跨层                                                                                                                                                                | 归档建议                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| P2-1 pipe-junction width/height 静默丢弃 | 单包（pipe-junction.ts），根因中非显然（HCA5 P3-2 裁定聚焦 composite 族 composite.ts:72-77，未覆盖 pipe-junction 自定义 applyProps 借用 applyCompositeProps 的同型缺口） | 复杂度中（test-first 已修 + 2 regression；可被 applyProps 重构再引入），建议归 `docs/bugs/` |

> **HCA-BL 回链（已闭环）**：P2-1 pipe-junction 已归档为 `docs/bugs/80-industrial-hmi-component-audit-pipe-junction-resize-silent-drop.md`（HCA-BL 裁定：归档——非显然根因（EXTENT_FIELDS 静默丢弃）+ 回归测试 + applyProps 重构易再引入）。
