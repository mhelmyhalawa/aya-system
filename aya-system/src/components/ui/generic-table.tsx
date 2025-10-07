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
    /** تحديد نوع تنسيق أزرار التحكم على الموبايل 'wrap' (متعدد الصفوف) أو 'single-row' (صف واحد) أو 'equal' (توزيع متساوي) */
    mobileControlsLayout?: 'wrap' | 'single-row' | 'equal';
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

    // مرجع لمعرفة إذا كنا انتقلنا للتو بين حالتي الموبايل وسطح المكتب
    const prevIsMobileRef = useRef<boolean>(isMobile);

    // 1) فرض نمط البطاقات على الموبايل ونمط الجدول على سطح المكتب (سلوك سابق محفوظ)
    useEffect(() => {
        if (isMobile) {
            setViewMode('card');
        } else {
            setViewMode('table');
        }
    }, [isMobile]);

    // 2) عند الانتقال لأول مرة إلى الموبايل: إن لم يُمرَّر cardPageSize نضع 1 كإعداد ابتدائي فقط (ولا نُعيد فرضه بعد تغيير المستخدم).
    //    عند الخروج من الموبايل نعيد قيمة سطح المكتب السابقة (المحفوظة في prevPageSizeRef) إذا كنا في نمط الجدول.
    useEffect(() => {
        const wasMobile = prevIsMobileRef.current;
        if (isMobile && !wasMobile) {
            // انتقال إلى الموبايل الآن
            if (!cardPageSize) {
                // ضبط مبدئي فقط
                setPageSize(1);
            }
        } else if (!isMobile && wasMobile) {
            // خروج من الموبايل الآن
            if (viewMode === 'table') {
                const desired = prevPageSizeRef.current || defaultPageSize;
                setPageSize(desired);
            }
        }
        prevIsMobileRef.current = isMobile;
    }, [isMobile, cardPageSize, viewMode, defaultPageSize]);

    // 3) إذا تم تمرير cardPageSize نفرضه في الموبايل (ويمكن أن نسمح بسلوكه أيضاً في غير الموبايل إذا رغبت لاحقاً)
    useEffect(() => {
        if (isMobile && cardPageSize && cardPageSize > 0 && pageSize !== cardPageSize) {
            setPageSize(cardPageSize);
        }
    }, [isMobile, cardPageSize, pageSize]);

    // 4) تحديث مرجع آخر حجم صفحة لسطح المكتب عند أي تغيير يدوي في وضع سطح المكتب فقط
    useEffect(() => {
        if (!isMobile && pageSize > 0 && (!cardPageSize || pageSize !== cardPageSize)) {
            prevPageSizeRef.current = pageSize;
        }
    }, [isMobile, pageSize, cardPageSize]);

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
                                    className={cn(
                                        'h-7 w-7 inline-flex items-center justify-center rounded-md border border-green-300 bg-green-100 text-green-700 hover:bg-green-200 transition-all shadow-sm',
                                        !effectiveCollapsed && 'rotate-180'
                                    )}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* الصف الثاني (مُوحّد): الترقيم + أزرار التنقل + حجم الصفحة + الترتيب */}
                    {!controlsHidden && (
                        <div
                            className={cn(
                                "bg-transparent border-2 border-green-500 rounded-lg px-2 py-2 flex items-center w-full gap-1",
                                "overflow-hidden flex-nowrap flex-shrink"
                            )}
                            style={{ flexWrap: "nowrap" }}
                        >
                            {enablePagination && (
                                <>
                                    {/* رقم الصفحة */}
                                    <div className="flex items-center justify-center flex-[0.8] min-w-0">
                                        <span className="h-7 w-full flex items-center justify-center rounded bg-green-200/60 dark:bg-green-800/60 text-[11px] font-bold text-green-900 dark:text-green-100 truncate">
                                            {currentPage}/{totalPages}
                                        </span>
                                    </div>

                                    {/* أزرار التنقل */}
                                    <div className="flex items-center justify-center flex-[3] min-w-0 gap-1">
                                        <button
                                            onClick={() => {
                                                if (props.currentPageExternal === undefined) setInternalPage(1);
                                                else props.onPageChange && props.onPageChange(1);
                                            }}
                                            disabled={currentPage === 1}
                                            className="h-7 flex-1 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700"
                                        >
                                            <ChevronsRight className="h-3.5 w-3.5" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                const t = Math.max(1, currentPage - 1);
                                                if (props.currentPageExternal === undefined) setInternalPage(t);
                                                else props.onPageChange && props.onPageChange(t);
                                            }}
                                            disabled={currentPage === 1}
                                            className="h-7 flex-1 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                const t = Math.min(totalPages, currentPage + 1);
                                                if (props.currentPageExternal === undefined) setInternalPage(t);
                                                else props.onPageChange && props.onPageChange(t);
                                            }}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="h-7 flex-1 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (props.currentPageExternal === undefined)
                                                    setInternalPage(totalPages);
                                                else props.onPageChange && props.onPageChange(totalPages);
                                            }}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="h-7 flex-1 flex items-center justify-center rounded bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 disabled:opacity-40 text-xs hover:bg-green-200 dark:hover:bg-green-700"
                                        >
                                            <ChevronsLeft className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* اختيار حجم الصفحة */}
                                    <div className="flex items-center justify-center flex-[1.2] min-w-0">
                                        <select
                                            value={pageSize.toString()}
                                            onChange={(e) => setPageSize(parseInt(e.target.value))}
                                            className="h-7 w-full text-[10px] rounded bg-green-100/60 dark:bg-green-800/40 text-green-900 dark:text-green-100 border border-green-400/30 focus:outline-none focus:ring-2 focus:ring-green-400/40 truncate"
                                        >
                                            {effectivePageSizeOptions.map((o) => (
                                                <option className="text-green-900" key={o} value={o}>
                                                    {o}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* زر الترتيب */}
                            <div className="flex items-center justify-center flex-[0.8] min-w-0 ml-auto">
                                {!hideSortToggle && enableSorting && columns.length > 0 && (
                                    <button
                                        aria-label={
                                            sortDirection === null
                                                ? 'تفعيل الترتيب التصاعدي'
                                                : sortDirection === 'asc'
                                                    ? 'التبديل إلى ترتيب تنازلي'
                                                    : 'إلغاء الترتيب'
                                        }
                                        onClick={() => toggleSort()}
                                        className={cn(
                                            "h-7 w-full flex items-center justify-center rounded-md shadow border transition-colors duration-200",
                                            sortDirection === null
                                                ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                                                : sortDirection === "asc"
                                                    ? "bg-green-500 text-white border-green-600 hover:bg-green-600"
                                                    : "bg-green-700 text-white border-green-800 hover:bg-green-800"
                                        )}
                                    >
                                        {sortDirection === null && <ArrowUpDown className="h-4 w-4" />}
                                        {sortDirection === "asc" && <ChevronUp className="h-4 w-4" />}
                                        {sortDirection === "desc" && <ChevronDown className="h-4 w-4" />}
                                    </button>
                                )}
                            </div>
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

                    {/* وضع الجدول */}
                    {!effectiveCollapsed && displayData.length > 0 && viewMode === 'table' && (
                        <div className="border border-green-300 dark:border-green-800 overflow-hidden bg-white 
                dark:bg-green-950/20 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_8px_15px_rgba(0,0,0,0.1)] h-full flex flex-col">
                            {/* تمت إزالة شريط الترقيم العلوي المستقل - تم دمجه في الهيدر */}
                            <div className={cn(
                                "custom-scrollbar scrollbar-green scroll-fade-overlay rounded-b-lg flex-1",
                                !noMaxHeight && 'max-h-[calc(100vh-200px)]',
                                // لا نضيف سلوك التمرير إلا عندما يكون المحتوى موسعاً لتفادي الفلاش
                                !effectiveCollapsed && 'overflow-x-auto overflow-auto'
                            )}>
                                <Table className="direction-rtl w-full border-collapse text-[11px] sm:text-[12px]">
                                    <TableHeader className={cn('sticky top-0 z-10 shadow-inner', sortGradientClass)}>
                                        <TableRow>
                                            {columns.map((column, colIdx) => {
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
                                                            'font-bold text-white py-2 sm:py-3 px-2 sm:px-4 border-r border-green-600/50 dark:border-green-800/50',
                                                            !hideSortToggle && enableSorting && colIdx === 0 && 'cursor-pointer select-none hover:bg-green-600/60',
                                                            hideSortToggle && enableSorting && colIdx === 0 && 'pointer-events-none'
                                                        )}
                                                        onClick={() => {
                                                            if (!hideSortToggle && enableSorting && colIdx === 0) toggleSort();
                                                        }}
                                                        style={{ width: column.width }}
                                                    >
                                                        <span className="inline-flex items-center gap-1">
                                                            {column.header}
                                                            {/* إشارة حالة الترتيب: سهم مزدوج محايد عند عدم اختيار اتجاه */}
                                                            {!hideSortToggle && enableSorting && colIdx === 0 && (
                                                                sortDirection === null ? (
                                                                    <ArrowUpDown className="h-3 w-3 text-white/60" />
                                                                ) : sortDirection === 'asc' ? (
                                                                    <ChevronUp className="h-3 w-3 text-yellow-300" />
                                                                ) : (
                                                                    <ChevronDown className="h-3 w-3 text-yellow-300" />
                                                                )
                                                            )}
                                                        </span>
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
                                                    'odd:bg-green-50 even:bg-white dark:odd:bg-green-900/20 dark:even:bg-green-950/10 border-b border-green-200 dark:border-green-800/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]',
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
                                                                'py-1.5 sm:py-2.5 px-2 sm:px-4 font-medium text-green-900 dark:text-green-200 border-r border-green-200/70 dark:border-green-800/30'
                                                            )}
                                                        >
                                                            {column.render ? (
                                                                (() => {
                                                                    const vm: any = viewMode; // workaround TS comparison quirk
                                                                    const pageSpan = (vm === 'card' && isMobile) ? 1 : pageSize;
                                                                    const globalIndex = (currentPage - 1) * pageSpan + index;
                                                                    return column.render!(item, globalIndex);
                                                                })()
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
                </div>

                {/* وضع البطاقات */}
                {!effectiveCollapsed && displayData.length > 0 && viewMode === 'card' && (() => {
                    const effective = enablePagination ? displayData : sortedData;
                    const smallSet = effective.length <= (cardPageSize ?? 2);
                    // حجم الصفحة حسب نوع الجهاز
                    // الحجم المنطقي لعدد البطاقات في العرض (إن تم تحديد cardPageSize نستخدمه، وإلا نعرض الكل في سطح المكتب وواحدة في الموبايل)
                    const cardLogicalPageSize = isMobile
                        ? (cardPageSize ?? 1)
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
                        ? 'w-full p-2 custom-scrollbar scrollbar-thin scrollbar-green scroll-fade-overlay'
                        : smallSet
                            ? cn('flex flex-col md:flex-row gap-4 w-full p-2 overflow-auto custom-scrollbar scrollbar-green scroll-fade-overlay justify-center items-stretch', !noMaxHeight && 'max-h-[calc(100vh-200px)]')
                            : cn(`grid gap-4 w-full p-2 overflow-auto custom-scrollbar scrollbar-green scroll-fade-overlay
                            grid-cols-${Math.min(cardLogicalPageSize, 2)} md:grid-cols-${Math.min(cardLogicalPageSize, cardGridColumns.md || cardLogicalPageSize)} lg:grid-cols-${Math.min(cardLogicalPageSize, cardGridColumns.lg || cardLogicalPageSize)} xl:grid-cols-${Math.min(cardLogicalPageSize, cardGridColumns.xl || cardLogicalPageSize)}`,
                                !noMaxHeight && 'max-h-[calc(100vh-200px)]');

                    return (
                        <div className="w-full flex flex-col items-stretch h-full">
                            {/* الترقيم مدمج في الهيدر؛ لا حاجة لعنصر علوي هنا */}
                            {/* النقاط (متمركزة) فوق الشبكة عند عدم تفعيل الترقيم */}
                            {!enablePagination && totalItems > 1 && <Dots />}
                            <div className={containerClass}>
                                {(() => {
                                    const CardItem = ({ item, globalIndex }: { item: T; globalIndex: number }) => {
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
                                                {/* الرأس (لون ديناميكي حسب حالة الترتيب) */}
                                                <div className={cn('px-2 sm:px-3 py-1.5 sm:py-2.5 text-white rounded-t-lg shadow-md flex items-center justify-between', sortGradientClass)}>
                                                    <h3 className="font-bold text-sm sm:text-base tracking-wide text-white drop-shadow-sm truncate flex-1 flex items-center gap-2">
                                                        {indexColumn && (
                                                            <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] rounded-full bg-white/15 border border-white/30 text-xs font-semibold shadow-inner backdrop-blur-sm">
                                                                {indexColumn.render ? indexColumn.render(item, globalIndex) : (item as any)[indexColumn.key] ?? (globalIndex + 1)}
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
                                                    <table className="hidden sm:table w-full border border-green-300 dark:border-green-700 text-[11px] sm:text-xs table-fixed">
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
                                                                            <div className="w-full sm:max-w-xs text-[11px] sm:text-sm text-green-800 dark:text-green-100 bg-green-50 dark:bg-green-800/30 border border-green-200 dark:border-green-700 rounded-md px-2 py-1 min-h-[24px] sm:min-h-[26px] flex items-center justify-center">
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
                                                    <div className="sm:hidden space-y-2">
                                                        {visibleColumns.map((column) => {
                                                            const value = column.render
                                                                ? column.render(item)
                                                                : (item as any)[column.key];
                                                            return (
                                                                <div
                                                                    key={`${item.id}-${column.key}-form`}
                                                                    className="p-1.5 border-b border-green-200 dark:border-green-700"
                                                                >
                                                                    {/* العنوان */}
                                                                    <div className="text-[11px] font-medium text-gray-600 dark:text-gray-300 mb-0.5 text-right">
                                                                        {column.header}
                                                                    </div>

                                                                    {/* القيمة */}
                                                                    <div className="flex justify-center">
                                                                        <div
                                                                            className="w-full sm:max-w-xs text-[11px] sm:text-sm text-green-800 dark:text-green-100 bg-green-50 dark:bg-green-800/30 border border-green-200 dark:border-green-700 rounded-md px-2 py-1 min-h-[24px] flex items-center justify-center"
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
                                    // احسب globalIndex لكل عنصر في وضع البطاقات (مع الترقيم الصفحي إن وُجد)
                                    const baseIndex = enablePagination ? (currentPage - 1) * cardLogicalPageSize : 0;
                                    return visibleSlice.map((d, idx) => (
                                        <CardItem key={d.id} item={d} globalIndex={baseIndex + idx} />
                                    ));
                                })()}
                            </div>
                            {/* النقاط أسفل الشبكة أيضاً (اختياري يمكن الإبقاء على واحدة فقط، سنترك نسخة سفلية للتوازن على الشاشات الكبيرة) */}
                            {!enablePagination && totalItems > 1 && !isMobile && <Dots />}
                            {/* يمكن إضافة شريط سفلي لاحقاً عبر prop إذا لزم */}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
