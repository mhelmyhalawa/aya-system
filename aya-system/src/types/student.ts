// src/types/student.ts

export interface Student {
  id: string; // UUID, يرتبط مع profiles
  guardian_id?: string; // UUID لولي الأمر
  study_circle_id?: string; // UUID الحلقة الحالية
  full_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  phone_number?: string;
  email?: string;
  enrollment_date?: string;
  grade_level?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Legacy fields - to maintain compatibility with existing components
  parentName?: string;
  parentPhone?: string;
  grade?: string;
  memorized_parts?: string;

  // Relationships
  guardian?: {
    full_name: string;
    phone_number: string;
  };
  study_circle?: {
    id: string;
    name: string;
    teacher_id: string;
    teacher?: {
      id: string;
      full_name: string;
    }
  };
}

// نموذج لإنشاء طالب جديد
export interface StudentCreate extends Omit<Student, 'id' | 'created_at' | 'updated_at'> {
  id?: string; // اختياري عند الإنشاء
}

// نموذج لتحديث بيانات الطالب
export interface StudentUpdate extends Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>> {
  id: string; // إلزامي للتحديث
}

// نموذج لعرض بيانات الطالب مع بيانات المعلم وولي الأمر
export interface StudentWithRelations extends Student {
  guardian?: {
    full_name: string;
    phone_number: string;
  };
  teacher?: {
    full_name: string;
  };
}
