# WA-7 内容/布局/移动渲染器 临时方案与坏味道审计报告

> 批次: WA-7（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 第 8 行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: `docs/plans/567-workaround-audit-wa7-content-layout-mobile-plan.md`
> 审计日期: 2026-10-11
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-7 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话）

## 快照基准注记

本批三模块中 **flux-renderers-layout 含 2 个在途源文件**（并行会话 dropdown-button 特性：`dropdown-button-renderer.tsx` 与 `schemas.ts`，另有 `dropdown-button-renderer.test.tsx` 非测试源码不入 inventory）。HEAD = `aeaf14177`（WA-6 收口 commit，与 plan 五门禁基线记载逐字一致）。在途 2 文件取证一律 `git show HEAD:<path>`（HEAD dropdown 快照 182 行存 `_tmp/wa7/`，用后已删）；content/mobile 零在途。

**双口径行数逐文件分解**（实测 `wc -l`，69 文件逐一对照）：

| 口径           | 全集行数 | 说明                                                                                                |
| -------------- | -------- | --------------------------------------------------------------------------------------------------- |
| inventory 口径 | 12,289   | WA-0 枚举器值（modules.json `loc`，layout 两在途文件按 live 值 204/366 计）                         |
| live wc        | 12,289   | = inventory 逐字吻合（content 5,879 + layout 4,254 + mobile 2,156，三模块均零差、零无尾换行约定差） |
| HEAD wc        | 12,261   | = live 12,289 − 在途漂移 28                                                                         |

在途漂移（live vs HEAD，逐文件）：`dropdown-button-renderer.tsx` **+22**（204/182）、`schemas.ts` **+6**（366/360），合计 +28。漂移 hunk 内容 = `visibleItems` 过滤块（AMIS-parity item.visible 条件求值 + `schemas.ts` 的 `DropdownButtonItemSchema.visible` 字段声明）。候选位点同位核验：typeBypass HEAD:36 = live:36、setTimeout HEAD:75 = live:75（在途 diff 未触及该两 hunk）；门禁 async 命中 live:140 位于**在途新增 hunk 内**（HEAD 同位无此代码，定性归并行会话变更，见门禁读数表）。plan 基线记载 "HEAD 口径 12,261/4,226" 可复算 ✅。另 plan 基线引 ≥500 行 4 件为 654/640/636/553，live wc = 653/639/635/552（4 件一致偏移 +1，拟制时口径约定差，以 live wc = inventory 为准）。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id                | 文件数 | 非测试行数                                          | 取证完成 | 备注                                                                                                                                                                            |
| ---------------------- | ------ | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-renderers-content | 39     | 5879（inventory）/ 5879（live wc）/ 5879（HEAD wc） | ✅       | 39/39 **全文读取**（零核心区档、零纯跳过档；含 ≥500 行 2 件：content-renderer-definitions 635、diff-view-renderer 552 全读）；门禁 6 项实跑；探针 1 份；git 考古 12 commit      |
| flux-renderers-layout  | 19     | 4254（inventory）/ 4254（live wc）/ 4226（HEAD wc） | ✅       | 19/19 全文读取（非在途 17 文件 live=HEAD；在途 2 文件 HEAD 快照口径取证 + live 漂移 hunk 单独定性）；含 ≥500 行 2 件：wizard-renderer 653、layout-renderer-definitions 639 全读 |
| flux-renderers-mobile  | 11     | 2156（inventory）/ 2156（live wc）/ 2156（HEAD wc） | ✅       | 11/11 全文读取；零在途三口径逐字吻合                                                                                                                                            |

全集 **69/69**；12 行滑窗 token 归一化探针（跨文件对合并区间，≥3 窗口阈值）原始命中 35 组；git 考古 14 commit；症状性 message 抽检 25 = 0。

### 门禁交叉实跑读数（prompt §5 第 3 步留痕）

| 门禁                              | 读数                                                        | 处置                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `find-async-without-failure-path` | **11 行命中**（桶 1 void-promise 2 + 桶 2 catch-located 9） | 11 处逐个定性：content 5（syntax-highlight:73 → **WA-content-007 P1**、image:59 → WA-content-005、diff-inline:20/json-view:74/mapping:44 排除）、layout 4（wizard:267 → WA-layout-003；wizard:454/:504 排除；dropdown-button:140 **在途 hunk 转发**）、mobile 2（pull-refresh:158/infinite-scroll:138 排除——均有结构化失败路径或 DEV 可观测） |
| `find-performance-suspects`       | **0**                                                       | 实跑确认                                                                                                                                                                                                                                                                                                                                      |
| `find-runtime-raw-schema-reads`   | **0**                                                       | 实跑确认                                                                                                                                                                                                                                                                                                                                      |
| `find-hardcoded-type-dispatch`    | **0**                                                       | 实跑确认                                                                                                                                                                                                                                                                                                                                      |
| `find-reactive-render-reads`      | **0**                                                       | 实跑确认                                                                                                                                                                                                                                                                                                                                      |
| `find-renderer-browser-io`        | **0**                                                       | 实跑确认                                                                                                                                                                                                                                                                                                                                      |

