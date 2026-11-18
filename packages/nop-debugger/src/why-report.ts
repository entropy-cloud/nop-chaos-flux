import type { NopNodeMetaExplanation, NopNodeValueExplanation } from './types-explanations.js';
import type { NopComponentInspectResult } from './types.js';
import type { NopDebugEvent } from './types.js';
import type { ForestSnapshotCollector } from './snapshot-repository.js';
import { findFirstWriteEpoch } from './snapshot-repository.js';

interface EvidenceLink {
  type: 'epoch' | 'cid' | 'expression';
  target: string;
  label: string;
}

interface WhyReportPart {
  category: 'meta' | 'props' | 'notRendered' | 'reaction' | 'data';
  verdict: string;
  confidence: 'high' | 'medium' | 'low';
  limitations?: string[];
}

export interface WhyReport {
  cid: number;
  question: 'why';
  verdict: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: EvidenceLink[];
  parts: WhyReportPart[];
  screenshotTag?: string;
}

export interface WhyReportDeps {
  inspectByCid(cid: number): NopComponentInspectResult | undefined;
  explainMeta(cid: number, field: 'visible' | 'disabled'): NopNodeMetaExplanation | undefined;
  explainValue(cid: number, field: string): NopNodeValueExplanation | undefined;
  getLatestEvent(kind: NopDebugEvent['kind']): NopDebugEvent | undefined;
  collector: Pick<ForestSnapshotCollector, 'getLatest' | 'getRing'> | null;
  listReactions(cidScopeId?: string): Array<{ id: string; scopeId: string; when?: string; watch?: unknown; dependencies?: readonly string[]; disposed: boolean; fireCount: number }>;
  screenshot?(options: { tag: string; fresh: boolean }): Promise<unknown>;
}

function readMetaValue(inspect: NopComponentInspectResult | undefined, field: 'visible' | 'disabled'): { value: unknown; source: string } {
  if (!inspect) return { value: undefined, source: 'unknown' };
  const meta = (inspect as { meta?: Record<string, unknown> }).meta;
  const value = meta?.[field];
  return { value, source: value === undefined ? 'unknown' : 'resolved-meta' };
}

function collectNotRenderedPart(deps: WhyReportDeps, cid: number, inspect: NopComponentInspectResult | undefined): WhyReportPart | null {
  const visible = readMetaValue(inspect, 'visible');
  if (visible.value === false) {
    return { category: 'notRendered', verdict: `visible=false → 节点不渲染（来源 ${visible.source}）`, confidence: 'high' };
  }
  const boundaryError = deps.getLatestEvent('error');
  if (boundaryError && boundaryError.nodeId && (inspect as { nodeId?: string } | undefined)?.nodeId === boundaryError.nodeId) {
    return { category: 'notRendered', verdict: 'error boundary 吞错 → 子树未渲染（见 error 日志）', confidence: 'medium' };
  }
  return null;
}

function collectPropsPart(deps: WhyReportDeps, cid: number, inspect: NopComponentInspectResult | undefined): WhyReportPart | null {
  const field = (inspect as { field?: string; prop?: string } | undefined);
  const expression = field?.prop ?? field?.field;
  if (!expression) return null;
  const explanation = deps.explainValue(cid, expression);
  if (!explanation) return null;
  const answer = (explanation as { answer?: string }).answer;
  if (!answer) return null;
  return { category: 'props', verdict: answer, confidence: (explanation as { confidence?: 'high' | 'medium' | 'low' }).confidence ?? 'medium' };
}

function collectReactionPart(deps: WhyReportDeps, inspect: NopComponentInspectResult | undefined): WhyReportPart | null {
  const scopeId = (inspect as { scopeId?: string } | undefined)?.scopeId;
  const reactions = deps.listReactions(scopeId);
  const relevant = reactions.filter((reaction) => !reaction.disposed);
  if (relevant.length === 0) return null;
  const detail = relevant
    .slice(0, 5)
    .map((reaction) => `${reaction.id}${reaction.when ? `（when: ${reaction.when}）` : ''} fired=${reaction.fireCount}`)
    .join('; ');
  return { category: 'reaction', verdict: `作用域内 ${relevant.length} 个 reaction：${detail}`, confidence: 'medium' };
}

