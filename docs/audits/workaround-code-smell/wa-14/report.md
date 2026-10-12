# WA-14 i18n 与外围基建审计批（flux-i18n + nop-debugger + flux-bundle + tailwind-preset + theme-tokens）临时方案与坏味道审计报告

> 批次: WA-14（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: plan 575（`docs/plans/575-workaround-audit-wa14-i18n-infra-plan.md`，draft review R1 revised 共识稿）
> 审计日期: 2026-10-12
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-14 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话——本报告不改任何源码/测试/台账，探针脚本落 `_tmp/wa14-*`）

## 快照基准注记

plan 575 基线记载 HEAD = `7ca9db722`（WA-12 收口提交）；本报告取证实跑时 HEAD = `7ca9db722006adff5c8bbd408ae6960d99323f2f`，**基线与实跑同锚**。五包**零在途**：`git status -s` 对五包 src 全目录 = 0 文件，live = HEAD。主工作树并行会话在途变更与本批零交集。

**三口径行数逐文件分解**（41 文件逐一 `wc -l` 对照 inventory `path:loc` 后缀，脚本化精确比对）：

| 口径           | 全集行数 | 说明                                                                                                            |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| inventory 口径 | 12,023   | WA-0 枚举器值（flux-i18n 4,254 + nop-debugger 7,429 + flux-bundle 149 + tailwind-preset 151 + theme-tokens 40） |
| live wc        | 12,023   | = inventory **逐文件零差**（41/41 逐字吻合，零在途漂移文件）                                                    |
| HEAD wc        | 12,023   | = live（零在途）                                                                                                |

**基线候选全部复现**（grep/门禁实跑与 inventory + plan 575 Baseline 逐 file:line 吻合）：literalEn **0** + literalZh **0**（含测试面双双全零——wa-10 起连续第六个双零批组，本批连说明性命中都没有）+ typeBypass **0** 非测试面（历批唯一零 typeBypass 批组复核成立；命中仅存在于测试文件 ×10，见误报排除 #1）+ setTimeout **2**（controller.ts:231、store.ts:116）+ domRaid **5**（controller-component-inspector ×3[228/242/249]、panel/styles.ts:12、panel/use-inspect-mode.ts:13）+ keyRemount/pixelNudge/testEnvBranch/silentCatch 四探针全零。

oversized 门禁口径：五包 ≥500 行非测试源 **5 件**——flux-i18n locales en-US 2,039/zh-CN 2,038（gate 读数各 +1 无尾换行差 + `[exempt]` 标记在案，**已登记豁免债**两件）+ nop-debugger types.ts 505 / panel.tsx 527 / panel/styles-css.ts 550（gate 各 +1 同因）；gate 另列 `store.test.ts` 556 系测试文件，按「非测试源」限定词正确排除（plan m2 注记精确复现）。**5 件全部覆盖**（见覆盖声明；locales 两件按豁免债条款做结构走读 + 程序化键集验证，不逐键审）。

**async 门禁口径勘注**：plan Baseline 记「18 行全部 nop-debugger」；实跑分解 = **17 行在 `packages/nop-debugger/src`**（inspector ×3[18/186/456] + helpers ×10[78/224/271/284/299/312/325/340/361/374] + explanations:374 + panel.tsx:115 + panel/hooks ×2[24/37]）+ **1 行在 `tests/e2e/flux-bundle-built-dist/main.tsx:89`**（flux-bundle 构建产物 e2e 夹具，非包源码、非本批范围——18 = 17+1 的口径分解在此落字）。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id         | 文件数 | 非测试行数                                             | 取证完成 | 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ------ | ------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-i18n       | 6      | 4,254（inventory）/ 4,254（live wc）/ 4,254（HEAD wc） | ✅       | 6/6 **全文覆盖读取**（零抽样档）：i18n.ts 134 / hooks.ts 23 / index.ts 18 / locales/index.ts 2 全读；**locales 两件为已登记豁免债**（纯数据声明体）按 plan Baseline 条款做结构走读（头/尾 + 全文件代码语句 grep[仅 `import type` + `export const` + en-US 尾部 `export default`]）+ **程序化键集对比**（en 1,810 键 = zh 1,810 键，零差、零空值）——豁免理由（纯数据、`check:i18n-keys` 门禁路径依赖、plan 2026-08-07-1053-1 裁定不拆）复核仍成立，不逐键审；34 处 en==zh 同值键抽检全为符号/格式串/快捷键形态，翻译质量归 i18n 键门禁域不入本批；单例消费链专项取证见「flux-i18n 单例特别条款」节                                                                                                                                                                                                   |
| nop-debugger    | 30     | 7,429（inventory）/ 7,429（live wc）/ 7,429（HEAD wc） | ✅       | 30/30 **全文覆盖读取**（本批唯一实质审计面）：≥500 行 3 件全读（styles-css.ts 550 内联 CSS 字符串逐段走读[self-styled 合法域核对，`top:-14px` sticky 耦合与 `.ndbg-inspect-section` 双声明块两处落字] / panel.tsx 527 / types.ts 505 逐行）+ controller 双热点全读（controller.ts 484 / controller-component-inspector.ts 465 / controller-helpers.ts 377）+ store/adapters/automation/diagnostics 三件/diagnostics-failures/redaction/explanations/explanations-failure-async/types-explanations/index.tsx/test-setup/两件 test-support + panel 子目录 9 件全读；async 17 行逐条定性；setTimeout 2 + domRaid 5 逐个定性；window.** 探针通道三键（`**NOP_DEBUGGER**`/`**NOP_DEBUGGER_API**`/`**NOP_DEBUGGER_HUB\_\_`）按契约通道逐个核对（types.ts:499-505 全局声明 + automation.ts 注册/读取对偶） |
| flux-bundle     | 3      | 149（inventory）/ 149（live wc）/ 149（HEAD wc）       | ✅       | 3/3 **全文覆盖读取**：index.tsx 96（registry/env/renderer 工厂薄 facade，3D 懒加载注释锚在案）/ types.ts 48（canonical 类型别名 facade）/ use-sync-external-store-shim.ts 5（自述式 ESM 替身，`2aebc5f3f` 出生注释完整）；peerDeps 全量 + deps 空的 facade 契约形态核对（`check:flux-bundle-pack` 门禁在案管护）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| tailwind-preset | 1      | 151（inventory）/ 151（live wc）/ 151（HEAD wc）       | ✅       | 1/1 **全文覆盖读取**：主题声明表 + mergeThemeExtension 深合并 + `darkMode: ['selector','[data-mode="dark"]']` 单触发（plan 471 V1-F2 注释锚 `2a307f0b0` 核对一致）+ danger/destructive 双轨别名（variant-vocabulary.md 登记面）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| theme-tokens    | 1      | 40（inventory）/ 40（live wc）/ 40（HEAD wc）          | ✅       | 1/1 **全文覆盖读取**：BASE_TOKEN_NAMES 常量表 + `defineHostTokenExtension` typed contract 惯用形（恒等 helper）——零逻辑面零信号                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

全集 **41/41**（12,023 行，无抽样档）。重复块探针双版（`_tmp/wa14-dup-probe.mjs` 逐字版：12 行窗 + 熵 ≥3.2 + 可执行行占比 ≥0.5，38 非测试文件 11,258 窗 → **52 组**[跨文件 18 + 同文件 34]；`_tmp/wa14-dup-probe-normid.mjs` 标识符归一版：熵 ≥2.6 + 均匀声明表剔除，6,390 窗 → **197 组**[跨文件 95 + 同文件 102]）。逐字 18 组跨文件命中人工同构复核：最大簇 automation.ts↔types.ts 双接口声明镜像（compiler 接线点兜底——误报，见排除 #5）+ controller.ts 双面方法体（**坐实 WA-debugger-002**）+ controller-component-inspector byCid/byElement 装配（**坐实 WA-debugger-007**）+ panel/hooks 拖拽双引擎（**坐实 WA-debugger-001**）+ styles-css 渐变背景块复用（刻意同背景两元素——排除）。归一 197 组按文件对聚类：跨文件大簇仅 locales en↔zh 镜像 77 窗（纯数据豁免债——排除 #6）+ automation/types 18 窗（契约镜像——排除 #5），其余 102 组同文件簇与走读全并集（formatClock 四胞胎、持久化八函数骨架等走读补齐），零漏检。

### 门禁交叉实跑读数（prompt §5 第 5 步留痕）

