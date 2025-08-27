// أنواع سجلات الحفظ والمراجعة
export type MemorizationType = 'new' | 'review' | 'sabqi';

// نوع أخطاء التجويد
export interface TajweedErrors {
  lahn_jali?: number; // اللحن الجلي
  lahn_khafi?: number; // اللحن الخفي
  [key: string]: number | undefined; // للسماح بإضافة أنواع أخرى من الأخطاء
}

// واجهة سجل الحفظ والمراجعة
export interface MemorizationRecord {
  id: number;
  student_id: string;
  date: string;
  type: MemorizationType;
  from_surah: number;
  from_ayah: number;
  to_surah: number;
  to_ayah: number;
  score?: number; // درجة التسميع
  tajweed_errors?: TajweedErrors;
  notes?: string;
  recorded_by?: string;
  created_at?: string;
  
  // علاقات
  student?: {
    id: string;
    full_name: string;
    grade_level?: string;
    study_circle?: {
      id: string;
      name?: string;
    };
    guardian?: {
      id: string;
      full_name: string;
      phone_number?: string;
    };
  };
  recorder?: {
    id: string;
    full_name: string;
  };
}

// واجهة إنشاء سجل جديد
export interface MemorizationRecordCreate extends Omit<MemorizationRecord, 'id' | 'created_at' | 'student' | 'recorder'> {
  id?: number; // اختياري عند الإنشاء
}

// واجهة تحديث سجل موجود
export interface MemorizationRecordUpdate extends Partial<Omit<MemorizationRecord, 'id' | 'created_at' | 'student' | 'recorder'>> {
  id: number; // إلزامي للتحديث
}

// وظيفة مساعدة للحصول على اسم نوع السجل بالعربية
export function getMemorizationTypeName(type: MemorizationType): string {
  switch (type) {
    case 'new':
      return 'حفظ جديد';
    case 'review':
      return 'مراجعة';
    case 'sabqi':
      return 'مراجعة قديمة';
    default:
      return type;
  }
}

