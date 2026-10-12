import { describe, expect, it } from 'vitest';
import { PAGE_DATA } from '../page-data';

describe('PAGE_DATA cal-booking key set (WA-cpages-001)', () => {
  it('exposes exactly {calTimezone, cal24h} for cal-booking', () => {
    const keys = Object.keys(PAGE_DATA['cal-booking']).sort();
    expect(keys).toEqual(['cal24h', 'calTimezone']);
  });
});
