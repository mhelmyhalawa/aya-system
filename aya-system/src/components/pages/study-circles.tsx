import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogOverlay } from "@/components/ui/dialog";
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// (تمت إزالة استيراد عناصر الجدول المباشر بعد استخدام GenericTable)
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  BookOpen,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  School,
  Clock,
  Info,
  User
} from "lucide-react";
import { StudyCircle, StudyCircleCreate, StudyCircleUpdate } from "@/types/study-circle";
import { Profile } from "@/types/profile";
import { Badge } from "@/components/ui/badge";
import {
  getAllStudyCircles,
  getStudyCirclesByTeacherId,
  createStudyCircle,
  updateStudyCircle,
  deleteStudyCircle
} from "@/lib/study-circle-service";
import { getteachers } from "@/lib/profile-service";
import { studyCirclesLabels, errorMessages, commonLabels } from "@/lib/arabic-labels";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getStudyCircleSchedules, createStudyCircleSchedule, updateStudyCircleSchedule, deleteStudyCircleSchedule } from "@/lib/study-circle-schedule-service";
import { StudyCircleSchedule, weekdayOptions, getWeekdayName, formatTime } from "@/types/study-circle-schedule";
import { TeacherSessions } from "@/pages/TeacherSessions";
import { GenericTable, Column } from "../ui/generic-table";

interface StudyCirclesProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string;
}

