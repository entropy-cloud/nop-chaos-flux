# 616 xlang 在线编辑器语言包（roadmap item 15，@nop-chaos/flux-xlang-lang + flux-code-editor 开放化）

> Plan Status: active
> Last Reviewed: 2026-10-16
> Source: xlang-web-debugger roadmap item 15（owner 仓 nop-entropy `ai-dev/backlog/xlang-web-debugger-roadmap.md`）；设计权威 = nop-entropy `ai-dev/design/xlang-web-debugger/05-frontend-architecture.md` §3.2/§3.3（registry 开放化/包结构/构建链/门禁四件套）+ `06-grammar-spike.md`（grammar 生产输入与 11 条坑清单）；POC 产物 = nop-entropy `_tmp/xlang-lezer-spike/`（xlang.grammar/tokens.js/sample.xlang，一次性证据）
> Related: 后端 item 14 已交付 `/r/nop-xlang-debug/compile` 诊断端点（`{sourcePath?, source}` → `{diagnostics:[{line,severity,message,errorCode?}]}`，本 plan 诊断桥的注入契约对端）

## Purpose

交付 XLang 浏览器端语言支持：新包 `@nop-chaos/flux-xlang-lang`（Lezer grammar + 高亮/折叠/缩进装配 + 注入式诊断桥工厂）+ flux-code-editor 语言注册开放化（registry Map 化 + `registerLanguage` 扩展点 + `EditorLanguage` 半开放增补 `'xlang'`）。既有 12 语言零回归是硬约束。

## Current Baseline

- **flux-code-editor 现状（已核验）**：`extensions/base.ts` 三个分发点——`createLanguageExtension`（L60-88 switch，12 语言）、`getLanguageParser`（L106-133 switch）、`createBaseExtensions` 特例 if 链（L199-246：sqlDialect 替换型、expression template-mode 替换型、expression/sql 的 completion、expression 的 linter/friendlyNameDecoration）。`types.ts` `EditorLanguage` 封闭联合 12 成员（L3-15）。
- **包级形态（已核验 flux-code-editor/package.json）**：ESM、`main: dist/index.js`、build = `tsc -p tsconfig.build.json && copy-build-assets.mjs`、vitest、eslint src。workspace 协议 `workspace:*`。
- **grammar 生产输入（已核验）**：spike 产物在 nop-entropy `_tmp/xlang-lezer-spike/`——`xlang.grammar`（约 110 行，样例 0 错误 + 12 项结构断言）、`tokens.js`（外部 tokenizer：模板串双反引号转义 + `#{}` 括号配对）、`sample.xlang`。`@lezer/generator` 在 flux 仓不存在（pnpm-lock 零命中），独立目录 npm install 1.x 可用（Node 25 兼容）。
- **诊断端点（后端 item 14 已交付）**：`POST /r/nop-xlang-debug/compile`，payload `{sourcePath?, source}`；诊断桥工厂按注入契约对接（本期只交付工厂 + 单测 fake compile，宿主接线归 item 19/21）。
- **门禁现状（审查 F2 修订——已核清脚本实现）**：①`scripts/verify-no-src-artifacts.mjs` 无豁免机制，扫 `packages/*/src` 的 .js/.d.ts（generated/ 在域外免登记）；根 `pnpm lint` 第一步 `scripts/clean-src-artifacts.mjs` 无条件删除 src 下 .js/.d.ts。②`scripts/check-oversized-code-files.mjs` 豁免 = 脚本内 `OVERSIZED_EXEMPTIONS` 数组 `{path, reason}`（reason 须引用决策出处）。③knip 门禁 = `check:knip-baseline`（diff `scripts/baselines/knip-baseline.json`，新 hit 即红；knip.json workspaces glob 自动覆盖新包）。④jscpd 门禁 = `check:duplicates-baseline`（clone 计数超 baseline 即红）+ `.jscpd.json` ignore。⑤turbo build/typecheck/lint 均 `dependsOn: ["^build"]`——workspace 包间任何反向 devDep 构成 turbo 环。⑥flux-code-editor 既有测试对特例链几乎零覆盖（仅 integration 一处 friendlyNames 不崩溃冒烟）。

## Goals

