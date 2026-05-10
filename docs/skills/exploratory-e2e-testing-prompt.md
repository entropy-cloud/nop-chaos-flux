# 探索性 E2E 测试提示词

## 目标

对当前仓库的 playground 执行一轮持续迭代的探索性端到端测试：逐页面、逐场景地执行真实用户交互，全程监控页面无任何 console 错误、未捕获异常、调试器错误事件或渲染异常；一旦发现问题，继续沿着新的方向寻找下一类问题，直到本轮确实找不到新的高价值问题为止。

这不是写一遍 happy-path 脚本就结束。

- 每个测试必须严格监控页面零报错（console error、pageerror、debugger error event）。
- 测试应模拟真实用户操作：导航、填写、点击、切换、滚动、拖拽、键盘输入。
- 同类问题只记录一次，不要因为同一个根因在多个页面重复出现就机械刷条目。

## 开始前必须读

1. `docs/index.md`
2. `AGENTS.md`
3. `docs/architecture/renderer-runtime.md`
4. `docs/architecture/styling-system.md`
5. `tests/e2e/component-lab/helpers.ts` — `ComponentLabHelper` 用法
6. `tests/e2e/component-lab/coverage-manifest.ts` — 全部 renderer 清单
7. `apps/playground/src/route-model.ts` — 全部页面路由
8. 已有 e2e 测试和 `docs/analysis/` 下相关历史分析，避免重复造轮子

## 三层错误监控体系

每次页面交互都必须同时启用以下三层监控，任何一层报错即视为问题。

### 第一层：Playwright 页面级监控

在每次导航前启动，在整个测试生命周期内持续收集。

```ts
function collectPageErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

function filterKnownNoise(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('WebSocket connection'),
  );
}
```

每个测试断言模式：

```ts
const errors = collectPageErrors(page);
// ... 执行用户交互 ...
expect(filterKnownNoise(errors)).toEqual([]);
```

### 第二层：nop-debugger 自动化 API

通过 `window.__NOP_DEBUGGER_API__` 检查 Flux 运行时内部的错误事件。

```ts
const debuggerErrors: NopDebugEvent[] = await page.evaluate(() => {
  const api = (window as any).__NOP_DEBUGGER_API__;
  if (!api) return [];
  return api.getLatestErrors();
});
expect(debuggerErrors).toHaveLength(0);
```

更精细的检查方式：

```ts
// 查询所有错误事件
const allErrors = await page.evaluate(() => {
  const api = (window as any).__NOP_DEBUGGER_API__;
  if (!api) return [];
  return api.queryEvents({ kind: 'error' });
});

// 查询最近失败
const recentFailures = await page.evaluate(() => {
  const api = (window as any).__NOP_DEBUGGER_API__;
  if (!api) return [];
  return api.getRecentFailures();
});

// 查询最近失败的动作
const failedAction = await page.evaluate(() => {
  const api = (window as any).__NOP_DEBUGGER_API__;
  if (!api) return undefined;
  return api.getLatestFailedAction();
});
```

### 第三层：scope-debug 控件

Component Lab 的每个场景自动挂载了 `scope-debug` 节点，可以通过它检查表单状态、校验状态、数据完整性。

```ts
const scopeDebug = stage.locator('[data-slot="scope-debug-json"]');

// 检查表单校验无错误
await expect(scopeDebug).toContainText('"errorCount": 0');
await expect(scopeDebug).toContainText('"valid": true');

// 检查提交后的数据
await expect(scopeDebug).toContainText('"username": "testuser"');
```

非 Lab 页面（domain 页面）如果 schema 中嵌入了 scope-debug 节点，同样可以用。

### 综合断言模式

```ts
const pageErrors = collectPageErrors(page);

// ... 执行用户交互 ...

expect(filterKnownNoise(pageErrors)).toEqual([]);

const debuggerCheck = await page.evaluate(() => {
  const api = (window as any).__NOP_DEBUGGER_API__;
  if (!api) return { errors: [], failures: [] };
  return {
    errors: api.queryEvents({ kind: 'error' }),
    failures: api.getRecentFailures(),
  };
});
expect(debuggerCheck.errors).toHaveLength(0);
expect(debuggerCheck.failures).toHaveLength(0);
```

## playground 导航地图

### Domain 页面（9 个）

