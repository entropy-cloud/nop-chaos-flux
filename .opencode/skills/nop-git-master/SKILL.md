---
name: nop-git-master
description: Nop项目Git专家 - 智能提交、Rebase、历史搜索（基于项目风格固化）
---

## 我会做什么

基于Nop项目实际提交历史调研的**全功能Git专家**：

- **智能提交**：自动拆分commits，符合项目风格
- **Rebase管理**：历史清理、squash、conflict解决
- **历史搜索**：查找代码变更、作者、引入时间
- **提交验证**：构建测试、代码检查

## 什么时候用我

- `更新` / `同步` / `pull` - 同步远程最新代码
- `提交修改` / `commit` - 智能提交（自动拆分）
- `rebase` / `squash` / `清理历史` - 历史管理
- `查找` / `谁写的` / `什么时候引入` - 历史搜索

---

# MODE DETECTION

| 用户请求 | 模式 |
|---------|------|
| "更新"、"同步"、"pull"、"最新" | SYNC |
| "提交"、"commit"、"改动" | COMMIT |
| "rebase"、"squash"、"清理历史" | REBASE |
| "查找"、"谁"、"什么时候"、"blame" | HISTORY_SEARCH |

---

# SYNC MODE

## 核心原则：先用无缓存方式检查，再决定是否更新

**❌ 错误做法：直接 pull/fetch**
```bash
# 错误：git pull/fetch 可能返回缓存的旧数据
# 问题：远程有更新，但本地显示"已是最新"
git pull --ff-only origin master  # 可能为 "Already up to date"，但实际有更新
```

**✅ 正确做法：先用 `git ls-remote` 无缓存检查**
```bash
# 正确：ls-remote 直接查询远程仓库，不使用任何缓存
git ls-remote origin master | awk '{print $1}'
# 返回远程真实的 SHA，与本地对比后再决定是否更新
```

## 标准流程（强制）

```bash
# 1. 获取远程真实 SHA（无缓存）
REMOTE_SHA=$(git ls-remote origin master | awk '{print $1}')

# 2. 获取本地 SHA
LOCAL_SHA=$(git rev-parse HEAD)

# 3. 对比
if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
  echo "✅ Already up to date: $LOCAL_SHA"
else
  echo "⚠️ Update needed: $LOCAL_SHA → $REMOTE_SHA"
  # 4. 执行强制同步
  git fetch origin $REMOTE_SHA --force
  git checkout master
  git reset --hard $REMOTE_SHA
  git update-ref refs/remotes/origin/master $REMOTE_SHA
  git log --oneline -3
fi
```

## 一命令版本（推荐）

```bash
REMOTE_SHA=$(git ls-remote origin master | awk '{print $1}') && \
LOCAL_SHA=$(git rev-parse HEAD) && \
if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then \
  echo "✅ Already up to date: $(git log --oneline -1)"; \
else \
  echo "⚠️ Updating: $LOCAL_SHA → $REMOTE_SHA" && \
  git fetch origin $REMOTE_SHA --force && \
  git checkout master && \
  git reset --hard $REMOTE_SHA && \
  git update-ref refs/remotes/origin/master $REMOTE_SHA && \
  git log --oneline -3; \
fi
```

## 为什么必须用 `git ls-remote`？

| 命令 | 是否使用缓存 | 可靠性 |
|------|-------------|--------|
| `git fetch` | ✅ 是（refs 可能过期） | ❌ 不可靠 |
| `git pull` | ✅ 是（依赖 fetch） | ❌ 不可靠 |
| `git ls-remote` | ❌ 否（直接查询远程） | ✅ 可靠 |

**问题场景：**
- Gitee/GitHub/GitLab 等 Git 服务器可能有 CDN 缓存
- 本地 refs 可能未正确更新
- `git fetch` 可能只更新 FETCH_HEAD，不更新 refs/remotes

**`git ls-remote` 优势：**
- 直接查询远程仓库的 refs（HTTP API 或 SSH）
- 不依赖任何本地缓存
- 返回真实的远程 SHA

