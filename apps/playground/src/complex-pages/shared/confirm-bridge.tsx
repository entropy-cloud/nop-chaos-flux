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
} from '@nop-chaos/ui';

interface ConfirmRequest {
  message: string;
  title?: string;
  resolve: (value: boolean) => void;
}

/**
 * Bridge that lets the schema-driven `env.confirm` open a real AlertDialog UI.
 * Pages render <ConfirmHost /> once; the imperative confirm() resolves when the
 * user clicks confirm/cancel. Mirrors the pattern in the standalone crud-demo.
 */
export const confirmBridge: { confirm: (message?: string, title?: string) => Promise<boolean> } = {
  confirm: () => Promise.resolve(true),
};

export function ConfirmHost() {
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
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title ?? '确认操作'}</AlertDialogTitle>
          <AlertDialogDescription>{request?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              close(false);
            }}
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              close(true);
            }}
          >
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
