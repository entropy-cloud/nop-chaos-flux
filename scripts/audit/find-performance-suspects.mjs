import { performanceAuditRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-performance-suspects', rules: performanceAuditRules }).catch((error) => {
  handleFatalError('find-performance-suspects', error);
});
