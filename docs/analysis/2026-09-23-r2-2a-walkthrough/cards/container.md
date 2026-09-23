# [card] control:container

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/container` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：header/body/footer 槽位 / className 卡片 / row direction+gap）
- **矩阵裁剪**: simplified + **结构类契约核对**（裁剪理由：container 为结构类控件，styling-system.md「Renderer Styling Contract」明文 layout renderer 发 marker classes only、无硬编码视觉类——A–H 视觉维度大量 n/a：A1/A3/A4 交互态 n/a（非交互，fixture 未接 onClick）、A6/A8 拖拽 n/a、A5 loading/empty n/a、B1–B6 颜色 n/a（无自绘视觉，色面全部来自 schema className 与子控件）、D2–D8 大部分 n/a、E2–E6 n/a、F/G/H n/a；实际核对项 = DOM 契约扫描 + 槽位结构 + direction/gap 语义 prop 生效性 + 双视口溢出扫描）

## 1. 截图清单

| 状态           | light                                                                        | dark（真 data-mode，自采）                                             |
| -------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 默认 1280×800  | `_tmp/visual-inspection-2026-09-23/lab-container-default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/container/full-1280-dark.png` |
| 默认 800×900   | `_tmp/visual-inspection-2026-09-23/lab-container-default-800x900-light.png`  | `_tmp/visual-inspection-2026-09-23/r2-2a/container/full-800-dark.png`  |
| 全页（3 场景） | 同默认 1280 列                                                               | 同上                                                                   |

## 2. 结构契约核对（styling-system.md）

- 根 marker：`.nop-container` 存在（三场景根节点 `nop-container rounded-xl border bg-card` 等——border/bg 均为 schema `className` 作者显式传入，非 renderer 发出）。
- 槽位：`[data-slot="container-header"|"container-body"|"container-footer"]` 齐备，padding 全部来自作者 className（`px-4 pt-4` / `px-4` / `px-4 pb-4`，实测 pt/pb 16px/0 与 schema 一致）。
- 语义 prop：`direction: 'row'` → body 实测 `flex-direction: row` + `gap: 'md'` 生效（semantic props inert bug 已修回归保持，docs/bugs/75）；flex 类（`flex/items-*/justify-*`）均为结构工具类，符合契约。
- DOM 视觉类扫描（`w1-structural.mjs` contractScanJs）：仅命中 `border/rounded-lg/p-3` 三项，全部可归属 lab fixture `className` 作者传参（`container-lab-page.tsx` L8/L31/L39）——**renderer 自身零视觉类发出，契约 pass**。

## 3. A–H 维度勾选表

- A 交互：A1–A4 n/a（fixture 未接 onClick；源码 clickable 分支存在且带 role=button/tabIndex）A5 n/a A6/A8 n/a A7/A9 n/a
- B 颜色：B1–B6 n/a（无自绘色面；子 badge 色面归 badge 卡）
- C 布局：C1 pass（1280/800 overflow 扫描零命中，`out-structural.json` container.overflow800）C2 pass（槽位无重叠）C3 pass（header/body/footer 分区可辨）C4 pass（窄视口不塌）C5 n/a C6 n/a
- D 间隔：D1 pass（header→body、body→footer 实测各 8px，落 4/8 栅格，`out-structural.json` container.slots[0].gaps）D2 n/a D3 n/a D4–D8 n/a/pass
- E 排布：E1 pass（槽位顺序 header→body→footer 符合惯例）E2–E6 n/a/pass
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 4. 发现条目

无（本控件 pass：结构契约、槽位几何、语义 prop、双视口、双主题渲染均无 P0–P3 发现；gap 2/3px 类 fixture 值问题归 flex 卡 D1 族，不重复立项）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-container` → carded（卡列填本路径）。
