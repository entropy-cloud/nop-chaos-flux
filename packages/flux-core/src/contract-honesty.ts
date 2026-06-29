import type { RendererDefinition } from './types/index.js';

/**
 * Contract honesty guard utilities.
 *
 * A renderer that declares an `eventContracts`, a `fields(kind:'event')`, or a
 * `componentCapabilityContracts` entry is advertising a contract to schema
 * authors. The guard verifies that every advertised contract key is actually
 * referenced by the renderer implementation (its component body or registered
 * ComponentHandle), converting a recurring "lying contract" drift into a
 * test-time failure instead of relying on adversarial audits.
 *
 * The analysis is pure (no filesystem access) so it stays safe for any build
 * target. Per-package tests gather their own component source text and pass it
 * to `findUnreferencedContracts`.
 *
 * Granularity contract (G15): each renderer definition is checked against the
 * source that is relevant to IT — never a whole-package blob merged across
 * sibling renderers — so a sibling renderer's usage cannot mask a missing
 * implementation. Comment-only references (`// events.onChange`) do not count.
 *
 * Handle anchoring contract (G4): a capability handle counts as referenced only
 * when it appears in a real ComponentHandle wiring context (a `case '<handle>'`,
 * an equality comparison, or as an element of a methods/listMethods array
 * literal) — not as an incidental quoted string (action type, i18n key, etc.).
 */
export interface ContractHonestyViolation {
  rendererType: string;
  unreferencedEventKeys: string[];
  unreferencedCapabilityHandles: string[];
}

/**
 * Per-definition source(s) for a contract-honestity check.
 */
export interface ContractHonestySources {
  /**
   * The renderer's own implementation source. Event keys are checked against
   * this source only (per-renderer isolation; a sibling renderer's event usage
   * cannot mask a missing one).
   */
  componentSource: string;
  /**
   * Optional source where this renderer's capability handles are wired — e.g. a
   * shared runtime factory the renderer delegates its ComponentHandle to.
   * Checked per-definition; never merged across sibling renderers, so a
   * sibling's incidental handle string cannot mask a missing implementation.
   * Defaults to `componentSource`.
   */
  capabilityHandleSource?: string;
}

/**
 * Either a single source blob (applied to every definition — useful for the
 * synthetic probe tests) or a per-definition resolver returning isolated
 * source(s) for each renderer.
 */
export type ContractHonestySourceResolver =
  | string
  | ((definition: RendererDefinition) => ContractHonestySources | string);

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(value: string): string {
  return value.replace(REGEX_SPECIAL, '\\$&');
}

/**
 * Remove block comments (slash-asterisk ... asterisk-slash), full-line `//`
 * comments, and JSDoc continuation lines (` * ...`) so a comment that merely
 * mentions a contract key does not count as a reference. Only full-line comment
 * forms are stripped so a `//` inside a string literal (e.g. a URL) is left
 * intact.
 */
function stripComments(sourceText: string): string {
  return sourceText
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/^[ \t]*\*.*$/gm, '');
}

/**
 * True when an event-contract key is referenced through the renderer event
 * channel, i.e. accessed via dot or bracket notation on an `events` channel,
 * regardless of the owning expression (`props.events.<key>`,
 * `owner.events.<key>`, `parentProps.events.<key>`, `props.events['<key>']`,
 * `props.events?.['<key>']`). These are the dominant access patterns in the
 * renderer packages. Comment-only references are ignored.
 */
export function isRendererEventKeyReferenced(key: string, sourceText: string): boolean {
  const escaped = escapeRegExp(key);
  const pattern = new RegExp(`events\\??(?:\\.${escaped}\\b|\\[['"]${escaped}['"]\\])`);
  return pattern.test(stripComments(sourceText));
}

/**
 * True when a capability handle is referenced as a real ComponentHandle wiring
 * context. A handle counts only when the quoted literal appears:
 *  - in a dispatch `case '<handle>':` branch,
 *  - in an equality comparison (`method === '<handle>'` / `'<handle>' === ...`),
 *  - or as an element of a methods/listMethods array literal
 *    (`['<handle>', ...]` / `[..., '<handle>']`).
 *
 * Incidental quoted occurrences (action types like `'submit'`, i18n keys,
 * error messages) do NOT count. This makes the implementation honest with its
 * JSDoc and prevents common-word handles from passing when their wiring is
 * silently dropped. Comment-only references are ignored.
 */
