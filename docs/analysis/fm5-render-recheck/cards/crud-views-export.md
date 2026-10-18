# [card] page:crud-views-export（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/crud-views-export` ｜ **载体**: complex-page（R2-1a 在案页）
- **矩阵裁剪**: simplified（**本页 4 张矩阵截图全部为纯白空白采集伪影**，以 live 浏览器三态补证：light 1440×900、dark 800×900、light 800×900）

## 1. 截图清单

| 状态          | light                                                                         | dark                                                                       |
| ------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/…/crud-views-export-default-1280x800-light.png`（**4.7KB 空白伪影**）   | `_tmp/…/crud-views-export-default-1280x800-dark.png`（**4.7KB 空白伪影**） |
| 默认 800×900  | `_tmp/…/crud-views-export-default-800x900-light.png`（**4KB 空白伪影**）      | `_tmp/…/crud-views-export-default-800x900-dark.png`（**4KB 空白伪影**）    |
| 实时补证      | live 1440×900 + 800×900 浏览器截图（本次走查：工具栏/视图切换/表格/分页正常） | live 800×900（data-mode=dark：整页 dark 适配，表格/分页可读）              |

## 2. 回归判定

**pass（无新回归；矩阵 4 张截图需全部重采）**。live 三态核验：页面渲染完整，dark 已适配（无亮块），表格卡片视图切换、状态徽章（启用绿/禁用红）、分页均正常。空白为采集竞态（crud-views-export 为本批唯一 4/4 全空页面，疑采集脚本导航竞态；注意 `#/crud-views-export` 非法 hash 会回落 home，正确路由为 `#/complex-pages/crud-views-export`）。

## 3. 发现条目

### [FM5-shard2-C4-05] R2-1a-C4-02 复发（在案 P3）：800px 分页条右侧"共 N 条"信息仍被裁字

- **页面/路由**: `#/complex-pages/crud-views-export` 表格分页条
- **主题/视口/状态**: light、dark / 800×900 / 默认（live 截图）
- **截图**: 本次 live 800×900 截图（light/dark 同形态；矩阵原图空白）
- **目视描述**: 分页条"第 1-10 条，共…"在"共"后被卡片右缘裁断，与 R2 记录一致。
- **程序化证据**: live 截图表现与 R2-1a-C4-02 记录一致（复发判定）
- **对照基准**: C4 / D6 分页条口径；R2-1a-C4-02（→ R2-4 批核对同族 standard-crud/tree-crud，未收口）
- **严重程度**: P3（维持原判，复发非新增）
- **用户影响**: 窄视口总条数信息丢失，翻页功能不受影响。
- **修复方向**: 分页条 flex-wrap 或"共 N 条"信息 `shrink-0` + 容器留白；与同族两页一并核。
- **归族**: systemic → 既有项 ｜ **复核状态**: 本 round live 复核确认仍在

### [FM5-shard2-note-09] R2-1a-C3-01（导出后工具栏纵排 P3）不可核验

- 需点击"导出 CSV（后台生成）"后的布局态，live walk未执行导出操作；按在案维持。
