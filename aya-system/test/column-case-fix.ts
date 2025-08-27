// إجراءات إصلاح مشكلة حساسية أسماء الأعمدة في Supabase لهيكل البيانات الجديد
// هذا الملف هو دليل توثيقي فقط وليس للاستخدام المباشر في التطبيق
// يُستخدم كمرجع لكيفية تحديث الكود ليتوافق مع الهيكل الجديد لقاعدة البيانات

/**
 * 1. تحديث ملف src/lib/supabase-mapper.ts مع دوال التحويل الجديدة:
 */

// src/lib/supabase-mapper.ts
// وظائف مساعدة لتحويل البيانات بين واجهة التطبيق وهيكل قاعدة البيانات Supabase

import { Profile, ProfileCreate } from '@/types/profile';
import { Guardian, GuardianCreate } from '@/types/guardian';
import { Student, StudentCreate, StudentUpdate } from '@/types/student';
import { teacherHistory, teacherHistoryCreate } from '@/types/teacher-history';
import { Session, SessionCreate, SessionStudent } from '@/types/session';
import { DailyFollowup, DailyFollowupCreate } from '@/types/daily-followup';
import { MonthlyExam, MonthlyExamCreate, MonthlyResult } from '@/types/monthly-exam';
import { StudentWithRelations } from '@/types/student';

// ===== Profile Mappers =====

export const mapProfileToSupabase = (profile: ProfileCreate): Record<string, any> => {
  return {
    id: profile.id || crypto.randomUUID(),
    full_name: profile.full_name,
    role: profile.role,
    username: profile.username,
    password_hash: profile.password_hash,
    login_attempts: 0, // قيمة افتراضية للمستخدمين الجدد
    last_login_at: null // قيمة افتراضية للمستخدمين الجدد
  };
};

export const mapSupabaseToProfile = (record: Record<string, any>): Profile => {
  return {
    id: record.id,
    full_name: record.full_name,
    role: record.role,
    username: record.username,
    password_hash: record.password_hash,
    login_attempts: record.login_attempts,
    last_login_at: record.last_login_at,
    created_at: record.created_at
  };
};

export const mapSupabaseResultsToProfiles = (results: Record<string, any>[]): Profile[] => {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(record => mapSupabaseToProfile(record));
};

// ===== Guardian Mappers =====

export const mapGuardianToSupabase = (guardian: GuardianCreate): Record<string, any> => {
  return {
    id: guardian.id || crypto.randomUUID(),
    full_name: guardian.full_name,
    phone_number: guardian.phone_number,
    email: guardian.email,
    address: guardian.address
  };
};

export const mapSupabaseToGuardian = (record: Record<string, any>): Guardian => {
  return {
    id: record.id,
    full_name: record.full_name,
    phone_number: record.phone_number,
    email: record.email,
    address: record.address,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
};

export const mapSupabaseResultsToGuardians = (results: Record<string, any>[]): Guardian[] => {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(record => mapSupabaseToGuardian(record));
};

// ===== Student Mappers =====

export const mapStudentToSupabase = (student: StudentCreate): Record<string, any> => {
  return {
    id: student.id || crypto.randomUUID(),
    guardian_id: student.guardian_id,
    current_teacher_id: student.current_teacher_id,
    full_name: student.full_name,
    date_of_birth: student.date_of_birth,
    gender: student.gender || 'male',
    phone_number: student.phone_number,
    email: student.email,
    enrollment_date: student.enrollment_date || new Date().toISOString().split('T')[0],
    grade_level: student.grade_level,
    notes: student.notes
  };
};

export const mapSupabaseToStudent = (record: Record<string, any>): Student => {
  return {
    id: record.id,
    guardian_id: record.guardian_id,
    current_teacher_id: record.current_teacher_id,
    full_name: record.full_name,
    date_of_birth: record.date_of_birth,
    gender: record.gender,
    phone_number: record.phone_number,
    email: record.email,
    enrollment_date: record.enrollment_date,
    grade_level: record.grade_level,
    notes: record.notes,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
};

export const mapSupabaseResultsToStudents = (results: Record<string, any>[]): Student[] => {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(record => mapSupabaseToStudent(record));
};

/**
 * 2. تحديث ملف src/lib/supabase-service.ts لاستخدام دوال التحويل الجديدة
 */

// في أعلى الملف
import { supabase, STUDENTS_TABLE } from './supabase-client';
import type { Student, StudentCreate, StudentUpdate, StudentWithRelations } from '@/types/student';
import { mapStudentToSupabase, mapSupabaseToStudent, mapSupabaseResultsToStudents } from './supabase-mapper';

// تحديث دالة getAllStudents:
export const getAllStudents = async (): Promise<Student[]> => {
  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select('*');
    
    if (error) {
      console.error('خطأ في استرجاع الطلاب من Supabase:', error);
      return [];
    }
    
    // تحويل البيانات من هيكل قاعدة البيانات إلى واجهة التطبيق
    return mapSupabaseResultsToStudents(data || []);
  } catch (error) {
    console.error('خطأ في استرجاع الطلاب:', error);
    return [];
  }
};

// تحديث دالة getStudentById:
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

// تحديث دالة addStudent:
export const addStudent = async (student: StudentCreate): Promise<{ success: boolean, id: string, message?: string, error?: any }> => {
  try {
    // تحويل بيانات الطالب إلى هيكل قاعدة البيانات
    const formattedStudent = mapStudentToSupabase(student);
    
    console.log('جاري إضافة طالب إلى Supabase (بعد التنسيق):', formattedStudent);
    
    // استخدام select() للحصول على البيانات المدرجة
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .insert([formattedStudent])
      .select();
    
    if (error) {
      console.error('خطأ في إضافة الطالب إلى Supabase:', error);
      return {
        success: false,
        id: '',
        message: `فشل في إضافة الطالب: ${error.message}`,
        error: error
      };
    }
    
    console.log('تم إضافة الطالب بنجاح إلى Supabase', data);
    
    return {
      success: true,
      id: formattedStudent.id,
      message: 'تم إضافة الطالب بنجاح'
    };
  } catch (error) {
    console.error('خطأ في إضافة الطالب:', error);
    return {
      success: false,
      id: '',
      message: 'حدث خطأ أثناء إضافة الطالب',
      error: error
    };
  }
};

// تحديث دالة البحث:
export const searchStudents = async (criteria: { [key: string]: any }): Promise<Student[]> => {
  try {
    let query = supabase
      .from(STUDENTS_TABLE)
      .select('*');
    
    // تعيين الحقول المعروفة إلى أسماء الأعمدة الصحيحة
    const fieldMappings: { [key: string]: string } = {
      'full_name': 'full_name',
      'guardian_id': 'guardian_id',
      'current_teacher_id': 'current_teacher_id',
      'date_of_birth': 'date_of_birth',
      'gender': 'gender',
      'phone_number': 'phone_number',
      'email': 'email',
      'enrollment_date': 'enrollment_date',
      'grade_level': 'grade_level'
    };
    
    // إضافة معايير البحث بأسماء الأعمدة الصحيحة
    Object.entries(criteria).forEach(([key, value]) => {
      if (value && fieldMappings[key]) {
        const columnName = fieldMappings[key];
        
        if (typeof value === 'string') {
          // البحث النصي باستخدام ilike (بحث غير حساس لحالة الأحرف)
          query = query.ilike(columnName, `%${value}%`);
        } else {
          // مقارنة دقيقة للقيم غير النصية
          query = query.eq(columnName, value);
        }
      }
    });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('خطأ في البحث عن الطلاب في Supabase:', error);
      return [];
    }
    
    // تحويل البيانات من هيكل قاعدة البيانات إلى واجهة التطبيق
    return mapSupabaseResultsToStudents(data || []);
  } catch (error) {
    console.error('خطأ في البحث عن الطلاب:', error);
    return [];
  }
};

