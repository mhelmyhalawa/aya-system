import * as React from "react";
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogPortal,
    DialogOverlay,
    DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, PlusCircle, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type FormDialogProps = {
    /**
     * عنوان الحوار
     */
    title: string;

    /**
     * وصف الحوار (اختياري)
     */
    description?: React.ReactNode;

    /**
     * حالة فتح/إغلاق الحوار
     */
    open: boolean;

    /**
     * وظيفة تُستدعى عند تغيير حالة الحوار
     */
    onOpenChange: (open: boolean) => void;

    /**
     * وظيفة تُستدعى عند حفظ النموذج
     */
    onSave: () => void;

    /**
     * محتوى النموذج
     */
    children: React.ReactNode;

    /**
     * نص زر الحفظ (اختياري، الافتراضي "حفظ")
     */
    saveButtonText?: string;

    /**
     * نص زر الإلغاء (اختياري، الافتراضي "إلغاء")
     */
    cancelButtonText?: string;

    /**
     * نوع العملية: إضافة أو تعديل (اختياري، الافتراضي "إضافة")
     */
    mode?: "add" | "edit";

    /**
     * حالة التحميل (اختياري)
     */
    isLoading?: boolean;

    /**
     * عرض الحوار (اختياري، الافتراضي 480px)
     */
    maxWidth?: string;

    /**
     * أزرار إضافية في الفوتر (اختياري)
     */
    extraButtons?: React.ReactNode;

    /**
     * إخفاء زر الإلغاء (مثلاً في نمط ويزارد ضيق)
     */
    hideCancelButton?: boolean;
    /**
     * محتوى مخصص للهيدر، إذا تم توفيره سيتم استبدال الهيدر الافتراضي بالكامل
     */
    headerContent?: React.ReactNode;
    /**
     * إخفاء زر الحفظ (مفيد لحوارات العرض / القوائم)
     */
    showSaveButton?: boolean;
    /**
     * جعل جسم الحوار ممتداً بكامل العرض (إلغاء الحشوات الأفقية)
     * مفيد في القوائم أو الجداول التي نريدها تلامس الحواف الداخلية
     */
    fullBleedBody?: boolean;
    /**
     * في الموبايل اجعل الحاوية تمتد بعرض الشاشة بالكامل بدون حدود جانبية داخلية إضافية
     * useful for wide multi-step wizard forms
     */
    mobileFullWidth?: boolean;
    /** نمط أبسط للموبايل (خلفية بيضاء وبدون تدرج) */
    mobileFlatStyle?: boolean;
    /** جعل شريط العنوان / التقدم لاصق (sticky) في الأعلى بالموبايل */
    mobileStickyHeader?: boolean;
    /** جعل الحوار يأخذ طول الشاشة كاملاً في الموبايل (ويزارد كامل الشاشة) */
    mobileFullScreen?: boolean;
    /** في الموبايل: عرض أزرار الإجراءات (رجوع / التالي) جنباً إلى جنب بدلاً من تكديسها */
    mobileInlineActions?: boolean;
    /** في الموبايل مع inline actions ضع الزر الأساسي (التالي/حفظ) في اليسار والرجوع في اليمين */
    mobilePrimaryLeft?: boolean;
    /** تقليل الفراغ السفلي بين محتوى الجسم والفوتر في الموبايل (يقلل الـ padding) */
    compactFooterSpacing?: boolean;
    /** إضافة ظل علوي خفيف للفوتر في الموبايل لتحسين الفصل البصري */
    mobileFooterShadow?: boolean;
    /** اجعل زر الحفظ/التالي يُرسم أولاً (مفيد لعكس الترتيب في RTL ليظهر يميناً) */
    saveButtonFirst?: boolean;
    /** جعل جسم الحوار شفاف تماماً بدون حواف أو خلفية بحيث يبدو كأنه غير موجود */
    transparentBody?: boolean;
    /** محتوى اختياري لمؤشرات خطوات (Wizard) يعرض أسفل العنوان مباشرة وخارج منطقة التمرير */
    wizardSteps?: React.ReactNode;
};

