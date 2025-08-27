// أداة للتواصل المباشر مع Supabase API دون استخدام SDK
// يمكن استخدام هذا الملف إذا كانت هناك مشكلات مع SDK

import { getUserJWTToken } from './supabase-client';

// الحصول على مفاتيح Supabase من ملف البيئة
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ikeicbxkjgdhhofuhehr.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWljYnhramdkaGhvZnVoZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQzNzQsImV4cCI6MjA2OTM2MDM3NH0.4Qv_Z37pH_clIOHBDnNg_e0qpJ4AAEU20YvP_ETxOGc';
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWljYnhramdkaGhvZnVoZWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc4NDM3NCwiZXhwIjoyMDY5MzYwMzc0fQ.8tIOgbkb2S8o1rcskLVYAiFSD2BqwGfttrX2KHSNVko';

// طباعة المفاتيح للتصحيح
console.log('SupabaseREST: تهيئة مع المفاتيح:', {
  url: SUPABASE_URL,
  anonKey: ANON_KEY ? `${ANON_KEY.substring(0, 10)}...` : 'غير معرف',
  serviceKey: SERVICE_KEY ? `${SERVICE_KEY.substring(0, 10)}...` : 'غير معرف'
});

/**
 * إنشاء رؤوس HTTP للطلبات
 * @param useServiceKey استخدام مفتاح الخدمة بدلاً من المفتاح العام
 * @param options خيارات إضافية للرؤوس
 * @param authMode طريقة المصادقة ('apikey_only', 'jwt_token', 'auto')
 */
