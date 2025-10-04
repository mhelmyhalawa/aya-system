import { createClient } from '@supabase/supabase-js';

// قراءة القيم من متغيرات البيئة (تُعرّف في .env.local أو .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

if (!supabaseUrl) {
  console.warn('⚠️  VITE_SUPABASE_URL غير معرّف. ضع القيمة في ملف .env.local');
}
if (!supabaseKey) {
  console.warn('⚠️  VITE_SUPABASE_KEY غير معرّف. ضع القيمة في ملف .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
