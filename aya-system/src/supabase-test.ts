// تحقق من مشكلة حفظ الطلاب في Supabase

async function testSupabaseConnection() {
  console.log('اختبار الاتصال بـ Supabase...');
  
  // استيراد عميل Supabase
  const { supabase, STUDENTS_TABLE } = await import('./lib/supabase-client');
  
  // اختبار الاتصال
  console.log('تكوين Supabase جاهز');
  console.log('اسم الجدول:', STUDENTS_TABLE);
  
  try {
    // محاولة الاتصال والاستعلام عن المعلومات العامة
    console.log('\nمحاولة الاتصال بخدمة Supabase...');
    const { data: healthData, error: healthError } = await supabase.rpc('_health');
    
    if (healthError) {
      console.error('فشل الاتصال بخدمة Supabase:', healthError);
    } else {
      console.log('الاتصال بخدمة Supabase ناجح:', healthData || 'OK');
    }
    
    // محاولة قراءة البيانات الحالية
    console.log('\nمحاولة قراءة البيانات الحالية من جدول الطلاب...');
    const { data: students, error: readError } = await supabase
      .from(STUDENTS_TABLE)
      .select('*')
      .limit(5);
    
    if (readError) {
      console.error('خطأ في قراءة البيانات:', readError);
      
      if (readError.code === '42P01') {
        console.error('الجدول غير موجود. تأكد من إنشاء جدول students في Supabase.');
      } else if (readError.code === '42501') {
        console.error('خطأ في الصلاحيات. تأكد من تكوين سياسات RLS بشكل صحيح.');
      }
    } else {
      console.log(`تم العثور على ${students?.length || 0} طلاب:`, students);
    }
    
    // محاولة إضافة سجل اختباري
    console.log('\nمحاولة إضافة طالب اختباري...');
    
    const testStudent = {
      id: crypto.randomUUID(),
      name: 'طالب اختباري',
      fatherName: 'اختبار',
      parentPhone: '0000000000',
      grade: 'اختبار',
      memorizedParts: '1',
      registrationDate: new Date().toISOString().split('T')[0]
    };
    
    console.log('بيانات الطالب الاختباري:', testStudent);
    
    const { data: insertData, error: insertError } = await supabase
      .from(STUDENTS_TABLE)
      .insert([testStudent])
      .select();
    
    if (insertError) {
      console.error('خطأ في إضافة الطالب الاختباري:', insertError);
      
      if (insertError.code === '42P01') {
        console.error('الجدول غير موجود. تأكد من إنشاء جدول students في Supabase.');
      } else if (insertError.code === '42501') {
        console.error('خطأ في الصلاحيات. تأكد من تكوين سياسات RLS بشكل صحيح.');
      } else if (insertError.code === '23502') {
        console.error('قيمة مطلوبة غير موجودة. تحقق من تطابق هيكل الطالب مع هيكل الجدول.');
        console.error('هيكل الطالب الاختباري:', Object.keys(testStudent));
      } else if (insertError.code === '23505') {
        console.error('خطأ في القيم الفريدة. تحقق من عدم تكرار القيم الفريدة.');
      }
    } else {
      console.log('تم إضافة الطالب الاختباري بنجاح!', insertData);
      
      // حذف الطالب الاختباري
      const { error: deleteError } = await supabase
        .from(STUDENTS_TABLE)
        .delete()
        .eq('id', testStudent.id);
      
      if (deleteError) {
        console.error('خطأ في حذف الطالب الاختباري:', deleteError);
      } else {
        console.log('تم حذف الطالب الاختباري بنجاح.');
      }
    }
    
  console.log('\nتوصيات لحل المشاكل:');
  console.log('1. تأكد من تكوين متغيرات البيئة VITE_SUPABASE_URL و (أو VITE_SUPABASE_KEY) بشكل صحيح في ملف .env');
    console.log('2. تأكد من إنشاء جدول students في Supabase بالهيكل الصحيح');
    console.log('3. تأكد من تكوين سياسات RLS للسماح بالوصول والكتابة والتعديل');
    console.log('4. تحقق من صلاحيات المستخدم المجهول (anon) للوصول إلى الجدول');
  } catch (error) {
    console.error('خطأ غير متوقع:', error);
  }
}

// تنفيذ الاختبار
console.log('بدء اختبار Supabase...');
testSupabaseConnection().then(() => {
  console.log('انتهى اختبار Supabase.');
}).catch(err => {
  console.error('فشل اختبار Supabase:', err);
});

// تصدير وظيفة وهمية لتجنب أخطاء التجميع
export default {};
