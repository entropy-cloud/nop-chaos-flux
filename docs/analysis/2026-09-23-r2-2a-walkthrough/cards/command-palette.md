# [card] control:command-palette

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/command-palette` ｜ **载体**: lab 页（MultiScenarioLabPage，4 场景：静态分组 / 热键 / 受控开关 / source 动态项）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件——palette 为单弹层键盘控件，无拖拽→A6/A8 n/a、无表单→D5/H6 n/a；弹层开态必查已做（A7/H1/H3）；裁掉的状态：glass 皮肤、多选/嵌套弹层、`source` 拉取失败降级路径（fixture 无失败注入位））
- **runner dark 列作废声明**：同前（R2-2a-B5-34），dark 证据以自采 `r2-2a/command-palette/` 显式 data-mode 截图为准。

## 1. 截图清单

| 状态                          | light                                                                                        | dark（真 data-mode，自采）                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 默认（双 palette 开）1280×800 | `_tmp/visual-inspection-2026-09-23/lab-command-palette-default-1280x800-light.png`           | `_tmp/visual-inspection-2026-09-23/r2-2a/command-palette/auto-open-dark-1280.png`         |
| 默认 800×900                  | `_tmp/visual-inspection-2026-09-23/r2-2a/command-palette/auto-open-light-800.png`            | —                                                                                         |
| 热键打开（隔离）              | `_tmp/visual-inspection-2026-09-23/r2-2a/command-palette/hotkey-isolated-light-1280.png`     | `_tmp/visual-inspection-2026-09-23/r2-2a/command-palette/auto-open-dark-confirm-1280.png` |
| 过滤态（"cut"）               | `_tmp/visual-inspection-2026-09-23/r2-2a/command-palette/hotkey-filtered-cut-light-1280.png` | —                                                                                         |
| 空态                          | `_tmp/visual-inspection-2026-09-23/r2-2a/command-palette/empty-light-1280.png`               | —                                                                                         |
| 执行后关闭                    | `_tmp/visual-inspection-2026-09-23/r2-2a/command-palette/hotkey-after-enter-light-1280.png`  | —                                                                                         |
| item 悬停选中                 | `_tmp/visual-inspection-2026-09-23/r2-2a/command-palette/item-hover-retry-light-1280.png`    | —                                                                                         |

## 2. A–H 维度勾选表

- A 交互：A1 pass（item hover→cmdk data-selected，bg-accent 生效，`out-palette-hover.json`）A2 pass（输入框 focus ring 走 `input-group-control` 通道，源码注释 G6-R4 已修）A3 pass（item 高度 ≥28px，无 <24px 命中）A4 pass（disabled item `data-disabled=true aria-disabled=true` + pointer-events none + opacity 0.5，`out-palette-retry.json`）A5 pass（空态 "No commands available" 有意义非空白，role=status live region）A6 n/a A7 pass（开态：Esc 关、点外关、热键开、focus 落输入框）A8 n/a A9 pass（执行后 palette 关闭 + `Last command:` 文本更新通道存在）
- B 颜色：B1 pass（light item 文字对比正常）B2 pass B3 pass B4 pass（色值走 popover/accent/muted 令牌）B5 warn（**已知宿主问题引用不另立项**：dark 下弹层面板 `rgb(251,250,249)` 恒亮底——`--popover dark 亮底` 已知问题；dark 选中项 `rgb(236,243,254)` 底 + 深蓝字可读但与 dark 主题断裂，实例截图 `auto-open-dark-1280.png`）B6 pass
- C 布局：C1 pass（800 视口弹层 560px 居中，左右各 120px 余量，无溢出）C2 **warn(R2-2a-C2-07)**（fixture 双 defaultOpen 弹层同开堆叠）C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（item py-1.5、组 p-1 成体系）D2 pass（组间距 > 组内）D3–D8 n/a/pass
- E 排布：E1 pass（打开即可答：搜索框+分组命令）E2 pass（shortcut 右对齐 muted 弱化）E3 pass（Enter 执行高亮项、执行后关闭符合惯例）E4 pass E5 pass（分组 heading 视觉语言统一）E6 pass（空态有引导文案）
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（宽 560 = `--overlay-size-base` 档，落阶梯）H2 n/a H3 pass（top 197 + maxHeight 768 ≤ 视口）H4 pass（无 header 重叠；sr-only title 结构存在）H5 n/a（无 footer 按钮）H6 n/a H7 pass H8 pass（列表滚动在 CommandList max-h-72 内）H9 pass（800 视口不溢出）

## 3. 发现条目

### [R2-2a-C2-07] lab fixture 两个 `defaultOpen` palette 同开堆叠：载入即双层弹层、Esc 需按两次

- **页面/路由**: `#/lab/command-palette`（场景 1 basicPalette 与场景 4 sourcePalette 均声明 `defaultOpen: true`）
- **主题/视口/状态**: 双主题 / 全视口 / 页面载入即现
- **截图**: `_tmp/visual-inspection-2026-09-23/lab-command-palette-default-1280x800-light.png`
- **目视描述**: 页面载入后两个命令面板同时打开叠放，上层遮住下层场景内容；用户需连按两次 Esc 才能回到页面。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-palette-retry.mjs`
  - 输出: `autoOpenCount: 2`（载入即 2 个 `[data-slot="command"]` 同开）；Esc 循环 2 次后 `afterEscCount: 0`。首轮探针（`out-overlays.json`）因双开互相污染曾误判"过滤失效/Enter 不执行"，隔离复测（`out-palette-retry.json`/`out-palette-hover.json`）证实过滤（"cut"→仅 Cut）、Enter 执行并关闭（count 0）、点击执行并关闭（count 0）全部正常——**误报排除记录**：过滤与 Enter 执行为探针串扰，非控件缺陷。
- **对照基准**: 检查提示词 C2（浮层压内容，此处为弹层压弹层的 fixture 态）；A7（弹层打开态管理）
- **严重程度**: P3（fixture 演示参数选择；控件本身 defaultOpen 语义正确）
- **用户影响**: 走查者/使用者打开此 lab 页即被双层弹层拦截；照抄 fixture 的作者会复制出多弹层同开页面。
- **修复方向**: `apps/playground/src/component-lab/renderers/command-palette-lab-page.tsx` sourcePalette 场景去掉 `defaultOpen: true`（改为按钮或热键触发），或两场景其一改受控 `open` 演示。
- **归族**: watch-only → 台账（fixture 参数级；palette 控件无责）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- `--popover dark 亮底`（宿主已知问题）：dark 下 palette 面板恒 `rgb(251,250,249)` 亮底（探针 `darkSurfaceBg`，`out-palette-retry.json`；截图 `auto-open-dark-confirm-1280.png`）——引用宿主问题，本控件为其又一实例面。
- 调试 chip z9998 遮挡：`#lab-command-palette` 顶部 chip 照常出现，引用不立项。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/command-palette/design.md（owner-doc-missing，review-a D-5，2026-09-24）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-command-palette` → carded（卡列填本路径）；findings 归族后 → digested。
