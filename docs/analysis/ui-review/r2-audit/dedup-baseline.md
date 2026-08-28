# R2 去重基线清单（Phase 1 落盘）

> 落盘日期: 2026-08-28 · worktree `nop-chaos-flux-ui-review`（分支 `ui-review`，基点 master `01770f770` 经 merge `6a920a58f`）
> 用途: R2 全轮次审查的前置去重依据。**禁止把下列"已知发现（已修复）"重复报告；"已登记缺口"不得当作 R2 新发现（capability gap ≠ 一致性缺陷，见 plan Non-Goals）；"误报对照"条目一律不报。**

## 1. 已知发现（ma5-ux 6 条，`docs/analysis/2026-07-27-ma5-ux/`）× live 复核状态

2026-08-28 逐条对 live code 复核（本 worktree HEAD `0f183874a`）：

| ma5-ux 编号 | 内容                                                                           | live 复核结论（2026-08-28）                                                                                                     | R2 处置  |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [视角1-01]  | array-editor/key-value Add 按钮缺 PlusIcon                                     | **已修复**：`array-editor.tsx:594`、`key-value.tsx:622` 均有 `<PlusIcon className="size-4" />`                                  | 不再报告 |
| [视角9-01]  | icon-picker 4 处硬编码中文未走 i18n                                            | **已修复**：现用 `t('flux.form.searchIcon')` / `t('flux.common.search')` / `t('flux.common.noResults')` 等                      | 不再报告 |
| [视角3-01]  | icon-picker 图标网格按钮缺 focus-visible ring                                  | **已修复**：图标按钮改用 ui `Button variant="ghost"`（`button.tsx:7` 基类含 `focus-visible:ring-3 focus-visible:ring-ring/50`） | 不再报告 |
| [视角9-02]  | 7 个 content 组件硬编码英文 fallback                                           | **已修复**：`audio.tsx:48`、`video.tsx:58` 用 `t('flux.common.loadFailed')` / `t('flux.common.noSource')` 等                    | 不再报告 |
| [视角3-02]  | icon-picker `aria-haspopup="listbox"` 与 PopoverContent `role="dialog"` 不匹配 | **已修复**：图标网格容器现显式 `role="listbox"`（icon-picker.tsx:207）+ 子项 `role="option"`，语义链一致                        | 不再报告 |
| [视角3-03]  | carousel 指示点按钮缺 focus-visible ring                                       | **已修复**：指示点改用 ui `Button variant="ghost"`（carousel.tsx:304），基类含 focus-visible ring                               | 不再报告 |

**结论：ma5-ux 6 条全部已修复，R2 无"未修复项按现状重评"的存量；R2 发现清单与 ma5-ux 零交集，但仍须防"同类根因的新实例"（如其他组件出现新的 i18n 硬编码 / focus ring 缺失——这些算新发现，不算重复）。**

## 2. 已登记缺口（不得作为 R2 一致性发现报告）

来源：C2 初版裁决表（`docs/analysis/ui-review/C2-capability-gaps.md` §1）、R1 §4 差距清单、sundial G3/G5 登记。这些是**能力缺失**（capability gap），不是"违背行业惯例的视觉/交互缺陷"；R2 审查中若撞见其表象，只归入 owner doc"转 C2 候选"段，不计入发现。

| ID        | 缺口                                                   | 级别       | 备注                                                                                        |
| --------- | ------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------- |
| G-A       | 页面模板层（PageHeader/QueryFilter/result 预设）       | L2         | 待 P2 回写                                                                                  |
| G-B1      | ⌘K 命令面板原语                                        | L3         | ui `command` 模块有底座、无 renderer type                                                   |
| G-B2      | 键盘导航框架（chord/peek/多选/键盘重排）               | L4         | 待 P4 回写                                                                                  |
| G-B3      | 批量操作栏语义（选择集绑定 + 批量动作）                | L2~L3      | 待 P6/P7 回写                                                                               |
| G-C       | 多视图数据库（视图切换状态机 + filter 面板联动）       | L2         | 待 P5 回写                                                                                  |
| G-D       | 网格编辑深度（单元格编辑器矩阵/列菜单/分组/行高）      | L2         | 待 P6 回写                                                                                  |
| G-E       | 高密度排版（密度档位/等宽计数/语义色状态/chip 筛选条） | L1 为主    | 待 P7 回写                                                                                  |
| G-F (=G5) | hover/选中态 schema 表达（option-row 原语候选）        | L3         | 已裁决，D1 候选首项                                                                         |
| G-F2      | className 表达式绑定                                   | L3         | D1 候选                                                                                     |
| G-H       | 移动端主组件族 vs Vant 80+                             | L2         | 挂起（P 系列外；R2 不重开）                                                                 |
| G-I       | 暗色回归 + 运行时主题切换                              | L1 + 小 L4 | **R2 顺带**：dark token 对齐度抽查由 R2 承接（仅 token 对齐 + 复杂页暗色抽查，非全量 WCAG） |
| G-J       | resizable 面板 schema 化                               | L3         | 构想库存                                                                                    |
| G-K       | 流程图节点数据驱动着色                                 | L2         | 构想库存                                                                                    |
| G3-余     | input-date 行触发形态                                  | L2         | 挂起（优化）                                                                                |
| G-L       | dialog 影子写限制（plan460 B8 #2）                     | L4 观察项  | 观察中                                                                                      |
| G-M       | hook 时刻裸 scope 变量求值不可靠（B8 #3）              | L4 观察项  | 观察中（deep-audit 候选）                                                                   |

另：R0 §3 遗留"4 调色板 dark 逐变量对齐度留 R2 抽查"——R2 承接为抽查产出（Phase 5 ⑤），不属于发现清单成员。

## 3. 误报对照表（skill 附录"已知常见误报模式"，一律不报）

以下模式在既往审查中被误报，实际为正确设计：

1. `opacity-0` 的 native `<select>` 用作日期选择器/自定义选择框 trigger —— shadcn/ui 标准模式（保持表单语义与键盘导航）。
2. `ml-auto` 对齐 —— Tailwind flex 标准右对齐方式，不是问题。
3. 按钮用 `variant="ghost"` 无边框 —— shadcn 规范，适用行级/次要操作。
4. Icon-only 按钮用 `size="icon-xs"/"icon-sm"`（<36px）—— shadcn 规范尺寸（icon-xs 24px / icon-sm 32px / icon-md 36px），数据密集表格行的行业惯例。
5. 内容溢出用 `text-ellipsis overflow-hidden` 截断 —— 表格列/标签固定空间的标准做法（仅当截断致信息丢失且无 Tooltip 时才报）。
6. `div` + `role="button"` + `tabIndex={0}` —— 自定义组件可接受的 ARIA 模式，不仅因此报告。
7. 表单验证错误用 `variant="destructive"` 按钮 —— 颜色语义合理场景。
8. `transition-all` 而非逐属性声明 —— 当前性能预算内可接受（仅 layout 动画性能问题时报）。

## 4. 边界排除（skill 边界表，撞见即标 `[scope-conflict]` 或跳过）

- deep-audit 维度 09（RendererComponentProps 契约）/ 10（marker class 带视觉样式、BEM 残留）/ 11（原生 HTML 替代 @nop-chaos/ui）/ 12（field metadata / value-or-region 建模）不在本审查范围。
- 维度 20（全量 WCAG 合规）不在范围；视角 9 仅查 ARIA 语义/role 的 UX 可见部分。
- UX 与 WCAG 边界判定按 skill 边界示例表；两可时标 `[scope-conflict]` 由主 agent 按主要影响归属。
