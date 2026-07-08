# ApiResponse 标准信封与 Field Selection

## Purpose

本文档定义 Flux 前端与 nop-entropy 后端之间的 API 响应/请求标准契约。

- `ApiResponse` 标准信封格式（与 nop-entropy `io.nop.api.core.beans.ApiResponse` 对齐）
- `ok` 计算属性的设计（镜像后端 `isOk()`）
- `selection` 字段选择参数（对应 `FieldSelectionBean`）
- 响应规范化层的位置和职责
- 消费者契约（`ActionResult.data` 的语义）

**前置文档**: `docs/architecture/api-data-source.md`（ApiSchema / fetcher boundary / 请求执行流）

---

## 1. 标准信封格式

### 1.1 后端契约

nop-entropy 后端所有接口统一返回 `ApiResponse<T>`：

```java
// io.nop.api.core.beans.ApiResponse
public final class ApiResponse<T> extends ApiMessage {
    private int status;           // 0=成功, -1=失败, 400/401/403/404/408=HTTP错误映射
    private String code;          // 错误码 (如 "app.user.not-found")
    private String msg;           // 人类可读错误消息
    private T data;               // 业务数据 (仅 status==0 时有意义)
    private Map<String, String> errors;  // 字段级校验错误
    private boolean wrapper;      // 标记是否纯包装对象
    // httpStatus: 仅服务端构建 HTTP 响应时用，不序列化到 JSON
}
```

成功判断：**`status == 0`**（`ApiConstants.API_STATUS_OK = 0`）。

JSON 序列化后的实际传输格式：

```json
// 成功
{ "status": 0, "data": { "id": 1, "name": "Alice" } }

// 失败
{ "status": -1, "code": "app.user.not-found", "msg": "用户不存在" }

// 字段校验错误
{ "status": -1, "code": "validation.failed", "msg": "校验失败", "errors": { "email": "邮箱格式错误" } }
```

### 1.2 Flux ApiResponse 类型

Flux 的 `ApiResponse` 类型必须与后端标准对齐，同时增加计算属性 `ok`：

```typescript
interface ApiResponse<T = unknown> {
  status: number; // 0=成功, 非0=失败
  code?: string; // 错误码
  msg?: string; // 错误消息
  data?: T; // 业务数据
  errors?: Record<string, string>; // 字段级校验错误
  headers?: Record<string, unknown>; // 响应头
  ok?: boolean; // 计算属性: status === 0（由规范化层设置）
}
```

**`ok` 的来源**：后端 Java 对象有 `@JsonIgnore boolean isOk() { return status == 0; }`，它不出现在 JSON 中，但是一个合法的计算属性。Flux 在规范化层计算 `ok = (response.status === 0)`，与后端 `isOk()` 语义一致。`ok` 在类型上是可选的，因为 fetcher 返回的原始信封不含 `ok`；规范化层在 responseAdaptor 之前必定设置它，消费者读到的 `ok` 始终已计算完成。

### 1.3 规范化层

```
env.fetcher() → { status, code?, msg?, data?, errors?, headers? }   (后端原始 JSON，无 ok)
      │
      ▼  规范化层 (executeApiSchema 内，responseAdaptor 之前)
      │  response.ok = (response.status === 0)
      │
      ▼  responseAdaptor (对 data 做用户自定义变形)
      │
      ├── ok=false → throw ApiError(msg || `status=${status}`, code, errors)
      │
      └── ok=true  → ActionResult { ok:true, data: response.data }
```

规范化层的职责（按顺序）：

1. **计算 `ok`**：`response.ok = response.status === 0`
2. **分支**：
   - `ok === false`：提取 `msg` 作为错误消息（不再在 `data.message`/`data.msg` 里猜测），构造 `ApiError`，包含 `code`/`msg`/`errors`/`status`
   - `ok === true`：对 `response.data` 运行 `responseAdaptor`（如有），结果作为业务 payload
3. **消费者看到的 `ActionResult.data`** 始终是 `response.data`（post-adaptor），即干净的业务 payload

### 1.4 与旧设计的差异

