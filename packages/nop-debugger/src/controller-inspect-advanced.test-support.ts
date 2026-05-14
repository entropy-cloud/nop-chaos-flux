// @vitest-environment happy-dom
import { beforeEach } from 'vitest';
import { createNopDebugger } from './index.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

export { createNopDebugger };
