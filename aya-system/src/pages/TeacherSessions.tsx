import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  BookOpen,
  Plus,
  FileText,
  Search,
  Check
} from "lucide-react";
import { getStudyCirclesByTeacherId, getAllStudyCircles } from "@/lib/study-circle-service";
import { getSessionsByCircleId, createSession, updateSession, deleteSession } from "@/lib/circle-session-service";
import { getteachers } from "@/lib/profile-service";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, parseISO, startOfToday, addDays } from "date-fns";
import { arSA } from "date-fns/locale";
import { GenericTable, Column } from "@/components/ui/generic-table";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { CircleSession } from "@/types/circle-session";
import { getLabels } from '@/lib/labels';
import PaginatedCardList from '@/components/ui/paginated-card-list';

type TeacherSessionsProps = {
  onNavigate: (page: string) => void;
  currentUser: any;
};

// تنسيق عرض التاريخ 
const formatDateDisplay = (dateString: string) => {
  const date = parseISO(dateString);
  return format(date, "EEEE d MMMM yyyy", { locale: arSA });
};

// تنسيق عرض التاريخ المختصر
const formatShortDate = (dateString: string) => {
  const date = parseISO(dateString);
  return format(date, "d MMM yyyy", { locale: arSA });
};

// تنسيق عرض الوقت مع ص/م
const formatTimeDisplay = (timeString: string | null | undefined) => {
  if (!timeString) return "-";

  // استخراج الساعة والدقيقة
  const [hours, minutes] = timeString.substring(0, 5).split(':').map(Number);

  // تحديد ص/م
  const period = hours >= 12 ? "م" : "ص";

  // تحويل إلى نظام 12 ساعة
  const hours12 = hours % 12 || 12;

  // إرجاع الصيغة النهائية
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function TeacherSessions({ onNavigate, currentUser }: TeacherSessionsProps) {
  // تعريف المتغيرات وحالة المكون
  const [loading, setLoading] = useState(false);
  const [circles, setCircles] = useState<any[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [circleSessions, setCircleSessions] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const { toast } = useToast();

  // بحث الحلقات
  const [searchTerm, setSearchTerm] = useState("");
  const labels = getLabels('ar');
  const tsLabels = labels.teacherSessionsLabels;
  const scsLabels = labels.studyCircleSchedulesLabels; // reuse pagination labels

  // دور المستخدم الحالي
  const userRole = currentUser?.role;

  // تصفية الحلقات حسب البحث
  const filteredCircles = circles.filter((circle) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const circleName = (circle?.name || "").toLowerCase();
    const teacherName = (circle?.teacher?.full_name || "").toLowerCase();
    return circleName.includes(term) || teacherName.includes(term);
  });

  // Pagination for mobile circles similar to StudyCircleSchedules
  const MOBILE_CIRCLES_PAGE_SIZE = 2; // match schedules page requirement
  const [mobileCirclesPage, setMobileCirclesPage] = useState(0);
  const totalMobileCirclePages = Math.ceil(filteredCircles.length / MOBILE_CIRCLES_PAGE_SIZE) || 1;
  const pagedMobileCircles = filteredCircles.slice(
    mobileCirclesPage * MOBILE_CIRCLES_PAGE_SIZE,
    mobileCirclesPage * MOBILE_CIRCLES_PAGE_SIZE + MOBILE_CIRCLES_PAGE_SIZE
  );
  useEffect(() => { setMobileCirclesPage(0); }, [searchTerm, circles.length]);
  useEffect(() => { setDesktopCirclesPage(0); }, [searchTerm, circles.length]);

  const handleMobileCirclesPageChange = (p: number) => {
    if (p >= 0 && p < totalMobileCirclePages) setMobileCirclesPage(p);
  };

  // Desktop pagination for circles list
  const DESKTOP_CIRCLES_PAGE_SIZE = 8; // reasonable number for desktop list
  const [desktopCirclesPage, setDesktopCirclesPage] = useState(0);
  const totalDesktopCirclePages = Math.ceil(filteredCircles.length / DESKTOP_CIRCLES_PAGE_SIZE) || 1;
  const handleDesktopCirclesPageChange = (p: number) => {
    if (p >= 0 && p < totalDesktopCirclePages) setDesktopCirclesPage(p);
  };

  // حالة نموذج إضافة/تعديل الجلسة
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    session_date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  // حالة نافذة التأكيد للحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<CircleSession | null>(null);

  // Temporary cast to allow controlled usage until DeleteConfirmationDialogProps includes open/onOpenChange
  const DeleteConfirmationDialogAny = DeleteConfirmationDialog as any;

  // جلب بيانات الحلقات عند تحميل المكون
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let circlesData;

        // اذا كان المستخدم معلم، يتم جلب الحلقات الخاصة به فقط
        if (currentUser && currentUser.role === "teacher") {
          circlesData = await getStudyCirclesByTeacherId(currentUser.id);
        } else {
          // وإلا يتم جلب جميع الحلقات (للمشرفين والمدراء)
          circlesData = await getAllStudyCircles();
        }

        setCircles(circlesData);

        // جلب قائمة المعلمين
        const teachersData = await getteachers();
        setTeachers(teachersData);

        // إذا كان المستخدم معلم، يتم اختيار أول حلقة تلقائيًا
        if (currentUser && currentUser.role === "teacher" && circlesData.length > 0) {
          setSelectedCircle(circlesData[0].id);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل بيانات الحلقات",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentUser, toast]);

  // جلب جلسات الحلقة عند اختيار حلقة
  useEffect(() => {
    async function loadCircleSessions() {
      if (!selectedCircle) {
        setCircleSessions([]);
        return;
      }

      setLoading(true);
      try {
        // جلب جميع الجلسات للحلقة المختارة
        const sessionsData = await getSessionsByCircleId(selectedCircle);

        // فلترة الجلسات لإظهار الجلسات المستقبلية فقط (من تاريخ اليوم)
        const today = startOfToday();
        const futureSessions = sessionsData.filter((session: any) => {
          const sessionDate = parseISO(session.session_date);
          return isAfter(sessionDate, today) || format(sessionDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        });

        // ترتيب الجلسات حسب التاريخ تصاعديًا
        const sortedSessions = futureSessions.sort((a: any, b: any) => {
          return parseISO(a.session_date).getTime() - parseISO(b.session_date).getTime();
        });

        setCircleSessions(sortedSessions);
      } catch (error) {
        console.error("Error loading circle sessions:", error);
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء تحميل جلسات الحلقة",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadCircleSessions();
  }, [selectedCircle, toast]);

  // تغيير الحلقة المختارة
  const handleCircleChange = (circleId: string) => {
    setSelectedCircle(circleId);
  };

  // التعامل مع إضافة جلسة جديدة
  const handleAddSession = () => {
    // تهيئة نموذج بتاريخ اليوم
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    setFormData({
      session_date: tomorrow,
      start_time: "08:00",
      end_time: "09:00",
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  // حفظ الجلسة الجديدة
  const handleSaveNewSession = async () => {
    if (!selectedCircle) return;

    try {
      // تأكد من صحة البيانات
      if (!formData.session_date || !formData.start_time || !formData.end_time) {
        toast({
          title: "بيانات غير مكتملة",
          description: "يرجى ملء جميع الحقول المطلوبة",
          variant: "destructive",
        });
        return;
      }

      // إنشاء كائن الجلسة الجديدة
      const newSession = {
        study_circle_id: selectedCircle,
        session_date: formData.session_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
        teacher_id: currentUser.role === "teacher" ? currentUser.id : null,
      };

      // حفظ الجلسة الجديدة
      await createSession(newSession);

      // تحديث قائمة الجلسات
      const sessionsData = await getSessionsByCircleId(selectedCircle);
      const today = startOfToday();
      const futureSessions = sessionsData.filter((session: any) => {
        const sessionDate = parseISO(session.session_date);
        return isAfter(sessionDate, today) || format(sessionDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      });

      // ترتيب الجلسات حسب التاريخ تصاعديًا
      const sortedSessions = futureSessions.sort((a: any, b: any) => {
        return parseISO(a.session_date).getTime() - parseISO(b.session_date).getTime();
      });

      setCircleSessions(sortedSessions);

      // إغلاق النافذة وعرض رسالة نجاح
      setIsAddDialogOpen(false);
      toast({
        title: "تمت العملية بنجاح",
        description: "تم إضافة الجلسة الجديدة بنجاح",
      });
    } catch (error) {
      console.error("Error adding session:", error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ الجلسة الجديدة",
        variant: "destructive",
      });
    }
  };

  // التعامل مع تعديل جلسة
  const handleEditSession = (session: CircleSession) => {
    setFormData({
      session_date: session.session_date,
      start_time: session.start_time || "",
      end_time: session.end_time || "",
      notes: session.notes || "",
    });
    setSessionToDelete(session); // استخدام نفس المتغير لتخزين الجلسة المراد تعديلها
    setIsEditDialogOpen(true);
  };

  // حفظ تعديلات الجلسة
  const handleSaveEditedSession = async () => {
    if (!selectedCircle || !sessionToDelete) return;

    try {
      // تأكد من صحة البيانات
      if (!formData.session_date || !formData.start_time || !formData.end_time) {
        toast({
          title: "بيانات غير مكتملة",
          description: "يرجى ملء جميع الحقول المطلوبة",
          variant: "destructive",
        });
        return;
      }

      // إنشاء كائن الجلسة المعدلة
      const updatedSession = {
        study_circle_id: selectedCircle,
        session_date: sessionToDelete.session_date, // استخدام التاريخ الأصلي كمعرف
        session_date_new: formData.session_date, // التاريخ الجديد
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
        teacher_id: sessionToDelete.teacher_id || currentUser.id,
      };

      // حفظ التعديلات
      await updateSession(updatedSession);

      // تحديث قائمة الجلسات
      const sessionsData = await getSessionsByCircleId(selectedCircle);
      const today = startOfToday();
      const futureSessions = sessionsData.filter((session: any) => {
        const sessionDate = parseISO(session.session_date);
        return isAfter(sessionDate, today) || format(sessionDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      });

      // ترتيب الجلسات حسب التاريخ تصاعديًا
      const sortedSessions = futureSessions.sort((a: any, b: any) => {
        return parseISO(a.session_date).getTime() - parseISO(b.session_date).getTime();
      });

      setCircleSessions(sortedSessions);

      // إغلاق النافذة وعرض رسالة نجاح
      setIsEditDialogOpen(false);
      setSessionToDelete(null);
      toast({
        title: "تمت العملية بنجاح",
        description: "تم تعديل الجلسة بنجاح",
      });
    } catch (error) {
      console.error("Error updating session:", error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ التعديلات",
        variant: "destructive",
      });
    }
  };

  // التعامل مع حذف جلسة
  const handleDeleteSession = (session: CircleSession) => {
    setSessionToDelete(session);
    setIsDeleteDialogOpen(true);
  };

  // تنفيذ حذف الجلسة
  const confirmDeleteSession = async () => {
    if (!selectedCircle || !sessionToDelete) return;

    try {
      // حذف الجلسة
      await deleteSession(selectedCircle, sessionToDelete.session_date);

      // تحديث قائمة الجلسات
      const sessionsData = await getSessionsByCircleId(selectedCircle);
      const today = startOfToday();
      const futureSessions = sessionsData.filter((session: any) => {
        const sessionDate = parseISO(session.session_date);
        return isAfter(sessionDate, today) || format(sessionDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      });

      // ترتيب الجلسات حسب التاريخ تصاعديًا
      const sortedSessions = futureSessions.sort((a: any, b: any) => {
        return parseISO(a.session_date).getTime() - parseISO(b.session_date).getTime();
      });

      setCircleSessions(sortedSessions);

      // إغلاق النافذة وعرض رسالة نجاح
      setIsDeleteDialogOpen(false);
      setSessionToDelete(null);
      toast({
        title: "تمت العملية بنجاح",
        description: "تم حذف الجلسة بنجاح",
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف الجلسة",
        variant: "destructive",
      });
    }
  };

  // الحصول على اسم الحلقة
  const getCircleName = (circleId: string) => {
    if (!circleId) return "";
    const circle = circles.find((c) => c.id === circleId);
    return circle ? circle.name : "";
  };

  // الحصول على اسم المعلم
  const getCircleTeacher = (circleId: string) => {
    if (!circleId) return "";
    const circle = circles.find((c) => c.id === circleId);
    if (!circle || !circle.teacher_id) return "";

    const teacherId = circle.teacher_id;
    if (!teacherId) return "";
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? teacher.full_name : "";
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-0 py-1 sm:py-2">
      <Card className="mb-3 sm:mb-4 shadow-sm border-green-200 rounded-lg sm:rounded-xl overflow-hidden">
        <CardHeader className="py-2.5 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-green-700 to-green-600 flex flex-row justify-between items-center gap-1.5 sm:gap-2">
          <div className="space-y-0.5 sm:space-y-1">
            <CardTitle className="text-base sm:text-lg text-white flex items-center gap-1 sm:gap-1.5">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-100" />
              <span className="truncate">جلسات المعلمين</span>
            </CardTitle>
            <CardDescription className="text-green-100 text-xs sm:text-sm mt-0.5 sm:mt-1">
              إدارة جلسات المعلمين والحلقات المستقبلية
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-6 px-2 sm:px-4 pt-3 pb-4">
          <div className="grid md:grid-cols-4 gap-2 sm:gap-6">
            {/* قائمة الجوال */}
            <div className="md:hidden">
              <div className="bg-white border border-green-200 rounded-xl shadow-md overflow-hidden">
                {/* قائمة الجوال */}
                <div className="md:hidden">
                  <div className="bg-white/70 backdrop-blur border border-green-200 rounded-lg shadow-sm overflow-hidden mb-3">
                    {/* الهيدر */}
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-2 py-2 bg-gradient-to-r from-green-600 via-green-500 to-green-600">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-white" />
                        <h2 className="text-[12px] font-semibold text-white">{tsLabels.circlesListTitle}</h2>
                      </div>
                      {selectedCircle && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-white/80">{tsLabels.teacherShort}</span>
                          <Badge className="bg-white/20 text-white font-normal px-2 py-0 h-4 rounded-full text-[10px]">
                            {getCircleTeacher(selectedCircle)?.split(" ")[0] || tsLabels.teacherUnknown}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* البحث */}
                    {userRole !== 'teacher' && (
                      <div className="px-2 pt-2">
                        <div className="relative">
                          <Search className="absolute right-2 top-2 h-3.5 w-3.5 text-green-400" />
                          <Input
                            placeholder={tsLabels.searchPlaceholder}
                            className="pr-7 h-8 text-[11px] rounded-lg border-green-300 focus:ring-green-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* العناصر */}
                    <div className="px-2 pt-2 pb-1 overflow-y-auto max-h-44 custom-scrollbar scroll-fade">
                      {loading ? (
                        <div className="w-full py-6 text-center flex flex-col items-center">
                          <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full mb-2"></div>
                          <span className="text-green-700 text-[12px] font-medium">{tsLabels.loading}</span>
                        </div>
                      ) : filteredCircles.length === 0 ? (
                        <div className="w-full py-6 text-center text-green-600 text-[12px]">{tsLabels.noResults}</div>
                      ) : (
                        <PaginatedCardList
                          items={filteredCircles}
                          pageSize={MOBILE_CIRCLES_PAGE_SIZE}
                          page={mobileCirclesPage}
                          onPageChange={handleMobileCirclesPageChange}
                          ariaLabels={{
                            prev: scsLabels.prevLabel,
                            next: scsLabels.nextLabel,
                            pagesIndicator: scsLabels.pagesIndicatorAria,
                            pagination: scsLabels.paginationAria,
                            page: scsLabels.pageAria
                          }}
                          className="flex flex-col gap-1"
                          navigationPosition="bottom"
                          renderItem={(circle) => {
                            const active = selectedCircle === circle.id;
                            return (
                              <button
                                key={circle.id}
                                onClick={() => handleCircleChange(circle.id)}
                                className={`group flex items-center justify-between w-full px-2 py-1.5 rounded-md border text-[11px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white ${active ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-300 text-white shadow-md' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm'}`}
                              >
                                <span className="font-medium truncate">{circle.name}</span>
                                <div className="flex items-center gap-1.5">
                                  {circle.teacher && (
                                    <span className={`text-[10px] ${active ? 'text-blue-100' : 'text-blue-500'}`}>{circle.teacher.full_name.split(' ')[0]}</span>
                                  )}
                                  {active && (
                                    <span className="inline-flex items-center bg-white/30 text-[9px] px-1 py-0.5 rounded-full font-medium">✓</span>
                                  )}
                                </div>
                              </button>
                            )
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* جانب الحلقات - ثلث الصفحة (ديسكتوب) */}
            <div className="md:col-span-1 hidden md:block">
              <div className="bg-green-50 border border-green-300 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 p-3">
                  <h2 className="text-lg font-semibold text-white mb-0 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {scsLabels.circlesHeading}
                  </h2>
                </div>
                {/* Body */}
                <div className="p-4 space-y-4 md:space-y-5">
                  {/* مربع البحث */}
                  <div className="relative">
                    {userRole !== 'teacher' && (
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

            {/* عرض الجلسات - ثلثي الصفحة */}
            <div className="md:col-span-3">
              <div className="bg-white border border-green-200 rounded-xl shadow-md overflow-hidden">
                {/* هيدر الجلسات */}
                <div className="bg-gradient-to-r from-green-100 via-green-200 to-green-300 px-3 py-2 sm:px-4 sm:py-3 border-b border-green-300">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center sm:justify-start">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-green-800 text-center sm:text-right">
                        {selectedCircle ? (
                          <span>{tsLabels.futureSessionsForCircle(getCircleName(selectedCircle))}</span>
                        ) : (
                          <span>{tsLabels.futureSessionsGeneric}</span>
                        )}
                      </h3>
                    </div>
                    {selectedCircle && (
                      <Button
                        onClick={handleAddSession}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-1 mx-auto sm:mx-0"
                        title="تسجيل جلسة جديدة"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="inline">{tsLabels.addSessionButton}</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* عداد الجلسات والبيانات */}
                <div className="p-3 sm:p-4">
                  {/* جدول الجلسات */}
                  {loading ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full mb-2"></div>
                      <span className="text-green-700 font-medium">جاري التحميل...</span>
                    </div>
                  ) : selectedCircle ? (
                    circleSessions.length > 0 ? (
                      <div className="overflow-hidden">
                        <GenericTable
                          data={circleSessions.map((session, index) => ({
                            ...session,
                            id: `${session.study_circle_id}-${session.session_date}-${index}`
                          }))}
                          cardGridColumns={{ sm: 1, md: 1, lg: 3, xl: 3 }}
                          cardWidth="100%"
                          columns={[
                            {
                              key: 'session_date',
                              header: '📅 التاريخ',
                              align: 'right',
                              render: (session) => (
                                <div className="flex flex-col text-right">
                                  <span className="text-xs text-white-600">{formatDateDisplay(session.session_date)}</span>
                                </div>
                              ),
                            },
                            {
                              key: 'time',
                              header: '⏰ الوقت',
                              align: 'right',
                              render: (session) => (
                                <div className="flex flex-wrap items-center gap-1 max-w-full">
                                  <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-xs whitespace-nowrap">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-medium">{formatTimeDisplay(session.start_time)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-lg text-xs whitespace-nowrap">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-medium">{formatTimeDisplay(session.end_time)}</span>
                                  </div>
                                </div>
                              ),
                            },
                            {
                              key: 'notes',
                              header: '📝' + tsLabels.fieldNotes,
                              align: 'right',
                              render: (session) => (
                                <span className="text-green-800 text-xs max-w-[200px] block">{session.notes || '—'}</span>
                              ),
                            },
                            {
                              key: 'actions',
                              header: '⚙️ ' + 'إجراءات',
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
                                    title={tsLabels.editSession}
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
                                    title={tsLabels.deleteSession}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ),
                            },
                          ]}
                          emptyMessage="لا توجد جلسات مستقبلية"
                          className="overflow-hidden rounded-xl border border-green-300 shadow-md"
                          getRowClassName={(_, index) =>
                            `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`
                          }
                          cardMaxFieldsCollapsed ={4}
                        />
                      </div>
                    ) : (
                      <div className="py-16 text-center">
                        <div className="bg-green-50 rounded-2xl p-6 max-w-md mx-auto border border-green-200 shadow-inner">
                          <Calendar className="w-12 h-12 text-green-300 mx-auto mb-3" />
                          <h3 className="text-lg font-bold text-green-800 mb-2">{tsLabels.noFutureSessions}</h3>
                          <p className="text-green-600 text-sm mb-4">
                            {tsLabels.noFutureSessions}
                          </p>
                          <Button
                            onClick={handleAddSession}
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {tsLabels.addSessionButton}
                          </Button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="py-16 text-center">
                      <div className="bg-green-50 rounded-2xl p-6 max-w-md mx-auto border border-green-200 shadow-inner">
                        <BookOpen className="w-12 h-12 text-green-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-green-800 mb-2">{tsLabels.chooseCircleTitle}</h3>
                        <p className="text-green-600 text-sm">
                          {tsLabels.chooseCircleHelp}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* نافذة إضافة جلسة جديدة */}
      {/* نافذة إضافة جلسة جديدة */}
      <FormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="تسجيل جلسة جديدة"
        description="أدخل بيانات الجلسة الجديدة"
        onSave={handleSaveNewSession}
        saveButtonText="حفظ الجلسة"
        cancelButtonText="إلغاء"
        maxWidth="600px"
        mode="add"
        isLoading={loading}
      >
        <FormRow label="التاريخ">
          <div className="flex flex-col gap-2">
            <Input
              id="session_date"
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
        </FormRow>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRow label="وقت البدء">
            <div className="flex flex-col gap-2">
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
          </FormRow>
          <FormRow label="وقت الانتهاء">
            <div className="flex flex-col gap-2">
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </FormRow>
        </div>

        <FormRow label="ملاحظات">
          <div className="flex flex-col gap-2">
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات إضافية حول الجلسة..."
              className="h-24"
            />
          </div>
        </FormRow>
      </FormDialog>

      {/* نافذة تعديل الجلسة */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="تعديل بيانات الجلسة"
        description="عدّل بيانات الجلسة المختارة"
        onSave={handleSaveEditedSession}
        saveButtonText="حفظ التعديلات"
        cancelButtonText="إلغاء"
        maxWidth="600px"
        mode="edit"
        isLoading={loading}
      >
        <FormRow label="التاريخ">
          <div className="flex flex-col gap-2">
            <Input
              id="edit_session_date"
              type="date"
              value={formData.session_date}
              onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>
        </FormRow>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRow label="وقت البدء">
            <div className="flex flex-col gap-2">
              <Input
                id="edit_start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
          </FormRow>
          <FormRow label="وقت الانتهاء">
            <div className="flex flex-col gap-2">
              <Input
                id="edit_end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </FormRow>
        </div>

        <FormRow label="ملاحظات">
          <div className="flex flex-col gap-2">
            <Textarea
              id="edit_notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات إضافية حول الجلسة..."
              className="h-24"
            />
          </div>
        </FormRow>
      </FormDialog>

      {/* نافذة تأكيد الحذف */}
      <DeleteConfirmationDialogAny
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="تأكيد حذف الجلسة"
        description="هل أنت متأكد من رغبتك في حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={confirmDeleteSession}
        detailsTitle="بيانات الجلسة المراد حذفها:"
        details={sessionToDelete ? {
          "التاريخ": formatDateDisplay(sessionToDelete.session_date),
          "الوقت": sessionToDelete.start_time && sessionToDelete.end_time
            ? `${formatTimeDisplay(sessionToDelete.start_time)} - ${formatTimeDisplay(sessionToDelete.end_time || "")}`
            : "-",
          "الملاحظات": sessionToDelete.notes || "-"
        } : null}
        deleteButtonText="نعم، قم بالحذف"
        cancelButtonText="إلغاء"
      />
    </div>
  );
}
