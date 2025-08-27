// خدمة قاعدة بيانات Supabase لإدارة جلسات الحلقة
// توفر واجهة للتعامل مع جدول circle_sessions

import { supabase, CIRCLE_SESSIONS_TABLE } from './supabase-client';
import { CircleSession, CircleSessionCreate, CircleSessionUpdate } from '@/types/circle-session';
import { getProfileById } from './profile-service';
import { getStudyCircleById } from './study-circle-service';

/**
 * الحصول على جلسات حلقة معينة
 */
export const getSessionsByCircleId = async (studyCircleId: string): Promise<CircleSession[]> => {
  try {
    const { data, error } = await supabase
      .from(CIRCLE_SESSIONS_TABLE)
      .select('id, study_circle_id, session_date, start_time, end_time, teacher_id, notes, created_at')
      .eq('study_circle_id', studyCircleId)
      .order('session_date', { ascending: false });
    
    if (error) {
      console.error('خطأ في جلب جلسات الحلقة:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('خطأ غير متوقع في جلب جلسات الحلقة:', error);
    return [];
  }
};

/**
 * الحصول على جلسات المعلم
 */
export const getSessionsByTeacherId = async (teacherId: string): Promise<CircleSession[]> => {
  try {
    const { data, error } = await supabase
      .from(CIRCLE_SESSIONS_TABLE)
      .select('*')
      .eq('teacher_id', teacherId)
      .order('session_date', { ascending: false });
    
    if (error) {
      console.error('خطأ في جلب جلسات المعلم:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('خطأ غير متوقع في جلب جلسات المعلم:', error);
    return [];
  }
};

/**
 * الحصول على جلسة محددة
 */
export const getSession = async (studyCircleId: string, sessionDate: string): Promise<CircleSession | null> => {
  try {
    const { data, error } = await supabase
      .from(CIRCLE_SESSIONS_TABLE)
      .select('*')
      .eq('study_circle_id', studyCircleId)
      .eq('session_date', sessionDate)
      .single();
    
    if (error) {
      console.error('خطأ في جلب جلسة الحلقة:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في جلب جلسة الحلقة:', error);
    return null;
  }
};

/**
 * إنشاء جلسة حلقة جديدة
 */
export const createSession = async (session: CircleSessionCreate): Promise<{ success: boolean, data?: CircleSession, error?: string }> => {
  try {
    // التحقق من وجود الحلقة
    const circle = await getStudyCircleById(session.study_circle_id);
    if (!circle) {
      return { success: false, error: 'الحلقة غير موجودة' };
    }
    
    // إذا لم يتم توفير معرف المعلم، استخدم معلم الحلقة
    if (!session.teacher_id && circle.teacher_id) {
      session.teacher_id = circle.teacher_id;
    }
    
    // التحقق من وجود المعلم
    if (session.teacher_id) {
      const teacher = await getProfileById(session.teacher_id);
      if (!teacher) {
        return { success: false, error: 'المعلم غير موجود' };
      }
    }
    
    const { data, error } = await supabase
      .from(CIRCLE_SESSIONS_TABLE)
      .insert([session])
      .select()
      .single();
    
    if (error) {
      console.error('خطأ في إنشاء جلسة الحلقة:', error);
      if (error.code === '23505') {
        return { success: false, error: 'توجد جلسة أخرى لهذه الحلقة في نفس اليوم' };
      }
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('خطأ غير متوقع في إنشاء جلسة الحلقة:', error);
    return { success: false, error: 'حدث خطأ غير متوقع أثناء إنشاء جلسة الحلقة' };
  }
};

/**
 * تحديث جلسة حلقة
 */
export const updateSession = async (session: CircleSessionUpdate): Promise<{ success: boolean, data?: CircleSession, error?: string }> => {
  try {
    // التحقق من وجود الجلسة
    const existingSession = await getSession(session.study_circle_id, session.session_date);
    if (!existingSession) {
      return { success: false, error: 'الجلسة غير موجودة' };
    }
    
    // إعداد البيانات للتحديث (حذف المفاتيح الرئيسية)
    const updateData = { ...session };
    delete (updateData as any).study_circle_id;
    delete (updateData as any).session_date;
    
    const { data, error } = await supabase
      .from(CIRCLE_SESSIONS_TABLE)
      .update(updateData)
      .match({
        study_circle_id: session.study_circle_id,
        session_date: session.session_date
      })
      .select()
      .single();
    
    if (error) {
      console.error('خطأ في تحديث جلسة الحلقة:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('خطأ غير متوقع في تحديث جلسة الحلقة:', error);
    return { success: false, error: 'حدث خطأ غير متوقع أثناء تحديث جلسة الحلقة' };
  }
};

/**
 * حذف جلسة حلقة
 */
export const deleteSession = async (studyCircleId: string, sessionDate: string): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase
      .from(CIRCLE_SESSIONS_TABLE)
      .delete()
      .match({
        study_circle_id: studyCircleId,
        session_date: sessionDate
      });
    
    if (error) {
      console.error('خطأ في حذف جلسة الحلقة:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('خطأ غير متوقع في حذف جلسة الحلقة:', error);
    return { success: false, error: 'حدث خطأ غير متوقع أثناء حذف جلسة الحلقة' };
  }
};
