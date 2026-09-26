# QA.1 线出口审计 #2 — missing-components L2（P1 企业表单层）

> Auditor / Agent: 独立 fresh 子 agent（QA 线出口审计员 L2 线，2026-09-26）
> 审计对象: 七个 plan 及其交付提交——plan 504 `e03153bee`（L2.0）/ plan 505 `5c564715c`（L2.1）/ plan 506 `bad7ba5dd`+`0a6996e9e`（L2.2）/ plan 507 `c8db301c9`+`7f668e70e`+`6666ab922`（L2.3）/ plan 508 `1933a84d1`+`6750ef5ca`+`37bcd5c20`（L2.4）/ plan 509 `780540ebf`+`8c74ee8a6`（L2.5）/ plan 510 `f537598d7`+`6595cbe0c`+`63b371fd8`（L2.6）；各 plan closure audit 均已 approved 在案
> 审计输入: 七份 plan 文件 + 各提交 `git show --stat` 及按需细看 + 验证输出记录（Fresh Context 三件套，未读执行会话历史）
> 依据: `docs/backlog/missing-components-and-designer-roadmap.md` §1/§5/§11/§13；`docs/audits/00-audit-execution-guide.md`（severity 词汇；Pass = 0 Blocker 且 0 Major）；格式先例 `docs/audits/missing-components/QA.1-L0-line-exit-audit.md`
> 审计环境备注: HEAD == `63b371fd8`，主工作树干净（`git status -s` 空），无跨线在制品干扰。

## 1. 交付铁律 8 项逐行核对（L2 混合线裁剪口径）

L2 线性质混合：代码项 L2.1/L2.2/L2.3/L2.4 按全 8 项核对；纯文档项 L2.0（协议文档）/L2.5（既有控件扩展协议）/L2.6（裁决文档）按 roadmap §5 各行定位裁剪（无代码/无 example，核 design-doc 落盘 + 登记 + 回写；roadmap §10 末对纯文档项预声明裁剪，L2.5 缺预声明已随 509 提交记录为 roadmap 侧笔误）。