| 维度         | 旧设计                               | 新设计                                          |
| ------------ | ------------------------------------ | ----------------------------------------------- |
| 成功判断     | `ApiResponse.ok`（fetcher 自己设置） | `ApiResponse.status === 0`（runtime 计算 `ok`） |
| 错误消息     | 在 `data.message`/`data.msg` 里猜测  | 直接读 `response.msg`（一等公民）               |
| 错误码       | 无                                   | `response.code`（一等公民）                     |
| 字段错误     | 无                                   | `response.errors`（一等公民）                   |
| `data` 解包  | 消费者各自猜测（3 种启发式）         | runtime 保证 `ActionResult.data` = 业务 payload |
| fetcher 职责 | 翻译 `ok` + 丢失 `msg`/`code`        | 返回后端原始 JSON 即可                          |

---

## 2. 错误处理契约

### 2.1 错误消息优先级

当 `status !== 0` 时，错误消息按以下优先级提取：

1. `response.msg`（后端标准字段）
2. `response.errors` 的第一条值（字段级错误兜底）
3. `Request failed (status=${status}, code=${code})`（通用兜底）

**不再**在 `data.message`/`data.msg` 里猜测——`msg` 在响应顶层，不是在 `data` 里。

### 2.2 字段级错误

当 `response.errors` 存在时，它是 `{ fieldName: errorMessage }` 映射。表单场景下可用于字段级校验回显：

```json
{
  "status": -1,
  "code": "validation.failed",
  "msg": "校验失败",
  "errors": {
    "email": "邮箱格式错误",
    "name": "姓名不能为空"
  }
}
```

运行时应将 `errors` 透传到 `ApiError` 上，供表单 submit 错误处理消费。

### 2.3 与 `messages` 配置的关系

schema 层的 `messages.failed`（`MessagesConfig`）是作者声明的 toast 文案，优先级高于后端 `msg`：

- `messages.failed` 存在 → 显示作者声明的文案（模板可引用 scope 变量）
- `messages.failed` 不存在 → 显示后端 `response.msg`

这保持了 `messages` 作为「作者对用户的确定性反馈」语义，后端 `msg` 作为兜底。

---

## 3. Field Selection 参数

### 3.1 后端契约

nop-entropy `ApiRequest` 有 `selection: FieldSelectionBean` 字段，是 GraphQL 风格的字段选择：

```java
// io.nop.api.core.beans.ApiRequest
private FieldSelectionBean selection;  // 类似于GraphQL请求，指定需要访问的对象结构
```

传递方式（`ApiConstants`）：

| 方式        | 名称            | 示例                                    |
| ----------- | --------------- | --------------------------------------- |
| HTTP Header | `nop-selection` | `nop-selection: id,name,role{id,label}` |
| Query 参数  | `@selection`    | `?@selection=id,name,role{id,label}`    |

字符串格式（`FieldSelectionPrinter`）：

```
// 简单字段
id,name,email

// 嵌套字段
id,name,role{id,name}

// 别名 (alias:sourceName)
label:name,deptId:department.id

// 参数 (GraphQL-style)
userList(limit:10){id,name}

// 指令
items @limit(count:10){id,name}
```

### 3.2 Flux ApiSchema 增加 selection

```typescript
interface ApiSchema extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  selection?: string; // GraphQL 风格字段选择: "id,name,role{id,label}"
  includeScope?: '*' | string[];
  responseAdaptor?: string;
  requestAdaptor?: string;
}
```

### 3.3 运行时传递

请求准备阶段（`prepareApiRequestForExecution`），`selection` 注入到 `ExecutableApiRequest`：

```typescript
interface ExecutableApiRequest extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  headers?: Record<string, string>;
  selection?: string; // 透传到 fetcher
}
```

宿主 fetcher 负责：

- 将 `selection` 设置为 HTTP header `nop-selection`，或
- 追加到 URL query 参数 `@selection=...`

具体传递方式由宿主决定（nop-entropy 后端同时支持 header 和 query param 两种形式）。

### 3.4 使用场景

```json
{
  "action": "ajax",
  "args": {
    "url": "/api/users/${id}",
    "method": "get",
    "selection": "id,name,email,role{id,label},dept{name}"
  }
}
```

后端根据 `selection` 只返回请求的字段，减少网络传输和服务端查询开销。

---

## 4. 消费者契约

### 4.1 ActionResult.data 语义

规范化后，`ActionResult.data` **始终是后端 `ApiResponse.data`**（post-`responseAdaptor`），即干净的业务 payload。

消费者**不再需要**：

- 检查 `result.data.data`（信封解包）—— 已由规范化层完成
- 检查 `'data' in payload`（Form/Page 的双模式猜测）—— 应删除
- 嗅探 `isActionResult`（DynamicRenderer 的启发式）—— 应删除

