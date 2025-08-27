// نموذج للامتحان الشهري
export interface MonthlyExam {
  id: number;
  student_id: string;
  exam_month: string; // YYYY-MM-DD format
  memorization_score?: number; // درجة بين 0 و 60
  recitation_score?: number; // درجة بين 0 و 10
  behavior_score?: number; // درجة بين 0 و 10
  attendance_score?: number; // درجة بين 0 و 10
  appearance_score?: number; // درجة بين 0 و 10
  notes?: string;
  created_at?: string;
}

// نموذج لإنشاء امتحان شهري جديد
export interface MonthlyExamCreate extends Omit<MonthlyExam, 'id' | 'created_at'> {
  id?: number; // اختياري عند الإنشاء
}

// نموذج لتحديث الامتحان الشهري
export interface MonthlyExamUpdate extends Partial<Omit<MonthlyExam, 'id' | 'student_id' | 'exam_month' | 'created_at'>> {
  id: number; // إلزامي للتحديث
}

// نموذج لعرض الامتحان الشهري مع بيانات الطالب
export interface MonthlyExamWithStudent extends MonthlyExam {
  student?: {
    full_name: string;
  };
  total_score?: number; // مجموع الدرجات
}

// نموذج لنتيجة الامتحان الشهري من المنظور (view)
export interface MonthlyResult {
  exam_id: number;
  student_id: string;
  exam_month: string;
  total_score: number;
}
