// fail-as-expected discriminative spec: run with --expected-fail demo-must-fail
export default async function mustFail(ft: unknown): Promise<void> {
  const heading = await (ft as { locator: (s: string) => { text: () => Promise<string> } }).locator('h1').text();
  if (heading !== 'THIS TEXT NEVER EXISTS') {
    throw new Error('deliberate failure: heading does not match impossible expectation');
  }
}
