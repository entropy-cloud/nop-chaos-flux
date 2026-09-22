# Evidence Card 模板（R2 走查卡）

> 用法：每个走查单元（R2-1 页面 / R2-2 控件）一张卡，复制本模板到
> `docs/analysis/<批次目录>/cards/<unit-id>.md` 填写。口径 =
> `docs/skills/visual-page-quality-inspection-prompt.md`。
> 卡内截图路径一律指向 `_tmp/visual-inspection-<date>/`（快照政策：永不入库）。

---

```markdown
# [card] <unit-id>（如 page:flow-designer / control:kanban）

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: YYYY-MM-DD
- **路由**: `#/<hash>` ｜ **载体**: 域页面 / complex-page / lab 页 / fixture（fixtureRequired 时给 schema fixture 落点）
- **矩阵裁剪**: full ｜ simplified（裁剪理由必填：matrixReason + 本页实际裁掉的状态）

## 1. 截图清单（状态矩阵，逐张列路径；无截图的卡复核直接驳回）

| 状态                                                                    | light                                                    | dark |
| ----------------------------------------------------------------------- | -------------------------------------------------------- | ---- |
| 默认 1280×800                                                           | `_tmp/visual-inspection-<date>/<unit>-default-light.png` | …    |
| 默认 ~800 宽                                                            | …                                                        | …    |
| hover（抽样）                                                           | …                                                        | …    |
| focus-visible（抽样）                                                   | …                                                        | …    |
| disabled（如有）                                                        | …                                                        | …    |
| 弹层打开（Dialog ≥1 + Sheet/Drawer ≥1，有则必查；1 个选长内容验 H3/H8） | …                                                        | …    |
| 拖拽进行中（有拖拽必查；仅 full 矩阵）                                  | …                                                        | …    |
| loading/empty/error（有异步必查）                                       | …                                                        | …    |

## 2. A–H 维度勾选表（pass / fail(编号) / warn(编号) / n/a）

- A 交互：A1 ☐ A2 ☐ A3 ☐ A4 ☐ A5 ☐ A6 ☐ A7 ☐ A8 ☐ A9 ☐
- B 颜色：B1 ☐ B2 ☐ B3 ☐ B4 ☐ B5（dark 复检）☐ B6 ☐
- C 布局：C1 ☐ C2 ☐ C3 ☐ C4 ☐ C5 ☐ C6 ☐
- D 间隔：D1 ☐ D2 ☐ D3 ☐ D4 ☐ D5 ☐ D6 ☐ D7 ☐ D8 ☐
- E 排布：E1 ☐ E2 ☐ E3 ☐ E4 ☐ E5 ☐ E6 ☐
- F 一致性（横切）：F1 ☐ F2 ☐ F3 ☐ F4 ☐ F5 ☐
- G 设计器（画布类专用，非画布页标 n/a）：G1–G8 ☐
- H 弹层（有弹层面专用，无弹层标 n/a）：H1 ☐ H2 ☐ H3 ☐ H4 ☐ H5 ☐ H6 ☐ H7 ☐ H8 ☐ H9 ☐

## 3. 发现条目（每条 ≥10 行，格式同检查提示词「发现条目格式」）

### [R2-<批>-<维度>-<序号>] <标题>

- **页面/路由**: …
- **主题/视口/状态**: …
- **截图**: `_tmp/…`
- **目视描述**: …
- **程序化证据**: 探针 … / 输出 …（或 [visual-only] + 复核结论）
- **对照基准**: …
- **严重程度**: P0 / P1 / P2 / P3
- **用户影响**: …
- **修复方向**: （具体到令牌/类名/variant/布局逻辑）
- **归族**: systemic → R2-3 批 ｜ local → R2-4 批 ｜ watch-only → 台账（三选一，禁止空缺）
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填卡路径）；
  findings 归族进对应批后 → `digested`；批内复检通过后 → `verified`。
```
