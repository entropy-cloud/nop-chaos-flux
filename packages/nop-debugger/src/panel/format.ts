/** 面板时钟标签单源（WA-debugger-006：四个 tab 曾各持一份逐字实现）。 */
export function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
