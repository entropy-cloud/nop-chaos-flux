/**
 * Schema-agnostic JSON merge / delta contracts.
 *
 * Nothing here is aware of Flux schema types: the tool operates on plain JSON
 * data and discovers element identity from the data itself, so the same code
 * serves any document shape.
 */

/** Identity coverage of a list, decided at runtime from the elements. */
export type ListIdentityKind = 'all' | 'some' | 'none';

/** An element's identity, expressed as the key it was found under plus its value. */
export interface IdentityRef {
  readonly key: string;
  readonly value: string;
}

/** Control-marker keys, configurable so the tool can adopt a host namespace. */
export interface MergeMarkers {
  /** Key whose value selects a whole-subtree operator. Defaults `xui:override`. */
  readonly override?: string;
  /** Key whose `true` value keeps a merge anchor out of the output. Defaults `xui:virtual`. */
  readonly virtual?: string;
}

export interface JsonMergeOptions {
  /**
   * Ordered identity key chain. The first key holding a non-empty scalar wins.
   * Defaults to `['xui:id', 'id', 'name']`.
   */
  readonly identityKeys?: readonly string[];
  /**
   * Key whose value names another key to use as identity (indirect addressing).
   * Defaults `xui:unique-attr`.
   */
  readonly uniqueAttrKey?: string;
  readonly markers?: MergeMarkers;
  /**
   * When set, a delta key starting with this prefix overrides the base value at
   * the stripped key instead of merging into it. Disabled by default because it
   * steals key space from arbitrary documents.
   */
  readonly forceOverridePrefix?: string;
}

export type MergeDiagnosticCode = 'list-not-keyed' | 'duplicate-identity';

export interface MergeDiagnostic {
  readonly code: MergeDiagnosticCode;
  /** JSON Pointer to the offending list; empty string for the document root. */
  readonly path: string;
  readonly listKind: ListIdentityKind;
  readonly identityKey?: string;
  readonly identityValue?: string;
}

export interface MergeResult {
  readonly value: unknown;
  readonly diagnostics: readonly MergeDiagnostic[];
}

export interface DeltaResult {
  /** The delta document, or `undefined` when `resolved` already equals `base`. */
  readonly value: unknown;
  readonly diagnostics: readonly MergeDiagnostic[];
}

export const DEFAULT_IDENTITY_KEYS: readonly string[] = ['xui:id', 'id', 'name'];
export const DEFAULT_UNIQUE_ATTR_KEY = 'xui:unique-attr';
export const DEFAULT_OVERRIDE_KEY = 'xui:override';
export const DEFAULT_VIRTUAL_KEY = 'xui:virtual';

/** Fully defaulted option set used internally so hot paths never re-resolve. */
export interface MergeContext {
  readonly identityKeys: readonly string[];
  readonly uniqueAttrKey: string;
  readonly overrideKey: string;
  readonly virtualKey: string;
  readonly forcePrefix: string | undefined;
}

export function resolveContext(options: JsonMergeOptions = {}): MergeContext {
  return {
    identityKeys: options.identityKeys ?? DEFAULT_IDENTITY_KEYS,
    uniqueAttrKey: options.uniqueAttrKey ?? DEFAULT_UNIQUE_ATTR_KEY,
    overrideKey: options.markers?.override ?? DEFAULT_OVERRIDE_KEY,
    virtualKey: options.markers?.virtual ?? DEFAULT_VIRTUAL_KEY,
    forcePrefix: options.forceOverridePrefix,
  };
}

export function joinPath(base: string, token: string | number): string {
  const escaped = String(token).replace(/~/g, '~0').replace(/\//g, '~1');
  return `${base}/${escaped}`;
}