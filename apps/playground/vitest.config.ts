import { createSharedVitestConfig } from '../../vitest.shared';

export default createSharedVitestConfig({
  environment: 'happy-dom',
  // M7: playground tests exercise the full debugger install path — macro on
  define: { __FLUX_DEVTOOLS__: 'true' },
});
