// خدمة قاعدة بيانات Supabase لإدارة الطلاب
// توفر واجهة للتعامل مع جدول students

import { supabase, supabaseAdmin, STUDENTS_TABLE } from './supabase-client';
import type { Student, StudentCreate, StudentUpdate } from '@/types/student';
import { mapStudentToSupabase, mapSupabaseToStudent, mapSupabaseResultsToStudents } from './supabase-mapper';

// تعريف نوع StudentWithRelations
export type StudentWithRelations = Student & {
  guardian?: {
    full_name: string;
    phone_number: string;
  };
  teacher?: {
    full_name: string;
  };
  study_circle?: {
    id: string;
    name: string;
  };
};

/**
 * استرجاع جميع الطلاب من قاعدة البيانات
 */
export const getAllStudents = async (): Promise<Student[]> => {
  try {
    console.log('بدء استرجاع جميع الطلاب مع العلاقات...');
    
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select(`
        *,
        guardian:guardian_id (*),
        study_circle:study_circle_id (
          *,
          teacher:teacher_id (*)
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('خطأ في استرجاع الطلاب من Supabase:', error);
      throw new Error(error.message);
    }
    
    if (data && data.length > 0) {
      console.log('تم استرجاع', data.length, 'طالب');
      console.log('مثال على بيانات أول طالب:', {
        id: data[0].id,
        full_name: data[0].full_name,
        has_guardian: !!data[0].guardian,
        has_teacher: !!data[0].teacher
      });
    } else {
      console.log('لم يتم العثور على طلاب في قاعدة البيانات');
    }
    
    // تحويل البيانات من هيكل قاعدة البيانات إلى واجهة التطبيق
    const students = mapSupabaseResultsToStudents(data || []);
    console.log('تم تحويل البيانات بنجاح، عدد الطلاب:', students.length);
    return students;
  } catch (error) {
    console.error('خطأ في استرجاع الطلاب:', error);
    return [];
  }
};

/**
 * استرجاع طالب بواسطة المعرف
 */
export const getStudentById = async (id: string): Promise<Student | null> => {
  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('خطأ في استرجاع الطالب من Supabase:', error);
      return null;
    }
    
    // تحويل البيانات من هيكل قاعدة البيانات إلى واجهة التطبيق
    return data ? mapSupabaseToStudent(data) : null;
  } catch (error) {
    console.error('خطأ في استرجاع الطالب:', error);
    return null;
  }
};

/**
 * إضافة طالب جديد إلى قاعدة البيانات
 */
// In src/lib/supabase-service.ts
export const addStudent = async (studentData: StudentCreate): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    console.log("Received student data in addStudent:", studentData);
    
    const { data, error } = await supabase
      .from('students')
      .insert({
        full_name: studentData.full_name,
        guardian_id: studentData.guardian_id,
        grade_level: studentData.grade_level,
        date_of_birth: studentData.date_of_birth,
        phone_number: studentData.phone_number,
        email: studentData.email,
        memorized_parts: studentData.memorized_parts,  // Make sure this field name matches the DB column
        notes: studentData.notes,
        study_circle_id: studentData.study_circle_id
      })
      .select();

    if (error) {
      console.error('Error adding student:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Unexpected error in addStudent:', error);
    return { success: false, message: 'حدث خطأ غير متوقع' };
  }
};

/**
 * تحديث بيانات طالب
 */
export const updateStudent = async (student: StudentUpdate): Promise<{ success: boolean, message?: string }> => {
  try {
    if (!student.id) {
      return {
        success: false,
        message: 'معرف الطالب مطلوب للتحديث'
      };
    }
    
    // إضافة تاريخ آخر تحديث
    const updatedStudent = {
      ...student,
      updated_at: new Date().toISOString()
    };
    
    console.log('تحديث بيانات الطالب في Supabase:', updatedStudent);
    
    const { error } = await supabaseAdmin
      .from(STUDENTS_TABLE)
      .update(updatedStudent)
      .eq('id', student.id);
    
    if (error) {
      console.error('خطأ في تحديث بيانات الطالب في Supabase:', error);
      return {
        success: false,
        message: `فشل في تحديث بيانات الطالب: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم تحديث بيانات الطالب بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تحديث بيانات الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث بيانات الطالب'
    };
  }
};

