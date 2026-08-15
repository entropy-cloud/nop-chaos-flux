# SCADA Demo 视觉重设计 demo-visual-design.md

> 日期：2026-08-06（v1）/ 2026-08-15（v2 增量，见 §八）
> 状态：v1 落地（I13.1）；v2 已落地（2026-08-15 商业级视觉刷新）
> 上游：用户反馈「画面画乱」+ I17.1 坐标 8px 对齐未解决视觉问题（`docs/plans/2026-08-05-2129-2` 只做了坐标微调）；v2 上游为用户反馈「达到真实商业水准」
> 关联：`apps/playground/src/pages/scada-demo.tsx`（960×520 画布，~40 symbols）、`docs/components/industrial-hmi/design-symbols.md`（图元库）、register-builtin.ts（24 内置图元）、`packages/flux-renderers-industrial/src/symbols/visuals.ts`（v2 视觉 token）

## 一、问题诊断

当前 demo 已有标题 + 8 个设备标签 + 9 个变量绑定 + 事件联动，**功能完整但视觉粗糙**。具体问题：

| #   | 问题           | 现状                                                                                 |
| --- | -------------- | ------------------------------------------------------------------------------------ |
| 1   | 无背景/网格    | 透明背景，设备悬浮在空白上                                                           |
| 2   | 无功能分区     | 13 个图元平铺在 900×480，无视觉分组                                                  |
| 3   | 布局散乱       | motor/fan 在 y=56（顶部），主管线 y=232，温度计/报警在 y=296-440（底部）——大片死空间 |
| 4   | 标签位置不一致 | 有的在设备下方（text-level y=240 vs level-1 y=92），有的偏离设备                     |
| 5   | 无流向标识     | 管道无箭头，不细看不知道介质流向                                                     |
| 6   | 无工业配色     | 全部深灰文字 on 白底，像线框图而非成品 HMI                                           |

**根因**：I17.1 的 exit criteria 只验收了"8px 对齐 + e2e 绿"，没有验收视觉质量。本文件定义真正的视觉重设计标准。

## 二、设计原则

1. **功能分区**（Zone）：按工艺功能将画布分为 3 个圆角矩形区域，每区有半透明底色 + 区域名标签
2. **流向左→右**：介质从左（进水）流向右（出水），设备按工艺顺序从左到右排列
3. **标签一致性**：每个设备标签固定放在设备**正下方**，字号 11，居中对齐
4. **工业配色**：浅色主题（接近 FUXA web client），区底色区分于画布底色，管道蓝色带流向动画
5. **信息层次**：标题 > 区域名 > 设备名 > 操作提示，字号 20/13/11/11 递减
6. **紧凑布局**：消除大块死空间，设备间距 ≤100px，画布扩展到 960×520

## 三、视觉语言

### 配色（浅色工业主题）

| 元素     | 色值                    | 用途                                   |
| -------- | ----------------------- | -------------------------------------- |
| 画布背景 | `#eef2f6`               | 整体底色                               |
| 网格线   | `#dae3ec` size 24       | 精细网格                               |
| 区底色   | `#ffffff`               | 区域圆角矩形填充（白卡片浮在浅灰底上） |
| 区边框   | `#cfd8dc` strokeWidth 1 | 区域分隔                               |
| 区域名   | `#607d8b` 13px          | 区域标签                               |
| 设备名   | `#37474f` 11px          | 设备标签                               |
| 标题     | `#1a2332` 20px bold     | 顶部标题                               |
| 管道     | `#78909c` strokeWidth 4 | 管道线                                 |
| 流向箭头 | `#546e7a`               | 管道上的 scada-arrow                   |
| 数值显示 | `#0277bd` 11px          | 仪表读数                               |
| 操作提示 | `#90a4ae` 11px          | 底部提示                               |

### 尺寸规范

| 元素             | 尺寸                       |
| ---------------- | -------------------------- |
| 画布             | 960×520                    |
| 区圆角矩形       | cornerRadius 8，padding 16 |
| 设备间距         | 60-100px                   |
| 标签-设备间距    | 8px                        |
| 管道 strokeWidth | 4                          |

## 四、布局规格

### 画布分区（960×520）

```
┌───────────────────────────────────────────────────────────┐
│  反应釜工艺流程演示                              (标题区)    │  y:0-48
├──────────────┬────────────────┬───────────────────────────┤
│              │                │                           │
│   储水区     │    泵阀区      │      仪表/冷却区          │
│              │                │                           │
│  [电机M-101] │  [泵P-101]     │  [风机F-101]              │
│      ↓       │      →         │      ↓                    │
│  [液位LT-101]│  [阀V-101]     │  [流量FI-201][温度TE-201] │
│      →       │      →         │      ↑                    │
│      ════════╋════════════════╋═════ [ Junction ] ═══════│  主管线 y:280
│              │                │                           │
├──────────────┴────────────────┴───────────────────────────┤
│  [报警●]  [刷新按钮]  操作提示……               (底部信息)  │  y:460-520
└───────────────────────────────────────────────────────────┘
     x:16-256      x:272-556        x:572-944
```

