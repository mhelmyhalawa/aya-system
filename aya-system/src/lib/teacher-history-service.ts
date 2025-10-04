// خدمة قاعدة بيانات Supabase لإدارة سجل المعلمين
// توفر واجهة للتعامل مع جدول student_teacher_history

import { supabase, teacher_HISTORY_TABLE, STUDENTS_TABLE } from './supabase-client';
import type { teacherHistory, teacherHistoryCreate, teacherHistoryUpdate } from '@/types/teacher-history';
import { mapteacherHistoryToSupabase, mapSupabaseToteacherHistory, mapSupabaseResultsToteacherHistory } from './supabase-mapper';

/**
 * إضافة سجل جديد لمعلم الطالب
 */
export const addNewteacherHistory = async (
  studentId: string,
  teacherId: string,
  startDate: Date = new Date(),
  studyCircleId?: string // إضافة معرف الحلقة الدراسية
): Promise<{ success: boolean; message?: string }> => {
  try {
    const { data: latestHistory, error: fetchError } = await supabase
      .from(teacher_HISTORY_TABLE)
      .select('*')
      .eq('student_id', studentId)
      .is('end_date', null)
      .single();

    // إذا كان هناك سجل مفتوح، نقوم بإغلاقه أولاً
    if (latestHistory) {
      console.warn('إغلاق سجل معلم سابق: عملية غير مسموحة بدون Backend');
      return { success: false, message: 'عملية غير مسموحة من الواجهة' };
    }
    console.warn('إضافة سجل معلم جديد: عملية غير مسموحة بدون Backend');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ في تحديث سجل المعلم:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث سجل المعلم'
    };
  }
};

/**
 * الحصول على سجل المعلمين لطالب معين
 */
export const getteacherHistoryForStudent = async (studentId: string): Promise<teacherHistory[]> => {
  try {
    const { data, error } = await supabase
      .from(teacher_HISTORY_TABLE)
      .select(`
        *,
        study_circle:study_circle_id (
          id,
          name
        )
      `)
      .eq('student_id', studentId)
      .order('start_date', { ascending: false });
    
    if (error) {
      console.error('خطأ في استرجاع سجل المعلمين للطالب:', error);
      return [];
    }
    
    return mapSupabaseResultsToteacherHistory(data || []);
  } catch (error) {
    console.error('خطأ في استرجاع سجل المعلمين للطالب:', error);
    return [];
  }
};

/**
 * إضافة سجل معلم جديد
 */
export const addteacherHistory = async (_history: teacherHistoryCreate): Promise<{ success: boolean, id?: number, message?: string }> => {
  console.warn('addteacherHistory: عملية غير مسموحة بدون Backend');
  return { success: false, message: 'عملية غير مسموحة من الواجهة' };
};

/**
 * تحديث سجل المعلم
 */
export const updateteacherHistory = async (history: teacherHistoryUpdate): Promise<{ success: boolean, message?: string }> => {
  try {
    console.warn('updateteacherHistory: عملية غير مسموحة بدون Backend');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ في تحديث سجل المعلم:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث سجل المعلم'
    };
  }
};

/**
 * حذف سجل المعلم
 */
export const deleteteacherHistory = async (id: number): Promise<{ success: boolean, message?: string }> => {
  try {
    console.warn('deleteteacherHistory: عملية غير مسموحة بدون Backend');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
  } catch (error) {
    console.error('خطأ في حذف سجل المعلم:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف سجل المعلم'
    };
  }
};

/**
 * تغيير المعلم الحالي للطالب وتسجيل التغيير في السجل
 */
export const changeStudentteacher = async (
  studentId: string, 
  newteacherId: string, 
  startDate: string = new Date().toISOString().split('T')[0]
): Promise<{ success: boolean, message?: string }> => {
  try {
    // 1. تحديث الطالب بالمعلم الجديد
    console.warn('changeStudentteacher: تحديث معلم الطالب عملية غير مسموحة بدون Backend');
    return { success: false, message: 'عملية غير مسموحة من الواجهة' };
    
    // 2. إغلاق آخر سجل (إضافة تاريخ الانتهاء)
    const { data: prevRecords, error: prevError } = await supabase
      .from(teacher_HISTORY_TABLE)
      .select('*')
      .eq('student_id', studentId)
      .is('end_date', null)
      .limit(1);
    
    if (prevError) {
      console.error('خطأ في البحث عن السجل السابق:', prevError);
    } else if (prevRecords && prevRecords.length > 0) {
      console.warn('إغلاق سجل سابق: عملية غير مسموحة');
    }
    
    // 3. إضافة سجل جديد
    return { success: false, message: 'إضافة سجل معلم جديد محظورة من الواجهة' };
  } catch (error) {
    console.error('خطأ في تغيير معلم الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تغيير معلم الطالب'
    };
  }
};
