/**
 * 模板画廊（S4-2，roadmap S4「模板画廊」）。
 *
 * 整页模板的保存 / 画廊浏览 / 实例化：实例化 = `importDocument` 树命令
 * （1 条 undo 步；rt-unknown-type 拒绝路径由命令层返回，toast 呈现）。
 * 存储是宿主回调面（`PageDesignerTemplateStore`）——设计器不绑定任何存储实现；
 * `createInMemoryTemplateStore` 是 demo/测试用内存实现。模板文档 =
 * 导出投影（已剥离 sid，INV-E），实例化时由命令层重新注入（复制即新 sid）。
 */

import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, toast } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { SchemaInput } from '@nop-chaos/flux-core';

export interface PageDesignerTemplate {
  id: string;
  name: string;
  /** 导出投影形态（无 sid）。 */
  document: SchemaInput;
  createdAt?: string;
}

export interface PageDesignerTemplateStore {
  list(): PageDesignerTemplate[] | Promise<PageDesignerTemplate[]>;
  save(input: { name: string; document: SchemaInput }): PageDesignerTemplate | Promise<PageDesignerTemplate>;
  remove?(id: string): void | Promise<void>;
}

/** demo/测试用内存模板 store（会话内持久，宿主可换任意实现）。 */
export function createInMemoryTemplateStore(seed: readonly PageDesignerTemplate[] = []): PageDesignerTemplateStore {
  let counter = 0;
  const templates = new Map<string, PageDesignerTemplate>(seed.map((item) => [item.id, { ...item }]));
  return {
    list() {
      return [...templates.values()];
    },
    save(input) {
      counter += 1;
      const saved: PageDesignerTemplate = {
        id: `tpl-${Date.now().toString(36)}-${counter}`,
        name: input.name,
        document: input.document,
        createdAt: new Date().toISOString(),
      };
      templates.set(saved.id, saved);
      return saved;
    },
    remove(id) {
      templates.delete(id);
    },
  };
}

export interface TemplateGalleryProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  store: PageDesignerTemplateStore;
  /** 当前文档导出投影（已剥离 sid 的 JSON 文本）。 */
  currentExportedJson: string;
  /** 实例化（宿主装 importDocument 命令；返回是否被命令层接受）。 */
  onInstantiate(document: SchemaInput): boolean;
}

export function TemplateGallery(props: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<PageDesignerTemplate[]>([]);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    void Promise.resolve(props.store.list()).then((items) => {
      if (!cancelled) setTemplates(items);
    });
    return () => {
      cancelled = true;
    };
  }, [props.open, props.store]);

  const save = () => {
    const name = nameDraft.trim() || t('flux.pageDesigner.templateUntitled');
    let document: SchemaInput;
    try {
      document = JSON.parse(props.currentExportedJson) as SchemaInput;
    } catch {
      toast.error(t('flux.pageDesigner.templateSaveFailed'));
      return;
    }
    void Promise.resolve(props.store.save({ name, document })).then(() => {
      setNameDraft('');
      setTemplates([...(props.store.list() as PageDesignerTemplate[])]);
      toast.success(t('flux.pageDesigner.templateSaved'));
    });
  };

  const remove = (id: string) => {
    void Promise.resolve(props.store.remove?.(id)).then(() => {
      setTemplates((prev) => prev.filter((item) => item.id !== id));
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent size="lg" data-testid="page-designer-template-gallery">
        <DialogHeader>
          <DialogTitle>{t('flux.pageDesigner.templateGalleryTitle')}</DialogTitle>
          <DialogDescription>{t('flux.pageDesigner.templateGalleryDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5" data-testid="page-designer-template-save-section">
          <Label htmlFor="page-designer-template-name">{t('flux.pageDesigner.templateName')}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="page-designer-template-name"
              className="h-8 text-sm"
              value={nameDraft}
              placeholder={t('flux.pageDesigner.templateNamePlaceholder')}
              onChange={(event) => setNameDraft(event.target.value)}
            />
            <Button type="button" size="sm" data-testid="page-designer-template-save" onClick={save}>
              {t('flux.pageDesigner.templateSave')}
            </Button>
          </div>
        </div>

        <div className="min-h-24 space-y-1.5" data-testid="page-designer-template-list">
          {templates.length === 0 ? (
            <p
              className="rounded border border-dashed p-3 text-center text-sm text-[var(--nop-body-copy,#6b7280)]"
              data-testid="page-designer-template-empty"
            >
              {t('flux.pageDesigner.templateEmpty')}
            </p>
          ) : (
            templates.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded border p-2"
                data-testid="page-designer-template-item"
                data-template-id={item.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate font-mono text-[11px] text-[var(--nop-eyebrow,#9ca3af)]">
                    {Array.isArray(item.document) ? '[]' : item.document.type ?? ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="page-designer-template-instantiate"
                  onClick={() => {
                    if (props.onInstantiate(item.document)) {
                      props.onOpenChange(false);
                      toast.success(t('flux.pageDesigner.templateInstantiated'));
                    } else {
                      toast.error(t('flux.pageDesigner.templateInstantiateRejected'));
                    }
                  }}
                >
                  {t('flux.pageDesigner.templateInstantiate')}
                </Button>
                {props.store.remove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t('flux.pageDesigner.templateRemove')}
                    data-testid="page-designer-template-remove"
                    onClick={() => remove(item.id)}
                  >
                    ×
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="page-designer-template-close"
            onClick={() => props.onOpenChange(false)}
          >
            {t('flux.pageDesigner.templateClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
