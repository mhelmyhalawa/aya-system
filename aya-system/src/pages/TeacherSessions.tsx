import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Calendar,
  UserCheck,
  Clock,
  Edit,
  Trash2,
  CalendarRange,
  AlarmClock,
  CalendarClock,
  FileText,
  Search,
  Plus,
  Check
} from "lucide-react";
import { getStudyCirclesByTeacherId, getAllStudyCircles } from "@/lib/study-circle-service";
import { getSessionsByCircleId, createSession, updateSession, deleteSession } from "@/lib/circle-session-service";
import { getteachers } from "@/lib/profile-service";
import { StudyCircle } from "@/types/study-circle";
import { CircleSession, formatTimeDisplay, formatDateDisplay, formatShortDate } from "@/types/circle-session";
import { Profile } from "@/types/profile";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { GenericTable } from "@/components/ui/generic-table";

interface TeacherSessionsProps {
  onNavigate: (path: string) => void;
  currentUser: Profile | null;
}

export function TeacherSessions({ onNavigate, currentUser }: TeacherSessionsProps) {
  const { toast } = useToast();
  const [teacherCircles, setTeacherCircles] = useState<StudyCircle[]>([]);
  const [allCircles, setAllCircles] = useState<StudyCircle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string>("");
  const [circleSessions, setCircleSessions] = useState<CircleSession[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<CircleSession | null>(null);
  const [formData, setFormData] = useState<{
    study_circle_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    notes: string;
    teacher_id: string; // معرف المعلم البديل
  }>({
    study_circle_id: "",
    session_date: new Date().toISOString().split('T')[0], // التاريخ الحالي بتنسيق YYYY-MM-DD
    start_time: "",
    end_time: "",
    notes: "",
    teacher_id: "",
  });

  // للتحقق ما إذا كان المستخدم مدير أو مشرف
  const isAdminOrSuperadmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // جلب حلقات المعلم عند تحميل الصفحة
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

      // عرض معلومات المستخدم للتشخيص
      console.log("TeacherSessions - Current User:", currentUser);
      console.log("TeacherSessions - User Role:", currentUser.role);
      console.log("TeacherSessions - isAdminOrSuperadmin:", isAdminOrSuperadmin);

      // التأكد من أن المستخدم لديه الصلاحيات المطلوبة
      if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin' && currentUser.role !== 'teacher') {
        console.error("Invalid role for this page:", currentUser.role);
        toast({
          title: "تنبيه",
          description: `ليس لديك صلاحية للوصول إلى هذه الصفحة. الدور الحالي: ${currentUser.role}`,
          variant: "destructive",
        });
        setTimeout(() => onNavigate('/'), 2000);
        return;
      }

      setLoading(true);
      try {
        // جلب المعلمين المتاحين للاختيار كبديل (للمشرفين والمديرين فقط)
        if (isAdminOrSuperadmin) {
          const teachersList = await getteachers();
          setTeachers(teachersList);

          // جلب جميع الحلقات للمشرفين والمديرين
          const circles = await getAllStudyCircles();
          setAllCircles(circles);

          // اختيار أول حلقة افتراضياً إذا وجدت
          if (circles.length > 0) {
            setSelectedCircle(circles[0].id);
          }
        } else if (currentUser.role === 'teacher') {
          // جلب حلقات المعلم فقط
          console.log("Fetching circles for teacher:", currentUser.id);
          const circles = await getStudyCirclesByTeacherId(currentUser.id);
          setTeacherCircles(circles);

          // اختيار أول حلقة افتراضياً إذا وجدت
          if (circles.length > 0) {
            setSelectedCircle(circles[0].id);
          }
        } else {
          console.error("Invalid role for this page:", currentUser.role);
          toast({
            title: "تنبيه",
            description: `ليس لديك صلاحية للوصول إلى هذه الصفحة. الدور الحالي: ${currentUser.role}`,
            variant: "destructive",
          });
          setTimeout(() => onNavigate('/'), 2000);
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
        
        // فلترة الجلسات لعرض الجلسات المستقبلية فقط من تاريخ اليوم
        const today = new Date();
        today.setHours(0, 0, 0, 0); // تعيين الوقت إلى بداية اليوم
        
        const futureSessions = sessions.filter(session => {
          const sessionDate = new Date(session.session_date);
          sessionDate.setHours(0, 0, 0, 0); // تعيين الوقت إلى بداية اليوم للمقارنة بشكل صحيح
          return sessionDate >= today; // تضمين الجلسات من اليوم فصاعداً
        });
        
        setCircleSessions(futureSessions);
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

  // تصفية الحلقات بناءً على مصطلح البحث
  const filteredCircles = () => {
    const circles = isAdminOrSuperadmin ? allCircles : teacherCircles;
    if (!searchTerm.trim()) return circles;

    return circles.filter(circle =>
      circle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (circle.teacher?.full_name && circle.teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // تغيير الحلقة المختارة
  const handleCircleChange = (circleId: string) => {
    setSelectedCircle(circleId);
  };

  // إعداد النموذج لإضافة جلسة جديدة
  const handleAddSession = () => {
    setFormData({
      study_circle_id: selectedCircle,
      session_date: new Date().toISOString().split('T')[0],
      start_time: "",
      end_time: "",
      notes: "",
      teacher_id: currentUser?.id || "",
    });
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  // إعداد النموذج لتعديل جلسة موجودة
  const handleEditSession = (session: CircleSession) => {
    setFormData({
      study_circle_id: session.study_circle_id,
      session_date: session.session_date,
      start_time: session.start_time || "",
      end_time: session.end_time || "",
      notes: session.notes || "",
      teacher_id: session.teacher_id || currentUser?.id || "",
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // تغيير قيم النموذج
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // حفظ الجلسة (إضافة أو تعديل)
  const handleSaveSession = async () => {
    // التحقق من البيانات المطلوبة
    if (!formData.study_circle_id || !formData.session_date) {
      toast({
        title: "خطأ",
        description: "يجب تحديد الحلقة وتاريخ الجلسة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let result;

      if (isEditMode) {
        // تحديث جلسة موجودة
        result = await updateSession({
          study_circle_id: formData.study_circle_id,
          session_date: formData.session_date,
          start_time: formData.start_time || undefined,
          end_time: formData.end_time || undefined,
          notes: formData.notes || undefined,
          teacher_id: formData.teacher_id || undefined,
        });
      } else {
        // إنشاء جلسة جديدة
        result = await createSession({
          study_circle_id: formData.study_circle_id,
          session_date: formData.session_date,
          start_time: formData.start_time || undefined,
          end_time: formData.end_time || undefined,
          notes: formData.notes || undefined,
          teacher_id: formData.teacher_id || currentUser?.id,
        });
      }

      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: isEditMode ? "تم تحديث الجلسة بنجاح" : "تم إضافة الجلسة بنجاح",
        });
        setIsDialogOpen(false);

        // إعادة تحميل الجلسات
        const sessions = await getSessionsByCircleId(selectedCircle);
        setCircleSessions(sessions);
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء حفظ الجلسة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حفظ الجلسة:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء حفظ الجلسة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // حذف جلسة - الخطوة الأولى: فتح مربع حوار التأكيد
  const handleDeleteSession = (session: CircleSession) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  // حذف جلسة - الخطوة الثانية: تنفيذ الحذف بعد التأكيد
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    setLoading(true);
    try {
      const result = await deleteSession(sessionToDelete.study_circle_id, sessionToDelete.session_date);

      if (result.success) {
        toast({
          title: "تم بنجاح",
          description: "تم حذف الجلسة بنجاح",
        });

        // إعادة تحميل الجلسات
        const sessions = await getSessionsByCircleId(selectedCircle);
        setCircleSessions(sessions);
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ أثناء حذف الجلسة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حذف الجلسة:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء حذف الجلسة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  // العثور على اسم الحلقة من معرفها
  const getCircleName = (circleId: string): string => {
    const circlesList = isAdminOrSuperadmin ? allCircles : teacherCircles;
    const circle = circlesList.find((c) => c.id === circleId);
    return circle ? circle.name : "حلقة غير معروفة";
  };

  // العثور على معلم الحلقة
  const getCircleTeacher = (circleId: string): string => {
    const circlesList = isAdminOrSuperadmin ? allCircles : teacherCircles;
    const circle = circlesList.find((c) => c.id === circleId);
    return " " + circle?.teacher?.full_name || "لا يوجد معلم محدد";
  };

  // العثور على اسم المعلم من معرفه
  const getTeacherName = (teacherId?: string): string => {
    if (!teacherId) return "";
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? teacher.full_name : "";
  };

  return (
    <>

      <div className="bg-gradient-to-br min-h-screen p-4 sm:p-6 md:p-8" dir="rtl">
        <div className="container mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-green-200">
          {/* الهيدر */}
          <div className="bg-green-700 py-4 px-4 text-white rounded-t-2xl shadow-md relative overflow-hidden mt-6">
            {/* زخرفة إسلامية خفيفة في الخلفية */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/patterns/arabic-pattern.svg')] bg-repeat"></div>

            <h3 className="relative text-xl md:text-2xl font-bold flex items-center gap-2">
              <span className="text-2xl">🕌</span>
              {isAdminOrSuperadmin
                ? "تسجيل الجلسات المستقبلية وإدارة الحلقات"
                : "تسجيل الجلسات المستقبلية"}
            </h3>

            <p className="relative text-green-100 mt-1 text-xs md:text-sm">
              نظام إدارة جلسات الحلقات القرآنية المستقبلية من تاريخ اليوم
            </p>
          </div>
          <div className="p-4 md:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <div className="lg:col-span-1">
                {/* Panel واحد */}
                <div className="bg-green-50 border border-green-300 rounded-2xl shadow-lg overflow-hidden">

                  {/* Header */}
                  <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 p-4">
                    <h2 className="text-xl font-semibold text-white mb-0 flex items-center gap-2">
                      📖 قائمة الحلقات
                    </h2>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-4">

                    {/* مربع البحث */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="ابحث عن حلقة أو معلم..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 pl-4 py-2 border-2 border-green-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      {searchTerm && (
                        <div className="mt-2 text-sm text-green-700 flex items-center justify-between">
                          <span>نتائج البحث: {filteredCircles().length} حلقة</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-0 h-6 border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => setSearchTerm("")}
                          >
                            مسح البحث
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* قائمة الحلقات */}
                    <ul className="divide-y divide-green-200 border border-green-300 rounded-xl overflow-hidden shadow-inner max-h-96 overflow-y-auto">
                      {filteredCircles().length > 0 ? (
                        filteredCircles().map((circle) => (
                          <li
                            key={circle.id}
                            className={`cursor-pointer transition-all duration-200 rounded-2xl flex flex-col gap-1 p-2 shadow-sm ${selectedCircle === circle.id
                              ? 'bg-green-700 text-white ring-1 ring-green-400 scale-105'
                              : 'bg-green-50 hover:bg-green-100 text-green-800'
                              }`}
                            onClick={() => handleCircleChange(circle.id)}
                          >
                            <div className="flex items-center justify-between text-sm font-medium gap-2">
                              {/* اسم الحلقة والمعلم */}
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-green-500 text-lg">📖</span>
                                <span className="truncate font-medium">{circle.name}</span>
                                {circle.teacher && (
                                  <span
                                    className={`flex items-center gap-1 text-xs truncate ${selectedCircle === circle.id ? 'text-white' : 'text-green-700'
                                      }`}
                                  >
                                    👨‍🏫 {circle.teacher.full_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="p-4 text-center text-gray-500 bg-gray-50">
                          <div className="flex flex-col items-center justify-center gap-2 py-8">
                            <svg
                              className="w-12 h-12 text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            <p className="text-sm">
                              {searchTerm
                                ? `لم يتم العثور على حلقات تطابق "${searchTerm}"`
                                : "لا توجد حلقات متاحة"}
                            </p>
                          </div>
                        </li>
                      )}
                    </ul>

                  </div>
                </div>
              </div>


              <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-xl shadow-sm overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-green-100 via-green-200 to-green-700 p-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-white" />
                      {selectedCircle
                        ? `الجلسات المستقبلية لحلقة : ${getCircleName(selectedCircle)}`
                        : "الجلسات المستقبلية للحلقة : "}  | 👨‍🏫
                      <span className="text-xs sm:text-[10px] text-gray-700">{getCircleTeacher(selectedCircle)}</span>
                    </CardTitle>


                    {/* زر تسجيل جلسة جديدة */}
                    <div className="flex justify-start sm:justify-center">
                      {selectedCircle && (
                        <Button
                          onClick={handleAddSession}
                          size="sm"
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-2xl px-3 py-1 shadow-sm text-xs sm:text-sm transition-transform hover:scale-105"
                        >
                          <Calendar className="h-4 w-4" />
                          تسجيل جلسة جديدة
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {/* عداد الجلسات */}

                <div className="p-4">

                  {/* الصندوق لعدد الجلسات */}
                  <div className="bg-green-100 rounded-lg border border-green-200 p-4 mx-2 mb-2">
                    <Badge variant="outline" className="text-green-800 border-green-400">
                      {circleSessions.length > 0
                        ? `عدد الجلسات المستقبلية: ${circleSessions.length}`
                        : "لا توجد جلسات مستقبلية"}
                    </Badge>
                  </div>

                  {/* جدول الجلسات */}
                  {loading ? (
                    <div className="text-center py-4 text-green-600">جاري التحميل...</div>
                  ) : circleSessions.length > 0 ? (
                    <div className="overflow-x-auto p-2">

                      <GenericTable
                        data={circleSessions.map((session, index) => ({
                          ...session,
                          id: `${session.study_circle_id}-${session.session_date}-${index}`
                        }))}
                        columns={[
                          {
                            key: 'session_date',
                            header: '📅 التاريخ',
                            align: 'right',
                            render: (session) => (
                              <div className="flex flex-col text-right">
                                <span className="text-green-800 font-medium">{formatShortDate(session.session_date)}</span>
                                <span className="text-xs text-green-600">{formatDateDisplay(session.session_date)}</span>
                              </div>
                            ),
                          },
                          {
                            key: 'time',
                            header: '⏰ الوقت',
                            align: 'right',
                            render: (session) => (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-lg">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{formatTimeDisplay(session.start_time)}</span>
                                </div>
                                <span className="text-gray-400 font-bold mx-1">—</span>
                                <div className="flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-lg">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{formatTimeDisplay(session.end_time)}</span>
                                </div>
                              </div>
                            ),
                          },
                          {
                            key: 'notes',
                            header: '📝 ملاحظات',
                            align: 'right',
                            render: (session) => (
                              <span className="text-green-800 max-w-[200px] block">{session.notes || '—'}</span>
                            ),
                          },
                          {
                            key: 'actions',
                            header: '⚙️ إجراءات',
                            align: 'center',
                            render: (session) => (
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSession({ 
                                    study_circle_id: session.study_circle_id,
                                    session_date: session.session_date,
                                    start_time: session.start_time,
                                    end_time: session.end_time,
                                    notes: session.notes,
                                    teacher_id: session.teacher_id
                                  })}
                                  className="bg-green-200 hover:bg-green-300 text-green-900 rounded-md p-2 transition-colors"
                                  title="تعديل الجلسة"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSession({
                                    study_circle_id: session.study_circle_id,
                                    session_date: session.session_date,
                                    start_time: session.start_time,
                                    end_time: session.end_time,
                                    notes: session.notes,
                                    teacher_id: session.teacher_id
                                  })}
                                  className="bg-red-100 hover:bg-red-200 text-red-700 rounded-md p-2 transition-colors"
                                  title="حذف الجلسة"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ),
                          },
                        ]}
                        emptyMessage="لا توجد جلسات مستقبلية"
                        className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
                        getRowClassName={(_, index) =>
                          `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`
                        }
                      />
                    </div>
                  ) : selectedCircle ? (
                    <div className="text-center py-6 text-green-600">
                      لا توجد جلسات مستقبلية مسجلة لهذه الحلقة.
                      <br />
                      انقر على زر "تسجيل جلسة جديدة" في الأعلى لإضافة جلسة.
                    </div>
                  ) : (
                    <div className="text-center py-6 text-green-600">
                      اختر حلقة لعرض الجلسات المستقبلية الخاصة بها.
                    </div>
                  )}
                </div>

              </div>


            </div>
          </div>
        </div>
      </div>


      <FormDialog
        title={isEditMode ? "تعديل جلسة" : "تسجيل جلسة جديدة"}
        description={isEditMode ? "قم بتعديل بيانات الجلسة أدناه" : "قم بإدخال بيانات الجلسة الجديدة"}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveSession}
        saveButtonText="حفظ"
        cancelButtonText="إلغاء"
        mode={isEditMode ? "edit" : "add"}
        isLoading={loading}
        maxWidth="550px"
      >
        {/* التاريخ */}
        <FormRow label="تاريخ الجلسة *">
          <Input
            id="session_date"
            name="session_date"
            type="date"
            value={formData.session_date}
            onChange={handleFormChange}
            className="text-right bg-green-50 border-green-300 text-green-900 rounded-md py-2 px-3 shadow-inner focus:ring-2 focus:ring-green-400"
            required
          />
        </FormRow>

        {/* وقت البدء والانتهاء */}
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="وقت البدء *">
            <Input
              id="start_time"
              name="start_time"
              type="time"
              value={formData.start_time}
              onChange={handleFormChange}
              className="text-right bg-green-50 border-green-300 text-green-900 rounded-md py-2 px-3 shadow-inner focus:ring-2 focus:ring-green-400"
            />
          </FormRow>
          <FormRow label="وقت الانتهاء *">
            <Input
              id="end_time"
              name="end_time"
              type="time"
              value={formData.end_time}
              onChange={handleFormChange}
              className="text-right bg-green-50 border-green-300 text-green-900 rounded-md py-2 px-3 shadow-inner focus:ring-2 focus:ring-green-400"
            />
          </FormRow>
        </div>

        {/* اختيار المعلم */}
        {isAdminOrSuperadmin && (
          <FormRow label="المعلم">
            <Select
              value={formData.teacher_id}
              onValueChange={(value) =>
                setFormData({ ...formData, teacher_id: value })
              }
            >
              <SelectTrigger className="w-full bg-green-50 border-green-300 text-green-900 rounded-md shadow-inner">
                <SelectValue placeholder="اختر المعلم" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        )}

        {/* الملاحظات */}
        <FormRow label="ملاحظات">
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            className="text-right bg-green-50 border-green-300 text-green-900 rounded-md py-2 px-3 shadow-inner focus:ring-2 focus:ring-green-400"
            rows={3}
          />
        </FormRow>
      </FormDialog>

      {/* مربع حوار تأكيد الحذف */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteSession}
        isLoading={loading}
        title="تأكيد حذف الجلسة"
        description="هل أنت متأكد من رغبتك في حذف هذه الجلسة؟"
        itemDetails={sessionToDelete ? {
          "التاريخ": formatDateDisplay(sessionToDelete.session_date),
          "الوقت": sessionToDelete.start_time ?
            `${formatTimeDisplay(sessionToDelete.start_time)} - ${formatTimeDisplay(sessionToDelete.end_time || "")}` :
            "-",
          "الملاحظات": sessionToDelete.notes || "-"
        } : null}
        deleteButtonText="نعم، قم بالحذف"
        cancelButtonText="إلغاء"
      />

    </>
  );
}