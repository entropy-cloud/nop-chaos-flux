# 对抗性审查 — 2026-05-05 第 6 轮（Canonical-Only 收尾）

## 发现 1：Data source 状态合同仍在同时维持旧状态词汇和新状态词汇，两套可观察语义并存

- 在哪里
  - `packages/flux-core/src/types/runtime.ts:141-157`
  - `docs/architecture/api-data-source.md:741-749`
  - `packages/flux-runtime/src/__tests__/runtime-sources.test.ts:167-199`
  - `packages/flux-react/src/__tests__/data-source-and-node-identity.test.tsx:113-137`
- 是什么
  - 公开状态摘要同时暴露：
    - 旧词汇：`started`, `loading`, `ready`, `stale`, `error`
    - 新词汇：`hasData`, `hasError`, `isInitialLoading`, `isRefreshing`, `inFlightCount`
  - active architecture doc 还明确写着：旧字段继续保留，新消费者可以选择新字段，两套并行使用。
  - 测试也同时断言两套状态面都可观察。
- 为什么值得关心
  - 这意味着 source-status 不是一套 canonical observable contract，而是“老摘要 + 新摘要”叠加的双词汇表。
  - 在没有兼容性负担的前提下，这会把 source consumer、statusPath 文档、hook API、宿主状态判断长期锁死在双轨上：不同调用方会持续使用不同状态 vocabulary。
  - 从设计角度，这和前几轮的 host projection alias、action alias、public export alias 是同一类根因：系统还没有真正允许自己删除旧语义入口。
- 信心水平
  - 确定

## 本轮结论

- 没有再发现同等级别的新问题。
- 到这一轮为止，canonical-only 视角下最值得立即处理的不是零散 bug，而是系统性地删除那些已经被文档、类型、helper、validator、测试正式承认的“兼容层”。
