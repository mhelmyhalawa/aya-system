// خدمة قاعدة بيانات IndexedDB
// قاعدة بيانات متقدمة مدمجة في المتصفح

/**
 * اسم قاعدة البيانات
 */
const DB_NAME = 'ketama_aya_db';

/**
 * إصدار قاعدة البيانات
 */
const DB_VERSION = 1;

/**
 * أسماء جداول قاعدة البيانات
 */
const STORES = {
  STUDENTS: 'students'
};

/**
 * فتح اتصال بقاعدة البيانات
 */
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // إنشاء جداول قاعدة البيانات عند الحاجة
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // إنشاء جدول الطلاب إذا لم يكن موجودًا
      if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
        const studentsStore = db.createObjectStore(STORES.STUDENTS, { keyPath: 'id' });
        
        // إنشاء فهارس للبحث السريع
        studentsStore.createIndex('name', 'name', { unique: false });
        studentsStore.createIndex('fatherName', 'fatherName', { unique: false });
        studentsStore.createIndex('parentPhone', 'parentPhone', { unique: false });
        studentsStore.createIndex('grade', 'grade', { unique: false });
        studentsStore.createIndex('memorizedParts', 'memorizedParts', { unique: false });
        
        console.log('تم إنشاء جدول الطلاب في قاعدة البيانات');
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('خطأ في فتح قاعدة البيانات:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * إضافة طالب جديد إلى قاعدة البيانات
 */
export const addStudent = async (student: any): Promise<{success: boolean, id: string, message?: string}> => {
  try {
    const db = await openDatabase();
    
    // إضافة معرف فريد ووقت التسجيل
    const newStudent = {
      ...student,
      id: student.id || `db-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      registrationDate: student.registrationDate || new Date().toISOString().split('T')[0]
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.STUDENTS], 'readwrite');
      const store = transaction.objectStore(STORES.STUDENTS);
      
      const request = store.add(newStudent);
      
      request.onsuccess = () => {
        resolve({
          success: true,
          id: newStudent.id,
          message: 'تم إضافة الطالب بنجاح'
        });
      };
      
      request.onerror = (event) => {
        console.error('خطأ في إضافة الطالب:', (event.target as IDBRequest).error);
        resolve({
          success: false,
          id: '',
          message: 'فشل في إضافة الطالب'
        });
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('خطأ في إضافة الطالب:', error);
    return {
      success: false,
      id: '',
      message: 'حدث خطأ أثناء التواصل مع قاعدة البيانات'
    };
  }
};

/**
 * البحث عن طالب بواسطة معرف
 */
export const getStudentById = async (id: string): Promise<any> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.STUDENTS], 'readonly');
      const store = transaction.objectStore(STORES.STUDENTS);
      
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      
      request.onerror = (event) => {
        console.error('خطأ في البحث عن الطالب:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('خطأ في البحث عن الطالب:', error);
    return null;
  }
};

/**
 * الحصول على جميع الطلاب
 */
export const getAllStudents = async (): Promise<any[]> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.STUDENTS], 'readonly');
      const store = transaction.objectStore(STORES.STUDENTS);
      
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
      
      request.onerror = (event) => {
        console.error('خطأ في استرجاع الطلاب:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('خطأ في استرجاع الطلاب:', error);
    return [];
  }
};

/**
 * تحديث بيانات طالب
 */
export const updateStudent = async (student: any): Promise<{success: boolean, message?: string}> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.STUDENTS], 'readwrite');
      const store = transaction.objectStore(STORES.STUDENTS);
      
      const request = store.put(student);
      
      request.onsuccess = () => {
        resolve({
          success: true,
          message: 'تم تحديث بيانات الطالب بنجاح'
        });
      };
      
      request.onerror = (event) => {
        console.error('خطأ في تحديث بيانات الطالب:', (event.target as IDBRequest).error);
        resolve({
          success: false,
          message: 'فشل في تحديث بيانات الطالب'
        });
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('خطأ في تحديث بيانات الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء التواصل مع قاعدة البيانات'
    };
  }
};

/**
 * حذف طالب من قاعدة البيانات
 */
export const deleteStudent = async (id: string): Promise<{success: boolean, message?: string}> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.STUDENTS], 'readwrite');
      const store = transaction.objectStore(STORES.STUDENTS);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve({
          success: true,
          message: 'تم حذف الطالب بنجاح'
        });
      };
      
      request.onerror = (event) => {
        console.error('خطأ في حذف الطالب:', (event.target as IDBRequest).error);
        resolve({
          success: false,
          message: 'فشل في حذف الطالب'
        });
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('خطأ في حذف الطالب:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء التواصل مع قاعدة البيانات'
    };
  }
};

/**
 * البحث عن طلاب بواسطة خصائص محددة
 */
export const searchStudents = async (criteria: { [key: string]: any }): Promise<any[]> => {
  try {
    const allStudents = await getAllStudents();
    
    // تصفية الطلاب حسب المعايير المقدمة
    return allStudents.filter(student => {
      return Object.entries(criteria).every(([key, value]) => {
        if (!value) return true; // تجاهل القيم الفارغة
        
        // البحث في الحقول النصية
        if (typeof student[key] === 'string' && typeof value === 'string') {
          return student[key].includes(value);
        }
        
        // مقارنة دقيقة للحقول الأخرى
        return student[key] === value;
      });
    });
  } catch (error) {
    console.error('خطأ في البحث عن الطلاب:', error);
    return [];
  }
};

/**
 * التحقق من وجود طالب مكرر
 */
export const isStudentDuplicate = async (student: any): Promise<boolean> => {
  try {
    const allStudents = await getAllStudents();
    
    // البحث عن طالب موجود بناءً على مزيج من الاسم واسم الأب ورقم الهاتف
    return allStudents.some(existingStudent => 
      existingStudent.name === student.name &&
      existingStudent.fatherName === student.fatherName &&
      existingStudent.parentPhone === student.parentPhone
    );
  } catch (error) {
    console.error('خطأ في التحقق من وجود طالب مكرر:', error);
    return false;
  }
};

/**
 * استيراد بيانات من LocalStorage إلى IndexedDB
 */
export const importFromLocalStorage = async (): Promise<{success: boolean, count: number, message?: string}> => {
  try {
    // استرجاع البيانات من التخزين المحلي
    const localData = localStorage.getItem('students');
    if (!localData) {
      return {
        success: true,
        count: 0,
        message: 'لا توجد بيانات في التخزين المحلي'
      };
    }
    
    const students = JSON.parse(localData);
    if (!Array.isArray(students) || students.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'لا توجد بيانات طلاب في التخزين المحلي'
      };
    }
    
    // إضافة الطلاب إلى قاعدة البيانات
    const db = await openDatabase();
    const transaction = db.transaction([STORES.STUDENTS], 'readwrite');
    const store = transaction.objectStore(STORES.STUDENTS);
    
    let successCount = 0;
    
    return new Promise((resolve) => {
      students.forEach((student, index) => {
        // التأكد من وجود معرف
        if (!student.id) {
          student.id = `imported-${Date.now()}-${index}`;
        }
        
        const request = store.put(student);
        
        request.onsuccess = () => {
          successCount++;
        };
        
        request.onerror = (event) => {
          console.error('خطأ في استيراد الطالب:', (event.target as IDBRequest).error);
        };
      });
      
      transaction.oncomplete = () => {
        db.close();
        resolve({
          success: true,
          count: successCount,
          message: `تم استيراد ${successCount} من ${students.length} طالب بنجاح`
        });
      };
      
      transaction.onerror = (event) => {
        db.close();
        console.error('خطأ في استيراد البيانات:', (event.target as IDBTransaction).error);
        resolve({
          success: false,
          count: successCount,
          message: 'حدث خطأ أثناء استيراد البيانات'
        });
      };
    });
  } catch (error) {
    console.error('خطأ في استيراد البيانات من التخزين المحلي:', error);
    return {
      success: false,
      count: 0,
      message: 'حدث خطأ أثناء استيراد البيانات'
    };
  }
};

/**
 * تصدير البيانات إلى ملف JSON
 */
export const exportToJson = async (): Promise<{success: boolean, data?: string, message?: string}> => {
  try {
    const students = await getAllStudents();
    
    if (students.length === 0) {
      return {
        success: false,
        message: 'لا توجد بيانات للتصدير'
      };
    }
    
    const jsonData = JSON.stringify(students, null, 2);
    
    return {
      success: true,
      data: jsonData,
      message: `تم تصدير ${students.length} طالب بنجاح`
    };
  } catch (error) {
    console.error('خطأ في تصدير البيانات:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تصدير البيانات'
    };
  }
};

// تهيئة قاعدة البيانات عند تحميل الملف
openDatabase().catch(error => {
  console.error('فشل في تهيئة قاعدة البيانات:', error);
});

// استيراد البيانات من التخزين المحلي إلى IndexedDB
setTimeout(() => {
  importFromLocalStorage().then(result => {
    console.log('نتيجة استيراد البيانات من التخزين المحلي:', result.message);
  });
}, 2000);
