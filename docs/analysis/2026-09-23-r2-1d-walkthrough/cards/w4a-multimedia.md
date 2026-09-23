# [card] page:w4a-multimedia

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w4a-multimedia` ｜ **载体**: domain demo 页（`apps/playground/src/pages/w4a-multimedia-demo.tsx` + `flux-renderers-content/src/{audio,video,carousel,qrcode}.tsx`）
- **矩阵裁剪**: simplified（控件 demo 页，非无条件全矩阵清单；执行 light+dark × 1280/800 双主题双视口、元素态抽样（键盘 Tab 焦点环、programmatic focus）、中间态（carousel next/setValue 点击、audio error 事件）；裁掉：glass 皮肤抽查（基线仅 classic，与 R2-1a 口径一致）、autoplay 轮播态（schema autoPlay:false，无自动播中间态）、真实音视频播放态（headless 无编解码输出，控件渲染已取证））

## 1. 截图清单

| 状态                        | light                                                                           | dark                     |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------ |
| 默认 1280×800               | `_tmp/visual-inspection-2026-09-23/r2-1d/w4a-multimedia/default-light-1280.png` | `default-dark-1280.png`  |
| 默认 ~800 宽                | `default-light-800.png`                                                         | `default-dark-800.png`   |
| carousel next 点击后        | `carousel-next-clicked-light-1280.png`                                          | —                        |
| carousel setValue → slide 3 | `carousel-setvalue-slide3-light-1280.png`                                       | `carousel-dark-1280.png` |
| focus（Tab 键序）           | —（程序化判定 `has-ring`，见 §3）                                               | —                        |
| loading/empty/error         | 默认图内：无来源/加载失败/无值 三态齐                                           | 同左                     |

## 2. A–H 维度勾选表

- A 交互：A1 pass（carousel 圆钮 hover 由 nop-haptic 承载） A2 pass（Tab 键序 BUTTON `shadow has-ring`；audio/video 原生控件 outline auto） A3 pass（轮播前后钮 28×28、指示点 24×24、handle 按钮 ≥28） A4 n/a A5 **pass（空/错/载三态齐备：无来源纯文本、加载失败 destructive 盒、qrcode 无值 128px 占位）** A6 n/a A7 n/a A8 n/a A9 pass（next 后 transform -515px、setValue 后第 3 点 active）
- B 颜色：B1 pass B2 pass（焦点环 3px） B3 pass B4 pass B5 **fail(B5-30：原生媒体控件 dark 下亮色 chrome)** B6 pass
- C 布局：C1 pass（clipX 命中均为 embla overflow-hidden 有意裁切，视觉无损） C2 pass C3 pass C4 **warn(C4-30：video 64×48 / audio 300px 不随容器伸缩)** C5 pass C6 pass（qrcode canvas 128/96 与 clientWidth 一致）
- D 间隔：D1–D8 pass（宿主 Card 栅格；组件间 16px）
- E 排布：E1 pass E2 pass E3 pass E4 **warn(E4-30：轮播箭头越出宿主卡边 19px)** E5 pass E6 pass（空态有文案）
- F 一致性：F1–F5 pass（中文文案统一：上一张/下一张/前往第 N 张）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-B5-30] dark 模式下原生音视频控件保持亮色 chrome

- **页面/路由**: `#/w4a-multimedia`（audio/video 所有实例；任何挂原生媒体/日期/滚动条的页面同根因）
- **主题/视口/状态**: dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w4a-multimedia/default-dark-1280.png`（audio 白色胶囊控件浮在深底上）
- **目视描述**: dark 下整页已切换深色，但原生 `<audio controls>` 渲染为亮白色控件、`<video>` 控制条同为亮色，与深底强冲突。
- **程序化证据**: 探针（`data-mode=dark` 后沿 audio 祖先链读 `getComputedStyle().colorScheme`）：html/body/`.root` = `dark`，**`.nop-theme-root` = `light`**，audio = `light`。根因定位 `apps/playground/src/styles.css` L97–176：`.nop-theme-root { … color-scheme: light; … }` 无条件钉死；L190 `[data-mode='dark'] .nop-theme-root` 只 retune 变量未补 color-scheme。反证实验：inline 置 `.nop-theme-root{color-scheme:dark}` 后 audio computed = `dark`。
- **对照基准**: WCAG 1.4.11 / B5 dark 平价；检查提示词 B5「dark 专有缺陷单独登记」。
- **严重程度**: P2
- **用户影响**: dark 主题用户看到刺眼亮色媒体控件；同根因波及原生 scrollbar/date-picker/`<select>` 弹出等 shadow-DOM chrome。
- **修复方向**: playground shell CSS `[data-mode='dark'] .nop-theme-root` 块补 `color-scheme: dark;`（一行）；若 flux 宿主普遍存在，考虑 theme-tokens 提供对称规则。
- **归族**: systemic → R2-3 批（theme 切换 × 原生控件 chrome，波及面=所有 `.nop-theme-root` 宿主）
- **复核状态**: 未复核

### [R2-1d-C4-30] video/audio 无 width 时按固有/默认尺寸渲染，不随容器自适应

- **页面/路由**: `#/w4a-multimedia`（demo-video、demo-audio）
- **主题/视口/状态**: light+dark / 1280 与 800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w4a-multimedia/default-light-1280.png`（"Sample video clip" 仅 64×48 小黑块）
- **目视描述**: video 渲染为 64×48 迷你块（近似不可用），audio 固定 300px，均明显窄于 514px 容器；800 视口下不变。
- **程序化证据**: 探针 media 尺寸：1280 下 `video 64×48`、`audio 300×54`；800 下完全相同。源码 `packages/flux-renderers-content/src/video.tsx` L24–29：videoStyle 仅 `maxWidth:'100%'` + schema 显式 width/height，无默认宽度基线；audio.tsx 同构。demo schema 未传 width。
- **对照基准**: C4 视口弹性；HTML媒体元素默认尺寸行为（video=intrinsic、audio=UA 默认 300px）；对照 image renderer 的自适应基线。
- **严重程度**: P3
- **用户影响**: 不传 width 的视频按源固有尺寸渲染，宽容器内呈小块；控件 demo 观感"坏了"，真实页面同配置同问题。
- **修复方向**: 渲染器提供宽度基线（如 video 默认 `width:100%` + aspect-ratio 保比例，或 schema 默认值裁定）；demo schema 至少补 `width`。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-E4-30] carousel 前后箭头外置越出宿主容器边界

- **页面/路由**: `#/w4a-multimedia`（demo-carousel）
- **主题/视口/状态**: light+dark / 1280 与 800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w4a-multimedia/default-light-1280.png`（左右箭头压在虚线宿主边框上）
- **目视描述**: ‹ › 两枚圆形箭头中心位于轮播视口之外，半个圆压在 demo 宿主卡（`w4a-renderer-host` 虚线边框）及页边留白上。
- **程序化证据**: 探针几何：hostLeft=40 / hostRight=612，左箭头 x=21–49、右箭头 x=603–631 → 两侧各越界 19px；nop-carousel 视口 514px。
- **对照基准**: E4 对齐/组件与容器边界；embla/shadcn Carousel 外置箭头模式要求宿主预留横向空间。
- **严重程度**: P3
- **用户影响**: 视觉上箭头"挂"在卡片外缘，窄宿主（p-3 demo 容器）下观感破损；可点击性不受影响。
- **修复方向**: 二选一：carousel 箭头改内浮于视口（overlay 模式），或组件约定宿主侧预留 ≥20px 水平边距并写入 styling-system.md。
- **归族**: watch-only → 台账（组件设计选择 vs 宿主责任待裁定）
- **复核状态**: 未复核

**族注（记录）**: ①A5 正例——audio/video/qrcode 空/错三态齐备（无来源/加载失败/无值），error 态带 destructive 边框底色，aria-live=polite；audio/video 空态为 16px 纯文本行、qrcode 空态为 128px 占位框，形态不一致记 P3 观察。②A9 正例——`component:next` 后 embla transform -515.32px、`component:setValue` 后第 3 指示点 active，句柄链路可用。③误报排除——overflow 扫描的 `nop-page/nop-carousel/overflow-hidden clipX 32–1060px` 全部为 embla 轨道 `basis-full pl-4` 克隆片在 overflow-hidden 内的有意裁切，非视觉缺陷；④qrcode canvas 非空白（getImageData 像素验证）、128/96 与 schema size 一致。

## 4. 台账回写

- 本卡完成后：ledger.md `w4a-multimedia` 行 status → `carded`（card 列填本卡路径）；findings 归族后 → `digested`。
