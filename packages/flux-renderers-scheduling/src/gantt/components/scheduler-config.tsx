import React, { useState, useId } from 'react';
import { Button, Label, Input, NativeSelect, NativeSelectOption, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

interface SchedulerConfigProps {
  className?: string;
  onScheduleAction?: (config: SchedulingConfig) => void | Promise<void>;
}

export interface SchedulingConfig {
  direction: 'forward' | 'backward';
  constraintType: 'SNET' | 'SNLT' | 'FNET' | 'FNLT';
  constraintDate: string;
}

export function SchedulerConfig({ className, onScheduleAction }: SchedulerConfigProps) {
  const uid = useId();
  const statusDoneId = `${uid}-schedule-status-done`;
  const statusErrorId = `${uid}-schedule-status-error`;
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [constraintType, setConstraintType] = useState<'SNET' | 'SNLT' | 'FNET' | 'FNLT'>('SNET');
  const [constraintDate, setConstraintDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'scheduling' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const hasInvalidConstraint = constraintDate !== '' && new Date(constraintDate).toString() === 'Invalid Date';

  const handleSchedule = async () => {
    if (hasInvalidConstraint) return;

    setStatus('scheduling');
    setErrorMsg('');

    const config: SchedulingConfig = {
      direction,
      constraintType,
      constraintDate: constraintDate || new Date().toISOString().slice(0, 10),
    };

    if (onScheduleAction) {
      try {
        const result = onScheduleAction(config);
        if (result instanceof Promise) {
          const timeout = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Schedule timed out')), 30000),
          );
          await Promise.race([result, timeout]);
        }
        setStatus('done');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err?.message ?? 'Scheduling failed');
      }
    } else {
      setStatus('done');
    }
  };

  return (
    <div className={cn('nop-gantt-scheduler-config p-3 border rounded-md bg-white', className)} data-slot="gantt-scheduler-config">
      <div className="text-sm font-semibold mb-2">{t('scheduling.gantt.schedulingTitle')}</div>

      <div className="grid gap-2">
        <div>
          <Label>{t('scheduling.gantt.direction')}</Label>
          <NativeSelect
            value={direction}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDirection(e.target.value as 'forward' | 'backward')}
          >
            <NativeSelectOption value="forward">{t('scheduling.gantt.forward')}</NativeSelectOption>
            <NativeSelectOption value="backward">{t('scheduling.gantt.backward')}</NativeSelectOption>
          </NativeSelect>
        </div>

        <div>
          <Label>{t('scheduling.gantt.constraintType')}</Label>
          <NativeSelect
            value={constraintType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConstraintType(e.target.value as 'SNET' | 'SNLT' | 'FNET' | 'FNLT')}
          >
            <NativeSelectOption value="SNET">{'Start No Earlier Than'}</NativeSelectOption>
            <NativeSelectOption value="SNLT">{'Start No Later Than'}</NativeSelectOption>
            <NativeSelectOption value="FNET">{'Finish No Earlier Than'}</NativeSelectOption>
            <NativeSelectOption value="FNLT">{'Finish No Later Than'}</NativeSelectOption>
          </NativeSelect>
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
          aria-describedby={status === 'done' ? statusDoneId : status === 'error' ? statusErrorId : undefined}
        >
          {status === 'scheduling' ? t('scheduling.gantt.schedulingInProgress') : t('scheduling.gantt.triggerSchedule')}
        </Button>

        <div aria-live="polite" aria-atomic="true">
          {status === 'done' && (
            <p id={statusDoneId} className="text-xs text-green-600">{t('scheduling.gantt.scheduleApplied')}</p>
          )}

          {status === 'error' && (
            <p id={statusErrorId} className="text-xs text-red-500">{errorMsg || t('scheduling.gantt.schedulingFailed')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
