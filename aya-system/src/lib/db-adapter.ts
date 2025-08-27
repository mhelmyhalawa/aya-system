// src/lib/db-adapter.ts
// ملف وسيط للتعامل مع قاعدة البيانات

import { Student } from '@/types/student';
import { getStudentsFromDatabase, saveStudentToDatabase } from './database-service';

/**
 * استرجاع قائمة الطلاب من قاعدة البيانات السحابية
 */
export const getStudents = async () => {
  try {
    // استخدام قاعدة البيانات السحابية Supabase
    const result = await getStudentsFromDatabase();
    return {
      success: result.success,
      message: result.message,
      data: result.data
    };
  } catch (error) {
    console.error('خطأ في استرجاع البيانات:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء استرجاع البيانات',
      data: []
    };
  }
};

/**
 * حفظ بيانات طالب جديد في قاعدة البيانات السحابية
 */
export const saveStudent = async (studentData: Student) => {
  try {
    console.log('بدء عملية حفظ الطالب في قاعدة البيانات');
    
    // التحقق أولاً من عدم وجود تكرار في قاعدة البيانات السحابية
    const result = await saveStudentToDatabase(studentData);
    
    console.log('نتيجة عملية الحفظ:', result);
    
    if (!result.success && result.duplicated) {
      return {
        success: false,
        message: 'هذا الطالب موجود بالفعل في قاعدة البيانات',
        duplicated: true
      };
    }
    
    if (!result.success) {
      return {
        success: false,
        message: result.message || 'حدث خطأ أثناء حفظ بيانات الطالب',
        error: result.error
      };
    }

    return {
      success: true,
      message: 'تم حفظ البيانات بنجاح في قاعدة البيانات السحابية',
      studentId: result.studentId
    };
  } catch (error) {
    console.error('خطأ في حفظ بيانات الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حفظ بيانات الطالب',
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
};
