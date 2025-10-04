/**
 * خدمة مصادقة مخصصة (بدون استخدام supabase.auth.signUp أو signIn)
 * تعتمد فقط على جدول profiles المخزن فيه password_hash
 *
 * المبدأ:
 *  - البحث عن المستخدم (تنفذه الخدمات الأخرى قبل الاستدعاء هنا)
 *  - التحقق من كلمة المرور عبر bcrypt
 *  - إنشاء "رمز جلسة" محلي (pseudo token) وتخزينه في localStorage
 *  - استخدام هذا الرمز فقط كمؤشر على أن المستخدم تم التحقق منه
 *  - لا يتم طلب أو استخدام أي وظائف من supabase.auth.* هنا
 */

import { comparePassword } from './auth-utils';
import { setUserJWTToken, clearUserJWTToken, getUserJWTToken } from './supabase-client';

// حالة المستخدم الحالية (بسيطة)
let currentUser: any = null;

/**
 * إنشاء رمز جلسة بسيط آمن نسبياً (ليس JWT حقيقي) - يمكن استبداله لاحقاً بـ Backend
 */
function generatePseudoToken(user: { id: string; username: string; role?: string }) {
  const raw = JSON.stringify({
    sub: user.id,
    username: user.username,
    role: user.role,
    iat: Date.now(),
    rnd: Math.random().toString(36).slice(2)
  });
  return btoa(unescape(encodeURIComponent(raw)));
}

/**
 * تسجيل الدخول باستخدام بيانات ملف profile (تم جلبها مسبقاً) + كلمة المرور
 * @param profileData سجل المستخدم من profiles
 * @param password كلمة المرور المدخلة
 */
export async function signInCustomUser(profileData: any, password: string) {
  try {
    if (!profileData) {
      return { success: false, error: { message: 'لا توجد بيانات مستخدم' } };
    }
    if (!profileData.password_hash) {
      return { success: false, error: { message: 'كلمة المرور غير متوفرة' } };
    }

    // التحقق من كلمة المرور (محاولة bcrypt أولاً)
    let isValid = false;
    try {
      isValid = await comparePassword(password, profileData.password_hash);
    } catch (e) {
      // توافق قديم: إذا كانت كلمة المرور مخزنة كنص عادي (وهو غير مرغوب)
      isValid = password === profileData.password_hash;
    }

    if (!isValid) {
      return { success: false, error: { message: 'اسم المستخدم أو كلمة المرور غير صحيحة' } };
    }

    // إنشاء رمز الجلسة المحلي وتخزينه
    const token = generatePseudoToken({ id: profileData.id, username: profileData.username, role: profileData.role });
    setUserJWTToken(token); // نعيد استخدام نفس آلية التخزين
    currentUser = {
      id: profileData.id,
      username: profileData.username,
      full_name: profileData.full_name,
      role: profileData.role
    };

    return { success: true, user: currentUser, token };
  } catch (error) {
    console.error('signInCustomUser unexpected error:', error);
    return { success: false, error: { message: 'خطأ غير متوقع أثناء تسجيل الدخول' } };
  }
}

/**
 * حالة المصادقة الحالية
 */
export async function checkAuthStatus() {
  const token = getUserJWTToken();
  if (token && currentUser) {
    return { success: true, isAuthenticated: true, user: currentUser, token };
  }
  if (token && !currentUser) {
    // محاولة استخراج بيانات مبسطة من الـ token
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(token))));
      currentUser = { id: decoded.sub, username: decoded.username, role: decoded.role };
      return { success: true, isAuthenticated: true, user: currentUser, token };
    } catch {
      // فشل فك التشفير
      clearUserJWTToken();
    }
  }
  return { success: true, isAuthenticated: false };
}

/**
 * تسجيل الخروج (مسح الرمز المحلي فقط)
 */
export async function signOut() {
  clearUserJWTToken();
  currentUser = null;
  return { success: true };
}

/**
 * دوال قديمة تعتمد على Supabase Auth تم إزالتها. تركنا واجهات فارغة لإرجاع أخطاء إن استدعت من مكان قديم.
 */
export async function signInWithUsername() { return { success: false, error: { message: 'تم إلغاء اعتماد Supabase Auth' } }; }
export async function signInWithEmail() { return { success: false, error: { message: 'تم إلغاء اعتماد Supabase Auth' } }; }
export async function registerCustomUserInAuth() { return { success: false, error: { message: 'تم إلغاء اعتماد Supabase Auth' } }; }
export async function deleteUser() { return { success: false, message: 'غير مدعوم في الوضع المخصص' }; }
export async function checkSession() { return checkAuthStatus(); }

export default {
  signInCustomUser,
  checkAuthStatus,
  signOut
};
