import React from 'react';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ChevronDown, X, Plus, Filter as FilterIcon, RotateCcw, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, ChevronDown as CollapseChevron } from 'lucide-react';
// Specialized memorization type helpers (predefined small static list)
import { memorizationTypeOptions, getMemorizationTypeColor, getMemorizationTypeName } from '@/types/memorization-record';

/**
 * Generic reusable FilterBar component
 * Arabic-friendly, RTL-first, responsive. Allows pages to declare a set of dynamic filter fields and action buttons
 * without modifying the component code. Focus: select-like filters now; easily extensible for future types (date, text, number, status)
 */

// === Types ============================================================= //

// Primitive filter value types. Extended to allow string[] for multi-select fields.
export type Primitive = string | number | boolean | null | string[];

// Option shape for select-like filters
export interface FilterOption {
  value: string;            // stored value
  label: string;            // display label (already localized)
  icon?: React.ReactNode;   // optional icon (emoji or svg)
  meta?: Record<string, Primitive>; // extra data (e.g., counts)
  disabled?: boolean;
}

// Supported field kinds (extensible)
export type FilterFieldType = 'select' | 'async-select' | 'text' | 'custom' | 'multi-select' | 'memorization-type' | 'session-select';

export interface BaseFilterField {
  id: string;                 // unique identifier used in callbacks
  label?: string;             // visible label (optional if placeholder used)
  type: FilterFieldType;      // determines renderer
  hidden?: boolean;           // allow page to hide without removing from config
  className?: string;         // override container width / layout
  required?: boolean;         // future use for validation
  rtl?: boolean;              // override RTL (defaults to true)
  showLabel?: boolean;        // override global showFieldLabels (true=force show, false=force hide)
}

export interface SelectFilterField extends BaseFilterField {
  type: 'select' | 'async-select';
  placeholder?: string;
  // Options for synchronous select
  options?: FilterOption[];
  // Async loader for options (for async-select) returns full list each call. Can depend on other active filter values.
  loadOptions?: (context: { values: Record<string, Primitive> }) => Promise<FilterOption[]>;
  // Current selected value (controlled)
  value?: string | null;
  // Called when the value changes
  onChange?: (value: string | null) => void; // per-field override; typically use global onValuesChange
  clearable?: boolean;       // show clear (X) icon when selected
  showSearch?: boolean;      // internal search box in dropdown (defaults to true for large lists)
  showCountsFromMetaKey?: string; // if provided and option.meta[key] is number, show small badge
  // Auto select behavior: if only one option exists (after load) choose it
  autoSelectSingle?: boolean;
}

export interface TextFilterField extends BaseFilterField {
  type: 'text';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  debounceMs?: number; // optional
  maxLength?: number;
}

export interface CustomFilterField extends BaseFilterField {
  type: 'custom';
  // Provide render function; receives current values and a change setter for that field
  render: (args: { value: any; setValue: (v: any) => void; values: Record<string, Primitive> }) => React.ReactNode;
  value?: any;
}

export interface MultiSelectFilterField extends BaseFilterField {
  type: 'multi-select';
  options: FilterOption[];
  value?: string[]; // array of selected values
  onChange?: (value: string[]) => void;
  maxBadges?: number; // how many badges to show before "+N" summary
  clearable?: boolean;
  placeholder?: string;
  showCountsFromMetaKey?: string;
  enableSearch?: boolean; // show internal search box
}

// NEW: Specialized memorization type select (small static option set)
export interface MemorizationTypeFilterField extends BaseFilterField {
  type: 'memorization-type';
  value?: string | null;
  onChange?: (value: string | null) => void;
  clearable?: boolean; // allow clearing to all
}

// NEW: Session select (loaded only when opened on demand)
export interface SessionSelectItem {
  id: string;
  dateLabel: string; // localized date label
  isToday?: boolean;
  meta?: Record<string, Primitive>;
}

export interface SessionSelectFilterField extends BaseFilterField {
  type: 'session-select';
  // external value
  value?: string | null;
  onChange?: (value: string | null) => void;
  // loader only executed when user first opens the dropdown (on demand)
  loadSessions?: () => Promise<SessionSelectItem[]>;
  // optionally pass preloaded list
  sessions?: SessionSelectItem[];
  disabled?: boolean;
  placeholder?: string;
  collapsible?: boolean; // show collapse toggle (like original block)
  useShadSelect?: boolean; // allow fallback to native select
  inline?: boolean; // treat similar to inline select styling
  hideFieldLabels?: boolean; // override global
  label?: string; // override base for clarity
  showTodayBadge?: boolean; // default true
}

