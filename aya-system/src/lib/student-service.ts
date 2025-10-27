import { supabase, STUDENTS_TABLE } from './supabase-client';
import type { Student, StudentCreate, StudentUpdate } from '@/types/student';
import { mapStudentToSupabase, mapSupabaseToStudent, mapSupabaseResultsToStudents } from './supabase-mapper';
import { addNewteacherHistory } from './teacher-history-service';
import { getTeacherIdForStudyCircle } from './study-circle-service';

export const createStudent = async (student: StudentCreate): Promise<{ success: boolean; id?: string; message?: string }> => {
  try {
    const formatted = mapStudentToSupabase(student);
    const payload = {
      ...formatted,
      image_drive_id: (student as any).image_drive_id || null
    };
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .insert(payload)
      .select('id')
      .single();
    if (error) return { success: false, message: error.message };
    return { success: true, id: data?.id };
  } catch (e: any) {
    return { success: false, message: e.message || 'حدث خطأ أثناء إنشاء الطالب' };
  }
};

export const updateStudent = async (id: string, student: StudentUpdate): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('⏳ بدء تحديث الطالب:', { id, incoming: student });
    const { data: currentStudent, error: fetchErr } = await supabase
      .from(STUDENTS_TABLE)
      .select('study_circle_id, gender, image_drive_id')
      .eq('id', id)
      .single();
    if (fetchErr) {
      console.warn('⚠️ فشل جلب الطالب قبل التحديث:', fetchErr);
    }
    // بناء حمولة ديناميكية فقط للحقول المعرفة
    const candidatePayload: Record<string, any> = {
      full_name: student.full_name,
      guardian_id: student.guardian_id,
      study_circle_id: student.study_circle_id,
      grade_level: student.grade_level,
      gender: student.gender,
      date_of_birth: student.date_of_birth,
      memorized_parts: student.memorized_parts,
      phone_number: student.phone_number,
      email: student.email,
      notes: student.notes,
      image_drive_id: (student as any).image_drive_id
    };
    const updatePayload: Record<string, any> = {};
    Object.entries(candidatePayload).forEach(([k, v]) => {
      if (typeof v !== 'undefined') updatePayload[k] = v === '' ? null : v; // تجنب undefined، السماح بقيم null صريحة
    });
    if (Object.keys(updatePayload).length === 0) {
      console.log('ℹ️ لا توجد حقول محددة للتحديث للطالب', id);
      return { success: true, message: 'لا تغييرات' };
    }
    console.log('➡️ الحمولة المرسلة للتحديث:', updatePayload);
    const { data: updateData, error: updErr } = await supabase
      .from(STUDENTS_TABLE)
      .update(updatePayload)
      .eq('id', id)
      .select('id, gender, image_drive_id');
    if (updErr) {
      console.error('❌ فشل تحديث الطالب:', { id, error: updErr, payload: updatePayload });
      return { success: false, message: `${updErr.message} | code=${updErr.code || ''}` };
    }
    if (!updateData || (Array.isArray(updateData) && updateData.length === 0)) {
      console.warn('⚠️ لم يتم تعديل أي صف (ربما سياسة RLS تمنع أو لا توجد تغييرات) للطالب', id);
      return { success: false, message: 'لم يتم تعديل الصف - تحقق من الصلاحيات (RLS)' };
    }
    console.log('✅ نتيجة التحديث (مختصرة):', updateData);
    const newCircleId = student.study_circle_id;
    const oldCircleId = currentStudent?.study_circle_id;
    if (newCircleId && oldCircleId !== newCircleId) {
      const newTeacherId = await getTeacherIdForStudyCircle(newCircleId);
      if (newTeacherId) {
        const { success: historySuccess, message: historyMessage } = await addNewteacherHistory(
          id,
          newTeacherId,
          new Date(),
          newCircleId
        );
        if (!historySuccess) console.error('خطأ في تحديث سجل المعلم:', historyMessage);
      }
    }
    return { success: true, message: 'تم تحديث الطالب بنجاح' };
  } catch (e: any) {
    return { success: false, message: e.message || 'حدث خطأ أثناء تحديث الطالب' };
  }
};

/**
 * تحديث بيانات الطالب مع تحديث سجل المعلم إذا تم تغيير الحلقة الدراسية
 */
export const updateStudentWithHistory = updateStudent;

/**
 * تحديث معرف الصورة فقط (image_drive_id) بدون تعديل باقي الحقول
 * يستخدم لتجاوز قيود RLS المحتملة على أعمدة أخرى أو لتقليل مخاطر الكتابة الزائدة.
 */
export const updateStudentImageDriveId = async (id: string, driveId: string | null): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('🖼️ محاولة حفظ image_drive_id فقط:', { id, driveId });
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .update({ image_drive_id: driveId })
      .eq('id', id)
      .select('id, image_drive_id, gender');
    if (error) {
      console.error('❌ فشل حفظ image_drive_id:', { id, driveId, error });
      return { success: false, message: `${error.message} | code=${error.code || ''}` };
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn('⚠️ لم يتم تعديل معرف الصورة (قد تكون سياسة RLS):', { id, driveId });
      return { success: false, message: 'لم يتم حفظ معرف الصورة - تحقق من RLS' };
    }
    console.log('✅ تم حفظ image_drive_id بنجاح:', data);
    return { success: true, message: 'تم حفظ معرف الصورة' };
  } catch (e: any) {
    return { success: false, message: e.message || 'خطأ أثناء حفظ معرف الصورة' };
  }
};

/**
 * ترحيل البيانات القديمة: نسخ image_drive_id إلى google_driver_id إذا كان الجديد فارغاً
 */
// لم يعد هناك حاجة لسكربت الترحيل بعد اعتماد image_drive_id فقط
