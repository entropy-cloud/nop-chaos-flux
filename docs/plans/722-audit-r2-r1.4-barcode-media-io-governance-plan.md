# 722 审计修复 R2·R1.4：运行时修复—barcode 媒体 IO 治理（P1-MA2.3-001）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R1.4（MR1.0/plan 711 展开）；`docs/audits/2026-10-20-0335-arm2-MA2.3-content-mobile-domain-scheduling-ai-runtime.md` §P1-MA2.3-001；`docs/architecture/renderer-env.md`（INV-1/INV-2 + plan 512 optional-channel 先例 :20/:29/:259）；`docs/discussions/2026-09-26-host-channels-print-clipboard-download-toast-url.md`（先例契约）
> Related: plan 711 Non-Blocking Follow-ups；roadmap Cross-Cutting 8（结构性变更人工确认）；guide When Closing 11（部分收敛标注）
> 编号 runway：719-721 为 R1.1-R1.3（本线）；722 本 plan；ARC 线后续从 723 起
> v2 注记：v1 因 Current Baseline 失实（三通道误归单文件、13 用例误记 8、mock 机制记错）被 draft review R1 判 FAIL(1B+3M)——本版按实测四通道四文件重写，关闭会计改部分收敛口径

## Purpose

处置 barcode-input 媒体 IO 无治理成员缺陷：四通道直调浏览器 API 绕过 RendererEnv 且无在案豁免。**两段式处置**——段 1（本 plan 可自主执行）：四通道收敛单点注入边界 + 判别测试，消解「散布直调」的即时风险，并在边界模块落 INV-1 在案裁决注记（援引提案文档，构成过渡态在案治理）；段 2（产出提案待人审）：按 plan-512 先例起草 env camera 通道 INV-2 契约提案——**结构性接口变更留人工 gate**。关闭会计：finding 保持 `open` + 部分收敛注记（段 1 落地、env 通道待人审），R1.4 行 `done` 带部分收敛标注（guide When Closing 11）——env 通道实施后人审闭环转 `closed`。

## Current Baseline（2026-10-24 live，实测四通道四文件；HEAD `b9ba978b2`）

- **四通道直调（分居四文件）**：
  1. `hooks/use-barcode-camera.ts:67` `navigator.mediaDevices.getUserMedia(...)`（:95 失败日志同名引用）
  2. `utils/barcode-detector-utils.ts:106` `typeof window !== 'undefined' ? (window as any).BarcodeDetector : undefined`——**特性检测工厂** `createBarcodeDetector(:102)`，含 ZXing ponyfill 回退（回退路径已部分 env-mediated 经 wasmFetcher→env.fetcher）
  3. `barcode-scanner-overlay.tsx:86` `const getOnlineSnapshot = () => navigator.onLine`——组件内 `useSyncExternalStore` 响应式快照（online/offline 事件订阅）
  4. `utils/camera-utils.ts:11/:16-21` `window.isSecureContext` + `navigator.mediaDevices?.enumerateDevices`（可用性探测缓存）
- **测试现状**：`use-barcode-camera.test.ts` 13 个 `it()`，mock 机制 `Object.defineProperty(navigator, 'mediaDevices', ...)`（非 vi.stubGlobal）；`barcode-detector-utils.test.ts` 用 `vi.stubGlobal`（:60/:74/:85/:100，4 处）；`camera-utils.test.ts` 同受影响。
- **治理先例**：同包 WASM IO 显式经 env.fetcher（barcode-input.tsx:199 INV-1 注释、:203 fetcher）；env optional 能力通道三例已裁定（print/clipboard/location，plan 512 = INV-2 评审 + 契约文档 + design gate 全链）；repo 无「提案待人审即 closed」先例（P2-MA2.3-001 直调降 P2 前提是 env 通道已裁定落地）。
- roadmap R1.4 行 `todo`（行 scope：「barcode 媒体 IO env 通道治理」）；arm2-index P1-MA2.3-001 修复行 `R1.4`、状态 `open`。
- renderer-env.md §1「永不直调全局 API」——段 1 后 live 仍非 env 通道：owner doc 不改（通道未裁定期内以边界 + 提案为在案治理，见 Closure Gates 交代）。

## Goals