export type FilterField = SelectFilterField | TextFilterField | CustomFilterField | MultiSelectFilterField | MemorizationTypeFilterField | SessionSelectFilterField;

// Action button definitions
export interface FilterAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  onClick?: (values: Record<string, Primitive>) => void | Promise<void>;
  disabled?: boolean;
  tooltip?: string;
  show?: boolean; // conditional display
  order?: number; // for layout ordering
  className?: string; // custom button classes
}

export interface FilterBarProps {
  fields: FilterField[];
  actions?: FilterAction[];
  // Controlled values map; keys = field.id
  values: Record<string, Primitive>;
  onValuesChange?: (values: Record<string, Primitive>) => void;
  onFieldChange?: (fieldId: string, value: Primitive) => void; // single field changed
  // Global actions convenience: reset all, apply
  enableDefaultApplyButton?: boolean; // adds a standard "تصفية" button if true
  enableDefaultResetButton?: boolean; // adds a standard "إعادة تعيين" button if true
  onApply?: (values: Record<string, Primitive>) => void;
  onReset?: () => void;
  // Layout / theme
  className?: string;
  dense?: boolean; // compact height
  stackedOnMobile?: boolean; // vertical stacking at small screens
  dir?: 'rtl' | 'ltr';
  loadingFields?: string[]; // show skeleton/spinner for these IDs
  // Visual
  showFieldLabels?: boolean; // show labels above inputs
  actionsPlacement?: 'end' | 'wrap' | 'bottom'; // if bottom, actions move to new row when narrow
  sticky?: boolean; // make bar sticky (top:0) parent decides container stacking context
}

// === Component ========================================================= //

