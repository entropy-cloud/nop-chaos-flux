import { runtimeRawSchemaReadRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-runtime-raw-schema-reads', rules: runtimeRawSchemaReadRules }).catch(
  (error) => {
    handleFatalError('find-runtime-raw-schema-reads', error);
  },
);
