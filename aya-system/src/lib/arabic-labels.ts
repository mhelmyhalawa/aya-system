/**
 * ملف مخصص لتخزين النصوص والعناوين العربية المستخدمة في التطبيق
 * يساعد في الحفاظ على اتساق النصوص وتسهيل تغييرها وترجمتها مستقبلاً
 */

import { Circle } from "lucide-react";

// ==================== عناوين عامة ورسائل مشتركة ====================

// رسائل الخطأ والتنبيه العامة
export const errorMessages = {
  // عام
  generalError: "خطأ",
  generalWarning: "تنبيه",
  requiredField: "هذا الحقل مطلوب",
  invalidInput: "قيمة غير صالحة",
  
  // مصادقة وصلاحيات
  dataError: "خطأ في البيانات",
  searchError: "خطأ في البحث",
  missingCredentials: "يرجى إدخال اسم المستخدم وكلمة المرور",
  permissionError: "خطأ في الصلاحيات",
  accessDenied: "لا تملك صلاحيات للوصول إلى هذه الصفحة",
  incorrectRole: (actual: string, expected: string) => `لقد قمت بتسجيل الدخول كـ ${actual} وليس كـ ${expected}`,
  loginFailed: "فشل تسجيل الدخول",
  invalidCredentials: "اسم المستخدم أو كلمة المرور غير صحيحة",
  loginError: "حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى",
  
  // عمليات البيانات
  saveFailed: "فشل حفظ البيانات",
  deleteFailed: "فشل حذف البيانات",
  updateFailed: "فشل تحديث البيانات",
  fetchFailed: "فشل جلب البيانات",
  operationFailed: "فشلت العملية",
  connectionError: "خطأ في الاتصال بالخادم",
  databaseError: "خطأ في قاعدة البيانات",
  errorLoadingData: "فشل في تحميل البيانات",

  // رسائل سجلات الخطأ - Console Errors
  consoleLoginError: "خطأ في تسجيل الدخول:",
  consoleUserLoadError: "حدث خطأ أثناء تحميل المستخدمين:",
  consoleUserSaveError: "حدث خطأ أثناء حفظ بيانات المستخدم:",
  consoleExportDataError: "خطأ في تصدير البيانات:",
  consoleImportFileError: "خطأ في استيراد الملف:",
  consoleParsingJsonError: "خطأ في تحليل ملف JSON:",
  consoleStudentDetailsError: "خطأ في جلب تفاصيل الطالب:",
  consoleStudentSaveError: "خطأ في حفظ بيانات الطالب:",
  consoleEmailSendError: "فشل إرسال البريد الإلكتروني:",
  consoleStudentDataSubmitError: "خطأ أثناء تسجيل بيانات الطالب:",
  consoleStudentsFetchError: "خطأ في جلب بيانات الطلاب:",
  
  // رسائل خطأ التحقق
  invalidEmail: "بريد إلكتروني غير صالح",
  invalidPhone: "رقم هاتف غير صالح",
  invalidName: "اسم غير صالح",
  invalidDate: "تاريخ غير صالح",
  passwordMismatch: "كلمات المرور غير متطابقة",
  weakPassword: "كلمة المرور ضعيفة",
};

// رسائل النجاح العامة
export const successMessages = {
  // مصادقة
  loginSuccess: "تم تسجيل الدخول",
  welcome: (name: string) => `مرحبًا بك ${name}`,
  
  // عمليات البيانات
  saveSuccess: "تم حفظ البيانات بنجاح",
  deleteSuccess: "تم حذف البيانات بنجاح",
  updateSuccess: "تم تحديث البيانات بنجاح",
  operationSuccess: "تمت العملية بنجاح",
  
  // أخرى
  completed: "تم الإكمال بنجاح",
};

