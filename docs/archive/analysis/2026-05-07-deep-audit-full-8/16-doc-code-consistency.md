# 维度 16: 文档-代码一致性

## 深挖轮次

- 第 1 轮: capability docs old paths, CRUD plan handles, AGENTS action-core description, Plan119 stale checklist。
- 第 2 轮: flux-react index anchors, Plan125/bug old paths。
- 第 3 轮: runtime `index.test` path, flow/word path case/readme, archived plan links。
- 第 4 轮: Plan110/108/100/176 stale paths。
- 第 5 轮: bugs README missing notes, flow API action surface drift, plans 221-226 missing validation checklist section。

## 维度复核结论

### 保留

| 条目                                                          | 严重程度 | 证据/说明                                                                                                                  |
| ------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| capability-projection-manifest old compiler path              | P2       | active architecture doc points to `packages/flux-runtime/src/schema-compiler/diagnostics.ts`; live code in `flux-compiler` |
| AGENTS action-core precompile owner drift                     | P2       | `AGENTS.md` says action precompile in action-core; live action compiler in `flux-compiler`                                 |
| bugs README/index old paths and missing notes                 | P3       | `docs/bugs/README.md` misses multiple existing notes; several notes use old path/case                                      |
| runtime `index.test.ts` active doc path                       | P2       | `flux-runtime-module-boundaries.md` references nonexistent `packages/flux-runtime/src/index.test.ts`                       |
| word docs path case / README link                             | P3       | docs use `WordEditorPage.tsx`/`EditorCanvas.tsx` and nonexistent README; live files lowercase/design.md                    |
| flow designer API action surface drift                        | P1       | `docs/architecture/flow-designer/api.md` action examples/method names differ from live provider/manifest                   |
| plans 221-226 missing explicit `Validation Checklist` section | P2       | current plan governance drift                                                                                              |

### 降级

- Plan119/110/100 old paths: completed historical plans; keep as low-priority stale anchors。

### 驳回

- CRUD plan stale handles after复核。
- Plan125, Plan108, Plan176 broad stale claims。
- flux-react index anchor in docs/index: public barrel exists and is valid as code-level anchor。
- archived plan links broad claim。

## 最终保留项

- Fix active architecture docs first: capability manifest, runtime module boundaries, flow designer API, AGENTS package descriptions。
- Update bugs README/index and word docs stale path/case。
- Add explicit validation checklist sections to current plans 221-226 or update plan guide compliance notes。
