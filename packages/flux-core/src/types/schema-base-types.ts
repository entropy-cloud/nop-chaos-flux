export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type SchemaValue = Primitive | SchemaObject | ReadonlyArray<SchemaValue> | SchemaValue[];

export interface SchemaObject {
  [key: string]: SchemaValue;
}

export type SchemaPath = string;

export type RequestDedupStrategy = 'cancel-previous' | 'parallel' | 'ignore-new';

export interface OperationControlConfig extends SchemaObject {
  timeout?: number;
  retry?: {
    times: number;
    delay?: number;
    strategy?: 'fixed' | 'exponential';
    maxDelay?: number;
  };
  debounce?: number;
  throttle?: number;
  cacheTTL?: number;
  cacheKey?: string;
  dedup?: RequestDedupStrategy;
}

export interface ApiSchema extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  selection?: string;
  responseAdaptor?: string;
  requestAdaptor?: string;
  /** Expected response body type. `'blob'` signals a binary download (host fetcher responsibility). Defaults to `'json'`. */
  responseType?: 'json' | 'blob' | 'text';
  /** Overrides the server-provided filename for blob downloads. */
  downloadFileName?: string;
  /** Request body encoding. `'json'` (default), `'form-data'` (multipart), `'form'` (urlencoded). */
  dataType?: 'json' | 'form-data' | 'form';
}

export interface ExecutableApiRequest extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  headers?: Record<string, string>;
  selection?: string;
  params?: never;
  includeScope?: never;
  responseAdaptor?: never;
  requestAdaptor?: never;
  /** Propagated from ApiSchema so the host fetcher can read `api.responseType`. */
  responseType?: 'json' | 'blob' | 'text';
  /** Propagated from ApiSchema so the host fetcher can read `api.downloadFileName`. */
  downloadFileName?: string;
}

export interface PreparedApiRequest {
  request: ExecutableApiRequest;
  data: SchemaValue | undefined;
  params: Record<string, unknown> | undefined;
  finalUrl: string;
}

export interface XuiImportSpec extends SchemaObject {
  from: string;
  as: string;
  options?: Record<string, SchemaValue>;
}
