# 视觉质量证据卡：AI 会话组件（V2）

> 状态: closed
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §1（已经三轮独立核实）
> Owner plan: `docs/plans/472-visual-quality-v2-ai-conversation-visuals-plan.md`
> Owner docs: `docs/components/flux-renderers-ai/design.md`、`docs/components/flux-renderers-ai/renderers.md`

## Findings 清单

- [V2-F1] 流式渲染失效（bug 166，open）：`ai-chat.tsx:501` context useMemo 以 messages 数组引用为 dep，流式期间引用不变 → 消费端 bail-out，内容流结束时一次性出现；打字光标全程不可见
  - 证据: 普查 §1.1；bug 166 open；研究报告核实补充：光标条件挂 `message.loading`（首 chunk 即清除）在现链路下永不渲染
  - 裁决: fixed（plan 472 Phase 1：主机制 `useEngineContentTick` 内容长度 tick 经 `streamSignature` prop 读入渲染输出——React Compiler 只认渲染期读取值的缓存键；context 层保留 streamFingerprint 三面指纹服务非编译消费方；光标改挂 list 派生 streaming 信号；单测+e2e 双先红后绿；bug 166 已关闭）
  - 状态: fixed
- [V2-F2] 气泡视觉层缺失：`ai-bubble` 输出 `data-shape`/`data-placement` 无任何 CSS 消费
  - 证据: 普查 §1.2
  - 裁决: fixed（plan 472 Phase 2：styles.css 气泡面/右对齐/shape 降级，三块暗色；ai-bubble-visual.spec L3 断言）
  - 状态: fixed
- [V2-F3] AI e2e 零视觉断言
  - 证据: 普查 §1.3 + V0 研究报告 §2 实测修正
  - 裁决: fixed（plan 472 Phase 4：`ai-bubble-visual.spec.ts` 消费 V0 helper——气泡面/右对齐几何/滚动按钮/操作条/tok-comment L1-L3 断言）
  - 状态: fixed
- [V2-F4] 交互细节缺失：scrollToBottom 无按钮消费者；气泡操作条未挂载等
  - 证据: 普查 §1.4
  - 裁决: fixed（plan 472 Phase 3：滚动到底按钮[pinned 响应式]；assistant 操作条 copy 全挂/retry 仅末条）；lightbox/时间分组/进入动画 deferred（研究报告 A6-A8：能力型缺失非缺陷，理由见报告）
  - 状态: fixed
- [V2-F5] 代码高亮粗糙：4 语义 token 色
  - 证据: 普查 §1.5；研究报告勘误：4-token 为 design.md 显式决策非缺陷，缺口在 comment 无色
  - 裁决: fixed（plan 472 Phase 3：+tok-comment，A5 显式修订裁决；punctuation 经核实 M2 否决——hljs common 主力语言 0 命中）
  - 状态: fixed

## 已修（不登记为 findings，仅备查）

bug 134/135/159/142/144/164/165、0824 audit dark media 轨与 feedback 重挂载丢状态。

## 视觉证据

- `tests/e2e/ai-bubble-visual.spec.ts`（V0 helper 首批域消费：气泡面/右对齐几何/滚动按钮/操作条/tok-comment）
- `tests/e2e/ai-widgets-fixture.spec.ts` 流式渐进用例（DOM 采样单调增长 + 光标可见）
- 回归：AI 族 133 spec 全绿（2026-09-19）

## Closure

V2 closure audit 两轮（fresh session）：首轮 `issues`（bugs/166 未回写最终机制 + full-green 记录缺失，均文档真性）→ 修复 → 复核 **approved**（2026-09-19）。F1-F5 fixed、F3 fixed（ai-bubble-visual spec）、F6-F8 deferred 登记。plan 472 `completed`，roadmap V2 `done`。
