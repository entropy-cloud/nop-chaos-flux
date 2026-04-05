export interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
}

export interface ScopeDependencySet {
  paths: readonly string[];
  wildcard: boolean;
  broadAccess: boolean;
}

export interface ScopeDependencyCollector {
  recordPath(path: string): void;
  recordWildcard(): void;
}

export interface ScopeStore<T = Record<string, any>> {
  getSnapshot(): T;
  getLastChange(): ScopeChange | undefined;
  setSnapshot(next: T, change?: ScopeChange): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}

export interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materialize(): Record<string, any>;
  collector?: ScopeDependencyCollector;
}

export interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  store?: ScopeStore;
  readonly value: Record<string, any>;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  read(): Record<string, any>;
  update(path: string, value: unknown): void;
  merge(data: Record<string, unknown>): void;
}

export interface CreateScopeOptions {
  pathSuffix?: string;
  isolate?: boolean;
  scopeKey?: string;
  source?: 'root' | 'row' | 'dialog' | 'form' | 'fragment' | 'custom';
}
