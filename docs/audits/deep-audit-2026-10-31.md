# Deep Audit 2026-10-31（全仓深度审计报告）

> Status: final
> Date: 2026-10-31
> Method: 全量验证链实测（typecheck/build/lint/check/test）+ 4 个独立 fresh 子代理并行审计（仓库卫生与规范 / 文档一致性与 plan 治理 / 代码质量热点 / 依赖与供应链）+ 关键发现逐条 live 复核
> Evidence: 原始日志 `_tmp/audit-2026-10-31-logs/`（verify-chain / check / check-rest / test 四份）
> 工作区口径：审计期间工作区存在并行会话 plan 801（CRM 商机看板）WIP（`complex-pages-model.ts`、`showcase-env.ts`、`crm-opportunity-kanban.json`、`mock-backend-repl-crm.ts`、`replication-crm-opportunity-kanban.spec.ts`、roadmap 回写、pnpm-lock.yaml mall-mobile importer 清理）。本报告所有发现已逐一甄别"master 代码 vs 801 WIP"，801 WIP 引入的问题（如 `mock-backend-repl-crm.ts` 相关）不在本报告修复范围。

## 0. 验证链基线（2026-10-31 实测）

| 门禁                | 结果            | 明细                                                                                                                                                                              |
| ------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | ✅ 全绿         | 全部包通过                                                                                                                                                                        |
| `pnpm build`        | ✅ 全绿         | 全部包通过                                                                                                                                                                        |
| `pnpm lint`         | ❌ **1 error**  | `packages/flux-bundle/src/__tests__/mall-ds-ajax.test.tsx:53` unused eslint-disable directive（no-console）——全仓 46 个 lint task 唯一失败                                        |
| `pnpm check`        | ❌ **4 项失败** | `workspace-manifest-deps`、`audit-ui-consistency-gaps`、`owner-doc-semantics`、`deps-baseline`（明细见 §1；`&&` 链于 workspace-manifest-deps 断裂，其余 24 项已逐一单跑核实全绿） |
| `pnpm test`（单测） | ✅ 全绿         | **17,346 passed / 0 failed**（46 个 vitest project；含 scheduling 1094、playground 545、flux 13、nop-debugger-ai 59 等）                                                          |
| e2e                 | 未重跑          | 本轮审计不含全量 e2e；最近全量/分域运行证据见 `docs/logs/2026/10-26..10-30.md`；`check:e2e-flake-ledger` 实测绿（1565 tests，3 @watch-only 与台账一致）                           |

结论：**master 处于"单测全绿、门禁带 5 处红"状态**。5 处红全部可归因到 mall-mobile 退役（dc4d8bf97）与 plans 799/800 落地面，无一来自并行会话 801 WIP。

## 1. 门禁红清单（A 类：立即修复，最高优先级）

### A1 lint 红（NEW，未登记）

- 位置：`packages/flux-bundle/src/__tests__/mall-ds-ajax.test.tsx:53`
- 现象：`// eslint-disable-next-line no-console` 指令已无效果（eslint.config.js 的 no-console 门禁为 `allow: ['warn','error']`，`console.log` 应报——但该行为仍不报，说明测试文件作用域存在更宽的豁免），`report-unused-disable-directives` 将其升为 error。
- 归因：mall-ds 测试由 80fec284b 落地；dc4d8bf97（mall-mobile 退役）之后 lint 配置/作用域演化使指令失效。
- 处置：删除该行 disable 注释（Plan 820）。

### A2 check:workspace-manifest-deps 红（plan 799 Deferred 继承条）

- 位置：`packages/flux-bundle/src/index.tsx` imports `@nop-chaos/flux-renderers-mobile`，未声明于 `packages/flux-bundle/package.json`（幽灵依赖）。
- 归因：registerDefaultFluxRenderers 内 `registerMobileRenderers(registry)`（index.tsx:52，注释明示壳移动端形态依赖缺省注册）——代码意图明确，仅 manifest 缺声明。
- 处置：补 `"@nop-chaos/flux-renderers-mobile": "workspace:*"`（Plan 820）。

### A3 check:audit-ui-consistency-gaps 红（NEW high，plan 800 落地面）

