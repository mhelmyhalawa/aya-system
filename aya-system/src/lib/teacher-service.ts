import { supabase } from './supabase-client';

/**
 * الحصول على المعلمين من قاعدة البيانات
 */
export const getAllTeachers = async () => {
  try {
    console.log('بدء استرجاع المعلمين...');
    
    // 1. محاولة استرجاع جميع الملفات الشخصية أولاً للتحقق
    
    const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .or('role.eq.teacher,role.eq.admin')
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

    if (profilesError) {
      console.error('خطأ في استرجاع جميع الملفات الشخصية:', profilesError);
    } else {
      console.log('جميع الملفات الشخصية:', allProfiles?.length);
    }
            
  
    return allProfiles;
  } catch (error) {
    console.error('خطأ غير متوقع في استرجاع المعلمين:', error);
    // إعادة مصفوفة فارغة بدلاً من رمي الخطأ لمنع توقف التطبيق
    return [];
  }
};

/**
 * الحصول على الطلاب المرتبطين بمعلم معين
 */
export const getStudentsByTeacherId = async (teacherId: string) => {
  try {
    console.log('جاري جلب الطلاب للمعلم:', teacherId);
    
    // أولاً نحصل على حلقات المعلم
    const { data: circles, error: circlesError } = await supabase
      .from('study_circles')
      .select('id')
      .eq('teacher_id', teacherId)
      .is('deleted_at', null);
    
    if (circlesError) {
      console.error('خطأ في استرجاع حلقات المعلم:', circlesError);
      return [];
    }
    
    if (!circles || circles.length === 0) {
      console.log('لا توجد حلقات للمعلم المحدد');
      return [];
    }
    
    const circleIds = circles.map(circle => circle.id);
    console.log('معرفات حلقات المعلم:', circleIds);
    
    // ثم نحصل على الطلاب في هذه الحلقات - مع إضافة معلومات ولي الأمر
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        *,
        study_circle:study_circle_id (
          id,
          name,
          teacher_id
        ),
        guardian:guardian_id (
          id,
          full_name,
          phone_number
        )
      `)
      .in('study_circle_id', circleIds)
      .is('deleted_at', null);
    
    if (studentsError) {
      console.error('خطأ في استرجاع طلاب المعلم:', studentsError);
      return [];
    }
    
    console.log(`تم العثور على ${students?.length || 0} طالب للمعلم`);
    return students || [];
  } catch (error) {
    console.error('خطأ غير متوقع في استرجاع طلاب المعلم:', error);
    return [];
  }
};
