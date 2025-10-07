import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
// (تمت إزالة مكونات الجدول/السلكت غير المستخدمة بعد اعتماد GenericTable + شريط فلترة موحد)
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  BookOpen,
  Plus,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw as RefreshCwIcon
} from "lucide-react";
import { getStudyCirclesByTeacherId, getAllStudyCircles } from "@/lib/study-circle-service";
import { getSessionsByCircleId, createSession, updateSession, deleteSession } from "@/lib/circle-session-service";
import { getteachers } from "@/lib/profile-service";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, parseISO, startOfToday, addDays } from "date-fns";
import { arSA } from "date-fns/locale";
import { GenericTable } from "@/components/ui/generic-table";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { CircleSession } from "@/types/circle-session";
import { getLabels } from '@/lib/labels';
// إزالة قائمة البطاقات القديمة (تم استبدالها بشريط TeacherCircleFilterBar)
import { TeacherCircleFilterBar } from '@/components/filters/TeacherCircleFilterBar';

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
  // فلترة جديدة مشابهة لصفحة الجداول
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const { toast } = useToast();

  // بحث الحلقات
  const [searchTerm, setSearchTerm] = useState("");
  const labels = getLabels('ar');
  const tsLabels = labels.teacherSessionsLabels;
  const scsLabels = labels.studyCircleSchedulesLabels; // reuse pagination labels

  // دور المستخدم الحالي
  const userRole = currentUser?.role;

  // إعداد قائمة معلمين مع عدد الحلقات (فقط من لديهم حلقات فعلياً)
  const aggregatedTeachers = teachers
    .map(t => {
      const count = circles.filter(c => c.teacher_id === t.id).length;
      return { id: t.id, name: t.full_name, circles_count: count };
    })
    .filter(t => t.circles_count > 0);

  // في حال تم تصفية المعلم الحالي (لم يعد لديه حلقات) قم بإلغاء التحديد
  useEffect(() => {
    if (teacherId && !aggregatedTeachers.some(t => t.id === teacherId)) {
      setTeacherId(null);
      // أيضاً إذا كانت الحلقة المختارة تخص معلم سابق لم يعد ضمن القائمة، نلغي الحلقة
      if (selectedCircle) {
        const circle = circles.find(c => c.id === selectedCircle);
        if (circle && circle.teacher_id && !aggregatedTeachers.some(t => t.id === circle.teacher_id)) {
          setSelectedCircle(null);
        }
      }
    }
  }, [teacherId, aggregatedTeachers, selectedCircle, circles]);

  // اختيار تلقائي للمعلم (teacher/admin/superadmin) فقط وتحديد الحلقة تلقائياً إذا كان لديه حلقة واحدة فقط
  useEffect(() => {
    if ((userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && currentUser?.id) {
      const userCircles = circles.filter(c => c.teacher_id === currentUser.id);
      if (userCircles.length > 0 && !teacherId) {
        setTeacherId(currentUser.id);
      }
      // إذا كان لديه حلقة واحدة فقط ولم يختر حلقة بعد نحددها
      if (userCircles.length === 1 && !selectedCircle) {
        setSelectedCircle(userCircles[0].id);
      }
      // إذا كان لديه أكثر من حلقة نترك للمستخدم الاختيار ولا نحدد تلقائياً
    }
  }, [userRole, currentUser?.id, circles, teacherId, selectedCircle]);

  // عند تغيير المعلم: إذا كان لديه حلقة واحدة فقط ولم يتم اختيار حلقة، نختارها
  useEffect(() => {
    if (teacherId) {
      const teacherCircles = circles.filter(c => c.teacher_id === teacherId);
      if (teacherCircles.length === 1 && !selectedCircle) {
        setSelectedCircle(teacherCircles[0].id);
      }
      if (teacherCircles.length > 1 && selectedCircle) {
        // إذا كانت الحلقة المختارة لا تنتمي لهذا المعلم بعد التغيير، نفرغ الاختيار
        const stillValid = teacherCircles.some(c => c.id === selectedCircle);
        if (!stillValid) setSelectedCircle(null);
      }
    } else {
      // إزالة اختيار الحلقة عند مسح المعلم (إلا إذا كان هناك حلقة واحدة فقط إجمالاً وسيتم التقاطها بتأثير آخر)
      if (circles.length !== 1) setSelectedCircle(null);
    }
  }, [teacherId, circles, selectedCircle]);

  // في حال النظام كله يحتوي حلقة واحدة فقط (حتى لو ليست للمعلم الحالي) ولم يتم اختيار حلقة بعد، اخترها مباشرة
  useEffect(() => {
    if (!selectedCircle && circles.length === 1) {
      setSelectedCircle(circles[0].id);
    }
  }, [circles, selectedCircle]);

  // تصفية الحلقات حسب المعلم والبحث
  const filteredCircles = circles.filter(circle => {
    if (teacherId && circle.teacher_id !== teacherId) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (circle.name || '').toLowerCase().includes(term) ||
      (circle.teacher?.full_name || '').toLowerCase().includes(term)
    );
  });

  // تمت إزالة ترقيم صفحات الحلقات بعد اعتماد شريط الفلترة الموحد (TeacherCircleFilterBar)

  // حالة نموذج إضافة/تعديل الجلسة
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    session_date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  // حالات تحميل منفصلة لأزرار الحفظ والحذف
  const [savingNewSession, setSavingNewSession] = useState(false);
  const [savingEditedSession, setSavingEditedSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  // حالة نافذة التأكيد للحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<CircleSession | null>(null);

  // حالة طي/توسيع الكارد الرئيسي (مشابهة لصفحة الجداول StudyCircleSchedules)
  const [cardCollapsed, setCardCollapsed] = useState(false);
  // إظهار/إخفاء شريط الفلترة
  const [showFilters, setShowFilters] = useState(true);

  // إعادة التحديد (إلغاء اختيار المعلم والحلقة والبحث)
  const handleResetSelections = () => {
    setTeacherId(null);
    setSelectedCircle(null);
    setSearchTerm("");
  };

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

        // (إلغاء التحديد التلقائي للحلقة هنا - سيتم لاحقاً عبر تأثير موحد إذا كانت حلقة واحدة فقط)
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
      setSavingNewSession(true);
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
    } finally {
      setSavingNewSession(false);
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
      setSavingEditedSession(true);
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
    } finally {
      setSavingEditedSession(false);
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
      setDeletingSession(true);
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
    } finally {
      setDeletingSession(false);
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
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-1 pb-0 px-0 sm:px-0 shadow-md border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-100" />
              <span className="truncate flex-1">جلسات المعلمين</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCardCollapsed(p => !p)}
                className="bg-green-700/30 hover:bg-green-600/50 text-white rounded-full h-8 w-8 p-0 flex items-center justify-center shadow-sm transition-colors"
                title={cardCollapsed ? 'عرض المحتوى' : 'طي المحتوى'}
                aria-label={cardCollapsed ? 'Expand content' : 'Collapse content'}
              >
                {cardCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CardTitle>
            {!cardCollapsed && (
              <CardDescription className="text-xs md:text-sm text-green-100 mt-0.5 pr-10">
                إدارة جلسات المعلمين والحلقات المستقبلية
              </CardDescription>
            )}
          </div>
        </CardHeader>

        {!cardCollapsed && (
          <CardContent className="space-y-0 sm:space-y-0 px-2 sm:px-3 pt-2 pb-3 transition-all duration-300">

            <div className="flex flex-col md:flex-row justify-end items-center gap-2 mb-1 rounded-md bg-white dark:bg-gray-900 p-1.5 shadow-sm border border-green-200 dark:border-green-700">
              <div className="flex gap-2 items-center ">
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
              <TeacherCircleFilterBar
                useInlineSelects
                useShadSelect
                teachers={aggregatedTeachers.map(t => ({ id: t.id, name: t.name, circles_count: t.circles_count }))}
                circles={filteredCircles.map(c => ({ id: c.id, name: c.name }))}
                selectedTeacherId={teacherId}
                selectedCircleId={selectedCircle}
                searchQuery={searchTerm}
                onSearchChange={setSearchTerm}
                onTeacherChange={(id) => { setTeacherId(id); setSelectedCircle(null); }}
                onCircleChange={(id) => setSelectedCircle(id)}
                onClearTeacher={() => { setTeacherId(null); setSelectedCircle(null); }}
                onClearCircle={() => setSelectedCircle(null)}
                showAddButton={!!selectedCircle}
                requireCircleBeforeAdd
                onAddClick={handleAddSession}
                addButtonLabel={tsLabels.addSessionButton}
                addButtonTooltip={tsLabels.addSessionButton}
              />
            )}
          </CardContent>
        )}
      </Card>

      <div>
        {!selectedCircle  ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center gap-2.5 text-sm sm:text-base">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-green-800 text-center sm:text-right">
              {selectedCircle && showFilters ? (
                <span>{tsLabels.futureSessionsForCircle(getCircleName(selectedCircle))}</span>
              ) : (
                <span>{tsLabels.futureSessionsGeneric}</span>
              )}
            </h3>
          </div>
        ) : (
          <div className="pt-2">
            <GenericTable
              title={
                <div className="flex items-center gap-2 w-full">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-600 drop-shadow-sm" />
                  <span className="font-extrabold text-green-600 text-sm md:text-base tracking-wide truncate">
                    {selectedCircle
                      ? `${tsLabels.futureSessionsForCircle(getCircleName(selectedCircle))}`
                      : tsLabels.futureSessionsGeneric}
                  </span>
                </div>
              }
              data={circleSessions.map((session, index) => ({
                ...session,
                id: `${session.study_circle_id}-${session.session_date}-${index}`
              }))}
              cardGridColumns={{ sm: 1, md: 1, lg: 3, xl: 3 }}
              cardWidth="100%"
              /* تم تكييف إعدادات الجدول لتطابق إعدادات الجداول العامة في بقية النظام */
              enablePagination
              defaultPageSize={5}
              pageSizeOptions={[5, 10, 20, 50]}
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
              className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
              getRowClassName={(_, index) =>
                `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`
              }
              cardMaxFieldsCollapsed={4}
              hideSortToggle={false}
            /* يمكن إضافة زر للتحديث لاحقاً إذا لزم الأمر: onRefresh={...} */
            />
          </div>
        )}
      </div>

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
        isLoading={savingNewSession}
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
        isLoading={savingEditedSession}
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
        isLoading={deletingSession}
      />
    </div>
  );
}
