# R2 审查共享提示词前缀（主 agent 派发用，沿 skill 附录 C）

> 本文件是 `docs/skills/ux-design-pattern-audit-prompt.md` 共享前缀 + 第 1 轮正文（12 视角）的派发载体。每轮/每次复核派发时，子 agent 必须先完整读取本文件。范围扩展声明见 `R2-consistency-audit.md` 口径声明节（14 renderer 包 + 62 ui 模块 + 19 页，覆盖口径以 roadmap R2 为准）。

你正在审查 nop-chaos-flux 项目的 UI/UX 设计合规性（R2 全量一致性审查）。这是**只读审查任务**：不得修改任何代码/CSS/schema/renderer；你唯一允许写的文件是派发指令指定的发现落盘文件。工作目录 = 仓库根（pnpm workspace monorepo，React 19 + Zustand + TypeScript 低代码渲染引擎）。

## 执行前必读（按序完整读取）

1. `AGENTS.md`
2. `docs/architecture/styling-system.md`
3. `docs/architecture/renderer-markers-and-selectors.md`
4. `docs/architecture/theme-compatibility.md`
5. `packages/ui/src/index.ts`（可用 UI 组件清单）
6. `docs/analysis/ui-review/r2-audit/dedup-baseline.md`（去重基线，强制遵守）

## 去重与边界（强制）

- dedup-baseline.md §1：ma5-ux 6 条已知发现**全部已修复**，不得报告；但"同类根因的新实例"（如其他组件新出现的 i18n 硬编码 / focus ring 缺失）算**新发现**，要报。
- §2 已登记缺口 16 项（G-A~G-M/G3-余）是**能力缺失**不是一致性缺陷，不得作为发现报告；撞见其表象只在返回消息的"转 C2 候选"段列出，不计入发现。
- §3 误报对照 8 条一律不报：`opacity-0` native select trigger、`ml-auto` 对齐、ghost 无边框按钮、icon-xs/icon-sm 小图标按钮、溢出截断（无 Tooltip 且信息丢失才报）、`div`+`role="button"`+`tabIndex={0}`、验证错误的 destructive 按钮、`transition-all`。
- §4 边界排除：deep-audit 维度 09（RendererComponentProps 契约）/ 10（marker 带视觉样式、BEM 残留）/ 11（原生 HTML 替代 @nop-chaos/ui）/ 12（field metadata / value-or-region 建模）不在范围；维度 20 全量 WCAG 不在范围——视角 9 仅查 ARIA 语义/role 的 UX 可见部分。发现同时涉及 UX 与 WCAG 时按主要影响归属；两可时在条目标题加 `[scope-conflict]` 标记。

## 审查标准

- 以**用户可见的视觉和交互质量**为准，不是代码架构合规性。
- 以行业常见设计模式为参照（Ant Design、shadcn/ui、MUI、AG Grid 等）。
- 行业惯例冲突优先级：**shadcn/ui > Ant Design > MUI**；三者均不同时选本项目一致性最高的做法并注明；本项目内部不同组件做法不一的，无论是否符合行业惯例一律报"跨组件不一致"。
- 同一语义操作在不同组件中的视觉表现应一致；交互状态（hover、focus、active、disabled、loading、empty）应有恰当视觉指示。
- 不要求"最完美"设计，但要求没有明显违背行业惯例的问题。

通用口径：

1. 以当前代码为准，不与历史版本对比。
2. 不重复报告架构契约问题（维度 09-12）。
3. 不把"不够美观"当问题，必须有明确用户交互障碍、产品完成度缺口、或行业惯例偏离。
4. 每个发现必须可定位：文件路径 + 行号范围 + 3-10 行证据片段。
5. 区分"功能缺陷"与"设计不佳"：功能缺陷优先级更高。
6. 只报"发现"（违背行业惯例 / 交互模式缺陷 / 产品完成度类），不报"建议"（可暂缓项由汇总阶段处理）。
7. **真实用户影响检验**：每个发现回答"非设计师用户不被告知的情况下，是否会在正常使用时注意到这个问题？"答案否定 → 降级或弃报。
8. **AI-safe 输出检验**：整体呈"默认卡片/默认按钮/默认间距安全堆叠"导致用户难识别主路径/主操作/信息层级，可作为发现报告，但必须指出具体表现，不能只写"像 AI 生成"。

## 严重程度判级

- **HIGH**: 用户交互障碍或功能缺陷。无法完成操作、数据丢失风险、不可逆破坏性后果、破坏性操作无确认、耗时>2s 操作无 loading 指示。
- **MEDIUM**: 明显不一致、缺失视觉反馈、可改进交互模式。同语义不同图标、缺 hover/focus 态、空状态无提示。
- **LOW**: 视觉细节优化、边缘场景微调。2px 间距偏差、次要色阶不一致、非关键路径图标可选歧义。
- 升级：MEDIUM 出现在高频交互路径（如 CRUD 列表删除）→ HIGH。降级：HIGH 仅在极低频路径 → MEDIUM。

## 检查视角（12 个，逐一覆盖；skill 正文"10 个视角"为笔误，以 12 为准）

### 视角 1：图标语义正确性

lucide-react 图标语义匹配：删除=Trash2Icon/XIcon（非文本字符 ×）；新增=PlusIcon；筛选=ListFilterIcon/FilterIcon（非 ChevronDownIcon）；展开/折叠方向一致（ChevronDown/ChevronRight 或 ChevronUp/ChevronDown）；排序三态区分（ArrowUp/ArrowDown/ArrowUpDown）；同一语义操作跨组件图标不同。

