# [card] control:qrcode

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/qrcode` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic qrcode with label and empty state / Host qrcode value update + canvas redraw C6.4）
- **矩阵裁剪**: simplified（matrixReason：canvas 一次性绘制控件，无交互态/无弹层；裁掉的状态：**error 容错态**（QRCode.toCanvas 失败路径需非法 value 组合，fixture 无触发入口，DOM 分支 `data-state="error"` 源码已核对：红框 destructive 样式 + onLoadError 事件）、level L/Q/H 变体（fixture 仅 M；容错级别差异不可视觉取证）、foreground/background 自定义色变体（fixture 未配，源码已核对默认黑/白））

## 1. 截图清单

| 状态            | light                                                                           | dark（真 data-mode，自采）                                             |
| --------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 默认 1280×800   | `_tmp/visual-inspection-2026-09-24/r2-2b/qrcode/default-1280-light.png`         | `_tmp/visual-inspection-2026-09-24/r2-2b/qrcode/default-1280-dark.png` |
| 默认 800×900    | `_tmp/visual-inspection-2026-09-24/r2-2b/qrcode/default-800-light.png`          | —                                                                      |
| empty 回退态    | `_tmp/visual-inspection-2026-09-24/r2-2b/qrcode/empty-fallback-light-1280.png`  | —                                                                      |
| host 更新重绘后 | `_tmp/visual-inspection-2026-09-24/r2-2b/qrcode/update-scenario-light-1280.png` | —                                                                      |

## 2. A–H 维度勾选表

- A 交互：A1–A9 n/a（canvas 展示件；Set value A 按钮归 button 卡）
- B 颜色：B1 pass（label 6.81:1 light；empty 回退 muted 6.81:1；dark label 按像素基线 ~9:1）B2 n/a B3 n/a B4 pass（回退色走 bg-muted/text-muted-foreground 令牌）B5 pass（**QR 画布 dark 下保持白底黑码——QR 扫描对比度是功能语义，判接受不立案**（设计允许的恒定面，同画布纸面豁免口径））B6 n/a
- C 布局：C1 pass（docOverX 0 双视口）C2 pass C3 pass C4 pass（inline-flex 居中不塌）C5 n/a C6 **warn(R2-2b-C6-49)**（canvas 位图尺寸未乘 DPR）
- D 间隔：D1 pass（canvas-label gap-2 成栅格）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（label 弱化为 muted 不抢主体）E3–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-C6-49] QR canvas 位图尺寸未按 DPR 放大（canvas.width == CSS 尺寸 == 128），HiDPI 屏上 2x 拉伸发虚

- **页面/路由**: `#/lab/qrcode`（全部场景；任意 size 配置同险）
- **主题/视口/状态**: 双主题 / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/qrcode/default-1280-light.png`（DPR=1 探针环境下清晰；HiDPI 需按机制推断）
- **目视描述**: 探针环境 DPR=1 下清晰；在 2x/3x 屏（macOS Retina、主流手机）上同一 128px 位图被浏览器拉伸到 256/384 物理像素，模块边缘发虚。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-qrcode.mjs` structural + canvasPixels
  - 输出: `canvasSize: { w: 128, h: 128, cssW: 128, cssH: 128 }`——位图分辨率与 CSS 尺寸 1:1，无 `devicePixelRatio` 缩放；canvas 内容绘制正常（dark 47% / light 53% 像素占比，QR 矩阵真实着色）；`QRCode.toCanvas` 调用仅传 `width: size`（renderer 源码），未乘 DPR。
- **对照基准**: 检查提示词 C6（canvas 尺寸与容器一致，DPR 换算）；canvas 渲染 HiDPI 惯例（bitmap = css × dpr）
- **严重程度**: P3（功能扫描通常仍可识别——QR 有容错冗余；属清晰度/质感缺陷而非不可用）
- **用户影响**: Retina/移动端上二维码边缘模糊，低容错（L 档）+ 小尺寸组合下扫描成功率下降。
- **修复方向**: renderer 绘制时 `const dpr = Math.min(window.devicePixelRatio || 1, 3)`，`QRCode.toCanvas(canvas, value, { width: size * dpr })` 并以 CSS `style.width/height = size` 回缩显示尺寸。
- **归族**: watch-only → 台账（canvas 控件通用缺口，image/sparkline 等 canvas 件可在 R2-3 收编统一处理）
- **复核状态**: 已复核（保留 P3，review-a 2026-09-24）：源码层无 DPR 处理坐实（qrcode.tsx L56 width:size 与 L84 style 双向）

## 4. 已知族命中（引用，不另立项）

- **dark 恒白面（判接受）**：QR 画布 dark 下保持白底黑码（`canvasStillWhite: [255,255,255]`）——扫描对比度是功能语义，归「画布纸面语义恒定」豁免口径，dark 截图已留档（default-1280-dark.png），不立案。
- empty 回退文本「无值」中文（`t('flux.common.noValue')`）：i18n zh-CN 回退已知族，引用不立项；英文页出现中文回退文案，修宿主 initFluxI18n 后复检。
- host 更新重绘（C6.4 锚点）程序化复检通过：Set value A 后 canvas toDataURL 变化（`changed: true`），空值回退→合法值恢复链路可用，非缺陷。
- 调试 chip / scope-debug 中文：载体环境族，引用不立项。

## 5. 交互键

- `{"lab-qrcode": [{"action":"clickText","text":"Set value A"},{"action":"waitFor","ms":300}]}`（Dynamic QR 重绘态；按钮为 lab 页真实元素）

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-qrcode` → carded（卡列填本路径）；findings 归族后 → digested。
