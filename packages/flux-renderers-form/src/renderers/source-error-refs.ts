/**
 * Shared idiom for the choice-family source-error channel (options/dict load
 * failures — a separate channel from the FieldFrame validation chain, with a
 * different payload; the two must not be merged). Derives the paired
 * `${instanceKey}-source-error` id, its aria references and the paired alert
 * span props so the id and its references always stem from one variable.
 *
 * `instanceKey` is per-site: the form-package choice sites derive the
 * cid-qualified `${name}-${cid}` stem (same-name instances in combo rows must
 * not collide); tree-controls keeps the plain `${name}` stem — its historical
 * id strings are host-visible and stay verbatim (plan 589 ruling G1b-a).
 */
interface SourceErrorRefsInput {
  instanceKey: string;
  errorMessage: string | undefined;
}

interface SourceErrorRefs {
  /** `${instanceKey}-source-error`, present only while an error message exists. */
  errorId: string | undefined;
  describedby: string | undefined;
  errormessage: string | undefined;
  /** Spread onto the paired alert span; absent together with the aria refs. */
  spanProps: { id: string; role: 'alert' } | undefined;
}

export function resolveSourceErrorRefs(input: SourceErrorRefsInput): SourceErrorRefs {
  const errorId =
    input.errorMessage && input.instanceKey ? `${input.instanceKey}-source-error` : undefined;
  return {
    errorId,
    describedby: errorId,
    errormessage: errorId,
    spanProps: errorId ? { id: errorId, role: 'alert' } : undefined,
  };
}
