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
 * O2 endpoints (plan 815; D4 §4.2):
 * - get `inboxPage` — 27-row maker-checker inbox ladder sorted by
 *   remainingSeconds ASC (04 contract), page/pageSize (or perPage) +
 *   bizObject/action/riskOnly filters. One row's maker is the current checker
 *   (SoD branch).
 * - get `reviewDetail?id=` — before/after data, changedPaths, fieldDiffs
 *   (field-compare view), diffTree (5 deterministic nodes), rawRequest,
 *   remainingSeconds (0 once forced stale), riskFlag, aiSuggestion +
 *   aiSuggestionItems, hitl + hitlToolCall/hitlToolCallState (ai-tool-call
 *   input projection, K3 shape). Unknown id → placeholder.
 * - post `approve` — stale → REPL_DOC_STALE_DECISION; maker = checker →
 *   REPL_DOC_SOD_VIOLATION; success marks the review decided.
 * - post `reject` — blank opinion → REPL_DOC_OPINION_REQUIRED.
 * - post `batchApprove` — any stale key → REPL_DOC_BATCH_STALE (whole batch).
 * - hook `forceApproveStale(approvalNo)` — branch-published function marking a
 *   review stale for the session (S1 advanceFlashSaleClock shape).
 *
 * Opt-in e2e observation: specs pre-create `window.__replDocCalls` +
 * `window.__replDocTestHooks` via addInitScript; production never sets them.
 */

