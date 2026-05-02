import { rendererMarkerRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-missing-renderer-markers', rules: rendererMarkerRules }).catch((error) => {
  handleFatalError('find-missing-renderer-markers', error);
});
