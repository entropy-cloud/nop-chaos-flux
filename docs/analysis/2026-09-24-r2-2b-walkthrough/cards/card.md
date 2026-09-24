# [card] control:card

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/card` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic card with all regions（title+header/body/footer/actions 全区）/ Host card onClick + inner button action (C6.2)）
- **矩阵裁剪**: simplified（matrixReason：静态结构容器，无异步/弹层/拖拽。实际裁掉：glass 皮肤、image 区 + variant=sm（fixture 未配置，走 cards 卡的分层观察替代）、disabled 态（card 无 disabled 语义））

## 1. 截图清单

| 状态                    | light                                                                       | dark（真 data-mode，自采）                                                 |
| ----------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 默认 1280×800（全场景） | `_tmp/visual-inspection-2026-09-24/r2-2b/card/default-full-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/card/default-full-dark.png`       |
| 默认 800×900            | `_tmp/visual-inspection-2026-09-24/r2-2b/card/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/card/default-narrow-800-dark.png` |
| 整卡可点击卡 hover      | `_tmp/visual-inspection-2026-09-24/r2-2b/card/host-hover-light.png`         | —                                                                          |

## 2. A–H 维度勾选表

- A 交互：A1 **warn(R2-2b-A1-3)**（可点击卡 hover 仅 cursor:pointer，无视觉态）A2 pass（整卡 tabIndex=0，focus outline 1px `rgb(0,95,204)`）A3 pass（Action/Inner action 按钮 64×32、99×32）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（整卡点击 `card-clicked:true`、内嵌按钮 `inner:1`，双通道报告均翻转）
- B 颜色：B1 pass（light title 20.01；dark cardBg `rgb(15,23,41)` 上 title 17.08）B2 pass（ring-1 ring-foreground/10，light `rgb(225,231,239)` / dark `rgb(31,42,61)`）B3 n/a B4 pass B5 pass（dark 平价，bg/border/title 全适配）B6 n/a
- C 布局：C1 pass（双视口 docOverX=0）C2 pass（footer 文本左、actions 按钮右（x1140 vs 卡右缘-16=1203 对齐），无重叠）C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（区块间 gap-4=16px 落栅格；header `0 16px`/body `0 16px`/footer `16px` padding 成体系）D2 pass D8 pass（内容与卡缘 16px padding 一致）
- E 排布：E1 pass E2 pass（Action 主按钮 primary variant，强于 header 文本）E3 pass E4 pass（title/header/footer 左缘 x=317 对齐，偏差 0px）E5 pass（单卡无分组混用）E6 n/a
- F 一致性：F1–F5 n/a（单一 card 控件页；分层与 cards 卡对照一致性由 cards 卡覆盖）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-A1-3] 整卡可点击的 card hover 仅有 cursor:pointer，无任何视觉反馈态

- **页面/路由**: `#/lab/card`（场景 2 "Host card onClick + inner button action"；任意配置 onClick 的 card 同险）
- **主题/视口/状态**: light / 1280 / hover 强制态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/card/host-hover-light.png`
- **目视描述**: 悬停在可点击卡上，除鼠标指针变手型外，卡面背景、边框、阴影、位移均无变化，与静态卡在视觉上不可区分。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/out-w1-card.json` hostHover 段（hover 后读 computed style）
  - 输出: `cursor: "pointer", bg: "rgb(255, 255, 255)"（与默认一致）, boxShadow: 全零, transform: "none", transition: "opacity 0.1s"`——对比同批 cards 控件的可选卡（hover `border-primary/60` + transition-colors），card 的可点击形态缺 hover 视觉语言。
- **对照基准**: 检查提示词 A1（hover 态存在且可感知）；NN/g 直接操作可供性（可点必须看得出来）
- **严重程度**: P3（cursor 有提示；触屏端无 hover 则完全无预示）
- **用户影响**: 用户不易发现整卡可点（点击目标是标题这种局部还是全卡无视觉差异），触屏上为零暗示。
- **修复方向**: card.tsx 在 `onClick` 存在分支为 Card 追加 `cursor-pointer transition-colors hover:border-primary/60`（对齐 cards-renderer.tsx L184 的 interactive 类串），或提供 `hoverable` schema 开关。
- **归族**: watch-only → 台账（单控件可供性债；cards 控件已示范正确模式，修复可直接抄）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **计划内锚点复检通过**：DOM 冒泡语义（内嵌按钮点击同时触发卡 onClick，`afterInner: {cardReport: "card-clicked:true", innerReport: "inner:1"}`）与 fixture 描述一致（native semantics, no stopPropagation），非缺陷。整卡 focus ring（tabIndex=0 + outline）可达可感（A2 pass）。
- **分层与阴影**：卡面为有意 flat 设计（boxShadow 全零，`ring-1 ring-foreground/10` 描边分层），dark 下 ring 换 `rgb(31,42,61)`，light/dark 阴影语义一致——不报。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-card` → carded（卡列填本路径）；findings 归族后 → digested。
