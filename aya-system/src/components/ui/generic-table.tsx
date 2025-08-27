import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { BookOpen } from 'lucide-react';

// تعريف واجهة العمود للجدول العام
export interface Column<T> {
    key: string;  // مفتاح البيانات
    header: string;  // عنوان العمود
    width?: string;  // عرض العمود (اختياري)
    align?: 'left' | 'center' | 'right';  // محاذاة العمود (اختياري)
    render?: (item: T) => React.ReactNode;  // دالة لتخصيص عرض الخلية (اختياري)
}

// مكون الجدول العام القابل لإعادة الاستخدام
export function GenericTable<T extends { id: string }>({
    data,
    columns,
    emptyMessage = "لا توجد بيانات",
    className = "",
    rowClassName = "",
    getRowClassName
}: {
    data: T[];
    columns: Column<T>[];
    emptyMessage?: string;
    className?: string;
    rowClassName?: string;
    getRowClassName?: (item: T, index: number) => string;
}) {
    return (
        <div className="border border-green-200 dark:border-green-700 rounded-2xl overflow-hidden shadow-md">
            <Table className="direction-rtl w-full border-collapse">

                {/* Header */}
               <TableHeader className="bg-gradient-to-b from-green-800 via-green-600 to-green-300 dark:from-green-900 dark:via-green-800 dark:to-green-500">
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead
                                key={column.key}
                                className={`text-${column.align === "center" ? "center" : column.align === "left" ? "left" : "right"} font-bold text-white py-3 px-4 border-r border-green-600 dark:border-green-800`}
                                style={{ width: column.width }}
                            >
                                {column.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                {/* Body */}
                <TableBody>
                    {data.length > 0 ? (
                        data.map((item, index) => (
                            <TableRow
                                key={item.id}
                                className={`odd:bg-green-50 even:bg-white dark:odd:bg-green-800 dark:even:bg-green-900 hover:bg-green-100 dark:hover:bg-green-700 transition-colors duration-200 border-b border-green-200 dark:border-green-700`}
                            >
                                {columns.map((column) => (
                                    <TableCell
                                        key={`${item.id}-${column.key}`}
                                        className={`text-${column.align === "center" ? "center" : column.align === "left" ? "left" : "right"} py-3 px-4 font-medium text-green-900 dark:text-green-200 border-r border-green-200 dark:border-green-700`}
                                    >
                                        {column.render ? (
                                            column.render(item)
                                        ) : (item as any)[column.key] ? (
                                            <span>{(item as any)[column.key]}</span>
                                        ) : (
                                            <span className="text-green-600 dark:text-green-400 italic">-</span>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="text-center py-10"
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <BookOpen className="h-8 w-8 text-green-300 mb-2" />
                                    <p className="text-green-600 dark:text-green-400">
                                        {emptyMessage || "لا توجد بيانات"}
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>




    );
}
