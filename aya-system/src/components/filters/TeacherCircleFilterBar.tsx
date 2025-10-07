import React from 'react';
import { cn } from '@/lib/utils'; // إن وُجد util للدمج، وإلا استبدلها بخيار آخر
import { ChevronDown, GraduationCap, BookOpen, X, Plus } from 'lucide-react';
// استيراد عناصر Select من مكتبة المشروع (يفترض وجودها بنفس المسارات، عدّل إذا اختلفت)
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select';

/**
 * TeacherCircleFilterBar
 * مكوّن فلترة عام قابل لإعادة الاستخدام مستلهم من نمط شاشة السجلات.
 * يحتوي فقط على:
 * - حقل بحث نصي للبحث في المعلمين أو الحلقات (حسب الصفحة التي تدمجه فيها)
 * - زر/قائمة اختيار المعلم
 * - زر/قائمة اختيار الحلقة
 *
 * لا يدير حالة الحوارات الداخلية لاختيار المعلم/الحلقات؛ يُفترض أن الصفحة الأم توفّر ذلك إن احتاجت.
 * هنا نعرض فقط أزرار تفتح حوارات خارجية (callback) أو قد تُستبدل بـ <select> بسيط لو رغبت لاحقاً.
 */
export interface BasicEntity {
    id: string;
    name: string;
    circles_count?: number; // للمعلم
    teacher_id?: string;    // للحلقة (إن احتجت ربطها بمعلم)
}

export interface TeacherCircleFilterBarProps {
    teachers: BasicEntity[];            // قائمة المعلمين المتاحة
    circles: BasicEntity[];             // قائمة الحلقات المتاحة (قد تتبع المعلم المختار)
    selectedTeacherId: string | null;   // المعلّم المحدد حالياً (أو null)
    selectedCircleId: string | null;    // الحلقة المحددة حالياً (أو null)
    searchQuery: string;                // قيمة البحث الحالية
    onSearchChange: (value: string) => void; // تغيير البحث
    onTeacherClick?: () => void;        // يفتح حوار اختيار المعلم الخارجي
    onCircleClick?: () => void;         // يفتح حوار اختيار الحلقة الخارجي
    onClearTeacher?: () => void;        // مسح اختيار المعلم
    onClearCircle?: () => void;         // مسح اختيار الحلقة
    disabled?: boolean;                 // تعطيل كامل المكوّن
    showCounts?: boolean;               // إظهار عدد الحلقات للمعلم إذا متاح
    className?: string;                 // صنف إضافي للحاوية
    teacherLabel?: string;              // نص مخصص لزر المعلم
    circleLabel?: string;               // نص مخصص لزر الحلقة
    searchPlaceholder?: string;         // نص placeholder للبحث
    useInlineSelects?: boolean;         // عند التفعيل: اعرض حقول select بدلاً من الأزرار (بدون حوارات)
    useShadSelect?: boolean;            // عند التفعيل مع useInlineSelects استخدم مكوّن Select بدلاً من <select>
    onTeacherChange?: (id: string | null) => void; // تغيير مباشر للمعلم في وضع select
    onCircleChange?: (id: string | null) => void;  // تغيير مباشر للحلقة في وضع select
    // دمج زر إضافة داخل شريط الفلترة
    showAddButton?: boolean;
    onAddClick?: () => void;
    addButtonLabel?: string;
    addButtonTooltip?: string;
    showExportButton?: boolean;
    onExportClick?: () => void;
    exportButtonLabel?: string;
    requireCircleBeforeAdd?: boolean; // إظهار زر الإضافة فقط بعد اختيار حلقة
}

