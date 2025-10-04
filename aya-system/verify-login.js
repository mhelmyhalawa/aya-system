// verify-login.js
const bcrypt = require('bcryptjs');

/**
 * تحقق من صحة بيانات تسجيل الدخول للمسؤول الرئيسي
 */
async function verifyLogin() {
  // بيانات الاعتماد
  const username = 'admin';
  const password = '*****';
  const storedHash = '************************'; // استبدلها بالهاش الحقيقي
  
  try {
    console.log('===== التحقق من بيانات تسجيل الدخول =====');
    console.log('اسم المستخدم:', username);
    console.log('كلمة المرور:', password);
    console.log('الهاش المخزن:', storedHash);
    
    // التحقق من توافق كلمة المرور مع الهاش
    const isMatch = await bcrypt.compare(password, storedHash);
    console.log('هل كلمة المرور صحيحة؟', isMatch);
    
    if (!isMatch) {
      console.log('!!!! تنبيه: كلمة المرور غير متطابقة مع الهاش المخزن !!!!');
      
      // إنشاء هاش جديد للمقارنة
      const newHash = await bcrypt.hash(password, 10);
      console.log('هاش جديد لنفس كلمة المرور:', newHash);
      
      // التحقق من الهاش الجديد
      const isNewHashValid = await bcrypt.compare(password, newHash);
      console.log('هل الهاش الجديد صالح؟', isNewHashValid);
    }
    
    // محاولة إنشاء هاش مماثل
    console.log('\n===== محاولة إعادة إنشاء نفس الهاش =====');
    // إنشاء عدة هاش لنفس كلمة المرور للمقارنة
    for (let i = 0; i < 3; i++) {
      const hash = await bcrypt.hash(password, 10);
      console.log(`هاش #${i+1}:`, hash);
      const valid = await bcrypt.compare(password, hash);
      console.log(`صالح #${i+1}:`, valid);
    }
    
  } catch (error) {
    console.error('حدث خطأ:', error);
  }
}

verifyLogin();
