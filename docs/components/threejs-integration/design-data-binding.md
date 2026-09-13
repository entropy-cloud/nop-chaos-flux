# three-canvas 数据绑定设计（v5）

> 分册：`docs/components/threejs-integration/design.md` §5 索引 | 版本 5.0（2026-09-13）
> 消费者：I2.1（桥接 hook）/ I2.2（TransformEngine 与图元）。求值 API 事实：`flux-core` `compilation.ts:213-229` + `compiled-value-types.ts:19-145`。

## 1. DataBinding Schema

```typescript
export interface DataBinding {
  id: string;
  target: {
    modelId: string;
    path: string; // 点分路径：position / rotation / scale / visible / material.color / material.opacity
    type: 'position' | 'rotation' | 'scale' | 'material' | 'visible' | 'custom';
  };
  source: {
    expression: string; // `${expr}` 平台语法（唯一入口，I18 一元化）
    scope?: string; // 预留：跨 scope 引用（首版不实现，声明保留）
  };
  transform?: TransformConfig;
  condition?: { expression: string; trueValue: unknown; falseValue: unknown };
}

export interface TransformConfig {
  convert?: string; // flux 表达式，注入 value 变量
  range?: { input: [number, number]; output: [number, number] }; // 线性映射 + clamp
  animation?: { type: 'tween' | 'spring' | 'step'; duration?: number; easing?: string }; // I2.2 实现插值
}
```

## 2. 表达式求值与依赖提取（决策 D4）

### 2.1 求值路径

```
compileValue(expression)  →  CompiledRuntimeValue（判 .kind === 'dynamic'）
evaluateValue(compiled, evalScope, env)  →  value
```

- `evalScope`：`createPrivateEvalScope({...pointValues?, ...scopeData})` 模式的本包变体（只读 ScopeRef，`get`/`has` 走 `getIn`，`update`/`merge` 为 no-op；INV-4 非 schema-visible 边界）。three-canvas 无点表，首版直接 `{ ...scopeData }`。
- 编译缓存：`Map<expression, CompiledRuntimeValue>`，随 `bindings`/`expressionCompiler` 身份变更清空（对齐 scada WD-3 防无界增长）。

### 2.2 订阅路径提取：`analyzeBindingSubscriptions`

对齐 industrial `analyzeFluxSubscriptions`（`use-scada-points-bridge.ts:56`）语义：

1. 仅认 `${expr}` 入口（非 `${...}` 形态经 normalize 包裹兜底）。
2. 内部为纯标识符链（`/^[a-zA-Z_][a-zA-Z0-9_.-]*$/`）→ 直取为订阅路径。
3. 复杂表达式（含运算符/函数）→ `extractExpressionDepsViaProbe(compiler, env, expression)`（probe 全程不对真实 scope 求值，仅收集依赖）：
   - `compileValue` → 非 dynamic 返回 `{ status: 'ok', paths: [] }`
   - `createState` → 失败 `{ status: 'create-state-failed' }`
   - 宽容 Proxy probe scope（get 返回递归 Proxy、`has` 恒真、屏蔽 `__proto__/constructor/prototype`）下 `evaluateWithState`
   - 读 `state.root`：非 `leaf-state` 或 wildcard 或空 paths → `{ status: 'deps-empty' }`；否则 `{ status: 'ok', paths }`
   - `compile-failed / create-state-failed / evaluate-failed` → 跳过该路径提取（桥接层真报覆盖）
4. probe 返 `deps-empty` 且表达式含标识符（排除纯字面量/纯运算符如 `${1+2}`；含全局名的复杂表达式按 live 启发式判真——`expressionReadsScope` 仅测标识符存在，对 `${Math.PI}` 会入嫌疑集，属可接受的一次性误报）→ 入 `depsEmptyExpressions`，桥接层一次性上报 `flux-deps-empty` 诊断（非升级通道）。

产出：`{ paths: string[], depsEmptyExpressions: string[] }`。

## 3. 绑定桥接 hook（`useBindingBridge`）

