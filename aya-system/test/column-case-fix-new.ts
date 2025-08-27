// إجراءات إصلاح مشكلة حساسية أسماء الأعمدة في Supabase لهيكل البيانات الجديد

/**
 * ملخص التغييرات:
 * 
 * 1. تحديث نماذج البيانات (interfaces) لتتوافق مع الجداول الجديدة
 * 2. تحديث دوال التحويل للتعامل مع الحقول الجديدة
 * 3. تحديث خدمات API للعمل مع الهيكل الجديد
 * 4. تحديث الواجهة الأمامية لعرض وتحرير البيانات الجديدة
 */

/**
 * 1. دوال التحويل في ملف supabase-mapper.ts
 * يجب أن تتضمن دوال لكل نوع من البيانات:
 */

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

/**
 * 2. تحديث خدمة الطلاب للتعامل مع الهيكل الجديد
 */

// تحديث دالة البحث عن الطلاب:
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

// التحقق من وجود طالب مكرر:
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
 * 3. تحديثات للمكونات والواجهة الأمامية
 * 
 * - تحديث نماذج الإدخال لتطابق الحقول الجديدة
 * - تحديث شاشات عرض البيانات لعرض الحقول الجديدة
 * - تحديث عمليات البحث والفرز لاستخدام الحقول الجديدة
 */

// مثال لنموذج إنشاء طالب:
// يجب تحديث هذا في المكون الذي يستخدم نموذج إنشاء طالب

const createStudentExample = () => {
  const [student, setStudent] = useState<StudentCreate>({
    full_name: '',
    guardian_id: undefined,
    current_teacher_id: undefined,
    date_of_birth: undefined,
    gender: 'male',
    phone_number: undefined,
    email: undefined,
    enrollment_date: new Date().toISOString().split('T')[0],
    grade_level: undefined,
    notes: undefined
  });

  // بقية الشيفرة...
};

/**
 * 4. تحديث عمليات الاستعلام المتقدمة للعمل مع العلاقات الجديدة
 * 
 * - استعلامات للحصول على بيانات الطالب مع المعلم وولي الأمر
 * - استعلامات للحصول على تاريخ المعلمين للطالب
 * - استعلامات للحصول على الجلسات والمتابعات اليومية
 */

// مثال للحصول على بيانات الطالب مع بيانات المعلم وولي الأمر:
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
 * 5. تلخيص الخطوات اللازمة للتحديث
 * 
 * 1. تحديث ملفات النماذج (types/*.ts) بالهياكل الجديدة
 * 2. تحديث ملف supabase-mapper.ts لتتناسب دوال التحويل مع الهياكل الجديدة
 * 3. تحديث خدمات API للعمل مع الهياكل الجديدة
 * 4. تحديث المكونات في الواجهة الأمامية
 * 5. اختبار النظام الكامل للتأكد من عمله بشكل صحيح
 */