| #   | 交付物       | L2.0 协议（纯文档）                                                                               | L2.1 org select ×2（代码）                                                                                                   | L2.2 input-city（代码）                                                                                                             | L2.3 input-signature（代码）                                                                                                                      | L2.4 verification-code（代码）                                                                                                | L2.5 money format（纯文档）                                                                                                  | L2.6 cascader 裁决（纯文档）                                                                             |
| --- | ------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | 前置裁决     | ✅ INV-2 A 档裁定落协议 §2（不扩 env），renderer-env.md §7 增行在案                               | ✅ Form Core 增两行（matrix :144-145，`runtime`/`landed`+flip 注记）；human gate = 用户 2026-09-25 指令，plan 授权记录节在案 | ✅ §5 `input-city` 行删除 + Form Core 增行（:146）                                                                                  | ✅ §5 `input-signature` 行删除 + Form Core 增行（:147）                                                                                           | ✅ Form Core 增行（:148）——delivery commit 漏 staging，closure r1 Blocker A 拦截，`37bcd5c20` 补落（gate 体系有效运作的证据） | ✅ 既有控件扩展路径走对：不 flip matrix，改登记 improvement-analysis X6（:251）+ improvement-roadmap X6 挂账（demand-gated） | ✅ 裁决本体：matrix Folded 节 demand-gated 标记内联（:246，3-cell 格式），human 签认五处可追溯           |
| 2   | design.md    | ✅（交付物即协议文档 `org-data-source-protocol.md`，189 行，最终态行文 ≤40KB）                    | ✅ 两份（user-select 99 行 / department-select 88 行；含 `sourceSearch`/`searchSource` 异位词警示义务）                      | ✅ 13 节（含 `sourceSearch` 窄化声明、`extra.path` 回显约定）                                                                       | ✅ 13 节（§1 值语义不变式、§11 工程点 DPR/click 吞除）                                                                                            | ✅ 13 节（故意非受控裁决、masked CSS 等价实现；closure r2 masked 文档漂移已修）                                               | ✅ input-number design.md §2.1 协议节（currency 三要素/值契约不变/双轨前置/precision+prefix-suffix 和解/naming pass）        | ✅ 裁决文档 `docs/analysis/cascader-vs-tree-select-decision.md`（active，场景枚举→承载力→结论→回写清单） |
| 3   | example+入口 | N/A（无组件）                                                                                     | ✅ example.json ×2 + 双 lab 页 + form-route-entries + lab registry；home 入口经 L0 注册表自动露出                            | ✅ example.json + region-lab-page + route/registry                                                                                  | ✅ example.json + signature-lab-page + route/registry                                                                                             | ✅ example.json + verification-code-lab-page + route/registry                                                                 | ✅ 裁决正确：example.json 维持不动（DESIGN-ACK-NOT-IMPL 下写入未实现 props 会伪造契约），协议示意以 design.md JSON 块承载    | N/A                                                                                                      |
| 4   | 代码+测试    | N/A（roadmap §5 明示 design doc only；共享实现义务 §9 留给首个消费 renderer）                     | ✅ 共享数据面 `renderers/org/` + 共享面板 + 薄 renderer 对；55 focused 单测 + e2e 双 spec 5 用例真浏览器                     | ✅ region-columns/wheel/renderer（复用 505 共享面零 fork）；9 focused + e2e 3 用例（`0a6996e9e` 补提交测试文件，计数 914 如实归属） | ✅ canvas + pointer events + 逐笔画撤销；7 focused（fake 2d stub + 无 context 降级）+ e2e 3 用例（不变式全链/DPR 几何位图采样/readonly 行为断言） | ✅ ui InputOTP 消费（故意非受控）；6 focused（含初值归一 2 条，closure r1 增补）+ e2e 3 用例                                  | N/A（实现登记 Deferred，demand-gated successor 路径明确）                                                                    | N/A                                                                                                      |
| 5   | 登记         | ✅ docs/index.md :152 + renderer-env.md :291 + architecture/README.md :84 三处锚点                | ✅ examples.manifest.json runtime（:73-74）+ quick-reference（:883-884）+ components/index.md（:333/:516-517）               | ✅ manifest（:75）+ quick-reference（:885/:891）+ index.md（:333/:518）                                                             | ✅ manifest（:76）+ quick-reference（:887）+ index.md（:333/:519）                                                                                | ✅ manifest（:77）+ quick-reference（:889）+ index.md（:333/:520）                                                            | ✅ improvement-analysis X6 + improvement-roadmap X6（活页登记册）                                                            | ✅ gap-analysis :98/:107 + control-gap-survey :66 + matrix Folded 四处回写                               |
| 6   | i18n         | ✅ 键族预声明（§9 `flux.form.org*Failed` 固定键名）随 L2.1 落地                                   | ✅ 3 协议错误键 + 7 文案键 zh/en（双语在 locales :276-278 段实测命中）                                                       | ✅ 4 键 zh/en                                                                                                                       | ✅ 4 键 zh/en（closure r1 键名漂移 `signatureUnsupported` 已对齐）；字面色功能默认值按治理先例登记 ui-consistency-exemptions 并附判例回链         | ✅ 1 键 zh/en                                                                                                                 | N/A（无 UI 文案）                                                                                                            | N/A                                                                                                      |
| 7   | 审计         | ✅ plan draft review 1 轮 + 协议独立 review 2 轮共识（r1 3M fail→修复→r2 approved）+ closure 2 轮 | ✅ draft 2 轮 + closure 2 轮（r1 1M 协议补记未登记→补裁决节→r2 approved）；INV 审计 INV-1–5 + A–G 结论落 Closure 节          | ✅ draft 2 轮 + closure 3 轮（r1 契约面 1M、r2 接受面 1M、r3 diff 级 approved）；INV 结论在案                                       | ✅ draft 2 轮 + closure 2 轮（r1 readonly e2e 断言缺口→行为断言重写→r2 approved）；INV 结论在案                                                   | ✅ draft 2 轮 + closure 2 轮（r1 1 Blocker matrix 缺行 + 3M 初值归一/簿记/提前回写→全部修复→r2 approved）；INV 结论在案       | ✅ draft 3 轮（r1 4M+5m→r3 clean）+ closure 2 轮（r1 2M 提前回写/precision 条文→修复→r2 approved）                           | ✅ draft 2 轮（r1 4M/3m→闭合）+ closure approved（0B/0M/3m，Minor-2 watch-only 裁决在 Deferred）         |
| 8   | 验证         | ✅ 纯文档 Gates 裁剪（四项豁免注记）+ grep 复核记录 + dev log                                     | ✅ unit 74/74（form 905）+ check exit 0（1 条新红当场改写消解）+ e2e 零新增红（失败面 9+1+1 flake 隔离 3× 全过）+ dev log    | ✅ 74/74（form 914）+ check 0 + e2e 1555/10（=9+1）+ dev log                                                                        | ✅ 74/74（form 921）+ check 0（4 例字面色新红登记豁免后归零）+ e2e 1558/10（=9+1）+ dev log                                                       | ✅ 74/74（form 927）+ check 0 + e2e 1551/13（核心 9+1 稳定在列，余 flake 轮转隔离全过；数字口径见 Minor-4）+ dev log          | ✅ 纯文档豁免注记 + dev log（roadmap §13 拆行按 closure 后顺序执行，r1 M1 时序违规已校正）                                   | ✅ 纯文档豁免注记 + dev log（09-26）                                                                     |

