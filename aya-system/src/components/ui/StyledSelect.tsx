import * as React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
import { cn } from '../../lib/utils';

/**
 * StyledSelect
 * Reusable select component matching the design specimen the user provided.
 * Props:
 *  - value, onValueChange: controlled value handling
 *  - options: { value: string; label: string; icon?: React.ReactNode }[]
 *  - placeholder: string for the empty state
 *  - highlightAllValue?: string (e.g., 'all') to style differently
 *  - size?: 'sm' | 'md'
 *  - className: container override
 *  - triggerClassName: additional classes for trigger
 *  - contentClassName: classes for dropdown content
 */
export interface StyledSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface StyledSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  options: StyledSelectOption[];
  placeholder?: string;
  highlightAllValue?: string; // value that means "All"
  size?: 'sm' | 'md';
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  dir?: 'rtl' | 'ltr';
}

const sizeMap = {
  sm: {
    trigger: 'h-8 text-xs',
    iconBox: 'h-6 w-6 text-sm',
    label: 'text-[11px]'
  },
  md: {
    trigger: 'h-10 text-sm',
    iconBox: 'h-7 w-7 text-base',
    label: 'text-sm'
  }
};

export const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'اختر',
  highlightAllValue = 'all',
  size = 'md',
  className,
  triggerClassName,
  contentClassName,
  dir = 'rtl'
}) => {
  const sizeCfg = sizeMap[size];
  const current = options.find(o => o.value === value);
  const isAll = value === highlightAllValue;

  return (
    <div className={cn('flex-1 min-w-[160px] flex flex-col gap-1 relative', className)} dir={dir}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            'w-full ps-3 pe-2 rounded-xl border text-right flex items-center gap-2 overflow-hidden transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-green-400',
            sizeCfg.trigger,
            isAll
              ? 'border-green-300 dark:border-green-700 bg-white dark:bg-green-950 hover:bg-green-50'
              : 'border-green-500 bg-green-50/70 dark:bg-green-900/40 hover:bg-green-100',
            triggerClassName
          )}
        >
          <div className={cn(
            'shrink-0 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600',
            sizeCfg.iconBox
          )}>
            {current?.icon || '۝'}
          </div>
          <span
            className={cn(
              'truncate flex-1',
              isAll
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-green-700 font-medium',
              sizeCfg.label
            )}
          >
            {current ? current.label : placeholder}
          </span>
        </SelectTrigger>
        <SelectContent
          dir={dir}
          className={cn(
            'text-sm bg-white dark:bg-green-950 border border-green-200 dark:border-green-700 rounded-lg shadow-lg p-1 max-h-[300px] overflow-y-auto',
            contentClassName
          )}
        >
          {/* All option first (if not already included explicitly) */}
          {options.some(o => o.value === highlightAllValue) || (
            <SelectItem
              value={highlightAllValue}
              className={cn(
                'text-right text-[12px] cursor-pointer rounded-md px-2 py-1.5',
                'data-[highlighted]:bg-green-100 data-[highlighted]:text-green-800 focus:bg-green-100 focus:text-green-800 transition-colors'
              )}
            >
              جميع الأنواع
            </SelectItem>
          )}
          {options.map(opt => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className={cn(
                'text-right text-[12px] cursor-pointer rounded-md px-2 py-1.5',
                'data-[highlighted]:bg-green-100 data-[highlighted]:text-green-800 focus:bg-green-100 focus:text-green-800 transition-colors'
              )}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StyledSelect;
