/**
 * مفاتيح Supabase (نسخة مبسطة للاستخدام في الواجهة فقط)
 * نستخدم فقط المتغيرين:
 *  - VITE_SUPABASE_URL
 *  - VITE_SUPABASE_KEY (المفتاح العام anon)
 * يمنع منعاً باتاً تضمين service_role في الواجهة.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('SupabaseKeys:⚠️  تأكد من ضبط VITE_SUPABASE_URL و VITE_SUPABASE_KEY في ملفات البيئة (.env.local / .env.production).');
}

console.log('SupabaseKeys: تهيئة:', {
  url: SUPABASE_URL || 'غير معرف',
  key: SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 10)}...` : 'غير معرف'
});
