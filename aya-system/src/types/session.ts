// نموذج للحلقات
export interface Session {
  id: number;
  title?: string;
  teacher_id?: string;
  session_date: string;
  created_at?: string;
}

// نموذج لإنشاء حلقة جديدة
export interface SessionCreate extends Omit<Session, 'id' | 'created_at'> {
  id?: number; // اختياري عند الإنشاء
}

// نموذج لتحديث الحلقة
export interface SessionUpdate extends Partial<Omit<Session, 'id' | 'created_at'>> {
  id: number; // إلزامي للتحديث
}

// نموذج لعرض الحلقة مع الطلاب المرتبطين
export interface SessionWithStudents extends Session {
  students?: {
    id: string;
    full_name: string;
  }[];
}

// نموذج لربط الطالب بالحلقة
export interface SessionStudent {
  session_id: number;
  student_id: string;
}
