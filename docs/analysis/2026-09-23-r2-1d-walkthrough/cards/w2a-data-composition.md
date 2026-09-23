# [card] page:w2a-data-composition

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w2a-data-composition` ｜ **载体**: 域页面（数据组合 demo：pagination/cards/alert/wizard 经 SchemaRenderer 挂载，fetcher 为确定性 mock）
- **矩阵裁剪**: simplified（理由：控件 demo 页，floor 矩阵。裁掉：A6 拖拽（无）、A7/H 弹层（wizard 为内嵌分步容器非 Dialog；alert 为内联块）、G n/a、glass（波内统一裁剪）、A5 loading/empty（fetcher 同步 mock 无异步窗口；cards 有空态 schema 分支但空态文案走 text renderer 与 w1b 空态同构，已在他卡覆盖））

## 1. 截图清单（状态矩阵）

| 状态                                 | light                                                                                                      | dark                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 默认 1280×800                        | `_tmp/visual-inspection-2026-09-23/r2-1d/w2a-data-composition/w2a-data-composition-default-wide-light.png` | `…/w2a-data-composition-default-wide-dark.png`   |
| 默认 800×900                         | `…/w2a-data-composition-default-narrow-light.png`                                                          | `…/w2a-data-composition-default-narrow-dark.png` |
| 800 下分页溢出放大                   | `…/w2a-pagination-narrow-zoom.png`                                                                         | —                                                |
| 卡片 hover                           | `…/w2a-card-hover-light.png`                                                                               | —                                                |
| 卡片选中（点 Card A）                | `…/w2a-card-selected-light.png`                                                                            | `…/w2a-card-selected-dark.png`                   |
| alert 关闭 / wizard step2/step3/完成 | `…/w2a-wizard-step2-light.png`、`…/w2a-wizard-step3-light.png`、`…/w2a-wizard-complete-light.png`          | `…/w2a-default-dark-interacted.png`              |
| disabled / 拖拽 / 弹层               | wizard 未达步骤（Confirm）disabled 态已在默认图呈现                                                        | n/a                                              |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（卡片 hover 有 `hover:border-primary/60`；pagination 按钮 hover 同族 ghost） A2 ✔（卡片项 `role=button tabindex=0` 可聚焦；按钮 focus ring 同族） A3 ✔（targetScan wide/narrow 0 命中；alert 关闭钮恰 24×24 达标） A4 ✔（wizard 未达步骤 Confirm disabled=true 可感知灰化） A5 n/a（见裁剪） A6 n/a A7 n/a A8 n/a A9 ✔（卡片选择/关闭 alert/wizard 三步全流程 flag 翻转：`card:selected`、`alert:closed`、`wizard:step=2:commit:success:complete:yes`，DOM 断言）
- B 颜色：B1 ✔ B2 ✔ B3 ✔（warning alert 琥珀、选中 primary、语义正确） B4 ✔（全走令牌：alert bg 琥珀 token、选中 ring `ring-primary/40`） B5 ✔（dark 全页随暗；选中 ring dark 同构） B6 ✔（选中态为 primary 系 token 派生非裸蓝：`border-primary` + `ring-primary/40` + aria/data 属性驱动）
- C 布局：C1 **fail(R2-1d-C4-25)**（800 视口分页条内容溢出宿主 17px，见发现） C2 ✔ C3 ✔ C4 **fail(R2-1d-C4-25)** C5 ✔ C6 n/a
- D 间隔：D1 ✔（块间距 16px 全序列落栅格；卡片列间距均匀） D2 ✔ D3 n/a D4 n/a D5 n/a D6 **n/a（注意**：本页 pagination 为独立 demo 非「宿主列表分页条」，D6 表格贴合口径不适用；分页条与上下块间距 12/16 落 `--space-block-gap` 基线） D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔（wizard footer 上一步在左、下一步/完成在右主位，符合「确认在主位」惯例；未达步禁用） E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1 ✔ F3 ✔ F4 **fail(R2-1d-F4-26)**（wizard 按钮文案中文 vs 宿主英文，归 R2-1d-F4-01 族） F5 ✔
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-C4-25] 窄视口下独立分页条内容溢出宿主容器 17px

- **页面/路由**: `#/w2a-data-composition`（`demo-pagination`，total 95 / pageSize 10）
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w2a-data-composition/w2a-pagination-narrow-zoom.png`（next 箭头抵到宿主虚线边框外）
- **目视描述**: 800 宽下左列被 `md:grid-cols-2` 压到 274px，分页条 8 个页码位 + 前后箭头不换行，内容整体溢出宿主 flex 列右缘。
- **程序化证据**:
  - 探针: 分页条根 `scrollWidth/clientWidth` + nav 几何（`_tmp/r2-1d-probes/w1b-gapdebug.mjs` pagination800）
  - 输出: 宿主与分页根均 274px，`scrollWidth=291` → **17px 溢出**；`nav.nop-pagination` 为 `flex w-full justify-center` 单行不换行不收缩；1280 宽无溢出（514/514）。
- **对照基准**: 检查提示词 C1/C4；ui Pagination 响应式惯例（窄容器应收缩页码位或出横向滚动）。与已裁定「窄视口 flex/固定壳层（R2-3c 候选）」族同向。
- **严重程度**: P3（demo 挤压场景；真实宿主多为全宽，但 renderer 本身缺窄容器防御）
- **用户影响**: 窄面板/窄卡片内嵌分页时会破容器边界，与宿主内容视觉打架。
- **修复方向**: `pagination-renderer`/ui Pagination 增加窄容器行为：页码位列表 `overflow-x-auto` 或 `flex-wrap`，或在 `sm` 以下自动收缩为「n / m」摘要 + 前后箭头（与 ui Pagination 已有的 compact 能力对齐）。
- **归族**: systemic → R2-3 批（并入 R2-3c 窄视口候选族：R2-1c C1-01 word/report/scada 固定壳层 + 本例组件级窄容器，R2-3 归并时核对根因层级）
- **复核状态**: 未复核

### [R2-1d-F4-26] wizard 按钮文案中文（上一步/下一步/完成）vs 宿主英文页面

- **页面/路由**: `#/w2a-data-composition`（`demo-wizard` footer 按钮）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `…/w2a-data-composition-default-wide-light.png`（footer「上一步」「下一步」）
- **目视描述**: 页面 chrome/标题/清单全英文，wizard 操作按钮为中文，混排突兀。
- **程序化证据**:
  - 探针: wizard 按钮 textContent 枚举（`_tmp/r2-1d-probes/w2a-probe.mjs` wizButtons）
  - 输出: `["上一步","下一步"]`（step3 变 `["上一步","完成"]`）；文案来自 flux-i18n 中文默认 locale（`t()`），宿主 playground 未传 locale——与 R2-1d-F4-01（AI 卡：波内 7/7 页复现，i18n 未随宿主）同根因。