| Hash 路由              | 页面                | 关键交互                                |
| ---------------------- | ------------------- | --------------------------------------- |
| `#/flux-basic`         | Renderer Playground | 表单填写、提交、校验、对话框、API、表格 |
| `#/flow-designer`      | Flow Designer       | 画布拖拽、节点编辑、连线、缩放          |
| `#/dingtalk-flow-demo` | 钉钉审批流          | 静态流程展示、画布交互                  |
| `#/report-designer`    | Report Designer     | 电子表格编辑、单元格操作                |
| `#/debugger-lab`       | Debugger Lab        | 调试器 API 按钮触发                     |
| `#/condition-builder`  | 条件构建器          | 条件组合、嵌套、删除                    |
| `#/code-editor`        | Code Editor         | 代码编辑、自动补全                      |
| `#/word-editor`        | Word Editor         | 文档编辑、保存、模板                    |
| `#/performance-table`  | Performance Table   | 大数据表格渲染、翻页、排序              |

### Component Lab 页面（43+ renderer）

导航到 `#/lab/<rendererId>` 打开每个 renderer 的场景页面。

每个场景自动挂载 scope-debug 节点，可通过 `[data-slot="scope-debug-json"]` 检查实时状态。

完整 renderer 清单见 `tests/e2e/component-lab/coverage-manifest.ts` 中的 `COMPONENT_LAB_COVERAGE_MANIFEST`。

### Lab 辅助工具

```ts
import { ComponentLabHelper, scenarioSlug } from '../e2e/component-lab/helpers';

const lab = new ComponentLabHelper(page);
await lab.openRenderer('form');
const stage = lab.scenarioStage(scenarioSlug('Some Scenario Title'));
```

## 允许优先攻击的高价值方向

如果没有切入点，优先从这些方向开始：

### 按页面加载阶段

1. **首次加载**：导航到页面后，检查 console 零错误 + debugger 零 error event
2. **二次导航**：从 A 页面跳到 B 页面再跳回 A 页面，检查残留状态或泄漏
3. **组件 Lab 批量打开**：逐个打开所有 renderer Lab 页面，每个都检查零报错

### 按交互类型

4. **表单空提交**：必填字段未填直接提交
5. **表单填写-清空-重填**：数据状态切换
6. **表格排序、翻页、筛选**：数据视图操作
7. **对话框打开-关闭**：overlay 生命周期
8. **Tab 切换**：标签页内容切换
9. **动态显示/隐藏**：条件渲染的字段出现又消失
10. **批量操作**：连续快速点击按钮
11. **键盘操作**：Tab 键导航、Enter 提交、Escape 关闭
12. **拖拽操作**：Flow Designer 节点拖拽、Report Designer 单元格选择

### 按状态边界

13. **从空到有**：空表单填入第一条数据
14. **从有到空**：有数据后全部删除
15. **增删交替**：添加-删除-再添加，检查 id 序列和数据一致性
16. **深层嵌套**：嵌套表单、嵌套对象/数组字段的增删
17. **并发触发**：快速连续触发同一个 action，看是否有竞态

### 按跨层行为

18. **Renderer → Scope**：操作 UI 后，scope-debug 是否反映正确的数据
19. **Action → API → UI**：触发 action 后，API 是否正确调用，UI 是否正确更新
20. **Validation → Error Display → Clear**：校验错误是否正确显示，修复后是否正确清除
21. **Schema 驱动渲染**：条件显示/隐藏是否正确触法，隐藏字段是否跳过校验

### 按nop-debugger高级检查

22. **Error event 捕获**：使用 `queryEvents({ kind: 'error' })` 检查是否有被 React 错误边界吞掉的错误
23. **Node diagnostics**：使用 `getNodeDiagnostics()` 检查组件树中是否有异常节点
24. **Interaction trace**：使用 `getInteractionTrace()` 验证 action 执行链是否完整
25. **Recent failures**：使用 `getRecentFailures()` 检查是否有静默失败的动作或请求
26. **Node anomalies**：使用 `getNodeAnomalies()` 检查是否有渲染异常的组件

## 执行模型

这份提示词默认采用：

1. **广度优先探索**：先尽可能铺开不同页面、不同交互族群、不同生命周期阶段，而不是一开始只深挖某一个页面。
2. **主执行者负责编排**：主执行者的首要职责是切分搜索空间、分配方向、去重、复核，而不是默认先自己从头到尾单刷某个页面。
3. **子 agent 负责独立探索**：每个子 agent 在自己负责的页面组或交互族群中完整执行探索循环。
4. **问题分支与主流程分离**：一旦确认某个新问题，允许单独开一个小分支继续深挖它，但主流程必须继续横向寻找其他问题类别。

