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
import { Check, Pencil, PlusCircle, Save, X } from "lucide-react";
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
    hideCancelButton = false
}: FormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/60" />
                <div
                    className="fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-2 border bg-background p-3 sm:p-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-w-[90%] sm:max-w-[450px] h-auto max-h-[85vh] overflow-y-auto"
                    style={{ maxWidth: maxWidth }}
                    dir="rtl"
                >
                    {/* زر الإغلاق مخصص للواجهة العربية والموبايل - أكبر وأكثر بروزًا على الهاتف */}
                    <DialogClose className="absolute left-2 sm:left-3 top-2 sm:top-3 rounded-full w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center bg-red-500 text-white hover:bg-red-600 shadow-md transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 z-50">
                        <X className="h-5 w-5 sm:h-4 sm:w-4" />
                        <span className="sr-only">إغلاق</span>
                    </DialogClose>

                    {/* الإطار الداخلي */}
                    <div>
                        {/* الهيدر */}
                        <DialogHeader className="pb-1 flex justify-center items-center mt-6 sm:mt-1">
                            <DialogTitle className="w-full flex justify-center">
                                <h3 className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-400 to-green-500 text-white text-base font-semibold py-1.5 px-5 rounded-xl shadow-md transform transition-transform hover:scale-105">
                                    <span>{title}</span>
                                </h3>
                            </DialogTitle>
                        </DialogHeader>

                        {/* الجسم */}
                        <div className="space-y-3 mt-1 pb-1 max-h-[55vh] overflow-y-auto px-1">
                            {children}
                        </div>

                        {/* الفوتر */}
                        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-3 pt-2 border-t border-gray-200">
                            {extraButtons}
                            {/* زر إغلاق إضافي في الفوتر للأجهزة المحمولة */}
                            {!hideCancelButton && (
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
                            <Button
                                type="button"
                                onClick={onSave}
                                disabled={isLoading}
                                className={cn(
                                    "text-white rounded-lg px-3 py-1.5 text-sm transition-transform transform hover:scale-105 flex items-center justify-center gap-1.5 w-full sm:w-auto shadow-md",
                                    mode === "add"
                                        ? "bg-blue-600 hover:bg-blue-700"
                                        : "bg-green-600 hover:bg-green-700"
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                        <span>جاري...</span>
                                    </>
                                ) : (
                                    <>
                                        {mode === "add" ? (
                                            <PlusCircle className="h-3.5 w-3.5 sm:mr-1" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5 sm:mr-1" />
                                        )}
                                        <span className="hidden sm:inline">{saveButtonText}</span>
                                        <span className="sm:hidden">{mode === "add" ? "إضافة" : "حفظ"}</span>
                                    </>
                                )}
                            </Button>


                        </DialogFooter>
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
