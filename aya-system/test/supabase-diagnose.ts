// اختبار وتشخيص اتصال Supabase
import { Student } from '../src/types/student';
import { supabase, STUDENTS_TABLE } from '../src/lib/supabase-client';
import { addStudent, getAllStudents } from '../src/lib/supabase-service';

async function diagnoseSupabaseConnection() {
  console.log('بدء تشخيص اتصال Supabase...');
  
  try {
    // التحقق من تكوين Supabase
    console.log('معلومات التكوين:');
    console.log('- URL Supabase:', supabase ? 'تم تكوينه بنجاح' : 'غير مكون');
    console.log('- اسم الجدول:', STUDENTS_TABLE);
    
    // محاولة الاتصال والاستعلام عن المعلومات العامة
    console.log('\nمحاولة الاتصال بخدمة Supabase...');
    const { data: healthData, error: healthError } = await supabase.rpc('_health');
    
    if (healthError) {
      console.error('فشل الاتصال بخدمة Supabase:', healthError);
    } else {
      console.log('الاتصال بخدمة Supabase ناجح:', healthData || 'OK');
    }
    
    // التحقق من وجود الجدول
    console.log('\nالتحقق من وجود جدول الطلاب...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('فشل في التحقق من وجود جدول الطلاب:', tablesError);
    } else {
      const studentTableExists = tables?.some(t => t.table_name === STUDENTS_TABLE);
      console.log(`جدول الطلاب ${studentTableExists ? 'موجود' : 'غير موجود'} في قاعدة البيانات`);
      
      if (studentTableExists) {
        console.log('\nالتحقق من هيكل جدول الطلاب...');
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_schema', 'public')
          .eq('table_name', STUDENTS_TABLE);
        
        if (columnsError) {
          console.error('فشل في التحقق من هيكل جدول الطلاب:', columnsError);
        } else {
          console.log('هيكل جدول الطلاب:');
          columns?.forEach(col => {
            console.log(`- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'اختياري' : 'إلزامي'})`);
          });
        }
      }
    }
    
    // محاولة قراءة البيانات الحالية
    console.log('\nمحاولة قراءة البيانات الحالية من جدول الطلاب...');
    try {
      const students = await getAllStudents();
      console.log(`تم العثور على ${students.length} طالب في قاعدة البيانات`);
      if (students.length > 0) {
        console.log('أول 3 سجلات:');
        students.slice(0, 3).forEach((student, index) => {
          console.log(`${index + 1}. ${student.studentName} (${student.id})`);
        });
      }
    } catch (getAllError) {
      console.error('فشل في قراءة البيانات الحالية:', getAllError);
    }
    
    // محاولة إنشاء طالب اختباري وحذفه
    console.log('\nمحاولة إنشاء وحذف طالب اختباري...');
    
    // إنشاء طالب اختباري
    const testStudent: Partial<Student> = {
      full_name: 'طالب_اختباري_' + Date.now(),
      phone_number: '0000000000'
    };
    
    try {
      const addResult = await addStudent(testStudent);
      const createdId = (addResult as any)?.data?.id as string | undefined;
      
      if (addResult.success && createdId) {
        console.log('تم إنشاء الطالب الاختباري بنجاح:', createdId);
        
        // التحقق من وجود الطالب
        const { data: createdStudent, error: getError } = await supabase
          .from(STUDENTS_TABLE)
          .select('*')
          .eq('id', createdId)
          .single();
        
        if (getError) {
          console.error('فشل في التحقق من وجود الطالب الاختباري:', getError);
        } else {
          console.log('تم التحقق من وجود الطالب الاختباري:', createdStudent?.studentName);
        }
        
        // حذف الطالب الاختباري
        const { error: deleteError } = await supabase
          .from(STUDENTS_TABLE)
          .delete()
          .eq('id', createdId);
        
        if (deleteError) {
          console.error('فشل في حذف الطالب الاختباري:', deleteError);
        } else {
          console.log('تم حذف الطالب الاختباري بنجاح');
        }
      } else {
        console.error('فشل في إنشاء الطالب الاختباري:', addResult.message);
      }
    } catch (testError) {
      console.error('خطأ أثناء اختبار إنشاء وحذف الطالب:', testError);
    }
    
    // التحقق من إعدادات RLS
    console.log('\nالتحقق من إعدادات RLS...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', STUDENTS_TABLE);
      
      if (policiesError) {
        console.error('فشل في التحقق من إعدادات RLS:', policiesError);
      } else if (policies && policies.length > 0) {
        console.log('سياسات RLS المكونة للجدول:');
        policies.forEach(policy => {
          console.log(`- ${policy.policyname}: ${policy.cmd} ${policy.roles}`);
        });
      } else {
        console.log('لم يتم العثور على سياسات RLS مكونة للجدول');
      }
    } catch (rlsError) {
      console.error('خطأ أثناء التحقق من إعدادات RLS:', rlsError);
    }
    
  console.log('\nتوصيات لحل المشاكل:');
  console.log('1. تأكد من تكوين متغيرات البيئة VITE_SUPABASE_URL و (أو VITE_SUPABASE_KEY) بشكل صحيح في ملف .env');
    console.log('2. تأكد من إنشاء جدول students في Supabase بالهيكل الصحيح');
    console.log('3. تأكد من تكوين سياسات RLS للسماح بالوصول والكتابة والتعديل');
    console.log('4. تحقق من صلاحيات المستخدم المجهول (anon) للوصول إلى الجدول');
    
  } catch (error) {
    console.error('خطأ غير متوقع أثناء تشخيص الاتصال:', error);
  }
  
  console.log('\nانتهى تشخيص اتصال Supabase');
}

// تنفيذ الاختبار
console.log('بدء اختبار وتشخيص Supabase...');
diagnoseSupabaseConnection().then(() => {
  console.log('انتهى اختبار وتشخيص Supabase.');
}).catch(err => {
  console.error('فشل اختبار وتشخيص Supabase:', err);
});

export default {};
