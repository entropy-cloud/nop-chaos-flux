# [card] page:barcode-input

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/barcode-input` ｜ **载体**: domain demo 页（`apps/playground/src/pages/barcode-demo.tsx` + `flux-renderers-scheduling/src/barcode-input/`）
- **矩阵裁剪**: full（单扫/批扫两卡、输入/清除/焦点、扫码点击降级路径、双主题双视口全查；相机成功路径（取景框/torch）无法在无相机环境触发，裁剪理由：headless 无摄像头，扫码成功态由组件单测覆盖，本卡聚焦降级/错误态）

## 1. 截图清单

| 状态                                         | light                                                                          | dark                    |
| -------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| 默认 1280×800                                | `_tmp/visual-inspection-2026-09-23/r2-1d/barcode-input/default-light-1280.png` | `default-dark-1280.png` |
| 默认 ~800 宽                                 | `default-light-800.png`                                                        | `default-dark-800.png`  |
| hover/focus（输入框组 focus 边框转 primary） | —（computed `groupBorder: rgb(28,110,242)` 程序化判定）                        | —                       |
| typed（可清除钮出现）                        | `typed-light-1280.png`                                                         | —                       |
| 扫码点击后（无相机降级态）                   | `scan-clicked-nocam-light-1280.png`                                            | —                       |
| 扫码取景弹层                                 | n/a（无相机未出现，见 E2-01）                                                  | n/a                     |
| loading/empty/error                          | `scan-clicked-nocam-light-1280.png`（即错误态缺失的证据本身）                  | —                       |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 **pass（focus 指示 = input-group 边框转 primary `rgb(28,110,242)`，4.6:1）** A3 pass（按钮 24×24 达标） A4 n/a A5 **fail(E2-01：扫码点击无相机 = 静默无响应)** A6 n/a A7 n/a A8 n/a A9 **warn（清除/输入即时；扫码点击无反馈同 E2-01）**
- B 颜色：B1 pass B2 pass（focus 边框 3:1+） B3 pass B4 pass B5 **fail(B5-01 载体头部；表单卡本体 `rgb(15,23,41)` 适配正常)** B6 pass
- C 布局：C1 **warn(C1-01：两个 input-group 各 5px 横向溢出被裁)** C2–C8 pass/n-a
- D 间隔：D1–D8 pass（表单字段间距走 FieldFrame 基线）
- E 排布：E1 pass（两卡两模式可答） E2 **fail(E3-01：schema label 未渲染，仅 placeholder)** E3 pass E4 pass E5 pass（Card 分组） E6 warn（批扫队列为空时无「扫描后将在此排队」类提示，空区空白）
- F 一致性：F4 **warn（placeholder/Card 头 EN「Scan or type barcode.../Single Scan Mode」vs 按钮 zh「扫描条码/清除」）** F1/F3 pass
- G 设计器：n/a
- H 弹层：n/a（取景弹层未触发，见 E2-01）

## 3. 发现条目

### [R2-1d-E2-01] 扫码按钮在相机不可用时静默无响应（A5 错误态缺失）

- **页面/路由**: `#/barcode-input`（Single Scan 与 Batch Scan 两实例同）
- **主题/视口/状态**: light / 1280 / 点击「扫描条码」后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/barcode-input/scan-clicked-nocam-light-1280.png`
- **目视描述**: 点击扫码钮后无取景弹层、无错误提示、无 toast，页面毫无变化。
- **程序化证据**: 探针（点击 `button[aria-label='扫描条码']`，等待 1200ms）：overlay=false（无 `.nop-barcode-scanner-overlay`/dialog）、errorText=null、组件文本为空、console 无输出。源码 `barcode-input.tsx handleScanClick`：`checkCameraAvailability()` 返回 `isAvailable=false` 时直接 `return`（仅 catch 分支 set `cameraUnavailable` 错误文案），且 `showScanButton = … && (cameraAvailable !== false)` 意味着按钮随后静默消失——用户不知道发生了什么。
- **对照基准**: WCAG 3.3.1/状态提示；本仓 A5 判据「empty/error 有意义提示非空白」。
- **严重程度**: P2
- **用户影响**: 无相机/权限拒绝环境（企业桌面常见）下扫码功能表现为「按钮坏了」，无任何解释。
- **修复方向**: `handleScanClick` 的 `!result.isAvailable` 分支补 `setScannerError(t('flux.barcode.cameraUnavailable'))`（与 catch 分支对齐），错误文案渲染进既有 error region。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-E3-01] schema label 未可见渲染（仅 aria-label，placeholder 兜底）

- **页面/路由**: `#/barcode-input`
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/barcode-input/default-light-1280.png`
- **目视描述**: schema 声明 `label: 'Scan Barcode'`/`'Batch Scan'`，页面上字段无可见标签，仅剩 placeholder。
- **程序化证据**: 探针 labels=[]（页面无 label 元素）；`barcode-input.tsx` L307：`resolved.label` 仅作 `aria-label` 透传，无 FieldFrame/label 节点渲染。
- **对照基准**: WCAG 3.3.2（标签或说明；placeholder-only 为反模式）；flux 表单面 label-control 惯例（styling-system.md FieldFrame 契约）。
- **严重程度**: P2
- **用户影响**: 输入聚焦后 placeholder 消失，字段含义只剩卡片标题推断；屏幕阅读器外用户依赖卡片头猜字段。
- **修复方向**: barcode-input 接入 FieldFrame 渲染可见 label（或 demo schema 去掉 label 改纯 aria 命名——二选一，需契约裁定）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**族注（记录）**: C1-01 input-group 5px clipX（前导/尾随图标与输入框宽度差，视觉无损）→ P3 watch；E2-01 同页批扫队列为空的空白区 → P3（并入空态引导族观察）；中英混用 → R2-1d-F4-01 族；载体 `bg-white` 头部 dark 不可见 → **R2-1d-B5-01（kanban 卡，P1 systemic）**，本页 dark 截图同证。正例：focus 边框主色转换清晰、清除钮随值显隐、暗色卡片/输入组 token 适配完整。

## 4. 台账回写

- 本卡完成后：ledger.md `barcode-input` 行 status → `carded`；findings 归族后 → `digested`。
