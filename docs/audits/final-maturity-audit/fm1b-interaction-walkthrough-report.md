# FM-1b 交互实操走查报告（plan 648，2026-10-18）

> 口径：`docs/skills/interaction-state-audit-prompt.md`（七类 A–G + V1–V7 + §4 每页五步 + §5 读数模板 + §6 必测序列）+ `docs/skills/complex-component-display-operability-audit-prompt.md`（复杂控件可操作性叠加）；执行模型 = browser-use 串行分域（调度族 → 设计器族 → AI/3D，见 plan 声明节）。
> 执行体：fresh session 交互状态走查员（后台长任务，98 分钟 / 223 tool-uses）；gantt 收口裁决由同执行体携 playwright trusted 探针完成，主会话独立复验（17/17 e2e 复跑 + scheduling 包 1085/1085 单测）。

## 执行摘要

- **11 域页 + 1 路由核验 × 35+ 序列**，真实事件驱动（环境披露：IAB 受信指针不可达——FM-1a 同款先例，evaluate 真实 DOM 事件路径并逐页标注 synthetic；gantt 裁决 trusted 读数全部来自 playwright 探针，Chromium 1280×720 strict-validation webServer）。
- **verdict：gantt 收口完成（修复）/ clean 5 / limited-clean 4 / finding 2 页**；**P0×0、P1×1（当批修复即判别绿）、P2×2（入账待修）、P3 design-debt 候选×3（watch-only）**。
- 增量剖面程序化裁定：路由全集（`route-model.ts` + `domain-route-entries.ts` 572 行 DOMAIN_RENDERER_ROUTES）× `git log --since=2026-09-24` 包变更面 × IS-1..IS-8 台账 178 个 finding ID 去重——全部走查页均为真增量面（清单见 `_tmp/fm1b-walk/00-inventory.md`，报告级汇总在 `_tmp/fm1b-walk-summary.md` 开篇表）。
- roadmap 点名的 **gantt bar drag resize 既有红在本批收口**（裁决①真缺陷修复，非 DV 阈值/上游归因，详见下节）。

## gantt 既有红收口（裁决①，本批核心交付）

**既有红确认**：`gantt-bars-and-links.spec.ts:131 bar drag resize-right changes width` `--retries=0` 确定性 FAIL（width 400 恒定，拖拽会话从未启动；10-17 日志"5/5"系 attempts 口径，实为单测确定性红 + serial 掩蔽）。

**根因链（trusted 探针逐环证实，行级见 `_tmp/fm1b-gantt-adjudication.md`）**：

1. l1 hit-polyline 起于源条右缘中点，10px 描边带覆盖条缘 resize 区——悬停条缘必然先悬停连线 → 删除 X（锚点 = 路径中顶点，恰与源条同一行中线）弹出，20×20 矩形与 resize 区重叠 6×20px；
2. `mouse.down` 落 X 按钮 → bars 委托 `closest('[data-task-id]')=null` → 无拖拽会话 → 既有红；
3. **加重 P1**：同点 press-release → click 落 X → 依赖连线被误删（links 9→8 实测）——B 遮挡 × C 复合产品缺陷；
4. 非根因排除：DV 50Hz 阈值无关（帧间隔无读数依赖）；提交链路逐行核验正常（IAB 对照组实拖 400→440、end +1d）。

**修复（事件层，`gantt-links.tsx` +49/-1）**：document 捕获段 pointerdown/click——压到 X 且 X 下方栈内有 bar 时转发 pointerdown 给 bar（拖拽/提交/撤销原生生效），click 捕获抑制误删；`elementsFromPoint` 只读全栈命中（禁止 pointerEvents 切换——会触发 :hover 重算使 X 在 click 前卸载，实测规避）。render 树与 pristine 字节级同形。**为什么不改 X 锚点几何**：9 变体逐层二分（import/barRects 位置/const vs IIFE/hover-state/attr-IIFE 等，各携 trace-click 读数）证实 playground dev 构建下 react-compiler 对该文件任何 render 形态变更都会令 foreignObject 内 div 的 onClick 派发静默失效（fiber/props 完好、click 冒泡到 document、无报错、handler 不执行）——工具链问题超出本批边界，已披露（证据 `_tmp/pp-block.txt` 转储 + probe 族）。

**判别（先红后绿）**：

| 测试                                                                                      | 修复前                          | 修复后             |
| ----------------------------------------------------------------------------------------- | ------------------------------- | ------------------ |
| `:131` bar drag resize-right changes width（既有红）                                      | FAIL（400 恒定）                | PASS（400→440）    |
| `:160`（新增 e2e 回归钉）press-release at bar resize edge does not delete dependency link | 必红（9→8，探针证实后升格入库） | PASS（links 不变） |
| 同文件其余 15 例（含 delete via button / no-flicker 两个几何方案破坏面）                  | serial 掩蔽未跑                 | PASS               |
| 邻域 `gantt-drag-links-advanced` + `gantt-states`                                         | —                               | 17/17 PASS         |
| RTL `gantt-links-delete.test.tsx`（新；X 保持中点 + click 仍删）                          | —                               | PASS               |

主会话独立复验：`gantt-bars-and-links.spec.ts` **17/17 全绿**（--retries=0 --workers=1，55.9s）+ scheduling 包全量 **1085/1085**。→ **FM-038 fixed→verified**。