export const FilterBar: React.FC<FilterBarProps> = ({
  fields,
  actions = [],
  values,
  onValuesChange,
  onFieldChange,
  enableDefaultApplyButton = false,
  enableDefaultResetButton = false,
  onApply,
  onReset,
  className,
  dense = false,
  stackedOnMobile = true,
  dir = 'rtl',
  loadingFields = [],
  showFieldLabels = true,
  actionsPlacement = 'end',
  sticky = false,
}) => {
  // Local state for async loaded options per field ID
  const [asyncOptions, setAsyncOptions] = React.useState<Record<string, FilterOption[]>>({});
  const [loadingAsync, setLoadingAsync] = React.useState<Record<string, boolean>>({});

  const mergedActions: FilterAction[] = React.useMemo(() => {
    const arr: FilterAction[] = [...actions];
    if (enableDefaultApplyButton) {
      arr.push({
        id: '__apply__',
        label: 'تصفية',
        icon: <FilterIcon className="w-4 h-4" />,
        variant: 'primary',
        onClick: (vals) => onApply?.(vals),
        order: 900,
      });
    }
    if (enableDefaultResetButton) {
      arr.push({
        id: '__reset__',
        label: 'إعادة تعيين',
        icon: <RotateCcw className="w-4 h-4" />,
        variant: 'outline',
        onClick: () => onReset?.(),
        order: 910,
      });
    }
    return arr
      .filter(a => a.show !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [actions, enableDefaultApplyButton, enableDefaultResetButton, onApply, onReset]);

  // load async options when field changes or dependencies (values) change
  React.useEffect(() => {
    const load = async (field: SelectFilterField) => {
      if (!field.loadOptions) return;
      setLoadingAsync(p => ({ ...p, [field.id]: true }));
      try {
        const opts = await field.loadOptions({ values });
        setAsyncOptions(p => ({ ...p, [field.id]: opts }));
        if (field.autoSelectSingle && opts.length === 1) {
          handleFieldChange(field.id, opts[0].value);
        }
      } finally {
        setLoadingAsync(p => ({ ...p, [field.id]: false }));
      }
    };
    fields.forEach(f => {
      if ((f.type === 'async-select') && !f.hidden) {
        load(f as SelectFilterField);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.map(f => f.id).join('|'), JSON.stringify(values)]);

  const handleFieldChange = (id: string, value: Primitive) => {
    onFieldChange?.(id, value);
    if (onValuesChange) {
      onValuesChange({ ...values, [id]: value });
    }
  };

  // Reset convenience internal helper (used only if default reset button is active)
  const handleReset = () => {
    const cleared: Record<string, Primitive> = {};
    fields.forEach(f => {
      if (f.type === 'multi-select') cleared[f.id] = [];
      else cleared[f.id] = null;
    });
    onValuesChange?.(cleared);
    onReset?.();
  };

  // Provide accessible label id generation
  const labelId = (id: string) => `filter-label-${id}`;

  // Renderers ------------------------------------------------------------

  const renderSelectField = (field: SelectFilterField) => {
    const isAsync = field.type === 'async-select';
    const selectedValue = (values[field.id] as string) ?? null;
    const options = isAsync ? (asyncOptions[field.id] || []) : (field.options || []);
    const isLoading = loadingAsync[field.id] || loadingFields.includes(field.id);
    const [search, setSearch] = React.useState('');
    const enableSearch = field.showSearch !== false && (field.showSearch === true || options.length > 8); // auto enable if more than 8 options
    const filtered = enableSearch
      ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
      : options;

    return (
      <div key={field.id} className={cn('flex flex-col gap-1 min-w-[160px] flex-1', field.className)}>
        {(field.showLabel === true || (field.showLabel !== false && showFieldLabels)) && field.label && (
          <label id={labelId(field.id)} className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-300 pr-1">
            {field.label}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </label>
        )}
        <div className="relative group">
          <Select
            value={selectedValue || ''}
            onValueChange={(val) => {
              if (val === '__EMPTY__') {
                handleFieldChange(field.id, null);
              } else {
                handleFieldChange(field.id, val || null);
              }
              field.onChange?.(val === '__EMPTY__' ? null : val);
            }}
            disabled={isLoading || (isAsync && options.length === 0 && !isLoading)}
          >
            <SelectTrigger
              dir={field.rtl === false ? 'ltr' : 'rtl'}
              className={cn(
                'h-9 text-right truncate text-[11px] sm:text-xs rounded-md border px-2 pr-2 transition-all bg-white dark:bg-gray-800 shadow-sm',
                selectedValue
                  ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500',
                isLoading && 'opacity-60 cursor-wait'
              )}
              aria-labelledby={field.label ? labelId(field.id) : undefined}
            >
              <SelectValue placeholder={field.placeholder || field.label || 'اختر...'} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              dir={field.rtl === false ? 'ltr' : 'rtl'}
              className="text-right text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-64 overflow-auto"
            >
              {field.clearable !== false && (
                <SelectItem
                  value="__EMPTY__"
                  className={cn(
                    'font-medium',
                    'text-green-700 dark:text-green-200',
                    'cursor-pointer rounded-md transition-colors',
                    'data-[highlighted]:bg-green-900 data-[highlighted]:text-white',
                    'dark:data-[highlighted]:bg-green-700/50',
                    'data-[state=checked]:bg-green-100 dark:data-[state=checked]:bg-green-800',
                    'data-[state=checked]:text-green-800 dark:data-[state=checked]:text-green-200 data-[state=checked]:font-semibold'
                  )}
                >
                  -- الكل --
                </SelectItem>
              )}
              {isLoading && <SelectItem disabled value="__loading__">جار التحميل...</SelectItem>}
              {!isLoading && options.length === 0 && (
                <SelectItem disabled value="__no_options__">لا توجد بيانات</SelectItem>
              )}
              {enableSearch && !isLoading && options.length > 0 && (
                <div className="px-2 pt-1 pb-2 sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <input
                    dir={field.rtl === false ? 'ltr' : 'rtl'}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث..."
                    className="w-full h-7 text-[11px] sm:text-xs rounded-md border px-2 bg-white dark:bg-gray-800 border-green-300 dark:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-400"
                  />
                </div>
              )}
              {!isLoading && enableSearch && filtered.length === 0 && options.length > 0 && (
                <SelectItem disabled value="__no_match__">لا نتائج</SelectItem>
              )}
              {!isLoading && filtered.map(opt => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    'cursor-pointer rounded-md transition-colors text-[11px] sm:text-xs',
                    'data-[highlighted]:bg-green-900 data-[highlighted]:text-white',
                    'dark:data-[highlighted]:bg-green-700/50',
                    'data-[state=checked]:bg-green-100 dark:data-[state=checked]:bg-green-800',
                    'data-[state=checked]:text-green-800 dark:data-[state=checked]:text-green-200 data-[state=checked]:font-semibold'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {opt.icon && <span className="shrink-0 text-base leading-none">
                      {typeof opt.icon === 'string' ? <span>{opt.icon}</span> : opt.icon}
                    </span>}
                    <span className="truncate flex items-center gap-1">
                      {opt.label}
                      {field.showCountsFromMetaKey && typeof opt.meta?.[field.showCountsFromMetaKey] === 'number' && (
                        <span
                          title={
                            field.id === 'teacher'
                              ? 'عدد الحلقات للمعلم'
                              : field.id === 'circle'
                                ? 'عدد الطلاب في الحلقة'
                                : field.id === 'guardian'
                                  ? 'عدد الطلاب المرتبطين بولي الأمر'
                                  : 'العدد'
                          }
                          className={cn(
                            'inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm',
                            field.id === 'teacher' && 'bg-emerald-600 text-white',
                            field.id === 'circle' && 'bg-blue-600 text-white',
                            field.id === 'guardian' && 'bg-amber-600 text-white',
                            field.id !== 'teacher' && field.id !== 'circle' && field.id !== 'guardian' && 'bg-emerald-600 text-white',
                            // توحيد لون شارة "جميع" إلى أزرق (Blue) لكل الحقول
                            opt.value === '__ALL__' && 'bg-red-500 ring-1 ring-red-300/70 shadow-sm hover:bg-red-500/90 text-white transition-colors duration-150',
                          )}
                        >
                          {/* number first then icon */}
                          {opt.meta?.[field.showCountsFromMetaKey] as number}
                          {field.id === 'teacher'
                            ? <span className="text-[11px] leading-none">🕋</span>
                            : field.id === 'circle'
                              ? <span className="text-[11px] leading-none">🧑</span>
                              : field.id === 'guardian'
                                ? <span className="text-[11px] leading-none">🧑</span>
                                : <Users className="w-3 h-3" />}
                        </span>
                      )}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.clearable !== false && selectedValue && (
            <button
              type="button"
              onClick={() => handleFieldChange(field.id, null)}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 z-10',
                // ضع الزر داخل مساحة التريجر قبل السهم مباشرة (في RTL السهم يكون أقصى اليسار غالباً)
                field.rtl === false ? 'right-6' : 'left-6',
                'p-0.5 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-700'
              )}
              aria-label="مسح الحقل"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTextField = (field: TextFilterField) => {
    const [internal, setInternal] = React.useState<string>(field.value || String(values[field.id] || ''));
    const debounce = field.debounceMs ?? 300;

    React.useEffect(() => {
      const h = setTimeout(() => {
        handleFieldChange(field.id, internal);
        field.onChange?.(internal);
      }, debounce);
      return () => clearTimeout(h);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [internal]);

    return (
      <div key={field.id} className={cn('flex flex-col gap-1 min-w-[160px] flex-1', field.className)}>
        {(field.showLabel === true || (field.showLabel !== false && showFieldLabels)) && field.label && (
          <label id={labelId(field.id)} className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-300 pr-1">
            {field.label}
          </label>
        )}
        <div className="relative">
          <input
            dir={field.rtl === false ? 'ltr' : 'rtl'}
            type="text"
            maxLength={field.maxLength}
            value={internal}
            onChange={(e) => setInternal(e.target.value)}
            placeholder={field.placeholder || field.label || ''}
            className={cn(
              'h-9 w-full text-right truncate text-[11px] sm:text-xs rounded-md border px-2 transition-all focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-gray-800 shadow-sm',
              internal ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold' : 'border-gray-300 dark:border-gray-600 text-gray-500'
            )}
            aria-labelledby={field.label ? labelId(field.id) : undefined}
          />
          {internal && (
            <button
              type="button"
              onClick={() => setInternal('')}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              aria-label="مسح الحقل"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCustomField = (field: CustomFilterField) => {
    const val = values[field.id];
    return (
      <div key={field.id} className={cn('flex flex-col gap-1 min-w-[140px]', field.className)}>
        {(field.showLabel === true || (field.showLabel !== false && showFieldLabels)) && field.label && (
          <label id={labelId(field.id)} className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-300 pr-1">
            {field.label}
          </label>
        )}
        {field.render({ value: val, setValue: (v) => handleFieldChange(field.id, v), values })}
      </div>
    );
  };

  const renderMultiSelectField = (field: MultiSelectFilterField) => {
    const selected: string[] = Array.isArray(values[field.id]) ? (values[field.id] as any) : (field.value || []);
    // store search queries for multi-select fields so they persist when popover re-opens
    const queryRef = React.useRef<Record<string, string>>({});
    const [, forceRender] = React.useState(0);
    const query = queryRef.current[field.id] || '';
    const setQuery = (val: string) => {
      queryRef.current[field.id] = val;
      forceRender(x => x + 1);
    };
    const toggle = (val: string) => {
      let next: string[];
      if (selected.includes(val)) next = selected.filter(v => v !== val); else next = [...selected, val];
      handleFieldChange(field.id, next);
      field.onChange?.(next);
    };
    const clearAll = () => {
      handleFieldChange(field.id, []);
      field.onChange?.([]);
    };
    const maxBadges = field.maxBadges ?? 3;
    const shown = selected.slice(0, maxBadges);
    const extra = selected.length - shown.length;
    const selectedLabels = field.options.filter(o => selected.includes(o.value));
    return (
      <div key={field.id} className={cn('flex flex-col gap-1 min-w-[200px] flex-1', field.className)}>
        {(field.showLabel === true || (field.showLabel !== false && showFieldLabels)) && field.label && (
          <label id={labelId(field.id)} className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-300 pr-1">
            {field.label}
          </label>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-9 w-full text-right px-2 rounded-md border text-[11px] sm:text-xs flex items-center gap-1 bg-white dark:bg-gray-800 shadow-sm transition',
                selected.length
                  ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500'
              )}
              aria-labelledby={field.label ? labelId(field.id) : undefined}
            >
              {selected.length === 0 && (
                <span className="truncate opacity-70">{field.placeholder || field.label || 'اختر...'}</span>
              )}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                  {shown.map(v => {
                    const opt = field.options.find(o => o.value === v);
                    return (
                      <span key={v} className="inline-flex items-center gap-1 bg-emerald-600 text-white rounded-full px-2 py-0.5 text-[10px]">
                        {opt?.label || v}
                        <button type="button" className="ml-0.5 hover:text-red-200" onClick={(e) => { e.stopPropagation(); toggle(v); }}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {extra > 0 && (
                    <span className="inline-flex items-center bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-100 rounded-full px-2 py-0.5 text-[10px]">+{extra}</span>
                  )}
                </div>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 max-h-72 overflow-auto p-2 text-[11px] sm:text-xs" dir={dir}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-700 dark:text-green-200">{field.label || 'اختيار'}</span>
              {field.clearable !== false && selected.length > 0 && (
                <button onClick={clearAll} className="text-red-500 hover:underline text-[10px]">مسح</button>
              )}
            </div>
            {field.enableSearch && (
              <div className="mb-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث..."
                  className="w-full h-8 text-[11px] sm:text-xs rounded-md border px-2 bg-white dark:bg-gray-800 border-green-300 dark:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-400"
                  dir="rtl"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              {field.options.length === 0 && (
                <div className="text-gray-400 text-center py-4">لا توجد بيانات</div>
              )}
              {field.options
                .filter(opt => !field.enableSearch || query.trim() === '' || opt.label.toLowerCase().includes(query.toLowerCase()))
                .map(opt => {
                  const checked = selected.includes(opt.value);
                  return (
                    <label key={opt.value} className={cn('flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30', checked && 'bg-emerald-100 dark:bg-emerald-900/40')}>
                      <Checkbox checked={checked} onCheckedChange={() => toggle(opt.value)} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                      <span className="flex-1 truncate flex items-center gap-1">
                        {opt.label}
                        {field.showCountsFromMetaKey && typeof opt.meta?.[field.showCountsFromMetaKey] === 'number' && (
                          <span
                            title={
                              field.id === 'teacher'
                                ? 'عدد الحلقات للمعلم'
                                : field.id === 'circle'
                                  ? 'عدد الطلاب في الحلقة'
                                  : field.id === 'guardian'
                                    ? 'عدد الطلاب المرتبطين بولي الأمر'
                                    : 'العدد'
                            }
                            className={cn(
                              'inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm',
                              field.id === 'teacher' && 'bg-emerald-600 text-white',
                              field.id === 'circle' && 'bg-blue-600 text-white',
                              field.id === 'guardian' && 'bg-amber-600 text-white',
                              field.id !== 'teacher' && field.id !== 'circle' && field.id !== 'guardian' && 'bg-emerald-600 text-white',
                              // توحيد خيار الجميع إلى أصفر
                              opt.value === '__ALL__' && 'bg-amber-500 ring-1 ring-amber-300/70 shadow-sm hover:bg-amber-500/90'
                            )}
                          >
                            {opt.meta?.[field.showCountsFromMetaKey] as number}
                            {field.id === 'teacher'
                              ? <span className="text-[11px] leading-none">🕋</span>
                              : field.id === 'circle'
                                ? <span className="text-[11px] leading-none">🧑</span>
                                : field.id === 'guardian'
                                  ? <span className="text-[11px] leading-none">🧑</span>
                                  : <Users className="w-3 h-3" />}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
            </div>
            {selectedLabels.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-emerald-200 dark:border-emerald-800 text-[10px] flex flex-wrap gap-1">
                {selectedLabels.map(o => (
                  <span key={o.value} className="bg-emerald-600 text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    {o.label}
                    <button type="button" onClick={() => toggle(o.value)} className="hover:text-red-200"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  // Specialized memorization-type renderer (fixed small list; color badges inside menu)
  const renderMemorizationTypeField = (field: MemorizationTypeFilterField) => {
    const selectedValue = (values[field.id] as string) ?? null;
    const options = memorizationTypeOptions; // [{value,label}]
    return (
      <div key={field.id} className={cn('flex flex-col gap-1 min-w-[140px] flex-1', field.className)}>
        {(field.showLabel === true || (field.showLabel !== false && showFieldLabels)) && field.label && (
          <label id={labelId(field.id)} className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-300 pr-1">
            {field.label}
          </label>
        )}
        <div className="relative group">
          <Select
            value={selectedValue || ''}
            onValueChange={(val) => {
              if (val === '__EMPTY__') {
                handleFieldChange(field.id, null);
                field.onChange?.(null);
              } else {
                handleFieldChange(field.id, val || null);
                field.onChange?.(val || null);
              }
            }}
          >
            <SelectTrigger
              dir="rtl"
              className={cn(
                'h-9 text-right truncate text-[11px] sm:text-xs rounded-md border px-2 pr-2 transition-all bg-white dark:bg-gray-800 shadow-sm',
                selectedValue
                  ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500'
              )}
              aria-labelledby={field.label ? labelId(field.id) : undefined}
            >
              <SelectValue placeholder={field.label || 'نوع الحفظ'} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              dir="rtl"
              className="text-right text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-60 overflow-auto"
            >
              {field.clearable !== false && (
                <SelectItem
                  value="__EMPTY__"
                  className={cn(
                    'font-medium',
                    'text-green-700 dark:text-green-200',
                    'cursor-pointer rounded-md transition-colors',
                    'data-[highlighted]:bg-green-900 data-[highlighted]:text-white',
                    'dark:data-[highlighted]:bg-green-700/50',
                    'data-[state=checked]:bg-green-100 dark:data-[state=checked]:bg-green-800',
                    'data-[state=checked]:text-green-800 dark:data-[state=checked]:text-green-200 data-[state=checked]:font-semibold'
                  )}
                >
                  -- الكل --
                </SelectItem>
              )}
              {options.map(opt => {
                const colorClasses = getMemorizationTypeColor(opt.value as any);
                return (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      'cursor-pointer rounded-md transition-colors text-[11px] sm:text-xs flex items-center gap-2',
                      'data-[highlighted]:bg-green-900 data-[highlighted]:text-white',
                      'dark:data-[highlighted]:bg-green-700/50',
                      'data-[state=checked]:bg-green-100 dark:data-[state=checked]:bg-green-800',
                      'data-[state=checked]:text-green-800 dark:data-[state=checked]:text-green-200 data-[state=checked]:font-semibold'
                    )}
                  >
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium', colorClasses)}>
                      {getMemorizationTypeName(opt.value as any)}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {field.clearable !== false && selectedValue && (
            <button
              type="button"
              onClick={() => handleFieldChange(field.id, null)}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 z-10',
                'left-6',
                'p-0.5 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-700'
              )}
              aria-label="مسح الحقل"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Session select (on-demand load when first opened)
  const sessionLoadState = React.useRef<Record<string, { loaded: boolean; loading: boolean; sessions: SessionSelectItem[] }>>({});
  const [, forceSessionsRender] = React.useState(0);
  const renderSessionSelectField = (field: SessionSelectFilterField) => {
    const st = sessionLoadState.current[field.id] || { loaded: false, loading: false, sessions: field.sessions || [] };
    sessionLoadState.current[field.id] = st; // ensure ref
    // keep external sessions prop in sync if provided each render (allow controlled refresh)
    if (field.sessions && field.sessions !== st.sessions && !st.loading) {
      st.sessions = field.sessions;
      st.loaded = true;
    }
    const selectedValue = (values[field.id] as string) ?? null;
    const [open, setOpen] = React.useState(false);
    const [collapsed, setCollapsed] = React.useState(false);
    const label = field.label || 'الجلسة';
    const placeholder = field.placeholder || (st.sessions.length === 0 && st.loaded ? 'لا توجد جلسات' : 'اختر جلسة');

    const triggerLoad = async () => {
      if (!st.loaded && !st.loading && field.loadSessions) {
        st.loading = true; forceSessionsRender(x => x + 1);
        try {
          const data = await field.loadSessions();
          st.sessions = data || [];
          st.loaded = true;
        } finally {
          st.loading = false; forceSessionsRender(x => x + 1);
        }
      }
    };

    // when dropdown opens first time, load
    React.useEffect(() => {
      if (open) triggerLoad();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const onChange = (val: string | null) => {
      handleFieldChange(field.id, val);
      field.onChange?.(val);
    };

    const sessions = st.sessions;
    const disabled = field.disabled || (st.loaded && sessions.length === 0);
    const showTodayBadge = field.showTodayBadge !== false;

    return (
      <div key={field.id} className={cn('flex flex-col gap-1 min-w-[160px] flex-1', field.className)}>
        {(field.showLabel === true || (field.showLabel !== false && showFieldLabels && !field.hideFieldLabels)) && (
          <div className="flex items-center justify-between">
            <label className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-300 pr-1">{label}</label>
            {field.collapsible && (
              <button
                type="button"
                onClick={() => setCollapsed(c => !c)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'فتح حقل الجلسة' : 'طي حقل الجلسة'}
                className={cn('h-6 w-6 inline-flex items-center justify-center rounded-full border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition', collapsed && 'rotate-180')}
              >
                <CollapseChevron className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className={cn('transition-all duration-300 ease-in-out origin-top', collapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-40 opacity-100')} aria-hidden={collapsed}>
          {field.useShadSelect !== false ? (
            <Select
              open={open}
              onOpenChange={(o) => { setOpen(o); if (o) triggerLoad(); }}
              disabled={disabled}
              value={selectedValue || ''}
              onValueChange={(val) => onChange(val || null)}
            >
              <SelectTrigger
                dir="rtl"
                className={cn(
                  'h-9 text-right truncate max-w-full min-w-0 text-[11px] sm:text-xs rounded-md border px-2 pr-2 transition-all focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-gray-800 shadow-sm',
                  selectedValue
                    ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500',
                  disabled && 'opacity-60 cursor-not-allowed'
                )}
              >
                <SelectValue placeholder={st.loading ? 'جار التحميل...' : placeholder} />
              </SelectTrigger>
              <SelectContent
                position="popper"
                dir="rtl"
                className="text-right text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-64 overflow-auto"
              >
                {st.loading && <SelectItem disabled value="__loading__">جار التحميل...</SelectItem>}
                {!st.loading && sessions.length === 0 && <SelectItem value="__none__" disabled>لا توجد جلسات</SelectItem>}
                {sessions.map(s => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="cursor-pointer rounded-[4px] px-2 py-1.5 transition-colors data-[highlighted]:bg-green-800 data-[highlighted]:text-white dark:data-[highlighted]:bg-green-700 data-[state=checked]:bg-green-700 data-[state=checked]:text-white flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-100 dark:from-emerald-800 dark:to-emerald-700 shadow-sm ring-1 ring-emerald-300/50 dark:ring-emerald-600/40">
                        <CalendarDays className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-200" />
                      </span>
                      <span className="truncate">{s.dateLabel}</span>
                      {showTodayBadge && s.isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white">اليوم</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <select
              disabled={disabled}
              value={selectedValue || ''}
              onChange={(e) => onChange(e.target.value || null)}
              onClick={() => triggerLoad()}
              className={cn('h-9 w-full text-right truncate max-w-full min-w-0 text-[11px] sm:text-xs rounded-lg border px-2 pr-8 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800', selectedValue ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold' : 'border-gray-300 dark:border-gray-600 text-gray-500', disabled && 'opacity-60 cursor-not-allowed', 'appearance-none')}
            >
              <option value="">{st.loading ? 'جار التحميل...' : placeholder}</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.dateLabel}{s.isToday ? ' (اليوم)' : ''}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  };

  const fieldRenderers: Record<FilterFieldType, (f: any) => React.ReactNode> = {
    'select': renderSelectField,
    'async-select': renderSelectField,
    'text': renderTextField,
    'custom': renderCustomField,
    'multi-select': renderMultiSelectField,
    'memorization-type': renderMemorizationTypeField,
    'session-select': renderSessionSelectField,
  };

  const visibleFields = fields.filter(f => !f.hidden);

  // Layout classes -------------------------------------------------------
  const baseHeight = dense ? 'py-2' : 'py-3';
  const containerClasses = cn(
    'w-full bg-transparent',
    baseHeight,
    stackedOnMobile ? 'flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end' : 'flex flex-wrap items-end gap-3',
    sticky && 'sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/60',
    className
  );

  const actionsNode = (
    <div className="flex items-stretch gap-2 flex-wrap">
      {mergedActions.map(a => (
        <button
          key={a.id}
          type="button"
          onClick={() => a.onClick?.(values)}
          disabled={a.disabled}
          title={a.tooltip || a.label}
          className={cn(
            'h-9 px-3 rounded-md text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 transition border shadow-sm',
            a.variant === 'primary' && 'bg-green-600 hover:bg-green-700 text-white border-green-600',
            a.variant === 'secondary' && 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300 dark:bg-green-800 dark:hover:bg-green-700 dark:text-green-100 dark:border-green-700',
            a.variant === 'outline' && 'bg-white dark:bg-gray-900 text-green-700 dark:text-green-200 border-green-300 hover:bg-green-50 dark:hover:bg-green-800',
            a.variant === 'ghost' && 'bg-transparent border-transparent hover:bg-green-50 dark:hover:bg-green-800 text-green-700 dark:text-green-200',
            a.variant === 'danger' && 'bg-red-600 hover:bg-red-700 text-white border-red-600',
            !a.variant && 'bg-green-600 hover:bg-green-700 text-white border-green-600',
            a.disabled && 'opacity-60 cursor-not-allowed',
            a.className
          )}
        >
          {a.icon && <span className="shrink-0">{a.icon}</span>}
          <span>{a.label}</span>
        </button>
      ))}
      {enableDefaultResetButton && !mergedActions.some(a => a.id === '__reset__') && (
        <button
          type="button"
          onClick={handleReset}
          className="h-9 px-3 rounded-md text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 transition border shadow-sm bg-white dark:bg-gray-900 text-green-700 dark:text-green-200 border-green-300 hover:bg-green-50 dark:hover:bg-green-800"
        >
          <RotateCcw className="w-4 h-4" />
          <span>إعادة تعيين</span>
        </button>
      )}
    </div>
  );

  return (
    <div dir={dir} className={containerClasses}>
      <div className={cn('flex flex-1 flex-wrap gap-3 items-end', actionsPlacement === 'bottom' && 'md:items-end')}>
        {visibleFields.map(f => fieldRenderers[f.type](f as any))}
      </div>
      {actionsPlacement === 'end' && (
        <div className="flex items-end justify-start md:justify-end gap-2 mt-3 md:mt-0 md:ml-auto">
          {actionsNode}
        </div>
      )}
      {actionsPlacement === 'wrap' && actionsNode}
      {actionsPlacement === 'bottom' && (
        <div className="w-full pt-2 border-t border-dashed border-emerald-200 dark:border-emerald-800">{actionsNode}</div>
      )}
    </div>
  );
};

export default FilterBar;