function collectDataPart(deps: WhyReportDeps, cid: number, inspect: NopComponentInspectResult | undefined): WhyReportPart | null {
  const scopeId = (inspect as { scopeId?: string } | undefined)?.scopeId;
  if (!scopeId || !deps.collector) return null;
  const latest = deps.collector.getLatest();
  if (!latest) return null;
  const scopeData = latest.scopes[scopeId];
  const field = (inspect as { field?: string } | undefined)?.field;
  if (!scopeData) {
    return {
      category: 'data',
      verdict: `作用域 ${scopeId} 在快照历史中无记录`,
      confidence: 'low',
      limitations: ['history evicted or never written'],
    };
  }
  const targetPath = field && scopeData[field] !== undefined ? field : Object.keys(scopeData)[0];
  if (!targetPath) return null;
  const firstWrite = findFirstWriteEpoch(deps.collector.getRing(), scopeId, targetPath);
  if (!firstWrite.found) {
    return { category: 'data', verdict: `路径 ${targetPath} 在快照历史中无首写记录`, confidence: 'low', limitations: ['history evicted or never written'] };
  }
  return {
    category: 'data',
    verdict: `路径 ${scopeId}.${targetPath} 首写于 epoch ${firstWrite.epoch}`,
    confidence: 'high',
  };
}

export function buildWhyReport(cid: number, deps: WhyReportDeps): WhyReport {
  const inspect = deps.inspectByCid(cid);
  const parts: WhyReportPart[] = [];
  const evidence: EvidenceLink[] = [];

  if (!inspect) {
    return { cid, question: 'why', verdict: 'unknown', confidence: 'low', evidence: [], parts: [] };
  }

  for (const field of ['visible', 'disabled'] as const) {
    const explanation = deps.explainMeta(cid, field);
    if (!explanation) continue;
    parts.push({
      category: 'meta',
      verdict: `${field}=${JSON.stringify(explanation.data?.field ?? field)}：${explanation.answer}`,
      confidence: explanation.confidence,
      limitations: explanation.limitations,
    });
    evidence.push({ type: 'cid', target: String(cid), label: `inspect ${field} meta` });
    break;
  }

  const propsPart = collectPropsPart(deps, cid, inspect);
  if (propsPart) {
    parts.push(propsPart);
    evidence.push({ type: 'expression', target: String(propsPart.verdict).slice(0, 40), label: 'props 表达式求值' });
  }

  const notRendered = collectNotRenderedPart(deps, cid, inspect);
  if (notRendered) {
    parts.push(notRendered);
    if (notRendered.verdict.includes('error boundary')) {
      evidence.push({ type: 'expression', target: 'onError log', label: 'error boundary 日志' });
    } else {
      evidence.push({ type: 'cid', target: String(cid), label: 'visible meta' });
    }
  }

  const reaction = collectReactionPart(deps, inspect);
  if (reaction) parts.push(reaction);

  const data = collectDataPart(deps, cid, inspect);
  if (data) {
    parts.push(data);
    const epochMatch = data.verdict.match(/epoch (\d+)/);
    if (epochMatch) evidence.push({ type: 'epoch', target: epochMatch[1]!, label: '首写快照' });
  }

  const verdict =
    notRendered?.verdict ??
    parts.find((part) => part.category === 'meta')?.verdict ??
    (parts.length > 0 ? parts[0]!.verdict : '无可归因问题：节点渲染正常且无显式 meta 约束');
  const confidence = notRendered?.confidence ?? parts[0]?.confidence ?? 'medium';

  return {
    cid,
    question: 'why',
    verdict,
    confidence,
    evidence,
    parts,
    screenshotTag: `why:${verdict.slice(0, 32)}`,
  };
}