### 取证执行记录（prompt §5 步骤逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` = **0 命中**；`临时|先这样|暂时|绕过|workaround|hotfix` = **0 命中**（grep exit 1 实跑留痕）。与 inventory literalEn/literalZh 基线 0 逐字吻合。
2. **模式候选 18 处逐个定性**（grep 复现与 inventory 计数逐字吻合：typeBypass 9 = content 2 + layout 6 + mobile 1；setTimeout 6 = content 2 + layout 1 + mobile 3；domRaid 3 = content 1 + layout 2；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零实跑复核）：**1 处升级 P1 立案**（syntax-highlight:73 —— 叠加 lowlight 零注册实证后定性为特性整体静默失效，见 WA-content-007）、**6 处立案沉淀**（layout 六 renderer `as unknown as` → WA-layout-002；dropdown setTimeout → 误报 #4；domRaid 3 → WA-layout-004/误报 #19）、9 处误报排除（§误报排除清单）、1 处在途转发（dropdown:140）。content/mobile 的 typeBypass 4 处均居 test-support 文件（inventory 生成器不排 test-support）——mock 构造器动态边界误报（#1/#2），其**跨包复制**维度另立 WA-mobile-001。
3. **门禁交叉**：上表 6 项实跑；async 11 命中去重 11 处逐个定性（2 桶分解留痕；未批量放行亦未批量立案）。
4. **重复块识别**：12 行滑窗 token 归一化探针（跨文件对合并区间；在途 2 文件以 HEAD 快照参与；schemas.ts×dropdown w=172 一组为**探针伪影**——快照复用 bug 致两文件读入同一内容，丢弃）。原始命中 35 组 → 生产代码坐实 **6 组**（WA-content-001/002/003 + WA-layout-001 + WA-mobile-001 + audio↔video 测试镜像随源收敛）→ 测试面 2 组（contract-honesty ×3、cards 测试样板群，见 WA-mobile-001 证据与误报 #20）→ 其余 27 组排除（barrel 样板/测试 setup/同包测试参数化差异）。探针存 `_tmp/wa7/dup-probe.mjs`。
5. **范围结构走读**：**69/69 全文读取**（本批总量 12.3k 行允许全员全文档，无抽样）。≥500 行 4 件非测试源文件全部逐行走读：wizard-renderer.tsx 653、layout-renderer-definitions.ts 639、content-renderer-definitions.ts 635、diff-view-renderer.tsx 552（plan 拟制值 +1 口径差已注记）。oversized 登记债（WARN 档）不重复立案。
6. **已收敛模式三档复核**：①cq-5（`4ee46b668` i18n key merge/loading 约定/onSync rename）——三包 `onSync` 残留 **0**；`flux.common.loading` 通道一致、硬编码"加载中"零命中；mobile `t(key, { defaultValue })` 双保险形与 flux-i18n 键双侧在案（zh:1621/en:1626）✅ 零复发。②cq-6（`2c94d9d7f` type-safety seams）——本批收敛点仅触 mobile 测试 1 文件；生产面遗留 `variant as never` ×4（layout button-group:120-121、dropdown:136-137）为 schema→ui 联合词汇 seam，按 wa-4/5/6 builder 收窄判例排除 + watch 微注记（ui Button 联合类型未独立导出）。③历史教训档——`dataPath` 双词汇三包 **0 命中**（不适用）；strip errors / ajax 双写 **0 命中**（不适用）。④懒加载惯例——content 三方重库（qrcode/diff-match-patch/lowlight）均为**静态 import**（三包无候选懒加载件；`createLazyLibLoader` 在 data/map/scheduling 的收敛与本批无交集，不适用）。
7. **git 考古**：14 commit 溯源（详见逐条）；锚点核验——`a7d633a1e`（IS-8b 向导双 P1：computeCanGoTo 门控 wizard-step-nav:87-90 gatedByCommit + mountOnEnter 默认翻转 wizard-renderer:64-67，**两侧落地 ✅ 非单侧**）；`6021d090e`（plan 532 layout dom-structure）、`aa5155530`（plan 533 content）、`c3e16b267`（plan 534 mobile）——三包 dom-structure 契约卡片在案，本批不重复立案仅作考古线索；`4ee46b668`（cq-5）同时是 contract-honesty.test.ts ×3 的出生 commit（cq-5 "test placement" 波次产物）；`b5f585e6f`（ux-r12e）触 layout 仅 input-table 表头（非本批发现面）。**症状性 message 专项**：抽检三包最近 25 个 commit，全部带 plan 引用与根因/家族描述（V12a–f、cq-2/3/5/6、plan 480/483/485/486/488/489/514/532/533/534/553 等），**症状性 message 0**。
8. **误报排除复核**：24 项全记录（§误报排除清单）。

## 逐条发现（Findings）

### [类别B] syntax-highlight 双链断裂：lowlight 零语言注册 + hl-\* CSS 零规则，语法高亮特性整体静默失效（WA-content-007）

- **位置**: `packages/flux-renderers-content/src/diff-view/adapters/syntax-highlight.ts:7`（`createLowlight()` 零参构造——未注册任何语言）+ `:73-75`（`catch { return escapeHtml(code) }` 静默降级）+ diff-view.css（799 行，`hl-*` 规则 **0 条**）
- **严重度**: **P1**（无出口的转正临时方案 + 静默兜底实际吞掉特性级故障；**P0 条款考量显式记录**：P0 定义"静默兜底已实际吞掉真实故障"字面适用——catch 把 100% 必抛的错误转为静默；未升 P0 因无数据损坏/安全面，降档理由显式留痕，紧迫度归 Phase 2 裁量）
- **信号类别**: B（防御式掩盖——守卫触发即证明上游缺陷，静默兜底等于掩盖）+ I 邻（特性化石）
- **症状**: schema `language` 字段、split/unified 的 `highlightedHtmlMaps` 全量预计算、三栏视图逐行 highlight 调用、LRU 缓存、`hl-*` 类名——**整条语法高亮链路在生产零生效**：`createLowlight()` 无语言时 `highlight('js', …)` 恒抛 `Unknown language`（本审计 node 实证复现），catch 返回转义纯文本，缓存把降级结果也缓存住，零 warn 零上报
- **按住的根因**: ①lowlight 实例从未注册语言（正确形态 `createLowlight(common)` 或按需 `register()`）；②即使注册，产物 `class="hl-hljs-*"` 在全仓 CSS 无任何规则（双链断裂，第二链独立坐实"从未被看见"）
- **考古**: `cdab2db0f`（2026-07-21 diff-view standard implementation）——适配器**出生即死**（首 commit 即零注册 + 无 CSS）；此后 split/unified（同步)、three-column（aa5155530 对齐）均在其上叠加，无任何一处发现失效
- **违约基准**: W1（根因可指认：零注册）、W4（触发可观测：恒触发零观测）、W2（出口缺失：无 bug/plan 登记）、W5（"删掉 highlight 调用会怎样"——答案是无任何视觉差异，化石特征坐实）
- **为什么是临时方案**: 症状消失（无报错/无白屏）✅；根因仍在（语言零注册，换任何语言仍降级）✅；出口缺失 ✅——三要素同时成立
- **风险**: schema 作者设置 `language` 得到静默无效承诺；后续任何人"修高亮 bug"都会先在缓存+catch 的迷雾里打转；`highlightedHtmlMaps` 预计算白烧 CPU（每 hunk 每行一次 throw-catch）
- **修复方向**: ①注册语言集（`createLowlight(common)` 一行即活，bundle 预算 +~600KB 需产品拍板；或精选子集/按语言懒注册）；②catch 改 dev warn 一次（isDevRuntime 门控，`gd-diff-highlight-unknown-language` 诊断码惯例）——**两步缺一不可，只做②是继续按症状**；③hl-\* CSS 规则随语言集决策补齐（token 色映射进 diff-view.css 语义令牌）。回归 = 红测试先行（`highlight('js','var x')` 现恒返回纯文本→修复后含 `hl-` 标记 span）+ 未知语言 warn 一次断言
- **去向**: fixed=批内修（语法集选型若超批内预算 → 显式降级 successor-required 并登记，**不得静默**；最小不可妥协面 = dev warn + 不得缓存降级结果）
- **验证方式**: 新增用例先红后绿；diff 全套件直通
- **现状**: live 在案（HEAD=live，非在途文件）
- **跨批关联**: 门禁 async 桶 2 命中位点；plan 533（aa5155530）曾对齐三栏分支但未触高亮链路；无 CX 关联（包内聚）

### [类别H] diff-split-view ↔ diff-unified-view 双 useMemo 逐字双份（WA-content-001）

- **位置**: `diff-split-view.tsx:29-64` ↔ `diff-unified-view.tsx:28-63`——`inlineTokensMaps`（~21 行：相邻 add/delete 对逐 hunk 逐行建 `Map<hunkIdx, Map<lineIdx, InlineToken[]>>`）+ `highlightedHtmlMaps`（~14 行：逐行 highlight 建 Map）两块**逐字恒等**，合计 ~35 行；探针 w=52 连续同构窗口（整文件级同构）
- **严重度**: P2（双份大块 + 同根因 + split 侧正处 G1-R2 波次活跃期）
- **信号类别**: H（复制粘贴式增长）
- **按住的根因**: split/unified 双视图各自持有同样的两条 memo 管线；无共享 `useDiffPrecomputedMaps(file, {showInlineDiff, language})` 原语
- **考古**: `cdab2db0f`（2026-07-21）同 commit 双落
- **违约基准**: W3（2 份同步修点：inline token 语义或高亮管线任一变更需两处改）
- **修复方向**: 提取 `diff-view/model/use-diff-line-maps.ts`（或纯函数版，memo 薄壳）双文件 import；回归 = diff-view 现有套件直通；零公共导出变更
- **去向**: fixed=批内修
- **验证方式**: 行为保持提取，红绿同套同绿
- **现状**: live 双份在案
- **跨批关联**: 无（本包内聚）

