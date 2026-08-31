export function downloadHit(csv: string) {
  const href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  return { href };
}