## 特殊情况：有未提交修改

如果工作目录有未提交修改，需要先处理：

```bash
# 选项1：stash 暂存
git stash
# 执行同步...
git stash pop

# 选项2：commit 提交
git add -A && git commit -m "WIP"

# 选项3：放弃修改（确认后）
git reset --hard HEAD
git clean -fd
```

---

# COMMIT MODE

## 固定的提交风格（基于项目调研）

**语言：** English（commit messages, CHANGELOG, commit plan 必须使用英文）
**格式：** 语义化提交 `type(scope): description`
**类型分布：**
- `feat` (40%) - 新功能
- `docs` (15%) - 文档
- `refactor` (15%) - 重构
- `test` (10%) - 测试
- `fix` (10%) - Bug修复
- `chore` (8%) - 构建/工具
- `perf` (2%) - 性能

**作用域规则：**
- 小写模块名：`sys`, `cluster`, `orm`, `gateway`, `graphql`, `config`, `ai`
- 多作用域逗号分隔（无空格）：`feat(sys,cluster):`
- 可选：单文件或全局改动可省略scope

**正文格式：**
```
type(scope): short description (max 50 chars)

- Specific change 1 (verb + object)
- Specific change 2
- Specific change 3 (typically 3-6 items)

[Optional] Co-authored-by: Name <email>
```

## 智能提交拆分规则

### 拆分原则（简化版）

**核心原则：按逻辑分组，一个commit只做一件事**

```
1. 不同模块 → 不同commit（最高优先级）
   - nop-sys的变更不和nop-cluster混在一起
   - nop-orm的变更不和nop-gateway混在一起

2. 同一模块内按功能分组
   - 数据库schema变更单独commit
   - API接口变更单独commit
   - 配置变更单独commit
   - 文档变更单独commit

3. 测试和实现在同一commit
```

### 拆分维度（优先级从高到低）

**1. 按模块拆分（Primary）**

Nop项目模块结构：
```
nop-sys/         # 系统模块
  ├─ api/        # API接口定义
  ├─ dao/        # 数据访问层
  ├─ service/    # 业务逻辑层
  ├─ web/        # Web控制器
  ├─ meta/       # 元数据定义
  └─ codegen/    # 代码生成

nop-cluster/     # 集群模块
nop-orm/         # ORM模块
nop-gateway/     # 网关模块
...
```

**规则：不同模块 → 不同commit**

```
示例：8个文件修改
  - nop-sys/api/IService.java
  - nop-sys/dao/ServiceDao.java
  - nop-cluster/api/INaming.java
  - nop-cluster/service/NamingService.java
  - docs/guide.md
  - README.md

❌ 错误：1个commit "更新系统"
❌ 错误：2个commit（太少）

✅ Correct: 4 commits
  1. feat(sys): enhance service interfaces
     - nop-sys/api/IService.java
     - nop-sys/dao/ServiceDao.java
  2. feat(cluster): enhance naming service
     - nop-cluster/api/INaming.java
     - nop-cluster/service/NamingService.java
  3. docs: update development guide
     - docs/guide.md
  4. docs: update README
     - README.md
```

**2. 按层级拆分（Secondary）**

同一模块内，按层级拆分：

```
优先级：api → dao → service → web → meta

示例：nop-auth模块有5个文件
   1. feat(auth): add authentication API interfaces
      - api/AuthApi.java
   2. feat(auth): implement authentication data access
      - dao/AuthDao.java
   3. feat(auth): implement authentication business logic
      - service/AuthService.java
   4. feat(auth): add authentication web endpoints
      - web/AuthController.java
```

**3. 按关注点拆分（Tertiary）**

```
- 实现代码 vs 测试代码（通常同一commit）
- 功能代码 vs 配置文件（不同commit）
- 源代码 vs 文档（不同commit）
```

### 必须合并的情况

**测试+实现必须在同一commit：**
```
✅ 正确：
  feat(orm): add CRUD business interfaces

  - Add ICrudBizModel interface definition
  - Implement CrudBizModel base functionality
  - Add unit test coverage

  包含：
  - orm/src/main/java/CrudBizModel.java
  - orm/src/test/java/TestCrudBizModel.java
```

