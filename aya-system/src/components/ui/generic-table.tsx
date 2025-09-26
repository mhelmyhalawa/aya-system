import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { BookOpen, List, LayoutGrid, Plus, Hash, ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
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
    cardGridColumns?: {
        sm?: number; // عدد الأعمدة في الشاشات الصغيرة
        md?: number; // عدد الأعمدة في الشاشات المتوسطة
        lg?: number; // عدد الأعمدة في الشاشات الكبيرة
        xl?: number; // عدد الأعمدة في الشاشات الكبيرة جدًا
    };
    cardWidth?: string; // عرض البطاقة المخصص (مثل: "300px", "100%", إلخ)
    /** حد أقصى لعدد البطاقات المعروضة في آن واحد (مثلاً 1 أو 2) */
    cardPageSize?: number;
    /** إظهار أزرار التالي/السابق في الهيدر حتى في الشاشات الكبيرة عند نمط البطاقات */
    showCardNavInHeader?: boolean;
    /** حد خاص لعدد البطاقات في الموبايل (يفوق أي قيمة افتراضية)، إذا لم يحدد يستخدم 1 عند استخدام cardPageSize */
    cardMobilePageSize?: number;
    /** تفعيل الترقيم العام */
    enablePagination?: boolean;
    /** خيارات حجم الصفحة */
    pageSizeOptions?: number[];
    /** حجم الصفحة الافتراضي */
    defaultPageSize?: number;
    /** (معطل) كان لزر الترتيب الداخلي وتم الاستغناء عنه */
    hideSortToggle?: boolean; // للإبقاء على التوافق الخلفي فقط
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
        cardGridColumns = { sm: 1, md: 2, lg: 3, xl: 4 },
        cardWidth,
        cardPageSize,
        showCardNavInHeader = false,
        cardMobilePageSize,
        enablePagination = false,
        pageSizeOptions = [5,10,20,50],
        defaultPageSize = 5,
    hideSortToggle = false,
    } = props;

    const [viewMode, setViewMode] = useState<'table' | 'card'>(defaultView);
    const isMobile = useIsMobile();
    // إضافة حالة للترتيب
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
    // فهرس البطاقة الحالية على الموبايل (نعرض بطاقة واحدة مع تنقل)
    const [mobileCardIndex, setMobileCardIndex] = useState(0);
    // الترقيم
    const [pageSize, setPageSize] = useState<number>(defaultPageSize);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // فرض نمط البطاقات على الموبايل
    useEffect(() => {
        if (isMobile) {
            setViewMode(prev => prev === 'card' ? prev : 'card');
        } else {
            setViewMode(prev => prev === 'table' ? prev : 'table');
        }
    }, [isMobile]);

    // إعادة ضبط الصفحة عند تغيير نمط العرض لتفادي بقاء مؤشر خارج النطاق خاصة في وضع بطاقة واحدة
    useEffect(() => {
        setCurrentPage(1);
    }, [viewMode]);

    const goNext = () => {
        // حساب حجم الصفحة الحالي اعتماداً على السياق (موبايل أو سطح مكتب)
        const currentPageSize = isMobile
            ? (cardMobilePageSize ?? 1)
            : (cardPageSize ?? sortedData.length);
        setMobileCardIndex(i => {
            const maxStart = Math.max(sortedData.length - currentPageSize, 0);
            const next = i + currentPageSize;
            return next > maxStart ? maxStart : next;
        });
    };
    const goPrev = () => {
        const currentPageSize = isMobile
            ? (cardMobilePageSize ?? 1)
            : (cardPageSize ?? sortedData.length);
        setMobileCardIndex(i => {
            const prev = i - currentPageSize;
            return prev < 0 ? 0 : prev;
        });
    };

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

    // إعادة ضبط فهرس البطاقة للموبايل بعد حساب sortedData
    useEffect(() => {
        if (mobileCardIndex >= sortedData.length) {
            setMobileCardIndex(0);
        }
    }, [sortedData.length, mobileCardIndex]);

    // الترتيب النهائي للبيانات
    // حساب عدد الصفحات مع مراعاة وضع بطاقة واحدة في الموبايل
    const effectivePageSize = (isMobile && viewMode === 'card') ? 1 : pageSize;
    const totalPages = React.useMemo(() => {
        if (!enablePagination) return 1;
        return Math.max(1, Math.ceil(sortedData.length / effectivePageSize));
    }, [enablePagination, sortedData.length, effectivePageSize]);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize, data]);

    const paginatedData = React.useMemo(() => {
        if (!enablePagination) return sortedData;
        // في حالة الموبايل + عرض البطاقات نعرض بطاقة واحدة فقط لكل صفحة
        if (isMobile && viewMode === 'card') {
            const start = (currentPage - 1) * 1;
            const end = start + 1;
            return sortedData.slice(start, end);
        }
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return sortedData.slice(start, end);
    }, [enablePagination, sortedData, currentPage, pageSize, isMobile, viewMode]);

    // حساب نطاق العناصر المعروضة
    const rangeInfo = React.useMemo(() => {
        if (!enablePagination || sortedData.length === 0) return { start: 0, end: 0, total: sortedData.length };
        const start = (currentPage - 1) * effectivePageSize + 1;
        const end = Math.min(start + effectivePageSize - 1, sortedData.length);
        return { start, end, total: sortedData.length };
    }, [enablePagination, sortedData.length, currentPage, effectivePageSize]);

    // تم دمج الترقيم داخل الهيدر الرئيسي بدلاً من مكوّن منفصل

    const displayData = paginatedData;

    function getDisplayValue(value: any): string {
        if (value === null || value === undefined) return "-";
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        if (typeof value === "object") {
            if ("label" in value) return String(value.label);
            if ("name" in value) return String(value.name);
            return "-";
        }
        return "-";
    }

    return (
        <div className={cn('w-full overflow-hidden', className)}>
                        {/* العنوان وأدوات التحكم */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-1 mb-2 p-2 
                shadow-lg bg-gradient-to-r from-green-900 via-blue to-green-500 dark:from-green-900/30 dark:via-green-800/40 dark:to-green-900/30 border border-green-200 dark:border-green-200">
                {/* القسم الأيسر: العنوان + العدد */}
                <div className="flex items-center gap-3 hidden md:flex">
                    {/* العنوان للـ desktop */}
                    <span className="hidden sm:inline text-green-900 dark:text-green-100 font-extrabold text-lg sm:text-xl tracking-wide">
                        {title}
                    </span>
                </div>

                {/* أزرار العرض + الترتيب + الترقيم */}
                <div className="flex items-center gap-2 sm:gap-3 flex-nowrap sm:flex-wrap justify-start sm:justify-end w-full sm:w-auto overflow-x-auto scrollbar-none">
                    {/* في الديسكتوب: عدد السجلات | في الموبايل: أزرار التنقل */}
                    {/* إخفاء عداد السجلات إذا كانت أزرار التنقل معروضة في نمط البطاقات */}
                    {!isMobile && !((isMobile || showCardNavInHeader) && viewMode === 'card' && sortedData.length > 1) && !enablePagination && (
                        <div
                            aria-label="عدد السجلات"
                            className="flex items-center gap-1 h-7 sm:h-9 px-2 sm:px-3 rounded-lg 
                                       border border-green-300 dark:border-green-700 
                                       bg-white/80 dark:bg-green-800/40 
                                       text-green-800 dark:text-green-100 
                                       text-[11px] sm:text-xs font-semibold shadow-sm select-none"
                        >
                            <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-300" />
                            <span className="leading-none">{sortedData.length}</span>
                        </div>
                    )}
                    {(isMobile || showCardNavInHeader) && viewMode === 'card' && sortedData.length > 1 && !enablePagination && (
                        <div className="flex items-center gap-1" aria-label="التنقل بين البطاقات">
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrev(); }}
                                disabled={mobileCardIndex === 0}
                                className={cn(
                                    'px-2 py-1 text-[10px] font-semibold rounded-md border flex items-center gap-1 h-7',
                                    mobileCardIndex === 0
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        : 'bg-white dark:bg-green-900/40 text-green-800 dark:text-green-100 border-green-300 dark:border-green-700'
                                )}
                                data-stop="true"
                            >
                                السابق
                            </button>
                            <span className="text-[11px] font-semibold text-white dark:text-white select-none min-w-[50px] text-center px-1 drop-shadow-sm">
                                {mobileCardIndex + 1} / {sortedData.length}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); }}
                                disabled={mobileCardIndex === sortedData.length - 1}
                                className={cn(
                                    'px-2 py-1 text-[10px] font-semibold rounded-md border flex items-center gap-1 h-7',
                                    mobileCardIndex === sortedData.length - 1
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        : 'bg-white dark:bg-green-900/40 text-green-800 dark:text-green-100 border-green-300 dark:border-green-700'
                                )}
                                data-stop="true"
                            >
                                التالي
                            </button>
                        </div>
                    )}

                    {/* الترقيم داخل الهيدر */}
                    {/* زر الترتيب الداخلي تمت إزالته - يمكن استخدام الترتيب الخارجي في الصفحة */}
                    {enablePagination && (
                        <div className="flex items-center gap-1 sm:gap-2 bg-white/15 backdrop-blur-sm px-2 py-1.5 rounded-xl border border-white/25 shadow-inner shrink-0">
                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-white">
                                <span>📄</span>
                                <span className="px-1.5 py-0.5 rounded-md bg-white/25 text-white font-bold tracking-wide">{currentPage}/{totalPages}</span>
                                <span className="hidden lg:inline text-white/80 font-normal">{rangeInfo.total > 0 ? `من ${rangeInfo.start} إلى ${rangeInfo.end}` : 'لا بيانات'}</span>
                            </div>
                            {/* إخفاء اختيار حجم الصفحة في وضع بطاقة واحدة */}
                            {!(isMobile && viewMode === 'card') && (
                                <select
                                    value={pageSize.toString()}
                                    onChange={(e)=>setPageSize(parseInt(e.target.value))}
                                    className="h-7 sm:h-8 text-[10px] sm:text-[11px] px-1.5 rounded-lg bg-white/25 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
                                >
                                    {pageSizeOptions.map(o=> <option className='text-green-900' key={o} value={o}>{o}</option>)}
                                </select>
                            )}
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={()=>setCurrentPage(1)}
                                    disabled={currentPage===1}
                                    aria-label='الأولى'
                                    className={cn('h-7 w-7 flex items-center justify-center rounded-md transition-all', currentPage===1? 'bg-white/15 text-white/40 cursor-not-allowed':'bg-white/90 text-green-700 hover:bg-yellow-200')}
                                >
                                    <ChevronsLeft className='h-3.5 w-3.5'/>
                                </button>
                                <button
                                    onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}
                                    disabled={currentPage===1}
                                    aria-label='السابق'
                                    className={cn('h-7 w-7 flex items-center justify-center rounded-md transition-all', currentPage===1? 'bg-white/15 text-white/40 cursor-not-allowed':'bg-white/90 text-green-700 hover:bg-yellow-200')}
                                >
                                    <ChevronRight className='h-3.5 w-3.5'/>
                                </button>
                                <button
                                    onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}
                                    disabled={currentPage===totalPages||totalPages===0}
                                    aria-label='التالي'
                                    className={cn('h-7 w-7 flex items-center justify-center rounded-md transition-all', (currentPage===totalPages||totalPages===0)? 'bg-white/15 text-white/40 cursor-not-allowed':'bg-white/90 text-green-700 hover:bg-yellow-200')}
                                >
                                    <ChevronLeft className='h-3.5 w-3.5'/>
                                </button>
                                <button
                                    onClick={()=>setCurrentPage(totalPages)}
                                    disabled={currentPage===totalPages||totalPages===0}
                                    aria-label='الأخيرة'
                                    className={cn('h-7 w-7 flex items-center justify-center rounded-md transition-all', (currentPage===totalPages||totalPages===0)? 'bg-white/15 text-white/40 cursor-not-allowed':'bg-white/90 text-green-700 hover:bg-yellow-200')}
                                >
                                    <ChevronsRight className='h-3.5 w-3.5'/>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* تمت إزالة زر الترتيب الداخلي */}

                    {/* زر عرض الجدول */}
                    {/* إخفاء أزرار العرض على الموبايل */}
                    <div className="hidden sm:flex items-center gap-1 sm:gap-3">
                        {/* زر عرض الجدول */}
                        <Button
                            onClick={() => setViewMode("table")}
                            size="icon"
                            className={cn(
                                "h-7 w-7 sm:h-9 sm:w-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-2 rounded-lg shadow-md",
                                viewMode === "table"
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white dark:bg-green-800 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700"
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
                                "h-7 w-7 sm:h-9 sm:w-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-2 rounded-lg shadow-md",
                                viewMode === "card"
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white dark:bg-green-800 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700"
                            )}
                            title="عرض البطاقات"
                        >
                            <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="hidden sm:inline font-medium">بطاقات</span>
                        </Button>
                    </div>
                </div>

            </div>
            
            {/* حالة عدم وجود بيانات */}
            {displayData.length === 0 && (
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
                                className="mt-6 bg-green-600 text-white"
                            >
                                <Plus className="h-4 w-4 ml-1" />
                                <span>إضافة جديد</span>
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* وضع الجدول */}
            {displayData.length > 0 && viewMode === 'table' && (
                <div className="border border-green-200 dark:border-green-700 rounded-2xl overflow-hidden shadow-md bg-white dark:bg-green-950/20">
                    {/* تمت إزالة شريط الترقيم العلوي المستقل - تم دمجه في الهيدر */}
                    <div className="overflow-x-auto max-h-[calc(100vh-200px)] overflow-auto custom-scrollbar">
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
                                {displayData.map((item, index) => (
                                    <TableRow
                                        key={item.id}
                                        className={cn(
                                            'odd:bg-green-50 even:bg-white dark:odd:bg-green-900/20 dark:even:bg-green-950/10 border-b border-green-200 dark:border-green-800/30',
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
            {displayData.length > 0 && viewMode === 'card' && (() => {
                const effective = enablePagination ? displayData : sortedData;
                const smallSet = effective.length <= (cardPageSize ?? 2);
                // حجم الصفحة حسب نوع الجهاز
                const pageSize = isMobile
                    ? (cardMobilePageSize ?? 1)
                    : (cardPageSize ?? sortedData.length);
                // في حالة وجود حد للبطاقات أو كنا على الموبايل نستخدم mobileCardIndex كبداية
                const cardLogicalPageSize = isMobile
                    ? (cardMobilePageSize ?? 1)
                    : (cardPageSize ?? effective.length);
                const startIndex = (cardLogicalPageSize < effective.length) ? mobileCardIndex : 0;
                const endIndexExclusive = Math.min(startIndex + cardLogicalPageSize, effective.length);
                const visibleSlice = enablePagination ? effective : effective.slice(startIndex, endIndexExclusive);
                const totalItems = effective.length;
                const Dots = () => {
                    const primaryLabelColumn = columns.find(c => c.important) || columns[0];
                    return (
                        <div
                            className="md:hidden flex flex-wrap items-center justify-center gap-1 py-2 select-none w-full"
                            aria-label={`التنقل بين البطاقات، إجمالي ${totalItems} بطاقة`}
                        >
                            {effective.map((record, idx) => {
                                const isVisible = idx >= startIndex && idx < endIndexExclusive; // ضمن الشريحة الحالية
                                let rawVal: any = undefined;
                                if (primaryLabelColumn) {
                                    rawVal = (record as any)[primaryLabelColumn.key];
                                }
                                const displayVal = rawVal !== undefined && rawVal !== null ? getDisplayValue(rawVal) : '';
                                const tooltip = `بطاقة ${idx + 1} / ${totalItems}${displayVal ? ' – ' + displayVal : ''}`;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        aria-label={tooltip}
                                        title={tooltip}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const maxStart = Math.max(totalItems - cardLogicalPageSize, 0);
                                            const newStart = Math.min(idx, maxStart);
                                            setMobileCardIndex(newStart);
                                        }}
                                        className={cn(
                                            'h-2.5 w-2.5 rounded-full transition-all outline-none ring-offset-1 focus:ring-2 focus:ring-green-500',
                                            isVisible
                                                ? 'bg-green-600 dark:bg-green-400 scale-110 shadow'
                                                : 'bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-500'
                                        )}
                                        data-stop="true"
                                    />
                                );
                            })}
                        </div>
                    );
                };

                const containerClass = isMobile
                    ? 'w-full p-2'
                    : smallSet
                        ? 'flex flex-col md:flex-row gap-4 w-full p-2 max-h-[calc(100vh-200px)] overflow-auto custom-scrollbar justify-center items-stretch'
                        : `grid gap-4 w-full p-2 max-h-[calc(100vh-200px)] overflow-auto custom-scrollbar
                            grid-cols-${Math.min(cardLogicalPageSize, 2)} md:grid-cols-${Math.min(cardLogicalPageSize, cardGridColumns.md || cardLogicalPageSize)} lg:grid-cols-${Math.min(cardLogicalPageSize, cardGridColumns.lg || cardLogicalPageSize)} xl:grid-cols-${Math.min(cardLogicalPageSize, cardGridColumns.xl || cardLogicalPageSize)}`;

                                                return (
                                                        <div className="w-full flex flex-col items-stretch">
                                                                {/* الترقيم مدمج في الهيدر؛ لا حاجة لعنصر علوي هنا */}
                                                {/* النقاط (متمركزة) فوق الشبكة عند عدم تفعيل الترقيم */}
                                                {!enablePagination && totalItems > 1 && <Dots />}
                        <div className={containerClass}>
                        {(() => {
                            const CardItem = ({ item }: { item: T }) => {
                            const [expanded, setExpanded] = useState(false);
                            const importantColumn = columns.find((c) => c.important);
                            // دعم كل من row_index و __index كأعمدة فهرس
                            const indexColumn = columns.find(c => c.key === 'row_index' || c.key === '__index');
                            // اختيار عمود العنوان: العمود المهم ثم الأول، مع تخطي عمود الفهرس إذا كان هو الأول
                            let titleColumn = importantColumn || columns[0];
                            if (indexColumn && titleColumn && titleColumn.key === indexColumn.key) {
                                const alternative = columns.find(c => c.key !== indexColumn.key);
                                if (alternative) titleColumn = alternative;
                            }
                            const titleValue = (item as any)[titleColumn.key] || 'بيانات';
                            // استثناء عمود العنوان وعمود الفهرس من تفاصيل البطاقة
                            const allDetailColumns = columns.filter((c) => c.key !== titleColumn.key && (!indexColumn || c.key !== indexColumn.key));
                            // على الموبايل نظهر كل الحقول دائماً ونلغي خاصية الطي
                            const visibleColumns = isMobile ? allDetailColumns : (enableCardExpand && !expanded ? allDetailColumns.slice(0, cardMaxFieldsCollapsed) : allDetailColumns);
                            const hasMore = !isMobile && enableCardExpand && allDetailColumns.length > cardMaxFieldsCollapsed;

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
                                        'group relative rounded-lg border border-green-200/70 dark:border-green-800/50 bg-white/90 dark:bg-green-900/30 shadow-sm overflow-hidden flex flex-col focus:outline-none focus:ring-2 focus:ring-green-500 md:h-full',
                                        cardWidth ? '' : 'w-full',
                                        smallSet && 'md:max-w-[520px] mx-auto'
                                        // تمت إزالة تأثير hover (الظل وتغيير الحد) لمنع الوميض
                                    )}
                                    style={cardWidth ? { width: cardWidth } : undefined}
                                >
                                    {/* الرأس */}
                                    <div className="px-3 py-2 sm:py-2.5 bg-gradient-to-r from-green-600 via-emerald-500 to-green-400 
                                                    dark:from-green-800 dark:via-green-700 dark:to-green-600 
                                                    text-white rounded-t-lg shadow-md flex items-center justify-between">
                                        <h3 className="font-bold text-sm sm:text-base tracking-wide text-white drop-shadow-sm truncate flex-1 flex items-center gap-2">
                                            {indexColumn && (
                                                <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] rounded-full bg-white/15 border border-white/30 text-xs font-semibold shadow-inner backdrop-blur-sm">
                                                    {indexColumn.render ? indexColumn.render(item) : (item as any)[indexColumn.key]}
                                                </span>
                                            )}
                                            <span className="truncate">
                                                {titleColumn.render ? titleColumn.render(item) : titleValue}
                                            </span>
                                        </h3>
                                    </div>

                                    {/* المحتوى */}
                                    <div className="w-full">
                                        {/* نسخة الجدول - تظهر من sm وفوق */}
                                        <table className="hidden sm:table w-full border border-green-300 dark:border-green-700 text-[12px] sm:text-xs table-fixed">
                                            <tbody>
                                                {visibleColumns.map((column) => {
                                                    const value = column.render
                                                        ? column.render(item)
                                                        : (item as any)[column.key];
                                                    return (
                                                        <tr key={`${item.id}-${column.key}-row`}>
                                                            <td className="w-[30%] border border-green-300 dark:border-green-700 px-2 py-1 font-medium text-green-700 dark:text-green-300 text-right">
                                                                {column.header}
                                                            </td>
                                                            <td className="w-[70%] border border-green-300 dark:border-green-700 px-2 py-1 text-green-800 dark:text-green-100 text-right bg-green-50 dark:bg-green-900/50">
                                                                <div className="w-full sm:max-w-xs text-sm text-green-800 dark:text-green-100 bg-green-50 dark:bg-green-800/30 border border-green-200 dark:border-green-700 rounded-md px-2 py-1 min-h-[28px] flex items-center justify-center">
                                                                    {value !== null && value !== undefined ? (
                                                                        typeof value === "object" && React.isValidElement(value) ? (
                                                                            value
                                                                        ) : (
                                                                            <span className="text-center">{getDisplayValue(value)}</span>
                                                                        )
                                                                    ) : (
                                                                        <span className="text-green-400/60 italic text-center">-</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* نسخة الفورم - تظهر فقط على الموبايل (أصغر من sm) */}
                                        <div className="sm:hidden space-y-3">
                                            {visibleColumns.map((column) => {
                                                const value = column.render
                                                    ? column.render(item)
                                                    : (item as any)[column.key];
                                                return (
                                                    <div
                                                        key={`${item.id}-${column.key}-form`}
                                                        className="p-2 border-b border-green-200 dark:border-green-700"
                                                    >
                                                        {/* العنوان */}
                                                        <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 text-right">
                                                            {column.header}
                                                        </div>

                                                        {/* القيمة */}
                                                        <div className="flex justify-center">
                                                            <div
                                                                className="w-full sm:max-w-xs text-sm text-green-800 dark:text-green-100 
                                                                    bg-green-50 dark:bg-green-800/30  
                                                                    border border-green-200 dark:border-green-700 
                                                                    rounded-md px-2 py-1 min-h-[28px] flex items-center justify-center"
                                                            >
                                                                {value !== null && value !== undefined ? (
                                                                    typeof value === "object" && React.isValidElement(value) ? (
                                                                        value
                                                                    ) : (
                                                                        <span className="text-center font-medium text-green-800 dark:text-green-100">{getDisplayValue(value)}</span>
                                                                    )
                                                                ) : (
                                                                    <span className="text-green-400/60 italic text-center">-</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {/* زر إظهار المزيد إذا كان هناك المزيد من الحقول */}

                                    {!isMobile && hasMore && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setExpanded(!expanded);
                                            }}
                                            data-stop="true"
                                            className="mt-1 mb-2 mx-auto px-4 py-2 text-blue-600 dark:text-blue-400 text-xs bg-white dark:bg-green-900/50 border border-blue-300 dark:border-blue-600 cursor-pointer flex items-center gap-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {expanded ? 'عرض أقل' : 'عرض المزيد'}
                                            {expanded ? (
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    )}

                                </div>
                            );
                            };
                            return visibleSlice.map((d) => <CardItem key={d.id} item={d} />);
                        })()}
                        </div>
                        {/* النقاط أسفل الشبكة أيضاً (اختياري يمكن الإبقاء على واحدة فقط، سنترك نسخة سفلية للتوازن على الشاشات الكبيرة) */}
                        {!enablePagination && totalItems > 1 && !isMobile && <Dots />}
                        {/* يمكن إضافة شريط سفلي لاحقاً عبر prop إذا لزم */}
                    </div>
                );
            })()}
        </div>
    );
}
