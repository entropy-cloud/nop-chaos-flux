# 复杂控件开源实现调研

> 日期：2026-07-20
> 前置文档：`docs/components/complex-controls-organization-and-documentation.md`
> 关联 ERP 分析：nop-app-erp `docs/analysis/2026-07-20-complex-ui-controls-inventory-for-flux.md`

---

## 调研清单

| #   | 控件               | 调研项目数 | 主要参考来源                                               | 报告                   |
| --- | ------------------ | ---------- | ---------------------------------------------------------- | ---------------------- |
| 1   | 甘特图 Gantt       | 2          | SVAR React Gantt v2.7.1, DHTMLX Gantt CE v10.0.0           | `research-gantt.md`    |
| 2   | 看板 Kanban        | 4          | react-kanban-kit, react-kanban-simple, Planka, SVAR Kanban | `research-kanban.md`   |
| 3   | 排班日历 Calendar  | 2          | Schedule-X v4.6.1, react-big-calendar v1.20.0              | `research-calendar.md` |
| 4   | 条码扫描 Barcode   | 1          | react-zxing v3.0.0                                         | `research-barcode.md`  |
| 5   | 版本对比 Diff view | 2          | git-diff-view, react-diff-view v3.3.3                      | `research-diffview.md` |

---

## 核心发现

### 最值得参考的开源项目

| 控件       | 首选参考                | 理由                                                |
| ---------- | ----------------------- | --------------------------------------------------- |
| **甘特图** | DHTMLX Gantt CE v10.0.0 | 零依赖、最完整的数据模型和 WorkTime 引擎            |
| **看板**   | react-kanban-kit        | 扁平字典模型（与 Flux store 范式对齐），现代 DnD 库 |
| **日历**   | Schedule-X v4.6.1       | 插件架构、Temporal API、完整月/周/日视图算法        |
| **条码**   | react-zxing v3.0.0      | 极简 hook 设计、生命周期安全管理                    |
| **Diff**   | git-diff-view           | DiffFile 核心模型、可插拔高亮，多框架支持           |

### 每个报告包含的内容

每个调研报告遵循统一结构：

1. **调研概要** — 项目版本、许可、框架、代码量
2. **各项目深入分析** — 架构风格、数据模型、实现机制
3. **可参考的设计** — 评分 (★★★/★★☆/★☆☆) 和具体说明
4. **不应参考的设计** — 反模式、弱点评级
5. **对 Flux 的设计建议** — 数据层、渲染层、组件结构
6. **可复用开源代码清单** — 直接参考的模块和文件

### 各控件的关键设计决策

| 控件     | 核心决策                                                                 | 来源             |
| -------- | ------------------------------------------------------------------------ | ---------------- |
| Gantt    | 优先参考 DHTMLX 的 WorkTime 引擎 + SVAR 的像素坐标计算 + 命令式 DOM 拖拽 | 两者结合         |
| Gantt    | 数据模型沿用 DHTMLX 的 ITask/ILink + SVAR 的 $x/$y/$w/$h 计算属性        | DHTMLX + SVAR    |
| Kanban   | 采用扁平字典 BoardData 模型（RKK 方式）                                  | react-kanban-kit |
| Kanban   | 拖拽使用 @atlaskit/pragmatic-dnd                                         | react-kanban-kit |
| Kanban   | 卡片渲染使用 configMap 类型分发                                          | react-kanban-kit |
| Calendar | 事件定位算法参考 Schedule-X positionInMonth                              | Schedule-X       |
| Calendar | 时间点系统参考 Schedule-X（timePointsFromString）                        | Schedule-X       |
| Calendar | 资源排班通过 resourceId 字段                                             | Schedule-X       |
| Barcode  | 使用 BarcodeDetector API + WASM 降级                                     | react-zxing      |
| Barcode  | 会话管理模式（sessionRef + stale check）                                 | react-zxing      |
| Diff     | DiffFile 作为中央数据模型                                                | git-diff-view    |
| Diff     | Token pipeline（toTokenTrees → enhancers → backToTree）                  | react-diff-view  |

---

## 参考仓库

所有调研的源项目位于：

- `~/sources/complex-controls/react-gantt-svar/`
- `~/sources/complex-controls/dhtmlx-gantt/`
- `~/sources/complex-controls/react-kanban-kit/`
- `~/sources/complex-controls/react-kanban-simple/`
- `~/sources/complex-controls/planka-app/`
- `~/sources/complex-controls/schedule-x-calendar/`
- `~/sources/complex-controls/react-big-calendar/`
- `~/sources/complex-controls/react-zxing-barcode/`
- `~/sources/complex-controls/git-diff-view/`
- `~/sources/complex-controls/react-diff-view/`
