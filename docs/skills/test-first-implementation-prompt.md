# Test-First 实现提示词

## 目标

用于在 `nop-chaos-flux` 中以**契约驱动、最小切片、先测后改**的方式实现新功能或修复非微小行为缺陷。

这份提示词不是教条化地要求所有工作都写成传统 TDD，而是要求：

1. 先确认 owner docs 和 public behavior
2. 先用一个最小 failing test 锁住当前切片
3. 再写最小实现让它转绿
4. 绿了以后才做局部重构

适合：

1. 新增或调整明确的运行时行为
2. 修复有稳定测试 seam 的 bug
3. 需要防 future refactor regression 的 contract work
4. 需要避免“一次改太大、最后不知道哪一步弄坏了什么”的实现任务

不适合：

1. 需求和 owner contract 还没明确
2. 先要做探索性排障而不是实现
3. 纯文档、纯样式、纯机械重命名
4. 没有正确测试 seam，且短期也不值得为此搭 seam

## 开始前必须读

1. `docs/index.md`
2. `AGENTS.md`
3. 当前任务所在区域的 owner doc
4. 当前区域的公共入口与现有测试
5. 若是 bug 修复，补读：
   - `docs/skills/bug-diagnosis-prompt.md`
   - `docs/bugs/00-bug-fix-note-writing-guide.md`
6. 若是 renderer / runtime / validation 相关，补读相应 architecture doc

## 核心原则

1. **先确认契约，再写测试。** 不要根据自己想象的实现去写测试。
2. **一次只推进一个行为切片。** 不要先写一排测试，再回头批量写实现。
3. **优先 public behavior。** 测试应该保护用户可观察结果、公开接口、稳定语义，而不是内部 helper 调用。
4. **最小变更优先。** 为了让当前测试转绿，只写当前切片需要的最少代码。
5. **绿了再重构。** RED 状态下不做顺手结构整理。
6. **跨层行为选对 seam。** compile -> runtime -> react -> renderer 问题通常不该只用 helper test 证明。
7. **不要为了 TDD 形式感而制造假覆盖。** 过浅 seam、过厚 mock、只断言不抛错，都会制造虚假信心。

## Phase 1: 锁定契约与切片

在写测试前，先明确：

1. 当前切片要保护的 public behavior 是什么
2. 这个行为的 owner doc / public contract 来源是什么
3. 最合适的测试层级是哪一层：
   - unit
   - integration
   - e2e
4. 当前切片的 done 条件是什么

先用一句话写出目标行为，例如：

- “当 async validation 被取消时，owner state 必须结算为 cancelled，而不是继续停留在 running。”
- “当 renderer 在 form 内部读取值时，应以 form owner store 为准，而不是 scope snapshot。”

如果一句话说不清，先不要开始写测试。

## Phase 2: 选正确测试 seam

优先级：

1. 能直接验证稳定 contract 的最小 seam
2. 能走真实调用链的 seam
3. 能在本仓库里稳定运行、易于理解、易于回归的 seam

选择规则：

1. renderer 可观察行为：优先 renderer integration test 或 focused e2e
2. runtime / validation / async owner：优先包内 integration test 或 focused unit/integration test
3. 页面级/交互级行为：优先 Playwright
4. 跨层 contract：优先能穿过真实边界的 integration seam

避免这些假 seam：

1. 只测私有 helper，而真实 bug 在调用链组合处
2. 用 mock 抹平 compiler / runtime / host bridge 风险
3. 输入和预期都由同一内部 helper 构造，形成“实现和自己一致”

## Phase 3: RED

先写**一个** failing test，只证明**一个**行为当前不成立。

要求：

1. 测试名描述行为，不描述内部实现。
2. 断言“正确结果是什么”，不要只断言“不抛错”。
3. 测试尽量走公开入口，不直接读取私有中间状态。
4. 如果是 bug 修复，测试应尽量复现真实问题模式，而不是只测一个浅层等价物。

禁止：

1. 一次先写 5 个 failing tests
2. 先想完整测试矩阵再实现第一步
3. 用 snapshot 或宽泛 truthy/falsy 替代关键语义断言

