# 超越Harness Engineering: AGE 应用开发模板介绍

在我此前的两篇文章中已经介绍了AGE的基本理论概念以及它和Spec-Driven开发以及Harness Engineering的区别。 为了便于实际落地AGE的实践，我新建了一个新的模板项目[attractor-guided-engineering-template](https://github.com/entropy-cloud/attractor-guided-engineering-template)，本文是对这个模板的简单介绍。

参考：
[从 Spec-Driven Development 到 Attractor-Guided Engineering](https://mp.weixin.qq.com/s/j4dZm1bAK61qB8i5RzHRWA) ：AGE 不是 spec-driven workflow 的替代包装，而是以带 precedence 的 owner docs 定义 attractor、再通过 harness 让仓库轨迹持续收敛的工程框架。

[Attractor Before Harness: AI 大规模开发的方法论](https://mp.weixin.qq.com/s/TwMkUDLNo2-bIrXrfvPqIw)： 在 AI 大规模开发中 attractor（吸引子）必须先于 harness（控制机制）作为方法论的一等公民

## 一、AGE 是什么

**AGE = Attractor-Guided Engineering（吸引子引导工程）**

一套面向 AI 大规模应用开发的最佳实践模板。核心意图：**把仓库变成 AI 可持续工作的制度基础设施**，让 AI 在多 session、长周期、多角色协作中始终围绕文档这个"稳定吸引子"收敛，避免需求漂移、架构失真和 Demo 化开发。

> 仓库 = 真相源（Source of Truth），聊天 = 临时工作面

---

## 二、这个模板从哪里来

`templates/age-app-template` 不是从零设计的一套文档目录，而是从 Nop 系列项目的真实 AI 开发实践中抽取出来的轻量版本。

主要来源有三个：

- **nop-chaos-flux**：前端低代码运行时和设计器框架项目，沉淀了 owner-doc precedence、plan closure、audit、bug note、log、full-green baseline 等较完整的 AGE 实践。
- **nop-chaos-next**：应用层项目，沉淀了 `design/`、`input/`、`logs/`、`bugs/`、`skills/` 等更贴近普通业务应用的轻量文档实践。
- **nop-entropy**：后端框架项目，强化了"AI 必读的规范性文档"和"开发过程记忆"之间的分离。

`nop-chaos-flux` 证明了 AGE 可以支撑框架级、大规模、AI 深度参与的开发。但框架项目的文档体系太重，不能直接复制给普通应用团队。`age-app-template` 的目标是把其中对中小型应用项目真正有用的部分抽出来：文件进文件出、owner doc、轻量 plan、独立审计、日志、bug 记忆、验证基线，以及清晰的文档路由。

因此，它不是任何框架项目的缩小版，而是一个面向应用层的模板，适合后台系统、门户、工作流应用、Dashboard、内部工具、CRUD 较多的领域系统等已经有技术栈的项目。

---

## 三、解决什么问题

| 失败模式                             | AGE 的应对                                                   |
| ------------------------------------ | ------------------------------------------------------------ |
| 把大段需求扔给 AI → 生成 Demo 级应用 | 分阶段收敛：input → requirements → design → plan → implement |
| Vibe Coding，无历史记录              | docs/logs/ 记录每日变更，可追溯                              |
| 需求漂移，越写越偏                   | owner-doc（design/architecture）作为吸引子，持续回归         |
| 对话上下文丢失                       | 文件进，文件出，所有重要结论落地到仓库                       |
| AI 说"完成了"但没真测                | Closure Audit 独立验证闭包门                                 |
| 自己审查自己                         | 独立子 Agent（Independent Subagent）审查                     |

---

## 四、核心原则

### 4.1 文件进，文件出

重要输入写文件，重要输出回写仓库，**不允许只留在聊天里**。

### 4.2 吸引子 = 稳定结构

由一小批持久文件承载：

- docs/context/ — AI 必读上下文
- docs/requirements/ — 实现就绪的需求
- docs/design/ — 稳定的应用层设计
- docs/architecture/ — 稳定的技术架构

计划、日志、Bug 是**控制机制**，不是吸引子本身。

### 4.3 设计分离

- 业务/需求设计 → docs/design/
- 技术架构设计 → docs/architecture/
- 两者交叉引用，不混为一个文档

### 4.4 最小完整切片

- 不为 Demo 广度优化
- 一个真实功能切片 > 五个空壳页面
- 优先现有项目模式 > 发明新抽象

### 4.5 独立审查

高风险/高模糊性的需求、设计、Plan：

- 使用独立子 Agent 审查
- 审查者必须引用文件和证据
- 修订直到主要异议解决

### 4.6 代码注释最少化

优先自解释代码，只在容易误读处加极少注释。

---

## 五、docs/ 目录结构

### 核心（必须）

| 目录               | 职责                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| AGENTS.md          | AI 角色行为契约：你是谁、能做什么、边界在哪                                                    |
| docs/index.md      | 顶级文档路由：按任务类型定位到对应 owner doc                                                   |
| docs/context/      | AI 必读上下文：project-context、source-of-truth、conventions、ai-autonomy-policy、codebase-map |
| docs/backlog/      | 优先级候选工作队列和 AI 自主性标签，帮助选择下一个切片                                         |
| docs/process/      | 轻量开发工作流（10 个阶段）                                                                    |
| docs/input/        | 原始输入：PM 笔记、原型截图、外部参考                                                          |
| docs/requirements/ | 实现就绪的需求文件                                                                             |
| docs/design/       | 稳定的应用层设计（角色、流程、页面）                                                           |
| docs/architecture/ | 稳定的技术架构（模块边界、技术栈）                                                             |

### 按需触发

| 目录              | 触发条件                                |
| ----------------- | --------------------------------------- |
| docs/discussions/ | 需求模糊，需要澄清                      |
| docs/plans/       | 变更 API/DB/Auth/集成/多模块/跨 Session |
| docs/logs/        | 有实际变更落地                          |
| docs/bugs/        | 非显而易见的缺陷/回归                   |

### 可选

| 目录                 | 用途                         |
| -------------------- | ---------------------------- |
| docs/audits/         | 文档/计划/闭包审计记录       |
| docs/skills/         | 可复用的审查提示词模板       |
| docs/testing/        | 手动/探索性测试记录          |
| docs/lessons/        | 从重复失败中提炼的经验       |
| docs/retrospectives/ | 需求/实现偏差的事后分析      |
| docs/analysis/       | 调研、技术选型、被否决的方向 |

---

## 六、真相源优先级

| 问题             | 主真相源           | 补充                           |
| ---------------- | ------------------ | ------------------------------ |
| 应该构建什么？   | docs/requirements/ | docs/input/, docs/discussions/ |
| 当前应用行为？   | docs/design/       | 需求驱动变更                   |
| 当前技术结构？   | docs/architecture/ | 模块边界                       |
| 数据库真相？     | 模型/ORM 文件      | 文档只解释意图                 |
| API 契约？       | Schema 文件        | 可执行定义优先                 |
| 如何执行？       | docs/plans/        | 执行契约                       |
| 实际发生了什么？ | docs/logs/         | 测试/审计                      |

**冲突解决规则**：

- 需求与设计不一致 → 先决定是否变更基线，再更新文档
- 代码与文档不一致 → 视为实现漂移或文档过时，不能沉默选择
- 模型文件与文档不一致 → 模型文件优先

---

## 七、开发工作流（10 阶段）

`Stage 0  读取上下文 → context + conventions + project-context
Stage 1  收集原始输入 → docs/input/
Stage 2  澄清歧义 → docs/discussions/（可选）
Stage 3  合成需求 → docs/requirements/
Stage 4  更新设计基线 → docs/design/ + docs/architecture/
Stage 5  审计文档 → 独立子 Agent 审查
Stage 6  编写计划 → docs/plans/（按需触发，含任务路由和技能选择）
Stage 7  审计计划 → 独立子 Agent 审查
Stage 8  实现切片 → 最小完整切片
Stage 9  验证 → 测试 + docs/testing/
Stage 10 闭包审计 → 独立验证完成度`

### 三步核心控制循环

`A. 生成设计文档（需求设计 vs 架构设计分开写，互相引用，独立审查）
B. 根据设计文档生成 Plan（从稳定基线出发，独立审查）
C. 定期审计（文档审计 + 计划审计 + 闭包审计）`

---

## 八、Plan 规则

### 必须写 Plan 的触发条件

- 变更 API、数据库/模型、认证、集成、部署
- 跨多个功能面变更用户可见行为
- 涉及多个模块、改变共享行为
- 预计超过一个 AI Session
- 需要分阶段执行或显式闭包门
- 存在未解决的产品/技术风险

### 跳过 Plan 的安全场景

- 文案修改、小型样式调整
- 纯测试代码清理
- 单文件修复且有明确测试覆盖
- 低风险本地编辑

### Plan 最小结构

```markdown
## Current Baseline — 当前基线

## Goals / Non-Goals — 目标/非目标

## Execution Plan — 分阶段执行（checkbox）

## Closure Gates — 闭包门（验证命令 + 文档 + 日志）

## Closure Audit Evidence — 闭包证据
```

---

## 九、三级审计体系

| 审计类型     | 时机                    | 检查重点                                     |
| ------------ | ----------------------- | -------------------------------------------- |
| **文档审计** | 需求/设计更新后、实现前 | 范围边界、隐藏未解决问题、输入与需求一致性   |
| **计划审计** | Plan 写完后、实现前     | 闭包门是否诚实、隐藏依赖、需求缺口           |
| **闭包审计** | 实现完成后              | 实际行为匹配需求、证明存在于文件、文档已对齐 |

### 审查方式

- 使用**独立子 Agent** 审查（不自己审自己）
- 审查者必须引用文件和证据
- 审查结果存为文件

---

## 十、文档命名规则

| 类型           | 命名方式       | 示例                                |
| -------------- | -------------- | ----------------------------------- |
| 稳定 owner-doc | 固定名称       | app-overview.md, system-baseline.md |
| 时效文件       | 带日期前缀     | 2026-05-21-feature-req.md           |
| 日志           | 年/月/日       | docs/logs/2026/05-21.md             |
| 审计           | 日期+类型+主题 | 2026-05-21-doc-audit.md             |

---

## 十一、首次使用清单

### Day 0 必须（编码前）

- [ ] 替换所有 `<project-name>` 占位符
- [ ] 填写 docs/context/project-context.md（真实内容）
- [ ] 确认 Active Requirement 路径
- [ ] 确认 Active Owner Doc 路径
- [ ] 在 docs/backlog/ 中填写第一个工作项及其优先级和自主性标签
- [ ] 填写真实可执行的验证命令

### 渐进填写（不阻塞第一个切片）

- [ ] docs/architecture/project-vision.md
- [ ] docs/architecture/system-baseline.md
- [ ] docs/design/app-overview.md
- [ ] docs/requirements/product-scope.md
- [ ] docs/requirements/mvp.md

### 禁止启动条件

- project-context.md 为空
- 验证命令仍为占位符
- Active Requirement 为 none
- 需求模糊到需要猜测用户可见行为

---

## 十二、AI 开发可以不做的事

- **不生成大量注释**（必要时极少注释即可）
- **不从原始输入直接跳到代码**（先收敛到 requirements）
- **不优化 Demo 广度**（一个真实切片 > 五个空壳）
- **不把验证命令写成占位符**（必须真实可执行）
- **不自己审查自己**（用独立子 Agent）
