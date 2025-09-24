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
import { GenericTable } from "@/components/ui/generic-table";

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
  
  // تأثير لتحديث مؤشرات التمرير للطلاب
  useEffect(() => {
    const container = document.getElementById('studentsScrollContainer');
    if (!container) return;
    
    const updateIndicators = () => {
      const scrollPosition = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const totalSteps = Math.ceil(studentsWithAttendance.length / 3);
      
      // حساب الخطوة الحالية
      let currentStep = Math.floor((scrollPosition / maxScroll) * totalSteps);
      if (currentStep >= totalSteps) currentStep = totalSteps - 1;
      if (currentStep < 0) currentStep = 0;
      
      // تحديث المؤشرات
      for (let i = 0; i < totalSteps; i++) {
        const indicator = document.getElementById(`student-indicator-${i}`);
        if (indicator) {
          indicator.className = `w-2 h-2 rounded-full ${i === currentStep ? 'bg-blue-600 scale-125' : 'bg-blue-300'} transition-all`;
        }
      }
    };
    
    container.addEventListener('scroll', updateIndicators);
    updateIndicators(); // تنفيذ أول مرة
    
    return () => {
      container.removeEventListener('scroll', updateIndicators);
    };
  }, [studentsWithAttendance.length]);

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
  
  // تأثير لتحديث مؤشرات التمرير للجلسات
  useEffect(() => {
    const container = document.getElementById('sessionsScrollContainer');
    if (!container) return;
    
    const updateIndicators = () => {
      const scrollPosition = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const totalSteps = Math.ceil(pagedSessions.length / 3);
      
      // حساب الخطوة الحالية
      let currentStep = Math.floor((scrollPosition / maxScroll) * totalSteps);
      if (currentStep >= totalSteps) currentStep = totalSteps - 1;
      if (currentStep < 0) currentStep = 0;
      
      // تحديث المؤشرات
      for (let i = 0; i < totalSteps; i++) {
        const indicator = document.getElementById(`session-indicator-${i}`);
        if (indicator) {
          indicator.className = `w-2 h-2 rounded-full ${i === currentStep ? 'bg-blue-600 scale-125' : 'bg-blue-300'} transition-all`;
        }
      }
    };
    
    container.addEventListener('scroll', updateIndicators);
    updateIndicators(); // تنفيذ أول مرة
    
    return () => {
      container.removeEventListener('scroll', updateIndicators);
    };
  }, [pagedSessions.length]);

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
    <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-0 py-1 sm:py-2">
      <Card>
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <CardTitle className="text-sm sm:text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-1 sm:gap-2">
              <NotebookPenIcon className="h-4 w-4 sm:h-4 sm:w-4 md:h-6 md:w-6 text-yellow-300 animate-pulse" />
              <span className="line-clamp-1">سجل حضور الطلاب</span>
            </CardTitle>
          </div>
          <CardDescription className="hidden sm:block text-[11px] sm:text-sm text-green-100/90 mt-0.5">
            يمكنك تسجيل حضور الطلاب للجلسات. اختر الحلقة والجلسة أولاً، ثم قم بتحديد حالة الحضور لكل طالب.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-3 px-2 sm:px-4 pt-2 pb-10">
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
                      {/* عرض الجلسات في شكل أفقي للديسكتوب فقط */}
                      <div className="hidden md:block">
                        <div>
                          <div 
                            id="sessionsScrollContainer"
                            className="flex overflow-x-auto gap-3 pb-2 pt-1 px-1 hide-scrollbar snap-x snap-mandatory"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                          >
                            {pagedSessions.map((session) => {
                              const isSelected = selectedSession?.id === session.id;
                              const sessionDate = new Date(session.session_date);
                              const today = new Date();

                              // تنسيق التواريخ للمقارنة
                              sessionDate.setHours(0, 0, 0, 0);
                              today.setHours(0, 0, 0, 0);

                              const isToday = sessionDate.getTime() === today.getTime();

                              return (
                                <div
                                  key={`${session.study_circle_id}-${session.id}`}
                                  className={`flex-shrink-0 w-[160px] border rounded-md cursor-pointer overflow-hidden transition-all snap-center
                                    ${isSelected
                                      ? "ring-1 ring-blue-300 bg-blue-50/70 border-blue-400 shadow-md"
                                      : "bg-white border-green-200 hover:border-green-400 hover:shadow-sm"}`}
                                  onClick={() => handleSessionChange(session)}
                                  role="listitem"
                                >
                                  <div className="flex flex-col p-2 text-[11px]">
                                    {/* التاريخ + اليوم */}
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1 font-medium text-green-700">
                                        <CalendarCheck
                                          className={`h-3.5 w-3.5 ${isSelected ? "text-blue-600" : "text-green-700"}`}
                                        />
                                        <span className="text-[12px]">{formatDateDisplay(session.session_date)}</span>
                                      </div>

                                      {isToday && (
                                        <span className="flex items-center gap-0.5 text-[9px] text-white bg-green-500 px-1.5 py-0.5 rounded-full border border-green-400 animate-pulse">
                                          اليوم
                                        </span>
                                      )}
                                    </div>

                                    {/* التوقيت */}
                                    {session.start_time && session.end_time ? (
                                      <div className="flex flex-col gap-0.5 mb-1">
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium justify-center">
                                          <Clock className="h-3 w-3 text-blue-600" />
                                          {formatTimeDisplay(session.start_time)}
                                        </div>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium justify-center">
                                          <Clock className="h-3 w-3 text-purple-600" />
                                          {formatTimeDisplay(session.end_time)}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center py-0.5 text-gray-500 italic text-[10px]">
                                        بدون توقيت
                                      </div>
                                    )}

                                    {/* إشارة التحديد */}
                                    {isSelected && (
                                      <div className="w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 mt-1 rounded-full" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* مؤشر الموقع للجلسات */}
                        <div className="flex justify-center mt-3">
                          <div className="flex items-center gap-2">
                            {Array.from({ length: Math.ceil(pagedSessions.length / 3) }).map((_, i) => (
                              <span
                                key={i}
                                className="w-2 h-2 rounded-full bg-blue-300 transition-all"
                                id={`session-indicator-${i}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* عرض الجلسات رأسي للموبايل */}
                      <div className="md:hidden space-y-2">
                        
                        {/* عرض الجلسات عموديا */}
                        <div className="grid grid-cols-1 gap-2">
                          {pagedSessions.map((session) => {
                            const isSelected = selectedSession?.id === session.id;
                            const sessionDate = new Date(session.session_date);
                            const today = new Date();

                            // تنسيق التواريخ للمقارنة
                            sessionDate.setHours(0, 0, 0, 0);
                            today.setHours(0, 0, 0, 0);

                            const isToday = sessionDate.getTime() === today.getTime();

                            return (
                              <div
                                key={`${session.study_circle_id}-${session.id}`}
                                className={`border rounded-lg cursor-pointer overflow-hidden transition-all mb-3
                                  ${isSelected
                                    ? "ring-1 ring-blue-400 bg-blue-50/70 border-blue-400 shadow-md"
                                    : "bg-white border-green-200 hover:border-green-400 hover:shadow-sm"}`}
                                onClick={() => handleSessionChange(session)}
                                role="listitem"
                              >
                                <div className={`p-2.5 text-[11px] ${isSelected ? "border-r-3 border-r-blue-500" : ""}`}>
                                  <div className="flex justify-between items-center">
                                    {/* التاريخ + اليوم */}
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex items-center gap-1.5 font-medium">
                                        <CalendarCheck
                                          className={`h-4 w-4 ${isSelected ? "text-blue-600" : "text-green-700"}`}
                                        />
                                        <span className={`text-[13px] ${isSelected ? "text-blue-700" : "text-green-700"} font-semibold`}>
                                          {formatDateDisplay(session.session_date)}
                                        </span>
                                      </div>

                                      {isToday && (
                                        <span className="flex items-center gap-0.5 text-[10px] text-white bg-green-600 px-2 py-0.5 rounded-full border border-green-400 font-semibold shadow-sm animate-pulse">
                                          اليوم
                                        </span>
                                      )}
                                    </div>
                                    
                                    {isSelected && (
                                      <div title="توقيت محدد" className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shadow-sm border border-blue-200 flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600"  />
                                      </div>
                                    )}
                                  </div>

                                  {/* التوقيت */}
                                  {session.start_time && session.end_time ? (
                                    <div className="flex justify-end w-full">
                                      <div className="flex flex-col items-end gap-2.5 mt-2 bg-gray-50/70 py-2.5 px-3 rounded-md border border-gray-100 w-full">
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center bg-blue-50/80 py-1 px-2 rounded-md">
                                            <Clock className="h-4 w-4 text-blue-600 ml-1.5" />
                                            <span className="text-[12px] text-blue-700 font-semibold">البداية:</span>
                                          </div>
                                          <div className="flex items-center gap-1 px-3 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[12px] font-bold w-[85px] justify-center shadow-sm">
                                            <span>{formatTimeDisplay(session.start_time)}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center bg-purple-50/80 py-1 px-2 rounded-md">
                                            <Clock className="h-4 w-4 text-purple-600 ml-1.5" />
                                            <span className="text-[12px] text-purple-700 font-semibold">النهاية:</span>
                                          </div>
                                          <div className="flex items-center gap-1 px-3 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[12px] font-bold w-[85px] justify-center shadow-sm">
                                            <span>{formatTimeDisplay(session.end_time)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end w-full">
                                      <div className="flex flex-col items-center mt-2 bg-gray-50/70 py-2.5 px-3 rounded-md border border-gray-100 w-full">
                                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-gray-100 text-gray-600 border border-gray-200 text-[12px] font-semibold justify-center shadow-sm w-full">
                                          <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                          <span>بدون توقيت محدد</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
                              onClick={() => setSessionsPage(i)}
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

              <div className="mb-4"></div>
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
                      <div className="relative">
                        {/* أزرار التنقل */}
                        <button 
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/70 hover:bg-white shadow-md rounded-full p-1 border border-gray-200 text-blue-700 transition-all" 
                          onClick={(e) => {
                            e.preventDefault();
                            const container = document.getElementById('studentsScrollContainer');
                            if (container) {
                              container.scrollBy({ left: -220, behavior: 'smooth' });
                            }
                          }}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        
                        <button 
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/70 hover:bg-white shadow-md rounded-full p-1 border border-gray-200 text-blue-700 transition-all"
                          onClick={(e) => {
                            e.preventDefault();
                            const container = document.getElementById('studentsScrollContainer');
                            if (container) {
                              container.scrollBy({ left: 220, behavior: 'smooth' });
                            }
                          }}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        
                        {/* قائمة الطلاب */}
                        <div 
                          id="studentsScrollContainer"
                          className="flex overflow-x-auto gap-3 pb-4 pt-2 px-2 snap-x snap-mandatory hide-scrollbar"
                          style={{ scrollbarWidth: 'none' }}
                        >
                          {studentsWithAttendance.map((item, index) => (
                            <div
                              key={item.student.id}
                              className="border rounded-lg p-3 bg-white shadow-sm min-w-[220px] max-w-[280px] flex-shrink-0 snap-center"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {item.student.full_name}
                                    </p>
                                    <p className="text-[11px] text-gray-500 truncate">
                                      {item.student.guardian?.full_name}
                                    </p>
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
                                <FileText className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {attendanceFormData[item.student.id]?.note}
                                </span>
                              </div>
                            )}
                          </div>
                          ))}
                        </div>
                        
                        {/* مؤشر الموقع */}
                        <div className="flex justify-center mt-3">
                          <div className="flex items-center gap-2">
                            {Array.from({ length: Math.ceil(studentsWithAttendance.length / 3) }).map((_, i) => (
                              <span
                                key={i}
                                className="w-2 h-2 rounded-full bg-blue-300 transition-all"
                                id={`student-indicator-${i}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>

                  {/* الفوتر */}
                  <CardFooter className="bg-green-50 px-3 py-2 border-t border-green-200">
                    <div className="w-full space-y-1">
                      <Button
                        onClick={handleSaveAllAttendance}
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
                onClick={handleSaveAllAttendance}
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
    </div>






  );
}
function loadCircleSchedules(id: string) {
  throw new Error("Function not implemented.");
}

