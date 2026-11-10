export function RawControlHitFixture({ onClick }: { onClick: () => void }) {
  return (
    <div>
      <button type="button" onClick={onClick}>
        hit
      </button>
      <label htmlFor="demo">demo</label>
      <textarea id="demo" rows={2} />
      <select onChange={() => undefined}>
        <option value="a">a</option>
      </select>
    </div>
  );
}