| 门禁                                     | 读数                                                                                                                         | 处置                                                                                                                                                                                                                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-async-failure-paths`        | 包内 **17 行命中**（全 nop-debugger，file:line 见上）+ 1 行 tests/e2e 构建夹具（范围外）                                     | 17 行逐个定性、未批量放行亦未批量立案：**16 处豁免**（诊断通道自保卫 / console.warn 观测 / in-band `{ok:false,error}` 协议 / 宿主 API 可用性守卫 / localStorage 跨信任边界降级[家族立案承接]）+ **1 处随家族立案**（explanations:374 静默 catch 记 watch 微注记 #2）——逐条见 async 定性表 |
| `check:audit-performance-suspects`       | **1 行命中**（controller-component-inspector.ts:272——与基线吻合）                                                            | compareComponentTreeItems 的 `JSON.stringify(instancePath)` 排序比较键——canonical 序列化比较形态非「stringify 做重对象变更检测」红形态；devtool 树排序 n 有界，微低效记 **watch 微注记 #5**（wa-12 search-regex 先例档）                                                                  |
| `check:audit-reactive-render-reads`      | **0**                                                                                                                        | 实跑确认（panel 消费 store 全部经 useDebuggerSnapshot/useSyncExternalStoreWithSelector 订阅通道）                                                                                                                                                                                         |
| `check:audit-runtime-raw-schema-reads`   | **0**                                                                                                                        | 实跑确认                                                                                                                                                                                                                                                                                  |
| `check:audit-hardcoded-type-dispatch`    | **0**                                                                                                                        | 实跑确认（event.kind/group 判别联合分派 + Tab 联合，无 type 字面量分派红形态）                                                                                                                                                                                                            |
| `check:audit-renderer-browser-io`        | **0**                                                                                                                        | 实跑确认（localStorage 全部经 getBrowserLocalStorage 宿主防御封装[误报排除 #7]；window.\_\_ 三键为 devtool 契约通道非渲染器 IO）                                                                                                                                                          |
| `check:oversized-code-files`（五包过滤） | 五包非测试 ≥500 行 **5 件**（locales 两件 `[exempt]` 标记在案；gate 行数各 +1 无尾换行差；store.test.ts 系测试文件正确排除） | 5 件全部覆盖走读；无新增超限                                                                                                                                                                                                                                                              |

### async 门禁 17 行逐条定性（prompt §5 第 3 步留痕）

| 位点                                                         | 外层机制                                                                                | 判定                                                                                                                                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| controller-component-inspector.ts:18                         | reportInspectorDiagnostic 内层 `try { console.warn } catch { void 0 }`                  | **豁免**——诊断通道自身的自保卫（logging the logger 時不得再抛）；外层失败已路由到 console.warn 观测                                                                              |
| controller-component-inspector.ts:186                        | capabilityStore.getState catch → reportInspectorDiagnostic                              | **豁免**——console.warn 观测在案，读取失败降级为缺 formState 字段                                                                                                                 |
| controller-component-inspector.ts:456                        | buildEvaluateNodeExpression catch → `{ok:false, error}` in-band                         | **豁免**——表达式求值边界结构化协议本体（用户输入表达式编译失败是预期路径）                                                                                                       |
| controller-helpers.ts:78                                     | formatErrorDetail 的 JSON.stringify catch → String(error)                               | **豁免**——循环引用保护（JSON.stringify 对 circular 抛错为预期），String() 兜底即观测                                                                                             |
| controller-helpers.ts:224                                    | resolveStorageFromDescriptor 的 getter 调用 catch → undefined                           | **豁免**——宿主 localStorage 描述符防御访问的一环（SecurityError/存根环境），跨信任边界降级（家族语境见 WA-debugger-008）                                                         |
| controller-helpers.ts:271/:284/:299/:312/:325/:340/:361/:374 | localStorage 持久化八函数的 load/persist catch（静默 return 默认值 / `void undefined`） | **W4 弱——随 WA-debugger-008 家族立案**（骨架重复 + 家族内空值语义漂移 + 死分支）；降级语境合法（装饰性偏好 + 拖拽高频路径不宜 warn 刷屏），观测策略随修落字                      |
| explanations.ts:374                                          | evaluateMetaRule 的 compile/exec catch → undefined                                      | **豁免 + watch 微注记 #2**——用户规则表达式编译失败是预期路径（降级为「无规则」），下游有 limitation 消息弱观测；但失败原因（编译错误文本）未入 limitations，devtool 求因面留改进 |
| panel.tsx:115                                                | parseRegexLiteral 的 new RegExp catch → null                                            | **豁免**——用户输入 regex 字面量解析预期失败路径，返回 null 后走文本包含降级（与 wa-12 spreadsheet search-operations 同族正面形态）                                               |
| panel/hooks.ts:24/:37                                        | setPointerCapture/releasePointerCapture catch → void error                              | **豁免**——宿主 Pointer Capture API 可用性守卫（jsdom/旧浏览器），捕获失败固有回退=正常事件流，非吞真实故障                                                                       |

## 取证执行记录（prompt §5 八步逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` 非测试 = **0 命中**（含测试面亦零）；`临时|先这样|暂时|绕过|workaround|hotfix` 非测试 = **0 命中**（含测试面亦零）——与 inventory literalEn 0 + literalZh 0 双零基线逐字吻合（wa-10 起连续第六个双零批组，双探针含测试面全零）。
2. **模式候选 26 处逐个定性**（grep/门禁复现与 inventory + plan Baseline 逐字吻合）：typeBypass 非测试 **0**（历批唯一零 typeBypass 批组复核成立；测试面命中 ×10 全为测试夹具构造断言，flux-bundle index.test.tsx:69 更有「公共类型面不得含 `as unknown as`」的反向守卫测试——排除 #1）；setTimeout 2 + domRaid 5 逐个定性（排除 #2/#3）；keyRemount/pixelNudge/testEnvBranch/silentCatch 四探针全零实跑复核；盲区探针：`Math.random` 五包非测试 **0**、`Date.now` 8 处（sessionId/requestKey 时间戳元数据 + store 事件时间戳 + 导出 generatedAt——纯元数据豁免）、`requestAnimationFrame`/`dispatchEvent`/`location.reload` **0**、`window.__` 3 键全在 nop-debugger devtool 契约通道（types.ts:499-505 声明 + automation.ts:135-181 注册读取 + controller-helpers.ts:29 配置读取——devtool 与宿主/自动化(e2e)的既定通道，逐键核对有注册有消费有类型面）；**模块顶层求值面单列定性 3 处**：flux-i18n `fluxI18nInstance` 单例（WA-i18n-001 承接，特别条款专节）、nop-debugger controller-helpers.ts:151-155 歜模块级默认工厂（**零消费**——WA-debugger-005 立案位点本体）、tailwind-preset/baseThemeExtension 模块级常量（纯声明无副作用——豁免）。
3. **门禁交叉**：上表 7 项实跑；async 17 行逐条定性（16 豁免 + 1 随家族立案 + 1 watch 微注记）；perf 1 位点定性（watch 微注记 #5）。
4. **重复块识别**：双探针 + 人工同构复核坐实 **6 组立案级**（拖拽双引擎[WA-debugger-001，P2] / automation-controller 双面方法体[WA-debugger-002] / formatClock 四胞胎[WA-debugger-006] / inspect 双 builder 装配[WA-debugger-007] / 持久化八函数骨架[WA-debugger-008] / CSS 双声明块[WA-debugger-009]），其余为声明式契约镜像/纯数据镜像/低于 §3 块阈值的微重复（判据见误报排除 #5/#6/#16）。
5. **范围结构走读**：**41/41 全文覆盖**（12,023 行 live wc，无抽样档）。≥500 行 5 件覆盖方式落字见覆盖声明（nop-debugger 3 件逐行精读；flux-i18n locales 2 件豁免债结构走读 + 程序化键集验证）。分档：核心实现（controller 三件、store、adapters、automation、diagnostics 三件、explanations 两件、redaction、panel 全 13 件、flux-i18n 三源件、flux-bundle 三件）逐行精读约 34 件；类型声明件/契约件/微包声明表全文过读 + 信号扫描 7 件。特别条款三件独立取证：①**flux-i18n 单例生命周期/竞态/changeLanguage 面**（专节）；②nop-debugger **styles-css.ts 内联 CSS 字符串**核对为 devtool 自有样式 self-styled 合法域（不触样式契约的「布局 renderer 只发 marker 类」约束——该约束本就只约束 renderer 包；devtool 自styled+CSS 变量接主题令牌 + `:root[data-mode='dark']` 与 tailwind-preset darkMode 选择器契约同源）；③**devtool DOM 访问正当性边界**按 E 类逐个裁（见排除 #3——5 处 domRaid 全为 data 属性契约通道只读访问或幂等样式注入，零 style/textContent 突袭渲染数据流）。
6. **已收敛模式复核**：cq-5 test-placement——nop-debugger 两件 `*.test-support.ts` 位于 src 根（非 `__tests__/`）但**零模块顶层副作用**（与 ai-test-support 的 reset+init 变体不同型），文件名标记 + 零生产 import（index.tsx 不导出）——排除 #18 注记不立案；cq-6 debug residue（`window.__` 残留）——五包 `window.__` 命中全部为 nop-debugger 自身契约通道键（其本职），无调试残迹复发；2aebc5f3f flux-bundle shim 收口——use-sync-external-store-shim.ts 自述注释完整、shim 消费经 vite alias（`815d026dd` 交付面懒加载契约在案），panel/hooks.ts 直接 import npm 包 shim 入口系 nop-debugger 未入 flux-bundle 打包面的独立消费路径（bunlder CJS interop 语境成立）——注记不立案。
7. **git 考古**：12 commit 溯源（详见逐条发现）。锚点核验——`9f1c8f54b`（2026-04-17 flux-i18n 包首：单例出生即静默弃置形态）、`ec48b2b13`/`fc030832e`（2026-03-25 debugger 包首/更名：automation 双面骨架出生）、`0c59236f1`（2026-04-03 panel 拆分：拖拽双钩子同日落笔）、`d9d934705`（2026-04-19 filter 标签 i18n 化：notify 借键出生，i18n 化前硬编码 `notify: 'Notify'` 正确值被替换为 `t('flux.common.more')`）、`ea0e347d5`（2026-04-08：getBrowserLocalStorage 防御访问出生）、`d4ca1518f`（tab 拆分波：formatClock 四胞胎扩散）、`baa5f3345`（2026-04-16「consolidate CSS and deduplicate shared style rules」——去重波自身留下 `.ndbg-inspect-section` 双声明）、`5b870f9e0`（2026-05-21 active:translate-y-0 出生——当时 Button base 有 `active:not-aria-[haspopup]:translate-y-px`，补偿有效）→ `1ba845203`（2026-08-19 plan 460 B2/B3「remove button press translate per AMIS parity」——补偿目标消亡，补偿孤儿化）→ `85217889b`（2026-09-22 plan 487 V12e 按压视觉入 variant 表固化）、`13f80776d`（2026-04-14 controller/panel 分模块：byCid/byElement 双 builder 成形）、`d8815df31`（2026-04-04 correlation 波：createRequestInstanceId 出生即零消费）、`8c1281620`（2026-05-15：FluxSchemaObject 出生）→ `d89953e03`（types 对齐 canonical 后成不可达公共类型）。**症状性 message 专项**：抽检五包各 25 条共 **100 条**——症状性 message **6 条全部位于 2026-03 早期前 plan 纪律时代**（`631b8bd11` canvas controls 移位 / `43b5258a9`/`c28e71645` flow 视觉调参 / `52c476b99` markers / `ea0e347d5` workspace warnings / `499685198` README 短message），近期时代（plan 纪律确立后）**症状性 0**（全带 plan 锚/root-cause 链/full-green 标记，与 wa-12 的 40/40 读数一致）。
8. **误报排除复核**：19 项全记录（§误报排除清单）；与 wa-7..12 判例互通（契约镜像、registry 惯用形、test-support 摆放、knip 收私定性、公共类型面弱消费豁免）；CX 交界核对——CX-7（t() 前缀归一：flux-i18n normalizeTranslationKey + hooks.ts JSDoc 契约注释 + i18n.test.ts:143 判别测试在案，出口纪律成立）、CX-15/CX-18 不涉本包面、WA-content-009/WA-ai-006/WA-dashboard-002（三件均 verified——本批在根因包侧复核其出口纪律，见特别条款节）。