- 位置：`apps/playground/src/complex-pages/shared/mock-backend-repl-wms-stock.ts:168`（已跟踪 master 代码，bb85256cc 落地）
- 现象：`data-blob-href-without-download` —— `url: data:text/csv;...` 被判"浏览器拦截顶层导航致导出静默失败"。
- **live 复核结论：扫描器误报**。运行时 download action（`packages/flux-runtime/src/runtime-action-helpers.ts:387-390`）对 `data:` URL 走 `dataUrlToBlob` → `downloadBlob`（`async-data/blob-download.ts`：`URL.createObjectURL` + `<a download>` 点击，40s 后 revoke），不存在顶层导航；W3 e2e 亦断言过导出。
- 处置：按扫描器既定机制在 `scripts/audit/ui-consistency-exemptions.mjs` 登记该实例豁免（带 reason + 归因 backlink），非改代码（Plan 820）。

### A4 check:owner-doc-semantics 红（plan 799 Deferred 继承条）

- 现象：`bundle-default-registration-face: doc count 9 differs from live call count 10 in registerDefaultFluxRenderers`——`docs/architecture/flux-runtime-module-boundaries.md` 记 9 个缺省注册面，live 为 10（basic/form/form-advanced/data/content/layout/mobile/scheduling/three/xlang-debug-editor，`packages/flux-bundle/src/index.tsx:44-63` 逐行核对）。
- 处置：owner doc 就地更新为 10 并逐名列出（Plan 820）。

### A5 check:deps-baseline 红（NEW，plan 800 落地面）

- 现象：新增未登记循环依赖签名 `apps/playground/src/complex-pages/shared/mock-backend-repl-wms-stock.ts -> mock-backend-repl-wms.ts`（live 58 vs registered 57）。
- 归因：stock 文件由 plan 800 落地；798/799 Deferred 未覆盖该签名，800 收口时 check 归因未含此项（见 §6）。
- 处置：优先解环（审查 stock→wms 的 import 是否可用类型下沉/拆分消除）；如确属 mock 模块既有分层约定则 conscious re-register（Plan 820，执行时按 live import 实况裁决）。

## 2. 供应链（B 类：高危，独立 plan）

`pnpm audit --prod`：**40 vulnerabilities（3 critical / 12 high / 19 moderate / 6 low）**；全量 128（5 critical / 53 high）。

| #   | 包                                            | 装机             | 修复版            | 直/间 | 严重度                                                                     |
| --- | --------------------------------------------- | ---------------- | ----------------- | ----- | -------------------------------------------------------------------------- |
| B1  | jspdf（flux-print-core 直接依赖）             | 2.5.2            | ≥4.2.1            | 直    | **2 critical**（LFI/路径穿越、HTML 注入）+ 8 high                          |
| B2  | minimist（visactor→geojson 链）               | 1.2.0            | ≥1.2.8            | 间    | **critical** 原型污染（pnpm override，树内已有安全副本）                   |
| B3  | lodash（visactor/vtable 链）                  | 4.17.21          | ≥4.18.1           | 间    | high `_.template` 代码注入（override，树内已有 4.18.1）                    |
| B4  | dompurify（flux-renderers-content 直接依赖）  | 3.4.11           | ≥3.4.17           | 直    | high IN_PLACE bypass + 4 moderate；jspdf 链另带 2.5.9 旧副本（随 B1 消解） |
| B5  | @tiptap/core + prosemirror-view（playground） | <3.30.5 / 1.41.9 | ≥3.30.5 / ≥1.42.3 | 直/间 | high ReDoS / XSS                                                           |
| B6  | katex（playground 直接依赖）                  | 0.16.47          | ≥0.18.2           | 直    | moderate ×2                                                                |
| B7  | happy-dom（dev/test DOM）                     | —                | 升级              | 间    | **critical** VM 逃逸（仅测试面）                                           |
| B8  | undici / brace-expansion / fast-uri（dev 链） | —                | lockfile 刷新     | 间    | high 各 1+                                                                 |

低危卫生项：`flux-renderers-mobile` 3 处 `workspace:^` 应为 `workspace:*`；`tailwind-preset` `^4.2.2` vs 根 `^4.3.3` 区间漂移；jspdf 2→4 为跨大版本迁移（API breaking，需专项核对 print-core 调用面 + focused tests）。

## 3. 仓库卫生（C 类）