// أزرار ومكونات واجهة المستخدم العامة
export const commonLabels = {
  // الأزرار
  submit: "إرسال",
  save: "حفظ",
  cancel: "إلغاء",
  edit: "تعديل",
  delete: "حذف",
  add: "إضافة",
  close: "إغلاق",
  back: "رجوع",
  next: "التالي",
  previous: "السابق",
  confirm: "تأكيد",
  search: "بحث",
  filter: "تصفية",
  reset: "إعادة ضبط",
  refresh: "تحديث",
  download: "تنزيل",
  upload: "رفع",
  print: "طباعة",
  login: "تسجيل الدخول",
  logout: "تسجيل الخروج",
  
  // حالات العمليات
  loading: "جاري التحميل...",
  processing: "جاري المعالجة...",
  saving: "جاري الحفظ...",
  deleting: "جاري الحذف...",
  updating: "جاري التحديث...",
  
  // عناصر واجهة المستخدم
  menu: "القائمة",
  home: "الرئيسية",
  dashboard: "لوحة التحكم",
  settings: "الإعدادات",
  profile: "الملف الشخصي",
  
  // عام
  yes: "نعم",
  no: "لا",
  all: "الكل",
  none: "لا شيء",
  from: "من",
  to: "إلى",
  today: "اليوم",
  yesterday: "الأمس",
  tomorrow: "غداً",
  noData: "لا توجد بيانات",
  noResults: "لا توجد نتائج",
  moreInfo: "مزيد من المعلومات",
};

// ==================== نصوص خاصة بالشاشات ====================

// شاشة تسجيل الدخول
export const loginLabels = {
  title: "تسجيل الدخول",
  description: "مكتب آية - نظام إدارة مسابقة تحفيظ القرآن الكريم",
  userType: "نوع المستخدم",
  superadmin: "مدير",
  admin: "مشرف المكتب",
  teacher: "معلم",
  username: "اسم المستخدم",
  usernamePrompt: "أدخل اسم المستخدم",
  usernamePlaceholder: "أدخل اسم المستخدم",
  password: "كلمة المرور",
  passwordPrompt: "أدخل كلمة المرور",
  login: "تسجيل الدخول",
  loginInProgress: "جاري تسجيل الدخول...",
  processing: "جاري المعالجة...",
  changePasswordDescription: "أدخل اسم المستخدم وكلمة المرور الحالية لتغيير كلمة المرور الخاصة بك",
  loginInfoTitle: "تسجيل الدخول إلى النظام:",
  loginInfoMessage1: "يرجى استخدام بيانات الاعتماد التي تم توفيرها لك من قبل مدير.",
  loginInfoMessage2: "إذا كنت تواجه مشكلة في تسجيل الدخول، يرجى التواصل مع المشرف.",
  returnToHome: "العودة للصفحة الرئيسية"
};

// الصفحة الرئيسية
export const homeLabels = {
  title: "الصفحة الرئيسية",
  welcome: "مرحباً بك في نظام إدارة مسابقة تحفيظ القرآن الكريم",
  todayDate: "تاريخ اليوم",
  quickLinks: "روابط سريعة",
  statistics: "إحصائيات",
  recentActivities: "آخر النشاطات",
  announcement: "إعلانات",
};

