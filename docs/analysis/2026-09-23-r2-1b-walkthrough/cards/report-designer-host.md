# [card] page:report-designer-host

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/report-designer-host` ｜ **载体**: 域页面（`report-designer-page` host renderer 默认工作台：report-toolbar + 字段面板 + inspector shell + spreadsheet 画布 + 空模板 fallback；demo 自带 "Toggle empty template" 探钮与 host-dirty-probe）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查——本波统一裁剪；G5 n/a——无缩放控件；H 弹层未在本页重复取证——本页弹层与 `#/report-designer` 同组件（SheetTabBar 删除确认 Dialog），取证引用 report-designer 卡，本页未单独截弹层帧；A6 拖拽链路引用 report-designer 卡同组件证据）

## 1. 截图清单（状态矩阵）

| 状态                  | light                                                                                                      | dark                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 默认 1280×800         | `_tmp/visual-inspection-2026-09-23/r2-1b/report-designer-host/report-designer-host-default-wide-light.png` | `…/report-designer-host-default-wide-dark.png`   |
| 默认 800×900          | `…/report-designer-host-default-narrow-light.png`                                                          | `…/report-designer-host-default-narrow-dark.png` |
| 选中单元格            | `…/report-designer-host-cell-selected-light.png`                                                           | —（同探针 JSON）                                 |
| 行内编辑→dirty        | `…/report-designer-host-edited-dirty-light.png`                                                            | —                                                |
| undo 后               | `…/report-designer-host-after-undo-light.png`                                                              | —                                                |
| preview 点击后        | `…/report-designer-host-after-preview-light.png`                                                           | —                                                |
| 空模板 fallback（G4） | `…/report-designer-host-empty-template-light.png`                                                          | `…/report-designer-host-empty-template-dark.png` |
| 弹层打开              | 引用 report-designer 卡（同 SheetTabBar Dialog 组件）                                                      | 同左                                             |
| 拖拽进行中            | 引用 report-designer 卡（同字段面板/画布组件）                                                             | —                                                |
| loading/empty/error   | G4 行即 empty-template 态；loading n/a（无异步面）                                                         | —                                                |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔（同 ui Button 族） A3 fail(R2-1b-A3-01 同族扩面：本页同款 `spreadsheet-header-button` 21.2px，见 report-designer 卡，不重复立项) A4 ✔（初始 撤销/重做 disabled 置灰，编辑后启用） A5 n/a A6 引用（同组件） A7 引用（同组件） A8 ✔（"插入"非拖拽路径在） A9 **fail(R2-1b-A9-01)**（preview 静默完成）
- B 颜色：B1 ✔ B2 ✔ B3 ✔ B4 warn（见下方"R2-1a-B5-02 既有族扩面"条目：徽章 literal 配色） B5 ✔（除徽章外 dark 平价；demo 顶栏透明底 dark 正常，无 report-designer 卡 B5-01 白带问题——`toolbarEffBg=rgb(55,62,71)` 实测） B6 ✔
- C 布局：C1 ✔（800 视口 `section sw=800=cw`，无溢出——与 report-designer demo 页行为不同，host 壳自适应） C2 ✔ C3 ✔（工具栏/状态行/三区清晰） C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔ D2 ✔ D3 ✔ D4 ✔ D5 n/a D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 warn（预览为 primary 蓝实心、保存为 outline——保存层级弱于预览，惯例上主操作应为保存；P3 观察归 watch） E3 ✔ E4 **fail(R2-1b-E4-01)**（状态摘要两段无分隔拼接） E5 ✔ E6 ✔
- F 一致性：F1 ✔（撤销/重做/保存/预览语义与全站一致） F2 warn（工具栏形态为文本按钮系，与 report-designer demo 的图标系不同代际——host 为正式 report-toolbar，demo 为 spreadsheet 工具栏，页面定位不同，不立项） F3 ✔ F4 ✔（本页文案全中文一致） F5 n/a
- G 设计器：G1 引用（同网格组件） G2 引用 G3 引用 G4 ✔（本页专属证据） G5 n/a G6 ✔（本页专属：undo 联动 dirty 基线） G7 ✔（cell→inspector 文案切换实测） G8 ✔（dark 网格正常）
- H 弹层：H1–H9 引用 report-designer 卡（同 Dialog 组件实测 560/base、footer flex-end；本页无新增弹层面）

## 3. 发现条目

### [R2-1b-A9-01] 预览（preview）动作静默完成：适配器已执行但页面零可见反馈

