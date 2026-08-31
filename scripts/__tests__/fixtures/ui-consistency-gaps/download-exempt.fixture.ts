export function downloadExempt(csv: string) {
  const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  return dataUrl;
}
