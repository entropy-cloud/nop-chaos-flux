# [card] control:scope-debug

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/scope-debug` ｜ **载体**: lab 页（2 场景：live root scope probe / nested fragment scope probe）
- **矩阵裁剪**: simplified（matrixReason：**例外按 widget 走查**——scope-debug 渲染可见调试面板本体（header + 折叠 Button + JSON pre），元素态照常检查（hover/focus/折叠中间态）；裁掉：glass、disabled（面板无 disabled 面）、~375 档、弹层/拖拽（无））

## 1. 截图清单

| 状态                        | light                                                                          | dark                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 默认 1280×800               | `_tmp/visual-inspection-2026-09-23/lab-scope-debug-default-1280x800-light.png` | `_tmp/visual-inspection-2026-09-23/lab-scope-debug-default-1280x800-dark.png` |
| 默认 800×900                | `_tmp/visual-inspection-2026-09-23/lab-scope-debug-default-800x900-light.png`  | `_tmp/visual-inspection-2026-09-23/lab-scope-debug-default-800x900-dark.png`  |
| 面板展开态（探针采）        | `_tmp/visual-inspection-2026-09-23/r2-2a/scope-debug/panel-expanded-light.png` | `r2-2a/scope-debug/panel-expanded-dark.png`                                   |
| 折叠中间态                  | `r2-2a/scope-debug/panel-collapsed-light.png`                                  | `r2-2a/scope-debug/panel-collapsed-dark.png`                                  |
| toggle hover                | `r2-2a/scope-debug/toggle-hover-light.png`                                     | —（ghost aria-expanded 同值，见 A1-30，dark 不改判）                          |
| Increment 后（live update） | `r2-2a/scope-debug/after-increment-1280-light.png`                             | —                                                                             |
| 全页 800 视口               | `r2-2a/scope-debug/full-800-light.png`                                         | `r2-2a/scope-debug/full-1280-dark.png`                                        |

## 2. A–H 维度勾选表

- A 交互：A1 warn(R2-2a-A1-30)（toggle 展开态 hover 无可感知变化）A2 pass（toggle focus-visible：outline `1px solid rgb(28,110,242)` + ring `oklab(0.5719 -0.036 -0.209/0.5) 0 0 0 3px`）A3 pass-with-note（toggle 42×24.0——xs `h-6` 高度恰踩 24px 零余量，A3 watch 族引用不另立项）A4 n/a A5 n/a A6–A8 n/a A7 n/a A9 pass（Increment → JSON 实时更新，反馈闭环；见 §3）
- B 颜色：B1 pass（light JSON pre/标题 11.42、dark 14.24；toggle 文本 18.12/16.19，对比页面渐变最浅/最深档取最坏值）B2 pass（focus ring ≥3:1）B3 n/a B4 pass-with-note（toggle 色走 ui Button 令牌；面板本体无任何样式可查 → 见 E5-29）B5 pass（dark 无专有缺陷；宿主 `.nop-theme-root` color-scheme 异常为已知引用）B6 n/a
- C 布局：C1 pass-with-note（当前 fixture 无溢出；但 pre `white-space:pre; overflow-x:visible` 无横向包容机制，长值场景结构性风险，归 E5-29 一并修复）C2 pass C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 fail→并入 E5-29（header/ body 间距全为 UA 默认，无体系）D2–D8 n/a
- E 排布：E1 pass-with-note（"调试/标题/折叠"三行堆叠可辨认，但无面板边界语言）E2 warn→watch 族引用（Increment 按钮 918px 全宽，同 reaction 卡 R2-2a-E2-26 watch 实例，本卡第四例，不另立项）E3 pass E4 pass E5 **fail(R2-2a-E5-29)** E6 n/a
- F 一致性：F4 n/a-with-note（「调试/折叠/展开以查看作用域」中文文案 vs lab 英文语境——i18n 默认语言行为，归 R2-1d-F4-01 i18n 族引用不另立项）F1–F3/F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 行为取证（schema 响应性族 #7 正向核对）

- 探针 `_tmp/r2-2a-probes/w2r-scope-debug.mjs`：
  - **live update**：点击 Increment count → JSON `{"count":0,…}` → `{"count":1,…}`（changed=true；订阅随展开态启停 correctly）
  - **折叠中间态**：点击折叠 → aria-expanded=false、pre 换为提示文案「展开以查看作用域。」、section 高 170→98；再展开 → JSON 恢复（订阅恢复）✓
  - **样式面**：`.nop-scope-debug` computed `bg rgba(0,0,0,0)`、`border 0px`、`padding 0px`；header `display:block`（kind/标题/toggle 三行堆叠）；pre `margin:0`、`overflow-x:visible`
  - 全仓 grep：`nop-scope-debug`/`scope-debug` 在任何 `.css` 零命中——**组件声明了 data-slot 结构但样式表不存在**

## 4. 发现条目

### [R2-2a-E5-29] scope-debug 面板零样式：无容器视觉、header 堆叠、JSON 无溢出包容

- **页面/路由**: `#/lab/scope-debug`（2 场景；另在每个 lab 页自动附加的同款面板可见——`attachScopeDebugToSchema`，波及全部 124 条 lab 载体）
- **主题/视口/状态**: light+dark / 1280×800 / 默认展开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/scope-debug/panel-expanded-light.png`（面板与页面文本混排无边界）
- **目视描述**: 「调试 / Local Page Scope / 折叠 / JSON」以默认排版直接叠在页面内容流里，无背景、无边框、无内边距、无面板边界；与上一行普通文本只有一空行之隔，扫读时无法判断哪些内容属于面板。
- **程序化证据**:
  - 探针: `w2r-scope-debug.mjs` 读 computed styles + 全仓 css grep
  - 输出: section `bg=rgba(0,0,0,0)`, `border=0px solid`, `padding=0px`; header `display=block`（未成行）；pre `overflow-x=visible`（`white-space:pre` 长值将溢出面板）。样式表命中数 = 0（组件仅声明 `nop-scope-debug` 类与 data-slot，见 `packages/flux-renderers-basic/src/scope-debug.tsx:103-127`）。
- **对照基准**: styling-system.md「widget renderer 自带完整视觉」；data-slot/shadcn 契约（声明 slot 即应有对应样式或删除声明）。
- **严重程度**: P2（每个使用点受影响且面板是渲染给开发者看的真实 UI；不阻塞任务故不升 P1）
- **用户影响**: 开发者在 schema 树中插入 scope-debug 排查作用域时，面板输出与页面内容混排难以圈定；长 scope 值（长字符串）会横向溢出面板污染版面。
- **修复方向**: 为 `nop-scope-debug` 补一小块样式（消费 `--nop-debug-card-*` 族已有令牌或新增）：容器 `rounded-md border bg-[--nop-surface] px-3 py-2`、header 改 `flex items-center gap-2`、pre `overflow-x:auto text-xs`。注意 debug 卡族令牌同为渐变值（styles.css `--nop-debug-card-bg`），勿重蹈 B4-28 IACVT。
- **归族**: local → R2-4 批（控制件自身样式补齐）+ 本卡实例
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）。design.md「自包含面板」已按 live 行为回写（2026-09-24）

### [R2-2a-A1-30] 折叠 toggle 在 aria-expanded=true 时 hover 无反馈（ghost variant 的 aria-expanded 态与 hover 态样式完全同值）

- **页面/路由**: `#/lab/scope-debug` 场景 1 面板 toggle（defaultExpand:true 常驻展开态）
- **主题/视口/状态**: light / 1280×800 / hover
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/scope-debug/toggle-hover-light.png`
- **目视描述**: 指针悬停「折叠」chip，背景与文字颜色均无变化，chip 无任何悬停可供性。
- **程序化证据**:
  - 探针: `w2r-text.mjs` hover 前后读 computed color/backgroundColor
  - 输出: before `{color: rgb(2,8,23), bg: rgb(241,245,249)}` = after（完全同值）。根因：`packages/ui/src/components/ui/button.tsx:28` ghost variant `hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground…`——aria-expanded=true 时 rest 样式与 hover 样式逐 token 相同，hover 无法感知。
- **对照基准**: 检查提示词 A1（hover 态存在且可感知）；NN/g 可供性。
- **严重程度**: P3
- **用户影响**: 展开态下折叠钮"看起来不可点"；面板是低频调试面，不阻塞任务。波及所有**常驻 aria-expanded=true 的 ghost Button**（常开折叠面板、展开态触发器），非本控件独有。
- **修复方向**: ui Button ghost variant 区分两态权重，如 `aria-expanded:bg-muted hover:bg-muted/80`（或 hover 改 `hover:bg-accent`），使 aria-expanded 态下 hover 仍有 Δ 值。
- **归族**: watch-only → 台账（ui Button ghost × aria-expanded 模式面；待 ui 批统一评估，命中≥2 控件时升 systemic）
- **复核状态**: 未复核

## 5. 疑点（不计发现）

- Increment 按钮 918×32 全宽拉伸：reaction 卡 R2-2a-E2-26 已立案（watch 族），本页为同族第四实例，引用不重复立项。
- 折叠态语义 = 内容换为提示文案（`enabled:false` → fallback `flux.scopeDebug.expandHint`），折叠不减少 DOM 占位（body 常渲染）——设计可接受，但折叠后高度仅 170→98，若预期"折叠=收起面板"需改条件渲染。
- 面板 i18n 文案（调试/折叠）走 `t()` 默认语言，归 i18n 族引用（R2-1d-F4-01）。
- 宿主已知引用：`.nop-theme-root` color-scheme、调试 chip z9998 不另立项。

## 6. 台账回写

- 主 session 统一翻转 `lab-scope-debug` → carded。
