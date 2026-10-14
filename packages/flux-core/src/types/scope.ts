export interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
  revision?: number;
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

export interface ScopeStore<T = Record<string, unknown>> {
  getSnapshot(): T;
  getLastChange(): ScopeChange | undefined;
  setSnapshot(next: T, change?: ScopeChange): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}

export interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materialize(): Record<string, unknown>;
  collector?: ScopeDependencyCollector;
}

export interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  isolate?: boolean;
  store?: ScopeStore;
  readonly value: Record<string, unknown>;
  /**
   * Kind of scope as created (`CreateScopeOptions.source`). Used by consumers
   * that need to branch on scope lineage — e.g. forms rendered inside a
   * dialog/drawer surface seed their initial values from the surface data.
   */
  source?: 'root' | 'row' | 'dialog' | 'drawer' | 'form' | 'fragment' | 'custom';
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, unknown>;
  readVisible(): Record<string, unknown>;
  materializeVisible(): Record<string, unknown>;
  update(path: string, value: unknown): void;
  merge(data: Record<string, unknown>): void;
  replace?(data: Record<string, unknown>): void;
}

export interface CreateScopeOptions {
  pathSuffix?: string;
  isolate?: boolean;
  scopeKey?: string;
  source?: 'root' | 'row' | 'dialog' | 'drawer' | 'form' | 'fragment' | 'custom';
}