export function isCapabilityHandleReferenced(handle: string, sourceText: string): boolean {
  const escaped = escapeRegExp(handle);
  const source = stripComments(sourceText);
  const patterns: RegExp[] = [
    new RegExp(`case\\s+['"]${escaped}['"]\\s*:`),
    new RegExp(`={2,3}\\s*['"]${escaped}['"]`),
    new RegExp(`['"]${escaped}['"]\\s*={2,3}`),
    // ComponentHandle method arrays: `methods: [... '<handle>' ...]` /
    // `listMethods: [...]`. Restricted to a methods/listMethods property so a
    // common-word handle cannot be incidental-satisfied by an unrelated array
    // literal (e.g. `labels: ['save', 'cancel']`).
    new RegExp(`(?:methods|listMethods)\\s*:\\s*\\[[^\\]]*?['"]${escaped}['"]`),
    // listMethods-style return of a method array: `return [... '<handle>' ...]`.
    new RegExp(`return\\s+\\[[^\\]]*?['"]${escaped}['"]`),
  ];
  return patterns.some((pattern) => pattern.test(source));
}

/**
 * A package source file located by a test harness. The harness owns filesystem
 * access; the helpers below only index in-memory text, keeping the guard pure.
 */
export interface ContractHonestySourceFile {
  path: string;
  content: string;
}

/**
 * A runtime handle-factory whose source a harness wants to mix into a
 * renderer's capability source, but ONLY when that renderer actually delegates
 * to it. `hookPattern` matches the call-site that delegates handles to the
 * factory (e.g. `useInputComponentHandle`, `createCompositeFieldHandle`).
 */
export interface ContractHonestyHandleFactory {
  hookPattern: RegExp;
  source: string;
}

const SOURCE_EXT = /\.(jsx?|tsx?)$/;

function stripSourceExt(spec: string): string {
  return spec.replace(SOURCE_EXT, '');
}

function normalizeRelativePath(p: string): string {
  const parts = p.split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

interface ParsedImport {
  names: readonly string[];
  from: string;
}

/**
 * Parse the named/default imports of a source file. Only relative specifiers
 * (starting with `./` or `../`) are relevant for in-package resolution. Returns
 * the imported names and the raw specifier.
 */
function parseRelativeImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const importPattern =
    /import\s+(?:type\s+)?(?:([A-Za-z_$][\w$]*)(?:\s*,\s*)?|\*\s+as\s+[A-Za-z_$][\w$]*\s+)?(?:\{([^}]*)\})?\s*(?:,\s*\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(content)) !== null) {
    const defaultName = match[1];
    const namedA = match[2];
    const namedB = match[3];
    const from = match[4];
    if (!from.startsWith('.') && !from.startsWith('/')) continue;
    const names: string[] = [];
    if (defaultName) names.push(defaultName);
    for (const named of [namedA, namedB]) {
      if (!named) continue;
      for (const raw of named.split(',')) {
        const trimmed = raw.split(/\s+as\s+/)[0].trim();
        if (trimmed) names.push(trimmed);
      }
    }
    imports.push({ names, from });
  }
  return imports;
}

interface TypeComponentPair {
  type: string;
  componentRef: string | undefined;
}

/**
 * Walk a definition source and associate each declared `type: '...'` with the
 * `component: <Ref>` that belongs to the same definition object. The component
 * is taken as the first `component:` literal following the `type:` and preceding
 * the next `type:` (definition objects list `type` before `component`).
 */
function associateTypeToComponent(content: string): TypeComponentPair[] {
  const stripped = stripComments(content);
  const tokenPattern = /\b(?:type|component)\s*:\s*(['"][^'"]+['"]|[A-Za-z_$][\w$]*)/g;
  const tokens: { kind: 'type' | 'component'; value: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(stripped)) !== null) {
    const kind = match[0].startsWith('type') ? 'type' : 'component';
    let value = match[1];
    if (value[0] === '"' || value[0] === "'") value = value.slice(1, -1);
    tokens.push({ kind, value });
  }
  const pairs: TypeComponentPair[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].kind !== 'type') continue;
    let componentRef: string | undefined;
    for (let j = i + 1; j < tokens.length; j += 1) {
      if (tokens[j].kind === 'type') break; // next definition object
      if (tokens[j].kind === 'component') {
        componentRef = tokens[j].value;
        break;
      }
    }
    pairs.push({ type: tokens[i].value, componentRef });
  }
  return pairs;
}

