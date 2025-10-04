// اختبار مباشر لخدمة memorization-record-service
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// تحميل المتغيرات البيئية
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Missing environment variables. Ensure VITE_SUPABASE_URL and (or VITE_SUPABASE_KEY) are set.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectly() {
  console.log('🔍 فحص مباشر للاتصال بجدول memorization_records');
  
  try {
    // اختبار الاتصال بطريقة صحيحة
    const { data, error } = await supabase
      .from('memorization_records')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ خطأ في الاتصال بالجدول:', error);
      
      // جلب قائمة الجداول في قاعدة البيانات باستخدام RPC
      console.log('\n🔍 محاولة جلب قائمة الجداول...');
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('get_tables');
        
      if (tablesError) {
        console.error('❌ خطأ في جلب قائمة الجداول:', tablesError);
      } else {
        console.log('قائمة الجداول:', tablesData);
      }
      
      return false;
    }
    
    console.log('✅ الاتصال بالجدول ناجح!');
    console.log('البيانات:', data);
    
    // جلب عدد السجلات
    console.log('\n🔍 محاولة جلب عدد السجلات...');
    const { count, error: countError } = await supabase
      .from('memorization_records')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('❌ خطأ في جلب عدد السجلات:', countError);
    } else {
      console.log('✅ عدد السجلات:', count);
    }
    
    return true;
  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error);
    return false;
  }
}

testDirectly();

testDirectly();
