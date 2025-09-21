/**
 * ملف مخصص لتخزين مفاتيح Supabase
 * يتم استدعاؤه من قبل الملفات الأخرى التي تحتاج للوصول للقاعدة
 */

// عنوان قاعدة البيانات
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

// المفتاح العام للقراءة (يدعم الاسم الجديد والقديم للتوافق)
export const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || '';

// مفتاح الخدمة للكتابة وتجاوز RLS
export const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// طباعة المفاتيح للتصحيح
if (!SUPABASE_URL || !ANON_KEY) {
  console.warn('SupabaseKeys: تحذير - متغيرات البيئة غير مكتملة. تأكد من ضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (أو VITE_SUPABASE_KEY) و VITE_SUPABASE_SERVICE_ROLE_KEY في بيئة التشغيل.');
}

console.log('SupabaseKeys: تهيئة مع المفاتيح:', {
  url: SUPABASE_URL || 'غير معرف',
  anonKey: ANON_KEY ? `${ANON_KEY.substring(0, 10)}...` : 'غير معرف',
  serviceKey: SERVICE_KEY ? `${SERVICE_KEY.substring(0, 10)}...` : 'غير معرف'
});
