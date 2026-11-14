/**
 * Business-replication CRM mock backend — C2 customer-360 endpoint subset
 * (plan 802; D2 §4.2 crm table C2 rows). Split from `mock-backend-repl-crm.ts`
 * under the 700-line oversized-file gate, same delegate-module pattern as the
 * WMS stock subset (`mock-backend-repl-wms-stock.ts`): the `/r/ReplCrm__`
 * fetcher branch itself stays in the main module (single endpoint-counter call
 * site per request), and the branch hands unmatched C2 urls over to the
 * handler that `createReplCrmC2Surface` returns.
 *
 * Endpoints (D2 §4.2 crm table C2 rows):
 * - get  `partnerFindPage`  — {items, total} over the partner seed.
 * - get  `partnerGet`       — {partner(+website/remark), addresses, contacts};
 *                             unknown id → status:1 `partner not found`.
 * - get  `leadByPartner`    — {items, total} related-lead projection; unknown
 *                             partnerId → empty set face (not an error envelope).
 * - get  `activityTimeline` — {items, total} projected onto the live
 *                             TimelineItemSchema shape (value/time/title/
 *                             detail/level — `level` drives the marker color),
 *                             ASC by activityDate (the page schema renders
 *                             newest-first via timeline `reverse: true`, so a
 *                             successful `activityCreate` appends and shows at
 *                             the TOP of the rendered timeline — D2 §5 ③ 置顶).
 * - get  `activityCalendar` — {events} projected onto the live CalendarEvent
 *                             shape (`id`/`title`/`start`/`end` — no `date`
 *                             field), dates clamped into the current month so
 *                             the default month view always renders them; one
 *                             event spans two days (跨日).
 * - post `activityCreate`   — missing/blank `content` → status:1
 *                             `content required` (D2 §4.2 error branch);
 *                             success appends `{id, activityDate}` to the
 *                             session activity list.
 *
 * Import-clean of the main module (deps-baseline no-cycle, wms-stock
 * precedent): the shared C1 seed pools (customer/owner name pools, row count,
 * stage-name sequence, revenue ladder) arrive via `createReplCrmC2Surface`,
 * and the session state travels in through the structural `session` subset of
 * `ReplCrmC2BranchInput` — mutations hit the live session object.
 */

/* ── C2 entities (D2 §4.2 实体字段, projected to live shapes at fetch time) ── */

export type ReplCrmActivityType = 'VISIT' | 'CALL' | 'NOTE' | 'DEMO';

export interface ReplCrmPartner {
  id: string;
  code: string;
  name: string;
  level: string;
  ownerName: string;
  industry: string;
  address: string;
}

