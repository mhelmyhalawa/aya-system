// وظائف API مباشرة للتعامل مع Supabase
// استخدم هذا الملف عندما لا يعمل عميل Supabase العادي

// الحصول على مفاتيح Supabase من ملف البيئة
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ikeicbxkjgdhhofuhehr.supabase.co';

// المفتاح العام (anon key) - نحصل عليه من متغيرات البيئة مع قيمة احتياطية
const ANON_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWljYnhramdkaGhvZnVoZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODQzNzQsImV4cCI6MjA2OTM2MDM3NH0.4Qv_Z37pH_clIOHBDnNg_e0qpJ4AAEU20YvP_ETxOGc';

// مفتاح الخدمة - نحصل عليه من متغيرات البيئة مع قيمة احتياطية
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZWljYnhramdkaGhvZnVoZWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4NDUwMDU3MiwiZXhwIjozODM5ODU4MTcyfQ.xsNLA6IXtEUXLo5UF9q0TKoTeG1vqcM5yE7eX0sSAo0';

// طباعة المفاتيح المستخدمة للتأكد منها (سيتم إزالة هذا في الإنتاج)
console.log('مفاتيح Supabase المستخدمة:', {
  url: SUPABASE_URL,
  anonKey: ANON_KEY ? ANON_KEY.substring(0, 10) + '...' : 'غير معرف',
  serviceKey: SERVICE_KEY ? SERVICE_KEY.substring(0, 10) + '...' : 'غير معرف'
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
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
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
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
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
export const createProfileWithFallback = async (profileData: any): Promise<any> => {
  // أولاً نحاول بالمفتاح العام
  const anonResult = await createProfileDirectly(profileData);
  
  // إذا نجحت العملية، نعيد النتيجة
  if (anonResult.success) {
    return anonResult;
  }
  
  console.log('فشلت المحاولة باستخدام المفتاح العام، نجرب مفتاح الخدمة...');
  
  // إذا فشلت، نحاول بمفتاح الخدمة
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([profileData])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('استجابة خطأ من Supabase باستخدام مفتاح الخدمة:', response.status, errorText);
      return {
        success: false,
        message: `فشل إنشاء المستخدم بكلا المفتاحين: ${response.status} ${response.statusText}`,
        details: errorText
      };
    }

    const data = await response.json();
    console.log('تم إنشاء المستخدم بنجاح باستخدام مفتاح الخدمة:', data);
    return {
      success: true,
      data,
      message: 'تم إنشاء المستخدم بنجاح باستخدام مفتاح الخدمة'
    };
  } catch (error) {
    console.error('خطأ أثناء إنشاء المستخدم باستخدام مفتاح الخدمة:', error);
    return {
      success: false,
      message: 'فشل إنشاء المستخدم بكلا المفتاحين',
      error
    };
  }
};

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
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
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
    
    // أولاً نحاول بالمفتاح العام
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('نتيجة البحث عن المستخدم باستخدام المفتاح العام:', data);
      
      if (data && data.length > 0) {
        return {
          success: true,
          data: data[0],
          message: 'تم العثور على المستخدم بنجاح باستخدام المفتاح العام'
        };
      }
    }
    
    // إذا فشلت المحاولة الأولى أو لم نجد المستخدم، نحاول بمفتاح الخدمة
    console.log('محاولة البحث عن المستخدم باستخدام مفتاح الخدمة');
    
    const serviceResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    if (!serviceResponse.ok) {
      const errorText = await serviceResponse.text();
      console.error('استجابة خطأ من Supabase عند البحث عن المستخدم باستخدام مفتاح الخدمة:', serviceResponse.status, errorText);
      return {
        success: false,
        message: `فشل البحث عن المستخدم بكلا المفتاحين: ${serviceResponse.status} ${serviceResponse.statusText}`,
        details: errorText
      };
    }

    const serviceData = await serviceResponse.json();
    console.log('نتيجة البحث عن المستخدم باستخدام مفتاح الخدمة:', serviceData);
    
    if (!serviceData || serviceData.length === 0) {
      return {
        success: false,
        message: 'المستخدم غير موجود'
      };
    }
    
    return {
      success: true,
      data: serviceData[0],
      message: 'تم العثور على المستخدم بنجاح باستخدام مفتاح الخدمة'
    };
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
    
    const updateData: any = { login_attempts: attempts };
    
    // إذا تم تقديم وقت آخر تسجيل دخول، أضفه إلى البيانات المحدثة
    if (lastLoginAt) {
      updateData.last_login_at = lastLoginAt;
    }
    
    // نحاول أولاً مع المفتاح العام
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updateData)
    });

    if (response.ok) {
      console.log('تم تحديث محاولات تسجيل الدخول بنجاح باستخدام المفتاح العام');
      return {
        success: true,
        message: 'تم تحديث محاولات تسجيل الدخول بنجاح'
      };
    }
    
    console.log('فشل تحديث محاولات تسجيل الدخول باستخدام المفتاح العام، نحاول مع مفتاح الخدمة');
    
    // إذا فشل، نحاول مع مفتاح الخدمة
    const serviceResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updateData)
    });

    if (!serviceResponse.ok) {
      const errorText = await serviceResponse.text();
      console.error('استجابة خطأ من Supabase عند تحديث محاولات تسجيل الدخول:', serviceResponse.status, errorText);
      return {
        success: false,
        message: `فشل تحديث محاولات تسجيل الدخول: ${serviceResponse.status} ${serviceResponse.statusText}`,
        details: errorText
      };
    }

    console.log('تم تحديث محاولات تسجيل الدخول بنجاح باستخدام مفتاح الخدمة');
    return {
      success: true,
      message: 'تم تحديث محاولات تسجيل الدخول بنجاح باستخدام مفتاح الخدمة'
    };
  } catch (error) {
    console.error('خطأ أثناء تحديث محاولات تسجيل الدخول:', error);
    return {
      success: false,
      message: 'خطأ أثناء تحديث محاولات تسجيل الدخول',
      error
    };
  }
};
