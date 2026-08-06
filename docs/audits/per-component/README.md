# 审计卡模板 v2（修订于 CG，2026-08-06）

> 用途：`docs/audits/per-component/<renderer-type>.md` 审计卡的标准载体。v1 冻结于 C0（2026-08-02）；模板语义修订属 CG work item「checklist v2」——本文件为 `docs/audits/component-audit-checklist.md` v2 的落盘副本（checklist §4），模板语义修订仅经 CG work item 执行，不得在 C\* 执行中擅自改动。v1 → v2 变更见 checklist「变更摘要」节（维度 5/7/9/12/16 增补执行经验；维度编号不重构、历史卡不回写）。
> 规则：审计卡文件名 = renderer type；一个文件一次审计（更新同文件，不生成日期副本）；发现编号 `P<n>-<seq>` 在卡内递增；`shared:` 前缀标记跨组件问题；P0/P1 未清零不得 `closed`。详见 checklist §3/§5。

```md
# 审计卡：<renderer-type>（<package>）

> 状态: open | fixing | fixed-pending-closure | closed
> 审查日期: YYYY-MM-DD
> 审查 plan: <plan 文件>
> 注册定义: <path:line> | 渲染器: <path:line> | design.md: <path> | playground: <路径> | e2e: <路径>

## 组件身份

<type / 包 / schema 类型 / 默认值摘要 / 表单参与? / 布局 or widget?>

## 18 维审查记录

| # | 维度 | 结论 | 证据 | 发现 |

## 发现清单

- [P0-1] <描述>（`文件:行`）→ 状态: fixed
- [P1-1] <描述>（`文件:行`）→ 状态: ...

## 组合宿主场景（真实浏览器验证）

- 场景: <在 X 内使用 Y> | 断言: <DOM programmatic 断言> | 结果: pass/fail + 证据

## 修复记录

- plan / commit / 验证命令输出（typecheck/build/lint/test 相关项）
- test-first 证据: <复现测试文件:行 先于实现 commit> / <实现 commit>

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
```

## 记录规范速查（checklist §5）

- 每族 work item 的 plan 内必须包含：覆盖组件列表、18 维核对表、真实浏览器场景清单、Exit Criteria（审计卡全部 closed + 相关命令绿）。
- 每次 closure audit 记录按执行指南命名（`YYYY-MM-DD-HHmm-closure-audit-<component>.md`），审计卡 Closure 节记录其位置。
- 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`。
