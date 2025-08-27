import { supabase, supabaseAdmin, STUDENTS_TABLE } from './supabase-client';
import type { Student, StudentCreate, StudentUpdate } from '@/types/student';
import { mapStudentToSupabase, mapSupabaseToStudent, mapSupabaseResultsToStudents } from './supabase-mapper';
import { addNewteacherHistory } from './teacher-history-service';
import { getTeacherIdForStudyCircle } from './study-circle-service';

export const createStudent = async (student: StudentCreate): Promise<{ success: boolean; id?: string; message?: string }> => {
  try {
    const formattedStudent = mapStudentToSupabase(student);
    
    const { data, error } = await supabaseAdmin
      .from(STUDENTS_TABLE)
      .insert([formattedStudent])
      .select()
      .single();
    
    if (error) {
      console.error('خطأ في إنشاء الطالب:', error);
      return {
        success: false,
        message: `فشل في إنشاء الطالب: ${error.message}`
      };
    }

    // إضافة سجل المعلم الأول للطالب
    console.log('Student data:', student);
    console.log('Formatted student:', formattedStudent);
    
    if (student.study_circle_id || formattedStudent.study_circle_id) {
      const circleId = student.study_circle_id || formattedStudent.study_circle_id;
      // الحصول على معرف المعلم من الحلقة الدراسية
      const teacherId = await getTeacherIdForStudyCircle(circleId);
      
      if (teacherId) {
        console.log('Adding teacher history with:', { studentId: data.id, teacherId, circleId });
        
        const { success: historySuccess, message: historyMessage } = await addNewteacherHistory(
          data.id,
          teacherId,
          new Date(),
          circleId  // إضافة معرف الحلقة
        );

        if (!historySuccess) {
          console.error('خطأ في إضافة سجل المعلم:', historyMessage);
        } else {
          console.log('تم إضافة سجل المعلم بنجاح');
        }
      } else {
        console.log('لم يتم العثور على معلم للحلقة المحددة');
      }
    } else {
      console.log('لا توجد حلقة دراسية محددة للطالب');
    }
    
    return {
      success: true,
      id: data.id,
      message: 'تم إنشاء الطالب بنجاح'
    };
  } catch (error) {
    console.error('خطأ في إنشاء الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء الطالب'
    };
  }
};

export const updateStudent = async (id: string, student: StudentUpdate): Promise<{ success: boolean; message?: string }> => {
  try {
    // الحصول على بيانات الطالب الحالية
    console.log('تحديث الطالب:', { id, updatedData: student });
    
    const { data: currentStudent } = await supabase
      .from(STUDENTS_TABLE)
      .select('study_circle_id')
      .eq('id', id)
      .single();

    console.log('بيانات الطالب الحالية:', currentStudent);

    const { error } = await supabaseAdmin
      .from(STUDENTS_TABLE)
      .update(student)
      .eq('id', id);
    
    if (error) {
      console.error('خطأ في تحديث الطالب:', error);
      return {
        success: false,
        message: `فشل في تحديث الطالب: ${error.message}`
      };
    }

    // إذا تم تغيير الحلقة الدراسية، نضيف سجل جديد للمعلم
    const newCircleId = student.study_circle_id;
    const oldCircleId = currentStudent?.study_circle_id;
    
    console.log('مقارنة الحلقات الدراسية:', { 
      newCircleId, 
      oldCircleId, 
      hasChanged: newCircleId !== oldCircleId 
    });

    if (newCircleId && oldCircleId !== newCircleId) {
      // الحصول على معرف المعلم من الحلقة الدراسية الجديدة
      const newTeacherId = await getTeacherIdForStudyCircle(newCircleId);
      
      if (newTeacherId) {
        console.log('إضافة سجل معلم جديد');
        const { success: historySuccess, message: historyMessage } = await addNewteacherHistory(
          id,
          newTeacherId,
          new Date(),
          newCircleId  // إضافة معرف الحلقة الدراسية الجديدة
        );

        if (!historySuccess) {
          console.error('خطأ في تحديث سجل المعلم:', historyMessage);
        }
      } else {
        console.log('لم يتم العثور على معلم للحلقة الجديدة');
      }
    }
    
    return {
      success: true,
      message: 'تم تحديث الطالب بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تحديث الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث الطالب'
    };
  }
};

/**
 * تحديث بيانات الطالب مع تحديث سجل المعلم إذا تم تغيير الحلقة الدراسية
 */
export const updateStudentWithHistory = async (id: string, student: StudentUpdate): Promise<{ success: boolean; message?: string }> => {
  try {
    // الحصول على بيانات الطالب الحالية
    console.log('تحديث الطالب مع تحديث سجل المعلم:', { id, updatedData: student });
    
    const { data: currentStudent } = await supabase
      .from(STUDENTS_TABLE)
      .select('study_circle_id')
      .eq('id', id)
      .single();

    console.log('بيانات الطالب الحالية:', currentStudent);

    // تحديث بيانات الطالب
    const { error } = await supabaseAdmin
      .from(STUDENTS_TABLE)
      .update(student)
      .eq('id', id);
    
    if (error) {
      console.error('خطأ في تحديث الطالب:', error);
      return {
        success: false,
        message: `فشل في تحديث الطالب: ${error.message}`
      };
    }

    // إذا تم تغيير الحلقة الدراسية، نضيف سجل جديد للمعلم
    const newCircleId = student.study_circle_id;
    const oldCircleId = currentStudent?.study_circle_id;
    
    console.log('مقارنة الحلقات الدراسية:', { 
      newCircleId, 
      oldCircleId, 
      hasChanged: newCircleId !== oldCircleId 
    });

    if (newCircleId && oldCircleId !== newCircleId) {
      // الحصول على معرف المعلم من الحلقة الدراسية الجديدة
      const newTeacherId = await getTeacherIdForStudyCircle(newCircleId);
      
      if (newTeacherId) {
        console.log('إضافة سجل معلم جديد');
        const { success: historySuccess, message: historyMessage } = await addNewteacherHistory(
          id,
          newTeacherId,
          new Date(),
          newCircleId  // إضافة معرف الحلقة الدراسية الجديدة
        );

        if (!historySuccess) {
          console.error('خطأ في تحديث سجل المعلم:', historyMessage);
        }
      } else {
        console.log('لم يتم العثور على معلم للحلقة الجديدة');
      }
    }
    
    return {
      success: true,
      message: 'تم تحديث الطالب بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تحديث الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث الطالب'
    };
  }
};
