// خدمة قاعدة بيانات Supabase لإدارة الملفات الشخصية
// توفر واجهة للتعامل مع جدول profiles

import { supabase, PROFILES_TABLE, setUserJWTToken } from './supabase-client';
import { 
  createProfileDirectly, 
  updateProfileDirectly, 
  createProfileWithFallback,
  updateProfileWithFallback,
  findUserByUsernameDirectly,
  updateLoginAttemptsDirectly
} from './direct-supabase-api';
import * as supabaseREST from './supabase-rest';
import * as authService from './auth-service'; // الآن المصادقة مخصصة فقط بدون supabase.auth
import type { Profile, ProfileCreate, ProfileUpdate, LoginCredentials } from '@/types/profile';
import { mapProfileToSupabase, mapSupabaseToProfile, mapSupabaseResultsToProfiles } from './supabase-mapper';
import { hashPassword, comparePassword } from './auth-utils';

/**
 * الحصول على الملف الشخصي بواسطة المعرف
 */
export const getProfileById = async (id: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('خطأ في استرجاع الملف الشخصي:', error);
      return null;
    }
    
    return data ? mapSupabaseToProfile(data) : null;
  } catch (error) {
    console.error('خطأ في استرجاع الملف الشخصي:', error);
    return null;
  }
};

/**
 * الحصول على الملف الشخصي بواسطة اسم المستخدم
 */
export const getProfileByUsername = async (username: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      console.error('خطأ في استرجاع الملف الشخصي بواسطة اسم المستخدم:', error);
      return null;
    }
    
    return data ? mapSupabaseToProfile(data) : null;
  } catch (error) {
    console.error('خطأ في استرجاع الملف الشخصي بواسطة اسم المستخدم:', error);
    return null;
  }
};

/**
 * استرجاع جميع الملفات الشخصية
 */
export const getAllProfiles = async (): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*');
    
    if (error) {
      console.error('خطأ في استرجاع الملفات الشخصية:', error);
      return [];
    }
    
    return mapSupabaseResultsToProfiles(data || []);
  } catch (error) {
    console.error('خطأ في استرجاع الملفات الشخصية:', error);
    return [];
  }
};

/**
 * إنشاء ملف شخصي جديد باستخدام كلمة مرور مشفرة مسبقًا
 * هذه الوظيفة مخصصة للاستخدام مع المستخدمين النظام مثل المسؤول الرئيسي
 */
export const createProfileWithHashedPassword = async (
  profile: Omit<Profile, 'created_at' | 'login_attempts' | 'last_login_at'> & { id?: string }
): Promise<{ success: boolean, id?: string, message?: string }> => {
  try {
    // إنشاء كائن جديد للملف الشخصي - يستخدم كلمة المرور المشفرة مباشرة
    const newProfile: any = {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      username: profile.username,
      password_hash: profile.password_hash,
      login_attempts: 0
    };
    
    console.warn('createProfileWithHashedPassword: لم يعد مسموحًا بإنشاء سجل محمي من الواجهة بدون backend');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ في إنشاء الملف الشخصي باستخدام كلمة مرور مشفرة:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء الملف الشخصي'
    };
  }
};

/**
 * إنشاء ملف شخصي جديد
 */
