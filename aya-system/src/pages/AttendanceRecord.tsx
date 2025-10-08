import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

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
      <div className="flex flex-wrap justify-center gap-2 text-sm mb-3">
        <span className="h-6 px-2 rounded-md bg-red-100 hover:bg-red-200 text-red-800 text-[10px] border border-red-300">
          حاضر: {summary.present}
        </span>
        <span className="h-6 px-2 rounded-md bg-red-100 hover:bg-red-200 text-red-800 text-[10px] border border-red-300">
          غائب: {summary.absent}
        </span>
        <span className="h-6 px-2 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] border border-amber-300">
          متأخر: {summary.late}
        </span>
        <span className="h-6 px-2 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] border border-blue-300">
          معذور: {summary.excused}
        </span>
        <span className="h-6 px-2 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] border border-blue-300">
          المجموع: {summary.total}
        </span>
      </div>
    );
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
          className={`space-y-0 sm:space-y-0.5 px-1 sm:px-4 pt-3 pb-4 transition-all duration-300 ease-in-out origin-top ${mainCardCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[3000px] opacity-100'}`}
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
              {/* تمت إزالة شارة (تغييرات غير محفوظة) والاكتفاء بتلوين الشريط */}
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
          {/* اختيار الجلسة مدمج الآن في شريط الفلترة عبر TeacherCircleFilterBar */}
          {/* تم استبدال قائمة الحلقات القديمة بشريط الفلترة أعلاه */}

        </CardContent>
      </Card>

      <div className="grid md:grid-cols-1 gap-2 p-2">
        <div className="md:col-span-1">
          {/* تمت إزالة الفراغ السفلي الزائد */}
          {selectedCircle && selectedSession && (
            <Card className="hidden md:block border border-green-300 rounded-xl shadow-md overflow-hidden">
              {/* الهيدر */}
              <CardHeader className="bg-gradient-to-r from-green-700 to-green-600 text-white px-3 py-2 border-b border-green-400">
                <div className="flex items-center justify-between w-full">
                  {/* العنوان + التاريخ */}
                  <div className="flex flex-col">
                    <CardTitle className="text-[13px] font-bold flex items-center gap-1">
                      <CalendarCheck className="h-3.5 w-3.5 text-yellow-300" />
                      <span className="line-clamp-1">{getCircleName(selectedCircle)}</span>
                    </CardTitle>
                    <CardDescription className="text-[10px] text-green-50 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-green-200" />
                      {formatDateDisplay(selectedSession.session_date)}
                      {selectedSession.start_time && selectedSession.end_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-green-200" />
                          {formatTimeDisplay(selectedSession.start_time)} - {formatTimeDisplay(selectedSession.end_time)}
                        </span>
                      )}
                    </CardDescription>
                  </div>

                  {/* أزرار سريعة نُقلت إلى الشريط العلوي */}
                </div>

                {/* ملخص الحضور (سطر صغير تحت لو ضروري) */}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {renderAttendanceSummary()}
                </div>
              </CardHeader>

              {/* المحتوى */}
              <CardContent className="p-3">
                {loadingStudents ? (
                  <div className="text-center py-6">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-green-600" />
                    <p className="text-gray-500 text-xs">جارٍ تحميل بيانات الطلاب...</p>
                  </div>
                ) : studentsWithAttendance.length === 0 ? (
                  <div className="text-center py-6 bg-green-50 rounded-lg">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                    <p className="text-sm font-medium text-green-800">لا يوجد طلاب</p>
                    <p className="text-[11px] text-gray-600">
                      يرجى إضافة طلاب لهذه الحلقة.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="w-full flex justify-center pt-2 pb-3">
                      <div className="flex items-center gap-2">

                        {/* زر السابق */}
                        {studentsWithAttendance.length > studentsGroupSize && (
                          <button
                            onClick={goPrevStudentCarousel}
                            disabled={studentCarouselIndex === 0}
                            className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            aria-label="السابق"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}

                        {/* شبكة الطلاب */}
                        <div className="grid grid-cols-4 gap-3 w-full max-w-2xl mx-auto">
                          {visibleStudentsGroup.map((item, idx) => {
                            const absoluteIndex = studentCarouselIndex * studentsGroupSize + idx;
                            return (
                              <div
                                key={item.student.id}
                                className="group relative border rounded-lg cursor-pointer overflow-hidden transition-all duration-300 bg-white flex flex-col shadow-sm hover:shadow-md hover:scale-[1.005] border-emerald-200 hover:border-emerald-400"
                              >
                                <div className="h-0.5 w-full bg-gradient-to-r from-emerald-200 to-emerald-300 group-hover:from-emerald-300 group-hover:to-emerald-400 transition-all" />
                                <div className="p-2 flex flex-col gap-1.5 text-[10px] grow">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                        {absoluteIndex + 1}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-medium truncate text-emerald-800 leading-tight">{item.student.full_name}</p>
                                        <p className="text-[10px] text-gray-500 truncate leading-tight">{item.student.guardian?.full_name}</p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditAttendance(item.student.id)}
                                      className="h-7 w-7 p-0 flex-shrink-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                                    {/* حالة الحضور */}
                                    <Select
                                      value={attendanceFormData[item.student.id]?.status || 'present'}
                                      onValueChange={(value) => handleStatusChange(item.student.id, value as AttendanceStatus)}
                                    >
                                      <SelectTrigger
                                        id={`attendance-status-${item.student.id}`}
                                        dir="rtl"
                                        className={`h-7 text-right truncate max-w-full min-w-0 text-[10px] leading-none rounded-md border px-2 pr-2 transition-all
                                              focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white dark:bg-gray-800
                                              ${(() => {
                                            const st = attendanceFormData[item.student.id]?.status || 'present';
                                            if (st === 'present') return 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold';
                                            if (st === 'absent') return 'border-red-300 bg-red-50 text-red-700 font-semibold';
                                            if (st === 'late') return 'border-amber-300 bg-amber-50 text-amber-700 font-semibold';
                                            if (st === 'excused') return 'border-blue-300 bg-blue-50 text-blue-700 font-semibold';
                                            return 'border-gray-300 text-gray-600';
                                          })()}`}
                                      >
                                        <SelectValue placeholder="اختر الحالة">
                                          {getAttendanceStatusName(attendanceFormData[item.student.id]?.status || 'present')}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent
                                        position="popper"
                                        dir="rtl"
                                        className="text-right text-[10px] sm:text-[11px] rounded-md border border-emerald-200 dark:border-emerald-700 shadow-md bg-white dark:bg-gray-900"
                                      >
                                        {attendanceStatusOptions.map((option) => (
                                          <SelectItem
                                            key={option.value}
                                            value={option.value}
                                            className={`cursor-pointer data-[highlighted]:bg-emerald-900/80 data-[state=checked]:font-semibold rounded-sm text-[11px]
                                                  ${option.value === 'present' ? 'text-emerald-700' :
                                                option.value === 'absent' ? 'text-red-700' :
                                                  option.value === 'late' ? 'text-amber-700' :
                                                    option.value === 'excused' ? 'text-blue-700' : 'text-gray-700'}`}
                                          >
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    {attendanceFormData[item.student.id]?.status === 'late' && (
                                      <Input
                                        title="أدخل دقائق التأخير"
                                        type="number"
                                        min={0}
                                        value={attendanceFormData[item.student.id]?.late_minutes || 0}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 0;
                                          setAttendanceFormData((prev) => ({
                                            ...prev,
                                            [item.student.id]: {
                                              ...prev[item.student.id],
                                              late_minutes: value < 0 ? 0 : value,
                                            },
                                          }));
                                          setHasChanges(true);
                                        }}
                                        className="h-7 text-center text-[10px] bg-amber-50 border-amber-300 px-1"
                                        placeholder="دقائق التأخير"
                                      />
                                    )}
                                  </div>

                                  {attendanceFormData[item.student.id]?.note && (
                                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-600">
                                      <FileText className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{attendanceFormData[item.student.id]?.note}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* زر التالي */}
                        {studentsWithAttendance.length > studentsGroupSize && (
                          <button
                            onClick={goNextStudentCarousel}
                            disabled={studentCarouselIndex >= totalStudentCarouselGroups - 1}
                            className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            aria-label="التالي"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                        )}

                      </div>
                    </div>

                    {/* مؤشرات + عداد */}
                    <div className="flex flex-col items-center mt-2 gap-3">
                      {studentsWithAttendance.length > studentsGroupSize && (
                        <div className="flex items-center gap-2 bg-white/60 backdrop-blur px-2 py-1.5 rounded-xl border border-emerald-200 shadow-sm">
                          {Array.from({ length: totalStudentCarouselGroups }).map((_, i) => (
                            <button
                              key={i}
                              id={`student-indicator-${i}`}
                              onClick={() => setStudentCarouselIndex(i)}
                              className="w-2.5 h-2.5 rounded-full bg-emerald-300 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                              aria-label={`مجموعة الطلاب ${i + 1}`}
                            />
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] flex items-center gap-2 text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
                        <span>مجموعة {studentCarouselIndex + 1} / {totalStudentCarouselGroups}</span>
                        <span className="w-px h-3 bg-emerald-300" />
                        <span>
                          الطلاب: {visibleStudentsGroup.length === 0 ? 0 : (studentCarouselIndex * studentsGroupSize + 1)} - {Math.min((studentCarouselIndex * studentsGroupSize) + visibleStudentsGroup.length, studentsWithAttendance.length)} من {studentsWithAttendance.length}
                        </span>
                      </div>
                    </div>
                  </div>

                )}
              </CardContent>

              {/* الفوتر أزيل زر الحفظ منه بعد نقله للأعلى */}
            </Card>
          )}
        </div>
      </div>

      <div className="mb-4"></div>
      {selectedCircle && selectedSession && (
        <Card className="md:hidden border border-green-300 rounded-xl shadow-md overflow-hidden">
          {/* الهيدر */}
          <CardHeader className="bg-gradient-to-r from-green-700 to-green-600 text-white p-2.5 border-b border-green-400">
            <div className="flex flex-col gap-1.5">
              {/* Header with title and controls in flex layout */}
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1">
                  <CalendarCheck className="h-3.5 w-3.5 text-yellow-300" />
                  <span className="line-clamp-1">{getCircleName(selectedCircle)}</span>
                </CardTitle>
              </div>

              {/* Session date and time info */}
              <div className="flex items-center justify-between">
                <CardDescription className="text-[10px] text-green-50 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-green-200" />
                  {formatDateDisplay(selectedSession.session_date)}
                  {selectedSession.start_time && selectedSession.end_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-green-200" />
                      {formatTimeDisplay(selectedSession.start_time)} - {formatTimeDisplay(selectedSession.end_time)}
                    </span>
                  )}
                </CardDescription>
              </div>

              {/* Compact attendance summary */}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {renderAttendanceSummary()}
              </div>
            </div>
          </CardHeader>

          {/* أزرار الكل حاضر/غائب أزيلت من هنا وتم نقلها للأعلى */}
          {/* المحتوى */}
          <CardContent className="p-3">
            {loadingStudents ? (
              <div className="text-center py-6">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-green-600" />
                <p className="text-gray-500 text-xs">جارٍ تحميل بيانات الطلاب...</p>
              </div>
            ) : studentsWithAttendance.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-lg">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <p className="text-sm font-medium text-green-800">لا يوجد طلاب</p>
                <p className="text-[11px] text-gray-600">
                  يرجى إضافة طلاب لهذه الحلقة.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {studentsWithAttendance.map((item) => (
                  <div
                    key={item.student.id}
                    className="border rounded-lg p-2 bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">
                            {item.student.full_name}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {item.student.guardian?.full_name}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAttendance(item.student.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* الحضور */}
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={
                          attendanceFormData[item.student.id]?.status || "present"
                        }
                        onValueChange={(value) =>
                          handleStatusChange(item.student.id, value as AttendanceStatus)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs px-2">
                          <SelectValue placeholder="اختر الحالة">
                            {getAttendanceStatusName(
                              attendanceFormData[item.student.id]?.status || "present"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {attendanceStatusOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-xs"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {attendanceFormData[item.student.id]?.status === "late" && (
                        <Input
                          title="أدخل دقائق التأخير"
                          type="number"
                          min={0}
                          value={
                            attendanceFormData[item.student.id]?.late_minutes || 0
                          }
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setAttendanceFormData((prev) => ({
                              ...prev,
                              [item.student.id]: {
                                ...prev[item.student.id],
                                late_minutes: value < 0 ? 0 : value,
                              },
                            }));
                            setHasChanges(true);
                          }}
                          className="h-8 text-center text-xs bg-amber-50 border-amber-300"
                          placeholder="دقائق التأخير"
                        />
                      )}
                    </div>

                    {attendanceFormData[item.student.id]?.note && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-600">
                        <FileText className="h-3 w-3" />
                        <span className="truncate">
                          {attendanceFormData[item.student.id]?.note}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {/* الفوتر أزيل زر الحفظ منه بعد نقله للأعلى */}
        </Card>
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
              <Input
                id="late-minutes"
                type="number"
                min={0}
                value={editForm.late_minutes || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setEditForm({ ...editForm, late_minutes: value < 0 ? 0 : value });
                }}
                className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2"
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
      <DeleteConfirmationDialog
        isOpen={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        title="تأكيد حفظ الحضور"
        description={(() => {
          if (!selectedSession) return null;
          const sessionDate = new Date(selectedSession.session_date);
          const today = new Date(); today.setHours(0,0,0,0); sessionDate.setHours(0,0,0,0);
          const isFuture = sessionDate.getTime() > today.getTime();
          return (
            <div className="space-y-2 text-right">
              <p>{isFuture ? 'تنبيه: هذه جلسة بتاريخ مستقبلي وسيتم تسجيل الحضور مسبقاً.' : 'سيتم حفظ حالات الحضور الحالية.'}</p>
              <p className="font-medium text-emerald-700">هل أنت متأكد من المتابعة؟</p>
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-2 text-[13px]">
                <div className="flex items-center gap-2 font-semibold text-blue-800">
                  <CalendarCheck className="h-4 w-4" />
                  <span>تفاصيل الجلسة</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[12px] text-blue-700">
                  <span className="font-medium">التاريخ:</span>
                  <span>{formatDateDisplay(selectedSession.session_date)}</span>
                  <span className="font-medium">الوقت:</span>
                  <span>{selectedSession.start_time && selectedSession.end_time ? `${formatTimeDisplay(selectedSession.start_time)} - ${formatTimeDisplay(selectedSession.end_time)}` : '-'}</span>
                </div>
              </div>
            </div>
          );
        })()}
        deleteButtonText={pendingSave ? 'جارٍ الحفظ...' : 'نعم، حفظ'}
        cancelButtonText="إلغاء"
        onConfirm={confirmAttendanceSave}
        isLoading={pendingSave}
      />
    </div>
  );
}

