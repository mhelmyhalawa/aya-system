import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { BookOpen, List, LayoutGrid, Plus, Hash, ArrowDownAZ, ArrowUpZA, ArrowDownUp, ChevronUp, ChevronDown } from 'lucide-react';
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
        title = '',
    } = props;

    const [viewMode, setViewMode] = useState<'table' | 'card'>(defaultView);
    const isMobile = useIsMobile();
    // إضافة حالة للترتيب
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

    // فرض نمط البطاقات على الموبايل
    useEffect(() => {
        if (isMobile) setViewMode('card');
    }, [isMobile]);

    // دالة لترتيب البيانات حسب العمود الأول
    const toggleSort = () => {
        setSortDirection(prev => {
            if (prev === null) return 'asc';
            if (prev === 'asc') return 'desc';
            return null;
        });
    };

    // ترتيب البيانات إذا كان الترتيب مفعلاً
    const sortedData = React.useMemo(() => {
        if (!sortDirection || columns.length === 0) return data;

        const firstColumn = columns[0];
        return [...data].sort((a, b) => {
            // الحصول على قيم العمود الأول
            const aValue = (a as any)[firstColumn.key];
            const bValue = (b as any)[firstColumn.key];

            // التعامل مع القيم غير المحددة
            if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
            if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

            // المقارنة حسب نوع البيانات
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            // المقارنة العددية
            return sortDirection === 'asc'
                ? (aValue > bValue ? 1 : -1)
                : (bValue > aValue ? 1 : -1);
        });
    }, [data, columns, sortDirection]);

    return (


        <div className={cn('w-full overflow-hidden', className)}>
            {/* العنوان وأدوات التحكم */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-0 mb-2 p-2 rounded-5xl shadow-lg bg-gradient-to-r from-green-500 via-blue to-green-200 dark:from-green-900/30 dark:via-green-800/40 dark:to-green-900/30 border border-green-200 dark:border-green-200">
                {/* القسم الأيسر: العنوان + العدد */}
                <div className="flex items-center gap-3 hidden md:flex">
                    {/* العنوان للـ desktop */}
                    <span className="hidden sm:inline text-green-900 dark:text-green-100 font-extrabold text-lg sm:text-xl tracking-wide">
                        {title}
                    </span>
                </div>

                {/* أزرار العرض */}
                <div className="flex items-center gap-1 sm:gap-3">
                    {/* عدد السجلات */}
                    <div
                        title="عدد السجلات"
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow-md text-xs sm:text-sm"
                    >
                        <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-white/90" />
                        {data.length}
                    </div>

                    {/* زر الترتيب حسب العمود الأول */}
                    {columns.length > 0 && (
                        <Button
                            onClick={toggleSort}
                            size="icon"
                            className={cn(
                                "h-7 w-7 sm:h-9 sm:w-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-2 rounded-lg shadow-md transition-all duration-200",
                                sortDirection
                                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                    : "bg-white dark:bg-blue-800 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-700"
                            )}
                            title={sortDirection === 'asc'
                                ? `ترتيب تصاعدي حسب ${columns[0].header}`
                                : sortDirection === 'desc'
                                    ? `ترتيب تنازلي حسب ${columns[0].header}`
                                    : `ترتيب حسب ${columns[0].header}`
                            }
                        >
                            {sortDirection === 'asc' ? (
                                <ArrowDownAZ className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : sortDirection === 'desc' ? (
                                <ArrowUpZA className="h-4 w-4 sm:h-5 sm:w-5" />
                            ) : (
                                <ArrowDownUp className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                            <span className="hidden sm:inline font-medium">
                                {sortDirection === 'asc'
                                    ? 'تصاعدي'
                                    : sortDirection === 'desc'
                                        ? 'تنازلي'
                                        : 'ترتيب'
                                }
                            </span>
                        </Button>
                    )}

                    {/* زر عرض الجدول */}
                    <Button
                        onClick={() => setViewMode("table")}
                        size="icon"
                        className={cn(
                            "h-7 w-7 sm:h-9 sm:w-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-2 rounded-lg shadow-md transition-all duration-200",
                            viewMode === "table"
                                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                                : "bg-white dark:bg-green-800 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-700"
                        )}
                        title="عرض الجدول"
                    >
                        <List className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline font-medium">جدول</span>
                    </Button>

                    {/* زر عرض البطاقات */}
                    <Button
                        onClick={() => setViewMode("card")}
                        size="icon"
                        className={cn(
                            "h-7 w-7 sm:h-9 sm:w-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-2 rounded-lg shadow-md transition-all duration-200",
                            viewMode === "card"
                                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                                : "bg-white dark:bg-green-800 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-700"
                        )}
                        title="عرض البطاقات"
                    >
                        <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden sm:inline font-medium">بطاقات</span>
                    </Button>
                </div>

            </div>

            {/* حالة عدم وجود بيانات */}
            {sortedData.length === 0 && (
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
            {sortedData.length > 0 && viewMode === 'table' && (
                <div className="border border-green-200 dark:border-green-700 rounded-2xl overflow-hidden shadow-md bg-white dark:bg-green-950/20">
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)]">
                        <Table className="direction-rtl w-full border-collapse">
                            <TableHeader className="bg-gradient-to-b from-green-800 via-green-600 to-green-500 dark:from-green-900 dark:via-green-800 dark:to-green-700 sticky top-0 z-10">
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
                                {sortedData.map((item, index) => (
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
            {sortedData.length > 0 && viewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
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
                                        'group relative rounded-lg border border-green-200/70 dark:border-green-800/50 bg-white/90 dark:bg-green-900/30 shadow-sm transition-all duration-200 overflow-hidden flex flex-col focus:outline-none focus:ring-2 focus:ring-green-500 w-full h-full',
                                        highlightOnHover && 'hover:shadow-md hover:border-green-400/60 dark:hover:border-green-600/60'
                                    )}
                                >
                                    {/* الرأس */}
                                    <div className="px-3 py-2.5 bg-gradient-to-r from-green-600 via-emerald-500 to-green-400 
                                                    dark:from-green-800 dark:via-green-700 dark:to-green-600 
                                                    text-white rounded-t-lg shadow-md flex items-center justify-between">
                                        <h3 className="font-bold text-sm sm:text-base tracking-wide text-white drop-shadow-sm truncate flex-1">
                                            {titleColumn.render ? titleColumn.render(item) : titleValue}
                                        </h3>
                                    </div>



                                    {/* المحتوى */}
                                    <div className="w-full">
                                        <table className="w-full border border-green-300 dark:border-green-700 text-[12px] sm:text-xs table-fixed">
                                            <tbody>
                                                {visibleColumns.map((column) => {
                                                    const value = column.render ? column.render(item) : (item as any)[column.key];
                                                    return (
                                                        <tr key={`${item.id}-${column.key}-row`} className="hover:bg-green-50 dark:hover:bg-green-900/25">
                                                            <td className="w-[30%] border border-green-300 dark:border-green-700 px-2 py-1 font-medium text-green-700 dark:text-green-300 text-right">
                                                                {column.header}
                                                            </td>
                                                            <td className="w-[70%] border border-green-300 dark:border-green-700 px-2 py-1 text-green-800 dark:text-green-100 text-right">
                                                                {value ? value : <span className="text-green-400/60 italic">-</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>




                                    {/* زر إظهار المزيد إذا كان هناك المزيد من الحقول */}
                                    {hasMore && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // @ts-ignore
                                                e.target.setAttribute('data-stop', 'true');
                                                setExpanded(!expanded);
                                            }}
                                            className="mt-1 mb-2 mx-auto text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-xs"
                                        >
                                            {expanded ? 'عرض أقل' : 'عرض المزيد'}
                                            {expanded ? (
                                                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            );
                        };
                        return sortedData.map((d) => <CardItem key={d.id} item={d} />);
                    })()}
                </div>
            )}
        </div>
    );
}
