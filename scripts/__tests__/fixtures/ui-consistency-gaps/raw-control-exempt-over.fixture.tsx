// Staged at `packages/flux-xlang-debug/src/panel/control-buttons.tsx`
// (registered raw-control-element exemption with count = live instances).
// Three real raw buttons exceed the registered count → the surplus must be
// reported as new hits, not swallowed by the file-level exemption.

export function ControlButtonsOverFixture({ onRun, onStop, onClear }: { onRun: () => void; onStop: () => void; onClear: () => void }) {
  return (
    <div>
      <button type="button" onClick={onRun}>
        run
      </button>
      <button type="button" onClick={onStop}>
        stop
      </button>
      <button type="button" onClick={onClear}>
        clear
      </button>
    </div>
  );
}
