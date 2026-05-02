import { asyncFailureRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-async-without-failure-path', rules: asyncFailureRules }).catch((error) => {
  handleFatalError('find-async-without-failure-path', error);
});