## Phase 4: GREEN

写最小实现让当前这一个测试转绿。

要求：

1. 不提前实现下一个测试需要的逻辑。
2. 不顺手做 unrelated refactor。
3. 如果实现过程中发现测试 seam 选错了，停下来调整 seam，而不是继续堆代码。

当前测试转绿后：

1. 重跑当前 focused test
2. 必要时再重跑最接近的相关 tests
3. 确认没有为了转绿而破坏既有 contract

## Phase 5: 下一切片还是结束

问自己：

1. 当前行为切片是否已经完整达成？
2. 是否还剩一个相邻的、同 owner contract 下的下一个行为？
3. 这个下一个行为是否应该写成新的独立 failing test？

如果还有下一个行为，就回到 Phase 3，再做**一个** RED -> GREEN 循环。

## Phase 6: REFACTOR

只有在相关测试已经稳定转绿后，才做小范围重构。

允许的重构类型：

1. 去重复
2. 收口局部复杂度
3. 提升命名清晰度
4. 把刚暴露出的复杂逻辑移到更合理的 owner/seam 后面

不允许把“修 bug 的最小切片”扩成广义 cleanup。

每个重构步后都要重跑相关 tests。

## 针对本项目的额外要求

1. 先对齐 owner docs，不要跳过 `docs/index.md` 路由。
2. renderer / runtime / validation / action 这类 shared substrate 行为，优先写 focused regression tests，而不是只靠人工验证。
3. 若问题属于非 trivial bug，评估是否需要更新 `docs/bugs/`。
4. 若是 significant code change，完成后更新 `docs/logs/{year}/{month}-{day}.md`，并按仓库规则运行：
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm lint`
   - `pnpm test`（relevant 时）
5. 对 E2E 场景，遵守 `docs/testing/e2e-standards.md`，不要用 screenshot 当主要证据。

## 常见反模式

1. **水平切片**：先写一堆测试，再一次性写实现。
2. **过浅 seam**：测试看起来绿了，但真实调用链没被覆盖。
3. **实现细节测试**：断言内部 helper 被调用、调用次数、私有结构 shape。
4. **过早重构**：第一个测试还没稳就开始大改结构。
5. **借 TDD 名义扩大范围**：顺手把无关 cleanup 一起塞进当前切片。
6. **只测 happy path**：没有错误路径、边界值、状态切换或负面证明。

## 输出要求

至少包含：

1. **Contract**
   - 当前切片要保护的行为是什么
2. **Seam**
   - 选择了哪一层测试入口，为什么
3. **RED**
   - 新增了哪个 failing test
4. **GREEN**
   - 做了什么最小实现让它转绿
5. **REFACTOR**
   - 做了哪些局部整理；如果没有，就明确写无
6. **Verification**
   - 跑了哪些 focused tests / repo checks
7. **Follow-up Docs**
   - 是否需要更新 `docs/bugs/`、owner docs、daily log

## 可直接复用的提示词正文

```text
请按本仓库的 test-first 实现流程处理当前任务，不要直接大段实现。

要求：
1. 先读 `docs/index.md`、`AGENTS.md`、相关 owner docs、当前区域的公共入口与已有测试。
2. 先明确当前切片要保护的 public behavior，用一句话写清 contract。
3. 先选择正确测试 seam；优先能覆盖真实调用链的最小稳定 seam，不要退化成 helper-only 测试。
4. 先写一个 failing test（RED），只证明一个行为当前不成立。
5. 再写最小实现让这一个测试转绿（GREEN）。
6. 相关测试转绿后，才允许做局部重构（REFACTOR）。
7. 若还有下一个相邻行为，重复一个新的 RED -> GREEN 循环；不要先写一排测试再统一实现。
8. 最后按仓库规则运行相关 focused tests，以及必要的 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。
9. 若是 non-trivial bug 或 significant code change，评估是否更新 `docs/bugs/`、owner docs 和 `docs/logs/`。

输出格式：
1. Contract
2. Seam
3. RED
4. GREEN
5. REFACTOR
6. Verification
7. Follow-up Docs
```
