import { buildWhyReport, type WhyReport } from './why-report.js';
import type { NopDebugEventKind } from './types.js';
import type { DependencyGraph } from './dependency-graph.js';
import type { ForestSnapshotCollector } from './snapshot-repository.js';

interface RuntimeLike {
  getReactionDebugSnapshot?(): {
    reactions: Array<{
      id: string;
      scopeId: string;
      when?: string;
      watch?: unknown;
      dependencies?: readonly string[];
      disposed: boolean;
      fireCount: number;
    }>;
  };
}

interface WhyBridgeDeps {
  getRuntime(): RuntimeLike | undefined;
  store: { getSnapshot(): { events: Array<{ kind: string; nodeId?: string; summary: string }> }; append(event: never): void };
  inspectByCid(cid: number): unknown;
  explainMeta(cid: number, field: 'visible' | 'disabled'): { data?: { dependencyPaths?: string[] } } & Record<string, unknown>;
  explainValue(cid: number, expression: string): unknown;
  getSnapshotCollector(): ForestSnapshotCollector | null;
  dependencyGraph: DependencyGraph;
  captureEvidence(options: { tag: string; fresh: boolean }): Promise<unknown>;
}

interface WhyResult {
  cid: number;
  verdict: string;
  confidence: string;
  parts: Array<{ category: string; verdict: string; confidence: string; limitations?: string[] }>;
  evidence: Array<{ type: string; target: string; label: string }>;
  screenshotTag?: string;
}

export function createWhyBridge(deps: WhyBridgeDeps) {
  return {
    async why(cid: number): Promise<WhyResult> {
      const report: WhyReport = buildWhyReport(cid, {
        inspectByCid: (target) => deps.inspectByCid(target) as never,
        explainMeta: (target, field) => {
          const explanation = deps.explainMeta(target, field);
          const paths = explanation.data?.dependencyPaths ?? [];
          for (const path of paths) {
            deps.dependencyGraph.recordReadEdge(String(target), [path]);
          }
          return explanation as never;
        },
        explainValue: (target: number, expression: string) => deps.explainValue(target, expression) as never,
        getLatestEvent: (kind: NopDebugEventKind) => deps.store.getSnapshot().events.find((event) => event.kind === kind) as never,
        collector: deps.getSnapshotCollector(),
        listReactions: (scopeId) => {
          const snapshot = deps.getRuntime()?.getReactionDebugSnapshot?.();
          return (snapshot?.reactions ?? [])
            .filter((reaction) => scopeId === undefined || reaction.scopeId === scopeId)
            .map((reaction) => ({
              id: reaction.id,
              scopeId: reaction.scopeId,
              when: reaction.when,
              watch: reaction.watch,
              dependencies: reaction.dependencies,
              disposed: reaction.disposed,
              fireCount: reaction.fireCount,
            }));
        },
        screenshot: (options) => deps.captureEvidence(options),
      });
      if (report.screenshotTag) {
        deps
          .captureEvidence({ tag: report.screenshotTag, fresh: true })
          .catch((error: unknown) => {
            console.error('[why-bridge] evidence screenshot failed cause:', error instanceof Error ? error.message : String(error));
          });
      }
      return {
        cid,
        verdict: report.verdict,
        confidence: report.confidence,
        parts: report.parts.map(({ category, verdict: partVerdict, confidence: partConfidence, limitations }) => ({
          category,
          verdict: partVerdict,
          confidence: partConfidence,
          limitations,
        })),
        evidence: report.evidence,
        screenshotTag: report.screenshotTag,
      };
    },
  };
}
