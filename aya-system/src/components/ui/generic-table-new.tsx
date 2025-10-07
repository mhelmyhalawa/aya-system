import React, { useState, useEffect, useRef } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { BookOpen, List, LayoutGrid, Plus, Hash, ChevronUp, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ArrowRight, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// تعريف واجهة العمود للجدول العام
export interface Column<T> {
    key: string; // مفتاح البيانات
    header: string; // عنوان العمود
    width?: string; // عرض العمود (اختياري)
    align?: 'left' | 'center' | 'right'; // محاذاة العمود (اختياري)
    render?: (item: T, index?: number) => React.ReactNode; // دالة لتخصيص عرض الخلية (اختياري) (نمرر index المعروض)
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
    title?: React.ReactNode; // يسمح الآن بتمرير عناصر JSX معقدة كعنوان (مثل شارة وباجات وأيقونات)
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
    /** تفعيل الترقيم العام */
    enablePagination?: boolean;
    /** خيارات حجم الصفحة */
    pageSizeOptions?: number[];
    /** حجم الصفحة الافتراضي */
    defaultPageSize?: number;
    /**
     * إخفاء زر الترتيب وتعطيل الترتيب (يُرتب الجدول فقط عند إظهار الزر).
     * ملاحظة: الترتيب يتم حالياً على أساس العمود الأول فقط لأغراض تبسيطية.
     */
    hideSortToggle?: boolean;
    /** تمكين/تعطيل الترتيب من الأساس (حتى لو أظهرنا الزر). افتراضياً مفعّل. */
    enableSorting?: boolean;
    /** تعويض (offset) للفهرس العام إن أردنا عرض رقم الصف العالمي */
    rowNumberOffset?: number;
    /** التحكم الخارجي في الصفحة الحالية (اختياري) */
    currentPageExternal?: number;
    /** رد نداء عند تغيير الصفحة داخلياً */
    onPageChange?: (page: number) => void;
    /** تعطيل الحد الداخلي للارتفاع (max-height) للسماح للحاوية الأم بالتحكم بالتمرير */
    noMaxHeight?: boolean;
    /** طي المحتوى (إظهار الهيدر فقط) */
    isCollapsed?: boolean;
    /** تبديل حالة الطي */
    onToggleCollapse?: () => void;
    /** تفعيل زر الطي الداخلي (افتراضياً مفعل). إذا مررت isCollapsed فسيكون التحكم خارجي */
    collapsible?: boolean;
    /** حالة الطي الابتدائية عند الاعتماد على الحالة الداخلية */
    defaultCollapsed?: boolean;
    /** رد نداء عند تغير حالة الطي (بعد التغيير) */
    onCollapseChange?: (collapsed: boolean) => void;
    /** عند الطي يتم إخفاء جميع أزرار التحكم (الترقيم/التنقل/العرض/الترتيب/العداد) والإبقاء على زر الطي فقط */
    hideControlsWhenCollapsed?: boolean;
    /** تحديد نوع تنسيق أزرار التحكم على الموبايل 'wrap' (متعدد الصفوف) أو 'single-row' (صف واحد) أو 'equal' (توزيع متساوي) */
    mobileControlsLayout?: 'wrap' | 'single-row' | 'equal';
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
        enablePagination = false,
        pageSizeOptions = [5, 10, 20, 50],
        defaultPageSize = 5,
        hideSortToggle = false,
        enableSorting = true,
        noMaxHeight = false,
        isCollapsed: isCollapsedProp,
        onToggleCollapse,
        collapsible = true,
        defaultCollapsed = false,
        onCollapseChange,
        hideControlsWhenCollapsed = true,
        mobileControlsLayout = 'wrap',
    } = props;

    const [viewMode, setViewMode] = useState<'table' | 'card'>(defaultView);
    const isMobile = useIsMobile();
    // إضافة حالة للترتيب
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
    const sortGradientClass = React.useMemo(() => {
        switch (sortDirection) {
            case 'asc':
                return 'bg-gradient-to-r from-emerald-500 via-green-500 to-lime-400 dark:from-emerald-700 dark:via-green-700 dark:to-lime-600';
            case 'desc':
                return 'bg-gradient-to-r from-green-700 via-green-600 to-emerald-500 dark:from-green-800 dark:via-green-700 dark:to-emerald-600';
            default:
                return 'bg-gradient-to-r from-green-600 via-emerald-500 to-green-400 dark:from-green-800 dark:via-green-700 dark:to-green-600';
        }
    }, [sortDirection]);
    // فهرس البطاقة الحالية على الموبايل (نعرض بطاقة واحدة مع تنقل)
    const [mobileCardIndex, setMobileCardIndex] = useState(0);
    // الترقيم
    // حجم الصفحة: في الموبايل يكون الافتراضي 1 (حسب الطلب)، وفي غير ذلك نستخدم القيمة الافتراضية الممررة
    const [pageSize, setPageSize] = useState<number>(isMobile ? 1 : defaultPageSize);
    // حفظ آخر حجم صفحة "سطح مكتب" أو قيمة مخصصة قبل الدخول إلى وضع الموبايل
    const prevPageSizeRef = useRef<number>(defaultPageSize);
    // خيارات حجم الصفحة: في الموبايل نعرض القائمة الكاملة ابتداءً من 1 ثم 2 3 4 5 10 20 50
    const effectivePageSizeOptions = React.useMemo(() => {
        if (isMobile) return [1, 2, 3, 4, 5, 10, 20, 50];
        return pageSizeOptions;
    }, [isMobile, pageSizeOptions]);
    const [internalPage, setInternalPage] = useState<number>(1);
    const currentPage = props.currentPageExternal ?? internalPage;

    // فرض نمط البطاقات على الموبايل
    useEffect(() => {
        if (isMobile) {
            setViewMode(prev => prev === 'card' ? prev : 'card');
        } else {
            setViewMode(prev => prev === 'table' ? prev : 'table');
        }
    }, [isMobile]);

    // سابقاً كنا نجبر الحجم على 1 دائماً في الموبايل وضع البطاقات.
    // الآن: نجبره فقط إذا تم تمرير cardPageSize صراحة. إذا لم يُحدَّد يمكن للمستخدم تغييره من القائمة.
    useEffect(() => {
        // دخول إلى وضع الموبايل
        if (isMobile) {
            // حفظ آخر قيمة قبل الموبايل (قيمة سطح المكتب) إذا كنا ننتقل الآن من غير موبايل
            // (ملاحظة: نعتمد على prevPageSizeRef السابق فقط إن كانت الصفحة الحالية ليست 1 مفروضة)
            // إذا تم تمرير cardPageSize: نفرضها
            if (viewMode === 'card' && cardPageSize && cardPageSize > 0) {
                if (pageSize !== cardPageSize) setPageSize(cardPageSize);
            } else {
                // لم يتم تمرير cardPageSize -> نجعل القيمة 1 دائماً كافتراضي للموبايل
                if (pageSize !== 1) setPageSize(1);
            }
            return; // لا نكمل منطق سطح المكتب
        }

        // الخروج إلى سطح المكتب: لو كنا في جدول نعيد آخر قيمة محفوظة إذا كنا على قيمة موبايل (1) أو قيمة cardPageSize المفروضة
        if (!isMobile && viewMode === 'table') {
            const desired = prevPageSizeRef.current || defaultPageSize;
            // إذا كانت القيمة الحالية 1 (افتراضي موبايل) أو مساوية لقيمة cardPageSize فنستعيد
            if ((pageSize === 1 || (cardPageSize && pageSize === cardPageSize)) && pageSize !== desired) {
                setPageSize(desired);
            }
        }
        // تحديث المرجع دائماً في سطح المكتب عند أي تغيير يدوي (يتم خارج هذا التأثير نفسه)
        if (!isMobile && pageSize !== 1 && (!cardPageSize || pageSize !== cardPageSize)) {
            prevPageSizeRef.current = pageSize;
        }
    }, [isMobile, viewMode, cardPageSize, pageSize, defaultPageSize]);

    // إعادة ضبط الصفحة عند تغيير نمط العرض لتفادي بقاء مؤشر خارج النطاق خاصة في وضع بطاقة واحدة
    useEffect(() => {
        // لا نعيد التعيين إذا كان التحكم خارجي لتجنب القفز
        if (props.currentPageExternal === undefined) setInternalPage(1);
    }, [viewMode, props.currentPageExternal]);

    const goNext = () => {
        // حجم البطاقة في التنقل يعتمد على cardPageSize (أو 1 للموبايل إن لم يحدد)
        const currentPageSize = isMobile
            ? (cardPageSize ?? 1)
            : (cardPageSize ?? sortedData.length);
        setMobileCardIndex(i => {
            const maxStart = Math.max(sortedData.length - currentPageSize, 0);
            const next = i + currentPageSize;
            return next > maxStart ? maxStart : next;
        });
    };
    const goPrev = () => {
        const currentPageSize = isMobile
            ? (cardPageSize ?? 1)
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
        // إذا كان خيار الإخفاء أو تعطيل الترتيب مفعل لا نقوم بأي ترتيب
        if (hideSortToggle || !enableSorting || !sortDirection || columns.length === 0) return data;

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
    // حساب عدد الصفحات، في الموبايل وبوضع البطاقات نسمح بعدة بطاقات حسب cardMobilePageSize (افتراضياً 1 إن لم يحدد وتوجد قيمة cardPageSize)
    const effectivePageSize = pageSize; // توحيد الحجم عبر الأنماط، التحكم عبر pageSize فقط
    const totalPages = React.useMemo(() => {
        if (!enablePagination) return 1;
        return Math.max(1, Math.ceil(sortedData.length / effectivePageSize));
    }, [enablePagination, sortedData.length, effectivePageSize]);


    useEffect(() => {
        if (currentPage > totalPages) {
            if (props.currentPageExternal === undefined) setInternalPage(totalPages);
            else props.onPageChange && props.onPageChange(totalPages);
        }
    }, [totalPages, currentPage, props]);

    useEffect(() => {
        // لا نعيد الصفحة للأولى إلا إذا أصبح نطاق الصفحة الحالية خارج البيانات بعد تغيير الحجم أو التصفية
        if (!enablePagination) return;
        const effectiveSize = pageSize;
        const startIndex = (currentPage - 1) * effectiveSize; // صفرية
        if (startIndex >= sortedData.length && sortedData.length > 0) {
            const newLastPage = Math.max(1, Math.ceil(sortedData.length / effectiveSize));
            if (props.currentPageExternal === undefined) setInternalPage(newLastPage);
            else props.onPageChange && props.onPageChange(newLastPage);
            return;
        }
        // إذا قلّ عدد الصفحات وأصبح currentPage > totalPages سيتم ضبطه في تأثير آخر أعلاه
        // لذا لا حاجة لإعادة ضبطه هنا إلى 1 إلا في حالة تفريغ البيانات بالكامل
        if (sortedData.length === 0 && currentPage !== 1) {
            if (props.currentPageExternal === undefined) setInternalPage(1);
            else props.onPageChange && props.onPageChange(1);
        }
    }, [pageSize, data, sortedData.length, currentPage, enablePagination, isMobile, viewMode, props.currentPageExternal]);

    const paginatedData = React.useMemo(() => {
        if (enablePagination) {
            // Debug: مراقبة عملية التقطيع للصفحات
            try { console.debug('[GenericTable] paginate', { currentPage, pageSize, total: sortedData.length }); } catch { }
        }
        if (!enablePagination) return sortedData;
        // في حالة الموبايل + عرض البطاقات نعرض عدداً من البطاقات بحسب cardMobilePageSize (أو pageSize)
        // في الموبايل أيضاً نستخدم pageSize الآن
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

    // حالة الطي الداخلية (تُستخدم فقط إن لم يُمرر تحكم خارجي)
    const [internalCollapsed, setInternalCollapsed] = useState<boolean>(defaultCollapsed);
    const effectiveCollapsed = typeof isCollapsedProp === 'boolean' ? isCollapsedProp : internalCollapsed;
    // هل يجب إخفاء شريط التحكم (ما عدا زر الطي)؟
    const controlsHidden = hideControlsWhenCollapsed && effectiveCollapsed;

    // مرجع وارتفاع متحرك للمحتوى القابل للطي
    const contentRef = useRef<HTMLDivElement | null>(null);
    const [contentHeight, setContentHeight] = useState<number | null>(null);

    useEffect(() => {
        if (!contentRef.current) return;
        // عند التغيير إلى التوسيع نحسب الارتفاع
        if (!effectiveCollapsed) {
            const el = contentRef.current;
            // قياس الارتفاع الطبيعي ثم التعيين
            const full = el.scrollHeight;
            setContentHeight(full);
            // بعد نهاية الانتقال نزيل القيمة لتسمح بتمدد ديناميكي لاحق
            const timeout = setTimeout(() => {
                setContentHeight(null); // auto
            }, 310); // أطول من duration-300 بقليل
            return () => clearTimeout(timeout);
        } else {
            // عند الطي نعيد قياس الارتفاع الحالي ثم نعين 0 بإطار لاحق للانتقال السلس
            if (contentRef.current) {
                const current = contentRef.current.scrollHeight;
                setContentHeight(current);
                // إطار تالي
                requestAnimationFrame(() => {
                    setContentHeight(0);
                });
            }
        }
    }, [effectiveCollapsed, displayData.length, viewMode]);

    const handleToggleInternal = () => {
        // استدعاء الطريقة القديمة إن وُجدت (توافق خلفي)
        if (onToggleCollapse) onToggleCollapse();
        // التحكم الداخلي فقط إذا لم يكن هناك isCollapsedProp
        if (typeof isCollapsedProp !== 'boolean') {
            setInternalCollapsed(prev => {
                const next = !prev;
                onCollapseChange && onCollapseChange(next);
                return next;
            });
        } else {
            // في حالة التحكم الخارجي فقط ننادي onCollapseChange للإعلام (لا نعدل حالة داخلية)
            onCollapseChange && onCollapseChange(!isCollapsedProp);
        }
    };

    return (
        <div className={cn('w-full overflow-hidden', className)}>
            {/* الهيدر (موبايل مبسط + سطح مكتب كامل) */}
            {isMobile ? (
                <div className="flex flex-col gap-1 mb-0 p-2.5
                                bg-gradient-to-br from-green-100 via-green-200 to-emerald-100 
                                dark:from-green-950 dark:via-emerald-950 dark:to-green-900 
                                border border-green-300/40 dark:border-green-800/60 
                                rounded-xl shadow-sm">

                    {/* الصف الأول: العنوان + زر الطي */}
                    {(title || collapsible || onToggleCollapse) && (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex-1 text-center text-xs font-semibold 
                                            text-green-900 dark:text-green-100 leading-tight tracking-wide">
                                {title}
                            </div>
                            {(collapsible || onToggleCollapse) && (
                                <button
                                    type="button"
                                    onClick={handleToggleInternal}
                                    aria-label={effectiveCollapsed ? 'إظهار المحتوى' : 'إخفاء المحتوى'}
                                    aria-expanded={!effectiveCollapsed}
                                    className={cn('h-7 w-7 inline-flex items-center justify-center rounded-md border border-green-300 bg-green-100 text-green-700 hover:bg-green-200 transition-all shadow-sm', !effectiveCollapsed && 'rotate-180')}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                            )}


                        </div>
                    )}

                    {/* الصف الثاني (مُوحّد): الترقيم + أزرار التنقل + حجم الصفحة + الترتيب */}
                    {!controlsHidden && (
                        <div className={cn(
                            "bg-transparent border-2 border-green-500 rounded-lg px-2 py-2", 
                            // تطبيق تنسيق مختلف بناءً على خيار التنسيق المحدد
                            mobileControlsLayout === 'wrap' && "flex flex-wrap items-center w-full gap-2",
                            mobileControlsLayout === 'single-row' && "flex items-center w-full gap-1 overflow-x-auto",
                            mobileControlsLayout === 'equal' && "flex items-center justify-between w-full gap-1"
                        )}>
                            {enablePagination && mobileControlsLayout === 'equal' && (
                                <>
                                    {/* عرض رقم الصفحة */}
                                    <span className="h-7 rounded flex items-center justify-center bg-green-200/60 dark:bg-green-800/60 text-[11px] font-bold text-green-900 dark:text-green-100 text-center w-12 flex-shrink-0">
                                        {currentPage}/{totalPages}
                                    </span>
                                    
                                    {/* أزرار التنقل */}
                                    <div className="flex items-center justify-between flex-1">
                                        <button onClick={() => { if (props.currentPageExternal === undefined) setInternalPage(1); else props.onPageChange && props.onPageChange(1); }} disabled={currentPage === 1}
                                            className="h-7 w-7 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700">
                                            <ChevronsRight className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => { const t = Math.max(1, currentPage - 1); if (props.currentPageExternal === undefined) setInternalPage(t); else props.onPageChange && props.onPageChange(t); }} disabled={currentPage === 1}
                                            className="h-7 w-7 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700">
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => { const t = Math.min(totalPages, currentPage + 1); if (props.currentPageExternal === undefined) setInternalPage(t); else props.onPageChange && props.onPageChange(t); }} disabled={currentPage === totalPages || totalPages === 0}
                                            className="h-7 w-7 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700">
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => { if (props.currentPageExternal === undefined) setInternalPage(totalPages); else props.onPageChange && props.onPageChange(totalPages); }} disabled={currentPage === totalPages || totalPages === 0}
                                            className="h-7 w-7 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700">
                                            <ChevronsLeft className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    
                                    {/* منتقي حجم الصفحة */}
                                    <select value={pageSize.toString()} onChange={(e) => setPageSize(parseInt(e.target.value))}
                                        className="h-7 px-1 text-[10px] rounded bg-green-100/60 dark:bg-green-800/40 text-green-900 dark:text-green-100 border border-green-400/30 focus:outline-none focus:ring-2 focus:ring-green-400/40 w-12 flex-shrink-0">
                                        {effectivePageSizeOptions.map(o => (
                                            <option className="text-green-900" key={o} value={o}>{o}</option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {enablePagination && mobileControlsLayout !== 'equal' && (
                                <>
                                    <div className={cn(
                                        "flex items-center", 
                                        mobileControlsLayout === 'wrap' && "gap-1 flex-wrap",
                                        mobileControlsLayout === 'single-row' && "gap-1 flex-nowrap shrink-0"
                                    )}>
                                        <span className="h-7 rounded flex items-center justify-center bg-green-200/60 dark:bg-green-800/60 text-[11px] font-bold text-green-900 dark:text-green-100 text-center px-1.5 min-w-[46px]">
                                            {currentPage}/{totalPages}
                                        </span>
                                    </div>
                                    
                                    <div className={cn(
                                        "flex items-center h-7",
                                        mobileControlsLayout === 'wrap' && "gap-1",
                                        mobileControlsLayout === 'single-row' && "gap-1 flex-shrink-0"
                                    )}>
                                        <div className="flex items-center gap-1 justify-between">
                                            <button onClick={() => { if (props.currentPageExternal === undefined) setInternalPage(1); else props.onPageChange && props.onPageChange(1); }} disabled={currentPage === 1}
                                                className="h-7 w-7 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700">
                                                <ChevronsRight className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => { const t = Math.max(1, currentPage - 1); if (props.currentPageExternal === undefined) setInternalPage(t); else props.onPageChange && props.onPageChange(t); }} disabled={currentPage === 1}
                                                className="h-7 w-7 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700">
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => { const t = Math.min(totalPages, currentPage + 1); if (props.currentPageExternal === undefined) setInternalPage(t); else props.onPageChange && props.onPageChange(t); }} disabled={currentPage === totalPages || totalPages === 0}
                                                className="h-7 w-7 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700">
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => { if (props.currentPageExternal === undefined) setInternalPage(totalPages); else props.onPageChange && props.onPageChange(totalPages); }} disabled={currentPage === totalPages || totalPages === 0}
                                                className="h-7 w-7 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700">
                                                <ChevronsLeft className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className={cn(
                                        "h-7",
                                        mobileControlsLayout === 'wrap' && "",
                                        mobileControlsLayout === 'single-row' && "flex-shrink-0"
                                    )}>
                                        <select value={pageSize.toString()} onChange={(e) => setPageSize(parseInt(e.target.value))}
                                            className="h-full w-full px-1 text-[10px] rounded bg-green-100/60 dark:bg-green-800/40 text-green-900 dark:text-green-100 border border-green-400/30 focus:outline-none focus:ring-2 focus:ring-green-400/40">
                                            {effectivePageSizeOptions.map(o => (
                                                <option className="text-green-900" key={o} value={o}>{o}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            
                            {/* زر الترتيب */}
                            {!hideSortToggle && enableSorting && columns.length > 0 && (
                                <div className={cn(
                                    "h-7",
                                    mobileControlsLayout === 'wrap' && "flex items-center gap-1 ml-auto",
                                    mobileControlsLayout === 'single-row' && "flex items-center gap-1 ml-auto",
                                    mobileControlsLayout === 'equal' && "w-12 flex-shrink-0"
                                )}>
                                    <button
                                        aria-label={sortDirection === null ? 'تفعيل الترتيب التصاعدي' : sortDirection === 'asc' ? 'التبديل إلى ترتيب تنازلي' : 'إلغاء الترتيب'}
                                        onClick={() => toggleSort()}
                                        className={cn(
                                            'h-7 flex items-center justify-center rounded-md shadow border transition-colors duration-200',
                                            mobileControlsLayout === 'equal' ? "w-full" : "w-7",
                                            sortDirection === null
                                                ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                                : sortDirection === 'asc'
                                                    ? 'bg-green-500 text-white border-green-600 hover:bg-green-600'
                                                    : 'bg-green-700 text-white border-green-800 hover:bg-green-800'
                                        )}
                                    >
                                        {sortDirection === null && <ArrowUpDown className="h-4 w-4" />}
                                        {sortDirection === 'asc' && <ChevronUp className="h-4 w-4" />}
                                        {sortDirection === 'desc' && <ChevronDown className="h-4 w-4" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            ) : (
                <div className="flex flex-col gap-1 mb-0 p-2.5 bg-gradient-to-r from-green-100 via-emerald-100 
                to-teal-100 dark:from-green-200 dark:via-emerald-200 dark:to-teal-200 border border-green-300/50 
                dark:border-green-400/40 rounded-xl shadow-sm">
                    {/* الصف الأول: العنوان + زر الطي */}
                    {(title || collapsible || onToggleCollapse) && (
                        <div className="flex items-center justify-between w-full">
                            <div className="flex-1 text-center text-xs font-semibold text-green-800 leading-tight">
                                {title}
                            </div>
                            {/* الصف الثاني (موحّد): الترقيم + أزرار التنقل + حجم الصفحة + زر الترتيب + تبديل العرض */}
                            {!controlsHidden && (
                                <div className="flex items-center justify-between gap-2 bg-transparent border-2 border-green-300 rounded-lg px-1 py-1">
                                    {enablePagination && (
                                        <div className="flex items-center gap-1">
                                            <span className="px-1.5 py-0.5 rounded bg-green-100 text-[11px] font-bold text-green-800 min-w-[46px] text-center">{currentPage}/{totalPages}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => { if (props.currentPageExternal === undefined) setInternalPage(1); else props.onPageChange && props.onPageChange(1); }} disabled={currentPage === 1} className="h-7 w-7 flex items-center justify-center rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-40 text-xs"><ChevronsRight className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => { const t = Math.max(1, currentPage - 1); if (props.currentPageExternal === undefined) setInternalPage(t); else props.onPageChange && props.onPageChange(t); }} disabled={currentPage === 1} className="h-7 w-7 flex items-center justify-center rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-40 text-xs"><ChevronRight className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => { const t = Math.min(totalPages, currentPage + 1); if (props.currentPageExternal === undefined) setInternalPage(t); else props.onPageChange && props.onPageChange(t); }} disabled={currentPage === totalPages || totalPages === 0} className="h-7 w-7 flex items-center justify-center rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-40 text-xs"><ChevronLeft className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => { if (props.currentPageExternal === undefined) setInternalPage(totalPages); else props.onPageChange && props.onPageChange(totalPages); }} disabled={currentPage === totalPages || totalPages === 0} className="h-7 w-7 flex items-center justify-center rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-40 text-xs"><ChevronsLeft className="h-3.5 w-3.5" /></button>
                                            </div>
                                            <select value={pageSize.toString()} onChange={(e) => setPageSize(parseInt(e.target.value))} className="h-7 px-1 text-[10px] rounded bg-green-100 text-green-800 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-300/50">
                                                {effectivePageSizeOptions.map(o => <option className='text-green-900' key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 ml-auto">
                                        {!hideSortToggle && enableSorting && columns.length > 0 && (
                                            <button
                                                aria-label={sortDirection === null ? 'تفعيل الترتيب التصاعدي' : sortDirection === 'asc' ? 'التبديل إلى ترتيب تنازلي' : 'إلغاء الترتيب'}
                                                onClick={() => toggleSort()}
                                                className={cn(
                                                    'h-7 w-7 flex items-center justify-center rounded-md shadow border transition-colors duration-200',
                                                    sortDirection === null
                                                        ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                                        : sortDirection === 'asc'
                                                            ? 'bg-green-500 text-white border-green-600 hover:bg-green-600'
                                                            : 'bg-green-700 text-white border-green-800 hover:bg-green-800'
                                                )}
                                            >
                                                {sortDirection === null && <ArrowUpDown className="h-4 w-4" />}
                                                {sortDirection === 'asc' && <ChevronUp className="h-4 w-4" />}
                                                {sortDirection === 'desc' && <ChevronDown className="h-4 w-4" />}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setViewMode('table')} className={cn('h-7 w-7 flex items-center justify-center rounded-md shadow text-xs border', viewMode === 'table' ? 'bg-white text-green-700 border-green-400' : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200')} title="عرض الجدول"><List className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => setViewMode('card')} className={cn('h-7 w-7 flex items-center justify-center rounded-md shadow text-xs border', viewMode === 'card' ? 'bg-white text-green-700 border-green-400' : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200')} title="عرض البطاقات"><LayoutGrid className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            )}

                            {(collapsible || onToggleCollapse) && (
                                <div className="flex items-center justify-between gap-2 bg-transparent border-2 border-green-300 rounded-lg px-1 py-1">
                                    <button
                                        type="button"
                                        onClick={handleToggleInternal}
                                        aria-label={effectiveCollapsed ? 'إظهار المحتوى' : 'إخفاء المحتوى'}
                                        aria-expanded={!effectiveCollapsed}
                                        className={cn('h-7 w-7 inline-flex items-center justify-center rounded-md border border-green-300 bg-green-100 text-green-700 hover:bg-green-200 transition-all shadow-sm', !effectiveCollapsed && 'rotate-180')}
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}


                </div>
            )}


            {/* حاوية متحركة للمحتوى القابل للطي */}
            <div
                ref={contentRef}
                style={{
                    height: contentHeight !== null ? contentHeight : undefined,
                    transition: 'height 0.34s cubic-bezier(.4,.0,.2,1)',
                }}
                className={cn(
                    'transition-[height] duration-300 overflow-hidden will-change-[height] w-full relative',
                    effectiveCollapsed ? 'pb-0' : 'pb-0'
                )}
                id={typeof title === 'string' ? `${title}-content` : undefined}
            >
                <div className={cn('transition-opacity duration-200 ease-out', effectiveCollapsed ? 'opacity-0 pointer-events-none select-none' : 'opacity-100')}>
                    {/* Spacer للحفاظ على اتساق الخلفية عند الطي (اختياري) */}
                    {effectiveCollapsed && <div className="h-0" aria-hidden="true" />}

                    {/* حالة عدم وجود بيانات */}
                    {!effectiveCollapsed && displayData.length === 0 && (
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

                    {/* عرض البيانات - حسب نمط العرض */}
                    {/* ... باقي الكود كما هو ... */}
                </div>
            </div>
        </div>
    );
}