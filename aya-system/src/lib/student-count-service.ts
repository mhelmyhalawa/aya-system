// وظيفة لجلب عدد الطلاب في كل حلقة
import { supabase } from './supabase-client';

/**
 * الحصول على عدد الطلاب في كل حلقة
 * @param circleIds قائمة معرفات الحلقات
 * @returns كائن يحتوي على عدد الطلاب لكل حلقة
 */
export const getStudentsCountInCircles = async (circleIds: string[]): Promise<Record<string, number>> => {
  if (!circleIds || circleIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, study_circle_id')
      .in('study_circle_id', circleIds)
      .is('deleted_at', null); // تجاهل الطلاب المحذوفين
    
    if (error) {
      console.error('خطأ في جلب عدد الطلاب في الحلقات:', error);
      return {};
    }
    
    // إنشاء كائن يحتوي على عدد الطلاب لكل حلقة
    const counts: Record<string, number> = {};
    circleIds.forEach(id => { counts[id] = 0; });
    
    data.forEach(student => {
      if (student.study_circle_id && counts.hasOwnProperty(student.study_circle_id)) {
        counts[student.study_circle_id]++;
      }
    });
    
    return counts;
  } catch (error) {
    console.error('خطأ في جلب عدد الطلاب في الحلقات:', error);
    return {};
  }
};
