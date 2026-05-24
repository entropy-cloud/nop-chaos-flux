import { useState } from 'react';
import { buildTagOpenString, buildTagSelfcloseString } from '@nop-chaos/word-editor-core';
import type { TemplateExpr } from '@nop-chaos/word-editor-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
} from '@nop-chaos/ui';
import { findInsertableTagDefinition } from '../template-tag-helpers.js';

interface ExprInsertDialogProps {
  open: boolean;
  onClose: () => void;
  onInsertExpr: (expr: string) => void;
  onInsertTag: (expr: TemplateExpr) => void;
}

type ExprType = 'el' | 'xpl';

export function ExprInsertDialog({
  open,
  onClose,
  onInsertExpr,
  onInsertTag,
}: ExprInsertDialogProps) {
  const [exprType, setExprType] = useState<ExprType>('el');
  const [expression, setExpression] = useState('');
  const [selectedTag, setSelectedTag] = useState('c:if');
  const [tagAttrs, setTagAttrs] = useState<Record<string, string>>({});

  const handleInsert = () => {
    if (exprType === 'el') {
      if (!expression.trim()) return;
      onInsertExpr(`\${${expression.trim()}}`);
    } else {
      const tagDef = findInsertableTagDefinition(selectedTag);
      if (!tagDef) return;

      const attrs = {
        ...(tagDef.defaultAttrs || {}),
        ...tagAttrs,
      };

      onInsertTag({
        kind: tagDef.kind,
        expr:
          tagDef.kind === 'tag-selfclose'
            ? buildTagSelfcloseString(selectedTag, attrs)
            : buildTagOpenString(selectedTag, attrs),
        tagName: selectedTag,
        attrs,
      });
    }
    onClose();
  };

  const availableTags = [
    'c:if',
    'c:for',
    'c:forEach',
    'c:choose',
    'c:when',
    'c:otherwise',
    'c:set',
    'c:out',
  ];
  const currentTagDef = findInsertableTagDefinition(selectedTag);
  const expressionInputId = 'expr-insert-expression';
  const tagNameInputId = 'expr-insert-tag-name';

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{t('flux.wordEditor.insertTemplateExpr')}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <Tabs
            value={exprType}
            onValueChange={(value) => setExprType(value as ExprType)}
            data-orientation="horizontal"
            className="flex-col gap-0"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="el">
                {t('flux.wordEditor.elExpression')}
              </TabsTrigger>
              <TabsTrigger value="xpl">
                {t('flux.wordEditor.xplTag')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="el" className="mb-4">
              <Textarea
                id={expressionInputId}
                aria-label={t('flux.wordEditor.elExpression')}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="${entity.fieldName}"
                className="min-h-[80px]"
              />
            </TabsContent>

            <TabsContent value="xpl" className="mb-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor={tagNameInputId}>{t('flux.wordEditor.tagName')}</Label>
                  <NativeSelect
                    id={tagNameInputId}
                    value={selectedTag}
                    onChange={(e) => {
                      setSelectedTag(e.target.value);
                      setTagAttrs({});
                    }}
                    className="w-full"
                  >
                    {availableTags.map((tag) => (
                      <NativeSelectOption key={tag} value={tag}>
                        {tag}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                {currentTagDef && currentTagDef.defaultAttrs && (
                  <div className="space-y-2">
                    {Object.entries(currentTagDef.defaultAttrs).map(([attrName]) => (
                      <div key={attrName}>
                        <Label htmlFor={`expr-insert-attr-${attrName}`}>{attrName}</Label>
                        <Input
                          id={`expr-insert-attr-${attrName}`}
                          value={tagAttrs[attrName] || ''}
                          onChange={(e) =>
                            setTagAttrs((prev) => ({ ...prev, [attrName]: e.target.value }))
                          }
                          placeholder={currentTagDef.defaultAttrs?.[attrName] || ''}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogBody>

        <DialogFooter className="bg-transparent">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('flux.common.cancel')}
          </Button>
          <Button size="sm" onClick={handleInsert}>
            {t('flux.common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