## 主执行者职责

主执行者默认不应在第一阶段就把大部分时间耗在某一个页面或某一个组件 Lab renderer 上。

主执行者应优先完成以下工作：

1. 阅读基础文档，确认 playground 的页面地图、renderer 清单和已有测试覆盖。
2. 把搜索空间切分成多个尽量不重叠的高价值方向。
3. 为每个方向分配一个新的独立子 agent。
4. 约束不同子 agent 不要扎堆在同一页面组或同一交互模式上。
5. 汇总子 agent 的发现并做去重。
6. 对“候选问题”做真实性复核，确认是否真的是新的高价值问题类别。
7. 决定哪些问题立即修复，哪些先保留最小复现和分析记录。
8. 在一轮广度探索结束后，补齐尚未覆盖或覆盖不足的页面、交互类型和时序边界，再启动下一批全新子 agent。

只有在页面地图和交互族群已经被切开并经过至少一轮多方向探索后，主执行者才应该亲自补查空白方向或做最终收束验证。

## 搜索空间切分规则

主执行者必须先显式切分搜索空间，再启动探索。

推荐切分维度：

1. Domain 页面首屏加载与二次导航
2. Component Lab 批量 smoke 扫描
3. 表单 / 校验 / 提交 / 清空 / 重填
4. overlay / dialog / drawer / tabs / 条件显示隐藏
5. 表格 / 列表 / 翻页 / 排序 / 筛选 / 大数据量视图
6. 键盘交互 / focus / a11y 语义
7. 拖拽 / 画布 / designer 类交互
8. debugger API 深度检查：error event / recent failures / node anomalies / interaction trace
9. 并发与时序：快速连续点击、abort、切页返回、重复打开关闭

如果仓库规模较小，也至少要保证第一轮并行覆盖 3 个以上不相邻方向。

## 单个探索循环

无论是主执行者亲自补查，还是某个子 agent 在其方向内探索，都按下面的最小循环执行：

1. 选择一个页面、场景组合或交互族群。
2. 先读真实代码和已有 e2e 测试，确认页面结构、交互入口和断言锚点。
3. 启动三层错误监控（page-level + debugger API + scope-debug）。
4. 执行真实用户交互：导航 → 操作 → 等待渲染完成 → 检查结果。
5. 断言三层监控全部零错误。
6. 如果没有发现错误：
   - 尝试该方向内更深层的交互组合。
   - 或切换到该方向内尚未覆盖的场景。
   - 必要时用 `getNodeDiagnostics()`、`getRecentFailures()`、`getNodeAnomalies()` 主动探测隐藏问题。
7. 如果发现了错误：
   - 判断是新问题类别还是已有问题的重复实例。
   - 如果是新类别，登记到 `docs/analysis/` 台账。
8. 判断修复成本：
   - 简单问题：立即修复，确认测试转绿。
   - 复杂问题：保留最小复现测试和分析记录，延后修复。
9. 如果当前方向内仍有未覆盖的高价值子场景，继续探索；否则将该方向标记为“本 agent 已耗尽”。

## 广度优先批次循环

整体流程必须按“批次”推进，而不是只靠单线串行推进。

### 第 1 阶段：首批广度覆盖

1. 主执行者先切分方向。
2. 一次性启动一批新的独立子 agent，并让它们分别覆盖不同页面组、交互族群或时序边界。
3. 主执行者在这一阶段主要负责调度、记录、去重和读取返回结果，不应默认先自己深入某一条方向。

### 第 2 阶段：问题真实性复核

对每个子 agent 报告的候选问题：

1. 主执行者或专门复核分支必须做真实性验证。
2. 只有稳定复现并确认属于新的问题类别，才算“发现问题”。
3. 未经复核的候选不能直接算进最终发现数。

### 第 3 阶段：问题分支深挖

当某个新问题类别被确认后：

1. 可以启动一个专门的小分支继续扩影响范围、补测试、修复或评估延后原因。
2. 这个分支只负责该问题，不应把主流程重新拖回单线深挖。
3. 其他新子 agent 仍应继续寻找不同页面或不同交互方向里的其他问题类别。

### 第 4 阶段：补盲与再分发

一轮广度覆盖结束后，主执行者必须检查：

1. 哪些页面还没被覆盖。
2. 哪些交互族群只做了浅层探索。
3. 哪些方向已经证明只是重复旧根因。

然后：