**本项结论：8 项无缺失；L2 混合裁剪（纯文档三项的 3/4/6 N/A 判定与 L2.5 的登记路径切换）均成立。**L2.1–L2.4 四个代码项的全部五 type 在 matrix/manifest/quick-reference/index/route-registry/lab/示例/i18n 八个面逐一实测存在（本审计 grep/JSON 解析复核，非转抄 plan 自述）。

## 2. 该线 diff 代码质量抽查（L2.1–L2.4）

| 检查项                              | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| RendererComponentProps 契约         | ✅   | 四 renderer 均为 `RendererComponentProps<XxxSchema>` 签名（region-renderer.tsx:23 / signature / verification-code-renderer.tsx:19 / org 薄对）；句柄统一 `useInputComponentHandle`（clear/reset/focus/open 按 type 有别，与 design.md 一致）                                                                                                                            |
| 禁直连 store（hooks 通道）          | ✅   | org 族/signature/verification-code 全部经 `useFormFieldFromProps` + `handlers.onChange`；org 数据面唯一 dispatch 入口在 `use-org-source.ts`（`helpers.dispatch` + `createScope` 一次性子 scope + `disposeScope`，刻意不经 `executeSource`，协议 §2/§8 先例遵守）；全文件 grep 无 zustand/store 直连                                                                     |
| org 共享数据面单一实现（QA.3 前置） | ✅   | `parseOrgNodePage`/`shouldStopPaging`/`normalizeOrgNode` 全仓 src 命中仅 `renderers/org/org-data-protocol.ts`（余为测试与 dist 构建物）；三消费方（org-select-control/user-select/department-select 薄对、region-renderer/wheel/columns）全部 import `useOrgData`/协议纯函数，零第二份 envelope/变量注入/终止/错误键实现——「零分叉」在静态面成立（动态行为复核归 QA.3） |
| 禁裸 HTML（ui 优先）                | ⚠️   | 列表行/错误行 raw `<button>`/`<div>` 属 widget 自建样式 latitude；但 region 桌面面板手写 popover（backdrop div + absolute panel + Escape 处理，region-renderer.tsx:139-166）与家族先例（tree-controls.tsx:423 用 ui Popover、org-select-panel 用 Popover/Sheet）分叉，design.md :91 有声明 → Minor-2                                                                    |
| oversized-file 纪律                 | ✅   | 新文件最大 use-org-source.ts 404 行、org-select-panel 342、signature-renderer 312，均 ≤500；`check-oversized-code-files` 203 warnings / 2 errors 全 exempt，与 L0 审计时在册状态一致（零新增红）                                                                                                                                                                        |
| styling 契约                        | ✅   | `nop-*-field` 根类 + `data-slot="org-select-\*                                                                                                                                                                                                                                                                                                                          | region-\* | signature-\*"` marker 族、无 BEM；`cn()`合并；测试锚点`data-testid`/`data-node-id` 与 renderer-markers 约定一致 |
| React 19 纪律                       | ✅   | 渲染期派生（pathText/searchResults 渲染时计算）；ref 承载 identity-churn 值（extraParamsRef）属外部同步合理用法；无违规 useCallback/useMemo 镜像                                                                                                                                                                                                                        |
| 值语义不变式实现                    | ✅   | signature：`strokes.length === 0 ? undefined : canvas.toDataURL(...)`（signature-renderer.tsx:53）；verification-code：`next.length === length ? next : undefined` + 非齐位外部值 watcher 归一（verification-code-renderer.tsx:42-54）——两不变式与 design.md/plan 裁决逐字一致                                                                                          |

