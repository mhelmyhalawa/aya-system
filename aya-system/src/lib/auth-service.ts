/**
 * وظائف المصادقة في Supabase
 * مسؤولة عن التعامل مع JWT token والمستخدمين
 */

import { supabase, setUserJWTToken, SUPABASE_SERVICE_KEY } from './supabase-client';
import { comparePassword } from './auth-utils';

// تخزين المستخدم الحالي
let currentUser = null;

/**
 * إنشاء بريد إلكتروني وهمي للمستخدم للاستخدام مع نظام المصادقة المدمج في Supabase
 */
const createEmailFromUsername = (username: string) => {
  return `${username.toLowerCase()}@kotama.example.com`;
};

/**
 * تسجيل الدخول بواسطة اسم المستخدم باستخدام نظام المصادقة المدمج في Supabase
 */
export const signInWithUsername = async (username: string, password: string) => {
  try {
    // إنشاء بريد إلكتروني وهمي للمستخدم للاستخدام مع نظام المصادقة المدمج في Supabase
    const email = createEmailFromUsername(username);
    
    console.log('محاولة تسجيل الدخول باستخدام البريد الوهمي:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      // تحقق إذا كان الخطأ هو أن المستخدم غير موجود، في هذه الحالة لا نظهر رسالة خطأ
      if (error.message.includes('Invalid login credentials')) {
        console.log('لم يتم العثور على المستخدم في نظام المصادقة المدمج');
        return { success: false, error: { message: 'المستخدم غير مسجل في نظام المصادقة' } };
      }
      
      console.error('خطأ في تسجيل الدخول:', error.message);
      return { success: false, error };
    }
    
    // حفظ JWT token وبيانات المستخدم
    console.log('تم تسجيل الدخول بنجاح باستخدام نظام المصادقة المدمج');
    setUserJWTToken(data.session.access_token);
    currentUser = data.user;
    
    return { success: true, user: data.user, token: data.session.access_token };
  } catch (error) {
    console.error('خطأ غير متوقع في تسجيل الدخول:', error);
    return { success: false, error: { message: 'حدث خطأ غير متوقع أثناء تسجيل الدخول' } };
  }
};

/**
 * تسجيل الدخول والحصول على JWT token
 * @param email البريد الإلكتروني أو اسم المستخدم
 * @param password كلمة المرور
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('خطأ في تسجيل الدخول:', error.message);
      return { success: false, error };
    }
    
    // حفظ JWT token وبيانات المستخدم
    setUserJWTToken(data.session.access_token);
    currentUser = data.user;
    
    return { success: true, user: data.user, token: data.session.access_token };
  } catch (error) {
    console.error('خطأ غير متوقع في تسجيل الدخول:', error);
    return { success: false, error };
  }
};

/**
 * تسجيل الدخول باستخدام اسم المستخدم وكلمة المرور من الجدول المخصص
 * هذه الوظيفة تستخدم عندما لا يتم استخدام نظام المصادقة المدمج في Supabase
 * @param profileData بيانات المستخدم (من جدول profiles)
 * @param password كلمة المرور
 */
