import { useEffect, useState, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FormDialog } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronRight, UserCircle } from 'lucide-react';
import { studentsLabels } from '@/lib/arabic-labels';

/**
 * Shared student form dialog (wizard style) used for add & edit from multiple contexts
 */
export interface StudentFormData {
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
  teacher_id?: string; // للسياقات الإدارية
}

export interface StudentFormDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData) => Promise<void> | void;
  /** guardians list: id & full_name & phone_number optional */
  guardians: { id: string; full_name: string; phone_number?: string | null }[];
  /** teachers list */
  teachers: { id: string; full_name: string; role?: string }[];
  /** study circles for selected teacher */
  studyCircles: { id: string; name: string; teacher_id?: string }[];
  /** whether current user is teacher (simplifies some steps) */
  isTeacher: boolean;
  /** current user id if teacher */
  currentTeacherId?: string | null;
  /** load circles when teacher changes */
  onLoadTeacherCircles?: (teacherId: string) => Promise<void> | void;
  /** force guardian fixed (e.g., from guardian context) */
  fixedGuardianId?: string;
  /** allow changing guardian (guardian context general add) */
  allowGuardianSelection?: boolean;
  /** optional callback after successful submit to close externally or refresh */
  onAfterSubmit?: () => void;
  /** circles loading indicator (passed from parent) */
  isLoadingCircles?: boolean;
}

/** Compact classes reused */
const compactFieldClass = 'h-9 text-sm';
const extraCompactFieldClass = 'h-8 text-[13px]';