/**
 * Build a G15 per-definition source resolver for a renderer package.
 *
 * EVENTS are checked against each renderer's OWN component implementation source
 * only — never a whole-package blob — so a sibling renderer's event usage can no
 * longer mask a missing implementation (H7).
 *
 * The implementation source is resolved uniformly across package conventions:
 *  - co-located (definition + component in one file): the definition's
 *    `component: LocalComponent` references a component defined in the SAME
 *    file, so that file is the implementation source;
 *  - split (definitions imported into a `*-definitions.ts`, components in
 *    separate files): the definition's `component: ImportedComponent` is
 *    resolved through the file's relative imports to the component file.
 *
 * CAPABILITY handles are checked against the implementation source plus any
 * runtime handle factory whose call-site the renderer actually references
 * (passed via `factories`). Handles wired in the component itself (case/methods)
 * are satisfied by the implementation source alone; handles delegated to a
 * shared runtime factory are satisfied only for renderers that reference that
 * factory, so a sibling's factory cannot mask a missing implementation.
 *
 * PURE: harnesses walk their package (filesystem) and pass the file list, the
 * declared renderer `type` strings, and — when the package delegates handles to
 * runtime factories — those factory sources.
 */
export function buildPerRendererSourceResolver(
  files: readonly ContractHonestySourceFile[],
  types: readonly string[],
  factories: readonly ContractHonestyHandleFactory[] = [],
): ContractHonestySourceResolver {
  const fileByStem = new Map<string, ContractHonestySourceFile>();
  const fileByPath = new Map<string, ContractHonestySourceFile>();
  for (const file of files) {
    fileByPath.set(file.path, file);
    fileByStem.set(stripSourceExt(file.path), file);
  }

  /**
   * Resolve a relative import specifier from an importer file to its source
   * file, if present in the package.
   */
  const resolveImport = (importer: ContractHonestySourceFile, spec: string) => {
    const dir = importer.path.includes('/') ? importer.path.slice(0, importer.path.lastIndexOf('/')) : '';
    const resolved = normalizeRelativePath(`${dir ? `${dir}/` : ''}${stripSourceExt(spec)}`);
    return fileByStem.get(resolved);
  };

  const typeSet = new Set(types);

  /**
   * All relative imports (static + dynamic) of a file, resolved to package
   * paths. Dynamic imports matter for lazily-loaded components (e.g. chart).
   */
  const importsByFile = new Map<string, string[]>();
  for (const file of files) {
    const code = stripComments(file.content);
    const specs = new Set<string>();
    for (const imp of parseRelativeImports(code)) specs.add(imp.from);
    const dynamicPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let dm: RegExpExecArray | null;
    while ((dm = dynamicPattern.exec(code)) !== null) {
      if (dm[1].startsWith('.')) specs.add(dm[1]);
    }
    const resolved: string[] = [];
    for (const spec of specs) {
      const target = resolveImport(file, spec);
      if (target) resolved.push(target.path);
    }
    importsByFile.set(file.path, resolved);
  }

  // Which renderer types each file DECLARES (only files with a RendererDefinition
  // annotation). Used to exclude sibling renderer files from a renderer's own
  // implementation tree so a sibling's event/handle usage cannot mask a missing
  // implementation.
  const declaredTypesByFile = new Map<string, Set<string>>();
  for (const file of files) {
    if (!/RendererDefinition/.test(file.content)) continue;
    const declared = new Set<string>();
    for (const pair of associateTypeToComponent(file.content)) {
      if (typeSet.has(pair.type)) declared.add(pair.type);
    }
    if (declared.size > 0) declaredTypesByFile.set(file.path, declared);
  }

  const implFilesByType = new Map<string, ContractHonestySourceFile[]>();

  for (const file of files) {
    if (!/RendererDefinition/.test(file.content)) continue;
    const pairs = associateTypeToComponent(file.content);
    if (pairs.length === 0) continue;

    const importedByName = new Map<string, string>();
    for (const imp of parseRelativeImports(stripComments(file.content))) {
      const target = resolveImport(file, imp.from);
      if (!target) continue;
      for (const name of imp.names) importedByName.set(name, target.path);
    }

    for (const { type, componentRef } of pairs) {
      if (!typeSet.has(type)) continue;
      let implFile: ContractHonestySourceFile | undefined;
      if (componentRef && importedByName.has(componentRef)) {
        implFile = fileByPath.get(importedByName.get(componentRef)!);
      } else {
        // Co-located: component is defined in this same file.
        implFile = file;
      }
      if (!implFile) continue;
      const list = implFilesByType.get(type) ?? [];
      if (!list.includes(implFile)) list.push(implFile);
      implFilesByType.set(type, list);
    }
  }

  const basename = (p: string) => {
    const slash = p.lastIndexOf('/');
    const tail = slash >= 0 ? p.slice(slash + 1) : p;
    return tail.replace(SOURCE_EXT, '');
  };

  /**
   * The full implementation tree of a renderer: its component file(s) plus every
   * file reachable through (static or dynamic) relative imports, EXCLUDING
   * barrel `index` modules and files that declare a DIFFERENT renderer type
   * (sibling renderers). This is the renderer's own implementation graph, so a
   * sibling's event/handle usage can never leak in (H7/G15).
   */
  const reachableByType = new Map<string, ContractHonestySourceFile[]>();
  for (const type of types) {
    const seeds = implFilesByType.get(type) ?? [];
    const visited = new Set<string>();
    const ordered: ContractHonestySourceFile[] = [];
    const queue: ContractHonestySourceFile[] = [];
    for (const seed of seeds) {
      if (visited.has(seed.path)) continue;
      visited.add(seed.path);
      ordered.push(seed);
      queue.push(seed);
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const nextPath of importsByFile.get(current.path) ?? []) {
        if (visited.has(nextPath)) continue;
        const next = fileByPath.get(nextPath);
        if (!next) continue;
        if (basename(next.path) === 'index') continue;
        const declared = declaredTypesByFile.get(nextPath);
        if (declared && declared.size > 0 && !declared.has(type)) continue;
        visited.add(nextPath);
        ordered.push(next);
        queue.push(next);
      }
    }
    reachableByType.set(type, ordered);
  }

  return (definition) => {
    const reachable = reachableByType.get(definition.type) ?? [];
    const componentSource = reachable.map((f) => f.content).join('\n');
    let capability = componentSource;
    for (const factory of factories) {
      if (factory.hookPattern.test(stripComments(capability))) {
        capability += `\n${factory.source}`;
      }
    }
    return { componentSource, capabilityHandleSource: capability };
  };
}

