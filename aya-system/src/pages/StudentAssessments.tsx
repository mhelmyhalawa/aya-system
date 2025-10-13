import { UnifiedSelect } from '@/components/ui/UnifiedSelect';
import React, { useState, useEffect, useMemo } from 'react';
import { assessmentService } from '../lib/assessment-service';
import { getAllStudents } from '../lib/supabase-service';
import { getAllTeachers, getStudentsByTeacherId } from '../lib/teacher-service';
import { getAllStudyCircles, getTeacherStudyCircles } from '../lib/study-circle-service';
import { useToast } from '../hooks/use-toast';
import {
  Assessment,
  AssessmentCreate,
  AssessmentUpdate,
  AssessmentType,
  assessmentTypeOptions,
  getAssessmentTypeName,
  getAssessmentTypeColor,
  formatAssessmentRange,
  quranSurahs,
  getSurahName,
} from '@/types/assessment';
// local util for formatting optional numeric scores to string
const formatScore = (v: number | undefined) => (v === undefined || v === null ? '-' : `${v}`);
import { Profile } from '../types/profile';
import { StudyCircle } from '../types/study-circle';
import { Plus, Pencil, Trash2, ClipboardList, RefreshCwIcon, Filter, ArrowDownUp, ArrowDownAZ, ArrowUpZA, GraduationCap, BookOpen, User, ChevronDown, Search, ChevronRight } from 'lucide-react';
// استيراد خدمة أولياء الأمور لإضافة فلتر ولي الأمر
import { getAllGuardians } from '@/lib/guardian-service';
import { FormDialog } from '@/components/ui/form-dialog';
import { GenericTable } from '@/components/ui/generic-table';
// ...existing imports...
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import FilterBar from '@/components/filters/FilterBar';

interface StudentAssessmentsProps {
  onNavigate?: (path: string) => void;
  currentUser?: any;
}

