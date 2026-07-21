import React, { useState, useCallback } from 'react';
import { Button, Label, Input, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

interface SchedulerConfigProps {
  className?: string;
  onScheduleAction?: (config: SchedulingConfig) => void;
}

export interface SchedulingConfig {
  direction: 'forward' | 'backward';
  constraintType: 'SNET' | 'SNLT' | 'FNET' | 'FNLT';
  constraintDate: string;
}

export function SchedulerConfig({ className, onScheduleAction }: SchedulerConfigProps) {
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [constraintType, setConstraintType] = useState<'SNET' | 'SNLT' | 'FNET' | 'FNLT'>('SNET');
  const [constraintDate, setConstraintDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'scheduling' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const hasInvalidConstraint = constraintDate !== '' && new Date(constraintDate).toString() === 'Invalid Date';

  const handleSchedule = useCallback(() => {
    if (hasInvalidConstraint) return;

    setStatus('scheduling');
    setErrorMsg('');

    const config: SchedulingConfig = {
      direction,
      constraintType,
      constraintDate: constraintDate || new Date().toISOString().slice(0, 10),
    };

    if (onScheduleAction) {
      onScheduleAction(config);
    }
  }, [direction, constraintType, constraintDate, hasInvalidConstraint, onScheduleAction]);

  return (
    <div className={cn('nop-gantt-scheduler-config p-3 border rounded-md bg-white', className)} data-slot="gantt-scheduler-config">
      <div className="text-sm font-semibold mb-2">{t('scheduling.gantt.schedulingTitle')}</div>

      <div className="grid gap-2">
        <div>
          <Label>{t('scheduling.gantt.direction')}</Label>
          <select
            value={direction}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDirection(e.target.value as 'forward' | 'backward')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="forward">{t('scheduling.gantt.forward')}</option>
            <option value="backward">{t('scheduling.gantt.backward')}</option>
          </select>
        </div>

        <div>
          <Label>{t('scheduling.gantt.constraintType')}</Label>
          <select
            value={constraintType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConstraintType(e.target.value as 'SNET' | 'SNLT' | 'FNET' | 'FNLT')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="SNET">{'Start No Earlier Than'}</option>
            <option value="SNLT">{'Start No Later Than'}</option>
            <option value="FNET">{'Finish No Earlier Than'}</option>
            <option value="FNLT">{'Finish No Later Than'}</option>
          </select>
        </div>

        <div>
          <Label>{t('scheduling.gantt.constraintDate')}</Label>
          <Input
            type="date"
            value={constraintDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConstraintDate(e.target.value)}
            className={hasInvalidConstraint ? 'border-red-500' : ''}
          />
          {hasInvalidConstraint && (
            <p className="text-xs text-red-500 mt-0.5">{t('scheduling.gantt.invalidDate')}</p>
          )}
        </div>

        <Button
          onClick={handleSchedule}
          disabled={status === 'scheduling' || hasInvalidConstraint}
          className="mt-1"
          aria-describedby={status === 'done' ? 'schedule-status-done' : status === 'error' ? 'schedule-status-error' : undefined}
        >
          {status === 'scheduling' ? t('scheduling.gantt.schedulingInProgress') : t('scheduling.gantt.triggerSchedule')}
        </Button>

        {status === 'done' && (
          <p id="schedule-status-done" className="text-xs text-green-600">{t('scheduling.gantt.scheduleApplied')}</p>
        )}

        {status === 'error' && (
          <p id="schedule-status-error" className="text-xs text-red-500">{errorMsg || t('scheduling.gantt.schedulingFailed')}</p>
        )}
      </div>
    </div>
  );
}
