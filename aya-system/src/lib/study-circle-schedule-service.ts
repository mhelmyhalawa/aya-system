// خدمة قاعدة بيانات Supabase لإدارة جدولة الحلقات الدراسية
import { supabase } from './supabase-client';
import { StudyCircleSchedule, StudyCircleScheduleCreate, StudyCircleScheduleUpdate } from '@/types/study-circle-schedule';

const SCHEDULE_TABLE = 'study_circle_schedules';

/**
 * استرجاع جدولة الحلقة الدراسية
 */
export const getStudyCircleSchedules = async (circleId: string): Promise<StudyCircleSchedule[]> => {
  try {
    const { data, error } = await supabase
      .from(SCHEDULE_TABLE)
      .select('*')
      .eq('study_circle_id', circleId)
      .order('weekday')
      .order('start_time');
    
    if (error) {
      console.error('خطأ في استرجاع جدولة الحلقة الدراسية:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('خطأ في استرجاع جدولة الحلقة الدراسية:', error);
    return [];
  }
};

/**
 * إنشاء جدولة جديدة للحلقة الدراسية
 */
export const createStudyCircleSchedule = async (_schedule: StudyCircleScheduleCreate): Promise<{ success: boolean, id?: string, message?: string }> => {
  console.warn('createStudyCircleSchedule: عملية غير مسموحة من الواجهة بدون Backend');
  return { success: false, message: 'عملية غير مسموحة من الواجهة' };
};

/**
 * تحديث جدولة حلقة دراسية
 */
export const updateStudyCircleSchedule = async (_schedule: StudyCircleScheduleUpdate): Promise<{ success: boolean, message?: string }> => {
  console.warn('updateStudyCircleSchedule: عملية غير مسموحة من الواجهة بدون Backend');
  return { success: false, message: 'عملية غير مسموحة من الواجهة' };
};

/**
 * حذف جدولة حلقة دراسية
 */
export const deleteStudyCircleSchedule = async (_id: string): Promise<{ success: boolean, message?: string }> => {
  console.warn('deleteStudyCircleSchedule: عملية غير مسموحة من الواجهة بدون Backend');
  return { success: false, message: 'عملية غير مسموحة من الواجهة' };
};
