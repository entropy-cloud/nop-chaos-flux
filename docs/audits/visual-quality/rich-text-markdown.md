# 视觉质量证据卡：富文本/Markdown 编辑器（V10）

> 状态: in-execution（plan 480 Phase 1–4 已落地，closure audit 待独立执行）
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §6（已经三轮独立核实）
> Owner plan: `docs/plans/480-visual-quality-v10-rich-text-markdown-plan.md`
> Owner docs: `docs/components/editor/design.md`、`docs/components/markdown-editor/design.md`、`docs/components/flux-renderers-ai/design.md`（§10.6）

## Findings 清单

- [V10-F1] Tiptap 扩展贫乏：富文本仅 StarterKit+Link（`editor-renderer.tsx:31-49`）——取哪个子集须在研究报告显式裁决（含否决理由）
  - 证据: 普查 §6
  - 勘误（plan 480 核实）: 原「无 Underline」表述不成立——StarterKit v3.27.1 内建 Underline（含 Mod-u 键位），缺的只是工具栏入口；且 Link 当时已显式 configure
  - 裁决: 子集落地——Underline（StarterKit 内建 + 工具栏键）、Image（URL prompt + `isSafeImageUrl` src 守卫；上传通道否决）、Highlight（一键）、Placeholder（两面装配，R3/R4 死面修复）落地；Table/TextAlign 否决（§2 报告裁决：UI 面成本不成比例 / inline style 落盘与 token 驱动 styling contract 冲突），见 Deferred But Adjudicated
  - 状态: fixed（plan 480 Phase 1/3）
- [V10-F2] B/I/S 按钮为文本字母（`editor-renderer.tsx:235-238`），未图标化
  - 证据: 普查 §6
  - 勘误（plan 480 核实）: 已失实——12/12 图标覆盖在 plan-0718（f053fdf68）落地；plan 480 只剩 R7 死 fallback label（`'B'/'I'/'S'/'""'/'🔗'`，图标全覆盖下永不渲染）清理，label 域随之移除
  - 裁决: fixed（plan 480 Phase 2 R7；图标化本身归 plan-0718）
  - 状态: fixed
- [V10-F3] markdown 编辑器为固定 `rows=8` 纯 Textarea（`markdown-editor-renderer.tsx:269`），无 autoGrow、无编辑/预览滚动同步
  - 证据: 普查 §6
  - 裁决: autoGrow 落地（渲染器内 JS 自适应，`rows=8` 保持初始/最小高度，480px 夹紧 + 内部滚动；`field-sizing-content` 因 Safari 支持缺口不取）；滚动同步 adjudicated-deferred（收益面仅桌面分屏、仓库内零需求证据，见 plan 480 Deferred But Adjudicated）
  - 状态: fixed（autoGrow，plan 480 Phase 4）+ adjudicated-deferred（滚动同步）
- [V10-F4] 三处 Tiptap 消费（form editor / ai tiptap-sender / markdown）工具条一致性待核对
  - 证据: 路线图 V10 行
  - 勘误（plan 480 核实）: 「三处 Tiptap」措辞不准——实际三处富文本编辑面、仅两处 Tiptap；markdown-editor 是 Textarea + 运行时 registry 组合预览，非 Tiptap
  - 裁决: 三面工具条一致性收敛（plan 480 Phase 2 A5/R5）——统一 `ghost` + `h-7 min-w-7 px-1.5` + 图标 `size-4`（文本键保留 `text-xs`）；三面均无 `role="toolbar"` 组合角色（沿 20-07 Decision）；规格一致性守卫测试（`toolbar-spec-consistency.test.ts`）+ e2e 计算样式断言双保险
  - 状态: fixed
- [V10-F5] e2e 视觉断言缺失：`w3d-editor.spec.ts`、`w3d-markdown-editor.spec.ts` 均 0 计算样式/0 截图
  - 证据: V0 研究报告 §2
  - 裁决: 三 spec 补计算样式断言（plan 480 Phase 4 A7）——工具条几何/激活态 token、两面占位符可见性（装饰 + ::before computed content/color）、autoGrow 几何（基线/单调增/480px 夹紧 + 内部滚动）、light↔dark 翻转；`ai-rich-text-sender.spec.ts` 同步补齐；判据全程序化（`visual-assert.ts` helpers）
  - 状态: fixed

## 视觉证据

待回填（经 OSS 链接引用，不入库二进制截图，遵守 `tests/e2e/artifacts/` 治理规则）：图标化工具条（L1）、autoGrow 几何（L2，e2e 断言已落 `w3d-markdown-editor.spec.ts` autoGrow test）、工具条一致性（L3，e2e 断言已落三 spec）。

## Closure

V10 closure audit 首轮 `issues`（2026-09-21，独立 fresh session）→ **修复后闭环**：唯一 Major（form-advanced styles.css 漏挂 flux-bundle style.css @import——执行期核对结论失实）已修复（bundle 链补挂 + 重建，dist 含占位符/排版规则，`check:flux-bundle-pack` 绿）；MINOR-1 pin 偏差已入 plan 注。其余 exit criteria 全 CONFIRMED（form-advanced 1103/1103、ai 810/810 审计独立复跑）。roadmap V10 行 `done` 成立，owner plan 480 → `completed`。