// إدارة الطلاب
export const studentsLabels = {
  title: "إدارة الطلاب",
  description: "قم بإضافة وتعديل وعرض بيانات الطلاب",
  addStudent: "إضافة طالب جديد",
  editStudent: "تعديل بيانات الطالب",
  deleteStudent: "حذف الطالب",
  deleteSuccess: "تم حذف الطالب بنجاح",
  deleteConfirmation: "هل أنت متأكد من رغبتك في حذف هذا الطالب؟",
  deleteDescription: "سيؤدي هذا إلى حذف جميع سجلات الطالب من النظام بشكل نهائي.",
  confirm: "تأكيد الحذف",
  cancel: "إلغاء",
  unexpectedError: "حدث خطأ غير متوقع",
  fullName: "اسم الطالب/الطالبة",
  fullNameError: "اسم الطالب لا يجب أن يحتوي على مسافات",
  guardianName: "ولي الأمر",
  teacherName: "المعلم المتابع",
  teacherPlaceholder: "اختر المعلم المتابع",
  teacherForStudent: "هذا الطالب تحت إشراف المعلم:",
  studyCircleName: "الحلقة الدراسية",
  studyCirclePlaceholder: "اختر الحلقة الدراسية",
  grade: "الصف الدراسي",
  age: "العمر",
  dateOfBirth: "تاريخ الميلاد",
  lastQuranProgress: "آخر حفظ",
  quranProgressPlaceholder: "اختر آخر ما تم حفظه",
  phoneNumber: "رقم الهاتف",
  email: "البريد الإلكتروني",
  address: "ملاحظات",
  notes: "ملاحظات",
  actions: "الإجراءات",
  save: "حفظ",
  search: "بحث",
  searchPlaceholder: "البحث بالاسم أو رقم الهاتف",
  noStudents: "لا يوجد طلاب",
  addStudentPrompt: "قم بإضافة طالب جديد للبدء",
  loading: "جاري التحميل...",
  requiredField: "* حقل مطلوب",
  optionalField: "(اختياري)",
  updateSuccess: "تم تحديث بيانات الطالب بنجاح",
  addSuccess: "تم إضافة الطالب بنجاح",
  incompleteData: "بيانات غير مكتملة",
  incompleteDataMessage: "الرجاء تعبئة جميع الحقول المطلوبة",
  accessDenied: "ليس لديك صلاحية الوصول",
  accessDeniedMessage: "ليس لديك صلاحية للوصول لهذه الصفحة.",
  returnToHome: "العودة للصفحة الرئيسية",
  editTooltip: "تعديل",
  deleteTooltip: "حذف",
  viewTooltip: "عرض",
  noSearchResults: "لا توجد نتائج للبحث",
  tryAnotherSearch: "حاول تغيير كلمات البحث أو استخدام مصطلحات مختلفة",
  filters: "تصفية",
  export: "تصدير",
  refresh: "تحديث",
  totalStudents: "إجمالي الطلاب",
  showing: "عرض",
  from: "من أصل",
  student: "طالب",
  gender: "الجنس",
  genderOptions: [
    { value: "male", label: "ذكر" },
    { value: "female", label: "أنثى" }
  ],
  studentsList: "قائمة الطلاب",
  filterByGrade: "تصفية حسب الصف",
  filterByStatus: "تصفية حسب الحالة",
  name: "الاسم",
  parentName: "اسم ولي الأمر",
  phone: "رقم الهاتف",
  status: "الحالة",
  active: "نشط",
  inactive: "غير نشط",
  import: "استيراد البيانات",
  delete: "حذف",
  gradeOptions: [
    // مرحلة رياض الأطفال
    { value: "kg1", label: "رياض أطفال أولى (KG1)" },
    { value: "kg2", label: "رياض أطفال ثانية (KG2)" },    
    // المرحلة الابتدائية
    { value: "p1", label: "الصف الأول الابتدائي" },
    { value: "p2", label: "الصف الثاني الابتدائي" },
    { value: "p3", label: "الصف الثالث الابتدائي" },
    { value: "p4", label: "الصف الرابع الابتدائي" },
    { value: "p5", label: "الصف الخامس الابتدائي" },
    { value: "p6", label: "الصف السادس الابتدائي" },    
    // المرحلة الإعدادية
    { value: "m1", label: "الصف الأول الإعدادي" },
    { value: "m2", label: "الصف الثاني الإعدادي" },
    { value: "m3", label: "الصف الثالث الإعدادي" },    
    // المرحلة الثانوية
    { value: "h1", label: "الصف الأول الثانوي" },
    { value: "h2", label: "الصف الثاني الثانوي" },
    { value: "h3", label: "الصف الثالث الثانوي" },    
    // المرحلة الجامعية
    { value: "u1", label: "السنة الأولى الجامعية (الفرقة الأولى)" },
    { value: "u2", label: "السنة الثانية الجامعية (الفرقة الثانية)" },
    { value: "u3", label: "السنة الثالثة الجامعية (الفرقة الثالثة)" },
    { value: "u4", label: "السنة الرابعة الجامعية (الفرقة الرابعة)" },
    { value: "u5", label: "السنة الخامسة الجامعية (مثل الطب أو الصيدلة)" },
    { value: "u6", label: "السنة السادسة الجامعية (لبعض الكليات - طب مثلاً)" },   
    // الدراسات العليا
    { value: "pg", label: "دراسات عليا (تمهيدي ماجستير / دبلومة)" },
    { value: "ma", label: "ماجستير" },
    { value: "phd", label: "دكتوراه" },
    { value: "Other", label: "أخرى" }
  ],
  // خيارات أجزاء المصحف
  quranPartsOptions: [
    { value: "less_than_one", label: "أقل من جزء" },
    { value: "part_1", label: "الجزء الأول" },
    { value: "part_2", label: "الجزء الثاني" },
    { value: "part_3", label: "الجزء الثالث" },
    { value: "part_4", label: "الجزء الرابع" },
    { value: "part_5", label: "الجزء الخامس" },
    { value: "part_6", label: "الجزء السادس" },
    { value: "part_7", label: "الجزء السابع" },
    { value: "part_8", label: "الجزء الثامن" },
    { value: "part_9", label: "الجزء التاسع" },
    { value: "part_10", label: "الجزء العاشر" },
    { value: "part_11", label: "الجزء الحادي عشر" },
    { value: "part_12", label: "الجزء الثاني عشر" },
    { value: "part_13", label: "الجزء الثالث عشر" },
    { value: "part_14", label: "الجزء الرابع عشر" },
    { value: "part_15", label: "الجزء الخامس عشر" },
    { value: "part_16", label: "الجزء السادس عشر" },
    { value: "part_17", label: "الجزء السابع عشر" },
    { value: "part_18", label: "الجزء الثامن عشر" },
    { value: "part_19", label: "الجزء التاسع عشر" },
    { value: "part_20", label: "الجزء العشرون" },
    { value: "part_21", label: "الجزء الحادي والعشرون" },
    { value: "part_22", label: "الجزء الثاني والعشرون" },
    { value: "part_23", label: "الجزء الثالث والعشرون" },
    { value: "part_24", label: "الجزء الرابع والعشرون" },
    { value: "part_25", label: "الجزء الخامس والعشرون" },
    { value: "part_26", label: "الجزء السادس والعشرون" },
    { value: "part_27", label: "الجزء السابع والعشرون" },
    { value: "part_28", label: "الجزء الثامن والعشرون" },
    { value: "part_29", label: "الجزء التاسع والعشرون" },
    { value: "part_30", label: "الجزء الثلاثون" },
    { value: "complete", label: "حفظ القرآن الكريم كاملاً" }
  ]
};

