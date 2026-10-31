/**
 * Business-replication doc mock backend (plan 814; D4 §4.2 doc endpoint
 * table, 逐名对齐). Owns the `/r/ReplDoc__` prefix + the endpoint counter
 * (`__replDocCalls`), wired through createReplicaBranches in showcase-env
 * exactly like the WMS/CRM/AI/MES/mall domains. O1 subset now; O2 (HITL
 * inbox) extends this same branch.
 *
 * O1 endpoints (D4 §4.2 names verbatim):
 * - get `ocrCase?id=` — deterministic invoice case: imageUrl/annotatedUrl
 *   (static `/repl-assets/` SVGs), the contract `fields` array
 *   {name,label,value,originalValue,confidence,valueType} PLUS the same field
 *   objects keyed by name (the detail-field form binding face — extra keys
 *   tolerated), detailRows, targetEntity. Unknown id → placeholder case.
 * - post `ocrValidate` — a field with confidence < 0.7 whose value still
 *   equals originalValue is UNCONFIRMED → REPL_DOC_FIELD_UNCONFIRMED (the
 *   wizard beforeLeave gate); otherwise {valid:true, unconfirmedFields:[]}.
 * - post `ocrCommit` — consume-once `forceOcrCommitError` hook →
 *   REPL_DOC_COMMIT_VALIDATION_FAILED; success {docId, sampleReflowed:true}.
 *
 * Opt-in e2e observation: specs pre-create `window.__replDocCalls` +
 * `window.__replDocTestHooks` via addInitScript; production never sets them.
 */

import {
  createEndpointCounter,
  createUrlParamReader,
  readOptInHooks,
  type ReplicaBranchInput,
  type ReplicaFetcherBranch,
} from './mock-backend-replica-kit';

/* ── Opt-in hooks ───────────────────────────────────────────────────────── */

export interface ReplDocTestHooks {
  /** Consume-once: the NEXT `ocrCommit` fails with REPL_DOC_COMMIT_VALIDATION_FAILED. */
  forceOcrCommitError?: boolean;
  /** Mirror: last `ocrValidate` request body. */
  lastOcrValidateBody?: Record<string, unknown>;
  /** Mirror: last `ocrCommit` request body. */
  lastOcrCommitBody?: Record<string, unknown>;
}

function readReplDocTestHooks(): ReplDocTestHooks | undefined {
  return readOptInHooks<ReplDocTestHooks>('__replDocTestHooks');
}

/* ── Deterministic fixtures ─────────────────────────────────────────────── */

export const OCR_CASE_ID = 'ocr-case-0001';
/** Below this confidence a field must be corrected before leaving step 2. */
export const OCR_LOW_CONFIDENCE = 0.7;

export interface OcrField {
  name: string;
  label: string;
  value: string;
  originalValue: string;
  confidence: number;
  valueType: 'string' | 'date' | 'amount';
}

export function buildOcrFields(): OcrField[] {
  return [
    { name: 'invoiceNo', label: '发票号码', value: '0441-2O26-7781', originalValue: '0441-2O26-7781', confidence: 0.62, valueType: 'string' },
    { name: 'invoiceDate', label: '开票日期', value: '2026-10-18', originalValue: '2026-10-18', confidence: 0.95, valueType: 'date' },
    { name: 'sellerName', label: '销售方名称', value: '星辉数码科技有限公司', originalValue: '星辉数码科技有限公司', confidence: 0.88, valueType: 'string' },
    { name: 'buyerTaxId', label: '购买方税号', value: '91310115MA1K4L2X8Q', originalValue: '91310115MA1K4L2X8Q', confidence: 0.72, valueType: 'string' },
    { name: 'totalAmount', label: '价税合计', value: '11300.00', originalValue: '11300.00', confidence: 0.93, valueType: 'amount' },
    { name: 'taxAmount', label: '税额', value: '1300.00', originalValue: '1300.00', confidence: 0.78, valueType: 'amount' },
  ];
}

export interface OcrDetailRow {
  rowNo: number;
  description: string;
  quantity: number;
  amount: number;
}

