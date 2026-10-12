import { describe, expect, it } from 'vitest';
import { LINEAR_TITLES, createLinearIssues } from '../shared/mock-backend-linear-issues';
import { buildLinearIssueDetail } from '../shared/mock-backend-linear-detail';

describe('linear titles single source (WA-cpages-004)', () => {
  it('detail relation titles resolve from the same source as issue row titles', () => {
    expect(LINEAR_TITLES).toHaveLength(34);
    const rows = createLinearIssues();
    for (let seq = 101; seq <= 134; seq += 1) {
      const detail = buildLinearIssueDetail(rows, `ENG-${seq}`);
      expect(detail.relations[0].targetTitle).toBe(LINEAR_TITLES[(seq + 9) % 34]);
      expect(detail.relations[1].targetTitle).toBe(LINEAR_TITLES[(seq + 17) % 34]);
    }
  });
});