- **段 1**：四通道收敛单点注入边界 `utils/barcode-media-io.ts`（默认实现 = 各通道现行逻辑原样迁入，保持特性检测/ponyfill 回退/响应式快照形态），四文件改经边界消费；判别测试（全局访问零化探针：注入 spy IO 后断言 spy 被调且全局 `navigator.mediaDevices` 零访问——旧实现必触全局必红）；边界模块头部落 INV-1 在案裁决注记（援引提案文档）。
- **段 2**：`docs/discussions/2026-10-24-env-camera-channel-inv2-proposal.md` 提案（沿 plan-512 契约结构：optional `env.mediaDevices?` + capability check + 宿主代理 + 四通道消费迁移路径），**显式标注待人审（Cross-Cutting 8）**。
- **关闭会计**：arm2-index P1-MA2.3-001 保持 `open` + 部分收敛注记；roadmap R1.4 `todo`→`planned`（激活）→`done`（收口，**部分收敛标注**：单点治理+提案落地、env 通道待人审闭环后索引转 closed）。

## Non-Goals

- **不改 RendererEnv 接口**（结构性公共 API 变更，Cross-Cutting 8 人工确认后随独立 plan 落地）；不修扫描器 camera 盲区（P2 另案）；不动 WASM env.fetcher 已合规路径；owner doc renderer-env.md 不改（理由见 Baseline 末条，收口时交代）。

## Scope（必填节）

### In Scope

- `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-media-io.ts`（新建单点边界——沿包内惯例落 utils/，与既有 barcode-detector-utils.ts 同位）
- 四消费文件迁移：`hooks/use-barcode-camera.ts`、`utils/barcode-detector-utils.ts`、`utils/camera-utils.ts`、`barcode-scanner-overlay.tsx`
- 测试迁移：`use-barcode-camera.test.ts`（13 用例 mock 迁移 + 判别断言）、`barcode-detector-utils.test.ts`（5 处 stub 迁移）、`camera-utils.test.ts`（mock 全为 defineProperty，必然受影响）
- `docs/discussions/2026-10-24-env-camera-channel-inv2-proposal.md`（段 2 提案，待人审标注）
- `docs/audits/arm2-index.md` 部分收敛注记 + daily log + roadmap R1.4 翻转（激活/收口两提交）

### Out Of Scope

- RendererEnv 接口变更；扫描器；owner doc 改动；并发线（ARC 716/717 线、三项遗留）。

## Failure Paths

| 可测场景编号   | 触发                           | 行为                                           | 可重试 | 用户可见表现                 |
| -------------- | ------------------------------ | ---------------------------------------------- | ------ | ---------------------------- |
| behavior-drift | 迁移后任一通道行为与现行不一致 | 等价性判别测试拦截（迁移用例须全绿）           | 是     | 摄像头/检测/在线提示行为不变 |
| human-gate     | 段 2 提案被驳回或要求改设计    | 提案文档记录意见回炉重提                       | 是     | 提案状态标注反映裁定结果     |
| hidden-channel | 执行中发现第 5 通道直调        | 停：同批收编（边界接口扩展）或显式改判，不静默 | 是     | 边界模块全通道覆盖           |

## Test Strategy

本档选择：**必须自动化**——等价迁移判别：①各文件既有用例（hook 13 + detector-utils + camera-utils）迁移到边界注入后全绿 = 行为零变化证明；②新增全局访问零化探针（注入 spy IO + `Object.defineProperty` 监视全局访问计数：旧实现必触全局必红，新实现零访问）。

## Execution Plan

### Phase 1 - 单点注入边界（段 1）

Status: planned
Targets: utils/barcode-media-io.ts + 四消费文件 + 三测试文件

- Item Types: `Fix | Proof`

- [ ] 新建 `utils/barcode-media-io.ts`：`BarcodeMediaIO` 接口（getUserMedia / createBarcodeDetector〔含 ZXing ponyfill 回退形态〕/ online 快照订阅 / enumerateDevices+isSecureContext 探测四通道形状）+ `defaultBarcodeMediaIO`（各通道现行逻辑原样迁入）+ 模块头部 INV-1 在案裁决注记（援引提案文档：通道未裁定期内为在案治理点）；ZXing ponyfill 回退依赖的 wasmFetcher 须经边界注入传递（源自 env.fetcher，防硬连回浏览器 fetch 破坏已合规路径）
- [ ] 四消费文件改经边界消费（hook/camera-utils 经参数或模块注入；detector-utils 工厂经边界；overlay 的 useSyncExternalStore 快照源改经边界订阅）
- [ ] 判别探针先红：注入 spy IO + 全局访问计数监视，断言零全局访问——旧实现必红（红证落账）
- [ ] 迁移实装后全绿：既有用例（13 + detector-utils + camera-utils）迁移 mock 至边界注入后全部通过（等价证明）

