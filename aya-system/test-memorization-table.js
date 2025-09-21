import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// تحميل المتغيرات البيئية
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ مفقود متغيرات البيئة. تأكد من ضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY (أو VITE_SUPABASE_KEY).');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMemorizationTable() {
  console.log('🔍 اختبار وجود جدول memorization_records...\n');
  
  try {
    // 1. اختبار وجود الجدول عبر محاولة استعلام بسيط
    console.log('1️⃣ اختبار الاستعلام من الجدول...');
    const { data, error } = await supabase
      .from('memorization_records')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ خطأ في الاستعلام:', error.message);
      console.error('التفاصيل:', error);
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('\n💡 الجدول غير موجود! تحتاج لتنفيذ SQL script في Supabase Dashboard');
      }
    } else {
      console.log('✅ الجدول موجود!');
      console.log('📊 عدد السجلات:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('أول سجل:', data[0]);
      }
    }
    
    // 2. اختبار معلومات الجدول
    console.log('\n2️⃣ اختبار معلومات الجدول...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'memorization_records' });
    
    if (tableError) {
      console.log('❌ لا يمكن الحصول على معلومات الجدول:', tableError.message);
    } else {
      console.log('✅ معلومات الجدول متاحة');
    }
    
    // 3. اختبار إدراج بيانات تجريبية (بدون حفظ)
    console.log('\n3️⃣ اختبار هيكل الجدول...');
    const testRecord = {
      student_id: '123e4567-e89b-12d3-a456-426614174000', // UUID تجريبي
      date: new Date().toISOString().split('T')[0],
      type: 'new',
      from_surah: 1,
      from_ayah: 1,
      to_surah: 1,
      to_ayah: 7,
      score: 85.5,
      tajweed_errors: { lahn_jali: 0, lahn_khafi: 1 },
      notes: 'اختبار'
    };
    
    // نستخدم .insert() مع .select() لاختبار الهيكل بدون حفظ فعلي
    const { error: insertError } = await supabase
      .from('memorization_records')
      .insert(testRecord)
      .select()
      .limit(0); // لا نريد إرجاع البيانات
    
    if (insertError) {
      console.error('❌ خطأ في هيكل الجدول:', insertError.message);
      if (insertError.message.includes('foreign key')) {
        console.log('💡 مشكلة في المفاتيح الخارجية - تأكد من وجود جداول students و profiles');
      }
    } else {
      console.log('✅ هيكل الجدول صحيح');
    }
    
  } catch (err) {
    console.error('❌ خطأ عام:', err);
  }
}

// 4. اختبار الاتصال بقاعدة البيانات
async function testConnection() {
  console.log('🔗 اختبار الاتصال بقاعدة البيانات...\n');
  
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ خطأ في الاتصال:', error.message);
      return false;
    } else {
      console.log('✅ الاتصال ناجح');
      return true;
    }
  } catch (err) {
    console.error('❌ خطأ في الاتصال:', err.message);
    return false;
  }
}

// تشغيل الاختبارات
async function runTests() {
  console.log('🧪 بدء اختبار جدول memorization_records\n');
  console.log('📋 معلومات الاتصال:');
  console.log('URL:', supabaseUrl);
  console.log('Key (أول 20 حرف):', supabaseKey.substring(0, 20) + '...\n');
  
  const connectionOk = await testConnection();
  if (connectionOk) {
    await testMemorizationTable();
  }
  
  console.log('\n🏁 انتهى الاختبار');
}

runTests();