export interface ReplCrmContact {
  id: string;
  partnerId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface ReplCrmAddress {
  id: string;
  partnerId: string;
  type: string;
  line1: string;
  city: string;
  postcode: string;
}

export interface ReplCrmRelatedLead {
  leadId: string;
  name: string;
  stageName: string;
  amount: number;
  closeDate: string;
}

export interface ReplCrmActivity {
  id: string;
  partnerId: string;
  activityDate: string;
  type: ReplCrmActivityType;
  title: string;
  content: string;
}

/* ── Delegate input (structural subsets, wms-stock pattern) ─────────────── */

/** C2 hook surface: the drawer mirror write is the only hook the delegate
 * touches (the full `ReplCrmTestHooks` stays in the main module). */
export interface ReplCrmC2Hooks {
  /** C2 drawer mirror: last `activityCreate` request body (field-by-field:
   * partnerId ↔ picker-selected partner, type/title/content ↔ drawer form). */
  lastActivityCreateBody?: Record<string, unknown>;
}

export interface ReplCrmC2BranchInput {
  url: string;
  method: string;
  read: (key: string) => string | undefined;
  body: Record<string, unknown>;
  /** Structural subset of the crm session state — keeps this delegate module
   * import-clean of `mock-backend-repl-crm.ts` (deps-baseline cycle,
   * wms-stock precedent). */
  session: {
    partners: ReplCrmPartner[];
    contacts: ReplCrmContact[];
    addresses: ReplCrmAddress[];
    activities: ReplCrmActivity[];
    activitySeq: number;
  };
  hooks: ReplCrmC2Hooks | undefined;
}

/* ── Seed inputs shared with the C1 fixture pool (passed in, not imported) ── */

export interface ReplCrmC2SurfaceInput {
  /** Partner name pool (same CUSTOMERS pool the C1 lead fixtures use). */
  customers: readonly string[];
  /** Owner name pool (same OWNERS pool as C1). */
  owners: readonly string[];
  /** Partner row count (same 26-row seed as the C1 lead pool). */
  rowCount: number;
  /** Stage-name sequence from the C1 stage list (related-lead `stageName`). */
  stageNames: readonly string[];
  /** C1 revenue ladder (`replCrmRevenue`), reused for related-lead amounts. */
  revenueFor: (i: number) => number;
}

/* ── Deterministic fixtures ─────────────────────────────────────────────── */

const C2_INDUSTRIES = ['制造', '能源', '矿业', '航运', '农业', '云服务', '建筑', '零售', '重工', '教育'];
const C2_LEVELS = ['战略客户', '重点客户', '普通客户'];
const C2_ACTIVITY_TYPES: ReplCrmActivityType[] = ['VISIT', 'CALL', 'DEMO', 'NOTE'];
const C2_ACTIVITY_TITLE_BY_TYPE: Record<ReplCrmActivityType, string> = {
  VISIT: '上门拜访',
  CALL: '电话跟进',
  DEMO: '方案演示',
  NOTE: '跟进纪要',
};
/**
 * Seeded activity slots per partner, ASC by date: 4 backlog weeks
 * (35/28/21/14 days ago) + the recent 4 (9/6/3/1). Exactly ONE CALL per
 * partner — the C2 filter test collapses the timeline to that single row.
 * Titles are per-slot and self-descriptive (no `·P0001` customer-code suffix:
 * the timeline is always rendered inside the selected customer's 360 view, so
 * repeating the code per row is redundant noise).
 */
const C2_ACTIVITY_SLOTS: Array<{
  type: ReplCrmActivityType;
  daysAgo: number;
  time: string;
  title: string;
}> = [
  { type: 'VISIT', daysAgo: 35, time: '10:00', title: '年度框架合作首轮拜访' },
  { type: 'DEMO', daysAgo: 28, time: '14:30', title: '数据对接方案演示评审' },
  { type: 'NOTE', daysAgo: 21, time: '09:15', title: '阶段推进跟进纪要' },
  { type: 'VISIT', daysAgo: 14, time: '16:40', title: '新产线现场勘察拜访' },
  { type: 'DEMO', daysAgo: 9, time: '10:00', title: '集成方案二轮演示' },
  { type: 'CALL', daysAgo: 6, time: '14:30', title: '季度采购计划确认电话会' },
  { type: 'NOTE', daysAgo: 3, time: '09:15', title: '商务条款跟进纪要' },
  { type: 'NOTE', daysAgo: 1, time: '16:40', title: '合作意向确认纪要' },
];
const C2_ACTIVITY_LEVEL_BY_TYPE: Record<ReplCrmActivityType, string> = {
  VISIT: 'success',
  CALL: 'info',
  DEMO: 'warning',
  NOTE: 'default',
};
const C2_CALENDAR_TITLES = ['客户现场回访', '方案评审会', '续约谈判（跨日）', '高管拜访'];

function pad4(value: number): string {
  return String(value).padStart(4, '0');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function createPartnerRows(input: ReplCrmC2SurfaceInput): ReplCrmPartner[] {
  const rows: ReplCrmPartner[] = [];
  for (let i = 1; i <= input.rowCount; i += 1) {
    rows.push({
      id: `partner-${pad4(i)}`,
      code: `P${pad4(i)}`,
      name: `${input.customers[(i - 1) % input.customers.length]}·P${pad4(i)}`,
      level: C2_LEVELS[(i - 1) % C2_LEVELS.length],
      ownerName: input.owners[(i - 1) % input.owners.length],
      industry: C2_INDUSTRIES[(i - 1) % C2_INDUSTRIES.length],
      address: `市辖区高新大道 ${i * 8} 号`,
    });
  }
  return rows;
}

function createContactRows(partners: ReplCrmPartner[]): ReplCrmContact[] {
  const rows: ReplCrmContact[] = [];
  const roles = ['采购经理', '技术对接人', '财务对接人'];
  const names = ['陈建国', '林晓芸', '黄志强'];
  for (const partner of partners) {
    const partnerIndex = Number(partner.id.slice('partner-'.length));
    for (let k = 0; k < roles.length; k += 1) {
      rows.push({
        id: `contact-${partner.id.slice('partner-'.length)}-${k + 1}`,
        partnerId: partner.id,
        name: names[k],
        role: roles[k],
        phone: `138${pad4(partnerIndex * 7 + k)}${pad2(k * 3 + 1)}`,
        email: `contact${partnerIndex}${k + 1}@partner${pad4(partnerIndex)}.example.com`,
      });
    }
  }
  return rows;
}

function createAddressRows(partners: ReplCrmPartner[]): ReplCrmAddress[] {
  const rows: ReplCrmAddress[] = [];
  for (const partner of partners) {
    const partnerIndex = Number(partner.id.slice('partner-'.length));
    rows.push(
      {
        id: `addr-${partnerIndex}-1`,
        partnerId: partner.id,
        type: '账单地址',
        line1: `高新区结算大厦 ${partnerIndex} 层`,
        city: '市辖区',
        postcode: `20${pad4(partnerIndex * 13)}`,
      },
      {
        id: `addr-${partnerIndex}-2`,
        partnerId: partner.id,
        type: '发货地址',
        line1: `临港产业园 ${partnerIndex + 3} 号库`,
        city: '港口区',
        postcode: `30${pad4(partnerIndex * 17)}`,
      },
    );
  }
  return rows;
}

/**
 * Related-lead projection per partner (D2 §4.2 `关联 Lead{leadId, name,
 * stageName, amount, closeDate}`): partner-0001 carries 3 rows, all other
 * partners 2 — so the assertion-① partner switch changes BOTH the row count
 * and the first-row value.
 */
function relatedLeadsFor(partner: ReplCrmPartner, input: ReplCrmC2SurfaceInput): ReplCrmRelatedLead[] {
  const partnerIndex = Number(partner.id.slice('partner-'.length));
  const rowCount = partnerIndex === 1 ? 3 : 2;
  const rowNames = ['扩容采购', '续约谈判', '试点引入'];
  const rows: ReplCrmRelatedLead[] = [];
  for (let k = 0; k < rowCount; k += 1) {
    rows.push({
      leadId: `plead-${pad4(partnerIndex)}-${k + 1}`,
      name: `${partner.name}·${rowNames[k]}`,
      stageName: input.stageNames[(partnerIndex + k) % input.stageNames.length],
      amount: input.revenueFor(partnerIndex * 2 + k),
      closeDate: `2026-${pad2(((partnerIndex + k * 2) % 12) + 1)}-1${pad2(k + 5)}`,
    });
  }
  return rows;
}

function createActivityRows(partners: ReplCrmPartner[]): ReplCrmActivity[] {
  const rows: ReplCrmActivity[] = [];
  const now = new Date();
  for (const partner of partners) {
    const partnerIndex = Number(partner.id.slice('partner-'.length));
    for (let k = 0; k < C2_ACTIVITY_SLOTS.length; k += 1) {
      const slot = C2_ACTIVITY_SLOTS[k];
      const when = new Date(now);
      when.setDate(when.getDate() - slot.daysAgo);
      const activityDate = `${when.getFullYear()}-${pad2(when.getMonth() + 1)}-${pad2(when.getDate())} ${slot.time}`;
      rows.push({
        id: `act-${pad4(partnerIndex)}-${k + 1}`,
        partnerId: partner.id,
        activityDate,
        type: slot.type,
        title: slot.title,
        content: `${partner.name}：${slot.title}（${partner.ownerName} 负责）`,
      });
    }
  }
  return rows.sort((a, b) => a.activityDate.localeCompare(b.activityDate));
}

/* ── C2 projections (live shape contracts, plan 802 pre-declared) ───────── */

function findPartner(session: ReplCrmC2BranchInput['session'], partnerId: string | undefined): ReplCrmPartner | undefined {
  if (!partnerId) return undefined;
  return session.partners.find((partner) => partner.id === partnerId);
}

/** Date `offsetDays` from today, clamped into the current LOCAL calendar month
 * so every seeded calendar event renders inside the default month view
 * regardless of the run date. LOCAL components feed UTC-midnight dates: the
 * scheduling calendar renders the LOCAL calendar day/month since plan 836 (the
 * previous UTC-month clamp — plan 819, aligned to the old "today = raw now"
 * model — left the grid empty for UTC+N viewers in the first hours of a
 * month). */
function currentMonthDate(offsetDays: number): Date {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays));
  if (target < monthStart) return monthStart;
  if (target > monthEnd) return monthEnd;
  return target;
}

