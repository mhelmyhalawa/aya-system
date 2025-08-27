// src/lib/browser-email-service.ts
import { saveStudentToLocalStorage } from './local-storage-service';

// استخراج بيانات البريد من متغيرات البيئة الخاصة بـ Vite
const EMAIL = import.meta.env.VITE_GOOGLE_EMAIL || '';

/**
 * وظيفة مُبسَّطة لإرسال بيانات الطالب عبر البريد الإلكتروني
 * في بيئة المتصفح، نحتفظ بالبيانات محليًا فقط ونوفر واجهة متوافقة
 * في حالة وجود خادم خلفي، يمكن استخدام fetch لإرسال البيانات إلى نقطة نهاية API
 */
export const sendStudentDataByEmail = async (studentData: any): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('محاولة حفظ بيانات الطالب محليًا:', studentData);
    
    // حفظ البيانات محليًا
    saveStudentToLocalStorage(studentData);
    
    // في بيئة حقيقية، يمكنك إرسال البيانات إلى خادم خلفي
    // مثال:
    /*
    await fetch('/api/send-student-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student: studentData,
        to: recipientEmail || EMAIL,
      }),
    });
    */
    
    return {
      success: true,
      message: 'تم حفظ بيانات الطالب محليًا. في بيئة الإنتاج، سيتم إرسالها عبر البريد الإلكتروني.'
    };
  } catch (error) {
    console.error('خطأ في حفظ بيانات الطالب:', error);
    return {
      success: false,
      message: `فشل في معالجة البيانات: ${error.message}`
    };
  }
};