## 逐条发现（Findings）

> 每条按 12 字段模板（id/位置/信号类别/症状/根因/考古/严重度+判据/修复方向/去向/验证方式/现状/跨批关联）；全量登记归主会话写入 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-i18n-001`/`WA-debugger-001`/`WA-bundle-001`/`WA-tailwind-001`/`WA-tokens-001` 起三位零填充，与既有前缀零撞号——live 核验通过[ledger grep 五前缀零命中]），本节与台账一一对应，零静默。
> ID 编排说明：立案 **12 条 = P2 ×3 + P3 ×9；零 P0/P1；tailwind-preset/theme-tokens 零立案**。严重度按本批任务口径映射（P0/P1=行为缺陷；P2=结构性复制漂移/W4 静默守卫族；P3=沉积/注释/命名）。

### WA-i18n-001 [B 邻·W4] initFluxI18n 二次调用静默弃置 options：单例幂等以「配置无信号丢失」实现（WA-content-009 根因包侧契约缺口）

- **位置**: `packages/flux-i18n/src/i18n.ts:58-61`（`if (fluxI18nInstance) { return fluxI18nInstance; }`——首例之后的全部 options 无信号丢弃）+ 模块级单例 `:38`（`let fluxI18nInstance: i18n | null = null`）
- **信号类别**: B 邻（W4 镜像——「配置被忽略」不可观测）+ I 邻（单例生命周期契约缺口）；**本批特别条款位点**
- **症状/根因**: 二次调用 `initFluxI18n({lng:'en-US'})` 与无参调用完全不可区分——无警告、无日志、无返回值差异。根因 = 单例幂等性与配置感知性的语义冲突以「静默丢弃」方式解决（`9f1c8f54b` 包首即此形态）。**下游活体症状已坐实**：`apps/playground/src/main.tsx:13` 启动时 `initFluxI18n()`（默认 zh-CN），`apps/playground/src/pages/ai-hitl-demo.tsx:6` 模块顶层 `initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' })` 在 chunk 懒加载时恒为 no-op——demo 意图的英文界面被静默忽略。这正是 WA-content-009（模块求值期 t() 冻结单例，verified）与 WA-ai-006（ai-test-support 顶层 reset+init，verified）两案在**根因包侧**的对称缺口：两案修复都在消费侧，单例自身的「配置丢弃无信号」契约自包首至今未动。
- **考古**: `9f1c8f54b`（2026-04-17 flux-i18n 包首提交）出生即此形态；flux-core 侧对偶 Sink（`i18n-sink.ts`）有完整所有权文档（「flux-i18n OWNS the write side…No other module should call setMessageFormatter outside of init/reset」）而 flux-i18n 侧 init 守卫零注释零信号；content-009 修复波（plan 561 收口）未触及本位点。单例生命周期测试面：i18n.test.ts:23（singleton reuse）+ i18n-contract.test.ts:44（reset 还原 identity）在案——「二次带参调用」行为零测试钉住。
- **严重度**: **P2**（W4 静默守卫族判据；降 P1 缓解因子显式记录——单例幂等本身是刻意设计且测试钉住，缺的是丢弃信号；触发需「init 后再带不同 options 调 init」或「模块顶层 init」形态，playground 已有实活例但生产宿主未复现）
- **修复方向**: 首例已存在且本次调用带非空 options 时 `console.warn('[flux-i18n] initFluxI18n called again with options; ignored (singleton already initialized)')`（对齐 i18n-sink 文档化所有权风格）——不改幂等语义、不改公共导出面、不触碰求值路径本体；判别测试：init() → init({lng:'en-US'}) 断言 warn 触发且语言保持 zh-CN（先红后绿）。**双哨兵条款触发**：i18n.ts 属求值面，修复批须加跑 flux-renderers-ai 全量 + flux-react 全量。
- **去向**: 批内修候选（一行 warn + 一测试；消费面 304 文件/1,890 处 t() 的波及评估 = 纯增观测零行为变化，波及为零）
- **验证方式**: flux-i18n filter 四门禁全绿 + 双哨兵两包全量；新增判别测试先红后绿；playground 侧转发注记（见转发评估节）
- **现状**: live（本报告 HEAD 快照）
- **跨批关联**: WA-content-009/WA-ai-006/WA-dashboard-002（消费侧三案 verified——本条是根因包侧收口）；playground `ai-hitl-demo.tsx:6` 模块顶层 init 症状转发 WA-15a 注记

### WA-debugger-001 [H] 拖拽双引擎：useDraggablePosition ↔ useLauncherDrag ~120 行结构孪生，阈值/注释已漂移

- **位置**: `packages/nop-debugger/src/panel/hooks.ts:57-181`（useDraggablePosition）↔ `:240-367`（useLauncherDrag）
- **信号类别**: H（同一基础设施[窗口级指针拖拽引擎]两份手写）+ 已漂移
- **症状/根因**: 两钩子各自实现完整的 window 级 pointer 拖拽：dragState ref 形态、pointerdown/move/up/cancel 监听与清理、`event.buttons === 0` 断拖守卫、hasMoved 阈值判定、positionRef 同步 effect、docked 模式 getBoundingClientRect 首拖换算、setPointerCapture 安全包装、consumeClick 抑制——逐段结构同构（逐字探针 3 组窗：:75-78↔258-261 / :95-98↔277-280 / :118-120↔308-310）。**已漂移证据**：拖拽阈值 3px（:110）vs 4px（:292）无语义理由；docked 换算注释两份近似文（:146「按当前盒换算基准位置并转 floating」vs :332「按当前盒换算并转 floating」）——同一决策的文档已在分叉；clamp 边界 12/12 vs 8/8+右下边距差异混布刻意与漂移。
- **考古**: `0c59236f1`（2026-04-03 panel.tsx 拆分波）双钩子同日落笔；`e15c660f0`（2026-10-01 ux-r6 shell chrome）**同车修改两个钩子的 docked 换算**——同根因同步税已实际兑现一次（活跃修改期坐实）。
- **严重度**: **P2**（判据：2 份、≥15 行、同根因、任一份活跃修改 + 已现无意漂移——§3「双份大块重复且仍在活跃修改」档）
- **修复方向**: 提取 `useWindowPointerDrag(config)` 共享原语（参数化：threshold/clampBounds/onTap/clickSuppression/docked 换算），两钩子改薄封装；回归 = panel-dock.test.tsx 既有拖拽用例直通 + 新增阈值一致性断言（可选）；漂移值（3px vs 4px）在提取时一次裁定统一。
- **去向**: 批内修候选（成本中：hooks.ts 包内提取，~1-2h 档；不涉公共面）
- **验证方式**: nop-debugger filter 四门禁全绿；panel-dock/panel 既有套件零回归；`grep -c "window.addEventListener('pointermove'" panel/hooks.ts` 收敛到共享原语本体 1 处
- **现状**: live
- **跨批关联**: 无（单包内封闭）

### WA-debugger-002 [H] controller automation/controller 双面 10 个 mutation 方法体逐字重复 + getter 清单三写

- **位置**: `packages/nop-debugger/src/controller.ts:264-300`（createAutomationApi input 内联 mutation 方法体）↔ `:347-383`（controller 对象同体方法）——show/hide/minimize/unminimize/toggle/clear/pause/resume/setActiveTab/setPanelPosition 十方法「store 调用 + persist 调用」体逐字两份（逐字探针 :272-282↔:346-356 连续 11 窗）；getter/诊断方法清单三写（automation.ts:88-133 返回对象 ↔ controller.ts:384-412 ↔ types.ts:349-401/:434-497 双接口）
- **信号类别**: H（同一 API 面的多份手写 enumeration + 方法体复制）
- **症状/根因**: automation 面与 controller 面除 inspectByCid/inspectByElement/evaluateNodeExpression 的 **redaction 包裹差异**（window 暴露面消毒——刻意设计）外，其余方法完全同源；mutation 方法体若改持久化/面板语义（如 0cf4aad46 minimize persistence 波就双写过 minimize/unminimize）必须 N 处同步。接口清单三写有 compiler 接线点兜底（automation.ts:87 返回类型 + controller.ts:462 `satisfies`），方法体一致性无任何守卫。
- **考古**: `ec48b2b13`/`fc030832e`（2026-03-25 包首/更名：automation 双面骨架）+ `ffa27f820`/`0cf4aad46`（2026-03-29/30 persistence 波：首次双写兑现）
- **严重度**: P3（判据：零现行漂移[逐字相同]、双写税历史兑现一次、方法体无 compiler 守卫——按任务口径「结构性复制」低危档；接口清单三写部分归契约镜像误报排除 #5 不在此重复计）
- **修复方向**: controller 对象先行构建，automation input 的十个 mutation 方法与 getter 改引用 controller 同名成员（`show: () => controller.show()` 形态），保留 redaction 包裹三方法的刻意差异；判别测试 = 既有 automation/controller 套件直通 + automation.show 触发 persist 断言（既有用例覆盖）。
- **去向**: 批内修候选（低成本：对象字面量引用改写）
- **验证方式**: nop-debugger filter 四门禁全绿；`grep -c "persistPanelOpen(debuggerId, true)" controller.ts` 从 2 收敛到 1
- **现状**: live
- **跨批关联**: knip automation/types 声明镜像 15 窗为本案接口面的导出症状旁证（镜像本体豁免，见排除 #5）

