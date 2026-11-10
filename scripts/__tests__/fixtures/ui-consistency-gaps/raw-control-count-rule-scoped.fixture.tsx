// Staged at `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`
// (a registered hardcoded-literal-color exemption WITHOUT count). An
// exemption entry only covers its own rule: the text-white literal below
// stays [exempt] under the color rule, but a raw `<button>` here has no
// raw-control-element entry and must surface as a new hit.

export function ToolCallFixture({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-white">
      retry
    </button>
  );
}
