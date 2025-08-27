// خدمة قاعدة بيانات Supabase لإدارة جدولة الحلقات الدراسية
import { supabase, supabaseAdmin } from './supabase-client';
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
export const createStudyCircleSchedule = async (schedule: StudyCircleScheduleCreate): Promise<{ success: boolean, id?: string, message?: string }> => {
  try {
    const { data, error } = await supabaseAdmin
      .from(SCHEDULE_TABLE)
      .insert([schedule])
      .select();
    
    if (error) {
      // التحقق من خطأ التكرار
      if (error.code === '23505') {
        return {
          success: false,
          message: 'هناك جدولة موجودة بالفعل في نفس اليوم والوقت لهذه الحلقة'
        };
      }
      
      console.error('خطأ في إنشاء جدولة الحلقة الدراسية:', error);
      return {
        success: false,
        message: `فشل في إنشاء الجدولة: ${error.message}`
      };
    }
    
    return {
      success: true,
      id: data && data[0] ? data[0].id : undefined,
      message: 'تم إضافة الجدولة بنجاح'
    };
  } catch (error) {
    console.error('خطأ في إنشاء جدولة الحلقة الدراسية:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إضافة الجدولة'
    };
  }
};

/**
 * تحديث جدولة حلقة دراسية
 */
export const updateStudyCircleSchedule = async (schedule: StudyCircleScheduleUpdate): Promise<{ success: boolean, message?: string }> => {
  try {

  
    const { error } = await supabaseAdmin
      .from(SCHEDULE_TABLE)
      .update(schedule)
      .eq('id', schedule.id);
    
    if (error) {
      // التحقق من خطأ التكرار
      if (error.code === '23505') {
        return {
          success: false,
          message: 'هناك جدولة موجودة بالفعل في نفس اليوم والوقت لهذه الحلقة'
        };
      }
      
      console.error('خطأ في تحديث جدولة الحلقة الدراسية:', error);
      return {
        success: false,
        message: `فشل في تحديث الجدولة: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم تحديث الجدولة بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تحديث جدولة الحلقة الدراسية:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث الجدولة'
    };
  }
};

/**
 * حذف جدولة حلقة دراسية
 */
export const deleteStudyCircleSchedule = async (id: string): Promise<{ success: boolean, message?: string }> => {
  try {
    const { error } = await supabaseAdmin
      .from(SCHEDULE_TABLE)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('خطأ في حذف جدولة الحلقة الدراسية:', error);
      return {
        success: false,
        message: `فشل في حذف الجدولة: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم حذف الجدولة بنجاح'
    };
  } catch (error) {
    console.error('خطأ في حذف جدولة الحلقة الدراسية:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف الجدولة'
    };
  }
};