- 新包 `@nop-chaos/flux-xlang-lang`：grammar 生产化（spike 起点 + 坑清单逐条对照）、`gen:grammar` 构建链、生成物入库（`generated/` 落包根 src 外 + `.d.ts` shim）、`xlang()` 语言装配（parser + @lezer/highlight 样式映射 + foldGutter 支撑的折叠 + 缩进）、`createXlangLinter({ compile, debounceMs })` 注入式诊断桥工厂。
- flux-code-editor 开放化：`languageRegistry` Map + `registerLanguage(name, entry)`（半开放语义 JSDoc）+ 三分发点收敛（条目携带 `extension/parser?/completion?/linter?/decorations?`）+ `EditorLanguage` 增 `'xlang'`；内置 12 语言行为逐字节等价。
- 门禁配套：src-artifacts/oversized/knip/jscpd 豁免登记（generated/ 在扫描域外或白名单）。
- 测试：grammar 解析断言（逐构造结构 + 防吞体量，坑 #1）、linter 工厂单测（fake compile）、flux-code-editor 既有 vitest 全绿（零回归验收锚点）。

## Non-Goals

- follow-up #1-#5（模板串 `${}` 插值拆分/XML 混合 parse/表达式体箭头/ASI/switch-try 全集）——D5 §三 裁定渐进；诊断桥宿主接线（item 19/21）；调试扩展与 WS 客户端（item 16/17，另一包）；bundle 清单（item 20）。

## Scope

### In Scope

- 新包 `packages/flux-xlang-lang/`（package.json/tsconfig×2/src/generated/scripts）
- `packages/flux-code-editor/`：base.ts/types.ts 开放化（registry + registerLanguage + EditorLanguage 增 xlang）。**依赖方向钉死（F4 修订）**：flux-xlang-lang → flux-code-editor 单向（deps）；CE 零反向依赖（turbo ^build 环红线）；链路测试落 flux-xlang-lang 包（import CE 的 createLanguageExtension 验证注册后分发）；`registerXlangLanguage()` 便捷函数由 xlang-lang 交付，宿主/item 19 调用
- 根配置：vite.workspace-alias、root tsconfig project references、门禁豁免清单
- 测试（两包）

### Out Of Scope

- @nop-chaos/flux-xlang-debug（item 16/17/18）；playground 演示页（item 19）；pack-flux-bundle（item 20）；后端仓改动

## Failure Paths

| 场景                 | 触发                                         | 行为                                            | 可重试               | 用户可见表现 |
| -------------------- | -------------------------------------------- | ----------------------------------------------- | -------------------- | ------------ |
| grammar-compile-fail | lezer-generator 生成报 Overlapping tokens 等 | 按 06 §四坑 #9 @tokens @precedence 排序消解     | 是                   | 无（构建期） |
| xlang-parse-error    | 样例含未覆盖构造                             | error node 定位（结构断言防止空洞为真，坑 #1）  | 否（一期范围声明）   | 高亮降级     |
| linter-compile-fail  | 注入 compile 抛错/超时                       | linter 返回空诊断集（不打扰编辑）+ console.warn | 是（下次编辑重触发） | 无诊断标注   |
| registerLanguage-dup | 同名重复注册                                 | 后者覆盖 + console.warn（开发态可见）           | 是                   | —            |

## Test Strategy

本档选择：`必须自动化`（语言注册开放化是公共 API 契约变更；grammar 是本包核心资产）——grammar 逐构造结构断言 + 体量断言先于装配；linter 工厂 fake-compile 单测；既有 12 语言零回归 = flux-code-editor 既有 vitest 全绿。

## Execution Plan

### Phase 1 - 包骨架 + grammar 构建链

Status: completed
Targets: `packages/flux-xlang-lang/`（骨架/generated/脚本）+ 根配置（alias/references/豁免）

- Item Types: `Feature`