/**
 * 3. تحديث دالة التحقق من وجود طالب مكرر
 */

export const isStudentDuplicate = async (student: StudentCreate): Promise<boolean> => {
  try {
    console.log('التحقق من وجود طالب مكرر:', {
      full_name: student.full_name,
      phone_number: student.phone_number
    });
    
    // استخدام التنسيق الصحيح لأسماء الأعمدة
    let query = supabase
      .from(STUDENTS_TABLE)
      .select('*')
      .ilike('full_name', student.full_name);
    
    // إضافة حقل رقم الهاتف إذا كان موجوداً
    if (student.phone_number) {
      query = query.eq('phone_number', student.phone_number);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('خطأ في التحقق من وجود طالب مكرر:', error);
      return false;
    }
    
    // إذا وجد طالب بنفس البيانات
    return data && data.length > 0;
  } catch (error) {
    console.error('خطأ في التحقق من وجود طالب مكرر:', error);
    return false;
  }
};

/**
 * 4. الحصول على بيانات الطالب مع العلاقات المرتبطة
 */

export const getStudentWithRelations = async (id: string): Promise<StudentWithRelations | null> => {
  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select(`
        *,
        guardians:guardian_id (*),
        profiles:current_teacher_id (*)
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
 * 5. تصدير بيانات الطلاب
 */

export const exportToJson = async (): Promise<{ success: boolean, data?: string, message?: string }> => {
  try {
    const students = await getAllStudents();
    
    if (!students || students.length === 0) {
      return {
        success: false,
        message: 'لا توجد بيانات للتصدير'
      };
    }
    
    const jsonData = JSON.stringify(students, null, 2);
    
    return {
      success: true,
      data: jsonData,
      message: `تم تصدير بيانات ${students.length} طالب بنجاح`
    };
  } catch (error) {
    console.error('خطأ في تصدير بيانات الطلاب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تصدير البيانات'
    };
  }
};

/**
 * 6. تحديث واجهة التطبيق
 * 
 * يجب تحديث مكونات الواجهة لتتناسب مع النموذج الجديد:
 * - تحديث نماذج الإدخال
 * - تحديث طريقة عرض البيانات
 * - تحديث عمليات البحث والفلترة
 */

/**
 * 7. ملخص التغييرات وخطة التنفيذ
 * 
 * 1. تحديث النماذج والأنواع في مجلد types لتتوافق مع هيكل قاعدة البيانات الجديد
 * 2. تحديث دوال التحويل في supabase-mapper.ts للعمل مع النماذج الجديدة
 * 3. تحديث خدمات API في supabase-service.ts وغيرها من ملفات الخدمات
 * 4. تحديث مكونات واجهة المستخدم للعمل مع الهيكل الجديد
 * 5. اختبار جميع العمليات والتأكد من عملها بشكل صحيح
 * 
 * ملاحظة: يجب الحرص على استخدام نماذج StudentCreate و StudentUpdate
 * بدلاً من Student المباشر عند الإنشاء والتحديث، وذلك لضمان التعامل الصحيح مع الحقول الاختيارية
 * والحقول التي يتم توليدها تلقائيًا في قاعدة البيانات.
 */
