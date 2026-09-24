# [card] control:carousel

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/carousel` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic carousel with slides and indicators / Host carousel external control + onChange payload (C6.4) / Host carousel autoplay toggle (C6.4)）
- **矩阵裁剪**: simplified（matrixReason：轮播核心切换态（前后切换/指示器/autoplay）已全查；拖拽滑动为 embla 内建手势。实际裁掉：glass 皮肤、caption caption 文本变体（fixture 仅 title）、竖排 orientation（fixture 未配置）、触摸拖拽进行中帧（手势域，非状态矩阵）、reduced-motion 暂停（emulateMedia 无效环境，R2-2a-B5-34 同源限制））

## 1. 截图清单

| 状态                                 | light                                                                           | dark（真 data-mode，自采）                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 默认 1280×800（全场景）              | `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/default-full-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/default-full-dark.png`       |
| 默认 800×900                         | `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/default-narrow-800-dark.png` |
| 点击 next 后（第 2 张 + 指示器步进） | `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/after-next-light.png`         | `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/after-next-dark.png`         |
| host 组件句柄 setValue → 第 3 张     | `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/host-ctrl-slide3-light.png`   | —                                                                              |
| caption 渐变对比度采样位             | `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/caption-sample-light.png`     | —                                                                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（prev/next outline 按钮 hover 可感）A2 pass A3 pass（prev/next icon-sm 28×28；指示器按钮 24×24 恰达 WCAG 2.5.8（[G1-视角8-06] 契约：8px 圆点仅为视觉，按钮承载命中区））A4 n/a A5 pass（无图 slide 走 `carousel-item-placeholder` 占位非空白——renderer 代码路径，fixture 全配图未实拍）A6 n/a A7 n/a A8 n/a A9 pass（next 点击 `data-active-index 0→1` + 指示器 `activeDot` 步进；host 句柄 setValue → `active 2`、onChange payload `2|3|Third`（evaluationBindings + scope 双通道）；autoplay 离屏暂停/开关恢复全对）
- B 颜色：B1 pass（caption 白字压 `from-black/60` 渐变：PNG 像素采样底部 11.98、中部 8.35，双档均 ≥4.5）B2 pass（outline 按钮边框双主题可辨）B3 n/a B4 pass B5 pass（dark 下按钮/指示器/占位底色全走令牌）B6 pass（active 指示器 bg-primary、非 active muted-foreground/30，层级分明）
- C 布局：C1 **warn(R2-2b-C1-4)**（prev/next 按钮越出宿主 stage 边界 11px）C2 pass C3 pass C4 pass（800 宽 438px 轮播适配，按钮虽越界但 docOverX=0 无页面横滚）C5 n/a C6 n/a
- D 间隔：D1 pass（指示器 `mt-2 flex gap-2`：24px 按钮间 8px 落栅格）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（active 圆点实心 primary 强于灰点）E3 pass（左右箭头分列两侧、指示器居中，惯例位）E4 pass（指示器对齐画布中轴 744/776 对称）E5 n/a E6 n/a
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-C1-4] prev/next 按钮绝对定位 -left-12/-right-12 越出宿主容器边界 11px，骑压 stage 描边

- **页面/路由**: `#/lab/carousel`（全部 3 个场景同险；任意两侧 padding <48px 的宿主容器内使用 carousel 同险）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 与 800 双视口 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/carousel/default-full-light.png`（左箭头悬在 stage 圆角描边外侧页面上）、`_tmp/visual-inspection-2026-09-24/r2-2b/carousel/default-narrow-800-light.png`（右箭头距视口缘仅 13px）
- **目视描述**: 左右圆形箭头按钮一半在 stage 卡片外、一半压在描边上，像脱手的浮点；800 宽下右箭头几乎贴住视口边缘。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/out-w1-carousel.json` structuralLight/structuralNarrow/structuralDark（button rect vs stage rect 求差）
  - 输出: `prevOutOfStage: 11, nextOutOfStage: 11`（三组一致）；light 1280: prev.x 253 vs stage.x 264；next 右缘 1267 vs stage 右缘 1256。根因：ui CarouselPrevious/Next 固定 `-left-12/-right-12`（48px 外扩），lab stage p-5（20px）容不下，按钮侵入宿主 padding 仍不足再外溢 11px。
- **对照基准**: 检查提示词 C1（无意外溢出/画布被裁）/C2（浮层压内容）；ui carousel.tsx L192/L222 定位类
- **严重程度**: P3（不裁切、不遮内容、可点；观感错位明显，窄宿主下有贴边/裁切风险）
- **用户影响**: 箭头"浮"在容器外造成归属困惑；嵌入更窄容器（侧栏轮播）时会溢出裁切。
- **修复方向**: flux-renderers-content carousel 在 `showControls` 分支给 ui 包一层 `px-12`（为外扩按钮预留两侧 48px），或改用容器内嵌定位（`left-2/right-2`）替代 -left-12 外扩。
- **归族**: local → R2-4 批（单组件定位假设与宿主 padding 不匹配；修复点唯一）
- **复核状态**: 已复核（保留 P3，review-a 2026-09-24）：3 场景 11px 越界逐位复现（ui carousel.tsx L194 -left-12 / L224 -right-12）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退族**：ui Carousel 根 region `aria-label="轮播图"`（`out-w1-carousel` 探针 DOM dump），sr-only prev/next 文案同源 flux-i18n zh 资源。引用族。
- **计划内锚点复检通过（非缺陷澄清）**：autoplay 初始探针"2 秒不动"为 WCAG 2.2.2 离屏暂停按设计生效——滚动入视口后 `idx 1→0`（loop 前进）、开关 OFF 后 2 秒冻结、重新 ON 恢复前进（`out-w1-carousel2.json` autoplayScrolled），控件双职责（自动播放 + 用户暂停权）同时满足，正向确认。
- **embla 内容溢出命中说明**：窄视口 overflow 扫描中 `carousel-content overX 454/908` 为 embla 滑轨固有横向排布（容器 overflow-hidden 有意裁切），白名单排除；真实越界仅 C1-4 的 11px 按钮外溢。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-carousel` → carded（卡列填本路径）；findings 归族后 → digested。
