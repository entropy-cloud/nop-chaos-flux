import { fieldFrameBypassRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-fieldframe-bypasses', rules: fieldFrameBypassRules }).catch((error) => {
  handleFatalError('find-fieldframe-bypasses', error);
});
