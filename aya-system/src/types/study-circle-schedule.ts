// نموذج لجدولة الحلقات الدراسية
export interface StudyCircleSchedule {
  id: string;
  study_circle_id: string;
  weekday: number; // 0 للأحد، 1 للاثنين، وهكذا
  start_time: string; // بتنسيق "HH:MM:SS"
  end_time: string; // بتنسيق "HH:MM:SS"
  location?: string; // موقع اختياري خاص بهذا الوقت
  created_at?: string;
}

// نموذج لإنشاء جدولة جديدة
export interface StudyCircleScheduleCreate extends Omit<StudyCircleSchedule, 'id' | 'created_at'> {
  id?: string; // اختياري عند الإنشاء
}

// نموذج لتحديث جدولة
export interface StudyCircleScheduleUpdate extends Partial<Omit<StudyCircleSchedule, 'id' | 'study_circle_id' | 'created_at'>> {
  id: string; // إلزامي للتحديث
}

// أيام الأسبوع
export const weekdayOptions = [
  { value: '5', label: 'الجمعة' },
  { value: '6', label: 'السبت' },
  { value: '0', label: 'الأحد' },
  { value: '1', label: 'الإثنين' },
  { value: '2', label: 'الثلاثاء' },
  { value: '3', label: 'الأربعاء' },
  { value: '4', label: 'الخميس' }
];


// تحويل رقم اليوم إلى اسم
export function getWeekdayName(weekday: number): string {
  // التأكد من تحويل weekday إلى نص بشكل صريح
  const weekdayStr = weekday.toString();
  const day = weekdayOptions.find(d => d.value === weekdayStr);
  
  // إذا لم يتم العثور على اليوم، نطبع خطأ للتشخيص
  if (!day) {
    console.warn(`لم يتم العثور على اليوم المقابل للقيمة: ${weekday} (النوع: ${typeof weekday})`);
    // البحث بطريقة أخرى للمطابقة (تجاهل نوع البيانات)
    const fallbackDay = weekdayOptions.find(d => parseInt(d.value) === parseInt(weekdayStr));
    return fallbackDay ? fallbackDay.label : `يوم غير معروف (${weekday})`;
  }
  
  return day.label;
}

// تنسيق الوقت للعرض
export function formatTime(time: string): string {
  try {
    // تحويل من تنسيق "HH:MM:SS" إلى تنسيق "HH:MM AM/PM" بالعربية
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const period = h >= 12 ? 'م' : 'ص';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${minutes} ${period}`;
  } catch (e) {
    return time;
  }
}
