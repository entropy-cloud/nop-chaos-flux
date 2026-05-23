# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

### P3 发现（4 个）

1. spreadsheet-renderers manifest 常量未从 index.ts 公开导出，与同类包不一致
2. flux-action-core 透传 re-export flux-core 的 debounce 工具函数（无消费者）
3. flux-core types.ts 冗余的 TemplateNode/TemplateProviderPlan 重新导出
4. ui 包 chart 组件同时通过根导出和子路径导出（设计意图，信息级）

### 正面发现

- 核心接口单一来源（RendererComponentProps、ScopeRef 等仅 flux-core 定义一次）
- 无深度导入绕过 index.ts
- exports map 与 index.ts 对齐
- 渲染器注册模式一致
- flux-runtime index.ts 精准收敛（仅导出 10 个公共工厂/工具）
