# 维度 03：API 表面积与契约一致性

- 初审发现：1
- 维度复核：完成
- 子项复核：无

## 保留

- 无。

## 降级

1. [已降级] `@nop-chaos/flux-renderers-form/test-support` 仍被 workspace alias 暴露，但未出现在包 `exports` 中。
   文件：`packages/flux-renderers-form/package.json:11-16`、`vite.workspace-alias.ts:37-42`、`tsconfig.base.json:30-33`
   说明：这是开发态 resolver surface 与正式 package surface 的轻微不一致，但当前仓库没有 live consumer 依赖该子路径，证据不足以保留为主问题。

## 复核摘要

- 除上述降级项外，未发现新的公开 API 漂移、root barrel 与 `exports` 明显失配、或稳定公共面泄露内部 helper 的问题。
