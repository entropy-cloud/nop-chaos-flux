# 861 导航 URL 安全与外部数据键安全（URL 守卫绕过 / navigate 动作闸 / mergeJson 危险键 / 调试面板正则）

> Plan Status: completed（draft review pass-with-minors；closure audit approved，见 Closure Audit Evidence）
> Last Reviewed: 2026-11-10
> Source: `docs/analysis/2026-11-06-full-repo-deep-audit.md` §2（S1–S4）
> Related: `docs/architecture/security-design-requirements.md`（owner doc，R3/R6/R7/R8）、`docs/architecture/flux-core.md`（url.ts 归属）

## Purpose

把 2026-11-06 深审 S 组四条安全缺陷收口：修复可被空白/控制字符绕过的 `isSafeNavigationUrl`（High）；让 `navigate` 动作走同一守卫（Medium）；`mergeJson` 跳过危险键（R6）；调试面板正则过 ReDoS 门禁（R7）。owner doc 补一条导航 URL 规则，使"守卫存在"与"守卫有效"都有判别测试兜底。

## Current Baseline

- `packages/flux-core/src/utils/url.ts:41-52` `isSafeNavigationUrl`：`/^([a-z][a-z0-9+.-]*):/i` 不匹配即判安全。探针（`_tmp/audit-1106/url-probe.mts`）实证 `" javascript:…"`、`"\tjavascript:…"`、`"java\nscript:…"`、`"\u0001javascript:…"` 判 safe，而 `new URL()` 解析为 `javascript:`。
- 消费方：`flux-renderers-content/src/link.tsx:49`、`flux-renderers-basic/src/button.tsx:269`、`flux-renderers-content/src/sanitize.ts:76`（R8 hast URL 属性净化）。既有测试：`flux-renderers-basic/src/__tests__/button-href-safety.test.tsx`、`flux-renderers-content/src/sanitize.test.ts`——均未覆盖空白/控制字符变体；flux-core 本身无 url.ts 单测。
- `navigate`：`flux-action-core/src/action-dispatcher/built-in-actions.ts:300-315` 只做 `typeof url === 'string'`；`flux-runtime/src/action-adapter.ts:479-494` 直传 `env.navigate(args.url)`。
- `flux-core/src/json-merge/merge-json.ts:101-117`（`mergeObject`）与 `:22-29`（`stripMarkers`）对 delta 键无危险键过滤；`mergeJson` 从 flux-core 公开导出。
- `nop-debugger/src/panel.tsx:110-119` `parseRegexLiteral` 直接 `new RegExp`。
- Protected area：`packages/flux-core/src/` 为 plan-first（本 plan + owner doc `security-design-requirements.md` 满足证据要求）；改动不改任何公开导出签名（`isSafeNavigationUrl` 签名不变，仅语义收紧）。

## Goals

- `isSafeNavigationUrl` 与浏览器 URL 解析一致：任何会被浏览器解析为非 allowlist scheme 的输入都判不安全；无法解析的输入 fail-closed。
- `navigate` 动作在 action-adapter 层对 `args.url` 过守卫，不通过时返回 `ok: false`（不调用 `env.navigate`），错误可观测（R4）。
- `mergeJson` / `stripMarkers` 跳过 `__proto__`/`constructor`/`prototype`（R6）。
- 调试面板正则过 `isBacktrackingSafePattern`（R7）。
- owner doc 新增导航 URL 规则（R10），列明 allowlist、归一化语义、消费方清单。

## Non-Goals

- 不改 allowlist 本身（`http/https/mailto/tel/data` + download 下的 `blob`）。
- 不处理宿主侧 fetcher/openSocket 策略（仓库外）；不处理 S5/F5 Info 项（WebSocket URL schema 可控属设计能力）。
- 不改 DOMPurify 配置或 R8 管线结构。

## Scope

### In Scope

- `packages/flux-core/src/utils/url.ts` + 新增 `url.test.ts`
- `packages/flux-runtime/src/action-adapter.ts`（navigate 分支）+ 对应测试
- `packages/flux-core/src/json-merge/merge-json.ts` + 测试
- `packages/nop-debugger/src/panel.tsx` + 测试
- 消费方回归：button/link/sanitize 既有测试补空白变体用例
- `docs/architecture/security-design-requirements.md`（新增 R10）