// تسجيل طالب جديد
export const studentRegistrationLabels = {
  title: "تسجيل طالب جديد",
  personalInfo: "المعلومات الشخصية",
  parentInfo: "معلومات ولي الأمر",
  academicInfo: "المعلومات الدراسية",
  fullName: "الاسم الكامل",
  birthDate: "تاريخ الميلاد",
  gender: "الجنس",
  male: "ذكر",
  female: "أنثى",
  address: "العنوان",
  grade: "الصف الدراسي",
  school: "المدرسة",
  parentName: "اسم ولي الأمر",
  parentPhone: "رقم هاتف ولي الأمر",
  parentEmail: "البريد الإلكتروني لولي الأمر",
  relation: "صلة القرابة",
  father: "أب",
  mother: "أم",
  guardian: "وصي",
  submitRegistration: "تسجيل الطالب",
  resetForm: "إعادة تعيين النموذج",
  formDescription: "أدخل بيانات الطالب للتسجيل في مسابقة تحفيظ القرآن الكريم",
  studentName: "اسم الطالب",
  studentNamePlaceholder: "الاسم الكامل للطالب",
  parentNamePlaceholder: "اسم ولي الأمر",
  addressPlaceholder: "عنوان السكن",
  parentPhonePlaceholder: "0",
  gradeSelectionPlaceholder: "اختر المرحلة الدراسية",
  memorizedParts: "عدد الأجزاء المحفوظة سابقاً",
  memorizedPartsPlaceholder: "اختر عدد الأجزاء",
  noMemorizedParts: "لا يوجد",
  fullQuran: "القرآن كاملاً",
  parts: (count: number) => `${count} جزء`,
  cancel: "إلغاء",
  registering: "جاري التسجيل...",
  successTitle: "تم التسجيل بنجاح",
  successDescription: "تم تسجيل الطالب بنجاح في نظام مكتب آية",
  redirectMessage: "سيتم تحويلك إلى صفحة الطلاب تلقائياً بعد لحظات...",
  studentExists: "هذا الطالب موجود بالفعل في قاعدة البيانات.",
  registrationError: "حدث خطأ أثناء تسجيل الطالب. يرجى المحاولة مرة أخرى.",
  emailSendWarning: "تم تسجيل الطالب بنجاح، ولكن فشل إرسال البريد الإلكتروني",
};