```
bindings + compiler + env
   → analyzeBindingSubscriptions（useMemo，随 config/compiler/env）
   → useScopeSelector(snapshot, Object.is, { enabled: paths.length > 0, fallback: {}, paths })
   → selector 触发时：逐 binding 编译求值 → 与 lastValue（useRef Map）比较
       → 变化：applyTransform（§5）→ pendingUpdatesRef.push({ modelId, path, value })
   → SceneManager rAF 帧边界：queue.drain() 批量 updateProperty
       （hook 经 sceneManager.setFrameUpdateQueue 注册队列句柄，bindings 变更时换绑；
         模型未就绪的更新由引擎 pending buffer 缓存、模型就绪后回放——design-renderer.md §5）
```

契约要点（每条对应 v4 缺陷修复或 scada 已验证模式）：

| #   | 要点                                                                                                                                                            | 来源                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | selector 内**无副作用**：lastValue 用 `useRef` Map 读写，返回 updates 数组                                                                                      | scada/React 规范                                                 |
| 2   | `pendingUpdatesRef` 是 hook 侧唯一帧级队列：selector 求值后 push，rAF drain 时 `splice(0)` 批量消费（引擎侧 pending buffer 是模型就绪性兜底，见 §3 流程图括注） | v4 数据流断裂修复                                                |
| 3   | 值比较用 `Object.is`（NaN 安全）                                                                                                                                | —                                                                |
| 4   | 单 binding 求值失败：跳过该 binding + `reportOnce(expression, code, error)` 去重上报（成功后清去重记录）；不升级画布状态                                        | D6、调研文档 §7.1 + `use-scada-points-bridge.ts:290-296,279-282` |
| 5   | `bindings`/`compiler` 变更：清编译缓存 + lastValues + 去重记录 + pendingUpdatesRef（引擎重建时同理，见 design-renderer.md §5）                                  | scada WD-3/L5                                                    |
| 6   | `enabled: false`（无订阅路径）时运行期求值旁路不写不报；**`flux-deps-empty` 诊断例外**——它在 analyze/config 期产生（§2.2#4），不受 enabled 影响                 | scada 对齐 + 裁定                                                |

## 4. 数据流全链路

```
外部数据（sources/动作/socket(I3)） → scope (Zustand)
  → useScopeSelector(paths 精确失效)             ← analyzeBindingSubscriptions 提取
  → binding 求值（compileValue/evaluateValue）
  → applyTransform（TransformEngine）
  → pendingUpdates 队列（useRef）
  → rAF flush（SceneManager 帧循环内）
  → updateProperty（Vector3/Euler/Color.set 语义，调研文档 §9.1）
  → three 渲染（renderer.render 已在帧循环）
```

## 5. TransformEngine（I2.2 交付物接口，本册冻结契约）

```typescript
export class TransformEngine {
  constructor(compiler: ExpressionCompiler, env: RendererEnv);
  apply(binding: DataBinding, value: unknown): unknown;
}
```

处理顺序（短路可组合，顺序固定）：`range`（纯数学，防除零回 outputMin，clamp [0,1]）→ `convert`（flux 表达式，`value` 变量经私有求值 scope 注入；compile 失败回退原值 + 去重上报）→ `condition`（表达式真值取 trueValue/falseValue）。

错误语义与绑定求值一致：单项失败回退原值、不阻塞其他绑定、`reportOnce` 去重。

## 6. AnimationConfig（keyframes，I2.2 交付）

```typescript
export interface AnimationConfig {
  id: string;
  trigger: { type: 'state' | 'event' | 'time'; source: string; value?: unknown };
  target: { modelId: string; property: string };
  keyframes: Array<{ time: number; value: unknown; easing?: string }>;
  loop?: { type: 'once' | 'loop' | 'pingpong'; count?: number };
}
```

运行模型：state 触发订阅 scope 路径；event 触发经 `useThreeEvents` 派发链；time 触发随帧时钟。插值器（linear/easing）与 tween/spring/step 属 I2.2 实现细节，契约以本结构为准。

## 7. 性能契约

- 帧预算：binding 求值 + transform + 属性写入合计 < 16ms/帧。CPU 段基线（调研文档 §10.3）：位置写入 ~5.4ns、颜色写入 ~185ns、场景组装 ~60µs——千级绑定内余量充足。
- 精确订阅：仅 `paths` 命中的 scope 成员变化触发求值；flush 合帧保证一帧至多一次 three 状态写入。
- 浏览器 fps 基准：I2.1 后挂 e2e（successor 项）。
