// src/lib/app-startup.ts
// تهيئة التطبيق وإنشاء المستخدم المسؤول الرئيسي عند بدء التشغيل

import { setupSuperAdmin } from './super-admin-setup';
import { warmDriveImagesCache, clearAllDriveImageCache } from './google-drive-image-service';
import { BUILD_VERSION } from './version';

// قراءة متغيرات بيئة Google Drive للتهيئة المبكرة للصور
const DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID as string | undefined;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

// تحقق من رقم الإصدار لمسح الكاش إذا تغير
function checkVersionAndInvalidateCache(): { changed: boolean } {
  try {
    const VERSION_KEY = 'app_build_version';
    const prev = localStorage.getItem(VERSION_KEY);
    if (prev !== BUILD_VERSION) {
      // إصدار جديد → مسح كل كاش الصور
      clearAllDriveImageCache();
      localStorage.setItem(VERSION_KEY, BUILD_VERSION);
      console.log(`[Startup] Version changed from '${prev || 'none'}' to '${BUILD_VERSION}' → cache invalidated.`);
      return { changed: true };
    }
    return { changed: false };
  } catch (e) {
    console.warn('[Startup] Version check failed', e);
    return { changed: false };
  }
}

/**
 * تهيئة التطبيق
 * هذه الوظيفة يجب استدعاؤها عند بدء تشغيل التطبيق
 */
export const initializeApp = async (): Promise<void> => {
  console.log('جاري تهيئة التطبيق...');
  
  try {
    // إنشاء المستخدم المسؤول الرئيسي إذا لم يكن موجودًا
    await setupSuperAdmin();

    // فحص الإصدار لمسح الكاش إذا تغير
    const versionResult = checkVersionAndInvalidateCache();

    // تسخين كاش الصور (لا نوقف التهيئة في حال الفشل)
    if (DRIVE_FOLDER_ID && GOOGLE_API_KEY) {
      warmDriveImagesCache(DRIVE_FOLDER_ID, GOOGLE_API_KEY)
        .then(count => console.log(`[DriveBanner] تم حفظ ${count} صورة في الكاش المسبق (versionChanged=${versionResult.changed})`))
        .catch(e => console.warn('[DriveBanner] فشل تسخين كاش الصور', e));
    } else {
      console.log('[DriveBanner] تخطي تسخين الكاش: متغيرات Google Drive غير مكتملة');
    }

    console.log('تم تهيئة التطبيق بنجاح');
  } catch (error) {
    console.error('خطأ في تهيئة التطبيق:', error);
  }
};

// استدعاء وظيفة التهيئة عند استيراد هذا الملف
// يمكن استدعاؤها أيضًا في ملف main.tsx أو App.tsx
initializeApp();