// تفاصيل الطالب
export const studentDetailsLabels = {
  title: "تفاصيل الطالب",
  editDetails: "تعديل البيانات",
  deleteStudent: "حذف الطالب",
  personalInfo: "المعلومات الشخصية",
  parentInfo: "معلومات ولي الأمر",
  academicInfo: "المعلومات الدراسية",
  attendanceHistory: "سجل الحضور",
  achievementHistory: "سجل الإنجازات",
  name: "الاسم",
  id: "رقم الهوية",
  birthDate: "تاريخ الميلاد",
  gender: "الجنس",
  address: "العنوان",
  grade: "الصف",
  status: "الحالة",
  registrationDate: "تاريخ التسجيل",
  parentName: "اسم ولي الأمر",
  parentPhone: "رقم هاتف ولي الأمر",
  parentEmail: "البريد الإلكتروني لولي الأمر",
  relation: "صلة القرابة",
  notes: "ملاحظات",
  deleteConfirmation: "هل أنت متأكد من رغبتك في حذف هذا الطالب؟ لا يمكن التراجع عن هذه العملية.",
};

// إدارة المستخدمين
export const userManagementLabels = {
  title: "إدارة المستخدمين",
  addUser: "إضافة مستخدم جديد",
  usersList: "قائمة المستخدمين",
  searchPlaceholder: "البحث عن مستخدم...",
  filterByRole: "تصفية حسب الدور",
  username: "اسم المستخدم",
  fullName: "الاسم الكامل",
  role: "الدور",
  circleCount: "عدد الحلقات",
  lastLogin: "آخر تسجيل دخول",
  status: "الحالة",
  actions: "إجراءات",
  noUsers: "لا يوجد مستخدمين",
  active: "نشط",
  inactive: "غير نشط",
  superadmin: "مدير",
  admin: "مشرف المكتب",
  teacher: "معلم",
  addUserForm: {
    title: "إضافة مستخدم جديد",
    username: "اسم المستخدم",
    fullName: "الاسم الكامل",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    role: "الدور",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    status: "الحالة",
    submit: "إضافة المستخدم",
    cancel: "إلغاء",
  },
  editUserForm: {
    title: "تعديل بيانات المستخدم",
    submit: "تحديث البيانات",
    resetPassword: "إعادة تعيين كلمة المرور",
  },
  changePasswordForm: {
    title: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmNewPassword: "تأكيد كلمة المرور الجديدة",
    submit: "تغيير كلمة المرور",
    cancel: "إلغاء",
    success: "تم تغيير كلمة المرور بنجاح",
    error: "فشل تغيير كلمة المرور",
    incorrectPassword: "كلمة المرور الحالية غير صحيحة",
    passwordsMismatch: "كلمة المرور الجديدة غير متطابقة مع التأكيد"
  },
  deleteConfirmation: "هل أنت متأكد من رغبتك في حذف هذا المستخدم؟ لا يمكن التراجع عن هذه العملية.",
  description: "إدارة حسابات مشرفي النظام ومشرفي المكتب والمعلمين",
  superadmins: "مشرفي النظام",
  administrators: "مشرفي المكتب",
  teachers: "المعلمين",
  addNewSuperadmin: "إضافة مشرف نظام جديد",
  addNewAdmin: "إضافة مشرف مكتب جديد",
  addNewteacher: "إضافة معلم جديد",
  loading: "جاري تحميل البيانات...",
  noSuperadmins: "لا يوجد مشرفي نظام حالياً",
  noAdmins: "لا يوجد مشرفي مكتب حالياً",
  noteachers: "لا يوجد معلمين حالياً",
  addSuperadminText: "يمكنك إضافة مشرف نظام جديد باستخدام زر الإضافة",
  addAdminText: "يمكنك إضافة مشرف مكتب جديد باستخدام زر الإضافة",
  addteacherText: "يمكنك إضافة معلم جديد باستخدام زر الإضافة",
  accessDenied: "غير مصرح بالوصول",
  accessDeniedMessage: "ليس لديك صلاحية للوصول إلى هذه الصفحة.",
  returnToHome: "العودة للصفحة الرئيسية",
  incompleteData: "بيانات غير مكتملة",
  incompleteDataMessage: "يرجى ملء جميع الحقول المطلوبة.",
  addSuccess: "تمت الإضافة بنجاح",
  addSuccessMessage: "تم إضافة المستخدم الجديد بنجاح.",
  addFailed: "فشلت عملية الإضافة",
  updateSuccess: "تم التحديث بنجاح",
  updateSuccessMessage: "تم تحديث بيانات المستخدم بنجاح.",
  updateFailed: "فشلت عملية التحديث",
  deleteSuccess: "تم الحذف بنجاح",
  deleteSuccessMessage: "تم حذف المستخدم بنجاح.",
  deleteFailed: "فشلت عملية الحذف",
  unexpectedError: "خطأ غير متوقع أثناء معالجة طلبك.",
  passwordKeep: "(اترك فارغاً للإبقاء على كلمة المرور الحالية)",
  enterPassword: "أدخل كلمة المرور",
  enterNewPassword: "أدخل كلمة المرور الجديدة (اختياري)",
  chooseRole: "اختر الدور",
  cancel: "إلغاء",
  saveChanges: "حفظ التغييرات",
  neverLoggedIn: "لم يسجل الدخول بعد",
  editTooltip: "تعديل",
  deleteTooltip: "حذف",
  changePasswordTooltip: "تغيير كلمة المرور",
  editText: "تعديل",
  deleteText: "حذف",
  changePasswordText: "تغيير كلمة المرور",
  adminEditRestriction: "فقط مدير يمكنه تعديل بيانات مشرفي المكتب",
  onlyMainAdminCanEdit: "فقط مدير يمكنه تعديل بيانات مشرفي المكتب",
  loadError: {
    title: "خطأ في تحميل البيانات",
    description: "حدث خطأ أثناء محاولة تحميل بيانات المستخدمين."
  },
  addUserError: "حدث خطأ أثناء إضافة المستخدم.",
  updateUserError: "حدث خطأ أثناء تحديث بيانات المستخدم.",
  deleteUserError: "حدث خطأ أثناء حذف المستخدم.",
  deleteConfirmationTitle: "تأكيد الحذف",
  deleteConfirmationMessage: "هل أنت متأكد من رغبتك في حذف هذا المستخدم؟ هذه العملية لا يمكن التراجع عنها.",
  confirm: "تأكيد",
  cannotEditSuperadmin: "لا يمكن تعديل بيانات مدير",
  cannotDeleteSuperadmin: "لا يمكن حذف مدير",
  teacherRestrictions: "المعلم يمكنه فقط تغيير كلمة المرور الخاصة به",
  teacherProfileTitle: "بياناتي الشخصية",
  teacherProfileDescription: "إدارة بياناتك الشخصية وكلمة المرور"
};

