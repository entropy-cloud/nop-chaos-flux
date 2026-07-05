import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Toaster,
  toast,
} from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import CRUD_SCHEMA from '../schemas/crud-demo.json';

interface CrudDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'disabled';
  createTime: string;
}

function now(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

const db: UserRecord[] = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', role: 'admin', status: 'active', createTime: '2024-01-05 09:30:00' },
  { id: 2, name: '李四', email: 'lisi@example.com', role: 'user', status: 'active', createTime: '2024-02-12 14:20:00' },
  { id: 3, name: '王五', email: 'wangwu@example.com', role: 'user', status: 'disabled', createTime: '2024-03-08 11:05:00' },
  { id: 4, name: 'Alice', email: 'alice@example.com', role: 'admin', status: 'active', createTime: '2024-06-03 09:00:00' },
  { id: 5, name: 'Bob', email: 'bob@example.com', role: 'user', status: 'active', createTime: '2024-06-19 15:25:00' },
];

let nextId = db.length + 1;

const initialSeed: { items: UserRecord[]; total: number } = {
  items: db.map((record) => ({ ...record })),
  total: db.length,
};

function deepClone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

const env: RendererEnv = {
  fetcher: async function fetcher<T>(api: {
    url?: string;
    method?: string;
    data?: unknown;
  }): Promise<{ ok: boolean; status: number; data: T }> {
    const url = api.url ?? '';
    const method = (api.method ?? 'get').toLowerCase();

    if (url.includes('/api/users') && method === 'get') {
      return { ok: true, status: 200, data: deepClone({ items: db, total: db.length }) as T };
    }

    if (url.includes('/api/users') && method === 'post') {
      const body = (api.data ?? {}) as Partial<UserRecord>;
      db.push({
        id: nextId++,
        name: String(body.name ?? ''),
        email: String(body.email ?? ''),
        role: (body.role as UserRecord['role']) ?? 'user',
        status: (body.status as UserRecord['status']) ?? 'active',
        createTime: now(),
      });
      return { ok: true, status: 200, data: { success: true } as T };
    }

    if (url.includes('/api/users') && method === 'put') {
      const body = (api.data ?? {}) as Partial<UserRecord>;
      const target = db.find((item) => item.id === Number(body.id));
      if (target) {
        if (body.name !== undefined) target.name = String(body.name);
        if (body.email !== undefined) target.email = String(body.email);
        if (body.role !== undefined) target.role = body.role as UserRecord['role'];
        if (body.status !== undefined) target.status = body.status as UserRecord['status'];
      }
      return { ok: true, status: 200, data: { success: true } as T };
    }

    if (url.includes('/api/users') && method === 'delete') {
      const body = (api.data ?? {}) as { id?: unknown; ids?: unknown };
      if (Array.isArray(body.ids)) {
        const idSet = new Set(body.ids.map((value) => Number(value)));
        for (let i = db.length - 1; i >= 0; i -= 1) {
          if (idSet.has(db[i].id)) {
            db.splice(i, 1);
          }
        }
      } else if (body.id !== undefined) {
        const targetId = Number(body.id);
        const index = db.findIndex((item) => item.id === targetId);
        if (index >= 0) db.splice(index, 1);
      }
      return { ok: true, status: 200, data: { success: true } as T };
    }

    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, message) => {
    const text = typeof message === 'string' ? message : String(message ?? '');
    if (level === 'error') toast.error(text || 'Error');
    else if (level === 'success') toast.success(text || 'Success');
    else if (level === 'warning') toast.warning?.(text || 'Warning');
    else toast.info?.(text || 'Info');
  },
  confirm: (message, title) => confirmBridge.confirm(message, title),
};

interface ConfirmRequest {
  message: string;
  title?: string;
  resolve: (value: boolean) => void;
}

const confirmBridge: { confirm: (message?: string, title?: string) => Promise<boolean> } = {
  confirm: () => Promise.resolve(true),
};

function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    confirmBridge.confirm = (message, title) =>
      new Promise<boolean>((resolve) => {
        setRequest({ message: message ?? '', title, resolve });
      });
    return () => {
      confirmBridge.confirm = () => Promise.resolve(true);
    };
  }, []);

  const close = (value: boolean) => {
    request?.resolve(value);
    setRequest(null);
  };

  return (
    <AlertDialog open={request !== null} onOpenChange={(open) => { if (!open) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title ?? '确认操作'}</AlertDialogTitle>
          <AlertDialogDescription>{request?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>确认</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CrudDemoPage({ onBack }: CrudDemoPageProps) {
  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        ← Back to Home
      </Button>
      <p className="mb-2 uppercase tracking-[0.16em] text-xs text-muted-foreground">
        Standard CRUD Workflow
      </p>
      <h1 className="m-0 mb-6">用户管理 — 完整增删改查（JSON 驱动 + env.fetcher mock 后端）</h1>

      <div className="rounded-lg border bg-background">
        <SchemaRenderer
          schemaUrl="playground://crud-demo/page"
          schema={CRUD_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
          data={{ ds_users: initialSeed }}
        />
      </div>

      <ConfirmHost />
      <Toaster />
    </main>
  );
}
