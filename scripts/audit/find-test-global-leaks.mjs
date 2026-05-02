import { testLeakRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-test-global-leaks', rules: testLeakRules }).catch((error) => {
  handleFatalError('find-test-global-leaks', error);
});
