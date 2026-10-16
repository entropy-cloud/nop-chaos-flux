/**
 * RM-9 (plan 611) metamodel residue rule family.
 *
 * Declarative heuristic rules encoding the analysis-report problem families
 * (A1~A5, A8, B6~B7, C, §5.2, §5.4). Rules and exemptions are separated:
 * rules live here, adjudicated exemptions live in
 * `scripts/baselines/renderer-metamodel-residue-whitelist.json`
 * (`suppressions[]` for point hits, `registry[]` for range/by-design items).
 *
 * `closureNote` states the family's end state — what "fixed" means for it.
 * Delegated rules (`rm-ref-*`) do not re-run their gate (chain duplication and
 * advisory exit-0 semantics); they record the gate name so the report lists
 * which existing rule surface covers that family.
 */

const SCANNED_PACKAGE = /^(?:packages|apps|tests)\//;
const CODE_FILE = /\.(?:ts|tsx|mts|cts)$/;
const TEST_OR_SUPPORT = /(?:\.test\.|\.spec\.|__tests__|test-support|__raw_schema_fixture__)/;

function isProductionCode(relativePath) {
  return SCANNED_PACKAGE.test(relativePath) && CODE_FILE.test(relativePath) && !TEST_OR_SUPPORT.test(relativePath);
}

function isAnyCode(relativePath) {
  return SCANNED_PACKAGE.test(relativePath) && CODE_FILE.test(relativePath);
}

function notComment(lineText, codeText) {
  const trimmed = (codeText ?? '').trim();
  return trimmed.length > 0 && !trimmed.startsWith('*') && !trimmed.startsWith('//');
}