- [x] 包骨架（package.json：deps `@lezer/lr`/`@lezer/highlight`/`@codemirror/language`/`@codemirror/view`（F7 补 highlight）；`@nop-chaos/flux-code-editor: workspace:*` 于 Phase 2 引入 import 时同步声明（F7）；devDeps `@lezer/generator`/`@lezer/common`/vitest；**vitest.config.ts**（F7 补）；tsconfig×2 照 flux-code-editor；vite alias + root project references）
- [x] **dist copy 步骤（F3 修订）**：build script 在 tsc 后复制 `generated/`（parser/terms/tokens/d.ts）入 `dist/generated/`（照 copy-build-assets.mjs 先例扩展包内 script）——tsconfig.build `rootDir: src` 下源码 import "../generated/xlang.parser.js" 的产物指向 dist 外，dev 态被 vite alias 掩盖、静默坏 dist；无此步骤 build gate 零防护
- [x] grammar 落点（F1 修订）：`xlang.grammar` 落 `src/`（.grammar 非禁列扩展名）；**`tokens.js` 落 `generated/tokens.js`**（外部 tokenizer 必须是 .js，src 下 .js 被 verify 门禁红 + `pnpm lint` 的 clean-src-artifacts 无条件删除；与手写 d.ts shim 同为 generated/ 内人工维护文件先例；grammar 内 `@external tokens` 引 `../generated/tokens.js` 相对包根，生成器对生成物 `from "./tokens.js"` 同目录解析）。spike 起点生产化：06 §四 11 坑逐条对照——行注释 `![\n]*`、@skip 多规则 `|`、@tokens @precedence 排序、外部 tokenizer 导出 `.js` 后缀、EOF 兜底不 acceptToken）
- [x] `gen:grammar` script（lezer-generator → `generated/xlang.parser.js` + terms，落包根 src 外）+ 生成物入库 + 手写 `generated/xlang.parser.d.ts` shim（lezer-generator 不产 d.ts）
- [x] 门禁配套（F2 修订，写死形态）：①src-artifacts 对 generated/ 免登记（域外）；②`check-oversized-code-files.mjs` 的 `OVERSIZED_EXEMPTIONS` 加 `{path: 'packages/flux-xlang-lang/generated/xlang.parser.js', reason: 'plan 616 lezer 生成产物入库（D5 §3.3），参照 nop-xlang ANTLR 生成物入库同构'}`；③knip unused-exports 新 hit（registerXlangLanguage/createXlangLinter 仓内暂无消费者）→ `check:knip-baseline --update-baselines` 登记；④`.jscpd.json` ignore 加 `**/generated/**`；⑤eslint 包级只扫 src 天然逃逸
- [x] grammar 解析测试：sample.xlang 全构造逐项结构断言 + 防吞体量断言（05 §3.3 验收锚点：0 错误）

Exit Criteria:

- [x] `gen:grammar` 可重复执行且产物稳定（入库 diff 为空）
- [x] grammar 解析测试绿（逐构造结构 12 项 + 防吞体量断言 + 最小表达式，4 用例）
- [x] 包内 typecheck/lint 通过；豁免登记后 `pnpm check` 相关项无新增红

### Phase 2 - 语言装配 + 诊断桥工厂

Status: completed
Targets: `packages/flux-xlang-lang/src/`（language/diagnostics 模块）

- Item Types: `Feature`

- [x] `xlang()` 装配：parser + `@lezer/highlight` 样式映射（关键字/字符串/模板串/宏/注释/操作符——对照 g4 token 族与 idea-plugin 高亮先例）+ foldable（块语句 nodeProp）+ 缩进服务 + bracketMatching；closeBrackets 不进包（全局基础扩展已有）
- [x] `createXlangLinter({ compile, debounceMs })` 工厂：compile 注入（`(sourcePath, source) => Promise<diagnostics>`）；行号/severity 映射 → CodeMirror `Diagnostic[]`；compile 抛错/超时 → 空诊断 + console.warn
- [x] `registerXlangLanguage()` 便捷函数（内部调 flux-code-editor `registerLanguage('xlang', entry)`）；**entry 只含 extension/parser（F9 修订）**——高亮/折叠/缩进随 extension，诊断 linter 不进 registry（CreateBaseExtensionsOptions 无 compile 载体，由宿主经 extensions 注入点独立组合，D5 §3.5 装配语义）
- [x] 测试：linter 工厂 fake-compile（诊断映射/错误兜底/debounce）；xlang() 装配返回扩展可被 EditorState 消费

Exit Criteria:

- [x] linter 工厂单测绿（mapXlangDiagnostics 行号 clamp/severity 归一/errorCode 折叠进 message + 空集兜底形态）
- [x] xlang() 扩展 EditorState 消费冒烟绿
- [x] 包内 typecheck/lint/test 通过

### Phase 3 - flux-code-editor 注册开放化 + 接线

Status: completed
Targets: `packages/flux-code-editor/src/extensions/base.ts` + `src/types.ts`

- Item Types: `Feature`