// تسميات ملف index.html
export const indexHtmlLabels = {
  title: "مكتب آية - نظام إدارة مسابقة تحفيظ القرآن الكريم",
  description: "نظام شامل ومتطور لإدارة مسابقة تحفيظ القرآن الكريم مع إمكانية تسجيل الدرجات ومتابعة التقدم واستعلام أولياء الأمور",
  author: "مكتب آية",
  keywords: "القرآن الكريم, تحفيظ, مسابقة, تجويد, تلاوة, حفظ, إدارة, نظام"
};

// إدارة قاعدة البيانات
export const databaseManagementLabels = {
  title: "إدارة قاعدة البيانات",
  backup: "نسخ احتياطي لقاعدة البيانات",
  restore: "استعادة قاعدة البيانات",
  backupHistory: "سجل النسخ الاحتياطي",
  createBackup: "إنشاء نسخة احتياطية جديدة",
  lastBackup: "آخر نسخة احتياطية",
  backupSize: "حجم النسخة الاحتياطية",
  backupDate: "تاريخ النسخة الاحتياطية",
  restoreFromFile: "استعادة من ملف",
  restoreFromServer: "استعادة من الخادم",
  deleteBackup: "حذف النسخة الاحتياطية",
  selectBackupFile: "اختر ملف النسخة الاحتياطية",
  databaseStatus: "حالة قاعدة البيانات",
  databaseSize: "حجم قاعدة البيانات",
  databaseLastUpdate: "آخر تحديث لقاعدة البيانات",
  tables: "الجداول",
  records: "السجلات",
  optimizeDatabase: "تحسين أداء قاعدة البيانات",
  backupInProgress: "جاري إنشاء نسخة احتياطية...",
  restoreInProgress: "جاري استعادة قاعدة البيانات...",
  backupSuccess: "تم إنشاء النسخة الاحتياطية بنجاح",
  restoreSuccess: "تم استعادة قاعدة البيانات بنجاح",
  confirmRestore: "هل أنت متأكد من رغبتك في استعادة قاعدة البيانات؟ سيتم استبدال البيانات الحالية.",
  functionNotAvailable: "هذه الوظيفة غير متاحة حاليًا",
  studentsImportProgress: (count: number) => `تم قراءة ${count} طالب من الملف، جاري استيراد البيانات...`,
  studentsImportSuccess: "تم استيراد البيانات بنجاح",
  description: "أدوات لإدارة قاعدة البيانات المدمجة في التطبيق",
  databaseLabel: "قاعدة البيانات:",
  exportTitle: "تصدير البيانات",
  exportDescription: "تصدير بيانات الطلاب إلى ملف",
  exportJsonButton: "تصدير البيانات كملف JSON",
  importTitle: "استيراد البيانات",
  importDescription: "استيراد بيانات الطلاب من مصادر مختلفة",
  importJsonButton: "استيراد من ملف JSON",
  backupTitle: "النسخ الاحتياطي",
  backupDescription: "إنشاء نسخة احتياطية من قاعدة البيانات",
  createBackupButton: "إنشاء نسخة احتياطية",
  clearTitle: "خطير: مسح البيانات",
  clearDescription: "حذف جميع البيانات من قاعدة البيانات",
  clearButton: "مسح قاعدة البيانات",
  returnToStudentsButton: "العودة إلى قائمة الطلاب",
};

