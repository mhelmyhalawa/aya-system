// تعريف حالات الحضور
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// تعريف سجل الحضور
export interface Attendance {
  circle_session_id: number; // معرف جلسة الحلقة
  student_id: string; // معرف الطالب
  status: AttendanceStatus; // حالة الحضور
  late_minutes?: number; // عدد دقائق التأخير (اختياري)
  note?: string; // ملاحظة (اختياري)
  recorded_by?: string; // معرف مسجل الحضور (اختياري)
  recorded_at?: string; // وقت تسجيل الحضور (اختياري)
}

// تعريف سجل الحضور للإنشاء
export interface AttendanceCreate {
  circle_session_id: number; // معرف جلسة الحلقة
  student_id: string; // معرف الطالب
  status: AttendanceStatus; // حالة الحضور
  late_minutes?: number; // عدد دقائق التأخير (اختياري)
  note?: string; // ملاحظة (اختياري)
  recorded_by?: string; // معرف مسجل الحضور (اختياري)
}

// تعريف سجل الحضور للتحديث
export interface AttendanceUpdate {
  status?: AttendanceStatus; // حالة الحضور (اختياري)
  late_minutes?: number; // عدد دقائق التأخير (اختياري)
  note?: string; // ملاحظة (اختياري)
}

// الحصول على اسم حالة الحضور بالعربية
export function getAttendanceStatusName(status: AttendanceStatus): string {
  switch (status) {
    case 'present':
      return 'حاضر';
    case 'absent':
      return 'غائب';
    case 'late':
      return 'متأخر';
    case 'excused':
      return 'معذور';
    default:
      return 'غير معروف';
  }
}

// الحصول على لون حالة الحضور
export function getAttendanceStatusColor(status: AttendanceStatus): string {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-800 border-green-200'; // أخضر للحضور
    case 'absent':
      return 'bg-red-100 text-red-800 border-red-200'; // أحمر للغياب
    case 'late':
      return 'bg-amber-100 text-amber-800 border-amber-200'; // أصفر للتأخير
    case 'excused':
      return 'bg-blue-100 text-blue-800 border-blue-200'; // أزرق للإعتذار
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'; // رمادي لغير المعروف
  }
}

// قائمة حالات الحضور
export const attendanceStatusOptions = [
  { value: 'present', label: 'حاضر' },
  { value: 'absent', label: 'غائب' },
  { value: 'late', label: 'متأخر' },
  { value: 'excused', label: 'معذور' }
];
