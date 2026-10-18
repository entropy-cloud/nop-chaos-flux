# [card] page:taskflow-designer

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/taskflow-designer`（domain 路由）｜ **载体**: 设计器 demo 页
- **矩阵裁剪**: simplified（抽样口径；G7 双向同步为交互链路，本轮静态面可判）

## 1. 截图清单

| 状态          | light                                          | dark           |
| ------------- | ---------------------------------------------- | -------------- |
| 默认 1280×800 | `taskflow-designer-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `taskflow-designer-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass ｜ B 颜色：pass（dark 下节点卡/连线/属性面板可读，无 light 泄漏块）｜ C 布局：pass（三栏布局/小地图正常）｜ D 间隔：pass ｜ E 排布：pass ｜ G 设计器：G1 画布默认态节点/锚点/边渲染正常；**G7-02（P1 属性面板双向断链）交互级未复核**（覆盖缺口登记）

## 3. 发现

无新增回归。watch-pool R2-1b-F4-03（工具栏中英混用：Back/Export/Save 英文 + 节点库/属性面板中文）**维持**——本轮工具栏仍英文、面板中文，与登记时点一致。

## 4. 结论

**verdict: pass（基线维持；F4-03 watch 维持，G7-02 登记覆盖缺口）**。
