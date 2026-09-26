# QA.3 集成审计 #2 — missing-components L2（org 协议零分叉 + example e2e 断言）

> Auditor / Agent: 独立 fresh 子 agent（QA.3 集成审计员，2026-09-26；与执行会话无关）
> 审计对象: org 数据源协议在 user-select / department-select / input-city 三 renderer 间的**行为面**零分叉复核（QA.1-L2 已做静态面，本审计补行为面）；QA.1-L2 线出口审计 Major-1 修复复审（L2 线出口放行点）；L2 各 type example/lab 面 e2e 断言覆盖；五组件 design.md↔live 一致性抽查 + i18n 键族
> 审计基线: HEAD `d2fb1d05b`，主工作树干净（`git status -s` 仅本审计新增文件），无跨线在制品干扰
> 审计依据: `docs/backlog/missing-components-and-designer-roadmap.md` §11（QA.3 行）/ §13（L2 行）；`docs/architecture/org-data-source-protocol.md` §2/§4/§5/§7/§9；`docs/audits/missing-components/QA.1-L2-line-exit-audit.md`（Major-1 原始发现）；`docs/plans/511-missing-components-qa2-precondition-digestion-plan.md` Phase 4（修复记录）；`docs/audits/00-audit-execution-guide.md`（Pass = 0 Blocker 且 0 Major）
> 审计输入: Fresh Context 三件套（审计依据文档 + live 仓库 + 实跑验证输出），未读执行会话历史

## 1. org 协议零分叉复核（行为面）

### 1.1 共享面单一实现（行为面实测，非静态 grep 转抄）

全仓 src 检索（排除 dist 构建物与测试）：协议三操作的**全部行为实现**收敛在 `packages/flux-renderers-form/src/renderers/org/use-org-source.ts` + `org-data-protocol.ts`，无第二份：

| 协议面（§9 零分叉验收对象） | 唯一实现位置                                                                                                                                                                                                                          | 三操作消费点                                                                                                                                                                                  | 行为面证据                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| envelope 解析（§4.2）       | `parseOrgNodePage`（org-data-protocol.ts:89-104：裸数组宽容 / `nodes` 非数组空结果 / total·hasMore 类型宽容）                                                                                                                         | 仅 `requestOrgPage`（use-org-source.ts:72）调用                                                                                                                                               | 单测 26 条（org-data-protocol.test）+ useOrgChildren/useOrgSearch/useOrgEcho 全部经同一 `requestOrgPage` 出口                     |
| scope 变量注入（§4.1）      | patch 构造仅三处，均在 use-org-source.ts：children `{orgNodeId, orgDepth, orgPage, orgPageSize}`（:131-133，根加载 `orgNodeId:''`/`orgDepth:0`）、search `{searchQuery, orgPage, orgPageSize}`（:281）、resolve `{orgValues}`（:398） | 单测断言 patch 逐键命中（use-org-source.test.tsx :67/:152/:201/:218/:232/:279/:315）；e2e lab mock 按变量名取参（user-select-lab-page.tsx:43 `orgPage` 从请求读出并分页）——变量名契约双向实测 |
| 分页终止判定（§5 四规则）   | `shouldStopPaging`（org-data-protocol.ts:112-128，按序单结论）                                                                                                                                                                        | children 侧（use-org-source.ts:173）与 search 侧（:297）共用同一函数                                                                                                                          | 续页经 `mergeNodesById` id 去重合并（children :172 / search :294，同一实现）；单测含零新 id 守卫、hasMore:false 关闭、rule 优先序 |
| extraParams 注入（§6）      | `resolveExtraParams`（org-data-protocol.ts:171-183）+ `requestOrgPage` 内求值后 `{...patch, ...resolvedExtra}`（:65-68）——键覆盖操作变量                                                                                              | 单测 `orgNodeId: 'eval:override'` 覆盖命中（use-org-source.test.tsx:204-219）                                                                                                                 |
| 错误降级（§7）              | `orgFailureMessage`（use-org-source.ts:29-40）+ 固定键族 `flux.form.orgChildrenFailed/orgSearchFailed/orgResolveFailed`                                                                                                               | ok:false 不抛异常进内联错误态（children :163-169 / search :287-292）；resolve 失败静默回退原始值（:404-409）；AbortError 静默吞掉（:25-27/:76-78）                                            | e2e「children source failure surfaces an inline error with a retry action」实浏览器验证错误键文案 + 重试入口                      |
| INV-1 / dispatch 通道（§2） | org 模块唯一 dispatch 入口 `requestOrgPage`（use-org-source.ts:70），`helpers.createScope` 一次性子 scope + `disposeScope`；grep 零 `fetch(`/zustand/store 直连                                                                       | 渲染器不感知 transport，遵守不扩 `RendererEnv` 裁定                                                                                                                                           |