export function StudentFormDialog(props: StudentFormDialogProps) {
  const {
    open, mode, onOpenChange, initialData, onSubmit,
    guardians, teachers, studyCircles, isTeacher, currentTeacherId,
    onLoadTeacherCircles, fixedGuardianId, allowGuardianSelection,
    onAfterSubmit, isLoadingCircles
  } = props;
  const { toast } = useToast();

  // wizard
  const steps = [
    { key: 'basic', title: 'البيانات الأساسية' },
    { key: 'associations', title: 'الارتباطات' },
    { key: 'contact', title: 'التواصل والملاحظات' }
  ];
  const [step, setStep] = useState(0);

  // local state
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [guardianId, setGuardianId] = useState(initialData?.guardian_id || fixedGuardianId || '');
  const [guardianSearch, setGuardianSearch] = useState('');
  const [grade, setGrade] = useState(initialData?.grade_level || '');
  const [gender, setGender] = useState<("male" | "female" | '')>((initialData?.gender as any) || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.date_of_birth || '');
  const [memorizedParts, setMemorizedParts] = useState(initialData?.memorized_parts || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phone_number || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [teacherId, setTeacherId] = useState<string>(
    isTeacher ? (currentTeacherId || '') : (initialData as any)?.teacher_id || ''
  );
  const [studyCircleId, setStudyCircleId] = useState(initialData?.study_circle_id || '');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // track circles loading for teacher context so we trigger only once per dialog open
  const circlesLoadedRef = useRef(false);

  // reset when opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setFullName(initialData?.full_name || '');
      setGuardianId(initialData?.guardian_id || fixedGuardianId || '');
      setGrade(initialData?.grade_level || '');
      setGender((initialData?.gender as any) || '');
      setDateOfBirth(initialData?.date_of_birth || '');
  setMemorizedParts(initialData?.memorized_parts || '');
      setPhoneNumber(initialData?.phone_number || '');
      setEmail(initialData?.email || '');
      setNotes(initialData?.notes || '');
      setTeacherId(isTeacher ? (currentTeacherId || '') : (initialData as any)?.teacher_id || '');
      setStudyCircleId(initialData?.study_circle_id || '');
      setGuardianSearch('');
      setTeacherSearch('');
      setShowValidation(false);
      // allow re-trigger next open
      circlesLoadedRef.current = false;
    }
  }, [open, initialData, isTeacher, currentTeacherId, fixedGuardianId]);

  // Auto load circles for teacher context (since teacher select is fixed and we never call onLoadTeacherCircles in UI)
  useEffect(() => {
    if (open && isTeacher && currentTeacherId && !circlesLoadedRef.current) {
      onLoadTeacherCircles?.(currentTeacherId);
      circlesLoadedRef.current = true;
    }
  }, [open, isTeacher, currentTeacherId, onLoadTeacherCircles]);

  // Auto select single circle if only one available (teacher context) and none chosen yet
  useEffect(() => {
    if (isTeacher && studyCircles.length === 1) {
      setStudyCircleId(prev => prev || studyCircles[0].id);
    }
  }, [isTeacher, studyCircles]);

  const filteredGuardians = useMemo(() => {
    return guardians.filter(g => !guardianSearch || g.full_name.includes(guardianSearch) || (g.phone_number && g.phone_number.includes(guardianSearch)));
  }, [guardians, guardianSearch]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => !teacherSearch || t.full_name.toLowerCase().includes(teacherSearch.toLowerCase()));
  }, [teachers, teacherSearch]);

  // validation per step
  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!fullName) return false;
      if (fullName.includes(' ')) return false;
      if (!grade) return false;
      if (!guardianId) return false;
    }
    if (s === 1) {
      // المعلم مطلوب في الوضع الإداري فقط، الحلقة مطلوبة فقط إذا لم يكن المستخدم معلماً
      if (!isTeacher && !teacherId) return false;
      if (!isTeacher && !studyCircleId) return false; // optional for teacher mode
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      if (!showValidation) setShowValidation(true);
      // حدد الرسائل المفقودة
      const missing: string[] = [];
      if (step === 0) {
        if (!fullName) missing.push('اسم الطالب');
        else if (fullName.includes(' ')) missing.push('الاسم بدون مسافات');
        if (!grade) missing.push('الصف');
        if (!guardianId) missing.push('ولي الأمر');
      } else if (step === 1) {
        if (!isTeacher && !teacherId) missing.push('المعلم');
        if (!isTeacher && !studyCircleId) missing.push('الحلقة');
      }
      if (missing.length) {
        toast({
          title: 'يرجى استكمال الحقول المطلوبة',
          description: missing.join('، '),
          variant: 'destructive'
        });
      }
      return;
    }
    setStep(s => Math.min(s + 1, steps.length - 1));
  };
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    if (isSubmitting) return; // guard
    setIsSubmitting(true);
    const payload: StudentFormData = {
      id: initialData?.id,
      full_name: fullName,
      guardian_id: guardianId || undefined,
      grade_level: grade || undefined,
      gender: gender || undefined,
      date_of_birth: dateOfBirth || undefined,
  memorized_parts: (memorizedParts || undefined),
      phone_number: phoneNumber || undefined,
      email: email || undefined,
      notes: notes || undefined,
      study_circle_id: studyCircleId || undefined,
      teacher_id: (isTeacher ? (currentTeacherId || undefined) : (teacherId || undefined))
    };
    try {
      await onSubmit(payload);
      onAfterSubmit?.();
      onOpenChange(false); // close dialog on success
    } catch (err: any) {
      // show toast if available
      try {
        toast({ title: 'تعذر الحفظ', description: err?.message || 'حدث خطأ أثناء حفظ بيانات الطالب', variant: 'destructive' });
      } catch { /* ignore */ }
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === 'add' ? studentsLabels.addStudent : studentsLabels.editStudent;
  const isLast = step === steps.length - 1;

  return (
    <FormDialog
      title={title}
      open={open}
      onOpenChange={onOpenChange}
      onSave={isLast ? submit : handleNext}
      mode={mode}
      saveButtonText={isLast ? studentsLabels.save : 'التالي'}
      isLoading={isSubmitting}
      maxWidth="360px"
      hideCancelButton
      mobileInlineActions
      saveButtonFirst
      extraButtons={(
        <>
          {step > 0 && (
            <Button
              type="button"
              onClick={handleBack}
              variant="outline"
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-transform transform hover:scale-105 flex items-center justify-center gap-2 shadow-md flex-1 basis-0 border border-green-300 text-green-700 bg-white hover:bg-green-50"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="leading-none tracking-wide">رجوع</span>
            </Button>
          )}
        </>
      )}
    >
      {/* step indicators */}
      <div className="w-full mb-1">
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={s.key}
                type="button"
                aria-label={`الانتقال إلى ${s.title}`}
                onClick={() => (i < step ? setStep(i) : null)}
                className={`relative w-4 h-4 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-green-400/50
                  ${active ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-inner ring-2 ring-green-300 animate-pulse' : ''}
                  ${!active && done ? 'bg-green-400/80 hover:bg-green-500' : ''}
                  ${!active && !done ? 'bg-gray-300 hover:bg-gray-400' : ''}
                  ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {/* حلقة خارجية عند الحالة النشطة */}
                {active && (
                  <span className="absolute -inset-1 rounded-full bg-green-500/20 animate-ping" />
                )}
                {/* علامة مكتمل صغيرة */}
                {done && !active && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-1 h-0.5 rounded bg-gray-200 overflow-hidden">
          <div className="h-full bg-islamic-green transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1" data-scroll-area>
        {step === 0 && (
          <div className="space-y-2 py-1">
            <div>
              <Label htmlFor="full_name" className="mb-1 block text-sm font-medium">اسم الطالب <span className="text-destructive">*</span></Label>
              <Input id="full_name" value={fullName} onChange={e => setFullName(e.target.value.replace(/\s+/g, ''))} placeholder="اكتب اسم الطالب دون مسافات" className={`focus:border-islamic-green ${compactFieldClass}`} />
              {showValidation && step === 0 && !fullName && <p className="text-[11px] text-destructive mt-1">هذا الحقل مطلوب</p>}
              {showValidation && step === 0 && !!fullName && fullName.includes(' ') && <p className="text-[11px] text-destructive mt-1">يجب أن يكون الاسم دون مسافات</p>}
            </div>
            <div>
              <Label htmlFor="guardian_id" className="mb-1 block text-sm font-medium">{studentsLabels.guardianName} <span className="text-destructive">*</span></Label>
              {allowGuardianSelection ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="بحث..." className="pl-7 text-[13px] focus:border-islamic-green h-8" value={guardianSearch} onChange={e => setGuardianSearch(e.target.value)} />
                  </div>
                  <Select value={guardianId} onValueChange={val => setGuardianId(val)}>
                    <SelectTrigger
                      id="guardian_id"
                      dir="rtl"
                      className={`h-8 text-right truncate max-w-full min-w-0 text-[12px] leading-none rounded-lg border px-2 pr-2 transition-all
                        focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800
                        ${guardianId
                          ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500'}
                      `}
                    >
                      <SelectValue placeholder="اختر ولي الأمر" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      dir="rtl"
                      align="start"
                      side="bottom"
                      className="text-right text-[12px] rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-64 overflow-auto"
                    >
                      {filteredGuardians.map(g => (
                        <SelectItem
                          key={g.id}
                          value={g.id}
                          className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                        >
                          {g.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                  <UserCircle className="h-4 w-4 text-islamic-green/60" />
                  <span className="text-sm">{guardians.find(g => g.id === guardianId)?.full_name || 'ولي الأمر محدد'}</span>
                </div>
              )}
              {showValidation && step === 0 && !guardianId && <p className="text-[11px] text-destructive mt-1">مطلوب اختيار ولي الأمر</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="gender" className="mb-1 block text-xs font-medium">الجنس <span className="text-muted-foreground text-[10px]">{studentsLabels.optionalField}</span></Label>
                <Select value={gender} onValueChange={v => setGender(v as any)}>
                  <SelectTrigger
                    id="gender"
                    dir="rtl"
                    className={`text-right truncate ${extraCompactFieldClass} leading-none rounded-lg border px-2 pr-2 transition-all
                      focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800
                      ${gender
                        ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500'}
                    `}
                  >
                    <SelectValue placeholder="الجنس" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="text-right text-[12px] rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900">
                    <SelectItem value="male" className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md">ذكر</SelectItem>
                    <SelectItem value="female" className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date_of_birth" className="mb-1 block text-xs font-medium">تاريخ الميلاد <span className="text-muted-foreground text-[10px]">اختياري</span></Label>
                <Input id="date_of_birth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className={`focus:border-islamic-green ${extraCompactFieldClass}`} />
              </div>
            </div>
            <div>
              <Label htmlFor="grade_level" className="mb-1 block text-sm font-medium">{studentsLabels.grade} <span className="text-destructive">*</span></Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger
                  id="grade_level"
                  dir="rtl"
                  className={`text-right truncate ${compactFieldClass} leading-none rounded-lg border px-2 pr-2 transition-all
                    focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800
                    ${grade
                      ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500'}
                  `}
                >
                  <SelectValue placeholder="اختر الصف" />
                </SelectTrigger>
                <SelectContent position="popper" dir="rtl" align="end" side="bottom" 
                className="max-h-[300px] text-sm rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900">
                  <SelectGroup>
                    <SelectLabel className="font-bold text-islamic-green">مرحلة رياض الأطفال</SelectLabel>
                    {studentsLabels.gradeOptions.slice(0, 2).map(o => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-islamic-green">المرحلة الابتدائية</SelectLabel>
                    {studentsLabels.gradeOptions.slice(2, 8).map(o => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-islamic-green">المرحلة الإعدادية</SelectLabel>
                    {studentsLabels.gradeOptions.slice(8, 11).map(o => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-islamic-green">المرحلة الثانوية</SelectLabel>
                    {studentsLabels.gradeOptions.slice(11, 14).map(o => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-islamic-green">المرحلة الجامعية</SelectLabel>
                    {studentsLabels.gradeOptions.slice(14, 20).map(o => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-islamic-green">الدراسات العليا</SelectLabel>
                    {studentsLabels.gradeOptions.slice(20).map(o => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {showValidation && step === 0 && !grade && <p className="text-[11px] text-destructive mt-1">مطلوب اختيار الصف</p>}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4 py-1">
            <div>
              <Label className="mb-2 block">{studentsLabels.teacherName} <span className="text-destructive">*</span></Label>
              {isTeacher ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                  <UserCircle className="h-4 w-4 text-islamic-green/60" />
                  <span>{teachers.find(t => t.id === currentTeacherId)?.full_name || 'المعلم الحالي'}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="البحث عن معلم" value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className={`pl-3 pr-10 ${compactFieldClass}`} />
                  </div>
                  <Select value={teacherId} onValueChange={val => { setTeacherId(val); setStudyCircleId(''); onLoadTeacherCircles?.(val); }}>
                    <SelectTrigger
                      id="teacher_id"
                      dir="rtl"
                      className={`text-right truncate ${compactFieldClass} leading-none rounded-lg border px-2 pr-2 transition-all
                        focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800
                        ${teacherId
                          ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500'}
                      `}
                    >
                      <SelectValue placeholder="اختر معلم" />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="text-right text-[12px] rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-64 overflow-auto">
                      {filteredTeachers.map(t => (
                        <SelectItem key={t.id} value={t.id} className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md">
                          {t.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showValidation && step === 1 && !isTeacher && !teacherId && <p className="text-[11px] text-destructive mt-1">مطلوب اختيار المعلم</p>}
                </div>
              )}
            </div>
            <div>
              <Label className="mb-2 block">
                {studentsLabels.studyCircleName}
                {!isTeacher && <span className="text-destructive"> *</span>}
                {isTeacher && <span className="text-muted-foreground text-[10px] ml-1">(اختياري)</span>}
              </Label>
              {isLoadingCircles ? (
                <div className="h-9 rounded-md bg-gray-200 animate-pulse flex items-center justify-center text-xs text-gray-500">جار التحميل...</div>
              ) : isTeacher && studyCircles.length === 1 ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                  <UserCircle className="h-4 w-4 text-islamic-green/60" />
                  <span>{studyCircles[0]?.name || 'حلقة واحدة'}</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-islamic-green text-white">ثابت</span>
                </div>
              ) : (
                <Select
                  value={studyCircleId}
                  onValueChange={val => setStudyCircleId(val)}
                  disabled={(!teacherId && !isTeacher) || !!isLoadingCircles || (isTeacher && studyCircles.length === 0)}
                >
                  <SelectTrigger
                    id="study_circle_id"
                    dir="rtl"
                    className={`text-right truncate ${compactFieldClass} leading-none rounded-lg border px-2 pr-2 transition-all
                      focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800
                      ${(studyCircleId)
                        ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500'}
                      ${(!teacherId && !isTeacher) || isLoadingCircles ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                  >
                    <SelectValue placeholder={(teacherId || isTeacher) ? (studentsLabels.studyCirclePlaceholder || 'اختر حلقة') : 'اختر معلم أولاً'} />
                  </SelectTrigger>
                  <SelectContent position="popper" dir="rtl" align="start" side="bottom" className="text-right text-[12px] rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-64 overflow-auto">
                    {studyCircles.length > 0 ? (
                      studyCircles.map(c => <SelectItem key={c.id} value={c.id} className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md">{c.name}</SelectItem>)
                    ) : (
                      <div className="p-2 text-center text-muted-foreground">{(teacherId || isTeacher) ? 'لا توجد حلقات' : 'اختر معلم أولاً'}</div>
                    )}
                  </SelectContent>
                </Select>
              )}
              {showValidation && step === 1 && !studyCircleId && !isTeacher && <p className="text-[11px] text-destructive mt-1">مطلوب اختيار الحلقة</p>}
            </div>
            <div>
              <Label className="mb-2 block">{studentsLabels.lastQuranProgress} <span className="text-muted-foreground text-xs">{studentsLabels.optionalField}</span></Label>
              {(() => {
                /**
                 * نعالج التكرار مثل: value = '1' و value = 'part_1' ولهما نفس الملصق "الجزء الأول"
                 * وكذلك القيم: complete / completed / full => نعرض خياراً واحداً.
                 * المنطق: استخراج رقم الجزء (1-30) إن وُجد من value أو من الملصق، ثم نوحده كمفتاح.
                 */
                const raw = studentsLabels.quranPartsOptions || [];

                const getCanonicalKey = (o: { value: string | number; label: string }) => {
                  const v = String(o.value).toLowerCase();
                  // 1) إكمال المصحف
                  if (/^(complete|completed|full)$/.test(v)) return 'complete';
                  // 2) رقم مباشر
                  if (/^\d+$/.test(v)) {
                    const n = parseInt(v, 10);
                    if (n >= 1 && n <= 30) return `juz_${n}`;
                  }
                  // 3) part_10 ، part_1 ...
                  const mPart = v.match(/^part_(\d{1,2})$/);
                  if (mPart) {
                    const n = parseInt(mPart[1], 10);
                    if (n >= 1 && n <= 30) return `juz_${n}`;
                  }
                  // 4) محاولة استخراج رقم من الملصق نفسه
                  const digits = (o.label || '').match(/(\d{1,2})/);
                  if (digits) {
                    const n = parseInt(digits[1], 10);
                    if (n >= 1 && n <= 30) return `juz_${n}`;
                  }
                  // 5) fallback: قيمة منخفضة و مٌنقّاة
                  return `raw_${v.replace(/\s+/g, '')}`;
                };

                const map = new Map<string, { value: string; label: string }>();
                for (const o of raw) {
                  const key = getCanonicalKey({ value: o.value, label: o.label });
                  if (!map.has(key)) {
                    if (key === 'complete') {
                      // نوحد التسمية لرسالة الإكمال الرسمية
                      map.set(key, { value: 'complete', label: studentsLabels.quranComplete });
                    } else if (key.startsWith('juz_')) {
                      // نستعمل أول عنصر كما هو (يحمل label العربي الصحيح)
                      map.set(key, { value: String(o.value), label: o.label });
                    } else {
                      map.set(key, { value: String(o.value), label: o.label });
                    }
                  }
                }
                const uniqueOptions = Array.from(map.values());
                return (
                  <Select value={memorizedParts} onValueChange={val => setMemorizedParts(val)}>
                    <SelectTrigger
                      id="memorized_parts"
                      dir="rtl"
                      className={`text-right truncate ${compactFieldClass} leading-none rounded-lg border px-2 pr-2 transition-all
                        focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800
                        ${memorizedParts
                          ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500'}
                      `}
                    >
                      <SelectValue placeholder={studentsLabels.quranProgressPlaceholder} />
                    </SelectTrigger>
                    <SelectContent position="popper" dir="rtl" align="start" side="bottom" className="max-h-[300px] text-sm rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900">
                      <SelectGroup>
                        <SelectLabel className="font-bold text-islamic-green">الأجزاء</SelectLabel>
                        {uniqueOptions.map(o => <SelectItem key={o.value} value={String(o.value)} className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md">{o.label}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="phone_number" className="mb-1 block">{studentsLabels.phoneNumber} <span className="text-muted-foreground text-xs">{studentsLabels.optionalField}</span></Label>
              <Input id="phone_number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder={studentsLabels.phoneNumber} dir="ltr" className={`text-left focus:border-islamic-green ${compactFieldClass}`} />
            </div>
            <div>
              <Label htmlFor="email" className="mb-1 block">{studentsLabels.email} <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={studentsLabels.email} dir="ltr" className={`text-left focus:border-islamic-green ${compactFieldClass}`} />
            </div>
            <div>
              <Label htmlFor="notes" className="mb-1 block">{studentsLabels.notes} <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder={studentsLabels.notes} rows={3} className="focus:border-islamic-green text-sm" />
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">الخطوة {step + 1} من {steps.length}</div>
    </FormDialog>
  );
}
