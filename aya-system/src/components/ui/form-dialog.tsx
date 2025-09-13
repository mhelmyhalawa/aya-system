import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
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
    extraButtons
}: FormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[480px] w-full"
                style={{ maxWidth: maxWidth }}
                dir="rtl"
            >
                {/* الإطار الداخلي */}
                <div>
                    {/* الهيدر */}
                    <DialogHeader className="pb-2 flex justify-center items-center">
                        <DialogTitle className="w-full flex justify-center">
                            <h3 className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-400 to-green-500 text-white text-lg font-semibold py-2 px-6 rounded-2xl shadow-md transform transition-transform hover:scale-105">
                                <span>{title}</span>
                            </h3>
                        </DialogTitle>
                    </DialogHeader>

                    {/* الجسم */}
                    <div className="space-y-4">
                        {children}
                    </div>

                    {/* الفوتر */}
                    <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
                        {extraButtons}

                        <Button
                            type="button"
                            onClick={onSave}
                            disabled={isLoading}
                            className={cn(
                                "text-white rounded-xl px-4 py-2 text-sm transition-transform transform hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto shadow-md",
                                mode === "add"
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "bg-green-600 hover:bg-green-700"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                    <span>جاري...</span>
                                </>
                            ) : (
                                <>
                                    {mode === "add" ? (
                                        <PlusCircle className="h-4 w-4 sm:mr-1" />
                                    ) : (
                                        <Check className="h-4 w-4 sm:mr-1" />
                                    )}
                                    <span className="hidden sm:inline">{saveButtonText}</span>
                                    <span className="sm:hidden">{mode === "add" ? "إضافة" : "حفظ"}</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>

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
        <div className={`space-y-2 ${className}`}>
            <div className="flex justify-between items-center">
                <label className="text-gray-800 text-sm font-medium">{label}</label>
                {error && <span className="text-red-500 text-xs">{error}</span>}
            </div>
            {children}
        </div>
    );
}
