# DingFlow Tree Layout Unification Document Audit Record

> 日期：2026-08-03
> 对象：`docs/analysis/2026-08-03-dingflow-tree-layout-unification.md`
> 类型：document-audit
> 状态：closed；最终独立共识审查已通过

本文保存从主分析文档抽出的逐轮独立审查历史。主文档中的现行技术契约和 proof obligations 为实施前的权威分析基线。

## 最终共识

- 最终独立架构审查：`PASS`（零 Blocker/Major）。
- 最终独立几何审查：`PASS`（零 Blocker/Major）。
- 最终 independent implementation-contract review：`contract-ready`（零 P1/P2）。
- 主分析文档压缩至 38,917 bytes，低于 40KB 文档上限；本文件保留审查历史。

## 第一轮独立审查记录

- Reviewer A（架构一致性）：`REVISE`，10 Major；指出 owner-doc 冲突、几何生命周期、命令封口、public export 与 autoLayout 未决。
- Reviewer B（布局数学）：`REVISE`，7 Major；纠正“split/merge 共线”的错误，要求轴无关模型、固定 footprint、净空不等式与空分支完整语义。
- Reviewer C（implementation contract）：`contract-not-ready`，1 P1 + 8 P2；要求冻结删除、metadata owner、API 兼容、TB/LR、proof relation。
- 本版处理：采纳全部 Blocker/Major/P1/P2；下一轮必须由新独立 reviewer 重新核对 live repo，零 Blocker/Major 才算达成共识。

## 第二轮独立审查记录

- Reviewer D（架构复审）：`REVISE`，8 Major；核心阻塞是 live tree setter 空实现、runtime geometry 泄漏边界、provider 绕行命令与 owner-doc/proof 缺口。
- Reviewer E（几何复审）：`REVISE`，7 Major；要求区分 intentional overlap、处理 rounding、固定 box containment、虚拟 slot 完整 identity 与几何 oracle。
- Reviewer F（implementation contract）：`contract-not-ready`，1 P1 + 5 P2；再次把 TreeDocument writeback 判为 P1，并要求非法输入、footprint migration、readOnly/history/browser proof。
- 本版处理：TreeDocument 改为 core-owned paired projection；冻结 host change/conflict 协议；runtime geometry 明确为 snapshot 可观察保留数据；split/merge 分别使用 134/116 安全间距；补齐 slot namespace/renderer/command、provider gate、非法输入、readOnly 与几何 oracle。
- 第三轮必须使用全新 reviewer；零 Blocker/Major 且 implementation-contract 零 P1/P2 才算达成共识。

## 第三轮独立审查记录

- Reviewer G（架构共识）：`REVISE`，7 Major；要求 session owner 与 TaskFlow domain owner 分层、history pair 单一恢复语义、core 中央 gate、host projection 边界、autoLayout optional migration。
- Reviewer H（几何共识）：`REVISE`，6 Major；指出 LR pill 主轴尺寸、stroke inflation、外层/内层 overflow、intersection whitelist 和 slot geometry 仍不完整。
- Reviewer I（contract 共识）：`contract-not-ready`，1 P1 + 5 P2；要求移除未定义 revision 协议、冻结 history、validation、core gate、geometry oracle 和 repository-scope migration。
- 本版处理：移除 revision 机制，冻结 deep-equal acknowledgement/clean replacement/dirty conflict；history replay 恢复存储 pair；core 作为最终 mutation gate；TB/LR split 下限分别 134/204、merge 含 stroke inflation；明确 outer/inner footprint、几何白名单、slot affordance、invalid-tree matrix、autoLayout optional 与 repo 全量迁移。
- 第四轮继续使用全新 reviewer；门禁不变。

## 第四轮前修订摘要

- host 协议简化为 session draft + 单根 change action + deep-equal acknowledgement，不再引入 revision；reason/emission matrix 已冻结。
- history/restore/rollback 只恢复已存 tree+graph pair，不重新布局；显式 relayout 才运行算法。
- topology gate 下沉到 direct core API，adapter/provider/canvas 只做提前拒绝。
- `__fdTree` 不进入 bounded host doc.edges/activeEdge；tree export 保持 string 返回但内容为 TreeDocument JSON。
- 该轮当时把几何改为 TB split 134、LR split 204、merge 含 stroke inflation，并开始定义允许交集；后续轮次已扩为十一类并改用完整 stroked polyline。
- 该轮当时提出 diagnose/clip；后续轮次已收敛为 outer geometry wrapper + inner body 固定 clip。
- `autoLayout` 改 optional deprecated；root export 删除决策冻结为 repository-scope 直接删除。
- 第四轮必须由全新 reviewer确认上述规则无 Blocker/Major/P1/P2。

## 第四轮独立审查记录

