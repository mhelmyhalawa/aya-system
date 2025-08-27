// verify-superadmin.js
// أداة للتحقق من وجود المستخدم المسؤول الرئيسي وإمكانية تسجيل الدخول
const bcrypt = require('bcryptjs');

// بيانات المستخدم المسؤول الرئيسي
const SUPER_ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000';
const SUPER_ADMIN_USERNAME = 'superadmin';
const SUPER_ADMIN_PASSWORD = 'Ketama@Admin2025';
const SUPER_ADMIN_PASSWORD_HASH = '$2a$10$0lnhiRBBZs4o8HsV5fWAR.ZsqR09MK0YO6iqpqFRhLfBGgw7gaJXq';

/**
 * التحقق من صحة بيانات تسجيل الدخول
 * هذه الوظيفة تشبه عملية تسجيل الدخول المستخدمة في التطبيق
 */
async function verifySuperAdminCredentials() {
  console.log('='.repeat(50));
  console.log('أداة التحقق من صحة بيانات المستخدم المسؤول الرئيسي');
  console.log('='.repeat(50));
  
  // التحقق من مطابقة كلمة المرور مع الهاش المخزن
  console.log('\n1. التحقق من مطابقة كلمة المرور مع الهاش المخزن:');
  console.log('   المعرف:', SUPER_ADMIN_ID);
  console.log('   اسم المستخدم:', SUPER_ADMIN_USERNAME);
  console.log('   كلمة المرور:', SUPER_ADMIN_PASSWORD);
  console.log('   الهاش المخزن:', SUPER_ADMIN_PASSWORD_HASH);
  
  try {
    const isPasswordValid = await bcrypt.compare(SUPER_ADMIN_PASSWORD, SUPER_ADMIN_PASSWORD_HASH);
    console.log('\n   نتيجة المطابقة:', isPasswordValid ? '✅ صحيحة' : '❌ غير صحيحة');
    
    if (!isPasswordValid) {
      console.log('\n⚠️ تحذير: كلمة المرور لا تتطابق مع الهاش المخزن!');
      console.log('   هذا يعني أن المستخدم لن يتمكن من تسجيل الدخول باستخدام كلمة المرور المحددة.');
    } else {
      console.log('\n✅ كلمة المرور تتطابق مع الهاش بشكل صحيح.');
      console.log('   يجب أن يكون المستخدم قادرًا على تسجيل الدخول إذا تم إنشاء الحساب بشكل صحيح في قاعدة البيانات.');
    }
    
    // إنشاء هاش جديد للمقارنة
    console.log('\n2. إنشاء هاش جديد لنفس كلمة المرور:');
    const newHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    console.log('   هاش جديد:', newHash);
    
    // التحقق من الهاش الجديد
    const isNewHashValid = await bcrypt.compare(SUPER_ADMIN_PASSWORD, newHash);
    console.log('   صحة الهاش الجديد:', isNewHashValid ? '✅ صحيح' : '❌ غير صحيح');
    
    console.log('\n3. خطوات التالية:');
    console.log('   1. قم بتنفيذ ملف SQL (create-superadmin.sql) في واجهة SQL في Supabase');
    console.log('   2. بعد تنفيذ الملف، يجب أن تتمكن من تسجيل الدخول باستخدام:');
    console.log('      • اسم المستخدم: superadmin');
    console.log('      • كلمة المرور: Ketama@Admin2025');
    console.log('      • نوع المستخدم: superadmin');
    
  } catch (error) {
    console.error('\n❌ حدث خطأ أثناء التحقق من بيانات المستخدم:', error);
  }
}

// تنفيذ التحقق
verifySuperAdminCredentials();
