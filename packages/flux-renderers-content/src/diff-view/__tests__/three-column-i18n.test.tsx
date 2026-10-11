import { expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { changeLanguage, initFluxI18n } from '@nop-chaos/flux-i18n';

// WA-content-009 (plan 567 closure): the renderPane extraction once hoisted
// t() into the module-scope THREE_COL_PANES constant. That lazily initialized
// the flux-i18n singleton at import-evaluation time and froze the pane
// headers at whichever language happened to be active then — silently
// breaking later initFluxI18n({ lng }) in other packages' test files (the
// flux-react registration stack imports this module everywhere) and making
// the headers unresponsive to changeLanguage at runtime. Headers must be
// translated at render time.
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

it('three-column pane headers follow the active language at render time', async () => {
  const { DiffThreeColumnView } = await import('../components/diff-three-column-view.js');

  const props = { oldContent: 'a\n', middleContent: 'a\n', newContent: 'b\n' };
  const first = render(<DiffThreeColumnView {...props} />);
  expect(first.container.textContent).toContain('Old');

  await changeLanguage('zh-CN');
  const second = render(<DiffThreeColumnView {...props} />);
  expect(second.container.textContent).toContain('旧版');

  await changeLanguage('en-US');
});