/**
 * حذف طالب من قاعدة البيانات
 */
export const deleteStudent = async (id: string): Promise<{ success: boolean, message?: string }> => {
  try {
    const { error } = await supabaseAdmin
      .from(STUDENTS_TABLE)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('خطأ في حذف الطالب من Supabase:', error);
      return {
        success: false,
        message: `فشل في حذف الطالب: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم حذف الطالب بنجاح'
    };
  } catch (error) {
    console.error('خطأ في حذف الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف الطالب'
    };
  }
};

/**
 * البحث عن طلاب باستخدام معايير محددة
 */
export const searchStudents = async (criteria: { [key: string]: any }): Promise<Student[]> => {
  try {
    console.log('بدء البحث عن الطلاب باستخدام المعايير:', JSON.stringify(criteria, null, 2));
    
    let query = supabase
      .from(STUDENTS_TABLE)
      .select(`
        *,
        guardian:guardian_id (*),
        study_circle:study_circle_id (*, teacher:teacher_id (*))
      `)
      .is('deleted_at', null);
    
    // تعيين الحقول المعروفة إلى أسماء الأعمدة الصحيحة
    const fieldMappings: { [key: string]: string } = {
      'full_name': 'full_name',
      'guardian_id': 'guardian_id',
      'study_circle_id': 'study_circle_id',
      'teacher_id': 'study_circles.teacher_id', // البحث بمعرف المعلم من خلال الحلقة الدراسية
      'date_of_birth': 'date_of_birth',
      'gender': 'gender',
      'phone_number': 'phone_number',
      'email': 'email',
      'enrollment_date': 'enrollment_date',
      'grade_level': 'grade_level'
    };
    
    // مسح قيم فارغة أو "الكل" من معايير البحث
    Object.keys(criteria).forEach(key => {
      if (criteria[key] === '' || criteria[key] === null || criteria[key] === undefined || criteria[key] === 'all') {
        console.log(`حذف معيار البحث ${key} لأنه فارغ أو "الكل"`);
        delete criteria[key];
      }
    });
    
    // معالجة البحث بقائمة من معرفات الحلقات الدراسية
    if (criteria.study_circle_ids && Array.isArray(criteria.study_circle_ids) && criteria.study_circle_ids.length > 0) {
      // تحقق من أن القائمة لا تحتوي على قيم فارغة أو "الكل"
      const validIds = criteria.study_circle_ids.filter(id => id && id !== 'all' && id !== '');
      
      if (validIds.length > 0) {
        console.log('البحث عن الطلاب باستخدام معرفات الحلقات الدراسية:', validIds);
        query = query.in('study_circle_id', validIds);
      } else {
        console.log('تم تجاهل معرفات الحلقات الدراسية لأنها فارغة أو تحتوي على "الكل"');
      }
      
      // إزالة المعيار من القائمة لتجنب استخدامه مرة أخرى
      delete criteria.study_circle_ids;
    }
    
    // معالجة البحث باستخدام معرف حلقة دراسية واحدة
    if (criteria.study_circle_id) {
      // تحقق من أن المعرف ليس فارغًا أو "الكل"
      if (criteria.study_circle_id !== 'all' && criteria.study_circle_id !== '') {
        console.log('البحث عن الطلاب باستخدام معرف الحلقة الدراسية:', criteria.study_circle_id);
        query = query.eq('study_circle_id', criteria.study_circle_id);
      } else {
        console.log('تم تجاهل معرف الحلقة الدراسية لأنه "الكل" أو فارغ');
      }
      
      // إزالة المعيار من القائمة لتجنب استخدامه مرة أخرى
      delete criteria.study_circle_id;
    }
    
    // تعديل البحث باستخدام معرف المعلم
    if (criteria.teacher_id) {
      console.log('البحث عن الطلاب باستخدام معرف المعلم:', criteria.teacher_id);
      
      // الحصول على الحلقات الدراسية للمعلم أولاً
      const { data: studyCircles, error: circlesError } = await supabase
        .from('study_circles')
        .select('id, name')
        .eq('teacher_id', criteria.teacher_id)
        .is('deleted_at', null);
      
      if (circlesError) {
        console.error('خطأ في استرجاع الحلقات الدراسية للمعلم:', circlesError);
        return [];
      }
      
      if (studyCircles && studyCircles.length > 0) {
        const circleIds = studyCircles.map(circle => circle.id);
        console.log(`تم العثور على ${studyCircles.length} حلقة دراسية للمعلم:`, 
          studyCircles.map(c => `${c.name} (${c.id})`));
        console.log('معرفات الحلقات الدراسية للمعلم:', circleIds);
        
        // البحث عن الطلاب في هذه الحلقات
        query = query.in('study_circle_id', circleIds);
      } else {
        console.log('لم يتم العثور على حلقات دراسية للمعلم المحدد');
        // إعادة نتيجة فارغة إذا لم تكن هناك حلقات دراسية للمعلم
        return [];
      }
      
      // إزالة المعيار من القائمة لتجنب استخدامه مرة أخرى
      delete criteria.teacher_id;
    }
    
    // إضافة معايير البحث الأخرى بأسماء الأعمدة الصحيحة
    Object.entries(criteria).forEach(([key, value]) => {
      if (value && fieldMappings[key]) {
        const columnName = fieldMappings[key];
        
        if (typeof value === 'string') {
          // البحث النصي باستخدام ilike (بحث غير حساس لحالة الأحرف)
          console.log(`إضافة معيار بحث نصي: ${key} = ${value} (عمود: ${columnName})`);
          query = query.ilike(columnName, `%${value}%`);
        } else {
          // مقارنة دقيقة للقيم غير النصية
          console.log(`إضافة معيار بحث دقيق: ${key} = ${value} (عمود: ${columnName})`);
          query = query.eq(columnName, value);
        }
      } else if (value) {
        console.log(`تجاهل معيار البحث "${key}" لأنه غير معرف في fieldMappings:`, value);
      }
    });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('خطأ في البحث عن الطلاب في Supabase:', error);
      return [];
    }
    
    // عرض بعض التفاصيل عن الطلاب المسترجعين
    console.log(`تم العثور على ${data ? data.length : 0} طالب`);
    if (data && data.length > 0) {
      // عرض معلومات إحصائية عن الحلقات الدراسية للطلاب
      const studyCircleIds = data.map(student => student.study_circle_id).filter(Boolean);
      const uniqueCircleIds = [...new Set(studyCircleIds)];
      console.log(`الطلاب ينتمون إلى ${uniqueCircleIds.length} حلقة دراسية مختلفة:`, uniqueCircleIds);
      
      // عرض تفاصيل عن أول 3 طلاب كعينة
      const sampleSize = Math.min(3, data.length);
      for (let i = 0; i < sampleSize; i++) {
        const student = data[i];
        console.log(`طالب عينة ${i+1}:`, {
          id: student.id,
          name: student.full_name,
          study_circle_id: student.study_circle_id,
          study_circle_name: student.study_circle?.name || 'غير محدد'
        });
      }
    }
    
    // تحويل البيانات من هيكل قاعدة البيانات إلى واجهة التطبيق
    const students = mapSupabaseResultsToStudents(data || []);
    console.log('إكمال البحث وإعادة النتائج');
    return students;
  } catch (error) {
    console.error('خطأ في البحث عن الطلاب:', error);
    return [];
  }
};

/**
 * الحصول على طلاب معلم معين
 */
export const getStudentsByteacher = async (teacherId: string): Promise<Student[]> => {
  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select('*')
      .eq('current_teacher_id', teacherId);
    
    if (error) {
      console.error('خطأ في استرجاع طلاب المعلم:', error);
      return [];
    }
    
    return mapSupabaseResultsToStudents(data || []);
  } catch (error) {
    console.error('خطأ في استرجاع طلاب المعلم:', error);
    return [];
  }
};

// إضافة دالة جديدة للحصول على الطلاب حسب معرف المعلم
export const getStudentsByteacherId = async (teacherId: string) => {
  try {
    console.log("بدء استرجاع الطلاب للمعلم بالمعرف:", teacherId);
    
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        guardian:guardian_id (*),
        teacher:current_teacher_id (*)
      `)
      .eq('current_teacher_id', teacherId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("خطأ في استرجاع الطلاب حسب المعلم:", error);
      throw new Error(error.message);
    }
    
    console.log("تم استرجاع بيانات الطلاب للمعلم، العدد:", data ? data.length : 0);
    
    if (data && data.length > 0) {
      console.log("مثال على بيانات أول طالب:", {
        id: data[0].id,
        full_name: data[0].full_name,
        has_guardian: !!data[0].guardian,
        has_teacher: !!data[0].teacher
      });
    }
    
    // تحويل البيانات إلى التنسيق المتوقع
    const formattedStudents = data.map(student => ({
      id: student.id,
      full_name: student.full_name,
      guardian_id: student.guardian_id,
      current_teacher_id: student.current_teacher_id,
      grade_level: student.grade_level,
      grade: student.grade_level, // نضيف حقل grade للتوافق مع الواجهة
      gender: student.gender,
      date_of_birth: student.date_of_birth,
      phone_number: student.phone_number,
      email: student.email,
      enrollment_date: student.enrollment_date,
      memorized_parts: student.memorized_parts,
      created_at: student.created_at,
      updated_at: student.updated_at,
      guardian: student.guardian || null,
      teacher: student.teacher || null
    }));
    
    console.log("تم تنسيق بيانات الطلاب للمعلم، العدد النهائي:", formattedStudents.length);
    return formattedStudents;
  } catch (error) {
    console.error("خطأ غير متوقع في getStudentsByteacherId:", error);
    return []; // نعيد مصفوفة فارغة بدلاً من رمي الخطأ
  }
};

