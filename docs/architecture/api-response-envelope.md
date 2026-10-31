# ApiResponse 标准信封与 Field Selection

## Purpose

本文档定义 Flux 前端与 nop-entropy 后端之间的 API 响应/请求标准契约。

- `ApiResponse` 标准信封格式（与 nop-entropy `io.nop.api.core.beans.ApiResponse` 对齐）
- 成功判定 `status === 0`（镜像后端 `isOk()`），`ApiResponse` 不携带 `ok` 字段
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

Flux 的 `ApiResponse` 与后端标准一一对齐（`packages/flux-core/src/types/renderer-api.ts`）：

```typescript
interface ApiResponse<T = unknown> {
  status: number; // 0=成功，任何其他值=失败
  data: T | null; // 业务数据；失败/异常路径与无数据成功均为 null，只在 status === 0 时读取
  code?: string; // 错误码
  msg?: string; // 人类可读错误消息（顶层字段）
  errors?: Record<string, string>; // 字段级校验错误
  headers?: Record<string, string>;
  raw?: unknown;
}
```

`ApiResponse` **没有 `ok` 字段**：成功判定只看 `status === 0`，消费者按 `status` 分支。宿主 fetcher 原样返回后端 JSON 即可，不做任何成功/失败翻译。成功只能写 `status: 0`；任何非 0 值都是失败（后端取值为 `-1` 与 `400/401/403/404/408` HTTP 错误映射）。mock fetcher 不得使用 `100-399` 的 HTTP 成功/重定向码——它们在 `status === 0` 判定下是失败，读起来却像成功。

`ActionResult.ok` 与此无关：它是动作派发的控制流信号（`then`/`onError` 分支依据），由动作执行层设置，保留。

### 1.3 规范化层

```
env.fetcher() → { status, code?, msg?, data, errors?, headers? }   (后端原始 JSON)
      │
      ▼  规范化层（flux-runtime request-runtime.ts executeApiSchema）
      │  isOk = (response.status === 0)
      │
      ├── isOk=false → 对错误载荷运行 responseAdaptor（若其抛错：console.warn 诊断并回退原始载荷）
      │               → throw ApiError(msg || `status=${status}`, code, errors, status)
      │
      └── isOk=true  → responseAdaptor(response.data) → { ok: true, data: adapted }
```

规范化层的职责：

1. **判定**：`isOk = response.status === 0`。
2. **失败分支**：错误消息取 `response.msg`（不在 `data.message`/`data.msg` 里猜测），构造携带 `code`/`msg`/`errors`/`status` 与重试元数据的 `ApiError` 抛出；配置了 `responseAdaptor` 时先对错误载荷求值，适配器自身抛错时以结构化诊断报告并回退原始载荷，保证后端消息不丢失。
3. **成功分支**：对 `response.data` 运行 `responseAdaptor`（如有），结果作为业务 payload；消费者看到的 `ActionResult.data` 始终是 post-adaptor 的 `response.data`。

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

规范化后，`ActionResult.data` **始终是后端 `ApiResponse.data`**（post-`responseAdaptor`），即干净的业务 payload。消费者直接使用 `result.data`，不做任何信封解包或嗅探：

| 消费者            | 读取方式                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| Form `loadAction` | 直接用 `result.data`                                                     |
| Page `loadAction` | 直接用 `result.data`                                                     |
| DynamicRenderer   | 直接把 `result.data` 当作 schema（再做 `type` 形状校验）                 |
| CRUD `loadAction` | `normalizeCrudSourceValue(result.data)`（list-shape 归一化，非信封解包） |

被拒绝的做法：按 `'data' in payload` / `'ok' in payload` 嗅探"嵌套结果"再解包。业务 payload 本身合法地含有 `data` 键（例如带顶层 `data` 的动态 schema `{ type: 'page', data: {...}, body: [...] }`），嗅探会把它误解包成内部对象并拒绝。

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

### 5.1 为什么 `ApiResponse` 不提供 `ok`

被拒绝的替代方案：在 `ApiResponse` 上保留 `ok`（由 fetcher 设置，或由规范化层回填的计算属性）。

- 后端 `isOk()` 是 `@JsonIgnore` 计算方法，不出现在 JSON 中；任何 `ok` 字段都只能是派生冗余，与 `status` 并存时会出现两个真相源（例如 `{ ok: true, status: 200 }` 在 `status === 0` 约定下其实是失败）。
- 只保留 `status` 让宿主 fetcher 零翻译，mock 与真实 fetcher 行为天然一致。
- 动作层需要的控制流信号由 `ActionResult.ok` 承担，与传输信封分离。

### 5.2 为什么错误消息从 `response.msg` 读而非 `data.message`

旧设计在 `data.message`/`data.msg` 里猜测错误消息，因为错误消息被认为在 `ApiResponse.data` 内部。但 nop-entropy 标准中 `msg` 是 `ApiResponse` 的顶层字段，不在 `data` 里。

从 `response.msg` 读取：

- 字段位置明确，不需要猜测优先级
- `code`/`errors` 同为一等公民
- `data` 在失败时无意义，不应承载错误信息

### 5.3 为什么在 runtime 层规范化而非 fetcher 层

| 在 fetcher 层                                               | 在 runtime 层（裁定）                        |
| ----------------------------------------------------------- | -------------------------------------------- |
| 每个宿主重复实现成功判定                                    | 实现一次，所有宿主受益                       |
| fetcher 既管 transport 又管业务语义                         | 职责分离：fetcher=transport，runtime=语义    |
| responseAdaptor 拿到已翻译数据，无法访问原始 `status`/`msg` | responseAdaptor 运行在规范化之后，上下文完整 |
| mock fetcher 和真实 fetcher 行为不一致                      | 统一行为                                     |

---

## 6. 实现落点

- 类型：`packages/flux-core/src/types/renderer-api.ts`（`ApiResponse`）、`schema-base-types.ts`（`ApiSchema`/`ExecutableApiRequest.selection`）。
- 规范化：`packages/flux-runtime/src/async-data/request-runtime.ts`（`status === 0` 判定、`ApiError` 构造、失败载荷适配）；`runtime-action-helpers.ts`（`executeRuntimeAjaxAction` 错误路径使用 `ApiError.msg`/`code`/`errors`）。
- 消费者：`form.tsx`、`page.tsx`、`dynamic-renderer.tsx` 直接读取 `result.data`；CRUD 保留 list-shape 归一化。
- 宿主与 mock：fetcher 返回 `{ status, code?, msg?, data, errors? }`；`flux-guide/flux-types/common.d.ts` 含 `ApiResponse` 与 `ApiSchemaObject.selection`。
- 门禁：`scripts/verify-api-response-envelope.mjs`（`pnpm check:api-envelope`，接入 `pnpm check`）检查 mock 不含冗余 `ok`、不使用 100-399 的 `status`、类型不含 `ok`、消费者无信封嗅探、目标文件缺失即红。