### [类别H] audio ↔ video 媒体件生命周期逐字双份（WA-content-002）

- **位置**: `audio.tsx:8-103` ↔ `video.tsx:8-115`——asString 助手（3 行）、tracks Array.isArray 收窄、errored state + `[src]` 重置 effect、fallback figure JSX（destructive 样式三元 + `flux.common.noSource/loadFailed` 逐字同款）、tracks.map（同内容派生 key `${kind}:${srcLang}:${src}`）四块同构 ~40 行；探针 w=35 连续窗口（:28-73 ↔ :38-83）
- **严重度**: P2（双份大块、同根因、2026-09-29（`65755aff1` audio tracks）仍在活跃修改——§3 活跃双份 P2 正例）
- **信号类别**: H
- **按住的根因**: W4a 多媒体家族（`ab2913961`）同 commit 双件落地，各带一份媒体生命周期骨架；G4-R2 失败样式波次（plan 485）曾**双路径同步修**（两侧同款注释），同步修成本已兑现过
- **考古**: `ab2913961`（2026-06-24）→ `13cc0fd08`/`165eb98fa`/`65755aff1` 三波双侧同步演化，零漂移（现仅 schema 面差异：video 多 muted/width/height）
- **违约基准**: W3
- **修复方向**: 提取 `media-fallback.tsx`（figure + poster + errored 文案）+ `useMediaErrorState(src)` + `renderMediaTracks(tracks)` 包内共享，两件 import；回归 = audio/video 现有套件直通
- **去向**: fixed=批内修
- **验证方式**: 行为保持提取同套同绿；audio↔video 测试镜像（探针坐实）随提取自然对齐
- **现状**: live 双份在案
- **跨批关联**: 无

### [类别H] diff-three-column-view 三栏面板三份复制（WA-content-003）

- **位置**: `diff-three-column-view.tsx:132-166 / 167-200 / 201-235`——old/mid/new 三 pane 的 rows.map JSX 块各 ~35 行同构（仅 key 前缀/gutter 标签/行号字段/内容字段差；`isConflict`/`isMarker` 谓词在每 pane 内逐行重复计算 ×3；change-old/change-new 类为 pane 特有真实差），合计冗余 ~70 行
- **严重度**: P2（**≥3 份同根因 P1 起评；降档显式记录**：单文件内私有 JSX、无接口面、行为零漂移、单 commit 生成，提取 `renderPane(side, row, …)` 零风险）
- **信号类别**: H
- **考古**: `cdab2db0f`（standard implementation）三份一次写入；`aa5155530`（plan 533）做根 slot 对齐时同样三处同步改——同步修成本已兑现
- **违约基准**: W3（3 份）
- **修复方向**: 提取 pane 渲染函数（side 参数吸收 key/gutter/字段差，change-old/new 类以 side 映射表达）；isConflict/isMarker 提升到 rows.map 外每行一次；回归 = diff 三栏现有套件直通
- **去向**: fixed=批内修
- **验证方式**: 行为保持提取，红绿同套；plan 533 dom-structure 契约测试（三栏 root slot）直通
- **现状**: live 三份在案
- **跨批关联**: plan 533 已覆盖 DOM 结构透镜，本条为复制沉积透镜，不重复

### [类别E] diff-view remountKey 强制重挂载——折叠状态不受控的机制绕行 + 跨文件视图选中态副作用（WA-content-004）

- **位置**: `diff-view-renderer.tsx:213`（`remountKey` state）+ `:298/:303`（expandAll/collapseAll capability 内 `setRemountKey(k => k+1)`）+ `:347/:383`（`key={remountKey}` 挂 CrossFileDiffView/SingleFileDiff）；根因载体 `diff-hunk.tsx:31-36`（collapse state 仅 `useState(() => …defaultCollapsedLines)` **mount 期一次性捕获**，不响应后续 prop 变化）
- **严重度**: P2（单点行为缺陷 + E 类机制绕行：重挂载把"折叠状态不响应输入"的根因按住，并带副作用——跨文件模式**任意时刻 invoke expandAll/collapseAll 会把用户已切换的文件选择重置回 `activeFileIndex` 初值**（CrossFileDiffView `useState(clampedIndex)` 随重挂载重置），现有 R2.31 用例未钉此路径）
- **信号类别**: E（强制重挂载"解决"状态残留——key 为递增计数器属受控形态，但所有权 bug 未修）
- **考古**: `8fce950d5`（2026-07-22 diff-view defect fixes and test coverage）——缺陷修复批引入，message 为症状级（"defect fixes"），未登记折叠状态所有权问题
- **违约基准**: W1（根因=DiffHunk collapse state 无受控传播通道，未修）、W2（无出口登记）
- **修复方向**: 受控传播：`expansionState` 变化时经 effect/派生 key 同步 hunk `isHidden`（区分"用户手动 toggle 已覆盖"与"全局命令"——可用 expansionEpoch 只在命令到达帧生效）；`remountKey` 本体删除；回归 = R2.31 直通 + 新增"跨文件导航后 invoke expandAll 保持 activeIndex"钉测试（先红）
- **去向**: fixed=批内修（若 Phase 2 判受控传播超预算 → 显式降级 successor-required，**不得静默**；最小不可妥协面 = 副作用钉测试在案）
- **验证方式**: 红绿同套；`git grep remountKey` 本体删除验证
- **现状**: live 在案
- **跨批关联**: plan 533 不涉（DOM 透镜）；无 CX 关联

### [类别B邻] image fetcher 失败不触发 onLoadError——同组件双加载路径失败事件语义不一致（WA-content-005）

- **位置**: `image.tsx:107-124`（fetcher 路径 `.then/.catch` 仅 setErrored，无 `onLoadError`）↔ `:154-157`（src 路径 `handleError` fire `onLoadError`）；schema 契约 `schemas.ts:175-176`（"加载失败回调（触发后显示回退占位）"未区分路径）
- **严重度**: P3（低成本可修单点缺陷；家族语义核对：audio/video/qrcode 均在各自失败路径 fire onLoadError 且有测试钉（audio.test:70），image fetcher 路径是唯一缺口——`image-fetcher.test.tsx:65` 只钉 error state 不钉事件）
- **信号类别**: B 邻（失败路径观测不一致家族，同 wa-6 WA-data-009 形态）
- **考古**: `41a73cac5`（2026-07-21 image/mapping/markdown 批）——fetcher 特性落地时未对齐 src 路径事件契约
- **违约基准**: W4（fetcher 失败对 schema 作者零观测）、W3 弱
- **修复方向**: fetcher 路径 `.then`（uri 空）与 `.catch` 两分支补 `void onLoadError?.()`（对齐 qrcode 的 aborted 守卫次序）；`image-fetcher.test` 补事件断言
- **去向**: fixed=批内修
- **验证方式**: 断言用例先红后绿
- **现状**: live 在案
- **跨批关联**: async 门禁命中位点（image:59）的定性沉淀