// وظيفة مساعدة للحصول على لون نوع السجل
export function getMemorizationTypeColor(type: MemorizationType): string {
  switch (type) {
    case 'new':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'review':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'sabqi':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// قائمة أنواع السجلات
export const memorizationTypeOptions = [
  { value: 'new', label: 'حفظ جديد' },
  { value: 'review', label: 'مراجعة' },
  { value: 'sabqi', label: 'مراجعة قديمة' }
];

// قائمة السور في القرآن الكريم
export const quranSurahs = [
  { number: 1, name: "الفاتحة", ayahs: 7 },
  { number: 2, name: "البقرة", ayahs: 286 },
  { number: 3, name: "آل عمران", ayahs: 200 },
  { number: 4, name: "النساء", ayahs: 176 },
  { number: 5, name: "المائدة", ayahs: 120 },
  { number: 6, name: "الأنعام", ayahs: 165 },
  { number: 7, name: "الأعراف", ayahs: 206 },
  { number: 8, name: "الأنفال", ayahs: 75 },
  { number: 9, name: "التوبة", ayahs: 129 },
  { number: 10, name: "يونس", ayahs: 109 },
  { number: 11, name: "هود", ayahs: 123 },
  { number: 12, name: "يوسف", ayahs: 111 },
  { number: 13, name: "الرعد", ayahs: 43 },
  { number: 14, name: "إبراهيم", ayahs: 52 },
  { number: 15, name: "الحجر", ayahs: 99 },
  { number: 16, name: "النحل", ayahs: 128 },
  { number: 17, name: "الإسراء", ayahs: 111 },
  { number: 18, name: "الكهف", ayahs: 110 },
  { number: 19, name: "مريم", ayahs: 98 },
  { number: 20, name: "طه", ayahs: 135 },
  { number: 21, name: "الأنبياء", ayahs: 112 },
  { number: 22, name: "الحج", ayahs: 78 },
  { number: 23, name: "المؤمنون", ayahs: 118 },
  { number: 24, name: "النور", ayahs: 64 },
  { number: 25, name: "الفرقان", ayahs: 77 },
  { number: 26, name: "الشعراء", ayahs: 227 },
  { number: 27, name: "النمل", ayahs: 93 },
  { number: 28, name: "القصص", ayahs: 88 },
  { number: 29, name: "العنكبوت", ayahs: 69 },
  { number: 30, name: "الروم", ayahs: 60 },
  { number: 31, name: "لقمان", ayahs: 34 },
  { number: 32, name: "السجدة", ayahs: 30 },
  { number: 33, name: "الأحزاب", ayahs: 73 },
  { number: 34, name: "سبأ", ayahs: 54 },
  { number: 35, name: "فاطر", ayahs: 45 },
  { number: 36, name: "يس", ayahs: 83 },
  { number: 37, name: "الصافات", ayahs: 182 },
  { number: 38, name: "ص", ayahs: 88 },
  { number: 39, name: "الزمر", ayahs: 75 },
  { number: 40, name: "غافر", ayahs: 85 },
  { number: 41, name: "فصلت", ayahs: 54 },
  { number: 42, name: "الشورى", ayahs: 53 },
  { number: 43, name: "الزخرف", ayahs: 89 },
  { number: 44, name: "الدخان", ayahs: 59 },
  { number: 45, name: "الجاثية", ayahs: 37 },
  { number: 46, name: "الأحقاف", ayahs: 35 },
  { number: 47, name: "محمد", ayahs: 38 },
  { number: 48, name: "الفتح", ayahs: 29 },
  { number: 49, name: "الحجرات", ayahs: 18 },
  { number: 50, name: "ق", ayahs: 45 },
  { number: 51, name: "الذاريات", ayahs: 60 },
  { number: 52, name: "الطور", ayahs: 49 },
  { number: 53, name: "النجم", ayahs: 62 },
  { number: 54, name: "القمر", ayahs: 55 },
  { number: 55, name: "الرحمن", ayahs: 78 },
  { number: 56, name: "الواقعة", ayahs: 96 },
  { number: 57, name: "الحديد", ayahs: 29 },
  { number: 58, name: "المجادلة", ayahs: 22 },
  { number: 59, name: "الحشر", ayahs: 24 },
  { number: 60, name: "الممتحنة", ayahs: 13 },
  { number: 61, name: "الصف", ayahs: 14 },
  { number: 62, name: "الجمعة", ayahs: 11 },
  { number: 63, name: "المنافقون", ayahs: 11 },
  { number: 64, name: "التغابن", ayahs: 18 },
  { number: 65, name: "الطلاق", ayahs: 12 },
  { number: 66, name: "التحريم", ayahs: 12 },
  { number: 67, name: "الملك", ayahs: 30 },
  { number: 68, name: "القلم", ayahs: 52 },
  { number: 69, name: "الحاقة", ayahs: 52 },
  { number: 70, name: "المعارج", ayahs: 44 },
  { number: 71, name: "نوح", ayahs: 28 },
  { number: 72, name: "الجن", ayahs: 28 },
  { number: 73, name: "المزمل", ayahs: 20 },
  { number: 74, name: "المدثر", ayahs: 56 },
  { number: 75, name: "القيامة", ayahs: 40 },
  { number: 76, name: "الإنسان", ayahs: 31 },
  { number: 77, name: "المرسلات", ayahs: 50 },
  { number: 78, name: "النبأ", ayahs: 40 },
  { number: 79, name: "النازعات", ayahs: 46 },
  { number: 80, name: "عبس", ayahs: 42 },
  { number: 81, name: "التكوير", ayahs: 29 },
  { number: 82, name: "الإنفطار", ayahs: 19 },
  { number: 83, name: "المطففين", ayahs: 36 },
  { number: 84, name: "الإنشقاق", ayahs: 25 },
  { number: 85, name: "البروج", ayahs: 22 },
  { number: 86, name: "الطارق", ayahs: 17 },
  { number: 87, name: "الأعلى", ayahs: 19 },
  { number: 88, name: "الغاشية", ayahs: 26 },
  { number: 89, name: "الفجر", ayahs: 30 },
  { number: 90, name: "البلد", ayahs: 20 },
  { number: 91, name: "الشمس", ayahs: 15 },
  { number: 92, name: "الليل", ayahs: 21 },
  { number: 93, name: "الضحى", ayahs: 11 },
  { number: 94, name: "الشرح", ayahs: 8 },
  { number: 95, name: "التين", ayahs: 8 },
  { number: 96, name: "العلق", ayahs: 19 },
  { number: 97, name: "القدر", ayahs: 5 },
  { number: 98, name: "البينة", ayahs: 8 },
  { number: 99, name: "الزلزلة", ayahs: 8 },
  { number: 100, name: "العاديات", ayahs: 11 },
  { number: 101, name: "القارعة", ayahs: 11 },
  { number: 102, name: "التكاثر", ayahs: 8 },
  { number: 103, name: "العصر", ayahs: 3 },
  { number: 104, name: "الهمزة", ayahs: 9 },
  { number: 105, name: "الفيل", ayahs: 5 },
  { number: 106, name: "قريش", ayahs: 4 },
  { number: 107, name: "الماعون", ayahs: 7 },
  { number: 108, name: "الكوثر", ayahs: 3 },
  { number: 109, name: "الكافرون", ayahs: 6 },
  { number: 110, name: "النصر", ayahs: 3 },
  { number: 111, name: "المسد", ayahs: 5 },
  { number: 112, name: "الإخلاص", ayahs: 4 },
  { number: 113, name: "الفلق", ayahs: 5 },
  { number: 114, name: "الناس", ayahs: 6 }
];

// وظيفة مساعدة للحصول على اسم السورة من رقمها
export function getSurahName(surahNumber: number): string {
  const surah = quranSurahs.find(s => s.number === surahNumber);
  return surah ? surah.name : `سورة ${surahNumber}`;
}

// وظيفة مساعدة للحصول على عدد آيات السورة
export function getSurahAyahsCount(surahNumber: number): number {
  const surah = quranSurahs.find(s => s.number === surahNumber);
  return surah ? surah.ayahs : 0;
}

// وظيفة مساعدة لتنسيق عرض نطاق الآيات المحفوظة
export function formatMemorizationRange(record: MemorizationRecord): string {
  if (record.from_surah === record.to_surah) {
    return `${getSurahName(record.from_surah)} (${record.from_ayah} - ${record.to_ayah})`;
  } else {
    return `${getSurahName(record.from_surah)} (${record.from_ayah}) - ${getSurahName(record.to_surah)} (${record.to_ayah})`;
  }
}

// وظيفة مساعدة لتنسيق عرض درجة التسميع
export function formatScore(score?: number): string {
  if (score === undefined || score === null) {
    return '-';
  }
  
  return score.toFixed(2);
}

// وظيفة مساعدة لتنسيق عرض أخطاء التجويد
export function formatTajweedErrors(errors?: TajweedErrors): string {
  if (!errors) {
    return 'لا يوجد';
  }
  
  const errorTexts = [];
  if (errors.lahn_jali) {
    errorTexts.push(`لحن جلي: ${errors.lahn_jali}`);
  }
  if (errors.lahn_khafi) {
    errorTexts.push(`لحن خفي: ${errors.lahn_khafi}`);
  }
  
  // إضافة أي أخطاء أخرى
  Object.entries(errors).forEach(([key, value]) => {
    if (key !== 'lahn_jali' && key !== 'lahn_khafi' && value) {
      errorTexts.push(`${key}: ${value}`);
    }
  });
  
  return errorTexts.length > 0 ? errorTexts.join('، ') : 'لا يوجد';
}