### Out Of Scope

- 其他 URL sink（如 `image` src、iframe src）的新守卫——本轮审计未发现可执行脚本的 sink；若执行中发现，按 Failure Paths `scope-expansion` 处置
- playground `showcase-env.ts` 宿主 navigate 实现

## Failure Paths

| 场景                   | 触发                                                                            | 行为                                                                                    | 可重试 | 用户可见表现                              |
| ---------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ | ----------------------------------------- |
| url-normalized-bypass  | href / markdown 链接 / navigate url 为 `" javascript:…"`、`"java\nscript:…"` 等 | 守卫判不安全：link/button 不渲染 href；hast 属性被剥离；navigate 返回 `ok:false` 不跳转 | 否     | 链接不可点击 / 导航不发生，console 有诊断 |
| url-unparseable        | `new URL` 抛错的输入（如 `http://[`）                                           | fail-closed 判不安全（R3）                                                              | 否     | 同上                                      |
| relative-url-unchanged | `/x`、`#a`、`./y`、`plain`                                                      | 仍判安全（行为不变）                                                                    | —      | 正常跳转                                  |
| merge-dangerous-key    | delta 含 `__proto__` own key                                                    | 该键被跳过，结果对象原型不变                                                            | 否     | 无                                        |
| debugger-redos         | 面板过滤输入超线性正则                                                          | 拒绝编译，返回 null，按字面量处理或提示                                                 | 是     | 过滤不生效，不卡死                        |

## Test Strategy

档位选择：`必须自动化`——安全守卫。每个 Fix 之前先写在旧实现下必挂的判别测试（Proof 先于 Fix）。

## Execution Plan

### Phase 1 - 判别性测试先行（红）

Status: completed
Targets: `flux-core/src/utils/url.test.ts`（新）、`flux-runtime` action-adapter 测试、`flux-core/src/json-merge/*.test.ts`、`nop-debugger` 测试

- Item Types: `Proof`

- [x] url.test.ts：上表 bypass 输入全部断言 `false`；相对路径（`/x`、`#a`、`?q=1`、`./y`、`plain`）与协议相对 URL `//cdn.example.com/x` 断言 `true`；allowlist scheme（`mailto:`/`tel:`/`data:`）断言 `true`；`blob:` 无 download `false` / 有 download `true`；不可解析输入（`http://[`）断言 `false`
- [x] navigate 测试：`args.url = " javascript:alert(1)"` 时 `env.navigate` 未被调用且结果 `ok:false`；合法 URL 正常调用
- [x] mergeJson 测试：delta `JSON.parse('{"__proto__":{"polluted":1}}')` 合并后结果对象 `Object.getPrototypeOf(out) === Object.prototype` 且无 `polluted`；`stripMarkers` 同
- [x] nop-debugger 测试：超线性正则字面量不被编译（不挂起、返回 null）
- [x] 实跑确认上述在旧实现下红，失败输出记入当日 log

Exit Criteria:

- [x] 四组判别测试在旧实现下均红（红证据在案）

### Phase 2 - 修复

Status: completed
Targets: `url.ts`、`action-adapter.ts`、`merge-json.ts`（+ `utils/path.ts` 内部导出）、`panel.tsx` → `panel-search.ts`

- Item Types: `Fix`

- [x] `isSafeNavigationUrl`：以**固定 base**（不可达的固定 https origin，不依赖 `location`）`new URL(input, base)` resolve 后取 `protocol` 判定——禁止无 base 的 `new URL(input)`（会让所有相对 href 抛错被误杀）；解析失败 → 不安全；`blob:` download 例外保持
- [x] action-adapter navigate：`isSafeNavigationUrl(args.url)` 不通过 → `ok:false` + 错误说明，不调用 `env.navigate`
- [x] merge-json：`mergeObject`/`stripMarkers` 跳过三危险键（复用 flux-core 既有危险键集合，若无则就近定义并注明 R6）
- [x] panel.tsx：`parseRegexLiteral` 过 `isBacktrackingSafePattern`
- [x] 消费方回归：button-href-safety / sanitize 测试补空白/换行变体用例

