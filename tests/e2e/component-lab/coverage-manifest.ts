/**
 * Component Lab E2E Coverage Manifest
 *
 * Code-backed coverage manifest for ALL_SHARED_RENDERER_ROUTES.
 * Each entry declares:
 *   - tier: 'read' | 'write' | 'edit'
 *   - primaryScenario: the scenario title to assert against
 *   - notes: optional explanation of what makes it interactive
 *
 * Tiers:
 *   read  – verify initial value or structure is visible (display-only)
 *   write – perform direct interaction (type/select/toggle/add/remove)
 *   edit  – open secondary surface (dialog/drawer), change data, confirm, verify writeback
 */

import { COMPONENT_LAB_COVERAGE_MANIFEST } from './coverage-manifest-entries';

export type AssertionTier = 'read' | 'write' | 'edit';

export interface RendererCoverageEntry {
  id: string;
  title: string;
  tier: AssertionTier;
  primaryScenario: string;
  notes?: string;
}

export { COMPONENT_LAB_COVERAGE_MANIFEST };

/** Quick lookup by renderer id */
export const COVERAGE_BY_ID = new Map<string, RendererCoverageEntry>(
  COMPONENT_LAB_COVERAGE_MANIFEST.map((e) => [e.id, e]),
);

/** All renderer ids covered by this manifest */
export const COVERED_RENDERER_IDS = new Set(COMPONENT_LAB_COVERAGE_MANIFEST.map((e) => e.id));
