# 维度 13：类型安全与动态边界

## 第 1 轮（初审）

### any 使用统计（按包）

- src 命中约 188：`Record<string,any>`（受控 scope data baseline）约 150，context-sentinel / Host 边界 / 公式动态性约 30，**真正可疑约 5 处，危险 1 处（3 个相关行）**。
- 绝大部分 any 命中 AGENTS.md 例外 #1–#5 与 react19-best-practices-review.md "低代码项目例外"，不报告。
- 零三重断言链（as X as Y as Z）；零 `@ts-ignore`/`@ts-nocheck`。

### [维度13-01] CRUD 渲染器把 schema 不兼容断言扩散到 TableRenderer 主路径

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:363,376-381,389`
- **证据片段**:
  ```ts
  363: const tableEvents = props.events as unknown as RendererComponentProps<TableSchema>['events'];
  377: props.templateNode as unknown as RendererComponentProps<TableSchema>['templateNode'],
  381: } as unknown as RendererComponentProps<TableSchema>['node'],
  ```
- **严重程度**: P1
- **现状**: CrudRenderer 内部为内嵌 TableRenderer 构造 `RendererComponentProps<TableSchema>`，因 CrudSchema 与 TableSchema 在 events/templateNode/node 子类型不结构兼容，用 3 处 as unknown as 擦除类型检查。regions 单 as 反证可区分兼容/不兼容字段。
- **真实风险**: events/templateNode/node 断言把 schema 驱动表层类型契约完全旁路；TableSchema 演进时 TS 不告警，运行期静默拿旧形状。CRUD→Table 复合控件核心数据通路。
- **建议**: 让 CrudSchema/TableSchema 显式声明共享子结构；或引入 asTablePropsFromCrud 助手集中不兼容点 + 运行时 narrow。
- **误报排除**: 非例外 #1（单 RendererDefinition<S> existential 擦除）；非 #3/#4（公式/dispatch 边界）；非 schema 字面量 demo。产品代码内部 schema 间不兼容转换。
- **复核状态**: 维度复核通过（保留 P1）。与 03-02、09-02 同源 → AUDIT-03。

### [维度13-02] API dedup Map 用 ApiResponse<any> 存储 + 读出断言

- **文件**: `packages/flux-runtime/src/async-data/request-runtime.ts:472,505`
- **证据片段**:
  ```ts
  472: const activePromises = new Map<string, Promise<ApiResponse<any>>>();
  505: return previousPromise as Promise<ApiResponse<T>>;   // 读出强转回当前 T
  ```
- **严重程度**: P3
- **现状**: executeApiRequest<T> 泛型；dedup Map 擦除 T，读出 as 回当前调用点 T。
- **真实风险**: 触发条件窄（同 requestKey + 不同 T + dedupStrategy:'ignore-new'）；但类型层完全不设防，any→任意 T 彻底静默。
- **建议**: 改 `Promise<ApiResponse<unknown>>`（无损运行时行为），或 dedup 命中分支显式 narrow data 字段。
- **误报排除**: 非低代码边界 any（例外 1–5 不覆盖"内部泛型容器擦除"）；命中"内部已有更精确类型但未使用"。
- **复核状态**: 维度复核通过（保留 P3 → AUDIT-16）。

### [维度13-03] taskflow-designer-lib 用 ctx.scope as any 旁路 ScopeRef.get

- **文件**: `apps/playground/src/taskflow-designer-lib/index.ts:41`
- **证据片段**:
  ```ts
  const designer = (ctx.scope as any)?.get?.('$designer') as DesignerProjection | undefined;
  ```
- **严重程度**: P3
- **现状**: ctx.scope 已是 ScopeRef，get(path):unknown 是接口必填方法。代码同时断言 any + 对必填方法可选链 + 末尾再 as。包了 try/catch。
- **真实风险**: 运行时低；误导维护者以为 scope 可能无 get；失 IDE 跳转/补全。
- **建议**: `ctx.scope.get('$designer') as DesignerProjection | undefined`。
- **误报排除**: 非例外 #4；对已存在精确类型 ScopeRef 的无谓旁路。位于 apps/playground demo 性质，故 P3。
- **复核状态**: 维度复核通过（保留 P3 → AUDIT-17）。

## 维度复核结论

- [13-01]: 保留 P1 → AUDIT-03（与 03-02、09-02 合并）。
- [13-02]: 保留 P3 → AUDIT-16。
- [13-03]: 保留 P3 → AUDIT-17。

## 最终保留项

| 编号  | 严重程度 | 文件                                | 摘要                                    |
| ----- | -------- | ----------------------------------- | --------------------------------------- |
| 13-01 | P1       | `crud-renderer.tsx:363-389`         | as unknown as 断言扩散（合并 AUDIT-03） |
| 13-02 | P3       | `request-runtime.ts:472,505`        | dedup Map ApiResponse<any> + cast       |
| 13-03 | P3       | `taskflow-designer-lib/index.ts:41` | ctx.scope as any 旁路 ScopeRef.get      |

抽样边界 any 不报告清单：ScopeStore/ScopeRef `Record<string,any>` baseline、Host 注入 functions/filters、公式 evaluator `(left as any)+(right as any)`、dispatch `(action:any)`、RendererDefinition<any>[]、context sentinel `undefined as unknown as`、selector `as unknown as S`、schema 定义助手 `as unknown as XxxSchema`、test mock 海量、demo schema 字面量。