/**
 * مكون حوار عام للنماذج يستخدم للإضافة والتعديل
 */
export function FormDialog({
    title,
    description,
    open,
    onOpenChange,
    onSave,
    children,
    saveButtonText = "حفظ",
    cancelButtonText = "إلغاء",
    mode = "add",
    isLoading = false,
    maxWidth = "480px",
    extraButtons,
    hideCancelButton = true,
    headerContent,
    showSaveButton,
    fullBleedBody,
    mobileFullWidth = true,
    mobileFlatStyle = false,
    mobileStickyHeader = true,
    mobileFullScreen = false,
    mobileInlineActions = false,
    mobilePrimaryLeft = false,
    compactFooterSpacing = false,
    mobileFooterShadow = false,
    saveButtonFirst = false,
    transparentBody = false,
    wizardSteps
}: FormDialogProps) {
    const realShowSaveButton = showSaveButton !== false; // default true if undefined
    const hasFooterContent = realShowSaveButton || (!!extraButtons) || (!hideCancelButton && realShowSaveButton);
    // ديناميكيات ارتفاع الحاوية: إذا لا يوجد فوتر نلغي h-full حتى لا يظهر فراغ سفلي كبير
    // في كلا الحالتين نُبقي الحوار بكامل ارتفاع الشاشة في الموبايل، لكن بدون فوتر نجعل الجسم يتمدد ليملأ المساحة
    const containerHeightClasses = mobileFullScreen
        ? 'h-screen sm:h-auto max-h-screen sm:max-h-[85vh]'
        : 'h-full sm:h-auto max-h-full sm:max-h-[85vh]';
    // إذا لا يوجد فوتر فعلي نستخدم حشوة سفلية أصغر
    const bodyBottomPaddingClass = hasFooterContent
        ? (compactFooterSpacing ? 'pb-16 sm:pb-1' : 'pb-24 sm:pb-1')
        : 'pb-2 sm:pb-1';
    // دعم الإمتداد الكامل
    const bodyHorizontalPaddingClass = (typeof fullBleedBody !== 'undefined' && fullBleedBody) ? 'px-0 pr-0' : 'px-1 pr-2';
    const hasExtraButtons = !!extraButtons;
    // تخطيط الفوتر في الموبايل: نجعل الأزرار تأخذ نفس العرض بدون فراغ كبير بينهما
    const footerLayoutMobile = mobileInlineActions
        ? (mobilePrimaryLeft
            ? (hasExtraButtons ? 'flex-row-reverse' : 'flex-row')
            : 'flex-row')
        : 'flex-col-reverse';
    const saveButtonWidthClasses = mobileInlineActions ? 'flex-1 basis-0 sm:w-auto' : 'w-full sm:w-auto';
    // إذا تم تمرير wizardSteps نجعل الجسم شفاف افتراضياً ما لم يُطلب عكس ذلك
    const effectiveTransparentBody = transparentBody || !!wizardSteps;
    // تعطيل تأثير التدرج العلوي/السفلي عند وجود خطوات ويزارد أو شفافية حتى لا يُغطي شريط التقدم
    const scrollFadeClass = (!wizardSteps && !effectiveTransparentBody) ? 'scroll-fade-overlay' : '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                {/* الخلفية */}
                <DialogOverlay />

                {/* الحاوية الرئيسية */}
                <div
                    dir="rtl"
                    style={{ maxWidth, "--dialog-max-width": maxWidth } as React.CSSProperties}
                    className={cn(
                        "fixed z-50 grid",
                        mobileFullWidth
                            ? "inset-x-0 top-0 w-full"
                            : "inset-x-4 top-0 w-auto",
                        "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
                        // السماح بالتحكم الكامل في العرض عبر خاصية maxWidth (حذف العرض الثابت)
                        // تم إزالة sm:w-[500px] ليتبع style.maxWidth
                        "gap-2 border sm:border p-2 sm:p-4 shadow-lg sm:rounded-lg",
                        "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-1/2",
                        "sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-1/2",
                        // max-w يعتمد الآن على style (maxWidth) بدلاً من تثبيته 500px
                        "max-w-full sm:max-w-full overflow-hidden sm:overflow-visible",
                        "bg-gradient-to-br from-teal-50 via-blue to-green-50 dark:from-teal-150 dark:via-green-950 dark:to-green-700",
                        containerHeightClasses
                    )}



                >
                    {/* زر الإغلاق */}
                    <DialogClose
                        className="absolute left-2 sm:left-3 top-2 sm:top-3 w-8 h-8 sm:w-7 sm:h-7 
                                    flex items-center justify-center rounded-full bg-red-500 text-white 
                                    hover:bg-red-600 shadow-md transition-all active:scale-95 hover:scale-105 
                                    focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 z-50"
                    >
                        <X className="h-5 w-5 sm:h-4 sm:w-4" />
                        <span className="sr-only">إغلاق</span>
                    </DialogClose>

                    {/* المحتوى الداخلي */}
                    <div className={cn("flex flex-col min-h-0", !hasFooterContent && "h-full")}>
                        {/* الهيدر */}
                        {headerContent ? (
                            <div className="mt-2 sm:mt-1 px-1 sm:px-0 flex items-center">
                                {headerContent}
                            </div>
                        ) : (
                            <div className={cn("mt-2 sm:mt-1 mb-1 px-1 sm:px-0",
                                mobileStickyHeader && "sticky top-0 z-40 bg-white/500 dark:bg-green-950/85 backdrop-blur-sm rounded-b-md pb-1")}>
                                {/* موبايل: العنوان وسط مستقل عن زر الإغلاق */}
                                <div className="relative sm:hidden h-10">
                                    <h3 className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-lg shadow-sm truncate max-w-[75%] text-center">
                                        {title}
                                    </h3>
                                </div>

                                {/* ديسكتوب */}
                                <DialogHeader className="hidden sm:flex pb-1 justify-center items-center mt-1">
                                    <DialogTitle className="w-full flex justify-center">
                                        <h3 className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-400 to-green-500 text-white text-base font-semibold py-1.5 px-5 rounded-xl shadow-md">
                                            <span>{title}</span>
                                        </h3>
                                    </DialogTitle>

                                    {description && (
                                        <DialogDescription className="text-xs text-center mt-1 text-muted-foreground">
                                            {description}
                                        </DialogDescription>
                                    )}
                                </DialogHeader>
                            </div>
                        )}

                        {wizardSteps && (
                            <div className={cn("px-1 sm:px-0 mt-1 sm:mt-0", effectiveTransparentBody && "mb-1")}>{wizardSteps}</div>
                        )}

                        {/* الجسم */}
                        <div
                            className={cn(
                                "space-y-2 overflow-auto custom-scrollbar scrollbar-green min-h-0 flex flex-col rounded-b-md !bg-transparent rounded-3xl p-3",
                                scrollFadeClass,
                                // تحكم بالمسافة العلوية: إذا لدينا wizardSteps نقلل/نلغي الهامش لتلتصق الخطوات بالجزء العلوي
                                wizardSteps ? "mt-0" : "mt-1",
                                // إذا لم نكن في نمط شفاف حافظ على الزوايا المستديرة (ممكن لاحقاً نقلها إلى عنصر آخر)
                                !effectiveTransparentBody && "rounded-b-md",
                                mobileFullScreen
                                    ? (hasFooterContent ? 'flex-1' : 'flex-1')
                                    : (hasFooterContent ? "max-h-[calc(100vh-155px)] sm:max-h-[55vh]" : "flex-1"),
                                bodyBottomPaddingClass,
                                bodyHorizontalPaddingClass,
                                effectiveTransparentBody && "p-0 px-0 pr-0"
                            )}
                        >
                            {children}
                        </div>


                        {/* الفوتر */}
                        {hasFooterContent && (
                            <DialogFooter
                                className={cn(
                                    `!bg-transparent
                                    flex ${footerLayoutMobile} w-full sm:flex-row sm:justify-end gap-2 mt-3 pt-2 border-t 
                                    border-gray-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static 
                                    fixed bottom-0 left-0 right-0 px-3 sm:px-0 py-3 sm:py-0`,
                                    mobileFooterShadow && 'shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.12)] sm:shadow-none'
                                )}
                            >
                                {extraButtons}

                                {/* ترتيب ديناميكي: إذا saveButtonFirst نرسم زر الحفظ قبل الأزرار الإضافية */}
                                {saveButtonFirst && realShowSaveButton && (
                                    <Button
                                        type="button"
                                        onClick={onSave}
                                        disabled={isLoading}
                                        className={cn(
                                            "text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-transform transform hover:scale-105 flex items-center justify-center gap-2 shadow-md flex-1 basis-0",
                                            saveButtonWidthClasses,
                                            mode === "add"
                                                ? "bg-blue-600 hover:bg-blue-700"
                                                : "bg-green-600 hover:bg-green-700"
                                        )}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span className="leading-none">جاري...</span>
                                            </>
                                        ) : (
                                            <>
                                                {saveButtonText === "التالي" ? (
                                                    <ChevronLeft className="h-4 w-4" />
                                                ) : mode === "add" ? (
                                                    <PlusCircle className="h-4 w-4" />
                                                ) : (
                                                    <Check className="h-4 w-4" />
                                                )}
                                                <span className="leading-none tracking-wide">{saveButtonText}</span>
                                            </>
                                        )}
                                    </Button>
                                )}



                                {/* زر إلغاء للموبايل */}
                                {!hideCancelButton && realShowSaveButton && (
                                    <Button
                                        type="button"
                                        onClick={() => onOpenChange(false)}
                                        variant="outline"
                                        className="border-red-300 hover:bg-red-100 text-red-700 rounded-lg py-1.5 w-full sm:hidden"
                                    >
                                        <X className="h-3.5 w-3.5 mr-1" />
                                        {cancelButtonText}
                                    </Button>
                                )}

                                {!saveButtonFirst && realShowSaveButton && (
                                    <Button
                                        type="button"
                                        onClick={onSave}
                                        disabled={isLoading}
                                        className={cn(
                                            "text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-transform transform hover:scale-105 flex items-center justify-center gap-2 shadow-md flex-1 basis-0",
                                            saveButtonWidthClasses,
                                            mode === "add"
                                                ? "bg-blue-600 hover:bg-blue-700"
                                                : "bg-green-600 hover:bg-green-700"
                                        )}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span className="leading-none">جاري...</span>
                                            </>
                                        ) : (
                                            <>
                                                {saveButtonText === "التالي" ? (
                                                    <ChevronLeft className="h-4 w-4" />
                                                ) : mode === "add" ? (
                                                    <PlusCircle className="h-4 w-4" />
                                                ) : (
                                                    <Check className="h-4 w-4" />
                                                )}
                                                <span className="leading-none tracking-wide">{saveButtonText}</span>
                                            </>
                                        )}
                                    </Button>
                                )}
                            </DialogFooter>
                        )}
                    </div>
                </div>
            </DialogPortal>
        </Dialog>

    );
}

/**
 * مكون للصف في نموذج الحوار
 */
export function FormRow({
    label,
    children,
    error,
    className = "",
}: {
    label: string;
    children: React.ReactNode;
    error?: string;
    className?: string;
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <div className="flex justify-between items-center">
                <label className="text-gray-800 text-xs font-medium">{label}</label>
                {error && <span className="text-red-500 text-[10px]">{error}</span>}
            </div>
            {children}
        </div>
    );
}