1. 为未覆盖或覆盖不足的方向启动下一批全新子 agent。
2. 避免把新 agent 再次派去已经被证明只会重复旧根因的方向。

## 双层独立复查循环

与契约测试相同，这项工作必须经过两层耗尽式探索；但这里的“耗尽”指的是**页面和交互搜索空间的耗尽**，不是某一个页面被点透了就算结束。

停止条件不是“我找不到了”，而是：

1. 主执行者已经完成至少一轮多方向广度覆盖；并且
2. 最新一批全新独立子 agent 也没有带来经复核成立的新问题类别。

如果某一批新子 agent 又找到了新的问题类别，则说明搜索空间尚未耗尽；这时必须：

1. 更新测试与台账。
2. 继续启动下一批覆盖其他页面、交互族群或时序边界的全新子 agent。
3. 直到最近一批新的独立子 agent 也没有新增经复核成立的问题类别为止。

## 多个子 agent 的批次规则

按以下方式推进：

1. 主执行者先切分方向并启动第一批全新子 agent。
2. 每个子 agent 都必须在自己负责的页面组或交互方向内先自我耗尽。
3. 主执行者汇总第一批结果并复核候选问题。
4. 如果第一批产生了新的经确认问题类别，则一边开问题分支处理，一边启动第二批覆盖其他方向的全新子 agent。
5. 第二批完成后，再次汇总、去重、复核。
6. 如此循环，直到最近一批全新子 agent 没有带来新的经确认问题类别。

这里的关键点是：

1. 每次都必须是“新的”子 agent。
2. 每个子 agent 都必须被分配一个与其他 agent 尽量不同的主方向。
3. 只要最新一批全新子 agent 还能带来新的经确认问题，总体流程就不能停止。
4. 不允许因为某一个高价值页面问题值得深挖，就停止横向探索 playground 的其他方向。

## 轮次记录要求

每轮都要明确记录：

1. `main-round-N`：主执行者第 N 轮调度 / 复核 / 补盲结果
2. `subagent-X-round-N`：某个独立子 agent 第 N 轮结果
3. `subagent-X-summary`：某个独立子 agent 内部耗尽后的总结

每轮至少写明：

1. 执行者身份
2. 本轮负责的页面/场景/交互或调度方向
3. 本轮新增问题类别
4. 本轮新增测试文件
5. 本轮修复情况
6. 本轮延后问题
7. 本轮是否已耗尽
8. 下一轮建议方向

如果是 `main-round-N`，还应额外写明：

1. 本轮分发给了哪些子 agent，各自覆盖什么方向
2. 本轮实际补齐了哪些页面空白或交互空白
3. 本轮复核后哪些候选问题被确认，哪些被判定为重复或误报

## 结果目录与文件落盘规则

每次执行必须先在 `docs/analysis/` 下创建结果目录，例如：

- `docs/analysis/2026-05-10-exploratory-e2e-run-01/`

同一执行的所有轮次文件放在同一目录下。每一轮单独写一个文件，不混写。

建议命名：

1. `main-round-01.md`
2. `subagent-a-round-01.md`
3. `subagent-a-summary.md`
4. `summary.md`

### 单轮文件要求

每个轮次文件至少包含：

1. 轮次标识
2. 执行者身份
3. 本轮覆盖的页面列表和交互类型
4. 本轮新增问题类别（含页面路由、操作步骤、错误现象）
5. 本轮新增或修改的 e2e 测试文件
6. 本轮修复情况
7. 本轮延后问题
8. 本轮三层监控断言结果汇总
9. 本轮是否已耗尽
10. 下一轮建议方向

## 测试写法要求

### 结构要求

1. 一个测试只验证一个页面的一个交互场景。
2. 所有测试必须包含三层错误监控断言。
3. 优先复用 `tests/e2e/component-lab/helpers.ts` 中的工具类。
4. 导航前收集错误，交互后断言零错误。
5. 使用 `waitUntil: 'load'` 或 `waitFor` 确保页面完全渲染后再操作。
6. 不要使用 `page.pause()` 或任何需要人工介入的调试方式。

### 断言模式

```ts
test('flux-basic: form submit and table render without errors', async ({ page }) => {
  const errors = collectPageErrors(page);

  await page.goto('/#/flux-basic', { waitUntil: 'load' });
  await page.getByRole('heading', { name: 'Renderer Playground' }).waitFor({ state: 'visible' });

  // 执行交互...

  expect(filterKnownNoise(errors)).toEqual([]);

  const debuggerErrors = await page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    return api ? api.queryEvents({ kind: 'error' }) : [];
  });
  expect(debuggerErrors).toHaveLength(0);
});
```