### [类别I邻] diff-view 死层三件：@deprecated 死包装 + 死导出组件 + 生产未接线双解析器（WA-content-006）

- **位置**: ①`diff-file-list.tsx:226-242` `renderFileListSidebar` @deprecated wrapper——**index.ts 不导出、全仓零消费者**（仅 dist 陈旧 d.ts）；②`diff-line.tsx:89-114` `DiffGutter` memo——模块导出、包内零使用（gutter 已在 DiffLineComponent 内联）；③`diff-parse.ts:21-154` `parseUnifiedDiff`/`parseToDiffFile`——统一 diff 文本解析器**生产零接线**（DiffViewSchema 无统一 diff 输入字段；仅 diff-core.test.ts 13 例钉住；与 `computeDiffFile`（直连 dmp）构成双解析器并存）
- **严重度**: P3（watch-only：①②为**已登记债**——DV-DISP-04（2026-07-22）+ plan S20.6（勾选"deprecated or removed"，实际只做了 deprecated 半边）+ `audit-remediation-roadmap.md:430` P2-H（登记的 diff-gutter.tsx DiffGutterCell 已随文件删除，但 diff-line.tsx 孪生体漏网）；③为新观察面。出口已过期 ~2.5 个月，升级定性：**已登记项的出口过期确认**，不重复立案）
- **信号类别**: I 邻（转正临时层/死代码）
- **考古**: ①`1a6656013`（2026-07-21 cross-file diff view）；②③`cdab2db0f`（2026-07-21）
- **违约基准**: W2（已登记但过期）、W5（DiffGutter "删掉会怎样"——无答案，零消费）
- **修复方向**: ①②随下次触碰删除（wrapper 按 deprecated-feature-cleanup 流程收尾，同步回写 roadmap P2-H）；③二选一：接线（若统一 diff 输入在产品图上）或随 ①② 同批删除（测试 13 例随迁）；parseToDiffFile 不入 barrel、零公共面，删除零破坏
- **去向**: watch-only（已登记债升级注记 + ③新面并入同车）
- **验证方式**: 删除后 `git grep renderFileListSidebar|DiffGutter` = 0；diff 套件直通
- **现状**: live 在案
- **跨批关联**: `audit-remediation-roadmap.md` P2-H + docs/analysis DV-DISP-04（不重复立案，升级过期注记）

### [类别E邻] diff-file-list JS 悬停改 style——CSS :hover 可表达的交互绕道数据流（WA-content-008）

- **位置**: `diff-file-list.tsx:185-186`（`onMouseEnter/Leave` 直接 `(e.currentTarget as HTMLElement).style.background` 赋值/还原）
- **严重度**: P3（watch-only：行为正确、无功能损失、2 行微体量；但悬停态属纯样式关切，容器 `.nop-diff-file-list` 已有 CSS 承载面（G1-R2 注释在案），`:hover` 规则是数据流正道——JS 改 style 是内联样式策略的连锁妥协）
- **信号类别**: E 邻（手动改 style 绕开数据流；无注释逃生舱声明）
- **考古**: `1a6656013`（2026-07-21）随 cross-file 视图落地
- **违约基准**: W1 弱（根因=文件采用全内联样式策略，hover 无 class 通道可走）
- **修复方向**: `.nop-diff-file-list-item:hover` CSS 规则（配合 active 态选择器排除）+ 删 2 行 JS；随下次触碰顺带
- **去向**: watch-only
- **验证方式**: 顺带项
- **现状**: live 在案
- **跨批关联**: 无

### [类别H] valueOwnership 钩子脚手架三份 + 注册注释与现状不符（WA-layout-001）

- **位置**: `steps-renderer.tsx:39-102`（useStepsValue）↔ `timeline-renderer.tsx:68-138`（useTimelineValue）——**逐字双份 ~64 行**（declaredOwnership/scopeDegraded/warnedRef effect/UNUSED 哨兵 + useScopeSelector/computeInitial/currentValue 链/setValue，仅 warn 前缀 `[nop-steps]`/`[nop-timeline]` 差）；`collapse-renderer.tsx:29-126`（useCollapseValue）——同脚手架第三份（标量 → string[] 特化分叉 ~30 行重叠）；另有 `warnScopeDegraded` ×3、`UNUSED` symbol ×3、`toKeyArray` ×2（button-group:30/collapse:37 逐字）、`resolveItemKey` ×3（button-group/collapse/grid 同形）
- **严重度**: P2（双份逐字 + 第三份变体、同根因；**W5 注记漂移显式记录**：`step-index.ts:5-6` 注册注释声称"ownership hooks stay per-renderer on purpose（fallback chains diverge by documented adjudication）"——分叉实际早已上移到 renderer 体的 resolveFinalIndex 链（steps 兜底到 index 0，timeline 显式不兜底）与 keyOf 参数，**钩子本体已零分叉**，注释在为一个已消失的复制理由背书）
- **信号类别**: H
- **考古**: collapse/steps 生于 2026-06-24 双 plan（`e1b051a2d`/`36d0d084a`）；timeline v2 `874ba05e9`（2026-08-05）复制 steps 份；cq-3 Phase 5（`5ad81bbf2`）提取 step-index.ts 时**显式留下钩子**（注释即当时裁定），此后钩子继续趋同而注释未回写
- **违约基准**: W3（3 份脚手架）、W2（无收敛登记）、W5（注释漂移）
- **修复方向**: 提取包内 `useValueOwnershipValue(props, { warnPrefix })`（标量版；collapse 的数组特化以第二泛型钩子或同文件双导出吸收，不强并）+ 删三份本地副本 + 修正 step-index.ts 注释为"分叉在 renderer 体/resolveFinalIndex，钩子已共享"；回归 = steps/timeline/collapse ownership 现有套件直通
- **去向**: fixed=批内修
- **验证方式**: 行为保持提取同套同绿；cq-3 收敛点注释回写核验
- **现状**: live 三份在案
- **跨批关联**: cq-3（`5ad81bbf2`）为本族上一波收敛——本条为其"止步层"证据（同 wa-5 "cq-3 止步 item-view 层"形态），非重复立案

### [类别D] items `as unknown as` 编译边界 seam 六连（WA-layout-002）

