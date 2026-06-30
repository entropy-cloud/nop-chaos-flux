import { resolve } from 'node:path';
import { mergeConfig } from 'vitest/config';
import { createSharedVitestConfig } from '../../vitest.shared';

const shared = createSharedVitestConfig({ environment: 'happy-dom' });

export default mergeConfig(shared, {
  test: {
    setupFiles: [resolve(__dirname, 'src/test-setup-dom.ts')],
  },
});