/**
 * Returns every declared event / capability contract that is not referenced in
 * the resolved source for that definition.
 *
 * `source` may be a single blob (applied to every definition — used by the
 * synthetic probe tests) or a per-definition resolver. Production package tests
 * should pass a resolver that returns each renderer's own implementation source
 * (plus, for handles delegated to a shared factory, that factory's source) so a
 * sibling renderer's usage cannot mask a missing implementation. The resolver
 * source must be renderer implementation source, NOT renderer-definition files
 * (those declare the contracts and would otherwise make every contract look
 * referenced).
 */
export function findUnreferencedContracts(
  definitions: readonly RendererDefinition[],
  source: ContractHonestySourceResolver,
): ContractHonestyViolation[] {
  const violations: ContractHonestyViolation[] = [];

  for (const definition of definitions) {
    const resolved =
      typeof source === 'function' ? source(definition) : source;
    const componentSource =
      typeof resolved === 'string' ? resolved : resolved.componentSource;
    const capabilitySource =
      typeof resolved === 'string' ? resolved : (resolved.capabilityHandleSource ?? resolved.componentSource);

    const eventKeys = new Set<string>();
    if (definition.eventContracts) {
      for (const key of Object.keys(definition.eventContracts)) {
        eventKeys.add(key);
      }
    }
    if (definition.fields) {
      for (const field of definition.fields) {
        if (field.kind === 'event') {
          eventKeys.add(field.key);
        }
      }
    }

    const capabilityHandles =
      definition.componentCapabilityContracts?.map((contract) => contract.handle) ?? [];

    const unreferencedEventKeys = [...eventKeys].filter(
      (key) => !isRendererEventKeyReferenced(key, componentSource),
    );
    const unreferencedCapabilityHandles = capabilityHandles.filter(
      (handle) => !isCapabilityHandleReferenced(handle, capabilitySource),
    );

    if (unreferencedEventKeys.length > 0 || unreferencedCapabilityHandles.length > 0) {
      violations.push({
        rendererType: definition.type,
        unreferencedEventKeys,
        unreferencedCapabilityHandles,
      });
    }
  }

  return violations;
}