- **位置**: `steps-renderer.tsx:114`、`wizard-renderer.tsx:58`、`button-group-renderer.tsx:47`、`grid-renderer.tsx:97`、`collapse-renderer.tsx:131`、`dropdown-button-renderer.tsx:36`（HEAD 口径 = live:36 同位）——六处逐字同构 `Array.isArray(schemaProps.items) ? (schemaProps.items as unknown as CompiledX[]) : []`
- **严重度**: P3（**降档显式记录**：每处是 schema 动态边界（resolved props unknown → 编译产物具型）的一次性收窄，wa-4/5/6 对单点 seam 判动态边界误报；本条立案维度是**同一 seam 手写六份**的复制面而非单点断言——提取命名 seam 后每处剩一次显式 `as`，类型系统报警面不扩大）
- **信号类别**: D（type-system bypass 的家族化形态）
- **考古**: 六件分生于 `e1b051a2d`（W3a/W3b）/`36d0d084a`（W4b）双 plan 波次，模板互抄
- **违约基准**: W3（6 份）
- **修复方向**: 包内 `compiledItems<T>(value: unknown): T[]`（Array.isArray 守卫 + 单 `as T[]` 内聚 + 命名注释声明编译契约），六文件改调用；回归 = 六 renderer 现有套件直通；零行为变更
- **去向**: fixed=批内修（低成本一行级 ×6）
- **验证方式**: typecheck + 套件直通
- **现状**: live 六份在案（含在途文件 HEAD 快照位点）
- **跨批关联**: 无（layout 包内聚；在途文件位点修复不叠编辑——随在途会话合入后执行）

### [类别B] runStepTransitionGuards catch 静默中止——同组件双路径观测不一致（WA-layout-003）

- **位置**: `wizard-renderer.tsx:267-269`（beforeLeave/beforeEnter guard action throw → `catch { return false }`，导航静默不发生、零观测）↔ `:454-476`（commitStep 的 catch 完整面：lastCommitStatus=error + stepError 面板 + onStepError 事件）
- **严重度**: P3（guard throw = schema 作者 bug，用户点"下一步"无任何反馈；与 WA-content-005/wa-6 WA-data-009 同族"失败观测不一致"）
- **信号类别**: B（静默但非吞错：有安全降级（中止导航）；缺触发可观测）
- **考古**: `cd4953f3d`（2026-08-04 C5.1 audit fixes）——注释声明"never leak an unhandled rejection from the nav-click path"（防漏 rejection 正确，观测缺失未登记）
- **违约基准**: W4（静默）
- **修复方向**: catch 分支补 isDevRuntime + warnOnce（`gd-wizard-transition-guard-threw`）；可选进阶 = 复用 onStepError 事件（reason: 'guard-threw'）——最小修仅 warn
- **去向**: fixed=批内修
- **验证方式**: 模拟 guard 抛错断言 warn 一次
- **现状**: live 在案
- **跨批关联**: a7d633a1e（IS-8b）修的是门控绕过，不涉本观测面——非重复

### [类别E邻跨引用] wizard 焦点 querySelector（20-09 APG）→ CX-11 族扩围登记（WA-layout-004）

- **位置**: `wizard-renderer.tsx:148-155`（step 切换后 `bodyEl.querySelector('[data-slot="wizard-step-body"]:not([hidden])')` + `focusable.querySelector(…)` 首焦点定位）；调用位 1 处（useLayoutEffect）
- **现状**: roving-focus 焦点管理的自家子树寻址（data-slot 契约标记 + 本组件 ref），行为正确，20-09 注释在案
- **裁定（跨引用扩围登记，非独立缺陷）**: 与 WA-form-003/WA-data-012 同根因同车 **CX-11**；本包 1 定义位使该族计数继续扩大，登记为 CX-11 扩围证据。相邻位 `diff-three-column-view.tsx:82`（`querySelectorAll('[data-line=…]')` scroll+flash）为命令式滚动合法面（React 数据流外的 scrollIntoView/动画类操作 + cleanup 对称），不入族，见误报 #19
- **严重度**: P3（跨引用）
- **去向**: successor-required=CX-11 扩围
- **跨批关联**: **CX-11**（field-frame aria 注入链 + getFocusTarget 族）；plan 553/a7d633a1e 已覆盖交互透镜不重复

### [类别H] test-support 跨包复制族 ×5 + contract-honesty 测试骨架 ×3（WA-mobile-001）

- **位置**: `mobile/test-support.ts:1-46` ↔ `content/test-support.ts:1-50`——`createMockRendererProps` 近逐字双份（探针 w=27 全文件窗口）；repo 全景同名件 **×5**（ai/graph/map 亦各有副本）；**漂移已兑现**：content 版 meta 种默认值（visible:true/disabled:false/changed:false…），mobile 版不种——同名同约工具两派语义。伴生证据：`contract-honesty.test.ts` 121 行骨架 content↔layout **逐字**（仅 import 行差）、scheduling 版已分叉漂移（diff 154 行）——cq-5（`4ee46b668`）test-placement 波次一次写入三包；mobile `infinite-scroll-test-support.tsx` 复用本包副本（ import 面证明其事实基建地位）
- **严重度**: P3（**降档显式记录**：测试基建、各包测试各自绿、无生产行为面；但"同一基础设施多处手写"（§2H 字面形态）且已漂移——meta 种子语义差会随测试迁移逐步显形；修复需跨包共享基建，超批内边界）
- **信号类别**: H（跨包复制粘贴式增长）
- **考古**: mobile `8f947df9b`（2026-06-22 M5）先落，content `0997e3a47`（2026-06-24）两日后复制；ai/graph/map 份随各自包诞生复制；contract-honesty ×3 = `4ee46b668`（2026-10-01）
- **违约基准**: W3（5+3 份）、W2（无收敛登记）
- **修复方向**: 共享 renderer 测试工具（如 `flux-react` 测试出口或 workspace `test-utils` 包）承载 `createMockRendererProps` + `createTestRuntime/TestRuntimeProvider`（content/test-support-runtime.tsx 同族）+ contract-honesty 参数化 harness（definitions 入参化）；meta 种子语义拍板一派
- **去向**: successor-required=**CX-15 拟制**（渲染器包测试支撑收敛批；编号待主会话插 roadmap 时定夺，与既有 CX-1..14 零撞号）
- **验证方式**: 归 CX-15 plan
- **现状**: live 在案
- **跨批关联**: cq-5（4ee46b668）为出生载体；误报排除 #1/#2（typeBypass 位点）之根因归本条

### 在途转发（不立案，登记转发并行会话）

`dropdown-button-renderer.tsx` live:140 门禁命中——`visibleItems` 过滤块内 `catch { return true }`（item.visible 求值失败 fail-open，注释已声明语义）。**HEAD 同位无此代码**（命中位于在途 +22 hunk 内），载体文件在途归并行会话所有权。定性预注记（供后续批参考）：fail-open 有注释声明、失败形态为"多渲染一个本应隐藏的菜单项"，缺 dev warn 一次的观测——建议随在途会话或后续触碰补 `gd-dropdown-visible-eval` warn。**本批不修不叠编辑。**

### [类别G邻] 模块顶层 t() 常量求值——i18n 单例求值期冻结，跨包测试隔离破坏 + changeLanguage 失效（WA-content-009，closure 执行期披露）