/**
 * Cross-day anchor pair that stays inside the current month AND spans two
 * DISTINCT days on every run date: day one clamps `today - 1` into the month
 * (today = the 1st → monthStart), day two is the next calendar day capped at
 * monthEnd (only reachable when day one is monthEnd itself, which the clamp
 * above already prevents).
 */
function crossDayRange(): [Date, Date] {
  const start = currentMonthDate(-1);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return [start, end];
}

function isoDateTime(date: Date, time: string): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}T${time}:00`;
}

/**
 * Timeline projection (live TimelineItemSchema: value/time/title/detail/level;
 * `level` drives the marker color). Rows stay ASC by activityDate — the page
 * schema renders newest-first via `reverse: true`.
 */
function activityTimelineItems(
  session: ReplCrmC2BranchInput['session'],
  partnerId: string,
  typeFilter: string | undefined,
): Array<Record<string, unknown>> {
  return session.activities
    .filter((activity) => activity.partnerId === partnerId)
    .filter((activity) => !typeFilter || activity.type === typeFilter)
    .map((activity) => ({
      value: activity.id,
      time: activity.activityDate,
      title: activity.title,
      detail: activity.content,
      level: C2_ACTIVITY_LEVEL_BY_TYPE[activity.type],
      type: activity.type,
    }));
}

/** Calendar projection (live CalendarEvent: id/title/start/end required). */
function activityCalendarEvents(
  session: ReplCrmC2BranchInput['session'],
  partnerId: string,
): Array<Record<string, unknown>> {
  const partner = findPartner(session, partnerId);
  const label = partner?.code ?? partnerId;
  const [crossStart, crossEnd] = crossDayRange();
  const singleDay = (offset: number, time: string) => {
    const day = currentMonthDate(offset);
    return isoDateTime(day, time);
  };
  return [
    {
      id: `evt-${partnerId}-1`,
      title: C2_CALENDAR_TITLES[0],
      start: singleDay(-2, '09:30'),
      end: singleDay(-2, '11:00'),
      type: 'appointment',
      partnerId,
      label,
    },
    {
      id: `evt-${partnerId}-2`,
      title: C2_CALENDAR_TITLES[1],
      start: singleDay(0, '14:00'),
      end: singleDay(0, '15:30'),
      type: 'appointment',
      partnerId,
      label,
    },
    {
      // 跨日 event: two distinct in-month days on every run date.
      id: `evt-${partnerId}-3`,
      title: C2_CALENDAR_TITLES[2],
      start: isoDateTime(crossStart, '09:00'),
      end: isoDateTime(crossEnd, '18:00'),
      type: 'appointment',
      partnerId,
      label,
    },
    {
      id: `evt-${partnerId}-4`,
      title: C2_CALENDAR_TITLES[3],
      start: singleDay(3, '10:00'),
      end: singleDay(3, '12:00'),
      type: 'appointment',
      partnerId,
      label,
    },
  ];
}

/* ── Module export ──────────────────────────────────────────────────────── */

/** C2 half of the session seed, assembled by the main module's
 * `createReplCrmSession`. */
export interface ReplCrmC2SeedData {
  partners: ReplCrmPartner[];
  contacts: ReplCrmContact[];
  addresses: ReplCrmAddress[];
  activities: ReplCrmActivity[];
}

export interface ReplCrmC2Surface {
  createSeedData(): ReplCrmC2SeedData;
  /** C2 endpoint delegate. Returns null for non-C2 urls so the main branch
   * continues (the endpoint counter stays in the main branch — one count per
   * request, regardless of which module answers it). */
  handleBranch<T>(branch: ReplCrmC2BranchInput): { status: number; data: T } | null;
}

export function createReplCrmC2Surface(input: ReplCrmC2SurfaceInput): ReplCrmC2Surface {
  return {
    createSeedData() {
      const partners = createPartnerRows(input);
      return {
        partners,
        contacts: createContactRows(partners),
        addresses: createAddressRows(partners),
        activities: createActivityRows(partners),
      };
    },

    handleBranch<T>(branch: ReplCrmC2BranchInput): { status: number; data: T } | null {
      const { url, method, read, body, session, hooks } = branch;

      // ----- C2 reads (plan 802) -----
      if (url.includes('/r/ReplCrm__partnerFindPage') && method === 'get') {
        const items = session.partners;
        return { status: 0, data: { items, total: items.length } as unknown as T };
      }

      if (url.includes('/r/ReplCrm__partnerGet') && method === 'get') {
        const partner = findPartner(session, read('id'));
        // Error branch (D2 §4.2): unknown id → `partner not found`.
        if (!partner) {
          return { status: 1, data: { msg: 'partner not found' } as unknown as T };
        }
        const addresses = session.addresses.filter((address) => address.partnerId === partner.id);
        const contacts = session.contacts.filter((contact) => contact.partnerId === partner.id);
        return {
          status: 0,
          data: {
            partner: { ...partner, website: `https://www.partner${partner.code.toLowerCase()}.example.com`, remark: `${partner.industry}行业 · ${partner.level}` },
            addresses,
            contacts,
          } as unknown as T,
        };
      }

      if (url.includes('/r/ReplCrm__leadByPartner') && method === 'get') {
        const partner = findPartner(session, read('partnerId'));
        if (!partner) {
          return { status: 0, data: { items: [], total: 0 } as unknown as T };
        }
        const items = relatedLeadsFor(partner, input);
        return { status: 0, data: { items, total: items.length } as unknown as T };
      }

      if (url.includes('/r/ReplCrm__activityTimeline') && method === 'get') {
        // Wire param is `activityType` (not `type`): an `args.params` object with
        // a string `type` key trips the compiler's isSchema heuristic and gets
        // literal-preserved with raw templates (plan 802 live finding).
        const items = activityTimelineItems(session, read('partnerId') ?? '', read('activityType'));
        return { status: 0, data: { items, total: items.length } as unknown as T };
      }

      if (url.includes('/r/ReplCrm__activityCalendar') && method === 'get') {
        const events = activityCalendarEvents(session, read('partnerId') ?? '');
        return { status: 0, data: { events } as unknown as T };
      }

      // ----- C2 writes -----
      if (url.includes('/r/ReplCrm__activityCreate') && method === 'post') {
        if (hooks) hooks.lastActivityCreateBody = { ...body };
        const partnerId = String(body.partnerId ?? '');
        const partner = findPartner(session, partnerId);
        if (!partner) {
          return { status: 1, data: { msg: 'partner not found' } as unknown as T };
        }
        // Error branch (D2 §4.2): missing/blank content → `content required`.
        const content = String(body.content ?? '').trim();
        if (!content) {
          return { status: 1, data: { msg: 'content required' } as unknown as T };
        }
        // Wire body field is `activityType` (not `type`) — same isSchema
        // heuristic rationale as the timeline params comment above.
        const activityType = body.activityType ?? body.type;
        const type = C2_ACTIVITY_TYPES.includes(activityType as ReplCrmActivityType)
          ? (activityType as ReplCrmActivityType)
          : 'NOTE';
        const title = String(body.title ?? '').trim() || C2_ACTIVITY_TITLE_BY_TYPE[type];
        session.activitySeq += 1;
        const now = new Date();
        const activityDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
        const id = `act-${partner.id.slice('partner-'.length)}-new-${session.activitySeq}`;
        // Append to the ASC log: with the page schema's timeline `reverse: true`
        // the new entry renders at the TOP of the timeline (D2 §5 ③ 置顶).
        session.activities.push({ id, partnerId: partner.id, activityDate, type, title, content });
        return { status: 0, data: { id, activityDate } as unknown as T };
      }

      return null;
    },
  };
}
