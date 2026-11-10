// Staged at `packages/flux-xlang-debug/src/panel/control-buttons.tsx`
// (registered raw-control-element exemption with count). One real raw button
// sits exactly at the registered count; the commented `<button>` text below
// must not count toward the total (getCodeTextForLine strips comments).

// <button type="button">commented-out instance must never hit</button>
/*
  <button>block-commented instance must never hit</button>
*/

export function ControlButtonsFixture({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      run
    </button>
  );
}