- **位置**: `diff-view/components/diff-three-column-view.tsx:71-92`（`THREE_COL_PANES` 模块顶层常量，`headerLabel: t('flux.diff.*')` ×3）
- **严重度**: P2
- **现状**: WA-content-003 renderPane 提取（批内修复）把三份 JSX 收敛为参数化 spec 表时，将 `t()` 调用提升进模块顶层常量数组——模块求值即调用翻译。
- **按住的根因**: 无（这是批内修复自身引入的新缺陷，非历史临时方案）；机制=flux-i18n `t()` 经 `getFluxI18n()` 懒初始化单例，首个 import 求值者把语言钉死在默认 zh-CN。
- **违约基准**: W4（求值期副作用零观测）+ 测试隔离（G 类邻接：产品代码副作用破坏他包测试环境）+ 生产 i18n 正确性（pane 标头不响应 `changeLanguage`）。
- **为什么是临时方案**: 不适用（执行期披露的新回归，非存量临时方案；按自动修复契约 §2 当场修复）。
- **风险**: ①跨包——flux-react 注册栈导入链上任一测试文件先于 `initFluxI18n({lng})` 触达本模块，则该文件语言初始化静默 no-op（隔离五门禁逮到 flux-renderers-ai 3 用例红：850 中 847 过）；②生产——宿主先 import 后 `changeLanguage` 的正常时序下三栏标头永久停留首求值语言。
- **重构方向**: `headerLabel: string` → `headerKey` 字面量联合存键，渲染期 `t(spec.headerKey)`；判别性回归测试 `three-column-i18n.test.tsx`（en 初始化后动态 import → 'Old' 断言 → `changeLanguage('zh-CN')` 重渲染 → '旧版' 断言；未修树恰 1 failed[仍 'Old/Base/New']，修复后绿）。
- **ROI 裁定**: 批内修（已落地，隔离门禁复跑全绿）。
- **误报排除复核**: 不适用。

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID                               | 位置                                 | 出生时间（git 考古）                   | 风险                                      | 处置        |
| ------------------------------------- | ------------------------------------ | -------------------------------------- | ----------------------------------------- | ----------- |
| WA-content-007                        | syntax-highlight 双链断裂            | `cdab2db0f`（2026-07-21）              | 特性静默失效无出口，schema 字段空承诺     | 批内修      |
| WA-content-004                        | remountKey 强制重挂载                | `8fce950d5`（2026-07-22）              | 折叠所有权根因未修 + 跨文件选中态副作用   | 批内修      |
| WA-layout-001                         | valueOwnership 钩子 ×3 + 注释漂移    | `e1b051a2d`/`36d0d084a` → `874ba05e9`  | 语义修 bug 三处同步；注释误导后人         | 批内修      |
| WA-content-001/002/003                | diff 双视图 memo / 媒体件 / 三栏面板 | `cdab2db0f` / `ab2913961`              | 双/三份同步修点（媒体侧已兑现一次同步修） | 批内修      |
| WA-mobile-001                         | test-support ×5 + harness ×3         | `8f947df9b` → `0997e3a47`；`4ee46b668` | 已漂移（meta 种子两派）                   | CX-15       |
| WA-layout-002/003                     | seam ×6 / guard 静默                 | 06-24 双 plan / `cd4953f3d`            | 低（惯形 / 观测缺失）                     | 批内修      |
| WA-content-005/006/008、WA-layout-004 | 见条目                               | 见条目                                 | 低                                        | watch/CX-11 |

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数 | 位置                                                                          | 冗余行数                     | 漂移证据                                              | 裁定                               |
| --- | ---- | ----------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- | ---------------------------------- |
| 1   | 5+3  | test-support createMockRendererProps + contract-honesty 骨架（WA-mobile-001） | ~350（含非本批包）           | content↔mobile meta 种子两派；scheduling harness 分叉 | 同根因✅ 已漂移✅ → P3 CX-15       |
| 2   | 3    | diff-three-column 三栏面板（WA-content-003）                                  | ~70                          | 无行为漂移（change-old/new 为真实差）                 | 同根因✅ → P2（P1 起评降档已记录） |
| 3   | 3    | valueOwnership 钩子脚手架（WA-layout-001）                                    | ~90（64 逐字 + 30 变体重叠） | 钩子已趋同、注释仍称分叉 = 注记漂移                   | 同根因✅ → P2                      |
| 4   | 2    | diff split/unified 双 useMemo（WA-content-001）                               | ~35                          | 无（逐字）                                            | 同根因✅ 提取干净✅ → P2           |
| 5   | 2    | audio↔video 媒体生命周期（WA-content-002）                                    | ~40                          | 无行为漂移；三波双侧同步修实例                        | 同根因✅ 活跃✅ → P2               |
| 6   | 6    | items `as unknown as` seam（WA-layout-002）                                   | ~12                          | 无（逐字模板）                                        | 惯形家族化 → P3                    |

### 3. Top 重构建议（默认 3 项）

1. **语法高亮特性复活或显式下架（WA-content-007）**：根因修复点 = `createLowlight(common)`（或精选/懒注册子集）+ catch 降级补 dev warn 一次 + hl-\* CSS 令牌映射；预期删除本体 = "恒抛错→静默纯文本→缓存"死循环与 `language` 字段空承诺；回归 = 先红用例（js 高亮产出 hl- span）+ 未知语言 warn 断言；影响面 = content 包内 + bundle 预算决策一处（若选型超预算，最小面 = dev warn + 停止缓存降级结果，显式登记）。
2. **折叠状态受控传播（WA-content-004）**：根因修复点 = DiffHunkComponent collapse state 响应 expansionState 命令帧；预期删除本体 = `remountKey` 递增 + `key={remountKey}` 双挂点；回归 = R2.31 直通 + 跨文件 activeIndex 保持新钉测试（先红）；影响面 = diff-view 包内零 API 变更。
3. **流程/媒体/双视图共享原语一次过（WA-layout-001 + WA-content-001/002/003 同批）**：`useValueOwnershipValue` + `useDiffLineMaps` + `media-fallback`/`renderMediaTracks` + `renderPane` 四件提取；预期删除本体 ~235 行六处手写 + step-index.ts 失效注释修正；回归 = steps/timeline/collapse ownership + diff + audio/video 现有套件直通；影响面 = 两包内零公共导出变更。

### 4. 误报排除清单（24 项）

