// خدمة التخزين المحلي للمتصفح
// هذا بديل لخدمة الملفات المحلية في بيئة المتصفح

/**
 * حفظ البيانات في التخزين المحلي للمتصفح
 * @param key مفتاح التخزين
 * @param data البيانات المراد تخزينها
 */
export const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('خطأ في حفظ البيانات في التخزين المحلي:', error);
    return false;
  }
};

/**
 * قراءة البيانات من التخزين المحلي للمتصفح
 * @param key مفتاح التخزين
 * @param defaultValue القيمة الافتراضية إذا لم توجد بيانات
 */
export const getFromLocalStorage = (key: string, defaultValue: any = null) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('خطأ في قراءة البيانات من التخزين المحلي:', error);
    return defaultValue;
  }
};

/**
 * حفظ بيانات الطالب في التخزين المحلي
 * @param studentData بيانات الطالب
 */
export const saveStudentToLocalStorage = (studentData: any) => {
  try {
    // قراءة البيانات الحالية
    const students = getFromLocalStorage('students', []);
    
    // إضافة معرف فريد للطالب
    const newStudent = {
      ...studentData,
      id: `local-${Date.now()}`,
      registrationDate: studentData.registrationDate || new Date().toISOString().split('T')[0]
    };
    
    // إضافة الطالب الجديد إلى المصفوفة
    students.push(newStudent);
    
    // حفظ البيانات المحدثة
    saveToLocalStorage('students', students);
    
    return { success: true, studentId: newStudent.id };
  } catch (error) {
    console.error('خطأ في حفظ بيانات الطالب محليًا:', error);
    throw new Error('فشل في حفظ بيانات الطالب محليًا');
  }
};

/**
 * قراءة بيانات الطلاب من التخزين المحلي
 */
export const getStudentsFromLocalStorage = () => {
  return getFromLocalStorage('students', []);
};