### 各 symbol 布局

**标题区**（y: 0-48）

- `scada-round-rect` (0, 0, 960, 48) fill `#1a2332` cornerRadius 0 — 标题底栏
- `scada-text` (480, 14) text "反应釜工艺流程演示" align center textSize 20 textColor `#ffffff` fontWeight bold

**Zone 1 储水区**（x:16, y:64, w:240, h:384）

- `scada-round-rect` (16, 64, 240, 384) fill `#ffffff` stroke `#cfd8dc` cornerRadius 8
- `scada-text` (136, 72) "储水区" center 13px `#607d8b`
- `motor-1` (96, 104) 80×60 — 搅拌电机
- `text-motor` (136, 172) "搅拌电机 M-101" center 11px
- `level-1` (104, 192) 64×140 — 储水罐液位计
- `text-level` (136, 340) "储水罐 LT-101" center 11px

**Zone 2 泵阀区**（x:272, y:64, w:284, h:384）

- `scada-round-rect` (272, 64, 284, 384) fill `#ffffff` stroke `#cfd8dc` cornerRadius 8
- `scada-text` (414, 72) "泵阀区" center 13px
- `pump-1` (320, 248) 60×60 — 给水泵
- `text-pump` (350, 316) "给水泵 P-101" center 11px
- `valve-1` (440, 250) 60×56 — 调节阀
- `text-valve` (470, 316) "调节阀 V-101" center 11px

**Zone 3 仪表/冷却区**（x:572, y:64, w:372, h:384）

- `scada-round-rect` (572, 64, 372, 384) fill `#ffffff` stroke `#cfd8dc` cornerRadius 8
- `scada-text` (758, 72) "仪表 / 冷却区" center 13px
- `fan-1` (640, 104) 80×60 — 冷却风机
- `text-fan` (680, 172) "冷却风机 F-101" center 11px
- `junction-1` (576, 260) 80×40 — 管道连接
- `gauge-1` (672, 200) 120×120 — 流量计
- `text-gauge` (732, 328) "流量计 FI-201" center 11px
- `thermometer-1` (840, 180) 40×140 — 温度计
- `text-temp` (860, 328) "温度 TE-201" center 11px

**主管线**（y:280 贯穿三区）

- `pipe-in-1`: (0, 280) width 104 → level 左侧
- `pipe-level-pump`: (168, 280) width 152 → level 右侧到 pump 左侧
- `pipe-pump-valve`: (380, 280) width 60 → pump 右侧到 valve 左侧
- `pipe-valve-junc`: (500, 280) width 76 → valve 右侧到 junction
- `pipe-junc-gauge`: (656, 280) width 16 → junction 到 gauge

**管道流向箭头**（每段管道中点上方）

- `scada-arrow` 指向右，stroke `#546e7a`，3-4 个箭头

**底部信息栏**（y:460-520）

- `indicator-1` (64, 464) 56×32 — 报警指示灯
- `scada-text` (96, 500) "报警" center 11px
- `button-1` (160, 466) 56×28 — 刷新按钮
- `scada-text` (192, 500) "数据请求" center 11px
- `text-tip` (280, 480) "单击设备→详情 | 双击电机→跳转 | 单击按钮→请求" 11px `#90a4ae`

## 五、迁移约束

以下属性**零改动**（仅改坐标/新增装饰图元）：

| 不动的      | 说明                                           |
| ----------- | ---------------------------------------------- |
| `testid`    | 所有 testid 保持不变（e2e 依赖）               |
| `bindings`  | 所有数据绑定保持不变（功能核心）               |
| `events`    | 所有事件联动保持不变（click/dblclick/ajax）    |
| `variables` | 点表声明保持不变                               |
| `states`    | 状态声明保持不变（run/stop/fault 色彩 + 动画） |
| `custom`    | 自定义属性保持不变（openRatio/min/max/unit）   |

新增的装饰图元（区背景/标题底栏/流向箭头）**不含 testid/bindings/events**，纯视觉。

## 六、参考对照

| 来源                | 可借鉴点                                   |
| ------------------- | ------------------------------------------ |
| FUXA web client     | 白底卡片 + 浅灰边框分区 + 设备标签下方居中 |
| meta2d 在线编辑器   | 管道流向动画（dash offset 滚动）+ 区域底色 |
| OSHMI               | 标题栏深色底白字 + 底部状态栏              |
| LeaferJS Playground | Group 容器 + cornerRadius 圆角卡片         |

## 七、验收标准

重设计完成后，以截图对照以下判据：

