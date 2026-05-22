# 架构深挖机会发现提示词

> **定位**: 这不是一次通用代码异味扫描，也不是要求 AI 直接设计新架构；它用于识别当前仓库里哪些模块、接口、协调层或文件切分仍然偏浅，值得通过更深的模块收口来提升可测试性、可维护性和 AI 可导航性。
> **前提**: 执行前必须先阅读 `docs/index.md`、`AGENTS.md`、对应 owner 文档，以及 `docs/references/reopened-design-decisions-and-audit-adjudications.md`。以 live code 和当前文档基线为准，不以旧计划、旧日志或理想化分层图为准。
> **适用场景**: 需要发现“下一步最值得做的架构收敛点”、判断某个模块是否只是机械透传、识别哪些 seams 值得加深，而不是单纯找 bug 或做全量 deep audit。

---

## 核心术语

为保证输出稳定，本提示词统一使用以下术语：

- **Module**: 任何拥有接口和实现的单元，可以是函数、hook、文件、子系统、包、orchestrator。
- **Interface**: 调用方必须理解的一切，不只是 TypeScript 签名，还包括不变量、顺序要求、错误语义、状态约束、配置负担。
- **Implementation**: 被接口隐藏在内部的具体逻辑。
- **Depth**: 调用方用较小接口换取较多行为、约束和稳定性的程度。接口越小、内部吸收的复杂度越多，越深。
- **Shallow module**: 接口几乎和实现一样复杂，调用方仍需理解大量内部细节，模块主要只是在搬运复杂度。
- **Seam**: 接口存在的位置，也是未来替换实现、局部收敛复杂度、建立测试面的地方。避免泛泛使用“边界”而不说明 seam 具体是什么。
- **Leverage**: 调用方因 module depth 获得的收益，例如更少分支、更少调用约束、更少重复判断。
- **Locality**: 维护者因 module depth 获得的收益，例如变更集中、错误集中、知识集中。
- **Deletion test**: 想象删除一个 module。如果复杂度随之消失，它可能只是装饰层；如果复杂度会立刻散回多个调用点，它才可能真正在提供 leverage 与 locality。

---

## 适用范围

优先用于以下问题：

1. 你怀疑某些文件已经不是“合理 orchestrator”，而是在不断吸收实现细节。
2. 你怀疑某些 helper、adapter、hook、wrapper 只是把复杂度横向分散，没有真正收口。
3. 你想知道哪些重构值得优先做，但不希望 AI 输出大而泛的问题清单。
4. 你想识别哪些测试困难来自坏 seam，而不是单纯测试写得少。
5. 你想把“模块职责问题”从大文件扫描升级为“哪些地方缺少真正的 deep module”。

不适用于以下场景：

1. 明确的 bug 诊断。此时优先用 `docs/skills/bug-diagnosis-prompt.md`。
2. 需要做全仓库多维度风险排查。此时优先用 `docs/skills/deep-audit-prompts.md`。
3. 已经确定重构目标，只需要执行。此时优先用 `docs/skills/code-refactor-prompt.md`。

---

## 仓库特定前置要求

执行时必须遵守以下仓库口径：

1. 先从 `docs/index.md` 选择最小 owner 文档，不允许跳过 owner doc 直接做架构评论。
2. 低代码框架中的动态边界、runtime orchestrator、compiler/runtime/react/renderer 分层天然会有必要复杂度，不要机械把“复杂”判成“浅”。
3. 审查 shallow module 时，优先问“它是否真的替调用方减少了知识负担”，而不是“它是否看起来抽象了一层”。
4. 已有 `pnpm check:*` 硬门禁覆盖的机械问题不要重复作为主要发现；可引用 `docs/references/audit-tooling.md` 判断哪里仍需人工架构审计。
5. 对反复被 reopened 的问题，必须先对照 `docs/references/reopened-design-decisions-and-audit-adjudications.md`，说明当前案例为什么仍然成立，或为什么属于新的 residual，而不是历史问题换皮重报。
6. 当前基线默认按 `v1 / 无兼容负担 / 不接受过渡态主路径` 评判。兼容层若已污染主路径，可以作为真实架构问题保留，不因“历史迁移中”自动豁免。