### WA-debugger-003 [A 邻] timeline「notify」过滤器标签借用 `flux.common.more`：i18n 迁移波把正确标签退化为错标

- **位置**: `packages/nop-debugger/src/panel.tsx:88`（getFilterLabels：`notify: t('flux.common.more')`）
- **信号类别**: A 邻（借邻键顶替——语义不符的字面量映射）+ W6（「notify 事件」≠「更多」）
- **症状/根因**: flux.debugger 命名空间 103 键中有 renderEvents/actionEvents/apiEvents 专用键而**无 notify 专用键**；timeline 过滤器 chips（timeline-tab.tsx:242-257 消费 filterLabels）渲染 notify 过滤器为「More/更多」——用户可见错标。根因 = `d9d934705`（2026-04-19「use i18n for filter labels」）i18n 化波未为 notify 建键：i18n 化前硬编码映射为 `notify: 'Notify'`（**正确**），迁移时借用语义不符的既有 common.more 键顶替——症状级修复（复用现成键免加键）转正。
- **考古**: `d9d934705`（2026-04-19）出生（`git show` 证实 `- notify: 'Notify'` → `+ notify: t('flux.common.more')`）；此后零波触及。
- **严重度**: **P2**（判据：用户可见错标 = devtool UI 行为缺陷轻度档[任务口径 P2]；修复路径明确低成本）
- **修复方向**: en-US/zh-CN locales 各加 `flux.debugger.notifyEvents` 键（"Notify events"/“通知事件”）+ panel.tsx:88 改引；键集对齐由 i18n.test.ts:90 key-parity 测试守卫。涉 flux-i18n locales 数据**加键**（非内容治理，Non-Goals 不排除）+ nop-debugger 一行。
- **去向**: 批内修候选
- **验证方式**: 两包 filter 四门禁全绿；key-parity 测试直通；`grep -c "flux.common.more" packages/nop-debugger/src` = 0
- **现状**: live
- **跨批关联**: compile 分支借用 `latestCompile`（:87）为半合语义借用（"Latest compile" 作过滤器名尚可读）——随本案顺带评估是否一并建 `compileEvents` 键（Phase 2 拍板，不强制）

### WA-debugger-004 [F 残留] `active:translate-y-0` 死补偿 ×2：按压位移目标已随 plan 460 删除，补偿孤儿化三个月

- **位置**: `packages/nop-debugger/src/panel/disclosure-trigger.tsx:18` + `packages/nop-debugger/src/panel/node-tab.tsx:253`（两处 `active:translate-y-0` class token）
- **信号类别**: F 残留（视觉补偿的化石形态——补偿目标已消亡）
- **症状/根因**: 补偿链完整可考——`18b7728ec`（2026-04-04 shadcn 再生）给 ui Button base 引入 `active:not-aria-[haspopup]:translate-y-px` 按压位移 → `5b870f9e0`（2026-05-21 deep-audit remediation）debugger 两处加 `active:translate-y-0` 中性化（**当时有效**）→ `1ba845203`（2026-08-19 plan 460 B2/B3「remove button press translate + dialog grip handle per AMIS parity」）从 Button base 删除按压位移 → 补偿自此孤儿化（现行 buttonVariants base + 全 variant 表零 `active:translate`，grep 证；`nop-haptic` 仅有 opacity 反馈）。
- **考古**: 见症状段（三 commit 链完整）；孤儿化已 2026-08-19 至今。
- **严重度**: P3（判据：死补偿零行为面；误导读者以为 Button 仍有位移按压效应）
- **修复方向**: 删两处 `active:translate-y-0` token（visual 快照类测试如有即随更新）
- **去向**: 批内修候选
- **验证方式**: nop-debugger filter 四门禁全绿；`grep -rn "active:translate-y-0" packages/nop-debugger/src` = 0
- **现状**: live
- **跨批关联**: plan 460 B2/B3（补偿目标删除波）——上游删除时未回扫消费者，与 wa-13b「收口波范围缺口」家族同型（清扫侧第 4 例）

### WA-debugger-005 [I 邻] createRequestInstanceId 死导出 + 零消费模块级默认工厂：出生即无人使用的模块求值面状态

- **位置**: `packages/nop-debugger/src/controller-helpers.ts:146-155`（`createRequestInstanceIdFactory` 工厂本体 + `:151` 模块顶层 `const createRequestInstanceIdFromDefaultFactory = createRequestInstanceIdFactory()` + `:153-155` 死导出包装函数）
- **信号类别**: I 邻（死代码 + 模块顶层求值面状态）
- **症状/根因**: `createRequestInstanceId` 全仓零消费（grep 含测试面 = 0；knip exports 登记在案）；包装函数依附的模块级工厂实例在每次模块加载时白白实例化一个闭包计数器。根因 = `d8815df31`（2026-04-04 correlation 波）设计了默认工厂便捷入口，实际调用方全部走 controller 内部 `createRequestInstanceIdFactory()`（controller.ts:135）自建实例——默认入口出生即零消费。
- **考古**: `d8815df31`（2026-04-04）；knip 基线登记在案佐证。
- **严重度**: P3（判据：死代码 ~10 行 + 模块级状态，删除即消；knip 出口在案）
- **修复方向**: 删 :151-155（工厂本体 :146-149 保留——controller 在用）；knip 基线以修代重立基线（plan 571 先例）
- **去向**: 批内修候选
- **验证方式**: nop-debugger filter 四门禁全绿；`grep -c "createRequestInstanceIdFromDefaultFactory" src` = 0；knip 条目随消
- **现状**: live
- **跨批关联**: knip 登记债定性输入（六条 exports 中唯一真死代码，余五条为收私候选）

### WA-debugger-006 [H 微] formatClock 四胞胎：panel 四个 tab 各持一份逐字 7 行实现

- **位置**: `packages/nop-debugger/src/panel/timeline-tab.tsx:49-55` ↔ `panel/node-tab.tsx:8-14` ↔ `panel/overview-tab.tsx:4-10` ↔ `panel/network-tab.tsx:7-13`（`new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})` 逐字 ×4）
- **信号类别**: H 微（同一惯用形四份手写，零漂移）
- **考古**: `d4ca1518f`（tab views 拆分波）+ `fc030832e` 时代各自落笔——拆分波复制而非提取。
- **严重度**: P3（判据：≥3 份同根因按 prompt §3 P1 起评；**降档显式记录**——4 份微惯用形、零漂移、无行为缺陷，按本批任务口径归 P3[wa-12 word-001 四胞胎先例]）
- **修复方向**: panel 共享件（event-groups.ts 或新 panel/format.ts）单源 `formatClock`，四处改引
- **去向**: 批内修候选
- **验证方式**: nop-debugger filter 四门禁全绿；`grep -rc "function formatClock" panel/` 收敛到 1
- **现状**: live
- **跨批关联**: wa-10 #24 / wa-12 word-001 id 计数器家族——「拆分波复制」同因

### WA-debugger-007 [H 微] buildInspectByCid ↔ buildInspectByElement 装配孪生：resolved/notMaterialized/fallback 三分支 ~45 行 ×2

- **位置**: `packages/nop-debugger/src/controller-component-inspector.ts:282-331`（byCid）↔ `:333-380`（byElement）——三分支 inspected payload 装配结构同构（逐字探针 :299-301↔:356-358）
- **信号类别**: H 微（同文件族装配双写）
- **症状/根因**: 两 builder 仅元素解析路径不同（cid 查询 vs element.closest + runtime root 界定），装配体（buildInspectResult 调用 + instancePath/scopeChain 回填 + applyResolvedInspectFallbacks）双写；fallback 分支 mounted 语义差异（`!!element || handle?._mounted !== false` vs `true`）属刻意（byElement 的 owner 物理存在）但无注释，读者需自行推导。
- **考古**: `13f80776d`（2026-04-14 controller/panel 分模块）双 builder 成形。
- **严重度**: P3（判据：2 份、~45 行、同根因；降档说明——差异刻意且文件近期仅视觉波触及，漂移风险在「payload 装配增字段需双写」，按任务口径 P3）
- **修复方向**: 提取 `resolveInspectResult(cid, handle, inspected, element, registry, runtime, mountedFallback)` 包内私有装配单源，两 builder 保留各自元素解析 + fallback mounted 参数化（随案补一行差异注释）
- **去向**: 批内修候选
- **验证方式**: nop-debugger filter 四门禁全绿；controller-inspect-\* 套件零回归
- **现状**: live
- **跨批关联**: 无

### WA-debugger-008 [B 邻·W4] localStorage 持久化八函数同骨架静默降级 + getBrowserLocalStorage 死分支 + 家族内空值语义漂移

