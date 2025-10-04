// أداة للتواصل المباشر مع Supabase API دون استخدام SDK
// يمكن استخدام هذا الملف إذا كانت هناك مشكلات مع SDK

import { getUserJWTToken } from './supabase-client';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase-keys';

// طباعة المفاتيح للتصحيح
console.log('SupabaseREST: تهيئة:', {
  url: SUPABASE_URL,
  key: SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 10)}...` : 'غير معرف'
});

/**
 * إنشاء رؤوس HTTP للطلبات
 * @param useServiceKey استخدام مفتاح الخدمة بدلاً من المفتاح العام
 * @param options خيارات إضافية للرؤوس
 * @param authMode طريقة المصادقة ('apikey_only', 'jwt_token', 'auto')
 */
const createHeaders = (_useServiceKey = false, options = {}, authMode = 'auto') => {
  // الحصول على JWT token للمستخدم
  const userToken = getUserJWTToken();
  
  // طريقة المصادقة: 'apikey_only' = استخدام API key فقط (لشاشة الدخول)
  // طريقة المصادقة: 'jwt_token' = استخدام JWT token إجبارياً (لإضافة السجلات)
  // طريقة المصادقة: 'auto' = الطريقة الافتراضية، تستخدم JWT token إذا كان متوفراً
  
  // اختيار API key المناسب
  const apiKey = SUPABASE_KEY;
  
  if (authMode === 'apikey_only') {
    console.log('SupabaseREST: استخدام API key فقط بدون JWT token');
    return {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      ...options
    };
  }
  
  if (authMode === 'jwt_token' && userToken) {
    console.log('SupabaseREST: استخدام JWT token للمستخدم (إجباري)');
    return {
      'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY, // يجب دائماً إرسال apikey حتى مع JWT token
      'Authorization': `Bearer ${userToken}`,
      ...options
    };
  }
  
  // الوضع التلقائي - استخدام JWT token إذا كان متوفراً
  if (authMode === 'auto' && userToken) {
    console.log('SupabaseREST: استخدام JWT token للمستخدم (تلقائي)');
    return {
      'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY, // يجب دائماً إرسال apikey حتى مع JWT token
      'Authorization': `Bearer ${userToken}`,
      ...options
    };
  }
  
  // الحالة الافتراضية - استخدام API key فقط
  console.log('SupabaseREST: استخدام API key فقط');
  return {
    'Content-Type': 'application/json',
  'apikey': apiKey,
  'Authorization': `Bearer ${apiKey}`,
    ...options
  };
};

/**
 * إنشاء سجل في جدول معين
 * @param table اسم الجدول
 * @param data البيانات المراد إنشاؤها
 * @param forceServiceKey إجبار استخدام مفتاح الخدمة
 */
export const createRecord = async (table, data, _forceServiceKey = false) => {
  try {
    console.log(`SupabaseREST: إنشاء سجل في جدول ${table}`);
    
    // تحديد إذا كان الجدول من الجداول المحمية التي تتطلب مفتاح الخدمة
  const isProtectedTable = table === 'profiles';
    
    // تحضير البيانات للإرسال
    const requestBody = JSON.stringify(Array.isArray(data) ? data : [data]);
    console.log('SupabaseREST: محتوى الطلب:', requestBody.substring(0, 100) + (requestBody.length > 100 ? '...' : ''));
    
    // لم يعد مسموحًا باستخدام service_role من الواجهة، نفترض أن RLS يسمح بالعمليات المسموحة أو يتم تنفيذ العمليات الحساسة عبر backend خارجي.
    if (isProtectedTable) {
      console.warn(`SupabaseREST: محاولة إنشاء سجل في جدول محمي (${table}) من الواجهة مرفوضة بدون backend.`);
      return { success: false, error: 'عملية غير مسموحة من الواجهة' };
    }
    
    // التحقق من وجود JWT token للمستخدم للجداول غير المحمية
    const userToken = getUserJWTToken();
    console.log('SupabaseREST: JWT token للمستخدم موجود؟', userToken ? 'نعم' : 'لا');
    
    // استخدام JWT token للجداول غير المحمية
    if (userToken) {
      console.log(`SupabaseREST: استخدام JWT token للمستخدم لإنشاء سجل في جدول ${table}`);
      
      const jwtHeaders = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${userToken}`,
        'Prefer': 'return=representation'
      };
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: jwtHeaders,
        body: requestBody
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`SupabaseREST: تم إنشاء السجل بنجاح في جدول ${table} باستخدام JWT token`);
        return { success: true, data: result };
      }
      
      const errorText = await response.text();
      console.warn(`SupabaseREST: فشل إنشاء السجل باستخدام JWT token:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
    }
    
    // إذا وصلنا إلى هنا، فإما لا يوجد JWT token أو فشل استخدامه
    // استخدام مفتاح الخدمة كخطة بديلة للجداول غير المحمية
    return { success: false, error: 'تعذر إنشاء السجل بدون JWT صالح' };
  } catch (error) {
    console.error(`SupabaseREST: خطأ أثناء إنشاء السجل في جدول ${table}:`, error);
    return { success: false, error: String(error) };
  }
};

/**
 * تحديث سجل في جدول معين
 * @param table اسم الجدول
 * @param query استعلام البحث
 * @param data البيانات المراد تحديثها
 */
export const updateRecord = async (table, query, data) => {
  try {
    console.log(`SupabaseREST: تحديث سجل في جدول ${table} مع استعلام: ${query}`);
    
    // استخدام JWT token إجبارياً لتحديث السجلات
    const userToken = getUserJWTToken();
    
    if (userToken) {
      console.log('SupabaseREST: تحديث السجل باستخدام JWT token');
      const headers = createHeaders(false, { 'Prefer': 'return=representation' }, 'jwt_token');
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`SupabaseREST: تم تحديث السجل بنجاح في جدول ${table} باستخدام JWT token`);
        return { success: true, data: result };
      }
      
      const errorText = await response.text();
      console.warn(`SupabaseREST: فشل تحديث السجل باستخدام JWT token:`, errorText);
    }
    
    return { success: false, error: 'تحديث السجل يتطلب JWT صالح' };
  } catch (error) {
    console.error(`SupabaseREST: خطأ أثناء تحديث السجل في جدول ${table}:`, error);
    return { success: false, error };
  }
};

/**
 * البحث عن سجل في جدول معين
 * @param table اسم الجدول
 * @param query استعلام البحث
 * @param authMode طريقة المصادقة ('apikey_only', 'jwt_token', 'auto')
 */
export const findRecord = async (table, query, authMode = 'auto') => {
  try {
    console.log(`SupabaseREST: البحث عن سجل في جدول ${table} مع استعلام: ${query}`);
    
    // نحاول أولاً بالمفتاح العام لأن العمليات للقراءة فقط
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'GET',
      headers: createHeaders(false, {}, authMode)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`SupabaseREST: تم العثور على ${result.length} سجل في جدول ${table}`);
      return { success: true, data: result };
    }
    
    const errorText = await response.text();
    console.error(`SupabaseREST: فشل البحث في جدول ${table}:`, errorText);
    return { success: false, error: errorText };
  } catch (error) {
    console.error(`SupabaseREST: خطأ أثناء البحث عن سجل في جدول ${table}:`, error);
    return { success: false, error };
  }
};

// توفير وظائف محددة للتعامل مع جدول المستخدمين (profiles)
export const createProfile = async (profileData) => {
  try {
    console.log('SupabaseREST: إنشاء ملف شخصي جديد');
    
    // دائماً استخدم مفتاح الخدمة (SERVICE_KEY) للجداول المحمية مثل profiles
    // جدول profiles يحتوي على بيانات مستخدمين وصلاحيات، لذا نستخدم مفتاح الخدمة
    console.warn('SupabaseREST: إنشاء ملف شخصي محظور من الواجهة بدون backend');
    return { success: false, error: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('SupabaseREST: خطأ أثناء إنشاء ملف شخصي:', error);
    return { success: false, error: String(error) };
  }
};

export const updateProfile = async (id, profileData) => {
  try {
    console.log(`SupabaseREST: تحديث ملف شخصي للمستخدم ${id}`);
    
    // دائماً استخدم مفتاح الخدمة (SERVICE_KEY) للجداول المحمية مثل profiles
    console.warn('SupabaseREST: تحديث ملف شخصي محظور من الواجهة بدون backend');
    return { success: false, error: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error(`SupabaseREST: خطأ أثناء تحديث الملف الشخصي:`, error);
    return { success: false, error: String(error) };
  }
};

export const findProfileByUsername = async (username) => {
  try {
    console.log(`SupabaseREST: البحث عن مستخدم بواسطة اسم المستخدم للمصادقة: ${username}`);
    
    // للمصادقة فقط نسمح بالوصول إلى بيانات المستخدم باستخدام واجهة REST مع المفتاح العام
    const query = `select=id,username,role,full_name,password_hash,login_attempts,last_login_at&username=eq.${encodeURIComponent(username)}&limit=1`;
    
    // نستخدم apikey_only لأنه طلب للمصادقة وليس لدينا JWT token بعد
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${query}`, {
      method: 'GET',
      headers: createHeaders(false, {}, 'apikey_only')
    });
    
    if (response.ok) {
      const result = await response.json();
      
      if (result && result.length > 0) {
        console.log(`SupabaseREST: تم العثور على المستخدم ${username}`);
        
        // عرض بيانات المستخدم بدون كلمة المرور المشفرة للسجلات
        const userData = { ...result[0] };
        const password_hash = userData.password_hash;
        userData.password_hash = password_hash ? `${password_hash.substring(0, 15)}...` : 'غير موجودة';
        console.log('SupabaseREST: بيانات المستخدم:', userData);
        
        return { success: true, data: result[0] };
      }
      
      console.log(`SupabaseREST: لم يتم العثور على المستخدم ${username}`);
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    return { success: false, error: `خطأ في استرجاع المستخدم: ${await response.text()}` };
  } catch (error) {
    console.error('SupabaseREST: خطأ أثناء البحث عن المستخدم:', error);
    return { success: false, error: String(error) };
  }
};

export const updateLoginAttempts = async (id, attempts, lastLoginAt = null) => {
  try {
    console.log(`SupabaseREST: تحديث محاولات تسجيل الدخول للمستخدم ${id} إلى ${attempts}`);
    
    const data: any = { login_attempts: attempts };
    
    if (lastLoginAt) {
      data.last_login_at = lastLoginAt;
    }
    
    // دائماً استخدم مفتاح الخدمة (SERVICE_KEY) للجداول المحمية مثل profiles
    console.warn('SupabaseREST: تحديث محاولات الدخول محظور من الواجهة بدون backend');
    return { success: false, error: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('SupabaseREST: خطأ أثناء تحديث محاولات تسجيل الدخول:', error);
    return { success: false, error: String(error) };
  }
};