1. 画布有明确背景色 + 网格，非透明
2. 三个功能区域有白色卡片底色 + 边框 + 区域名
3. 每个设备下方有居中标签，位置一致（y 偏移 ≤2px）
4. 管道有可见流向箭头
5. 无大块死空间（任意 100×100 区域至少有一个图元或标签）
6. 标题栏深色底白字，视觉突出
7. 所有 testid/bindings/events 功能不变（e2e 全绿）

## 八、v2 增量（2026-08-15 商业级视觉刷新）

用户验收 v1 为「工程示意级」，要求达到商业组态软件（WinCC/Ignition）视觉水准。v2 在 **§五迁移约束完全保持**（testid/bindings/events/variables/states/custom/全部 symbol 坐标尺寸零改动）的前提下做三层刷新：

### 8.1 图元视觉 v2（包级，`symbols/visuals.ts` + 各 symbol build 增强）

- **共享视觉模块** `packages/flux-renderers-industrial/src/symbols/visuals.ts`：leafer 线性渐变 paint 构造器（`linearPaint`，from/to 单位坐标）+ 工业 token（`INDUSTRIAL_TOKENS`：表盘暗面色、钢色三阶、液柱蓝、暖橙温柱等）+ 仪表极坐标工具（`polar`/`arcPath`，0°=正上、顺时针为正，与 bindings.rotation scale 换算同口径）。
- **gauge**：新表盘族 `symbols/instrument/dial.ts`（createDial/relayoutDial，build 与 resize hook 共用）——暗色渐变表盘 + 三段量程色带（绿 0-60% / 黄 60-85% / 红 85-100%，可经 `custom.zones` 覆盖）+ 5 主 10 次刻度 + 刻度值（min..max 均分）+ 玻璃高光 + 双层 hub；指针带尾配重段（points 两段）+ 投影。**子节点 z 序锁定**：`needle` 保持命名 `needle`（单测/e2e 断言 tag=Line），新增装饰子节点全部命名 `dial-*`/`hub-*`。
- **level/thermometer**：液柱改双端渐变（水面高光感：顶亮底深）；level 加玻璃高光条 + 右侧 4 档刻度线；thermometer 加泡部高光点 + 右侧刻度线。液柱锚定语义（level=罐底 reserve 0 / thermo=泡顶 BULB_RESERVE -24）与 `liquid`/`bar` extent 路由**不变**（单测锁定）。
- **pump**：蜗壳环（volute-ring 白描边）+ 底部双安装脚 + 左吸入/顶排出短管 + hub 高光；impeller 仍为命名 `impeller` 的 Ellipse（rotate 动画面）。
- **motor**：左右端盖（endbell 渐变）+ 顶部接线盒 + 右侧轴伸 + hub；rotor 仍为命名 `rotor` 的 Ellipse。
- **fan**：防护罩圈 + 十字护网（guard-ring/hbar/vbar）+ 底部支架 + hub；body 改 opacity 0.35 半透明面板（状态色作背景色调）；blades 组仍为命名 `blades`。
- **valve**：左右法兰 + 阀杆 + 阀盖 + 橙色手轮（闸阀语义）；core 开度语义（openRatio→rotation）不变。
- **indicator**：lamp 加粗深色描边（灯圈效果）；**z-order 不变量保持** children `[housing, body(lamp), lamp-shine]`（回归测试锁定 housing#455a64 平色 + body 在 [1]）。
- **button**：cap 改金属渐变 + 投影 + 高光条。
- **约束纪律**：渐变 paint 只落 build() 内部装饰节点；props/defaults 层 fill 保持 string（schema/serialization 契约不变）；BODY_FIELDS 路由仍指向 body 命名子节点（状态色可见性不变，1449 单测全绿）。

### 8.2 demo 主题 v2（页面级，`scada-demo.tsx`）

- 暗色控制室工况屏主题（页面内 `theme` 常量）：画布底 `#0e1729` + 网格 `#1b2b45`；标题栏 `#0a1322` + 3px 青色 accent 线（`#2dd4bf`）；区卡片改暗色（fill `#152238` / stroke `#2a3b58`）；管道 `#41618c` strokeWidth 7（v1 为 4，粗管更接近商业管线图）；文字层级 title `#f1f6fd` / zone `#8098b8` / label `#c5d3e8` / tip `#64789a`；level/thermometer 罐体改暗色透明感（fill `#0f1c31`）配合液柱渐变。
- 页面控制条：13 个裸按钮改为 **6 组工位分组**（电机/泵/阀/风机/报警/视口），label 标题 + `variant`（outline/destructive/secondary）+ `size: sm` 语义化按钮；全部 testid 原样保留。

### 8.3 v2 验收

- `pnpm --filter @nop-chaos/flux-renderers-industrial test` 1449/1449 全绿（含状态色路由、extent/resize 语义、indicator z-order、valve core 锚定公式等全部锁定断言）。
- `tests/e2e/scada-demo.spec.ts` + `scada-pointer-events-regression.spec.ts` 16/16 全绿（真实 leafer 环境，含 TE-3 像素探测与 A1 中心点几何断言）。
