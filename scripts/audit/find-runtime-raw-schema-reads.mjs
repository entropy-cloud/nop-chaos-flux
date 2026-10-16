import { runtimeRawSchemaReadRules } from './rules.mjs';
import { handleFatalError, printResults, scanFilesWithRules } from './shared.mjs';

// RM-8 (plan 610): this gate is enforcement (exit 1 on unregistered raw
// reads), unlike the advisory scanners that share runScanner's exit-0
// semantics. It intentionally calls the scan/print primitives instead of
// runScanner (which returns void).
try {
  const results = await scanFilesWithRules(runtimeRawSchemaReadRules);
  printResults(results, runtimeRawSchemaReadRules, 'find-runtime-raw-schema-reads');
  if (results.length > 0) {
    process.exit(1);
  }
} catch (error) {
  handleFatalError('find-runtime-raw-schema-reads', error);
}
