import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
import {
  Clock,
  Check,
  X,
  AlertCircle,
  CalendarCheck,
  UserRound,
  Save,
  RefreshCw,
  Edit,
  FileText,
  BookOpen,
  NotebookPenIcon,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  CheckCircle2,
  Filter,
  RefreshCw as RefreshCwIcon,
  Users,
  RotateCcw
} from "lucide-react";
//
import { Profile } from "@/types/profile";
import { StudyCircle } from "@/types/study-circle";
import { CircleSession, formatDateDisplay, formatTimeDisplay } from "@/types/circle-session";
import { Student } from "@/types/student";
import {
  Attendance,
  AttendanceStatus,
  getAttendanceStatusName,
  getAttendanceStatusColor,
  attendanceStatusOptions
} from "@/types/attendance";
import { studentsLabels, getLabels } from "@/lib/arabic-labels";

import { getStudyCirclesByTeacherId, getAllStudyCircles } from "@/lib/study-circle-service";
import { getSessionsByCircleId } from "@/lib/circle-session-service";
import {
  getStudentsWithAttendanceForSession,
  upsertAttendance
} from "@/lib/attendance-service";
import { getStudentsCountInCircles } from "@/lib/student-count-service";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { TeacherCircleFilterBar } from '@/components/filters/TeacherCircleFilterBar';
import { GenericTable, Column } from '@/components/ui/generic-table';
import { cn } from '@/lib/utils';
// ================== تعريف الأنواع الداخلية ==================
interface StudentWithAttendance {
  student: Student;
  attendance: Attendance | null;
}

interface StudentAttendanceFormData {
  student_id: string;
  status: AttendanceStatus;
  late_minutes?: number;
  note?: string;
}

interface AttendanceRecordProps {
  onNavigate: (path: string) => void;
  currentUser: Profile | null;
}