export const signInCustomUser = async (profileData: any, password: string) => {
  try {
    console.log('محاولة تسجيل الدخول للمستخدم المخصص:', {
      id: profileData.id,
      username: profileData.username,
      role: profileData.role
    });
    
    if (!profileData.password_hash) {
      console.error('لا توجد كلمة مرور مشفرة للمستخدم!');
      return { success: false, error: { message: 'بيانات المستخدم غير صالحة' } };
    }
    
    // التحقق من كلمة المرور
    console.log('التحقق من كلمة المرور...');
    console.log('password_hash المخزنة:', profileData.password_hash.substring(0, 20) + '...');
    
    try {
      const isPasswordValid = await comparePassword(password, profileData.password_hash);
      console.log('نتيجة التحقق من كلمة المرور:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.error('فشل التحقق من كلمة المرور');
        return { success: false, error: { message: 'كلمة المرور غير صحيحة' } };
      }
    } catch (passwordError) {
      console.error('حدث خطأ أثناء التحقق من كلمة المرور:', passwordError);
      // نجرب الطريقة المباشرة للتحقق من كلمة المرور (للتوافق مع الأنظمة القديمة)
      if (password !== profileData.password_hash) {
        return { success: false, error: { message: 'كلمة المرور غير صحيحة' } };
      }
      console.log('تم التحقق من كلمة المرور بالطريقة المباشرة');
    }
    
    // محاولة تسجيل الدخول باستخدام نظام المصادقة المدمج
    console.log('محاولة تسجيل الدخول باستخدام نظام المصادقة المدمج...');
    const authResult = await signInWithUsername(profileData.username, password);
    
    if (authResult.success) {
      console.log('نجاح تسجيل الدخول باستخدام نظام المصادقة المدمج');
      return {
        success: true,
        user: profileData,
        token: authResult.token
      };
    }
    
    // إذا فشل تسجيل الدخول، نحاول تسجيل المستخدم في نظام المصادقة المدمج
    console.log('فشل تسجيل الدخول باستخدام نظام المصادقة المدمج، محاولة تسجيل المستخدم...');
    const registerResult = await registerCustomUserInAuth(profileData, password);
    
    if (registerResult.success && registerResult.session) {
      console.log('تم تسجيل المستخدم بنجاح في نظام المصادقة المدمج والحصول على token');
      const token = registerResult.session.access_token;
      setUserJWTToken(token);
      return {
        success: true,
        user: profileData,
        token
      };
    }
    
    // الحصول على JWT token باستخدام مفتاح الخدمة
    // هذا يحتاج إلى واجهة خلفية (backend) لإنشاء JWT tokens للمستخدمين المخصصين
    // هنا نستخدم anonymous jwt token مؤقتاً
    console.log('محاولة الحصول على JWT token من الجلسة الحالية...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('خطأ في الحصول على الجلسة:', error.message);
    }
    
    const token = data?.session?.access_token;
    
    if (token) {
      console.log('تم العثور على JWT token في الجلسة الحالية');
      setUserJWTToken(token);
      return { success: true, user: profileData, token };
    }
    
    console.log('لم يتم العثور على JWT token في الجلسة الحالية، محاولة تسجيل الدخول المجهول...');
    
    // إذا لم نتمكن من الحصول على token، نستخدم طريقة أخرى
    // هذه طريقة مؤقتة ولا ينصح بها في الإنتاج
    const anonymousAuth = await supabase.auth.signInAnonymously();
    
    if (anonymousAuth.error) {
      console.error('خطأ في تسجيل الدخول المجهول:', anonymousAuth.error.message);
      
      // محاولة أخيرة: إنشاء token مخصص باستخدام مفتاح الخدمة
      console.log('محاولة إنشاء token مخصص باستخدام مفتاح الخدمة...');
      
      try {
        // استخدام service key كبديل عن jwt token
        // هذه طريقة مؤقتة فقط ولا ينصح بها في الإنتاج
        const serviceKey = SUPABASE_SERVICE_KEY;
        setUserJWTToken(serviceKey);
        
        console.log('تم إنشاء token بديل باستخدام مفتاح الخدمة');
        return { success: true, user: profileData, token: serviceKey };
      } catch (serviceError) {
        console.error('فشل إنشاء token بديل:', serviceError);
        return { success: false, error: anonymousAuth.error };
      }
    }
    
    const anonymousToken = anonymousAuth.data.session.access_token;
    console.log('تم الحصول على token مجهول بنجاح');
    setUserJWTToken(anonymousToken);
    
    return { success: true, user: profileData, token: anonymousToken };
  } catch (error) {
    console.error('خطأ غير متوقع في تسجيل الدخول المخصص:', error);
    return { success: false, error };
  }
};

/**
 * تسجيل المستخدم المخصص في نظام المصادقة المدمج في Supabase
 * يستخدم هذا لإنشاء مستخدم في نظام المصادقة المدمج بناءً على المستخدم المخصص
 */
