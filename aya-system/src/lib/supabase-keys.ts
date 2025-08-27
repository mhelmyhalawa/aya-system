/**
 * ملف مخصص لتخزين مفاتيح Supabase
 * يتم استدعاؤه من قبل الملفات الأخرى التي تحتاج للوصول للقاعدة
 */

// عنوان قاعدة البيانات
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ikeicbxkjgdhhofuhehr.supabase.co';

// المفتاح العام للقراءة
export const ANON_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWljYnhramdkaGhvZnVoZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODQ1MDA1NzIsImV4cCI6MTk5OTg3NjU3Mn0.qYgjp3kAQ1LGmLg_r4_zw1jLx0XRiZnVJCfHKo-nFUo';

// مفتاح الخدمة للكتابة وتجاوز RLS
export const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWljYnhramdkaGhvZnVoZWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4NDUwMDU3MiwiZXhwIjozODM5ODU4MTcyfQ.xsNLA6IXtEUXLo5UF9q0TKoTeG1vqcM5yE7eX0sSAo0';

// طباعة المفاتيح للتصحيح
console.log('SupabaseKeys: تهيئة مع المفاتيح:', {
  url: SUPABASE_URL,
  anonKey: ANON_KEY ? `${ANON_KEY.substring(0, 10)}...` : 'غير معرف',
  serviceKey: SERVICE_KEY ? `${SERVICE_KEY.substring(0, 10)}...` : 'غير معرف'
});