---

## 核心审查问题

围绕以下问题探索代码，而不是机械跑 smell 清单：

1. 哪些 module 的 interface 已经接近 implementation 复杂度，调用方并没有真正变轻？
2. 哪些 seams 目前是“假 seam”或“单适配器 seam”，一旦删除并不会损失任何真实 locality？
3. 哪些 orchestrator 值得保留为 composition root，哪些只是实现细节堆积后的历史热点？
4. 哪些逻辑为了“可测试”被拆成很多小 helper，但真正复杂度仍留在调用链编排里？
5. 哪些问题本质上不是重复代码，而是缺少一个更深的 module 来吸收调用方分支？
6. 哪些测试脆弱、跨域或难写，根因是 interface 不诚实、seam 位置错误，或 runtime ownership 没有收口？
7. 删除某个 wrapper / adapter / helper / hook 后，复杂度会集中，还是只会原样散回 N 个调用点？

---

## 推荐探索路径

1. 先阅读：`docs/index.md`、`AGENTS.md`、目标 area 的 owner 文档、`docs/references/audit-tooling.md`、`docs/references/reopened-design-decisions-and-audit-adjudications.md`。
2. 再看代表性 live code，而不是先看 barrel、README 或测试名。
3. 从以下信号中选最有价值的热点继续读：
   - 大文件但不明显是稳定 orchestrator
   - 同一行为需要同时修改多个小文件
   - 调用方在多处重复做相同前置判断、组装、清洗、补洞
   - interface 暴露大量 flags、callbacks、intermediate shapes 才能工作
   - 测试只能通过沉重 setup、跨层 mock 或内部状态钩子才能成立
4. 对怀疑偏浅的 module 执行 deletion test。
5. 只保留“如果重构，将显著增加 leverage/locality”的候选，不要为了凑数量报告低 ROI 小问题。

---

## 输出契约

输出重点不是“问题列表”，而是“架构 deepening 候选列表”。按推荐强度排序，最多保留 3-7 个候选。

分析结果必须归档到 `docs/analysis/` 下，不允许只停留在对话输出里。

- 目录名或文件名必须带有 `YYYY-MM-DD` 日期前缀。
- 推荐目录格式：`docs/analysis/YYYY-MM-DD-architecture-deepening-<short-tag>/`
- 推荐主文件格式：`summary.md`
- 如果只保存单文件，推荐文件名格式：`docs/analysis/YYYY-MM-DD-architecture-deepening-<short-tag>.md`
- 同一天多次执行时，必须通过 `<short-tag>` 区分，不要覆盖已有结果。
- 输出结论时应同时给出保存路径，便于后续计划、复核或实现引用。

每个候选必须包含以下内容：

1. **Title**
   - 用一句话说明候选的 deepening 方向。

2. **Recommendation strength**
   - 只能是 `Strong` / `Worth exploring` / `Speculative`。

3. **Files**
   - 列出涉及的关键文件路径。

4. **Current seam**
   - 说明当前 seam 在哪里，调用方需要知道什么才能安全使用它。

5. **Why it is shallow**
   - 明确说明为什么当前 module / file / hook / adapter 偏 shallow。
   - 必须引用实际复杂度负担，例如重复前置条件、双语义字段、跨文件编排、泄漏的生命周期约束。

6. **Deletion test**
   - 回答删除该 module 后复杂度会发生什么。
   - 明确判断它是“真 seam”还是“假 seam / 过浅 seam”。

7. **Deepening direction**
   - 用 plain English or plain Chinese 说明更深的 module 应吸收什么复杂度。
   - 不要直接设计完整接口，只说明收口方向和应隐藏的实现负担。

8. **Leverage**
   - 调用方会因此少理解什么、少做什么、少复制什么。

9. **Locality**
   - 维护者以后改动会集中到哪里，哪些知识与 bug 会更集中。

10. **Testing impact**

- 哪些测试会更容易写、更稳定，或可以从跨层测试下降到稳定 contract test。

11. **Risks / counter-signals**

