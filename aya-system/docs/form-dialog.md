## مكون FormDialog

مكون `FormDialog` هو مكون عام للحوارات التي تستخدم في عمليات الإضافة والتعديل في التطبيق. يوفر هذا المكون واجهة موحدة لجميع نماذج الإضافة والتعديل في التطبيق.

### كيفية الاستخدام

```tsx
import { FormDialog, FormRow } from "@/components/ui/form-dialog";

// حالة الحوار
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [formData, setFormData] = useState({
  // بيانات النموذج
});

// دالة الحفظ
const handleSave = async () => {
  setIsLoading(true);
  try {
    // قم بحفظ البيانات
    // ...
    setIsDialogOpen(false);
  } catch (error) {
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};

// استخدام المكون في JSX
return (
  <FormDialog
    title="عنوان الحوار"
    description="وصف الحوار"
    open={isDialogOpen}
    onOpenChange={setIsDialogOpen}
    onSave={handleSave}
    isLoading={isLoading}
    saveButtonText="حفظ"
    mode="add" // أو "edit" للتعديل
  >
    {/* محتوى النموذج */}
    <FormRow label="حقل 1">
      <Input
        value={formData.field1}
        onChange={(e) => setFormData({ ...formData, field1: e.target.value })}
      />
    </FormRow>
    <FormRow label="حقل 2" error={errors.field2}>
      <Input
        value={formData.field2}
        onChange={(e) => setFormData({ ...formData, field2: e.target.value })}
      />
    </FormRow>
  </FormDialog>
);
```

### الخصائص

#### `FormDialog` خصائص

- `title` (string): عنوان الحوار
- `description` (ReactNode؟): وصف اختياري للحوار
- `open` (boolean): حالة فتح/إغلاق الحوار
- `onOpenChange` (function): دالة تُستدعى عند تغيير حالة الحوار
- `onSave` (function): دالة تُستدعى عند الضغط على زر الحفظ
- `children` (ReactNode): محتوى النموذج
- `saveButtonText` (string؟): نص زر الحفظ (الافتراضي: "حفظ")
- `cancelButtonText` (string؟): نص زر الإلغاء (الافتراضي: "إلغاء")
- `mode` ("add" | "edit"؟): نوع العملية (الافتراضي: "add")
- `isLoading` (boolean؟): حالة التحميل (الافتراضي: false)
- `maxWidth` (string؟): عرض الحوار (الافتراضي: "480px")
- `extraButtons` (ReactNode؟): أزرار إضافية في الفوتر

#### `FormRow` خصائص

- `label` (string): عنوان الحقل
- `children` (ReactNode): محتوى الحقل (عادة Input أو Select أو ما شابه)
- `error` (string؟): رسالة خطأ للحقل (اختياري)
- `className` (string؟): فئات CSS إضافية (اختياري)

### مزايا استخدام المكون

1. **توحيد المظهر**: يضمن أن جميع الحوارات في التطبيق لها نفس المظهر والسلوك.
2. **سهولة الاستخدام**: يبسط عملية إنشاء نماذج الإضافة والتعديل.
3. **قابلية التوسع**: يمكن تخصيص المكون بسهولة لتلبية احتياجات محددة.
4. **تقليل التكرار**: يمنع تكرار نفس الكود في أجزاء مختلفة من التطبيق.

### أمثلة عملية

1. **إضافة سجل جديد**:
```tsx
<FormDialog
  title="إضافة طالب جديد"
  description="أدخل بيانات الطالب الجديد"
  open={isAddDialogOpen}
  onOpenChange={setIsAddDialogOpen}
  onSave={handleAddStudent}
  isLoading={isAdding}
  mode="add"
>
  <FormRow label="اسم الطالب">
    <Input value={name} onChange={(e) => setName(e.target.value)} />
  </FormRow>
  {/* المزيد من الحقول */}
</FormDialog>
```

2. **تعديل سجل موجود**:
```tsx
<FormDialog
  title="تعديل بيانات الطالب"
  description={`تعديل بيانات: ${student.name}`}
  open={isEditDialogOpen}
  onOpenChange={setIsEditDialogOpen}
  onSave={handleUpdateStudent}
  isLoading={isUpdating}
  mode="edit"
>
  <FormRow label="اسم الطالب">
    <Input value={name} onChange={(e) => setName(e.target.value)} />
  </FormRow>
  {/* المزيد من الحقول */}
</FormDialog>
```