### 拆分验证（简化版）

执行commits前输出计划即可：

```
COMMIT PLAN
===========
Files changed: 8 | Planned commits: 4

COMMIT 1: feat(sys): enhance service registration
  - nop-sys/api/IServiceInstance.java
  - nop-sys/dao/ServiceInstanceDao.java
  Justification: same feature

COMMIT 2: feat(cluster): enhance cluster discovery
  - nop-cluster/service/DiscoveryService.java
  Justification: different module

COMMIT 3: docs: update documentation
  - docs/cluster-setup.md
  Justification: docs in separate commit
```

## 提交流程（零冗余）

```bash
# 1. 并行收集信息（一次性）
git status && git diff --staged --stat && git diff --stat

# 2. 生成commit plan（必须输出）

# 3. 执行commits（按依赖顺序）
for each commit:
  git add <files>
  git commit -m "type(scope): description" -m "- change 1" -m "- change 2"

# 4. 最终验证（一次）
git status
```

## Commit消息增强规则

### 正文详细程度要求

**单行commit（仅限1-2个文件）：**
```
fix(typo): fix spelling mistake
```

**标准commit（3-5个文件，必须3+项）：**
```
feat(sys): enhance service registration

- Add groupName and clusterName configuration items
- AutoRegistration supports auto-registering to specified groups
- SysDaoNamingService implements group-based service instance filtering
- Add clusterName matching logic to service discovery
```

**大型commit（5+文件或重要变更，必须5+项）：**
```
feat(sys,cluster): upgrade version field type and enhance cluster features

- Upgrade all nop-sys table VERSION fields from INTEGER to BIGINT for wider range
- Add clusterName matching logic to ZoneServiceInstanceFilter
- Add clusterName attribute support to service registration config
- Change nop_sys_service_instance table tags_text field to nullable
- Convert ORM codegen config from xlsx to xml format
- Update related documentation
```

### 必须详细说明的场景

**1. 破坏性变更（BREAKING CHANGE）**
```
feat(api): refactor user authentication interface

**BREAKING CHANGE:** authentication interface signature changed
- Old: AuthResult authenticate(String token)
- New: AuthResult authenticate(AuthRequest req)
- Migration guide: wrap token into AuthRequest object

- Refactor authenticate method signature
- Add AuthRequest request object
- Support multiple authentication methods
- Add migration example code
```

**2. 数据库变更**
```
feat(orm): modify user table schema

**Database changes:**
- New field: user_phone VARCHAR(20)
- Modified field: user_name VARCHAR(50) → VARCHAR(100)
- Index optimization: add idx_user_phone index
- Migration script: V2024.03.04__user_table_update.sql

- Add phone property to User entity
- Increase name field length
- Add phone index definition
```

**3. 配置变更**
```
feat(config): refactor database configuration items

**Config changes:**
- Deprecated: nop.db.url (use nop.datasource.url instead)
- New: nop.datasource.* series configuration
- Compatibility: old config still works but will warn

- Add DataSourceProperties configuration class
- Support multi-datasource configuration
- Add config migration hints
```

## CHANGELOG.md更新规则

### 自动检测条件

**必须更新CHANGELOG.md的情况：**

1. **用户可见的新功能**
   - 新增API接口
   - 新增配置项
   - 新增命令行参数
   - 新增UI功能

2. **破坏性变更**
   - API签名变更
   - 配置项重命名/删除
   - 数据库表结构变更
   - 依赖版本升级（major）

3. **重要的Bug修复**
   - 安全漏洞修复
   - 数据丢失风险修复
   - 性能问题修复

### CHANGELOG.md格式

基于项目现有的CHANGELOG.md格式：

