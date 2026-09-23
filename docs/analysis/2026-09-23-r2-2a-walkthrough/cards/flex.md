# [card] control:flex

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/flex` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：justify-between 行 / column gap 阶梯 / wrap 标签云）
- **矩阵裁剪**: simplified + **结构类契约核对**（裁剪理由：flex 为结构类控件，styling-system.md 契约 = marker classes only、无硬编码视觉类——A–H 视觉维度大量 n/a：A1–A4 元素交互态 n/a（fixture 未接 onClick）、A5–A9 n/a、B1–B6 n/a（无自绘色面）、D2–D8 大部分 n/a、E2–E6 n/a、F/G/H n/a；实际核对项 = DOM 契约扫描 + direction/justify/align/wrap/gap 语义 prop 生效性 + 可点击分支（源码核对）+ 双视口溢出扫描）

## 1. 截图清单

| 状态           | light                                                                   | dark（真 data-mode，自采）                                        |
| -------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 默认 1280×800  | `_tmp/visual-inspection-2026-09-23/lab-flex-default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/flex/full-1280-dark.png` |
| 默认 800×900   | `_tmp/visual-inspection-2026-09-23/lab-flex-default-800x900-light.png`  | `_tmp/visual-inspection-2026-09-23/r2-2a/flex/full-800-dark.png`  |
| 全页（3 场景） | 同默认 1280 列                                                          | 同上                                                              |

## 2. 结构契约核对（styling-system.md）

- 根 marker：`.nop-flex` 存在；类串实测 `nop-flex flex-row items-center justify-between border rounded-lg p-3`——`flex-row/items-*/justify-*` 为结构工具类（FLEX_ALIGN/JUSTIFY_CLASS_MAP 白名单映射，`packages/flux-renderers-basic/src/flex.tsx` L8–L33），`border/rounded-lg/p-3` 为 lab fixture 作者 `className` 传参（`flex-lab-page.tsx` L11）——**renderer 自身零视觉类发出，契约 pass**（DOM 扫描仅命中上述 3 个作者类，`out-structural.json` flex.contractHits）。
- 语义 prop 生效性（`out-structural.json` flex.gaps/justify/wrap）：
  - `gap: 3`/`gap: 2` → 实测 `gap: 3px/2px`（resolveGap 数字按 px 直译）；
  - `justify: 'between'` → `justify-content: space-between`，双子元素 x=314/1098 分居两端；
  - `wrap: true` → `flex-wrap: wrap` 生效。
- 可点击分支（源码核对）：`onClick` 时升级 role=button + tabIndex + Enter/Space 键盘通道；`meta.disabled` 时 `data-disabled`/`aria-disabled` 标记并停发点击（V12e 族契约，flex.tsx L63–L126）——比 container 更完备，符合 interaction-owner 契约。

## 3. A–H 维度勾选表

- A 交互：A1–A4 n/a（fixture 未接 onClick；可点击态走源码核对 pass）A5–A9 n/a
- B 颜色：B1–B6 n/a（无自绘色面）
- C 布局：C1 pass（1280/800 overflow 扫描零命中，`out-structural.json` flex.overflow800）C2 pass C3 pass C4 pass（窄视口不塌不溢）C5 n/a C6 n/a
- D 间隔：D1 **warn(R2-2a-D1-13)**（fixture gap 2/3px 低于 4px 栅格，参数层）D2 n/a D3–D8 n/a/pass
- E 排布：E1 pass E2–E6 n/a/pass
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 4. 发现条目

### [R2-2a-D1-13] lab fixture 行内 gap 2/3px 低于 4px 栅格下限（schema 参数层）

- **页面/路由**: `#/lab/flex`（column gap 场景 `gap: 3`、行内 `gap: 2`；同 lab 其它控件 fixture 反复出现的参数习惯）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/lab-flex-default-1280x800-light.png`（步骤行 badge 与文本几乎相触）
- **目视描述**: 行内徽章与文本、行与行之间间距细如发丝，视觉成组关系模糊。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-structural.mjs` flex.gaps 段
  - 输出: `[{ gap: '3px' }, { gap: '2px' }, { gap: '2px' }, { gap: '2px' }]`——`resolveGap`（`packages/flux-react/src/resolve-gap.ts`）数字直译 px，schema `gap: 2` = 2px。
- **对照基准**: 检查提示词 D1（4/8pt 栅格）/ D7（<4px 进复验）；icon 卡 R2-2a-D1-22 同族先例
- **严重程度**: P3（fixture 演示参数选择，flex 控件的 gap 通道本身正确）
- **用户影响**: 照抄 lab 示例的作者会复制出贴死行；控件使用者传语义别名（`gap: 'sm'`）不受影响。
- **修复方向**: `apps/playground/src/component-lab/renderers/flex-lab-page.tsx` 各处 `gap: 2/3` → `gap: 8` 或语义别名 `gap: 'sm'`；可顺带在 flux-guide 示例里统一最小 gap 演示值。
- **归族**: watch-only → 台账（fixture 参数级，与 R2-2a-D1-22 同族；控件无责）
- **复核状态**: 未复核

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-flex` → carded（卡列填本路径）；findings 归族后 → digested。