export function StudyCircles({ onNavigate, userRole, userId }: StudyCirclesProps) {
  const { toast } = useToast();

  // حالة القائمة
  const [circles, setCircles] = useState<StudyCircle[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // حالة الحوار
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [dialogTitle, setDialogTitle] = useState(studyCirclesLabels.addForm.title);

  // حالة حوار الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [circleToDelete, setCircleToDelete] = useState<StudyCircle | null>(null);

  // متغيرات حالة لجدولة الحلقة
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [selectedCircleForSchedule, setSelectedCircleForSchedule] = useState<StudyCircle | null>(null);
  const [circleSchedules, setCircleSchedules] = useState<StudyCircleSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // حالة إضافة وتعديل وحذف الجدولة
  const [openAddScheduleDialog, setOpenAddScheduleDialog] = useState(false);
  const [openEditScheduleDialog, setOpenEditScheduleDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<StudyCircleSchedule | null>(null);
  const [addScheduleForm, setAddScheduleForm] = useState({ weekday: "0", start_time: "", end_time: "", location: "" });
  // متغيرات لحوار تأكيد حذف الجدولة
  const [isDeleteScheduleDialogOpen, setIsDeleteScheduleDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<StudyCircleSchedule | null>(null);
  const [editScheduleForm, setEditScheduleForm] = useState({ weekday: "0", start_time: "", end_time: "", location: "" });
  const [savingNewSchedule, setSavingNewSchedule] = useState(false);
  const [savingScheduleEdit, setSavingScheduleEdit] = useState(false);

  // حالة النموذج
  const [circleId, setCircleId] = useState<string>("");
  const [circleName, setCircleName] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [maxStudents, setMaxStudents] = useState<string>("");

  // تحميل البيانات
  useEffect(() => {
    loadCircles();
    loadTeachers();
  }, [userRole, userId]);

  // استرجاع الحلقات
  const loadCircles = async () => {
    setLoading(true);
    setError(null);

    try {
      let data: StudyCircle[] = [];

      // إذا كان المستخدم معلم، استرجع فقط الحلقات المرتبطة به
      if (userRole === 'teacher' && userId) {
        data = await getStudyCirclesByTeacherId(userId);
      } else {
        data = await getAllStudyCircles();
      }

      setCircles(data);
    } catch (error) {
      console.error("خطأ في تحميل الحلقات:", error);
      setError("فشل في تحميل بيانات الحلقات");
    } finally {
      setLoading(false);
    }
  };

  // استرجاع المعلمين
  const loadTeachers = async () => {
    try {
      const data = await getteachers();
      setTeachers(data);
    } catch (error) {
      console.error("خطأ في تحميل المعلمين:", error);
    }
  };

  // فلترة الحلقات حسب البحث
  const filteredCircles = circles.filter(circle =>
    circle.name.includes(searchTerm) ||
    (circle.teacher?.full_name && circle.teacher.full_name.includes(searchTerm))
  );

  // إضافة حلقة جديدة
  const handleAddCircle = () => {
    setDialogMode("add");
    setDialogTitle(studyCirclesLabels.addForm.title);
    setCircleId("");
    setCircleName("");
    setTeacherId("");
    setMaxStudents("");
    setIsDialogOpen(true);
  };

  // تعديل حلقة
  const handleEditCircle = (circle: StudyCircle) => {
    setDialogMode("edit");
    setDialogTitle(studyCirclesLabels.editForm.title);
    setCircleId(circle.id);
    setCircleName(circle.name);
    setTeacherId(circle.teacher_id);
    setMaxStudents(circle.max_students?.toString() || "");
    setIsDialogOpen(true);
  };

  // حذف حلقة
  const handleDeleteCircle = (circle: StudyCircle) => {
    setCircleToDelete(circle);
    setIsDeleteDialogOpen(true);
  };

  // تأكيد حذف حلقة
  const confirmDeleteCircle = async () => {
    if (!circleToDelete) return;

    try {
      const result = await deleteStudyCircle(circleToDelete.id);

      if (result.success) {
        toast({
          title: studyCirclesLabels.deleteSuccess,
          className: "bg-green-50 border-green-200",
        });
        loadCircles();
      } else {
        toast({
          title: errorMessages.generalError,
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حذف الحلقة:", error);
      toast({
        title: errorMessages.generalError,
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setCircleToDelete(null);
    }
  };

  // فتح ديالوج الجدولة
  const handleOpenScheduleDialog = (circle: StudyCircle) => {
    setSelectedCircleForSchedule(circle);
    setOpenScheduleDialog(true);
    loadCircleSchedules(circle.id);
  };

  // إغلاق ديالوج الجدولة
  const handleCloseScheduleDialog = () => {
    setOpenScheduleDialog(false);
    setSelectedCircleForSchedule(null);
    setCircleSchedules([]);
  };

  // تحميل جدولة الحلقة
  const loadCircleSchedules = async (circleId: string) => {
    setLoadingSchedules(true);
    try {
      const schedules = await getStudyCircleSchedules(circleId);
      setCircleSchedules(schedules);
    } catch (error) {
      console.error("خطأ في تحميل جدولة الحلقة:", error);
      toast({
        title: "خطأ في تحميل الجدولة",
        description: "حدث خطأ أثناء تحميل مواعيد الحلقة",
        variant: "destructive",
      });
    } finally {
      setLoadingSchedules(false);
    }
  };

  // إضافة موعد جديد
  const handleAddSchedule = () => {
    // إعادة تعيين نموذج الإضافة
    setAddScheduleForm({ weekday: "0", start_time: "", end_time: "", location: "" });
    setOpenAddScheduleDialog(true);
  };

  // حفظ موعد جديد
  const handleSaveNewSchedule = async () => {
    if (!addScheduleForm.start_time || !addScheduleForm.end_time) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى تحديد وقت البداية والنهاية",
        variant: "destructive",
      });
      return;
    }

    setSavingNewSchedule(true);
    try {
      const newSchedule = {
        study_circle_id: selectedCircleForSchedule!.id,
        weekday: parseInt(addScheduleForm.weekday),
        start_time: addScheduleForm.start_time + ":00", // إضافة الثواني للتنسيق المطلوب
        end_time: addScheduleForm.end_time + ":00",
        location: addScheduleForm.location || undefined
      };

      const result = await createStudyCircleSchedule(newSchedule);

      if (result.success) {
        toast({
          title: "تمت الإضافة بنجاح",
          description: "تم إضافة الموعد الجديد بنجاح",
          className: "bg-green-50 border-green-200",
        });
        setOpenAddScheduleDialog(false);
        // إعادة تحميل الجدولة
        await loadCircleSchedules(selectedCircleForSchedule!.id);
      } else {
        toast({
          title: "فشل في إضافة الموعد",
          description: result.message || "حدث خطأ أثناء إضافة الموعد الجديد",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في إضافة موعد جديد:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء إضافة الموعد",
        variant: "destructive",
      });
    } finally {
      setSavingNewSchedule(false);
    }
  };

  // تعديل موعد
  const handleEditSchedule = (schedule: StudyCircleSchedule) => {
    setSelectedSchedule(schedule);
    // تهيئة نموذج التعديل بالبيانات الحالية
    setEditScheduleForm({
      weekday: schedule.weekday.toString(),
      start_time: schedule.start_time.substring(0, 5), // إزالة الثواني
      end_time: schedule.end_time.substring(0, 5),
      location: schedule.location || ""
    });
    setOpenEditScheduleDialog(true);
  };

  // حفظ تعديلات الموعد
  const handleSaveScheduleEdit = async () => {
    if (!editScheduleForm.start_time || !editScheduleForm.end_time) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى تحديد وقت البداية والنهاية",
        variant: "destructive",
      });
      return;
    }

    setSavingScheduleEdit(true);
    try {
      const updatedSchedule = {
        id: selectedSchedule!.id,
        weekday: parseInt(editScheduleForm.weekday),
        start_time: editScheduleForm.start_time + ":00",
        end_time: editScheduleForm.end_time + ":00",
        location: editScheduleForm.location || undefined
      };

      const result = await updateStudyCircleSchedule(updatedSchedule);

      if (result.success) {
        toast({
          title: "تم التعديل بنجاح",
          description: "تم تعديل الموعد بنجاح",
          className: "bg-green-50 border-green-200",
        });
        setOpenEditScheduleDialog(false);
        // إعادة تحميل الجدولة
        await loadCircleSchedules(selectedCircleForSchedule!.id);
      } else {
        toast({
          title: "فشل في تعديل الموعد",
          description: result.message || "حدث خطأ أثناء تعديل الموعد",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في تعديل الموعد:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء تعديل الموعد",
        variant: "destructive",
      });
    } finally {
      setSavingScheduleEdit(false);
    }
  };

  // حذف موعد
  const handleDeleteSchedule = async (schedule: StudyCircleSchedule) => {
    // فتح مربع حوار تأكيد الحذف
    setScheduleToDelete(schedule);
    setIsDeleteScheduleDialogOpen(true);
  };

  // تنفيذ عملية حذف الموعد
  const executeDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    try {
      const result = await deleteStudyCircleSchedule(scheduleToDelete.id);

      if (result.success) {
        toast({
          title: "تم الحذف بنجاح",
          description: "تم حذف الموعد بنجاح",
          className: "bg-green-50 border-green-200",
        });
        // إعادة تحميل الجدولة
        await loadCircleSchedules(selectedCircleForSchedule!.id);
      } else {
        toast({
          title: "فشل في حذف الموعد",
          description: result.message || "حدث خطأ أثناء حذف الموعد",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حذف الموعد:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء حذف الموعد",
        variant: "destructive",
      });
    }
  };

  // تغيير قيم نموذج إضافة موعد
  const handleAddScheduleFormChange = (field: string, value: string) => {
    setAddScheduleForm(prev => ({ ...prev, [field]: value }));
  };

  // تغيير قيم نموذج تعديل موعد
  const handleEditScheduleFormChange = (field: string, value: string) => {
    setEditScheduleForm(prev => ({ ...prev, [field]: value }));
  };

  // دالة محسّنة للحصول على اسم اليوم من الرقم
  const getWeekdayNameFixed = (weekday: number | string): string => {
    const weekdayMap = {
      '0': 'الأحد',
      '1': 'الإثنين',
      '2': 'الثلاثاء',
      '3': 'الأربعاء',
      '4': 'الخميس',
      '5': 'الجمعة',
      '6': 'السبت'
    };
    const weekdayStr = String(weekday);
    return weekdayMap[weekdayStr] || `غير معروف (${weekdayStr})`;
  };

  // حفظ الحلقة
  const handleSaveCircle = async () => {
    // التحقق من البيانات
    if (!circleName || !teacherId) {
      toast({
        title: studyCirclesLabels.incompleteData,
        description: studyCirclesLabels.incompleteDataMessage,
        variant: "destructive",
      });
      return;
    }

    // تحويل الحد الأقصى للطلاب إلى رقم
    const maxStudentsNum = maxStudents ? parseInt(maxStudents) : undefined;

    try {
      if (dialogMode === "add") {
        // إنشاء حلقة جديدة
        const newCircle: StudyCircleCreate = {
          name: circleName,
          teacher_id: teacherId,
          max_students: maxStudentsNum
        };

        const result = await createStudyCircle(newCircle);

        if (result.success) {
          toast({
            title: studyCirclesLabels.addSuccess,
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadCircles();
        } else {
          toast({
            title: errorMessages.generalError,
            description: result.message,
            variant: "destructive",
          });
        }
      } else {
        // تحديث حلقة موجودة
        const updatedCircle: StudyCircleUpdate = {
          id: circleId,
          name: circleName,
          teacher_id: teacherId,
          max_students: maxStudentsNum
        };

        const result = await updateStudyCircle(updatedCircle);

        if (result.success) {
          toast({
            title: studyCirclesLabels.updateSuccess,
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadCircles();
        } else {
          toast({
            title: errorMessages.generalError,
            description: result.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("خطأ في حفظ الحلقة:", error);
      toast({
        title: errorMessages.generalError,
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  // التحقق من الصلاحيات
  if (userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'teacher') {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-md mx-auto text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-red-500/10 p-4 rounded-full">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {errorMessages.accessDenied}
          </h2>

          <p className="text-gray-600 dark:text-gray-300">
            ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة
          </p>

          <Button
            onClick={() => onNavigate('/')}
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            {commonLabels.back}
          </Button>
        </div>
      </div>

    );
  }

  // تعريف أعمدة جدول الجدولة
  const tableColumns: Column<StudyCircleSchedule>[] = [
    {
      key: 'weekday',
      header: 'اليوم',
      render: (schedule) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-green-700 dark:text-green-300" />
          <span>{getWeekdayNameFixed(schedule.weekday)}</span>
        </div>
      )
    },
    {
      key: 'time',
      header: 'الوقت',
      render: (schedule) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-700 dark:text-blue-300" />
          <span dir="ltr">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
        </div>
      )
    },
    {
      key: 'location',
      header: 'الموقع',
      render: (schedule) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-orange-700 dark:text-orange-300" />
          <span>{schedule.location || 'الموقع الافتراضي'}</span>
        </div>
      )
    },
    ...(userRole === 'superadmin' || userRole === 'admin' ? [{
      key: 'actions',
      header: 'الإجراءات',
      align: 'center' as const,
      render: (schedule) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditSchedule(schedule)}
            className="h-7 w-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-full"
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteSchedule(schedule)}
            className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }] : [])
  ];

  // عرض الواجهة
  return (
    <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-0 py-1 sm:py-2">

      <Card>
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">

            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-yellow-300" />
                {studyCirclesLabels.title}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                {studyCirclesLabels.description}
              </CardDescription>
            </div>

            {/* الأزرار */}
            <div className="flex flex-wrap gap-2 md:gap-3 items-center">
              {(userRole === 'superadmin' || userRole === 'admin') && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 rounded-3xl border-2 border-green-600 text-green-900 
                    hover:bg-green-100 hover:text-green-800 hover:scale-105 
                    dark:border-green-500 dark:text-green-300 dark:hover:bg-green-800 dark:hover:text-green-200 
                    shadow-lg transition-all duration-200 px-3 md:px-4 py-1.5 font-semibold"
                  onClick={() => onNavigate('/study-circle-schedules')}
                  title="الانتقال إلى صفحة جدولة الحلقات"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden md:inline text-sm">{'جدولة الحلقات'}</span>
                </Button>
              )}

              {(userRole === 'superadmin' || userRole === 'admin') && (
                <Button
                  onClick={handleAddCircle}
                  className="flex items-center gap-2 rounded-3xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-3 md:px-4 py-1.5 font-semibold"
                  title="إضافة حلقة جديدة"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline text-sm">{studyCirclesLabels.addCircle}</span>
                </Button>
              )}
            </div>

          </div>
        </CardHeader>


        {/* المحتوى */}
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 rounded-lg shadow-sm">
              <AlertCircle className="h-4 w-4 ml-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* البحث */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-green-400 dark:text-green-300" />
              <Input
                placeholder="🔍 البحث في الحلقات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3 pr-10 w-full rounded-xl border border-green-300 dark:border-green-600 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-all"
              />
            </div>
          </div>

          {/* جدول الحلقات باستخدام المكون العام */}
          {(() => {
            const columns: Column<StudyCircle>[] = [
              {
                key: 'name',
                header: `� ${studyCirclesLabels.name}`,
                important: true,
                render: (c) => <span className="font-medium">{c.name}</span>
              },
              {
                key: 'teacher',
                header: `👨‍🏫 ${studyCirclesLabels.teacher}`,
                render: (c) => (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-700 dark:text-green-300" />
                    <span>{c.teacher?.full_name || 'غير محدد'}</span>
                  </div>
                )
              },
              {
                key: 'max_students',
                header: `👥 ${studyCirclesLabels.maxStudents}`,
                align: 'center',
                render: (c) => c.max_students ? (
                  <div className="flex gap-1">
                    <Users className="h-4 w-4 text-green-700 dark:text-green-300" />
                    <span>{c.max_students}</span>
                  </div>
                ) : <span className="text-green-500/60">-</span>
              },
              ...((userRole === 'superadmin' || userRole === 'admin') ? [{
                key: 'actions',
                header: '⚙️ الإجراء',
                align: 'center' as const,
                render: (c: StudyCircle) => (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenScheduleDialog(c)}
                      className="h-8 w-8 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 hover:text-green-700 dark:hover:text-green-200 rounded-full"
                      title="جدولة الحلقة"
                    >
                      <Calendar size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCircle(c)}
                      className="h-8 w-8 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 hover:text-green-800 dark:hover:text-green-200 rounded-full"
                      title={studyCirclesLabels.editTooltip}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCircle(c)}
                      className="h-8 w-8 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-800 hover:text-red-500 dark:hover:text-red-400 rounded-full"
                      title={studyCirclesLabels.deleteTooltip}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )
              }] : [])
            ];

            return (
              <GenericTable
                data={filteredCircles}
                columns={columns}
                title="الحلقات"
                emptyMessage={searchTerm ? 'لا توجد نتائج مطابقة للبحث' : studyCirclesLabels.noCircles}
                onAddNew={(userRole === 'superadmin' || userRole === 'admin') ? handleAddCircle : undefined}
                onRefresh={loadCircles}
                cardMaxFieldsCollapsed={4}
                cardPrimaryActions={(c) => (
                  (userRole === 'superadmin' || userRole === 'admin') ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCircle(c)}
                        className="border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-700"
                      >
                        <Pencil className="h-3 w-3 ml-1" />
                        <span className="hidden sm:inline">تعديل</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCircle(c)}
                        className="border-red-500 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-3 w-3 ml-1" />
                        <span className="hidden sm:inline">حذف</span>
                      </Button>
                    </>
                  ) : null
                )}
                cardActions={(c) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenScheduleDialog(c)}
                    className="border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-700"
                  >
                    <Calendar className="h-3 w-3 ml-1" />
                    <span className="hidden sm:inline">الجدولة</span>
                  </Button>
                )}
              />
            );
          })()}
        </CardContent>
      </Card>



      <FormDialog
        title={dialogTitle}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveCircle}
        saveButtonText={dialogMode === "add"
          ? studyCirclesLabels.addForm.submit
          : studyCirclesLabels.editForm.submit}
        cancelButtonText={studyCirclesLabels.cancel}
        mode={dialogMode}
      >
        <div className="grid gap-4 py-2">
          {/* اسم الحلقة */}
          <FormRow label={`${studyCirclesLabels.name} *`}>
            <Input
              id="name"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              placeholder="أدخل اسم الحلقة"
              className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2 text-right"
            />
          </FormRow>

          {/* المعلم */}
          <FormRow label={`${studyCirclesLabels.teacher} *`}>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger className="bg-green-50 border-green-200 text-green-900 rounded-md text-sm py-1 px-2 text-right">
                <SelectValue placeholder={studyCirclesLabels.selectTeacher} />
              </SelectTrigger>
              <SelectContent>
                {teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{teacher.full_name}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    {studyCirclesLabels.noTeachers}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </FormRow>

          {/* الحد الأقصى للطلاب */}
          <FormRow label={studyCirclesLabels.maxStudents}>
            <Input
              id="max_students"
              type="number"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              placeholder={studyCirclesLabels.enterNumber}
              min="1"
              className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2 text-right"
            />
          </FormRow>
        </div>
      </FormDialog>


      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteCircle}
        isLoading={false}
        title={studyCirclesLabels.deleteCircle}
        description={studyCirclesLabels.confirmDelete}
        itemDetails={circleToDelete ? {
          [studyCirclesLabels.name]: circleToDelete.name,
          [studyCirclesLabels.teacher]: circleToDelete.teacher?.full_name || '-'
        } : null}
        deleteButtonText={studyCirclesLabels.deleteCircle}
        cancelButtonText={studyCirclesLabels.cancel}
      />

      <Dialog open={openScheduleDialog} onOpenChange={setOpenScheduleDialog}>
        <DialogContent
          dir="rtl"
          className="sm:max-w-[900px] w-full max-h-[85vh] h-auto flex flex-col bg-gradient-to-r from-blue-50 to-green-50 rounded-xl
           shadow-lg
           border border-gray-100 p-0 overflow-hidden"
        >
          {/* الهيدر مع الأزرار على اليسار */}
          <DialogTitle
            className="relative flex items-center justify-center bg-gradient-to-r from-green-600 via-emerald-500 to-green-400 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-t-xl shadow-md"
          >
            {/* العنوان في النص */}
            <h2 className="text-sm sm:text-lg font-extrabold tracking-wide drop-shadow-md text-center flex-1">
              جدولة حلقة {selectedCircleForSchedule?.name || ""}
            </h2>

            {/* الأزرار على اليسار */}
            <div className="absolute left-3 sm:left-4 flex gap-2">
              {(userRole === "superadmin" || userRole === "admin") && (
                <Button
                  title="إضافة موعد جديد للحلقة"
                  onClick={handleAddSchedule}
                  className="flex items-center gap-1 sm:gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-lg shadow-md border border-white/30 transition-all duration-200 h-6 sm:h-8"
                >
                  <Plus className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">إضافة موعد</span>
                </Button>

              )}
            </div>
          </DialogTitle>



          {/* المحتوى الرئيسي مع سكرول داخلي */}
          <div className="flex-1 overflow-y-auto -mx-0.5 px-3 sm:px-4 py-0 sm:py-1" dir="rtl">
            {loadingSchedules ? (
              <div className="text-center p-6 sm:p-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-islamic-green mb-2 sm:mb-4"></div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    جاري تحميل جدولة الحلقة...
                  </span>
                </div>
              </div>
            ) : circleSchedules.length === 0 ? (
              <div className="text-center p-4 sm:p-8 bg-white/30 rounded-lg shadow-sm">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2 sm:mb-4" />
                <h3 className="font-medium text-sm sm:text-lg mb-1 sm:mb-2">
                  لا توجد مواعيد محددة
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">
                  لم يتم تسجيل أي مواعيد لهذه الحلقة بعد
                </p>
                {(userRole === "superadmin" || userRole === "admin") && (
                  <Button
                    onClick={handleAddSchedule}
                    className="bg-islamic-green hover:bg-islamic-green/90 text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                    إضافة أول موعد
                  </Button>
                )}
                {userRole === "teacher" && (
                  <p className="text-muted-foreground text-[9px] sm:text-sm mt-2">
                    لا يمكن للمعلمين إضافة مواعيد. يرجى التواصل مع الإدارة.
                  </p>
                )}
              </div>
            ) : (
              <GenericTable
                data={circleSchedules}
                columns={tableColumns}
                className="overflow-hidden rounded-lg text-xs sm:text-sm border border-green-300 dark:border-green-700 shadow-sm w-full"
                defaultView="table"
              />
            )}
          </div>
        </DialogContent>


      </Dialog>

      {/* إضافة موعد جديد */}
      <FormDialog
        title="إضافة موعد جديد"
        description="قم بتحديد اليوم والوقت لإضافة موعد جديد للحلقة"
        open={openAddScheduleDialog}
        onOpenChange={setOpenAddScheduleDialog}
        onSave={handleSaveNewSchedule}
        isLoading={savingNewSchedule}
        saveButtonText={savingNewSchedule ? "جارٍ الإضافة..." : "إضافة الموعد"}
        mode="add"
      >
        <div className="space-y-4">
          {/* اليوم كأزرار عصرية */}
          <FormRow label="اليوم *">
            <div className="flex flex-wrap gap-2 justify-center">
              {weekdayOptions.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleAddScheduleFormChange('weekday', day.value.toString())}
                  className={`
                    text-sm px-4 py-2 rounded-full border transition-all duration-200
                    flex-1 text-center
                    ${addScheduleForm.weekday === day.value.toString()
                      ? 'bg-gradient-to-r from-green-400 to-blue-400 text-white shadow-md transform scale-105'
                      : 'bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100 hover:shadow-sm'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </FormRow>

          {/* وقت البداية والنهاية */}
          <div className="grid grid-cols-2 gap-4">
            <FormRow label="وقت البداية *">
              <Input
                id="add-schedule-start-time"
                type="time"
                value={addScheduleForm.start_time}
                onChange={(e) => handleAddScheduleFormChange('start_time', e.target.value)}
                required
                className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2"
              />
            </FormRow>

            <FormRow label="وقت النهاية *">
              <Input
                id="add-schedule-end-time"
                type="time"
                value={addScheduleForm.end_time}
                onChange={(e) => handleAddScheduleFormChange('end_time', e.target.value)}
                required
                className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2"
              />
            </FormRow>
          </div>

          {/* الموقع */}
          <FormRow label="الموقع (اختياري)">
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Info className="h-3 w-3 ml-1" />
              اتركه فارغاً لاستخدام موقع الحلقة الافتراضي
            </div>
            <Input
              id="add-schedule-location"
              value={addScheduleForm.location}
              onChange={(e) => handleAddScheduleFormChange('location', e.target.value)}
              placeholder="أدخل موقع الموعد (اختياري)"
              className="bg-gray-50 border-gray-300 rounded-md text-sm py-1 px-2"
            />
          </FormRow>
        </div>
      </FormDialog>

      {/* تعديل موعد */}
      <FormDialog
        title="تعديل موعد"
        description="قم بتعديل بيانات الموعد"
        open={openEditScheduleDialog}
        onOpenChange={setOpenEditScheduleDialog}
        onSave={handleSaveScheduleEdit}
        isLoading={savingScheduleEdit}
        saveButtonText={savingScheduleEdit ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        mode="edit"
      >
        <div className="space-y-4">
          {/* اليوم كأزرار عصرية */}
          <FormRow label="اليوم *">
            <div className="flex flex-wrap gap-2 justify-center">
              {weekdayOptions.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleEditScheduleFormChange('weekday', day.value.toString())}
                  className={`
                    text-sm px-4 py-2 rounded-full border transition-all duration-200
                    flex-1 text-center
                    ${editScheduleForm.weekday === day.value.toString()
                      ? 'bg-gradient-to-r from-green-400 to-blue-400 text-white shadow-md transform scale-105'
                      : 'bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100 hover:shadow-sm'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </FormRow>

          {/* وقت البداية والنهاية */}
          <div className="grid grid-cols-2 gap-4">
            <FormRow label="وقت البداية *">
              <Input
                id="edit-schedule-start-time"
                type="time"
                value={editScheduleForm.start_time}
                onChange={(e) => handleEditScheduleFormChange('start_time', e.target.value)}
                required
                className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2"
              />
            </FormRow>

            <FormRow label="وقت النهاية *">
              <Input
                id="edit-schedule-end-time"
                type="time"
                value={editScheduleForm.end_time}
                onChange={(e) => handleEditScheduleFormChange('end_time', e.target.value)}
                required
                className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2"
              />
            </FormRow>
          </div>

          {/* الموقع */}
          <FormRow label="الموقع (اختياري)">
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Info className="h-3 w-3 ml-1" />
              اتركه فارغاً لاستخدام موقع الحلقة الافتراضي
            </div>
            <Input
              id="edit-schedule-location"
              value={editScheduleForm.location}
              onChange={(e) => handleEditScheduleFormChange('location', e.target.value)}
              placeholder="أدخل موقع الموعد (اختياري)"
              className="bg-gray-50 border-gray-300 rounded-md text-sm py-1 px-2"
            />
          </FormRow>
        </div>
      </FormDialog>

      {/* مربع حوار تأكيد حذف الجدولة */}
      <DeleteConfirmationDialog
        isOpen={isDeleteScheduleDialogOpen}
        onOpenChange={setIsDeleteScheduleDialogOpen}
        onConfirm={executeDeleteSchedule}
        isLoading={false}
        title="تأكيد حذف الموعد"
        description="هل أنت متأكد من رغبتك في حذف هذا الموعد من جدول الحلقة؟"
        itemDetails={scheduleToDelete ? {
          "اليوم": getWeekdayNameFixed(scheduleToDelete.weekday),
          "الوقت": `${scheduleToDelete.start_time} - ${scheduleToDelete.end_time}`,
          "المكان": scheduleToDelete.location || "-"
        } : null}
        deleteButtonText="نعم، احذف الموعد"
        cancelButtonText="إلغاء"
      />

    </div>
  );
}