## 3. docs↔live 一致性

### 3.1 org 协议文档 ↔ `renderers/org/` 实现（协议 §操作/终止/降级 各 ≥2 点）

| 协议条文                                                                                          | live 实现                                                                                                                                                                                                           | 结论             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| §4.1 scope 变量六件套（orgNodeId/orgDepth/searchQuery/orgValues/orgPage/orgPageSize）             | `use-org-source.ts` 三操作 dispatch patch 逐一命中（:122/:177/:259/:376）                                                                                                                                           | ✅               |
| §4.2 envelope（裸数组宽容/nodes 非数组空结果/total·hasMore 类型宽容）                             | `parseOrgNodePage`（org-data-protocol.ts:89-104）+ 单测 26 条覆盖                                                                                                                                                   | ✅               |
| §5 终止四规则按序单结论                                                                           | `shouldStopPaging`（:112-128）hasMore=false → total → 空页 → 零新增 id，与 §5 逐条对齐；单测含「rule 1 优先于 total」「续页不停」反向用例                                                                           | ✅（判定函数）   |
| §5 「sourceChildren 与 sourceSearch 均受分页语义约束…请求翻页时 orgPage 递增，合并既有结果+新页」 | **search 侧全实现（debounce/翻页/merge/终止挂钩/面板 loadMore 行）；children 侧仅注入 orgPage:1/orgPageSize，无递增合并路径、无 hasMore 暴露、无 loadMore UI（org-select-panel.tsx:262-267 仅 search）**            | ❌ → **Major-1** |
| §3.1 宽容解析五规则                                                                               | `normalizeOrgNode`（:24-73）别名优先级/缺失回退/严格 disabled===true/extra 收拢/children 递归逐条命中                                                                                                               | ✅               |
| §7 降级表（searchMergeMode/本地过滤/leaf 短路/abort 静默/echo 短路/失败清空）                     | `use-org-data.ts` searchResults 三态（append/replace/本地）+ `filterLocalOptions` + `loadNode` leaf 短路（:155）+ AbortError 静默 + `useOrgEcho` 仅派发未命中值 + search 失败 `setRemoteNodes([])` 对齐 select 先例 | ✅               |
| §9 错误键族 flux.form.org\*Failed                                                                 | locales zh/en :276-278 + `orgFailureMessage` 插值实现                                                                                                                                                               | ✅               |

### 3.2 input-city / input-signature / verification-code design.md ↔ renderer（各 ≥3 点，值语义不变式重点）

| 组件              | 文档陈述                                                                         | live                                                                                                                                                                   | 结论 |
| ----------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| input-city        | 值形状 = 叶子层节点 id；路径文本三通道（会话路径表 / `extra.path` / 原始值降级） | `commit()` 写 pathTable + `pathTable[valueKey] ?? resolvedExtraPath(echoPool,…)` + `triggerText = pathText \|\| valueKey`（region-renderer.tsx:71-83）                 | ✅   |
| input-city        | `orgDepth` 分级语义（0=省/1=市/2=区）；全层级可选（selectableTypes 默认空）      | loadNode depth 透传注入；`isNodeTypeSelectable` 空数组全可选（协议 §3 补记 untyped 可选一致）                                                                          | ✅   |
| input-city        | 窄化 schema 双契约面（authored 残留键获 unknown-property 诊断）                  | `InputCitySchema = Omit<OrgSelectSchema,…>` + `inputCitySpecificContracts`（input-contracts.ts:218）+ `inputCityFieldRules`（org-renderer-definitions.ts:32/:105）双面 | ✅   |
| input-signature   | 零笔画 ⇔ undefined 三路径一致（初始/undo 至零/clear）                            | :53 单点收口 + clear 句柄提交 undefined；e2e 不变式全链路用例                                                                                                          | ✅   |
| input-signature   | 初值回绘 Image 异步解码、非法初值 onerror 保持空白不崩；无 context 降级          | 单测 7 条覆盖（Image.onload/onerror/fake 2d stub/无 context 占位）                                                                                                     | ✅   |
| input-signature   | 画布几何契约（CSS×height×DPR 映射）+ readonly 忽略绘制                           | e2e DPR 位图采样 + readonly 行为断言（closure r1 重写后）                                                                                                              | ✅   |
| verification-code | 长度 < length ⇔ undefined（含齐位后回退）；陈旧码永不保留                        | :54 门控 + :42-46 watcher 归一（外部推值也回落 undefined）；e2e 回退用例                                                                                               | ✅   |
| verification-code | 故意非受控（受控门控会重置格子）；length → maxLength + n×Slot；masked 容器类透明 | :80-99 `defaultValue`+`maxLength`+Slot 循环 + `containerClassName` masked 任意值类；design.md §7/§13 记录一致                                                          | ✅   |
| verification-code | length 钳制（非正数/非整数 → 6，无上界）                                         | :21-22 + 单测                                                                                                                                                          | ✅   |

