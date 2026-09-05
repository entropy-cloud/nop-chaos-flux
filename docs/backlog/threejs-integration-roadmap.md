# Three.js 3D Rendering Integration Roadmap

> 最后更新：2026-09-05
> 来源：`docs/components/threejs-integration-design.md`（设计文档 v4）
> Mission：`missions/threejs-integration.json`
> 目标：为 nop-chaos-flux 新增 **Three.js 3D 渲染** 能力——轻量封装层 + 数据驱动场景控制 + 工业协议集成 + AI 场景生成

## Phase Status

| Phase       | 状态 | 依赖 | 复用                  |
| ----------- | ---- | ---- | --------------------- |
| I0 调研     | todo | -    | -                     |
| I1 设计     | todo | I0   | -                     |
| I2 核心引擎 | todo | I1   | flux-core, zustand    |
| I3 工业协议 | todo | I2   | industrial-hmi socket |
| I4 AI 生成  | todo | I2   | flux-formula          |

## Phase Details

### I0 调研

- Three.js 核心 API 深度分析（场景/渲染器/几何/材质/灯光）
- 现有 industrial-hmi 架构复用点确认
- 性能基准测试框架搭建

### I1 设计

- v4 设计文档共识审查（3 轮 sub-agent）
- Flux 表达式桥接方案确认
- 工业协议集成方案确认

### I2 核心引擎

- `three-canvas` 渲染器组件实现
- Flux 表达式编译器集成（analyzeBindingSubscriptions）
- TransformEngine 实现
- 基础几何/材质图元库

### I3 工业协议

- ReconnectionManager 实现
- Socket.IO/WebSocket 数据桥接
- FUXA 协议适配器

### I4 AI 生成

- JSON Schema 验证
- 自然语言 → Three.js 场景转换
- Gemini API 集成

## Dependencies

```
I0 → I1 → I2 → I3
                → I4
```

## Reuse

| 能力       | 来源        | 复用方式                             |
| ---------- | ----------- | ------------------------------------ |
| 表达式编译 | flux-core   | analyzeBindingSubscriptions          |
| Scope 订阅 | flux-react  | useScopeSelector + paths             |
| 动作分发   | flux-react  | useActionDispatcher                  |
| WebSocket  | RendererEnv | env.openSocket                       |
| Zustand    | zustand     | vanilla store + useSyncExternalStore |

## Rule

1. 设计文档共识审查：3 轮 sub-agent，超限升级人工
2. 每个 Phase 完成后运行 typecheck/build/lint/test
3. 工业协议集成需复用 existing industrial-hmi 的 socket 模式
4. AI 生成必须有 JSON Schema 验证兜底
