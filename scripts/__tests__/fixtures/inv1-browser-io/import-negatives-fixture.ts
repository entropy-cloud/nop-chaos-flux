type Alias = import('@nop-chaos/flux-core').CompiledRuntimeValue<string>;
type Local = import('./local.js').Thing;

export type NegativeTypeSamples = Alias | Local;

export async function loadLocal() {
  const canvas = await import('html2canvas');
  const zxing = await import('@zxing/library');
  const msg = "await import('https://example.com/x.js')";
  // import('https://example.com/y.js')
  return { canvas, zxing, msg };
}