export const createProfile = async (profile: ProfileCreate): Promise<{ success: boolean, id?: string, message?: string }> => {
  try {
    // تشفير كلمة المرور
    const password_hash = await hashPassword(profile.password);
    
    // إنشاء كائن جديد للملف الشخصي
    const newProfile: any = {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      username: profile.username,
      password_hash,
      login_attempts: 0
    };
    
    console.log('محاولة إضافة مستخدم جديد باستخدام REST API');
    console.log('بيانات المستخدم:', JSON.stringify(newProfile));
    
    // استخدام واجهة REST API مباشرة
    const result = await supabaseREST.createProfile(newProfile);
    
    if (!result.success) {
      console.error('فشل في إنشاء الملف الشخصي:', result.error);
      
      if (result.error?.includes('duplicate key value violates unique constraint')) {
        return {
          success: false,
          message: 'اسم المستخدم موجود بالفعل. يرجى اختيار اسم مستخدم آخر.'
        };
      }
      
      return {
        success: false,
        message: 'فشل في إنشاء الملف الشخصي: ' + result.error
      };
    }
    
    const userId = (result as any).data && (result as any).data[0] ? (result as any).data[0].id : profile.id;
    // في الوضع المخصص لا حاجة لتسجيل في نظام Auth منفصل
    
    return {
      success: true,
      id: userId,
      message: 'تم إنشاء الملف الشخصي بنجاح'
    };
  } catch (error) {
    console.error('خطأ في إنشاء الملف الشخصي:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء الملف الشخصي'
    };
  }
};

/**
 * تحديث ملف شخصي
 */
export const updateProfile = async (profile: ProfileUpdate): Promise<{ success: boolean, message?: string }> => {
  try {
    const updateData: any = { ...profile };
    
    // إذا تم توفير كلمة مرور جديدة، قم بتشفيرها
    if (profile.password) {
      updateData.password_hash = await hashPassword(profile.password);
      delete updateData.password;
    }
    
    // استخدام واجهة REST API المباشرة
    console.log('تحديث ملف المستخدم باستخدام REST API');
    const result = await supabaseREST.updateProfile(profile.id, updateData);
    
    if (!result.success) {
      console.error('فشل في تحديث الملف الشخصي:', result.error);
      
      if (result.error?.includes('duplicate key value violates unique constraint')) {
        return {
          success: false,
          message: 'اسم المستخدم موجود بالفعل. يرجى اختيار اسم مستخدم آخر.'
        };
      }
      
      return {
        success: false,
        message: 'فشل في تحديث الملف الشخصي: ' + result.error
      };
    }
    
    return {
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تحديث الملف الشخصي:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث الملف الشخصي'
    };
  }
};

/**
 * الحصول على المعلمين فقط
 */
export const getteachers = async (): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .or('role.eq.teacher,role.eq.admin');
    
    if (error) {
      console.error('خطأ في استرجاع المعلمين:', error);
      return [];
    }
    
    return mapSupabaseResultsToProfiles(data || []);
  } catch (error) {
    console.error('خطأ في استرجاع المعلمين:', error);
    return [];
  }
};

/**
 * الحصول على المعلمين فقط
 */
export const getteachersForManagement = async (): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .or('role.eq.teacher,role.is.null');
    
    if (error) {
      console.error('خطأ في استرجاع المعلمين:', error);
      return [];
    }
    
    return mapSupabaseResultsToProfiles(data || []);
  } catch (error) {
    console.error('خطأ في استرجاع المعلمين:', error);
    return [];
  }
};

/**
 * الحصول على المسؤولين فقط
 */
export const getAdmins = async (): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('role', 'admin');
    
    if (error) {
      console.error('خطأ في استرجاع المسؤولين:', error);
      return [];
    }
    
    return mapSupabaseResultsToProfiles(data || []);
  } catch (error) {
    console.error('خطأ في استرجاع المسؤولين:', error);
    return [];
  }
};

/**
 * تسجيل الدخول باستخدام اسم المستخدم وكلمة المرور
 */