import {
  asNumber,
  createEndpointCounter,
  createUrlParamReader,
  paginateRows,
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
  /** O2: branch-published — mark a review stale (remainingSeconds → 0). */
  forceApproveStale?: (approvalNo: string) => void;
  /** O2 mirrors: last approve / reject / batchApprove request bodies. */
  lastApproveBody?: Record<string, unknown>;
  lastRejectBody?: Record<string, unknown>;
  lastBatchApproveBody?: Record<string, unknown>;
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

/* ── O2 HITL inbox fixtures (plan 815; D4 §4.2 O2 rows) ────────────────── */

/** The signed-in checker; a row whose maker equals it trips SoD. */
export const INBOX_CHECKER = 'zhang.audit';
const INBOX_TOTAL = 27;
const INBOX_OBJECTS = ['采购订单', '付款申请', '供应商主数据', '费用报销'] as const;
const INBOX_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE_PAYMENT'] as const;
const INBOX_MAKERS = ['li.wei', 'wang.fang', 'zhao.lei', 'chen.jing'] as const;
/** Row 5's maker is the checker (REPL_DOC_SOD_VIOLATION branch). */
export const INBOX_SOD_ROW = 5;

export interface InboxRow {
  approvalNo: string;
  bizObject: string;
  bizKey: string;
  action: string;
  maker: string;
  submittedAt: string;
  remainingSeconds: number;
  changeSummary: string;
  riskFlag: boolean;
}

export function buildInboxRows(): InboxRow[] {
  return Array.from({ length: INBOX_TOTAL }, (_, i) => {
    const n = i + 1;
    const bizObject = INBOX_OBJECTS[i % INBOX_OBJECTS.length];
    return {
      approvalNo: `AP-2026-${String(100 + n)}`,
      bizObject,
      bizKey: `${bizObject === '供应商主数据' ? 'SUP' : 'BIZ'}-${String(5000 + n * 7)}`,
      action: INBOX_ACTIONS[(i + 1) % INBOX_ACTIONS.length],
      maker: n === INBOX_SOD_ROW ? INBOX_CHECKER : INBOX_MAKERS[i % INBOX_MAKERS.length],
      submittedAt: `2026-10-${String(20 + (n % 10)).padStart(2, '0')} ${String(8 + (n % 9)).padStart(2, '0')}:${String((n * 7) % 60).padStart(2, '0')}`,
      // Strictly ascending — the 04 contract sorts the inbox by deadline.
      remainingSeconds: 300 + n * 420,
      changeSummary: `${bizObject}变更：${n % 3 === 0 ? '银行账号 + 信用额度' : n % 3 === 1 ? '金额调整' : '联系人电话'}`,
      riskFlag: n % 4 === 0,
    };
  });
}

function filterInboxRows(rows: InboxRow[], filters: Record<string, unknown>): InboxRow[] {
  let out = rows;
  const bizObject = typeof filters.bizObject === 'string' ? filters.bizObject : '';
  if (bizObject) out = out.filter((r) => r.bizObject === bizObject);
  const action = typeof filters.action === 'string' ? filters.action : '';
  if (action) out = out.filter((r) => r.action === action);
  if (filters.riskOnly === true || filters.riskOnly === 'true') out = out.filter((r) => r.riskFlag);
  return out;
}

export function buildReviewDetail(row: InboxRow | undefined, stale: boolean, decided: string | undefined) {
  const approvalNo = row?.approvalNo ?? 'AP-placeholder';
  const fieldDiffs = [
    { path: 'bankAccount', before: '6222 0210 0011 2233', after: '6222 0210 0099 8877' },
    { path: 'creditLimit', before: '500000', after: '800000' },
    { path: 'contact.phone', before: '021-5566 7788', after: '021-6677 8899' },
  ];
  return {
    approvalNo,
    placeholder: !row,
    maker: row?.maker ?? '-',
    bizObject: row?.bizObject ?? '-',
    beforeData: { bankAccount: fieldDiffs[0].before, creditLimit: 500000, contact: { phone: fieldDiffs[2].before } },
    expectedAfter: { bankAccount: fieldDiffs[0].after, creditLimit: 800000, contact: { phone: fieldDiffs[2].after } },
    changedPaths: fieldDiffs.map((d) => d.path),
    fieldDiffs,
    // 5 nodes: root + bankAccount + creditLimit + contact + contact.phone.
    diffTree: [
      {
        id: 'root',
        label: `变更集 ${approvalNo}`,
        children: [
          { id: 'bankAccount', label: `bankAccount：${fieldDiffs[0].before} → ${fieldDiffs[0].after}` },
          { id: 'creditLimit', label: `creditLimit：${fieldDiffs[1].before} → ${fieldDiffs[1].after}` },
          {
            id: 'contact',
            label: 'contact',
            children: [{ id: 'contact.phone', label: `phone：${fieldDiffs[2].before} → ${fieldDiffs[2].after}` }],
          },
        ],
      },
    ],
    rawRequest: {
      method: 'POST',
      path: `/r/${row?.bizObject ?? 'Unknown'}__update`,
      bizKey: row?.bizKey ?? '-',
      body: { bankAccount: fieldDiffs[0].after, creditLimit: 800000, 'contact.phone': fieldDiffs[2].after },
    },
    remainingSeconds: stale ? 0 : row?.remainingSeconds ?? 0,
    riskFlag: row?.riskFlag ?? false,
    aiSuggestion: {
      verdict: row?.riskFlag ? '建议驳回' : '建议批准',
      confidence: row?.riskFlag ? 0.71 : 0.93,
      risks: row?.riskFlag ? ['收款账户变更至新开户行', '信用额度上调 60%'] : ['变更幅度在常规阈值内'],
    },
    aiSuggestionItems: [
      { id: `ai-${approvalNo}-1`, text: row?.riskFlag ? 'AI 预审：收款账户与额度同时变更，建议补充开户证明后再批' : 'AI 预审：变更幅度在常规阈值内，建议批准', confidence: row?.riskFlag ? 0.71 : 0.93 },
      { id: `ai-${approvalNo}-2`, text: 'AI 预审：已比对历史 12 次同类变更，无异常模式', confidence: 0.88 },
    ],
    hitl: { toolName: 'approve_change', args: { approvalNo }, state: decided ? 'decided' : 'pending' },
    hitlToolCall: {
      index: 0,
      id: `call-${approvalNo.toLowerCase()}`,
      type: 'function',
      function: { name: 'request_approval_decision', arguments: JSON.stringify({ approvalNo }) },
    },
    hitlToolCallState: { status: 'success', approval: decided ?? 'pending' },
  };
}

/* ── The /r/ReplDoc__ fetcher branch ────────────────────────────────────── */

export function createReplDocFetcherBranch(): ReplicaFetcherBranch {
  let commitSeq = 0;
  const staleApprovalNos = new Set<string>();
  const decidedApprovalNos = new Map<string, string>();

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
    if (hooks && !hooks.forceApproveStale) {
      hooks.forceApproveStale = (approvalNo: string) => {
        staleApprovalNos.add(approvalNo);
      };
    }
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

    // ── O2 HITL inbox segment (plan 815; D4 §4.2 O2 endpoints verbatim) ──
    if (input.url.includes('/r/ReplDoc__inboxPage') && method === 'get') {
      const page = asNumber(read('page')) ?? 1;
      const pageSize = asNumber(read('perPage')) ?? asNumber(read('pageSize')) ?? 10;
      const filtered = filterInboxRows(buildInboxRows(), {
        bizObject: read('bizObject'),
        action: read('action'),
        riskOnly: read('riskOnly'),
      });
      const result = paginateRows(filtered, page, pageSize, { sizeKey: 'pageSize', clampPages: true });
      return { status: 0, data: JSON.parse(JSON.stringify(result)) as unknown as T };
    }

    if (input.url.includes('/r/ReplDoc__reviewDetail') && method === 'get') {
      const id = typeof read('id') === 'string' ? (read('id') as string) : '';
      const row = buildInboxRows().find((r) => r.approvalNo === id);
      return {
        status: 0,
        data: buildReviewDetail(row, staleApprovalNos.has(id), decidedApprovalNos.get(id)) as unknown as T,
      };
    }

    if (input.url.includes('/r/ReplDoc__approve') && method === 'post') {
      if (hooks) hooks.lastApproveBody = JSON.parse(JSON.stringify(input.body ?? {}));
      const approvalNo = typeof input.body?.approvalNo === 'string' ? input.body.approvalNo : '';
      const row = buildInboxRows().find((r) => r.approvalNo === approvalNo);
      if (staleApprovalNos.has(approvalNo)) {
        return { status: 1, data: { msg: 'REPL_DOC_STALE_DECISION', approvalNo } as unknown as T };
      }
      if (row?.maker === INBOX_CHECKER) {
        return { status: 1, data: { msg: 'REPL_DOC_SOD_VIOLATION', approvalNo } as unknown as T };
      }
      decidedApprovalNos.set(approvalNo, 'approved');
      return { status: 0, data: { approvalNo, result: 'APPROVED' } as unknown as T };
    }

    if (input.url.includes('/r/ReplDoc__reject') && method === 'post') {
      if (hooks) hooks.lastRejectBody = JSON.parse(JSON.stringify(input.body ?? {}));
      const approvalNo = typeof input.body?.approvalNo === 'string' ? input.body.approvalNo : '';
      const opinion = typeof input.body?.opinion === 'string' ? input.body.opinion.trim() : '';
      if (!opinion) {
        return { status: 1, data: { msg: 'REPL_DOC_OPINION_REQUIRED', approvalNo } as unknown as T };
      }
      decidedApprovalNos.set(approvalNo, 'rejected');
      return { status: 0, data: { approvalNo, result: 'REJECTED' } as unknown as T };
    }

    if (input.url.includes('/r/ReplDoc__batchApprove') && method === 'post') {
      if (hooks) hooks.lastBatchApproveBody = JSON.parse(JSON.stringify(input.body ?? {}));
      const keys = Array.isArray(input.body?.approvalNos) ? (input.body.approvalNos as unknown[]).map(String) : [];
      if (keys.some((key) => staleApprovalNos.has(key))) {
        return { status: 1, data: { msg: 'REPL_DOC_BATCH_STALE' } as unknown as T };
      }
      const rows = buildInboxRows();
      const skipped = keys.filter((key) => rows.find((r) => r.approvalNo === key)?.maker === INBOX_CHECKER);
      for (const key of keys) if (!skipped.includes(key)) decidedApprovalNos.set(key, 'approved');
      return {
        status: 0,
        data: { approved: keys.length - skipped.length, skipped: skipped.length, affectedRows: keys.length } as unknown as T,
      };
    }

    return null;
  };
}

export function createReplDocFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplDoc__', createReplDocFetcherBranch()]];
}
