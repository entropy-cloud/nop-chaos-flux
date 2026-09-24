# [card] control:video

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/video` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic video（broken data-URI → error fallback）+ empty 变体 / Host media in dialog + error fallback C6.4）
- **矩阵裁剪**: simplified（matrixReason：媒体件；**任务矩阵的「播放控件 chrome」一项无法在载体页执行**——两个场景的 video src 均为故意损坏的 data-URI（`BROKEN_VIDEO_DATA_URI = data:video/mp4;base64,AAAA`），渲染面直接落 error fallback，`<video controls>` 原生控件被替换，无任何可播放 video fixture（dialog 内 audio 可播放、chrome 已取证），记 fixture gap；error/empty 异步面必查已做；loading 态为浏览器原生行为无自定义 UI（符合 A5——错误路径有 aria-live 提示））

## 1. 截图清单

| 状态                                        | light                                                                         | dark（真 data-mode，自采）                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 默认 1280×800（error fallback + empty）     | `_tmp/visual-inspection-2026-09-24/r2-2b/video/default-1280-light.png`        | `_tmp/visual-inspection-2026-09-24/r2-2b/video/default-1280-dark.png` |
| 默认 800×900                                | `_tmp/visual-inspection-2026-09-24/r2-2b/video/default-800-light.png`         | —                                                                     |
| empty 回退态                                | `_tmp/visual-inspection-2026-09-24/r2-2b/video/empty-fallback-light-1280.png` | —                                                                     |
| 弹层开态（audio 可播 chrome + video error） | `_tmp/visual-inspection-2026-09-24/r2-2b/video/dialog-open-light-1280.png`    | —                                                                     |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a A5 pass（error/empty 有 aria-live=polite 文本提示非空白；弹层内 audio 原生 chrome 可操作）A6–A9 n/a
- B 颜色：B1 **warn(R2-2b-B1-52)**（12px destructive 错误文本对比度不足）B2 n/a B3 pass（error 红系、empty muted 灰系语义正确）B4 pass（text-destructive/bg-destructive/10/text-muted-foreground 令牌）B5 pass（dark 红字提亮一档 rgb(217,38,38)，仍不足 4.5 同一 finding 覆盖）B6 pass
- C 布局：C1 pass（docOverX 0 双视口）C2 pass C3 pass C4 pass（800 宽 fallback 自适应）C5/C6 n/a
- D 间隔：D1 pass（fallback px-3 py-2 成体系）D2–D8 n/a/pass
- E 排布：E1 pass（error/empty 语义一目了然）E2–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 **warn（已知族引用不另立项）**（fallback 文案中文）F5 n/a
- G 设计器：n/a
- H 弹层：H1–H9 n/a（弹层几何归 dialog 卡契约；本卡弹层内只查媒体件）

## 3. 发现条目

### [R2-2b-B1-52] 12px destructive 错误文本在其 10% 红底上对比度 ~3.1:1（light）/ ~3.4:1（dark），低于 4.5:1

- **页面/路由**: `#/lab/video`（场景 1 error fallback「加载失败」；qrcode failed 态芯片同一文字样式模式；content 包错误回退通用写法 `text-xs text-destructive` + `bg-destructive/10`）
- **主题/视口/状态**: light + dark / 1280 / src 加载失败 error 态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/video/default-1280-light.png`、`default-1280-dark.png`
- **目视描述**: 红色小字「加载失败」压在浅红底上（dark 为暗红底），笔画细、颜色与底明度接近。
- **程序化证据**:
  - 探针: `out-w2-pixel-batch.json`（PNG 解码像素采样）+ `_tmp/r2-2b-probes/w2-status-video.mjs`（computed 色）
  - 输出: light：文字 rgb(239,67,67) vs 底（10% 红合成后）rgb(249,230,226) → 对比度 **约 3.1:1**；dark：rgb(217,38,38) vs rgb(38,26,33) → **约 3.4:1**；均低于 12px 文本要求的 4.5:1（WCAG 1.4.3）。同包 markdown error 因 R2-2b-B6-47 的覆盖反而以前景色通过——三处错误芯片呈现两种对比度形态。
- **对照基准**: WCAG 1.4.3；检查提示词 B1/B5；content 包内错误回退一致性（markdown/qrcode/video 三兄弟件）
- **严重程度**: P3（错误反馈文字短、邻近有边框/底色辅助暗示；不阻塞任务但为可读性硬伤）
- **用户影响**: 弱视/低端屏用户对错误原因文本辨识吃力；错误文案是恢复操作的起点。
- **修复方向**: content 包错误回退文字提到 `text-sm`（14px 仍不达标则加深文字色 `color-mix(in oklab, hsl(var(--destructive)) 80%, black)`）或底色降为 `bg-destructive/5`；建议收敛为包内共享的错误芯片样式常量，三处统一。
- **归族**: local → R2-4 批（content 包内样式模式统一修复）
- **复核状态**: 已复核（保留 P3，review-a 2026-09-24）：像素 light 3.14 / dark 3.4 与原卡逐项吻合；token 层与 R2-4 --destructive 族同修

## 4. 已知族命中（引用，不另立项）

- i18n zh-CN 回退族（引用不立项）：error「加载失败」/empty「无来源」（`t('flux.common.loadFailed'/'noSource')`）中文回退，英文页中文 chrome；修宿主 initFluxI18n 后复检。
- C6.4 锚点（dialog media + onLoadError）复检通过：弹层内 audio 正常加载且原生 chrome 可见（截图 dialog-open-light-1280.png），broken video 落 error fallback 且 `__c6c4MediaError: "video-error-fired"` 事件链路触发，非缺陷。
- fixture gap 登记：可播放 video（含 controls chrome、poster、autoplay/loop 变体）无任何 lab 场景，「播放控件 chrome」矩阵项本波未取证；建议补一个可播放小视频 fixture（blob/data-URI 均可）。
- 调试 chip / scope-debug 中文：载体环境族，引用不立项。

## 5. 交互键

- `{"lab-video": [{"action":"clickText","text":"Open media dialog"},{"action":"waitFor","selector":"[data-testid=c6c4-dialog-video-error]"}]}`（打开弹层：audio chrome + video error fallback 同屏；两选择器均为 lab 页真实元素）

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-video` → carded（卡列填本路径）；findings 归族后 → digested。
