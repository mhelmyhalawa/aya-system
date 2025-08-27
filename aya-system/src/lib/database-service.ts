// src/lib/database-service.ts
// واجهة قاعدة البيانات المدمجة باستخدام Supabase

import { Student } from '@/types/student';
import { 
  addStudent, 
  getAllStudents, 
  getStudentById as getStudentByIdFromDb, 
  updateStudent, 
  deleteStudent, 
  isStudentDuplicate as checkDuplicate,
  searchStudents,
  exportToJson
} from './supabase-service';

// استخدام Supabase كقاعدة بيانات سحابية
// توفر قاعدة البيانات هذه ميزات متقدمة مثل المزامنة والوصول من أي مكان

/**
 * تهيئة قاعدة البيانات
 */
const initializeDatabase = async () => {
  console.log('تهيئة قاعدة البيانات Supabase');
  // قاعدة البيانات Supabase لا تحتاج إلى تهيئة خاصة
  return true;
};

/**
 * استرجاع قائمة الطلاب من قاعدة البيانات
 */
export const getStudentsFromDatabase = async () => {
  try {
    // استخدام Supabase لاسترجاع جميع الطلاب
    const students = await getAllStudents();
    
    return {
      success: true,
      message: 'تم استرجاع البيانات من قاعدة البيانات السحابية',
      data: students
    };
  } catch (error) {
    console.error('خطأ في استرجاع البيانات من قاعدة البيانات:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء استرجاع البيانات',
      data: []
    };
  }
};

/**
 * حفظ بيانات طالب جديد في قاعدة البيانات
 */
export const saveStudentToDatabase = async (studentData: Student) => {
  try {
    // التحقق من وجود الطالب قبل إضافته
    const isDuplicate = await checkDuplicate(studentData);
    if (isDuplicate) {
      return {
        success: false,
        message: 'هذا الطالب موجود بالفعل في قاعدة البيانات',
        duplicated: true
      };
    }

    // حفظ البيانات في قاعدة البيانات Supabase
    const result = await addStudent(studentData);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message || 'فشل في حفظ البيانات',
        error: 'خطأ في عملية الإضافة'
      };
    }
    
    return {
      success: true,
      message: 'تم حفظ البيانات بنجاح في قاعدة البيانات السحابية',
      studentId: result.data?.id || studentData.id
    };
  } catch (error) {
    console.error('خطأ في حفظ البيانات في قاعدة البيانات:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حفظ البيانات',
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
};

/**
 * البحث عن طالب بواسطة المعرف
 */
export const getStudentById = async (id: string) => {
  try {
    const student = await getStudentByIdFromDb(id);
    return {
      success: true,
      data: student
    };
  } catch (error) {
    console.error('خطأ في البحث عن الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء البحث عن الطالب',
      data: null
    };
  }
};

/**
 * تحديث بيانات طالب
 */
export const updateStudentInDatabase = async (studentData: Student) => {
  try {
    const result = await updateStudent(studentData);
    return {
      success: result.success,
      message: result.message || 'تم تحديث البيانات بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تحديث بيانات الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث البيانات'
    };
  }
};

/**
 * حذف طالب من قاعدة البيانات
 */
export const deleteStudentFromDatabase = async (id: string) => {
  try {
    const result = await deleteStudent(id);
    return {
      success: result.success,
      message: result.message || 'تم حذف الطالب بنجاح'
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
export const searchStudentsInDatabase = async (criteria: { [key: string]: any }) => {
  try {
    const students = await searchStudents(criteria);
    return {
      success: true,
      data: students,
      message: `تم العثور على ${students.length} طالب`
    };
  } catch (error) {
    console.error('خطأ في البحث عن الطلاب:', error);
    return {
      success: false,
      data: [],
      message: 'حدث خطأ أثناء البحث عن الطلاب'
    };
  }
};

/**
 * تصدير بيانات الطلاب إلى ملف JSON
 */
export const exportStudentsToJson = async () => {
  try {
    const result = await exportToJson();
    return {
      success: result.success,
      data: result.data,
      message: result.message
    };
  } catch (error) {
    console.error('خطأ في تصدير البيانات:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تصدير البيانات'
    };
  }
};

// تهيئة قاعدة البيانات عند تحميل الملف
initializeDatabase().catch(error => {
  console.error('فشل في تهيئة قاعدة البيانات:', error);
});

export default {
  getStudentsFromDatabase,
  saveStudentToDatabase,
  getStudentById,
  updateStudentInDatabase,
  deleteStudentFromDatabase,
  searchStudentsInDatabase,
  exportStudentsToJson
};
