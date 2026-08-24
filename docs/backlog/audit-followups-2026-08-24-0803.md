# Audit Follow-ups — 2026-08-24 08:03 audit（ai-widgets-product）

> Last Updated: 2026-08-25
> 用途：登记 2026-08-24 08:03 open-audit（mission `ai-widgets-product`）的 5 条 P2 发现，保证可追溯（每条含来源审计文件路径）。
> 路由规则：该审计的 3 条 P1（P1-1/P1-2/P1-3，同属 ai-bubble markdown math pipeline closure surface）→ remediation plan `docs/plans/2026-08-25-0410-1-ai-bubble-math-delimiter-pipeline-remediation.md`；P2 → 本 backlog。无与本 plan 共享 closure surface 的 P2，故本批零折叠。
> 源审计：`docs/audits/2026-08-24-0803-open-audit-ai-widgets-product.md`（Audit Status 已按规则标记 `planned`）。

## Follow-up Backlog

- **[P2-1] D2 dark 双触发的 media 轨没有 light 强制出口**——standalone host（只 import 包 `styles.css`、未定义 token 集）在 dark-OS + `data-mode='light'` 下拿到 literal dark fallback（如 `--ai-md-fg: hsl(210 40% 98%)`）→ 浅色页面上近不可见文本；token-defined host（playground）上该 media 轨是死代码。Fix direction：media 轨加 `:root:not([data-mode='light'])` 前缀（或等效 guard）。位置：`packages/flux-renderers-ai/src/styles.css:277-301`（typography；同构 :332-344 avatar、:357-365 welcome）。
- **[P2-2] `lowlight` peer dep 未被参考 host 声明**——`flux-renderers-ai` peer `lowlight@^3` 且 `markdown.tsx:7` 直接 import，但 `apps/playground/package.json:46` 只补了 `katex`；当前解析静默依赖 pnpm auto-install-peers / 经 `flux-renderers-content` 传递（后者 lowlight 用法已登记 bug 167、是 removal 候选）——移除后 showcase 代码高亮将以无人声明的原因构建失败。Fix：playground `dependencies` 补 `lowlight@^3`（一行）。
- **[P2-3] `ai-feedback` 的 `voted` 本地镜像不从 `message.metadata.feedback` 播种**——虚拟列表回收 / 分支切换重挂载后视觉态与 D4 持久化 metadata 脱钩（liked 消息重挂载渲染为未 like）。Fix（一行）：`useState(() => (message?.metadata?.feedback as 'like'|'dislike'|null) ?? null)`。位置：`packages/flux-renderers-ai/src/renderers/ai-feedback.tsx:101` vs `:71-76`。
- **[P2-4] `component:setSenderDraft` 无法清空草稿**——空 `text` 一律拒绝，`mode:'replace'` + `''` 也报错（`ai-component-handle.ts:156-158`）；replace 语义下空串是合法"清空"意图，host 无经由 handle 清空输入框的路径。位置：`packages/flux-renderers-ai/src/adapters/ai-component-handle.ts:154-167`。
- **[P2-5] mission 新增 3 处手写 `useMemo` 冗余**（`ai-chat.tsx:257`、`ai-widgets-demo.tsx:198,200`）——按 `docs/skills/react19-best-practices-review.md` 属 Compiler 自动处理项；三处均延续所在文件既有 AI-31 模式且带理由注释、lint 无告警，仅记风格收敛项。

## 备注

- 本批 P2 均与 P1 remediation plan 的 closure surface（markdown math pipeline）不同源，无折叠项。
- 审计"盲区自评"另登记一个非 finding 的下轮切入点：`pickAiWidgetsFixture` 仅英文 keyword，中文提问全部落入 default preset（见源审计末节），后续轮次可展开验证。
