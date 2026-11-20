import React from 'react';
import { dateFields } from '../../../types/resume';
import { formatResumeDate } from '../../../utils/date';
import {
  DateFormatPattern,
  formatDateWithPattern,
  formatItemDateRange,
} from '../templateHelpers';
import { useTemplateContext } from './TemplateContext';

export interface DateRangeProps {
  item?: Record<string, any>;
  startDate?: string | Partial<dateFields>;
  endDate?: string | Partial<dateFields>;
  date?: string | Partial<dateFields>;
  current?: boolean;
  dateFormat?: DateFormatPattern;
  className?: string;
  style?: React.CSSProperties;
}

export const DateRange: React.FC<DateRangeProps> = ({
  item,
  startDate,
  endDate,
  date,
  current,
  dateFormat,
  className = 'text-xs font-medium text-slate-500 tabular-nums shrink-0',
  style,
}) => {
  const ctx = useTemplateContext();
  const effectiveFormat = dateFormat ?? ctx.dateFormat;

  let formatted = '';
  if (item) {
    formatted = formatItemDateRange(item, effectiveFormat);
  } else {
    const start = effectiveFormat
      ? formatDateWithPattern(startDate, effectiveFormat)
      : formatResumeDate(startDate);
    const end = effectiveFormat
      ? formatDateWithPattern(endDate, effectiveFormat)
      : formatResumeDate(endDate);
    const single = effectiveFormat
      ? formatDateWithPattern(date, effectiveFormat)
      : formatResumeDate(date);

    const rawEnd = formatResumeDate(endDate);
    const isOngoing = Boolean(current) || /^present$/i.test(rawEnd.trim());

    if (start) {
      if (isOngoing) {
        formatted = `${start} - Present`;
      } else {
        formatted = end ? `${start} - ${end}` : start;
      }
    } else if (isOngoing) {
      formatted = 'Present';
    } else if (end) {
      formatted = end;
    } else if (single) {
      formatted = single;
    }
  }

  if (!formatted) return null;

  return (
    <span className={className} style={style}>
      {formatted}
    </span>
  );
};
