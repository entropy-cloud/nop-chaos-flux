import { mergeConfig } from 'vitest/config';
import { createSharedVitestConfig } from '../../vitest.shared';

export default mergeConfig(createSharedVitestConfig({
  environment: 'jsdom'
}), {
  test: {
    setupFiles: ['./src/test-setup.ts']
  }
});