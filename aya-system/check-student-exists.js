// دالة للتحقق من وجود طالب بناءً على بعض الحقول المحددة (الاسم، اسم الأب، رقم الهاتف)
function checkStudentExists(sheet, studentData) {
  // التحقق من وجود بيانات أو ورقة العمل
  if (!sheet || !studentData) return false;
  
  // الحصول على جميع البيانات من ورقة العمل
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // التحقق من وجود بيانات (أكثر من صف الرؤوس)
  if (values.length <= 1) return false;
  
  // استخراج الرؤوس
  const headers = values[0];
  
  // تحديد مؤشرات الأعمدة المهمة للمقارنة
  const nameIndex = headers.indexOf('name');
  const fatherNameIndex = headers.indexOf('fatherName');
  const phoneIndex = headers.indexOf('parentPhone');
  
  // التحقق من وجود الأعمدة المطلوبة
  if (nameIndex === -1 || fatherNameIndex === -1 || phoneIndex === -1) return false;
  
  // البحث عن طالب موجود بناءً على مزيج من الاسم واسم الأب ورقم الهاتف
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    
    // المقارنة باستخدام الاسم واسم الأب ورقم الهاتف
    if (row[nameIndex] === studentData.name && 
        row[fatherNameIndex] === studentData.fatherName && 
        row[phoneIndex] === studentData.parentPhone) {
      // وجدنا تطابق
      return {
        exists: true,
        rowIndex: i + 1, // صف مستند 1 (الصف الأول هو 1 وليس 0)
        studentId: row[headers.indexOf('id')] || ''
      };
    }
  }
  
  // لم يتم العثور على تطابق
  return { exists: false };
}
