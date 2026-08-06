# Unit-Green But Real-Browser Broken（单测绿但真实浏览器失败）— bug 73 模式

## Problem Context

component-audit 轮（2026-08-02 起，逐组件 18 维审计）反复出现一类缺陷：**组件单测全绿（jsdom 环境），但真实浏览器中行为错误、渲染失效或功能不可达**。首个样板是 bug 73（dialog 表单真实浏览器输入不更新 store）；随后在容器、表格、滑动、懒加载树等组件上以同一模式复现（container P1-1、text P1-1、table P1-7、swipe-cell P1-3、input-tree/tree-select P1-3、wizard/gantt/kanban/calendar dialog 宿主场景等，卡内引用 `bug 73` ×7）。

## Initial Judgment

"单测覆盖充分 = 组件正确"——审计早期以单测 + 静态检查为主判断组件健康度，真实浏览器验证被当作可选附加项。

## Why It Looked Plausible

- jsdom 与 vitest 环境下 DOM API、布局计算、CSS 加载均"可用"，断言链全部通过；
- 组件逻辑（state 流转、事件派发、值写回）在 jsdom 中行为正确，错误往往在**渲染副作用/布局/环境 API**层，单测断言够不到；
- 既有审计基线（audit-remediation 轮）以"包簇 x 维度矩阵 + 工具扫描"为主，无真实浏览器逐组件验证先例。

## Why It Was Wrong

jsdom 不执行真实布局、不加载项目 CSS、不具备真实浏览器 API 语义（如 `getComputedStyle`、rAF、pointer 事件、StrictMode 双挂载的完整副作用）。典型失败面：

- **CSS 静态扫描盲区**：`text.tsx:31` 动态拼接 `line-clamp-${clamped}`、container 语义布局 props 仅输出 data 属性（default-spacing.css 强制覆盖）——Tailwind v4 静态扫描看不到动态类名，build 后类不存在；
- **环境 API 差异**：dialog 内表单输入在真实浏览器不更新 store（bug 73）、swipe-cell 操作区 `translateX(-100%)/+100%` 恒不可见（NEW-C7-02，bug 87）；
- **StrictMode 双挂载副作用**：懒加载树 mountedRef cleanup 后无复位（bug 77）、日历/甘特在 openDialog 内数据不加载；
- **scope 运行时差异**：quickSave args 段式求值第一段 `$slot` 根回退拿到旧值（table P1-7，bug 78）。

## Decisive Evidence

- `docs/bugs/73-*.md` 及后续 bug 77/78/85/86/87/88/89：每个都是"单测先绿、真机后红"，修复均在真实浏览器宿主场景中先复现后解决；
- 各 C 阶段执行记录：凡补了真实浏览器宿主场景的族，都能翻出 ≥1 个单测未覆盖的真缺陷（C6.1 5/5、C7 6/6、C8.2 7/7、C9 4/4 等宿主全绿后才敢 close 卡）；
- 修复均为宿主场景 `host-*` 专项 spec（`tests/e2e/component-lab/*-host-surfaces.spec.ts`）programmatic DOM 断言驱动。

## Correct Decision Rule

**组件审计卡 close 的前提是真实浏览器宿主场景 pass**（维度 12 每卡必检，v2 固化）。单测绿只证明逻辑正确性的一半；渲染/布局/环境 API/StrictMode 面必须由真实浏览器 programmatic 断言兜底。

## Preventive Checklist

- 每张审计卡必须有 ≥1 个真实浏览器宿主场景（dialog 内 / form 内 / CRUD 行内 / 无 scope 上下文任选），断言用 `page.evaluate` / `locator.innerHTML` / `getComputedStyle` 等 programmatic 手段，**禁用截图诊断**；
- 动态度名/条件类（`line-clamp-${n}`、`grid-cols-${n}`）必须核验 Tailwind v4 静态扫描可见性，或改 inline style / 显式 token 映射；
- 涉及 fetch/加载/定时器的组件必须验证 StrictMode 双挂载路径（mountedRef 复位、abort、竞态）；
- 涉及 dialog/drawer/surface 的组件必须验证真实弹层内交互（焦点、提交、事件 ctx）；
- 新组件或行为变更走 e2e 时，先写"错误行为"断言复现（先红），再修复（后绿）。

## Related Files / Docs

- `docs/bugs/73-dialog-form-real-browser-input-not-updating-store-fix.md`（及 77/78/85/86/87/88/89）
- 各 C 阶段 plan Phase 3 宿主场景节 + `tests/e2e/component-lab/*-host-surfaces.spec.ts`
- `docs/audits/component-audit-checklist.md` v2 维度 12
