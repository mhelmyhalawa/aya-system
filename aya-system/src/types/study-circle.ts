// نموذج للحلقة الدراسية
export interface StudyCircle {
  id: string;
  name: string;
  teacher_id: string;
  max_students?: number;
  created_at?: string;
  deleted_at?: string;
  students_count?: number;
  
  // علاقات
  teacher?: {
    id: string;
    full_name: string;
  };
}

// نموذج لإنشاء حلقة دراسية جديدة
export interface StudyCircleCreate extends Omit<StudyCircle, 'id' | 'created_at' | 'deleted_at' | 'teacher'> {
  id?: string; // اختياري عند الإنشاء
}

// نموذج لتحديث حلقة دراسية
export interface StudyCircleUpdate extends Partial<Omit<StudyCircle, 'id' | 'created_at' | 'deleted_at' | 'teacher'>> {
  id: string; // إلزامي للتحديث
}
