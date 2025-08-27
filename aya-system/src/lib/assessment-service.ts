import { supabase, supabaseAdmin } from './supabase-client';
import type { Assessment, AssessmentCreate, AssessmentUpdate } from '@/types/assessment';

const ASSESSMENTS_TABLE = 'assessments';

/**
 * اختبار الاتصال بجدول التقييمات والتحقق من وجوده
 */
export const assessmentService = {
  testConnection: async (): Promise<boolean> => {
    try {
      const { count } = await supabase
        .from(ASSESSMENTS_TABLE)
        .select('*', { count: 'exact', head: true });
      
      return true;
    } catch (error) {
      console.error('خطأ في اختبار الاتصال بجدول التقييمات:', error);
      return false;
    }
  },

  /**
   * استرجاع جميع تقييمات الطلاب
   */
  getAllAssessments: async (): Promise<Assessment[]> => {
    try {
      const { data, error } = await supabase
        .from(ASSESSMENTS_TABLE)
        .select(`
          *,
          student:student_id (
            id, 
            full_name, 
            guardian:guardian_id(id, full_name, phone_number)
          ),
          recorder:recorded_by (id, full_name, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('خطأ في استرجاع تقييمات الطلاب:', error);
      return [];
    }
  },

  /**
   * استرجاع تقييمات طالب محدد
   */
  getAssessmentsByStudentId: async (studentId: string): Promise<Assessment[]> => {
    try {
      const { data, error } = await supabase
        .from(ASSESSMENTS_TABLE)
        .select(`
          *,
          student:student_id (
            id, 
            full_name, 
            guardian:guardian_id(id, full_name, phone_number)
          ),
          recorder:recorded_by (id, full_name, role)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('خطأ في استرجاع تقييمات الطالب:', error);
      return [];
    }
  },

  /**
   * استرجاع تقييمات معلم محدد
   */
  getAssessmentsByTeacher: async (teacherId: string): Promise<Assessment[]> => {
    try {
      console.log('Fetching assessments for teacher:', teacherId);
      
      const { data, error } = await supabase
        .from(ASSESSMENTS_TABLE)
        .select(`
          *,
          student:student_id (
            id, 
            full_name, 
            guardian:guardian_id(id, full_name, phone_number)
          ),
          recorder:recorded_by (id, full_name, role)
        `)
        .eq('recorded_by', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} assessments for teacher ${teacherId}`);
      return data || [];
    } catch (error) {
      console.error('خطأ في استرجاع تقييمات المعلم:', error);
      return [];
    }
  },

  /**
   * استرجاع تقييم محدد بواسطة المعرف
   */
  getAssessmentById: async (id: number): Promise<Assessment | null> => {
    try {
      const { data, error } = await supabase
        .from(ASSESSMENTS_TABLE)
        .select(`
          *,
          student:student_id (id, full_name),
          recorder:recorded_by (id, full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('خطأ في استرجاع التقييم:', error);
      return null;
    }
  },

  /**
   * إنشاء تقييم جديد
   */
  createAssessment: async (assessment: AssessmentCreate): Promise<Assessment> => {
    try {
      // حساب الدرجة الكلية إذا كانت غير موجودة
      if (
        assessment.tajweed_score !== undefined &&
        assessment.memorization_score !== undefined &&
        assessment.recitation_score !== undefined &&
        assessment.total_score === undefined
      ) {
        assessment.total_score = (
          (assessment.tajweed_score || 0) +
          (assessment.memorization_score || 0) +
          (assessment.recitation_score || 0)
        ) / 3; // متوسط الدرجات
      }

      const { data, error } = await supabaseAdmin
        .from(ASSESSMENTS_TABLE)
        .insert([assessment])
        .select(`
          *,
          student:student_id (id, full_name),
          recorder:recorded_by (id, full_name)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('خطأ في إنشاء تقييم جديد:', error);
      throw error;
    }
  },

  /**
   * تحديث تقييم موجود
   */
  updateAssessment: async (assessment: AssessmentUpdate): Promise<Assessment> => {
    try {
      const { id, ...updateData } = assessment;

      // حساب الدرجة الكلية إذا كانت غير موجودة
      if (
        updateData.tajweed_score !== undefined &&
        updateData.memorization_score !== undefined &&
        updateData.recitation_score !== undefined &&
        updateData.total_score === undefined
      ) {
        updateData.total_score = (
          (updateData.tajweed_score || 0) +
          (updateData.memorization_score || 0) +
          (updateData.recitation_score || 0)
        ) / 3; // متوسط الدرجات
      }

      const { data, error } = await supabaseAdmin
        .from(ASSESSMENTS_TABLE)
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          student:student_id (id, full_name),
          recorder:recorded_by (id, full_name)
        `)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('خطأ في تحديث التقييم:', error);
      throw error;
    }
  },

  /**
   * حذف تقييم
   */
  deleteAssessment: async (id: number): Promise<void> => {
    try {
      const { error } = await supabaseAdmin
        .from(ASSESSMENTS_TABLE)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('خطأ في حذف التقييم:', error);
      throw error;
    }
  }
};