## 新 findings

1. **FM-038（P1，B×C 复合，已修）**：gantt resize 边按压被悬停删除 X 吞掉 + press-release 误删依赖连线——见上节。
2. **FM-039（P2，C 类撤销 affordance）**：flow-designer palette 插入不入撤销历史（添加条件节点 6→7 后 undo disabled 恒定；对照：删除节点后撤销可用）——候选根因 designer-command-adapter history 未覆盖 palette insert（未证实至行）。判别测试方向：insert→undo 节点数回落。新坐标 **IS-flow-designer-008**。→ **local → FM-6 候选**。
3. **FM-040（P2，A 类 V2 视口稳定违例）**：taskflow-designer 插入节点视口静默漂移（添加Script 7→8，vp translateY 93.53→111.11，+17.6px；对照 flow-designer 插入 V2 逐字节稳定——跨设计器不一致）。归属 playground taskflow-designer-lib/canvas 插入后 auto-pan（未证实至行）。判别：插入前后 vp transform 逐字节相等。新坐标 **IS-taskflow-designer-008**。→ **local → FM-6 候选**。
4. **FM-041（P3 design-debt 候选 ×3，watch-only）**：① flow-designer 族切换 fit 非确定（同族两次进入 scale 0.382 vs 0.468）；② ai-conversations 新建会话后视图不切换到新会话；③ gantt 删除 X 视觉仍压条缘（FM-038 事件层收口后的观感残留，不产生错误行为）。

## 在案注记（去重，不重复立案）

- scheduling-calendar：drag-create-hint 槽位在场 = IS-3 E 类（框选入口不可发现）增量改善注记；事件点击无 selected 态读数（IS-3 已覆盖事件交互）。
- scada-editor-demo：WorkbenchShell 折叠契约已接线（IS-scada 系 collapsed 半接线现状已改善）；canvas 自绘深序列受限注记。
- taskflow-designer：IS-taskflow-designer-004 tree-host-epoch toast watch 在案（本批未触发，坐标引用）；005 tree-layout dump 持续为零（plan 557 修复持续成立）。
- ai-conversations：IS-ai-conversations-001 P1 fixed 在案未复发。
- three-canvas-demo：IS-three-canvas-demo-001（onReady 半接线）与 IS-5 watch（OrbitControls/滚轮）维持原状。
- kanban 列宽拖拽/键盘、page-designer 拖拽式插入、word-editor 自定义输入管线：IAB 合成路径不驱动三组合——环境受限注记（渲染器单测/集成覆盖在案），非 finding。

## watch-note

- gantt react-compiler dev 变换破坏 GanttLinks render 形态变更下的 foreignObject onClick 派发（9 变体二分实证）——工具链问题，超出渲染器批次边界；若后续需重构该组件 render 树，须先在此文件上复验 click 派发（判别探针族 `_tmp/fm1b-gantt-probe/` 可复用）。

## 未走查去向（字母批 FM-1b-b / 并发线移交）

- **mobile 族 + spreadsheet**（roadmap R1-M1 裁决）：归 FM-1b-b 字母批（Rule 3 预授权）。
- **dashboard-demo**：`#/dashboard-host` 路由不存在（回落 home 核验注记）；实际 id = `dashboard-demo`（IS-5 已审 001..005，其中 16 commits 增量未走）——归 FM-1b-b。
- **xlang-debug**（IS-6 pending）：并发会话领地（同 FM-023/FM-032 口径），移交并发线。
- **three-gallery / scada-gallery**（IS-6 pending）：非本批指派页——归 FM-1b-b 候选。
- report-designer / word-editor / page-designer 深序列（选中上下文/DnD 插入）：limited-clean 注记内声明，归字母批补面。

## n/a 面

- dashboard-host：路由不存在（程序化核验，DOMAIN_RENDERER_ROUTES 无此 id）。

## 附

- 逐页证据：`_tmp/fm1b-walk/`（00-inventory + 11 页 + gantt 存档）；汇总 `_tmp/fm1b-walk-summary.md`。
- gantt 裁决：`_tmp/fm1b-gantt-adjudication.md`；trusted 探针族 `_tmp/fm1b-gantt-probe/`（9 spec，delete-misfire 已升格正式 e2e 回归钉）；react-compiler 转储 `_tmp/pp-block.txt`。
- 收口审计观察（非阻塞，m5）：GanttLinks 事件层监听以 document 为目标、无实例归属限定——单页挂多个 GanttLinks 时按压会被各实例各转发一次（bar 收到重复合成 pointerdown；click 抑制侧幂等无害）；单 gantt 为常态用法，后续重构可加容器包含性判定。
- console 分桶：`[vite] connecting/connected`、React DevTools 提示 = FM-005 外部桶；本批 G 类零新案（taskflow tree-host-epoch toast 为在案 watch，未触发）。
- 本批修复变更集：`packages/flux-renderers-scheduling/src/gantt/gantt-links.tsx`（+49/-1）、`tests/e2e/gantt-bars-and-links.spec.ts`（+30 回归钉）、`packages/flux-renderers-scheduling/src/gantt/gantt-links-delete.test.tsx`（新 RTL）。
