/**
 * Unified multi-language labels registry.
 * Add new labels in both `ar` and `en` namespaces keeping same key structure.
 * Use `getLabels(lang)` to retrieve a typed object.
 */

import { time } from "console";

export type SupportedLang = 'ar' | 'en';

// Base Arabic labels imported (extracted from existing arabic-labels.ts). For English we provide placeholders.
// NOTE: Keep structure identical across languages for type safety.

const ar = {
  errorMessages: {
    generalError: 'خطأ',
    generalWarning: 'تنبيه',
    requiredField: 'هذا الحقل مطلوب',
    invalidInput: 'قيمة غير صالحة',
    dataError: 'خطأ في البيانات',
    searchError: 'خطأ في البحث',
    missingCredentials: 'يرجى إدخال اسم المستخدم وكلمة المرور',
    permissionError: 'خطأ في الصلاحيات',
    accessDenied: 'لا تملك صلاحيات للوصول إلى هذه الصفحة',
    incorrectRole: (actual: string, expected: string) => `لقد قمت بتسجيل الدخول كـ ${actual} وليس كـ ${expected}`,
    loginFailed: 'فشل تسجيل الدخول',
    invalidCredentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
    loginError: 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى',
    saveFailed: 'فشل حفظ البيانات',
    deleteFailed: 'فشل حذف البيانات',
    updateFailed: 'فشل تحديث البيانات',
    fetchFailed: 'فشل جلب البيانات',
    operationFailed: 'فشلت العملية',
    connectionError: 'خطأ في الاتصال بالخادم',
    databaseError: 'خطأ في قاعدة البيانات',
    errorLoadingData: 'فشل في تحميل البيانات',
    consoleLoginError: 'خطأ في تسجيل الدخول:',
    consoleUserLoadError: 'حدث خطأ أثناء تحميل المستخدمين:',
    consoleUserSaveError: 'حدث خطأ أثناء حفظ بيانات المستخدم:',
    consoleExportDataError: 'خطأ في تصدير البيانات:',
    consoleImportFileError: 'خطأ في استيراد الملف:',
    consoleParsingJsonError: 'خطأ في تحليل ملف JSON:',
    consoleStudentDetailsError: 'خطأ في جلب تفاصيل الطالب:',
    consoleStudentSaveError: 'خطأ في حفظ بيانات الطالب:',
    consoleEmailSendError: 'فشل إرسال البريد الإلكتروني:',
    consoleStudentDataSubmitError: 'خطأ أثناء تسجيل بيانات الطالب:',
    consoleStudentsFetchError: 'خطأ في جلب بيانات الطلاب:',
    invalidEmail: 'بريد إلكتروني غير صالح',
    invalidPhone: 'رقم هاتف غير صالح',
    invalidName: 'اسم غير صالح',
    invalidDate: 'تاريخ غير صالح',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    weakPassword: 'كلمة المرور ضعيفة'
  },
  successMessages: {
    loginSuccess: 'تم تسجيل الدخول',
    welcome: (name: string) => `مرحبًا بك ${name}`,
    saveSuccess: 'تم حفظ البيانات بنجاح',
    deleteSuccess: 'تم حذف البيانات بنجاح',
    updateSuccess: 'تم تحديث البيانات بنجاح',
    operationSuccess: 'تمت العملية بنجاح',
    completed: 'تم الإكمال بنجاح'
  },
  commonLabels: {
    submit: 'إرسال', save: 'حفظ', cancel: 'إلغاء', edit: 'تعديل', delete: 'حذف', add: 'إضافة', close: 'إغلاق', back: 'رجوع', next: 'التالي', previous: 'السابق', confirm: 'تأكيد', search: 'بحث', filter: 'تصفية', reset: 'إعادة ضبط', refresh: 'تحديث', download: 'تنزيل', upload: 'رفع', print: 'طباعة', login: 'تسجيل الدخول', logout: 'تسجيل الخروج',
    loading: 'جاري التحميل...', processing: 'جاري المعالجة...', saving: 'جاري الحفظ...', deleting: 'جاري الحذف...', updating: 'جاري التحديث...',
    menu: 'القائمة', home: 'الرئيسية', dashboard: 'لوحة التحكم', settings: 'الإعدادات', profile: 'الملف الشخصي',
    yes: 'نعم', no: 'لا', all: 'الكل', none: 'لا شيء', from: 'من', to: 'إلى', today: 'اليوم', yesterday: 'الأمس', tomorrow: 'غداً', noData: 'لا توجد بيانات', noResults: 'لا توجد نتائج', moreInfo: 'مزيد من المعلومات'
  },
  studentsLabels: {
  title: 'إدارة الطلاب', description: 'قم بإضافة وتعديل وعرض بيانات الطلاب', addStudent: 'إضافة طالب جديد', editStudent: 'تعديل بيانات الطالب', deleteStudent: 'حذف الطالب', deleteSuccess: 'تم حذف الطالب بنجاح', deleteConfirmation: 'هل أنت متأكد من رغبتك في حذف هذا الطالب؟', deleteDescription: 'سيؤدي هذا إلى حذف جميع سجلات الطالب من النظام بشكل نهائي.', confirm: 'تأكيد الحذف', cancel: 'إلغاء', unexpectedError: 'حدث خطأ غير متوقع', fullName: 'اسم الطالب/الطالبة', fullNameError: 'اسم الطالب لا يجب أن يحتوي على مسافات', guardianName: 'ولي الأمر', teacherName: 'المعلم المتابع', teacherPlaceholder: 'اختر المعلم المتابع', teacherForStudent: 'هذا الطالب تحت إشراف المعلم:', studyCircleName: 'الحلقة الدراسية', studyCirclePlaceholder: 'اختر الحلقة الدراسية', grade: 'الصف الدراسي', gradeShort: 'الصف', age: 'العمر', dateOfBirth: 'تاريخ الميلاد', lastQuranProgress: 'آخر حفظ', memorizeLevelHeader: 'مستوى الحفظ', quranProgressPlaceholder: 'اختر آخر ما تم حفظه', phoneNumber: 'رقم الهاتف', email: 'البريد الإلكتروني', address: 'ملاحظات', notes: 'ملاحظات', actions: 'الإجراءات', save: 'حفظ', search: 'بحث', searchPlaceholder: 'البحث بالاسم أو رقم الهاتف', noStudents: 'لا يوجد طلاب', addStudentPrompt: 'قم بإضافة طالب جديد للبدء', loading: 'جاري التحميل...', requiredField: '* حقل مطلوب', optionalField: '(اختياري)', updateSuccess: 'تم تحديث بيانات الطالب بنجاح', addSuccess: 'تم إضافة الطالب بنجاح', incompleteData: 'بيانات غير مكتملة', incompleteDataMessage: 'الرجاء تعبئة جميع الحقول المطلوبة', accessDenied: 'ليس لديك صلاحية الوصول', accessDeniedMessage: 'ليس لديك صلاحية للوصول لهذه الصفحة.', returnToHome: 'العودة للصفحة الرئيسية', editTooltip: 'تعديل', deleteTooltip: 'حذف', viewTooltip: 'عرض', noSearchResults: 'لا توجد نتائج للبحث', tryAnotherSearch: 'حاول تغيير كلمات البحث أو استخدام مصطلحات مختلفة', filters: 'تصفية', export: 'تصدير', refresh: 'تحديث', totalStudents: 'إجمالي الطلاب', showing: 'عرض', from: 'من أصل', student: 'طالب', gender: 'الجنس', genderOptions: [{ value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }], studentsList: 'قائمة الطلاب', filterByGrade: 'تصفية حسب الصف', filterByStatus: 'تصفية حسب الحالة', name: 'الاسم', parentName: 'اسم ولي الأمر', phone: 'رقم الهاتف', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', import: 'استيراد البيانات', delete: 'حذف', 
  gradeOptions: [
  { value: 'kg1', label: 'المرحلة التمهيدية - KG1' },
  { value: 'kg2', label: 'المرحلة التمهيدية - KG2' },
  { value: '1', label: 'الصف الأول الابتدائي' },
  { value: '2', label: 'الصف الثاني الابتدائي' },
  { value: '3', label: 'الصف الثالث الابتدائي' },
  { value: '4', label: 'الصف الرابع الابتدائي' },
  { value: '5', label: 'الصف الخامس الابتدائي' },
  { value: '6', label: 'الصف السادس الابتدائي' },
  { value: '7', label: 'الصف الأول الإعدادي' },
  { value: '8', label: 'الصف الثاني الإعدادي' },
  { value: '9', label: 'الصف الثالث الإعدادي' },
  { value: '10', label: 'الصف الأول الثانوي' },
  { value: '11', label: 'الصف الثاني الثانوي' },
  { value: '12', label: 'الصف الثالث الثانوي' }
], quranPartsOptions: [],
    // كلمة الجزء و الأرقام الترتيبية للأجزاء (1-30)
    quranJuzWord: 'الجزء',
    quranJuzOrdinals: [
      '', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
      'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
      'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'
    ],
    // ختم كامل
    quranComplete: 'ختم القرآن',
    teacherViewTitle: 'الطلاب المرتبطين بك',
    teacherViewDescription: 'عرض وإدارة الطلاب المرتبطين بالمعلم الحالي',
    allTeachers: 'كل المعلمين',
    allStudyCircles: 'كل الحلقات',
    noStudyCircles: 'لا توجد حلقات متاحة',
    noCirclesForTeacher: 'لا توجد حلقات لهذا المعلم',
    selectTeacherFirst: 'اختر معلم أولاً',
    studyCircleShort: 'الحلقة',
    teacherColumn: 'المعلم',
    guardianColumn: 'ولي الأمر',
    genderMale: 'ذكر',
    genderFemale: 'أنثى',
  currentTeacherLabel: 'المعلم الحالي',
  noName: 'بدون اسم',
    exportSuccess: 'تم تصدير البيانات بنجاح',
    exportFailed: 'فشل تصدير البيانات',
    exportFailedDescription: 'حدث خطأ أثناء محاولة تصدير البيانات',
    studyCirclesLoadErrorTitle: 'خطأ في تحميل الحلقات الدراسية',
    studyCirclesLoadErrorDescription: 'حدث خطأ أثناء محاولة تحميل الحلقات الدراسية للمعلم.',
    teacherHistoryLoadErrorTitle: 'خطأ في تحميل سجل المعلمين',
    teacherHistoryLoadErrorDescription: 'حدث خطأ أثناء تحميل سجل المعلمين السابقين للطالب.'
  },
  guardiansLabels: {
    title: 'إدارة أولياء الأمور', description: 'إدارة بيانات أولياء أمور الطلاب', addGuardian: 'إضافة ولي أمر جديد', editGuardian: 'تعديل بيانات ولي أمر', deleteGuardian: 'حذف ولي أمر', fullName: 'الاسم', phoneNumber: 'رقم الهاتف', email: 'البريد', address: 'العنوان', actions: 'إجراءات', searchPlaceholder: 'البحث عن ولي أمر...', search: 'بحث', cancel: 'إلغاء', save: 'حفظ', delete: 'حذف', confirm: 'تأكيد', loading: 'جاري التحميل...', noGuardians: 'لا يوجد أولياء أمور', addGuardianPrompt: 'قم بإضافة ولي أمر جديد باستخدام زر الإضافة', optionalField: '(اختياري)', deleteConfirmation: 'هل أنت متأكد من رغبتك في حذف هذا الولي؟', deleteDescription: 'سيتم حذف جميع البيانات المرتبطة بهذا الولي.', unexpectedError: 'حدث خطأ غير متوقع', incompleteData: 'بيانات غير مكتملة', incompleteDataMessage: 'يرجى ملء جميع الحقول المطلوبة', accessDenied: 'غير مصرح بالوصول', accessDeniedMessage: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة', returnToHome: 'العودة إلى الصفحة الرئيسية', deleteSuccess: 'تم حذف ولي الأمر بنجاح', editSuccess: 'تم تعديل بيانات ولي الأمر بنجاح', addSuccess: 'تم إضافة ولي الأمر بنجاح', addGuardianDescription: 'أدخل بيانات ولي الأمر الجديد', editGuardianDescription: 'قم بتعديل بيانات ولي الأمر', deleteTooltip: 'حذف ولي الأمر', noSearchResults: 'لا توجد نتائج للبحث', tryAnotherSearch: 'حاول تغيير كلمات البحث أو استخدام مصطلحات مختلفة', requiredField: '* حقل مطلوب', updateSuccess: 'تم تحديث بيانات ولي الأمر بنجاح', editTooltip: 'تعديل', viewTooltip: 'عرض', filters: 'تصفية', export: 'تصدير', refresh: 'تحديث', totalGuardians: 'إجمالي أولياء الأمور', showing: 'عرض', from: 'من أصل', guardian: 'ولي أمر', studentCount: 'عدد الطلاب',
    fullNameFull: 'الاسم الكامل',
    fullNamePlaceholder: 'الاسم الكامل لولي الأمر',
    phoneNumberPlaceholder: 'رقم الهاتف',
    emailPlaceholder: 'البريد الإلكتروني',
    addressNotes: 'العنوان / ملاحظات',
    addressPlaceholder: 'العنوان أو أي ملاحظات إضافية',
    addStudent: 'إضافة طالب جديد',
    addStudentTooltip: 'إضافة طالب',
    viewStudents: 'عرض الطلاب',
    studentsListTitle: 'طلاب ولي الأمر',
    noStudentsForGuardian: 'لا يوجد طلاب مرتبطين بولي الأمر',
    closeDialog: 'إغلاق',
    studentGradeHeader: '🏫 الدراسي',
    studentGenderHeader: '⚧ الجنس',
    studentLastQuranHeader: '📅 آخر حفظ',
    studentTeacherHeader: '👨‍🏫 المعلم',
    studentCircleHeader: '📚 الحلقة',
    studentActionsHeader: '⚙️ الإجراءات',
    studentEditTooltip: 'تعديل',
    studentDeleteTooltip: 'حذف',
    deleteStudentTitle: 'حذف الطالب',
    deleteStudentConfirmation: 'هل أنت متأكد من رغبتك في حذف هذا الطالب؟',
    deleteStudentDescription: 'لا يمكن التراجع عن هذه العملية.',
    confirmDeleteStudent: 'تأكيد الحذف',
    exportSuccess: 'تم تصدير بيانات أولياء الأمور بنجاح',
    exportFailed: 'فشل تصدير بيانات أولياء الأمور',
    exportFailedDescription: 'حدث خطأ أثناء محاولة تصدير بيانات أولياء الأمور',
    studentsLoadErrorTitle: 'خطأ في تحميل بيانات الطلاب',
    studentsLoadErrorDescription: 'حدث خطأ أثناء محاولة تحميل بيانات الطلاب',
    studentDeleteSuccess: 'تم حذف الطالب بنجاح',
    studentDeleteFailed: 'فشل في حذف الطالب',
    studentDeleteFailedDescription: 'حدث خطأ أثناء حذف الطالب',
    studentDeleteUnexpectedError: 'حدث خطأ غير متوقع أثناء حذف الطالب',
    unknownError: 'خطأ غير معروف',
  },
  teacherHistoryLabels: {
    title: 'سجل المعلمين',
    titleLong: 'سجل المعلمين السابقين للطالب',
    teacherHeader: 'المعلم',
    studyCircleHeader: 'الحلقة',
    startDateHeader: 'تاريخ البداية',
    endDateHeader: 'تاريخ النهاية',
    durationHeader: 'المدة',
    currentTeacherTag: 'حالي',
    noHistoryShort: 'لا يوجد سجل',
    noHistoryTitle: 'لا يوجد سجل للمعلمين السابقين',
    noHistoryDescription: 'لم يتم تسجيل أي تغيير في معلمي هذا الطالب',
    currentTeacher: 'المعلم الحالي:',
    day: 'يوم',
    month: 'شهر',
    year: 'سنة'
  },
  loginLabels: {
    title: 'تسجيل الدخول إلى النظام',
    description: 'يرجى إدخال بيانات الدخول للوصول للنظام',
    username: 'اسم المستخدم',
    usernamePrompt: 'أدخل اسم المستخدم',
    password: 'كلمة المرور',
    passwordPrompt: 'أدخل كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    login: 'تسجيل الدخول',
    loginInProgress: 'جاري تسجيل الدخول...',
    loginInfoTitle: 'معلومات الدخول',
    loginInfoMessage1: 'هذا النظام مخصص لمكاتب تحفيظ القرآن الكريم',
    loginInfoMessage2: 'للحصول على حساب تواصل مع الإدارة',
    changePassword: 'تغيير كلمة المرور',
    backToHome: 'العودة للصفحة الرئيسية',
    systemName: 'نظام آية',
    footerCopyright: 'جميع الحقوق محفوظة'
  },
  userManagementLabels: {
    changePasswordForm: {
      title: 'تغيير كلمة المرور',
      username: 'اسم المستخدم',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
      submit: 'تحديث كلمة المرور',
      success: 'تم تغيير كلمة المرور',
      error: 'فشل تغيير كلمة المرور',
      passwordsMismatch: 'كلمتا المرور غير متطابقتين'
    },
    // Loading & generic
    unexpectedError: 'حدث خطأ غير متوقع',
    loading: 'جاري التحميل...',
    // Access / permissions
    accessDenied: 'غير مصرح بالوصول',
    accessDeniedMessage: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة',
    returnToHome: 'العودة للصفحة الرئيسية',
    // Tabs & roles
    title: 'إدارة المستخدمين',
    description: 'إضافة وتحديث وإدارة حسابات المستخدمين',
    teacherProfileTitle: 'ملفي الشخصي',
    teacherProfileDescription: 'إدارة بياناتك الشخصية وكلمة المرور',
    superadmins: 'سوبر أدمن',
    administrators: 'المدراء',
    teachers: 'المعلمون',
    addNewAdmin: 'إضافة مدير جديد',
    addNewSuperadmin: 'إضافة سوبر أدمن جديد',
    addNewteacher: 'إضافة معلم جديد',
    // Add/Edit forms
    addUserForm: { title: 'إضافة مستخدم جديد', password: 'كلمة المرور' },
    editUserForm: { title: 'تعديل بيانات المستخدم' },
    fullName: 'الاسم الكامل',
    usernameLabel: 'اسم المستخدم',
    role: 'الدور',
    chooseRole: 'اختر الدور',
    superadmin: 'سوبر أدمن',
    admin: 'مدير',
    teacher: 'معلم',
    addUser: 'إضافة المستخدم',
    saveChanges: 'حفظ التغييرات',
    cancel: 'إلغاء',
    passwordKeep: 'اتركه فارغاً للإبقاء عليه',
    enterPassword: 'أدخل كلمة المرور',
    enterNewPassword: 'أدخل كلمة المرور الجديدة',
    // Validation / errors
    incompleteData: 'بيانات غير مكتملة',
    incompleteDataMessage: 'يرجى تعبئة جميع الحقول المطلوبة',
    adminEditRestriction: 'لا يمكن للمدير تعديل مستخدم بصلاحيات أعلى',
    loadError: { title: 'فشل في تحميل المستخدمين', description: 'حدث خطأ أثناء تحميل قائمة المستخدمين' },
    // CRUD success/failure
    addSuccess: 'تمت الإضافة',
    addSuccessMessage: 'تم إضافة المستخدم بنجاح',
    addFailed: 'فشل الإضافة',
    addUserError: 'فشل في إضافة المستخدم',
    updateSuccess: 'تم التحديث',
    updateSuccessMessage: 'تم تحديث بيانات المستخدم بنجاح',
    updateFailed: 'فشل التحديث',
    updateUserError: 'فشل في تحديث بيانات المستخدم',
    deleteSuccess: 'تم الحذف',
    deleteSuccessMessage: 'تم حذف المستخدم بنجاح',
    deleteFailed: 'فشل الحذف',
    deleteUserError: 'فشل في حذف المستخدم',
    // Empty states
    noAdmins: 'لا يوجد مدراء',
    noSuperadmins: 'لا يوجد مستخدمون بسوبر أدمن',
    noteachers: 'لا يوجد معلمون',
    addAdminText: 'استخدم زر إضافة لإضافة أول مدير',
    addSuperadminText: 'استخدم زر إضافة لإنشاء أول سوبر أدمن',
    addteacherText: 'استخدم زر إضافة لإضافة أول معلم',
    // Tooltips & actions
    editTooltip: 'تعديل',
    deleteTooltip: 'حذف',
    changePasswordTooltip: 'تغيير كلمة المرور للمستخدم',
    cannotEditSuperadmin: 'لا يمكن تعديل سوبر أدمن آخر',
    cannotDeleteSuperadmin: 'لا يمكن حذف سوبر أدمن',
    // Misc table labels
    actions: 'إجراءات',
    teacherCircleCount: 'عدد الحلقات',
    lastLogin: 'آخر تسجيل دخول',
    circleUnit: 'حلقة'
  },
  studyCirclesLabels: {
    // General
    title: 'إدارة الحلقات',
    description: 'إنشاء وإدارة وجدولة الحلقات الدراسية',
    addCircle: 'إضافة حلقة جديدة',
    editCircle: 'تعديل الحلقة',
    deleteCircle: 'حذف الحلقة',
    deleteTooltip: 'حذف الحلقة',
    editTooltip: 'تعديل الحلقة',
    name: 'اسم الحلقة',
    teacher: 'المعلم',
    maxStudents: 'الحد الأقصى للطلاب',
    enterNumber: 'أدخل رقم',
    selectTeacher: 'اختر المعلم',
    noTeachers: 'لا يوجد معلمون',
    unassignedTeacher: 'غير محدد',
    studentsCount: 'عدد الطلاب',
    actions: 'إجراءات',
    cancel: 'إلغاء',
    // Forms
    addForm: { title: 'إضافة حلقة جديدة', submit: 'حفظ الحلقة' },
    editForm: { title: 'تعديل الحلقة', submit: 'تحديث الحلقة' },
    // Validation
    incompleteData: 'بيانات غير مكتملة',
    incompleteDataMessage: 'يرجى تعبئة الحقول المطلوبة (الاسم والمعلم)',
    // CRUD Success
    addSuccess: 'تمت إضافة الحلقة بنجاح',
    updateSuccess: 'تم تحديث الحلقة بنجاح',
    deleteSuccess: 'تم حذف الحلقة بنجاح',
    confirmDelete: 'هل أنت متأكد من رغبتك في حذف هذه الحلقة؟',
    // Lists / Empty states
    noCircles: 'لا توجد حلقات متاحة',
    searchPlaceholder: '🔍 البحث في الحلقات...',
    searchNoResults: 'لا توجد نتائج مطابقة للبحث',
    // Navigation / schedule page link
    manageSchedules: 'جدولة الحلقات',
    navigateToSchedulesTooltip: 'الانتقال إلى صفحة جدولة الحلقات',
    scheduleButtonLabel: 'الجدولة',
    scheduleTooltip: 'جدولة الحلقة',
    // Circle load error
    circleLoadError: 'فشل في تحميل بيانات الحلقات',
    // Schedule management (nested)
    schedule: {
      openDialogTitlePrefix: 'جدولة حلقة',
      loading: 'جاري تحميل جدولة الحلقة...',
      noSchedulesTitle: 'لا توجد مواعيد محددة',
      noSchedulesDescription: 'لم يتم تسجيل أي مواعيد لهذه الحلقة بعد',
      addFirstSchedule: 'إضافة أول موعد',
      teacherCannotAdd: 'لا يمكن للمعلمين إضافة مواعيد. يرجى التواصل مع الإدارة.',
      addButtonTooltip: 'إضافة موعد جديد للحلقة',
      addDialog: { title: 'إضافة موعد جديد', description: 'قم بتحديد اليوم والوقت لإضافة موعد جديد للحلقة', save: 'إضافة الموعد', saving: 'جارٍ الإضافة...' },
      editDialog: { title: 'تعديل موعد', description: 'قم بتعديل بيانات الموعد', save: 'حفظ التغييرات', saving: 'جارٍ الحفظ...' },
      fields: { weekday: 'اليوم *', startTime: 'وقت البداية *', endTime: 'وقت النهاية *', locationOptional: 'الموقع (اختياري)', locationHelp: 'اتركه فارغاً لاستخدام موقع الحلقة الافتراضي', locationPlaceholder: 'أدخل موقع الموعد (اختياري)' },
      table: { weekday: 'اليوم', time: 'الوقت', location: 'الموقع', defaultLocation: 'الموقع الافتراضي', actions: 'الإجراءات', scheduleButton: 'الجدولة', scheduleTooltip: 'جدولة الحلقة' },
      validate: { incompleteTitle: 'بيانات غير مكتملة', incompleteDescription: 'يرجى تحديد وقت البداية والنهاية' },
      toast: {
        addSuccessTitle: 'تمت الإضافة بنجاح',
        addSuccessDescription: 'تم إضافة الموعد الجديد بنجاح',
        addFailedTitle: 'فشل في إضافة الموعد',
        addFailedDescription: 'حدث خطأ أثناء إضافة الموعد الجديد',
        editSuccessTitle: 'تم التعديل بنجاح',
        editSuccessDescription: 'تم تعديل الموعد بنجاح',
        editFailedTitle: 'فشل في تعديل الموعد',
        editFailedDescription: 'حدث خطأ أثناء تعديل الموعد',
        deleteSuccessTitle: 'تم الحذف بنجاح',
        deleteSuccessDescription: 'تم حذف الموعد بنجاح',
        deleteFailedTitle: 'فشل في حذف الموعد',
        deleteFailedDescription: 'حدث خطأ أثناء حذف الموعد',
        unexpectedErrorTitle: 'خطأ',
        unexpectedErrorDescription: 'حدث خطأ غير متوقع'
      },
      deleteDialog: {
        title: 'تأكيد حذف الموعد',
        description: 'هل أنت متأكد من رغبتك في حذف هذا الموعد من جدول الحلقة؟',
        weekdayLabel: 'اليوم',
        timeLabel: 'الوقت',
        locationLabel: 'المكان',
        deleteButton: 'نعم، احذف الموعد',
        cancelButton: 'إلغاء'
      },
      loadErrorTitle: 'خطأ في تحميل الجدولة',
      loadErrorDescription: 'حدث خطأ أثناء تحميل مواعيد الحلقة',
      // Weekday names & unknown fallback
      weekdayNames: { '0': 'الأحد', '1': 'الإثنين', '2': 'الثلاثاء', '3': 'الأربعاء', '4': 'الخميس', '5': 'الجمعة', '6': 'السبت' },
      weekdayUnknown: 'غير معروف'
    }
  },
  databaseManagementLabels: {
    title: 'إدارة قاعدة البيانات',
    backup: 'نسخ احتياطي',
    restore: 'استعادة',
    exportData: 'تصدير البيانات',
    importData: 'استيراد البيانات'
  },
  parentInquiryLabels: {
    title: 'استعلام ولي الأمر',
    description: 'إدخال بيانات الطالب للاستعلام',
    studentName: 'اسم الطالب',
    guardianPhone: 'هاتف ولي الأمر',
    submit: 'بحث',
    result: 'النتائج'
  },
  dashboardStatsLabels: {
    generalStats: 'إحصائيات عامة',
    supervisorStats: 'إحصائيات المشرف',
    teacherStats: 'إحصائيات المعلم',
    extraInfo: 'معلومات إضافية'
  },
  homeLabels: {
    welcomeHeading: 'مرحباً بك في نظام متابعة حفظ القرآن الكريم',
    banner: {
      slides: [
        { title: 'نظام متابعة حفظ القرآن الكريم', subtitle: 'تعلم، احفظ، واستمر في رحلتك مع كتاب الله' },
        { title: 'رحلة الحفظ والتعلم', subtitle: 'خطوة بخطوة نحو إتقان كتاب الله' },
        { title: 'حفظ القرآن', subtitle: 'منهجية متكاملة للحفظ والمراجعة' },
        { title: 'متابعة التقدم', subtitle: 'نظام متكامل لمتابعة مستوى الطلاب' },
        { title: 'تعليم القرآن الكريم', subtitle: 'أفضل الأساليب التعليمية الحديثة' },
        { title: 'التواصل المستمر', subtitle: 'تواصل فعال بين المعلمين وأولياء الأمور' },
        { title: 'التطوير المستمر', subtitle: 'نسعى دائمًا لتطوير منظومة التحفيظ' }
      ],
      previous: 'الصورة السابقة',
      next: 'الصورة التالية',
      gotoImage: (n: number) => `الانتقال إلى الصورة رقم ${n}`
    },
    description: 'هذا النظام يساعد على متابعة تقدم الطلاب في حفظ القرآن الكريم، وتسهيل التواصل بين المعلمين وأولياء الأمور.',
    stats: { title: 'إحصائيات النظام', description: 'نظرة عامة على أداء حلقات التحفيظ والطلاب' },
    roles: { teacher: 'معلم', admin: 'مدير', superadmin: 'مدير', parent: 'ولي أمر' },
    sections: {
      forTeachers: 'للمعلمين',
      forParents: 'لأولياء الأمور',
      teachersFeatures: ['تسجيل الطلاب الجدد', 'تسجيل المتابعة اليومية', 'تسجيل نتائج الاختبارات الشهرية', 'إدارة بيانات أولياء الأمور'],
      parentsFeatures: ['متابعة تقدم الطالب', 'الاطلاع على المتابعة اليومية', 'الاطلاع على نتائج الاختبارات الشهرية', 'التواصل مع المعلمين']
    },
    actions: {
      login: 'تسجيل الدخول',
      parentInquiry: 'استعلام أولياء الأمور',
      manageStudents: 'إدارة الطلاب',
      myStudyCircles: 'حلقاتي الدراسية',
      studentsList: 'قائمة الطلاب',
      guardiansList: 'قائمة أولياء الأمور',
      manageCircles: 'إدارة الحلقات الدراسية',
      databaseManagement: 'إدارة قاعدة البيانات',
      userManagement: 'إدارة المستخدمين',
      viewStudentInfo: 'عرض معلومات الطالب'
    }
  },
  footerLabels: {
    systemName: 'نظام آية',
    poweredBy: 'تم التطوير بواسطة',
    lovePrefix: 'تم التطوير بكل',
    loveSuffix: 'لخدمة كتاب الله',
    version: 'الإصدار',
    rightsReserved: 'جميع الحقوق محفوظة'
  },
  studyCircleSchedulesLabels: {
    pageTitle: 'جدولة الحلقات الدراسية',
    pageDescription: 'إدارة مواعيد وجدولة الحلقات الدراسية .',
    circlesListTitle: 'قائمة الحلقات',
    teacherShort: 'المعلم:',
    teacherUnknown: 'غير محدد',
    searchPlaceholder: 'بحث...',
    loadingCircles: 'جاري تحميل الحلقات...',
    loading: 'جاري التحميل...',
    noResults: 'لا توجد نتائج',
    noCircles: 'لا توجد حلقات',
    noCirclesSearch: 'لم يتم العثور على حلقات تطابق معايير البحث',
    circlesHeading: 'الحلقات الدراسية',
    selectedBadge: 'محدد',
    addScheduleTooltip: 'إضافة موعد',
    clearSelection: 'إلغاء التحديد',
    scheduleAdd: 'إضافة موعد',
    chooseCircleTitle: 'اختر حلقة للبدء',
    chooseCircleHelp: 'يرجى اختيار حلقة من القائمة على اليسار لعرض وإدارة مواعيد جدولتها',
    totalSchedules: 'إجمالي المواعيد',
    scheduleWord: 'موعد',
    noSchedules: 'لا توجد مواعيد',
    defaultLocation: 'موقع الحلقة الافتراضي',
    virtualLocation: 'موقع افتراضي',
    presence: 'الحضور:',
    leaving: 'الانصراف:',
    conflict: 'تعارض في المواعيد',
    addDialogTitle: 'إضافة موعد جديد',
    addDialogDescription: 'قم بتحديد اليوم والوقت لإضافة موعد جديد للحلقة',
    editDialogTitle: 'تعديل موعد',
    editDialogDescription: 'قم بتعديل بيانات الموعد',
    addDialogSaving: 'جارٍ الإضافة...',
    editDialogSaving: 'جارٍ الحفظ...',
    addDialogSave: 'إضافة الموعد',
    editDialogSave: 'حفظ التغييرات',
    fieldDay: 'اليوم *',
    fieldDayHeader: 'اليوم',
    fieldTime: 'الوقت',
    fieldStart: 'وقت البداية *',
    fieldEnd: 'وقت النهاية *',
    fieldLocation: 'الموقع',
    fieldLocationHelp: 'اتركه فارغاً لاستخدام موقع الحلقة الافتراضي',
    fieldLocationPlaceholder: 'أدخل موقع الموعد (اختياري)',
    deleteDialogTitle: 'تأكيد حذف الموعد',
    deleteDialogDescription: 'هل أنت متأكد من رغبتك في حذف هذا الموعد من جدول الحلقة؟',
    deleteDialogWeekday: 'اليوم',
    deleteDialogTime: 'الوقت',
    deleteDialogLocation: 'المكان',
    deleteDialogConfirm: 'نعم، احذف الموعد',
    cancel: 'إلغاء',
    validationDataError: 'خطأ في البيانات',
    validationTimesError: 'خطأ في الأوقات',
    validationTimesMessage: 'يجب أن يكون وقت النهاية بعد وقت البداية',
    validationMissingTimes: 'الرجاء تحديد وقت البداية والنهاية',
    createSuccessTitle: '✅ تمت الإضافة بنجاح',
    createSuccessDescription: (circle: string) => `تم إضافة جدولة جديدة للحلقة "${circle}" بنجاح`,
    createFailedTitle: 'خطأ في الإضافة',
    createFailedDescription: 'حدث خطأ أثناء إضافة الجدولة الجديدة',
    updateSuccessTitle: '✅ تم التحديث بنجاح',
    updateSuccessDescription: 'تم تحديث بيانات الجدولة بنجاح',
    updateFailedTitle: 'خطأ في التحديث',
    updateFailedDescription: 'حدث خطأ أثناء تحديث بيانات الجدولة',
    deleteSuccessTitle: '✅ تم الحذف بنجاح',
    deleteSuccessDescription: 'تم حذف الجدولة بنجاح',
    deleteFailedTitle: 'خطأ في الحذف',
    deleteFailedDescription: 'حدث خطأ أثناء حذف الجدولة',
    unexpectedErrorTitle: 'خطأ غير متوقع',
    unexpectedErrorDescription: 'حدث خطأ غير متوقع أثناء العملية',
    weekdayNames: { '0': 'الأحد', '1': 'الإثنين', '2': 'الثلاثاء', '3': 'الأربعاء', '4': 'الخميس', '5': 'الجمعة', '6': 'السبت' },
    prevLabel: 'السابق',
    nextLabel: 'التالي',
    pagesIndicatorAria: 'مؤشر الصفحات',
    paginationAria: 'ترقيم الصفحات',
    pageAria: 'صفحة',
    desktopSchedulesListAria: 'قائمة المواعيد في الديسكتوب',
    mobileSchedulesListAria: 'قائمة المواعيد في الجوال',
    fieldActions: 'الإجراءات',
  },
  teacherSessionsLabels: {
    pageTitle: 'جلسات المعلمين',
    pageDescription: 'إدارة جلسات الحلقات المستقبلية للمعلمين',
    circlesListTitle: 'قائمة الحلقات',
    teacherShort: 'المعلم:',
    teacherUnknown: 'غير محدد',
    searchPlaceholder: 'بحث...',
    searchCirclePlaceholder: 'بحث عن حلقة...',
    loading: 'جاري التحميل...',
    loadingCircles: 'جاري تحميل الحلقات...',
    noResults: 'لا توجد نتائج',
    noCircles: 'لا توجد حلقات',
    noCirclesSearch: 'لم يتم العثور على حلقات تطابق معايير البحث',
    selectedBadge: 'محدد',
    studentsCountTitle: 'عدد الطلاب',
    futureSessionsForCircle: (circle: string) => `الجلسات المستقبلية لحلقة: ${circle}`,
    futureSessionsGeneric: 'الجلسات المستقبلية للحلقة',
    addSessionButton: 'تسجيل جلسة جديدة',
    totalFutureSessions: (count: number) => `عدد الجلسات المستقبلية: ${count}`,
    noFutureSessions: 'لا توجد جلسات مستقبلية',
    chooseCircleTitle: 'اختر حلقة لعرض الجلسات',
    chooseCircleHelp: 'يرجى اختيار حلقة من القائمة على اليمين لعرض الجلسات المستقبلية الخاصة بها',
    editSession: 'تعديل الجلسة',
    deleteSession: 'حذف الجلسة',
    addDialogTitle: 'تسجيل جلسة جديدة',
    addDialogDescription: 'أدخل بيانات الجلسة الجديدة',
    addDialogSave: 'حفظ الجلسة',
    editDialogTitle: 'تعديل بيانات الجلسة',
    editDialogDescription: 'عدّل بيانات الجلسة المختارة',
    editDialogSave: 'حفظ التعديلات',
    cancel: 'إلغاء',
    fieldDate: 'التاريخ',
    fieldStart: 'وقت البدء',
    fieldEnd: 'وقت الانتهاء',
    fieldNotes: 'ملاحظات',
    fieldNotesPlaceholder: 'أي ملاحظات إضافية حول الجلسة...',
    deleteDialogTitle: 'تأكيد حذف الجلسة',
    deleteDialogDescription: 'هل أنت متأكد من رغبتك في حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.',
    deleteDialogDetailsTitle: 'بيانات الجلسة المراد حذفها:',
    deleteButton: 'نعم، قم بالحذف'
  }
};

