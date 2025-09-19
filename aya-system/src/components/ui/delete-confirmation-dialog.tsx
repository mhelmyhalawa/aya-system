import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
  /**
   * عنوان مربع الحوار
   */
  title?: string;
  /**
   * وصف مربع الحوار (يمكن أن يتضمن JSX)
   */
  description?: React.ReactNode;
  /**
   * الكائن الذي سيتم حذفه (اختياري لعرض التفاصيل)
   */
  itemDetails?: Record<string, any> | null;
  /**
   * القائمة التي سيتم عرضها للتفاصيل (اختياري)
   */
  detailsLabels?: { key: string; label: string }[];
  /**
   * نص زر الحذف
   */
  deleteButtonText?: string;
  /**
   * نص زر الإلغاء
   */
  cancelButtonText?: string;
  /**
   * هل مربع الحوار مفتوح؟
   */
  isOpen: boolean;
  /**
   * هل العملية قيد التحميل؟
   */
  isLoading?: boolean;
  /**
   * دالة تُستدعى عند تغيير حالة مربع الحوار
   */
  onOpenChange: (isOpen: boolean) => void;
  /**
   * دالة تُستدعى عند تأكيد الحذف
   */
  onConfirm: () => void | Promise<void>;
}

/**
 * مكون مربع حوار تأكيد الحذف الموحد للنظام
 * يوفر واجهة موحدة للتأكد من إجراءات الحذف بتصميم إسلامي عصري
 */
export function DeleteConfirmationDialog({
  title = "تأكيد الحذف",
  description = "هل أنت متأكد من رغبتك في حذف هذا العنصر؟",
  itemDetails = null,
  detailsLabels = [],
  deleteButtonText = "نعم، قم بالحذف",
  cancelButtonText = "إلغاء",
  isOpen,
  isLoading = false,
  onOpenChange,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="z-[100] max-w-[95vw] sm:max-w-lg border-2 border-red-200 shadow-lg bg-white">
        {/* زخرفة إسلامية في الخلفية */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[url('/patterns/islamic-pattern.svg')] bg-repeat pointer-events-none rounded-lg"></div>
        
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-red-800 flex items-center gap-2 border-r-4 border-red-500 pr-2">
            <div className="bg-red-100 text-red-600 p-1.5 rounded-full">
              <Trash2 className="h-5 w-5" />
            </div>
            {title}
          </AlertDialogTitle>

        <AlertDialogDescription 
        dir="rtl" 
        className="text-gray-700 mt-2 leading-relaxed text-right"
        >
        {description}

        {/* عرض تفاصيل العنصر إذا كانت متوفرة */}
        {itemDetails && (
            <div className="mt-3 bg-red-50 p-3 rounded-md border border-red-100 text-red-700">
            <div className="font-semibold border-b border-red-100 pb-1 mb-2">
                تفاصيل العنصر:
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {detailsLabels && detailsLabels.length > 0 ? (
                // عرض التفاصيل وفق الترتيب المحدد
                detailsLabels.map(({ key, label }) => (
                    <React.Fragment key={key}>
                    <div className="font-medium">{label}:</div>
                    <div>{itemDetails[key]?.toString() || "-"}</div>
                    </React.Fragment>
                ))
                ) : (
                // عرض جميع القيم المتاحة
                Object.entries(itemDetails).map(([key, value]) => (
                    <React.Fragment key={key}>
                    <div className="font-medium">{key}:</div>
                    <div>{value?.toString() || "-"}</div>
                    </React.Fragment>
                ))
                )}
            </div>
            </div>
        )}

        <div className="mt-4 text-red-700 font-medium border-r-2 border-red-300 pr-2">
            ⚠️ تنبيه: لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
        </div>
        </AlertDialogDescription>


        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex gap-2 justify-end mt-4">
          <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-transparent hover:border-gray-300 transition-all">
            {cancelButtonText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-2 border-transparent hover:border-red-900 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                جارٍ الحذف...
              </span>
            ) : (
              deleteButtonText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