- **位置**: `packages/nop-debugger/src/controller-helpers.ts:257-377`（loadPersistedPosition/persistPosition/loadPersistedPanelOpen/persistPanelOpen/persistMinimized/loadPersistedMinimized/loadPersistedSearchHistory/persistSearchHistory——八函数同「storage 守卫 → try → 读写 → catch 静默」骨架）+ `:250-254`（getBrowserLocalStorage 尾部死分支：`if (typeof window === 'undefined') return undefined;` 后又无条件 `return undefined;`）
- **信号类别**: B 邻（W4——降级不可观测）+ H 微（八份同骨架）+ I 邻（死分支）
- **症状/根因**: 八个 catch 全静默（`void undefined` / return 默认值），持久化失败（Safari 隐私模式/配额满/SSR）无任何信号——**语境性合法**（装饰性偏好 + persistPosition 拖拽高频路径不宜 warn 刷屏），但骨架八份手写且**空值语义已漂移**：loadPersistedPosition/loadPersistedSearchHistory 用 `!raw`（空字符串 → 默认值）而 loadPersistedPanelOpen/loadPersistedMinimized 用 `raw === null`（空字符串 → 解析为 false）——同一「存储里有个怪值」在不同偏好上行为分叉。死分支为 getBrowserLocalStorage 三段防御逐步成形（`ea0e347d5`）后遗留的冗余臂。
- **考古**: `ea0e347d5`（2026-04-08 workspace verification 修复波：getBrowserLocalStorage 防御访问出生）+ persistence 函数随 `ffa27f820`/`0cf4aad46`/后续 search-history 波各自落笔——家族式增长无人收口。
- **严重度**: P3（判据：跨信任边界降级语境合法不入 B 类立案本体；立案点 = 家族骨架重复 + 空值漂移 + 死分支；无行为缺陷——漂移仅覆盖怪值边界态）
- **修复方向**: ①删 :250-254 死分支；②提取包内私有 `readPersisted<T>(id, key, parse)`/`writePersisted(id, key, serialize)` 单源骨架（八函数瘦身为键名+解析器声明）；③空值语义一次裁定统一（建议 `raw === null` 判空 + 空串按默认值）；④观测策略落字：骨架内首败 `console.debug` 一次或契约注释声明「静默为设计（装饰性偏好，高频路径）」——Phase 2 拍板，不允许静默默认。
- **去向**: 批内修候选（骨架提取约 1h 档）
- **验证方式**: nop-debugger filter 四门禁全绿；store.test.ts 持久化用例直通；`grep -c "catch" controller-helpers.ts` 收敛到单源骨架 1-2 处 + getBrowserLocalStorage 防御 2 处
- **现状**: live
- **跨批关联**: async 门禁 8 行命中本案承接；wa-12 editor cloneDocument watch #1（静默降级观测）同族判例

### WA-debugger-009 [I 邻] styles-css `.ndbg-inspect-section` 双声明块：CSS 去重波自身留下的重复

- **位置**: `packages/nop-debugger/src/panel/styles-css.ts:494-499`（`.ndbg-inspect-panel, .ndbg-inspect-section, .ndbg-tree-section { display:grid; gap:8px }`）↔ `:500`（`.ndbg-inspect-section { gap: 6px }`）↔ `:502-505`（`.ndbg-inspect-section { display:grid; gap:6px }` ——同选择器第三写，整体冗余）
- **信号类别**: I 邻（CSS 声明化石）
- **症状/根因**: :502-505 块与 :494-499+:500 的合成结果完全相同（后写覆盖）——纯冗余。根因 = `baa5f3345`（2026-04-16「consolidate CSS and deduplicate shared style rules」）去重波自身在此位点漏收（该 commit 同时触达 :494-505 区间）；`0fadc9a3d`（2026-05-26）又触及未收。
- **考古**: `baa5f3345`（2026-04-16）；`git log -L` 两块同源。
- **严重度**: P3（判据：纯 CSS 冗余 4 行，零行为面）
- **修复方向**: 删 :502-505（或并入 :500 单行 gap 声明）
- **去向**: 批内修候选
- **验证方式**: nop-debugger filter 四门禁全绿；styles.test.ts CSS 契约测试直通
- **现状**: live
- **跨批关联**: 无（单点 CSS 清扫）

### WA-debugger-010 [I 邻] OverviewTab latestTrace 卡片裸英文串 ×3：i18n 面板里的非 i18n 渲染通道

- **位置**: `packages/nop-debugger/src/panel/event-groups.ts:25-27/:35`（`'No correlated trace yet'` / `'Run an action or request to infer the latest chain.'` / `'Recent interaction'`）→ `panel.tsx:269` formatTraceSummary → `panel/overview-tab.tsx:66-67` 渲染；伴随：`panel.tsx:244`（eval 结果 `` `Error: ${...}` `` 裸英文前缀）
- **信号类别**: I 邻（演进残留——同面板其余 ~60 处标签全走 t()，此三串绕过 i18n 体系）
- **症状/根因**: OverviewTab 在 zh-CN 下混渲染英文原文。根因 = `e8a97e9cb`（2026-03-21 trace 推断面）先于 `9f1c8f54b`（2026-04-17 flux-i18n 包出生）落笔，i18n 化波回扫面板标签时漏掉 event-groups 纯函数层的用户面字符串。
- **考古**: `e8a97e9cb`（2026-03-21）出生早于 i18n 体系；`d9d934705`（2026-04-19 标签 i18n 化）未波及。
- **严重度**: P3（判据：措辞沉积零行为面[wa-13b wordr-009 同族低配]）
- **修复方向**: 加 `flux.debugger.noTraceYet`/`noTraceHint`/`recentInteraction` 三键（双语）+ formatTraceSummary 改走 t()（纯函数需接收 t 或移入面板层——Phase 2 拍板最小改法）；`Error:` 前缀可随案并入 `flux.debugger.evalError` 键（可选）
- **去向**: 批内修候选（可与 WA-debugger-003 同车一次 locales 触达）
- **验证方式**: 两包 filter 四门禁全绿；key-parity 测试直通；`grep -c "No correlated trace yet" packages/nop-debugger/src` = 0
- **现状**: live
- **跨批关联**: wa-13b wordr-009（裸英文用户面串）跨包同族第 2 例

### WA-bundle-001 [I 邻] flux-bundle 四条 knip 登记全为真实死面：3 条 stale devDependencies + FluxSchemaObject 不可达公共类型

- **位置**: `packages/flux-bundle/package.json` devDependencies（`@nop-chaos/flux-i18n` / `@nop-chaos/ui` / `zustand`——运行时契约已全量在 peerDependencies，src 含测试面零 import）+ `packages/flux-bundle/src/types.ts:18-20`（`FluxSchemaObject` 接口——不被 index.tsx 再导出清单[：22-34]包含、全仓零消费，经包 exports["."] 不可达）
- **信号类别**: I 邻（依赖/类型化石）
- **症状/根因**: 三 devDeps 是 facade 收敛前消费面的遗留（runtime 契约迁移 peerDeps 后未清 devDeps 副本）；FluxSchemaObject 随 `8c1281620`（2026-05-15 validation 波）出生、`d89953e03`（types 对齐 canonical）后被 SchemaInput/SchemaObject 别名族取代成孤儿。knip live 实跑（--workspace ./packages/flux-bundle）4 条逐字复现。
- **考古**: devDeps 遗留 = facade 收敛波（`95dc934bc`/`a425a6c87`/`4b677a5bd`）；FluxSchemaObject = `8c1281620` 出生 → `d89953e03` 孤儿化。
- **严重度**: P3（判据：机械清理零行为面；本条即 knip flux-bundle 4 条的逐档定性落点）
- **修复方向**: package.json 删三 devDeps + types.ts 删 FluxSchemaObject 接口（index.tsx 零变更——FluxSchemaObject 不在其再导出清单）；knip 基线以修代重立基线（plan 571 先例）
- **去向**: 批内修候选
- **验证方式**: flux-bundle filter 四门禁全绿 + `check:flux-bundle-pack` 直通；knip 四条随消
- **现状**: live
- **跨批关联**: knip 登记债定性输入；WA-12 转发的 playground dependencies 1 条不属本包（维持 WA-15a 转发）

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID         | 位置                                        | 出生时间（git 考古）                                                     | 风险                                        | 处置   |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ------ |
| WA-i18n-001     | i18n.ts:58-61 init 静默弃置 options         | 9f1c8f54b（2026-04-17 包首）                                             | 宿主配置无信号丢失；playground 已有活体症状 | 批内修 |
| WA-debugger-003 | panel.tsx:88 notify 借 common.more          | d9d934705（2026-04-19 标签 i18n 化波）                                   | 用户可见错标持续 6 个月                     | 批内修 |
| WA-debugger-004 | disclosure-trigger:18 + node-tab:253 死补偿 | 5b870f9e0（2026-05-21 有效）→ 1ba845203（2026-08-19 目标消亡）孤儿化至今 | 零行为面，误导性残留                        | 批内修 |
| WA-debugger-005 | controller-helpers.ts:151-155 死导出+模块态 | d8815df31（2026-04-04）出生即零消费                                      | 模块求值面死状态                            | 批内修 |
| WA-debugger-009 | styles-css.ts:502-505 双声明块              | baa5f3345（2026-04-16 去重波漏收）                                       | 纯冗余                                      | 批内修 |
| WA-debugger-010 | event-groups.ts 裸英文 ×3                   | e8a97e9cb（2026-03-21，早于 i18n 体系）                                  | zh 面混渲染英文                             | 批内修 |
| WA-bundle-001   | 3 devDeps + FluxSchemaObject                | facade 收敛波（2026-07~08）/ 8c1281620→d89953e03（2026-05-15→孤儿）      | 死重与不可达类型                            | 批内修 |

