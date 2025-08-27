import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// تحميل المتغيرات البيئية
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRequiredTables() {
  console.log('🔍 فحص الجداول المطلوبة...\n');
  
  const tables = ['students', 'profiles'];
  const results = {};
  
  for (const table of tables) {
    try {
      console.log(`📋 فحص جدول ${table}...`);
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`❌ الجدول ${table} غير موجود:`, error.message);
        results[table] = false;
      } else {
        console.log(`✅ الجدول ${table} موجود - عدد السجلات: ${data?.length || 0}`);
        results[table] = true;
        
        // إضافة معلومات إضافية للطلاب
        if (table === 'students' && data?.length > 0) {
          const { data: studentData } = await supabase
            .from('students')
            .select('id, full_name')
            .limit(3);
          console.log('   📝 أمثلة على الطلاب:', studentData);
        }
      }
    } catch (err) {
      console.log(`❌ خطأ في فحص جدول ${table}:`, err.message);
      results[table] = false;
    }
  }
  
  return results;
}

async function testMemorizationRecordWithRealData() {
  console.log('\n📝 محاولة إنشاء سجل حفظ ببيانات حقيقية...\n');
  
  try {
    // 1. الحصول على طالب حقيقي
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name')
      .limit(1)
      .single();
      
    if (studentError || !student) {
      console.log('❌ لا يوجد طلاب في قاعدة البيانات');
      return;
    }
    
    console.log('👤 استخدام الطالب:', student.full_name, '(', student.id, ')');
    
    // 2. الحصول على مستخدم حقيقي (معلم/مدير)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1)
      .single();
      
    if (profileError || !profile) {
      console.log('❌ لا يوجد مستخدمين في قاعدة البيانات');
      return;
    }
    
    console.log('👨‍🏫 المسجل بواسطة:', profile.full_name, '(', profile.id, ')');
    
    // 3. إنشاء سجل حفظ تجريبي
    const testRecord = {
      student_id: student.id,
      date: new Date().toISOString().split('T')[0],
      type: 'new',
      from_surah: 1,
      from_ayah: 1,
      to_surah: 1,
      to_ayah: 7,
      score: 85.5,
      tajweed_errors: { lahn_jali: 0, lahn_khafi: 1 },
      notes: 'اختبار إنشاء سجل حفظ',
      recorded_by: profile.id
    };
    
    console.log('📋 بيانات السجل التجريبي:', testRecord);
    
    // 4. محاولة الإدراج
    const { data, error } = await supabase
      .from('memorization_records')
      .insert(testRecord)
      .select()
      .single();
    
    if (error) {
      console.error('❌ خطأ في إنشاء السجل:', error.message);
      console.error('التفاصيل:', error);
    } else {
      console.log('✅ تم إنشاء السجل بنجاح!');
      console.log('📄 السجل المُنشأ:', data);
      
      // حذف السجل التجريبي
      await supabase
        .from('memorization_records')
        .delete()
        .eq('id', data.id);
      console.log('🗑️ تم حذف السجل التجريبي');
    }
    
  } catch (err) {
    console.error('❌ خطأ عام:', err);
  }
}

async function main() {
  console.log('🧪 فحص شامل لجدول memorization_records\n');
  
  const tableResults = await checkRequiredTables();
  
  if (tableResults.students && tableResults.profiles) {
    await testMemorizationRecordWithRealData();
  } else {
    console.log('\n❌ لا يمكن اختبار إنشاء السجلات بسبب نقص الجداول المطلوبة');
    
    if (!tableResults.students) {
      console.log('💡 تحتاج لإنشاء جدول students أولاً');
    }
    if (!tableResults.profiles) {
      console.log('💡 تحتاج لإنشاء جدول profiles أولاً');
    }
  }
  
  console.log('\n🏁 انتهى الفحص');
}

main();
