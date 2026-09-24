# [card] control:designer-field

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/flow-designer` ｜ **载体**: 域 demo 页（plan 498 载体裁定：本波控件无 lab 路由，载体 = 域 demo 页）
- **契约面**: `designer-field` type 渲染区应为属性面板字段行（`.nop-designer-field`：label + Input/Textarea/Select/Input number 四变体，绑定 activeNode/activeEdge data 双向 dispatch）——**实际在载体页零渲染点（见发现 A5-152）**
- **矩阵裁剪**: simplified（matrixReason：**控件契约面在载体页不可达，渲染面状态矩阵整体不可执行**；已完成的取证 = 四个 example tab 全量 DOM 计数（零命中）+ 源码静态核对 + inspector 现状截图（字段行实际由 flux form 渲染器与 DefaultInspector 兜底表单承载）。裁掉：全部元素态/主题态截图矩阵——无法对未实例化的控件取证，理由与证据见 R2-2c-A5-152）
- **探针**: `_tmp/r2-2c-probes/w5-flow2.mjs`（fieldGap 四 tab 计数）、`w5-field.mjs`（选中态 inspector 计数）→ `out-w5-flow2.json`、`out-w5-field.json`

## 1. 截图清单

| 状态                                                                                 | light                                                                                          | dark                                                   |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 载体 inspector 现状（workflow tab，选中节点；`.nop-designer-field` 计数 = 0 的现场） | `_tmp/visual-inspection-2026-09-25/r2-2c/designer-field/inspector-no-designer-field-light.png` | —（dark 下同样零渲染，计数探针为客观判据，不重复截帧） |
| summary tab inspector（node-card/edge-row 承载，无 field）                           | `_tmp/visual-inspection-2026-09-25/r2-2c/designer-node-card/summary-default-light.png`         | —                                                      |

## 2. A–H 维度勾选表

- A 交互：**A5 fail(R2-2c-A5-152)**（注册类型无渲染实例——控件可达性缺口；其余子项因矩阵不可执行标 n/a）
- B 颜色 / C 布局 / D 间隔 / E 排布 / F 一致性：n/a（无渲染实例可查）
- G 设计器：n/a（无渲染实例）
- H 弹层：n/a
- 源码静态核对（替代矩阵的部分证据）：`designer-field.tsx` 四变体（text/textarea/select/number）均有 disabled 透传与 `focus-visible` 默认样式（消费 `@nop-chaos/ui` Input/Select/Textarea 组件族）；label 槽支持 schema input region；onChange 走 `updateNodeData`/`updateEdgeData` dispatch——静态契约面完整，缺的是载体消费。

## 3. 发现条目

### [R2-2c-A5-152] designer-field 注册类型在载体页与全部 playground schema 零渲染点，渲染面状态矩阵不可执行

- **页面/路由**: `#/flow-designer`（工作流 / 钉钉审批流 / Action 编排 / 节点边摘要 四个 example tab 全量核查）
- **主题/视口/状态**: 双主题 / 1280×800 / 默认 + 选中节点态
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/designer-field/inspector-no-designer-field-light.png`（选中 start-1 后 inspector 字段行现场，`.nop-designer-field` = 0）
- **目视描述**: 属性面板字段行实际由两套其它渲染器承载：schema inspector body 的 flux form（input-text/textarea/select）+ DefaultInspector 的 名称/描述 fallback 表单（后者即 R2-1b-F4-01 双表单堆叠现场）；找不到任何 designer-field 实例。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w5-flow2.mjs` fieldGap 段（四 tab 逐一 DOM 计数）+ `w5-field.mjs`（选中态复核）
  - 输出: 四 tab `.nop-designer-field` 计数全部为 0；选中节点后仍为 0（inspectorFields=5、formRenderers=6，均非 designer-field）；`grep '"type": "designer-field"' apps/playground/src/schemas/*.json` 零命中（workflow/summary schema 的 inspector 用 `form` 或 `designer-node-card`/`designer-edge-row`）
- **对照基准**: 检查提示词 A5（控件可达性）；`docs/references/new-renderer-introduction-audit.md` INV 契约（新渲染器应有可演示载体）；已知族「lab 载体与环境基建族」「schema 动态响应性缺口」
- **严重程度**: P3（注册渲染器有完整单测覆盖 `designer-page-rendering.test.tsx` L162-258，质量风险低；缺的是 demo 载体消费与走查可达性）
- **用户影响**: 直接用户无感知（无人用到即无坏体验）；间接影响 = schema 作者无法在 playground 发现/验证该控件，走查与回归体系对其失明。
- **修复方向**: 二选一：① 在 workflow-designer-schema 某节点 `inspector.body` 中用 `designer-field` 替换一个 flux form 字段（如 start 节点 名称 字段改 `{ type: 'designer-field', name: 'label', label: '名称' }`）建立官方消费样例；② 在 playground 增加 designer-field fixture 场景（summary demo inspector 追加一个 field 行）。修复后本卡状态矩阵补全复检。
- **归族**: watch-only → 台账（载体缺口族；与「lab 载体与环境基建族」同根因域，R2-3 候选收编时并案）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-25）：四 tab 计数全 0 + schema 0 命中（补测钉钉/Action 两 tab）

## 4. 已知族命中（引用，不另立项）

- 载体与环境基建族：本波唯一「契约面整体不可达」控件；同族先例为各 lab 载体缺口记录（R2-2a/2b summary §4/§5）。
- R2-1b-F4-01（inspector 双表单堆叠）：本卡截图同时是该条目现状的旁证（fallback 名称/描述与 schema form 并存），维持原条目，不重复立项。

## owner-doc drift 登记

- owner-doc drift 登记（review-b D-4，2026-09-25）：designer-field 的 design.md 有文档但**载体页零渲染点**（flow-designer 四 tab schema 0 命中、四 tab 计数全 0，补测钉钉/Action 两 tab 亦无）——文档与载体声明失配：该控件当前在 playground 无任何渲染验证面（登记于此，修复载体或裁文档归后续批）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `designer-field` → carded（card 列填本路径）；A5-152 归族 watch → 台账。