**「按住未修问题且无出口」的经典重转正件为零**——头部风险是 init 配置静默弃置（W4 族，单例幂等设计本体有测试钉住、缺的是丢弃信号）与一处用户可见错标；literalEn/literalZh 含测试面双双全零 + 近期时代症状性 message 0（100 条抽检仅 6 条且全部在 2026-03 前纪律时代）佐证。两处结构重复（拖拽双引擎/双面方法体）属「拆分/双面波未收口」而非「按住问题」。

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数   | 各份位置                                                                                | 冗余行数 | 漂移证据                                             | 裁定（三问句）                                 |
| --- | ------ | --------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- | ---------------------------------------------- |
| 1   | 2 大块 | useDraggablePosition ↔ useLauncherDrag（WA-debugger-001）                               | ~110     | 阈值 3px vs 4px + docked 注释分叉 + ux-r6 波双写兑现 | 同根因✅ 已漂移✅ 提取干净✅ → 批内修          |
| 2   | 2+3写  | automation/controller mutation 方法体（WA-debugger-002）+ 接口清单三写（豁免，排除 #5） | ~35      | 零现行漂移（逐字）；0cf4aad46 波双写兑现过一次       | 同根因✅ 提取干净✅ → 批内修（引用化）         |
| 3   | 8 骨架 | localStorage 持久化八函数（WA-debugger-008）                                            | ~60      | 空值语义 `!raw` vs `raw === null` 分叉               | 同根因✅ 已漂移✅（边界态）提取干净✅ → 批内修 |
| 4   | 2 大块 | buildInspectByCid ↔ buildInspectByElement 装配（WA-debugger-007）                       | ~45      | 零漂移（差异刻意：mounted fallback 语义）            | 同根因✅ 提取干净✅ → 批内修                   |
| 5   | 4      | formatClock 四胞胎（WA-debugger-006）                                                   | ~21      | 零漂移（逐字）                                       | 同根因✅ → 批内修                              |
| 6   | 3 写   | automation.ts ↔ types.ts 双接口声明镜像（探针 15-18 窗，排除 #5）                       | （豁免） | compiler 接线点兜底（:87 返回类型 / :462 satisfies） | 契约镜像 → 不立案                              |
| 7   | 2      | locales en-US ↔ zh-CN（归一 77 窗最大簇，排除 #6）                                      | （豁免） | 键集 1,810/1,810 程序化零差——纯数据镜像本体          | 豁免债 → 不立案                                |

（归一探针 197 组中其余同文件簇均为 registry/声明表惯用形与 debounce/防御骨架近形，走读全并集无漏检。）

### 3. Top 重构建议（默认 3 项）

1. **i18n 契约面同车收口（WA-i18n-001 + WA-debugger-003 + WA-debugger-010）**：根因修复点 = i18n.ts init 守卫补丢弃信号 + locales 补 notifyEvents/trace 三族键 + 两处消费点改引；预期删除本体 = 静默弃置形态 + `flux.common.more` 错借 + 3 裸英文串；回归 = init 判别测试（warn+语言保持）先红后绿 + key-parity 直通 + 面板快照类测试随更新；影响面 = flux-i18n 2 文件 + nop-debugger 3 文件，零 index.ts 变更；**双哨兵条款触发**（i18n.ts 属求值面）——加跑 flux-renderers-ai 全量 + flux-react 全量。
2. **拖拽引擎单源化（WA-debugger-001 单车）**：根因修复点 = useWindowPointerDrag(config) 提取；预期删除本体 = 双钩子重复体 ~110 行 + 漂移阈值/注释二义；回归 = panel-dock.test.tsx 拖拽套件零回归 + 阈值统一裁定落字；影响面 = panel/hooks.ts 包内单文件 + 两调用点，零公共面。
3. **机械清扫大扫除（WA-debugger-002 + 004 + 005 + 006 + 007 + 008 + 009 + WA-bundle-001 同车）**：根因修复点 = 引用化/删死码/单源提取八项；预期删除本体 = 双面方法体 + 死补偿 token ×2 + 死导出工厂 + formatClock ×3 副本 + 装配双写 + 持久化骨架 ×7 + CSS 双块 + 3 devDeps + FluxSchemaObject；回归 = 各包既有套件直通 + persist 断言；影响面 = nop-debugger 9 文件 + flux-bundle 2 文件，零 index.ts[x] 变更；knip 基线以修代重立（plan 571 先例）。

### 4. 误报排除清单（19 项）

| #   | 疑似点                                                                                       | 位置                                                                                         | 排除理由                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | typeBypass 非测试 0 复核 + 测试面命中 ×10                                                    | nop-debugger 两测试文件 + flux-bundle 三测试文件                                             | 非测试面零断言绕行（历批唯一零批组成立）；测试面命中全为夹具构造断言；flux-bundle index.test.tsx:69 更有「公共类型面禁 `as unknown as`」反向守卫测试——测试自身契约；hooks.ts:19 `as TFunction` 系 facade 加宽断言（包装函数运行时即委托真 t，JSDoc CX-7 契约注释在案）非绕行                                      |
| 2   | setTimeout 2 处                                                                              | controller.ts:231 / store.ts:116                                                             | waitForEvent = 订阅即就绪信号 + 显式超时 reject 的 waiter 协议（非等待他系统就绪的贿赂）；store.ts:116 = 持久化写合并 debounce（具名常量、幂等目标）——C 类误报全排除（RENDER_THROTTLE_MS 双语义共用记 watch 微注记 #3）                                                                                           |
| 3   | domRaid 5 处                                                                                 | controller-component-inspector.ts:228/242/249 + panel/styles.ts:12 + use-inspect-mode.ts:13  | 全为 devtool 契约通道：`[data-cid]`/`[data-runtime-id]` 系 flux-react 渲染标记契约的只读查询（inspect 本职）；styles.ts:12 = DEBUGGER_STYLE_ID 幂等样式注入（id 查重防重复）；use-inspect-mode overlay 高亮 = devtool 本职机制（受控 DOM、挂载清理对称）——E 类宿主集成边界全排除，零 style/textContent 数据流突袭 |
| 4   | getBrowserLocalStorage 描述符遍历防御（findPropertyDescriptor/resolveStorageFromDescriptor） | controller-helpers.ts:195-255                                                                | 宿主环境跨信任边界防御访问（SecurityError 规避 + test-setup `vi.stubGlobal` 存根兼容——两语境实证）；降级语义合法；死分支 :250-254 随 WA-debugger-008 立案不在此重复                                                                                                                                               |
| 5   | automation/types 声明镜像（逐字探针最大跨文件簇 15-18 窗）                                   | automation.ts:36-87 ↔ types.ts:349-401/:434-497                                              | 声明式契约镜像 + compiler 接线点兜底（createAutomationApi 返回类型 + `satisfies NopDebuggerController`）——wa-12 #9/#11 契约镜像判例族；其运行时面（mutation 方法体）已单独立案 WA-debugger-002                                                                                                                    |
| 6   | locales en↔zh 镜像（归一探针最大簇 77 窗）                                                   | flux-i18n/src/locales 两件                                                                   | 纯数据声明体豁免债（键集 1,810/1,810 程序化零差验证）——镜像即数据本体，非代码重复                                                                                                                                                                                                                                 |
| 7   | flux-i18n ↔ ui 双包各持 Symbol.for('nop.ui.i18nBridge') 桥接管线 ~15 行                      | flux-i18n/src/i18n.ts:20-36 ↔ packages/ui/src/lib/i18n.ts:41-56                              | **文档化刻意分化**（frontend-baseline.md:127-132：桥接槽/setI18nGetter/内置英文回退表/host 必须调 initFluxI18n 的契约全数在案；ui ← flux-i18n 依赖被刻意禁止）——wa-12 #6 双注册表判例族；双侧各有 i18n 契约测试（P1-8 bridge proof）                                                                              |
| 8   | reportInspectorDiagnostic 内层 catch void 0                                                  | controller-component-inspector.ts:15-21                                                      | 诊断通道自保卫（warn 失败不得再抛）；外层已路由 console.warn——观测纪律正面形态                                                                                                                                                                                                                                    |
| 9   | formatErrorDetail / parseRegexLiteral / buildEvaluateNodeExpression 三处 catch               | controller-helpers.ts:76-80 / panel.tsx:113-117 / controller-component-inspector.ts:446-463  | 循环引用保护 / 用户 regex 预期失败降级 / in-band `{ok:false,error}` 结构化协议——三形皆正面（wa-12 spreadsheet search 同族）                                                                                                                                                                                       |
| 10  | useInjectDebuggerStyles 挂载注入不清理                                                       | panel/styles.ts:6-20                                                                         | 幂等 id 注入，样式随面板生命周期持续有效为刻意（panel remount 不闪）；零重复注入守卫在案                                                                                                                                                                                                                          |
| 11  | styles-css `top: -14px` sticky header                                                        | panel/styles-css.ts:59                                                                       | sticky-inside-padded-container 标准技法（抵消本容器自身 14px padding 的结构性耦合，非补偿他者）；耦合值同文件可见——注记级，不立案                                                                                                                                                                                 |
| 12  | tailwind-preset `merged as Record<string, unknown>`                                          | tailwind-preset/src/index.ts:121                                                             | 受控内部变异窄化（保持入参/返回类型形状的合并惯用法）——非断言销毁报警                                                                                                                                                                                                                                             |
| 13  | danger/destructive 双轨色别名                                                                | tailwind-preset/src/index.ts:48-56                                                           | variant-vocabulary.md 登记的刻意双轨（schema-facing/shadcn-facing），注释自证                                                                                                                                                                                                                                     |
| 14  | event-groups/explanations-failure-async/diagnostics-failures 失败事件谓词内联 ×5-6           | explanations-failure-async.ts:50-53/:78-82/:108-113 + diagnostics-failures.ts:57-60/:155-159 | 4 行谓词低于 §3 块阈值（10 行）微重复；随 WA-debugger-002 收口可顺带提取 isFailureEvent——不单独立案                                                                                                                                                                                                               |
| 15  | getNodeSubject/getNodeRelated 同体双函数                                                     | explanations.ts:119-133                                                                      | 语义占位（subject/related 契约面的未来分叉点），6 行微——排除                                                                                                                                                                                                                                                      |
| 16  | `*.test-support.ts` 两件位于 src 根（非 `__tests__/`）                                       | panel.test-support.ts / controller-inspect-advanced.test-support.ts                          | 零模块顶层副作用（beforeEach 工厂/vi.fn 装配而已——与 ai-test-support 的顶层 reset+init 变体不同型）；文件名标记 + index.tsx 零导出 + 仅测试 import——cq-5 摆放注记不立案                                                                                                                                           |
| 17  | flux-bundle peerDeps 全量 + dependencies 空                                                  | flux-bundle/package.json                                                                     | facade 契约设计（运行时依赖全交宿主），`check:flux-bundle-pack` 门禁在案管护——设计内；devDeps 死重部分已立案 WA-bundle-001                                                                                                                                                                                        |
| 18  | json-viewer 50/10 截断阈值 + timeline VIRTUAL_ROW_HEIGHT=96 固定行高                         | panel/json-viewer.tsx:55-56 + timeline-tab.tsx:11-13                                         | 显示截断与虚拟化近似均为 devtool 有界折衷（展开态退出虚拟化守卫在案 :96-97）——设计内                                                                                                                                                                                                                              |
| 19  | CX 交界核对                                                                                  | CX-7（t() 前缀）/ CX-15 / CX-18 / WA-content-009 族                                          | CX-7 出口纪律 live 复核成立（normalizeTranslationKey + JSDoc + i18n.test.ts:143 判别测试）；CX-15/CX-18 不涉五包面；content-009 族三案 verified——根因包侧复核见 WA-i18n-001（本批新立，非重复立案）                                                                                                               |

