# [card] control:audio

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/audio` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic audio with controls and title（含 src 空、有值双值态）/ Host media in dialog + error fallback (C6.4 bug 73 pattern)）
- **矩阵裁剪**: simplified（matrixReason：原生 `<audio>` 单 surface，无 hover/focus 自绘态、无拖拽。实际裁掉：glass 皮肤、poster/autoPlay/loop 变体（fixture 未配置）、加载中 loading 态（data-URI 即时加载，探针 readyState=4 无法捕捉中间态）。播放态经原生 chrome 冒烟（chrome 为 shadow DOM 不可程序化取证，注明 §4）。）

## 1. 截图清单

| 状态                                            | light                                                                        | dark（真 data-mode，自采）                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800（全场景）                         | `_tmp/visual-inspection-2026-09-24/r2-2b/audio/default-full-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/audio/default-full-dark.png`       |
| 默认 800×900                                    | `_tmp/visual-inspection-2026-09-24/r2-2b/audio/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/audio/default-narrow-800-dark.png` |
| 媒体弹层开（audio 正常 + video error fallback） | `_tmp/visual-inspection-2026-09-24/r2-2b/audio/media-dialog-open-light.png`  | `_tmp/visual-inspection-2026-09-24/r2-2b/audio/media-dialog-open-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（原生 controls，浏览器 chrome 自管）A5 pass（空值态 `data-state="empty"` 显示"无来源"占位文本非空白；错误态 destructive 样式区分——audio.tsx [G1-R2-视角5-01] 契约生效）A6/A8 n/a A7 pass（弹层有关闭钮、Esc 可关：`dialogCountAfterEsc: 0`）A9 pass（onLoadError 触发 `window.__c6c4MediaError === "video-error-fired"`；error→fallback 无静默）
- B 颜色：B1 pass（dark 像素采样：title 对比 9.69、fallback 占位 9.77——`w1-audio2` PNG 采样）B2 n/a B3 pass（错误 pill `bg-destructive/10 + border-destructive/40`，与空值态 muted 文本可区分）B4 pass B5 warn（见 §4：`.nop-theme-root` 钉死 `color-scheme:light` → dark 页原生 chrome 亮色、弹层 portal 内反向暗色，族引用）B6 pass
- C 布局：C1 pass（docOverX=0；弹层内 overflow 命中均为 ui Dialog `sr-only` p/span，已知误报白名单排除）C2 pass C3 pass C4 pass（800 宽无溢出）C5 pass C6 n/a
- D 间隔：D1 pass（media→title 间距 4px（figure gap）一致）D2–D8 n/a/pass
- E 排布：E1–E3 pass（弹层内 audio 在上、error fallback 在下，顺序即数据顺序）E4 pass E5 n/a E6 pass（空值态有明确提示文案）
- F 一致性：F1–F3 n/a F4 warn（见 §4 i18n 族实例："无来源"/"加载失败"）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（surface 560×226，md 档）H3 pass（bottom 286 ≤ 792）H4 pass H8 n/a（内容短无滚动）H9 pass

## 3. 发现条目

### [R2-2b-C4-2] 原生 audio 元素固定 300px 固有宽度，不可经 schema 控制，宽容器下左对齐悬空

- **页面/路由**: `#/lab/audio`（场景 1；918px 宽 stage 内 audio 仅 300px）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/audio/default-full-light.png`、`_tmp/visual-inspection-2026-09-24/r2-2b/audio/default-full-dark.png`
- **目视描述**: 全宽场景卡片中，原生播放器只占左侧 300px，右侧大片空白，视觉上像未加载完成的半成品。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/out-w1-audio.json` structuralLight[0].media.box
  - 输出: `media.box { w: 300, h: 54 }`（stage 内容宽 918px）；audio.tsx 无宽度类透出，`<audio>` 走浏览器固有 300px 默认值，schema 无 width 字段（AudioSchema 仅 src/poster/autoPlay/loop/controls）。
- **对照基准**: 检查提示词 C4（视口弹性）；AMIS audio 自绘 chrome 全宽惯例
- **严重程度**: P3（不影响播放任务，观感问题；窄视口 800 下占比合理）
- **用户影响**: 宽布局下媒体控件显得零碎，用户可能误以为右侧应有内容未加载。
- **修复方向**: audio-renderer 给 `data-slot="audio-media"` 加 `w-full`（或提供 `width` schema 透传 + 默认 `w-full`）；长期可评估自绘 chrome 对齐 AMIS。
- **归族**: watch-only → 台账（单控件样式债，无跨页根因）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **`.nop-theme-root` 钉死 `color-scheme:light` 族（dark 原生控件 chrome 不适配）**：程序化坐实 `htmlCs: "dark" / rootCs: "light"`，audio 元素继承链 colorScheme 全 "light"（`out-w1-audio2.json`）——dark 页主面上原生播放器渲染为亮色 chrome（白底深图标）；而弹层 portal 在 BODY 下逃出 theme root，chrome 反转为暗色、落在白底弹层上（`media-dialog-open-dark.png` 双重错位）。引用族（宿主级 color-scheme 钉死），修复后需本卡 B5 复检。
- **i18n zh-CN 回退族**：空值态"无来源"、错误态"加载失败"（`t('flux.common.noSource')`/`t('flux.common.loadFailed')`）出现在全英文 lab 页——`out-w1-audio.json` structuralLight[1].fallback.text。引用族。
- **弹层 dark 亮底族**：media-dialog-open-dark.png 弹层整面白底，同 R2-2a dialog 卡引用的 `--popover dark 亮底` 宿主问题。引用族。
- **环境限制（注明）**：原生 `<audio controls>` 的播放/暂停/音量为浏览器 shadow DOM chrome，Playwright 探针不可达，播放交互无法程序化取证（探针已证实 `readyState: 4` 可解码加载成功）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-audio` → carded（卡列填本路径）；findings 归族后 → digested。