### 1.2 三消费方零分叉

- **user-select / department-select**：两薄 renderer（user-select-renderer.tsx / department-select-renderer.tsx）仅差 `rendererType`/`defaultSelectableTypes`/placeholder 三参，数据面全部经共享核心 `OrgSelectRendererControl` → `useOrgData`（org-select-control.tsx:45-57）。
- **input-city**：`InputCityRenderer` 同样唯一经 `useOrgData`（region-renderer.tsx:38-50，按窄化 schema 不传 `sourceSearch`）；桌面 RegionColumns / 移动 RegionWheel 均为纯呈现层，只读 `OrgDataState`（rootState/nodeStates/labelsFor/loadMore），零自建取数。
- 呈现层差异（弹层形态、单/多选、load-more 按钮位置）属协议 §9 明文允许面；envelope/变量名/终止/错误键四项**行为面各只有一份实现**——「零分叉」在行为面成立。

## 2. Major-1 修复复审（QA.1-L2 fail → 本节为改判放行依据）

### 2.1 原始发现回顾

QA.1-L2 Major-1：协议 §5 明文 children 与 search 均受分页语义约束（orgPage 递增、合并去重、终止四规则），而 `useOrgChildren` 恒发 `orgPage:1`、无续页路径、无 hasMore 暴露、load-more UI 仅 search 侧——单层子节点 > pageSize 时静默截断且未裁决。

### 2.2 修复实现逐点核对（use-org-source.ts live）

| 复审点                       | live 证据                                                                                                                                                                                            | 结论           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| orgPage 递增（per-key 游标） | `pageRefs: Map<string, number>`（:114，key=节点 id / 根哨兵 `__org_root__`）；`loadMore` 取 `(pageRefs.get(key) ?? 1) + 1`（:221）；`fetchChildrenPage` 每次回写游标（:130）                         | ✅             |
| 与 search 侧共享合并/终止    | 续页走同一 `mergeNodesById(baseNodes, page.nodes)`（:172）+ 同一 `shouldStopPaging`（:173，knownIds=续页前已载 id 集）——与 useOrgSearch :294/:297 完全同源                                           | ✅             |
| hasMore 终止暴露             | `OrgNodeLoadState.hasMore`（:20）由终止判定回写（`hasMore: !stop`，:174）；`loadMore` 前置门 `status==='ready' && hasMore`（:217）                                                                   | ✅             |
| UI 承载                      | org-select-panel 树分支 load-more 行（org-select-panel.tsx:317-328，search 分支 :262-271 原有）+ region-columns 列级 load-more（region-columns.tsx:77-86/:152-154）；复用 `flux.form.orgLoadMore` 键 | ✅             |
| 首页/续页状态语义            | page 1 根层替换、节点层保留旧行（echo 友好，:149-153 注释在案）；续页保持已载行可见                                                                                                                  | ✅             |
| region-wheel 无 load-more    | **豁免已记录**（plan 511 Phase 4：滚轮形态无按钮承载位，合并后 nodes 自动流入数据面，大数据集由 host 调 pageSize）——符合协议 §5「children hasMore 与内部分页 UI（如有）解耦」条款，非静默缺口        | ✅（记录在案） |

### 2.3 实跑验证

| 验证                      | 命令 / 对象                                                                                                                                                        | 结果                                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| focused 单测（抽跑）      | `pnpm --filter @nop-chaos/flux-renderers-form test`（grep 未收窄，实跑为全包超集，覆盖更强）                                                                       | ✅ **111 文件 / 931 passed**（含 plan 511 声称的 4 条新增续页用例：root 续页合并+orgPage=2（test :131-153，断言 `scopes[1].patch = {orgPage:2, orgNodeId:''}`）、零新 id 终止守卫（:155-167）、hasMore:false 关闭分页（:169-180）、node 级续页（:182-202，断言 `{orgNodeId:'d1', orgPage:2}`）） |
| e2e paged-root 用例真实性 | tests/e2e/org-select-user.spec.ts:90-110「paged root continues via load-more and terminates after the last page (§5)」+ lab mock（user-select-lab-page.tsx:47-50） | ✅ **真实验证**：mock fetcher 从请求读 `orgPage`（:43）——page 1 服务 2 节点+`hasMore:true`、page 2 服务余量；e2e 断言 load-more 可见→点击→`dept-hr` 出现→load-more 消失（终止信号落地）。即 orgPage 递增→合并→终止全链在真浏览器经服务端驱动 hasMore 走通，非单页 mock 自说自话                  |
| e2e 抽跑（本审计实跑）    | `npx playwright test tests/e2e/org-select-user.spec.ts tests/e2e/input-city.spec.ts`                                                                               | ✅ **7/7 passed**（10.0s，含 paged-root 用例本体）                                                                                                                                                                                                                                               |