### 3.3 纯文档项落盘抽验

- money 协议 §2.1 四项和解全部落条文（kilobitSeparator 关注点续承 / formatter-parser 即本协议实例 / prefix-suffix 共存不取代+防双真值源 / precision 独立共存）；X6 双登记（analysis :251 + improvement-roadmap :59 `proposed` demand-gated）。
- cascader 裁决文档四处回写与结论一致：matrix Folded :246（demand-gated 内联注记）、gap-analysis :98（L2.6 裁决注记）/:107（维持折叠+「Only if cascader columns rejected」旧从句按快照惯例保留，Minor-2 watch-only 裁决在案）、survey :66 owner 更新。

## 4. 本线 roadmap 状态回写准确性（§13 L2.0–L2.6 七行 + matrix 行位）

| 项                        | 回写声称                                                                                 | 复核                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| L2.0–L2.6 七行 `done`     | done（09-25 ×4 / 09-26 ×3）+ plan 号 + 裁决注记                                          | ✅ 与七 plan Status/\_closure、dev log 09-25/09-26 三方一致；L2.0 行「QA.3 复核项非遗留债」与 plan 504 Non-Blocking Follow-ups 表述一致 |
| 命名决议回写              | L2.1 两名不变 / region→input-city / signature→input-signature / verification-code 名不变 | ✅ matrix 行名、design.md 目录名、schema type 字符串、route id 四处实测同名；§5 起草行暂定名按 §13 前言「初值快照」规则不回改，处置正确 |
| matrix Form Core 增五行   | user-select/department-select/input-city/input-signature/verification-code               | ✅ :144-148 全部 `runtime`+owner doc 指向真实路径+`landed`+flip 注记；§5 notResained 表无残留行（grep 实测）                            |
| matrix cascader Folded 行 | demand-gated 标记 owner cell 内联                                                        | ✅ :246 3-cell 格式（6595cbe0c 修复 6-cell GFM 渲染破坏后）；与裁决文档结论一致                                                         |
| L2.5/L2.6 拆行            | 780540ebf 先拆（L2.5 done / L2.6 proposed）→ 63b371fd8 L2.6 done                         | ✅ 时序符合「closure audit 通过后才回写 done」（509 r1 M1 时序违规教训已校正的实证）                                                    |

## 5. 验证输出复核（本审计实跑部分）

| 命令/口径                                    | 结果                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| form 包 L2 focused 六测试文件（本审计实跑）  | ✅ **77/77 passed**（org-data-protocol 26 + org-input-city 9 + verification-code 6 + use-org-source/org-select-renderers/input-signature；8.3s）——与各 plan 声称计数吻合（26+55 org 系、7 signature、6 vc 的 focused 面在本抽验范围内全绿；verification-code echo 用例有一条 React value+defaultValue 开发态警告，不判定为红） |
| 台账口径一致性（不重跑 e2e，超审计预算）     | ✅ 「502 存量 9 + watch-only 1」核心失败面在 505/506/507/508 四轮全量记录与 dev log :47/:66/:84/:104 中口径逐字一致；9 项台账清单（dev log 09-25 :139）与 plan 502 Closure 节相符；watch-only 1 = kanban-perf:34（project-context 在册，gantt ×2 本轮未入失败列表与 L0 审计记录一致）                                          |
| e2e passed 计数算术                          | ⚠️ 505 1551+11=1562 → 506 1555+10=1565（+3 新用例 ✓）→ 507 1558+10=1568（+3 ✓）→ 508 **1551+13=1564，对 507 基线 +3 新用例应 ≈1571，短 7 无解释**（疑重载轮次 interrupted 未计入，零新增红结论不受影响——锚在稳定的 9+1 核心面与 flake 隔离复跑）→ Minor-4                                                                      |
| plan 声称的 build / lint / 全仓 test / check | 记录在案（各 plan Closure Gates + dev log）；本审计实跑 oversized 检查器结果与在册基线一致，未发现新增红                                                                                                                                                                                                                       |

