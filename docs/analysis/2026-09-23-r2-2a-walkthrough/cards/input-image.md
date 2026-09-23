# [card] control:input-image

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-image` ｜ **载体**: lab 页（2 场景：thumbnail preview（uploadAction /api/upload-image 无宿主 fetcher）/ host fetcher 成功+失败双通道）
- **矩阵裁剪**: simplified（matrixReason：input-file 基线 + 缩略图壳层；error/result/缩略图态已查；crop 为 v1 未实现预留点，无法走查）。pending 态同 input-file 卡裁剪理由（fixture fetcher 即成败，120ms 截帧不可捕获）。dark 用真 data-mode 自采。
- **交互键说明**: 同 input-file——上传需 `setInputFiles`，runner 无该 action，无法注册交互键。

## 1. 截图清单

| 状态                                       | light                                                                                                                     | dark（真 data-mode，自采）                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 默认 1280×800                              | `_tmp/visual-inspection-2026-09-23/r2-2a/input-image/default-1280-light-viewport.png` / `default-1280-light-fullpage.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/input-image/default-1280-dark-viewport.png` |
| 上传错误态（/api/upload-image 不可用）     | `_tmp/visual-inspection-2026-09-23/r2-2a/input-image/s1-upload-error-light-1280.png`                                      | —                                                                                    |
| host 成功缩略图（离线断链形态）+失败错误行 | `_tmp/visual-inspection-2026-09-23/r2-2a/input-image/s2-thumbnail-and-fail-light-1280.png`                                | `_tmp/visual-inspection-2026-09-23/r2-2a/input-image/s2-thumbnail-dark-1280.png`     |
| 默认 800×900 窄视口                        | `_tmp/visual-inspection-2026-09-23/r2-2a/input-image/default-800x900-light-fullpage.png`                                  | —                                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass A3 pass（上传钮全宽、删除钮 28px）A4 n/a A5 pass（error 行红字清晰；**断链缩略图无加载失败反馈**见发现）A6/A8 n/a A7 n/a A9 pass（成功回写 url 并渲染 48×48 缩略图 img；失败值干净：echo 键 ok 有值）
- B 颜色：B1–B4 pass B5 pass（dark 下缩略图壳层/错误行正常）B6 pass
- C 布局：C1 pass（溢出命中仅 sr-only input，白名单）C2–C6 pass/n-a
- D 间隔：D1 pass（缩略图行与清空钮间距与 input-file 一致）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1 pass（与 input-file 上传钮/错误行/清空同形态）F2 n/a F3 pass F4 warn（已知族 F4-11："上传文件/清空/上传失败："中文 chrome + 中英混排错误消息）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A5-86] 缩略图断链无失败反馈：img 404 时退化为原生破图图标 + 截断 alt 文本（"https:/"）

- **页面/路由**: `#/lab/input-image`（S2 场景 host fetcher 返回 `https://cdn.example.com/demo.png`——headless 离线环境不可达，等价真实 CDN 断链）
- **主题/视口/状态**: light / 1280 / 上传成功后缩略图渲染态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-image/s2-thumbnail-and-fail-light-1280.png`（48×48 壳层内原生破图 + "https:/" 截断文本）
- **目视描述**: 上传成功回写 url 后缩略图位置显示浏览器原生碎图图标和被裁剪的 alt 片段，无 onError 兜底（占位图/重试图/tooltip）。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w5-input-image.mjs`（扫描 img `naturalWidth`）
  - 输出: `imgs:[{src:"https://cdn.example.com/demo.png", ok:false, w:48, h:48}]`——`naturalWidth 0` 断链、壳层仍按 48×48 渲染、alt 为 url 原文被裁。
- **对照基准**: 检查提示词 A5（加载失败应有意义提示非空白/破图）；内容渲染器图片兜底惯例
- **严重程度**: P3（fixture 的虚构 CDN 域名放大了暴露面；真实环境断链同样落入此形态，仅频率低）
- **用户影响**: 断链/权限失效的图片显示为破图，用户无法区分"上传成功但不可访问"与"渲染错误"。
- **修复方向**: `input-image-renderer.tsx` 缩略图 img 加 onError 兜底态（ImageOff 占位图标 + "图片不可用" tooltip），复用 Skeleton/Empty 令牌。
- **归族**: watch-only → 台账（fixture 离线放大；兜底 UI 缺失本身为渲染器缺口）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: "上传文件/清空/上传失败："中文 chrome；"上传失败：Image upload rejected"中英混排同 input-file 卡登记形态。
- 与 input-file 共享的基线通道（上传钮、rejection、error 行、清空）行为一致，无该控件特有族命中。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-image` → carded（卡列填本路径）；findings 归族后 → digested。
- 交互键：无法注册（同 input-file，上传需 setInputFiles）。
