# 维度01 依赖图与包边界

- 初审发现数: 4
- 复核结果: 保留 1 / 降级 3 / 驳回 0

### [维度01] Playground 直接导入 `ui` 包内部源码 CSS

- **文件**: `apps/playground/src/styles.css:4`
- **证据片段**:

```css
@import '../../../packages/ui/src/styles/base.css';
```

- **严重程度**: P1
- **现状**: `playground` 绕过 `@nop-chaos/ui/base.css` 公开子路径，直接绑定 `packages/ui/src/...` 私有目录。
- **风险**: UI 包一旦调整 `src/styles` 结构，应用层会在没有公开契约保护的前提下断裂。
- **建议**: 改为 `@import '@nop-chaos/ui/base.css';`。
- **为什么值得现在做**: 已有正式 `exports` 和 workspace alias，可直接收口为公共入口。
- **误报排除**: 这不是 `@source` 之类的扫描配置例外，而是真实源码导入私有路径。
- **历史模式对应**: 跨包内部路径依赖。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: `子项复核通过`

## 已降级

- `packages/theme-tokens/package.json` 的 `./styles.css -> ./src/styles.css`: 导出形态不够规范，但当前仍通过包子路径消费，降为 P3。
- `packages/flux-react/package.json` 的 `./default-spacing.css -> ./src/default-spacing.css`: 同上，降为 P3。
- `vite.workspace-alias.ts` 暴露 `@nop-chaos/flux-renderers-form/test-support`: 开发态契约不一致，但当前 live 使用面有限，降为 P2。

## 复核备注

- 维度复核额外发现了若干 test-only 的跨包 `src/*` 导入，但未纳入本轮保留条目；建议在测试质量/包边界后续审计中单独收口。
