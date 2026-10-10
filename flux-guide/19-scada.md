# 19 - SCADA 工业组态(scada-canvas / scada-editor-canvas)

> 权威契约:`packages/flux-renderers-industrial/src/serialization/config-types.ts` + `src/symbols/`;
> 快速上手 cookbook:`design-patterns/scada.md`(运行态)与 `design-patterns/scada-editor.md`(编辑器);
> 可跑示例:playground `#/scada-gallery`(三行业场景画廊)、`#/scada-demo`、`#/scada-editor-demo`。

本章是 SCADA 组态的系统化指南:37 个内置图元总表、点表/绑定/状态机/动画四层数据面、
以及画廊场景中的组合范式。基础 JSON 形态见 cookbook,此处不重复。

## 内置图元总表(37)

| 族(category)      | type                                                                                                                                                                                                                            | 说明                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| shape(10)         | `scada-rect` / `scada-round-rect` / `scada-ellipse` / `scada-line` / `scada-arrow` / `scada-pipe` / `scada-text` / `scada-polygon` / `scada-image` / `scada-video`                                                              | 基础形状与媒体占位                          |
| group(1)          | `scada-group`                                                                                                                                                                                                                   | 复合容器                                    |
| device(9)         | `scada-device-motor` / `scada-device-pump` / `scada-device-valve` / `scada-device-fan` / `scada-device-tank` / `scada-device-heat-exchanger` / `scada-device-conveyor` / `scada-device-gate-valve` / `scada-device-check-valve` | 旋转/往复设备 + 储罐/换热器/输送/阀类变体   |
| instrument(6)     | `scada-instrument-gauge` / `scada-instrument-level` / `scada-instrument-thermometer` / `scada-instrument-progress` / `scada-instrument-trend` / `scada-instrument-numeric`                                                      | 表盘/液柱/温包/进度/趋势/LED 数值           |
| sensor-control(5) | `scada-sensor-control-sensor` / `scada-sensor-control-indicator` / `scada-sensor-control-switch` / `scada-sensor-control-button` / `scada-sensor-control-alarm-light`                                                           | 传感与操作件 + 声光警灯                     |
| electrical(2)     | `scada-elec-breaker` / `scada-elec-transformer`                                                                                                                                                                                 | 电气单线图件(断路器分合闸触桥/双绕组变压器) |
| pipe(4)           | `scada-pipe-junction` / `scada-pipe-elbow` / `scada-pipe-tee` / `scada-pipe-cross`                                                                                                                                              | 连接点 + 弯头/三通/四通管件                 |

设备/电气族惯例状态色(run/closed=绿、stop/open=灰、fault/trip=红+闪烁)内建在默认
`states` 中,绑定布尔点即得(stateSource 缺省按点值);仪表族的量程换算由绑定声明
`bindings.height.rotation` 的 `scale: { k, b }` 与 `format` 消费。

### 559 新增图元的专属通道

| 图元                               | 数据通道                                                      | 说明                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `scada-device-tank`                | `bindings.height`(液柱像素)                                   | 液柱 y 锚定罐底;`text` 绑定显示百分比                                                                              |
| `scada-device-gate-valve`          | `custom.openRatio`(0 关/1 开)                                 | 闸板线性升降;状态色照惯例                                                                                          |
| `scada-device-check-valve`         | `custom.openRatio`                                            | 阀碟铰接摆动(0=落座/1=顺流向摆开 70°)                                                                              |
| `scada-instrument-trend`           | `bindings.height` + `custom.capacity`                         | 内部环形缓冲:每次绑定写入推入一个样本并重绘折线;height 为量程换算后的像素值(与 level 同语义),`text` 绑定显示当前值 |
| `scada-instrument-numeric`         | `bindings.text`(带 format)+ `custom.unit` + `textSize`        | LED 数值面板                                                                                                       |
| `scada-sensor-control-alarm-light` | 布尔点(booleanMap true→alarm)                                 | alarm 态红罩 400ms blink                                                                                           |
| `scada-elec-breaker`               | `custom.closed` + 点值 valueMap(`1` closed/`0` open/`2` trip) | 分闸触桥翻转 -35°,trip 红闪                                                                                        |
| `scada-pipe-elbow/tee/cross`       | `flow: { enabled, speed, dash }` + 点值 run/stop              | 管件流向动画与 scada-pipe/junction 同管线(dashOffset 驱动)                                                         |

## 组合范式(来自 scada-gallery 场景)

- **泵站工艺链**:储罐(`device-tank`)→ 吸水干管(`scada-pipe` + flow)→ 三通分路
  (`scada-pipe-tee`)→ 泵(`device-pump`,run 态叶轮旋转)→ 止回阀(`check-valve`)
  → 出水总管 → 弯头爬升(`scada-pipe-elbow`)→ 清水池;压力越限(页面按点值计算)
  → 声光警灯(`alarm-light`) + DOM 告警横幅联动。
- **配电单线图**:进线电缆(`scada-line`)→ 进线断路器(`elec-breaker`,分/合/跳闸
  三态)→ 变压器(`elec-transformer`)→ 母线(`scada-round-rect`)→ 三回馈线断路器
  → 负荷(motor/fan);馈线负荷用 `instrument-progress` 宽度绑定,绕组温度用
  `instrument-trend`。
- **灌装产线**:供料罐液位锯齿循环(消耗-低限报警-补料回升,页面模拟器驱动)
  → 灌装阀(`device-valve`)→ 传送带(`device-conveyor`,run 态滚筒旋转)
  → 光电传感器计数(`sensor` + flux 计数点)。

完整可抄配置见 playground 源码 `apps/playground/src/pages/scada-gallery-*-schema.ts`
(水处理 `scada-gallery-water-schema.ts` / 配电 `scada-gallery-power-schema.ts` /
产线 `scada-gallery-filling-schema.ts`),信号模拟器复用
`scada-industrial-simulator.ts`(`createSignalSimulator`:sine/randomWalk/square 三类 tag 源)。

## 编辑器

palette 按 `category` 自动分组(形状/设备/仪表/传感控制/电气/管道),拖拽落点吸附、
右键菜单、对齐分布、连线端点吸附、模板/站点、undo-redo 等能力见
`design-patterns/scada-editor.md` 与 `docs/components/industrial-hmi-editor/`。
新增内置图元零配置进 palette;自定义符号入库(选区存为图元)尚无,见 roadmap。

## 测试与调试

- 测试句柄:`component:getSymbols/getSymbol/setPointValue/fit/center`(全表见 cookbook「测试句柄」节);
  画廊页另暴露 `window.__scadaGallery.set(tag, value)` 供 e2e 注入信号值。
- 调试通道:`data-slot="scada-canvas"` + `data-status` + `data-cid`;诊断码
  (`config-parse`/`config-invalid`/`symbol-not-found` 等)见
  `docs/components/industrial-hmi/design-renderer.md`。
