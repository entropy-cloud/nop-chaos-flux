# [card] control:fragment

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/fragment` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：scope 注入合并 / scope 隔离）
- **矩阵裁剪**: simplified + **结构类契约核对**（裁剪理由：fragment 为无 DOM 壳的纯 scope 控件（渲染为 Fragment，不产出 marker 节点）——A–H 视觉维度几乎全部 n/a：A1–A9 n/a（无任何交互/视觉面）、B 全 n/a（无渲染物）、C2–C6 n/a、D 全 n/a、E 全 n/a、F/G/H n/a；实际核对项 = scope 语义正确性（注入合并 / isolate 隔离）+ 双视口溢出 + 双主题不回归）

## 1. 截图清单

| 状态           | light                                                                       | dark（真 data-mode，自采）                                            |
| -------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 默认 1280×800  | `_tmp/visual-inspection-2026-09-23/lab-fragment-default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/fragment/full-1280-dark.png` |
| 默认 800×900   | `_tmp/visual-inspection-2026-09-23/lab-fragment-default-800x900-light.png`  | —                                                                     |
| 全页（2 场景） | 同默认 1280 列                                                              | 同上                                                                  |

## 2. 结构契约核对 + scope 语义取证

- 无 DOM 壳契约：fragment 子树不产出 `.nop-fragment` marker（`hasNopFragment: 0`），渲染子节点为普通内容节点——headless 设计符合预期，无视觉类可违。
- scope 注入合并（`out-structural.json` fragment.texts[0]）：`Parent scope: topLevel = "parent-value"` / `Fragment greeting: Hello from fragment scope` / `Fragment count: 5` / `Parent var visible: "parent-value"`——data 合并与父变量透传双双正确。
- **isolate 隔离**（`out-structural.json` fragment.texts[1]）：`Inside isolated fragment — localOnly: "only inside fragment"`、`Parent var secret here: "" (empty because isolated)`、`Back in parent — secret still: "should-not-leak"`——**隔离生效**：父变量在隔离子树内不可见、父作用域不受污染。
- 疑点（非发现）：`fragment-lab-page.tsx` 场景 2 描述文案声称"当前 live fragment surface 会把父文本绑定保留可见……不作为严格 scope 隐藏的证明"——与实测渲染（父变量为空）不符，疑似陈旧描述（历史 bug 修复后文案未更新），建议修订 fixture 描述（走 docs/fixture 修订，非视觉缺陷不立项）。

## 3. A–H 维度勾选表

- A 交互：A1–A9 n/a（无交互面）
- B 颜色：B1–B6 n/a（无渲染物；文本色继承父级令牌）
- C 布局：C1 pass（1280 overflow 扫描零命中，`out-structural.json` fragment.overflow）C2 n/a C3 n/a C4 pass（子树随宿主流式排布，800 宽无异常）C5/C6 n/a
- D 间隔：D1–D8 n/a（无自间隔）
- E 排布：E1–E6 n/a
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 4. 发现条目

无（本控件 pass：scope 注入/隔离语义、双视口、双主题均无发现；fixture 描述陈旧疑点已记录于第 2 节，不构成视觉发现）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-fragment` → carded（卡列填本路径）。