## 6. Findings

**Blocker：无。Major：1。**

### Major-1 org 协议 §5 children 分页语义与共享实现不一致（docs↔live contract drift，未裁决的 v1 scope-out）

- **文档**：`docs/architecture/org-data-source-protocol.md` §5 明文「`sourceChildren` 与 `sourceSearch` **均受分页语义约束**……children 与 search 的翻页请求都注入 `orgPage`/`orgPageSize`；**请求翻页时 `orgPage` 递增，渲染器合并既有结果 + 新页（按 id 去重）**」，且 §5 规则 4（零新增 id 护栏「防无限循环」）以 children 续页存在为前提。
- **live**：共享实现仅 search 侧分页——`useOrgChildren` 的 `runRoot`/`loadNode` 恒发 `orgPage: 1`（use-org-source.ts:122/:177），无续页请求路径、无 `hasMore` 返回暴露；唯一 loadMore 消费点在 search（org-select-panel.tsx:262-267）；region-columns/region-wheel 同样无分页。单测「loadMore 下一页合并去重」仅覆盖 `useOrgSearch`；e2e/lab mock 均单页 children。
- **未裁决**：该取舍未出现在 plan 505 Non-Blocking Follow-ups（对比：移动 Sheet、搜索行导航均显式登记）、未出现在 user-select/department-select design.md、协议 §5/§7 亦无 v1 消费注记——构成 plan 505 closure gate「不存在被静默降级到 deferred/follow-up 的 in-scope contract drift」声称的反例。plan 505 自身 hook 规格只给 search 写了翻页（起草期 draft review 漏检 §5 children 面），实现忠实于 plan 但背离协议文本。
- **影响**：host 的 children 连接器若按协议实现真分页（某层子节点数 > pageSize，如大部门扁平挂 200 人、pageSize 50），面板静默只显首页 50 项——无错误、无续页入口、无文档披露。cascader 裁决文档 §2 已预告「cascader 若引入直接复用该数据面」，该缺口会随之放大。
- **修复路径（二选一，均为有界改动）**：
  - (a) 补实现：`useOrgChildren` 增加 per-node 续页（复用 `shouldStopPaging` + `mergeNodesById`，机制已在 search 侧验证），org-select-panel 层级列表加 loadMore 行 + focused/e2e 各 1-2 用例；
  - (b) 补裁决：协议 §5 加 v1 消费注记（children 翻页 demand-gated，首版逐层单页、host 可调 pageSize 兜底）+ plan 505 Follow-ups 补登记 + 两份 org design.md 同步一句——纯文档改动。
- **复审安排**：修复后随 **QA.3**（协议消费全面复核 gate，本就是下一道门）专项复核本项闭合；L2.1/L2.2 的 roadmap `done` 在修复+复审前属带瑕疵放行，是否回退状态行由人裁决（本审计仅记录 implication，不代行）。

### Minor-1 七 plan 簿记残留（5/7 plan 存在已完成态与阶段勾选不同步）

- plan 505：Phase 5 `Status: in progress` + 2 项未勾（INV 审计/全量验证）+ 1 条 Exit Criteria 未勾，而 Closure Gates/Closure INV 结论/roadmap/dev log 均记录完成。
- plan 506：Closure Gates 7 项未勾（defects/drifts/行为/owner docs/INV/e2e 等），Closure Status Note 与 INV 结论节却齐备。
- plan 507：Phase 3 `Status: in progress` + 「全量验证+roadmap 回写」未勾 + Closure Gates「closure-audit 已完成」未勾，而 Closure Audit Evidence 记录 r2 approved。
- plan 508：Phase 2「全量验证+roadmap 回写」未勾（roadmap 实已 done）；Non-Blocking Follow-ups 与 Closure Follow-up 均留模板占位符（「（收口时填写…）」/`<<收口时填写…>>`）。
- plan 509：Phase 2 Exit Criteria 未勾（roadmap 拆行已由 8c74ee8a6 落盘证实）；Closure Follow-up 同留占位符。
- 影响：纯文档卫生，不触及交付事实（每项勾选缺失处均有他节记录佐证），但 plan 是执行契约文书，占位符进入 completed 态有失精度。建议 QA.2 前一次性批量补勾/补写（同文件小改，先例：502 L0 审计 Minor-1/2 同批处理）。

