import { describe, expect, it } from 'vitest';
import {
  createInMemoryStationStorage,
  createScreenMeta,
  createStation,
  EMPTY_SCREEN_DOCUMENT,
} from './station-model.js';

describe('createInMemoryStationStorage (design-template-station.md §2.2/§3.3)', () => {
  it('loadStation returns null before any save (UI 引导新建)', async () => {
    const storage = createInMemoryStationStorage();
    expect(await storage.loadStation()).toBeNull();
  });

  it('station meta + screen documents round-trip independently', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveStation({
      id: 'st1',
      name: 'demo station',
      screens: [{ id: 's1', name: 'overview', updatedAt: 10 }],
    });
    await storage.saveScreen('s1', '{"version":1,"symbols":[]}');
    expect((await storage.loadScreen('s1'))?.includes('symbols')).toBe(true);
    expect(await storage.loadScreen('missing')).toBeNull();

    const station = await storage.loadStation();
    expect(station?.name).toBe('demo station');
    // Deep-copy semantics: mutating the projection does not corrupt the store.
    station!.screens.push({ id: 'ghost', name: 'x', updatedAt: 0 });
    expect((await storage.loadStation())!.screens).toHaveLength(1);
  });

  it('deleteScreen removes the document; EMPTY_SCREEN_DOCUMENT is a valid serialized config', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveScreen('s1', 'doc');
    await storage.deleteScreen('s1');
    expect(await storage.loadScreen('s1')).toBeNull();
    expect(JSON.parse(EMPTY_SCREEN_DOCUMENT)).toEqual({ version: 1, variables: [], symbols: [] });
  });
});

describe('station-model auxiliary helpers (plan 522 audit m4)', () => {
  it('createStation/createScreenMeta produce well-formed records', () => {
    const station = createStation('Site A');
    expect(station.name).toBe('Site A');
    expect(station.id).toBeTruthy();
    expect(station.screens).toEqual([]);
    const meta = createScreenMeta('Overview');
    expect(meta.name).toBe('Overview');
    expect(meta.id).toBeTruthy();
  });

  it('storage.clear() wipes station and screen documents', async () => {
    const storage = createInMemoryStationStorage();
    await storage.saveStation({
      id: 'st1',
      name: 'demo station',
      screens: [{ id: 's1', name: 'overview', updatedAt: 10 }],
    });
    await storage.saveScreen('s1', '{"version":1,"symbols":[]}');
    storage.clear();
    expect(await storage.loadStation()).toBeNull();
    expect(await storage.loadScreen('s1')).toBeNull();
  });

  it('EMPTY_SCREEN_DOCUMENT is valid JSON with version/variables/symbols', () => {
    const parsed = JSON.parse(EMPTY_SCREEN_DOCUMENT);
    expect(parsed).toMatchObject({ version: 1, variables: [], symbols: [] });
  });
});