```markdown
# Changelog

## Features YYYY-MM-DD
* Add XXX feature (commit: abc1234)
* Enhance YYY mechanism (commit: def5678)

## Changes YYYY-MM-DD
* **BREAKING CHANGE**: refactor ZZZ interface, migration required (commit: ghi9012)
* Refactor AAA module, improve performance (commit: jkl3456)

## Fixes YYYY-MM-DD
* Fix data loss issue in BBB scenario (commit: mno7890)
```

### 更新流程

```bash
# 1. 提交代码变更
git add <files>
git commit -m "feat(xxx): description"

# 2. 检查是否需要更新CHANGELOG
# 如果是用户可见变更，添加CHANGELOG条目

# 3. 更新CHANGELOG.md（如果需要）
# 在当前日期下添加条目

# 4. 提交CHANGELOG更新
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG"
```

### CHANGELOG条目模板

**新功能：**
```markdown
## Features 2024-03-04
* Add nop.cluster.name config for physical datacenter isolation (commit: abc1234)
* Enhance service registration with groupName and clusterName support (commit: def5678)
```

**破坏性变更：**
```markdown
## Changes 2024-03-04
* **BREAKING CHANGE**: refactor authentication interface, old token parameter no longer supported, use AuthRequest object (commit: ghi9012)
  - Migration: change `authenticate(token)` to `authenticate(new AuthRequest(token))`
```

**重要修复：**
```markdown
## Fixes 2024-03-04
* Fix data inconsistency in distributed transaction timeout scenarios (commit: jkl3456)
```

## 不兼容变更检测清单

在提交前检查以下项，如果命中任意一条，**必须**更新CHANGELOG.md并添加BREAKING CHANGE说明：

### API层
- [ ] 修改了public/protected方法签名
- [ ] 删除了public/protected方法
- [ ] 修改了返回值类型
- [ ] 修改了参数类型或顺序
- [ ] 新增了必填参数

### 配置层
- [ ] 删除了配置项
- [ ] 重命名了配置项
- [ ] 修改了配置项的默认值
- [ ] 修改了配置项的格式

### 数据层
- [ ] 删除了数据库表
- [ ] 删除了表字段
- [ ] 修改了字段类型（不兼容）
- [ ] 删除了索引
- [ ] 修改了主键

### 依赖层
- [ ] 升级了major版本的依赖
- [ ] 删除了依赖（可能导致编译失败）
- [ ] 修改了依赖的scope

### 行为层
- [ ] 修改了默认行为
- [ ] 修改了错误处理方式
- [ ] 修改了日志级别或格式
- [ ] 修改了性能特性（可能影响现有系统）

**如果以上任意一项命中：**
1. ✅ 在commit message中添加 `**BREAKING CHANGE:**` 说明
2. ✅ 更新CHANGELOG.md，添加迁移指南
3. ✅ 如果可能，提供兼容层或迁移脚本

**示例输出：**
```
⚠️  Breaking change detected:
  - API signature change: authenticate(String) → authenticate(AuthRequest)
  
✅ Actions taken:
  1. Commit message includes BREAKING CHANGE note
  2. CHANGELOG.md updated (with migration guide)
  3. Migration example code provided
```

---

# REBASE MODE

## 安全评估

```bash
# 并行收集信息
git branch --show-current
git log --oneline -20
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "NO_UPSTREAM"
git status --porcelain
```

**风险评估：**
| 条件 | 风险 | 动作 |
|------|------|------|
| 在main/master上 | 🔴 CRITICAL | **禁止rebase** |
| 工作目录脏 | 🟡 WARNING | 先stash |
| 已push的commits | 🟡 WARNING | 需要force-push |
| 全部commits本地 | 🟢 SAFE | 自由操作 |

## Rebase策略

**1. Interactive Squash（合并commits）**
```bash
# 合并所有commits为一个
MERGE_BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master)
git reset --soft $MERGE_BASE
git commit -m "feat(module): merged description"
```

**2. Autosquash（应用fixups）**
```bash
MERGE_BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master)
GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash $MERGE_BASE
```

**3. Rebase Onto（更新分支）**
```bash
git fetch origin
git rebase origin/main
```

## 冲突解决