// English placeholders (should be completed later). Keep same structure.
const en: typeof ar = {
  errorMessages: {
    generalError: 'Error', generalWarning: 'Warning', requiredField: 'Required field', invalidInput: 'Invalid value', dataError: 'Data error', searchError: 'Search error', missingCredentials: 'Enter username and password', permissionError: 'Permission error', accessDenied: 'Access denied', incorrectRole: (a: string, e: string) => `Logged in as ${a} not ${e}`, loginFailed: 'Login failed', invalidCredentials: 'Invalid username or password', loginError: 'Login error', saveFailed: 'Save failed', deleteFailed: 'Delete failed', updateFailed: 'Update failed', fetchFailed: 'Fetch failed', operationFailed: 'Operation failed', connectionError: 'Connection error', databaseError: 'Database error', errorLoadingData: 'Failed to load data', consoleLoginError: 'Login error:', consoleUserLoadError: 'Error loading users:', consoleUserSaveError: 'Error saving user:', consoleExportDataError: 'Export error:', consoleImportFileError: 'Import file error:', consoleParsingJsonError: 'JSON parse error:', consoleStudentDetailsError: 'Fetch student details error:', consoleStudentSaveError: 'Save student error:', consoleEmailSendError: 'Email send failed:', consoleStudentDataSubmitError: 'Student submit error:', consoleStudentsFetchError: 'Fetch students error:', invalidEmail: 'Invalid email', invalidPhone: 'Invalid phone', invalidName: 'Invalid name', invalidDate: 'Invalid date', passwordMismatch: 'Passwords mismatch', weakPassword: 'Weak password'
  },
  successMessages: {
    loginSuccess: 'Logged in', welcome: (name: string) => `Welcome ${name}`, saveSuccess: 'Saved successfully', deleteSuccess: 'Deleted successfully', updateSuccess: 'Updated successfully', operationSuccess: 'Operation successful', completed: 'Completed successfully'
  },
  commonLabels: {
    submit: 'Submit', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', add: 'Add', close: 'Close', back: 'Back', next: 'Next', previous: 'Previous', confirm: 'Confirm', search: 'Search', filter: 'Filter', reset: 'Reset', refresh: 'Refresh', download: 'Download', upload: 'Upload', print: 'Print', login: 'Login', logout: 'Logout', loading: 'Loading...', processing: 'Processing...', saving: 'Saving...', deleting: 'Deleting...', updating: 'Updating...', menu: 'Menu', home: 'Home', dashboard: 'Dashboard', settings: 'Settings', profile: 'Profile', yes: 'Yes', no: 'No', all: 'All', none: 'None', from: 'From', to: 'To', today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow', noData: 'No data', noResults: 'No results', moreInfo: 'More info'
  },
  studentsLabels: { ...ar.studentsLabels },
  guardiansLabels: { ...ar.guardiansLabels },
  teacherHistoryLabels: { ...ar.teacherHistoryLabels }
  ,loginLabels: { ...ar.loginLabels }
  ,userManagementLabels: { ...ar.userManagementLabels }
  ,studyCirclesLabels: { ...ar.studyCirclesLabels }
  ,databaseManagementLabels: { ...ar.databaseManagementLabels }
  ,parentInquiryLabels: { ...ar.parentInquiryLabels }
  ,dashboardStatsLabels: { ...ar.dashboardStatsLabels }
  ,homeLabels: { ...ar.homeLabels }
  ,footerLabels: { ...ar.footerLabels }
  ,studyCircleSchedulesLabels: { ...ar.studyCircleSchedulesLabels }
  ,teacherSessionsLabels: { ...ar.teacherSessionsLabels }
};

