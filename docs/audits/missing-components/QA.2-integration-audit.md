# QA.2 集成审计 #1 — missing-components（L0 + L1，含 L2 前置消化收口）

> Auditor / Agent: 独立 fresh 子 agent（QA.2 集成审计员，2026-09-26，与执行会话无关）
> 审计对象: 基线 HEAD `d2fb1d05b`（工作树干净，`git status` 零条目）；e2e 全量记录对象 = commit `ae8196778`（plan 511 QA.2 前置消化，closure audit approved 0B/0M/2m）
> 审计输入: roadmap §11 QA.2 行四项内容 + 三方验证记录（commit message / plan 511 Phase 5 / dev log 09-26）+ 实跑输出（Fresh Context，未读执行会话历史）
> 依据: `docs/backlog/missing-components-and-designer-roadmap.md` §11（QA.2 行 + Pass 标准「全绿 + 0 新增 check 红」）/§13；`docs/audits/00-audit-execution-guide.md`（severity 词汇；Pass = 0 Blocker 且 0 Major）；格式先例 `QA.1-L0-line-exit-audit.md`
> 执行口径: 全量 e2e 同树 33 分钟前验证在案（33.4min），按审计指令不重跑全量，改三方记录一致性核对 + 关键子集实跑。

## 1. e2e 全量记录一致性 + 关键子集实跑

### 1.1 三方记录一致性核对

| 记录源                     | 关键数字与裁定                                                                                                                                                                                                              | 一致性 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| commit `ae8196778` message | 「e2e full 1562 passed / 2 final fails both gantt load-flakes green isolated (33.4min)」                                                                                                                                    | ✅     |
| plan 511 Phase 5           | 「1562 passed / 43 skipped / 24 did-not-run / 2 failed」；两个最终失败点名（`gantt-bars-and-links.spec.ts:9`、`gantt-demo.spec.ts:16`），均首轮 ✓ 后重试轮 flake、隔离复跑全绿；另记 `:131` 拖拽 flake 重试复绿（在册家族） | ✅     |
| dev log 09-26              | 「全量 e2e（33.4min）1562 passed / 43 skipped / 2 failed」；同两个 spec 点名、同「负载 flake 隔离复跑全绿」裁定、同 watch-only 3 项未进失败列表                                                                             | ✅     |

三方在全部承重数字（1562/43/2/33.4min）与裁定口径（在册 gantt 负载 flake、隔离复跑全绿、非持久功能失败、watch-only 3 项未入失败面）上完全一致；plan 511 额外记录的「24 did-not-run」为串联块派生明细，dev log 未重复该数——属省略非矛盾（见 Observation-1）。「全绿」Pass 标准按已确立的 L0/L1 done 定义同款口径消化（首轮 ✓ 的重试轮 flake + 隔离复跑全绿 ≠ 持久功能失败；plan 511 closure audit approved 已认可该口径），与 roadmap §13 裁决注记一脉相承。

### 1.2 关键子集实跑（本审计执行）

命令：`npx playwright test tests/e2e/home-entry-navigation.spec.ts tests/e2e/org-select-user.spec.ts tests/e2e/print-designer.spec.ts --reporter=line`

结果：**19 passed / 0 failed（28.4s）**，覆盖三条链：

| spec                          | 用例数 | 覆盖面                                                                                                                                                 |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| home-entry-navigation.spec.ts | 6      | 首页渲染五个关键此前隐藏入口卡 + 五卡点击 → hash → 目标页标志元素（L0.3 导航链）                                                                       |
| org-select-user.spec.ts       | 4      | 懒加载选人 / echo 解析 + 远程搜索 / children 失败内联错误 + 重试 / **paged-root 续页 load-more 且末页终止（协议 §5，QA.1-L2 Major-1 修复的新增用例）** |
| print-designer.spec.ts        | 9      | 设计器壳 / palette / 同源分页预览 / 条码 svg / PDF 导出 / 隐藏打印框挂载绑定数据 / P5 行高与聚合行（L0.4 四链路）                                      |

