import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
import {
  Calendar,
  Clock,
  Check,
  X,
  AlertCircle,
  CalendarCheck,
  Users,
  UserRound,
  Save,
  RefreshCw,
  Edit,
  FileText,
  BookOpen,
  Bookmark,
  NotebookPenIcon,
  Search,
  Pencil
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
import { studentsLabels } from "@/lib/arabic-labels";

import { getStudyCirclesByTeacherId, getAllStudyCircles } from "@/lib/study-circle-service";
import { getSessionsByCircleId } from "@/lib/circle-session-service";
import {
  getStudentsWithAttendanceForSession,
  upsertAttendance,
  getCircleSessionId
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
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className={`${getAttendanceStatusColor('present')} border-green-200`}>
          حاضر: {summary.present}
        </Badge>
        <Badge variant="outline" className={`${getAttendanceStatusColor('absent')} border-red-200`}>
          غائب: {summary.absent}
        </Badge>
        <Badge variant="outline" className={`${getAttendanceStatusColor('late')} border-amber-200`}>
          متأخر: {summary.late}
        </Badge>
        <Badge variant="outline" className={`${getAttendanceStatusColor('excused')} border-blue-200`}>
          معذور: {summary.excused}
        </Badge>
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
          المجموع: {summary.total}
        </Badge>
      </div>
    );
  };

  return (

    <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-0 py-1 sm:py-2">

      <Card>
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-2">
                <NotebookPenIcon className="h-5 w-5 text-yellow-300" />
                سجل حضور الطلاب
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                يمكنك تسجيل حضور الطلاب للجلسات. اختر الحلقة والجلسة أولاً، ثم قم بتحديد حالة الحضور لكل طالب.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="bg-green-50 border border-green-300 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 p-4">
                  <h2 className="text-xl font-semibold text-white mb-0 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    الحلقات الدراسية
                  </h2>
                </div>
                <div className="p-4 space-y-4">

                  {/* مربع البحث */}
                  <div className="relative">
                    {currentUser?.role !== 'teacher' && (
                      <div className="relative mt-2">
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-green-400" />
                        <Input
                          placeholder="بحث عن حلقة..."
                          className="pr-10 pl-4 py-2 border-2 border-green-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    )}
                  </div>



                  {loading ? (
                    <div className="text-center py-10">
                      <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2 text-green-600" />
                      <p className="text-gray-500 text-sm font-medium">جارٍ تحميل الحلقات...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                      {(isAdminOrSuperadmin ? allCircles : teacherCircles).map((circle) => (
                        <div
                          key={circle.id}
                          className={`group relative rounded-xl border border-green-200 bg-white shadow-md transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl hover:scale-102 ${selectedCircle === circle.id ? "bg-green-50 border-green-500 shadow-lg ring-2 ring-green-300" : ""
                            }`}
                          onClick={() => handleCircleChange(circle.id)}
                        >
                          {/* تدرج خلفية عند hover */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-green-100 to-green-200 opacity-0 group-hover:opacity-25 transition-opacity duration-500 rounded-xl pointer-events-none"></div>

                          <div className="p-3 relative z-10">
                            {/* رأس البطاقة */}
                            <div className="border-b border-green-200 pb-1 mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-1 text-sm font-semibold text-green-700 group-hover:scale-105 transition-transform duration-300">
                                <Calendar className="h-3.5 w-3.5 text-yellow-400 group-hover:animate-bounce" />
                                {circle.name}
                              </div>
                            </div>

                            {/* محتوى البطاقة */}
                            <div className="space-y-1 text-gray-600 text-xs">
                              {/* المعلم */}
                              {isAdminOrSuperadmin && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <UserRound className="h-2.5 w-2.5 text-green-600 group-hover:scale-125 transition-transform" />
                                    <span>المعلم:</span>
                                  </div>
                                  <span className="truncate max-w-[100px]">{circle.teacher?.full_name || "غير محدد"}</span>
                                </div>
                              )}

                              {/* عدد الطلاب */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-2.5 w-2.5 text-green-600 group-hover:scale-125 transition-transform" />
                                  <span>عدد الطلاب:</span>
                                </div>
                                <Badge className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-md">
                                  {studentsCount[circle.id] || 0}
                                </Badge>
                              </div>

                              {/* الحد الأقصى للطلاب */}
                              {circle.max_students && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Users className="h-2.5 w-2.5 text-green-600 group-hover:scale-125 transition-transform" />
                                    <span>الحد الأقصى:</span>
                                  </div>
                                  <span className="font-medium">{circle.max_students} طالب</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}


                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="bg-green-50 border border-green-200 rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-green-700 via-green-500 to-green-700 p-4">
                  <div className="flex justify-between  items-center">
                    <CardTitle className="text-sm font-bold text-white flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-green-700" />
                        {selectedCircle ?
                          `جلسات اليوم والمستقبل لحلقة: ${getCircleName(selectedCircle)}` :
                          'اختر الحلقة لعرض الجلسات'
                        }
                      </div>
                      {selectedCircle && (
                        <CardDescription className="text-gray-700 text-xs sm:text-sm mt-1 sm:mt-0">
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 sm:text-sm ">
                            {studentsCount[selectedCircle] || 0} طالب
                          </Badge>
                        </CardDescription>
                      )}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-2">
                      {circleSessions.map((session) => {
                        const isSelected = selectedSession?.session_date === session.session_date;
                        return (
                          <div
                            key={`${session.study_circle_id}-${session.session_date}`}
                            className={`relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden p-3
                                    ${isSelected
                                ? "bg-green-50 border-green-500 shadow-lg ring-1 ring-green-300 animate-pulse"
                                : "bg-white border-gray-300 hover:bg-green-50 hover:shadow-md hover:scale-102"
                              }`}
                            onClick={() => handleSessionChange(session)}
                          >
                            {/* تدرج خلفية عند hover */}
                            {!isSelected && (
                              <div className="absolute inset-0 bg-gradient-to-tr from-green-50 to-green-100 opacity-0 hover:opacity-25 transition-opacity rounded-2xl pointer-events-none"></div>
                            )}

                            <div className="relative z-10 flex flex-col gap-1 text-gray-700 text-xs md:text-sm">
                              {/* التاريخ */}
                              <div className="flex items-center gap-2 font-medium group-hover:scale-105 transition-transform duration-200">
                                <CalendarCheck className={`h-4 w-4 text-green-700 ${isSelected ? "animate-bounce" : ""}`} />
                                {formatDateDisplay(session.session_date)}
                                
                                {/* إشارة إلى جلسة اليوم */}
                                {(() => {
                                  const sessionDate = new Date(session.session_date);
                                  const today = new Date();
                                  
                                  // تنسيق التواريخ للمقارنة
                                  sessionDate.setHours(0, 0, 0, 0);
                                  today.setHours(0, 0, 0, 0);
                                  
                                  if (sessionDate.getTime() === today.getTime()) {
                                    return (
                                      <Badge className="mr-1 bg-green-500 hover:bg-green-600 text-white text-xs px-1.5 py-0.5 rounded animate-pulse">
                                        اليوم
                                      </Badge>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>

                              {/* التوقيت مع ألوان مختلفة */}
                              <div className="text-xs flex gap-1">
                                {session.start_time && session.end_time ? (
                                  <>
                                    <span className="text-green-600 font-semibold">{formatTimeDisplay(session.start_time)}</span>
                                    <span className="text-gray-400">-</span>
                                    <span className="text-yellow-600 font-semibold">{formatTimeDisplay(session.end_time)}</span>
                                  </>
                                ) : (
                                  <span className="text-gray-500">بدون توقيت</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </div>
              <div className="mb-4"></div>

              {selectedCircle && selectedSession && (
                <Card className="border border-green-300 shadow-xl rounded-2xl overflow-hidden">
                  {/* الهيدر */}
                  <CardHeader className="pb-3 bg-gradient-to-b from-green-900 via-green-500 to-green-200 border-b border-green-200 rounded-t-2xl shadow-md">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex flex-col">
                        <CardTitle className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
                          <CalendarCheck className="h-5 w-5 text-yellow-500 animate-bounce" />
                          سجل الحضور - {getCircleName(selectedCircle)}
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm text-green-800 mt-1">
                          جلسة {formatDateDisplay(selectedSession.session_date)}
                          {selectedSession.start_time && selectedSession.end_time && (
                            <span className="ml-2 text-gray-700 flex items-center gap-2">
                              <Clock className="h-5 w-5 text-gray-500" />
                              <span className="text-green-700 font-semibold">{formatTimeDisplay(selectedSession.start_time)}</span>
                              {" → "}
                              <span className="text-yellow-600 font-semibold">{formatTimeDisplay(selectedSession.end_time)}</span>
                            </span>

                          )}
                        </CardDescription>
                      </div>

                      {/* أزرار التحكم */}
                      <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAllStudentsStatus('present')}
                          className="flex items-center gap-2 rounded-3xl border-2 border-green-500 text-green-800 
          hover:bg-green-100 hover:text-green-900 hover:scale-105 transition-all duration-200 px-4 py-2 font-semibold"
                        >
                          <Check className="h-4 w-4" />
                          تحديد الكل حاضر
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAllStudentsStatus('absent')}
                          className="flex items-center gap-2 rounded-3xl border-2 border-red-400 text-red-800 
          hover:bg-red-100 hover:text-red-900 hover:scale-105 transition-all duration-200 px-4 py-2 font-semibold"
                        >
                          <X className="h-4 w-4" />
                          تحديد الكل غائب
                        </Button>
                      </div>
                    </div>

                    {/* ملخص الحضور */}
                    {renderAttendanceSummary()}
                  </CardHeader>

                  <CardContent>
                    {loadingStudents ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-islamic-green" />
                        <p className="text-gray-500 text-sm">جارٍ تحميل بيانات الطلاب...</p>
                      </div>
                    ) : studentsWithAttendance.length === 0 ? (
                      <div className="text-center py-12 bg-green-50 rounded-lg">
                        <AlertCircle className="h-10 w-10 mx-auto mb-4 text-amber-500" />
                        <h3 className="text-lg font-medium mb-2 text-green-800">لا يوجد طلاب في هذه الحلقة</h3>
                        <p className="text-sm text-gray-600">
                          لا يوجد طلاب مسجلين في هذه الحلقة. يرجى إضافة طلاب للحلقة أولاً.
                        </p>
                      </div>
                    ) : (
                      <GenericTable<StudentWithAttendance & { id: string }>
                        data={studentsWithAttendance.map(item => ({ ...item, id: item.student.id }))}
                        columns={[
                          {
                            key: "student",
                            header: "👨‍🎓 بيانات الطالب",
                            align: "right",
                            render: (item: StudentWithAttendance) => (
                              <div className="flex items-center gap-3 py-2">
                                <UserRound className="h-6 w-6 text-gray-400" />
                                <div className="min-w-[200px]">
                                  <div className="font-medium text-base">{item.student.full_name}</div>
                                  {item.student.guardian && (
                                    <div className="text-sm text-blue-600">
                                      <span className="font-medium">ولي الأمر:</span>{" "}
                                      {item.student.guardian.full_name}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1">
                                    {getGradeLevelName(item.student.grade_level || item.student.grade)}
                                  </div>
                                </div>
                              </div>
                            ),
                          },
                          {
                            key: "status",
                            header: "📋 حالة الحضور",
                            align: "center",
                            render: (item: StudentWithAttendance) => (
                              <Select
                                value={attendanceFormData[item.student.id]?.status || "present"}
                                onValueChange={(value) =>
                                  handleStatusChange(item.student.id, value as AttendanceStatus)
                                }
                              >
                                <SelectTrigger
                                  className={`w-36 font-medium text-base px-4 py-2 ${attendanceFormData[item.student.id]?.status === "present"
                                    ? "bg-green-100 text-green-800 border-green-300"
                                    : attendanceFormData[item.student.id]?.status === "absent"
                                      ? "bg-red-100 text-red-800 border-red-300"
                                      : attendanceFormData[item.student.id]?.status === "late"
                                        ? "bg-amber-100 text-amber-800 border-amber-300"
                                        : attendanceFormData[item.student.id]?.status === "excused"
                                          ? "bg-blue-100 text-blue-800 border-blue-300"
                                          : "bg-gray-100 text-gray-800 border-gray-300"
                                    }`}
                                >
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
                                      className={
                                        option.value === "present"
                                          ? "text-green-700 font-medium"
                                          : option.value === "absent"
                                            ? "text-red-700 font-medium"
                                            : option.value === "late"
                                              ? "text-amber-700 font-medium"
                                              : option.value === "excused"
                                                ? "text-blue-700 font-medium"
                                                : ""
                                      }
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ),
                          },
                          {
                            key: "late_minutes",
                            header: "⏰ دقائق التأخير",
                            align: "center",
                            render: (item: StudentWithAttendance) =>
                              attendanceFormData[item.student.id]?.status === "late" ? (
                                <Input
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
                                  className="w-28 text-center text-base py-2 px-3 bg-amber-50 border-amber-300"
                                />
                              ) : (
                                <span className="text-gray-400 text-base">-</span>
                              ),
                          },
                          {
                            key: "note",
                            header: "📝 ملاحظات الحضور",
                            align: "right",
                            render: (item: StudentWithAttendance) =>
                              attendanceFormData[item.student.id]?.note ? (
                                <div className="flex items-center gap-2 py-2">
                                  <FileText className="h-5 w-5 text-gray-500" />
                                  <span className="truncate max-w-[250px] text-base">
                                    {attendanceFormData[item.student.id]?.note}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-base">-</span>
                              ),
                          },
                          {
                            key: "actions",
                            header: "📋 تعديل البيانات",
                            align: "center",
                            render: (item: StudentWithAttendance) => (
                              <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => handleEditAttendance(item.student.id)}
                                className="text-islamic-green hover:text-islamic-green/80 hover:bg-islamic-green/10 rounded-xl px-6 py-3 transition-colors"
                              >
                                <Edit className="h-5 w-5 mr-2" />
                                تعديل
                              </Button>
                            ),
                          },
                        ]}
                        emptyMessage="لا يوجد طلاب"
                        className="overflow-x-auto rounded-xl border-2 border-green-300 shadow-lg text-base"
                        getRowClassName={(_, idx) =>
                          `${idx % 2 === 0 ? "bg-green-50 hover:bg-green-100" : "bg-white hover:bg-green-50"} cursor-pointer transition-colors py-3`
                        }
                      />

                    )}
                  </CardContent>

                  <CardFooter className="flex justify-between items-center bg-gradient-to-r from-green-50 via-green-100 to-green-50 px-4 py-3 rounded-b-xl border-t border-green-200">
                    <Button
                      variant="default"
                      onClick={handleSaveAllAttendance}
                      disabled={!hasChanges || savingAttendance || studentsWithAttendance.length === 0}
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md transition-transform duration-200 hover:scale-105"
                    >
                      {savingAttendance ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin text-white" />
                          جارٍ الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2 text-white" />
                          حفظ سجل الحضور
                        </>
                      )}
                    </Button>

                    {hasChanges && (
                      <p className="text-amber-600 text-sm flex items-center gap-1 font-medium">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        هناك تغييرات غير محفوظة
                      </p>
                    )}
                  </CardFooter>

                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
