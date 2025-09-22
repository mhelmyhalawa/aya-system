# StudentFormDialog توثيق المكون

مكون موحد لنموذج إضافة/تعديل الطالب (نمط معالج متعدد الخطوات) ويُستخدم في شاشات مثل: قائمة الطلاب، وقائمة أولياء الأمور (إضافة طالب أو تعديل طلاب ولي الأمر).

## الأهداف
- توحيد واجهة إدخال بيانات الطالب عبر أكثر من سياق.
- دعم الحقول الأساسية + الارتباطات (المعلم / الحلقة) + بيانات التواصل.
- جعل المعلم والحلقة حقولاً إلزامية (مع التحقق والرسائل).
- تحميل الحلقات ديناميكياً عند اختيار المعلم، مع كاش لتجنب إعادة الطلب.

## الخصائص (Props)
| الاسم | النوع | الوصف |
|-------|-------|-------|
| `open` | `boolean` | تحكم في فتح/غلق الحوار. |
| `mode` | `'add' | 'edit'` | حالة النموذج إضافة أو تعديل. |
| `onOpenChange` | `(open: boolean) => void` | رد نداء عند تغيير حالة الفتح. |
| `initialData` | `Partial<StudentFormData>` | بيانات مبدئية للتعديل. |
| `onSubmit` | `(data: StudentFormData) => Promise<void> | void` | حفظ البيانات بعد اكتمال الخطوات. |
| `guardians` | `{ id; full_name; phone_number? }[]` | قائمة أولياء الأمور المتاحة. |
| `teachers` | `{ id; full_name }[]` | قائمة المعلمين. |
| `studyCircles` | `{ id; name; teacher_id? }[]` | قائمة الحلقات للمعلم المختار. |
| `isTeacher` | `boolean` | إذا كان المستخدم الحالي معلمًا (يختصر حقل اختيار المعلم). |
| `currentTeacherId` | `string?` | معرف المعلم الحالي (إن وجد). |
| `onLoadTeacherCircles` | `(teacherId: string) => Promise<void> | void` | دالة لجلب حلقات المعلم. |
| `fixedGuardianId` | `string?` | تثبيت ولي الأمر (يظهر كنص فقط). |
| `allowGuardianSelection` | `boolean?` | يسمح بتغيير ولي الأمر (وضع الإضافة العامة من شاشة أولياء الأمور). |
| `onAfterSubmit` | `() => void` | رد نداء اختياري بعد النجاح. |
| `isLoadingCircles` | `boolean?` | حالة تحميل حلقات المعلم (تعطيل + سكيليتون). |

## كائن StudentFormData
```ts
interface StudentFormData {
  id?: string;
  full_name: string;
  guardian_id?: string;
  grade_level?: string;
  gender?: 'male' | 'female' | '';
  date_of_birth?: string;
  memorized_parts?: string;
  phone_number?: string;
  email?: string;
  notes?: string;
  study_circle_id?: string;
  teacher_id?: string;
}
```

## بنية الخطوات
1. البيانات الأساسية: (اسم الطالب، ولي الأمر، الجنس، تاريخ الميلاد، الصف) – يتحقق من: الاسم بدون مسافات + الصف + ولي الأمر.
2. الارتباطات: (المعلم، الحلقة، آخر تقدم حفظ) – المعلم والحلقة إلزاميان.
3. التواصل والملاحظات: (الهاتف، البريد، الملاحظات).

## التحقق والرسائل
- تفعيل `showValidation` عند أول محاولة انتقال فاشلة.
- رسائل مرئية تحت الحقول المطلوبة + Toast موحد يذكر الحقول الناقصة.
- الاسم يُجبر على إزالة المسافات الداخلية أثناء الكتابة.

## تحميل الحلقات
- يستدعي `onLoadTeacherCircles(teacherId)` عند اختيار المعلم.
- أثناء التحميل: يظهر سطر سكيليتون "جار التحميل..." ويُعطل اختيار الحلقة.
- عند عدم وجود نتائج: يظهر نص "لا توجد حلقات".

## الكاش (Guardians List سياق)
- في `guardians-list.tsx` تم إنشاء كائن كاش `circlesCacheRef` يربط `teacherId` بقائمة الحلقات.
- قبل الجلب يفحص الكاش لتقليل الطلبات.

## أفضل ممارسات استخدام
```tsx
<StudentFormDialog
  open={dialogOpen}
  mode={editingId ? 'edit' : 'add'}
  initialData={editingStudent}
  onOpenChange={setDialogOpen}
  onSubmit={handleSubmit}
  guardians={guardians}
  teachers={teachers}
  studyCircles={teacherCircles}
  isTeacher={userRole === 'teacher'}
  currentTeacherId={userId}
  onLoadTeacherCircles={loadCirclesForTeacher}
  allowGuardianSelection={true}
  isLoadingCircles={isLoadingTeacherCircles}
/>
```

## ملاحظات مستقبلية (تحسينات مقترحة)
- إضافة دعم رفع صورة شخصية.
- دعم تعدد الحلقات (اختيار أكثر من حلقة) لو احتج مستقبلاً.
- نقل الثوابت (القوائم) إلى مصدر موحد + i18n لاحق.
- إضافة اختبارات وحدات (validation logic) خاصة بالخطوات.

## سجل التعديلات الرئيسية
- إضافة prop `isLoadingCircles` + سكيليتون.
- إضافة رسائل تحقق مرئية + Toast للحقل المفقود.
- إزالة التكرار في التحقق وتحسين تجربة المستخدم.

انتهى.
