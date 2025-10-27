// src/lib/supabase-mapper.ts
// وظائف مساعدة لتحويل البيانات بين واجهة التطبيق وهيكل قاعدة البيانات Supabase

import { Profile } from '@/types/profile';
import { Guardian, GuardianCreate } from '@/types/guardian';
import { Student, StudentCreate } from '@/types/student';
import { teacherHistory, teacherHistoryCreate } from '@/types/teacher-history';
import { Session, SessionCreate, SessionStudent } from '@/types/session';
import { DailyFollowup, DailyFollowupCreate } from '@/types/daily-followup';
import { MonthlyExam, MonthlyExamCreate, MonthlyResult } from '@/types/monthly-exam';

// ===== Profile Mappers =====

export const mapProfileToSupabase = (profile: Profile): Record<string, any> => {
  return {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    username: profile.username,
    password_hash: profile.password_hash,
    login_attempts: profile.login_attempts,
    last_login_at: profile.last_login_at
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
  // Always ensure there's a valid ID
  const guardianId = guardian.id || crypto.randomUUID();
  console.log('Mapping guardian to Supabase format with ID:', guardianId);
  
  return {
    id: guardianId,
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
    study_circle_id: student.study_circle_id,
    full_name: student.full_name,
    date_of_birth: student.date_of_birth,
  gender: student.gender, // عدم فرض قيمة افتراضية حتى لا نعيد "ذكر" بعد فشل التحديث
    phone_number: student.phone_number,
    email: student.email,
    enrollment_date: student.enrollment_date || new Date().toISOString().split('T')[0],
    grade_level: student.grade_level,
    notes: student.notes,
    image_drive_id: (student as any).image_drive_id
  };
};

// تعديل دالة mapSupabaseToStudent لتشمل العلاقات
export const mapSupabaseToStudent = (record: Record<string, any>): Student => {
  return {
    id: record.id,
    guardian_id: record.guardian_id,
    study_circle_id: record.study_circle_id,
    full_name: record.full_name,
    date_of_birth: record.date_of_birth,
    gender: record.gender,
    phone_number: record.phone_number,
    email: record.email,
    enrollment_date: record.enrollment_date,
    grade_level: record.grade_level,
    notes: record.notes,
    created_at: record.created_at,
    updated_at: record.updated_at,
    image_drive_id: record.image_drive_id,
    // إضافة العلاقات
    guardian: record.guardian,
    study_circle: record.study_circle,
    memorized_parts: record.memorized_parts
  };
};


// تعديل دالة mapSupabaseResultsToStudents لتحافظ على العلاقات
export const mapSupabaseResultsToStudents = (results: Record<string, any>[]): Student[] => {
  if (!results || !Array.isArray(results)) {
    console.log('No results to map or results is not an array');
    return [];
  }
  
  if (results.length > 0) {
    console.log('Mapping students with relationships. First student:', 
      {
        id: results[0].id,
        full_name: results[0].full_name,
        has_guardian: !!results[0].guardian,
        has_teacher: !!results[0].teacher
      }
    );
  }
  
  return results.map(record => {
    // إنشاء كائن الطالب مع الحفاظ على جميع الحقول الأصلية
    const student = mapSupabaseToStudent(record);
    
    // التأكد من الحفاظ على البيانات المرتبطة
    return {
      ...student,
      guardian: record.guardian || null,
      study_circle: record.study_circle || null,
      memorized_parts: record.memorized_parts || null,
      grade: record.grade_level, // إضافة حقل grade للتوافق مع الواجهة
      grade_level: record.grade_level // التأكد من وجود grade_level
    };
  });
};

// ===== teacherHistory Mappers =====

export const mapteacherHistoryToSupabase = (history: teacherHistoryCreate): Record<string, any> => {
  return {
    id: history.id,
    student_id: history.student_id,
    teacher_id: history.teacher_id,
    study_circle_id: history.study_circle_id, // إضافة معرف الحلقة الدراسية
    start_date: history.start_date,
    end_date: history.end_date
  };
};

export const mapSupabaseToteacherHistory = (record: Record<string, any>): teacherHistory => {
  return {
    id: record.id,
    student_id: record.student_id,
    teacher_id: record.teacher_id,
    study_circle_id: record.study_circle_id, // إضافة معرف الحلقة الدراسية
    study_circle: record.study_circle || null, // الحفاظ على كائن الحلقة الدراسية
    start_date: record.start_date,
    end_date: record.end_date
  };
};

export const mapSupabaseResultsToteacherHistory = (results: Record<string, any>[]): teacherHistory[] => {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(record => mapSupabaseToteacherHistory(record));
};

// ===== Session Mappers =====

export const mapSessionToSupabase = (session: SessionCreate): Record<string, any> => {
  return {
    id: session.id,
    title: session.title,
    teacher_id: session.teacher_id,
    session_date: session.session_date
  };
};

export const mapSupabaseToSession = (record: Record<string, any>): Session => {
  return {
    id: record.id,
    title: record.title,
    teacher_id: record.teacher_id,
    session_date: record.session_date,
    created_at: record.created_at
  };
};

export const mapSupabaseResultsToSessions = (results: Record<string, any>[]): Session[] => {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(record => mapSupabaseToSession(record));
};

export const mapSessionStudentToSupabase = (sessionStudent: SessionStudent): Record<string, any> => {
  return {
    session_id: sessionStudent.session_id,
    student_id: sessionStudent.student_id
  };
};

// ===== DailyFollowup Mappers =====

export const mapDailyFollowupToSupabase = (followup: DailyFollowupCreate): Record<string, any> => {
  return {
    id: followup.id,
    session_id: followup.session_id,
    student_id: followup.student_id,
    new_memorization_score: followup.new_memorization_score,
    review_memorization_score: followup.review_memorization_score,
    new_reading_note: followup.new_reading_note,
    review_reading_note: followup.review_reading_note,
    general_notes: followup.general_notes
  };
};

export const mapSupabaseToDailyFollowup = (record: Record<string, any>): DailyFollowup => {
  return {
    id: record.id,
    session_id: record.session_id,
    student_id: record.student_id,
    new_memorization_score: record.new_memorization_score,
    review_memorization_score: record.review_memorization_score,
    new_reading_note: record.new_reading_note,
    review_reading_note: record.review_reading_note,
    general_notes: record.general_notes,
    created_at: record.created_at
  };
};

export const mapSupabaseResultsToDailyFollowups = (results: Record<string, any>[]): DailyFollowup[] => {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(record => mapSupabaseToDailyFollowup(record));
};

// ===== MonthlyExam Mappers =====

export const mapMonthlyExamToSupabase = (exam: MonthlyExamCreate): Record<string, any> => {
  return {
    id: exam.id,
    student_id: exam.student_id,
    exam_month: exam.exam_month,
    memorization_score: exam.memorization_score,
    recitation_score: exam.recitation_score,
    behavior_score: exam.behavior_score,
    attendance_score: exam.attendance_score,
    appearance_score: exam.appearance_score,
    notes: exam.notes
  };
};

export const mapSupabaseToMonthlyExam = (record: Record<string, any>): MonthlyExam => {
  return {
    id: record.id,
    student_id: record.student_id,
    exam_month: record.exam_month,
    memorization_score: record.memorization_score,
    recitation_score: record.recitation_score,
    behavior_score: record.behavior_score,
    attendance_score: record.attendance_score,
    appearance_score: record.appearance_score,
    notes: record.notes,
    created_at: record.created_at
  };
};

export const mapSupabaseResultsToMonthlyExams = (results: Record<string, any>[]): MonthlyExam[] => {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(record => mapSupabaseToMonthlyExam(record));
};

export const mapSupabaseToMonthlyResult = (record: Record<string, any>): MonthlyResult => {
  return {
    exam_id: record.exam_id,
    student_id: record.student_id,
    exam_month: record.exam_month,
    total_score: record.total_score
  };
};

export const mapSupabaseResultsToMonthlyResults = (results: Record<string, any>[]): MonthlyResult[] => {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(record => mapSupabaseToMonthlyResult(record));
};

// For backwards compatibility with existing code
export const mapToSupabaseFormat = mapStudentToSupabase;
export const mapFromSupabaseFormat = mapSupabaseToStudent;

export default {
  // Profile
  mapProfileToSupabase,
  mapSupabaseToProfile,
  mapSupabaseResultsToProfiles,
  
  // Guardian
  mapGuardianToSupabase,
  mapSupabaseToGuardian,
  mapSupabaseResultsToGuardians,
  
  // Student
  mapStudentToSupabase,
  mapSupabaseToStudent,
  mapSupabaseResultsToStudents,
  
  // For backwards compatibility
  mapToSupabaseFormat,
  mapFromSupabaseFormat,
  
  // teacherHistory
  mapteacherHistoryToSupabase,
  mapSupabaseToteacherHistory,
  mapSupabaseResultsToteacherHistory,
  
  // Session
  mapSessionToSupabase,
  mapSupabaseToSession,
  mapSupabaseResultsToSessions,
  mapSessionStudentToSupabase,
  
  // DailyFollowup
  mapDailyFollowupToSupabase,
  mapSupabaseToDailyFollowup,
  mapSupabaseResultsToDailyFollowups,
  
  // MonthlyExam
  mapMonthlyExamToSupabase,
  mapSupabaseToMonthlyExam,
  mapSupabaseResultsToMonthlyExams,
  mapSupabaseToMonthlyResult,
  mapSupabaseResultsToMonthlyResults
};