```
CONFLICT → 工作流：

1. 识别冲突文件：
   git status | grep "both modified"

2. 解决每个冲突：
   - 阅读文件内容
   - 理解两个版本（HEAD vs incoming）
   - 编辑文件解决冲突
   - 移除冲突标记（<<<<, ====, >>>>）

3. 暂存解决后的文件：
   git add <resolved-file>

4. 继续rebase：
   git rebase --continue

5. 如果卡住：
   git rebase --abort  # 安全回滚
```

## Push策略

```
IF 从未push过：
  -> git push -u origin <branch>

IF 已经push过：
  -> git push --force-with-lease origin <branch>
  -> ⚠️ 必须用 --force-with-lease（不是--force）
```

---

# HISTORY SEARCH MODE

## 搜索类型识别

| 用户请求 | 搜索类型 | 工具 |
|---------|---------|------|
| "什么时候添加X" | PICKAXE | `git log -S` |
| "查找改变X模式的commits" | REGEX | `git log -G` |
| "谁写了这行" | BLAME | `git blame` |
| "bug什么时候开始" | BISECT | `git bisect` |
| "文件历史" | FILE_LOG | `git log -- path` |

## 搜索命令

**1. Pickaxe Search（查找字符串添加/删除）**
```bash
# 基础：查找字符串何时添加/删除
git log -S "searchString" --oneline

# 带上下文（查看实际变更）：
git log -S "searchString" -p

# 在特定文件中：
git log -S "searchString" -- path/to/file.java

# 跨所有分支（查找已删除代码）：
git log -S "searchString" --all --oneline

# 示例：
git log -S "def calculate_discount" --oneline
git log -S "MAX_RETRY_COUNT" --all --oneline
```

**2. Regex Search（正则匹配）**
```bash
# 查找匹配模式的commits
git log -G "pattern.*regex" --oneline

# 查找函数定义变更
git log -G "def\s+my_function" --oneline -p

# -S vs -G区别：
# -S "foo": 查找"foo"数量改变的commits
# -G "foo": 查找diff中包含"foo"的commits
```

**3. Git Blame（逐行归属）**
```bash
# 基础blame
git blame path/to/file.java

# 特定行范围
git blame -L 10,20 path/to/file.java

# 显示原始commit（忽略移动/复制）
git blame -C path/to/file.java

# 输出格式：
# ^abc1234 (Author 2024-01-15 10:30 +0900 42) code_line
```

**4. Git Bisect（二分查找bug）**
```bash
# 开始bisect会话
git bisect start
git bisect bad              # 当前（坏）状态
git bisect good v1.0.0      # 已知好状态

# Git会checkout中间commit，测试后：
git bisect good  # 如果这个commit正常
git bisect bad   # 如果这个commit有问题

# 重复直到找到culprit commit
# Git会输出："abc1234 is the first bad commit"

# 完成后返回原状态
git bisect reset
```

**5. 文件历史追踪**
```bash
# 文件完整历史
git log --oneline -- path/to/file.java

# 跟踪文件重命名
git log --follow --oneline -- path/to/file.java

# 显示实际变更
git log -p -- path/to/file.java
```

## 结果展示

```
SEARCH QUERY: "when was calculate_discount function added"
SEARCH TYPE: PICKAXE
COMMAND: git log -S "calculate_discount" --oneline

RESULTS:
  Commit       Date        Message
  ---------    --------    --------------------------------
  abc1234      2024-06-15  feat(order): add discount calculation
  def5678      2024-05-20  refactor: extract pricing logic

MOST RELEVANT: abc1234
DETAILS:
  Author: John Doe <john@example.com>
  Date: 2024-06-15
  Files changed: 3

DIFF:
  + def calculate_discount(price, rate):
  +     return price * (1 - rate)

ACTIONS:
  - View full commit: git show abc1234
  - Revert this commit: git revert abc1234
  - Cherry-pick to other branch: git cherry-pick abc1234
```

---

# 提交后验证

## 自动验证流程

