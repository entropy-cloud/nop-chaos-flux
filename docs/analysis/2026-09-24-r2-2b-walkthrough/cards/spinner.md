# [card] control:spinner

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/spinner` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic spinner with label / Host spinner visible toggle C6.2）
- **矩阵裁剪**: simplified（matrixReason：加载指示件；裁掉的状态：**size 档 sm/lg**——任务矩阵要求的「尺寸档」两个 fixture 场景均未配置 size schema（仅默认 md），CSS 档 `sm: size-3 / md: size-4 / lg: size-6` 已源码静态核对，渲染面无法取证，记 fixture gap；「容器内居中」：控件本体 `inline-flex`，居中归属容器布局职责，lab 载体为左上起点属载体行为，不立案）

## 1. 截图清单

| 状态                              | light                                                                       | dark（真 data-mode，自采）                                              |
| --------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 默认 1280×800                     | `_tmp/visual-inspection-2026-09-24/r2-2b/spinner/default-1280-light.png`    | `_tmp/visual-inspection-2026-09-24/r2-2b/spinner/default-1280-dark.png` |
| 默认 800×900                      | `_tmp/visual-inspection-2026-09-24/r2-2b/spinner/default-800-light.png`     | —                                                                       |
| host 隐藏后（meta.visible=false） | `_tmp/visual-inspection-2026-09-24/r2-2b/spinner/after-hide-light-1280.png` | —                                                                       |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a A5 pass（本项目 loading 面即 Spinner 本体，旋转动画真实运行——svg rect 22px 为 16px 方形旋转 45° 时的包围盒 16×√2≈22.6，非尺寸异常）A6–A9 n/a
- B 颜色：B1 n/a（无文本对比度面；label 为 fixture 文本走前景）B2 n/a B3 n/a B4 pass（svg 前景色继承走令牌）B5 pass（dark svg/label rgb(230,236,243) 可见）B6 n/a
- C 布局：C1 pass（docOverX 0）C2 pass C3 pass C4 pass C5/C6 n/a
- D 间隔：D1 pass（spinner-label gap-2）D2–D8 n/a/pass
- E 排布：E1–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 **warn（已知族引用不另立项）**（aria-label 中文，见已知族节）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

- 本卡无新增 finding。程序化核对全部通过：
  - 探针 `_tmp/r2-2b-probes/w2-sep-spin.mjs`：`data-size="md"`、svg `lucide-loader-circle animate-spin size-4`（16px）、`role="status"`、label "Loading…" 渲染；C6.2 visible 锚点复检通过——点击 Hide spinner 后 `[data-testid=c6c2-spinner]` 节点从 DOM 完全移除（`before: true → after: false`），非仅视觉隐藏。

## 4. 已知族命中（引用，不另立项）

- i18n zh-CN 回退族（引用不立项）：`aria-label: "加载中..."`（`t('flux.common.loading')`）在英文页输出中文 a11y 文本——不可见但可被读屏读到，与 dialog 卡 R2-2a-F4-11 同根因；修宿主 initFluxI18n 后复检。
- fixture gap 登记：size sm/lg 档无 lab 场景（同 progress variant 缺口模式），建议补 fixture。
- 调试 chip / scope-debug 中文：载体环境族，引用不立项。

## 5. 交互键

- `{"lab-spinner": [{"action":"clickText","text":"Hide spinner"},{"action":"waitFor","ms":300}]}`（隐藏后态；按钮为 lab 页真实元素 `[data-testid=c6c2-toggle-spinner]`）

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-spinner` → carded（卡列填本路径）。