- **页面/路由**: `#/report-designer-host`（report-toolbar "预览" 按钮）
- **主题/视口/状态**: light / 1280×800 / 点击预览后 1s
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/report-designer-host/report-designer-host-after-preview-light.png`（与点击前帧无差异）
- **目视描述**: 点击"预览"后页面无任何变化——无 toast、无状态行更新、无预览结果呈现，按钮也无 loading 态。
- **程序化证据**:
  - 探针: 点击前后 DOM diff + `window.__REPORT_DESIGNER_HOST__.getPreviewCalls()`（`report-designer-host-out.json` → preview；`report-designer-host-badge.json` → previewFeedback）
  - 输出: `callCount: 1`（适配器确被调用，入参 mode=inline）；`hasPreviewOk=false`、`hasRunning=false`，全页 innerText 无任何预览结果/运行中痕迹；statusPath 摘要行与 dirty 探针均无变化
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；report-designer/design.md §10（preview 返回 `{ok, cancelled?, changed?, data?}` envelope——envelope 有值但无任何消费面呈现）
- **严重程度**: P2（设计器工具栏高频动作完成后无反馈，用户会判定"按钮坏了"重复点击）
- **用户影响**: 无法确认预览是否成功、结果是什么；预览能力在 UI 上等于不存在。
- **修复方向**: host 默认工作台为 preview envelope 增加最小消费面：statusPath 摘要行显示 `预览中…/预览完成（mode）`，或结果以 toast/轻量面板呈现；至少 previewRunning 期间给"预览"按钮 loading 态。
- **归族**: local → R2-4 批（host 默认工作台 preview 反馈面）
- **复核状态**: 未复核

### [R2-1b-E4-01] 状态摘要"目标/字段"两段直接拼接，无分隔符或间距

- **页面/路由**: `#/report-designer-host`（工具栏下方状态摘要行）；report-designer 域页面同源渲染路径
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/report-designer-host/report-designer-host-default-wide-light.png`（"目标: sheet字段: 4"）
- **目视描述**: 摘要行渲染为"目标: sheet字段: 4"，"sheet"与"字段"两段粘在一起，读作一个连续字符串。
- **程序化证据**:
  - 探针: 摘要元素 childTexts 采样（`report-designer-host-badge.json` → summaryLine）
  - 输出: `text: "目标: sheet字段: 4"`、`childTexts: ["目标: sheet", "字段: 4"]`——两个兄弟文本节点零分隔（无空格/无 gap/无分隔符）
- **对照基准**: 检查提示词 E4（对齐与排版惯例）/F4（文案可读性）；styling-system.md hstack gap 惯例
- **严重程度**: P3（信息可读但需人为断句；状态摘要是每次进页面的首读行）
- **用户影响**: 用户需自行猜测"sheet"与"字段: 4"是两项指标。
- **修复方向**: 摘要拼接处（status summary 渲染器）给段间加 `gap-2` 或分隔符"·"；或模板改为"目标: sheet · 字段: 4"。
- **归族**: local → R2-4 批（status summary 渲染器）
- **复核状态**: 未复核

### [R2-1a-B5-02 既有族扩面确认] "4 个字段"徽章 dark 下对比 1.1:1（不重复立项，引用既有族）

- **页面/路由**: `#/report-designer-host`（report-toolbar 右侧徽章）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `…/report-designer-host-default-wide-dark.png`（右侧浅紫徽章内文字不可辨）
- **程序化证据**:
  - 探针: 徽章 computed color/effBg + WCAG 对比度（`report-designer-host-badge.json` → badgeLight/badgeDark）
  - 输出: dark `color rgb(178,206,251)` on `effBg rgb(203,186,252)` = **1.1:1**（与 R2-1a-B5-02 complex-page 宿主 pills 完全同值同根因）；light 下 3.05:1 亦低于小字 4.5:1 阈值
- **对照基准**: WCAG 1.4.3；R2-1a-B5-02 既有裁决（宿主 showcase 层 literal pill 配色）
- **严重程度**: P2（dark 下不可读；属既有族影响面扩至 report-toolbar 徽章）
- **用户影响**: dark 用户读不到字段数徽章。
- **修复方向**: 并入 R2-1a-B5-02 修复面：徽章配色改语义令牌（`bg-primary/10 text-primary` 类），禁止 literal 紫底蓝字。
- **归族**: systemic → R2-3 批（R2-1a-B5-02 既有族扩面，不另立新项）
- **复核状态**: 未复核

### watch-only（不立项）

- "clean/dirty" host-dirty-probe 裸文本单独成行（demo 探针 UI，非产品面；G6 取证正依赖它）。
- "预览" primary 蓝实心 vs "保存" outline 的层级关系（E2 观察；不同设计器对主操作的界定未在 design.md 明文，暂不判缺陷）。

## 4. 误报排除记录

| 疑点                                      | 排除理由                                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G4 空模板疑似"空壳"                       | 实测 fallback 渲染完整工作台：未命名报表 + 全工具栏 + 字段面板 + 网格（innerText 与截图双重证实），符合 design.md"不能退化成仅有诊断文本的空壳"要求，判 pass |
| undo 后 dirty 直接变 false                | design.md 明文：save/import 推进 saved baseline，undo 回到基线则 dirty=false 为正确语义，非状态错乱                                                          |
| 800 视口是否同 report-designer 卡 C1 溢出 | 实测 `sw=800=cw` 无溢出——host 壳与 demo 壳布局路径不同，C1 不随组件族传染，判 pass                                                                           |
| 弹层 dark 亮底                            | 同 report-designer 卡排除行：宿主 --popover 已知项，本页未新增弹层取证面                                                                                     |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：A9-01/E4-01 → R2-4 local 批；B5-02 扩面 → R2-3 既有族引用；
- 批内复检通过后 → `verified`。
