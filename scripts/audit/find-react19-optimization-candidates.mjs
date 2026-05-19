import { react19OptimizationRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-react19-optimization-candidates', rules: react19OptimizationRules }).catch(
  (error) => {
    handleFatalError('find-react19-optimization-candidates', error);
  },
);