- **对照基准**: 检查提示词 F4（术语与文案一致）；styling/UX 惯例 locale 应随宿主。
- **严重程度**: P3
- **用户影响**: 中英混排降低专业感；英文用户操作词不可读。
- **修复方向**: 同 R2-1d-F4-01 族修法——playground 宿主向 flux-i18n 注入 `locale=en`，或 renderer 文案跟随 `document.documentElement.lang`。
- **归族**: systemic → R2-3 批（并入 R2-1d-F4-01 i18n 族；本卡提供 wizard/清除 aria 等新实例）
- **复核状态**: 未复核

## 4. 既有族确认 / watch-only（不立项）

- **R2-1d-C2-01（ndbg 悬浮球）**: 本页同构复现。
- watch: wizard 步进标签「1Account」等 aria/text 串接为演示数据；step 标签按钮 38px 高、页码按钮 32/34px 均达标。
- watch: `cards` 选中后无 `aria-selected`（用 `data-selected`），屏幕阅读器语义弱于 w2a 卡片项的 `role=button`；a11y 域随 w1b 卡 watch 一并观察。

## 5. 误报排除记录

| 疑点                                         | 排除理由                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 800 下 wizard 步骤条折两行                   | `flex-wrap` 有意折行、无破版，顺序保持 1→2→3                                                                |
| C1 wide 扫描 `sr-only` 元素 scrollWidth 溢出 | 屏读专用 sr-only 类的有意裁剪（clip），非可视溢出                                                           |
| dark 选中卡片探针返回空                      | 二次 goto 后点击时序问题（探针缺陷）；dark 默认图 + light 选中态几何/类名同构已证 dark 选中路径，非页面缺陷 |
