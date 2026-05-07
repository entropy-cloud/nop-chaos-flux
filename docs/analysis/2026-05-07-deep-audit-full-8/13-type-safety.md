# 维度 13: 类型安全与动态边界

## 深挖轮次

- 第 1 轮: report dispatch default `as any`; spreadsheet `currentCell as any`.
- 第 2 轮: detail draft `RendererComponentProps<any>`, object-field dispatch any.
- 第 3 轮: word-editor ActionContext any, designer helper any.
- 第 4 轮: code-editor config any, defaults fetcher any, TabsSchema items any.
- 第 5 轮: RendererHelpers dispatch any candidate, validators any, node-instance any.

## 维度复核结论

### 保留 / 降级

- report core dispatch default `as any`: 降级，可用 `unknown`/type guard。
- spreadsheet `currentCell as any`: 降级，建议引入 named cell type。
- detail draft `RendererComponentProps<any>`: 降级。
- object-field `dispatch(actionSchema as any)`: 降级。
- designer helper `args.schema as any`: 降级。
- defaults fetcher `api: any`: 降级，应用 `ExecutableApiRequest` / `RendererEnv['fetcher']`。
- TabsSchema `Array<Record<string, any>>`: 降级，已有 `TabsItemSchema`。
- validators table `SyncValidator<any>`: 降级，union dispatch 可用 mapped type。

### 驳回 / 校正

- word-editor ActionContext any: live code uses `Partial<ActionContext>`; reject as stated.
- RendererHelpers dispatch any: core type already precise.
- node-instance meta Record any: live code uses `RuntimeValueState<unknown>`.
- code-editor expression/sql/options any: 复核文本误写为“驳回”，但证据显示 live schema uses `any` despite precise resolved types; keep as low-priority type cleanup.

## 最终保留项

- No P0/P1 type-safety issue retained.
- Keep a low-priority cleanup set for internal `as any` where precise types already exist.