const createHeaders = (useServiceKey = true, options = {}, authMode = 'auto') => {
  // الحصول على JWT token للمستخدم
  const userToken = getUserJWTToken();
  
  // طريقة المصادقة: 'apikey_only' = استخدام API key فقط (لشاشة الدخول)
  // طريقة المصادقة: 'jwt_token' = استخدام JWT token إجبارياً (لإضافة السجلات)
  // طريقة المصادقة: 'auto' = الطريقة الافتراضية، تستخدم JWT token إذا كان متوفراً
  
  // اختيار API key المناسب
  const apiKey = useServiceKey ? SERVICE_KEY : ANON_KEY;
  
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
      'apikey': ANON_KEY, // يجب دائماً إرسال apikey حتى مع JWT token
      'Authorization': `Bearer ${userToken}`,
      ...options
    };
  }
  
  // الوضع التلقائي - استخدام JWT token إذا كان متوفراً
  if (authMode === 'auto' && userToken) {
    console.log('SupabaseREST: استخدام JWT token للمستخدم (تلقائي)');
    return {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY, // يجب دائماً إرسال apikey حتى مع JWT token
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
export const createRecord = async (table, data, forceServiceKey = false) => {
  try {
    console.log(`SupabaseREST: إنشاء سجل في جدول ${table}`);
    
    // تحديد إذا كان الجدول من الجداول المحمية التي تتطلب مفتاح الخدمة
    const isProtectedTable = table === 'profiles' || forceServiceKey;
    
    // تحضير البيانات للإرسال
    const requestBody = JSON.stringify(Array.isArray(data) ? data : [data]);
    console.log('SupabaseREST: محتوى الطلب:', requestBody.substring(0, 100) + (requestBody.length > 100 ? '...' : ''));
    
    if (isProtectedTable) {
      console.log(`SupabaseREST: استخدام مفتاح الخدمة لإنشاء سجل في جدول محمي (${table})`);
      
      const serviceHeaders = {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      };
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: serviceHeaders,
        body: requestBody
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`SupabaseREST: تم إنشاء السجل بنجاح في جدول ${table} باستخدام مفتاح الخدمة`);
        return { success: true, data: result };
      }
      
      const errorText = await response.text();
      console.error(`SupabaseREST: فشل إنشاء السجل في جدول ${table}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return { 
        success: false, 
        error: errorText,
        status: response.status,
        statusText: response.statusText
      };
    }
    
    // التحقق من وجود JWT token للمستخدم للجداول غير المحمية
    const userToken = getUserJWTToken();
    console.log('SupabaseREST: JWT token للمستخدم موجود؟', userToken ? 'نعم' : 'لا');
    
    // استخدام JWT token للجداول غير المحمية
    if (userToken) {
      console.log(`SupabaseREST: استخدام JWT token للمستخدم لإنشاء سجل في جدول ${table}`);
      
      const jwtHeaders = {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
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
    console.log(`SupabaseREST: استخدام مفتاح الخدمة كخطة بديلة لإنشاء سجل في جدول ${table}`);
    
    const fallbackHeaders = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation'
    };
    
    const fallbackResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: fallbackHeaders,
      body: requestBody
    });
    
    if (fallbackResponse.ok) {
      const result = await fallbackResponse.json();
      console.log(`SupabaseREST: تم إنشاء السجل بنجاح في جدول ${table} باستخدام مفتاح الخدمة (خطة بديلة)`);
      return { success: true, data: result };
    }
    
    const fallbackErrorText = await fallbackResponse.text();
    console.error(`SupabaseREST: فشل إنشاء السجل في جدول ${table} حتى باستخدام مفتاح الخدمة:`, {
      status: fallbackResponse.status,
      statusText: fallbackResponse.statusText,
      error: fallbackErrorText
    });
    
    return { 
      success: false, 
      error: fallbackErrorText,
      status: fallbackResponse.status,
      statusText: fallbackResponse.statusText
    };
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
    
    // تحديد إذا كان الجدول من الجداول المحمية التي تتطلب مفتاح الخدمة
    const isProtectedTable = table === 'profiles';
    
    if (isProtectedTable) {
      console.log(`SupabaseREST: استخدام مفتاح الخدمة لتحديث سجل في جدول محمي (${table})`);
      
      const serviceHeaders = {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      };
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        method: 'PATCH',
        headers: serviceHeaders,
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`SupabaseREST: تم تحديث السجل بنجاح في جدول ${table} باستخدام مفتاح الخدمة`);
        return { success: true, data: result };
      }
      
      const errorText = await response.text();
      console.error(`SupabaseREST: فشل تحديث السجل في جدول ${table}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return { 
        success: false, 
        error: errorText,
        status: response.status,
        statusText: response.statusText
      };
    }
    
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
    
    // أولاً نحاول باستخدام مفتاح الخدمة
    console.log('SupabaseREST: محاولة تحديث السجل باستخدام مفتاح الخدمة');
    const serviceHeaders = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation'
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: serviceHeaders,
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`SupabaseREST: تم تحديث السجل بنجاح في جدول ${table} باستخدام مفتاح الخدمة`);
      return { success: true, data: result };
    }
    
    // إذا فشل، نحاول بالمفتاح العام
    console.log(`SupabaseREST: فشل تحديث السجل باستخدام مفتاح الخدمة، نجرب بالمفتاح العام`);
    const errorText = await response.text();
    console.warn(`SupabaseREST: خطأ باستخدام مفتاح الخدمة:`, errorText);
    
    const anonResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: createHeaders(false, { 'Prefer': 'return=representation' }, 'apikey_only'),
      body: JSON.stringify(data)
    });
    
    if (anonResponse.ok) {
      const result = await anonResponse.json();
      console.log(`SupabaseREST: تم تحديث السجل بنجاح في جدول ${table} باستخدام المفتاح العام`);
      return { success: true, data: result };
    }
    
    const anonErrorText = await anonResponse.text();
    console.error(`SupabaseREST: فشل تحديث السجل في جدول ${table}:`, anonErrorText);
    
    return { 
      success: false, 
      error: anonErrorText,
      status: anonResponse.status,
      statusText: anonResponse.statusText
    };
  } catch (error) {
    console.error(`SupabaseREST: خطأ أثناء تحديث السجل في جدول ${table}:`, error);
    return { success: false, error: String(error) };
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
    
    // تحديد إذا كان الجدول من الجداول المحمية التي تتطلب مفتاح الخدمة
    const isProtectedTable = table === 'profiles';
    
    if (isProtectedTable) {
      console.log(`SupabaseREST: استخدام مفتاح الخدمة للبحث في جدول محمي (${table})`);
      
      const serviceHeaders = {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      };
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        method: 'GET',
        headers: serviceHeaders
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`SupabaseREST: تم العثور على ${result.length} سجل في جدول ${table} باستخدام مفتاح الخدمة`);
        return { success: true, data: result };
      }
      
      const errorText = await response.text();
      console.error(`SupabaseREST: فشل البحث عن سجل في جدول محمي ${table}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return { 
        success: false, 
        error: errorText,
        status: response.status,
        statusText: response.statusText
      };
    }
    
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
    
    // إذا فشل، نحاول بمفتاح الخدمة
    console.log(`SupabaseREST: فشل البحث باستخدام المفتاح العام، نجرب بمفتاح الخدمة`);
    const errorText = await response.text();
    console.warn(`SupabaseREST: خطأ باستخدام المفتاح العام:`, errorText);
    
    const serviceResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'GET',
      headers: createHeaders(true, {}, authMode)
    });
    
    if (serviceResponse.ok) {
      const result = await serviceResponse.json();
      console.log(`SupabaseREST: تم العثور على ${result.length} سجل في جدول ${table} باستخدام مفتاح الخدمة`);
      return { success: true, data: result };
    }
    
    const serviceErrorText = await serviceResponse.text();
    console.error(`SupabaseREST: فشل البحث عن سجل في جدول ${table}:`, serviceErrorText);
    
    return { 
      success: false, 
      error: serviceErrorText,
      status: serviceResponse.status,
      statusText: serviceResponse.statusText
    };
  } catch (error) {
    console.error(`SupabaseREST: خطأ أثناء البحث عن سجل في جدول ${table}:`, error);
    return { success: false, error: String(error) };
  }
};

// توفير وظائف محددة للتعامل مع جدول المستخدمين (profiles)
export const createProfile = async (profileData) => {
  try {
    console.log('SupabaseREST: إنشاء ملف شخصي جديد');
    
    // دائماً استخدم مفتاح الخدمة (SERVICE_KEY) للجداول المحمية مثل profiles
    // جدول profiles يحتوي على بيانات مستخدمين وصلاحيات، لذا نستخدم مفتاح الخدمة
    console.log('SupabaseREST: استخدام مفتاح الخدمة لإنشاء سجل في جدول profiles المحمي');
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation'
    };
    
    const requestBody = JSON.stringify([profileData]);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers,
      body: requestBody
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('SupabaseREST: تم إنشاء الملف الشخصي بنجاح باستخدام مفتاح الخدمة');
      return { success: true, data: result };
    }
    
    const errorText = await response.text();
    console.error('SupabaseREST: فشل إنشاء الملف الشخصي:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    
    return { 
      success: false, 
      error: errorText,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error('SupabaseREST: خطأ أثناء إنشاء ملف شخصي:', error);
    return { success: false, error: String(error) };
  }
};

export const updateProfile = async (id, profileData) => {
  try {
    console.log(`SupabaseREST: تحديث ملف شخصي للمستخدم ${id}`);
    
    // دائماً استخدم مفتاح الخدمة (SERVICE_KEY) للجداول المحمية مثل profiles
    console.log('SupabaseREST: استخدام مفتاح الخدمة لتحديث سجل في جدول profiles المحمي');
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation'
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(profileData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`SupabaseREST: تم تحديث الملف الشخصي بنجاح باستخدام مفتاح الخدمة`);
      return { success: true, data: result };
    }
    
    const errorText = await response.text();
    console.error(`SupabaseREST: فشل تحديث الملف الشخصي:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    
    return { 
      success: false, 
      error: errorText,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error(`SupabaseREST: خطأ أثناء تحديث الملف الشخصي:`, error);
    return { success: false, error: String(error) };
  }
};