| #   | 发现                                                                                                                                                                                                                                             | 规模         | 处置归类                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------- |
| C1  | `_tmp/` 156 MB / 9,674 文件：`head-wt2/` 132 MB 嵌套 git worktree 副本（10-27）、`ph9-e2e/` 16 MB（10 MB results.json）、`depcruise.json` 6.3 MB、散置探针脚本/日志（fix781/close781/fill4/wb782b、ph17-_.log、discover-_.txt 等，10-26..10-28） | 156 MB       | AGENTS.md 明文"无用即删"；全部 ≥3 天陈旧 → Plan 821 清理（保留 ≥10-29 可能被并行会话使用的少量项）          |
| C2  | 跟踪的 0 字节文件 `pnpm`（仓库根，4 月入）                                                                                                                                                                                                       | 1 文件       | 误 add 遗留 → `git rm`（Plan 821）                                                                          |
| C3  | pnpm-lock.yaml 残留 mall-mobile importer（dc4d8bf97 退役未同步 lockfile）                                                                                                                                                                        | -69 行 drift | 工作区已有修正（801 WIP 的一部分）；随 Plan 821 落定提交（归因 dc4d8bf97 遗留）                             |
| C4  | ~20 处 ungoverned `test.skip`/`describe.skip` 诊断性 e2e spec（flake 台账只机械管 `@watch-only`）                                                                                                                                                | ~20 处       | 治理缺口 → watch-only/优化候选（§7 Deferred），暂以 spec 命名（diagnostic/exploratory/subagent-\*）自证意图 |
| C5  | `fm3-contract-probes.test.tsx:377` `it.skip` characterization 测试                                                                                                                                                                               | 1 处         | Plan 822 附带处置（启用/删除/注明三选一）                                                                   |
| C6  | TODO exitless 唯一新命中：`flux-renderers-scheduling/src/gantt/undo-stack.ts:194`（Gantt/Kanban undo 去重）                                                                                                                                      | 1 处         | 裁决或登记（Plan 822 附带）                                                                                 |
| C7  | 本地杂项：`.DS_Store` 散置、`.playwright-mcp/` 122 项、`tmp/` 31 MB 构建缓存                                                                                                                                                                     | 本地         | Plan 821 顺带清扫（全部 ignored，无跟踪风险）                                                               |

## 4. 代码质量（D 类：总体非常干净）

10 个维度全部扫描：**所有计数型 scanner 均在登记基线内**（react19 667<694、async 353<373、styling 254<255、discover 800<825、test-leaks 115<120、as-any 41=41、duplicates 533<597、knip/console 零新增）。`@ts-ignore` 全产品码 0 处；空 catch 0 处；raw-schema-reads / hardcoded-dispatch / event-ctx 全绿。

值得排队的优化候选（全部为已登记基线内的收缩空间，非违规）：

> **勘误（2026-10-31 独立评审后）**：初稿 D1 把 knip 的 "9 registered entries can be shrunk" 误读为"9 项活死代码"。评审以 `npx knip --reporter json` 实跑证实：该 9 项是**基线中 knip 已不再报告的陈旧行**（收缩即可，无需改码）；唯一 live dead item 是 `UseDataSourcesArgs`（`flux-renderers-3d/src/renderer/hooks/use-data-sources.ts`）；`dragReplicationCard` 已被落地 e2e spec 引用（非死代码）；`renderFileListSidebar` 在源码中已不存在。D3 的产品码 as-any 实为 **11 处**（初稿 8 处漏计 barcode-input 3 处的归属与 flux-compiler fields.ts:84）。下表已按勘误后口径重写。

| #   | 项                                                                                                                                                             | 规模   | 备注                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| D1  | knip：1 项 live dead item（`UseDataSourcesArgs`）删除 + 8 条陈旧基线行手术收缩（含条件已成立的 dragReplicationCard 行、路径已失效的 renderFileListSidebar 行） | 1 + 8  | 收缩须 surgical hand-edit（knip-baseline.json header 硬规则，禁 --update-baselines）→ Plan 822 |
| D2  | redundant-use-memo 398 / redundant-use-callback 204 / derived-state-in-effect 49（React Compiler 已自动 memo 化）                                              | 651 处 | 大批量机械收缩 → Deferred（分批后续轮次）                                                      |
| D3  | as-any 产品码子集 11 处（evaluator:114,400、calendar ×2、gantt-grid、kanban ×2、barcode-input ×3、flux-compiler fields.ts:84）                                 | 11 处  | → Plan 822（demo 页 ~30 处保持登记）                                                           |
| D4  | calendar day/week/month 克隆家族（jscpd 14 行克隆、已出现 `长 按` 等复制漂移痕迹）+ use-gantt-link-draw / input-group 自克隆                                   | 3 族   | 重构候选 → Deferred（有回归风险，需独立 plan 节奏）                                            |
| D5  | async failure-path 收缩：debug-client.ts（9）、button.tsx（7）                                                                                                 | 353→   | Deferred（demo 页占比高）                                                                      |

