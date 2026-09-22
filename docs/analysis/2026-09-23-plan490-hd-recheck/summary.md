# plan 490 H/D 维度复检轮评分卡（设计器域 + 表格/CRUD 域）

> Date: 2026-09-23
> Method: `docs/skills/visual-page-quality-inspection-prompt.md`（H/D 维度 + C1 溢出 + B5 dark 平价抽查；双主题 1280×800；截图 + 程序化探针双轨）
> Trigger: plan 490 Phase 4 Decision 项——弹层阶梯/表面节奏落地后的定向复检轮
> Screenshots: `_tmp/visual-inspection-2026-09-23/`（快照政策，永不入库；本文档引用相对路径仅供本地复核）
> Probe script: `_tmp/plan490-hd-inspect.mjs`、`_tmp/plan490-dark-check.mjs`（可重跑）

## 覆盖面

| 域        | 页面                                                                         | 状态矩阵                              |
| --------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| 设计器    | `/#/flow-designer`（含 JSON 面板弹层，plan 490 迁移 `size="base"` 的消费点） | light + dark / 1280 / 默认 + 弹层打开 |
| 弹层      | `/#/lab/dialog`（Informational dialog + C1a size matrix）                    | light + dark / 1280 / 弹层打开 ×6 档  |
| 表格/CRUD | `/#/complex-pages/antdpro-list`（TablePaginationBar 实际挂载面）             | light + dark / 1280 / 默认            |

## 评分卡

| 页面          | H 弹层                                                                                     | D 间隔                                            | C 布局                      | B 颜色(dark 平价抽查) | 总评                                          |
| ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- | --------------------------- | --------------------- | --------------------------------------------- |
| flow-designer | pass(H1=base 560 双主题；H4 关闭钮不压标题)                                                | pass(D7 工具栏↔画布分区清晰)                      | pass(C1 无横向溢出，双主题) | —                     | pass                                          |
| lab/dialog    | pass(H1 阶梯全档命中；H3 视口内；H5 footer 右对齐+令牌间距+72px 最小宽；H7 body 24px 令牌) | —                                                 | pass                        | **fail(B5-1)**        | 有风险（B5-1 为宿主存量缺陷，非本 plan 引入） |
| antdpro-list  | —                                                                                          | pass(D6 分页条上间距 12px、距表格底 12px，双主题) | pass                        | —                     | pass                                          |

## 程序化探针输出（关键数值）

- **H1 阶梯扫（双主题一致）**：xs=360 / sm=480 / base=560 / md=720 / lg=960 —— 与 `--overlay-size-*` 逐档精确命中，`full`=1248（100vw 兜底）不受影响。
- **H 解剖学（dialog，双主题一致）**：content width=560（default→base 档）、viewportOk=true（H3）、body padding-x=24px（`--overlay-anatomy-body-padding-x`）、footer gap=8px（`--overlay-anatomy-footer-gap`）、footer 按钮 min-width=72px、title 14px、justify-content=flex-end。
- **D6（antdpro-list，双主题一致）**：`[data-slot="table-pagination"]` margin-top=12px、paginationRect.top − tableRect.bottom=12px、bar 高 32px——修复前为 0（贴合），红色锚点在真实 CRUD 面确认转绿。
- **C1（flow-designer，双主题）**：无横向滚动、无意外溢出容器。
- **JSON 面板（迁移消费点，双主题）**：width=560、right=1264（right-4 吸附）、top=72——`sm:max-w-md`+`w-[min(560px,…)]` ad-hoc 类迁移到 `size="base"` 后行为等价。

## 发现

### [designer-H-B5-1] playground 宿主裸 :root 硬编码暖色调色板，暗色下弹层表面强制亮色

- **页面/路由**: `/#/lab/dialog`（复现：应用右下角主题切换器切 dark，打开任意 Dialog/Popover/Dropdown）
- **主题/视口/状态**: classic+dark / 1280 / 弹层打开
- **截图**: `_tmp/visual-inspection-2026-09-23/dialog-lab-open-dark.png`、`dialog-dark-appswitch.png`
- **目视描述**: dark 模式下弹层表面为暖白色（浅色样式），与全暗页面形成整块白底。
- **程序化证据**: `data-theme=classic` + `data-mode=dark`（应用自身切换器设置）下，`[data-slot="dialog-surface"]` computed backgroundColor=`rgb(251,250,249)`；`:root` 上 `--card`=222 47% 11%（dark 正确）而 `--popover`=30 20% 98%（暖白）。
- **根因**: `apps/playground/src/styles.css:63-94` 裸 `:root` 块无条件覆盖 `--popover: 30 20% 98%`（连带 `--background`/`--accent`/`--muted` 等暖白系）；theme-tokens 四主题块均不重定义 `--popover`，故 dark 下宿主覆盖胜出。bg-popover 消费面（Dialog/AlertDialog/Sheet/Drawer/Popover/DropdownMenu）全部受累。
- **对照基准**: 检查提示词 B5「dark 专有缺陷（纯白底块）单独登记」+ 误报排除表「画布纸面恒白」不适用（弹层非纸面语义）。
- **严重程度**: P1（弹层为高频路径；系统性——同根因覆盖全 playground 弹层族）
- **用户影响**: dark 主题用户看到的每个弹层/下拉都是刺眼亮块，明暗节奏断裂。
- **修复方向**: 宿主 `:root` 调色板块应限定到 `[data-theme='playground-warm']` 之类的宿主皮肤属性或迁入 theme-tokens 主题块结构；`--popover` 至少在 dark 下回落 `var(--card)`。属宿主主题层缺陷，**先于 plan 490 存在**（本 plan 未触碰任何颜色路径），按 Cross-Cutting 4 归族：**local → R2-4 批次消化**（宿主主题 family），登记进 R2 台账。
- **复核状态**: 未复核（独立复核随 R2-1a 批次复核轮进行）

### [designer-H-2] Dialog header padding-x(16px) 与 body padding-x(24px) 不对称

- **页面/路由**: `/#/lab/dialog`
- **主题/视口/状态**: 双主题 / 1280 / 弹层打开
- **截图**: `_tmp/visual-inspection-2026-09-23/dialog-lab-open-light.png`
- **目视描述**: 标题左缘比正文左缘更靠左 8px，三段节奏有微差。
- **程序化证据**: header padding-x=16px（`p-4 pb-0`，AMIS 对齐惯例的既有形态）vs body padding-x=24px（anatomy 令牌）。
- **对照基准**: H7 三段节奏成体系。
- **严重程度**: P3
- **用户影响**: 正常使用中几乎不可感知。
- **修复方向**: 若裁决统一，header/footer 的水平 padding 一并消费 `--overlay-anatomy-body-padding-x`（一行类名改动）；当前为 AMIS parity 有意形态的可能性需先核对对标。
- **复核状态**: 未复核
- **归族预裁定**: watch-only（P3、无任务阻碍），落 R2 台账 watch 池。

## 结论

- plan 490 交付面（阶梯/解剖学/块距/门禁）在真实渲染面双主题全部确认生效：**H1/H3/H5/H7/D6/C1 pass**。
- 复检新发现 1×P1（B5-1，宿主主题层存量缺陷）+ 1×P3（watch-only）——按 roadmap Cross-Cutting 4 三态归族，均不在 plan 490 修复范围（该 plan Decision 项明确"复检发现的新问题走 findings 流程"）。两条均须在 R2-0 台账建立后登记，P1 由 R2-4 首批或字母后缀批消化。
