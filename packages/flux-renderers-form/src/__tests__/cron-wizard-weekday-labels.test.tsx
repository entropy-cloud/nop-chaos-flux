import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CronEditorWizard } from '../renderers/cron-editor-wizard.js';

// WA-form-002: the weekly wizard's weekday multi-select rendered cron segment
// names (秒/分/时/日/月/周/年) as option labels — DOW_LABEL_KEYS copied the
// CRON_SEGMENTS-derived key list and the weekday i18n keys never existed, so
// users could not tell which weekday they were selecting.

afterEach(() => cleanup());

describe('WA-form-002 — cron weekly wizard weekday labels', () => {
  it('renders the seven weekday names (not cron segment names) in the dows select', () => {
    render(<CronEditorWizard tier="weekly" fields={{}} disabled={false} onFieldsChange={vi.fn()} />);

    const dowsSelect = document.querySelector('[data-testid="cron-editor-wizard-dows"]')!;
    const labels = Array.from(dowsSelect.querySelectorAll('option')).map((o) => o.textContent);

    expect(labels).toEqual(['周日', '周一', '周二', '周三', '周四', '周五', '周六']);
    expect(screen.queryByRole('option', { name: '秒' })).toBeNull();
  });
});
