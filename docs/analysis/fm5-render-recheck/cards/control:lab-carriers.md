# [card] control:lab-carriers（10 条 lab fixture 合并卡）

- **批次**: FM-5 渲染面复检 · shard1（新增 carrier 快速检查） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/lab/<rendererId>` ｜ **载体**: lab fixture
- **矩阵裁剪**: simplified（matrixReason：carrier 级快速检查口径——无塌陷/无黑域/文字可读/控件渲染完整；交互链路（开弹层、拖 handle、输入值）归控件级深走查。裁掉：元素态、弹层、拖拽、异步态）
- **覆盖单元**: lab-cron-editor(#/lab/cron-editor) ｜ lab-department-select(#/lab/department-select) ｜ lab-input-city(#/lab/input-city) ｜ lab-input-color(#/lab/input-color) ｜ lab-input-signature(#/lab/input-signature) ｜ lab-rating(#/lab/rating) ｜ lab-resizable(#/lab/resizable) ｜ lab-slider(#/lab/slider) ｜ lab-user-select(#/lab/user-select) ｜ lab-verification-code(#/lab/verification-code)

## 1. 截图清单（每单元 4 张：default light/dark × 1280×800 / 800×900，全部经多模态审图）

| 单元                  | 截图前缀（`_tmp/visual-inspection-2026-10-18/`）              | 结论          |
| --------------------- | ------------------------------------------------------------- | ------------- |
| lab-cron-editor       | `lab-cron-editor-default-{1280x800,800x900}-{light,dark}.png` | pass          |
| lab-department-select | `lab-department-select-default-…`                             | pass          |
| lab-input-city        | `lab-input-city-default-…`                                    | pass          |
| lab-input-color       | `lab-input-color-default-…`                                   | pass          |
| lab-input-signature   | `lab-input-signature-default-…`                               | pass          |
| lab-rating            | `lab-rating-default-…`                                        | pass          |
| lab-resizable         | `lab-resizable-default-…`                                     | pass（P3 注） |
| lab-slider            | `lab-slider-default-…`                                        | pass          |
| lab-user-select       | `lab-user-select-default-…`                                   | pass          |
| lab-verification-code | `lab-verification-code-default-…`                             | pass          |

快速检查口径逐项：塌陷 0 ｜ 黑域 0 ｜ 文字不可读 0 ｜ 控件渲染不完整 0。所有 40 张截图均渲染完整：选择触发器（选择部门/选择人员/选择省·市·区）、cron 表达式输入 + 下次触发预览、色板触发器、签名白板 + 撤销/清除、星级、滑杆 + live 摘要、三栏 split + 手柄、六格验证码均完整。

## 2. A–H 维度勾选表（carrier 级口径，仅判渲染完整性与噪音）

- A 交互：A3 pass A4 pass A5 pass（其余 n/a：carrier 无页面级交互面）
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass（签名板 dark 恒白属书写表面语义，豁免）B6 n/a
- C 布局：C1 pass C2 pass C3 pass C4 pass（800 双态全部不塌不挤）C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D7 pass（除 FM5-S1-D-2）D8 pass
- E 排布：E1 pass E5 pass（其余 n/a）
- F 一致性：F1 pass（十页头部/调试 Scope 结构一致）F3 pass（其余 n/a）
- G/H：n/a

## 3. 发现条目

### [FM5-S1-C-6] lab-cron-editor console 噪音：props 解析期 null-member 访问告警 ×3

- **页面/路由**: `#/lab/cron-editor`
- **主题/视口/状态**: light + dark / 1280×800 / 默认
- **截图**: 无（console 证据；页面视觉正常）
- **目视描述**: 页面无异常；console 出现 3 条 node-runtime 开发告警。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-console-probe.mjs` / `_tmp/fm5-walk1-warn-detail.mjs`
  - 输出: `[node-runtime] null-member access during props resolution (scope may not yet have data): node=_.body_0_.body_1_`（×3，双主题）。其余 9 条 carrier console clean。
- **对照基准**: H 维控制台噪音口径（开发告警非错误）
- **严重程度**: P3
- **用户影响**: 无直接可见影响；指示 cron-editor 渲染器在 scope 就绪前解析了未挂载成员。
- **修复方向**: cron-editor 渲染器 props 解析对未就绪 scope 成员短路（lazy 默认值），消除告警。
- **归族**: local
- **复核状态**: 未复核

### [FM5-S1-D-2] lab-resizable 左栏（6% min clamp）内演示文案被硬裁切至词中，无省略号

- **页面/路由**: `#/lab/resizable`
- **主题/视口/状态**: light + dark / 1280×800 与 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/lab-resizable-default-1280x800-light.png`
- **目视描述**: 左栏被 clamp 在 6% 最小宽，其标签 "Left panel (6%, clamp 2–40%; persisted to $layout.r…" 在词中间被容器硬切（`$layout.r` 处截断），无 overflow 省略。
- **程序化证据**: 双视口双主题截图一致 [visual-only]（演示文案自身即为 clamp 说明，属 demo 取舍）
- **对照基准**: C1（文本溢出容器）/ 排查提示词"表格截断"豁免不适用于面板标签
- **严重程度**: P3
- **用户影响**: 轻微——演示页用于展示 clamp 行为，截断本身有演示价值，但硬切观感差。
- **修复方向**: 面板内容容器加 `min-w-0` + 文本 `truncate`（省略号），或演示文案换短句。
- **归族**: local
- **复核状态**: 未复核

### [FM5-S1-C-3→参见 page:page-designer 卡] 🐞 调试器悬浮 chip 遮挡 lab 侧栏行（系统性，十页复现）

- **页面/路由**: 全部 `#/lab/*`（chip 压住侧栏 "CONTENT/Text" 行或 "Pull Refresh" 行）
- **主题/视口/状态**: light + dark / 800×900 显著 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/lab-chip-crop.png`（"🐞 378" 压 "Pull Refresh" 行）
- **目视描述 / 证据 / 修复方向**: 同 FM5-S1-C-3（`packages/nop-debugger/src/panel.tsx` docked 固定左下，遮挡宿主滚动内容）。chip 计数为调试事件数（events.length，lab 页累计 378 属正常采集行为，非错误）。
- **严重程度**: P3 ｜ **归族**: systemic → R2-3 批（与 page-designer/pih 同根因合并） ｜ **复核状态**: 未复核

### 误报排除记录（carrier 族）

- 800×900 下 Submit rating / Save 按钮在视口底缘被截半：正常页面滚动行为，非裁切缺陷。
- 签名板 dark 恒白：书写表面语义（墨迹为深色），同"纸面恒白"豁免口径。
- 调试 Scope JSON 区在每页占屏较大：carrier 固定布局（表单演示 + 调试查看器），有意为之。

## 4. 台账回写

- 本卡完成：ledger 对应 10 行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/control:lab-carriers.md`）。
