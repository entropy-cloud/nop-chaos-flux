// Static fixture for the plan 594 contract-honesty harness home test
// (src/__tests__/test-support-subpath.test.tsx). Intentionally OUTSIDE src/:
// not typechecked by the package tsconfig (which provides only the minimal
// node builtins), invisible to knip's `src/**` project globs, and not a vitest
// collect target. The harness reads this file from disk at test runtime.
import type { RendererDefinition } from '@nop-chaos/flux-core';
import React from 'react';

export function FixtureDummy(props: { events?: { onFake?: () => void } }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => void props.events?.onFake()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          props.events?.onFake();
        }
      }}
    />
  );
}

export const fixtureRendererDefinition: RendererDefinition = {
  type: 'fixture-dummy',
  component: FixtureDummy,
  fields: [{ key: 'onFake', kind: 'event', contract: { displayName: 'Fake' } }],
};