### 2.4 L2 线出口复审结论

**Major-1 闭合，予以放行。**修复走 QA.1-L2 审计给出的路径 (a)（补实现追平协议 §5），机制与协议条文逐点一致（§2.2 表），并以单测 + 服务端驱动分页的真浏览器 e2e 双层验证（§2.3）。依据 plan 511 Closure 节与 QA.1-L2 审计 :141 的既定安排（「修复后随 QA.3 专项复审本项闭合即可放行，无需重开 L2 各 plan 的 closure audit」），**QA.1-L2 线出口审计的 fail 就 Major-1 项改判为 pass，L2 线出口（含 L2.1/L2.2 的 roadmap `done` 带瑕疵放行状态）自本审计起转正**。本审计未发现该修复引入的新契约漂移（input-city design.md 的 marker 清单滞后一句，见 Minor-1，不属契约漂移）。

## 3. example schema 程序化断言（example/lab 面）

| type              | e2e spec（tests/e2e/）        | 用例数 | 覆盖的 lab 场景（playground 注册链：examples.manifest.json :73-77 + form-route-entries.ts :334-366 + renderer-lab-registry.ts :164-168 全部在案） |
| ----------------- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| user-select       | org-select-user.spec.ts       | 4      | 懒加载导航+选择 / echo 解析+远程搜索 / children 失败重试 / **paged root 续页+终止**                                                               |
| department-select | org-select-department.spec.ts | 2      | 多选勾选+空页终止 / search+echo 单选                                                                                                              |
| input-city        | input-city.spec.ts            | 3      | 桌面三级级联+路径提交 / `extra.path` 回显 / 移动 wheel 分支+confirm                                                                               |
| input-signature   | input-signature.spec.ts       | 3      | 零笔画⇔undefined 不变式全链 / DPR 几何位图采样 / readonly+初值回绘                                                                                |
| verification-code | verification-code.spec.ts     | 3      | 齐位提交 / masked 透明槽符 / 退格回落 undefined                                                                                                   |

- 五 spec 均针对 playground lab 页真实场景（`scenario-stage-*` 锚点逐场景断言），非 registry 冒烟；注册面（manifest/quick-reference/index/route）经 QA.1-L2 八面核对 + playground route-matrix 泛化 parity 守卫（L0 1c 不变式）持续在册。
- **抽跑**：org + city 两 spec 7/7 passed（§2.3）。其余三 spec（department/signature/vcode）在 plan 511 Closure 收口记录（org 族 e2e 9/9 含 paged-root；e2e 全量 1562 passed）与本审计静态核对范围内无红。

## 4. 文档一致性与 i18n

### 4.1 design.md ↔ live 抽查（每组件 ≥2 点）

| 组件              | 文档陈述                                                                                   | live                                                                                                                                                               | 结论             |
| ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| user-select       | §3 注册于 org-renderer-definitions + wrap:true；§5 selectableTypes 默认 `['user']`         | org-renderer-definitions.ts:59-73 / user-select-renderer.tsx:11                                                                                                    | ✅               |
| user-select       | §8 句柄 clear/reset/focus/open；§10 marker 族含 load-more；§12「分页仅提供 loadMore 追加」 | ORG_SELECT_METHODS（org-select-control.tsx:12）/ org-select-panel load-more slot（:320）/ 实现一致                                                                 | ✅               |
| department-select | §5 唯一默认差异 selectableTypes `['department']`；§7 空页缓存「再展开不重发」              | department-select-renderer.tsx:11 / 单测 :94-108 实证                                                                                                              | ✅               |
| input-city        | §4 窄化 schema 无 sourceSearch/multiple/searchable/searchMergeMode；§9 回显路径三通道      | InputCitySchema Omit（schemas-org.ts:73）+ inputCityFieldRules 过滤（org-renderer-definitions.ts:32-34）/ pathTable→extra.path→原始值（region-renderer.tsx:71-83） | ✅               |
| input-city        | §13 桌面 absolute+backdrop / 移动 Sheet wheel 双形态共享数据面                             | region-renderer.tsx:126-167                                                                                                                                        | ✅               |
| input-city        | §10 marker 清单                                                                            | live region-columns.tsx:80 新增 `data-slot="region-load-more"` **未列入** §10 清单；columns load-more 与 wheel 豁免的分页面亦仅记录于 plan 511、design.md 未同步   | ⚠️ → **Minor-1** |
| input-signature   | §1 零笔画⇔undefined 三路径一致；§11 pointer 原生绑定 + click 吞除器                        | signature-renderer.tsx:53（单点收口）/ :162-198（preventDefault + 捕获期一次性吞除 + canvas 原生 addEventListener）                                                | ✅               |
| input-signature   | §8 句柄仅 clear/reset；§10 marker 族 + `data-unsupported` 降级                             | SIGNATURE_METHODS = ['clear','reset']（:15）/ `data-unsupported`（:253）                                                                                           | ✅               |
| verification-code | §1 长度<length⇔undefined、陈旧码永不保留；§7/§13 故意非受控 + length 钳制（非正/非整→6）   | verification-code-renderer.tsx:21-22（钳制）/ :42-46（watcher 归一）/ defaultValue 非受控 + `next.length===length ? next : undefined` 门控                         | ✅               |

