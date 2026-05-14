import { stylingAuditRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-styling-suspects', rules: stylingAuditRules }).catch((error) => {
  handleFatalError('find-styling-suspects', error);
});