- 为什么这个候选可能不值得做，或需要避免把必要复杂度误判成浅层问题。

12. **Why now**

- 说明当前 ROI：为什么它应该成为当前阶段值得考虑的候选，而不是以后再说。

---

## 输出限制

1. 不要直接发明一个全新平台架构。
2. 不要把“抽更多层”“再建一个 helper 文件”当成 deepening。
3. 不要只给“拆文件”“提公共函数”这类表层建议，必须说明它如何增加 leverage 或 locality。
4. 不要把单纯行数问题当作结论；行数只是线索，不是发现本身。
5. 不要把历史上已裁定的 tradeoff 机械重报为 must-fix，除非当前 live code 已越过原裁定边界。
6. 不要因为某处有两个实现就自动认定应该抽 seam；只有出现真实 leverage/locality 时，seam 才值得存在。
7. 如果没有足够强的候选，允许输出“未发现值得优先做的 deepening 候选”，并说明为什么当前复杂度主要属于必要复杂度。

---

## 归档格式

推荐保存为以下结构：

```text
docs/analysis/YYYY-MM-DD-architecture-deepening-<short-tag>/
├── summary.md
```

`summary.md` 推荐包含以下结构：

```text
# Architecture Deepening Review

## Scope
- 本次覆盖的子系统、owner docs、关键代码路径

## Candidates
- 按输出契约中的候选结构逐项记录

## Top recommendation
- 最值得优先推进的单个候选

## Non-candidates
- 审查后明确不纳入的点及原因
```

---

## 可直接复用的提示词正文

```text
请对当前 nop-chaos-flux 仓库执行一次“架构 deepening 候选发现”审查。

执行前先阅读：
1. docs/index.md
2. AGENTS.md
3. 目标 area 的 owner 文档
4. docs/references/audit-tooling.md
5. docs/references/reopened-design-decisions-and-audit-adjudications.md

审查目标不是找 bug，也不是输出泛化代码异味，而是识别：当前代码里哪些 module / seam / orchestrator / wrapper 仍然偏 shallow，值得通过更深的模块收口来提升 leverage、locality、testability、AI navigability。

请统一使用以下术语：Module、Interface、Implementation、Depth、Shallow module、Seam、Leverage、Locality、Deletion test。

关键要求：
1. 以 live code 和当前 owner docs 为准，不以历史计划或旧日志结论为准。
2. 低代码框架中的动态边界、runtime orchestrator、compiler/runtime/react/renderer 分层可能存在必要复杂度，不要机械误报。
3. 对每个候选必须执行 deletion test：删除该 module 后，复杂度是消失了，还是散回多个调用点？
4. 只保留高 ROI 候选。不要为了凑数量报告低价值小问题。
5. 如果某个问题与 reopened adjudication 很像，必须先说明当前案例为什么仍成立，或为什么是新的 residual。
6. 分析结果必须保存到 docs/analysis/ 下，目录名或文件名必须带 YYYY-MM-DD 日期前缀；输出结论时同时给出保存路径。

请按以下结构输出，按推荐强度排序，最多 3-7 个候选：

## Candidate N: <title>
- Recommendation strength: Strong | Worth exploring | Speculative
- Files: <关键文件列表>
- Current seam: <当前 seam 在哪里，调用方要理解什么>
- Why it is shallow: <为什么它偏 shallow，复杂度具体泄漏在哪里>
- Deletion test: <删除它后复杂度如何变化；它是真 seam 还是假 seam>
- Deepening direction: <更深的 module 应吸收什么复杂度>
- Leverage: <调用方收益>
- Locality: <维护收益>
- Testing impact: <测试面会怎样改善>
- Risks / counter-signals: <为什么这可能是必要复杂度，或为什么当前不值得做>
- Why now: <当前 ROI>

最后再输出两个部分：

## Top recommendation
- 只保留 1 个最值得先做的候选
- 说明为什么它比其他候选更值得优先推进

## Non-candidates
- 列出 0-5 个看起来像问题、但经审查后不应纳入本次 deepening 候选的点
- 说明为什么它们属于必要复杂度、历史已裁定 tradeoff、低 ROI，或只是表层重构建议
```
