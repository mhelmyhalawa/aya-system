// نموذج للمتابعة اليومية
export interface DailyFollowup {
  id: number;
  session_id: number;
  student_id: string;
  new_memorization_score?: number; // درجة بين 0 و 60
  review_memorization_score?: number; // درجة بين 0 و 60
  new_reading_note?: string;
  review_reading_note?: string;
  general_notes?: string;
  created_at?: string;
}

// نموذج لإنشاء متابعة يومية جديدة
export interface DailyFollowupCreate extends Omit<DailyFollowup, 'id' | 'created_at'> {
  id?: number; // اختياري عند الإنشاء
}

// نموذج لتحديث المتابعة اليومية
export interface DailyFollowupUpdate extends Partial<Omit<DailyFollowup, 'id' | 'session_id' | 'student_id' | 'created_at'>> {
  id: number; // إلزامي للتحديث
}

// نموذج لعرض المتابعة اليومية مع بيانات الطالب
export interface DailyFollowupWithStudent extends DailyFollowup {
  student?: {
    full_name: string;
  };
  session?: {
    title?: string;
    session_date: string;
  };
}
