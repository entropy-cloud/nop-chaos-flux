# [card] control:countdown

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/countdown` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host countdown finish (C7)，1.5s time 倒计时、format 'ss'、prefix/suffix、onFinish→probe）
- **矩阵裁剪**: simplified（matrixReason：单文本 surface 无弹层无拖拽；lab fixture 仅含 time:1500 一组配置，paused / autoStart=false / millisecond / targetTime / missing-config 回退态无 schema 通路不可达（归渲染器单测覆盖），本卡实测态：running（转瞬）/ finished × light+dark × 1280/800/375）
- **dark 证据声明**：卡内全部 dark 截图为自采真 `data-mode="dark"`（R2-2a-B5-34：runner emulateMedia 无效）；dark 对比度数值按 R2-2a 方法学以 PNG 像素采样判读（lab 渐变背景下 DOM 合成对比度系统性失真，见 §5 误报排除）。

## 1. 截图清单

| 状态                                   | light                                                                      | dark（真 data-mode，自采）                   |
| -------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| running（转瞬，跨过 400ms 等待后即拍） | `_tmp/visual-inspection-2026-09-24/r2-2b/countdown/running-light-1280.png` | —（状态机与主题无关）                        |
| finished 1280×800                      | `…/countdown/finished-light-1280.png`                                      | `…/countdown/finished-dark-1280.png`         |
| finished 800×900                       | `…/countdown/finished-light-800.png`                                       | `…/countdown/finished-dark-800.png`          |
| finished 375×812（整页）               | `…/countdown/finished-light-375.png`                                       | `…/countdown/finished-dark-375.png`          |
| finished 375×812（场景区滚动后）       | `…/countdown/finished-light-375-scenario.png`                              | `…/countdown/finished-dark-375-scenario.png` |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（纯文本无 hover 面）A2 n/a（span 不可聚焦，无焦点环面）A3 pass（无交互控件，smallTargets 扫描零命中）A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a（无手势/拖拽）A9 pass（归零后 `data-finished=true` 翻转 + onFinish 派发恰好一次：`window.__c7finish === "finish"`，C7 probe 通路生效；视觉侧反馈缺失归入 R2-2b-A9-181）
- B 颜色：B1 pass B2 n/a B3 n/a B4 pass（color 走令牌族值，light `rgb(33,53,71)` / dark `rgb(230,236,243)`）B5 pass（像素采样 dark 文本 14.33:1 ≥4.5，`w6-pixel-sample.mjs`）B6 n/a
- C 布局：C1 pass（1280/800 零溢出 `docOverX:0`；375 命中见 C4）C2 pass C3 pass C4 **warn（家族引用，不立项）**（375 下 lab 壳层固定侧栏压内容列至 87px，countdown span 被压至 13px client 宽（scrollW 18，overX 5），文本逐字竖排——根因在载体壳层，见 §4 已知族 #1）C5 pass C6 n/a
- D 间隔：D1–D8 n/a/pass（单行文本 surface）
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 n/a E6 n/a
- F 一致性：F1–F3 n/a F4 n/a（fixture 文案与宿主同为中英混排，无新增 chrome 文案）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-A9-181] 倒计时结束态零视觉差分且对 AT 零播报：数字停在 "00" 与运行态同色同权重，`aria-live="off"` 下屏幕阅读器全程无感知

- **页面/路由**: `#/lab/countdown`（场景 Host countdown finish (C7)；任何 countdown 归零场景同险）
- **主题/视口/状态**: 双主题 / 全视口 / finished 态（1.5s 归零后持久）
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/countdown/finished-light-1280.png`（与 `running-light-1280.png` 逐字节同貌，仅数字 01→00）
- **目视描述**: 倒计时结束后界面仅从"剩余 01 结束"变为"剩余 00 结束"，颜色/字重/字号与运行态完全一致，无完成提示、无变灰、无状态徽标；运行中与结束后无法从视觉区分"已结束"与"暂停在 00"。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w6-countdown.mjs` structural（running/finished 双采样）
  - 输出: `runningLight1280: { fontSize:'16px', fontWeight:'400', color:'rgb(33,53,71)', ariaLive:'off' }` 与 `finishedLight1280` 完全相同（零样式差分）；`data-finished: 'false'→'true'`、`remaining:'1500'→'0'` 仅属性翻转；`finishProbeValue:'finish'`（事件通路正常）。dark 同（像素采样 14.33:1，可读性无虞）。
- **对照基准**: 检查提示词 A9（交互后反馈可见）；WCAG 4.1.3 状态消息（视觉用户可从数字归零推断结束，AT 用户全程 `aria-live="off"` 无任何播报；组件 missing-config 分支自身使用 `role="status" aria-live="polite"`，与主分支语义不一致）。
- **严重程度**: P3（结束信息对视觉用户可推断；AT 用户与"暂停"态不可分辨，无任务阻塞）
- **用户影响**: 依赖读屏器的用户不知道倒计时已结束；视觉用户需自行注意数字，完成时刻无任何强调（如秒杀/抢购场景结束瞬间易错过）。
- **修复方向**: `packages/flux-renderers-mobile/src/countdown.tsx` 主分支：① finished 态追加一次 polite 播报（如收尾时渲染 `<span class="sr-only" role="status">倒计时已结束</span>`，避免逐秒播报不变）；② finished 态加视觉档（`data-finished="true"` 时切 `text-muted-foreground` 或后缀高亮），令结束与暂停可区分。
- **归族**: local → R2-4 批（countdown 单控件行为/语义；与 R2-1d 裁定的 mobile 渲染器契约族无关联）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）：running/finished 四元组零差分、aria-live=off 全复现；data-finished 出 DOM 但 CSS 消费 0 命中

## 4. 已知族命中（引用，不另立项）

- **窄视口 flex/固定壳层（R2-3c 候选族）**：375 视口下 lab 壳层（`COMPONENT LAB` 侧栏固定 ~240px）把内容列压至 87px，`scenario-stage` 87px / `page-body` 45px / countdown span 13px（scrollW 18）逐字竖排（`finished-light-375-scenario.png`）。探针 `out-w6-countdown.json` overflow375Light/hits（`multi-scenario-lab` overX 43、`nop-page` overX 64）。根因在载体壳层非控件——本波 5 个 mobile 控件卡同命中，统一引用本族，不重复立项。
- **调试 chip z9998 遮挡族**：375 整页截图中左上"⑧ 0"chip 压 back 箭头区（`finished-light-375.png`），引用不立项。
- **计划内正向锚点**：MA-16/OA-21 墙钟派生倒计时在真实浏览器节流下走秒无漂移（running→finished 时间线吻合 1.5s）；onFinish 恰好一次（finishedRef 守卫生效，C7 probe 复验通过）。

## 5. 误报排除记录

| 疑点                            | 排除理由                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dark 下 DOM 合成对比度 1.19:1   | lab 内容区为渐变背景（无 opaque backgroundColor），合成基线系统性回退白色（R2-2a 方法学注意②）；PNG 像素采样实测文本 14.33:1 / 底 15.45:1（`w6-pixel-sample.mjs`），非缺陷 |
| running 截图显示 "01" 而非 "02" | `format 'ss'` = floor(remaining/1000)，1.5s 配置合法显示 01→00，非 off-by-one                                                                                              |

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-countdown` → carded（卡列填本路径）；
- findings：R2-2b-A9-181 → local 归 R2-4 批后 → digested；批内复检通过后 → verified。
