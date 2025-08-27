import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, ANON_KEY, SERVICE_KEY } from './supabase-keys';

// تعريف المتغيرات بناء على الاسماء التي يتوقعها بقية الكود
export const SUPABASE_KEY = ANON_KEY;
export const SUPABASE_SERVICE_KEY = SERVICE_KEY;

// إضافة سجلات للتأكد من تحميل المفاتيح بشكل صحيح (لأغراض التصحيح)
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_KEY (أول 15 حرف):', SUPABASE_KEY ? SUPABASE_KEY.substring(0, 15) + '...' : 'غير موجود');
console.log('SUPABASE_SERVICE_KEY (أول 15 حرف):', SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY.substring(0, 15) + '...' : 'غير موجود');

// إنشاء عميل Supabase العادي (للقراءة)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ketama-auth-storage',
    detectSessionInUrl: true
  }
});

// إنشاء عميل Supabase مع مفتاح الخدمة (للكتابة مع تجاوز RLS)
export const supabaseAdmin = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  }
);

// أسماء الجداول
export const PROFILES_TABLE = 'profiles';
export const GUARDIANS_TABLE = 'guardians';  // Ensure this matches exactly the table name in Supabase
export const STUDENTS_TABLE = 'students';
export const teacher_HISTORY_TABLE = 'student_teacher_history';
export const SESSIONS_TABLE = 'sessions';
export const SESSION_STUDENTS_TABLE = 'session_students';
export const DAILY_FOLLOWUPS_TABLE = 'daily_followups';
export const MONTHLY_EXAMS_TABLE = 'monthly_exams';
export const MONTHLY_RESULTS_VIEW = 'student_monthly_result';
export const CIRCLE_SESSIONS_TABLE = 'circle_sessions';

export default supabase;

// إدارة JWT token للمستخدم
let userJWTToken: string | null = null;

/**
 * تعيين JWT token للمستخدم - يتم استدعاء هذه الوظيفة بعد تسجيل الدخول بنجاح
 */
export const setUserJWTToken = (token: string) => {
  userJWTToken = token;
  // تخزين الـ token في localStorage للاستمرارية بين جلسات المتصفح
  try {
    localStorage.setItem('ketama_user_jwt', token);
    console.log('تم تعيين JWT token للمستخدم:', token.substring(0, 15) + '...');
  } catch (error) {
    console.error('فشل في تخزين JWT token في localStorage:', error);
  }
};

/**
 * الحصول على JWT token للمستخدم الحالي
 */
export const getUserJWTToken = (): string | null => {
  // إذا لم يكن لدينا token في الذاكرة، نحاول الحصول عليه من localStorage
  if (!userJWTToken) {
    try {
      const storedToken = localStorage.getItem('ketama_user_jwt');
      if (storedToken) {
        userJWTToken = storedToken;
        console.log('تم استرجاع JWT token من localStorage:', storedToken.substring(0, 15) + '...');
      }
    } catch (error) {
      console.error('فشل في استرجاع JWT token من localStorage:', error);
    }
  }
  return userJWTToken;
};

/**
 * مسح JWT token للمستخدم عند تسجيل الخروج
 */
export const clearUserJWTToken = () => {
  userJWTToken = null;
  try {
    localStorage.removeItem('ketama_user_jwt');
    console.log('تم مسح JWT token للمستخدم');
  } catch (error) {
    console.error('فشل في مسح JWT token من localStorage:', error);
  }
};

/**
 * إنشاء عميل Supabase باستخدام JWT token للمستخدم
 */
export const createSupabaseClientWithToken = (token: string) => {
  console.log('إنشاء عميل Supabase مع JWT token:', token.substring(0, 15) + '...');
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`
      }
    }
  });
};
