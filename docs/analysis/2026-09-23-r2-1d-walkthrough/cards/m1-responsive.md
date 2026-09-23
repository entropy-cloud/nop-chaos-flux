# [card] page:m1-responsive

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/m1-responsive` ｜ **载体**: 域页面（M1 高频控件响应式 demo：select/tree-select 底部 Sheet、table expand 卡片堆叠、dialog 全屏、drawer 底部、tabs swipe）
- **矩阵裁剪**: simplified+移动专项（裁剪理由：控件 demo 页非复杂画布；本页实际裁掉 glass 皮肤（本波统一）、拖拽中间态（无拖拽面）、loading/empty 异步态（同步 mock）。视口按波口径 375 主分析 + 800 断点对照 + 1280 一轮；重点 A3 触控/A8 替代/弹层移动形态）

## 1. 截图清单（状态矩阵）

| 状态                                      | light                                                                                                                 | dark                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 默认 375×812（mobile 模拟）               | `_tmp/visual-inspection-2026-09-23/r2-1d/m1-responsive/m1-default-375-light.png`                                      | `…/m1-default-375-dark-clean.png`                |
| select 底部 Sheet 打开 375                | `…/m1-select-open-375-light.png`（v2 同态）                                                                           | （dark 打开态见误报排除：宿主 --popover 已知族） |
| tree-select 底部 Sheet 打开 375           | `…/m1-treeselect-open-375-light.png`                                                                                  | —                                                |
| dialog 打开 375（mobile fullscreen 形态） | `…/m1-dialog-open-375-light.png`                                                                                      | —                                                |
| drawer 打开 375（底部滑入）               | `…/m1-drawer-open-375-light.png`                                                                                      | —                                                |
| table expand 卡片堆叠展开 375             | `…/m1-table-expand-375-light.png`                                                                                     | （m1-default-375-dark-clean.png 内含展开态）     |
| 默认 800×900（≥768 桌面分支）             | `…/m1-default-800-light.png`                                                                                          | `…/m1-default-800-dark.png`                      |
| 默认 1280×800                             | `…/m1-default-1280-light.png`                                                                                         | `…/m1-default-1280-dark.png`                     |
| select 打开 1280（桌面 popover 对照）     | `…/m1-select-open-1280-light.png`                                                                                     | —                                                |
| hover/focus/disabled 抽样                 | 未单独截帧：hover 由 Sheet 选项/按钮 nop-haptic 契约覆盖；focus 探针经 Sheet 打开态（search input ring 可见）间接取证 | —                                                |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔（Sheet search input focus ring 可见；ESC/遮罩双路径关闭实测通过） A3 **fail(R2-1d-A3-02 族实例)**（resize handle 4×39.5；tabs trigger 高 25px ≥24 合规但低于 44 移动惯例，watch） A4 n/a（无 disabled 样本） A5 **fail(R2-1d-A5-01)**（每页行数 select 空） A6 n/a A7 ✔（Sheet ESC/遮罩/确认三路径；dialog/drawer 均有关闭钮） A8 ✔（展开/分页均为点击） A9 ✔（选中回填、分页即点即变）
- B 颜色：B1 ✔（dark 正文/背景目视 + light 高对比） B2 ✔ B3 n/a B4 ✔ B5 ✔（页面本体 dark 平价；Sheet 亮底为已知宿主 --popover 族，不重复立项） B6 n/a
- C 布局：C1 ✔（375/800/1280 无文档级横滚） C2 **warn(R2-1d-C2-01 族实例)**（playground pill 遮 Back to Home/dialog 标题，见 mobile-infrastructure 卡） C3 ✔ C4 ✔（768 断点两侧行为正确切换） C5 ✔ C6 n/a
- D 间隔：D1 ✔ D2 ✔ D3 ✔（expand 卡片行距一致） D4 ✔（分页条三段垂直堆叠间距均匀） D5 ✔ D6 n/a（分页条即本页 D4 面） D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔（Sheet 确认在主位全宽） E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1 ✔（与 m4 crud 分页同构） F2–F4 n/a F5 ✔
- G 设计器：n/a
- H 弹层：H1 ✔（Sheet 全宽底部、dialog mobile fullscreen=max-w(100%-2rem) 按 dialog-host `data-mobile-fullscreen` 设计） H2 ✔（drawer 底部全宽 h=109） H3 ✔（780≤812-32） H4 **warn(R2-1d-C2-01)**（pill 遮标题，非弹层自身缺陷） H5 ✔ H6 n/a H7 ✔ H8 n/a（内容一行） H9 ✔

## 3. 发现条目

### [R2-1d-A5-01] 分页「每页行数」选择器零选项、无值显示

- **页面/路由**: `#/m1-responsive`（table 分页条；全站未配置 `pagination.pageSizeOptions` 的 nop-table 同构）
- **主题/视口/状态**: light+dark / 375、800、1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m1-responsive/m1-default-1280-light.png`（每页行数后空 select）
- **目视描述**: 「每页行数:」标签后的 select 只有一个 64px 空框，无当前值、无可选项。
- **程序化证据**:
  - 探针: `document.querySelector('[data-slot="table-pagination"] select')` 读取（`_tmp/r2-1d-probes/m2-out.json` → m1PerPageOptions）
  - 输出: `{ selectFound: true, optionCount: 0, value: "", visibleText: "", selW: 64 }`；源码 `packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx` L64 `pageSizeOptions?.map(...)`，而 `table-renderer.tsx` L682 直接透传 `schemaProps.pagination?.pageSizeOptions` 无默认值 → 未配置时渲染零 `<option>` 的 NativeSelect。
- **对照基准**: 检查提示词 A5（控件状态完备性）/ E2；对照 m4 crud 分页条（CrudListPagination 自带 4 个选项，正常）。
- **严重程度**: P2
- **用户影响**: 分页条高频面上出现一个永远空白、点了没反应的控件；用户既看不到当前每页条数也无法修改。
- **修复方向**: `table-pagination-bar.tsx` 给 `pageSizeOptions` 缺省值（如 `[10, 20, 50]`）或在未配置时整体隐藏该 NativeSelect。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-A3-02] 列宽拖拽手柄 4×39.5（R2-1a-A3 既有族扩面实例）

- **页面/路由**: `#/m1-responsive`（375 expand 模式与 1280 桌面表格均存在）
- **主题/视口/状态**: light / 375+1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m1-responsive/m1-default-375-light.png`
- **目视描述**: 表格列边界拖拽手柄默认透明、命中域 4px 宽。
- **程序化证据**:
  - 探针: 可交互元素 min(w,h) 扫描（`_tmp/r2-1d-probes/smoke-375-out.json` / m2-out.json）
  - 输出: `[data-slot="table-column-resize-handle"] w=4 h=39.5`（aria-label=调整列宽，键盘步进可用）
- **对照基准**: WCAG 2.5.8；R2-1a-A3 既有族（dashboard/performance-table/table-column-width 已登记同实例）
- **严重程度**: P3
- **用户影响**: 同既有族。
- **修复方向**: 同族既定方向（透明热区扩宽）。
- **归族**: watch-only → 台账（并入 R2-1a-A3 族）
- **复核状态**: 未复核

### 正向取证（pass 面记录）

- **select/tree-select 底部 Sheet（375）**: 打开态 sheet-content `w=375, y=521`（底部锚定），ESC 与遮罩点按均关闭（afterEsc=0 / afterMaskTap=0）；含搜索框、大号选项行、全宽确认按钮。
- **dialog mobile 全屏（375）**: 343×780 @ (16,16)，`data-mobile-fullscreen` 按 `isMobile && !hasExplicitSize` 设计生效（dialog-host.tsx L328），关闭钮 28×28。
- **drawer 底部切换（375）**: `w=375, y=703`，side=right 被移动端覆写为 bottom（dialog-host.tsx L458），带 grabber + 关闭钮。
- **table expand 卡片堆叠（375）**: 点击行展开钮后明细行 h=245（Email/Phone/City 纵向卡片），再点收起；dark 同构。
- **tabs（375）**: 4 tab 触发器 25px 高、list 无溢出（285=285，无需滚动）；`touchAction: auto`（内容不溢出时 swipe 无从发生，属预期）。

## 4. 误报排除记录

| 疑点                              | 排除理由                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------- |
| dark 下 select Sheet 白底         | 已知族：dark 弹层亮底 = 宿主 --popover（简报「已知事实」），不重复立项            |
| pill「0」悬浮件遮挡               | 归入 R2-1d-C2-01（playground 壳层，见 mobile-infrastructure 卡）统一定点          |
| tabs trigger 25px                 | ≥24px 满足 WCAG 2.5.8；44px 为 M2 对表单控件的自治约定，tabs 未承诺；watch 不立项 |
| dialog 「全屏」留 16px 边         | `data-mobile-fullscreen` 设计即 max-w(100%-2rem)+rounded，非缺陷                  |
| 我方首轮 dark 截图出现 Sheet 打开 | 探针自身 expand 误点 select trigger 重开；clean 版已补拍，非页面缺陷              |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：A5-01 → R2-4 local；A3-02 → watch（R2-1a-A3 族扩面）；C2 实例 → R2-1d-C2-01；
- 批内复检通过后 → `verified`。
