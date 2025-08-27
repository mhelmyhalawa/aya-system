import { supabase } from './supabase-client';
import type { MemorizationRecord, MemorizationRecordCreate, MemorizationRecordUpdate } from '../types/memorization-record';

export class MemorizationRecordService {
  private static instance: MemorizationRecordService;
  private tableName = 'memorization_records';

  private constructor() {}

  public static getInstance(): MemorizationRecordService {
    if (!MemorizationRecordService.instance) {
      MemorizationRecordService.instance = new MemorizationRecordService();
    }
    return MemorizationRecordService.instance;
  }

  /**
   * اختبار الاتصال بالجدول
   */
  public async testConnection(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error testing memorization records table:', error);
        return false;
      }
      
      console.log('Memorization records table is accessible, count:', count);
      return true;
    } catch (error) {
      console.error('Error in testConnection:', error);
      return false;
    }
  }

  /**
   * الحصول على جميع سجلات الحفظ والمراجعة
   */
  public async getAllMemorizationRecords(): Promise<MemorizationRecord[]> {
    try {
      console.log('Fetching all memorization records...');
      
      // محاولة جلب البيانات مع الربط
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          student:student_id (
            id,
            full_name,
            grade_level,
            study_circle:study_circle_id (
              id,
              name
            ),
            guardian:guardian_id (
              id,
              full_name,
              phone_number
            )
          ),
          recorder:recorded_by (
            id,
            full_name,
            role
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase error fetching memorization records with joins:', error);
        
        // في حال فشل الربط، جرب جلب البيانات الأساسية فقط
        console.log('Trying to fetch basic data without joins...');
        const { data: basicData, error: basicError } = await supabase
          .from(this.tableName)
          .select('*')
          .order('date', { ascending: false });
          
        if (basicError) {
          console.error('Error fetching basic memorization records:', basicError);
          throw basicError;
        }
        
        console.log('Successfully fetched basic memorization records:', basicData?.length || 0, 'records');
        return basicData as MemorizationRecord[];
      }

      console.log('Successfully fetched memorization records with joins:', data?.length || 0, 'records');
      return data as MemorizationRecord[];
    } catch (error) {
      console.error('Unexpected error in getAllMemorizationRecords:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجلات الحفظ والمراجعة لطالب محدد
   */
  public async getMemorizationRecordsByStudentId(studentId: string): Promise<MemorizationRecord[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        student:student_id (
          id,
          full_name,
          grade_level,
          guardian:guardian_id (
            id,
            full_name,
            phone_number
          )
        ),
        recorder:recorded_by (
          id,
          full_name
        )
      `)
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (error) {
      console.error(`Error fetching memorization records for student ${studentId}:`, error);
      throw error;
    }

    return data as MemorizationRecord[];
  }

  /**
   * الحصول على سجلات الحفظ والمراجعة بواسطة معلم محدد
   */
  public async getMemorizationRecordsByTeacher(teacherId: string): Promise<MemorizationRecord[]> {
    try {
      console.log('Fetching memorization records for teacher:', teacherId);
      
      // جلب السجلات المسجلة بواسطة المستخدم مباشرة
      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          student:student_id (
            id,
            full_name,
            grade_level,
            study_circle:study_circle_id (
              id,
              name
            ),
            guardian:guardian_id (
              id,
              full_name,
              phone_number
            )
          ),
          recorder:recorded_by (
            id,
            full_name,
            role
          )
        `)
        .eq('recorded_by', teacherId)
        .order('date', { ascending: false });

      if (error) {
        console.error(`Error fetching memorization records for teacher ${teacherId}:`, error);
        throw error;
      }

      console.log(`Found ${data.length} memorization records for teacher ${teacherId}`);
      return data as MemorizationRecord[];
    } catch (error) {
      console.error(`Unexpected error in getMemorizationRecordsByTeacher for ${teacherId}:`, error);
      return [];
    }
  }

  /**
   * الحصول على سجل حفظ ومراجعة بواسطة المعرف
   */
  public async getMemorizationRecordById(id: number): Promise<MemorizationRecord | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        student:student_id (
          id,
          full_name,
          grade_level,
          study_circle:study_circle_id (
            id,
            name
          )
        ),
        recorder:recorded_by (
          id,
          full_name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching memorization record ${id}:`, error);
      throw error;
    }

    return data as MemorizationRecord;
  }

  /**
   * إنشاء سجل حفظ ومراجعة جديد
   */
  public async createMemorizationRecord(record: MemorizationRecordCreate): Promise<MemorizationRecord> {
    try {
      // First, insert the record
      const { data: insertedData, error: insertError } = await supabase
        .from(this.tableName)
        .insert(record)
        .select()
        .maybeSingle();
      
      if (insertError) {
        console.error('Error inserting memorization record:', insertError);
        throw insertError;
      }
      
      if (!insertedData) {
        throw new Error('Failed to insert memorization record, no data returned');
      }
      
      // Then fetch the complete record with relations
      const { data: fullData, error: fetchError } = await supabase
        .from(this.tableName)
        .select(`
          *,
          student:student_id (
            id,
            full_name,
            grade_level,
            study_circle:study_circle_id (
              id,
              name
            ),
            guardian:guardian_id (
              id,
              full_name,
              phone_number
            )
          ),
          recorder:recorded_by (
            id,
            full_name,
            role
          )
        `)
        .eq('id', insertedData.id)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error fetching complete memorization record:', fetchError);
        // Return the basic record if we can't fetch the complete one
        return insertedData as MemorizationRecord;
      }
      
      return (fullData || insertedData) as MemorizationRecord;
    } catch (error) {
      console.error('Error in createMemorizationRecord:', error);
      throw error;
    }
  }

  /**
   * تحديث سجل حفظ ومراجعة موجود
   */
  public async updateMemorizationRecord(record: MemorizationRecordUpdate): Promise<MemorizationRecord> {
    try {
      const { id, ...updateData } = record;
      
      
      // First, check if the record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .maybeSingle();
      
      if (checkError) {
        console.error(`Error checking if memorization record ${id} exists:`, checkError);
        throw checkError;
      }
      
      if (!existingRecord) {
        console.error(`Memorization record with ID ${id} does not exist`);
        throw new Error(`Memorization record with ID ${id} does not exist`);
      }


    const { data: updatedData, error: updateError, status, statusText } = await supabase
    .from(this.tableName)
    .update(updateData)
    .eq('id', id)
    .select('*')
    .maybeSingle();


      console.log(`Update response for record ${id}:`, { data: updatedData, error: updateError });
      
      if (updateError) {
        console.error(`Error updating memorization record ${id}:`, updateError);
        throw updateError;
      }
      
      // If no data is returned from the update, use the existing record data or refetch
      let basicData = updatedData;
      
      // دائماً نقوم بإعادة جلب السجل بعد التحديث للتأكد من الحصول على أحدث البيانات
      console.log(`Re-fetching data for record ${id} after update`);
      const { data: refetchedData, error: refetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (refetchError) {
        console.error(`Error refetching basic record data for ${id}:`, refetchError);
        // سنستخدم البيانات الأساسية التي لدينا بالفعل إذا فشلت إعادة الجلب
        if (basicData) {
          console.log(`Using updatedData from previous response for ${id}`);
        } else {
          throw refetchError;
        }
      } else if (refetchedData) {
        console.log(`Successfully re-fetched data for record ${id}`, refetchedData);
        basicData = refetchedData;
      } else {
        console.error(`Could not find updated record with ID ${id} during refetch`);
        if (!basicData) {
          throw new Error(`Record with ID ${id} not found after update`);
        }
      }
      
      // Finally, fetch the complete record with relations
      console.log(`Fetching complete record data with joins for ${id}`);
      const { data: fullData, error: fetchError } = await supabase
        .from(this.tableName)
        .select(`
          *,
          student:student_id (
            id,
            full_name,
            grade_level,
            study_circle:study_circle_id (
              id,
              name
            ),
            guardian:guardian_id (
              id,
              full_name,
              phone_number
            )
          ),
          recorder:recorded_by (
            id,
            full_name,
            role
          )
        `)
        .eq('id', id)
        .maybeSingle();
      
      console.log(`Complete record fetch response for ${id}:`, { 
        success: !fetchError, 
        hasData: !!fullData,
        dataStructure: fullData ? Object.keys(fullData) : null
      });
      
      if (fetchError) {
        console.error(`Error fetching complete memorization record ${id}:`, fetchError);
        // Debug output: let's log what data we have at this point
        console.log(`Debug: basicData available for ID ${id}:`, !!basicData);
        // Return the basic record if we can't fetch the complete one
        return basicData as MemorizationRecord;
      }
      
      if (!fullData) {
        console.warn(`No full data returned for memorization record ${id}, using basic data`);
        return basicData as MemorizationRecord;
      }
      
      console.log(`Successfully updated memorization record ${id} with complete data`);
      return fullData as MemorizationRecord;
    } catch (error) {
      console.error(`Error in updateMemorizationRecord for ID ${record.id}:`, error);
      throw error;
    }
  }

  /**
   * حذف سجل حفظ ومراجعة
   */
  public async deleteMemorizationRecord(id: number): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting memorization record ${id}:`, error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الحفظ للطالب
   */
  public async getStudentMemorizationStats(studentId: string): Promise<{
    totalNew: number;
    totalReview: number;
    totalSabqi: number;
    avgScore: number;
  }> {
    // جلب جميع سجلات الطالب
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('student_id', studentId);

    if (error) {
      console.error(`Error fetching memorization stats for student ${studentId}:`, error);
      throw error;
    }

    const records = data as MemorizationRecord[];
    
    // حساب الإحصائيات
    const totalNew = records.filter(r => r.type === 'new').length;
    const totalReview = records.filter(r => r.type === 'review').length;
    const totalSabqi = records.filter(r => r.type === 'sabqi').length;
    
    // حساب متوسط الدرجات
    const scoresWithValues = records.filter(r => r.score !== undefined && r.score !== null);
    const avgScore = scoresWithValues.length > 0 
      ? scoresWithValues.reduce((sum, r) => sum + (r.score || 0), 0) / scoresWithValues.length
      : 0;

    return {
      totalNew,
      totalReview,
      totalSabqi,
      avgScore
    };
  }
}

// تصدير نسخة فردية من الخدمة
export const memorizationRecordService = MemorizationRecordService.getInstance();