export function AttendanceRecord({ onNavigate, currentUser }: AttendanceRecordProps) {
  const { toast } = useToast();
  // مرجع حقل القيمة المخصصة لدقائق التأخير (يُستخدم مع الضغط المطوّل على الأزرار)
  const customLateInputRef = useRef<HTMLInputElement | null>(null);

  // حالة اختيار الحلقة والجلسة
  const [teacherCircles, setTeacherCircles] = useState<StudyCircle[]>([]);
  const [allCircles, setAllCircles] = useState<StudyCircle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string>("");
  const [circleSessions, setCircleSessions] = useState<CircleSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CircleSession | null>(null);
  const [mobileSessionIndex, setMobileSessionIndex] = useState(0); // مؤشر الجلسة في الموبايل

  // بيانات الطلاب والحضور
  const [studentsWithAttendance, setStudentsWithAttendance] = useState<StudentWithAttendance[]>([]);
  const [attendanceFormData, setAttendanceFormData] = useState<Record<string, StudentAttendanceFormData>>({});
  // نسخة أصلية للاستخدام في إعادة التعيين
  const [initialAttendanceFormData, setInitialAttendanceFormData] = useState<Record<string, StudentAttendanceFormData>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // عدد الطلاب في كل حلقة
  const [studentsCount, setStudentsCount] = useState<Record<string, number>>({});

  // حالة التحميل المختلفة
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  // حوار تأكيد الحفظ (أصبح دائماً قبل الحفظ)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // فلترة المعلمين (للأدمن/المشرف) - إذا كان المستخدم معلماً نلصق معرفه مباشرة
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(() => {
    if (currentUser?.role === 'teacher') return currentUser.id;
    return null;
  });

  // (أزيلت آليات تصفح/كاروسيل الجلسات بعد دمج اختيار الجلسة في شريط الفلترة)

  // التحرير
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editForm, setEditForm] = useState<{ status: AttendanceStatus; late_minutes?: number; note?: string; }>({
    status: 'present',
    late_minutes: 0,
    note: '',
  });

  const labels = getLabels('ar');
  const scsLabels = labels.studyCircleSchedulesLabels;
  const isAdminOrSuperadmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // تحميل الحلقات عند تحميل الصفحة
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        toast({ title: 'تنبيه', description: 'يرجى تسجيل الدخول أولاً', variant: 'destructive' });
        onNavigate('/login');
        return;
      }
      setLoading(true);
      try {
        if (isAdminOrSuperadmin) {
          const circles = await getAllStudyCircles();
          setAllCircles(circles);
          if (circles.length > 0) {
            const counts = await getStudentsCountInCircles(circles.map(c => c.id));
            setStudentsCount(counts);
            setSelectedCircle(prev => prev || circles[0].id);
          }
        } else if (currentUser.role === 'teacher') {
          const circles = await getStudyCirclesByTeacherId(currentUser.id);
          setTeacherCircles(circles);
          if (circles.length > 0) {
            const counts = await getStudentsCountInCircles(circles.map(c => c.id));
            setStudentsCount(counts);
            setSelectedCircle(prev => prev || circles[0].id);
          }
        } else {
          toast({ title: 'تنبيه', description: 'ليس لديك صلاحية للوصول إلى هذه الصفحة', variant: 'destructive' });
          onNavigate('/');
        }
      } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        toast({ title: 'خطأ', description: 'حدث خطأ أثناء جلب البيانات', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser, onNavigate, toast, isAdminOrSuperadmin]);

  // جلب جلسات الحلقة المختارة
  useEffect(() => {
    const loadCircleSessions = async () => {
      if (!selectedCircle) return;

      setLoading(true);
      try {
        const sessions = await getSessionsByCircleId(selectedCircle);

        // تصفية الجلسات ليتم عرض فقط جلسات اليوم والمستقبلية
        const today = new Date();
        today.setHours(0, 0, 0, 0); // تعيين الوقت إلى بداية اليوم

        const filteredSessions = sessions.filter(session => {
          const sessionDate = new Date(session.session_date);
          sessionDate.setHours(0, 0, 0, 0); // تعيين الوقت إلى بداية اليوم للمقارنة العادلة
          return sessionDate >= today;
        });

        // ترتيب الجلسات حسب التاريخ (الأقرب أولاً)
        const sortedSessions = filteredSessions.sort((a, b) =>
          new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
        );

        setCircleSessions(sortedSessions);
        // تعيين أول جلسة (اليوم أو القادمة) تلقائياً لعرض الطلاب مباشرة
        setSelectedSession(sortedSessions[0] || null);
      } catch (error) {
        console.error("خطأ في جلب جلسات الحلقة:", error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء جلب بيانات الجلسات",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCircleSessions();
  }, [selectedCircle, toast]);

  // جلب الطلاب وبيانات الحضور للجلسة المختارة
  useEffect(() => {
    const loadStudentsAndAttendance = async () => {
      if (!selectedCircle || !selectedSession || !selectedSession.id) {
        setStudentsWithAttendance([]);
        setAttendanceFormData({});
        return;
      }

      setLoadingStudents(true);
      try {
        const studentsData = await getStudentsWithAttendanceForSession(
          selectedCircle,
          selectedSession.id
        );

        setStudentsWithAttendance(studentsData);

        // تهيئة نموذج بيانات الحضور
        const formData: Record<string, StudentAttendanceFormData> = {};
        studentsData.forEach(({ student, attendance }) => {
          formData[student.id] = {
            student_id: student.id,
            status: attendance?.status || 'present',
            late_minutes: attendance?.late_minutes || 0,
            note: attendance?.note || '',
          };
        });

        setAttendanceFormData(formData);
        setInitialAttendanceFormData(formData); // حفظ النسخة الأصلية عند التحميل
        setHasChanges(false);
      } catch (error) {
        console.error("خطأ في جلب بيانات الطلاب والحضور:", error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء جلب بيانات الطلاب والحضور",
          variant: "destructive",
        });
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudentsAndAttendance();
  }, [selectedCircle, selectedSession, toast]);

  // (محذوف) كان هناك تأثير لمؤشرات تمرير الطلاب قبل السلايدر الجديد.

  // تغيير الحلقة المختارة
  const handleCircleChange = (circleId: string) => {
    setSelectedCircle(circleId);
  };

  // تغيير الجلسة المختارة
  const handleSessionChange = (session: CircleSession) => {
    setSelectedSession(session);
  };

  // تغيير حالة حضور طالب
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceFormData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        // إذا كانت الحالة ليست "متأخر"، فإننا نعيد تعيين دقائق التأخير إلى 0
        late_minutes: status === 'late' ? (prev[studentId].late_minutes || 0) : 0,
      }
    }));
    setHasChanges(true);
  };

  // فتح نافذة تحرير معلومات حضور طالب
  const handleEditAttendance = (studentId: string) => {
    setEditingStudentId(studentId);
    const studentFormData = attendanceFormData[studentId];
    setEditForm({
      status: studentFormData.status,
      late_minutes: studentFormData.late_minutes || 0,
      note: studentFormData.note || '',
    });
    setIsEditDialogOpen(true);
  };

  // حفظ تغييرات تحرير حضور طالب
  const handleSaveEdit = () => {
    if (!editingStudentId) return;

    setAttendanceFormData(prev => ({
      ...prev,
      [editingStudentId]: {
        ...prev[editingStudentId],
        status: editForm.status,
        late_minutes: editForm.status === 'late' ? editForm.late_minutes : 0,
        note: editForm.note,
      }
    }));

    setIsEditDialogOpen(false);
    setEditingStudentId(null);
    setHasChanges(true);
  };

  // حفظ جميع بيانات الحضور
  const handleSaveAllAttendance = async () => {
    if (!selectedCircle || !selectedSession || !selectedSession.id || !currentUser) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار الحلقة والجلسة أولاً",
        variant: "destructive",
      });
      return;
    }

    setSavingAttendance(true);
    try {
      // تحويل بيانات النموذج إلى مصفوفة من سجلات الحضور
      const attendanceRecords = Object.values(attendanceFormData).map(formData => ({
        circle_session_id: selectedSession.id as number,
        student_id: formData.student_id,
        status: formData.status,
        late_minutes: formData.status === 'late' ? formData.late_minutes : 0,
        note: formData.note,
        recorded_by: currentUser.id,
      }));

      // حفظ سجلات الحضور
      const result = await upsertAttendance(attendanceRecords);

      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: "تم حفظ بيانات الحضور بنجاح",
        });
        // تحديث النسخة الأصلية بعد الحفظ الناجح
        setInitialAttendanceFormData(attendanceFormData);
        setHasChanges(false);
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء حفظ بيانات الحضور",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حفظ بيانات الحضور:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء حفظ بيانات الحضور",
        variant: "destructive",
      });
    } finally {
      setSavingAttendance(false);
    }
  };

  // إعادة التعيين إلى آخر نسخة محفوظة
  const resetAttendanceToInitial = () => {
    if (!Object.keys(initialAttendanceFormData).length) return;
    setAttendanceFormData(initialAttendanceFormData);
    setHasChanges(false);
    toast({
      title: 'تم الإرجاع',
      description: 'تمت إعادة البيانات إلى آخر حالة محفوظة',
    });
  };

  // عرض حوار تأكيد دائماً قبل الحفظ
  const attemptSaveAttendance = () => {
    if (!selectedSession) return;
    setShowSaveConfirm(true);
  };

  const confirmAttendanceSave = async () => {
    setPendingSave(true);
    try {
      await handleSaveAllAttendance();
    } finally {
      setPendingSave(false);
      setShowSaveConfirm(false);
    }
  };

  // تعيين حالة الحضور لجميع الطلاب
  const setAllStudentsStatus = (status: AttendanceStatus) => {
    const updatedFormData = { ...attendanceFormData };

    Object.keys(updatedFormData).forEach(studentId => {
      updatedFormData[studentId] = {
        ...updatedFormData[studentId],
        status,
        late_minutes: status === 'late' ? (updatedFormData[studentId].late_minutes || 0) : 0,
      };
    });

    setAttendanceFormData(updatedFormData);
    setHasChanges(true);
  };

  // الحصول على اسم الحلقة من معرفها
  const getCircleName = (circleId: string): string => {
    const circlesList = isAdminOrSuperadmin ? allCircles : teacherCircles;
    const circle = circlesList.find((c) => c.id === circleId);
    return circle ? circle.name : "حلقة غير معروفة";
  };

  // الحصول على الاسم العربي للمرحلة الدراسية
  const getGradeLevelName = (gradeCode: string | undefined): string => {
    if (!gradeCode) return "المستوى غير محدد";

    const gradeOption = studentsLabels.gradeOptions.find(option => option.value === gradeCode);
    return gradeOption ? gradeOption.label : gradeCode;
  };

  // ===== إعداد بيانات المعلمين والحلقات لشريط الفلترة الموحد =====
  const baseCircles = isAdminOrSuperadmin ? allCircles : teacherCircles;

  // استخراج قائمة المعلمين (للأدمن/المشرف فقط) مع عدد الحلقات
  const teachersForFilter = useMemo(() => {
    if (!isAdminOrSuperadmin) {
      if (currentUser?.role === 'teacher') {
        return [{ id: currentUser.id, name: currentUser.full_name || 'المعلم', circles_count: teacherCircles.length }];
      }
      return [];
    }
    const map = new Map<string, { id: string; name: string; circles_count: number }>();
    baseCircles.forEach(c => {
      const t = c.teacher;
      if (t && t.id) {
        if (!map.has(t.id)) {
          map.set(t.id, { id: t.id, name: t.full_name, circles_count: 1 });
        } else {
          map.get(t.id)!.circles_count += 1;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [baseCircles, isAdminOrSuperadmin, currentUser, teacherCircles.length]);

  // تأكيد تهيئة selectedTeacherId للمعلّم (مع عدم الكتابة فوق اختيار يدوي لاحق)
  useEffect(() => {
    if (currentUser?.role === 'teacher' && !selectedTeacherId) {
      setSelectedTeacherId(currentUser.id);
    }
  }, [currentUser, selectedTeacherId]);

  // في حالة كان المستخدم Admin/Superadmin لكنه أيضاً معلّم (مربوط كـ teacher في بعض الحلقات) ولم يتم اختيار معلم بعد
  useEffect(() => {
    if ((currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && !selectedTeacherId) {
      const teachesAny = baseCircles.some(c => c.teacher?.id === currentUser.id);
      if (teachesAny) {
        setSelectedTeacherId(currentUser.id);
      }
    }
  }, [currentUser, selectedTeacherId, baseCircles]);

  // حلقات بعد تطبيق فلتر المعلم
  const circlesAfterTeacher = useMemo(() => {
    if (isAdminOrSuperadmin && selectedTeacherId) {
      return baseCircles.filter(c => c.teacher?.id === selectedTeacherId);
    }
    return baseCircles;
  }, [baseCircles, isAdminOrSuperadmin, selectedTeacherId]);

  // فلترة حسب البحث (اسم الحلقة أو اسم المعلم)
  const filteredCircles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return circlesAfterTeacher;
    return circlesAfterTeacher.filter(circle =>
      circle.name.toLowerCase().includes(term) ||
      (circle.teacher?.full_name && circle.teacher.full_name.toLowerCase().includes(term))
    );
  }, [circlesAfterTeacher, searchTerm]);

  // إذا تغيّرت الفلترة وأصبحت الحلقة المختارة خارج النطاق، اختر أول حلقة متاحة
  useEffect(() => {
    if (selectedCircle && !filteredCircles.some(c => c.id === selectedCircle)) {
      setSelectedCircle(filteredCircles[0]?.id || '');
    }
  }, [filteredCircles, selectedCircle]);

  // أزيلت حسابات وترقيم كاروسيل الجلسات القديم

  // (أزيل تأثير إعادة ضبط sessionCarouselIndex بعد إزالة الكاروسيل)

  // ================== طلاب (سلايدر 3 بطاقات) ==================
  const studentsGroupSize = 4; // تحديث: عرض 4 طلاب في كل مجموعة
  const [studentCarouselIndex, setStudentCarouselIndex] = useState(0);
  const totalStudentCarouselGroups = Math.ceil(studentsWithAttendance.length / studentsGroupSize) || 1;
  const visibleStudentsGroup = studentsWithAttendance.slice(
    studentCarouselIndex * studentsGroupSize,
    studentCarouselIndex * studentsGroupSize + studentsGroupSize
  );

  const goPrevStudentCarousel = () => setStudentCarouselIndex(i => Math.max(0, i - 1));
  const goNextStudentCarousel = () => setStudentCarouselIndex(i => Math.min(totalStudentCarouselGroups - 1, i + 1));

  // إعادة ضبط عند تغيير الجلسة أو الحلقة
  useEffect(() => {
    setStudentCarouselIndex(0);
  }, [selectedSession, selectedCircle]);

  // تأمين عدم تخطي الحد عند نقصان عدد الطلاب
  useEffect(() => {
    if (studentCarouselIndex > totalStudentCarouselGroups - 1) {
      setStudentCarouselIndex(totalStudentCarouselGroups - 1);
    }
  }, [studentsWithAttendance.length, totalStudentCarouselGroups, studentCarouselIndex]);

  // (أزيلت دوال التنقل بين صفحات الجلسات القديمة)

  // ضبط selectedSession عند تغيير المؤشر
  useEffect(() => {
    if (circleSessions.length === 0) return;
    const current = circleSessions[mobileSessionIndex];
    setSelectedSession(current || null);
  }, [mobileSessionIndex, circleSessions]);

  const goPrevMobileSession = () => {
    setMobileSessionIndex(i => Math.max(0, i - 1));
  };
  const goNextMobileSession = () => {
    setMobileSessionIndex(i => Math.min(circleSessions.length - 1, i + 1));
  };
  useEffect(() => {
    if (mobileSessionIndex > circleSessions.length - 1) {
      setMobileSessionIndex(0);
    }
  }, [circleSessions.length, mobileSessionIndex]);

  // (أزيل تأثير مؤشرات الكاروسيل للجلسات)

  // تأثير مؤشرات الطلاب
  useEffect(() => {
    for (let i = 0; i < totalStudentCarouselGroups; i++) {
      const indicator = document.getElementById(`student-indicator-${i}`);
      if (indicator) {
        indicator.className = `w-2 h-2 rounded-full transition-all ${i === studentCarouselIndex ? 'bg-emerald-600 scale-125' : 'bg-emerald-300 hover:bg-emerald-400'}`;
      }
    }
  }, [studentCarouselIndex, totalStudentCarouselGroups]);

  // عرض ملخص الحضور
  const renderAttendanceSummary = () => {
    if (!attendanceFormData || Object.keys(attendanceFormData).length === 0) return null;
    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: Object.keys(attendanceFormData).length
    } as Record<string, number> & { total: number };

    Object.values(attendanceFormData).forEach(data => {
      summary[data.status]++;
    });

    return (
      <div className="flex flex-wrap justify-center gap-1.5 text-sm mb-3">
        <span className="h-6 px-2 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] border border-emerald-200 inline-flex items-center gap-1">
          <Users className="h-3 w-3 text-emerald-600" /> مجموع: {summary.total}
        </span>
        <span className="h-6 px-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] border border-blue-200 inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-blue-600" /> حاضر: {summary.present}
        </span>
        <span className="h-6 px-2 rounded-md bg-red-50 hover:bg-red-100 text-red-700 text-[10px] border border-red-200 inline-flex items-center gap-1">
          <X className="h-3 w-3 text-red-600" /> غائب: {summary.absent}
        </span>
        <span className="h-6 px-2 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] border border-amber-200 inline-flex items-center gap-1">
          <Clock className="h-3 w-3 text-amber-600" /> متأخر: {summary.late}
        </span>
        <span className="h-6 px-2 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] border border-sky-200 inline-flex items-center gap-1">
          <Calendar className="h-3 w-3 text-sky-600" /> معذور: {summary.excused}
        </span>
      </div>
    );
  };

  // ===== بيانات الجدول (سطح المكتب) باستخدام GenericTable =====
  interface AttendanceTableRow {
    id: string; // معرف الطالب
    studentName: string;
    guardianName: string;
    note?: string;
  }

  const attendanceTableData: AttendanceTableRow[] = useMemo(() => {
    return studentsWithAttendance.map(({ student }) => ({
      id: student.id,
      studentName: student.full_name,
      guardianName: student.guardian?.full_name || '',
      note: attendanceFormData[student.id]?.note || ''
    }));
  }, [studentsWithAttendance, attendanceFormData]);

  const attendanceColumns: Column<AttendanceTableRow>[] = useMemo(() => ([
    {
      key: '__index',
      header: '🔢',
      width: '48px',
      align: 'center',
      render: (_row, globalIndex) => (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-800 text-[11px] font-bold border border-emerald-300 shadow-sm">
          {(globalIndex ?? 0) + 1}
        </span>
      )
    },
    {
      key: 'studentName',
      header: '👪 ' + 'الطالب / ولي الأمر',
      render: (row) => (
        <div className="flex items-start gap-2 max-w-[280px]">
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[11.5px] font-semibold text-emerald-800 truncate" title={row.studentName}>{row.studentName}</span>
            {row.guardianName && <span className="text-[10px] text-gray-500 truncate" title={row.guardianName}>{row.guardianName}</span>}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: '📋 ' + 'الحالة',
      render: (row) => {
        const st = attendanceFormData[row.id]?.status || 'present';
        const colorMap: Record<string, string> = {
          present: 'border-emerald-300 bg-emerald-50 text-emerald-700',
          absent: 'border-red-300 bg-red-50 text-red-700',
          late: 'border-amber-300 bg-amber-50 text-amber-700',
          excused: 'border-blue-300 bg-blue-50 text-blue-700'
        };
        return (
          <div className="min-w-[130px]">
            <Select
              value={st}
              onValueChange={(value) => handleStatusChange(row.id, value as AttendanceStatus)}
            >
              <SelectTrigger
                id={`attendance-status-${row.id}`}
                dir="rtl"
                className={cn(
                  // base
                  'h-9 text-right truncate max-w-full min-w-[120px] text-[11px] sm:text-xs rounded-md border px-2 pr-2 transition-all',
                  'focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-gray-800 shadow-sm',
                  // selected state styling derived from provided teacher select (green variant) + subtle status accent ring
                  st === 'present' && 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold',
                  st === 'absent' && 'border-red-400/80 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold',
                  st === 'late' && 'border-amber-400/80 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold',
                  st === 'excused' && 'border-blue-400/80 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 font-semibold'
                )}
              >
                <SelectValue placeholder="الحالة">
                  <span className="flex items-center gap-1.5">
                    {st === 'present' && (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-green-200 to-green-100 dark:from-green-800 dark:to-green-700 shadow-sm ring-1 ring-green-300/50 dark:ring-green-600/40">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-700 dark:text-green-200" />
                      </span>
                    )}
                    {st === 'absent' && (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-red-200 to-red-100 dark:from-red-800 dark:to-red-700 shadow-sm ring-1 ring-red-300/50 dark:ring-red-600/40">
                        <X className="h-3.5 w-3.5 text-red-700 dark:text-red-200" />
                      </span>
                    )}
                    {st === 'late' && (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-amber-200 to-amber-100 dark:from-amber-800 dark:to-amber-700 shadow-sm ring-1 ring-amber-300/50 dark:ring-amber-600/40">
                        <Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-200" />
                      </span>
                    )}
                    {st === 'excused' && (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-700 shadow-sm ring-1 ring-blue-300/50 dark:ring-blue-600/40">
                        <Calendar className="h-3.5 w-3.5 text-blue-700 dark:text-blue-200" />
                      </span>
                    )}
                    <span className="font-medium">
                      {getAttendanceStatusName(st as AttendanceStatus)}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                position="popper"
                dir="rtl"
                className="text-right text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900 max-h-60 overflow-auto"
              >
                {attendanceStatusOptions.map(option => {
                  const Icon = option.value === 'present' ? CheckCircle2 : option.value === 'absent' ? X : option.value === 'late' ? Clock : Calendar;
                  const colorClasses = option.value === 'present' ? 'from-green-200 to-green-100 ring-green-300/50 dark:from-green-800 dark:to-green-700 dark:ring-green-600/40 text-green-700 dark:text-green-200'
                    : option.value === 'absent' ? 'from-red-200 to-red-100 ring-red-300/50 dark:from-red-800 dark:to-red-700 dark:ring-red-600/40 text-red-700 dark:text-red-200'
                      : option.value === 'late' ? 'from-amber-200 to-amber-100 ring-amber-300/50 dark:from-amber-800 dark:to-amber-700 dark:ring-amber-600/40 text-amber-700 dark:text-amber-200'
                        : 'from-blue-200 to-blue-100 ring-blue-300/50 dark:from-blue-800 dark:to-blue-700 dark:ring-blue-600/40 text-blue-700 dark:text-blue-200';
                  return (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={cn(
                        'cursor-pointer rounded-[6px] px-2 py-1.5 transition-colors flex items-center gap-2',
                        'data-[highlighted]:bg-green-800 data-[highlighted]:text-white dark:data-[highlighted]:bg-green-700',
                        'data-[state=checked]:bg-green-700 data-[state=checked]:text-white'
                      )}
                    >
                      <span className={cn('inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br shadow-sm ring-1', colorClasses)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate font-medium"> {option.label}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );
      }
    },
    {
      key: 'late',
      header: '⏰ ' + 'دقائق تأخير',
      align: 'center',
      render: (row) => {
        const st = attendanceFormData[row.id]?.status;
        if (st !== 'late') return <span className="text-gray-300 text-[11px]">—</span>;
        const val = attendanceFormData[row.id]?.late_minutes ?? 0;
        const ratio = val / 60;
        const shade = val === 0 ? '50' : ratio <= 0.15 ? '100' : ratio <= 0.3 ? '200' : ratio <= 0.45 ? '300' : ratio <= 0.6 ? '400' : ratio <= 0.8 ? '500' : '600';
        const pillClass = val === 0
          ? 'bg-gray-100 border-gray-300 text-gray-500'
          : `bg-amber-${shade} border-amber-${shade === '50' ? '200' : shade} text-amber-${['50','100'].includes(shade)?'800':'50'}`;
        return (
          <LateMinutesInlineEditor
            value={val}
            onChange={(newVal) => {
              setAttendanceFormData(prev => ({
                ...prev,
                [row.id]: { ...prev[row.id], late_minutes: newVal }
              }));
              setHasChanges(true);
            }}
            pillClass={pillClass}
          />
        );
      }
    },
    {
      key: 'note',
      header: '📝 ' + 'ملاحظة',
      render: (row) => (
        attendanceFormData[row.id]?.note ? (
          <button
            type="button"
            onClick={() => handleEditAttendance(row.id)}
            className="group inline-flex items-center gap-1 max-w-[220px] text-[11px] text-gray-600 hover:text-emerald-700 transition-colors"
            title={attendanceFormData[row.id]?.note}
          >
            <FileText className="h-3.5 w-3.5 text-emerald-500 group-hover:text-emerald-600" />
            <span className="truncate font-medium">{attendanceFormData[row.id]?.note}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleEditAttendance(row.id)}
            className="text-[10px] text-gray-400 hover:text-emerald-600 italic underline-offset-2 hover:underline"
            title="إضافة ملاحظة"
          >
            لا يوجد
          </button>
        )
      )
    },
    {
      key: 'actions',
      header: '⚙️ ' + 'تحرير',
      render: (row) => (
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditAttendance(row.id)}
            className="h-7 w-7 p-0 rounded-full hover:bg-emerald-100"
            title="تحرير السجل"
          >
            <Edit className="h-4 w-4 text-emerald-700" />
          </Button>
        </div>
      )
    }
  ]), [attendanceFormData]);

  // تلوين الصف حسب الحالة
  const getAttendanceRowClass = (row: AttendanceTableRow) => {
    const st = attendanceFormData[row.id]?.status;
    // نعتمد نفس الألوان لكل من الصفوف والبطاقات (تم تطبيقها الآن أيضاً على البطاقات عبر generic-table)
    switch (st) {
      case 'present':
        return 'bg-emerald-50/60 hover:bg-emerald-50';
      case 'absent':
        return 'bg-red-50/60 hover:bg-red-50';
      case 'late':
        return 'bg-amber-50/70 hover:bg-amber-50';
      case 'excused':
        return 'bg-blue-50/60 hover:bg-blue-50';
      default:
        return '';
    }
  };

  // دالة إعادة ضبط الفلاتر والاختيارات (أُعيدت بعد حذف الكاروسيل)
  const handleResetSelections = () => {
    setSearchTerm("");

    if (currentUser?.role === 'teacher') {
      setSelectedTeacherId(currentUser.id);
      const firstCircle = teacherCircles[0];
      setSelectedCircle(firstCircle?.id || '');
    } else if (isAdminOrSuperadmin) {
      const firstTeacher = teachersForFilter[0];
      if (firstTeacher) {
        const circleForTeacher = baseCircles.find(c => c.teacher?.id === firstTeacher.id);
        if (circleForTeacher) {
          setSelectedCircle(circleForTeacher.id);
          return;
        }
      }
      setSelectedCircle(baseCircles[0]?.id || '');
    } else {
      const circlesPool = teacherCircles.length ? teacherCircles : baseCircles;
      setSelectedCircle(circlesPool[0]?.id || '');
    }
  };

  // حالات الطي وإظهار شريط الفلترة (أُعيد تعريفها بعد التنظيف)
  const [sessionsCardCollapsed, setSessionsCardCollapsed] = useState(false);
  const [mainCardCollapsed, setMainCardCollapsed] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 
                               border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-row justify-between items-center gap-2 w-full">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
                <NotebookPenIcon className="h-4 w-4 sm:h-4 sm:w-4 md:h-6 md:w-6 text-yellow-300 animate-pulse" />
                <span className="line-clamp-1">سجل حضور الطلاب</span>
              </CardTitle>
              <CardDescription className="hidden sm:block text-[11px] sm:text-sm text-green-100/90 mt-0.5">
                يمكنك تسجيل حضور الطلاب للجلسات. اختر الحلقة والجلسة أولاً، ثم قم بتحديد حالة الحضور لكل طالب.
              </CardDescription>
            </div>
            {/* زر الطي للكارد الرئيسي */}
            <button
              type="button"
              onClick={() => setMainCardCollapsed(v => !v)}
              aria-label={mainCardCollapsed ? 'فتح الكارد' : 'طي الكارد'}
              aria-expanded={!mainCardCollapsed}
              aria-controls="main-card-body"
              className={`inline-flex items-center justify-center h-9 w-9 rounded-full border border-white/30 text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 ${mainCardCollapsed ? 'rotate-180' : ''}`}
              title={mainCardCollapsed ? 'عرض المحتوى' : 'إخفاء المحتوى'}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent
          id="main-card-body"
          className={`space-y-0 sm:space-y-0.5 px-1 sm:px-4 pt-3 pb-2 transition-[max-height] duration-300 
                      ease-in-out origin-top ${mainCardCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-fit opacity-100'}`}
          aria-hidden={mainCardCollapsed}
        >
          {/* شريط التحكم بالفلاتر (الأزرار) */}
          <div className={`flex flex-col md:flex-row justify-end items-center gap-2 mb-2 rounded-md p-1.5 shadow-sm border transition-colors duration-200 ${hasChanges ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600' : 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-700'}`}>
            <div className="flex flex-wrap gap-2 items-center ">
              {/* زر الفلتر لإظهار/إخفاء شريط TeacherCircleFilterBar */}
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className={`flex items-center gap-1.5 rounded-xl ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} dark:bg-green-700 dark:hover:bg-green-600 shadow-sm transition-colors px-2.5 py-1 text-[11px] font-medium h-8`}
                onClick={() => setShowFilters(p => !p)}
                title={showFilters ? 'إخفاء شريط الفلترة' : 'إظهار شريط الفلترة'}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">فلتر</span>
              </Button>
              {/* زر التحديث لإلغاء التحديد */}
              <Button
                variant="outline"
                className="flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-sm transition-colors px-2.5 py-1 text-[11px] font-medium h-8"
                onClick={handleResetSelections}
                title='تحديث / إلغاء التحديد'
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mb-3 mt-1">
              <TeacherCircleFilterBar
                teachers={teachersForFilter}
                circles={filteredCircles.map(c => ({ id: c.id, name: c.name, teacher_id: c.teacher?.id }))}
                selectedTeacherId={selectedTeacherId}
                selectedCircleId={selectedCircle}
                showSessionSelect
                sessions={circleSessions.map(s => {
                  const d = new Date(s.session_date); const t = new Date();
                  d.setHours(0, 0, 0, 0); t.setHours(0, 0, 0, 0);
                  return { id: String(s.id), dateLabel: formatDateDisplay(s.session_date), isToday: d.getTime() === t.getTime() };
                })}
                selectedSessionId={selectedSession ? String(selectedSession.id) : null}
                onSessionChange={(id) => {
                  const found = circleSessions.find(s => String(s.id) === id);
                  if (found) handleSessionChange(found);
                }}
                searchQuery={searchTerm}
                onSearchChange={(val) => setSearchTerm(val)}
                onTeacherChange={(id) => {
                  setSelectedTeacherId(id);
                  if (id) {
                    const first = baseCircles.find(c => c.teacher?.id === id);
                    setSelectedCircle(first?.id || '');
                  } else {
                    setSelectedCircle(baseCircles[0]?.id || '');
                  }
                }}
                onCircleChange={(id) => { if (id) handleCircleChange(id); }}
                useInlineSelects
                useShadSelect
                teacherLabel="اختر معلماً"
                circleLabel="اختر حلقة"
                sessionLabel="اختر جلسة"
                searchPlaceholder="بحث..."
              />
            </div>
          )}
        </CardContent>
      </Card>
      {/* Unified responsive summary + date bar */}


      {selectedSession && attendanceTableData.length > 0 && (
        <div
          className="flex flex-col md:flex-row gap-1 md:gap-2 mb-3 w-full pt-1.5 px-1 sm:px-0 justify-center md:justify-between items-center"
        >
          <div
            className="flex flex-wrap items-center justify-center md:justify-start bg-white dark:bg-gray-900 border border-emerald-200 
            dark:border-green-700 rounded-md p-1.5 md:p-2 gap-1 md:gap-1.5 text-[10px] md:text-[11.5px] font-medium"
          >
            <span className="inline-flex items-center text-emerald-700 bg-white/60 px-2 py-0.5  gap-1">
              <Calendar className="h-5 w-5 text-emerald-1500" />
              {formatDateDisplay(selectedSession.session_date)}
              {selectedSession.start_time && selectedSession.end_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-5 w-5 text-emerald-1500" />
                  {formatTimeDisplay(selectedSession.start_time)} - {formatTimeDisplay(selectedSession.end_time)}
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start
                   bg-white dark:bg-gray-900 border border-green-200 dark:border-green-700
                   rounded-md p-1.5 md:p-2 gap-1.5 md:gap-2
                   text-[10.5px] md:text-[12px] font-medium shadow-sm">
            {/* زر إرجاع التغييرات */}
            <Button
              size="sm"
              onClick={resetAttendanceToInitial}
              disabled={!hasChanges}
              className="flex items-center gap-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors px-2.5 py-1 text-[11px] font-medium h-8 border border-gray-300"
              title="إرجاع التغييرات غير المحفوظة"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">إرجاع</span>
            </Button>
            {/* زر تعيين الجميع حاضر */}
            <Button
              size="sm"
              onClick={() => setAllStudentsStatus("present")}
              className="flex items-center gap-1.5 rounded-xl bg-green-100 hover:bg-green-200 text-green-800 shadow-sm transition-colors px-2.5 py-1 text-[11px] font-medium h-8 border border-green-300"
              title="تعيين كل الطلاب حاضر"
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">الكل حاضر</span>
            </Button>
            {/* زر تعيين الجميع غائب */}
            <Button
              size="sm"
              onClick={() => setAllStudentsStatus("absent")}
              className="flex items-center gap-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 shadow-sm transition-colors px-2.5 py-1 text-[11px] font-medium h-8 border border-red-300"
              title="تعيين كل الطلاب غائب"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">الكل غائب</span>
            </Button>
            {/* زر حفظ الحضور (منقول من الفوتر) */}
            <Button
              onClick={attemptSaveAttendance}
              disabled={!hasChanges || savingAttendance || studentsWithAttendance.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors px-3 py-1 text-[11px] font-medium h-8"
              title="حفظ الحضور"
            >
              {savingAttendance ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">جارٍ الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">حفظ الحضور</span>
                </>
              )}
            </Button>
          </div>
          <div
            className="flex flex-wrap items-center justify-center md:justify-start
                   bg-white dark:bg-gray-900 border border-green-200 dark:border-green-700
                   rounded-md p-1.5 md:p-2 gap-1.5 md:gap-2
                   text-[10.5px] md:text-[12px] font-medium shadow-sm"
          >
            <span className="px-1.5 md:px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1 md:gap-1.5 shadow-xs">
              <Users className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-600" />
              مجموع: {attendanceTableData.length}
            </span>
            <span className="px-1.5 md:px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 inline-flex items-center gap-1 md:gap-1.5 shadow-xs">
              <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-blue-600" />
              حاضر: {Object.values(attendanceFormData).filter(v => v.status === 'present').length}
            </span>
            <span className="px-1.5 md:px-2 py-0.5 rounded-md bg-red-50 border border-red-200 inline-flex items-center gap-1 md:gap-1.5 shadow-xs">
              <X className="h-3 w-3 md:h-3.5 md:w-3.5 text-red-600" />
              غائب: {Object.values(attendanceFormData).filter(v => v.status === 'absent').length}
            </span>
            <span className="px-1.5 md:px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 inline-flex items-center gap-1 md:gap-1.5 shadow-xs">
              <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-600" />
              متأخر: {Object.values(attendanceFormData).filter(v => v.status === 'late').length}
            </span>
            <span className="px-1.5 md:px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 inline-flex items-center gap-1 md:gap-1.5 shadow-xs">
              <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 text-sky-600" />
              معذور: {Object.values(attendanceFormData).filter(v => v.status === 'excused').length}
            </span>
          </div>
        </div>
      )}

      {/* جدول الحضور لسطح المكتب */}
      {selectedCircle && selectedSession && (
        <div>
          {loadingStudents ? (
            <div className="text-center py-10 bg-white border rounded-xl shadow-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-green-600" />
              <p className="text-gray-600 text-sm">جارٍ تحميل بيانات الطلاب...</p>
            </div>
          ) : attendanceTableData.length === 0 ? (
            <div className="text-center py-10 bg-green-50 rounded-xl border border-green-200">
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-amber-500" />
              <p className="text-sm font-medium text-green-800">لا يوجد طلاب</p>
              <p className="text-[12px] text-gray-600">يرجى إضافة طلاب لهذه الحلقة.</p>
            </div>
          ) : (
            <>
              <GenericTable<AttendanceTableRow>
                data={attendanceTableData}
                columns={attendanceColumns}
                defaultView="table"
                enablePagination={true}
                defaultPageSize={10}
                pageSizeOptions={[10, 15, 25, 50]}
                hideSortToggle={false}
                enableSorting
                cardPageSize={10}
                cardGridColumns={{ sm: 1, md: 2, lg: 4, xl: 6 }}
                //cardWidth="230px"
                compactCards
                cardAutoLayout
                cardMinWidth={217.5}
                getRowClassName={(row) => getAttendanceRowClass(row)}
                title={(
                  <div className="w-full flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[12.5px] font-bold text-emerald-800">
                          <CalendarCheck className="h-4 w-4 text-yellow-500" />
                          {getCircleName(selectedCircle)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              />
            </>
          )}
        </div>
      )}

      {/* نافذة تأكيد الحفظ (تظهر لأننا نستخدم showSaveConfirm) */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-[340px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-green-200 dark:border-green-700 p-4 space-y-3 animate-in fade-in zoom-in">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-700 dark:to-green-600 border border-green-300 dark:border-green-500">
                <Save className="h-4 w-4 text-green-700 dark:text-green-100" />
              </span>
              <h2 className="text-sm font-semibold text-green-800 dark:text-green-100">تأكيد حفظ الحضور</h2>
            </div>
            <p className="text-[12px] leading-relaxed text-gray-600 dark:text-gray-300">
              هل أنت متأكد أنك تريد حفظ بيانات الحضور الحالية؟ سيتم استبدال أي بيانات محفوظة سابقة لهذه الجلسة.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSaveConfirm(false)}
                className="h-8 px-3 text-[11px] rounded-md border-gray-300 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >إلغاء</Button>
              <Button
                type="button"
                disabled={pendingSave || savingAttendance}
                onClick={confirmAttendanceSave}
                className="h-8 px-4 text-[11px] rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {(pendingSave || savingAttendance) && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {pendingSave || savingAttendance ? 'جارٍ الحفظ...' : 'تأكيد'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تحرير معلومات حضور طالب */}
      <FormDialog
        title="تفاصيل الحضور"
        description={editingStudentId && (() => {
          const studentWithAttendance = studentsWithAttendance.find(s => s.student.id === editingStudentId);
          const student = studentWithAttendance?.student;

          if (!student) return null;

          return (
            <div className="flex flex-col items-center space-y-1">
              <div className="font-medium">
                {student.full_name}
              </div>
              {student.guardian && (
                <div className="text-xs text-blue-600">
                  <span className="font-medium">ولي الأمر:</span> {student.guardian.full_name}
                </div>
              )}
            </div>
          );
        })()}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
        saveButtonText="حفظ التغييرات"
        cancelButtonText="إلغاء"
        mode="edit"
        maxWidth="450px"
      >
        <div className="space-y-4">
          {/* حالة الحضور */}
          <FormRow label="حالة الحضور">
            <Select
              value={editForm.status}
              onValueChange={(value: AttendanceStatus) => setEditForm({ ...editForm, status: value })}
            >
              <SelectTrigger
                id="attendance-status"
                className={`text-sm rounded-md ${getAttendanceStatusColor(editForm.status)}`}
              >
                <SelectValue>
                  {getAttendanceStatusName(editForm.status)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {attendanceStatusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          {/* دقائق التأخير إذا كان متأخر */}
          {editForm.status === 'late' && (
            <FormRow label="دقائق التأخير">
              <LateMinutesDialogEditor
                value={editForm.late_minutes || 0}
                onChange={(v) => setEditForm(f => ({ ...f, late_minutes: v }))}
              />
            </FormRow>
          )}

          {/* الملاحظات */}
          <FormRow label="ملاحظات">
            <Textarea
              id="attendance-note"
              value={editForm.note || ''}
              onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
              placeholder="أدخل أي ملاحظات حول حضور الطالب"
              rows={3}
              className="bg-gray-50 border-gray-300 rounded-md text-sm py-1 px-2"
            />
          </FormRow>
        </div>
      </FormDialog>
    </div>
  );
}

// ====== مكون محرر دقائق التأخير (مضمن في الجدول) ======
interface LateMinutesInlineEditorProps { value: number; onChange: (val:number)=>void; pillClass?: string; }
const LateMinutesInlineEditor: React.FC<LateMinutesInlineEditorProps> = ({ value, onChange, pillClass }) => {
  const [open,setOpen]=useState(false);
  const presets=[5,10,15,20,25,30,45,60];
  return (
    <div className="relative inline-block">
      <button type="button" onClick={()=>setOpen(o=>!o)} className={`h-6 min-w-[50px] px-2 rounded-full border flex items-center justify-center gap-1 text-[10px] font-medium shadow-sm ${pillClass}`} title="تحرير دقائق التأخير">
        <Clock className="h-3 w-3" />{value}د
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-600 rounded-lg p-2 shadow-xl">
          <div className="flex flex-wrap gap-1 mb-2">
            {presets.map(p=>{
              const active=p===value; return (
                <button key={p} type="button" onClick={()=>{onChange(p); setOpen(false);}} className={`h-7 px-2 rounded-md text-[10px] border ${active?'bg-amber-600 border-amber-700 text-white':'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'}`}>{p}</button>
              );})}
            <button type="button" onClick={()=>{onChange(0); setOpen(false);}} className={`h-7 px-2 rounded-md text-[10px] border ${value===0?'bg-gray-600 border-gray-700 text-white':'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'}`}>0</button>
          </div>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={60} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-full accent-amber-500" />
            <span className="w-9 text-center text-[10px] font-semibold text-amber-700">{value}</span>
          </div>
          <div className="flex justify-end mt-2">
            <button type="button" onClick={()=>setOpen(false)} className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300">اغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ====== مكون محرر دقائق التأخير في الحوار ======
interface LateMinutesDialogEditorProps { value:number; onChange:(val:number)=>void; }
const LateMinutesDialogEditor: React.FC<LateMinutesDialogEditorProps> = ({ value, onChange }) => {
  const presets=[5,10,15,20,25,30,45,60];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {presets.map(p=>{ const active=p===value; return (
          <button key={p} type="button" onClick={()=>onChange(p)} className={`h-8 px-3 rounded-md text-[11px] border ${active?'bg-amber-600 border-amber-700 text-white shadow':'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}>{p}</button>
        );})}
        <button type="button" onClick={()=>onChange(0)} className={`h-8 px-3 rounded-md text-[11px] border ${value===0?'bg-gray-600 border-gray-700 text-white shadow':'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}>0</button>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={0} max={60} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="flex-1 accent-amber-500" />
        <div className="w-12 text-center text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md py-1">{value}</div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-500"><Clock className="h-3 w-3 text-amber-500" />اسحب الشريط أو اختر قيمة جاهزة. الحد الأعلى 60.</div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-gray-400">زيادة سريعة:</span>
        {[1,2,3,4].map(step => (
          <button key={step} type="button" onClick={()=>onChange(Math.min(60, value + step))} className="h-6 px-2 rounded-md text-[10px] bg-white border border-gray-300 text-gray-600 hover:bg-gray-100">+{step}</button>
        ))}
        <button type="button" onClick={()=>onChange(value>0?value-1:0)} className="h-6 px-2 rounded-md text-[10px] bg-white border border-gray-300 text-gray-600 hover:bg-gray-100">-1</button>
        <button type="button" onClick={()=>onChange(value>5?value-5:0)} className="h-6 px-2 rounded-md text-[10px] bg-white border border-gray-300 text-gray-600 hover:bg-gray-100">-5</button>
      </div>
    </div>
  );
};

export default AttendanceRecord;

