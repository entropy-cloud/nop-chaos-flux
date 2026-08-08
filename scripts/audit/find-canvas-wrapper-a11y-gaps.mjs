import { canvasWrapperA11yRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-canvas-wrapper-a11y-gaps', rules: canvasWrapperA11yRules }).catch(
  (error) => {
    handleFatalError('find-canvas-wrapper-a11y-gaps', error);
  },
);
