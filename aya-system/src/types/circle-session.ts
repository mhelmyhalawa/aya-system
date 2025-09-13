// نموذج لجلسة الحلقة (CircleSession)
export interface CircleSession {
  id?: number; // معرف الجلسة (يمكن أن يكون غير موجود عند الإنشاء)
  study_circle_id: string;
  session_date: string; // تاريخ الجلسة بتنسيق YYYY-MM-DD
  start_time?: string; // وقت البدء بتنسيق HH:MM
  end_time?: string; // وقت الانتهاء بتنسيق HH:MM
  teacher_id?: string; // معرف المعلم
  notes?: string; // ملاحظات الجلسة
  created_at?: string; // وقت الإنشاء
}

// نموذج لإنشاء جلسة جديدة
export interface CircleSessionCreate extends Omit<CircleSession, 'created_at'> {
  // كل الحقول المطلوبة موجودة في CircleSession
}

// نموذج لتحديث جلسة
export interface CircleSessionUpdate extends Partial<Omit<CircleSession, 'study_circle_id' | 'session_date' | 'created_at'>> {
  study_circle_id: string;
  session_date: string;
  session_date_new?: string; // التاريخ الجديد في حالة تغييره
}

// دالة مساعدة لتنسيق الوقت
export const formatTimeDisplay = (time?: string): string => {
  if (!time) return 'غير محدد';
  
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
};

// دالة مساعدة لتنسيق التاريخ بالميلادي
export const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return 'غير محدد';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'تاريخ غير صالح';
    }
    
    return date.toLocaleDateString('ar', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('خطأ في تنسيق التاريخ:', error);
    return dateStr;
  }
};

// دالة مساعدة لتنسيق التاريخ بشكل مختصر للبطاقات
export const formatShortDate = (dateStr?: string): string => {
  if (!dateStr) return 'غير محدد';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'تاريخ غير صالح';
    }
    
    return date.toLocaleDateString('ar', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('خطأ في تنسيق التاريخ المختصر:', error);
    return dateStr;
  }
};
