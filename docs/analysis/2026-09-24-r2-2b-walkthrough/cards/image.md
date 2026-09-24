# [card] control:image

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/image` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic image with lazy / Host image fail + retry on src update (C6.1 host-img-lifecycle) / Fetcher-backed image）
- **矩阵裁剪**: simplified（matrixReason：单图 surface；值态（正常/缺失/恢复）已全查。实际裁掉：glass 皮肤、preview 点击放大态（fixture 未开 preview，`preview: null`）、title/object-fit 变体矩阵（cover 已实拍）、lazy IntersectionObserver 旧浏览器回退（Chromium 原生 lazy 生效，`loading: "lazy"` 实拍））

## 1. 截图清单

| 状态                                         | light                                                                         | dark（真 data-mode，自采）                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800（全场景）                      | `_tmp/visual-inspection-2026-09-24/r2-2b/image/default-full-light.png`        | `_tmp/visual-inspection-2026-09-24/r2-2b/image/default-full-dark.png`       |
| 默认 800×900                                 | `_tmp/visual-inspection-2026-09-24/r2-2b/image/default-narrow-800-light.png`  | `_tmp/visual-inspection-2026-09-24/r2-2b/image/default-narrow-800-dark.png` |
| 错误回退态（missing src → destructive pill） | —                                                                             | `_tmp/visual-inspection-2026-09-24/r2-2b/image/error-state-dark.png`        |
| src 修复后恢复（error 清除）                 | `_tmp/visual-inspection-2026-09-24/r2-2b/image/lifecycle-valid-src-light.png` | —                                                                           |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a A5 pass（error/empty 走 fallback pill + 文本，非裂图图标非空白）A6/A8 n/a A7 n/a A9 pass（lifecycle：missing src → `data-state="error"`；点 Set valid src → error 清除、img `complete: true, naturalW: 160` 渲染（无卡死回退）；fetcher 派发 → `{url}` → img 渲染）
- B 颜色：B1 pass（error pill dark 像素采样：destructive 深底 `rgba` 合成可读，红字醒目）B2 pass（pill `border-destructive/40`）B3 pass（错误=红语义）B4 pass B5 pass（dark 下 error pill 自适配深底，`error-state-dark.png`）B6 pass（destructive 走令牌非默认蓝红裸奔）
- C 布局：C1 pass（双视口 docOverX=0；fallback pill 与正常图同尺寸 160×90 占位，无布局跳动：retry 前后 box 完全一致）C2 pass C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1–D8 n/a/pass（单元素无兄弟节奏问题）
- E 排布：E1–E3 pass E4 pass（pill 文本居中）E5 n/a E6 n/a
- F 一致性：F1 pass（错误回退语言与 audio/video fallback pill 同构（border + /10 底 + destructive 文本））F2 n/a F3 pass F4 **warn(R2-2b-A9-5 相关，见发现)** F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-A9-5] image 错误回退 pill 文本显示 alt 而非失败语义文案，与 audio/video 错误态口径不一致

- **页面/路由**: `#/lab/image`（场景 2 Host image fail + retry；任意 src 404 的 image 同险）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / error 态（missing src）
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/image/error-state-dark.png`（深红 pill 内显示 "lifecycle image"——alt 文本）
- **目视描述**: 图片加载失败的红色占位 pill 里写的是图片的 alt 文本（"lifecycle image"），用户无法从文案上区分"这是替代文本"还是"加载失败"；对比同批 audio 错误态显式输出"加载失败"。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/out-w1-image.json` structLifecycle
  - 输出: `state: "error", fallbackText: "lifecycle image"`（= alt 值）；根因 image.tsx L213 `{alt || t('flux.common.noData')}`——error 与 empty 两态共用同一出口，error 态未输出失败文案（audio.tsx L58 对比：`errored ? t('flux.common.loadFailed') : t('flux.common.noSource')` 两态区分）。
- **对照基准**: 检查提示词 A9（交互后反馈可见）/F4（同语义文案一致）；A5（empty 有意义提示）
- **严重程度**: P3（红 pill 样式已传达异常，仅文案语义缺位；不阻断任务）
- **用户影响**: alt 描述性文本（如 "用户头像"）出现在错误占位里，用户误以为这是图片说明而非失败提示；跨媒体控件错误口径不统一。
- **修复方向**: image.tsx 错误分支改走 `t('flux.common.loadFailed')`（与 audio 对齐），alt 仅用于 empty 态占位或作为次要行；一行改动 + `__tests__/image.test.tsx` 补 error 文案断言。
- **归族**: watch-only → 台账（同族控件错误态文案口径；随 audio 的 i18n 修复批顺带收编）
- **复核状态**: 已复核（保留 P3，review-a 2026-09-24）：error pill 文本=出错图自身 alt（image.tsx L213 alt||noData 两态共用出口）

## 4. 已知族命中（引用，不另立项）

- **计划内锚点复检通过（正向确认）**：C6.1 host-img-lifecycle 契约——error 态随 src 更新正确清除（`retry.before.state "error"` → `retry.after` img 渲染无卡死回退）；fetcher 派发→data URI→渲染链路通（`structFetcher.imgEl.complete: true`）；native lazy 生效（`loading: "lazy"`）。
- **i18n zh-CN 回退族（关联）**：本控件的 noData 文案走 `t('flux.common.noData')`，宿主未初始化时同样会出中文（fixture 中 alt 覆盖了该路径，未实拍）；见 A9-5 修复方向一并收编。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-image` → carded（卡列填本路径）；findings 归族后 → digested。
