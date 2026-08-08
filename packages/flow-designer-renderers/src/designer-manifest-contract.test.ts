import { describe, expect, it } from 'vitest';

describe('flow-designer manifest contract (H7 regression, D3.1 fd-7)', () => {
  it('resolveDesignerManifest resolves 1.0, 1 and latest to the v1 manifest', async () => {
    const { resolveDesignerManifest, FLOW_DESIGNER_MANIFEST_V1 } = await import(
      './designer-manifest.js'
    );
    expect(resolveDesignerManifest('1.0')).toBe(FLOW_DESIGNER_MANIFEST_V1);
    expect(resolveDesignerManifest('1')).toBe(FLOW_DESIGNER_MANIFEST_V1);
    expect(resolveDesignerManifest('latest')).toBe(FLOW_DESIGNER_MANIFEST_V1);
    expect(resolveDesignerManifest('2.0')).toBeUndefined();
    expect(resolveDesignerManifest('')).toBeUndefined();
  });

  it('designerHostContract binds the designer family to the resolved manifest', async () => {
    const { designerHostContract, FLOW_DESIGNER_MANIFEST_V1, resolveDesignerManifest } =
      await import('./designer-manifest.js');
    expect(designerHostContract.family).toBe('designer');
    expect(designerHostContract.defaultVersion).toBe('1.0');
    expect(designerHostContract.resolveManifest('1.0')).toBe(FLOW_DESIGNER_MANIFEST_V1);
    expect(designerHostContract.resolveManifest('latest')).toBe(resolveDesignerManifest('latest'));
    expect(designerHostContract.resolveManifest('9.9')).toBeUndefined();
    expect(designerHostContract.capabilityPublication).toEqual({
      mode: 'region-scoped',
      capableRegions: ['toolbar', 'inspector', 'dialogs'],
      transitiveInheritance: true,
    });
  });

  it('DESIGNER_CAPABILITY_PUBLICATION declares designer-capable regions without handle registration', async () => {
    const { DESIGNER_CAPABILITY_PUBLICATION } = await import('./designer-manifest.js');
    expect(DESIGNER_CAPABILITY_PUBLICATION.mode).toBe('region-scoped');
    expect(DESIGNER_CAPABILITY_PUBLICATION.capableRegions).toEqual([
      'toolbar',
      'inspector',
      'dialogs',
    ]);
    expect(DESIGNER_CAPABILITY_PUBLICATION.transitiveInheritance).toBe(true);
  });
});