### 4.2 i18n 键族双语

- 协议错误键族 `flux.form.orgChildrenFailed/orgSearchFailed/orgResolveFailed` + 文案键 `orgSearchPlaceholder/orgLoadMore/orgEmpty/orgBreadcrumbRoot/orgRetry` + **新增 `orgClear`/`orgPanelClose`**：zh-CN.ts :276-285 与 en-US.ts :276-285 逐键双语齐（`清除/Clear`、`关闭/Close`），live 消费点（org-select-panel.tsx:186、region-renderer.tsx:108/:143）全部走 `t()`——QA.1-L2 Minor-3（硬编码英文 a11y 微标签）修复落地确认。
- region/signature/verification-code 键族（regionPlaceholder/regionLevel\*、signatureUndo/\_Clear/Unsupported/AriaLabel、verificationCodeAriaLabel）双语在案。

## 5. Findings

**Blocker：无。Major：0。Minor：2。**

### Minor-1 input-city design.md §10 marker 清单未随 Major-1 修复同步（文档滞后，非契约漂移）

- Major-1 修复在 region-columns.tsx:80 新增 `data-slot="region-load-more"`，但 `docs/components/input-city/design.md` §10 的 marker 枚举未含该值；columns load-more 行为与 region-wheel 无 load-more 的豁免裁决也仅记录在 plan 511 Phase 4，design.md §12/§13 未同步一句（对照：user-select design.md §10/§12 已同步 load-more 面）。
- 影响：纯文档卫生；行为面与协议 §5 一致（数据面合并后 nodes 对两形态均生效），e2e/单测全绿。建议 QA.7 前一次性补：§10 加 `region-load-more`、§12 加一句「columns 分页 loadMore；wheel 形态豁免（host 调 pageSize），裁决记录 plan 511 Phase 4」。

### Minor-2 useOrgChildren 中断请求的层级状态滞留 loading（liveness 边缘，非契约违反）

- use-org-source.ts 单一 `controllerRef`（:113）承载全部 children 请求：新请求启动即 abort 前次（:128-129）；被 abort 请求按 §7 静默吞掉（:161/:177-179），但其层级状态停留在前次写入的 `status:'loading'`。若某节点/根的首页加载在飞行中被另一展开/load-more 打断，回到该层级时恒显 spinner——`loadNode` 对非 error 状态短路（:206）不重发，面板对非 error 态不渲染 retry，本面板内无自愈路径（仅字段重挂载清空）。
- 定级 Minor：触发需在同一字段的面板内于请求飞行窗口内交错展开（本地/低延迟场景难触达）；§7 本就规定 abort 不进错误态，故非协议违反，属共享层状态机的 liveness 缺口。建议方向：abort 落地时将该层级状态回退 `idle`（或保留已载行并回 `ready`），使再次展开可自然重试。记录供 QA.7 / 下批 org 族迭代。

### Observation-1 useOrgEcho 的 pageSize 死参数

- use-org-source.ts:396 向 `requestOrgPage` 传 `pageSize: 50`，但 resolve 按 §4.1 不注入 `orgPage/orgPageSize`（patch 仅 `orgValues`，:398），该参数实际不参与请求——纯卫生项，不构成分叉，随手清理即可，不计 finding。

## 6. Verdict

**pass**（0 Blocker / 0 Major / 2 Minor）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。四项审计内容（协议行为面零分叉、Major-1 修复复审、example/lab e2e 断言、文档+i18n 一致性）全部成立；Minor-1/2 按 roadmap §11 纪律登记，供 QA.7 最终验收前消化，不阻断本 gate。
- **L2 线出口复审结论（专节见 §2.4）：QA.1-L2 线出口审计 Major-1 闭合改判 pass，L2 线出口正式放行。**
- 实跑验证留档：form 包单测 931/931（含续页 4 用例）、org+city e2e 7/7（含 paged-root 续页终止用例）。
