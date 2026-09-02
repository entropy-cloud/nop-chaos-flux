import * as React from 'react';
import type { PickerValue } from './picker-helpers.js';

export interface PickerContextValue {
  pickerId: string;
  multiple: boolean;
  selection: PickerValue[];
  rows: Map<PickerValue, { label: string; row: Record<string, unknown> }>;
  pick: (value: PickerValue, row?: Record<string, unknown>, label?: string) => void;
  unpick: (value: PickerValue) => void;
  clear: () => void;
}

export const PickerContext = React.createContext<PickerContextValue | null>(null);

export function useCurrentPicker(): PickerContextValue | null {
  return React.useContext(PickerContext);
}

export const PickerContextProvider = PickerContext.Provider;