/** Page→Node real-input bridge (gateway request relay to CDP Input domain). */
export type RealInputFn = (method: string, params: Record<string, unknown>) => Promise<void>;

export function getRealInput(): RealInputFn | undefined {
  return (globalThis as { __fluxTestRealInput?: RealInputFn }).__fluxTestRealInput;
}
