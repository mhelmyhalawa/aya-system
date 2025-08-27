// نموذج للملف الشخصي (Profile)
export interface Profile {
  id: string; // UUID from auth.users
  full_name: string;
  role: 'superadmin' | 'admin' | 'teacher'; // محدود بالقيم superadmin أو admin أو teacher
  username: string;
  password_hash: string;
  login_attempts?: number;
  last_login_at?: string;
  created_at?: string;
}

// نموذج الدور لمساعدة التحقق من الصلاحيات
export type UserRole = 'superadmin' | 'admin' | 'teacher';

// نموذج لإنشاء ملف شخصي جديد
export interface ProfileCreate extends Omit<Profile, 'id' | 'created_at' | 'login_attempts' | 'last_login_at' | 'password_hash'> {
  id?: string; // اختياري عند الإنشاء
  password: string; // كلمة المرور الأصلية (سيتم تشفيرها)
}

// نموذج لتحديث ملف شخصي
export interface ProfileUpdate extends Partial<Omit<Profile, 'id' | 'created_at' | 'password_hash'>> {
  id: string; // إلزامي للتحديث
  password?: string; // اختياري لتغيير كلمة المرور
}

// نموذج لبيانات تسجيل الدخول
export interface LoginCredentials {
  username: string;
  password: string;
}