导航、续页（Major-1 修复面）、打印链全绿，与全量记录无矛盾信号。

## 2. `pnpm check` 红名单纪律

- 全链实跑两次（含末尾管道版与无管道真实 exit 版）：**exit 0**。
- `check-oversized-code-files`：**203 warnings / 2 errors / 2 exempt**，exit 0——与在册基线（oversized 203w/2e/2exempt，plan 511 Phase 5 记录）逐字一致，零漂移。
- `find-ui-consistency-gaps`：「No new unregistered UI consistency gap instance」；i18n keys 等其余 check 子链随全链 exit 0 通过。
- **结论：零新增红，红名单纪律成立。**

## 3. home↔route parity 守卫 + QA.1-L0 三 Minor 闭环

`pnpm --filter @nop-chaos/flux-playground test` 实跑：**37 files / 391 passed**（与 plan 511 Phase 3 声称的 391/391 一致；较 QA.1-L0 审计时点 390 的 +1 即新增守卫 1c）。

| QA.1-L0 Minor                       | 声称闭环                                         | 本审计验真                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minor-1 守卫死代码                  | 恒假分支已由 `58e716164` 顺手删除                | ✅ `route-matrix.test.ts` 全文无 `if (card.target.kind !== 'domain') continue;` 残留；现存唯一 `kind !== 'domain'` 为新守卫 1c 内的合法过滤（:306）                                   |
| Minor-2 合并卡 id 无冲突防 guard    | 不变式 1c 已增（`route-matrix.test.ts:304-313`） | ✅ `it('invariant 1c: aggregate card ids never collide with domain registry ids')` 在案，恰为原审计建议的 expect 断言方案，随 391 全套实跑通过                                        |
| Minor-3 domain-route-entries 537 行 | 裁定 watch-only 落盘 plan 511 Phase 3            | ✅ plan 511 Phase 3 勾选项载明：537 行处 WARN(500)–ERROR(700) 区间、warn 档不翻 exit code、拆分收益为负、**触发器 = 行数越过 ERROR_LINES 700 → 按域拆分预案**、登记 QA.7 残余债登记册 |

守卫不变式①/①b/②/③/④（含 1c）随 playground 全套实跑全绿，parity 守卫在岗。

## 4. matrix ↔ examples.manifest.json ↔ quick-reference 三处登记一致性

审计对象 = Form Core 区 L1/L2 新行 8 个 type：slider / rating / input-color / user-select / department-select / input-city / input-signature / verification-code。

### 4.1 三处齐 + type 名一致（全量核对，非抽查）

| type                | matrix Form Core（`amis-baseline-matrix.md`）               | manifest `runtime` | quick-reference                         | live code type 串（schemas\*.ts） |
| ------------------- | ----------------------------------------------------------- | ------------------ | --------------------------------------- | --------------------------------- |
| `slider`            | :139 `runtime`/landed（L1 flip 2026-09-25）                 | ✅（73 条内）      | `SliderSchema`（:873）                  | `schemas.ts:446` ✅               |
| `rating`            | :140（定名 rating 非 rate）                                 | ✅                 | `RatingSchema`（:874）                  | `schemas.ts:460` ✅               |
| `input-color`       | :141（定名 input-color 非 color）                           | ✅                 | `InputColorSchema`（:875）              | `schemas.ts:474` ✅               |
| `user-select`       | :144（L2.1 flip）                                           | ✅                 | `UserSelectSchema`                      | `schemas-org.ts:59` ✅            |
| `department-select` | :145（L2.1 flip）                                           | ✅                 | `DepartmentSelectSchema`                | `schemas-org.ts:63` ✅            |
| `input-city`        | :146（定名 input-city 非 region；§5 行移除）                | ✅                 | `InputCitySchema`（type 串显式）        | `schemas-org.ts:74` ✅            |
| `input-signature`   | :147（定名 input-signature；§5 行移除）                     | ✅                 | `InputSignatureSchema`（type 串显式）   | `schemas-signature.ts:10` ✅      |
| `verification-code` | :148（AMIS 源 = `input-verification-code`，flux type 不变） | ✅                 | `VerificationCodeSchema`（type 串显式） | `schemas-verification.ts:11` ✅   |

