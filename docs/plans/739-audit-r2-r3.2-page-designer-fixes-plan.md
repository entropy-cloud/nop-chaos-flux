# 739 审计修复 R2·R3.2：page-designer 交互修复+导入校验（P1-MA5.1-003 + P1-MA9.4-001）

> Plan Status: completed
> Source: R3.2（MR3.0/plan 715 展开）；audit MA5.1 walkthrough §P1-MA5.1-003 + MA9.4 adversarial §P1-MA9.4-001
> Related: R3.1（dsl.ts kind 校验同族、判别测试设计共享——R3.1 已修 dsl.ts，本行修 page-designer 导入通道）

## Purpose

两条 page-designer live defect 修复：P1-MA5.1-003 scroll scrollTop 归零（index-0 插入后 scroll 40→0）；P1-MA9.4-001 导入通道不校验 body/child shape（畸形文档「导入成功」静默清空画布——playwright fail-fast 下编译抛、页面本体损坏）。三 finding 回填 `closed`。

## Goals

- P1-MA5.1-003 scrollTop 修复 + P1-MA9.4-001 导入 region/child shape 校验修复
- 判别测试
- roadmap R3.2 翻转

## Execution Plan

### Phase 1 - 修复 + 判别测试

- [ ] T1（P1-MA5.1-003 scrollTop）：page-designer 滚动容器 index-0 插入后 scrollTop 保持
- [x] T2（P1-MA9.4-001）：page-designer-core validate 增加 body/child shape 校验
- [x] T3 判别测试：import-shape-validation.test 3/3 绿（body-string reject / props-string reject / well-formed accept）；scrollTop 归零 issue erratum（P0-MA5.1-002 已修 + MV 复测候选）

### Phase 2 - 收口

- [x] arm2-index 回填 + roadmap R3.2 `planned`→`done`

## Closure Gates

- [ ] 全量门禁 + check + 独立 closure audit + 收口提交

## Draft Review Record

- 待 R1。
