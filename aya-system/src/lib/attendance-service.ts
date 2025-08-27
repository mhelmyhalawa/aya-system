import { supabase } from './supabase-client';
import { Attendance, AttendanceCreate, AttendanceUpdate } from '@/types/attendance';
import { CircleSession } from '@/types/circle-session';
import { Student } from '@/types/student';

// الحصول على سجلات الحضور لجلسة معينة
export async function getAttendanceBySessionId(sessionId: number): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('circle_session_id', sessionId);

  if (error) {
    console.error('Error fetching attendance:', error);
    throw new Error(error.message);
  }

  return data || [];
}

// الحصول على سجلات الحضور لطالب معين
export async function getAttendanceByStudentId(studentId: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching student attendance:', error);
    throw new Error(error.message);
  }

  return data || [];
}

// الحصول على سجلات الحضور لجلسة وطالب معين
export async function getAttendanceBySessionAndStudentId(
  sessionId: number,
  studentId: string
): Promise<Attendance | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('circle_session_id', sessionId)
    .eq('student_id', studentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // ليس هناك سجل بعد
      return null;
    }
    console.error('Error fetching attendance record:', error);
    throw new Error(error.message);
  }

  return data;
}

// إنشاء سجل حضور جديد
export async function createAttendance(
  attendanceData: AttendanceCreate
): Promise<{ success: boolean; data?: Attendance; error?: string }> {
  const { data, error } = await supabase
    .from('attendance')
    .insert([attendanceData])
    .select()
    .single();

  if (error) {
    console.error('Error creating attendance record:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// تحديث سجل حضور موجود
export async function updateAttendance(
  sessionId: number,
  studentId: string,
  attendanceData: AttendanceUpdate
): Promise<{ success: boolean; data?: Attendance; error?: string }> {
  const { data, error } = await supabase
    .from('attendance')
    .update(attendanceData)
    .eq('circle_session_id', sessionId)
    .eq('student_id', studentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating attendance record:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// حذف سجل حضور
export async function deleteAttendance(
  sessionId: number,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('circle_session_id', sessionId)
    .eq('student_id', studentId);

  if (error) {
    console.error('Error deleting attendance record:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// إنشاء أو تحديث سجلات حضور متعددة (عملية جماعية)
export async function upsertAttendance(
  attendanceRecords: AttendanceCreate[]
): Promise<{ success: boolean; data?: Attendance[]; error?: string }> {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(attendanceRecords, { onConflict: 'circle_session_id,student_id' })
    .select();

  if (error) {
    console.error('Error upserting attendance records:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// الحصول على الطلاب والحضور لجلسة معينة
export async function getStudentsWithAttendanceForSession(
  circleId: string,
  sessionId: number
): Promise<{ student: Student; attendance: Attendance | null }[]> {
  try {
    // أولاً، نحصل على قائمة الطلاب في الحلقة مع بيانات ولي الأمر
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        *,
        guardian:guardian_id (
          id,
          full_name,
          phone_number
        )
      `)
      .eq('study_circle_id', circleId);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw new Error(studentsError.message);
    }

    // ثم نحصل على سجلات الحضور للجلسة
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('circle_session_id', sessionId);

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      throw new Error(attendanceError.message);
    }

    // ندمج البيانات لإرجاع الطلاب مع سجلات الحضور الخاصة بهم
    return students.map(student => {
      const attendanceRecord = attendanceRecords.find(record => record.student_id === student.id) || null;
      return {
        student,
        attendance: attendanceRecord
      };
    });
  } catch (error) {
    console.error('Error in getStudentsWithAttendanceForSession:', error);
    throw error;
  }
}

// الحصول على معرف جلسة الحلقة من معرف الحلقة وتاريخ الجلسة
export async function getCircleSessionId(
  studyCircleId: string,
  sessionDate: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('circle_sessions')
    .select('id')
    .eq('study_circle_id', studyCircleId)
    .eq('session_date', sessionDate)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // لا توجد جلسة
      return null;
    }
    console.error('Error fetching circle session id:', error);
    throw new Error(error.message);
  }

  return data?.id || null;
}
