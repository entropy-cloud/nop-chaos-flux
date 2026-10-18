import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleFatalError, printResults, scanFilesWithRules } from './shared.mjs';
import { rendererMetamodelResidueRules } from './renderer-metamodel-residue-rules.mjs';

// RM-9 (plan 611): metamodel residue adjudication gate.
//
// Dual-segment baseline:
//   - suppressions[]  -> point hits (`ruleId::path:line`), participate in the
//                        diff: unregistered hits fail the gate, vanished
//                        suppressions are reported for shrink-only cleanup.
//   - registry[]      -> adjudicated range/by-design items with no point
//                        location; never produce hits, never participate in
//                        the diff.
//
// Exit semantics: enforcement (unregistered hit => exit 1). Shrink-only:
// `--update-baselines` may only remove suppressions whose hits vanished; it
// refuses to add entries (new exemptions require human confirmation per
// roadmap Cross-Cutting 6).

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const baselineFile = path.join(rootDir, 'scripts', 'baselines', 'renderer-metamodel-residue-whitelist.json');
const label = 'find-renderer-metamodel-residue';

function toKey(result) {
  // Content-anchored suppression keys (FM post-program directive 2026-10-19):
  // constraints on the live tree must not key on line numbers (they rot on
  // every edit above the line). `lineText` is the comment-stripped, trimmed
  // code text of the hit — identical statements share one adjudication, and
  // report output still carries the current line for diagnostics only.
  return `${result.ruleId}::${result.filePath}::${result.lineText}`;
}

async function loadBaseline() {
  const raw = await readFile(baselineFile, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    raw: parsed,
    suppressions: Array.isArray(parsed.suppressions) ? parsed.suppressions : [],
    registry: Array.isArray(parsed.registry) ? parsed.registry : [],
  };
}

function diffSuppressions(hits, suppressions) {
  const suppressionSet = new Set(suppressions);
  const hitSet = new Set(hits);
  return {
    unadjudicated: hits.filter((hit) => !suppressionSet.has(hit)),
    resolved: suppressions.filter((entry) => !hitSet.has(entry)),
  };
}

async function main() {
  const updateBaselines = process.argv.includes('--update-baselines');
  const results = await scanFilesWithRules(rendererMetamodelResidueRules);
  const hits = [...new Set(results.map(toKey))].sort();
  const baseline = await loadBaseline();
  const { unadjudicated, resolved } = diffSuppressions(hits, baseline.suppressions);

  printResults(
    results.filter((result) => unadjudicated.includes(toKey(result))),
    rendererMetamodelResidueRules,
    label,
  );

  if (unadjudicated.length > 0) {
    console.error(
      `[${label}] ${unadjudicated.length} unadjudicated hit(s) — fix the residue or register an adjudicated suppression (human confirmation required).`,
    );
    if (updateBaselines) {
      console.error(
        `[${label}] Refusing to add entries: baseline updates are shrink-only (Cross-Cutting 6).`,
      );
    }
    for (const hit of unadjudicated) {
      console.error(`  - ${hit}`);
    }
    process.exit(1);
  }

  if (resolved.length > 0) {
    if (updateBaselines) {
      const next = {
        ...baseline.raw,
        _header: {
          ...baseline.raw._header,
          lastUpdated: new Date().toISOString().slice(0, 10),
          count: hits.length,
        },
        suppressions: hits,
      };
      await writeFile(baselineFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
      console.log(`[${label}] Baseline shrunk: removed ${resolved.length} vanished suppression(s).`);
    } else {
      console.log(
        `[${label}] ${resolved.length} suppression(s) no longer match any hit (shrink-only cleanup available via --update-baselines):`,
      );
      for (const entry of resolved) {
        console.log(`  - ${entry}`);
      }
    }
  }

  console.log(
    `[${label}] Adjudicated: ${hits.length} suppression point(s) matched, ${baseline.registry.length} registry item(s); zero unadjudicated hits.`,
  );
}

try {
  await main();
} catch (error) {
  handleFatalError(label, error);
}