**knip 登记债定性（plan Baseline 条款，五包 23 条逐档落字）**：

- **flux-i18n / tailwind-preset / theme-tokens：0 条**——三包零登记。
- **flux-bundle 4 条**（types 1 + devDeps 3）：**全部为真实死面** → WA-bundle-001 立案位点本体（3 devDeps 运行时契约已在 peerDeps、src 含测试零 import；FluxSchemaObject 不被 index 再导出且零消费 = 不可达公共类型）——收私/清除候选，非契约面。
- **nop-debugger 19 条**（exports 6 + types 13）：
  - exports 6 条中 `createRequestInstanceId` = **唯一真死代码**（零消费含测试）→ WA-debugger-005 立案位点本体；
  - `buildInspectResult`/`compareComponentTreeItems`/`findInspectableOwner` 三条 = **in-file 消费收私候选**（同文件 buildInspectByCid/ByElement/getComponentTree 内部调用；测试仅以标题字符串提及 buildInspectResult、无 import——de-export 零行为面，随 WA-debugger-007 装配提取顺带收口）；
  - `panel/styles.ts#DEBUGGER_STYLES/#DEBUGGER_STYLE_ID` 两条 = **死再导出**（styles.test.ts 直连 styles-css.js 消费、styles.ts:4 再导出行零消费）→ 删再导出行即可（机械收私候选，随 WA-debugger-009 CSS 清扫同车）；
  - types 13 条（全在 types-explanations.ts）= **公共 API 面契约形状声明族**：经 types.ts:30-43 再导出 + index.tsx `export type *` 公共化，是 automation API explain\*/inspect 返回形状的宿主引用面（wa-12 word RecoveryLoad 判例族）——**契约面完整性保留 + 弱消费 watch 注记**；de-export 即收缩公共面（违零变更条款）→ watch-only 契约面决策留人工，不批内动。

### 5. 范围整体判断

**不是系统性临时方案文化——本批是「双零字面 + 零 P0/P1」的最低危批组，问题形态是「迁移/拆分/双面波的收尾缺口」而非「按住问题的特判兜底」。** 正面证据七件：①literalEn/literalZh 含测试面双双全零（连续第六个双零批组）；②typeBypass 非测试 0（历批唯一）——零断言销毁报警，测试面还有反向守卫测试；③async 17 行逐条定性 16 豁免——devtool 的诊断/降级面大量采用 in-band 协议、console.warn 观测与自保卫，失败观测纪律是底色（唯一 W4 弱点在 localStorage 偏好家族且降级语境合法）；④domRaid 5 处全为 data 属性契约通道只读访问——devtool 的 DOM 访问收敛在契约面上，零数据流突袭；⑤症状性 message 近期时代 0（100 条抽检，6 条症状性全部在 2026-03 前 plan 纪律时代）；⑥theme-tokens/tailwind-preset/flux-i18n 数据面三包（8 文件）接近零信号（tailwind-preset/theme-tokens 零立案，注释锚密度高：plan 471/ux-r6/variant-vocabulary 锚全程在案）；⑦flux-bundle 薄 facade 三件自述式注释完整（shim 出生原因、3D 懒加载契约、types 对齐史）。问题集中三处：**「i18n 体系化的迁移波尾巴」**（notify 借键、formatTraceSummary 裸英文——i18n 化波回扫面板标签时漏掉非组件层的用户面字符串；根因包侧 init 静默弃置则是同一波次的契约缺口）、**「面板拆分波/双面波的复制沉积」**（拖拽双引擎、formatClock 四胞胎、双面方法体、CSS 双块——四波拆分各留一份未收口）、**「补偿/死码的孤儿化」**（active:translate-y-0 补偿目标被上游删除未回扫、createRequestInstanceId 出生即死）。整体判断：零星个案级，无需 roadmap 层面对策；12 条立案预期批内修 12 条（P2×3 + P3×9，无 successor-required）；watch 微注记 8 条；**本批无新增 CX-n**（共性门槛不触发：拖拽单源化/持久化骨架均为单包内提取，i18n 收口为双包数据+信号小改，不构成跨包/公共层机制共性）；转发 WA-15a 注记 1 条（playground ai-hitl-demo 模块顶层 init）。五包 index.ts[x] 公共导出面在全部批内修路径下零变更（flux-bundle FluxSchemaObject 不在 index 再导出清单、knip types 13 条公共面维持 watch 不动）。

## flux-i18n 单例特别条款取证（plan Baseline ②条款专节）

- **单例生命周期**：`fluxI18nInstance` 模块级单例（i18n.ts:38）+ `initFluxI18n` 幂等守卫（:58-61）+ `getFluxI18n` 懒初始化（:99-104）+ `resetFluxI18n`（:106-110，置空 + flux-core formatter 复位 identity + 桥接解绑——flux-core `i18n-sink.ts` 所有权文档「flux-i18n OWNS the write side」的对偶履行）。实例经 `i18next.createInstance()` 创建（非全局默认实例），reset 后旧实例仅存于闭包引用、可 GC——**无跨 reset 的实例泄漏面**。测试面：i18n.test.ts:23（单例复用）/:105（reset 复位）/:117（useFluxTranslation 跨 changeLanguage 绑定）+ i18n-contract.test.ts:44（reset 还原 identity）/:51-75（P1-8 bridge proof 三连）——生命周期主干有测试钉住；**唯一缺口 = 二次带参调用的丢弃行为零测试零信号**（WA-i18n-001）。
- **竞态面**：init 同步（`instance.init(initOptions)` 同步路径）+ `queueMicrotask` 无涉；changeLanguage 为 async 但仅作用单例实例，无并发初始化窗口（模块求值单线程）。`t()`/`useFluxTranslation` 的懒初始化意味着**消费侧可在无显式 init 时以默认 zh-CN 自举**——这是 content-009 的机制本体（模块求值期 t() 冻结默认语言），其出口纪律（消费侧渲染期 t()）已由 content-009/ai-006/dashboard-002 三案 verified 落实；根因包侧的对应收口 = WA-i18n-001 的丢弃信号，本批不改变懒初始化语义本身。
- **changeLanguage 面**：getCurrentLanguage/changeLanguage 均经 getFluxI18n（可能触发自举）；i18n.test.ts:42/:167 钉住语言切换与 t() 重解析（I1）——出口纪律成立。
- **消费链波及评估**：`@nop-chaos/flux-i18n` 消费面 live 计数 = **304 文件（非测试）/ 1,890 处 t() 调用**（与 plan Baseline「304 文件/约 1,900 处」吻合）；WA-i18n-001 修复为纯增观测（warn），不触碰求值路径与导出面——波及评估为零，但按双哨兵条款仍加跑 ai/flux-react 全量。

## 承接转发评估

1. **WA-content-009 根因包侧出口纪律复核（plan 575 交界防重复条款）**：**复核完成，出口纪律成立但有一处新缺口**。消费侧三案（content-009/ai-006/dashboard-002）修复均 verified 且判别测试在案；根因包（flux-i18n）侧此前零立案——本批 WA-i18n-001 为根因包侧首立案（init 丢弃信号），与三案不重复（三案修的是 t() 求值时点与测试支撑摆放，本条修的是 init 守卫可观测性）。
2. **playground `ai-hitl-demo.tsx:6` 模块顶层 `initFluxI18n({lng:'en-US'})`**：WA-i18n-001 的活体下游症状（其语言意图恒被 main.tsx 先行初始化静默吞掉）。playground 消费侧归 WA-15a——**转发注记**：15a 批核验该 demo 的 init 时序语义（移入组件 effect 或改为消费全局语言的说明性标注）；根因包侧修复（warn 信号）落地后此症状可观测化。
3. **wa-12 knip dependencies 1 条转发（playground page-designer-core 依赖）**：不属本批范围（维持 WA-15a 转发），本批五包 knip 面无 dependencies 条目。

## CX-n 裁定

**本批无新增 CX-n。** 共性门槛逐一核对：①拖拽双引擎/持久化八函数/formatClock 四胞胎/装配孪生——全部单包内提取，批内修档可达，不满足「跨包/公共层机制」门槛；②init 静默弃置——单点契约缺口非家族；③knip 收私（inspector 三函数 + styles 再导出 + bundle 四条）——机械清理，沿 plan 571「以修代重立基线」先例随批处理；④i18n 桥接管线双份——文档化刻意分化（排除 #7），若未来 flux-core 愿收编桥接原语（与 i18n-sink 同模式）可届时以 CX 评估，现不满足立案门槛。既有 CX 交界（CX-7/CX-15/CX-18）核对见误报排除 #19，全部不适用或出口纪律成立。

## watch 微注记（不入立案，本行即登记，不允许静默）

