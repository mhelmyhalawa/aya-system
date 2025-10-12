import * as React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface UnifiedSelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface UnifiedSelectProps<T extends string = string> {
  value?: T | '' | null;
  onChange?: (value: T) => void;
  options: UnifiedSelectOption<T>[];
  placeholder?: string;
  dir?: 'rtl' | 'ltr';
  size?: 'sm' | 'md' | 'base';
  disabled?: boolean;
  className?: string;               // extra classes for trigger
  contentClassName?: string;        // extra classes for content
  itemClassName?: string;           // extra classes for each item
  emptyLabel?: string;              // label when no options
  renderValue?: (opt: UnifiedSelectOption<T> | undefined) => React.ReactNode; // custom value display
  autoFocus?: boolean;
  name?: string;
  id?: string;
}

const sizeTriggerMap: Record<string, string> = {
  sm: 'select-trigger-sm',
  md: 'select-trigger-md',
  base: '',
};
const sizeContentMap: Record<string, string> = {
  sm: 'select-content-sm',
  md: 'select-content-md',
  base: '',
};
const sizeItemMap: Record<string, string> = {
  sm: 'select-item-sm',
  md: 'select-item-md',
  base: '',
};

export function UnifiedSelect<T extends string = string>(props: UnifiedSelectProps<T>) {
  const {
    value,
    onChange,
    options,
    placeholder = 'اختر...',
    dir = 'rtl',
    size = 'base',
    disabled,
    className,
    contentClassName,
    itemClassName,
    emptyLabel = 'لا توجد بيانات',
    renderValue,
    id,
    name,
  } = props;

  const current = options.find(o => o.value === value);

  return (
    <Select
      value={(value ?? '') as string}
      onValueChange={(v) => { if (onChange) onChange(v as T); }}
      disabled={disabled}
      name={name}
    >
      <SelectTrigger
        dir={dir}
        id={id}
        className={cn(
          'select-trigger-base',
          value ? 'select-trigger-active' : 'select-trigger-empty',
          sizeTriggerMap[size],
          disabled && 'select-trigger-disabled',
          className,
        )}
      >
        {value && current && renderValue ? (
          renderValue(current)
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent dir={dir} className={cn('select-content-base', sizeContentMap[size], contentClassName)}>
        {options.length === 0 && (
          <SelectItem disabled value="__empty__" className={cn('select-item-base select-item-disabled', sizeItemMap[size])}>{emptyLabel}</SelectItem>
        )}
        {options.map(opt => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className={cn('select-item-base', sizeItemMap[size], opt.disabled && 'select-item-disabled', itemClassName, opt.className)}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default UnifiedSelect;