import React, { useState } from 'react';
import { cn } from '@nop-chaos/ui';

export interface CalendarTimezoneSelectorProps {
  selectedTimezone: string;
  onTimezoneChange: (timezone: string) => void;
}

const COMMON_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

function formatTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, timeZoneName: 'longOffset' });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart ? offsetPart.value : '';
  } catch {
    return '';
  }
}

export function CalendarTimezoneSelector({
  selectedTimezone,
  onTimezoneChange,
}: CalendarTimezoneSelectorProps) {
  const [open, setOpen] = useState(false);

  const timezones = COMMON_TIMEZONES.map((tz) => ({
    value: tz,
    label: tz.replace('_', ' '),
    offset: formatTimezoneOffset(tz),
  }));

  const handleSelect = (tz: string) => {
    onTimezoneChange(tz);
    setOpen(false);
  };

  const selectedLabel = timezones.find((tz) => tz.value === selectedTimezone)?.label ?? selectedTimezone;

  return (
    <div className="nop-timezone-selector">
      <button
        type="button"
        data-slot="calendar-timezone-toggle"
        className="nop-timezone-toggle"
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: 12 }}>🌐</span>
        {selectedLabel}
      </button>

      {open && (
        <div data-slot="calendar-timezone-dropdown" className="nop-timezone-dropdown">
          {timezones.map((tz) => (
            <button
              type="button"
              key={tz.value}
              data-slot="calendar-timezone-option"
              className={cn(
                'nop-timezone-option',
                selectedTimezone === tz.value && 'selected',
              )}
              onClick={() => handleSelect(tz.value)}
            >
              <span>{tz.label}</span>
              {tz.offset && (
                <span className="nop-timezone-offset">{tz.offset}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
