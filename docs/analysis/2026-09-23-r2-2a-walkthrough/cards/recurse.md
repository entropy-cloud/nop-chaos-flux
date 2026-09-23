# [card] control:recurse

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/recurse` ｜ **载体**: lab 页（4 场景：simple tree / rich tree with icon+badge / deep 6-level / maxDepth 2）
- **矩阵裁剪**: simplified（matrixReason：结构类契约核对——recurse 自身零 DOM 包装（`recurse.tsx` 返回 fragment，行视觉全部来自 schema 模板），A1–A9 元素态无自身交互面（n/a），B/C/D/E 视觉维度按宿主渲染抽样；裁掉：glass、元素态（hover/focus/disabled——控件无可交互元素）、弹层/拖拽/loading（lab 未演示，且非 recurse 职责））

## 1. 截图清单

| 状态               | light                                                                      | dark                                                                      |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 默认 1280×800      | `_tmp/visual-inspection-2026-09-23/lab-recurse-default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-23/lab-recurse-default-1280x800-dark.png` |
| 默认 800×900       | `_tmp/visual-inspection-2026-09-23/lab-recurse-default-800x900-light.png`  | `_tmp/visual-inspection-2026-09-23/lab-recurse-default-800x900-dark.png`  |
| 全页滚动（双主题） | `_tmp/visual-inspection-2026-09-23/r2-2a/recurse/full-1280-light.png`      | `_tmp/visual-inspection-2026-09-23/r2-2a/recurse/full-1280-dark.png`      |
| 场景 0–3 分场景    | `r2-2a/recurse/scenario-{0..3}-light.png`                                  | `r2-2a/recurse/scenario-{0..3}-dark.png`                                  |
| 800 视口全页       | `_tmp/visual-inspection-2026-09-23/r2-2a/recurse/full-800-light.png`       | —（800 dark 由 runner 列覆盖）                                            |

## 2. A–H 维度勾选表

- A 交互：A1–A8 n/a（recurse 无自身交互面：无按钮/链接/拖拽，行内容纯文本）A9 n/a（无交互后反馈面；数据驱动重渲染归族 #7 行为取证，见 §3）
- B 颜色：B1 pass（节点 label computed `rgb(33,53,71)`，light 合成对比度 12.61；dark `rgb(230,236,243)` vs 页面渐变最浅档 rgb(17,28,52) ≈ 9+）B2 n/a（无边框/焦点面）B3 n/a B4 pass（label 色走 --nop-app-text 族令牌）B5 pass（dark 复检 label 可读，无 dark 专有缺陷）B6 n/a
- C 布局：C1 pass（1280/800 双视口 overflow 扫描零命中）C2 pass C3 pass C4 pass（800 下行不折断）C5 n/a C6 n/a
- D 间隔：D1 pass-with-note（行距由 schema `mb-*` 决定；**同级行零缩进梯度见 R2-2a-E5-27**）D2–D8 n/a/pass
- E 排布：E1 pass E2 n/a E3 pass E4 pass（同列左缘对齐 x=301 一致——但见 E5-27：对齐到"完全无梯度"）**E5 fail(R2-2a-E5-27)**（树层级无视觉语言）E6 n/a
- F 一致性：F1–F5 n/a（单控件无跨页语义对照面）
- G 设计器：n/a
- H 弹层：n/a

## 3. 行为取证（4 场景渲染正确性 + 结构契约，schema 响应性族 #7 邻接核对）

- 探针 `_tmp/r2-2a-probes/w2r-recurse.mjs` 输出：
  - 场景 0 simple tree：5 label（Root A / Child A1 / Child A2 / Root B / Child B1）与 data 一致 ✓
  - 场景 1 rich tree：6 节点 + badge 序 L0/L1/L2/L2/L1/L2 与 orgTree 深度一致、icon svg ×6 ✓
  - 场景 2 deep tree：Level 0–5 六级全渲染，真实浏览器无栈溢出 ✓
  - 场景 3 maxDepth 2：仅 Level 0/1，Level 2–5 截断 ✓（终止守卫生效）
- 结构契约：recurse 输出 wrapper 链 = body 内容 DIV（空 class）→ section.nop-page → DIV.contents（loop 的 display:contents）；**recurse 自身零元素零类**，符合 styling-system「marker-only/无包装」契约 ✓
- 订阅面：structural-loop `buildSlotBindings`（`packages/flux-renderers-basic/src/structural-loop.tsx:85-119`）仅暴露 item/index/key + itemData 附加键；内部递归 `depth`（maxDepth 守卫用）**未进入 slot 绑定** → schema 无法表达按深度缩进（E5-27 根因）。

## 4. 发现条目

### [R2-2a-E5-27] 递归树零层级缩进：4 场景全部平铺，父子层级不可辨识

- **页面/路由**: `#/lab/recurse`（4 场景全部，重灾区场景 2 六级深链）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/recurse/scenario-2-light.png`（六级深链平铺）
- **目视描述**: 六级嵌套树渲染为等左缘的垂直文本列表，视觉上与 6 行无关文本无差别；rich 场景仅靠 badge 文本 "L0/L1/L2"（来自 data 自带 depth 字段）间接提示层级。
- **程序化证据**:
  - 探针: `w2r-recurse.mjs` 收集各场景 `.nop-text` boundingRect.x
  - 输出: 场景 0 五行 x 全部=301；场景 2 六行 x 全部=301；场景 1 六行 x 全部=317（图标统一让位，无逐级递增）。源码面：`structural-loop.tsx` slotBindings 无 depth 键，`recurse.tsx:118-131` renderItem 的 depth 仅内部传递。
