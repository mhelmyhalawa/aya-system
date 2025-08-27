// نموذج لسجل المعلمين السابقين
export interface teacherHistory {
  id: number;
  student_id: string;
  teacher_id: string;
  study_circle_id?: string; // معرف الحلقة الدراسية
  study_circle?: {  // كائن الحلقة الدراسية المرتبطة
    id: string;
    name: string;
  } | null;
  start_date: string;
  end_date?: string;
}

// نموذج لإنشاء سجل معلم جديد
export interface teacherHistoryCreate extends Omit<teacherHistory, 'id'> {
  id?: number; // اختياري عند الإنشاء
}

// نموذج لتحديث سجل المعلم
export interface teacherHistoryUpdate extends Partial<Omit<teacherHistory, 'id' | 'student_id' | 'teacher_id'>> {
  id: number; // إلزامي للتحديث
}