// إنشاء المسؤول الرئيسي
export const createSuperadminLabels = {
  title: "إنشاء حساب المسؤول الرئيسي",
  description: "قم بإنشاء حساب المسؤول الرئيسي للنظام. هذا الحساب سيملك كافة الصلاحيات.",
  username: "اسم المستخدم",
  fullName: "الاسم الكامل",
  password: "كلمة المرور",
  confirmPassword: "تأكيد كلمة المرور",
  email: "البريد الإلكتروني",
  phone: "رقم الهاتف",
  submit: "إنشاء الحساب",
  passwordRequirements: "متطلبات كلمة المرور",
  requirement1: "8 أحرف على الأقل",
  requirement2: "حرف كبير واحد على الأقل",
  requirement3: "حرف صغير واحد على الأقل",
  requirement4: "رقم واحد على الأقل",
  successMessage: "تم إنشاء حساب المسؤول الرئيسي بنجاح",
};

// استعلام أولياء الأمور
export const parentInquiryLabels = {
  title: "استعلام ولي الأمر",
  description: "يمكنك الاستعلام عن معلومات طفلك هنا",
  studentId: "رقم هوية الطالب",
  studentName: "اسم الطالب",
  search: "بحث",
  noResults: "لم يتم العثور على نتائج",
  studentInfo: "معلومات الطالب",
  grade: "الصف",
  attendance: "الحضور",
  achievements: "الإنجازات",
  assignments: "الواجبات",
  quranProgress: "تقدم حفظ القرآن",
  lastUpdated: "آخر تحديث",
  contact: "اتصل بنا",
  contactMessage: "إذا كانت لديك أي استفسارات، يرجى التواصل معنا",
  phone: "رقم الهاتف",
  email: "البريد الإلكتروني",
};