```bash
# 提交后立即运行（如果修改了Java代码）
git status  # 确认工作目录干净
git log --oneline -5  # 查看最新提交

# 如果修改了pom.xml或Java代码：
mvn clean install -DskipTests -T 1C

# 如果只修改了文档/配置：跳过构建
```

**验证清单：**
- [ ] 工作目录干净（`git status` 无未提交文件）
- [ ] Commit历史正确（`git log --oneline -10`）
- [ ] 每个commit可独立回退
- [ ] 构建成功（如果修改了代码）
- [ ] 测试通过（如果存在测试）

---

# 快速参考

## Commit消息速查

```
feat(sys): add new feature
fix(cluster): fix bug
docs: update documentation
refactor(orm): refactor code
test(gateway): add tests
chore: build config
perf: performance optimization
```

## 同步速查

```bash
# 标准同步流程（无缓存检查 → 更新）
REMOTE_SHA=$(git ls-remote origin master | awk '{print $1}') && \
LOCAL_SHA=$(git rev-parse HEAD) && \
if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then \
  echo "✅ Already up to date: $(git log --oneline -1)"; \
else \
  echo "⚠️ Updating: $LOCAL_SHA → $REMOTE_SHA" && \
  git fetch origin $REMOTE_SHA --force && \
  git checkout master && \
  git reset --hard $REMOTE_SHA && \
  git update-ref refs/remotes/origin/master $REMOTE_SHA && \
  git log --oneline -3; \
fi

# 简化版（直接强制同步，不检查）
REMOTE_SHA=$(git ls-remote origin master | awk '{print $1}') && \
git fetch origin $REMOTE_SHA --force && \
git checkout master && \
git reset --hard $REMOTE_SHA && \
git update-ref refs/remotes/origin/master $REMOTE_SHA && \
git log --oneline -3
```

## Rebase速查

```bash
# Squash所有commits
git reset --soft $(git merge-base HEAD main) && git commit -m "..."

# Autosquash fixups
GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash $(git merge-base HEAD main)

# 更新分支
git fetch origin && git rebase origin/main
```

## 搜索速查

```bash
git log -S "string" --oneline           # 何时添加/删除
git log -G "pattern" --oneline          # 正则匹配
git blame -L 10,20 file.java            # 谁写了这行
git log --follow -- path/file.java      # 文件历史
```

---

# 反模式（AUTOMATIC FAILURE）

1. **从不做单一大commit** - 3+文件必须拆分
2. **从不使用`--force`** - 必须用`--force-with-lease`
3. **从不rebase main/master** - 永远禁止
4. **从不分离实现和单元测试** - 必须同一commit
5. **从不跳过COMMIT PLAN输出** - 必须验证拆分计划
6. **从不使用模糊的分组理由** - "相关"不是理由
7. **SYNC时从不直接 pull/fetch** - 必须先用 `git ls-remote` 无缓存检查，再决定是否更新
8. **从不信任本地 refs 缓存** - `git fetch` 结果可能与远程真实状态不一致，必须用 `git ls-remote` 验证
9. **commit消息必须使用英文** - 标题、正文、CHANGELOG条目一律英文，禁止中文

---

# 最终检查清单

**COMMIT前：**
- [ ] 文件数 → commit数：N files >= ceil(N/3) commits?
- [ ] 拆分计划：每个commit有justification?
- [ ] 模块拆分：不同模块 → 不同commits?
- [ ] 测试配对：单元测试和实现在同一commit?
- [ ] 依赖顺序：api → dao → service → web?

**REBASE前：**
- [ ] 不在main/master上？
- [ ] 工作目录干净（或已stash）？
- [ ] 了解force-push影响（如果已push）？

**SYNC前：**
- [ ] 用 `git ls-remote` 获取远程真实 SHA？
- [ ] 与本地 HEAD 对比，确认是否需要更新？
- [ ] 工作目录干净（或已处理未提交修改）？

**提交后：**
- [ ] 工作目录干净？
- [ ] 构建成功（如果修改了代码）？
- [ ] Commit消息符合风格（全部英文）？
- [ ] CHANGELOG已更新（如有破坏性变更/新功能/数据库变更）？
