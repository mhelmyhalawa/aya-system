// نموذج لولي الأمر (Guardian)
export interface Guardian {
  id: string; // UUID, يرتبط مع profiles
  full_name: string;
  phone_number: string;
  email?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
  students_count?: number;
}

// نموذج لإنشاء ولي أمر جديد
export interface GuardianCreate extends Omit<Guardian, 'id' | 'created_at' | 'updated_at'> {
  id?: string; // اختياري عند الإنشاء
}

// نموذج لتحديث بيانات ولي الأمر
export interface GuardianUpdate extends Partial<Omit<Guardian, 'id' | 'created_at' | 'updated_at'>> {
  id: string; // إلزامي للتحديث
}
