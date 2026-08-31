export function downloadClean(blob: Blob) {
  const url = URL.createObjectURL(blob);
  return { href: url, download: 'x.png' };
}
