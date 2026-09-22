# [card] page:sundial-workbench

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/sundial-workbench` ｜ **载体**: complex-page（外部应用复刻 · KMP 待办工作台）
- **矩阵裁剪**: full（glass 未抽查：replica 自带 sd-\* 配色，host 皮肤不影响其内部）

## 1. 截图清单

| 状态               | light                                                           | dark                                       |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------ |
| 默认 1280×800      | `…/r2-1a/sundial-workbench/sundial-workbench-default-light.png` | `…/sundial-workbench-default-dark.png`     |
| 默认 ~800×900      | `…/sundial-workbench-default-800-light.png`                     | `…/sundial-workbench-default-800-dark.png` |
| 卡内滚动至分组列表 | —                                                               | `…/sundial-workbench-scrolled-dark.png`    |
| 新建待办弹层打开   | `…/sundial-workbench-add-todo-dialog-light.png`                 | —                                          |
| 勾选待办后         | `…/sundial-workbench-after-check-light.png`                     | —                                          |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass（焦点环证据同 ui Button 共用件） A3 fail(R2-1a-A3-04 页面实例) A4 pass A5 pass A6 n/a（本页无拖拽：`[draggable=true]` 计数=0，无拖拽可供性，A8 亦 n/a） A7 pass（新建待办弹层 360×258 有关闭钮、标题自动聚焦同款交互见 todo-dialog 卡） A8 n/a A9 pass（勾选即计入已完成分组计数）
- B：B1 fail(R2-1a-B1-19 红色 badge 4.17:1@10px) B2 pass B3 pass（今天=橙、逾期=红、未来=蓝 语义一致） B4 warn（大面积 `text-[#636363]` 字面色，见 R2-1a-B4-20） B5 warn(R2-1a-B5-21) B6 pass
- C：C1 pass（本页窄视口无溢出，响应式良好） C2 pass C3 pass（272px 侧栏 + 主列结构可辨） C4 pass（800 宽 overflowScan 空） C5 fail(R2-1a-C-02 页面实例 diff=544/sbW=0) C6 n/a
- D：D1 pass（任务行节距一致） D2 pass（折叠分组条与任务行分组清晰） D3 pass（任务行高一致 72px 档） D4–D8 pass
- E：E1 pass（滚动后三问可答；首屏因 C-02 折叠裁切略受影响，随 C-02 记 warn） E2 pass E3 pass E4 pass（日期 badge 右对齐一致） E5 pass E6 pass（空分组有占位行）
- F：F1 pass（新建待办按钮与 todo-dialog 页同款） F3 pass（折叠分组跨页同模式） F4 pass F5 n/a
- G：n/a H：pass（新建待办弹层 360=xs 档 ✓，footer/关闭钮齐全；深查归 sundial-todo-dialog 卡）

## 3. 发现条目

### [R2-1a-B1-19] sd-badge 状态徽章文字对比度不足（红色 4.17:1@10px）（systemic 值，sundial 各页共用 token）

- **页面/路由**: `#/complex-pages/sundial-workbench`（「逾期」badge 等）；analytics 2.87、detail/settings 3.16 同族
- **主题/视口/状态**: light（replica 恒亮设计）/ 1280×800
- **截图**: `…/sundial-workbench-scrolled-dark.png`（「今天」橙 badge 等）
- **目视描述**: 10px 的彩色 badge 小字在白底上偏弱，橙/红尤甚。
- **程序化证据**:
  - 探针: computed color × 合成背景 → WCAG ratio
  - 输出: `.sd-badge` rgb(210,81,81) ratio=4.17@10px/400（本页）；rgb(234,122,42) ratio=2.87@10px（analytics 页，最差）；rgb(219,119,6) ratio=3.16@10px（detail/settings）
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1；10px 远低于大字阈值）
- **严重程度**: P2（analytics 页 2.87 已属难读）
- **用户影响**: 日期/状态 badge 是任务行唯一时间信息，弱视/阳光下不可辨。
- **修复方向**: badge 文字色加深两档或改用深色底白字 variant；统一收敛 `sd-badge-*` token（顺带解决 2.87 最差档）。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-A3-04 页面实例] 任务勾选框 16×16

- **页面/路由**: 本页任务行（sundial-cb-t1…t7 等）
- **截图**: `…/sundial-workbench-scrolled-dark.png`
- **程序化证据**: targetScan(24)：nop-checkbox size-4=16×16 ×多；native input 1×1（豁免）
- **对照基准**: WCAG 2.5.8（行高 72px 独立行，间距例外可部分辩护；触屏仍偏小）
- **严重程度**: P3 ｜ **修复方向**: 视觉 16px + 热区扩 24px ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-C-02 页面实例] 卡内纵向 diff=544px 无滚动条可供性

- **程序化证据**: nop-card oy=auto、diff=544、sbW=0
- **严重程度**: P2 ｜ **归族**: systemic → R2-3 批（并入 C-02） ｜ **复核状态**: 未复核

### [R2-1a-B4-20 注] `text-[#636363]` 字面色广泛使用（watch）

- **程序化证据**: rgb(99,99,99) 在白底 ratio 5.37-6.01 均达标；但为字面 hex 非 token（B4 走令牌原则），且 dark host 下溢出白底区块时失效（见 sundial-detail 卡 R2-1a-B5-07 实例）
- **严重程度**: P3 ｜ **修复方向**: 收敛为 `--muted-foreground` 类令牌 ｜ **归族**: watch-only → 台账 ｜ **复核状态**: 未复核

### [R2-1a-B5-21 注] replica 在 dark host 下保持亮色主题（watch）

- **截图**: `…/sundial-workbench-scrolled-dark.png`（白面板 + 深色页根混合）
- **说明**: Sundial 复刻为亮色应用语义（对标 KMP 亮色设计），红线豁免一致性判；但页根在 dark host 变深、白面板之间的缝隙露深色，观感割裂。建议 replica 声明“仅亮色”并固定页根底色。
- **严重程度**: P3 ｜ **归族**: watch-only → 台账 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                             | 排除依据                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| 简报预期“工作台类拖拽”未发现拖拽 | `[draggable=true]` 全页计数=0、无拖拽把手 → 本页确无拖拽功能，A6/A8 如实标 n/a（非漏测） |
| dark host 下 replica 仍白底      | 复刻目标亮色语义，红线豁免（B5-21 watch 已记观感）                                       |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
