import { useState, useEffect } from "react";
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
  Calendar,
  CheckCircle2,
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
  // مؤشر الجلسة في الموبايل (عرض بطاقة واحدة فقط + أزرار التالي والسابق)
  const [mobileSessionIndex, setMobileSessionIndex] = useState(0);

  // بيانات الطلاب والحضور
  const [studentsWithAttendance, setStudentsWithAttendance] = useState<StudentWithAttendance[]>([]);
  const [attendanceFormData, setAttendanceFormData] = useState<Record<string, StudentAttendanceFormData>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // عدد الطلاب في كل حلقة
  const [studentsCount, setStudentsCount] = useState<Record<string, number>>({});

  // حالة التحميل والحفظ
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  // تأكيد تسجيل حضور في تاريخ مستقبلي
  const [showFutureConfirm, setShowFutureConfirm] = useState(false);
  const [pendingFutureSave, setPendingFutureSave] = useState(false);

  // حالة تصفح الحلقات للجوال
  const [mobileCirclesPage, setMobileCirclesPage] = useState(0);
  const mobileCirclesPerPage = 2;

  // حالة تصفح الجلسات
  const [sessionsPage, setSessionsPage] = useState(0);
  const sessionsPerPage = 8;

  // حالة التحرير ونوافذ الحوار
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editForm, setEditForm] = useState<{
    status: AttendanceStatus;
    late_minutes?: number;
    note?: string;
  }>({
    status: 'present',
    late_minutes: 0,
    note: '',
  });
  const labels = getLabels('ar');
  const scsLabels = labels.studyCircleSchedulesLabels;
  // للتحقق ما إذا كان المستخدم مدير أو مشرف
  const isAdminOrSuperadmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // تحميل الحلقات عند تحميل الصفحة
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        toast({
          title: "تنبيه",
          description: "يرجى تسجيل الدخول أولاً",
          variant: "destructive",
        });
        onNavigate('/login');
        return;
      }

      setLoading(true);
      try {
        if (isAdminOrSuperadmin) {
          // جلب جميع الحلقات للمشرفين والمديرين
          const circles = await getAllStudyCircles();
          setAllCircles(circles);

          // جلب عدد الطلاب في كل حلقة
          if (circles.length > 0) {
            const circleIds = circles.map(circle => circle.id);
            const counts = await getStudentsCountInCircles(circleIds);
            setStudentsCount(counts);
            setSelectedCircle(circles[0].id);
          }
        } else if (currentUser.role === 'teacher') {
          // جلب حلقات المعلم فقط
          const circles = await getStudyCirclesByTeacherId(currentUser.id);
          setTeacherCircles(circles);

          // جلب عدد الطلاب في كل حلقة
          if (circles.length > 0) {
            const circleIds = circles.map(circle => circle.id);
            const counts = await getStudentsCountInCircles(circleIds);
            setStudentsCount(counts);
            setSelectedCircle(circles[0].id);
          }
        } else {
          toast({
            title: "تنبيه",
            description: "ليس لديك صلاحية للوصول إلى هذه الصفحة",
            variant: "destructive",
          });
          onNavigate('/');
        }
      } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء جلب البيانات",
          variant: "destructive",
        });
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
        setSelectedSession(null); // إعادة تعيين الجلسة المختارة
        setSessionsPage(0); // إعادة تعيين صفحة الجلسات عند تحميل جلسات جديدة
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
    setSessionsPage(0); // إعادة تعيين صفحة الجلسات عند تغيير الحلقة
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

  // غلاف يتحقق من تاريخ الجلسة قبل الاستدعاء الحقيقي
  const attemptSaveAttendance = () => {
    if (!selectedSession) return;
    const sessionDate = new Date(selectedSession.session_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    sessionDate.setHours(0,0,0,0);
    if (sessionDate.getTime() > today.getTime()) {
      // جلسة مستقبلية
      setShowFutureConfirm(true);
      return;
    }
    // جلسة اليوم أو أقدم (حسب الفلترة المتبقية هي اليوم/المستقبل) فنحفظ مباشرة
    handleSaveAllAttendance();
  };

  const confirmFutureAttendanceSave = async () => {
    setPendingFutureSave(true);
    try {
      await handleSaveAllAttendance();
    } finally {
      setPendingFutureSave(false);
      setShowFutureConfirm(false);
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

  // Filter circles based on search term
  const filteredCircles = allCircles.filter(
    circle =>
      circle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (circle.teacher?.full_name && circle.teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // تصفح الجلسات
  const totalSessionPages = Math.max(1, Math.ceil(circleSessions.length / sessionsPerPage));
  const pagedSessions = circleSessions.slice(
    sessionsPage * sessionsPerPage,
    (sessionsPage + 1) * sessionsPerPage
  );

  // ================== جلسات (سلايدر 3 بطاقات) ==================
  const sessionsGroupSize = 4; // تحديث: عرض 4 بطاقات في كل مجموعة
  const [sessionCarouselIndex, setSessionCarouselIndex] = useState(0); // المجموعة الحالية
  const totalSessionCarouselGroups = Math.ceil(pagedSessions.length / sessionsGroupSize) || 1;
  const visibleSessionGroup = pagedSessions.slice(
    sessionCarouselIndex * sessionsGroupSize,
    sessionCarouselIndex * sessionsGroupSize + sessionsGroupSize
  );

  const goPrevSessionCarousel = () => {
    setSessionCarouselIndex((idx) => Math.max(0, idx - 1));
  };
  const goNextSessionCarousel = () => {
    setSessionCarouselIndex((idx) => Math.min(totalSessionCarouselGroups - 1, idx + 1));
  };

  // إعادة الضبط عند تغيير الصفحة العامة للجلسات
  useEffect(() => {
    setSessionCarouselIndex(0);
  }, [sessionsPage]);

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

  const prevSessionPage = () => {
    if (sessionsPage > 0) {
      setSessionsPage(sessionsPage - 1);
    }
  };

  const nextSessionPage = () => {
    if (sessionsPage < totalSessionPages - 1) {
      setSessionsPage(sessionsPage + 1);
    }
  };

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

  // تأثير لتحديث مؤشرات السلايدر للجلسات
  useEffect(() => {
    for (let i = 0; i < totalSessionCarouselGroups; i++) {
      const indicator = document.getElementById(`session-indicator-${i}`);
      if (indicator) {
        indicator.className = `w-2 h-2 rounded-full transition-all ${i === sessionCarouselIndex ? 'bg-blue-600 scale-125' : 'bg-blue-300 hover:bg-blue-400'}`;
      }
    }
  }, [sessionCarouselIndex, totalSessionCarouselGroups]);

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
    };

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

  // تصفح الحلقات للجوال
  const totalMobileCirclePages = Math.ceil(filteredCircles.length / mobileCirclesPerPage);
  const pagedMobileCircles = filteredCircles.slice(
    mobileCirclesPage * mobileCirclesPerPage,
    (mobileCirclesPage + 1) * mobileCirclesPerPage
  );
  const canPrevMobileCircles = mobileCirclesPage > 0;
  const canNextMobileCircles = mobileCirclesPage < totalMobileCirclePages - 1;

  const goPrevMobileCircles = () => {
    if (canPrevMobileCircles) {
      setMobileCirclesPage(mobileCirclesPage - 1);
    }
  };

  const goNextMobileCircles = () => {
    if (canNextMobileCircles) {
      setMobileCirclesPage(mobileCirclesPage + 1);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 
                               border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-0 sm:space-y-0.5 px-1 sm:px-4 pt-3 pb-4">
          {/* قائمة الجوال */}
          <div className="md:hidden">
            <div className="bg-white/70 backdrop-blur border border-green-200 rounded-lg shadow-sm overflow-hidden mb-3">
              {/* الهيدر */}
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-2 py-2 bg-gradient-to-r from-green-600 via-green-500 to-green-600">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5 text-white" />
                  <h2 className="text-[12px] font-semibold text-white">{scsLabels.circlesListTitle || 'اختر الحلقة'}</h2>
                </div>
                {selectedCircle && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-white/80">{scsLabels.teacherShort || 'معلم'}</span>
                    <Badge className="bg-white/20 text-white font-normal px-2 py-0 h-4 rounded-full text-[10px]">
                      {filteredCircles.find(c => c.id === selectedCircle)?.teacher?.full_name?.split(" ")[0] || scsLabels.teacherUnknown || 'غير معروف'}
                    </Badge>
                  </div>
                )}
              </div>

              {/* البحث */}
              {isAdminOrSuperadmin && (
                <div className="px-2 pt-2">
                  <div className="relative">
                    <Search className="absolute right-2 top-2 h-3.5 w-3.5 text-green-400" />
                    <Input
                      placeholder={scsLabels.searchPlaceholder || "البحث..."}
                      className="pr-7 h-8 text-[11px] rounded-lg border-green-300 focus:ring-green-300"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* العناصر */}
              <div className="px-2 pt-2 pb-1 overflow-y-auto max-h-44 custom-scrollbar">
                {loading ? (
                  <div className="w-full py-6 text-center flex flex-col items-center">
                    <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full mb-2"></div>
                    <span className="text-green-700 text-[12px] font-medium">{scsLabels.loading || "جاري التحميل..."}</span>
                  </div>
                ) : filteredCircles.length === 0 ? (
                  <div className="w-full py-6 text-center text-green-600 text-[12px]">{scsLabels.noResults || "لا توجد نتائج"}</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {pagedMobileCircles.map(circle => {
                      const active = selectedCircle === circle.id;
                      return (
                        <button
                          key={circle.id}
                          onClick={() => handleCircleChange(circle.id)}
                          className={`group flex items-center justify-between w-full px-2 py-1.5 rounded-md border text-[11px] transition-all duration-200
                      ${active
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-300 text-white shadow-md'
                              : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm'}
                    `}
                        >
                          <span className="font-medium truncate">{circle.name}</span>
                          <div className="flex items-center gap-1.5">
                            {circle.teacher && (
                              <span className={`text-[10px] ${active ? 'text-blue-100 font-medium' : 'text-green-500'}`}>
                                {circle.teacher.full_name.split(" ")[0]}
                              </span>
                            )}
                            {active && (
                              <span className="inline-flex items-center bg-white text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                                ✓
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {/* Pagination controls */}
                    {totalMobileCirclePages > 1 && (
                      <div className="mt-2 flex flex-col items-center gap-1 py-1">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={goPrevMobileCircles}
                            disabled={!canPrevMobileCircles}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border shadow-sm transition-all
                              ${canPrevMobileCircles ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50 active:scale-95' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                            aria-label={scsLabels.prevLabel || "السابق"}
                          >
                            ‹
                          </button>
                          <div className="flex items-center gap-1" aria-label={scsLabels.pagesIndicatorAria || "ترقيم الصفحات"}>
                            {Array.from({ length: totalMobileCirclePages }).map((_, i) => (
                              <span
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all ${i === mobileCirclesPage ? 'bg-blue-600 scale-125' : 'bg-gray-300'
                                  }`}
                                aria-label={`صفحة ${i + 1}`}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={goNextMobileCircles}
                            disabled={!canNextMobileCircles}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border shadow-sm transition-all
                              ${canNextMobileCircles ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50 active:scale-95' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                            aria-label={scsLabels.nextLabel || "التالي"}
                          >
                            ›
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* جانب الحلقات - ثلث الصفحة (ديسكتوب) */}
          <div className="grid md:grid-cols-4 gap-2 sm:gap-6">
            <div className="md:col-span-1 hidden md:block">
              <div className="bg-green-50 border border-green-300 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 p-3">
                  <h2 className="text-lg font-semibold text-white mb-0 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {scsLabels.circlesHeading}
                  </h2>
                </div>
                <div className="p-4 space-y-4 md:space-y-5">
                  {/* مربع البحث */}
                  <div className="relative">
                    {currentUser?.role !== 'teacher' && (
                      <div className="relative mt-1">
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-green-400" />
                        <Input
                          placeholder={scsLabels.searchPlaceholder}
                          className="pr-10 pl-3 py-2 border-2 border-green-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                      <span className="text-sm text-green-600">{scsLabels.loadingCircles}</span>
                    </div>
                  ) : filteredCircles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
                      <BookOpen className="h-12 w-12 text-green-200" />
                      <h3 className="text-lg font-semibold text-green-800">{scsLabels.noCircles}</h3>
                      <p className="text-sm text-green-600">
                        {scsLabels.noCirclesSearch}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-green-100">
                      {filteredCircles.map((circle) => (
                        <div
                          key={circle.id}
                          className={`cursor-pointer transition-all duration-200 rounded-2xl flex flex-col gap-1 p-2.5 shadow-sm text-sm ${selectedCircle === circle.id
                            ? 'bg-green-700 text-white ring-1 ring-green-400'
                            : 'bg-green-50 hover:bg-green-100 text-green-800'
                            }`}
                          onClick={() => handleCircleChange(circle.id)}
                        >
                          <div className="flex items-center justify-between font-medium gap-1">
                            {/* اسم الحلقة مع أيقونة كتاب صغيرة */}
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-green-500">📖</span>
                              <span className="truncate">{circle.name}</span>
                              {circle.teacher && (
                                <span className={`flex items-center gap-1 text-[11px] truncate ${selectedCircle === circle.id ? 'text-white' : 'text-green-700'
                                  }`}>
                                  👨‍🏫 {circle.teacher.full_name}
                                </span>
                              )}
                            </div>

                            {selectedCircle === circle.id && (
                              <Badge
                                variant="outline"
                                className={`${selectedCircle === circle.id ? 'text-white border-white' : 'text-green-800 border-green-400'
                                  } text-xs`}
                              >
                                {scsLabels.selectedBadge}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="bg-green-50 border border-green-200 rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-green-700 via-green-500 to-green-700 p-2 sm:p-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[12px] sm:text-sm font-bold text-white flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <CalendarCheck className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-50 flex-shrink-0" />
                        <span className="truncate">{selectedCircle ? `جلسات ${getCircleName(selectedCircle)}` : 'اختر الحلقة'}</span>
                        {selectedCircle && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-[10px] whitespace-nowrap flex-shrink-0">
                            {studentsCount[selectedCircle] || 0} طالب
                          </Badge>
                        )}
                      </div>

                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {!selectedCircle ? (
                    <div className="text-center text-xs text-gray-500 mt-4">يرجى اختيار حلقة أولاً</div>
                  ) : loading ? (
                    <div className="text-center text-xs text-gray-500 mt-4">جارٍ تحميل الجلسات...</div>
                  ) : circleSessions.length === 0 ? (
                    <div className="text-center text-xs text-gray-500 mt-4">
                      <div className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <AlertCircle className="h-6 w-6 text-yellow-500 mb-2" />
                        <p className="font-medium text-yellow-700 mb-1">لا توجد جلسات مستقبلية لهذه الحلقة</p>
                        <p className="text-gray-600">تظهر فقط جلسات اليوم والتواريخ المستقبلية</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {/* عرض الجلسات (موبايل) بنمط بطاقة واحدة + زر عرض المزيد */}
                      <div className="md:hidden mb-4" role="region" aria-label="جلسات الحلقة (موبايل)">
                        {circleSessions.length === 0 ? (
                          <div className="text-center text-[11px] text-gray-500 py-4">لا توجد جلسات حالياً</div>
                        ) : (
                          <div className="flex flex-col items-stretch gap-2">
                            {/* بطاقة الجلسة الحالية */}
                            {(() => {
                              const session = circleSessions[mobileSessionIndex];
                              if (!session) return null;
                              const sessionDate = new Date(session.session_date);
                              const today = new Date();
                              sessionDate.setHours(0,0,0,0);
                              today.setHours(0,0,0,0);
                              const isToday = sessionDate.getTime() === today.getTime();
                              return (
                                <div
                                  key={session.id}
                                  className={`relative border rounded-lg p-3 flex flex-col gap-2 text-[11px] transition-all shadow-sm bg-white ring-2 ring-blue-400 border-blue-300`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-semibold text-green-700">
                                      <CalendarCheck className="h-4 w-4 text-blue-600" />
                                      <span className="truncate text-blue-700">{formatDateDisplay(session.session_date)}</span>
                                    </div>
                                    {isToday && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-600 text-white shadow border border-green-400 animate-pulse">اليوم</span>
                                    )}
                                  </div>
                                  {session.start_time && session.end_time ? (
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-blue-700">
                                        <Clock className="h-3 w-3 text-blue-600" />
                                        {formatTimeDisplay(session.start_time)}
                                      </div>
                                      <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-purple-700">
                                        <Clock className="h-3 w-3 text-purple-600" />
                                        {formatTimeDisplay(session.end_time)}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] italic text-gray-500 border border-dashed border-gray-200 rounded-md px-2 py-1 text-center">بدون توقيت</div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* أزرار التنقل */}
                            {circleSessions.length > 1 && (
                              <div className="flex items-center justify-center gap-4 mt-1">
                                <Button
                                  size="sm"
                                  onClick={goPrevMobileSession}
                                  disabled={mobileSessionIndex === 0}
                                  className="h-8 w-8 p-0 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 disabled:opacity-40"
                                  aria-label="جلسة سابقة"
                                >
                                  <ChevronRight className="h-4 w-4 text-blue-600" />
                                </Button>
                                <div className="text-[10px] text-blue-700 font-medium bg-blue-50 px-3 py-1 rounded-full border border-blue-200 shadow-sm">
                                  {mobileSessionIndex + 1} / {circleSessions.length}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={goNextMobileSession}
                                  disabled={mobileSessionIndex >= circleSessions.length - 1}
                                  className="h-8 w-8 p-0 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 disabled:opacity-40"
                                  aria-label="جلسة تالية"
                                >
                                  <ChevronLeft className="h-4 w-4 text-blue-600" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* عرض الجلسات في شكل سلايدر (ديسكتوب) */}
                      <div className="hidden md:flex flex-col">
                        <div className="w-full relative flex items-center gap-2 mb-1 justify-center">

                          {/* زر السابق */}
                          {pagedSessions.length > sessionsGroupSize && (
                            <button
                              onClick={goPrevSessionCarousel}
                              disabled={sessionCarouselIndex === 0}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
                              aria-label="السابق"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          )}

                          {/* شبكة الجلسات */}
                          <div className="grid grid-cols-4 gap-1 w-full max-w-2xl">
                            {visibleSessionGroup.map((session) => {
                              const isSelected = selectedSession?.id === session.id;
                              const sessionDate = new Date(session.session_date);
                              const today = new Date();
                              sessionDate.setHours(0, 0, 0, 0);
                              today.setHours(0, 0, 0, 0);
                              const isToday = sessionDate.getTime() === today.getTime();

                              return (
                                <div
                                  key={`${session.study_circle_id}-${session.id}`}
                                  className={`group relative border rounded-lg cursor-pointer overflow-hidden transition-all duration-300 bg-white flex flex-col shadow-sm hover:shadow-md justify-start
                ${isSelected ? 'ring-2 ring-blue-300 scale-[1.01] border-blue-400' : 'border-green-200 hover:border-green-400'}`}
                                  onClick={() => handleSessionChange(session)}
                                  role="listitem"
                                >
                                  {/* شريط علوي */}
                                  <div className={`h-0.5 w-full ${isSelected ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-green-200 group-hover:bg-green-300'} transition-all`} />

                                  {/* محتوى الجلسة */}
                                  <div className="flex flex-col p-2 text-[10px] grow gap-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1 font-semibold text-green-700 leading-none">
                                        <CalendarCheck className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-600' : 'text-green-700'}`} />
                                        <span className={`text-[11px] ${isSelected ? 'text-blue-700' : ''}`}>
                                          {formatDateDisplay(session.session_date)}
                                        </span>
                                      </div>
                                      {isToday && (
                                        <span className="flex items-center gap-0.5 text-[9px] text-white bg-green-600 px-2 py-0.5 rounded-full border border-green-400 font-semibold shadow-sm animate-pulse">
                                          اليوم
                                        </span>
                                      )}
                                    </div>

                                    {/* التوقيت */}
                                    {session.start_time && session.end_time ? (
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-medium justify-center shadow-sm leading-none">
                                          <Clock className="h-3 w-3 text-blue-600" />
                                          {formatTimeDisplay(session.start_time)}
                                        </div>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-medium justify-center shadow-sm leading-none">
                                          <Clock className="h-3 w-3 text-purple-600" />
                                          {formatTimeDisplay(session.end_time)}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center py-1 text-gray-500 italic text-[9px] border border-dashed border-gray-200 rounded-md">
                                        بدون توقيت
                                      </div>
                                    )}

                                    {isSelected && (
                                      <div className="mt-auto">
                                        <div className="w-full h-0.5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* زر التالي */}
                          {pagedSessions.length > sessionsGroupSize && (
                            <button
                              onClick={goNextSessionCarousel}
                              disabled={sessionCarouselIndex >= totalSessionCarouselGroups - 1}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
                              aria-label="التالي"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>
                          )}
                        </div>

                        {/* المؤشرات + العدد */}
                        <div className="flex flex-col items-center mt-4 gap-3">
                          {pagedSessions.length > sessionsGroupSize && (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalSessionCarouselGroups }).map((_, i) => (
                                <button
                                  key={i}
                                  id={`session-indicator-${i}`}
                                  onClick={() => setSessionCarouselIndex(i)}
                                  className={`w-2.5 h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${i === sessionCarouselIndex ? 'bg-blue-600 scale-110' : 'bg-blue-300 hover:bg-blue-400'}`}
                                  aria-label={`مجموعة ${i + 1}`}
                                />
                              ))}
                            </div>
                          )}

                          <div className="text-[10px] flex items-center gap-2 text-blue-700 font-medium bg-blue-50 px-3 py-1 rounded-full border border-blue-200 shadow-sm">
                            <span>مجموعة {sessionCarouselIndex + 1} / {totalSessionCarouselGroups}</span>
                            <span className="w-px h-3 bg-blue-300" />
                            <span>
                              الجلسات: {visibleSessionGroup.length === 0 ? 0 : (sessionCarouselIndex * sessionsGroupSize + 1)} - {Math.min((sessionCarouselIndex * sessionsGroupSize) + visibleSessionGroup.length, pagedSessions.length)} من {pagedSessions.length}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                  )}

                  {/* تحكم الترقيم للجلسات */}
                  {selectedCircle && circleSessions.length > 0 && totalSessionPages > 1 && (
                    <div className="flex flex-col items-center gap-1 mt-4" aria-label="ترقيم الجلسات">
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={prevSessionPage}
                          disabled={sessionsPage === 0}
                          className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 disabled:opacity-40 disabled:hover:bg-blue-100 text-blue-700 transition"
                          aria-label="السابق"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2" aria-label="الصفحات">
                          {Array.from({ length: totalSessionPages }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => { setSessionsPage(i); setSessionCarouselIndex(0); }}
                              className={`w-2.5 h-2.5 rounded-full transition ${i === sessionsPage ? 'bg-blue-600 scale-110' : 'bg-blue-300 hover:bg-blue-400'}`}
                              aria-label={`صفحة ${i + 1}`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={nextSessionPage}
                          disabled={sessionsPage >= totalSessionPages - 1}
                          className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 disabled:opacity-40 disabled:hover:bg-blue-100 text-blue-700 transition"
                          aria-label="التالي"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">يمكنك التنقل داخل كل صفحة بين مجموعات الجلسات (٣ في كل مجموعة)</div>
                      <div className="text-[11px] text-gray-500">
                        <div className="flex flex-col items-center gap-1 w-full">
                          <div className="flex items-center gap-2 font-medium text-blue-700">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>إجمالي الجلسات</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                              {circleSessions.length}
                            </span>
                            <span className="text-gray-400 text-[10px]">
                              ({sessionsPage + 1} / {totalSessionPages})
                            </span>
                          </div>
                          <div className="w-40 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 transition-all duration-500"
                              style={{ width: `${((sessionsPage + 1) / totalSessionPages) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                </CardContent>
              </div>

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

                      {/* أزرار سريعة */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          onClick={() => setAllStudentsStatus("present")}
                          className="flex items-center h-6 px-2 rounded bg-green-100 hover:bg-green-200 text-green-800 text-[10px] border border-green-300"
                        >
                          <Check className="h-3 w-3 mr-0.5" />
                          حاضر
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setAllStudentsStatus("absent")}
                          className="flex items-center h-6 px-2 rounded bg-red-100 hover:bg-red-200 text-red-800 text-[10px] border border-red-300"
                        >
                          <X className="h-3 w-3 mr-0.5" />
                          غائب
                        </Button>
                      </div>
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

                  {/* الفوتر */}
                  <CardFooter className="bg-green-50 px-3 py-2 border-t border-green-200">
                    <div className="w-full space-y-1">
                      <Button
                        onClick={attemptSaveAttendance}
                        disabled={
                          !hasChanges ||
                          savingAttendance ||
                          studentsWithAttendance.length === 0
                        }
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg"
                      >
                        {savingAttendance ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            جارٍ الحفظ...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            حفظ الحضور
                          </>
                        )}
                      </Button>

                      {hasChanges && (
                        <p className="text-amber-600 text-[11px] flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3 w-3" />
                          تغييرات غير محفوظة
                        </p>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


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

          <div className="flex items-center justify-center gap-2 p-2 bg-green-50 border-b border-green-200">
            <Button
              size="sm"
              onClick={() => setAllStudentsStatus("present")}
              className="flex items-center h-7 px-2 rounded-md bg-green-100 hover:bg-green-200 text-green-800 text-[11px] border border-green-300"
            >
              <Check className="h-3 w-3 mr-1" />
              الكل حاضر
            </Button>
            <Button
              size="sm"
              onClick={() => setAllStudentsStatus("absent")}
              className="flex items-center h-7 px-2 rounded-md bg-red-100 hover:bg-red-200 text-red-800 text-[11px] border border-red-300"
            >
              <X className="h-3 w-3 mr-1" />
              الكل غائب
            </Button>
          </div>
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

          {/* الفوتر */}
          <CardFooter className="bg-green-50 px-3 py-2 border-t border-green-200">
            <div className="w-full space-y-1">
              <Button
                onClick={attemptSaveAttendance}
                disabled={
                  !hasChanges ||
                  savingAttendance ||
                  studentsWithAttendance.length === 0
                }
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg"
              >
                {savingAttendance ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ الحضور
                  </>
                )}
              </Button>

              {hasChanges && (
                <p className="text-amber-600 text-[11px] flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  تغييرات غير محفوظة
                </p>
              )}
            </div>
          </CardFooter>
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
            isOpen={showFutureConfirm}
            onOpenChange={setShowFutureConfirm}
            title="تأكيد تسجيل حضور مبكر"
            description={
              <div className="space-y-2 text-right">
                <p>أنت على وشك تسجيل حضور لجلسة بتاريخ مستقبلي.</p>
                <p className="font-medium text-red-700">هل أنت متأكد أنك تريد المتابعة؟</p>
                {selectedSession && (
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
                )}
              </div>
            }
            deleteButtonText={pendingFutureSave ? 'جارٍ الحفظ...' : 'نعم، متابعة الحفظ'}
            cancelButtonText="إلغاء"
            onConfirm={confirmFutureAttendanceSave}
            isLoading={pendingFutureSave}
          />
    </div>
  );
}
function loadCircleSchedules(id: string) {
  throw new Error("Function not implemented.");
}

