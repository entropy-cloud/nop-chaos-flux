export type MessageFormatter = (key: string, params?: Record<string, unknown>) => string;

let formatter: MessageFormatter = (key) => key;

export function setMessageFormatter(fn: MessageFormatter): void {
  formatter = fn;
}

export function getMessageFormatter(): MessageFormatter {
  return formatter;
}
