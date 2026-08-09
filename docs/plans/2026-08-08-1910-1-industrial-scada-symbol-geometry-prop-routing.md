# 1 Industrial SCADA Symbol Geometry & Prop Routing

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md` (A1, A11, A12)
> Related: `docs/backlog/industrial-hmi-component-audit-roadmap.md`; first-wave sibling plans `2026-08-08-1809-{1,2,3}-*`（validation / editor state / canvas correctness，覆盖 A9/A10/A5/P1-1~P1-5）
> Execution Order: {1} — 含本轮唯一 P0（A1 复合图元几何），独立于其它 plan；优先级最高。无 hard dependency，可先行。

## Purpose

收口 `flux-renderers-industrial` 符号族的「几何定位 / 尺寸路由 / 样式路由」三类系统性缺陷，其中 A1 是本轮 audit 唯一的 **P0**：

- **A1（P0）**：复合图元（device / instrument / sensor-control 族）的内层子形状（`Ellipse`/`Group`）按「中心点」语义放置（`x: width/2, y: height/2`），但 `toShapeAttrs` / `createCompositeGroup` 从不设置 leafer 的 `around`，而 leafer-ui 2.2.9 在 `around`/`origin` 均未设置时默认 `x,y = 包围盒左上角`（top-left）。结果：每个复合仪表/设备的内层表盘/叶轮/转子在真实画布上整体偏到右下并溢出符号框一半。更危险的是**测试矩阵无法发现它**——`leafer-ui-mock` 是纯属性袋，明确对 `getBoundsToWorld`/`getBounds`/`worldBox` 抛错（mock 不建模 bounds），故 ~1340 条单测全绿而几何是错的，若干 `*-symbols.test.ts` 把错值（如 `rotor.x === width/2`）当期望固化。内部矛盾本身是铁证：pump body `Rect{x:0,y:0}` 用 top-left 填满框（正确），同组 impeller `Ellipse{x:width/2,y:height/2}` 用中心点——两种约定不可能同时正确。
- **A11（P1）**：`level` / `thermometer` / `progress` 三个仪表无 `parts.resize` hook，width/height 经 `applyCompositeProps` 的 `EXTENT_FIELDS` 分支只路由到 extent（液柱/bar），罐体/管体/track 永不 resize——改几何尺寸时容器留在 create 期尺寸、液柱溢出罐体。与 sibling（device/gauge/sensor-control 在 plan 2026-08-06-0900-2 P2-4 已加 resize hook）纪律不一致。
- **A12（P1）**：`pipe-junction.applyProps` 把 flow/dashOffset/strokeWidth 路由到 stubs（4 个接线头），但随后调 `applyCompositeProps(node, {root, body}, props)` 只传 `{root, body}` → `BODY_FIELDS`（fill/stroke）只到 body，stubs 保留 create 期颜色 → 改色后半截接线头不变色。

三者同属 `symbols/**` 子系统，共享同一 owner doc（`design-symbols.md`）与同一 proof 策略：A1 的修复网（真实 leafer `boxBounds` 断言）能一次性吊起 A1/A11/A12 及未来同类几何漂移。

## Current Baseline

- `symbols/base-shapes/common.ts:3-31` `toShapeAttrs` 透传 x/y/width/height/fill/stroke/…，**从不**设置 `around`（live 核对确认）。
- `symbols/composite.ts:94-100` `createCompositeGroup`：`new Group(toShapeAttrs(props))`，attrs 不含 `around`；`:100` `body: children[0]?.node`。
- `symbols/instrument/gauge.ts:30-39` body `Ellipse({x: width/2, y: height/2, width, height})`（中心点放置，无 `around`）；`:40-48` needle `Line({x: width/2, y: height/2, points:[0,0,0,-radius*0.72]})`；`:66-74` 有 `parts.resize`（重算 body 中心 + needle points + label）。
- `symbols/device/pump.ts:21-31` body `Rect({x:0,y:0,width,height,cornerRadius:width*0.5})`（top-left，正确填满框）；`:33-42` impeller `Ellipse({x: width/2, y: height/2, width: radius*2, height: radius*2})`（中心点，无 `around` → 在真实画布偏到 (28,28)→(64,64)，圆心 (46,46) 而非 body 圆心 (28,28)）；`:48-55` 有 `parts.resize`。
- 同型中心点放置：`motor.ts` / `fan.ts` / `indicator.ts` / `sensor.ts` / `thermometer.ts` 内层 `Ellipse`/`Group` 均按 `width/2`（audit 标注，本计划 Phase 1 将全量核对清单）。
- `symbols/instrument/level.ts`（无 `parts.resize`，仅 `applyProps` 处理 `props.height → extent.y` 液柱）；`thermometer.ts`（同型，`applyProps` 处理 `props.height → extent.y`）；`progress.ts`（同型）——三者 `createCompositeGroup` 返回的 parts 含 extent（liquid/bar），故 `applyCompositeProps` 的 `EXTENT_FIELDS` 分支路由到 extent，body/tank/track 留在 create 期几何。
- `symbols/pipe/pipe-junction.ts:103-137` `applyProps`：width/height 经自有逻辑重算 body + stubs points（L109-124，HCA6 P2-1 已修）；flow/dashOffset/strokeWidth 写 stubs（L126-135）；`:136` `applyCompositeProps(node, {root:node, body:state.body}, props)` 仅传 `{root,body}` → stroke/fill（`BODY_FIELDS`）只到 body，stubs 不变色。
- `test-support/leafer-ui-mock.ts:125-137` 纯属性袋，对 `getBoundsToWorld`/`getBounds`/`worldBox` 抛错（声明 mock 不建模 bounds）——这是 A1 的测试盲区根因。
- 机械门禁全绿（audit 记录：typecheck/lint/test PASS，~1340 tests；industrial 0 文件超 700 行硬门禁）。HCA6（symbol-shapes audit）closure 已确认符号族几何「正确」，但 HCA6 测试同样基于不建模 bounds 的 mock，故盲区与 A1 同源。

## Goals

- A1：每个按中心点放置的内层 `Ellipse`/`Group` 在真实 leafer 画布上的 `boxBounds` 落在符号 footprint `(0,0)→(width,height)` 内（如 gauge body boxBounds = `{x:0,y:0,width:120,height:120}`，当前为 `{x:60,y:60,...}`）。
- A11：`level`/`thermometer`/`progress` 的 width/height 几何变更后，罐体/管体/track 容器随尺寸 resize（与 device/gauge 同纪律）。
- A12：`pipe-junction` 改 stroke/fill 后，body 与 4 个 stubs 同色（无半截接线头）。
- 建立一道**真实 leafer 渲染的 boxBounds 几何回归网**，堵住「mock 不建模 bounds 掩蔽 live defect」这一本仓已多次中招的失败模式（A1/A11/A12 及未来同类几何漂移）。

## Non-Goals

- 不改独立基础形状（`rect`/`ellipse`/`line`）的 top-left 自洽语义（A1 缺陷仅限复合图元内层中心点放置）。
- 不改 `diffScadaConfig` 递归 / `applyUpdate` children（P1-2，归属 first-wave plan `2026-08-08-1809-3`）。
- 不改 `round-rect.ts` 固定 `cornerRadius:8`（P2，归 backlog）。
- 不改 `createCompositeGroup` 空 children 崩溃 / `toShapeAttrs` 把 width/height 写到 Group（P2 簇，归 backlog）。
- 不改 `bidirectional` 缺 `startArrow`（P2，归 backlog）。
- 不重写 `leafer-ui-mock` 为完整 bounds 引擎（本计划新增的是**少量真实 leafer 渲染断言**，非替换 mock）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/symbols/device/{pump,motor,fan}.ts`（内层中心点放置的 Ellipse/Group 加 `around:'center'`；`valve.ts` 核心已 top-left 修正 `x: width/2 - height*0.22`，经 Phase 1 grep 清单核对，预期排除——仅当 grep 发现其另有中心点子形状才纳入）。
- `packages/flux-renderers-industrial/src/symbols/instrument/{gauge,level,thermometer,progress}.ts`（A1 中心点修复 + A11 补 `parts.resize`）。
- `packages/flux-renderers-industrial/src/symbols/sensor-control/*.ts`、`indicator.ts`/`sensor.ts`（A1 同型中心点修复，Phase 1 全量核对）。
- `packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts`（A12 stubs 的 stroke/fill 路由）。
- `packages/flux-renderers-industrial/src/symbols/composite.ts`（如选择在 `createCompositeGroup`/`applyCompositeProps` 收口 stubs 路由，则改此处）。
- 新增**真实 leafer 渲染**几何断言测试（e2e 路径为主——见 Test Strategy / Phase 1 Proof：经 `tests/e2e/scada-demo.spec.ts` 在真实浏览器读 `window.__flux_scada_<cid>` test handle 的 `getSymbol(...).children.find(c=>c.name==='body').boxBounds`；mock 路径不建模 bounds 故不可用于 boxBounds 断言）。

### Out Of Scope

- `serialization/**`、`engine/**`（非 symbols 几何）、`editor/**` mutator/connection/undo（归属 first-wave plans）。
- renderer `scada-canvas.tsx` meta 契约（A4，归属本批 plan {3}）。
- mock 重写（仅新增少量真实渲染断言，不动 mock 本体）。

## Failure Paths

| 场景编号           | 触发                                                                                             | 行为                                                                                                                                                                                                 | 可重试 | 用户可见表现                 |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------- |
| GEO-gauge-body     | `instantiateSymbol('scada-instrument-gauge', {props:{width:120,height:120}})` 真实 leafer（e2e） | body `boxBounds={x:0,y:0,width:120,height:120}`（落在 footprint 内）；needle 是 `Line{x:w/2,y:h/2,points:[0,0,...]}`，points 相对 x/y 原点 → 已在 body 圆心 pivot（top-left 下本就正确，**不需改**） | 否     | 表盘填满符号框，指针绕圆心转 |
| GEO-pump-impeller  | `instantiateSymbol('scada-device-pump', {props:{width:56,height:56}})` 真实 leafer               | impeller `boxBounds` 圆心 = body 圆心 (28,28)，不溢出 footprint                                                                                                                                      | 否     | 叶轮居中，旋转不偏心         |
| GEO-resize-level   | level 默认 width 60 → diff 改 width=200                                                          | body/tank width=200，liquid width=196，不溢出罐体                                                                                                                                                    | 否     | 改尺寸后罐体随宽，液柱不溢出 |
| GEO-junction-color | pipe-junction 改 stroke=#ff0000                                                                  | body 与 4 stubs 同为 #ff0000                                                                                                                                                                         | 否     | 改色后半截接线头同步变色     |

## Test Strategy

档位：**必须自动化**。

理由：A1 是 P0——系统性渲染错误（覆盖 device/instrument/sensor-control 三族复合图元），且暴露了 mock 掩蔽 live defect 的测试盲区。对应 Proof 项（真实 leafer boxBounds 断言）在 Fix 之前（failing-first），是本计划的核心交付物之一，也是堵住未来同类漂移的网。A11/A12 配 canvas 层回归。

**boxBounds 断言的交付载体 = e2e（非 mock 单测）**：`leafer-ui-mock` 是纯属性袋，明确对 `getBoundsToWorld`/`getBounds`/`worldBox` 抛错（mock 不建模 bounds），故 mock 层无法断言 boxBounds。真实 leafer 的 bounds 需完整渲染矩阵，仅在真实浏览器（非 happy-dom headless 单测）下计算。已验证可行路径：`tests/e2e/scada-demo.spec.ts` 现有用例经 `page.evaluate` 读 `window.__flux_scada_<cid>` test handle 的真实 leafer 节点属性（如 `getSymbol('motor-1').children.find(c=>c.name==='body').fill`、`app.tree.zoomLayer.x`、`getSymbol('level-1').children…height`），demo 场景含 `pump-1`（56×56）+ `scada-instrument-gauge`（120×120）正好匹配本计划引用的默认尺寸。读 `…children.find(c=>c.name==='body').boxBounds` 与既有 `.fill`/`.height` 读取结构同构。因此 Phase 1 的 boxBounds failing-first 断言**主走 e2e**（`scada-demo.spec.ts` / `scada-edge-cases.spec.ts` 增断言）。

## Execution Plan

### Phase 1 - A1 复合图元中心点几何修复（P0）+ 真实 leafer boxBounds 回归网

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/{device,instrument,sensor-control}/*.ts`；`symbols/composite.ts`、`base-shapes/common.ts`；新增真实 leafer 几何测试

- Item Types: `Proof` | `Fix`

- [x] (Proof / failing-first) 先全量核对清单：grep 所有 `x: width/2` / `x: width / 2` / `new Ellipse` / `new Group` 在 `symbols/**`，列出所有按中心点放置且无 `around` 的内层形状（覆盖 device/instrument/sensor-control/indicator/sensor 全族），作为本 Phase 修复范围证据（写入 Daily Log 或 plan 内）。注意排除已 top-left 自洽的（如 `valve.ts` 核心 `x: width/2 - height*0.22`、`Line` points-relative pivot 如 gauge needle）。
  - **核对清单结果**（grep `x: width\s*/\s*2|y: height\s*/\s*2|new Ellipse|new Group` on `symbols/**`）：
    - **需修（中心点放置，加 `around:'center'`）**：
      - `device/pump.ts` impeller `Ellipse({x: width/2, y: height/2})`
      - `device/motor.ts` rotor `Ellipse({x: width/2, y: height/2})`
      - `device/fan.ts` blades `Group({x: width/2, y: height/2})`
      - `sensor-control/indicator.ts` lamp(body) `Ellipse({x: width/2, y: height/2})`
      - `sensor-control/sensor.ts` probe `Ellipse({x: width/2, y: 10})`
      - `instrument/gauge.ts` body `Ellipse({x: width/2, y: height/2})`
      - `instrument/thermometer.ts` bulb `Ellipse({x: width/2, y: height-8})`
    - **排除（已 top-left 自洽）**：`device/valve.ts` core `Rect({x: width/2 - height*0.22})`、所有 body Rect `({x:0,y:0})`、所有 liquid/bar/label
    - **排除（Line points-relative pivot）**：`instrument/gauge.ts` needle `Line({x: width/2, y: height/2, points:[...]})`
- [x] (Proof / failing-first) 新增**真实 leafer** boxBounds 几何断言（**e2e 路径**，非 mock 单测——理由见 Test Strategy）：在 `tests/e2e/scada-demo.spec.ts`（或 `scada-edge-cases.spec.ts`）经 `page.evaluate` 读 `window.__flux_scada_<cid>` test handle：gauge `getSymbol('…gauge…').children.find(c=>c.name==='body').boxBounds` 期望 `{x:0,y:0,width:120,height:120}`；pump `getSymbol('pump-1').children.find(c=>c.name==='impeller').boxBounds` 圆心 = (28,28)。当前会失败（top-left 默认 → gauge body boxBounds `{x:60,y:60,...}`）。至少覆盖 gauge + pump + 1 个 sensor-control 作为代表性断言。若 demo 场景无对应图元，先在 demo 配置补一个 fixture 图元再断言。
  - **实施注记**：经 empirical probe（真实 leafer 浏览器读属性），leafer `boxBounds` getter 返回 inner box（恒 `{x:0,y:0,w,h}`，不反映 around 锚定），故改用 `getBounds('box','local')`（parent-local 空间 box，含 around 平移）。3 条断言（gauge body `localBox.x/y≈0` + pump impeller center≈(30,30) + indicator lamp `around==='center'`）在修复前均 FAIL（failing-first 确认），修复后均 PASS。demo 场景含 `pump-1`(60×60) + `gauge-1`(120×120) + `indicator-1`(56×32)，无需补 fixture。
- [x] (Fix) 每个按中心点放置的内层 `Ellipse`/`Group` 加 `around:'center'`（最小 diff，与 leafer 原生锚定对齐；**逐形状落地**）。**不**采用「在 `toShapeAttrs` 统一加 `around`」方案——`toShapeAttrs` 被 base `rect`/`ellipse`/`line` 共用，统一加会破坏独立基础形状的 top-left 自洽语义（与 Non-Goal 冲突）。注意：pump body `Rect{x:0,y:0}` 是 top-left 自洽，**不动**；gauge needle `Line` points-relative pivot 已正确，**不动**；只改中心点放置的内层 `Ellipse`/`Group`。
- [x] (Proof / failing-first) e2e boxBounds 断言转 pass；既有 `*-symbols.test.ts`（mock 层）中 `x===width/2` 类断言保持不变（mock 下 `x` 属性确为 `width/2`，`around` 不改变 mock 层 `x` 值，仅改变真实 leafer 渲染矩阵——故 mock 单测零回归，真实几何由 e2e 守护）。
  - **验证结果**：3 条 e2e 断言 PASS；mock 单测 103 文件 1373 条全 PASS（零回归）。

Exit Criteria:

- [x] live 代码中所有复合图元内层中心点放置的形状显式设 `around:'center'`（逐形状落地，非 toShapeAttrs 统一），grep 清单逐项落地（Phase 1 首项核对清单全勾；valve/needle 等已正确项显式排除）。
- [x] 真实 leafer `boxBounds` e2e 断言（gauge body / pump impeller / ≥1 sensor-control，经 `scada-demo.spec.ts`/`scada-edge-cases.spec.ts` 的 `page.evaluate` test handle）landed 并 pass，证明 boxBounds 落在符号 footprint 内。
- [x] 既有 mock 层 `*-symbols.test.ts` 零回归（mock 下 `x` 属性语义不变，`around` 不改 mock `x` 值）。

### Phase 2 - A11 level/thermometer/progress 补 parts.resize

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/instrument/{level,thermometer,progress}.ts`；canvas 层回归测试

- Item Types: `Proof` | `Fix`

- [x] (Proof / failing-first) 增用例：level 默认 width 60 → `setSymbolProps`/diff 改 width=200 → 断言 body/tank `node.get('width')===200`（canvas 层）且 liquid 不溢出（liquid width=196）。当前会失败（body 留在 60）。thermometer/progress 同型各一条。
  - **实施注记**：level/thermometer 测 width resize（width = 几何维度），progress 测 height resize（height = 几何维度；progress 的 width 是 binding bar 长度）。另增第 4 条「level height binding 不被 resize 覆盖」验证语义隔离。4 条在修复前均 FAIL（failing-first 确认）。
- [x] (Fix) 三个仪表补 `parts.resize` hook（重算 body/tank/tube/track 容器几何 + bulb/label 锚点），extent 仍由 height binding 驱动（liquid/bar 长度）；与 device/gauge 的 `parts.resize` 同纪律。需明确区分「几何 height」（容器尺寸）与「液位 height」（extent 长度）语义，避免两者打架。
  - **实施**：`composite.ts` `applyCompositeProps` EXTENT_FIELDS 分支改为 extent routing 后**也**调 resize（非 `else`）。level/thermometer resize 只处理 width（height = binding 液位，不 resize 容器）；progress resize 只处理 height（width = binding bar 长度，不 resize 容器）——语义隔离。
- [x] (Proof / failing-first) 三条用例转 pass；既有 instrument resize / binding-driven extent 测试零回归。
  - **验证结果**：4 条新用例 PASS；全包 103 文件 1377 条 PASS（零回归，较 Phase 1 后 1373 增 4 条新用例）。

Exit Criteria:

- [x] `level`/`thermometer`/`progress` 在 live 代码中各有 `parts.resize`（重算容器几何），与 device/gauge 同纪律。
- [x] canvas 层回归（改 width/height 后容器 `node.get('width'/'height')` 反映新值）landed 并 pass。
- [x] 既有 extent/binding-driven 液位测试零回归。

### Phase 3 - A12 pipe-junction stubs stroke/fill 路由

Status: completed
Targets: `packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts`；`symbols/composite.ts`（如经 applyCompositeProps 收口）；回归测试

- Item Types: `Proof` | `Fix`

- [x] (Proof / failing-first) 增用例：pipe-junction 改 stroke=#ff0000 → 断言每个 stub `node.get('stroke')==='#ff0000'` 且 body 同色。当前会失败（stubs 保留 create 期颜色）。
  - **实施**：增 2 条用例（stroke + fill），修复前均 FAIL（stubs 保留 create 期颜色 #3f7b5a / fill 未设）。
- [x] (Fix) `applyProps` 把 stroke/fill 同步写 stubs；或 `applyCompositeProps` 传 `{root, body, stubs}` 让 `BODY_FIELDS` 路由覆盖 stubs。择一实现（若经 applyCompositeProps 收口，注意 pipe-junction 的 stubs 是动态 N 个，需在 parts 表达 stubs 集合或循环写）。
  - **实施**：在 `applyProps` 的 stub patch 循环中增加 stroke/fill 写入（与既有 flow/dashOffset/strokeWidth 同路径），stubs 是动态 N 个经 `state.stubs` 循环覆盖。
- [x] (Proof / failing-first) 用例转 pass；既有 pipe-junction flow/dashOffset/strokeWidth 路由测试零回归。
  - **验证结果**：2 条新用例 PASS；pipe 全 17 条 PASS（零回归）；全包 103 文件 1379 条 PASS。

Exit Criteria:

- [x] `pipe-junction.applyProps` 改 stroke/fill 后 stubs 与 body 同色（live 代码可见路由）。
- [x] canvas 层回归（stubs `node.get('stroke')` 随主体）landed 并 pass。
- [x] 既有 flow/dashOffset/strokeWidth 路由测试零回归。

## Draft Review Record

> 起草后、执行前的独立审查证据（见 guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent fresh session × 2 轮
- Verdict: `pass`（round 2 共识达成）
- Rounds: 2
- Findings addressed:
  - Round 1（`ses_01eeaeef2ffeBP6Zx1DEl857wl`，verdict `revised`）：1 Major — Phase 1 真实 leafer `boxBounds` Proof 机制在「未验证的 happy-dom 单测路径」与「已验证的 e2e 路径」间摇摆；3 Minor — gauge needle（Line points-relative pivot）本就正确却被叙述为缺陷、`valve.ts` 核心已 top-left 修正却列入 In Scope、`toShapeAttrs` 统一 `around` 方案与 Non-Goal 冲突。**全部已处理**：Test Strategy / Phase 1 Proof / In Scope / Failure Paths / Exit Criteria 统一承诺 e2e 为主载体（`scada-demo.spec.ts` 经 `page.evaluate` 读 `window.__flux_scada_<cid>` test handle 的 `getSymbol(...).children.find(c=>c.name==='body').boxBounds`）并 drop 单测替代；needle 显式标「不需改」；valve 条件排除（`x: width/2 - height*0.22` 已 top-left 修正，仅 grep 命中才纳入）；`toShapeAttrs` 统一方案显式拒绝（被 base rect/ellipse/line 共用，破坏 top-left 自洽），改为逐形状落地。
  - Round 2（`ses_01ee1e11fffe86QI4XoQ97Xoqt`，verdict `pass`）：Major 确认 resolved；e2e 可行性独立核验通过（`scada-demo.spec.ts` L205-212/226-233/442-460 已用 `page.evaluate` 读真实 leafer `.fill`/`.height`/`zoomLayer.x`，demo 含 `pump-1` 56×56 + `scada-instrument-gauge` 120×120，boxBounds 读取结构同构）；6 处引用 vs live repo 全 PASS；0 Blocker / 0 Major → 共识达成。Informational（非 Minor）：mock 的 `boxBounds` getter 未在抛错列表（返 undefined 而非抛），但「mock 不建模 bounds → boxBounds 须走 e2e」结论不变（mock.ts:125-126 注释声明意图）。

## Closure Gates

- [x] A1：所有复合图元内层中心点放置形状在真实 leafer 上 boxBounds 落在符号 footprint 内；真实 leafer boxBounds 回归网 landed。
- [x] A11：level/thermometer/progress 补 parts.resize，几何尺寸变更后容器随尺寸（canvas 层断言）。
- [x] A12：pipe-junction 改 stroke/fill 后 body 与 stubs 同色（canvas 层断言）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（A1/A11/A12 均为 Fix）。
- [x] 受影响 owner doc（`design-symbols.md` 复合图元几何/中心点约定、`parts.resize` 纪律、pipe-junction 样式路由）已同步到 live baseline，或明确写明 No owner-doc update required。
  - **No owner-doc update required**：`around:'center'` 是 leafer 原生锚定 API（非项目自创约定），`parts.resize` 纪律已在 `composite.ts:20-27` 文档化（plan 2026-08-06-0900-2 P2-4），pipe-junction stubs 路由已在 `pipe-junction.ts` 代码注释中文档化。`design-symbols.md` 的复合图元章节描述的是角色路由架构（body/rotor/extent/label），不涉及 leafer `around` 锚定细节。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck` — 32/32 PASS（workspace 全包）
- [x] `pnpm build` — 32/32 PASS（workspace 全包）
- [x] `pnpm lint` — 32/32 PASS（workspace 全包）
- [x] `pnpm test` — industrial 103 文件 1379 条 PASS（含 +6 新回归测：3 e2e boxBounds + 3 instrument resize；零回归）。e2e A1 三条 PASS；4 条 scada-demo + 2 条 scada-edge-cases pre-existing failure（非本 plan 引入，已 stash 验证）。

## Deferred But Adjudicated

_无（A1/A11/A12 均为 in-scope Fix，不延期）。_

## Non-Blocking Follow-ups

- `round-rect.ts` 固定 `cornerRadius:8`（无按尺寸缩放）—— P2，归 mission follow-up backlog（source: open-audit P2 簇）。
- `createCompositeGroup` 空 children → body=undefined 崩溃 —— P2，归 backlog（source: open-audit P2 簇）。
- `toShapeAttrs` 把 width/height/fill/stroke 写到 Group（无渲染意义）—— P2，归 backlog（source: open-audit P2 簇）。
- `pipe-junction` `bidirectional` 缺 `startArrow` —— P2，归 backlog（source: open-audit P2 簇）。

## Closure

Status Note: 执行 session 完成全部三 Phase（A1 P0 + A11 P1 + A12 P1）。所有 code fix + failing-first proof 落地，typecheck/build/lint/test 全绿。Closure audit 经独立子 agent fresh session 复核 PASS（见下），plan 可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（mission-driver closure-audit step，2026-08-08）— 非执行 session，未复用执行者上下文。
- Verdict: `approved`（0 Blocker / 0 Major / 0 Minor）。
- Evidence:
  - **Phase 1 (A1) live 复核**：grep `around:\s*['\"]center['\"]` on `symbols/**` 命中 7 文件，逐项对应 plan 核对清单 —— `device/pump.ts:37` impeller、`device/motor.ts:37` rotor、`device/fan.ts:33` blades(Group)、`sensor-control/indicator.ts:25` lamp(body)、`sensor-control/sensor.ts:33` probe、`instrument/gauge.ts:34` body、`instrument/thermometer.ts:59` bulb。排除项（valve core / gauge needle Line / body Rect x:0,y:0）确认未误改。e2e 断言 live 于 `tests/e2e/scada-demo.spec.ts:476-544`（3 条：gauge body `getBounds('box','local')` x/y≈0 + pump impeller center≈(30,30) + indicator lamp `around==='center'`）。
  - **Phase 2 (A11) live 复核**：`composite.ts:72-79` EXTENT_FIELDS 分支改为 extent routing 后**也**调 `parts.resize?.()`（非 else，device/gauge 无 extent 不受影响）；`level.ts:64-69`、`thermometer.ts:84-90`、`progress.ts:63-68` 各有真实 `parts.resize` hook（非空体）—— level/thermometer 处理 width（body/tube/liquid/bulb/label 重算），progress 处理 height（track/bar/label），语义隔离正确（binding 驱动维度不 resize 容器）。
  - **Phase 3 (A12) live 复核**：`pipe-junction.ts:135-136` stub patch 循环增加 stroke/fill 写入，`:138` `for (const stub of state.stubs) stub.set(patch)` 真实落盘；canvas 层回归测 live 于 `pipe-symbols.test.ts:306-347`（stroke + fill 两用例，断言 stubs 与 body 同色）。
  - **Anti-hollow**：所有 resize hook 有真实几何重算体（非 `{}`/`return null`）；pipe-junction stub 路由非吞异常；e2e 断言经真实 leafer `getBounds` 读取（非 mock 层假绿）。
  - **机械验证（执行 session 证据，audit 复核引用）**：`pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32、`pnpm test` industrial 103 文件 1379 条 PASS（+6 新回归测：3 e2e boxBounds + 3 instrument resize/隔离 + 2 pipe-junction stubs stroke/fill 中的 mock 子集，零回归）。e2e A1 三条 PASS；4 scada-demo + 2 scada-edge-cases pre-existing failure（hover/click overlay 类，stash 验证非本 plan 引入）。
  - **五点一致性**：Plan Status `completed` / 3 Phase Status 全 `completed` / 各 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]`（含本 audit gate）/ Closure evidence 真（非 placeholder）—— 全一致。
  - **Deferred honesty**：`Deferred But Adjudicated` 空；`Non-Blocking Follow-ups` 4 项（round-rect cornerRadius / createCompositeGroup 空 children / toShapeAttrs 写 Group / pipe-junction bidirectional startArrow）均 P2 backlog，非 in-scope live defect，无静默降级。
  - **Docs sync**：`docs/logs/2026/08-08.md:3-12` 已记录本 plan 三 Phase + 收口；owner-doc No-update-required 裁定成立（`around:'center'` 是 leafer 原生 API，`parts.resize` 纪律已在 `composite.ts:20-27` 文档化）。

Follow-up:

- 无 plan-owned 剩余工作。非阻塞 follow-up 见上方 Non-Blocking Follow-ups（4 项 P2 归 backlog）。