// أولياء الأمور
export const guardiansLabels = {
  title: "إدارة أولياء الأمور",
  description: "إدارة بيانات أولياء أمور الطلاب",
  addGuardian: "إضافة ولي أمر جديد",
  editGuardian: "تعديل بيانات ولي أمر",
  deleteGuardian: "حذف ولي أمر",
  fullName: "الاسم الكامل",
  phoneNumber: "رقم الهاتف",
  email: "البريد الإلكتروني",
  address: "العنوان",
  actions: "إجراءات",
  searchPlaceholder: "البحث عن ولي أمر...",
  search: "بحث",
  cancel: "إلغاء",
  save: "حفظ",
  delete: "حذف",
  confirm: "تأكيد",
  loading: "جاري التحميل...",
  noGuardians: "لا يوجد أولياء أمور",
  addGuardianPrompt: "قم بإضافة ولي أمر جديد باستخدام زر الإضافة",
  optionalField: "(اختياري)",
  deleteConfirmation: "هل أنت متأكد من رغبتك في حذف هذا الولي؟",
  deleteDescription: "سيتم حذف جميع البيانات المرتبطة بهذا الولي.",
  unexpectedError: "حدث خطأ غير متوقع",
  incompleteData: "بيانات غير مكتملة",
  incompleteDataMessage: "يرجى ملء جميع الحقول المطلوبة",
  accessDenied: "غير مصرح بالوصول",
  accessDeniedMessage: "ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة",
  returnToHome: "العودة إلى الصفحة الرئيسية",
  deleteSuccess: "تم حذف ولي الأمر بنجاح",
  editSuccess: "تم تعديل بيانات ولي الأمر بنجاح",
  addSuccess: "تم إضافة ولي الأمر بنجاح",
  addGuardianDescription: "أدخل بيانات ولي الأمر الجديد",
  editGuardianDescription: "قم بتعديل بيانات ولي الأمر",
  deleteTooltip: "حذف ولي الأمر",
  noSearchResults: "لا توجد نتائج للبحث",
  tryAnotherSearch: "حاول تغيير كلمات البحث أو استخدام مصطلحات مختلفة",
  requiredField: "* حقل مطلوب",
  updateSuccess: "تم تحديث بيانات ولي الأمر بنجاح",
  editTooltip: "تعديل",
  viewTooltip: "عرض",
  filters: "تصفية",
  export: "تصدير",
  refresh: "تحديث",
  totalGuardians: "إجمالي أولياء الأمور",
  showing: "عرض",
  from: "من أصل",
  guardian: "ولي أمر",
  studentCount: "عدد الطلاب",

};

// وظيفة لتحويل نوع المستخدم إلى نص عربي
export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'superadmin':
      return loginLabels.superadmin;
    case 'admin':
      return loginLabels.admin;
    case 'teacher':
      return loginLabels.teacher;
    default:
      return role;
  }
};

// ==================== إدارة الحلقات الدراسية ====================
export const studyCirclesLabels = {
  // العناوين الرئيسية
  title: "إدارة الحلقات الدراسية",
  description: "إدارة الحلقات الدراسية وتعيين المعلمين والطلاب",
  
  // الحقول
  name: "اسم الحلقة",
  teacher: "المعلم",
  location: "المكان",
  schedule: "الجدول",
  maxStudents: "سعة الحلقة",

  // الإجراءات
  addCircle: "إضافة حلقة جديدة",
  editCircle: "تعديل الحلقة",
  deleteCircle: "حذف الحلقة",
  viewStudents: "عرض الطلاب",
  
  // رسائل
  noCircles: "لا توجد حلقات دراسية",
  addCirclePrompt: "إضافة حلقة دراسية جديدة",
  incompleteData: "بيانات غير مكتملة",
  incompleteDataMessage: "يرجى ملء جميع الحقول الإلزامية",
  addSuccess: "تم إنشاء الحلقة بنجاح",
  updateSuccess: "تم تحديث الحلقة بنجاح",
  deleteSuccess: "تم حذف الحلقة بنجاح",
  confirmDelete: "هل أنت متأكد من حذف هذه الحلقة؟",
  
  // النماذج
  addForm: {
    title: "إضافة حلقة دراسية جديدة",
    submit: "إضافة"
  },
  editForm: {
    title: "تعديل بيانات الحلقة",
    submit: "حفظ التغييرات"
  },
  
  // تلميحات
  editTooltip: "تعديل الحلقة",
  deleteTooltip: "حذف الحلقة",
  viewStudentsTooltip: "عرض طلاب الحلقة",
  
  // أخرى
  loading: "جاري تحميل الحلقات...",
  selectTeacher: "اختر المعلم",
  enterNumber: "أدخل رقمًا",
  noTeachers: "لا يوجد معلمين متاحين",
  cancel: "إلغاء"
};