Exit Criteria:

- [ ] 四消费文件 grep 直调 `navigator.mediaDevices|window.BarcodeDetector|navigator.onLine|window.isSecureContext` = 0（唯一触点在边界模块默认实现）；红绿证据链在案；既有用例全绿

### Phase 2 - INV-2 提案与收口

Status: planned
Targets: `docs/discussions/`、arm2-index、roadmap、daily log

- Item Types: `Decision | Proof`

- [ ] 提案文档：`env.mediaDevices?` optional 通道设计（沿 plan-512 契约结构：字段形状/capability check/宿主代理/四通道消费迁移路径），状态标注「待人审（Cross-Cutting 8）」
- [ ] arm2-index P1-MA2.3-001 部分收敛注记（段 1 落地 + 提案指针；状态保持 `open` 待人审闭环）
- [ ] draft review 通过后：R1.4 `todo`→`planned` 翻转入激活提交，plan→`active`；closure audit approved 后 R1.4 `planned`→`done`（部分收敛标注：env 通道待人审）+ plan→`completed`
- [ ] daily log 追加；两提交显式路径、并发线不入 stage

Exit Criteria:

- [ ] 提案文档落盘（待人审标注在）；finding `open`+注记与 R1.4 `done` 部分收敛标注一致（When Closing 11）；提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_a55222ea`（R1 判 **FAIL** 1B+3M：B1 Baseline 三通道误归单文件实为四通道四文件+第四通道 enumerateDevices/isSecureContext 漏登记、M1 关闭会计不成立〔段 1+未审提案≠消解〕、M2 行 scope 矛盾〔env 通道治理 vs 整行 done〕、M3 测试设计建立在错误基线〔Object.defineProperty 非 vi.stubGlobal、13 非 8、关联测试未纳入〕+ m1 utils/ 落位、m2 判别机制写明、m3 human-gate 可重试、m4 owner-doc drift 交代）——本 v2 全部吸收重写
- Verdict: R1 `FAIL` → v2 重写 → R2 **pass**（0B/0M after R2-M1 count fix；reviewer 确认机械修正即闭、无需第三轮全文重审）
- Rounds: 2
- Findings addressed: B1→Baseline 重写四通道四文件、In Scope 扩员、边界接口按真实形态（特性检测工厂/ZXing 回退/响应式快照/enumerateDevices）设计、或收窄 Goals 已采「全通道收编」路；M1→关闭会计改部分收敛（finding 保持 open + 注记、边界模块 INV-1 在案裁决注记援引提案）；M2→R1.4 done 带部分收敛标注（When Closing 11）；M3→测试迁移章节按 Object.defineProperty + 13 用例 + 关联测试文件重写；m1→utils/ 落位；m2→判别机制写进 Phase 1；m3→human-gate 改可重试；m4→Closure Gates 交代 owner-doc 不改理由——均已落字；R2: R2-M1 计数修正（vi.stubGlobal 4 处非 5，round-1 M3 笔误随迁已订正）、m5 camera-utils.test.ts 确定性表述、m6 ponyfill wasmFetcher 经边界注入传递防硬连——verdict pass 达成共识

## Closure Gates

- [ ] 四消费文件直调清零（grep 实证）+ 判别探针先红后绿在案
- [ ] 既有用例等价全绿（hook 13 + detector-utils + camera-utils 迁移后）
- [ ] 边界模块 INV-1 在案裁决注记在（援引提案）
- [ ] 段 2 提案文档落盘且待人审标注在
- [ ] arm2-index 部分收敛注记在（finding 保持 `open`）+ roadmap R1.4 `done` 部分收敛标注一致（When Closing 11）
- [ ] 不存在被静默降级的 in-scope 项
- [ ] owner-doc 交代在案（renderer-env.md 不改理由：通道未裁定期以边界+提案为在案治理）
- [ ] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（待执行中落账。）

## Non-Blocking Follow-ups

- env camera 通道实施（提案人审通过后）随独立 plan 落地——finding 转 closed 的闭环义务随提案文档与 arm2-index 注记传递。
- 扫描器 camera 族盲区（P2 同源）归 MG/MA8.3 工具面批。

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:
