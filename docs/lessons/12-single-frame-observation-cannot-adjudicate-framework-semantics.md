# 单帧观察不能定性框架语义：in-form tpl 响应式误判 + pushDefaultValue 首帧 gap（2026-09-25，missing-components L1）

## Problem Context

missing-components L1（plan 503）为 slider/rating/input-color 三个新表单原子写 lab 演示页与 e2e。slider lab 在 form 内放了 `{type:'text', text:'Current volume: ${volume}'}` 摘要（switch-lab 先例同款），slider schema 带 `value: 40` 初值。首帧探针发现摘要渲染为空——尽管 scope-debug dump 里 `"volume": 40` 清晰可见，且等待 600ms 后依旧为空。

## Initial Judgment

"Flux 的 text 模板 `${...}` 是编译期求值、非响应式——首帧算完就固化，后续不更新。这是设计语义，不是 bug。"并据此把 e2e 断言全部改成绕开首帧、甚至准备在 lab 页里改用 `name` 绑定文本替代 tpl 写法。

## Why It Looked Plausible

- 现象可复现：首帧确实空、等待后仍空，看起来像"求值一次就固化"；
- `TextRenderer` 源码里 `resolvedText = String(boundValue ?? text ?? '')` 确实没有插值循环，容易误读成"字符串原样渲染"；
- scope-debug dump 显示 `volume: 40`，与模板空渲染矛盾——"数据在但没渲染"恰好符合"编译期求值时数据还不在"的叙事。

## Why It Was Wrong

三层错误叠加：

1. **单帧观察定性时序问题**。只看首帧、不做事前/事后对比。用户质疑后补的对照实验一锤定音：键盘步进（volume 40→41）后 `Current volume: 41` **实时出现**——`node-renderer-resolved.tsx` 的机制本来就是响应式（`propsProgram` 非静态时订阅 scope store，`scopeChangeHitsDependencies` 命中 `propsDependencies` 即重跑 `resolveNodeProps`）。
2. **没跑阳性对照**。既有 switch lab 就是同机制在工作的实例（`${enabled…}` OFF→ON 实测实时更新）。一个交互探针（30 秒）就能证伪"非响应式"，却被跳过了。
3. **把调试视图当运行时数据面**。scope-debug 面板展示的 `volume: 40` 是调试通道从 form state 单独合并的视图，不代表模板求值链路真的从 scope 读到了它、更不代表变更通知到达了订阅者。**debug 可视化 ≠ store 通知语义**。

修正后的准确归因：**pushDefaultValue 首帧通知 gap**——schema 初值经 `useDefaultValuePush`（mount 后 effect → `currentForm.setValue`）写入，该写入没有触发同 subtree 内模板依赖订阅者的重解析（首帧解析时依赖尚未发布 → 求值为空 → 之后无通知追平）；用户交互产生的变更则正常命中。switch lab 不踩坑是因为它无 schema 初值，表达式自身用 else 分支渲染 `undefined`。

## Decisive Evidence

- 响应式机制实证：switch lab 探针 `Feature is: OFF` → 点击 → `Feature is: ON`（`apps/playground/src/component-lab/renderers/switch-lab-page.tsx` 场景）；slider lab 键盘步进后 `Current volume: 41` 实时渲染（2026-09-25 探针记录，plan 503 执行）。
- 机制实现：`packages/flux-react/src/node-renderer-resolved.tsx:101-133`（scope store 订阅 + 依赖命中重解析）、`packages/flux-runtime/src/node-runtime.ts:292`（`resolveNodeProps` 按依赖重算，含 unpublished-scope pending 容错路径）。
- 首帧 gap 实证：slider lab 首帧 + 600ms 等待后模板仍为空，而同一帧 scope dump 已有 `volume: 40`；交互一次即追平渲染。`useDefaultValuePush` 走 `currentForm.setValue`（form store 通知），与触发模板订阅的 scope store 通知不是同一条链。
- 设计文档口径：`docs/architecture/form-external-publication-and-reserved-bindings.md` Quick Contract Table——"direct field-name reads (`${username}`) | form subtree | preferred in-form values read"；owner doc `docs/components/text/design.md` §2 明确不采纳 amis tpl escape hatch、表达式走 source-enabled value 通道。

## Correct Decision Rule

1. **断言"框架不响应/不工作"之前，必须跑阳性对照**：找同一机制已在工作的现存实例做交互前后对比。单帧现象（尤其首帧）只能建立"现象存在"，不能建立"机制定性"。
2. **时序类问题必须做时间轴采样**（before / after-interaction / delayed），首帧异常 ≠ 永久异常。
3. **debug/审计视图不是 store 通知语义的证据**：数据"看得见"和"变更会通知订阅者"是两条独立通道，排查响应式问题要盯 store notify 链路，不要盯展示层。
4. **owner doc 是语义裁决的第一依据**（本案：`form-external-publication-and-reserved-bindings.md` 明确 in-form 直接字段名读取是首选读取方式）；与实测冲突时先怀疑自己的探针姿势，再怀疑实现，最后才允许怀疑文档——且"怀疑文档"必须显式申报而不是当成结论。
5. **衍生书写规则**（本次沉淀给后续表单类 plan）：
   - 模板摘要若依赖 schema 初值（pushDefaultValue），e2e 不要断言首帧值——断言交互后值，或改用 `name` 绑定 text（首帧即可靠）；该 gap 已登记残余债（follow-up 修复方向：默认值推送补一次 scope 依赖通知，或首帧 pending 容错路径覆盖此形态）。
   - jsdom 无布局：base-ui slider 拖动/键盘数学（`--position: NaN%`）与 aria 面不可驱动——交互证明放真浏览器 e2e，jsdom 单测只钉结构面（data-disabled、值回显、component handle 契约）。
   - base-ui 的 value/aria 面挂在 thumb 内部的隐藏 native input（`min`/`max`/`value`/`aria-valuenow`），不在 thumb div 上。
   - RTL 无 globals 时无自动 cleanup：DOM 跨用例泄漏 → stale 树上点击触发旧 spy、"新 spy 零调用"的假失败——ui 测试文件必须显式 `afterEach(cleanup)`。
   - Playwright 链式 locator 是后代语义：`stars.locator('[aria-checked]')` 在 star **内部**找；断言元素自身属性用组合选择器 `star[aria-checked]`。
   - Playwright 对 disabled 元素拒绝点击（actionability）——"disabled 下点击无效"的断言写成 disabled 态断言，不要真点。
   - React 对 `data-*` 布尔属性序列化为字符串 `"true"`，`toHaveAttribute(name, '')` 会红。
   - 渲染器包内文档性字符串（如 propContracts 的 description）含 `#rrggbb` 字样会命中 `hardcoded-literal-color` 扫描器——写 'hex' 等非字面形态。
