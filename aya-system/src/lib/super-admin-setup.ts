// src/lib/super-admin-setup.ts
// إنشاء مستخدم super_admin في قاعدة البيانات

import { createProfileWithHashedPassword, getProfileById, getProfileByUsername } from './profile-service';
import { ProfileCreate } from '@/types/profile';
import { hashPassword } from './auth-utils';

// بيانات المستخدم المسؤول الرئيسي
const SUPER_ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000';  // معرف ثابت لضمان نفس المستخدم دائمًا
const SUPER_ADMIN_USERNAME = 'superadmin';
// كلمة المرور المشفرة مباشرة (تم تشفيرها مسبقًا باستخدام bcrypt)
const SUPER_ADMIN_PASSWORD_HASH = '$2a$10$0lnhiRBBZs4o8HsV5fWAR.ZsqR09MK0YO6iqpqFRhLfBGgw7gaJXq';  // هذه كلمة المرور المشفرة لـ Ketama@Admin2025
const SUPER_ADMIN_NAME = 'المسؤول الرئيسي';

/**
 * إنشاء مستخدم المسؤول الرئيسي إذا لم يكن موجودًا
 */
export const setupSuperAdmin = async (): Promise<void> => {
  try {
    // التحقق من وجود المستخدم المسؤول الرئيسي بواسطة المعرف
    const existingAdmin = await getProfileById(SUPER_ADMIN_ID);
    
    // التحقق من وجود المستخدم المسؤول الرئيسي بواسطة اسم المستخدم
    const existingAdminByUsername = await getProfileByUsername(SUPER_ADMIN_USERNAME);
    
    if (existingAdmin) {
      console.log('المستخدم المسؤول الرئيسي موجود بالفعل بواسطة المعرف:', existingAdmin.username);
      return;
    }
    
    if (existingAdminByUsername) {
      console.log('المستخدم المسؤول الرئيسي موجود بالفعل بواسطة اسم المستخدم:', existingAdminByUsername.username);
      return;
    }
    
    // إنشاء مستخدم المسؤول الرئيسي باستخدام كلمة المرور المشفرة مباشرة
    const superAdmin = {
      id: SUPER_ADMIN_ID,
      full_name: SUPER_ADMIN_NAME,
      role: 'superadmin' as const,
      username: SUPER_ADMIN_USERNAME,
      password_hash: SUPER_ADMIN_PASSWORD_HASH  // استخدام كلمة المرور المشفرة مباشرة
    };
    
    console.log('جاري إنشاء المستخدم المسؤول الرئيسي باستخدام كلمة المرور المشفرة...');
    const result = await createProfileWithHashedPassword(superAdmin);
    
    if (result.success) {
      console.log('تم إنشاء المستخدم المسؤول الرئيسي بنجاح:', result.id);
    } else {
      console.error('فشل في إنشاء المستخدم المسؤول الرئيسي:', result.message);
    }
  } catch (error) {
    console.error('خطأ في إعداد المستخدم المسؤول الرئيسي:', error);
  }
  
  // التحقق مرة أخرى بعد الإنشاء للتأكد من وجود المستخدم
  try {
    const verifyAdmin = await getProfileByUsername(SUPER_ADMIN_USERNAME);
    if (verifyAdmin) {
      console.log('تم التحقق من وجود المستخدم المسؤول الرئيسي بعد الإنشاء:', verifyAdmin.username);
    } else {
      console.error('لم يتم العثور على المستخدم المسؤول الرئيسي بعد محاولة الإنشاء!');
    }
  } catch (error) {
    console.error('خطأ في التحقق من المستخدم المسؤول الرئيسي بعد الإنشاء:', error);
  }
};

/**
 * تغيير كلمة مرور المسؤول الرئيسي في حالة النسيان
 * هذه الوظيفة للاستخدام في حالات الطوارئ فقط عبر واجهة الإدارة
 */
export const resetSuperAdminPassword = async (newPassword: string): Promise<{ success: boolean, message?: string }> => {
  try {
    const superAdmin = await getProfileById(SUPER_ADMIN_ID);
    
    if (!superAdmin) {
      return {
        success: false,
        message: 'المستخدم المسؤول الرئيسي غير موجود'
      };
    }
    
    // تشفير كلمة المرور الجديدة
    const password_hash = await hashPassword(newPassword);
    
    // تحديث كلمة المرور باستخدام كلمة المرور المشفرة
    const result = await createProfileWithHashedPassword({
      id: SUPER_ADMIN_ID,
      full_name: superAdmin.full_name,
      role: 'superadmin' as const,
      username: superAdmin.username,
      password_hash: password_hash
    });
    
    return {
      success: result.success,
      message: result.success ? 'تم تحديث كلمة مرور المسؤول الرئيسي بنجاح' : result.message
    };
  } catch (error) {
    console.error('خطأ في إعادة تعيين كلمة مرور المسؤول الرئيسي:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إعادة تعيين كلمة المرور'
    };
  }
};
