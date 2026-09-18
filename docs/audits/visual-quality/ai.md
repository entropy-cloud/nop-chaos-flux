# 视觉质量证据卡：AI 会话组件（V2）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §1（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/components/flux-renderers-ai/design.md`、`docs/components/flux-renderers-ai/renderers.md`

## Findings 清单

- [V2-F1] 流式渲染失效（bug 166，open）：`ai-chat.tsx:501` context useMemo 以 messages 数组引用为 dep，流式期间引用不变 → 消费端 bail-out，内容流结束时一次性出现；打字光标（`styles.css:5-22` ▍ blink）全程不可见
  - 证据: 普查 §1.1；bug 166 open
  - 裁决: pending
  - 状态: open
- [V2-F2] 气泡视觉层缺失：`ai-bubble/index.tsx:135-136` 输出 `data-shape`/`data-placement`，包内 `styles.css` 与 playground styles.css 均无任何 `[data-placement]`/`[data-shape]` 规则——气泡无底色/圆角/阴影，用户消息不右对齐（仅 `styles.css:312` 有 `:has(avatar)` 行布局）
  - 证据: 普查 §1.2
  - 裁决: pending
  - 状态: open
- [V2-F3] AI e2e 零视觉断言：19 个 `ai-*.spec` 基本只断言 DOM/行为/data 属性（V0 实测：计算样式仅 2 文件 6 处调用——ai-coverage-widgets 1、ai-widgets-demo 5；0 截图、0 像素探测）
  - 证据: 普查 §1.3 + V0 研究报告 §2 实测修正
  - 裁决: pending
  - 状态: open
- [V2-F4] 交互细节缺失：`scrollToBottom`（`use-auto-scroll.ts:42`）无消费者（无"滚动到底部"悬浮按钮）；气泡级复制/重试操作条未默认挂载（`index.tsx:192` 仅 UserMessageActions）；无图片 lightbox（`image.tsx`）；无时间分组/日期分隔；无消息进入动画（对标 G12）
  - 证据: 普查 §1.4
  - 裁决: pending
  - 状态: open
- [V2-F5] 代码高亮粗糙：`markdown.tsx:126-153` lowlight ~37 语言压缩到 4 个语义 token 色；`:267` 复制按钮常驻无 hover 语义
  - 证据: 普查 §1.5
  - 裁决: pending
  - 状态: open

## 已修（不登记为 findings，仅备查）

bug 134/135/159/142/144/164/165、0824 audit dark media 轨与 feedback 重挂载丢状态。

## 视觉证据

待 V2 plan 落地：V0 工具链（`tests/e2e/helpers/visual-assert.ts`）首批消费方——气泡视觉层 L3 断言、流式光标可见性、dark 双态。

## Closure

（V2 closure audit 后回写）
