# R2 第 7 轮递归扩展发现（round-07-g1）— G1 收敛终判（终轮）

> 组号: G1（basic / content / layout） · 轮次: Round 07（收敛终判，最严格价值判据） · 审查日期: 2026-08-29 · agent: general（fresh session，只读审查） · HEAD `0f183874a`（与 R1–R6 同基线，`git log` 实证）
> 派发机制: 提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md` + 收敛终判附加判据（仅立"前 6 轮所有方法面都未触及的全新根因"，须通过真实用户影响检验，且与累积 274 条逐根因比对为全新；已有根因复述、纯视觉偏好、零散细节、已弃报候选翻案（无新事实）一律不立案）
> 输入: `AGENTS.md` + `dispatch-shared-prefix.md` 全文 + `dispatch-recursive-extension.md` 全文 + `dedup-baseline.md` §1–§4 + round-01（Grep `\[G1-` 精读）+ round-02-compact / round-03-compact 全文 + round-04（Grep `\[G1-` 精读）+ round-05-g1 全文（含弃报留档）+ round-06-g1 全文（含弃报留档与转 C2 段）
> 本轮性质: 收敛终判终轮——优先核对 round-06 弃报留档与"转 C2 候选"边界外的剩余面；只有全新根因才立案

## 发现汇总

共 **0 条**。G1 组收敛趋势: 15 → 6 → 2 → 5 → 1 → 2 → **0**。R6 已声明"无残余镜头盲区"，本轮对其边界外剩余面做最后一轮定向补盲 + 终扫独立复跑，全部候选均归因到已立案条目、注册裁决或既有弃报，零新根因。**G1 组审查结束。**

## 检查范围（本轮实际读取/核实的文件清单）

- `packages/flux-renderers-basic/src/`：
  - `dialog.tsx`、`drawer.tsx`（全文精读——核实 R6"surface 薄壳零 UI 面"结论：两者均为 `useSurfaceRenderer(props, 'dialog'/'drawer')` + `return null` 的 8 行真薄壳，无任何自绘按钮/焦点/层级面，视角 6 全部子项归 ui/surface 层）
  - 其余非 test 文件（button/tabs/page/text/badge/icon/collapse 系兄弟/dynamic-renderer 等）经终扫 grep + R1–R6 已立案项现状反查确认，无新增命中。
- `packages/flux-renderers-content/src/`：
  - `json-view.tsx`（全文精读——复制反馈镜头：`:54-71` handleCopy 失败/clipboard 不可用双通道静默 = R1 `[G1-视角10-13]` 已立案本体；空值分支 = `[G1-R4-视角5-01]` 已立案；溢出契约走 ui `JsonViewer`（R5 已证其 `overflow-auto` 基线）维持）
  - `qrcode/audio/video/image/markdown/alert/progress/link/empty/spinner/html/separator/cards/carousel/status/mapping` + diff-view 全家：终扫 grep 复跑 + R5/R6 盲区精读结论反查，无新增命中。
- `packages/flux-renderers-layout/src/`：
  - `wizard-renderer.tsx`（全文精读——底部按钮语义/变体/顺序镜头，前轮从未以此镜头精读该文件）
  - `collapse-renderer.tsx`（全文复读——展开指示图标语义 + disabled/hover 现状反查）
  - `dropdown-button-renderer.tsx`（全文精读——触发器/菜单项语义与变体镜头）
  - `steps/timeline/wizard-step-nav/wizard-step-body/button-group/grid/responsive`：终扫 grep + R2–R5 已立案项反查，无新增命中。
- 交叉核实：HEAD commit（`0f183874a`，与 R1–R6 同基线）；`packages/ui/src/components/ui/json-viewer.tsx`（R5 溢出基线引用维持）。

## 检查方法（逐镜头）

1. **薄壳实证**：dialog/drawer 全文读取，实证 R6 "零 UI 面" 结论（非采信），把视角 6 的焦点陷阱/Escape/关闭钮/按钮顺序子项正式划归 surface/ui 层（G6 域）。
2. **镜头补盲**：选取前 6 轮从未以其命名的镜头精读过的三个面——① wizard 页脚"按钮变体/层级/顺序/加载"（结果：prev=`outline`+ChevronLeft、next=`default` 主操作、`justify-between` 顺序正确，层级正确；提交锁与缺 Spinner 分别为 `[G1-R3-视角3-01]`/`[G1-视角10-11]` 已立案；见弃报留档 1）；② dropdown-button "触发器与菜单项语义"（结果：ChevronDown caret 标准下拉模式、destructive 项走 `variant="destructive"`、`aria-haspopup="menu"`、hover 门户宽限窗有注释论证，无缺陷）；③ collapse "展开指示图标语义"（结果：ChevronDown + `rotate-180` 标准方向语言，与包内一致，无缺陷）。
3. **已立案项现状反查**：对 R1–R6 全部 31 条 G1 发现涉及的关键代码位（json-view 复制、wizard 页脚、collapse 触发器、tabs TabsList、alert 关闭钮、timeline 轴线、steps 连接线等）抽样复核现状与已立案描述一致（均为未修复状态，不重报）。
4. **终扫独立复跑**（不采信 R5/R6 结论，本轮以独立正则重跑三包全量非 test 文件）：
   - 硬编码 Tailwind 调色板类：唯一命中 `diff-three-column-view.tsx:97 bg-gray-50`（`[G1-视角7-08]` 已立案）；
   - oklch/hex 字面量：`styles.css:22-30` progress 三处（`[G1-视角7-09]` 已立案）；`diff-view.css` 全部 oklch 位于其自有令牌定义块内（R6 已核符合文件头部声明）；`qrcode.tsx` #000/#fff 为 QR 规范功能默认（R1 已豁免）；`schemas.ts:368-370` 为文档注释非代码；
   - 文本字符图标：唯一命中 `diff-header.tsx:54/64` ↑/↓（`[G1-视角1-07]` 已立案）；
   - 硬编码用户可见字符串：零命中（全部匹配均为代码标识符/类型字面量）。
5. **真实用户影响检验**：上述每个候选在立案前均先过该检验；未通过者直接弃报（见下节留档）。

## 弃报留档（本轮评估过且不立案的候选，防复核重复提问）

1. **wizard 提交抛异常时 `error.message` 直出**（`wizard-renderer.tsx:456,622`）：commit 动画抛错时 `lifecycle.stepError` 取 `error.message` 并渲染于 `wizard-step-error`（`text-destructive` + `role="alert"`，语义色/角色均正确）。不立案依据：① `:621` 有 P2-10 注册裁决注释（"render the real stepError message; generic i18n only when empty"）——渲染真实错误为**已注册的设计决策**，翻案属"已裁决项翻案（无新事实）"；② `ok:false` 与校验失败主路径均为本地化文案，仅 throw 路径携带原始消息，影响面窄；③ 若强行立案属"裸错误信息直出"已立根因（G5-R2-视角5-02/G4-R3-视角5-01）的复述，违反本轮"仅全新根因"判据。
2. **dropdown-button 无 label 且无 icon 的退化配置**（`dropdown-button-renderer.tsx:144-153`）：author 未配 label/icon 时触发器仅剩 caret 图标、无可访问名——与 R6 已弃报的 `icon.tsx 未知图标名静默回退` 同属"作者侧误配置调试体验"而非终端用户交互缺陷，沿 R6 先例弃报。
3. **round-06 弃报留档复核维持**：alert 关闭钮包含块正确（非定位逃逸）、progress `showValue` 原始值显示（设计取舍）、icon.tsx 回退（作者侧）、page `footerIsFixed` 字符串嗅探（启发式边缘）、collapse-count 间距 / collapse-tone-bar / badge 空 pill / tabs 空 items（R3/R5 弃报）——现状未变化，均不重复评估。
4. **carousel `orientation` 声明未实现**：维持 R6 裁决归 C2（dedup §2，capability gap ≠ 一致性缺陷），不计入发现。

## 去重自检声明

- 本轮立案 0 条，无条目级去重义务；上述 4 项弃报候选均已逐根因比对：候选 1 引根 G5-R2-视角5-02/G4-R3-视角5-01（已立根因，复述不立案）；候选 2 引根 R6 icon.tsx 弃报先例（同类作者侧形态）；候选 3/4 为既有裁决复核维持。
- 与 G1 组既有 31 条（R1 15 / R2 6 / R3 2 / R4 5 / R5 1 / R6 2）零新交集——所有命中均归因到具体已立案编号并在检查方法 §3/§4 逐条标注。
- dedup §1（ma5-ux 6 条已修复，防同类新实例——本轮终扫未发现新的 i18n 硬编码/focus ring 缺失实例）、§2（缺口 16 项仅 carousel orientation 撞面，已归 C2 段）、§3（误报对照 8 条未触碰）、§4（边界排除未触碰：本轮无 RendererComponentProps 契约/marker/WCAG 全量类候选）全部生效。

## 结论

新发现 **0 条**。G1 组（basic / content / layout 三包，82 个非 test 源文件）经 7 轮审查：R1 全量初扫 → R2 状态属性消费反查 → R3 深读 → R4 组合与边缘态 → R5 溢出契约与媒体边缘态 → R6 镜头补盲 → R7 薄壳实证 + 剩余镜头（wizard 页脚按钮语义 / dropdown 语义 / collapse 图标语义）+ 终扫独立复跑，**方法面全部闭合，累积发现 31 条收敛为终态，零残余候选达标**。未发现新的高价值问题。审查结束。
