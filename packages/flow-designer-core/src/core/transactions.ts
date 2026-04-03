import type { GraphDocument } from '../types';
import { cloneDocument, generateId } from './clone';

export interface DesignerTransaction {
  id: string;
  label: string;
  snapshotBefore: GraphDocument;
}

export function beginTransactionState(
  stack: DesignerTransaction[],
  doc: GraphDocument,
  label?: string,
  transactionId?: string,
): { stack: DesignerTransaction[]; id: string } {
  const id = transactionId ?? generateId();
  return {
    id,
    stack: [
      ...stack,
      {
        id,
        label: label ?? '',
        snapshotBefore: cloneDocument(doc),
      },
    ],
  };
}

export function commitTransactionState(
  stack: DesignerTransaction[],
  transactionId?: string,
): {
  stack: DesignerTransaction[];
  committedId?: string;
  shouldPushHistory: boolean;
} | null {
  if (stack.length === 0) {
    return null;
  }

  if (!transactionId) {
    const txn = stack[stack.length - 1];
    const nextStack = stack.slice(0, -1);
    return {
      stack: nextStack,
      committedId: txn.id,
      shouldPushHistory: nextStack.length === 0,
    };
  }

  const index = stack.findIndex((txn) => txn.id === transactionId);
  if (index === -1) {
    return null;
  }

  if (index === 0) {
    const txn = stack[stack.length - 1];
    return {
      stack: [],
      committedId: txn.id,
      shouldPushHistory: true,
    };
  }

  const txn = stack[index];
  const nextStack = [...stack.slice(0, index), ...stack.slice(index + 1)];
  return {
    stack: nextStack,
    committedId: txn.id,
    shouldPushHistory: nextStack.length === 0,
  };
}

export function rollbackTransactionState(
  stack: DesignerTransaction[],
  transactionId?: string,
): {
  stack: DesignerTransaction[];
  snapshotBefore: GraphDocument;
  rolledBackIds: string[];
} | null {
  if (stack.length === 0) {
    return null;
  }

  if (!transactionId) {
    const txn = stack[stack.length - 1];
    return {
      stack: stack.slice(0, -1),
      snapshotBefore: cloneDocument(txn.snapshotBefore),
      rolledBackIds: [txn.id],
    };
  }

  const index = stack.findIndex((txn) => txn.id === transactionId);
  if (index === -1) {
    return null;
  }

  const txn = stack[index];
  const innerStack = stack.slice(index);
  const rolledBackIds = [txn.id];
  for (let i = innerStack.length - 2; i >= 0; i -= 1) {
    rolledBackIds.push(innerStack[i].id);
  }

  return {
    stack: stack.slice(0, index),
    snapshotBefore: cloneDocument(txn.snapshotBefore),
    rolledBackIds,
  };
}