| #   | 疑似点                                                      | 位置                                                                                                   | 排除理由                                                                                                                                                                         |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `as unknown as RendererRuntime`                             | content test-support-runtime.tsx:21                                                                    | G/D：mock 运行时构造器（测试基建本体；inventory 生成器不排 test-support 所致候选）；跨包复制维度归 WA-mobile-001                                                                 |
| 2   | `'mock' as unknown as S['type']` ×2                         | content/mobile test-support.ts:34                                                                      | G/D：fixture schema 字面量构造（同上）；复制面归 WA-mobile-001                                                                                                                   |
| 3   | `variant as never` / `size as never` ×4                     | layout button-group-renderer.tsx:120-121、dropdown-button-renderer.tsx:136-137（HEAD）                 | D：schema-facing string → ui Button 联合词汇 seam（ui 联合类型未独立导出；wa-4/5/6 builder 收窄同判）。watch 微注记：ui 导出 ButtonVariant 型后可降为单层收窄                    |
| 4   | setTimeout(150) hover 关闭宽限                              | dropdown-button-renderer.tsx:63-87（HEAD:75）                                                          | C：hover intent/portal 指针旅行宽限是标准机制（P1-04 注释完整推演）；命名常量 + cleanup effect 对称；非等待外部就绪                                                              |
| 5   | setTimeout(1500) copied 反馈                                | content json-view.tsx:69-72                                                                            | C：UI 反馈时限惯用 + ref 清理双保险（卸载/重按）；注释在案                                                                                                                       |
| 6   | setTimeout ×2 success/error 窗口                            | mobile pull-refresh.tsx:171/186                                                                        | C：`successDuration` schema 配置驱动的有界状态窗（G4-R2-视角5-01 错误可见化设计）；isMountedRef 守卫 + 重入清理完整                                                              |
| 7   | setTimeout 轮播 dwell 自续                                  | mobile notice-bar.tsx:186-192                                                                          | C：OA-15 功能本体（多文本轮播时钟）+ cleanup 取消；hover/reduced-motion 暂停门在案                                                                                               |
| 8   | setTimeout(500) flash 移除                                  | content diff-three-column-view.tsx:87                                                                  | C：动画时序（§2C 明示豁免）+ flashTimers 数组 cleanup 对称                                                                                                                       |
| 9   | querySelectorAll + scrollIntoView + flash                   | content diff-three-column-view.tsx:82-89                                                               | E：自有子树寻址（`data-line` 自有标记）+ 命令式滚动属 React 数据流外合法面（对齐 wa-6 #13 判例）；不入 CX-11（非焦点族）                                                         |
| 10  | `catch (error)` 全失败路径                                  | layout wizard-renderer.tsx:454                                                                         | 门禁误报：commitStep catch 内有完整失败面（lastCommitStatus=error + stepError + onStepError 事件 + payload reason:commit-threw）                                                 |
| 11  | `void Promise.resolve()`                                    | mobile pull-refresh.tsx:158                                                                            | 门禁误报（桶 1）：`.then/.then/.catch` 全链在案，catch 可见化 error 状态                                                                                                         |
| 12  | `catch (err)` 同步抛兜                                      | mobile infinite-scroll.tsx:138-142                                                                     | 门禁误报：DEV console.error 双侧可观测（NEW-MM-01 登记设计）                                                                                                                     |
| 13  | `void goToStep(target)`                                     | layout wizard-renderer.tsx:504                                                                         | 门禁误报：goToStep 内部全 catch（guards try/catch + 无 reject 路径）；watch 微注记：安全性依赖内部捕获，签名演进时需复核                                                         |
| 14  | clipboard catch best-effort                                 | content json-view.tsx:74-76                                                                            | B：注释声明 best-effort + 剪贴板不可用属环境条件；watch 微注记：失败零用户反馈（按钮无 error 态），随下次触碰可补 title 提示                                                     |
| 15  | JSON.stringify catch → String                               | content mapping.tsx:44-46                                                                              | B：动态边界（循环引用/BigInt）降级可见（渲染 String 结果），非静默吞                                                                                                             |
| 16  | dmp 内联 diff catch → equal 文本                            | content diff-inline.ts:20-22                                                                           | B：dmp.diff_main 纯算法不现实抛错，防御式兜底语义正确（降级=按未变显示）；不并入 WA-content-007（该条为特性级失效，本处为不触发防御）                                            |
| 17  | IntersectionObserver fallback `setAttribute('src',…)`       | content image.tsx:139-148                                                                              | E：旧浏览器懒加载回退（supportsNativeLazy 探测 + 注释在案）；自有 img ref 写 src 是该 fallback 的机制本体                                                                        |
| 18  | capture-phase `closest('button, a, …')` 点击仲裁            | mobile swipe-cell.tsx:222-249                                                                          | E：MA-09/OA-02 注释声明（避免假交互 role 的 a11y 裁定）+ capture 语义需要；监听器挂/清理对称                                                                                     |
| 19  | wizard 焦点 querySelector ×2                                | layout wizard-renderer.tsx:148/152                                                                     | 立案沉淀：WA-layout-004（CX-11 扩围登记，非独立缺陷）                                                                                                                            |
| 20  | contract-honesty.test.ts ×3 / cards、audio↔video 测试样板群 | content/layout/scheduling 各 test 文件                                                                 | 测试文件不入 inventory 口径；骨架复制证据归 WA-mobile-001，逐用例差异为真实契约差（§3 表格化/参数化排除）                                                                        |
| 21  | steps 竖排连接线 `ml-[15px]`                                | layout steps-renderer.tsx:211                                                                          | F：size-7 圆点（28px）中心对齐的派生值（±1px 光学域），非负向 nudge、无抵消对象；pixelNudge 门禁 0 吻合                                                                          |
| 22  | valueOwnership/valueStatePath propContracts 声明镜像        | layout process-display-definitions.ts（steps/timeline 两块）                                           | 声明注册表格化形态（wa-6 #20/#24 判例）；文案差异（current-step/current-event）为真实语义差                                                                                      |
| 23  | isDevRuntime 家族扩员                                       | content result.tsx:25-28（本地 fn）+ qrcode.tsx:64（内联）；mobile infinite-scroll.tsx:134/139（内联） | 跨引用 wa-6 WA-data-003 家族（该裁定 watch-only）：本批 1 本地 fn + 3 内联为家族计数扩员证据，不另立；正典归置/共享 dev-runtime 收敛建议随该 watch 项一并考虑                    |
| 24  | `new DiffMatchPatch()` ×3 + 私有 API `diff_linesToChars_`   | content diff-parse.ts:4 / diff-inline.ts:3 / diff-3way.ts:3                                            | 实例构造廉价、各自模块内聚（非逻辑双写）；`diff_linesToChars_`/`diff_charsToLines_` 为 diff-match-patch 私有面耦合——**watch 微注记**：库升级时为断裂风险点，建议注释钉住版本契约 |

（另两条微注记不入表：①`WizardLastCommitStatus` 的 `'cancelled'|'timedOut'` 联合成员零生产者——前向声明词汇，建议注释注明或收敛；②responsive/resizable 的 variants/panels 无 Array.isArray 守卫而同包他件有——schema 作者契约面轻微不一致，随下次触碰补齐。）

### 5. 范围整体判断