const StudentAssessments: React.FC<StudentAssessmentsProps> = ({ onNavigate, currentUser: propCurrentUser }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  // Grouped (latest per student) view toggle & data
  // تفعيل عرض آخر تقييم لكل طالب بشكل افتراضي حسب الطلب
  const [showLatestPerStudent, setShowLatestPerStudent] = useState<boolean>(true);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [historyStudentName, setHistoryStudentName] = useState<string>('');
  const [historyItems, setHistoryItems] = useState<Assessment[]>([]);
  const groupedLatestRows = useMemo(() => {
    const byStudent: Record<string, Assessment[]> = {};
    for (const a of filteredAssessments) {
      const sid = (a as any).student_id || a.student_id || a.student?.id; // fallback chain
      if (!sid) continue;
      if (!byStudent[sid]) byStudent[sid] = [];
      byStudent[sid].push(a);
    }
    const rows: (Assessment & { __remainingCount: number; __remainingList: Assessment[] })[] = [];
    Object.entries(byStudent).forEach(([sid, list]) => {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latest = list[0];
      const remaining = list.slice(1);
      rows.push(Object.assign({}, latest, { __remainingCount: remaining.length, __remainingList: remaining }));
    });
    // Sort resulting rows by student name (optional) or keep original latest order by date
    rows.sort((a, b) => {
      const an = (a as any).student?.full_name || '';
      const bn = (b as any).student?.full_name || '';
      return an.localeCompare(bn, 'ar');
    });
    return rows;
  }, [filteredAssessments]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Array<{
    id: string;
    full_name: string;
    role?: 'teacher' | 'admin' | 'superadmin' | string;
  }>>([]);
  const [studyCircles, setStudyCircles] = useState<StudyCircle[]>([]);
  // بيانات أولياء الأمور
  const [guardians, setGuardians] = useState<any[]>([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState<string>('all-guardians');
  // فلتر طالب محدد (اختيار فردي) - مختلف عن selectedStudentIds (المحددون متعدد) للحالات السريعة
  // لم نعد نستخدم selectedSingleStudentId بعد دعم multi-select — سنكتفي بـ selectedStudentIds
  const [hasGuardianFilter, setHasGuardianFilter] = useState<'any' | 'with' | 'without'>('any');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all-teachers');
  const [selectedCircleId, setSelectedCircleId] = useState<string>('all-circles');
  const [assessmentToEdit, setAssessmentToEdit] = useState<Assessment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser);
  const [activeTab, setActiveTab] = useState(propCurrentUser?.role === 'teacher' ? 'my-assessments' : 'all-assessments');
  const [tableExists, setTableExists] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [listSortDirection, setListSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [isTeacherPickerOpen, setIsTeacherPickerOpen] = useState(false);
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [isCirclePickerOpen, setIsCirclePickerOpen] = useState(false);
  // تحويل السجلات السابقة إلى صفوف جدول بعد توفر الطلاب والمعلمين (نتأكد من الترتيب)
  const historyTableRows = useMemo(() => {
    if (!historyItems || historyItems.length === 0) return [] as any[];
    return historyItems.map((a, idx) => {
      const display = formatAssessmentDisplay(a as any);
      return {
        ...a,
        id: String(a.id),
        __index: idx + 1,
        __display: display
      };
    });
  }, [historyItems, students, teachers]);
  const [teacherSearchTerm, setteacherSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [circlePickerSearch, setCirclePickerSearch] = useState('');
  const [wizardStep, setWizardStep] = useState<number>(0);
  // حالة طي الكارد الرئيسي للتقييمات
  const [assessmentsMainCollapsed, setAssessmentsMainCollapsed] = useState(false);

  // دالة تحقق بسيطة لكل خطوة قبل الانتقال
  const validateWizardStep = (): boolean => {
    // إعادة تعيين أخطاء الحقول التي تخص الخطوة الحالية فقط
    const newErrors: any = {};
    if (wizardStep === 0) {
      if (!formData.student_id) newErrors.student_id = 'الطالب مطلوب';
      if (!formData.recorded_by) newErrors.recorded_by = 'المسجل مطلوب';
      if (!formData.date) newErrors.date = 'التاريخ مطلوب';
      if (!formData.type) newErrors.type = 'نوع الاختبار مطلوب';
    } else if (wizardStep === 1) {
      if (!formData.from_surah) newErrors.from_surah = 'السورة مطلوبة';
      if (!formData.from_ayah) newErrors.from_ayah = 'الآية مطلوبة';
      if (!formData.to_surah) newErrors.to_surah = 'السورة مطلوبة';
      if (!formData.to_ayah) newErrors.to_ayah = 'الآية مطلوبة';
      // تحقق إضافي: النطاق منطقي
      if (formData.from_surah && formData.to_surah) {
        const fromPair = `${formData.from_surah}-${formData.from_ayah || 0}`;
        const toPair = `${formData.to_surah}-${formData.to_ayah || 0}`;
        if (fromPair === toPair) {
          newErrors.to_ayah = 'يجب أن يختلف نطاق البداية عن النهاية';
        }
      }
    }
    setFormErrors((prev: any) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // اشتقاقات مساعدة
  const isAllStudentsSelected = selectedStudentIds.length === 0; // فارغ يعني الجميع

  // دوال مساعدة للتعامل مع التحديد المتعدد
  const clearStudentSelection = () => setSelectedStudentIds([]);
  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectedTeacher = useMemo(() => selectedTeacherId === 'all-teachers' ? null : teachers.find(t => t.id === selectedTeacherId) || null, [selectedTeacherId, teachers]);
  const selectedCircle = useMemo(() => selectedCircleId === 'all-circles' ? null : studyCircles.find(c => c.id === selectedCircleId) || null, [selectedCircleId, studyCircles]);

  // ترشيح بيانات الحوارات
  const filteredTeachersForPicker = useMemo(() => {
    const term = teacherSearchTerm.trim().toLowerCase();
    return teachers.filter(t => !term || (t.full_name || '').toLowerCase().includes(term));
  }, [teachers, teacherSearchTerm]);

  const filteredStudentsForPicker = useMemo(() => {
    const term = studentSearchTerm.trim().toLowerCase();
    return students.filter(s => {
      // تطبيق نفس فلاتر المعلم والحلقة الحالية (كما في المرئيين) لتقليل التشويش
      if (selectedTeacherId !== 'all-teachers') {
        const teacherCircleIds = studyCircles.filter(c => c.teacher_id === selectedTeacherId).map(c => c.id);
        if (s.teacher_id !== selectedTeacherId && !(s.study_circle_id && teacherCircleIds.includes(s.study_circle_id))) return false;
      }
      if (selectedCircleId !== 'all-circles' && s.study_circle_id !== selectedCircleId) return false;
      if (!term) return true;
      const name = (s.full_name || '').toLowerCase();
      const guardian = (s.guardian?.full_name || '').toLowerCase();
      return name.includes(term) || guardian.includes(term);
    });
  }, [students, studentSearchTerm, selectedTeacherId, selectedCircleId, studyCircles]);

  const filteredCirclesForPicker = useMemo(() => {
    const term = circlePickerSearch.trim().toLowerCase();
    return studyCircles.filter(c => {
      if (selectedTeacherId !== 'all-teachers' && c.teacher_id !== selectedTeacherId) return false;
      if (!term) return true;
      return (c.name || '').toLowerCase().includes(term);
    });
  }, [studyCircles, circlePickerSearch, selectedTeacherId]);

  // الترتيب حسب اسم الطالب بعد التصفية
  const applyListSorting = (list: Assessment[]) => {
    if (!listSortDirection) return list;
    return [...list].sort((a, b) => {
      const studentA = students.find(s => s.id === a.student_id)?.full_name || '';
      const studentB = students.find(s => s.id === b.student_id)?.full_name || '';
      return listSortDirection === 'asc' ? studentA.localeCompare(studentB, 'ar') : studentB.localeCompare(studentA, 'ar');
    });
  };

  const toggleListSort = () => {
    setListSortDirection(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null);
  };

  // تمرير لأعلى محتوى الحوار عند تغيير الخطوة لتحسين التجربة
  useEffect(() => {
    if (!isDialogOpen) return;
    try {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const scrollable = dialog.querySelector('.custom-scrollbar');
        (scrollable as HTMLElement | null)?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (_) { /* تجاهل أية أخطاء DOM */ }
  }, [wizardStep, isDialogOpen]);

  const handleAddNewRecord = () => {
    handleAddAssessment();
  };
  // متغيرات مربع حوار تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);

  const { toast } = useToast();

  // بيانات النموذج
  const [formData, setFormData] = useState<AssessmentCreate>({
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'juz',
    from_surah: 1,
    from_ayah: 1,
    to_surah: 1,
    to_ayah: 1,
    tajweed_score: undefined,
    memorization_score: undefined,
    recitation_score: undefined,
    total_score: undefined,
    notes: '',
    recorded_by: ''
  });

  // التحقق من بيانات النموذج
  const [formErrors, setFormErrors] = useState<{
    student_id?: string;
    recorded_by?: string;
    date?: string;
    type?: string;
    from_surah?: string;
    from_ayah?: string;
    to_surah?: string;
    to_ayah?: string;
    tajweed_score?: string;
    memorization_score?: string;
    recitation_score?: string;
  }>({});

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // اختبار الاتصال بالجدول أولاً
        const connectionTest = await assessmentService.testConnection();
        if (!connectionTest) {
          setTableExists(false);
          toast({
            title: 'جدول تقييمات الطلاب غير موجود',
            description: 'يرجى تنفيذ سكريبت إنشاء الجدول أولاً',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const user = propCurrentUser;
        setCurrentUser(user);

        // التحقق مما إذا كان هناك معرف حلقة في URL
        const urlParams = new URLSearchParams(window.location.search);
        const circleId = urlParams.get('circle');
        if (circleId) {
          setSelectedCircleId(circleId);
        }

        // جلب البيانات حسب دور المستخدم
        if (user && user.role === 'teacher') {
          console.log('StudentAssessments - Loading data for teacher role');
          // المعلم يرى فقط طلابه
          const studentsData = await getStudentsByTeacherId(user.id);
          setStudents(studentsData);

          // جلب الحلقات التي يشرف عليها المعلم
          const circlesData = await getTeacherStudyCircles(user.id);
          setStudyCircles(circlesData);

          // تعيين المعلم الحالي
          setTeachers([{
            id: user.id,
            full_name: user.full_name || 'المعلم',
            role: 'teacher'
          }]);
          setSelectedTeacherId(user.id);

          // جلب التقييمات
          const assessmentsData = await assessmentService.getAssessmentsByTeacher(user.id);
          setAssessments(assessmentsData);
          setFilteredAssessments(assessmentsData);
        } else {
          console.log('StudentAssessments - Loading data for admin/superadmin role');
          // المشرف/المدير يرى كل شيء
          const [studentsData, teachersData, assessmentsData, circlesData] = await Promise.all([
            getAllStudents(),
            getAllTeachers(),
            assessmentService.getAllAssessments(),
            getAllStudyCircles()
          ]);

          // تحليل بيانات الطلاب للتشخيص
          if (studentsData && studentsData.length > 0) {
            console.log(`تم تحميل ${studentsData.length} طالب`);

            // تحقق من وجود study_circle_id للطلاب
            const studentsWithCircle = studentsData.filter(s => s.study_circle_id);
            console.log(`عدد الطلاب المرتبطين بحلقات: ${studentsWithCircle.length} (${Math.round(studentsWithCircle.length / studentsData.length * 100)}%)`);

            // عرض معرفات الحلقات الفريدة
            const uniqueCircleIds = [...new Set(studentsData.map(s => s.study_circle_id).filter(Boolean))];
            console.log(`معرفات الحلقات الفريدة في بيانات الطلاب: ${uniqueCircleIds.length}`, uniqueCircleIds);

            // تحقق من تطابق معرفات الحلقات مع الحلقات المحملة
            const circleIdsInData = circlesData.map(c => c.id);
            const matchingCircleIds = uniqueCircleIds.filter(id => circleIdsInData.includes(id));
            console.log(`عدد معرفات الحلقات المطابقة: ${matchingCircleIds.length} من أصل ${uniqueCircleIds.length}`);

            if (matchingCircleIds.length < uniqueCircleIds.length) {
              console.warn('هناك معرفات حلقات في بيانات الطلاب غير موجودة في بيانات الحلقات!');
            }
          }

          setStudents(studentsData);
          setTeachers(teachersData);
          setAssessments(assessmentsData);
          setFilteredAssessments(assessmentsData);
          setStudyCircles(circlesData);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data for StudentAssessments:', error);
        toast({
          title: 'خطأ في تحميل البيانات',
          description: 'حدث خطأ أثناء تحميل البيانات، يرجى المحاولة مرة أخرى',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    fetchData();
  }, [propCurrentUser, toast]);

  // تصفية التقييمات حسب المعايير المحددة
  useEffect(() => {
    if (assessments.length === 0) return;

    let filtered = [...assessments];

    // فلترة حسب المعلم المحدد
    if (selectedTeacherId !== 'all-teachers') {
      filtered = filtered.filter(a => a.recorded_by === selectedTeacherId);
    }

    // فلترة حسب الطلاب المحددين (تحديد متعدد) - إذا القائمة فارغة يعني الجميع
    if (selectedStudentIds.length > 0) {
      filtered = filtered.filter(a => selectedStudentIds.includes(a.student_id));
    }

    // فلترة حسب الحلقة المحددة
    if (selectedCircleId !== 'all-circles') {
      // الحصول على معرفات الطلاب في الحلقة المحددة
      const studentIdsInCircle = students
        .filter(s => s.study_circle_id === selectedCircleId)
        .map(s => s.id);

      filtered = filtered.filter(a => studentIdsInCircle.includes(a.student_id));
    }

    // فلترة حسب ولي الأمر المحدد
    if (selectedGuardianId !== 'all-guardians') {
      const studentIdsWithGuardian = students
        .filter(s => s.guardian && s.guardian.id === selectedGuardianId)
        .map(s => s.id);
      filtered = filtered.filter(a => studentIdsWithGuardian.includes(a.student_id));
    }

    // فلترة حسب نوع التقييم
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    // فلترة حسب كلمة البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => {
        // البحث في بيانات الطالب
        const student = students.find(s => s.id === a.student_id);
        const studentName = student?.full_name?.toLowerCase() || '';

        // البحث في بيانات المعلم
        const teacher = teachers.find(t => t.id === a.recorded_by);
        const teacherName = teacher?.full_name?.toLowerCase() || '';

        // البحث في تفاصيل التقييم
        const surahFrom = getSurahName(a.from_surah)?.toLowerCase() || '';
        const surahTo = getSurahName(a.to_surah)?.toLowerCase() || '';
        const notes = a.notes?.toLowerCase() || '';

        return (
          studentName.includes(query) ||
          teacherName.includes(query) ||
          surahFrom.includes(query) ||
          surahTo.includes(query) ||
          notes.includes(query)
        );
      });
    }

    setFilteredAssessments(applyListSorting(filtered));
  }, [assessments, selectedTeacherId, selectedStudentIds, selectedCircleId, filterType, searchQuery, students, teachers, listSortDirection, selectedGuardianId, hasGuardianFilter]);

  // حساب الدرجة الكلية
  const calculateTotalScore = () => {
    let scores = [];

    if (formData.tajweed_score !== undefined) scores.push(formData.tajweed_score);
    if (formData.memorization_score !== undefined) scores.push(formData.memorization_score);
    if (formData.recitation_score !== undefined) scores.push(formData.recitation_score);

    if (scores.length === 0) return undefined;

    const total = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(total * 100) / 100; // تقريب إلى رقمين عشريين
  };

  // الحصول على المعلمين المرئيين حسب الفلاتر
  const visibleTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const teacherHasCircle = studyCircles.some(c => c.teacher_id === teacher.id);

      // إذا كان المستخدم الحالي معلماً أعرض نفسه فقط (حتى لو بلا حلقات حاليًا)
      if (currentUser?.role === 'teacher') {
        return teacher.id === currentUser.id;
      }

      // إذا تم تحديد حلقة، أظهر فقط المعلم المسؤول عنها (ولا نهتم بالفلتر العام)
      if (selectedCircleId !== 'all-circles') {
        const circle = studyCircles.find(c => c.id === selectedCircleId);
        if (circle) {
          return circle.teacher_id === teacher.id;
        }
      }

      // طلب المستخدم: إظهار فقط المعلمين الذين لديهم حلقات
      // مع استثناء أن يبقى المعلم المختار في النموذج لو كان بلا حلقات لتفادي كسر البيانات القديمة
      if (!teacherHasCircle && teacher.id !== (formData.recorded_by || '')) {
        return false;
      }

      return teacherHasCircle || teacher.id === formData.recorded_by;
    });
  }, [teachers, currentUser, selectedCircleId, studyCircles, formData.recorded_by]);

  // الحصول على الطلاب المرئيين حسب الفلاتر
  const visibleStudents = useMemo(() => {
    if (students.length === 0) {
      console.log('لا توجد بيانات طلاب متاحة');
      return [];
    }

    // عند إضافة/تعديل تقييم، نريد عرض جميع الطلاب إذا كان النموذج مفتوحًا
    if (isDialogOpen) {
      // في حالة تحديد حلقة في النموذج، أظهر فقط طلاب تلك الحلقة
      if (selectedCircleId !== 'all-circles') {
        const filtered = students.filter(student => student.study_circle_id === selectedCircleId);
        console.log(`تم فلترة الطلاب للحلقة ${selectedCircleId} في وضع النموذج:`, filtered.length);
        return filtered;
      }

      // في حالة تحديد معلم في النموذج، أظهر فقط طلاب ذلك المعلم
      if (selectedTeacherId !== 'all-teachers') {
        // الطلاب الذين يشرف عليهم المعلم مباشرة
        const teacherStudents = students.filter(student => student.teacher_id === selectedTeacherId);
        // الطلاب في الحلقات التي يشرف عليها المعلم
        const teacherCircleIds = studyCircles
          .filter(circle => circle.teacher_id === selectedTeacherId)
          .map(circle => circle.id);
        const circleStudents = students.filter(student =>
          student.study_circle_id && teacherCircleIds.includes(student.study_circle_id)
        );

        // دمج القائمتين وإزالة التكرار
        const filtered = [...new Set([...teacherStudents, ...circleStudents])];
        console.log(`تم فلترة الطلاب للمعلم ${selectedTeacherId} في وضع النموذج:`, filtered.length);
        return filtered;
      }

      // إذا لم يتم تحديد أي فلتر، أظهر جميع الطلاب
      console.log('عرض جميع الطلاب في وضع النموذج:', students.length);
      return students;
    }

    // فلترة عادية للعرض في الواجهة الرئيسية
    const filtered = students.filter(student => {
      // إذا تم تحديد معلم، أظهر فقط طلاب هذا المعلم
      if (selectedTeacherId !== 'all-teachers') {
        const teacherCircleIds = studyCircles
          .filter(circle => circle.teacher_id === selectedTeacherId)
          .map(circle => circle.id);

        if (student.teacher_id !== selectedTeacherId &&
          !(student.study_circle_id && teacherCircleIds.includes(student.study_circle_id))) {
          return false;
        }
      }

      // إذا تم تحديد حلقة، أظهر فقط طلاب هذه الحلقة
      if (selectedCircleId !== 'all-circles') {
        if (student.study_circle_id !== selectedCircleId) {
          return false;
        }
      }

      // إذا تم تحديد ولي أمر، أظهر فقط طلاب هذا الولي
      if (selectedGuardianId !== 'all-guardians') {
        if (!student.guardian || student.guardian.id !== selectedGuardianId) return false;
      }
      if (hasGuardianFilter === 'with' && !student.guardian) return false;
      if (hasGuardianFilter === 'without' && student.guardian) return false;

      return true;
    });

    console.log('تم فلترة الطلاب للعرض العادي:', {
      total: students.length,
      filtered: filtered.length,
      selectedTeacher: selectedTeacherId,
      selectedCircle: selectedCircleId
    });

    return filtered;
  }, [students, selectedTeacherId, selectedCircleId, isDialogOpen, studyCircles, selectedGuardianId, hasGuardianFilter]);

  // تحميل أولياء الأمور مرة واحدة
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAllGuardians();
        if (!cancelled) setGuardians(data || []);
      } catch (e) {
        console.error('فشل تحميل أولياء الأمور', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // الحصول على الحلقات المرئية حسب الفلاتر
  const visibleStudyCircles = useMemo(() => {
    return studyCircles.filter(circle => {
      // إذا تم تحديد معلم، أظهر فقط حلقات هذا المعلم
      if (selectedTeacherId !== 'all-teachers') {
        return circle.teacher_id === selectedTeacherId;
      }

      return true;
    });
  }, [studyCircles, selectedTeacherId]);

  // التعامل مع تغيير المعلم المحدد في الفورم
  const handleTeacherChange = (teacherId: string) => {
    setFormData(prev => ({ ...prev, recorded_by: teacherId }));

    // إذا كان المعلم المحدد في الفلتر مختلفًا، قم بتحديثه
    if (selectedTeacherId !== teacherId && teacherId !== 'all-teachers') {
      setSelectedTeacherId(teacherId);
      const teacherCircles = studyCircles.filter(c => c.teacher_id === teacherId);
      if (teacherCircles.length === 1) {
        // اختيار تلقائي للحلقة الوحيدة
        handleCircleChange(teacherCircles[0].id);
      } else if (teacherCircles.length === 0) {
        // لا حلقات => إعادة تعيين الحلقة
        setSelectedCircleId('all-circles');
      } else {
        // عدة حلقات: تأكد أن الحلقة الحالية تابعة للمعلم وإلا صفّرها
        const currentStillValid = teacherCircles.some(c => c.id === selectedCircleId);
        if (!currentStillValid) setSelectedCircleId('all-circles');
      }
    } else if (teacherId === 'all-teachers') {
      // عند الرجوع لكل المعلمين، إذا كانت الحلقة الحالية مرتبطة بمعلم محدد لا يتطابق مع الاختيار الجديد قم بتصفيرها
      if (selectedCircleId !== 'all-circles') {
        const circle = studyCircles.find(c => c.id === selectedCircleId);
        if (circle && circle.teacher_id) {
          // السماح بالإبقاء لكنها تضل محسوبة ضمن الكل، لا تغيير إلا إذا أردنا إعادة الضبط
          // إذا أردنا إعادة الضبط دائماً قم بإلغاء التعليق التالي:
          // setSelectedCircleId('all-circles');
        }
      }
    }

    // تحقق من صلاحية الطالب الحالي بعد تغيير المعلم
    setFormData(prev => {
      if (!prev.student_id) return prev;
      const st = students.find(s => s.id === prev.student_id);
      if (!st) return { ...prev, student_id: undefined };
      if (teacherId !== 'all-teachers') {
        const stTeacherId = st.study_circle?.teacher_id;
        if (stTeacherId && stTeacherId !== teacherId) return { ...prev, student_id: undefined };
      }
      if (selectedCircleId !== 'all-circles') {
        if (st.study_circle?.id !== selectedCircleId) return { ...prev, student_id: undefined };
      }
      return prev;
    });
  };
  // نهاية handleTeacherChange

  // التعامل مع تغيير الحلقة المحددة في الفورم
  const handleCircleChange = (circleId: string) => {
    setSelectedCircleId(circleId);

    // إذا كانت الحلقة تنتمي لمعلم مختلف، قم بتحديث المعلم المحدد
    if (circleId !== 'all-circles') {
      const circle = studyCircles.find(c => c.id === circleId);
      if (circle && circle.teacher_id && circle.teacher_id !== selectedTeacherId) {
        setSelectedTeacherId(circle.teacher_id);
        setFormData(prev => ({ ...prev, recorded_by: circle.teacher_id }));
      }
    }
    // تحقق من صلاحية الطالب الحالي بعد تغيير الحلقة
    setFormData(prev => {
      if (!prev.student_id) return prev;
      const st = students.find(s => s.id === prev.student_id);
      if (!st) return { ...prev, student_id: undefined };
      if (circleId !== 'all-circles' && st.study_circle?.id !== circleId) return { ...prev, student_id: undefined };
      if (selectedTeacherId !== 'all-teachers') {
        const stTeacherId = st.study_circle?.teacher_id;
        if (stTeacherId && stTeacherId !== selectedTeacherId) return { ...prev, student_id: undefined };
      }
      return prev;
    });
  };

  // عند اختيار طالب في النموذج: عيّن الحلقة والمعلم (إن توفرت) تلقائياً
  const handleStudentSelect = (studentId: string) => {
    setFormData(prev => ({ ...prev, student_id: studentId }));
    const st = students.find(s => s.id === studentId);
    if (st) {
      if (st.study_circle_id) {
        // لا تغيّر اختيار المستخدم للحلقة يدوياً إلا إذا كانت (الكل) أو لا تتطابق
        if (selectedCircleId === 'all-circles' || selectedCircleId !== st.study_circle_id) {
          setSelectedCircleId(st.study_circle_id);
        }
      }
      // ضبط المعلم المرتبط بالحـلقة إن وجد
      const circle = st.study_circle_id ? studyCircles.find(c => c.id === st.study_circle_id) : undefined;
      const teacherId = circle?.teacher_id || st.teacher_id;
      if (teacherId && teacherId !== 'all-teachers' && teacherId !== selectedTeacherId) {
        setSelectedTeacherId(teacherId);
        setFormData(prev => ({ ...prev, recorded_by: teacherId }));
      }
    }
  };

  // تأثير لضمان تماسك الاختيارات (معلم ← حلقة ← طالب) عند فتح أو أثناء الحوار
  useEffect(() => {
    if (!isDialogOpen) return; // نتجنب التعديل خارج سياق الحوار

    // تحقق من توافق الحلقة الحالية مع المعلم المحدد
    if (selectedTeacherId !== 'all-teachers' && selectedCircleId !== 'all-circles') {
      const circle = studyCircles.find(c => c.id === selectedCircleId);
      if (circle && circle.teacher_id !== selectedTeacherId) {
        setSelectedCircleId('all-circles');
      }
    }

    // تحقق من صلاحية الطالب الحالي
    setFormData(prev => {
      if (!prev.student_id) return prev;
      const st = students.find(s => s.id === prev.student_id);
      if (!st) return { ...prev, student_id: undefined };
      if (selectedTeacherId !== 'all-teachers') {
        const stTeacherId = st.study_circle?.teacher_id;
        if (stTeacherId && stTeacherId !== selectedTeacherId) return { ...prev, student_id: undefined };
      }
      if (selectedCircleId !== 'all-circles') {
        if (st.study_circle?.id !== selectedCircleId) return { ...prev, student_id: undefined };
      }
      return prev;
    });
  }, [selectedTeacherId, selectedCircleId, studyCircles, students, isDialogOpen]);

  // التعامل مع تغيير السورة في نطاق التقييم
  const handleSurahChange = (field: 'from_surah' | 'to_surah', value: number) => {
    setFormData(prev => {
      // تحديث قيمة السورة
      const updated = { ...prev, [field]: value };

      // إعادة تعيين رقم الآية إذا كان أكبر من عدد آيات السورة الجديدة
      const ayahField = field === 'from_surah' ? 'from_ayah' : 'to_ayah';
      const maxAyahs = quranSurahs.find(s => s.number === value)?.ayahs || 1;

      if (prev[ayahField] > maxAyahs) {
        updated[ayahField] = 1;
      }

      return updated;
    });
  };

  // إضافة تقييم جديد
  const handleAddAssessment = () => {
    setAssessmentToEdit(null);
    setFormData({
      student_id: '',
      date: new Date().toISOString().split('T')[0],
      type: 'juz',
      from_surah: 1,
      from_ayah: 1,
      to_surah: 1,
      to_ayah: 1,
      tajweed_score: undefined,
      memorization_score: undefined,
      recitation_score: undefined,
      total_score: undefined,
      notes: '',
      recorded_by: currentUser ? currentUser.id : ''
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  // تعديل تقييم موجود
  const handleEditAssessment = (assessment: Assessment) => {
    setAssessmentToEdit(assessment);
    setFormData({
      student_id: assessment.student_id,
      date: assessment.date.split('T')[0],
      type: assessment.type,
      from_surah: assessment.from_surah,
      from_ayah: assessment.from_ayah,
      to_surah: assessment.to_surah,
      to_ayah: assessment.to_ayah,
      tajweed_score: assessment.tajweed_score,
      memorization_score: assessment.memorization_score,
      recitation_score: assessment.recitation_score,
      total_score: assessment.total_score,
      notes: assessment.notes || '',
      recorded_by: assessment.recorded_by
    });
    // تحديد الحلقة والمعلم المرتبطين بالتقييم (إن وُجدت معلومات الطالب/الحلقة محمّلة)
    const studentRef = students.find(s => s.id === assessment.student_id);
    if (studentRef?.study_circle_id) {
      setSelectedCircleId(studentRef.study_circle_id);
    }
    // حاول استخراج المعلم من الحلقة أو من assessment.recorded_by
    const circleRef = studentRef?.study_circle_id ? studyCircles.find(c => c.id === studentRef.study_circle_id) : undefined;
    const inferredTeacher = circleRef?.teacher_id || assessment.recorded_by;
    if (inferredTeacher && inferredTeacher !== selectedTeacherId) {
      setSelectedTeacherId(inferredTeacher);
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  // التحقق من صحة البيانات المدخلة
  const validateForm = (): boolean => {
    const errors: any = {};

    // التحقق من اختيار الطالب
    if (!formData.student_id) {
      errors.student_id = 'يرجى اختيار الطالب';
    }

    // التحقق من اختيار المعلم المسجل
    if (!formData.recorded_by) {
      errors.recorded_by = 'يرجى اختيار المعلم المسجل';
    }

    // التحقق من التاريخ
    if (!formData.date) {
      errors.date = 'يرجى تحديد التاريخ';
    }

    // التحقق من نوع التقييم
    if (!formData.type) {
      errors.type = 'يرجى اختيار النوع';
    }

    // التحقق من نطاق التقييم
    if (formData.from_surah > formData.to_surah) {
      errors.from_surah = 'يجب أن تكون سورة البداية قبل أو تساوي سورة النهاية';
    } else if (formData.from_surah === formData.to_surah && formData.from_ayah > formData.to_ayah) {
      errors.from_ayah = 'في نفس السورة، يجب أن تكون آية البداية قبل أو تساوي آية النهاية';
    }

    // التحقق من درجات التقييم
    if (formData.tajweed_score !== undefined && (formData.tajweed_score < 0 || formData.tajweed_score > 100)) {
      errors.tajweed_score = 'يجب أن تكون الدرجة بين 0 و 100';
    }

    if (formData.memorization_score !== undefined && (formData.memorization_score < 0 || formData.memorization_score > 100)) {
      errors.memorization_score = 'يجب أن تكون الدرجة بين 0 و 100';
    }

    if (formData.recitation_score !== undefined && (formData.recitation_score < 0 || formData.recitation_score > 100)) {
      errors.recitation_score = 'يجب أن تكون الدرجة بين 0 و 100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // حفظ التقييم (إضافة/تعديل)
  const handleSaveAssessment = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // حساب الدرجة الكلية
      const totalScore = calculateTotalScore();
      const dataToSave = {
        ...formData,
        total_score: totalScore
      };

      let result;

      if (assessmentToEdit) {
        // تعديل تقييم موجود
        const updateData: AssessmentUpdate = {
          id: assessmentToEdit.id,
          ...dataToSave
        };

        try {
          console.debug('[Assessment][Update] Payload:', updateData);
          const updated = await assessmentService.updateAssessment(updateData);
          console.debug('[Assessment][Update] Result:', updated);

          toast({
            title: 'تم تحديث التقييم بنجاح',
            className: "bg-green-50 border-green-200",
          });

          // تحديث قائمة التقييمات
          const updatedAssessments = assessments.map(a =>
            a.id === assessmentToEdit.id ? { ...a, ...updateData } : a
          );
          setAssessments(updatedAssessments);

          // إغلاق النافذة المنبثقة في حالة النجاح
          setIsDialogOpen(false);
        } catch (error: any) {
          console.error('[Assessment][Update] Error raw:', error);
          const code = error?.code || error?.status || 'UNKNOWN';
          const details = error?.details || error?.hint || '';
          toast({
            title: 'خطأ في تحديث التقييم',
            description: `${error?.message || 'حدث خطأ غير متوقع'}${details ? ' - ' + details : ''} (رمز: ${code})`,
            variant: 'destructive',
          });
        }
      } else {
        // إضافة تقييم جديد
        try {
          console.debug('[Assessment][Create] Payload:', dataToSave);
          const newAssessmentResult = await assessmentService.createAssessment(dataToSave);
          console.debug('[Assessment][Create] Result:', newAssessmentResult);

          if (newAssessmentResult && newAssessmentResult.id) {
            toast({
              title: 'تم إضافة التقييم بنجاح',
              className: "bg-green-50 border-green-200",
            });

            // إضافة التقييم الجديد إلى القائمة
            const newAssessment = {
              id: newAssessmentResult.id,
              ...dataToSave
            };
            setAssessments([newAssessment, ...assessments]);

            // إغلاق النافذة المنبثقة في حالة النجاح
            setIsDialogOpen(false);
          } else {
            throw new Error('فشل في إضافة التقييم');
          }
        } catch (error: any) {
          console.error('[Assessment][Create] Error raw:', error);
          const code = error?.code || error?.status || 'UNKNOWN';
          const details = error?.details || error?.hint || '';
          toast({
            title: 'خطأ في إضافة التقييم',
            description: `${error?.message || 'حدث خطأ غير متوقع'}${details ? ' - ' + details : ''} (رمز: ${code})`,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: 'خطأ في حفظ التقييم',
        description: 'حدث خطأ غير متوقع أثناء حفظ التقييم',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // حذف تقييم
  const handleDeleteAssessment = async (assessment: Assessment) => {
    // فتح مربع حوار تأكيد الحذف
    setAssessmentToDelete(assessment);
    setIsDeleteDialogOpen(true);
  };

  // تنفيذ عملية الحذف بعد التأكيد
  const executeDeleteAssessment = async () => {
    if (!assessmentToDelete) return;

    try {
      setIsLoading(true);

      await assessmentService.deleteAssessment(assessmentToDelete.id);

      toast({
        title: 'تم حذف التقييم بنجاح',
        className: "bg-green-50 border-green-200",
      });

      // إزالة التقييم من القائمة
      setAssessments(assessments.filter(a => a.id !== assessmentToDelete.id));
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      toast({
        title: 'خطأ في حذف التقييم',
        description: error.message || 'حدث خطأ غير متوقع أثناء حذف التقييم',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // تكوين نص عرض التقييم (تعريف كـ function declaration لضمان الرفع hoisting)
  function formatAssessmentDisplay(assessment: Assessment) {
    // إذا كان لدينا student في assessment (من استعلام الـ join) نستخدمه
    const studentFromAssessment = assessment.student;
    // وإلا نبحث في قائمة الطلاب
    const studentFromList = students.find(s => s.id === assessment.student_id);

    // نستخدم البيانات المتاحة
    const student = studentFromAssessment || studentFromList;
    const teacher = teachers.find(t => t.id === assessment.recorded_by);

    // نحصل على بيانات ولي الأمر - قد تكون في student أو في student.guardian
    let guardianName;
    if (student?.guardian?.full_name) {
      guardianName = student.guardian.full_name;
    } else if (studentFromList?.guardian?.full_name) {
      guardianName = studentFromList.guardian.full_name;
    }

    return {
      student: student ? student.full_name : 'طالب غير معروف',
      guardian: guardianName || 'ولي أمر غير مسجل',
      hasGuardian: !!guardianName,
      teacher: teacher ? teacher.full_name : 'معلم غير معروف',
      type: getAssessmentTypeName(assessment.type),
      typeColor: getAssessmentTypeColor(assessment.type),
      range: formatAssessmentRange(assessment),
      score: formatScore(assessment.total_score),
      // عرض التاريخ بالتقويم الميلادي (جرجوري) بصيغة يوم/شهر/سنة
      date: new Date(assessment.date).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        // ضمان استخدام التقويم الميلادي حتى لو اختلفت إعدادات المتصفح
        calendar: 'gregory'
      })
    };
  }

  // تعطيل الصفحة إذا لم يكن جدول التقييمات موجودًا
  if (!tableExists) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-3xl font-bold mb-4">تقييمات الطلاب</h1>
        <div className="p-6 bg-red-50 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2 text-red-700">جدول تقييمات الطلاب غير موجود</h2>
          <p className="mb-4">يرجى التواصل مع مسؤول النظام لإنشاء الجدول المطلوب.</p>
          <Button onClick={() => onNavigate('/database-management')}>
            الذهاب إلى إدارة قاعدة البيانات
          </Button>
        </div>
      </div>
    );
  }

  // تحديث البيانات
  const refreshData = async () => {
    try {
      setIsLoading(true);
      toast({
        title: "جاري تحديث البيانات...",
        description: "يرجى الانتظار",
      });

      // جلب البيانات حسب دور المستخدم
      if (currentUser?.role === 'teacher') {
        // المعلم يرى فقط طلابه
        const studentsData = await getStudentsByTeacherId(currentUser.id);
        setStudents(studentsData);

        // جلب الحلقات التي يشرف عليها المعلم
        const circlesData = await getTeacherStudyCircles(currentUser.id);
        setStudyCircles(circlesData);

        // جلب التقييمات
        const assessmentsData = await assessmentService.getAssessmentsByTeacher(currentUser.id);
        setAssessments(assessmentsData);
        setFilteredAssessments(assessmentsData);
      } else {
        // المشرف/المدير يرى كل شيء
        const [studentsData, teachersData, assessmentsData, circlesData] = await Promise.all([
          getAllStudents(),
          getAllTeachers(),
          assessmentService.getAllAssessments(),
          getAllStudyCircles()
        ]);
        setStudents(studentsData);
        setTeachers(teachersData);
        setAssessments(assessmentsData);
        setFilteredAssessments(assessmentsData);
        setStudyCircles(circlesData);
      }

      toast({
        title: "تم تحديث البيانات بنجاح",
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'خطأ في تحديث البيانات',
        description: 'حدث خطأ أثناء تحديث البيانات، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-row justify-between items-center gap-2 w-full">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-yellow-300" />
                تقييمات الطلاب
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-blue-100 hidden sm:block">
                هنا يمكنك عرض وتسجيل تقييمات الطلاب بشكل تفصيلي
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setAssessmentsMainCollapsed(v => !v)}
              aria-label={assessmentsMainCollapsed ? 'فتح المحتوى' : 'طي المحتوى'}
              aria-expanded={!assessmentsMainCollapsed}
              aria-controls="assessments-main-body"
              className={`inline-flex items-center justify-center h-9 w-9 rounded-full border border-white/30 text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 ${assessmentsMainCollapsed ? 'rotate-180' : ''}`}
              title={assessmentsMainCollapsed ? 'عرض المحتوى' : 'إخفاء المحتوى'}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent
          id="assessments-main-body"
          className={`transition-all duration-300 ease-in-out origin-top ${assessmentsMainCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[3000px] opacity-100'}`}
          aria-hidden={assessmentsMainCollapsed}
        >
          {/* شريط علوي مضغوط مشابه للمطلوب */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-1 rounded-lg bg-white dark:bg-gray-900 p-2 shadow-sm border border-green-200 dark:border-green-700">
            {/* التابات */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full md:w-[380px] bg-green-50 rounded-lg shadow-inner p-0.5"
            >
              <TabsList className="grid w-full grid-cols-2 gap-0.5 rounded-lg bg-white dark:bg-gray-900 shadow-sm ring-1 ring-green-300">
                {/* Tab جميع السجلات */}
                <TabsTrigger
                  value="all-assessments"
                  className="
                        flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-medium
                        rounded-md text-green-800 py-1.5 px-2
                        hover:bg-green-100 hover:text-green-900
                        data-[state=active]:bg-islamic-green
                        data-[state=active]:text-white
                        transition-all duration-200
                "
                  title='جميع السجلات'
                >
                  📋 <span className="hidden sm:inline">جميع السجلات</span>
                </TabsTrigger>
                <TabsTrigger
                  value="my-records"
                  className="
                            flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-medium
                            rounded-md text-green-800 py-1.5 px-2
                            hover:bg-green-100 hover:text-green-900
                            data-[state=active]:bg-islamic-green
                            data-[state=active]:text-white
                            transition-all duration-200
                "
                  title='سجلاتي فقط'
                >
                  👤 <span className="hidden sm:inline">سجلاتي</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2 items-center">
              {/* زر الفلتر */}
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className={`flex items-center gap-1.5 rounded-2xl ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} dark:bg-green-700 dark:hover:bg-green-600 shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8`}
                onClick={() => setShowFilters(p => !p)}
                title={showFilters ? 'إخفاء أدوات الفلترة' : 'إظهار أدوات الفلترة'}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">فلتر</span>
              </Button>
              {/* زر التحديث */}
              <Button
                variant="outline"
                className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                onClick={refreshData}
                title='تحديث البيانات'
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              {/* زر إضافة سجل */}
              <Button
                onClick={handleAddNewRecord}
                variant="outline"
                className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 
                dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                title='إضافة سجل جديد'
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إضافة سجل جديد</span>
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-2 bg-white dark:bg-gray-900 p-2 md:p-2 shadow-md border border-green-200 dark:border-green-700 rounded-lg animate-fade-in">
              {/* FilterBar جديد بدل الحقل الفردي */}
              <div className="w-full">
                {/* NOTE: نستعمل المكون العام */}
                <div dir="rtl">
                  <FilterBar
                    values={{
                      teacher: selectedTeacherId === 'all-teachers' ? null : selectedTeacherId,
                      circle: selectedCircleId === 'all-circles' ? null : selectedCircleId,
                      type: filterType === 'all' ? null : filterType,
                      guardian: selectedGuardianId === 'all-guardians' ? null : selectedGuardianId,
                      hasGuardian: hasGuardianFilter === 'any' ? null : hasGuardianFilter,
                      students: selectedStudentIds.length === 0 ? null : selectedStudentIds.join(','),
                      q: searchQuery || ''
                    }}
                    showFieldLabels={false}
                    onValuesChange={(vals) => {
                      // تحديث البحث
                      setSearchQuery(String(vals.q ?? ''));
                      // تحديث المعلم
                      if (vals.teacher === null) {
                        // الرجوع للوضع العام
                        if (selectedTeacherId !== 'all-teachers') setSelectedTeacherId('all-teachers');
                      } else if (vals.teacher !== selectedTeacherId) {
                        setSelectedTeacherId(String(vals.teacher));
                      }
                      // تحديث الحلقة
                      if (vals.circle === null) {
                        if (selectedCircleId !== 'all-circles') setSelectedCircleId('all-circles');
                      } else if (vals.circle !== selectedCircleId) {
                        setSelectedCircleId(String(vals.circle));
                      }
                      // نوع التقييم
                      if (vals.type === null) {
                        if (filterType !== 'all') setFilterType('all');
                      } else if (vals.type !== filterType) {
                        setFilterType(String(vals.type) as any);
                      }
                      // ولي الأمر
                      if (vals.guardian === null) {
                        if (selectedGuardianId !== 'all-guardians') setSelectedGuardianId('all-guardians');
                      } else if (vals.guardian !== selectedGuardianId) {
                        setSelectedGuardianId(String(vals.guardian));
                        // إعادة ضبط قائمة الطلاب المحددين عند تغيير ولي الأمر
                        setSelectedStudentIds([]);
                      }
                      // الطلاب المتعددون
                      if (vals.students === null || vals.students === '') {
                        if (selectedStudentIds.length > 0) setSelectedStudentIds([]);
                      } else {
                        const list = String(vals.students).split(',').filter(Boolean);
                        // قارن قبل التحديث لتجنب إعادة التصيير غير الضرورية
                        if (list.sort().join('|') !== selectedStudentIds.slice().sort().join('|')) {
                          setSelectedStudentIds(list);
                        }
                      }
                    }}
                    fields={[
                      {
                        id: 'teacher',
                        label: 'المعلم',
                        type: 'select',
                        showSearch: true,
                        clearable: true,
                        options: [
                          { value: '__ALL__', label: 'جميع المعلمين', icon: '👨‍🏫' },
                          ...visibleTeachers.map(t => ({ value: t.id, label: t.full_name || '—', icon: '👨‍🏫' }))
                        ],
                        value: selectedTeacherId === 'all-teachers' ? null : selectedTeacherId,
                        onChange: (val) => {
                          if (!val || val === '__ALL__') {
                            setSelectedTeacherId('all-teachers');
                            setSelectedCircleId('all-circles');
                          } else {
                            setSelectedTeacherId(val);
                          }
                        }
                      },
                      {
                        id: 'circle',
                        label: 'الحلقة',
                        type: 'select',
                        showSearch: true,
                        clearable: true,
                        options: [
                          { value: '__ALL__', label: 'جميع الحلقات', icon: '🕋' },
                          ...visibleStudyCircles.map(c => ({ value: c.id, label: c.name || '—', icon: '🕋' }))
                        ],
                        value: selectedCircleId === 'all-circles' ? null : selectedCircleId,
                        onChange: (val) => {
                          if (!val || val === '__ALL__') {
                            setSelectedCircleId('all-circles');
                          } else {
                            setSelectedCircleId(val);
                          }
                        }
                      },
                      {
                        id: 'guardian',
                        label: 'ولي الأمر',
                        type: 'select',
                        showSearch: true,
                        clearable: true,
                        options: [
                          { value: '__ALL__', label: 'جميع أولياء الأمور', icon: '👨‍👩‍👧' },
                          ...guardians.map(g => ({ value: g.id, label: `${g.full_name || '—'}${typeof g.students_count === 'number' ? ` (${g.students_count})` : ''}`, icon: '👨‍👩‍👧' }))
                        ],
                        value: selectedGuardianId === 'all-guardians' ? null : selectedGuardianId,
                        onChange: (val) => {
                          if (!val || val === '__ALL__') {
                            setSelectedGuardianId('all-guardians');
                          } else {
                            setSelectedGuardianId(val);
                            setSelectedStudentIds([]);
                          }
                        }
                      },
                      {
                        id: 'students',
                        label: 'الطلاب',
                        type: 'multi-select',
                        enableSearch: true,
                        clearable: true,
                        options: (() => {
                          let list = visibleStudents;
                          if (selectedGuardianId !== 'all-guardians') list = list.filter(s => s.guardian && s.guardian.id === selectedGuardianId);
                          if (hasGuardianFilter === 'with') list = list.filter(s => s.guardian);
                          if (hasGuardianFilter === 'without') list = list.filter(s => !s.guardian);
                          return list.map(s => ({ value: s.id, label: s.full_name || '—', icon: '👦' }));
                        })(),
                        value: selectedStudentIds,
                        onChange: (vals: string[]) => {
                          setSelectedStudentIds(vals);
                        }
                      },
                      {
                        id: 'type',
                        label: 'النوع',
                        type: 'select',
                        clearable: true,
                        options: [
                          { value: '__ALL__', label: 'كل الأنواع', icon: '📚' },
                          ...assessmentTypeOptions.map(o => ({
                            value: o.value,
                            label: o.label,
                            icon: o.value === 'juz' ? '📘' : o.value === 'surah' ? '📖' : o.value === 'page' ? '📄' : o.value === 'range' ? '🧩' : '📚'
                          }))
                        ],
                        value: filterType === 'all' ? null : filterType,
                        onChange: (val) => {
                          if (!val || val === '__ALL__') setFilterType('all'); else setFilterType(val as any);
                        }
                      },
                      {
                        id: 'q',
                        label: 'بحث',
                        type: 'text',
                        placeholder: '🔍 بحث...',
                        value: searchQuery,
                        debounceMs: 400,
                        onChange: (v) => setSearchQuery(v)
                      }
                    ]}
                    actions={[{
                      id: 'reset',
                      label: 'إعادة تعيين',
                      variant: 'outline',
                      className: 'w-full sm:w-auto justify-center font-semibold text-[11px] sm:text-xs h-9 bg-white dark:bg-gray-900 border-green-300 hover:bg-green-50 dark:hover:bg-green-800 text-green-700 dark:text-green-200 mt-2 sm:mt-0',
                      onClick: () => {
                        setSelectedTeacherId(currentUser?.role === 'teacher' ? currentUser.id : 'all-teachers');
                        setSelectedCircleId('all-circles');
                        setSelectedGuardianId('all-guardians');
                        setHasGuardianFilter('any');
                        setSelectedStudentIds([]);
                        setFilterType('all');
                        setSearchQuery('');
                        clearStudentSelection();
                      }
                    }]}
                    enableDefaultApplyButton={false}
                    enableDefaultResetButton={false}
                    actionsPlacement="wrap"
                    className="bg-transparent p-0"
                  />
                </div>
              </div>


            </div>
          )}
          {/* تم نقل عرض التقييمات إلى خارج الـ Card حسب الطلب */}
        </CardContent>
      </Card>

      {/* عرض التقييمات (خارج البطاقة) */}
      <div className="mt-4">
        {isLoading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : filteredAssessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200 shadow-md mt-2">
            <div className="text-center max-w-xl">
              <div className="mb-4">
                <BookOpen className="h-16 w-16 text-green-300 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-green-800 mb-2">لا توجد تقييمات متطابقة مع معايير البحث</h2>
              <p className="text-green-600 text-sm mb-4">جرب تغيير معايير التصفية أو إضافة تقييم جديد</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={handleAddNewRecord}
                  className="bg-islamic-green hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-all shadow-md"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة تقييم
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTeacherId(currentUser?.role === 'teacher' ? currentUser.id : 'all-teachers');
                    clearStudentSelection();
                    setSelectedCircleId('all-circles');
                    setFilterType('all');
                    setSearchQuery('');
                  }}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >إعادة تعيين الفلاتر</Button>
              </div>
            </div>
          </div>
        ) : (
          (() => {
            // اختيار المصدر: آخر تقييم لكل طالب أو كل السجلات (حاليًا نعرض الأخير فقط)
            const assessmentsSource = (showLatestPerStudent) ? groupedLatestRows : filteredAssessments;
            const tableData = assessmentsSource.map((a, idx) => ({
              ...a,
              id: String(a.id),
              __index: idx + 1,
              __display: formatAssessmentDisplay(a)
            }));
            return (
              <GenericTable
                title={(
                  <div className="w-full flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[12.5px] font-bold text-emerald-800">
                          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                          تقييمات الطلاب
                        </span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-500/80 to-emerald-600/80 text-white text-[10px] sm:text-[11px] font-bold shadow border border-white/20"
                          title={`عدد السجلات الظاهرة: ${tableData.length.toLocaleString('ar-EG')}`}
                        >
                          {tableData.length.toLocaleString('ar-EG')}
                        </span>
                        {showLatestPerStudent && tableData.length < filteredAssessments.length && (
                          <span
                            className="text-[10px] sm:text-[11px] text-green-600 truncate"
                            title={`أحدث ${tableData.length.toLocaleString('ar-EG')} من إجمالي ${filteredAssessments.length.toLocaleString('ar-EG')} سجل`}
                          >
                            أحدث {tableData.length.toLocaleString('ar-EG')} من إجمالي {filteredAssessments.length.toLocaleString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                defaultView="table"
                enablePagination
                defaultPageSize={10}
                pageSizeOptions={[10, 20, 50, 100]}
                hideSortToggle={false}
                data={tableData as any}
                className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
                getRowClassName={(_: any, index: number) => `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`}
                columns={([
                  { key: '__index', header: '🔢', align: 'center', render: (r: any) => <span className="text-[11px] font-bold text-gray-600">{r.__index}</span> },
                  {
                    key: 'student', header: '👦 الطالب', align: 'right', render: (r: any) => (
                      <div className="font-medium text-right">
                        {r.__display.student}
                        {r.__display.hasGuardian && (
                          <div className="text-[10px] text-red-800 dark:text-red-700">{r.__display.guardian}</div>
                        )}
                      </div>
                    )
                  },
                  ...(activeTab !== 'my-records' ? [
                    { key: 'teacher', header: '👨‍🏫 المعلم', align: 'right', render: (r: any) => r.__display.teacher || 'غير معروف' }
                  ] : []),
                  { key: 'date', header: '📅 التاريخ', align: 'right', render: (r: any) => r.__display.date },
                  {
                    key: 'type', header: '📖 النوع', align: 'right', render: (r: any) => (
                      <Badge className={`px-2 py-1 rounded-lg bg-${r.__display.typeColor}-100 text-${r.__display.typeColor}-800 border-${r.__display.typeColor}-200`}>
                        {r.__display.type}
                      </Badge>
                    )
                  },
                  { key: 'range', header: '🔖 النطاق', align: 'right', render: (r: any) => <span dir="rtl">{r.__display.range}</span> },
                  ...(showLatestPerStudent ? [{
                    key: '__remaining', header: '📚 باقي السجلات', align: 'center', render: (r: any) => {
                      const remaining = (r as any).__remainingCount;
                      if (remaining === undefined) return <span className="text-[10px] text-gray-400">-</span>;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryStudentId(r.student_id);
                            setHistoryStudentName(r.__display.student);
                            setHistoryItems(((r as any).__remainingList) || []);
                            setHistoryDialogOpen(true);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${remaining > 0 ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
                          disabled={remaining === 0}
                          title={remaining > 0 ? 'عرض السجلات السابقة' : 'لا يوجد سجلات أخرى'}
                        >
                          {remaining > 0 ? `${remaining}` : '0'}
                        </button>
                      );
                    }
                  }] : []),
                  { key: 'score', header: '🏆 الدرجة', align: 'right', render: (r: any) => r.__display.score },
                  {
                    key: 'details', header: '📊 تفاصيل الدرجات', align: 'center', render: (r: any) => {
                      const parts: string[] = [];
                      if (r.tajweed_score !== undefined) parts.push(`تجويد: ${formatScore(r.tajweed_score)}`);
                      if (r.memorization_score !== undefined) parts.push(`حفظ: ${formatScore(r.memorization_score)}`);
                      if (r.recitation_score !== undefined) parts.push(`تلاوة: ${formatScore(r.recitation_score)}`);
                      if (parts.length === 0) return <span className="text-[10px] text-gray-400">-</span>;
                      return <span className="text-[10px] leading-4 whitespace-pre-line text-gray-600">{parts.join('\n')}</span>;
                    }
                  },
                  // إظهار عمود الإجراءات فقط إذا كان المستخدم superadmin أو admin أو (معلم ومالك السجل)
                  ...((currentUser?.role === 'superadmin' || currentUser?.role === 'admin') ? [{
                    key: 'actions', header: '⚙️ الإجراءات', align: 'center', render: (r: any) => (
                      <div className="flex justify-center items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditAssessment(r)}
                          className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-700 rounded-lg"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAssessment(r)}
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                        </Button>
                      </div>
                    )
                  }] : (currentUser?.role === 'superadmin' ? [{
                    key: 'actions', header: '⚙️', align: 'center', render: (r: any) => {
                      const owns = r.recorded_by === currentUser.id || r.student?.study_circle?.teacher_id === currentUser.id;
                      if (!owns) return <span className="text-[10px] text-gray-300">—</span>;
                      return (
                        <div className="flex justify-center items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAssessment(r)}
                            className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-700 rounded-lg"
                            title="تعديل"
                          >
                            <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAssessment(r)}
                            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 rounded-lg"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                          </Button>
                        </div>
                      );
                    }
                  }] : []))
                ]) as any}
                emptyMessage="لا توجد تقييمات"
              />
            );
          })()
        )}
      </div>

      {/* حوار إضافة/تعديل تقييم باستخدام FormDialog */}
      <FormDialog
        title={assessmentToEdit ? '✏️ تعديل تقييم الطالب' : '✨ إضافة تقييم طالب جديد'}
        open={isDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            const defaultTeacherId = currentUser?.role === 'teacher' ? currentUser.id : 'all-teachers';
            if (selectedTeacherId !== defaultTeacherId) setSelectedTeacherId(defaultTeacherId);
            if (selectedCircleId !== 'all-circles') setSelectedCircleId('all-circles');
            setIsDialogOpen(false);
          } else {
            setIsDialogOpen(true);
          }
        }}
        mode={assessmentToEdit ? 'edit' : 'add'}
        onSave={() => {
          if (wizardStep < 2) {
            if (validateWizardStep()) setWizardStep(prev => prev + 1);
          } else {
            handleSaveAssessment();
          }
        }}
        saveButtonText={wizardStep < 2 ? 'التالي' : (isLoading ? 'جاري الحفظ...' : (assessmentToEdit ? '✓ تحديث التقييم' : '✓ إضافة التقييم'))}
        isLoading={wizardStep === 2 && isLoading}
        hideCancelButton
        maxWidth="680px"
        extraButtons={wizardStep > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setWizardStep(p => p - 1)}
            disabled={isLoading}
            className="flex-1 basis-0 sm:w-auto py-1.5 text-sm font-medium flex items-center justify-center gap-1"
          >
            <ChevronRight className="h-4 w-4" />
            رجوع
          </Button>
        )}
        mobileFullWidth
        mobileFlatStyle
        mobileStickyHeader
        mobileFullScreen
        mobileInlineActions
        /* saveButtonFirst + (default) mobilePrimaryLeft=false => زر (التالي) / الحفظ يظهر أولاً DOM وبالتالي في أقصى اليمين RTL، وزر رجوع بعده في اليسار */
        saveButtonFirst
        mobilePrimaryLeft={false}
        compactFooterSpacing
        mobileFooterShadow
      >
        {/* مؤشرات الخطوات (تحويل إلى نقاط) */}
        <div className="w-full mb-2" dir="rtl">
          <div className="flex items-center justify-center gap-3">
            {['معلومات', 'النطاق', 'الدرجات'].map((label, i) => {
              const active = i === wizardStep; const done = i < wizardStep;
              return (
                <button
                  key={label}
                  type="button"
                  aria-label={`الخطوة ${i + 1}: ${label}`}
                  onClick={() => (i < wizardStep ? setWizardStep(i) : null)}
                  className={`relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${active
                    ? 'bg-green-600 ring-2 ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                    : done
                      ? 'bg-green-300 hover:bg-green-400'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'} `}
                >
                  <span className="sr-only">{`الخطوة ${i + 1} - ${label}`}</span>
                </button>
              );
            })}
          </div>
          {/* شريط تقدم سفلي (يبقى كما هو) */}
          <div className="mt-2 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${((wizardStep + 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* حالة الطالب (عند التعديل) */}
        {assessmentToEdit && visibleStudents.length > 0 && (
          <div className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-400 whitespace-nowrap overflow-hidden text-ellipsis mb-2 text-right" dir="rtl">
            <span className="font-medium">الطالب: </span>
            <span>{visibleStudents.find(s => s.id === assessmentToEdit.student_id)?.full_name}</span>
            <span className="mx-1 text-gray-400">|</span>
            <span className="font-medium">ولي الأمر: </span>
            <span>{visibleStudents.find(s => s.id === assessmentToEdit.student_id)?.guardian?.full_name || 'غير مسجل'}</span>
          </div>
        )}

        {/* محتوى الخطوات */}
        <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden" dir="ltr">
          {wizardStep === 0 && (
            <div className="space-y-5">
              <div className="grid gap-3 py-2">
                {/* المعلم/المشرف والحلقة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1 order-last ">
                    <Label htmlFor="recorded_by" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">المسجل <span className="text-red-500">*</span></Label>
                    <UnifiedSelect
                      id="recorded_by"
                      size="sm"
                      value={(formData.recorded_by || (currentUser ? currentUser.id : '')) as string}
                      onChange={(v) => handleTeacherChange(v)}
                      placeholder="اختر المعلم"
                      options={visibleTeachers.length > 0 ? visibleTeachers.map(t => ({
                        value: t.id,
                        label: (
                          <div className="flex flex-col text-right">
                            <span className="font-medium">👨‍🏫 {t.full_name ?? `المعلم ${t.id.slice(0, 4)}`}</span>
                          </div>
                        )
                      })) : []}
                      emptyLabel="لا يوجد معلمين متاحين"
                    />
                    {formErrors.recorded_by && <p className="text-xs text-red-500 text-right">{formErrors.recorded_by}</p>}
                  </div>
                  <div className="grid gap-1 order-first">
                    <Label htmlFor="circle_info" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">الحلقة</Label>
                    <UnifiedSelect
                      id="circle_info"
                      size="sm"
                      value={(selectedCircleId !== 'all-circles' ? selectedCircleId : '') as string}
                      onChange={(v) => handleCircleChange(v)}
                      placeholder="اختر الحلقة"
                      options={visibleStudyCircles.length > 0 ? visibleStudyCircles.map(c => ({
                        value: c.id,
                        label: `🕋 ${c.name || `حلقة ${c.id}`}`
                      })) : []}
                      emptyLabel="لا توجد حلقات متاحة"
                    />
                  </div>
                </div>
                {/* اختيار الطالب */}
                <div className="grid gap-1">
                  <Label htmlFor="student_id" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">الطالب <span className="text-red-500">*</span></Label>
                  <UnifiedSelect
                    id="student_id"
                    size="sm"
                    value={(formData.student_id || '') as string}
                    onChange={(v) => handleStudentSelect(v)}
                    placeholder="اختر الطالب"
                    options={visibleStudents.length > 0 ? visibleStudents.map(s => ({
                      value: s.id,
                      label: (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            👦 {s.full_name}
                            {s.guardian?.full_name && (<span> {s.guardian.full_name}</span>)}
                          </span>
                        </div>
                      )
                    })) : []}
                    emptyLabel={selectedCircleId !== 'all-circles'
                      ? 'لا يوجد طلاب في هذه الحلقة'
                      : selectedTeacherId !== 'all-teachers'
                        ? 'لا يوجد طلاب لهذا المعلم'
                        : 'لا يوجد طلاب متاحين'}
                  />
                  {formErrors.student_id && <p className="text-xs text-red-500 text-right">{formErrors.student_id}</p>}
                </div>
              </div>
              {/* تاريخ التقييم ونوع الاختبار */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1 order-last">
                  <Label htmlFor="date" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">تاريخ الاختبار <span className="text-red-500">*</span></Label>
                  <Input
                    id="date"
                    type="date"
                    dir="rtl"
                    className="h-9 bg-white text-right"
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                  {formErrors.date && <p className="text-xs text-red-500 text-right">{formErrors.date}</p>}
                </div>
                <div className="grid gap-1 order-first">
                  <Label htmlFor="type" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">نوع التقييم <span className="text-red-500">*</span></Label>
                  <UnifiedSelect
                    id="type"
                    size="sm"
                    value={formData.type as string}
                    onChange={(v) => setFormData({ ...formData, type: v as any })}
                    placeholder="اختر النوع"
                    options={assessmentTypeOptions.map(o => ({
                      value: o.value,
                      label: (
                        <span className="flex items-center gap-1">
                          <span>📘</span>
                          <span>{o.label}</span>
                        </span>
                      )
                    }))}
                    emptyLabel="لا توجد خيارات"
                  />
                  {formErrors.type && <p className="text-xs text-red-500 text-right">{formErrors.type}</p>}
                </div>
              </div>
              {/* ملاحظات */}
              <div className="grid gap-1">
                <Label htmlFor="notes" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أدخل ملاحظات إضافية"
                  className="min-h-[70px] bg-white text-right"
                />
              </div>
            </div>
          )}
          {wizardStep === 1 && (
            <div className="grid gap-3 py-2">
              {/* نطاق التقييم - من */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1 order-last">
                  <Label htmlFor="from_ayah" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">من آية <span className="text-red-500">*</span></Label>
                  <Input
                    id="from_ayah"
                    type="number"
                    className="h-9 bg-white text-right"
                    min="1"
                    max={quranSurahs.find(s => s.number === formData.from_surah)?.ayahs || 1}
                    value={formData.from_ayah}
                    onChange={(e) => setFormData({ ...formData, from_ayah: parseInt(e.target.value) })}
                  />
                  {formErrors.from_ayah && <p className="text-xs text-red-500 text-right">{formErrors.from_ayah}</p>}
                </div>

                <div className="grid gap-1 order-first">
                  <Label htmlFor="from_surah" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">من سورة <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.from_surah?.toString()}
                    onValueChange={(value) => handleSurahChange('from_surah', parseInt(value))}
                  >
                    <SelectTrigger
                      id="from_surah"
                      className={`h-9 text-right text-[11px] sm:text-xs rounded-lg border px-2 pr-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800 ${formData.from_surah
                        ? 'border-green-300 dark:border-green-600 bg-green-50/70 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500'} `}
                    >
                      <SelectValue placeholder="اختر السورة" />
                    </SelectTrigger>
                    <SelectContent className="text-right max-h-[200px] text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900">
                      {quranSurahs.map(surah => (
                        <SelectItem key={surah.number} value={surah.number.toString()} className="cursor-pointer data-[highlighted]:bg-green-900 dark:data-[highlighted]:bg-green-700/40 rounded-md">
                          📖 {surah.name} ({surah.number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.from_surah && <p className="text-xs text-red-500 text-right">{formErrors.from_surah}</p>}
                </div>
              </div>

              {/* نطاق التقييم - إلى */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1 order-last">
                  <Label htmlFor="to_surah" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">إلى سورة <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.to_surah?.toString()}
                    onValueChange={(value) => handleSurahChange('to_surah', parseInt(value))}
                  >
                    <SelectTrigger
                      id="to_surah"
                      className={`h-9 text-right text-[11px] sm:text-xs rounded-lg border px-2 pr-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800 ${formData.to_surah
                        ? 'border-green-300 dark:border-green-600 bg-green-50/70 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500'} `}
                    >
                      <SelectValue placeholder="اختر السورة" />
                    </SelectTrigger>
                    <SelectContent className="text-right max-h-[200px] text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900">
                      {quranSurahs.map(surah => (
                        <SelectItem key={surah.number} value={surah.number.toString()} className="cursor-pointer data-[highlighted]:bg-green-900 dark:data-[highlighted]:bg-green-700/40 rounded-md">
                          📖 {surah.name} ({surah.number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.to_surah && <p className="text-xs text-red-500 text-right">{formErrors.to_surah}</p>}
                </div>

                <div className="grid gap-1 order-first">
                  <Label htmlFor="to_ayah" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">إلى آية <span className="text-red-500">*</span></Label>
                  <Input
                    id="to_ayah"
                    type="number"
                    className="h-9 bg-white text-right"
                    min="1"
                    max={quranSurahs.find(s => s.number === formData.to_surah)?.ayahs || 1}
                    value={formData.to_ayah}
                    onChange={(e) => setFormData({ ...formData, to_ayah: parseInt(e.target.value) })}
                  />
                  {formErrors.to_ayah && <p className="text-xs text-red-500 text-right">{formErrors.to_ayah}</p>}
                </div>
              </div>

              <div dir="rtl" className="py-3 px-4 mt-2 bg-blue-50 rounded-lg text-sm border border-blue-100">
                <div className="flex items-center gap-2 text-blue-800">
                  <span>📖 نطاق الاختبار:</span>
                  <span className="font-bold">
                    {formData.from_surah && formData.to_surah ?
                      formatAssessmentRange(formData as Assessment) :
                      'غير محدد بعد'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
          {wizardStep === 2 && (
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* درجة الحفظ */}
                <div className="grid gap-1 order-1">
                  <Label htmlFor="memorization_score" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">
                    <span>درجة الحفظ</span>
                  </Label>
                  <Input
                    id="memorization_score"
                    inputMode="decimal"
                    dir="rtl"
                    className="h-9 bg-white text-right"
                    value={formData.memorization_score !== undefined ? formData.memorization_score : ''}
                    onChange={(e) => {
                      let val = parseFloat(e.target.value);
                      if (isNaN(val)) val = undefined;
                      else if (val > 100) val = 100;
                      else if (val < 0) val = 0;
                      setFormData({ ...formData, memorization_score: val });
                    }}
                    placeholder="0 - 100"
                  />
                  {formErrors.memorization_score && <p className="text-xs text-red-500 text-right">{formErrors.memorization_score}</p>}
                </div>
                {/* درجة التجويد */}
                <div className="grid gap-1 order-2">
                  <Label htmlFor="tajweed_score" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">
                    <span>درجة التجويد</span>
                  </Label>
                  <Input
                    id="tajweed_score"
                    inputMode="decimal"
                    dir="rtl"
                    className="h-9 bg-white text-right"
                    value={formData.tajweed_score !== undefined ? formData.tajweed_score : ''}
                    onChange={(e) => {
                      let val = parseFloat(e.target.value);
                      if (isNaN(val)) val = undefined;
                      else if (val > 100) val = 100;
                      else if (val < 0) val = 0;
                      setFormData({ ...formData, tajweed_score: val });
                    }}
                    placeholder="0 - 100"
                  />
                  {formErrors.tajweed_score && <p className="text-xs text-red-500 text-right">{formErrors.tajweed_score}</p>}
                </div>
                {/* درجة التلاوة */}
                <div className="grid gap-1 order-3">
                  <Label htmlFor="recitation_score" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">
                    <span>درجة التلاوة</span>
                  </Label>
                  <Input
                    id="recitation_score"
                    type="text"
                    inputMode="decimal"
                    dir="rtl"
                    className="h-9 bg-white text-right"
                    value={formData.recitation_score !== undefined ? formData.recitation_score : ''}
                    onChange={(e) => {
                      let val = parseFloat(e.target.value);
                      if (isNaN(val)) val = undefined;
                      else if (val > 100) val = 100;
                      else if (val < 0) val = 0;
                      setFormData({ ...formData, recitation_score: val });
                    }}
                    placeholder="0 - 100"
                  />
                  {formErrors.recitation_score && <p className="text-xs text-red-500 text-right">{formErrors.recitation_score}</p>}
                </div>
              </div>


              <div dir="rtl" className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg mt-3 border border-amber-100">
                <div className="flex flex-row-reverse justify-between items-center">
                  <span className="text-lg font-bold text-amber-700 px-3 py-1 bg-white rounded-lg shadow-sm">
                    {calculateTotalScore() !== undefined ? calculateTotalScore() : '-'}
                  </span>
                  <Label htmlFor="total_score" className="font-bold text-right text-sm text-amber-800">
                    الدرجة الكلية:
                  </Label>
                </div>
                <p className="text-xs text-amber-700 mt-2 text-right">
                  (يتم حساب الدرجة الكلية تلقائيًا كمتوسط للدرجات المدخلة)
                </p>
              </div>
            </div>
          )}
        </div>
      </FormDialog>

      {/* حوار السجلات السابقة باستخدام FormDialog + GenericTable */}

      <FormDialog
        title={`📚 السجلات السابقة ${historyStudentName ? ' - ' + historyStudentName : ''}`}
        open={historyDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setHistoryDialogOpen(false);
          } else {
            setHistoryDialogOpen(true);
          }
        }}
        mode="edit" /* عرض فقط */
        hideCancelButton={false}
        onSave={() => setHistoryDialogOpen(false)}
        showSaveButton={false}
        maxWidth="820px"
        mobileFullScreen
        mobileStickyHeader
        mobileInlineActions
        compactFooterSpacing
      >
        <GenericTable
          title={null as any}
          data={historyTableRows as any}
          defaultView="table"
          enablePagination
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
          getRowClassName={(_: any, index: number) =>
            `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`
          }
          columns={([
            { key: '__index', header: '#', align: 'center', render: (r: any) => <span className="text-[11px] font-bold text-gray-600">{r.__index}</span> },
            { key: 'date', header: '📅 التاريخ', align: 'right', render: (r: any) => r.__display.date },
            {
              key: 'type',
              header: '📖 النوع',
              align: 'right',
              render: (r: any) => (
                <Badge className={`px-2 py-1 rounded-lg bg-${r.__display.typeColor}-100 text-${r.__display.typeColor}-800 border-${r.__display.typeColor}-200`}>
                  {r.__display.type}
                </Badge>
              )
            },
            { key: 'range', header: '🔖 النطاق', align: 'right', render: (r: any) => <span dir="rtl">{r.__display.range}</span> },
            { key: 'score', header: '🏆 الدرجة', align: 'right', render: (r: any) => r.__display.score },
            {
              key: 'details',
              header: '📊 تفاصيل',
              align: 'right',
              render: (r: any) => {
                const parts: string[] = [];
                if (r.tajweed_score !== undefined) parts.push(`تجويد: ${formatScore(r.tajweed_score)}`);
                if (r.memorization_score !== undefined) parts.push(`حفظ: ${formatScore(r.memorization_score)}`);
                if (r.recitation_score !== undefined) parts.push(`تلاوة: ${formatScore(r.recitation_score)}`);
                return parts.length === 0
                  ? <span className="text-[10px] text-gray-400">-</span>
                  : <span className="text-[10px] leading-4 whitespace-pre-line text-gray-600">{parts.join('\n')}</span>;
              }
            },
            ...(currentUser?.role === 'superadmin'
              ? [{
                  key: 'actions',
                  header: '⚙️',
                  align: 'center',
                  render: (r: any) => (
                    <div className="flex justify-center items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setHistoryDialogOpen(false); handleEditAssessment(r); }}
                        className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-700 rounded-lg"
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setHistoryDialogOpen(false); handleDeleteAssessment(r); }}
                        className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-700 rounded-lg"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                      </Button>
                    </div>
                  )
                }]
              : [])
          ]) as any}
          emptyMessage="لا توجد سجلات سابقة"
        />
      </FormDialog>


      {/* مربع حوار تأكيد الحذف */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={executeDeleteAssessment}
        isLoading={isLoading}
        title="تأكيد حذف التقييم"
        description="هل أنت متأكد من رغبتك في حذف هذا التقييم؟"
        itemDetails={assessmentToDelete ? {
          "الطالب": assessmentToDelete.student?.full_name || '-',
          "النوع": getAssessmentTypeName(assessmentToDelete.type),
          "التاريخ": new Date(assessmentToDelete.date).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            calendar: 'gregory'
          })
        } : null}
        detailsLabels={[
          { key: "الطالب", label: "الطالب" },
          { key: "النوع", label: "نوع التقييم" },
          { key: "التاريخ", label: "تاريخ التقييم" }
        ]}
        deleteButtonText="نعم، احذف التقييم"
        cancelButtonText="إلغاء"
      />

      {/* نهاية الصفحة */}

    </div>
  );
};

export default StudentAssessments;