### 视角 2：按钮样式一致性

Button 按语义操作分组（删除/新增/编辑/确认/取消）；同组 variant、size、颜色是否统一；交互模式是否统一（hover 变红 vs 始终红）。

### 视角 3：状态指示完整性

可交互元素各状态视觉表现：默认/hover/focus-visible（必须有可见 ring）/active/disabled/loading/selected。特别：`tabIndex={0}` 非 button 元素是否有 focus ring；当前排序/选中/过滤状态有明确指示；indeterminate 状态是否处理。

### 视角 4：表单交互模式

checkbox/radio/switch 标签可点击（Label+htmlFor）；select placeholder 与清空机制；number input stepper/suffix 重叠；验证错误展示统一；表格全选 indeterminate；行选择 radio 语义；搜索/筛选输入清除按钮；无结果提示非空白；筛选器按钮与输入框对齐。

### 视角 5：Loading 和空状态

loading 渲染逻辑是否有 Spinner 组件（非纯文本）；空数据渲染是否有有意义提示（非空白/空串）；虚拟化与非虚拟化组件空状态处理一致性。

### 视角 6：对话框和弹出层

Dialog/Sheet/Drawer/Popover/DropdownMenu：关闭按钮可见（showCloseButton 不应 false 除非充分理由）；trigger 文案准确描述行为；非标准用途的不可见原生控件（标准 opacity-0 native select 模式不报）；确认/取消按钮顺序与样式统一；焦点陷阱（Tab 不逃逸）；Escape 关闭；关闭后焦点回 trigger；嵌套可滚动区双滚动条；粘性头部。

### 视角 7：颜色和设计令牌

硬编码 Tailwind 颜色类（orange-300、blue-500 等）是否应改为设计令牌（语义状态色 warning/success/danger 应令牌化；品牌/强调色可有意硬编码）；颜色语义正确性（红=破坏性、绿=成功、蓝=主要/信息）。

### 视角 8：间距和对齐

操作按钮 absolute 浮动 vs flex+ml-auto 对齐；删除/关闭按钮垂直居中；操作栏靠右；列表项 gap 一致；分组标题与内容间距；操作栏内边距；触摸友好性（icon-only <32px？密集点击元素间距不足？）。

### 视角 9：ARIA 语义和角色（仅 UX 可见部分，全量 WCAG 归维度 20）

图表 role="img"（非 role="button"）；列表项 role="listitem"；自定义控件 role 正确；icon-only 按钮必须有 aria-label；无可见标签的表单控件必须有 aria-label；fallback 文案有意义（非字面 "Button"）。

### 视角 10：跨组件交互一致性

对比维度（给基线与偏差记录）：分页 UI 一致；排序三态图标一致；筛选模式（图标/面板/清除）一致；删除确认流程（行级=ghost+Trash2Icon+可选确认；批量=destructive+确认）；Loading=Spinner 组件；空状态=有意义提示；新增=ghost+PlusIcon。

### 视角 11：产品完成度与主路径清晰度

每个主要 surface 首次用户能否快速回答：这里是做什么的？第一主操作是什么？当前状态（空/加载/可编辑/只读）？检查"看起来完整实际发虚"：默认组件堆叠无主次层级、主操作与次操作视觉权重相同、空态/首态只有组件壳无任务引导、功能入口与后续关键动作缺流程连接。"用户不知道下一步做什么"即使控件都能点也应报告。

### 视角 12：视觉原创性与反模板化

"默认组件库安全输出"：白底卡片堆叠+通用标题+通用按钮无视觉重心；所有区域层级/密度/留白完全平均致主次不分；不同语义区块无视觉语言区分只是机械排版。仅在直接损害用户理解/信息层级/产品辨识度时报告；必须给可定位证据（如主次操作无层级差、关键入口被埋没）。

## 效率提示

视角 1/7/9 适合 grep 正则先行（图标名、颜色类、aria/role 模式）再定位确认；视角 2/3/4/6/8/10 需逐文件通读；不要在无需 grep 的视角上逐行扫描全部代码。`*.test.*` 文件不在审查范围。

## 发现条目格式（附录 A，强制；每条 ≥8 行，不得压缩/省略/简化）

````markdown
### [G{组号}-视角{X}-{序号:02d}] 简短标题

- **文件**: `路径:行号范围`
- **证据片段**:
  ```tsx
  // 3-10 行与结论直接相关的原文代码
  ```
````

- **严重程度**: HIGH / MEDIUM / LOW
- **现状**: 当前实现是什么
- **行业惯例**: 行业标准做法（引用具体系统：shadcn/ui / Ant Design / MUI / AG Grid）
- **用户影响**: 用户看到什么、遇到什么困难（通过真实用户影响检验）
- **建议**: 具体修复方向（图标名/variant/CSS 令牌/className 级别，不得只写"应改进"）
- **复核状态**: 未复核

```

质量门槛（不满足任一条即为不合格，不得输出该条）：①证据片段确实支持结论（非推断）；②行业惯例引用具体系统；③通过真实用户影响检验；④建议给出代码级修复方向。

## 零发现报告格式（该组确无发现时）

必须包含：本轮检查范围（读取文件列表/检查组件清单/对照的发现类别）+ 本轮检查方法（每个文件检查了什么视角、特别关注什么场景）+ 结论。仅"未发现新问题"五字不被接受。
```
