// خدمة قاعدة بيانات Supabase لإدارة الحلقات الدراسية
import { supabase, supabaseAdmin } from './supabase-client';
import { StudyCircle, StudyCircleCreate, StudyCircleUpdate } from '@/types/study-circle';

const STUDY_CIRCLES_TABLE = 'study_circles';

/**
 * الحصول على عدد الحلقات لكل معلم
 */
export async function getStudyCircleCountByTeacherIds(ids: string[]) {
  if (!ids.length) return {};

  // جلب جميع الحلقات التي تخص أي من هؤلاء المستخدمين (معلم أو مشرف)
  const { data, error } = await supabase
    .from('study_circles')
    .select('id,teacher_id')
    .in('teacher_id', ids)
    .is('deleted_at', null); // تجاهل الحلقات المحذوفة

  if (error) {
    console.error('Error fetching study circles:', error);
    return {};
  }

  // حساب العدد لكل معلم/مشرف
  const counts: Record<string, number> = {};
  ids.forEach(id => { counts[id] = 0; });
  data.forEach((circle: any) => {
    if (circle.teacher_id && counts.hasOwnProperty(circle.teacher_id)) {
      counts[circle.teacher_id]++;
    }
  });
  
  return counts;
}

/**
 * استرجاع جميع الحلقات الدراسية
 */
export const getAllStudyCircles = async (): Promise<StudyCircle[]> => {
  try {
    const { data, error } = await supabase
      .from(STUDY_CIRCLES_TABLE)
      .select(`
        *,
        teacher:teacher_id (
          id,
          full_name
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('خطأ في استرجاع الحلقات الدراسية:', error);
      return [];
    }
    
    return data as StudyCircle[];
  } catch (error) {
    console.error('خطأ غير متوقع في استرجاع الحلقات الدراسية:', error);
    return [];
  }
};

/**
 * استرجاع الحلقات الدراسية لمعلم معين
 */
export const getTeacherStudyCircles = async (teacherId: string): Promise<StudyCircle[]> => {
  try {
    const { data, error } = await supabase
      .from(STUDY_CIRCLES_TABLE)
      .select(`
        *,
        teacher:teacher_id (
          id,
          full_name
        )
      `)
      .eq('teacher_id', teacherId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('خطأ في استرجاع حلقات المعلم:', error);
      return [];
    }
    
    return data as StudyCircle[];
  } catch (error) {
    console.error('خطأ غير متوقع في استرجاع حلقات المعلم:', error);
    return [];
  }
};

/**
 * الحصول على الحلقات الدراسية للمعلم المحدد
 */
export const getStudyCirclesByTeacherId = async (teacherId: string): Promise<StudyCircle[]> => {
  try {
    const { data, error } = await supabase
      .from(STUDY_CIRCLES_TABLE)
      .select(`
        *,
        teacher:teacher_id (
          id,
          full_name
        )
      `)
      .eq('teacher_id', teacherId)
      .is('deleted_at', null);
    
    if (error) {
      console.error('خطأ في استرجاع الحلقات الدراسية للمعلم:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('خطأ في استرجاع الحلقات الدراسية للمعلم:', error);
    return [];
  }
};

/**
 * الحصول على حلقة دراسية بواسطة المعرف
 */
export const getStudyCircleById = async (id: string): Promise<StudyCircle | null> => {
  try {
    const { data, error } = await supabase
      .from(STUDY_CIRCLES_TABLE)
      .select(`
        *,
        teacher:teacher_id (
          id,
          full_name
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (error) {
      console.error('خطأ في استرجاع الحلقة الدراسية:', error);
      return null;
    }
    
    return data || null;
  } catch (error) {
    console.error('خطأ في استرجاع الحلقة الدراسية:', error);
    return null;
  }
};

/**
 * إنشاء حلقة دراسية جديدة
 */
export const createStudyCircle = async (circle: StudyCircleCreate): Promise<{ success: boolean, id?: string, message?: string }> => {
  try {
    const { data, error } = await supabaseAdmin
      .from(STUDY_CIRCLES_TABLE)
      .insert([circle])
      .select();
    
    if (error) {
      console.error('خطأ في إنشاء الحلقة الدراسية:', error);
      return {
        success: false,
        message: `فشل في إنشاء الحلقة الدراسية: ${error.message}`
      };
    }
    
    return {
      success: true,
      id: data && data[0] ? data[0].id : undefined,
      message: 'تم إنشاء الحلقة الدراسية بنجاح'
    };
  } catch (error) {
    console.error('خطأ في إنشاء الحلقة الدراسية:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحلقة الدراسية'
    };
  }
};

/**
 * الحصول على معرف المعلم للحلقة الدراسية المحددة
 */
export const getTeacherIdForStudyCircle = async (circleId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from(STUDY_CIRCLES_TABLE)
      .select('teacher_id')
      .eq('id', circleId)
      .is('deleted_at', null)
      .single();
    
    if (error) {
      console.error('خطأ في استرجاع معلم الحلقة الدراسية:', error);
      return null;
    }
    
    return data?.teacher_id || null;
  } catch (error) {
    console.error('خطأ في استرجاع معلم الحلقة الدراسية:', error);
    return null;
  }
};

/**
 * تحديث حلقة دراسية
 */
export const updateStudyCircle = async (circle: StudyCircleUpdate): Promise<{ success: boolean, message?: string }> => {
  try {
    const { error } = await supabaseAdmin
      .from(STUDY_CIRCLES_TABLE)
      .update(circle)
      .eq('id', circle.id);
    
    if (error) {
      console.error('خطأ في تحديث الحلقة الدراسية:', error);
      return {
        success: false,
        message: `فشل في تحديث الحلقة الدراسية: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم تحديث الحلقة الدراسية بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تحديث الحلقة الدراسية:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث الحلقة الدراسية'
    };
  }
};

/**
 * حذف حلقة دراسية (soft delete)
 */
export const deleteStudyCircle = async (id: string): Promise<{ success: boolean, message?: string }> => {
  try {
    const { error } = await supabaseAdmin
      .from(STUDY_CIRCLES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('خطأ في حذف الحلقة الدراسية:', error);
      return {
        success: false,
        message: `فشل في حذف الحلقة الدراسية: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم حذف الحلقة الدراسية بنجاح'
    };
  } catch (error) {
    console.error('خطأ في حذف الحلقة الدراسية:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف الحلقة الدراسية'
    };
  }
};

/**
 * استرجاع طلاب الحلقة الدراسية
 */
export const getStudentsInCircle = async (circleId: string): Promise<any[]> => {
  try {
    // افتراض وجود علاقة بين الطلاب والحلقات الدراسية في جدول student_circles
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        circles:student_circles!inner (
          circle_id
        )
      `)
      .eq('circles.circle_id', circleId);
    
    if (error) {
      console.error('خطأ في استرجاع طلاب الحلقة الدراسية:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('خطأ في استرجاع طلاب الحلقة الدراسية:', error);
    return [];
  }
};
