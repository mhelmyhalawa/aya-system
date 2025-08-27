// src/lib/auth-permissions.ts
// إدارة صلاحيات المستخدمين حسب أدوارهم

import { UserRole } from '@/types/profile';

// تحديد الصفحات المتاحة لكل دور
const pagePermissions: Record<UserRole, string[]> = {
  // المسؤول الرئيسي: لديه كل الصلاحيات
  superadmin: [
    'dashboard',
    'profiles',
    'profile-create',
    'profile-edit',
    'guardians',
    'guardian-create',
    'guardian-edit',
    'students',
    'student-create',
    'student-edit',
    'sessions',
    'session-create',
    'session-edit',
    'daily-followups',
    'monthly-exams',
    'reports',
    'settings'
  ],
  
  // المسؤول: لديه صلاحيات إدارة التطبيق فقط
  admin: [
    'dashboard',
    'profiles',
    'profile-create',
    'profile-edit',
    'guardians',
    'guardian-create',
    'guardian-edit',
    'students',
    'student-create',
    'student-edit',
    'reports',
    'settings'
  ],
  
  // المعلم: لديه صلاحيات محدودة
  teacher: [
    'dashboard',
    'students',
    'sessions',
    'session-create',
    'session-edit',
    'daily-followups',
    'monthly-exams'
  ]
};

// تحديد العمليات المتاحة لكل دور
const actionPermissions: Record<UserRole, string[]> = {
  // المسؤول الرئيسي: لديه كل الصلاحيات
  superadmin: [
    'profile-create',
    'profile-edit',
    'profile-delete',
    'guardian-create',
    'guardian-edit',
    'guardian-delete',
    'student-create',
    'student-edit',
    'student-delete',
    'session-create',
    'session-edit',
    'session-delete',
    'followup-create',
    'followup-edit',
    'followup-delete',
    'exam-create',
    'exam-edit',
    'exam-delete',
    'report-view',
    'report-export',
    'settings-edit'
  ],
  
  // المسؤول: لديه صلاحيات أقل
  admin: [
    'profile-create',
    'profile-edit',
    'guardian-create',
    'guardian-edit',
    'student-create',
    'student-edit',
    'report-view',
    'report-export',
    'settings-edit'
  ],
  
  // المعلم: لديه صلاحيات محدودة جدًا
  teacher: [
    'student-view',
    'session-create',
    'session-edit',
    'followup-create',
    'followup-edit',
    'exam-create',
    'exam-edit',
    'report-view'
  ]
};

/**
 * التحقق من صلاحية المستخدم للوصول إلى صفحة
 */
export const canAccessPage = (userRole: UserRole, pageName: string): boolean => {
  // التحقق من وجود الدور
  if (!pagePermissions[userRole]) {
    return false;
  }
  
  // التحقق من صلاحية الوصول إلى الصفحة
  return pagePermissions[userRole].includes(pageName);
};

/**
 * التحقق من صلاحية المستخدم لتنفيذ عملية
 */
export const canPerformAction = (userRole: UserRole, actionName: string): boolean => {
  // التحقق من وجود الدور
  if (!actionPermissions[userRole]) {
    return false;
  }
  
  // التحقق من صلاحية تنفيذ العملية
  return actionPermissions[userRole].includes(actionName);
};

/**
 * الحصول على جميع الصفحات المتاحة للمستخدم
 */
export const getAvailablePages = (userRole: UserRole): string[] => {
  return pagePermissions[userRole] || [];
};

/**
 * الحصول على جميع العمليات المتاحة للمستخدم
 */
export const getAvailableActions = (userRole: UserRole): string[] => {
  return actionPermissions[userRole] || [];
};