1. **panel.tsx:262-268 `void events;` 残迹 + createDiagnosticReport 每 render 重建**（`d9ecc654c` 稳定等价检查波的痕迹——非 memo 上下文里 void 引用无效果；报告构建每渲染一次）——下次触碰 panel.tsx 时顺手删 void 引用并评估提升为 useMemo。
2. **explanations.ts:374 evaluateMetaRule 静默 catch**——invalid 规则降级有 limitation 弱观测但编译错误文本未入 limitations；下次触碰 explanations 时随案把 error message 并入 limitations。
3. **store.ts:106-119 双语义常量 + 计数 Map 不回收**——RENDER_THROTTLE_MS 同时承担 render 节流与持久化 debounce 双语义（改一顶二）；lastRenderStartTimestamp 按 nodeId 只增不清（长会话 devtool 微泄漏，有界于不同节点数）。
4. **panel/hooks.ts useResizablePanel 拖拽中卸载不还原 body cursor/userSelect**（clear 仅挂在 pointerup/cancel；resize 中组件卸载残留全局样式）——下次触碰 hooks 时补 unmount 还原。
5. **controller-component-inspector.ts:270-273 compareComponentTreeItems stringify per-comparison**（perf 门禁位点）——devtool 树排序 n 有界，微低效；下次触碰排序面时预计算比较键。
6. **formula compiler per-call**（buildEvaluateNodeExpression:447 + evaluateMetaRule:348）——每次求值新建 compiler；devtool 低频路径微低效，随 #5 同批评估。
7. **panel/hooks.ts `useCallback(..., [args])` 每渲染失效**（args 对象字面量传入）——React Compiler 基线下无害，注记备查。
8. **knip nop-debugger types 13 条公共面弱消费**（契约面完整性保留）——若未来 automation API 契约收口（公共面决策），随批重估 de-export。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID         | 严重度 | 建议去向 | 修复要点                                                                                 | 约束/验收判据                                                                  |
| --------------- | ------ | -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| WA-i18n-001     | P2     | 批内修   | init 二次带参调用补 console.warn + 判别测试                                              | 先红后绿；**双哨兵**（ai 全量 + flux-react 全量）；零 index.ts 变更            |
| WA-debugger-001 | P2     | 批内修   | useWindowPointerDrag(config) 提取，双钩子薄封装化                                        | panel-dock 套件直通；阈值统一裁定落字；`pointermove` 监听收敛 1 处             |
| WA-debugger-003 | P2     | 批内修   | locales 加 `flux.debugger.notifyEvents`（双语）+ panel.tsx:88 改引                       | key-parity 直通；`flux.common.more` 在 nop-debugger grep = 0                   |
| WA-debugger-002 | P3     | 批内修   | automation input mutation/getter 改引用 controller 同名成员（保留 redaction 三方法差异） | persist 断言直通；`persistPanelOpen(debuggerId, true)` controller.ts grep = 1  |
| WA-debugger-004 | P3     | 批内修   | 删两处 `active:translate-y-0`                                                            | `active:translate-y-0` grep = 0                                                |
| WA-debugger-005 | P3     | 批内修   | 删 controller-helpers.ts:151-155                                                         | grep = 0；knip 以修代重立                                                      |
| WA-debugger-006 | P3     | 批内修   | formatClock 单源（panel 共享件）四处改引                                                 | `function formatClock` grep = 1                                                |
| WA-debugger-007 | P3     | 批内修   | resolveInspectResult 装配单源 + fallback 差异注释                                        | controller-inspect 套件直通                                                    |
| WA-debugger-008 | P3     | 批内修   | 删死分支 :250-254 + 持久化骨架单源 + 空值语义统一 + 观测策略落字                         | store.test.ts 直通；catch 收敛单源；空值裁定落字                               |
| WA-debugger-009 | P3     | 批内修   | 删 styles-css.ts:502-505（+ styles.ts:4 死再导出随车[knip 两条收私]）                    | styles.test.ts 直通；knip 两条随消                                             |
| WA-debugger-010 | P3     | 批内修   | 加 noTraceYet/noTraceHint/recentInteraction 三键 + formatTraceSummary 改 t()             | key-parity 直通；裸串 grep = 0（可与 003 同车）                                |
| WA-bundle-001   | P3     | 批内修   | 删 3 devDeps + FluxSchemaObject 接口                                                     | `check:flux-bundle-pack` 直通；knip 四条随消；index.tsx `git diff --exit-code` |

**批内修合计 12 项**（P2×3 + P3×9），排期 0 项，watch 8 条（微注记行即登记），CX-n 0 项，转发注记 1 条（WA-15a）；五包 `index.ts[x]` 公共导出面在全部批内修路径下**零变更**（Phase 2 以五包 index 文件 `git diff --exit-code` 为验收判据之一）；触及 flux-i18n 求值面的修复（WA-i18n-001、003、010 的 locales 触达）按双哨兵条款加跑 flux-renderers-ai 全量 + flux-react 全量。

## 批内修复记录（Auto-Remediation）

> 本报告为 review-only 取证产出；本节由 Phase 2 执行会话按 roadmap 自动修复契约 §2–§4 回填（每项验证临时方案本体已删除）。修复执行由主会话派驻修复 agent 按本报告修复候选清单实施，三处偏离均在授权弹性内（偏离 #1 warn 形态取 [flux-i18n] 前缀惯例无环境门控；偏离 #2 debugger-007 首版守卫前置语义偏移执行期自捕→fallbackRequiresAnchor 参数化复绿；偏离 #3 debugger-008 观测策略取契约注释方案[console.debug 会新增 console-baseline 门禁命中且基线不可改]）。

| 发现 ID         | 严重度 | 修复方式                                                                                                                          | 回归测试（红→绿/行为保持读数）                                    | 本体删除验证                                                                                              | commit                            |
| --------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------- | ----------- |
| WA-i18n-001     | P2     | fix——i18n.ts init 二次带参调用补 console.warn（纯增观测）+判别测试 ×2                                                             | 先红后绿：红 1 failed→32/32；双哨兵 ai 850/850+flux-react 550/550 | 静默弃置形态消亡（warn+语言保持断言钉住）                                                                 | 本批 commit                       |
| WA-debugger-001 | P2     | fix——panel/hooks.ts 提取 useWindowPointerDrag(config)（阈值统一 4px 裁定落字）                                                    | 行为保持 135/135→135/135                                          | 双引擎孪生体消亡，拖拽面 pointermove 监听收敛 1 处                                                        | 本批 commit                       |
| WA-debugger-002 | P3     | fix——automation 十个 mutation 改引用 controller 同名成员（redaction 三方法保留）                                                  | 行为保持 135/135                                                  | persistPanelOpen(debuggerId, true) grep=1（原 2）                                                         | 本批 commit                       |
| WA-debugger-003 | P2     | fix——locales 加 flux.debugger.notifyEvents（双语）+panel.tsx 改引                                                                 | key-parity 直通                                                   | flux.common.more in nop-debugger grep=0                                                                   | 本批 commit                       |
| WA-debugger-004 | P3     | fix——删两处 active:translate-y-0                                                                                                  | 135/135                                                           | grep=0                                                                                                    | 本批 commit                       |
| WA-debugger-005 | P3     | fix——删 controller-helpers 默认工厂实例段（工厂本体保留）                                                                         | 135/135                                                           | createRequestInstanceId 默认实例 grep=0；knip 条目随消                                                    | 本批 commit                       |
| WA-debugger-006 | P3     | fix——新建 panel/format.ts 单源四处改引                                                                                            | 行为保持 135/135                                                  | function formatClock grep=1（format.ts）                                                                  | 本批 commit                       |
| WA-debugger-007 | P3     | fix——resolveInspectResult 装配单源+fallback 差异注释[执行期披露：首版守卫前置语义偏移自捕 1 红→fallbackRequiresAnchor 参数化复绿] | controller-inspect 全套直通 135/135                               | 三分支装配孪生体消亡                                                                                      | 本批 commit                       |
| WA-debugger-008 | P3     | fix——删 getBrowserLocalStorage 死分支+readPersisted/writePersisted 骨架单源+空值语义统一（raw===null                              |                                                                   | raw===''→默认值）+静默为设计契约注释落字[偏离 #3：console.debug 会新增 console-baseline 命中且基线不可改] | store.test+持久化用例直通 135/135 | catch 收敛 10→4（骨架 2+防御族 1+范围外既有 1） | 本批 commit |
| WA-debugger-009 | P3     | fix——删 .ndbg-inspect-section 冗余声明块+styles.ts 死再导出（knip 两条收私）                                                      | styles.test 直通 135/135                                          | 独立声明块 2→1（选择器写点 3→2）                                                                          | 本批 commit                       |
| WA-debugger-010 | P3     | fix——locales 加三键（双语）+formatTraceSummary 改 t()（渲染期求值）                                                               | key-parity 直通                                                   | 三裸串 grep=0                                                                                             | 本批 commit                       |
| WA-bundle-001   | P3     | fix——删 3 stale devDeps（lock 同步）+FluxSchemaObject 接口+孤儿 import                                                            | bundle 8/8+check:flux-bundle-pack 直通                            | knip 四条全部转 stale（no new hits）；index.tsx diff --exit-code                                          | 本批 commit                       |

批内修 12 项全部落地（P2×3+P3×9）；五包 index.ts[x] 零变更（五包逐包 git diff --exit-code）；门禁：flux-i18n 32/32、nop-debugger 135/135、flux-bundle 8/8+bundle-pack、双哨兵 ai 850/850+flux-react 550/550、check:i18n-keys/knip-baseline/console-baseline/duplicates-baseline 零新命中。

## 台账回写核对

- 本批新增 findings：12 条（WA-i18n-001 + WA-debugger-001…010 + WA-bundle-001）——已登记 ledger（fixed 12；flux-bundle-001 为 WA-bundle 前缀首条，五前缀零撞号）
- modules 行翻转 audited：flux-i18n / nop-debugger / flux-bundle / tailwind-preset / theme-tokens（五行 ✅——后两包零立案仅翻转）
- `pnpm workaround:reconcile` 输出摘录：193 findings = pending 0 + found 86 + fixed 12 + verified 95；modules 49/audited 41/uncovered 8/orphan 0；未处置 0；violations 0
