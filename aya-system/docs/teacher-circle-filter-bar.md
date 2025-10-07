# مكوّن TeacherCircleFilterBar

مكوّن فلترة عام (RTL) مستلهم من نمط شاشة سجلات الحفظ، لكنه مبسّط ليحتوي فقط:

- حقل بحث نصي واحد
- زر اختيار معلم
- زر اختيار حلقة

لا يقدّم حوارات داخلية؛ يفترض أن الصفحة الأم تتكفل بعرض حوارات اختيار المعلم / الحلقة (جداول، مودالات، إلخ) ثم تعيد القيم عبر callbacks.

## الاستيراد
```tsx
import TeacherCircleFilterBar, { TeacherCircleFilterBarProps } from '@/components/filters/TeacherCircleFilterBar';
```

## الواجهات (Interfaces)
```ts
interface BasicEntity { id: string; name: string; circles_count?: number; teacher_id?: string; }
```

```ts
interface TeacherCircleFilterBarProps {
  teachers: BasicEntity[];
  circles: BasicEntity[];
  selectedTeacherId: string | null;
  selectedCircleId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onTeacherClick?: () => void;   // فتح حوار اختيار المعلم
  onCircleClick?: () => void;    // فتح حوار اختيار الحلقة
  onClearTeacher?: () => void;   // مسح اختيار المعلم
  onClearCircle?: () => void;    // مسح اختيار الحلقة
  disabled?: boolean;
  showCounts?: boolean;          // إظهار عدّاد الحلقات للمعلم
  className?: string;
  teacherLabel?: string;         // نص افتراضي: "اختر معلماً"
  circleLabel?: string;          // نص افتراضي: "اختر حلقة"
  searchPlaceholder?: string;    // نص افتراضي: "🔍 بحث عن معلم أو حلقة..."
}
```

## مثال استخدام أساسي
```tsx
import React, { useState } from 'react';
import TeacherCircleFilterBar from '@/components/filters/TeacherCircleFilterBar';

const ExamplePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [circleId, setCircleId] = useState<string | null>(null);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [isCircleDialogOpen, setIsCircleDialogOpen] = useState(false);

  const teachers = [
    { id: 't1', name: 'أ. أحمد', circles_count: 3 },
    { id: 't2', name: 'أ. خالد', circles_count: 1 },
  ];
  const circles = [
    { id: 'c1', name: 'حلقة الفتح', teacher_id: 't1' },
    { id: 'c2', name: 'حلقة النور', teacher_id: 't1' },
    { id: 'c3', name: 'حلقة الفرقان', teacher_id: 't2' },
  ].filter(c => !teacherId || c.teacher_id === teacherId);

  return (
    <div className="space-y-4">
      <TeacherCircleFilterBar
        teachers={teachers}
        circles={circles}
        selectedTeacherId={teacherId}
        selectedCircleId={circleId}
        searchQuery={search}
        onSearchChange={setSearch}
        onTeacherClick={() => setIsTeacherDialogOpen(true)}
        onCircleClick={() => setIsCircleDialogOpen(true)}
        onClearTeacher={() => { setTeacherId(null); setCircleId(null); }}
        onClearCircle={() => setCircleId(null)}
      />

      {/* حوارات اختيار (شكل تخيّلي) */}
      {isTeacherDialogOpen && (
        <div className="modal">/* جدول المعلمين - عند الاختيار setTeacherId(id); */</div>
      )}
      {isCircleDialogOpen && (
        <div className="modal">/* جدول الحلقات - عند الاختيار setCircleId(id); */</div>
      )}

      <div className="p-4 bg-white rounded shadow">نتائج البحث / المحتوى المعتمد على الاختيارات...</div>
    </div>
  );
};

export default ExamplePage;
```

## ملاحظات
- التصميم يدعم RTL افتراضياً.
- يمكنك تمرير `disabled` لتعطيل كل العناصر (مثلاً أثناء التحميل).
- دمج الأنماط عبر `className` متاح مع الحفاظ على النمط الأساسي.
- إن لم تكن تستخدم دالة `cn` الموجودة في بعض المشاريع (shadcn utils) استبدلها بدمج بسيط: `(base + ' ' + extra)`.

## تحسينات مستقبلية مقترحة
1. إضافة خاصية inlineSelectMode لعرض `<select>` بدل زر يفتح حوار خارجي.
2. إضافة معدل Debounce للبحث داخلياً.
3. دعم خيار اختيار متعدد للحلقات.
4. إضافة skeleton أثناء التحميل.

_مكوّن بسيط ومرن لإعادة الاستخدام._