export function buildOcrDetailRows(): OcrDetailRow[] {
  return [
    { rowNo: 1, description: '工业平板 T10', quantity: 2, amount: 6000 },
    { rowNo: 2, description: '条码扫描枪 S3', quantity: 5, amount: 3000 },
    { rowNo: 3, description: '充电底座', quantity: 4, amount: 1000 },
  ];
}

export function buildOcrCase(id: string) {
  const fields = buildOcrFields();
  const keyed = Object.fromEntries(fields.map((field) => [field.name, { ...field }]));
  const known = id === '' || id === OCR_CASE_ID;
  return {
    caseId: known ? OCR_CASE_ID : 'ocr-case-placeholder',
    placeholder: !known,
    imageUrl: '/repl-assets/ocr-invoice-original.svg',
    annotatedUrl: '/repl-assets/ocr-invoice-annotated.svg',
    targetEntity: 'PurchaseInvoice',
    fields,
    ...keyed,
    detailRows: buildOcrDetailRows(),
  };
}

/** Field objects arrive keyed by name inside the validate/commit payload. */
function readFieldObjects(raw: unknown): Record<string, Partial<OcrField>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, Partial<OcrField>> = {};
  for (const field of buildOcrFields()) {
    const candidate = (raw as Record<string, unknown>)[field.name];
    if (candidate && typeof candidate === 'object') out[field.name] = candidate as Partial<OcrField>;
  }
  return out;
}

export function findUnconfirmedFields(raw: unknown): string[] {
  const submitted = readFieldObjects(raw);
  return buildOcrFields()
    .filter((field) => field.confidence < OCR_LOW_CONFIDENCE)
    .filter((field) => {
      const value = submitted[field.name]?.value ?? field.value;
      return String(value).trim() === field.originalValue;
    })
    .map((field) => field.name);
}

/* ── The /r/ReplDoc__ fetcher branch ────────────────────────────────────── */

export function createReplDocFetcherBranch(): ReplicaFetcherBranch {
  let commitSeq = 0;

  const countEndpointCall = createEndpointCounter({
    countersKey: '__replDocCalls',
    prefix: 'ReplDoc__',
    hooksKey: '__replDocTestHooks',
  });

  return function handleReplDocBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
    if (!input.url.includes('/r/ReplDoc__')) return null;
    countEndpointCall(input.url);
    const method = input.method.toLowerCase();
    const hooks = readReplDocTestHooks();
    const read = createUrlParamReader(input.url, input.params, input.body);

    if (input.url.includes('/r/ReplDoc__ocrCase') && method === 'get') {
      const id = typeof read('id') === 'string' ? (read('id') as string) : '';
      return { status: 0, data: buildOcrCase(id) as unknown as T };
    }

    if (input.url.includes('/r/ReplDoc__ocrValidate') && method === 'post') {
      if (hooks) hooks.lastOcrValidateBody = JSON.parse(JSON.stringify(input.body ?? {}));
      const unconfirmedFields = findUnconfirmedFields(input.body?.fields);
      if (unconfirmedFields.length > 0) {
        return { status: 1, data: { msg: 'REPL_DOC_FIELD_UNCONFIRMED', unconfirmedFields } as unknown as T };
      }
      return { status: 0, data: { valid: true, unconfirmedFields: [] } as unknown as T };
    }

    if (input.url.includes('/r/ReplDoc__ocrCommit') && method === 'post') {
      if (hooks) hooks.lastOcrCommitBody = JSON.parse(JSON.stringify(input.body ?? {}));
      if (hooks?.forceOcrCommitError) {
        hooks.forceOcrCommitError = undefined;
        return { status: 1, data: { msg: 'REPL_DOC_COMMIT_VALIDATION_FAILED' } as unknown as T };
      }
      commitSeq += 1;
      return {
        status: 0,
        data: { docId: `PINV-2026-${String(commitSeq).padStart(4, '0')}`, sampleReflowed: true } as unknown as T,
      };
    }

    return null;
  };
}

export function createReplDocFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplDoc__', createReplDocFetcherBranch()]];
}