### Minor-2 region 桌面面板手写 popover 与 ui-first 契约及家族先例分叉

- `region-renderer.tsx:139-166` 以 backdrop div（role=button）+ absolute panel 手写弹层定位/关闭，而 ui `Popover/PopoverContent` 可用且同线 org-select-panel（Popover/Sheet）与跨包先例 tree-controls.tsx:423 均消费 ui Popover；列表行/错误行 raw `<button>` 属 widget 自建样式 latitude（dense list 场景），不计。
- design.md :91 有「桌面 Popover 式列面板（absolute + backdrop 关闭）」声明，功能与 e2e 断言均绿，故 Minor；建议 QA.3 一并裁决是否收敛至 ui Popover（或反向把该形态立为 cascader 列面板先例时补 styling-system 注记）。

### Minor-3 硬编码英文 a11y 微标签绕过 flux-i18n

- `aria-label="clear"`（region-renderer.tsx:109、org-select-panel.tsx:186）、`aria-label="close"`（region-renderer.tsx:143）及字形 `✕`（:122）未走 flux-i18n 键。ui 包先例（breadcrumb/pagination 的 aria-label）说明微标签惯例现状宽松，且铁律 6 登记键清单未含此类，故 Minor；建议随下批 i18n 键批（L7.7 邻域）或 QA.3 收敛。

### Minor-4 plan 508 e2e 全量计数算术缺口无解释

- 507 全量 1568 total（1558+10）→ 508 新增 3 用例应为 ≈1571，记录为 1564（1551+13），短 7 未附解释（疑重载轮次 worker 中断/interrupted 未计入）。核心失败面 9+1 口径稳定，零新增红裁决不受影响；建议 QA.2 消化清单复核时对 508 轮次补一句归因注记，并确认 e2e 台账模板对 interrupted 的计数口径。

### Observation-1 delivery commit 分批卫生（已被 gate 体系拦截，记录不追责）

- 506 focused 测试文件漏入主提交、11 分钟后 `0a6996e9e` 单独补交（计数归属在 plan/commit message 如实披露）；508 matrix 行漏入主提交 staging、closure r1 Blocker A 拦截后 `37bcd5c20` 补落。两例均为「显式 staging 清单 vs 工作树实际改动」的执行疏漏，闭环记录完整，属 gate 体系有效运作证据，非本 verdict 扣分项。

### Observation-2 L2.6 human 签认以「概括放行」记录（程序性披露充分）

- 用户 2026-09-26「执行 roadmap 直到彻底完成」指令作为悬置签认 gate 的概括放行，五处可追溯（plan 510 Phase 2/Closure Gates/决策文档 §6/roadmap §13/dev log），并附 forward-only 修订条款与 dev log 如实披露「非逐项签认」。程序上可辩护；若用户后续对 cascader demand-gated 结论有异议，按既定 forward-only 路径修订即可。

## 7. Verdict

**fail**（0 Blocker / 1 Major / 4 Minor）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。Major-1（协议 §5 children 分页语义 docs↔live drift 且未经裁决）阻断本线出口。
- 修复路径见 Major-1（补实现或补协议裁决注记，均为有界改动）；修复后随 QA.3（协议消费全面复核）专项复审本项闭合即可放行，无需重开 L2 各 plan 的 closure audit。
- Minor-1（簿记批量补正）、Minor-2/3（QA.3 裁决窗口）、Minor-4（QA.2 消化清单注记）按 roadmap §11 纪律登记，在下一 gate 前消化。
- 除 Major-1 外，本线交付面核对全部成立：五 type 八项交付面齐全、org 共享数据面单一实现（零分叉静态面成立）、三组件值语义不变式 docs↔live 一致、matrix/登记/回写/台账口径准确，focused 单测 77/77 实跑绿。**审计未过期间，roadmap §13 L2 线「解锁 QA.1-L2/QA.3」中的 QA.3 放行不应视为已解锁——Major-1 修复为 QA.3 的前置输入。**
