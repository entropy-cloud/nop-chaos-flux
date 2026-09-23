# [card] control:reaction

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/reaction` ｜ **载体**: lab 页（2 场景：counter→doubled 派生 / form 字段→charCount）
- **矩阵裁剪**: simplified（matrixReason：reaction 渲染 `null`（DOM footprint 0，探针坐实），headless 副作用触发器——视觉维度全 n/a，按"结构类契约核对"；动态行为（schema 响应性族 #7 重点面）以真实点击/输入 + DOM diff 取证。裁掉：glass、元素态（无自身 DOM）、~375 档）
- **runner dark 列作废声明**：runner dark 为 light 渲染；dark 自采 `_tmp/visual-inspection-2026-09-23/r2-2a/reaction/full-1280-dark.png`（仅载体面）。

## 1. 截图清单

| 状态                                     | light                                                                                    | dark（自采）                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 默认 1280×800                            | `_tmp/visual-inspection-2026-09-23/lab-reaction-default-1280x800-light.png`              | `_tmp/visual-inspection-2026-09-23/r2-2a/reaction/full-1280-dark.png`        |
| Increment ×2 后（counter 2 / doubled 4） | `_tmp/visual-inspection-2026-09-23/r2-2a/reaction/after-2-clicks-1280-light.png`         | —                                                                            |
| 输入 'hello flux' 后（charCount 10）     | `_tmp/visual-inspection-2026-09-23/r2-2a/reaction/charcount-after-typing-1280-light.png` | —                                                                            |
| 默认 800×900                             | `_tmp/visual-inspection-2026-09-23/lab-reaction-default-800x900-light.png`               | `_tmp/visual-inspection-2026-09-23/r2-2a/reaction/full-800-dark.png`（自采） |

## 2. A–H 维度勾选表

- A 交互：A1–A8 n/a（渲染 null）；A9 pass（点击 → counter/doubled 文本即时更新，两次点击 0→1→2 / 0→2→4，探针坐实）
- B 颜色：B1–B6 n/a（载体文本对比由 page 卡覆盖；Increment 主按钮色 rgb(28,110,242) = `--primary: 217 89% 53%`（theme-tokens styles.css L52）B4 令牌溯源 ✓）
- C 布局：C1 pass（1280/800 overflow 零命中）C2–C6 n/a/pass
- D 间隔：D1–D8 n/a
- E 排布：**E2 warn(R2-2a-E2-26)**（Increment 主按钮 918×32 全宽拉伸，见发现；watch 族引用）E1/E3–E6 pass/n-a
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 行为取证（schema 响应性族 #7 正向核对）

- 探针 `_tmp/r2-2a-probes/w2-reaction-recurse-result.json`：
  - reactionBefore `{counter:0, doubled:0}` → after1 `{1, 2}` → after2 `{2, 4}`——watch ['counter'] 每次 setValue 后触发，派生值实时回写 ✓
  - 输入 `hello flux`（10 字符）→ `Character count: 10` ✓（form 局部作用域 watch 正常）
  - `reactionDomFootprint: 0`——无 `.nop-reaction`/`[data-type="reaction"]` 节点，渲染 null ✓（结构类裁剪依据坐实）

## 4. 发现条目

### [R2-2a-E2-26] Increment 主按钮全宽拉伸（918px，占容器 97%）——默认栈宽基线 watch 族的又一实例

- **页面/路由**: `#/lab/reaction`（场景 1；同根因复现于 `#/lab/scope-debug` 的 "Increment count"（918×32）与 `#/lab/text` 的 "Change Name"（918 宽））
- **主题/视口/状态**: 双主题 / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/lab-reaction-default-1280x800-light.png`（蓝色主按钮横贯整个舞台）
- **目视描述**: page body 里的孤立主按钮被拉伸成通栏横条，主操作视觉权重被几何尺寸放大成 hero CTA，与 AMIS 惯例的内联按钮尺度相悖。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w2-reaction-recurse-result.json` incrementBtn 字段
  - 输出: `{w:918, h:32, parentW:950, ratio:0.97}`；根因 = `packages/flux-react/src/default-spacing.css` L11 `.nop-page > [data-slot='page-body'] { display:flex; flex-direction:column }` 默认 `align-items: stretch`，inline-flex Button 被拉满。Button 自身无 `w-full`（`block` 未开）。
- **对照基准**: **既有 watch 记录引用**——R2-1d `w1b-content.md`（"按钮在垂直栈内全宽拉伸：flux-react 默认栈宽基线，与 data-verify 卡 watch 记录同款，产品面出现再评估"）；检查提示词 E2
- **严重程度**: P3（watch 族既有裁决：产品面出现再评估；lab 三卡复现达系统性门槛，建议 R2-3 批重审该 watch）
- **用户影响**: 演示/表单页孤立按钮视觉突兀；不阻断任务。
- **修复方向**: `default-spacing.css` page-body 规则补 `align-items: var(--nop-page-body-align, stretch)` 并在 button 渲染器缺省 `self-start`（或文档确立"body 内块级按钮全宽"为契约 + demo 显式包 flex 行）。
- **归族**: watch-only → 台账（引用 R2-1d w1b-content / data-verify watch 记录 + 本卡三实例）
- **复核状态**: 未复核

## 5. 台账回写

- 主 session 统一翻转 `lab-reaction` → carded。