/**
 * الحصول على طالب مع البيانات المرتبطة به (المعلم وولي الأمر)
 */
export const getStudentWithRelations = async (id: string): Promise<StudentWithRelations | null> => {
  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select(`
        *,
        guardians:guardian_id (full_name, phone_number),
        profiles:current_teacher_id (full_name)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('خطأ في استرجاع بيانات الطالب مع العلاقات:', error);
      return null;
    }
    
    if (!data) return null;
    
    const student = mapSupabaseToStudent(data);
    
    return {
      ...student,
      guardian: data.guardians ? {
        full_name: data.guardians.full_name,
        phone_number: data.guardians.phone_number
      } : undefined,
      teacher: data.profiles ? {
        full_name: data.profiles.full_name
      } : undefined
    };
  } catch (error) {
    console.error('خطأ في استرجاع بيانات الطالب مع العلاقات:', error);
    return null;
  }
};

/**
 * التحقق من وجود طالب مكرر
 */
export const isStudentDuplicate = async (student: StudentCreate): Promise<boolean> => {
  try {
    console.log('التحقق من وجود طالب مكرر:', {
      full_name: student.full_name,
      phone_number: student.phone_number
    });
    
    // البحث بالاسم ورقم الهاتف
    let query = supabase
      .from(STUDENTS_TABLE)
      .select('*')
      .ilike('full_name', student.full_name); // استخدام ilike لتجاهل حالة الأحرف
    
    // إضافة حقل رقم الهاتف إذا كان موجوداً
    if (student.phone_number) {
      query = query.eq('phone_number', student.phone_number);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('خطأ في التحقق من وجود طالب مكرر:', error);
      // لا نعتبر الخطأ تكراراً، نسمح بالاستمرار
      return false;
    }
    
    console.log('نتيجة التحقق من التكرار:', data);
    
    return (data && data.length > 0);
  } catch (error) {
    console.error('خطأ في التحقق من وجود طالب مكرر:', error);
    return false;
  }
};

/**
 * استيراد بيانات من مصدر محلي إلى Supabase
 */
export const importDataToSupabase = async (students: StudentCreate[]): Promise<{ success: boolean, count: number, message?: string }> => {
  try {
    if (!Array.isArray(students) || students.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'لا توجد بيانات للاستيراد'
      };
    }
    
    // تحويل الطلاب إلى تنسيق Supabase
    const formattedStudents = students.map((student, index) => 
      mapStudentToSupabase({
        ...student,
        id: student.id || `imported-${Date.now()}-${index}`
      })
    );
    
    // استيراد البيانات إلى Supabase
    const { data, error } = await supabaseAdmin
      .from(STUDENTS_TABLE)
      .insert(formattedStudents);
    
    if (error) {
      console.error('خطأ في استيراد البيانات إلى Supabase:', error);
      return {
        success: false,
        count: 0,
        message: `فشل في استيراد البيانات: ${error.message}`
      };
    }
    
    return {
      success: true,
      count: formattedStudents.length,
      message: `تم استيراد ${formattedStudents.length} طالب بنجاح`
    };
  } catch (error) {
    console.error('خطأ في استيراد البيانات:', error);
    return {
      success: false,
      count: 0,
      message: 'حدث خطأ أثناء استيراد البيانات'
    };
  }
};

/**
 * استرجاع بيانات الطلاب مع بيانات الحلقات وبيانات المعلم بناء على ولي الأمر
 */
export const getStudentsByGuardianId = async (guardianId: string): Promise<StudentWithRelations[]> => {
  try {
    console.log('بدء استرجاع بيانات الطلاب لولي الأمر بالمعرف:', guardianId);
    
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select(`
        *,
        guardian:guardian_id (*),
        study_circle:study_circle_id (
          *,
          teacher:teacher_id (*)
        )
      `)
      .eq('guardian_id', guardianId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('خطأ في استرجاع بيانات الطلاب لولي الأمر:', error);
      return [];
    }
    
    console.log(`تم استرجاع ${data?.length || 0} طالب لولي الأمر`);
    if (data && data.length > 0) {
      console.log('مثال على بيانات أول طالب:', {
        id: data[0].id,
        full_name: data[0].full_name,
        has_circle: !!data[0].study_circle,
        circle_name: data[0].study_circle?.name || 'غير محدد',
        has_teacher: !!(data[0].study_circle?.teacher),
        teacher_name: data[0].study_circle?.teacher?.full_name || 'غير محدد'
      });
    }
    
    // تحويل البيانات من هيكل قاعدة البيانات إلى واجهة التطبيق
    const students = mapSupabaseResultsToStudents(data || []).map(student => {
      // إعادة تنسيق البيانات لتتوافق مع StudentWithRelations
      const supabaseStudent = data?.find(s => s.id === student.id) || {};
      
      return {
        ...student,
        guardian: supabaseStudent.guardian ? {
          full_name: supabaseStudent.guardian.full_name,
          phone_number: supabaseStudent.guardian.phone_number
        } : undefined,
        teacher: supabaseStudent.study_circle?.teacher ? {
          full_name: supabaseStudent.study_circle.teacher.full_name
        } : undefined,
        study_circle: supabaseStudent.study_circle ? {
          id: supabaseStudent.study_circle.id,
          name: supabaseStudent.study_circle.name
        } : undefined
      } as StudentWithRelations;
    });
    
    return students;
  } catch (error) {
    console.error('خطأ في استرجاع بيانات الطلاب لولي الأمر:', error);
    return [];
  }
};

/**
 * تصدير البيانات من Supabase إلى تنسيق JSON
 */
export const exportToJson = async (): Promise<{ success: boolean, data?: string, message?: string }> => {
  try {
    const students = await getAllStudents();
    
    if (students.length === 0) {
      return {
        success: false,
        message: 'لا توجد بيانات للتصدير'
      };
    }
    
    const jsonData = JSON.stringify(students, null, 2);
    
    return {
      success: true,
      data: jsonData,
      message: `تم تصدير ${students.length} طالب بنجاح`
    };
  } catch (error) {
    console.error('خطأ في تصدير البيانات:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تصدير البيانات'
    };
  }
};
