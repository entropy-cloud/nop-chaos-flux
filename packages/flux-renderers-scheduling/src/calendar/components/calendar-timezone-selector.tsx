import React, { useState, useMemo, useCallback } from 'react';

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

  const timezones = useMemo(() => {
    return COMMON_TIMEZONES.map((tz) => ({
      value: tz,
      label: tz.replace('_', ' '),
      offset: formatTimezoneOffset(tz),
    }));
  }, []);

  const handleSelect = useCallback(
    (tz: string) => {
      onTimezoneChange(tz);
      setOpen(false);
    },
    [onTimezoneChange],
  );

  const selectedLabel = timezones.find((tz) => tz.value === selectedTimezone)?.label ?? selectedTimezone;

  return (
    <div className="nop-timezone-selector" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        data-slot="calendar-timezone-toggle"
        onClick={() => setOpen(!open)}
        style={{
          border: '1px solid #d0d5dd',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 12,
          cursor: 'pointer',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 12 }}>🌐</span>
        {selectedLabel}
      </button>

      {open && (
        <div
          data-slot="calendar-timezone-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: 240,
            overflow: 'auto',
            minWidth: 220,
          }}
        >
          {timezones.map((tz) => (
            <button
              type="button"
              key={tz.value}
              data-slot="calendar-timezone-option"
              onClick={() => handleSelect(tz.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: selectedTimezone === tz.value ? '#eff6ff' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
                color: selectedTimezone === tz.value ? '#1d4ed8' : '#333',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = selectedTimezone === tz.value ? '#eff6ff' : 'transparent';
              }}
            >
              <span>{tz.label}</span>
              {tz.offset && (
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{tz.offset}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
