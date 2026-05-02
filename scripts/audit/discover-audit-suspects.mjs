import { allAuditSuspectRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'discover-audit-suspects', rules: allAuditSuspectRules }).catch((error) => {
  handleFatalError('discover-audit-suspects', error);
});