### 4.2 各消费者应删除的启发式

| 消费者            | 当前启发式                              | 改为                                             |
| ----------------- | --------------------------------------- | ------------------------------------------------ |
| Form `loadAction` | `'data' in payload` → 解包              | 直接用 `result.data`                             |
| Page `loadAction` | `'data' in payload` → 解包              | 直接用 `result.data`                             |
| DynamicRenderer   | `isActionResult(result.data)` 嗅探      | 直接用 `result.data`                             |
| CRUD `loadAction` | `normalizeCrudSourceValue(result.data)` | 保持（它做的是 list-shape 归一化，不是信封解包） |

### 4.3 `${result.data}` 在 then 链中

`then` 子链的 `result` 绑定的是整个 `ActionResult`，`result.data` 直接就是业务 payload：

```json
{
  "action": "ajax",
  "args": { "url": "/api/users/${id}", "method": "get" },
  "then": {
    "action": "setValues",
    "args": { "values": "${result.data}" }
  }
}
```

这里 `${result.data}` 就是后端返回的 `{ id, name, email, ... }`，没有信封壳。

---

## 5. 设计裁定记录

### 5.1 为什么 `ok` 是计算属性而非传输字段

后端 `ApiResponse.isOk()` 是 `@JsonIgnore` 的计算方法，不出现在 JSON 中。如果 Flux 要求 fetcher 返回 `ok`，则每个宿主集成都需要自己翻译 `status === 0 → ok: true`，这是重复逻辑且容易出错。

在规范化层计算 `ok`：

- 与后端 `isOk()` 语义一致
- 宿主 fetcher 返回原始 JSON 即可，无需翻译
- 既有消费代码（`if (!response.ok)`）零改动

### 5.2 为什么错误消息从 `response.msg` 读而非 `data.message`

旧设计在 `data.message`/`data.msg` 里猜测错误消息，因为错误消息被认为在 `ApiResponse.data` 内部。但 nop-entropy 标准中 `msg` 是 `ApiResponse` 的顶层字段，不在 `data` 里。

从 `response.msg` 读取：

- 字段位置明确，不需要猜测优先级
- `code`/`errors` 同为一等公民
- `data` 在失败时无意义，不应承载错误信息

### 5.3 为什么在 runtime 层规范化而非 fetcher 层

| 在 fetcher 层                                               | 在 runtime 层（裁定）                        |
| ----------------------------------------------------------- | -------------------------------------------- |
| 每个宿主重复实现 `ok` 计算                                  | 实现一次，所有宿主受益                       |
| fetcher 既管 transport 又管业务语义                         | 职责分离：fetcher=transport，runtime=语义    |
| responseAdaptor 拿到已翻译数据，无法访问原始 `status`/`msg` | responseAdaptor 运行在规范化之后，上下文完整 |
| mock fetcher 和真实 fetcher 行为不一致                      | 统一行为                                     |

---

## 6. 实施影响范围

### 类型层（`flux-core`）

- `renderer-api.ts`: `ApiResponse` 增加 `code`/`msg`/`errors`，`ok` 改为计算属性语义
- `schema-base-types.ts`: `ApiSchema` / `ExecutableApiRequest` 增加 `selection`

### 运行时层（`flux-runtime`）

- `request-runtime.ts`: 规范化层计算 `ok`，错误消息从 `response.msg` 提取
- `runtime-action-helpers.ts`: `executeRuntimeAjaxAction` 错误处理路径使用 `ApiError.msg`/`code`/`errors`
- `request-runtime-adaptor.ts`: responseAdaptor 上下文已有 `status`（`session` 相关字段未变更——adaptor 上下文结构不在本轮 scope 内）

### 消费者层

- `form.tsx`: 删除 `'data' in payload` 解包启发式
- `page.tsx`: 删除同样的启发式
- `dynamic-renderer.tsx`: 删除 `isActionResult` 嗅探
- CRUD `normalizeCrudSourceValue`: 保持不变（list-shape 归一化）

### 宿主层

- mock fetcher: 返回 `{status, code?, msg?, data?, errors?}` 格式
- `flux-guide/flux-types/common.d.ts`: `ApiSchemaObject` 增加 `selection`

### flux-guide 类型

- `common.d.ts`: 增加 `ApiResponse` 类型定义，`ApiSchemaObject` 增加 `selection`