**不是系统性临时方案文化，而是"新特性波次各带一份骨架、失败观测按件取舍"的复制沉积型，叠加一处特性级化石（syntax-highlight）。** 正面证据五件：①登记注释密度极高——MA-xx/OA-xx/NEW-C7/G4-R2/20-xx/plan-ID 注释贯穿 mobile 与 layout 核心文件（pull-refresh 单文件 14 处裁定注释），signing 文化强；②症状性 commit message **0**（抽检 25 条全带 plan 引用+根因）；③触摸族监听器挂载/清理全对称（swipe-cell/pull-refresh/notice-bar 逐对核验零泄漏）、定时器族全部具名常量+清理——IS-8b 组 C 交互透镜的修复质量在 live 可证；④IS-8b 向导双 P1 修复两侧落地核验通过（a7d633a1e）；⑤mobile 包立案仅 1 条且为跨包基建面——移动交互族是三包中最干净的。问题集中在 **content diff-view 子族**（8 条立案中 6 条居此：双解析器/死层/三栏复制/双视图复制/remountKey/高亮化石——2026-07-21 单日三 plan 快速落地的波次沉积）与 **layout 流程族**（valueOwnership 钩子三份）。syntax-highlight 双链断裂是本批唯一 P1：它是"适配器出生即死、catch+缓存把症状按住七十九天"的标本——与 wa-4 WA-basic-001（知正解未回移）同型，但本条连"被感知"都没有，W5 化石特征完整。整体判断：登记文化在、感知文化有盲区——**"静默降级 + 注释豁免"的组合会同时掩盖真缺陷（P1 高亮）与真复制（钩子三份）**，建议后续批把"catch 触发率"纳入 diagnostic 视角（dev warn 一次惯例即最低成本解，本批已按此修 3 处）。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID        | 严重度 | 建议去向                                           | 修复要点                                                                      | 约束                                 |
| -------------- | ------ | -------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| WA-content-007 | P1     | 批内修（选型超预算可显式降级 successor，不得静默） | lowlight 语言注册 + catch dev warn + hl-\* CSS（最小面：warn + 停止缓存降级） | 先红后绿；bundle 预算决策显式留痕    |
| WA-content-004 | P2     | 批内修（超预算可显式降级 successor，不得静默）     | 折叠受控传播 + 删 remountKey 本体                                             | 跨文件 activeIndex 钉测试先红        |
| WA-content-001 | P2     | 批内修                                             | use-diff-line-maps 提取                                                       | 零公共导出变更                       |
| WA-content-002 | P2     | 批内修                                             | media-fallback/useMediaErrorState/renderMediaTracks 提取                      | 行为保持，红绿同套                   |
| WA-content-003 | P2     | 批内修                                             | renderPane(side) 提取 + 谓词提升                                              | plan 533 契约测试直通                |
| WA-content-005 | P3     | 批内修                                             | fetcher 失败两分支补 onLoadError + 断言                                       | 对齐 qrcode aborted 守卫次序         |
| WA-layout-001  | P2     | 批内修                                             | useValueOwnershipValue 提取 + step-index 注释修正                             | collapse 特化不强并                  |
| WA-layout-002  | P3     | 批内修                                             | compiledItems<T> 命名 seam ×6                                                 | 在途文件位点待合入后执行（不叠编辑） |
| WA-layout-003  | P3     | 批内修                                             | guard catch 补 dev warn 一次                                                  | 最小修                               |
| WA-content-006 | P3     | watch-only                                         | 死层三件随下次触碰删（P2-H 回写）                                             | 已登记债升级注记                     |
| WA-content-008 | P3     | watch-only                                         | JS hover → CSS :hover 顺带候选                                                | —                                    |
| WA-layout-004  | P3     | successor-required=CX-11 扩围                      | 跨引用登记，无独立修复                                                        | 归 CX plan                           |
| WA-mobile-001  | P3     | successor-required=CX-15 拟制                      | 测试支撑跨包收敛（createMockRendererProps ×5 + harness ×3）                   | 归 CX plan（编号主会话定夺）         |

## 批内修复记录（Phase 2 执行回写）

> 本节由 Phase 2 执行会话回写（本报告为 review-only 取证产出；修复落地后按 wa-6 先例补录"落地/验证"两列表格，并在台账 findings 行翻转状态）。

| 发现 ID        | 落地                                                                                                                                                                                                                                                                                                                                      | 验证                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| WA-content-007 | `createLowlight(common)` 注册 37 语言 + 别名映射（js/ts/py 等 11 项）+ 未知语言 dev warn 一次（缓存不收降级结果）+ `diff-view.css` 补 `--nop-diff-hl-*` 令牌 7 组 ×3 档（默认 + `[data-mode='dark']` + `prefers-color-scheme` 回退）与 7 组 `.hl-hljs-*` 选择器映射[30 行选择器、7 处 var 引用]——"恒抛→静默纯文本→缓存降级"死循环本体删除 | 红态（stash 对照，恰 2 failed：js 高亮产出断言+未知语言 warn 断言）→绿 4/4                                                |
| WA-content-005 | image fetcher 双失败分支（onError/reject）补 `void onLoadError?.()`，对齐 src/audio/video/qrcode 路径的失败事件契约（41a73cac5 缺口）                                                                                                                                                                                                     | 红（恰 2 failed）→绿 6/6                                                                                                  |
| WA-content-004 | DiffHunk 折叠态改受控传播（渲染期派生 override + `from` 标记），删除 `remountKey` 递增与 `key={remountKey}` 双挂点（代码引用 0，残留 2 处修复说明注释）；跨文件视图选中态副作用钉测试                                                                                                                                                     | 红（恰 1 failed）→绿；plan 533 DOM 契约套件直通                                                                           |
| WA-content-001 | 提取 `diff-view/model/use-diff-line-maps.ts`（inlineTokensMaps/highlightedHtmlMaps 双 useMemo 单份）；split/unified 两视图改调用                                                                                                                                                                                                          | 行为保持提取，diff-view 套件同绿                                                                                          |
| WA-content-002 | 提取 `src/media-shared.tsx`（asString/tracks 收窄/errored 重置/fallback JSX 四块原语）；audio/video 双件改调用（三波双侧同步修先例的收敛面）                                                                                                                                                                                              | 行为保持提取，audio/video 套件同绿                                                                                        |
| WA-content-003 | 三栏面板 JSX 参数化为 `ThreeColPaneRow` 组件 + `THREE_COL_PANES` spec 表（headerKey 存键渲染期翻译）+ rowFlags 每行一次；三份复制收敛单份（change-old/new 真实差保留参数化）                                                                                                                                                              | plan 533 契约测试直通；flash 时序套件同绿                                                                                 |
| WA-layout-001  | 提取 `src/value-ownership.ts`（`useValueOwnershipValue` + resolveFinalIndex 链原语）；steps↔timeline 逐字 64 行收敛、collapse 走原语保特化（不强并）；`step-index.ts` W5 失效注册注释回写（分叉实际在 renderer 体）                                                                                                                       | 行为保持提取，steps/timeline/collapse ownership 套件同绿                                                                  |
| WA-layout-002  | 提取 `src/compiled-items.ts`（`compiledItems<T>` 命名 seam）；steps/wizard/button-group/grid/collapse 五位点改调用（第 6 位点 dropdown-button 系在途文件，不叠编辑随合入后执行——台账行已注记）                                                                                                                                            | 行为保持提取，layout 全量 147/147 同绿                                                                                    |
| WA-layout-003  | runStepTransitionGuards 双静默分支分键 dev warn 一次（`wizard-transition-guard-blocked`/`-threw`）；commit 路径既有 onStepError 面不动（cd4953f3d 契约保持）                                                                                                                                                                              | 红（恰 1 failed）→绿 6/6（blocked/threw 各一用例+正路径不 warn）                                                          |
| WA-content-009 | 执行期披露（closure 隔离五门禁首跑逮到）：`THREE_COL_PANES` 模块顶层 `t()` ×3 删除，`headerLabel` 改 `headerKey` 字面量联合存键、渲染期 `t(spec.headerKey)`；根因=WA-content-003 提取时把翻译调用提升进模块常量（求值期懒初始化 i18n 单例冻结 zh）                                                                                        | 判别性测试 three-column-i18n.test.tsx 红（未修树恰 1 failed）→绿；flux-renderers-ai 850/850 复绿（847+3 failed→850 全过） |

三包 `index.ts` 零公共导出变更（`git diff --exit-code`）；filter 四门禁全绿（content 352/layout 147/mobile 189，全程 lint 0 error；react-compiler 逮到 effect 内 setState→改渲染期派生+memo×useCallback 冲突→去 useCallback 两处当场收敛）。在途 3 文件（dropdown-button-renderer.tsx/test/schemas.ts）零叠编辑。
