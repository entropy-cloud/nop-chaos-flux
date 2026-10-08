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

  // Plan 550 / IS-approval-tasks-001: the AlertDialog must stay UNMOUNTED
  // between requests. It reserves its z-index from the process-wide overlay
  // counter at MOUNT; a persistent instance would grab a value at page load
  // and then render BELOW any dialog opened later (the approval-tasks task
  // dialog sits at a higher z, its full-viewport overlay intercepts every
  // pointer event, and the visible-through-the-mask confirm is pointer-dead).
  // Mounting per request reserves a fresh z-index above the current overlay
  // stack, mirroring how flux dialogs reserve at open time.
  if (request === null) {
    return null;
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request.title ?? '确认操作'}</AlertDialogTitle>
          <AlertDialogDescription>{request.message}</AlertDialogDescription>
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
