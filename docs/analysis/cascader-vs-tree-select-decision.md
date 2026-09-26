# Cascader vs Tree-Select 裁决（missing-components L2.6）

> Status: active（裁决文档，plan 510，2026-09-26）
> 裁决对象：列式级联选择（cascader）是否作为独立 type 引入
> 关联：`docs/components/tree-select/design.md`、`docs/components/input-city/design.md`（506）、`docs/architecture/org-data-source-protocol.md`（504）、`docs/analysis/2026-08-04-control-gap-survey.md:66`、missing-components roadmap §5 L2.6

## 1. 场景枚举（cascader 出现的产品场景）

| 场景                               | 现有承载                                                      | 差距评估                                                        |
| ---------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| 地区省市区选择                     | `input-city`（506，dataset-coupled，列式级联+移动滚轮）       | **已覆盖**（最高频场景）                                        |
| 组织部门/人员逐级选择              | user-select / department-select（505，org 协议树+搜索）       | **已覆盖**                                                      |
| 通用分类目录（商品类目/知识分类）  | tree-select（`childrenSource` 逐级懒加载，runtime）           | tree-select 树形可承载；列式（每次一层平铺+路径条）交互形态缺失 |
| 依赖下拉链（省→市→后续表单联动）   | chained-select 语义（折叠为 select+composition，matrix :245） | 属「依赖联动」而非「级联浏览」，非 cascader 范畴                |
| 多层级属性配置（含任意层叶子选择） | tree-select + `childrenSource` + 搜索                         | 树形可承载；深层级时列式路径展示更可读                          |

## 2. tree-select + childrenSource 承载力评估（runtime 证据）

- **能力面**：`childrenSource` 同存于 `InputTreeSchema`（`packages/flux-renderers-form/src/schemas.ts:216`）与 `TreeSelectSchema`（:244-245）——逐级懒加载、展开即取数，runtime。
- **协议通路**：org 数据源协议（504）已沉淀 children/resolve 双操作 + 共享 hooks（useOrgChildren runtime，`__tests__/use-org-source.test.tsx`）；cascader 若引入可直接复用该数据面（列式仅是呈现层差异）。
- **承载力结论**：**数据与选择语义 100% 可承载**；缺口纯在呈现层——树形（缩进展开）vs 列式（多列并排+面包屑路径）是两种交互形态，对「层级深、每层项多、需要路径回看」的场景，列式有真实可用性优势（vant/formily/nocobase 三家独立实现该形态，control-gap-survey:66 三处独立信号、信心高）。

## 3. 列式 UX 必要性论证

- **正方（独立形态成立）**：control-gap-survey 三处独立信号；深层级 + 路径回看的可用性优势；506 input-city 已在本仓验证列式实现的可行性（desktop columns 组件即现成形态参考）。
- **反方（非必需）**：当前无 host 提出非地区类级联需求；tree-select + 搜索可替代多数场景；新增 type 的维护成本（双形态响应式、键盘导航、a11y）。
- **裁决**：cascader 列式交互形态认定为**独立交互形态**（与 survey 结论一致），具备成为独立 type 的正当性；但当前无 host demand，**不立即实现**——matrix 登记为 demand-gated 标记（Folded 节行 owner cell 内联，非独立 demand-gated 节行；待 host 场景出现立 plan，数据面复用 org 协议共享 hooks，呈现层参考 506 列式实现）。`tree-select` 保持既有层级选择场景的永久答案；两者按交互形态分工（树形浏览 vs 列式路径）而非互相取代。

## 4. 随本裁决一并定性

- **`chained-select`**：维持折叠（matrix :245）——「依赖联动下拉」（后级选项集依赖前级选择值，逐级为 select 下拉）与「级联浏览」是两种交互；composition（select 联动/表达式）即为正解。gap-analysis :107 现值「tree-select / composition」维持，叠加本裁决注记。
- **`input-formula`**：维持 demand-gated（gap-analysis :110——expressions already in core; editor/code-editor family）；与 cascader 裁决无耦合，仅随本行一并记录定性不变。

## 5. 回写清单（已完成状态）

1. matrix：Form Core 后 demand-gated 注记（本文档结论）——见 `docs/components/amis-baseline-matrix.md`（cascader 行登记于 notRetained Folded 节旁注或独立 demand-gated 标记，按 §5 体系）。
2. gap-analysis :107（chained-select 行）：叠加本裁决定性注记。
3. control-gap-survey :66：owner 更新为「cascader（demand-gated，待 host 需求）」+ 裁决文档回链。
4. missing-components roadmap §13：L2.6 → done（human 签认后生效，见 §6）。

## 6. human 签认

- **裁决摘要**：cascader 认定为独立交互形态，登记 demand-gated（不立即实现）；tree-select 为层级选择永久答案；chained-select 维持折叠；input-formula 维持 demand-gated。
- **签认状态**：已签认（2026-09-26）。签认依据：用户目标指令「执行 docs/backlog/missing-components-and-designer-roadmap.md 直到彻底完成。……必须执行到彻底完成，中途不要停下来汇报进度」——对 2026-09-25 悬置签认请求（dev log 09-25 :11）的概括放行，记录于 plan 510 Phase 2；后续异议按 forward-only 修订本档。
