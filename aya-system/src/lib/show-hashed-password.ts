// src/lib/show-hashed-password.ts
// أداة مساعدة لعرض كلمة المرور المشفرة للمسؤول الرئيسي

import { hashPassword } from './auth-utils';

/**
 * عرض كلمة المرور المشفرة
 * استخدم هذه الدالة للحصول على كلمة المرور المشفرة فقط، وقم بإزالة استدعائها بعد ذلك لأسباب أمنية
 */
export const showHashedPassword = async (plainPassword: string): Promise<string | undefined> => {
  try {
    const hashedPassword = await hashPassword(plainPassword);
    console.log('كلمة المرور الأصلية:', plainPassword);
    console.log('كلمة المرور المشفرة:', hashedPassword);
    
    // يمكنك نسخ كلمة المرور المشفرة واستخدامها مباشرة في قاعدة البيانات
    // لإنشاء مستخدم مسؤول رئيسي باستخدام كلمة المرور المشفرة مسبقًا
    
    return hashedPassword;
  } catch (error) {
    console.error('حدث خطأ أثناء تشفير كلمة المرور:', error);
    return undefined;
  }
};

// تشغيل الدالة لعرض كلمة المرور المشفرة للمسؤول الرئيسي
// قم بإزالة هذا السطر بعد الحصول على كلمة المرور المشفرة
showHashedPassword('Ketama@Admin2025');
