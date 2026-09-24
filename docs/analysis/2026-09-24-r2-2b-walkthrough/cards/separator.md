# [card] control:separator

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/separator` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic horizontal separator / Host separator orientations + decorative C6.2）
- **矩阵裁剪**: simplified（matrixReason：无交互纯分割件；裁掉的状态：hover/focus/disabled/error/值态全部不适用（控件无这些态）；glass 皮肤）

## 1. 截图清单

| 状态                                                 | light                                                                            | dark（真 data-mode，自采）                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 默认 1280×800                                        | `_tmp/visual-inspection-2026-09-24/r2-2b/separator/default-1280-light.png`       | —                                                                               |
| host 变体（horizontal/vertical/labelled/decorative） | `_tmp/visual-inspection-2026-09-24/r2-2b/separator/host-variants-light-1280.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/separator/host-variants-dark-1280.png` |
| 默认 800×900                                         | `_tmp/visual-inspection-2026-09-24/r2-2b/separator/default-800-light.png`        | —                                                                               |

## 2. A–H 维度勾选表

- A 交互：A1–A9 n/a（纯分割件，无交互面）
- B 颜色：B1 n/a B2 pass（1px 线 rgb(225,231,239) light / rgb(31,42,61) dark——shadcn Separator 同款弱线基线，属有意弱分隔而非需 3:1 的功能边界；与 ui 原语全站一致）B3 n/a B4 pass（bg-border 令牌）B5 pass（dark 换挡可辨）B6 n/a
- C 布局：C1 pass（docOverX 0；垂直线 w=1px/h=24px 无溢出）C2 pass C3 pass C4 pass（800 宽自适应）C5/C6 n/a
- D 间隔：D1 pass（载体 flex gap-12 包裹，上下等距）D2–D8 n/a/pass
- E 排布：E1–E6 n/a/pass（labelled 变体「线—Section—线」对称，flex-1 两侧等宽 427/427）
- F 一致性：F1–F3 n/a F4 pass（label text-xs muted 与全站 labelled divider 语言一致）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

- 本卡无新增 finding。程序化核对全部通过：
  - 探针 `_tmp/r2-2b-probes/w2-sep-spin.mjs`：horizontal `918×1 / aria-orientation horizontal`；vertical `1×24 / vertical`；labelled 变体 `data-orientation=horizontal` + label "Section" 12px muted + 两侧 flex-1 各 427px 对称；decorative 变体 `aria-hidden="true" + role="none"`（可访问性树正确摘除）。
  - C6.2 锚点复检通过（orientation/decorative/labelled 三形态与 a11y 映射全中）。

## 4. 已知族命中（引用，不另立项）

- 无族命中（控件无可 i18n 文案、无图标、无弹层、无 dark 专有面）。

## 5. 交互键

- 无法注册：控件无任何交互态。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-separator` → carded（卡列填本路径）。