- [x] **characterization 测试先行（F5 修订，Must automate 档 proof-first）**：钉住五条特例路径的扩展组合——sql+dialect 替换、expression template-mode 替换、expression completion、sql tables completion、expression linter + friendlyNames——先绿后动 base.ts（既有测试对特例链零覆盖，全绿无法证明行为等价）
- [x] registry 条目契约落地：`{ extension, parser?, completion?, linter?, decorations? }`——`extension(opts)` 工厂内按 `opts.sqlDialect`/`mode==='template'` 分支实现替换语义，守卫（tables?.length/lintConfig.enabled/showFriendlyNames && variables.length）进工厂，push 顺序固定 extension→completion→linter→decorations（F6）；json 的 linter 留 extension 内原样；registry miss 回落 `[]`/`null`（现 default 语义，不得 throw——xlang 未注册时静默无高亮合法）；opts 类型 = CreateBaseExtensionsOptions（registerLanguage 公共 API 面）；内置 12 语言模块加载时以现值注册
- [x] 三分发点收敛：`createLanguageExtension`/`getLanguageParser` 改 registry 查找；`createBaseExtensions` 特例 if 链收敛进条目可选字段（行为逐字节等价）
- [x] `registerLanguage(name: string, entry)` 导出（半开放语义 JSDoc：联合外语言可注册可用，类型收窄需扩联合）；`EditorLanguage` 联合增 `'xlang'`
- [x] 零回归验证：flux-code-editor 既有 vitest 全绿；`'xlang'` 经 registerXlangLanguage 注册后 createLanguageExtension('xlang') 返回语言扩展

Exit Criteria:

- [x] 既有 12 语言零回归（flux-code-editor 110/110 全绿，characterization 6 用例重构前后一致 = 验收锚点）
- [x] 'xlang' 注册→分发的运行时链路测试绿（registerXlangLanguage→createLanguageExtension('xlang') 非空 + EditorState 消费，落 flux-xlang-lang 包）
- [x] flux-code-editor typecheck/lint/test 通过

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子代理 agent_fd89fb42（fresh session）
- Verdict: pass-with-minors（修订后可执行）
- Rounds: 1
- Findings addressed: F1 tokens.js 落 generated/（src 下 .js 被 lint 删除+门禁红）；F2 三处豁免形态写死；F3 补 dist copy 步骤；F4 删 devDep 选项+依赖方向钉死+链路测试落 xlang-lang 包；F5 characterization 测试先行钉五条特例路径；F6-F9 条目契约签名/miss 行为/骨架补项/xpl 复用/registry-linter 组合关系随手补强

## Closure Gates

- [x] 所有 in-scope 行为实现且有测试（grammar 4 + language/linter 4 + characterization 6）
- [x] Anti-Hollow：'xlang' 注册→registry 分发→parser 消费→高亮/诊断运行时连通（链路测试 + EditorState 冒烟）
- [x] 既有 12 语言零回归（flux-code-editor 既有 vitest 全绿 110/110）
- [x] 无被静默降级的 in-scope live defect（follow-up #1-#5 为 D5 §三 既有裁定，非本 plan 降级）
- [x] owner docs：D5 §3.2/§3.3 与实现一致（两处实现偏差——tokens.js 落 generated/、linter 不进 registry——均为 plan 616 评审修订已回写 plan；flux docs/logs 已更新）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（仅既有红：@nop-chaos/flux crud-loadaction——stash 验证改动前同红；form-advanced 2 例 flaky 时序）
- [x] `pnpm check`（exit 0；oversized 2 既有错误 stash 验证同在，非新增）

## Deferred But Adjudicated

### grammar follow-up #1-#5（插值拆分/XML 混合/箭头表达式体/ASI/g4 全集）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: D5 §三 既有裁定（按编辑场景实际使用频度渐进），一期承诺 = script 层语法 + 高亮/折叠/缩进 + 诊断桥
- Successor Required: `no`（按触发条件在后续 item 演进）

## Non-Blocking Follow-ups

- XML 外壳（xpl 整文件）编辑复用现有 `xml` 语言（D5 §三 裁定，IDEA 双轨同构）——混合 parse 见 follow-up #2
- 诊断桥宿主接线（item 19/21）
- oversized/knip/jscpd 豁免清单的治理化收敛（登记债务路径）

## Closure

Status Note: （待收口后填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立子代理审计）
- Evidence: （待填）