## 5. 文档与治理（E 类：数量最大，需按 Rule 21 分诊）

| #   | 发现                                                                                                                                                                                                                                                                                                                        | 规模      | 处置归类                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| E1  | **87 份 `completed` plan 残留未勾选 `- [ ]`**（最重：2026-07-29-row-scope 62 项、476 23 项、570 18 项…；抽查证实代码已落地、仅 checklist 未回勾）                                                                                                                                                                           | 87 份     | guide Rule 21：completed 历史计划默认不改写。→ 登记为已接受治理债 + 前向纪律（执行即勾），不批量回写（§7 Deferred，附明确理由） |
| E2  | 活跃 plan 状态滞留：`arc-gap-g2i-inline-edit-impl-plan.md` status `planned` 但 25/25 全勾；`640-cross-roadmap-ur13-edge-router-plan.md` status `draft` 但 18/18 全勾（含"209/209 绿"执行结果文本）                                                                                                                          | 2 份      | **真治理矛盾** → Plan 824 独立 closure audit 后翻转状态                                                                         |
| E3  | plan 编号撞号 21 个（436/448/453/470/640/643/664-669/713/718/719/724-729，并行系列交叉）                                                                                                                                                                                                                                    | 21 个     | 历史事实，不回写；前向可考虑唯一性检查 → Follow-up                                                                              |
| E4  | docs 超 50 KB 184 份（284 份超 40 KB）：最大 workaround-ledger 408 KB、`docs/index.md` 132 KB、`renderer-runtime.md` 122 KB                                                                                                                                                                                                 | 184 份    | 已有 owner plan 784（doc splitting，draft）→ Successor-owned，本轮不重立                                                        |
| E5  | AGENTS.md ui 组件清单缺 ~23 个已导出组件族（Accordion/Alert/Calendar/Carousel/ColorPicker/Command/…，逐一对照 `packages/ui/src/index.ts` 核实存在）                                                                                                                                                                         | ~23 族    | → Plan 823 清单刷新                                                                                                             |
| E6  | `docs/references/quick-reference.md` 缺 Last Reviewed 标记（内容抽查 4/4 准确，git 近期活跃维护）；自身 65 KB 超拆分线                                                                                                                                                                                                      | 1 文件    | → Plan 823 补标记（拆分归 784 口径）                                                                                            |
| E7  | `docs/context/project-context.md` 头部验证基线停在 2026-08-09（DV 全绿），`fresh` 依赖 10-17/10-30 增量注记支撑                                                                                                                                                                                                             | 1 文件    | → Plan 823 以 2026-10-31 实测基线刷新注记                                                                                       |
| E8  | `component-audit-roadmap.md`（201 KB）零剩余 todo、48 done，但无显式收口 banner；路线图 M1-M4 里程碑标签与 MES 工作项 M1-M3 撞名                                                                                                                                                                                            | 1 文件    | → Plan 823 补 banner；撞名为低危登记                                                                                            |
| E9  | docs-garbled：25 "likely garbled"。**勘误（评审后）**：非全数 ç 误报——真实构成为五族：11 ç（façade）、accented/Greek/German 字母族（引用原文/数学符号）、Cyrillic 同形字族（wa-15a/report.md，**疑似真 homoglyph 缺陷须检视**）、1 个 zero-width joiner（arm2-MA9.4 plan，**真缺陷须删**）、2 个 vendor 生成 bundle（豁免） | 25 项五族 | → Plan 823 分族处置                                                                                                             |
| E10 | 离词表 plan 状态 5 处（abandoned/planned（...）/executed/**complete**）                                                                                                                                                                                                                                                     | 5 处      | 历史文件不回写（Rule 21），登记即可                                                                                             |

## 6. 归因与治理观察（事实记录，不追溯翻案）

1. plan 800（bb85256cc）收口时将 check 红归因为"并行会话 WIP + 798/799 Deferred 既有红"。本轮实测：**A3（ui-consistency）与 A5（deps-baseline 新签名）源自 800 自己落地的 `mock-backend-repl-wms-stock.ts`**，798/799 Deferred 清单未含这两项。属完成声称与门禁实况的局部漂移（Lessons 2.0 模式 1 的门禁版），本报告不回写 800 文本（Rule 21），由 Plan 820 修复红本身。
2. 单测基线健康：17,346/0 全绿说明近期高频收口节奏下回归面控制良好；红集中在静态门禁而非行为。
3. e2e 台账机制运转正常（@watch-only 3 处与台账一致）；skip 治理面（C4）是台账机制未覆盖的相邻缺口。

## 7. 工作项 → Plan 映射与队列

> **编号勘误（2026-10-31）**：初稿使用 802-807，但并行会话已实际占用 802（business-replication C2）——本报告 §5 E3 的撞号问题在撰写当天即再次发生。本队列改号 **820-825**，让出 803-819 给 business-replication 后续页。评审对初稿的其余证伪（D1/D3/E9）已就地勘误于 §4/§5。

| Plan                     | 结果面                          | 内容（来源项）                                                                            |
| ------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------- |
| **820 门禁红收敛**       | repo gates 全绿                 | A1-A5（lint 1 + check 4）+ lockfile mall-mobile 清理落定                                  |
| **821 仓库卫生**         | 工作区/跟踪面干净               | C1、C2、C7 + `_audit-*.log` 归档（C3 lockfile 移交 820）                                  |
| **822 死代码与基线收缩** | knip 零 live findings、基线收紧 | D1（勘误后 1+8）、D3（11 处）、C5、C6 + console 基线收缩                                  |
| **823 文档同步**         | owner/导航文档对齐 live         | E5-E9（E9 分族处置）+ 本报告落档 + daily log                                              |
| **824 治理面收口**       | 活跃 plan 状态与实况一致        | E2（两份 plan 的独立 closure audit + 翻转）；E1/E3/E10/E4 登记 Deferred/Follow-up         |
| **825 供应链加固**       | prod 审计 criticals→0           | B1-B8（B5 定位勘误：tiptap 真实声明面在 form-advanced/ai）+ workspace:^/tailwind 区间卫生 |

执行顺序：820 → 821 → 822 → 823 → 824 → 825（825 置尾：lockfile 变更集中一次，且 jspdf 大版本迁移风险最高）。每个 plan 按 guide 走：draft → 独立子代理 review（零 Blocker/Major 升 active）→ 执行 → 独立子代理 closure audit → 回写同 commit。

### Deferred But Adjudicated（本审计裁定的不立即执行项）

| 项                            | 分类                   | Why Not Blocking                                                      |
| ----------------------------- | ---------------------- | --------------------------------------------------------------------- |
| E1 87 份历史 plan 未勾选项    | watch-only residual    | Rule 21 明文禁止为模板一致性回写历史计划；代码实测已落地，无行为债    |
| E4 184 份 docs 超长           | successor-owned        | owner plan 784 已存在（draft），不重立重复 plan                       |
| D2 react19 651 处收缩         | optimization candidate | 基线内债务，机械量大、无行为风险，适合分批轮次                        |
| D4 calendar/gantt 克隆族      | optimization candidate | 重构有回归风险，需独立验证节奏，不宜搭车                              |
| C4 ~20 处 ungoverned skip     | watch-only residual    | 均为 diagnostic/exploratory 命名 spec，无隐藏行为；治理机制扩展留后续 |
| B7 dev 链升级（happy-dom 等） | optimization candidate | 仅测试面暴露，随 807 顺带或后续 lockfile 刷新                         |
| E3 撞号 / E10 离词表状态      | watch-only residual    | 历史事实不可改；前向唯一性检查属新门禁契约，需独立裁决                |

## 8. 复审口径

"无新可优化内容"的裁定标准：上述 A-E 五类之外，四个审计维度在本轮均报告"其余全部在登记基线内"。Plan 820-807 收口后，若剩余项全部落在 §7 Deferred 表（均有明确 non-blocking 理由），即视为本轮深审收敛。
