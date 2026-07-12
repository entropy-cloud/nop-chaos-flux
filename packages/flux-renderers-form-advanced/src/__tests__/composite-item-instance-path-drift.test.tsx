import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { InstanceFrame, ScopeRef } from '@nop-chaos/flux-core';
import { ComboItem } from '../combo-renderer.js';
import { ArrayItem } from '../composite-field/array-field.js';
import { InputTableRow } from '../input-table-renderer.js';

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

// O-01 regression: the three composite-item `React.memo` comparators must treat
// `itemInstancePath` as part of the item's identity. `itemInstancePath` is the
// prefix that descendant field-binding / validation owners inherit (via
// RenderInstancePathContext). When an outer collection re-parents / reorders so
// the *ancestor* instancePath drifts while the leaf item's own value + identity
// stay referentially equal, the memoized item MUST still re-render — otherwise
// its descendant region keeps binding against a stale instancePath.
//
// We exercise the exact defect condition directly: re-render the memoized item
// with every prop referentially identical except `itemInstancePath`, and assert
// the descendant region (`itemRegion.render`) is re-invoked with the new path.

const fakeParentScope = {
  id: 'parent-scope',
  path: 'root',
  parent: undefined,
  store: undefined,
} as unknown as ScopeRef;

const PATH_A: readonly InstanceFrame[] = [{ repeatedTemplateId: 'outer', instanceKey: 'ancestor-A' }];
const PATH_B: readonly InstanceFrame[] = [{ repeatedTemplateId: 'outer', instanceKey: 'ancestor-B' }];

interface SpyRegion {
  key: string;
  templateNode: null;
  render: (options?: { instancePath?: readonly InstanceFrame[] }) => null;
}

function createSpyRegion(recorded: (readonly InstanceFrame[] | undefined)[]): SpyRegion {
  return {
    key: 'item',
    templateNode: null,
    render(options) {
      recorded.push(options?.instancePath);
      return null;
    },
  };
}

type AnyItemComponent = React.MemoExoticComponent<(props: Record<string, unknown>) => React.ReactElement | null>;

interface DirectRenderCase {
  label: string;
  Component: AnyItemComponent;
  // Extra per-renderer props required by the view (itemKind / columnCount).
  extraProps: () => Record<string, unknown>;
}

const CASES: DirectRenderCase[] = [
  { label: 'combo', Component: ComboItem as unknown as AnyItemComponent, extraProps: () => ({}) },
  {
    label: 'array-field',
    Component: ArrayItem as unknown as AnyItemComponent,
    extraProps: () => ({ itemKind: 'object' }),
  },
  {
    label: 'input-table',
    Component: InputTableRow as unknown as AnyItemComponent,
    extraProps: () => ({ columns: [{ label: 'Value' }] }),
  },
];

// input-table renders a <tr>, which must live inside <tbody> to avoid invalid-DOM
// warnings under jsdom. combo / array-field render <div>s and need no wrapper.
function wrapForRender(label: string, element: React.ReactElement): React.ReactElement {
  if (label !== 'input-table') {
    return element;
  }
  return React.createElement('table', null, React.createElement('tbody', null, element));
}

function buildStableBaseProps(extra: Record<string, unknown>, region: SpyRegion) {
  const stableItem = {};
  const onRemove = () => undefined;
  const onMoveUp = () => undefined;
  const onMoveDown = () => undefined;
  return {
    itemIdentity: 'leaf-key',
    index: 0,
    arrayPath: 'lines',
    parentScope: fakeParentScope,
    parentForm: undefined,
    parentValidationOwner: undefined,
    helpers: { render: () => null } as unknown as import('@nop-chaos/flux-core').RendererHelpers,
    readOnly: false,
    removable: true,
    reorderable: true,
    totalCount: 1,
    minItems: 0,
    columns: [],
    onRemove,
    onMoveUp,
    onMoveDown,
    item: stableItem,
    itemRegion: region,
    ...extra,
  };
}

describe('O-01: composite item React.memo re-renders descendant region on instancePath drift', () => {
  for (const testCase of CASES) {
    it(`${testCase.label}: re-render with only itemInstancePath changed re-invokes itemRegion.render with the new path`, () => {
      const recorded: (readonly InstanceFrame[] | undefined)[] = [];
      const region = createSpyRegion(recorded);
      const baseProps = buildStableBaseProps(testCase.extraProps(), region);

      const { rerender } = render(
        wrapForRender(
          testCase.label,
          React.createElement(testCase.Component, { ...baseProps, itemInstancePath: PATH_A }),
        ),
      );

      // Initial mount always renders the descendant region with the initial path.
      expect(recorded).toContain(PATH_A);

      // Re-render with EVERY prop referentially identical except itemInstancePath.
      // The descendant region MUST be re-invoked with the drifted path.
      rerender(
        wrapForRender(
          testCase.label,
          React.createElement(testCase.Component, { ...baseProps, itemInstancePath: PATH_B }),
        ),
      );

      expect(recorded).toContain(PATH_B);
      expect(recorded[recorded.length - 1]).toBe(PATH_B);
    });
  }
});
