# ApiObject and DataSource Design

## Purpose

This document describes the design of `ApiObject` for HTTP requests and `DataSourceSchema` for declarative data fetching.

## ApiObject

`ApiObject` describes an HTTP request configuration.

### Interface

```typescript
interface ApiObject extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  responseAdaptor?: string;
  requestAdaptor?: string;
  cacheTTL?: number;
  cacheKey?: string;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Request URL (required) |
| `method` | `string` | HTTP method (default: `get`) |
| `data` | `SchemaValue` | Request body data |
| `params` | `SchemaValue` | URL query parameters (auto-appended to URL) |
| `headers` | `Record<string, string>` | Request headers |
| `includeScope` | `'*' \| string[]` | Auto-include scope variables in `data` |
| `responseAdaptor` | `string` | Expression to transform response |
| `requestAdaptor` | `string` | Expression to transform request |
| `cacheTTL` | `number` | Cache time-to-live in milliseconds |
| `cacheKey` | `string` | Custom cache key (default: auto-generated from url/method/data/params) |

### includeScope

The `includeScope` field controls automatic scope variable injection into request data.

**Merge Logic:**
```
finalData = { ...extractScope(includeScope), ...data }
```

`data` values take precedence over `includeScope` extracted values for the same keys.

**Examples:**

```json
// Include all scope variables
{
  "url": "/api/save",
  "includeScope": "*"
}

// Include specific fields
{
  "url": "/api/save",
  "includeScope": ["userId", "projectId"]
}

// Merge scope with explicit data (data overrides scope)
{
  "url": "/api/save",
  "includeScope": ["userId"],
  "data": { "userId": "${overrideUserId}", "extra": "value" }
}
```

### params

The `params` field specifies URL query parameters. These are automatically appended to the URL.

**Examples:**

```json
// GET request with params
{
  "url": "/api/users",
  "method": "get",
  "params": { "status": "active", "page": 1 }
}
// Result: /api/users?status=active&page=1

// POST request with both params and body
{
  "url": "/api/users",
  "method": "post",
  "params": { "version": "v2" },
  "data": { "name": "Alice" }
}
// Result: /api/users?version=v2 with body { "name": "Alice" }
```

### requestAdaptor / responseAdaptor

Adaptors allow transforming requests and responses using expressions.

**requestAdaptor Context:**
- `api` - The ApiObject
- `scope` - Scope proxy for reading variables
- `data` - The request data
- `headers` - The request headers

**responseAdaptor Context:**
- `payload` / `response` - The response data
- `api` - The ApiObject
- `scope` - Scope proxy

**Example:**

```json
{
  "url": "/api/data",
  "requestAdaptor": "return { ...api, data: { ...api.data, timestamp: Date.now() } }",
  "responseAdaptor": "return payload.data.items"
}
```

### cacheTTL / cacheKey

Response caching reduces redundant network requests.

**cacheTTL**: Time-to-live in milliseconds. If not set, caching is disabled.

**cacheKey**: Custom cache key for sharing cache across components. Default is auto-generated from `method:url:data:params`.

**Examples:**

```json
// Cache for 5 minutes
{
  "url": "/api/config",
  "cacheTTL": 300000
}

// Custom cache key for cross-component sharing
{
  "url": "/api/user",
  "cacheTTL": 60000,
  "cacheKey": "current-user"
}

// No caching (default)
{
  "url": "/api/realtime-data"
}
```

**Cache behavior:**
- Cache is checked before making network requests
- Expired entries are automatically removed on access
- Setting `cacheTTL` to 0 or undefined disables caching

## DataSourceSchema

`DataSourceSchema` is a non-rendering component that fetches data and injects it into the **current scope**. It renders nothing itself (`null`). Sibling nodes that share the same scope automatically re-render when the fetched data arrives.

### Interface

```typescript
interface DataSourceSchema extends BaseSchema {
  type: 'data-source';
  api: ApiObject;
  dataPath?: string;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
  initialData?: SchemaValue;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `api` | `ApiObject` | Request configuration (required) |
| `dataPath` | `string` | Scope key to write response data into |
| `interval` | `number` | Polling interval in milliseconds |
| `stopWhen` | `string` | Expression to stop polling when true |
| `silent` | `boolean` | Suppress error notifications |
| `initialData` | `SchemaValue` | Initial value to write to scope before first fetch |

### Scope Injection Behavior

`data-source` writes the response into the **current scope** — the scope in which it is rendered. Sibling nodes rendered in the same scope see the updated data and re-render automatically.

**With `dataPath`:** The entire response is written to `scope[dataPath]`.

```
scope[dataPath] = responseData
```

**Without `dataPath`:** The response is treated as a `Record` and merged into the current scope. Non-object responses are silently ignored.

```
scope = { ...scope, ...responseData }
```

`initialData` follows the same injection rules and is written to scope before the first fetch begins.

### Behavior

1. If `initialData` is provided, writes it to scope before the first fetch
2. Executes the API request
3. Writes response to scope using the injection rules above
4. If `interval` is set, starts polling
5. Evaluates `stopWhen` against scope after each response; stops polling when true
6. On error, calls `env.notify('error', message)` unless `silent` is true

### Loading and Error State

`data-source` renders `null`. There is no built-in loading skeleton or error widget.

- **Loading**: manage loading UX externally (e.g., conditional visibility on sibling nodes)
- **Error**: `env.notify('error', message)` is called (suppressed when `silent: true`)

### Examples

**Basic data source with `dataPath`:**

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "api": { "url": "/api/user/${userId}" },
      "dataPath": "user"
    },
    {
      "type": "text",
      "text": "Hello, ${user.name}"
    }
  ]
}
```

**No `dataPath` — response merged into scope:**

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "api": { "url": "/api/context" }
    },
    {
      "type": "text",
      "text": "Project: ${projectName}, User: ${userName}"
    }
  ]
}
```

**Polling with stop condition:**

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "api": { "url": "/api/job/${jobId}/status" },
      "dataPath": "status",
      "interval": 3000,
      "stopWhen": "${status.complete}"
    },
    {
      "type": "text",
      "text": "Progress: ${status.progress}%"
    }
  ]
}
```

**With scope injection and params:**

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "api": {
        "url": "/api/tasks",
        "includeScope": ["projectId"],
        "params": { "status": "active" }
      },
      "dataPath": "tasks"
    },
    {
      "type": "text",
      "text": "Found ${tasks.length} active tasks"
    }
  ]
}
```

## Implementation Notes

### Request Processing Flow

1. **Prepare data:**
   - Extract scope variables based on `includeScope`
   - Merge with explicit `data` (data takes precedence)

2. **Build URL:**
   - Append `params` to URL as query string

3. **Apply requestAdaptor:**
   - Transform request before sending

4. **Execute fetcher:**
   - Call `env.fetcher(api, context)`

5. **Apply responseAdaptor:**
   - Transform response before returning

### dataPath vs ActionSchema.dataPath

- `ApiObject` no longer contains `dataPath`
- `ActionSchema.dataPath` controls where ajax action results are written (page store)
- `DataSourceSchema.dataPath` controls where fetched data is written (current scope)

This separation keeps `ApiObject` focused on request description.

## Related Documents

- `docs/references/renderer-interfaces.md`
- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