- Reviewer J（架构共识）：`REVISE`，6 Major；指出 pending ack/save、transaction notification、共享 stems、overflow detection、edit relayout 与 design owner-doc 范围。
- Reviewer K（几何共识）：`REVISE`，5 Major；指出 + 实际 center 距离、focus stroke、SVG joins、共享 stems 与 diagnose overflow 破坏 oracle。
- Reviewer L（contract 共识）：`contract-not-ready`，3 P1 + 3 P2；要求事务延迟通知、stale ack 队列、direct-core 返回合同、insertBranchChild、全量 footprint migration。
- 本版处理：pending queue 最大 32，save 不清 pending；只在最外层 commit 通知、rollback 零通知；+ 改 center-based 36；stroke/linecap/linejoin 冻结；几何白名单扩为十类；body 固定 clip；core gate 逐签名返回 + mutationRejected；insertBranchChild 成为公开 tree command；owner-doc 与 proof inventory 扩充。
- 第五轮使用全新 reviewer，门禁不变。

## 第五轮独立审查记录

- Reviewer M（架构 gate）：`REVISE`，4 Major；要求 tree core 原子初始化、no-action stale host 防覆盖、pending queue 背压、host projection 剥离 virtual slots。
- Reviewer N（几何 gate）：`REVISE`，5 Major；要求 focused merge=120、chain gap=54、slot containment 白名单、odd-size handle snapping、禁止未建模 edge marker/label。
- Reviewer O（contract gate）：`contract-not-ready`，0 P1 + 4 P2；要求 config immutable/remount、slot 复用 add menu/createDialog、compat wrapper 抛错、treeDocumentChangeAction 完整 compiler surface。
- 该轮当时新增 tree core factory、accepted baseline、pending FIFO/backpressure、host slot 过滤，并把 gap 收敛到 54/134|204/120；后续第七轮已将 chain 修正为 60、工厂收紧为仅接受 TreeDocument、并删除 compat wrapper。
- 第六轮使用全新 reviewer；门禁不变。

## 第六轮独立审查记录

- Reviewer P（架构 gate）：`REVISE`，4 Major；要求 dispatch failure 队列恢复、virtual incident edge host 过滤、tree host replacement 受验证 pair API 约束、layoutSize 接入真实 authoring type。
- Reviewer Q（几何 gate）：`REVISE`，4 Major；要求修正残余 118、ordinary chain +、12×12 handle connector overlap、marker/label 验证。
- Reviewer R（contract gate）：`contract-not-ready`，0 P1 + 3 P2；要求 pending 重复按 oldest-first、dispatch failure 清项、Phase 值统一为 120。
- 本版处理：pending 项带 dispatchId、oldest-first ack、失败清项并发送 coalesced latest；host 过滤 slot incident edges；replaceDocumentFromHost 在 tree mode 禁止并新增 validated replaceTreeFromHost；config.nodeTypes authoring/compile proof纳入；chain/handle/marker contract补齐；全部 merge 默认值统一 120。
- 第七轮使用全新 reviewer；门禁不变。

## 第七轮独立审查记录

- Reviewer S（架构 gate）：`REVISE`，4 Major；要求工厂不接收可伪造 pair、current direct convergence 清队列、canonical config DTO、版本迁移链。
- Reviewer T（几何 gate）：`REVISE`，2 Major；要求 chain 60、完整 edge decoration 拒绝；其余公式明确判定一致。
- Reviewer U（contract gate）：`contract-not-ready`，0 P1 + 2 P2；要求 action result 矩阵、兼容 wrapper 成功语义。
- 本版处理：工厂只接受 TreeDocument 并内部投影；current direct convergence 清 pending/coalesced；canonical serializable config DTO；版本迁移计划；chain 60；edge decoration 闭集验证；action result/backpressure 矩阵；删除 layoutStructuredTree compat wrapper，彻底只保留 projectAndLayoutTree。
- 第八轮使用全新 reviewer；门禁不变。

## 第八轮独立审查记录

- Reviewer V（架构 final）：`REVISE`，4 Major；要求 emitted digest tombstone、移除遗留 arbitrary pair/projectTree API、冻结具体版本迁移。
- Reviewer W（几何 final）：`REVISE`，2 Major；要求空 slot direction-specific minimum、branch label 不再 spread 到 edge data；其余核心几何判定一致。
- Reviewer X（contract final）：`contract-not-ready`，0 P1 + 3 P2；要求 tree factory result union、具体版本、config 完全冻结边界。
- 本版处理：session-lifetime emitted digest；public arbitrary pair APIs 与 projectTree 一并移除；config 1.0.0→1.1.0/tree 1.0.0 迁移冻结；factory result union；config prop 完全冻结到 key remount；slot TB 120×52/LR 140×32 minimum；branch data 不进入 projected edge。
- 第九轮使用全新 reviewer；门禁不变。