命名决议核验：`rate`/`color`/`region`/`signature`/`input-verification-code` 旧名在 manifest runtime 数组零残留；matrix §5 notRetained 区无 input-city/input-signature 残行；display `color` 行保留并带「display 行 ≠ `input-color` form 行」澄清（:285，L7.5 预留措辞一致）。

### 4.2 manifest runtime 条目 → example.json 存在性

- **8 个新 type 的 `docs/components/<type>/example.json` 全部存在**，且逐一解析为合法 JSON（type/name/label + 各自特有键：min/count/valueFormat/multiple/clearable/penColor/length 等）。
- 全量 73 条 runtime 扫描：8 条存量条目在常规路径无 example.json（见 Minor-1）——**全部早于本 roadmap 工作**（2026-08 及更早提交引入），不属 L1/L2 交付面，也非 check 红（无 check 覆盖该一致性）。

## 5. Findings

**Blocker：无。Major：无。**

### Minor-1 manifest runtime 8 条存量条目缺 example.json（早于本 roadmap，登记 QA.7 残余债登记册）

- 条目：`object-field` / `array-field` / `variant-field` / `detail-field` / `detail-view`（仅 design.md 无 example.json）；`scada-canvas` / `scada-editor-canvas` / `dashboard`（无 docs/components 目录）。
- 溯源：分别由 2026-08-03 `1d2b4d113`、2026-08-09 `a2ac7f5d7` 等提交引入 manifest，远早于 missing-components L0–L2；其中 scada 三条已在 plan `2026-08-03-2113` I4 有在案裁定（空壳期仅进 runtime、example 属 I13），其余 5 条无显式裁定。
- 与 matrix `runtime` 状态语义（「registered + owner doc + example」）存在表面张力，且不被任何 check 覆盖，属登记口径暗债。
- 建议：QA.7 残余债登记册统一收口——或补 example.json、或按语义移入 `targetContract`/`declaredButUnregistered`、或补裁定注记。

### Observation-1 dev log 09-26 省略「24 did-not-run」派生明细

- plan 511 Phase 5 记「1562 passed / 43 skipped / 24 did-not-run / 2 failed」，dev log 与 commit message 记「1562 / 43 / 2」——承重数字与裁定完全一致，仅串联块派生数未重复记录。非矛盾，无需修复；随 QA.7 簿记汇总即可。

### Observation-2 「全绿」口径

- 全量 e2e 两个最终失败按「在册 gantt 负载 flake + 隔离复跑全绿」口径消化（首轮均 ✓、无持久功能失败），与 L0/L1 done 定义已确立的「零新增 + 台账在案 + 出口绑定」裁决口径同款，plan 511 closure audit approved 已认可。本审计按同一口径认定 Pass 标准达成，并留痕于此。

## 6. Verdict

**pass**（0 Blocker / 0 Major / 1 Minor + 2 Observation）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。
- 四项审计内容逐项结论：①e2e 三方记录一致 + 关键子集 19/19 绿；②`pnpm check` exit 0、零新增红（oversized 203w/2e/2exempt 与在册基线逐字一致）；③playground 391/391 全绿、QA.1-L0 三 Minor 全部闭环（删除/在案/裁定落盘）；④8 个新 type 三处登记齐且 type 名与 live code 一致、example.json 全存在——全部达标。
- Minor-1（存量 manifest 条目缺 example.json）登记 QA.7 ⑥ 残余债登记册；Observation-1/2 留痕无动作。
- QA.2 集成审计 #1 通过；roadmap §11 QA.2 行可回写 `done` 口径的状态记录由编排层执行（本审计不代写）。
