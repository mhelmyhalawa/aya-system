// src/lib/app-startup.ts
// تهيئة التطبيق وإنشاء المستخدم المسؤول الرئيسي عند بدء التشغيل

import { setupSuperAdmin } from './super-admin-setup';

/**
 * تهيئة التطبيق
 * هذه الوظيفة يجب استدعاؤها عند بدء تشغيل التطبيق
 */
export const initializeApp = async (): Promise<void> => {
  console.log('جاري تهيئة التطبيق...');
  
  try {
    // إنشاء المستخدم المسؤول الرئيسي إذا لم يكن موجودًا
    await setupSuperAdmin();
    
    console.log('تم تهيئة التطبيق بنجاح');
  } catch (error) {
    console.error('خطأ في تهيئة التطبيق:', error);
  }
};

// استدعاء وظيفة التهيئة عند استيراد هذا الملف
// يمكن استدعاؤها أيضًا في ملف main.tsx أو App.tsx
initializeApp();
