// خدمة قاعدة بيانات Supabase لإدارة أولياء الأمور
// توفر واجهة للتعامل مع جدول guardians

import { supabase, supabaseAdmin, GUARDIANS_TABLE } from './supabase-client';
import type { Guardian, GuardianCreate, GuardianUpdate } from '@/types/guardian';
import { mapGuardianToSupabase, mapSupabaseToGuardian, mapSupabaseResultsToGuardians } from './supabase-mapper';

/**
 * الحصول على ولي الأمر بواسطة المعرف
 */
export const getGuardianById = async (id: string): Promise<Guardian | null> => {
  try {
    const { data, error } = await supabase
      .from(GUARDIANS_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('خطأ في استرجاع ولي الأمر:', error);
      return null;
    }
    
    return data ? mapSupabaseToGuardian(data) : null;
  } catch (error) {
    console.error('خطأ في استرجاع ولي الأمر:', error);
    return null;
  }
};

/**
 * استرجاع جميع أولياء الأمور
 */
export const getAllGuardians = async (): Promise<(Guardian & { students_count: number })[]> => {
  try {
    console.log('Fetching all guardians from table:', GUARDIANS_TABLE);
    
    // تعديل الاستعلام للتأكد من الحصول على جميع البيانات مع فرز حسب تاريخ الإنشاء تنازلياً
    const { data, error } = await supabase
      .from(GUARDIANS_TABLE)
      .select(`
        *,
        students:students(id)
      `);
    
    if (error) {
      console.error('خطأ في استرجاع أولياء الأمور:', error);
      return [];
    }
    
    console.log('Guardians fetched from database:', data ? data.length : 0, 'records');
    if (data && data.length > 0) {
      console.log('First guardian record:', data[0]);
    } else {
      console.log('No guardian records found in database');
      // التحقق من وجود الجدول
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      console.log('Available tables:', tables);
    }
    
    // إضافة عدد الطلاب لكل ولي أمر + إزالة التكرار حسب المعرف (في حال رجع الاستعلام بسجلات مكررة)
    const mapped = data.map(guardian => ({
      ...guardian,
      students_count: guardian.students ? guardian.students.length : 0
    }));
    const uniqueById = Array.from(new Map(mapped.map(g => [g.id, g])).values());
    if (mapped.length !== uniqueById.length) {
      console.warn('تمت إزالة تكرارات في أولياء الأمور:', mapped.length - uniqueById.length);
    }
    return uniqueById;
  } catch (error) {
    console.error('خطأ في استرجاع أولياء الأمور:', error);
    return [];
  }
};

/**
 * إضافة ولي أمر جديد
 */
export const addGuardian = async (guardian: GuardianCreate): Promise<{ success: boolean, id?: string, message?: string }> => {
  try {
    // Always generate a new UUID for consistency
    const guardianId = crypto.randomUUID();
    guardian.id = guardianId;
    
    const formattedGuardian = mapGuardianToSupabase(guardian);
    console.log('Attempting to add guardian with data:', formattedGuardian);
    
    // Make sure we're using the correct table name
    console.log('Using table:', GUARDIANS_TABLE);
    
    const { data, error } = await supabaseAdmin
      .from(GUARDIANS_TABLE)
      .insert([formattedGuardian])
      .select();
    
    if (error) {
      console.error('خطأ في إضافة ولي الأمر:', error);
      return {
        success: false,
        message: `فشل في إضافة ولي الأمر: ${error.message}`
      };
    }
    
    console.log('Guardian added successfully, response data:', data);
    
    // Double check that the guardian was actually created
    setTimeout(() => {
      // Non-blocking verification
      supabase
        .from(GUARDIANS_TABLE)
        .select('*')
        .eq('id', guardianId)
        .then(({ data, error }) => {
          if (error) {
            console.error('Verification error:', error);
          } else {
            console.log('Verification check found guardian:', data);
          }
        });
    }, 500);
    
    return {
      success: true,
      id: guardianId,
      message: 'تم إضافة ولي الأمر بنجاح'
    };
  } catch (error) {
    console.error('خطأ في إضافة ولي الأمر:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إضافة ولي الأمر'
    };
  }
};

/**
 * تحديث بيانات ولي الأمر
 */
export const updateGuardian = async (guardian: GuardianUpdate): Promise<{ success: boolean, message?: string }> => {
  try {
    if (!guardian.id) {
      return {
        success: false,
        message: 'معرف ولي الأمر مطلوب للتحديث'
      };
    }
    
    const { error } = await supabaseAdmin
      .from(GUARDIANS_TABLE)
      .update(guardian)
      .eq('id', guardian.id);
    
    if (error) {
      console.error('خطأ في تحديث بيانات ولي الأمر:', error);
      return {
        success: false,
        message: `فشل في تحديث بيانات ولي الأمر: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم تحديث بيانات ولي الأمر بنجاح'
    };
  } catch (error) {
    console.error('خطأ في تحديث بيانات ولي الأمر:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تحديث بيانات ولي الأمر'
    };
  }
};

/**
 * البحث عن أولياء الأمور
 */
export const searchGuardians = async (searchTerm: string): Promise<Guardian[]> => {
  try {
    if (!searchTerm) {
      return await getAllGuardians();
    }
    
    const { data, error } = await supabase
      .from(GUARDIANS_TABLE)
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    
    if (error) {
      console.error('خطأ في البحث عن أولياء الأمور:', error);
      return [];
    }
    
    return mapSupabaseResultsToGuardians(data || []);
  } catch (error) {
    console.error('خطأ في البحث عن أولياء الأمور:', error);
    return [];
  }
};

/**
 * حذف ولي الأمر
 */
export const deleteGuardian = async (id: string): Promise<{ success: boolean, message?: string }> => {
  try {
    const { error } = await supabaseAdmin
      .from(GUARDIANS_TABLE)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('خطأ في حذف ولي الأمر:', error);
      return {
        success: false,
        message: `فشل في حذف ولي الأمر: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: 'تم حذف ولي الأمر بنجاح'
    };
  } catch (error) {
    console.error('خطأ في حذف ولي الأمر:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء حذف ولي الأمر'
    };
  }
};

/**
 * تصدير أولياء الأمور إلى JSON
 */
export const exportGuardiansToJson = async (): Promise<{ success: boolean, data?: Guardian[], message?: string }> => {
  try {
    const guardians = await getAllGuardians();
    
    return {
      success: true,
      data: guardians
    };
  } catch (error) {
    console.error('خطأ في تصدير أولياء الأمور:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تصدير بيانات أولياء الأمور'
    };
  }
};
