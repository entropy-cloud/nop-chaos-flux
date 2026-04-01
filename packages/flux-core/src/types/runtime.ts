import type { ApiObject } from './schema';
import type { ScopeRef } from './scope';
import type { ValidationRule, ValidationError, ValidationResult, FormValidationResult, CompiledFormValidationModel, RuntimeFieldRegistration } from './validation';
import type { ActionScope, ActionResult } from './actions';
import type { ComponentHandleRegistry, RendererRuntime, RenderNodeInput } from './renderer';
import type { ReactNode } from 'react';

export interface FormStoreState {
  values: Record<string, any>;
  errors: Record<string, ValidationError[]>;
  validating: Record<string, boolean>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  visited: Record<string, boolean>;
  submitting: boolean;
}

export interface FormErrorQuery {
  path?: string;
  ownerPath?: string;
  sourceKinds?: Array<NonNullable<ValidationError['sourceKind']>>;
  rule?: ValidationRule['kind'];
}

export interface FormFieldStateSnapshot {
  error?: ValidationError;
  validating: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
  submitting: boolean;
}

export interface FormStoreApi {
  getState(): FormStoreState;
  subscribe(listener: () => void): () => void;
  setValues(values: Record<string, any>): void;
  setValue(path: string, value: unknown): void;
  setErrors(errors: Record<string, ValidationError[]>): void;
  setPathErrors(path: string, errors?: ValidationError[]): void;
  setValidating(path: string, validating: boolean): void;
  setValidatingState(validating: Record<string, boolean>): void;
  setTouched(path: string, touched: boolean): void;
  setTouchedState(touched: Record<string, boolean>): void;
  setDirty(path: string, dirty: boolean): void;
  setDirtyState(dirty: Record<string, boolean>): void;
  setVisited(path: string, visited: boolean): void;
  setVisitedState(visited: Record<string, boolean>): void;
  setSubmitting(submitting: boolean): void;
}

export interface DialogState {
  id: string;
  dialog: Record<string, any>;
  scope: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  title?: RenderNodeInput | string;
  body?: RenderNodeInput;
}

export interface PageStoreState {
  data: Record<string, any>;
  dialogs: DialogState[];
  refreshTick: number;
}

export interface PageStoreApi {
  getState(): PageStoreState;
  subscribe(listener: () => void): () => void;
  setData(data: Record<string, any>): void;
  updateData(path: string, value: unknown): void;
  openDialog(dialog: DialogState): void;
  closeDialog(dialogId?: string): void;
  refresh(): void;
}

export interface FormRuntime {
  id: string;
  name?: string;
  store: FormStoreApi;
  scope: ScopeRef;
  validation?: CompiledFormValidationModel;
  registerField(registration: RuntimeFieldRegistration): () => void;
  validateField(path: string): Promise<ValidationResult>;
  validateSubtree(path: string): Promise<FormValidationResult>;
  validateForm(): Promise<FormValidationResult>;
  getError(path: string): ValidationError[] | undefined;
  isValidating(path: string): boolean;
  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  isVisited(path: string): boolean;
  touchField(path: string): void;
  visitField(path: string): void;
  clearErrors(path?: string): void;
  submit(api?: ApiObject): Promise<ActionResult>;
  reset(values?: object): void;
  setValue(name: string, value: unknown): void;
  appendValue(path: string, value: unknown): void;
  prependValue(path: string, value: unknown): void;
  insertValue(path: string, index: number, value: unknown): void;
  removeValue(path: string, index: number): void;
  moveValue(path: string, from: number, to: number): void;
  swapValue(path: string, a: number, b: number): void;
  replaceValue(path: string, value: unknown): void;
}

export interface PageRuntime {
  store: PageStoreApi;
  scope: ScopeRef;
  openDialog(
    dialog: Record<string, any>,
    scope: ScopeRef,
    runtime: RendererRuntime,
    options?: {
      actionScope?: ActionScope;
      componentRegistry?: ComponentHandleRegistry;
    }
  ): string;
  closeDialog(dialogId?: string): void;
  refresh(): void;
}

export interface DialogRendererProps {
  dialogs: DialogState[];
  renderDialog: (dialog: DialogState) => ReactNode;
}