export const findProfileByUsername = async (username) => {
  try {
    console.log(`SupabaseREST: البحث عن مستخدم بواسطة اسم المستخدم: ${username}`);
    
    // دائماً استخدم مفتاح الخدمة (SERVICE_KEY) للجداول المحمية مثل profiles
    console.log('SupabaseREST: استخدام مفتاح الخدمة للبحث في جدول profiles المحمي');
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&limit=1`, {
      method: 'GET',
      headers
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`SupabaseREST: تم العثور على ${result.length} مستخدم`);
      
      if (result && result.length > 0) {
        return { success: true, data: result[0] };
      }
    }
    
    const errorText = await response.text();
    console.error('SupabaseREST: فشل البحث عن المستخدم:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    
    return { success: false, error: 'لم يتم العثور على المستخدم' };
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
    console.log('SupabaseREST: استخدام مفتاح الخدمة لتحديث محاولات تسجيل الدخول في جدول profiles المحمي');
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation'
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('SupabaseREST: تم تحديث محاولات تسجيل الدخول بنجاح باستخدام مفتاح الخدمة');
      return { success: true, data: result };
    }
    
    const errorText = await response.text();
    console.error('SupabaseREST: فشل تحديث محاولات تسجيل الدخول:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    
    return { 
      success: false, 
      error: errorText,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error('SupabaseREST: خطأ أثناء تحديث محاولات تسجيل الدخول:', error);
    return { success: false, error: String(error) };
  }
};
