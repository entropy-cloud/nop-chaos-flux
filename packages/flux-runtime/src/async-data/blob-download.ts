import type { ApiResponse } from '@nop-chaos/flux-core';

/** 40s before revoking the object URL (mirrors file-saver; avoids the 100ms race in some host impls). */
const REVOKE_DELAY_MS = 40_000;

/**
 * Extract a filename from a `content-disposition` header.
 * Supports both the plain `filename="..."` and RFC 5987 `filename*=UTF-8''<pct-encoded>` forms.
 */
export function extractFilenameFromContentDisposition(header: string | undefined | null): string | undefined {
  if (!header || typeof header !== 'string') return undefined;

  // RFC 5987 extended form first (handles UTF-8 / non-ASCII filenames).
  const rfc5987 = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i.exec(header);
  if (rfc5987?.[1]) {
    try {
      return decodeURIComponent(rfc5987[1].trim());
    } catch {
      return rfc5987[1].trim();
    }
  }

  const plain = /filename\*?\s*=\s*"?([^";]+)"?/i.exec(header);
  if (plain?.[1]) {
    return plain[1].trim();
  }

  return undefined;
}

/**
 * Resolve the download filename for a blob response.
 * `api.downloadFileName` takes precedence over the server-provided name (via content-disposition).
 */
export function resolveDownloadFilename(
  api: { downloadFileName?: string },
  contentDisposition: string | undefined | null,
): string | undefined {
  return api.downloadFileName ?? extractFilenameFromContentDisposition(contentDisposition);
}

/**
 * Trigger a browser download for a Blob via an object URL + transient `<a download>` click.
 * The object URL is revoked after {@link REVOKE_DELAY_MS} to avoid leaks while leaving enough
 * time for the download to start (improvement over the 100ms revoke seen in some host impls).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/**
 * Normalize a blob response. If the blob's content-type is JSON, it is treated as an
 * error envelope returned in a binary-typed response (JSON-in-blob): the blob is read
 * as text and JSON.parsed, and the original (error) {@link ApiResponse} is returned.
 *
 * Otherwise the blob is downloaded and a synthetic success response is returned.
 */
export async function normalizeBlobResponse(
  blob: Blob,
  api: { downloadFileName?: string; headers?: Record<string, string>; url?: string },
  responseHeaders?: Headers,
): Promise<ApiResponse<unknown>> {
  const contentType = blob.type || responseHeaders?.get('content-type') || '';

  // JSON-in-blob recovery: the server returned an error envelope despite responseType: blob.
  if (contentType.includes('application/json')) {
    try {
      const text = await blob.text();
      const parsed = JSON.parse(text) as ApiResponse<unknown>;
      // Preserve status/msg from the parsed envelope when present.
      return {
        ok: parsed.status === 0,
        status: parsed.status,
        data: parsed.data,
        code: parsed.code,
        msg: parsed.msg,
        errors: parsed.errors,
      };
    } catch {
      // Fall through to download path if JSON parse fails.
    }
  }

  const contentDisposition = responseHeaders?.get('content-disposition') ?? api.headers?.['content-disposition'];
  const filename = resolveDownloadFilename(api, contentDisposition);

  if (filename) {
    downloadBlob(blob, filename);
  }

  // Synthetic success: the actual file download is delegated to the browser.
  return {
    ok: true,
    status: 0,
    data: { msg: 'downloading' },
  };
}
