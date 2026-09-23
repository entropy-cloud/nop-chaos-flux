# [card] control:tag-list

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/tag-list` ｜ **载体**: lab 页（MultiScenarioLabPage，4 场景：预选技术标签 / 空起始加标签 / 宿主表单 toggle 提交（bug 73） / readOnly 标签 + 编辑器族提交（CX-8 复验））
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件。裁掉：disabled 态（fixture 未配置，仅 readOnly 在场）、弹层（无）、拖拽（无）。已覆盖：light+dark（真 data-mode）、1280+800 双视口、默认/选中-取消选中切换/空起始添加/只读冻结/hover/键盘 focus/值回显。
- runner dark 列作废声明：同 R2-2a-B5-34，dark 为自采 data-mode（"真 data-mode"）。

## 1. 截图清单

| 状态                         | light                                       | dark（真 data-mode）                      |
| ---------------------------- | ------------------------------------------- | ----------------------------------------- |
| 默认 1280×800（3/5 已选）    | `…/tag-list/default-s1-1280-light.png`      | `…/tag-list/default-s1-1280-dark.png`     |
| 空起始（场景 2）             | `…/tag-list/empty-start-s2-1280-light.png`  | `…/tag-list/empty-start-s2-1280-dark.png` |
| 首个标签添加后               | `…/tag-list/first-tag-added-1280-light.png` | —                                         |
| 切换后（去 react 加 vitest） | `…/tag-list/toggled-1280-light.png`         | —                                         |
| readOnly（场景 4）           | `…/tag-list/readonly-s4-1280-light.png`     | —                                         |
| 默认 800×900                 | `…/tag-list/default-s1-800-light.png`       | `…/tag-list/default-s1-800-dark.png`      |

（路径前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（未选标签 hover bg 白→`rgb(241,245,249)`）A2 pass（Tab 后 fv=true、ring 类生效）A3 pass（tag chip 52×28 ≥24；smallTargets 无命中）A4 pass（readOnly 实例：全部标签 `disabled=true` 且 `aria-pressed` 状态保留、点击无回显变化）A5 n/a A6/A8 n/a A7 n/a A9 pass（toggle 后 "Current tags: …" 回显即时、aria-pressed 同步）
- B 颜色：B1 pass（选中 18.26 / 未选 12.61；dark 13.78 / 11.43）B2 pass B3 n/a B4 pass B5 pass（dark 标签可读）B6 **warn(R2-2a-B6-106)**（dark 下选中/未选区分弱）
- C 布局：C1 pass（双视口 docOverX=0）C2–C6 n/a/pass
- D 间隔：D1 pass（标签间距一致、field 区块间距成栅格）D2–D8 n/a/pass
- E 排布：E1–E4 pass/n-a（标签横向流式排布、左缘对齐）E5–E6 n/a
- F 一致性：F1–F3 n/a F4 pass（标签为数据文本无 chrome 文案）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-B6-106] dark 主题下选中/未选中标签视觉区分仅剩文本亮度与背景透明度微差，状态辨识弱

- **页面/路由**: `#/lab/tag-list`（场景 1 预选态；一切 dark 下使用 tag-list 的表单）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/tag-list/default-s1-1280-dark.png`（react/typescript/vite 已选 vs vitest/zustand 未选，肉眼近乎同色）
- **目视描述**: light 下选中=实底填充、未选=白底描边，一眼可分；dark 下两组标签都是深色药丸，需要盯住文字亮度才能分辨。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w6-tag-list.mjs` + dark 标签 computed 复核
  - 输出: 选中 `bg: rgb(31,42,61)`（不透明）、`color: rgb(248,250,252)`；未选 `bg: oklab(0.2849 … / 0.3)`（30% 透明）、`color: rgb(230,236,243)`、`border: rgb(31,42,61)`——两组边框同色，背景差为透明度差，文本差仅 ~7%。对照 light：选中 `rgb(241,245,249)` 实底 vs 未选 `rgb(255,255,255)`+浅描边，差异维度更多。
- **对照基准**: 检查提示词 B6（状态可辨识，选中态不用默认蓝一键切但需可感知）、B5（dark 平价——light 下可分的状态 dark 下弱化即平价缺口）
- **严重程度**: P3（不影响点击可用性，aria-pressed 语义在；但视觉状态反馈明显弱于 light）
- **用户影响**: dark 用户需依赖记忆或点击试错确认当前勾选集。
- **修复方向**: `packages/flux-renderers-form-advanced/src/tag-list.tsx` 选中态在 dark 下提高区分度：选中 `bg-[var(--nop-accent)]/20 + border-[var(--nop-accent)]/60`（或 ring-1 ring-accent），未选保持现有 muted 透明底；走令牌不改字面色。
- **归族**: systemic 候选 → dark 状态区分度族（与 R2-4 dark 平价批同收；当前仅 tag-list 一例，暂记 watch，复现第二例升 systemic）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **调试 chip z9998 / scope-debug 面板**: 默认展开占位属 lab 载体家具，引用不立项。
- **误报排除**: readOnly 标签点击探针用 force click 注入且回显无变化——真实用户路径 disabled 拦截，非"可点无反馈"；标签切换使用 muted 填充而非主色填充符合 B6"状态色不裸奔"口径，不报。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-tag-list` → carded（card 列填本路径）；findings 归族后 → digested。