export const registerCustomUserInAuth = async (profileData: any, password: string) => {
  try {
    const email = createEmailFromUsername(profileData.username);
    
    console.log('تسجيل المستخدم المخصص في نظام المصادقة المدمج:', {
      email,
      username: profileData.username
    });
    
    // التحقق أولاً مما إذا كان المستخدم موجودًا بالفعل - لتجنب التسجيل المزدوج
    try {
      const { data: existingUser, error: existingError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (existingUser && existingUser.session) {
        console.log('المستخدم موجود بالفعل في نظام المصادقة المدمج، تسجيل الدخول مباشرة');
        setUserJWTToken(existingUser.session.access_token);
        return { success: true, session: existingUser.session, user: existingUser.user };
      }
    } catch (existingError) {
      console.log('فشل التحقق من وجود المستخدم في نظام المصادقة المدمج:', existingError);
      // نستمر لمحاولة تسجيل المستخدم
    }
    
    // محاولة تسجيل المستخدم في نظام المصادقة المدمج
    console.log('محاولة تسجيل المستخدم في نظام المصادقة المدمج...');
    console.log('البيانات المستخدمة للتسجيل:', {
      email,
      hasPassword: !!password,
      metaData: {
        full_name: profileData.full_name,
        role: profileData.role,
        username: profileData.username,
        custom_profile_id: profileData.id
      }
    });
    
    // تسجيل المستخدم في نظام المصادقة المدمج
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: profileData.full_name,
          role: profileData.role,
          username: profileData.username,
          custom_profile_id: profileData.id
        }
      }
    });
    
    if (error) {
      console.error('خطأ في تسجيل المستخدم في نظام المصادقة المدمج:', error.message);
      return { success: false, error };
    }
    
    console.log('تم تسجيل المستخدم بنجاح في نظام المصادقة المدمج:', {
      userId: data.user?.id,
      email: data.user?.email
    });
    
    return { success: true, user: data.user, session: data.session };
  } catch (error) {
    console.error('خطأ غير متوقع في تسجيل المستخدم:', error);
    return { success: false, error };
  }
};

/**
 * تسجيل الخروج
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('خطأ في تسجيل الخروج:', error.message);
    return { success: false, error };
  }
  
  // إعادة تعيين JWT token وبيانات المستخدم
  setUserJWTToken(null);
  currentUser = null;
  
  return { success: true };
};

/**
 * التحقق من حالة المصادقة الحالية
 * يمكن استخدام هذه الوظيفة للتحقق مما إذا كان المستخدم مسجل الدخول
 */
export const checkAuthStatus = async () => {
  try {
    console.log('التحقق من حالة المصادقة الحالية...');
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('خطأ في الحصول على الجلسة:', error.message);
      return { success: false, error };
    }
    
    if (data?.session) {
      console.log('المستخدم مسجل الدخول، الجلسة موجودة:', {
        userId: data.session.user.id,
        expires: new Date(data.session.expires_at * 1000).toISOString()
      });
      
      // تحديث JWT token
      setUserJWTToken(data.session.access_token);
      
      return { 
        success: true, 
        isAuthenticated: true, 
        user: data.session.user,
        token: data.session.access_token 
      };
    }
    
    console.log('المستخدم غير مسجل الدخول، لا توجد جلسة');
    return { success: true, isAuthenticated: false };
  } catch (error) {
    console.error('خطأ غير متوقع في التحقق من حالة المصادقة:', error);
    return { success: false, error };
  }
};

/**
 * الحصول على المستخدم الحالي
 */
export const getCurrentUser = () => currentUser;

/**
 * التحقق من حالة جلسة المستخدم
 */
export const checkSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('خطأ في التحقق من الجلسة:', error.message);
    return { success: false, error };
  }
  
  if (data.session) {
    currentUser = data.session.user;
    setUserJWTToken(data.session.access_token);
    
    return { success: true, user: data.session.user, token: data.session.access_token };
  }
  
  return { success: false, message: 'لا توجد جلسة نشطة' };
};

/**
 * حذف مستخدم من نظام المصادقة المدمج في Supabase
 */
export const deleteUser = async (userId: string): Promise<{ success: boolean, message?: string }> => {
  try {
    // يتطلب استخدام مفتاح الخدمة لحذف المستخدم
    const adminAuthClient = supabase.auth.admin;
    
    if (!adminAuthClient) {
      return { 
        success: false, 
        message: 'لا تتوفر صلاحيات مدير لحذف المستخدم'
      };
    }
    
    const { error } = await adminAuthClient.deleteUser(userId);
    
    if (error) {
      console.error('خطأ في حذف المستخدم من نظام المصادقة:', error);
      return { 
        success: false, 
        message: `فشل في حذف المستخدم: ${error.message}`
      };
    }
    
    return { 
      success: true, 
      message: 'تم حذف المستخدم بنجاح' 
    };
  } catch (error) {
    console.error('خطأ غير متوقع في حذف المستخدم:', error);
    return { 
      success: false, 
      message: 'حدث خطأ أثناء محاولة حذف المستخدم' 
    };
  }
};
