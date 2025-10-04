// وظائف API مباشرة للتعامل مع Supabase
// استخدم هذا الملف عندما لا يعمل عميل Supabase العادي

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

console.log('DirectSupabaseAPI: تهيئة', {
  url: SUPABASE_URL,
  key: SUPABASE_KEY ? SUPABASE_KEY.substring(0, 10) + '...' : 'غير معرف'
});

/**
 * إنشاء مستخدم جديد باستخدام Fetch API مباشرة
 */
export const createProfileDirectly = async (profileData: any): Promise<any> => {
  try {
    console.log('بيانات المستخدم المرسلة:', profileData);
    
    // استخدام رؤوس مخصصة للتعامل مع الطلب
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    };
    
    console.log('إرسال طلب إنشاء مستخدم مع المفتاح العام');
    
    // سنحاول استخدام المفتاح العام
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify([profileData])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('استجابة خطأ من Supabase:', response.status, errorText);
      return {
        success: false,
        message: `فشل إنشاء المستخدم: ${response.status} ${response.statusText}`,
        details: errorText
      };
    }

    const data = await response.json();
    console.log('تم إنشاء المستخدم بنجاح:', data);
    return {
      success: true,
      data,
      message: 'تم إنشاء المستخدم بنجاح'
    };
  } catch (error) {
    console.error('خطأ أثناء إنشاء المستخدم مباشرة:', error);
    return {
      success: false,
      message: 'خطأ أثناء إنشاء المستخدم',
      error
    };
  }
};

/**
 * تحديث مستخدم باستخدام Fetch API مباشرة (باستخدام المفتاح العام)
 */
export const updateProfileDirectly = async (id: string, profileData: any): Promise<any> => {
  try {
    console.log('تحديث المستخدم بالمعرف:', id, 'بيانات:', profileData);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('استجابة خطأ من Supabase:', response.status, errorText);
      return {
        success: false,
        message: `فشل تحديث المستخدم: ${response.status} ${response.statusText}`,
        details: errorText
      };
    }

    const data = await response.json();
    console.log('تم تحديث المستخدم بنجاح:', data);
    return {
      success: true,
      data,
      message: 'تم تحديث المستخدم بنجاح'
    };
  } catch (error) {
    console.error('خطأ أثناء تحديث المستخدم مباشرة:', error);
    return {
      success: false,
      message: 'خطأ أثناء تحديث المستخدم',
      error
    };
  }
};

/**
 * إنشاء مستخدم مع محاولة المفتاحين - يستخدم أولاً المفتاح العام ثم يجرب مفتاح الخدمة إذا فشل الأول
 */
export const createProfileWithFallback = async () => ({ success: false, message: 'عملية محظورة من الواجهة بدون Backend' });

/**
 * تحديث مستخدم مع محاولة المفتاحين - يستخدم أولاً المفتاح العام ثم يجرب مفتاح الخدمة إذا فشل الأول
 */
export const updateProfileWithFallback = async (id: string, profileData: any): Promise<any> => {
  // أولاً نحاول بالمفتاح العام
  const anonResult = await updateProfileDirectly(id, profileData);
  
  // إذا نجحت العملية، نعيد النتيجة
  if (anonResult.success) {
    return anonResult;
  }
  
  console.log('فشلت محاولة التحديث باستخدام المفتاح العام، نجرب مفتاح الخدمة...');
  
  // إذا فشلت، نحاول بمفتاح الخدمة
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('استجابة خطأ من Supabase باستخدام مفتاح الخدمة للتحديث:', response.status, errorText);
      return {
        success: false,
        message: `فشل تحديث المستخدم بكلا المفتاحين: ${response.status} ${response.statusText}`,
        details: errorText
      };
    }

    const data = await response.json();
    console.log('تم تحديث المستخدم بنجاح باستخدام مفتاح الخدمة:', data);
    return {
      success: true,
      data,
      message: 'تم تحديث المستخدم بنجاح باستخدام مفتاح الخدمة'
    };
  } catch (error) {
    console.error('خطأ أثناء تحديث المستخدم باستخدام مفتاح الخدمة:', error);
    return {
      success: false,
      message: 'فشل تحديث المستخدم بكلا المفتاحين',
      error
    };
  }
};

/**
 * البحث عن مستخدم حسب اسم المستخدم باستخدام Fetch API مباشرة
 */
export const findUserByUsernameDirectly = async (username: string): Promise<any> => {
  try {
    console.log('البحث عن مستخدم باسم المستخدم:', username);
    console.warn('البحث عن مستخدم في profiles محظور من الواجهة بدون Backend');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ أثناء البحث عن المستخدم مباشرة:', error);
    return {
      success: false,
      message: 'خطأ أثناء البحث عن المستخدم',
      error
    };
  }
};

/**
 * تحديث محاولات تسجيل الدخول للمستخدم
 */
export const updateLoginAttemptsDirectly = async (userId: string, attempts: number, lastLoginAt?: string): Promise<any> => {
  try {
    console.log('تحديث محاولات تسجيل الدخول للمستخدم:', userId, 'عدد المحاولات:', attempts);
    console.warn('تحديث محاولات تسجيل الدخول محظور من الواجهة بدون Backend');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ أثناء تحديث محاولات تسجيل الدخول:', error);
    return {
      success: false,
      message: 'خطأ أثناء تحديث محاولات تسجيل الدخول',
      error
    };
  }
};