export const TeacherCircleFilterBar: React.FC<TeacherCircleFilterBarProps> = ({
    teachers,
    circles,
    selectedTeacherId,
    selectedCircleId,
    searchQuery,
    onSearchChange,
    onTeacherClick,
    onCircleClick,
    onClearTeacher,
    onClearCircle,
    disabled,
    showCounts = true,
    className,
    teacherLabel = 'اختر معلماً',
    circleLabel = 'اختر حلقة',
    searchPlaceholder = '🔍 بحث عن معلم أو حلقة...',
    useInlineSelects = false,
    useShadSelect = false,
    onTeacherChange,
    onCircleChange,
    showAddButton = false,
    onAddClick,
    addButtonLabel = 'إضافة',
    addButtonTooltip,
    showExportButton = false,
    onExportClick,
    exportButtonLabel = 'تصدير',
    requireCircleBeforeAdd = false
}) => {
    const selectedTeacher = selectedTeacherId ? teachers.find(t => t.id === selectedTeacherId) : undefined;
    const selectedCircle = selectedCircleId ? circles.find(c => c.id === selectedCircleId) : undefined;

    return (
        <div
            dir="rtl"
            className={cn(
                'flex flex-col md:flex-row justify-between items-stretch gap-1.5 md:gap-2 w-full p-1.5',
                'bg-transparent',
                className,
                disabled && 'opacity-60 pointer-events-none'
            )}
        >
            {/* اختيار المعلم */}
            <div className="flex-1 min-w-[160px] flex flex-col gap-1 relative">
                                {useInlineSelects ? (
                    <div className="grid gap-1.5 w-full">
                        <label className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-300 pr-1">المعلم</label>
                                                {useShadSelect ? (
                                                    <Select
                                                        disabled={disabled || teachers.length === 0}
                                                        value={selectedTeacherId || ''}
                                                        onValueChange={(val) => onTeacherChange && onTeacherChange(val || null)}
                                                    >
                                                        <SelectTrigger
                                                            dir="rtl"
                                                            className={cn(
                                                                'h-9 text-right truncate max-w-full min-w-0 text-[11px] sm:text-xs rounded-md border px-2 pr-2 transition-all',
                                                                'focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-gray-800 shadow-sm',
                                                                selectedTeacherId
                                                                    ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                                                                    : 'border-gray-300 dark:border-gray-600 text-gray-500',
                                                                (disabled || teachers.length === 0) && 'opacity-60 cursor-not-allowed'
                                                            )}
                                                        >
                                                            <SelectValue placeholder={teacherLabel} />
                                                        </SelectTrigger>
                                                        <SelectContent
                                                            position="popper"
                                                            dir="rtl"
                                                            className="text-right text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-64 overflow-auto"
                                                        >
                                                            {teachers.length > 0 ? (
                                                                teachers.map(t => (
                                                                    <SelectItem
                                                                        key={t.id}
                                                                        value={t.id}
                                                                        className="cursor-pointer rounded-[4px] px-2 py-1.5 transition-colors data-[highlighted]:bg-green-800 data-[highlighted]:text-white dark:data-[highlighted]:bg-green-700 data-[state=checked]:bg-green-700 data-[state=checked]:text-white"
                                                                    >
                                                                        {t.name}{showCounts && t.circles_count != null ? ` (${t.circles_count} حلقة)` : ''}
                                                                    </SelectItem>
                                                                ))
                                                            ) : (
                                                                <SelectItem value="no-teachers" disabled>لا يوجد معلمون</SelectItem>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <select
                                                            disabled={disabled || teachers.length === 0}
                                                            value={selectedTeacherId || ''}
                                                            onChange={(e) => {
                                                                    const val = e.target.value || null;
                                                                    onTeacherChange && onTeacherChange(val || null);
                                                            }}
                                                            className={`h-9 w-full text-right truncate max-w-full min-w-0 text-[11px] sm:text-xs rounded-lg border px-2 pr-8 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800 ${selectedTeacherId ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold' : 'border-gray-300 dark:border-gray-600 text-gray-500'} ${disabled || teachers.length===0 ? 'opacity-60 cursor-not-allowed' : ''} appearance-none`}
                                                    >
                                                            <option value="">{teacherLabel}</option>
                                                            {teachers.map(t => (
                                                                    <option key={t.id} value={t.id}>{t.name}{showCounts && t.circles_count != null ? ` (${t.circles_count} حلقة)` : ''}</option>
                                                            ))}
                                                    </select>
                                                )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onTeacherClick}
                        disabled={disabled || teachers.length === 0}
                        className={cn(
                            'group relative w-full h-10 px-3 rounded-xl border text-right transition-all duration-200 flex items-center justify-between overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed',
                            selectedTeacher
                                ? 'border-emerald-400 bg-gradient-to-br from-white to-emerald-50/60 dark:from-emerald-900/30 dark:to-emerald-900'
                                : 'border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-950',
                            'hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50'
                        )}
                        title={teacherLabel}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600">
                                <GraduationCap className="h-4 w-4" />
                            </div>
                            <span className={cn('truncate text-sm', selectedTeacher ? 'text-emerald-700 font-medium' : 'text-gray-500')}>
                                {selectedTeacher ? selectedTeacher.name : teacherLabel}
                            </span>
                            {showCounts && selectedTeacher?.circles_count != null && (
                                <span className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-emerald-50 ring-1 ring-emerald-400/50 shadow-sm shrink-0">
                                    {selectedTeacher.circles_count} حلقة
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 pl-1">
                            <ChevronDown className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className="pointer-events-none absolute inset-0 rounded-xl border border-transparent group-hover:border-emerald-300/60" />
                    </button>
                )}
            </div>

            {/* اختيار الحلقة + زر الإضافة (موبايل) */}
            <div className="flex-1 min-w-[160px] flex flex-col gap-1 relative">
                {useInlineSelects ? (
                    <div className="w-full">
                        <label className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-300 pr-1 block mb-1">الحلقة</label>
                        <div className="flex items-stretch gap-1">
                            <div className="flex-1 min-w-0">
                                {useShadSelect ? (
                                    <Select
                                        disabled={disabled || circles.length === 0}
                                        value={selectedCircleId || ''}
                                        onValueChange={(val) => onCircleChange && onCircleChange(val || null)}
                                    >
                                        <SelectTrigger
                                            dir="rtl"
                                            className={cn(
                                                'h-9 text-right truncate max-w-full min-w-0 text-[11px] sm:text-xs rounded-lg border px-2 pr-2 transition-all',
                                                'focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800',
                                                selectedCircleId
                                                    ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                                                    : 'border-gray-300 dark:border-gray-600 text-gray-500',
                                                (disabled || circles.length === 0) && 'opacity-60 cursor-not-allowed'
                                            )}
                                        >
                                            <SelectValue placeholder={circles.length === 0 ? 'لا توجد حلقات' : circleLabel} />
                                        </SelectTrigger>
                                        <SelectContent
                                            position="popper"
                                            dir="rtl"
                                            className="text-right text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-64 overflow-auto"
                                        >
                                            {circles.length > 0 ? (
                                                circles.map(c => (
                                                    <SelectItem
                                                        key={c.id}
                                                        value={c.id}
                                                        className="cursor-pointer rounded-[4px] px-2 py-1.5 transition-colors data-[highlighted]:bg-green-800 data-[highlighted]:text-white dark:data-[highlighted]:bg-green-700 data-[state=checked]:bg-green-700 data-[state=checked]:text-white"
                                                    >
                                                        {c.name}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="no-circles" disabled>لا توجد حلقات</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <select
                                        disabled={disabled || circles.length === 0}
                                        value={selectedCircleId || ''}
                                        onChange={(e) => {
                                            const val = e.target.value || null;
                                            onCircleChange && onCircleChange(val || null);
                                        }}
                                        className={`h-9 w-full text-right truncate max-w-full min-w-0 text-[11px] sm:text-xs rounded-lg border px-2 pr-8 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800 ${selectedCircleId ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold' : 'border-gray-300 dark:border-gray-600 text-gray-500'} ${disabled || circles.length===0 ? 'opacity-60 cursor-not-allowed' : ''} appearance-none`}
                                    >
                                        <option value="">{circles.length === 0 ? 'لا توجد حلقات' : circleLabel}</option>
                                        {circles.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {showAddButton && (!requireCircleBeforeAdd || selectedCircleId) && (
                                <button
                                    type="button"
                                    onClick={onAddClick}
                                    className="h-9 md:hidden flex items-center justify-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-sm transition-colors px-3 text-[11px] font-medium flex-shrink-0"
                                    title={addButtonTooltip || addButtonLabel}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-stretch gap-1">
                        <button
                            type="button"
                            onClick={onCircleClick}
                            disabled={disabled || circles.length === 0}
                            className={cn(
                                'group relative w-full h-10 px-3 rounded-xl border text-right transition-all duration-200 flex items-center justify-between overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed',
                                selectedCircle
                                    ? 'border-emerald-400 bg-gradient-to-br from-white to-emerald-50/60 dark:from-emerald-900/30 dark:to-emerald-900'
                                    : 'border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-950',
                                'hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50'
                            )}
                            title={circleLabel}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="h-7 w-7 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600">
                                    <BookOpen className="h-4 w-4" />
                                </div>
                                <span className={cn('truncate text-sm', selectedCircle ? 'text-emerald-700 font-medium' : 'text-gray-500')}>
                                    {selectedCircle ? selectedCircle.name : circles.length === 0 ? 'لا توجد حلقات' : circleLabel}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 pl-1">
                                <ChevronDown className="h-4 w-4 text-emerald-500" />
                            </div>
                            <span className="pointer-events-none absolute inset-0 rounded-xl border border-transparent group-hover:border-emerald-300/60" />
                        </button>
                        {showAddButton && (!requireCircleBeforeAdd || selectedCircleId) && (
                            <button
                                type="button"
                                onClick={onAddClick}
                                className="h-10 md:hidden flex items-center justify-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-sm transition-colors px-3 text-[11px] font-medium flex-shrink-0"
                                title={addButtonTooltip || addButtonLabel}
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>
            {/* زر الإضافة (سطح المكتب) */}
            {showAddButton && (
                <div className="hidden md:flex md:w-auto flex-col gap-1 items-stretch justify-end">
                    {(!requireCircleBeforeAdd || selectedCircleId) && (
                        <button
                            type="button"
                            onClick={onAddClick}
                            className="h-10 flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-sm transition-colors px-4 text-[12px] font-medium"
                            title={addButtonTooltip || addButtonLabel}
                        >
                            <Plus className="w-4 h-4" />
                            <span>{addButtonLabel}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherCircleFilterBar;
