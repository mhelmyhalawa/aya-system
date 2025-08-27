// خدمة قاعدة بيانات Supabase لإدارة سجل المعلمين
// توفر واجهة للتعامل مع جدول student_teacher_history

import { supabase, supabaseAdmin, teacher_HISTORY_TABLE, STUDENTS_TABLE } from './supabase-client';
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
      const { error: updateError } = await supabaseAdmin
        .from(teacher_HISTORY_TABLE)
        .update({ end_date: new Date().toISOString().split('T')[0] })
        .eq('id', latestHistory.id);

      if (updateError) {
        console.error('خطأ في تحديث السجل السابق:', updateError);
        return {
          success: false,
          message: 'فشل في تحديث السجل السابق'
        };
      }
    }

    // إضافة السجل الجديد
    const { error: insertError } = await supabaseAdmin
      .from(teacher_HISTORY_TABLE)
      .insert([
        {
          student_id: studentId,
          teacher_id: teacherId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: null,
          study_circle_id: studyCircleId || null // إضافة معرف الحلقة الدراسية
        }
      ]);

    if (insertError) {
      console.error('خطأ في إضافة السجل الجديد:', insertError);
      return {
        success: false,
        message: 'فشل في إضافة السجل الجديد'
      };
    }

    return {
      success: true,
      message: 'تم تحديث سجل المعلم بنجاح'
    };
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
export const addteacherHistory = async (history: teacherHistoryCreate): Promise<{ success: boolean, id?: number, message?: string }> => {
  try {
    const formattedHistory = mapteacherHistoryToSupabase(history);
    
    const { data, error } = await supabaseAdmin
      .from(teacher_HISTORY_TABLE)
      .insert([formattedHistory])
      .select();
    
    if (error) {
      console.error('خطأ في إضافة سجل المعلم:', error);
      return {
        success: false,
        message: `فشل في إضافة سجل المعلم: ${error.message}`
      };
    }
    
    return {
      success: true,
      id: data && data[0] ? data[0].id : undefined,
      message: 'تم إضافة سجل المعلم بنجاح'
    };
  } catch (error) {
    console.error('خطأ في إضافة سجل المعلم:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إضافة سجل المعلم'
    };
  }
};

/**
 * تحديث سجل المعلم
 */
export const updateteacherHistory = async (history: teacherHistoryUpdate): Promise<{ success: boolean, message?: string }> => {
  try {
    const { error } = await supabaseAdmin
      .from(teacher_HISTORY_TABLE)
      .update(history)
      .eq('id', history.id);
    
    if (error) {
      console.error('خطأ في تحديث سجل المعلم:', error);
      return {
        success: false,
        message: `فشل في تحديث سجل المعلم: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم تحديث سجل المعلم بنجاح'
    };
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
    const { error } = await supabaseAdmin
      .from(teacher_HISTORY_TABLE)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('خطأ في حذف سجل المعلم:', error);
      return {
        success: false,
        message: `فشل في حذف سجل المعلم: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم حذف سجل المعلم بنجاح'
    };
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
    const { error: updateError } = await supabaseAdmin
      .from(STUDENTS_TABLE)
      .update({ current_teacher_id: newteacherId, updated_at: new Date().toISOString() })
      .eq('id', studentId);
    
    if (updateError) {
      console.error('خطأ في تحديث معلم الطالب:', updateError);
      return {
        success: false,
        message: `فشل في تحديث معلم الطالب: ${updateError.message}`
      };
    }
    
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
      const prevRecord = prevRecords[0];
      const { error: closeError } = await supabaseAdmin
        .from(teacher_HISTORY_TABLE)
        .update({ end_date: startDate })
        .eq('id', prevRecord.id);
      
      if (closeError) {
        console.error('خطأ في إغلاق السجل السابق:', closeError);
      }
    }
    
    // 3. إضافة سجل جديد
    const newHistory: teacherHistoryCreate = {
      student_id: studentId,
      teacher_id: newteacherId,
      start_date: startDate
    };
    
    const { success, message } = await addteacherHistory(newHistory);
    
    if (!success) {
      return { success, message };
    }
    
    return {
      success: true,
      message: 'تم تغيير معلم الطالب وتسجيل التغيير بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تغيير معلم الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تغيير معلم الطالب'
    };
  }
};