Exit Criteria:

- [x] Phase 1 全部判别测试转绿；flux-core / flux-runtime / flux-action-core / flux-renderers-basic / flux-renderers-content / nop-debugger 包测试全绿
- [x] `docs/architecture/security-design-requirements.md` 新增 R10（导航 URL 规则）并在 R6/R7 live sites 列表补入本轮位点

## 执行中裁决（2026-11-06）

① **红证据**：url.test.ts 旧实现 11 红（空白/控制字符/换行变体 + blob 下载例外内的变体 + 不可解析输入；`_tmp/audit-1106/861-url-red.log`）；navigate 3 红——**连裸 `javascript:alert(1)` 都会到达 `env.navigate`**（`861-navigate-red.log`）；mergeJson 3 红（`861-merge-red.log`）；debugger 3 红（`861-debugger-red.log`）。
② **消费方判别**：button-href-safety 新增 4 个变体用例、sanitize（R8 树过滤）新增 3 个——把 `url.ts` 临时换回 HEAD 时分别 4 红 / 3 红，修复版全绿（备份还原 + diff 核验）。
③ **debugger 落点**：`parseRegexLiteral`/`matchesSearchQuery` 原为 `panel.tsx` 模块私有，为能经真实模块测试，纯搬移到新文件 `panel-search.ts`（搬移后包测试 166/166 不变），再加门禁。
④ **门禁语义**：初版测试把 `(.*a){12}` 当作应拒绝的模式——R7 门禁按设计接受小的有界重复（只拒绝无界/宽量词下的歧义组），这是测试假设错误而非门禁缺口；改用门禁实际拒绝的 `(.*a)+$`、`.*.*.*x`（探针 `_tmp/audit-1106/regex-probe.mts` 核实）。
⑤ **危险键集合复用**：`flux-core/src/utils/path.ts` 的 `DANGEROUS_PATH_SEGMENTS` 改为模块内导出（不进 `index.ts`，公开导出面不变）供 merge-json 复用，避免第三份同义集合。

## Draft Review Record

- Reviewer / Agent: 独立子代理（fresh session，探针 `_tmp/review-861-862/url-probe.ts`）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: round 1（独立子代理，2026-11-06）verdict pass-with-minors，零 Blocker/Major；2 Minor 已吸收——Phase 2 写死固定 base（防无 base 实现误杀相对 URL）；Phase 1 用例补协议相对 URL `//cdn.example.com/x` 等区分实现路径的输入

## Closure Gates

- [x] S1–S4 全部修复且判别测试先红后绿
- [x] owner doc R10 + R6/R7 live sites 已同步
- [x] 不存在被静默降级的 in-scope live defect
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` exit 0（scanner-baseline 增长 793→794 / 346→347 已按先例登记，见 reRegistrationNotes 2026-11-10 plan 861 条）

## Deferred But Adjudicated

（无——执行中若有改判当场落节）

## Non-Blocking Follow-ups

- WebSocket URL（`flux-renderers-3d/src/data-source/industrial-adapter.ts:69`）schema 可控属设计能力，若未来改为数据驱动需另评估。

## Closure

Status Note: S1–S4 全部落地且判别测试先红后绿（红证据 11/3/3/3）；五项验证命令（typecheck/build/lint/test/check）exit 0（861-closure-verify.log，check 的 scanner-baseline +1 已按先例登记）；owner doc R10 + R6/R7 同步完成。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_676daf54（fresh session）
- Evidence: git diff 逐文件核对四修复（固定 base resolve + fail-closed / navigate ok:false 闸 / 危险键跳过含 delta 路径 / panel-search 门禁）；判别测试断言逐文件核验；红证据日志 861-{url,navigate,merge,debugger}-red.log；owner doc R10/R6/R7 核验；focused 实跑 flux-core 846、nop-debugger 172、flux-runtime 1571、basic 550、content 386 全绿；scanner-baselines 登记条目与 url.ts:54 / panel-search.ts:18 实况一致。详见 docs/logs/2026/11-10.md。

Follow-up:

- WebSocket URL（industrial-adapter.ts:69）schema 可控属设计能力（Non-Blocking Follow-up 沿袭）。
