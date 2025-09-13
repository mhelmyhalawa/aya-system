import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { BookOpen, List, LayoutGrid, Plus, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// تعريف واجهة العمود للجدول العام
export interface Column<T> {
    key: string; // مفتاح البيانات
    header: string; // عنوان العمود
    width?: string; // عرض العمود (اختياري)
    align?: 'left' | 'center' | 'right'; // محاذاة العمود (اختياري)
    render?: (item: T) => React.ReactNode; // دالة لتخصيص عرض الخلية (اختياري)
    important?: boolean; // لتحديد الأعمدة المهمة للعرض في البطاقات
}

// مكون الجدول العام القابل لإعادة الاستخدام
export function GenericTable<T extends { id: string }>(props: {
    data: T[];
    columns: Column<T>[];
    emptyMessage?: string;
    className?: string;
    rowClassName?: string;
    getRowClassName?: (item: T, index: number) => string;
    defaultView?: 'table' | 'card';
    cardActions?: (item: T) => React.ReactNode; // إجراءات ثانوية (أزرار صغيرة)
    cardPrimaryActions?: (item: T) => React.ReactNode; // إجراءات رئيسية في الفوتر
    cardMaxFieldsCollapsed?: number; // عدد الحقول المعروضة في الوضع المطوي
    enableCardExpand?: boolean; // تفعيل زر إظهار المزيد
    onCardClick?: (item: T) => void; // حدث عند الضغط على البطاقة
    highlightOnHover?: boolean; // تمييز البطاقة عند المرور
    onAddNew?: () => void;
    onRefresh?: () => void;
    title?: string;
}) {
    const {
        data,
        columns,
        emptyMessage = 'لا توجد بيانات',
        className = '',
        rowClassName = '',
        getRowClassName,
        defaultView = 'card',
        cardActions,
        cardPrimaryActions,
        cardMaxFieldsCollapsed = 6,
        enableCardExpand = true,
        onCardClick,
        highlightOnHover = true,
        onAddNew,
        onRefresh,
        title = 'البيانات',
    } = props;

    const [viewMode, setViewMode] = useState<'table' | 'card'>(defaultView);
    const isMobile = useIsMobile();

    // فرض نمط البطاقات على الموبايل
    useEffect(() => {
        if (isMobile) setViewMode('card');
    }, [isMobile]);

    return (
        <div className={cn('w-full overflow-hidden', className)}>
            {/* العنوان وأدوات التحكم */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 p-4 rounded-2xl shadow-lg bg-gradient-to-r from-green-50 via-white to-green-50 dark:from-green-900/30 dark:via-green-800/20 dark:to-green-900/10 border border-green-200 dark:border-green-700">
                {/* القسم الأيسر: العنوان + العدد */}
                <div className="flex items-center gap-3 hidden md:flex">
                    {/* العنوان للـ desktop */}
                    <span className="hidden sm:inline text-green-900 dark:text-green-100 font-extrabold text-lg sm:text-xl tracking-wide">
                        {title}
                    </span>
                </div>

                {/* أزرار العرض */}
                <div className="flex items-center gap-3">
                    {/* عدد السجلات */}
                    <div
                        title="عدد السجلات"
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow-md text-sm"
                    >
                        <Hash className="h-4 w-4 text-white/90" />
                        {data.length}
                    </div>

                    {/* زر عرض الجدول */}
                    <Button
                        onClick={() => setViewMode("table")}
                        size="sm"
                        className={cn(
                            "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg shadow-md transition-all duration-200",
                            viewMode === "table"
                                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                                : "bg-white dark:bg-green-800 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-700"
                        )}
                        title="عرض الجدول"
                    >
                        <List className="h-5 w-5" />
                        <span className="hidden sm:inline font-medium">جدول</span>
                    </Button>

                    {/* زر عرض البطاقات */}
                    <Button
                        onClick={() => setViewMode("card")}
                        size="sm"
                        className={cn(
                            "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg shadow-md transition-all duration-200",
                            viewMode === "card"
                                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                                : "bg-white dark:bg-green-800 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-700"
                        )}
                        title="عرض البطاقات"
                    >
                        <LayoutGrid className="h-5 w-5" />
                        <span className="hidden sm:inline font-medium">بطاقات</span>
                    </Button>
                </div>

            </div>





            {/* حالة عدم وجود بيانات */}
            {data.length === 0 && (
                <div className="text-center py-16 px-4 border border-green-200 dark:border-green-700 rounded-2xl bg-gradient-to-b from-green-50/50 to-white dark:from-green-900/20 dark:to-green-950/20">
                    <div className="flex flex-col items-center justify-center">
                        <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-5 mb-4">
                            <BookOpen className="h-12 w-12 text-green-500 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
                            {emptyMessage || 'لا توجد بيانات'}
                        </h3>
                        <p className="text-green-600/70 dark:text-green-400/70 max-w-md">
                            يمكنك إضافة بيانات جديدة عن طريق الضغط على زر الإضافة
                        </p>
                        {onAddNew && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={onAddNew}
                                className="mt-6 bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Plus className="h-4 w-4 ml-1" />
                                <span>إضافة جديد</span>
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* وضع الجدول */}
            {data.length > 0 && viewMode === 'table' && (
                <div className="border border-green-200 dark:border-green-700 rounded-2xl overflow-hidden shadow-md bg-white dark:bg-green-950/20">
                    <div className="overflow-x-auto">
                        <Table className="direction-rtl w-full border-collapse">
                            <TableHeader className="bg-gradient-to-b from-green-800 via-green-600 to-green-500 dark:from-green-900 dark:via-green-800 dark:to-green-700">
                                <TableRow>
                                    {columns.map((column) => {
                                        const alignClass =
                                            column.align === 'center'
                                                ? 'text-center'
                                                : column.align === 'left'
                                                    ? 'text-left'
                                                    : 'text-right';
                                        return (
                                            <TableHead
                                                key={column.key}
                                                className={cn(
                                                    alignClass,
                                                    'font-bold text-white py-3 px-4 border-r border-green-600/50 dark:border-green-800/50'
                                                )}
                                                style={{ width: column.width }}
                                            >
                                                {column.header}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item, index) => (
                                    <TableRow
                                        key={item.id}
                                        className={cn(
                                            'odd:bg-green-50 even:bg-white dark:odd:bg-green-900/20 dark:even:bg-green-950/10 hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors duration-200 border-b border-green-200 dark:border-green-800/30',
                                            getRowClassName ? getRowClassName(item, index) : '',
                                            rowClassName
                                        )}
                                    >
                                        {columns.map((column) => {
                                            const alignClass =
                                                column.align === 'center'
                                                    ? 'text-center'
                                                    : column.align === 'left'
                                                        ? 'text-left'
                                                        : 'text-right';
                                            return (
                                                <TableCell
                                                    key={`${item.id}-${column.key}`}
                                                    className={cn(
                                                        alignClass,
                                                        'py-3 px-4 font-medium text-green-900 dark:text-green-200 border-r border-green-200/70 dark:border-green-800/30'
                                                    )}
                                                >
                                                    {column.render ? (
                                                        column.render(item)
                                                    ) : (item as any)[column.key] ? (
                                                        <span>{(item as any)[column.key]}</span>
                                                    ) : (
                                                        <span className="text-green-500/60 dark:text-green-500/40 italic">-</span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* وضع البطاقات */}
            {data.length > 0 && viewMode === 'card' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
                    {(() => {
                        const CardItem = ({ item }: { item: T }) => {
                            const [expanded, setExpanded] = useState(false);
                            const importantColumn = columns.find((c) => c.important);
                            const titleColumn = importantColumn || columns[0];
                            const titleValue = (item as any)[titleColumn.key] || 'بيانات';
                            const allDetailColumns = columns.filter((c) => c.key !== titleColumn.key);
                            const visibleColumns = enableCardExpand && !expanded ? allDetailColumns.slice(0, cardMaxFieldsCollapsed) : allDetailColumns;
                            const hasMore = enableCardExpand && allDetailColumns.length > cardMaxFieldsCollapsed;

                            return (
                                <div
                                    key={item.id}
                                    role={onCardClick ? 'button' : undefined}
                                    tabIndex={onCardClick ? 0 : -1}
                                    onClick={(e) => {
                                        if (onCardClick && (e.target as HTMLElement).getAttribute('data-stop') !== 'true') {
                                            onCardClick(item);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (onCardClick && (e.key === 'Enter' || e.key === ' ')) {
                                            e.preventDefault();
                                            onCardClick(item);
                                        }
                                    }}
                                    className={cn(
                                        'group relative rounded-lg border border-green-200/70 dark:border-green-800/50 bg-white/90 dark:bg-green-900/30 shadow-sm transition-all duration-200 overflow-hidden flex flex-col focus:outline-none focus:ring-2 focus:ring-green-500',
                                        highlightOnHover && 'hover:shadow-md hover:border-green-400/60 dark:hover:border-green-600/60'
                                    )}
                                >
                                    {/* الرأس */}
<div className="px-4 py-2 bg-gradient-to-r from-green-600 via-emerald-500 to-green-400 dark:from-green-800 dark:via-green-700 dark:to-green-600 text-white rounded-lg shadow-md flex items-center">
  <h3 className="font-extrabold text-base sm:text-lg tracking-wide drop-shadow-md truncate flex-1">
    {titleValue}
  </h3>
</div>

                                    {/* المحتوى */}
                                    <div className="p-1.5 flex-1 text-[10px] space-y-1">
                                        {visibleColumns.map((column) => {
                                            const value = column.render ? column.render(item) : (item as any)[column.key];
                                            return (
                                                <div
                                                    key={`${item.id}-${column.key}-card`}
                                                    className="grid grid-cols-2 gap-1 items-start rounded-md border border-green-100 dark:border-green-800/60 bg-white/70 dark:bg-green-950/20 px-1 py-1 hover:bg-green-50 dark:hover:bg-green-900/30"
                                                >
                                                    <span className="font-medium text-green-700 dark:text-green-300 leading-snug text-[9px] pr-1 truncate">
                                                        {column.header}
                                                    </span>
                                                    <div className="text-green-800 dark:text-green-100 leading-snug min-h-[14px] truncate">
                                                        {value ? (
                                                            <span className="truncate inline-block max-w-full">{value}</span>
                                                        ) : (
                                                            <span className="text-green-400/60 italic text-[9px]">-</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* الفوتر */}
                                </div>
                            );
                        };
                        return data.map((d) => <CardItem key={d.id} item={d} />);
                    })()}
                </div>
            )}
        </div>
    );
}