export const login = async (credentials: LoginCredentials): Promise<{ success: boolean, user?: Profile, message?: string, token?: string }> => {
  try {
    console.log('محاولة تسجيل الدخول باستخدام:', { username: credentials.username });
    
    // التحقق من حالة المصادقة الحالية
    const authStatus = await authService.checkAuthStatus();
    if (authStatus.success && authStatus.isAuthenticated) {
      console.log('المستخدم مسجل الدخول بالفعل. إجراء تسجيل الخروج...');
      await authService.signOut();
    }
    
    // الوضع المخصص: تخطي أي محاولة لـ supabase.auth مباشرة
    console.log('الوضع المخصص: البحث عن المستخدم في profiles...');
    
    // البحث عن المستخدم باستخدام REST API - استخدام apikey_only لشاشة الدخول
    const result = await supabaseREST.findProfileByUsername(credentials.username);
    
  if (!(result as any).success || !(result as any).data) {
      console.error('خطأ في العثور على المستخدم:', result.error);
      return {
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
      };
    }
    
  const userData = (result as any).data;
    
    console.log('تم العثور على المستخدم:', { 
      id: userData.id, 
      username: userData.username, 
      role: userData.role
    });
    
    // تسجيل الدخول باستخدام خدمة المصادقة المخصصة للحصول على JWT token
  const authResult = await authService.signInCustomUser(userData, credentials.password);
    
    if (!authResult.success) {
      // زيادة عداد محاولات تسجيل الدخول الفاشلة - استخدام apikey_only لشاشة الدخول
      const loginAttempts = (userData.login_attempts || 0) + 1;
      await supabaseREST.updateLoginAttempts(userData.id, loginAttempts);
      
      return {
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
      };
    }
    
    // في حال نجاح المصادقة، تخزين الـ token أولاً لاستخدامه في التحديثات
    if (authResult.token) {
      setUserJWTToken(authResult.token);
    }
    
    // تحديث محاولات تسجيل الدخول ووقت آخر تسجيل دخول - الآن يمكن استخدام JWT token
    const lastLoginAt = new Date().toISOString();
    await supabaseREST.updateLoginAttempts(userData.id, 0, lastLoginAt);
    
    // تحويل البيانات إلى نموذج Profile
    const user = mapSupabaseToProfile(userData);
    
    return {
      success: true,
      user,
      token: authResult.token,
      message: 'تم تسجيل الدخول بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    };
  }
};

/**
 * تغيير كلمة المرور
 */
export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean, message?: string }> => {
  try {
    // الحصول على ملف المستخدم
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      console.error('خطأ في العثور على المستخدم:', error);
      return {
        success: false,
        message: 'المستخدم غير موجود'
      };
    }
    
    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await comparePassword(currentPassword, data.password_hash);
    
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      };
    }
    
    // تشفير كلمة المرور الجديدة وتحديثها
    const password_hash = await hashPassword(newPassword);
    
    console.warn('changePassword: تحديث كلمة المرور يتطلب Backend أو RLS مناسب. العملية مرفوضة من الواجهة');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ في تغيير كلمة المرور:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تغيير كلمة المرور'
    };
  }
};

/**
 * تغيير كلمة مرور المستخدم من قبل المسؤول (بدون الحاجة إلى كلمة المرور الحالية)
 */
export const adminChangePassword = async (userId: string, newPassword: string): Promise<{ success: boolean, message?: string }> => {
  try {
    // تشفير كلمة المرور الجديدة
    const password_hash = await hashPassword(newPassword);
    
    // تحديث كلمة المرور
    console.warn('adminChangePassword: تغيير كلمة المرور يتطلب Backend. العملية مرفوضة من الواجهة');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ في تغيير كلمة المرور:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تغيير كلمة المرور'
    };
  }
};

/**
 * حذف ملف شخصي بواسطة المعرف
 */
export const deleteProfile = async (id: string): Promise<{ success: boolean, message?: string }> => {
  try {
    // حذف المستخدم من نظام Supabase
    console.warn('deleteProfile: حذف الملف الشخصي يتطلب Backend. العملية مرفوضة من الواجهة');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ في حذف الملف الشخصي:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف الملف الشخصي'
    };
  }
};

/**
 * الحصول على المعلمين الرئيسيين (superadmins) فقط
 */
export const getSuperAdmins = async (): Promise<Profile[]> => {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('role', 'superadmin');
    
    if (error) {
      console.error('خطأ في استرجاع المعلمين الرئيسيين:', error);
      return [];
    }
    
    return mapSupabaseResultsToProfiles(data || []);
  } catch (error) {
    console.error('خطأ في استرجاع المعلمين الرئيسيين:', error);
    return [];
  }
};