export const rendererMetamodelResidueRules = [
  {
    id: 'rm-a1-prop-schema-field',
    family: 'A1',
    severity: 'high',
    description: 'A1 dead field: propSchema must not reappear on renderer definitions',
    closureNote: 'Zero `propSchema` declarations (deleted by RM-1, plan 603).',
    include: isAnyCode,
    patterns: [/\bpropSchema\s*[?:]/g],
    filterMatch: ({ lineText, content, line }) =>
      notComment(lineText, require_code(content, line)),
  },
  {
    id: 'rm-a2-prop-contracts-channel',
    family: 'A2',
    severity: 'high',
    description: 'A2 dual-declaration channel: propContracts record must not reappear',
    closureNote: 'Zero `propContracts:` declarations (merged into fields contracts by RM-4, plan 606).',
    include: isAnyCode,
    patterns: [/propContracts\s*:/g],
    filterMatch: ({ lineText, content, line }) =>
      notComment(lineText, require_code(content, line)),
  },
  {
    id: 'rm-a3-event-contracts-channel',
    family: 'A3',
    severity: 'high',
    description: 'A3 dual-declaration channel: eventContracts record must not reappear',
    closureNote: 'Zero `eventContracts:` declarations (merged into fields contracts by RM-5, plan 607).',
    include: isProductionCode,
    patterns: [/eventContracts\s*:/g],
    filterMatch: ({ lineText, content, line }) =>
      notComment(lineText, require_code(content, line)),
  },
  {
    id: 'rm-a4-scope-export-channel',
    family: 'A4',
    severity: 'high',
    description: 'A4 dual-declaration channel: scopeExportContracts record must not reappear',
    closureNote: 'Zero `scopeExportContracts:` declarations (merged into injectedLocals shapes by RM-6, plan 608).',
    include: isAnyCode,
    patterns: [/scopeExportContracts\s*:/g],
    filterMatch: ({ lineText, content, line }) =>
      notComment(lineText, require_code(content, line)),
  },
  {
    id: 'rm-a5-frame-wrap-dual-path',
    family: 'A5',
    severity: 'medium',
    description: 'A5 frame family reads: frameWrap access points (resolver / compiled contract / meta)',
    closureNote:
      'Single authoritative path: resolveFrameWrapMode(definitionWrap, definitionFrameWrap, authored) with resolvedMeta.frameWrap as the value channel (RM-2, plan 604). Registered reads below are the deliberate path members.',
    include: isProductionCode,
    patterns: [/\.frameWrap\b/g],
  },
  {
    id: 'rm-a5-frame-normalizer-copy',
    family: 'A5',
    severity: 'medium',
    description: 'A5 vocabulary normalizer: a second boolean-to-vocabulary normalization implementation',
    closureNote:
      'Exactly one normalization point (resolveFrameWrapMode). A production file combining a `none` comparison with a `label` literal fallback is a copy.',
    include: isProductionCode,
    scanWithContent: ({ rule, relativePath, content }) => {
      // The single normalization point itself, and its consumers (files that
      // import the resolver), are the intended path — not copies.
      if (relativePath.includes('node-renderer-utils')) return [];
      if (/resolveFrameWrapMode/.test(content)) return [];
      if (!/===\s*'none'/.test(content)) return [];
      if (!/\?\s*'label'/.test(content) && !/:\s*'label'/.test(content)) return [];
      const results = [];
      const lines = content.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (/===\s*'none'/.test(lines[index])) {
          results.push(createRuleResult(rule, relativePath, index + 1, lines[index].trim(), lines[index].trim()));
        }
      }
      return results;
    },
  },
  {
    id: 'rm-a8-renderer-type-triad',
    family: 'A8',
    severity: 'medium',
    description: 'A8 convenience duplication: TemplateNode carries the renderer type in three carriers',
    closureNote:
      'The triad is registered with live consumer evidence (rendererType=living; TemplateNode.type=test-only; component.type=consumer-less). Dead-carrier contraction is a public-API change owned by a successor item, not this plan.',
    include: (relativePath) =>
      relativePath === 'packages/flux-core/src/types/node-identity.ts' ||
      relativePath.endsWith('/node-identity.ts'),
    patterns: [/^\s*readonly (?:type|rendererType|component):/gm],
  },
  {
    id: 'rm-b6-compiled-handcopy',
    family: 'B6',
    severity: 'high',
    description: 'B6 hand-copied compiled contract: member re-declaration instead of Pick derivation',
    closureNote:
      'CompiledRendererContract derives from RendererDefinitionShape via Pick + a named ValidationContributor reference (RM-1, plan 603).',
    include: (relativePath) => relativePath.includes('compiled-renderer-contract'),
    scanWithContent: ({ rule, relativePath, content }) => {
      const hasPick = /Pick<\s*RendererDefinitionShape/.test(content);
      const hasLiteralValidation = /validation\?:\s*\{/.test(content);
      const hasLiteralValidationDefaults = /validationDefaults\?:\s*\{/.test(content);
      if (hasPick && !hasLiteralValidation && !hasLiteralValidationDefaults) return [];
      const lines = content.split(/\r?\n/);
      const results = [];
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (/validation\?:\s*\{/.test(line) || /validationDefaults\?:\s*\{/.test(line)) {
          results.push(createRuleResult(rule, relativePath, index + 1, line.trim(), line.trim()));
        }
      }
      return results;
    },
  },
  {
    id: 'rm-b7-component-optional',
    family: 'B7',
    severity: 'medium',
    description: 'B7 loose registry typing: `component?` on the definition surface',
    closureNote:
      'Registration invariant lives in RegisteredRendererDefinition (RM-1, plan 603); the remaining optional slots are the base definition (widened by the registered subtype) and the opaque compiled face.',
    include: (relativePath) => relativePath.includes('flux-core/src'),
    patterns: [/\bcomponent\?:\s/g],
  },
  {
    id: 'rm-s52-template-readonly',
    family: 'S5.2.4',
    severity: 'high',
    description: 'S5.2.4 no write guard: TemplateNode top-level member missing readonly',
    closureNote: 'All 30 TemplateNode top-level members are readonly (RM-7, plan 609).',
    include: (relativePath) => relativePath.endsWith('/node-identity.ts'),
    scanWithContent: ({ rule, relativePath, content }) => {
      const start = content.indexOf('export interface TemplateNode<');
      if (start === -1) return [];
      const end = content.indexOf('\n}', start);
      const block = content.slice(start, end);
      const results = [];
      const lines = block.split('\n');
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (/^  [a-zA-Z_$][\w$]*\??:/.test(line) && !/readonly/.test(line)) {
          results.push(
            createRuleResult(rule, relativePath, lineNumberInFile(content, start, index), line.trim(), line.trim()),
          );
        }
      }
      return results;
    },
  },
  {
    id: 'rm-s521-template-runtime-write',
    family: 'S5.2.1',
    severity: 'high',
    description: 'S5.2.1 immutability residual: runtime write into a template node member',
    closureNote:
      'Zero writes into templateNode members (immutability is carried by member readonly + Cross-Cutting 1; Object.freeze is a performance option, not the end state).',
    include: isAnyCode,
    patterns: [/\btemplateNode\.[a-zA-Z_$][\w$]*\s*=[^=]/g],
  },
  {
    id: 'rm-s523-node-open-container',
    family: 'S5.2.3',
    severity: 'medium',
    description: 'S5.2.3 appendable-content owner: NodeState/NodeInstance grew an open container',
    closureNote:
      'NodeState/NodeInstance/NodeRuntimeState stay fixed-shape (no index signature). Appendable content belongs to scope, not the instance.',
    include: (relativePath) => relativePath.endsWith('/node-identity.ts'),
    scanWithContent: ({ rule, relativePath, content }) => {
      const results = [];
      for (const name of ['NodeState', 'NodeInstance', 'NodeRuntimeState']) {
        const pattern = new RegExp(`export (?:interface|type) ${name}\\b[^{]*\\{`, 'g');
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const start = content.indexOf('{', match.index);
          const end = content.indexOf('\n}', start);
          const block = content.slice(start, end);
          if (/\[key:\s*string\]/.test(block) || /\[key:\s*number\]/.test(block)) {
            results.push(
              createRuleResult(rule, relativePath, content.slice(0, start).split('\n').length, `${name} index signature`, `${name} index signature`),
            );
          }
        }
      }
      return results;
    },
  },
  {
    id: 'rm-ref-contract-honesty',
    family: 'delegated',
    severity: 'info',
    description: 'Delegated gate: contract-honesty (vitest suite in flux-core + per-renderer harnesses)',
    closureNote:
      'Last known state: green (flux-core suite + per-renderer harnesses); not re-executed here (vitest suite, and the chain already runs it).',
    delegatedGate: 'contract-honesty (vitest suites)',
    include: () => false,
    patterns: [],
  },
  {
    id: 'rm-ref-schema-prop-coverage',
    family: 'delegated',
    severity: 'info',
    description: 'Delegated gate: check:schema-prop-coverage',
    closureNote: 'Last known state: green (202/202); not re-executed here (chain duplication).',
    delegatedGate: 'check:schema-prop-coverage',
    include: () => false,
    patterns: [],
  },
  {
    id: 'rm-ref-hardcoded-type-dispatch',
    family: 'delegated',
    severity: 'info',
    description: 'Delegated gate: check:audit-hardcoded-type-dispatch (advisory scanner, exit 0)',
    closureNote:
      'Last known state: advisory scanner (always exit 0), zero unregistered dispatch hits; not re-executed here (standalone advisory command, not part of the pnpm check aggregate).',
    delegatedGate: 'check:audit-hardcoded-type-dispatch',
    include: () => false,
    patterns: [],
  },
  {
    id: 'rm-ref-raw-schema-gate',
    family: 'delegated',
    severity: 'info',
    description: 'Delegated gate: check:audit-runtime-raw-schema-reads (RM-8 enforcement scanner)',
    closureNote:
      'Last known state: green (RM-8 enforcement gate, 12 adjudicated retained reads, exit 0); not re-executed here (chain duplication).',
    delegatedGate: 'check:audit-runtime-raw-schema-reads',
    include: () => false,
    patterns: [],
  },
];

// Local helpers (kept module-private).
import { getCodeTextForLine } from './shared.mjs';

function require_code(content, line) {
  return getCodeTextForLine(content, line);
}

function createRuleResult(rule, relativePath, line, lineText, match) {
  return {
    ruleId: rule.id,
    rule,
    filePath: relativePath,
    line,
    lineText,
    match,
  };
}

function lineNumberInFile(content, blockStart, blockLineIndex) {
  const before = content.slice(0, blockStart).split('\n').length - 1;
  return before + blockLineIndex + 1;
}