export const labelsByLang: Record<SupportedLang, typeof ar> = { ar, en };

export function getLabels(lang: SupportedLang = 'ar') {
  // Ensure quranPartsOptions is populated once (idempotent)
  const lbl = labelsByLang[lang];
  const partsArr = lbl.studentsLabels.quranPartsOptions;
  if (!partsArr || partsArr.length === 0) {
    const ordinals = lbl.studentsLabels.quranJuzOrdinals;
    const word = lbl.studentsLabels.quranJuzWord;
    const generated = [] as { value: string; label: string }[];
    for (let i = 1; i <= 30; i++) {
      const ordinal = ordinals?.[i] || i.toString();
      generated.push({ value: String(i), label: `${word} ${ordinal}` });
      generated.push({ value: `part_${i}`, label: `${word} ${ordinal}` }); // support raw part_i storage/reference
    }
    // Unique by value
    const seen = new Set<string>();
    const unique = generated.filter(p => (seen.has(p.value) ? false : (seen.add(p.value), true)));
    // Append completion options variants
    unique.push({ value: 'complete', label: lbl.studentsLabels.quranComplete });
    unique.push({ value: 'completed', label: lbl.studentsLabels.quranComplete });
    unique.push({ value: 'full', label: lbl.studentsLabels.quranComplete });
    lbl.studentsLabels.quranPartsOptions = unique;
  }
  return lbl;
}

export type AllLabels = ReturnType<typeof getLabels>;
