# [card] control:mapping

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/mapping` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic mapping hit / Host mapping rows + item region C6.3 / Host mapping item region C6.3）
- **矩阵裁剪**: simplified（matrixReason：纯展示控件，无交互态/无弹层/无异步面；裁掉的状态：hover/focus/disabled/error（控件无这些态）、placeholder 与 defaultLabel 优先级变体（fixture 未单列，源码已核对 precedence 链）、source 动态合并变体（fixture 仅静态 map + host statusMap））

## 1. 截图清单

| 状态                          | light                                                                       | dark（真 data-mode，自采）                                                 |
| ----------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 默认 1280×800                 | `_tmp/visual-inspection-2026-09-24/r2-2b/mapping/default-1280-light.png`    | `_tmp/visual-inspection-2026-09-24/r2-2b/mapping/default-1280-dark.png`    |
| 默认 800×900                  | `_tmp/visual-inspection-2026-09-24/r2-2b/mapping/default-800-light.png`     | —                                                                          |
| host 卡片行（hit×2 + miss×1） | `_tmp/visual-inspection-2026-09-24/r2-2b/mapping/cards-rows-light-1280.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/mapping/cards-rows-dark-1280.png` |

## 2. A–H 维度勾选表

- A 交互：A1–A9 n/a（display-only，无交互面；Pick/Region action 按钮归 button 卡）
- B 颜色：B1 pass（light 12.61:1；dark 走前景令牌，同 link 卡像素基线 ~13:1）B2 n/a B3 n/a B4 pass B5 pass（dark 文本可读）B6 n/a
- C 布局：C1 pass（docOverX 0 双视口）C2 pass C3 pass C4 pass（800 宽卡片行换行正常不塌）C5/C6 n/a
- D 间隔：D1–D8 n/a/pass（行内文本间距由 cards/flex 载体决定）
- E 排布：E1 pass E2 **warn(R2-2b-E2-44)** E3–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-E2-44] mapping hit 与 miss 渲染完全同形：miss 回退文本与命中值无任何视觉区分，data-state 样式钩子未被消费

- **页面/路由**: `#/lab/mapping`（场景 2 卡片行 Gamma 行 status=pending 未命中 statusMap，回退 "Unknown"）
- **主题/视口/状态**: light（dark 同）/ 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/mapping/cards-rows-light-1280.png`（Alpha Active / Beta Idle / Gamma Unknown 三行同色同形）
- **目视描述**: "Active"、"Idle"（命中）与 "Unknown"（未命中回退）渲染为完全相同的纯文本，无色差/无徽标/无斜体，无法分辨映射是否生效。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-mapping.mjs` structural
  - 输出: 命中行 `state: "hit", color: rgb(2,8,23), fontSize: 14px`；miss 行 `state: "miss", color: rgb(2,8,23), fontSize: 14px`——所有 computed 值相同；`data-state` 属性已输出但全仓库 CSS 无 `[data-state='miss']` 消费（grep `.nop-mapping` 零规则）。
- **对照基准**: 检查提示词 E2（视觉层级与信息语义一致）；AMIS mapping 对 miss 显示 placeholder（同为纯文本，本项目行为一致——故仅记 watch）
- **对照减责**: 回退文本 "Unknown" 本身已传达未命中语义；与 AMIS 基线行为一致
- **严重程度**: P3
- **用户影响**: 数据质量问题（映射表缺项）在界面上不可见，需读文本内容才能发现。
- **修复方向**: 若要区分：`.nop-mapping[data-state='miss'] [data-slot='mapping-item'] { color: hsl(var(--muted-foreground)); }`（或 warning 语义色）；保持纯文本也可接受，建议在 design 文档明示「miss 有意同形」。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- item region 功能面（hit 渲染模板 + Region action 按钮、miss 不渲染 region、行级 scope 无污染）全部程序化验证通过：`region.hitState: "hit"`、`missHasShouldNotRender: false`、`regionBtnPresent: true`、cards 三行 scope 各自正确——C6.3 锚点复检通过，非缺陷。
- i18n zh-CN 回退族：本控件无可 i18n 文案，无实例。
- 调试 chip / scope-debug 中文面板：载体环境族，引用不立项。

## 5. 交互键

- 无法注册：控件本体 display-only；行内 Pick/Region action 属 button 控件（归 button 卡），且点击只写 window 探针变量无视觉态变化，无注册价值。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-mapping` → carded（卡列填本路径）；findings 归族后 → digested。