- **对照基准**: 检查提示词维度 E5（层级与动线：分组有视觉语言）；行业树形渲染惯例（AMIS tree/ant Tree 逐级 16–24px 缩进）。
- **严重程度**: P3
- **用户影响**: 用 recurse 表达树结构的页面（组织架/分类树）父子关系全靠用户脑补，深链场景（≥3 级）误读率高；不影响任务完成。
- **修复方向**: `buildSlotBindings` 增暴露 `depthName`/`$slot.depth` 绑定（renderItem 已有 depth 值，传递成本≈0）；lab fixture 以 `style paddingLeft: ${depth*16}px` 类机制演示缩进。控件仍保持 marker-only 契约。
- **归族**: systemic → R2-3 批（schema 表达力/slot 绑定面新子项；与已知族 #7「schema 响应性」相邻但非同根因，引用 #7 不并入）+ 本卡实例
- **复核状态**: 未复核

### [R2-2a-B4-28] lab stage 面板底色从不渲染：--nop-playground-stage-bg 是渐变值，经 bg-[var(...)] 落入 background-color 触发 IACVT

- **页面/路由**: `#/lab/recurse`（本波 4 条 lab 载体全部同构；同模式消费面含 `performance-table`、`condition-builder*`、`flux-basic` 页）
- **主题/视口/状态**: light+dark / 1280×800 / 默认（双主题同根因）
- **截图**: `_tmp/visual-inspection-2026-09-23/lab-recurse-default-1280x800-dark.png`（面板内仅靠 1px 边框与页面渐变区分）
- **目视描述**: 场景 stage 面板内部无自身底色，视觉边界完全依赖 border；设计意图的 0.96 不透明面板面（light 近白 / dark 抬亮一档）未出现，面板与页面背景融为一体。
- **程序化证据**:
  - 探针: `w2r-bgchain.mjs` 逐层读 computed backgroundColor/backgroundImage
  - 输出: stage DIV（`p-5 rounded-[16px] bg-[var(--nop-playground-stage-bg)]`）computed `backgroundColor: rgba(0, 0, 0, 0)`、`backgroundImage: none`；令牌定义 `apps/playground/src/styles.css:115/201` 值为 `linear-gradient(180deg, …)`。`background-color: linear-gradient(...)` 无效 → IACVT → 透明。dark 真实底为 body 渐变（rgb(7,17,31)→rgb(17,28,52)），文本对比度不受影响（B1 仍 pass）。
- **对照基准**: styling-system.md 令牌契约（令牌值型别须与消费属性匹配）；CSS IACVT 语义。
- **严重程度**: P3
- **用户影响**: 用户几乎不会意识到"面板底色缺失"（有边框兜底），但 dark 下面板/页面层级扁平，长页面分块辨识度下降；属系统性载体瑕疵，≥7 页同根因。
- **修复方向**: 拆双令牌——`--nop-playground-stage-bg` 改纯色（如 rgba(243,248,255,0.96)），渐变迁移到新令牌 `--nop-playground-stage-bg-image` 并配 `@utility`/显式 `background-image` 消费；同步修正 7+ 消费点。
- **归族**: systemic → R2-3 批（lab/host 载体面，≥3 页同根因升格）；与已知族 #2 dark 平价无关（双主题同病）
- **复核状态**: 未复核

## 5. 疑点（不计发现）

- lab 场景 data 深度字段（orgTreeData.depth）是 fixture 自带——schema 作者真实使用时需自造 depth 数据才能显示层级，加重 E5-27 影响。
- rich 场景 icon `folder-open` 尺寸 14px 渲染正常；icon 语义别名回环归已知族 #9，不另立项。
- 宿主已知项引用：调试 chip（z9998）与 `.nop-theme-root` color-scheme dark 异常在本页可见但属宿主已知，不重复立项。

## 6. 台账回写

- 主 session 统一翻转 `lab-recurse` → carded。
