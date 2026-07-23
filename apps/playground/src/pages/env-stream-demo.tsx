import { useRef, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Badge,
  NativeSelect,
  NativeSelectOption,
  toast,
  Toaster,
} from '@nop-chaos/ui';
import type { StreamChunkType, StreamProtocol } from '@nop-chaos/flux-core';
import { createDefaultStream } from '../env/stream-impl.js';

interface Props {
  onBack: () => void;
}

interface ReceivedChunk {
  index: number;
  raw: string;
  at: number;
}

const SSE_EVENTS = [
  'data: {"token":"Hello"}',
  'data: {"token":", "}',
  'data: {"token":"streaming"}',
  'data: {"token":" world"}',
  'data: {"token":"!"}',
  'data: [DONE]',
];

const NDJSON_LINES = [
  '{"seq":1,"msg":"connect"}',
  '{"seq":2,"msg":"running"}',
  '{"seq":3,"msg":"done"}',
];

/** 构造一个延时流式 fetch：按 protocol 生成 mock chunk，逐个 enqueue，间隔 delayMs。 */
function makeMockStreamFetch(
  protocol: StreamProtocol,
  events: string[],
  delayMs: number,
): typeof fetch {
  return (() =>
    Promise.resolve(
      new Response(
        new ReadableStream<Uint8Array>({
          async pull(controller) {
            for (const raw of events) {
              let line = raw;
              if (protocol === 'sse') {
                // SSE 事件需要 \n\n 分隔
                line = `${raw}\n\n`;
              } else {
                line = `${raw}\n`;
              }
              controller.enqueue(new TextEncoder().encode(line));
              await new Promise((r) => setTimeout(r, delayMs));
            }
            controller.close();
          },
        }),
        { status: 200, headers: { 'content-type': protocol === 'sse' ? 'text/event-stream' : 'application/x-ndjson' } },
      ),
    )) as unknown as typeof fetch;
}

export function EnvStreamDemoPage({ onBack }: Props) {
  const [protocol, setProtocol] = useState<StreamProtocol>('sse');
  const [chunkType, setChunkType] = useState<StreamChunkType>('json');
  const [running, setRunning] = useState(false);
  const [chunks, setChunks] = useState<ReceivedChunk[]>([]);
  const [statusLine, setStatusLine] = useState<string>('');
  const controllerRef = useRef<AbortController | null>(null);

  function reset() {
    setChunks([]);
    setStatusLine('');
  }

  async function runStream() {
    reset();
    setRunning(true);
    const controller = new AbortController();
    controllerRef.current = controller;

    const events = protocol === 'sse' ? SSE_EVENTS : NDJSON_LINES;
    const fetchImpl = makeMockStreamFetch(protocol, events, 250);
    const stream = createDefaultStream({ fetchImpl });
    const env = {
      fetcher: async () => ({ status: 200, data: null }),
      notify: (lvl: string, msg: string) => toast.info(`${lvl}: ${msg}`),
    } as never;

    try {
      const result = await stream(
        { url: '/mock/stream', streamProtocol: protocol, streamChunkType: chunkType },
        { env, scope: {} as never, signal: controller.signal },
      );
      setStatusLine(`response.status=${result.response.status} ok=${result.response.ok}`);

      let index = 0;
      try {
        for await (const chunk of result.chunks) {
          const raw = serializeChunk(chunk);
          setChunks((prev) => [...prev, { index, raw, at: Date.now() }]);
          index += 1;
        }
        setStatusLine((s) => `${s} — stream completed (${index} chunks)`);
      } catch (err) {
        setStatusLine((s) => `${s} — chunk error: ${(err as Error).message}`);
        toast.error(`chunk error: ${(err as Error).message}`);
      }
    } finally {
      setRunning(false);
      controllerRef.current = null;
    }
  }

  function abort() {
    controllerRef.current?.abort();
    setStatusLine((s) => `${s} — aborted`);
    setRunning(false);
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <Button variant="outline" onClick={onBack} className="mb-4">
        Back
      </Button>
      <h1 className="text-2xl font-bold mb-2">env.stream / env.openSocket Demo</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Interactive demo of the playground default <code>env.stream</code> implementation
        (fetch + ReadableStream + TextDecoder). SSE and NDJSON protocols auto-split + auto-parse.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <label htmlFor="stream-protocol-select" className="flex flex-col gap-1 text-sm">
          <span className="font-medium">streamProtocol</span>
          <NativeSelect
            id="stream-protocol-select"
            data-testid="stream-protocol"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as StreamProtocol)}
            disabled={running}
          >
            <NativeSelectOption value="sse">sse</NativeSelectOption>
            <NativeSelectOption value="ndjson">ndjson</NativeSelectOption>
            <NativeSelectOption value="json-lines">json-lines</NativeSelectOption>
            <NativeSelectOption value="text">text</NativeSelectOption>
            <NativeSelectOption value="raw">raw</NativeSelectOption>
          </NativeSelect>
        </label>
        <label htmlFor="stream-chunk-type-select" className="flex flex-col gap-1 text-sm">
          <span className="font-medium">streamChunkType</span>
          <NativeSelect
            id="stream-chunk-type-select"
            data-testid="stream-chunk-type"
            value={chunkType}
            onChange={(e) => setChunkType(e.target.value as StreamChunkType)}
            disabled={running}
          >
            <NativeSelectOption value="json">json</NativeSelectOption>
            <NativeSelectOption value="text">text</NativeSelectOption>
            <NativeSelectOption value="blob">blob</NativeSelectOption>
            <NativeSelectOption value="arraybuffer">arraybuffer</NativeSelectOption>
          </NativeSelect>
        </label>
        <Button data-testid="stream-start" onClick={runStream} disabled={running}>
          {running ? 'Streaming…' : 'Start stream'}
        </Button>
        <Button data-testid="stream-abort" variant="outline" onClick={abort} disabled={!running}>
          Abort
        </Button>
      </div>

      {statusLine && (
        <p data-testid="stream-status" className="text-xs font-mono mb-4">
          {statusLine}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Received chunks</span>
            <Badge variant="secondary">{chunks.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div
            data-testid="stream-output"
            className="font-mono text-xs space-y-1 min-h-40 max-h-96 overflow-auto"
          >
            {chunks.length === 0 ? (
              <span className="text-muted-foreground">No chunks yet.</span>
            ) : (
              chunks.map((c) => (
                <div key={c.index} className="flex gap-2">
                  <span className="text-muted-foreground">#{c.index}</span>
                  <span>{c.raw}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-6">
        Mock data — SSE emits 5 JSON tokens then <code>[DONE]</code> (auto-terminates iteration
        without yielding <code>[DONE]</code>); NDJSON emits 3 JSON lines.{' '}
        <code>env.openSocket</code> wraps the native browser WebSocket via{' '}
        <code>createDefaultOpenSocket</code> (see <code>env/socket-impl.ts</code>).
      </p>
      <Toaster />
    </main>
  );
}

function serializeChunk(chunk: unknown): string {
  if (chunk instanceof Uint8Array) {
    return `Uint8Array(${chunk.byteLength}) "${new TextDecoder().decode(chunk)}"`;
  }
  if (chunk instanceof ArrayBuffer) {
    return `ArrayBuffer(${chunk.byteLength})`;
  }
  if (typeof Blob !== 'undefined' && chunk instanceof Blob) {
    return `Blob(${chunk.size})`;
  }
  if (typeof chunk === 'string') return chunk;
  try {
    return JSON.stringify(chunk);
  } catch {
    return String(chunk);
  }
}
