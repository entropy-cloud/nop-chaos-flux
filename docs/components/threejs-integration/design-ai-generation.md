# three-canvas AI 场景生成设计（v5）

> 分册：`docs/components/threejs-integration/design.md` §5 索引 | 版本 5.0（2026-09-13）
> 消费者：I4.1。边界：本册冻结**接口面与验证门禁**；提示模板终稿与 Gemini API 集成规范在 I4.1 计划内细化（plan 464 Deferred 已裁定）。

## 1. 生成管线与验证门禁

```
自然语言需求 + 场景上下文
  → [LLM] 生成 ThreeCanvasSchema JSON（提示模板，I4.1 细化）
  → SchemaValidator.validate()          ← 硬门禁：验证不过不进渲染管线
  → 修正回路（把 errors 以 path/message 形式回喂 LLM 重试，≤ N 轮，I4.1 定参数）
  → three-canvas schema 节点
```

**安全原则**：LLM 输出一律视为不可信 JSON——先 `JSON.parse` 容错（代码围栏剥离），再结构验证，再渲染。任何字段不做 `eval`/动态执行；绑定表达式在渲染侧本就经 flux 编译器白名单求值。

## 2. JSON Schema（`threejs-schema.json`，draft-07）

以 `ThreeCanvasSchema` TS 类型为单一事实源生成/维护（I4.1 落地为包内 `src/ai/threejs-schema.json`，构建期用 `resolveJsonModule` 引入）。约束要点承 v4 §6.1 并与 v5 类型对齐：

- `type` const `three-canvas`；`scene` 必填（camera.position 三元数组、lights 数组、models 数组）。
- `ModelConfig.id` pattern `^[a-zA-Z][a-zA-Z0-9_-]*$`；`url` string（format: uri）。
- `rotation`/`position`/`scale` 均三元 number 数组（Euler.set z 必填的 API 约束传导到 schema minItems/maxItems）。
- `bindings[].source.expression` 描述标注 `${expr}` 平台语法（AI 生成提示据此产出正确形态）。
- `events.*` 为 ActionSchema 对象（自由结构 + 描述，验证从简——渲染侧 helpers.dispatch 契约兜底）。

## 3. SchemaValidator 契约

```typescript
export interface ValidationError {
  path: string;
  message: string;
}
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class SchemaValidator {
  validate(config: unknown): ValidationResult; // 结构校验：type/scene 必填、数组/三元/枚举/ID 冲突
  getSchema(): JsonSchemaDocument; // 供编辑器提示与 AI 修正回路
}
```

- 错误聚合：全部错误一次返回（不 fail-fast），`path` 用 JSON Pointer 风格（`scene.models[2].url`），供修正回路精确定位。
- 语义校验（结构之外的补充，逐条给出确定性错误码）：`bindings[].target.modelId` 必须存在于 `scene.models[].id`；`models[].id` 无重复；`camera.position` 为三元数值。

## 4. AISchemaGenerator 接口

```typescript
export interface SceneGenerationInput {
  sceneType: 'industrial' | 'architectural' | 'product' | 'custom';
  models: Array<{ name: string; kind: string; position?: [number, number, number] }>;
  dataPoints: Array<{
    name: string;
    type: 'number' | 'boolean' | 'enum';
    range?: [number, number];
  }>;
  interactions?: Array<'click' | 'hover'>;
}

export class AISchemaGenerator {
  /** 确定性模板生成（无 LLM 依赖，用作：a) LLM few-shot 示例源；b) 测试夹具；c) 降级路径） */
  static generateSchema(input: SceneGenerationInput): ThreeCanvasSchema;
  /** LLM 生成入口（I4.1 实现：注入 provider，输出过 §3 验证门禁） */
  static generateFromPrompt(input: {
    prompt: string;
    provider: LlmProvider;
    maxRepairRounds?: number;
  }): Promise<ThreeCanvasSchema>;
}

export interface LlmProvider {
  complete(prompt: string): Promise<string>; // 返回原始文本（含围栏），解析归本管线
}
```

- `generateSchema` 确定性生成的绑定表达式形态：`${sceneState.<dataPoint.name>}`（与 v4 一致，scope 根 `sceneState` 为文档化约定）。
- id 派生与归属规则：`models[].name` → id 经 slug 化（trim + 空白转 `-` + 小写 + 去非法字符，保证命中 `^[a-zA-Z][a-zA-Z0-9_-]*$`，冲突时追加序号）；**slug 结果为空或非字母开头（如纯中文输入「阀门」）时回退 `model-<序号>`**；`dataPoints` 生成的 binding 一律归属 `models[0]`（首个模型），布尔点映射 `visible`、数值点映射 `material.color` + range——使「generateSchema 输出过自身 validator 即绿」可确定地验收。
- `generateFromPrompt` 的 provider 注入使 Gemini/OpenAI/本地模型可替换；I4.1 提供 Gemini 适配与提示模板。

## 5. 验证策略（I4.1 test tier：必须自动化）

- SchemaValidator：合法/非法用例表驱动（缺 scene、models 空、ID 重复、binding 悬挂 modelId、rotation 二元数组）。
- generateSchema（确定性模板）：输出过自身 validator 即绿，用例含纯中文 model 名（slug 回退路径）。
- generateFromPrompt：mock provider 注入（返回合法/非法/围栏包裹三类文本）验证解析-验证-修正回路；不打真实 API。

## 6. 与 v4 差异清单

| #   | v4                                               | v5                                                          | 依据                         |
| --- | ------------------------------------------------ | ----------------------------------------------------------- | ---------------------------- |
| 1   | validator 内嵌硬编码检查，JSON Schema 文件仅展示 | schema 文件为包内资产 + validator 双层（结构 + 语义错误码） | 可维护性/修正回路            |
| 2   | generator 静态类无 provider 抽象                 | `LlmProvider` 注入 + 确定性模板双路径                       | 可测性（不 mock 全局 fetch） |
| 3   | 无修正回路                                       | errors→LLM 重试 ≤ N 轮（N 于 I4.1 定参）                    | 生成质量门禁                 |