### debugger API 使用注意事项

1. `page.evaluate()` 中访问 `window.__NOP_DEBUGGER_API__` 时要做好空值保护。
2. debugger API 方法是同步的（除了 `waitForEvent`），不需要 `await`，但 `page.evaluate()` 本身是异步的。
3. 在 `page.evaluate()` 中序列化返回值时，只返回需要的数据，避免传递不可序列化的对象。
4. 在交互前调用 `api.clear()` 可以清除历史错误事件，让断言更精确。
5. 对于 Lab 页面，scope-debug 是最方便的运行时状态检查手段。

### 全页面批量扫描模式

对于"打开所有页面都无报错"这种批量检查，可以使用循环结构：

```ts
const PAGES = [
  { route: 'flux-basic', heading: 'Renderer Playground' },
  { route: 'flow-designer', heading: /工作流/ },
  // ...
];

for (const { route, heading } of PAGES) {
  test(`page load smoke: ${route} has zero errors`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(`/#/${route}`, { waitUntil: 'load' });
    await page
      .getByRole('heading', { name: heading })
      .waitFor({ state: 'visible', timeout: 30_000 });

    expect(filterKnownNoise(errors)).toEqual([]);

    const debuggerErrors = await page.evaluate(() => {
      const api = (window as any).__NOP_DEBUGGER_API__;
      return api ? api.queryEvents({ kind: 'error' }) : [];
    });
    expect(debuggerErrors).toHaveLength(0);
  });
}
```

对于 Component Lab 渲染器批量检查：

```ts
for (const entry of COMPONENT_LAB_COVERAGE_MANIFEST) {
  test(`lab smoke: ${entry.id} renders without errors`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await openRendererDirect(page, entry.id);
    const container = page.getByTestId(`component-lab-renderer-${entry.id}`);
    await expect(container).toBeVisible();

    expect(filterKnownNoise(errors)).toEqual([]);
  });
}
```

## 去重规则

同类问题不要重复记账。按"根因 / 页面 / 错误类型"去重。

可视为同类问题的例子：

1. 同一个 renderer 在多个场景触发相同的 console error
2. 同一个 action 执行失败模式在不同页面重复出现
3. 同一个 CSS 布局问题导致多个页面渲染异常

遇到重复实例时：

1. 扩大已有问题条目的影响范围
2. 在同一问题下补充代表性测试
3. 不新增新的问题编号，除非根因不同

## 修复策略

### 简单问题

满足以下条件时，优先当场修复：

1. 根因明确（例如 CSS 重置缺失、事件监听器未清理）
2. 改动局部
3. 不需要额外设计讨论

处理方式：

1. 保留失败测试作为回归
2. 做最小修复
3. 重新运行相关 e2e 测试
4. 问题状态标为 `fixed`

### 复杂问题

满足以下任一条件时，可延后修复：

1. 牵涉多个包边界
2. 涉及运行时架构改动
3. 需要产品/设计裁定
4. 修复范围明显大于发现范围

处理方式：

1. 保留最小复现测试
2. 在分析台账中记录完整的错误日志、页面路由、操作步骤
3. 状态标为 `open` 或 `deferred`

## 每发现一个新问题后必须记录

在 `docs/analysis/` 的探索性 e2e 测试台账中更新一条记录，至少包括：

1. 问题编号
2. 问题标题
3. 对应 e2e 测试文件
4. 页面路由和操作步骤
5. 错误现象（console error 原文 / debugger error event / DOM 异常）
6. 影响范围
7. 是否已修复
8. 修复提交或修复文件
9. 去重键：用于判断后续是否属于同类问题

## 输出要求

每轮完成后，输出：

1. 新增的问题类别
2. 新增或更新的 e2e 测试文件
3. 已立即修复的问题
4. 延后处理的问题
5. 为什么认为本轮已经没有新的高价值问题

在一次完整执行结束时，还必须额外输出：

1. 主执行者共做了几轮调度 / 复核 / 补盲
2. 一共启用了几个全新独立子 agent
3. 每个子 agent 是否发现了新的高价值问题
4. 最终停止的依据：是哪个最新子 agent 在完成自身内部循环后未发现新问题
5. 本次执行实际覆盖了哪些主方向
6. 哪些页面或交互族群仍然只做了浅层探索，若继续下一轮应优先补哪些方向
