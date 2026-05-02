import { reactiveRenderReadRules } from './rules.mjs';
import { handleFatalError, runScanner } from './shared.mjs';

runScanner({ label: 'find-reactive-render-reads', rules: reactiveRenderReadRules }).catch((error) => {
  handleFatalError('find-reactive-render-reads', error);
});
