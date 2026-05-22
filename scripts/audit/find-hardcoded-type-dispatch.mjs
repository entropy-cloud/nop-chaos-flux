import { hardcodedTypeDispatchRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-hardcoded-type-dispatch', rules: hardcodedTypeDispatchRules }).catch(
  (error) => {
    handleFatalError('find-hardcoded-type-dispatch', error);
  },
);
