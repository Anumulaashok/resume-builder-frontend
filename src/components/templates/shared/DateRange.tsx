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

    if (start) {
      const rawEnd = formatResumeDate(endDate);
      const displayEnd = current || !rawEnd ? 'Present' : end;
      formatted = `${start} - ${displayEnd}`;
    } else if (current) {
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
