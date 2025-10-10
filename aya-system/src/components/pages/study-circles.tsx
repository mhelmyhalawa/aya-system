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
  User,
  Filter,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowDownUp,
  BookUser
} from "lucide-react";
import { StudyCircle, StudyCircleCreate, StudyCircleUpdate } from "@/types/study-circle";
import type { Student } from '@/types/student';
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
import { getLabels } from "@/lib/labels";
const { studyCirclesLabels, errorMessages, commonLabels } = getLabels('ar');
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getStudyCircleSchedules, createStudyCircleSchedule, updateStudyCircleSchedule, deleteStudyCircleSchedule } from "@/lib/study-circle-schedule-service";
import { getAllStudents } from '@/lib/supabase-service';
import { getStudentsCountInCircles } from '@/lib/student-count-service';
import { StudyCircleSchedule, weekdayOptions, formatTime } from "@/types/study-circle-schedule";
import { GenericTable, Column } from "../ui/generic-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudyCirclesProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string;
}

export function StudyCircles({ onNavigate, userRole, userId }: StudyCirclesProps) {
  const { toast } = useToast();

  // حالة القائمة (كل الحلقات)
  const [circles, setCircles] = useState<StudyCircle[]>([]);
  // حلقات المعلم فقط (في حال كان الدور معلم)
  const [myCircles, setMyCircles] = useState<StudyCircle[]>([]);
  // التاب النشط (حلقاتي / كل الحلقات)
  // التبويب الحالي (جميع الحلقات / حلقاتي) بالقيم المتوافقة مع مكون الواجهة المطلوب
  const [activeTab, setActiveTab] = useState<'all-records' | 'my-records'>(userRole === 'teacher' ? 'my-records' : 'all-records');
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  // خريطة أعداد الطلاب لكل حلقة
  const [studentsCountMap, setStudentsCountMap] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  // اظهار/اخفاء صندوق البحث
  const [showFilters, setShowFilters] = useState<boolean>(false);
  // اتجاه ترتيب الحلقات
  const [listSortDirection, setListSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // حالة الحوار
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [dialogTitle, setDialogTitle] = useState(studyCirclesLabels.addForm.title);

  // حالة حوار الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [circleToDelete, setCircleToDelete] = useState<StudyCircle | null>(null);
  const [isDeletingCircle, setIsDeletingCircle] = useState(false);

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
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [editScheduleForm, setEditScheduleForm] = useState({ weekday: "0", start_time: "", end_time: "", location: "" });
  const [savingNewSchedule, setSavingNewSchedule] = useState(false);
  const [savingScheduleEdit, setSavingScheduleEdit] = useState(false);
  // حالة عرض قائمة طلاب الحلقة المختارة
  const [openStudentsDialog, setOpenStudentsDialog] = useState(false);
  const [selectedCircleForStudents, setSelectedCircleForStudents] = useState<StudyCircle | null>(null);
  const [studentsInCircle, setStudentsInCircle] = useState<Student[]>([]);
  const [loadingStudentsInCircle, setLoadingStudentsInCircle] = useState(false);

  // حالة النموذج
  const [circleId, setCircleId] = useState<string>("");
  const [circleName, setCircleName] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [maxStudents, setMaxStudents] = useState<string>("");
  // حالة حفظ الحلقة (لمنع الضغط المزدوج وإظهار التحميل)
  const [isSavingCircle, setIsSavingCircle] = useState(false);

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
      // نجلب دائمًا كل الحلقات (لإمكانية عرض تب "كل الحلقات")
      const allData = await getAllStudyCircles();
      setCircles(allData);
      // جلب أعداد الطلاب لكل حلقة
      try {
        const counts = await getStudentsCountInCircles(allData.map(c => c.id));
        setStudentsCountMap(counts);
      } catch (e) {
        console.warn('تعذر جلب أعداد الطلاب للحلقات');
      }

      // إذا كان الدور معلم نجلب حلقاته الخاصة
      if (userRole === 'teacher' && userId) {
        const teacherData = await getStudyCirclesByTeacherId(userId);
        setMyCircles(teacherData);
      } else {
        setMyCircles([]);
      }
    } catch (error) {
      console.error(studyCirclesLabels.circleLoadError + ':', error);
      setError(studyCirclesLabels.circleLoadError);
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
      console.error(errorMessages.fetchFailed + ':', error);
    }
  };

  // اختيار مصدر البيانات حسب التاب النشط
  const baseDataset = activeTab === 'my-records'
    ? (
      userRole === 'teacher'
        ? myCircles
        : (userId ? circles.filter(c => c.teacher_id === userId) : [])
    )
    : circles;

  // فلترة الحلقات حسب البحث (يتم تطبيق البحث فقط إذا كان صندوق البحث ظاهرًا)
  const filteredCircles = baseDataset.filter(circle => {
    if (!showFilters || !searchTerm.trim()) return true;
    return (
      circle.name.includes(searchTerm) ||
      (circle.teacher?.full_name && circle.teacher.full_name.includes(searchTerm))
    );
  });

  // ترتيب الحلقات حسب الاسم وفق الاتجاه المحدد
  const displayedCircles = [...filteredCircles].sort((a, b) => {
    if (!listSortDirection) return 0;
    const aName = a.name || '';
    const bName = b.name || '';
    return listSortDirection === 'asc' ? aName.localeCompare(bName, 'ar') : bName.localeCompare(aName, 'ar');
  });

  const toggleListSort = () => {
    setListSortDirection(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null);
  };

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
    if (isDeletingCircle) return; // منع التكرار

    setIsDeletingCircle(true);

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
      console.error(errorMessages.deleteFailed + ':', error);
      toast({
        title: errorMessages.generalError,
        description: errorMessages.operationFailed,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setCircleToDelete(null);
      setIsDeletingCircle(false);
    }
  };

  // فتح ديالوج الجدولة
  const handleOpenScheduleDialog = (circle: StudyCircle) => {
    setSelectedCircleForSchedule(circle);
    setOpenScheduleDialog(true);
    loadCircleSchedules(circle.id);
  };

  // فتح حوار طلاب الحلقة
  const handleOpenStudentsDialog = async (circle: StudyCircle) => {
    setSelectedCircleForStudents(circle);
    setOpenStudentsDialog(true);
    await loadStudentsForCircle(circle.id);
  };

  const loadStudentsForCircle = async (circleId: string) => {
    setLoadingStudentsInCircle(true);
    try {
      const all = await getAllStudents();
      const filtered = all.filter(s => (s.study_circle_id === circleId) || (s.study_circle && s.study_circle.id === circleId));
      setStudentsInCircle(filtered);
    } catch (e) {
      console.error('خطأ في جلب طلاب الحلقة', e);
      setStudentsInCircle([]);
    } finally {
      setLoadingStudentsInCircle(false);
    }
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
      console.error(studyCirclesLabels.schedule.loadErrorTitle + ':', error);
      toast({
        title: studyCirclesLabels.schedule.loadErrorTitle,
        description: studyCirclesLabels.schedule.loadErrorDescription,
        variant: 'destructive'
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
        title: studyCirclesLabels.schedule.validate.incompleteTitle,
        description: studyCirclesLabels.schedule.validate.incompleteDescription,
        variant: 'destructive'
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
          title: studyCirclesLabels.schedule.toast.addSuccessTitle,
          description: studyCirclesLabels.schedule.toast.addSuccessDescription,
          className: 'bg-green-50 border-green-200'
        });
        setOpenAddScheduleDialog(false);
        // إعادة تحميل الجدولة
        await loadCircleSchedules(selectedCircleForSchedule!.id);
      } else {
        toast({
          title: studyCirclesLabels.schedule.toast.addFailedTitle,
          description: result.message || studyCirclesLabels.schedule.toast.addFailedDescription,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error(studyCirclesLabels.schedule.toast.unexpectedErrorTitle + ':', error);
      toast({
        title: studyCirclesLabels.schedule.toast.unexpectedErrorTitle,
        description: studyCirclesLabels.schedule.toast.unexpectedErrorDescription,
        variant: 'destructive'
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
        title: studyCirclesLabels.schedule.validate.incompleteTitle,
        description: studyCirclesLabels.schedule.validate.incompleteDescription,
        variant: 'destructive'
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
          title: studyCirclesLabels.schedule.toast.editSuccessTitle,
          description: studyCirclesLabels.schedule.toast.editSuccessDescription,
          className: 'bg-green-50 border-green-200'
        });
        setOpenEditScheduleDialog(false);
        // إعادة تحميل الجدولة
        await loadCircleSchedules(selectedCircleForSchedule!.id);
      } else {
        toast({
          title: studyCirclesLabels.schedule.toast.editFailedTitle,
          description: result.message || studyCirclesLabels.schedule.toast.editFailedDescription,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error(studyCirclesLabels.schedule.toast.unexpectedErrorTitle + ':', error);
      toast({
        title: studyCirclesLabels.schedule.toast.unexpectedErrorTitle,
        description: studyCirclesLabels.schedule.toast.unexpectedErrorDescription,
        variant: 'destructive'
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
    if (isDeletingSchedule) return; // منع التكرار

    setIsDeletingSchedule(true);

    try {
      const result = await deleteStudyCircleSchedule(scheduleToDelete.id);

      if (result.success) {
        toast({
          title: studyCirclesLabels.schedule.toast.deleteSuccessTitle,
          description: studyCirclesLabels.schedule.toast.deleteSuccessDescription,
          className: 'bg-green-50 border-green-200'
        });
        // إعادة تحميل الجدولة
        await loadCircleSchedules(selectedCircleForSchedule!.id);
      } else {
        toast({
          title: studyCirclesLabels.schedule.toast.deleteFailedTitle,
          description: result.message || studyCirclesLabels.schedule.toast.deleteFailedDescription,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error(studyCirclesLabels.schedule.toast.unexpectedErrorTitle + ':', error);
      toast({
        title: studyCirclesLabels.schedule.toast.unexpectedErrorTitle,
        description: studyCirclesLabels.schedule.toast.unexpectedErrorDescription,
        variant: 'destructive'
      });
    } finally {
      setIsDeleteScheduleDialogOpen(false);
      setScheduleToDelete(null);
      setIsDeletingSchedule(false);
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
    const map = studyCirclesLabels.schedule.weekdayNames as Record<string, string>;
    const weekdayStr = String(weekday);
    return map[weekdayStr] || `${studyCirclesLabels.schedule.weekdayUnknown} (${weekdayStr})`;
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

    // إذا كان هناك عملية سابقة جارية لا نعيد التنفيذ
    if (isSavingCircle) return;

    setIsSavingCircle(true);
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
    } finally {
      // إعادة الحالة بعد الانتهاء سواء نجحت العملية أم لا
      setIsSavingCircle(false);
    }
  };

  // دالة مساعدة لتنسيق قيمة الصف (دعم kg1 / kg2 والأرقام)
  const formatGrade = (raw?: string | null): string => {
    if (!raw) return '-';
    const v = raw.trim().toLowerCase();
    // أنماط الروضة
    if (v === 'kg1' || v === 'kg 1' || v === 'kg-1' || v === 'kg') return 'روضة 1';
    if (v === 'kg2' || v === 'kg 2' || v === 'kg-2') return 'روضة 2';
    // أرقام عربية/إنجليزية (1-12 مثلاً)
    const numMatch = v.match(/^(\d{1,2})$/);
    if (numMatch) {
      const n = parseInt(numMatch[1], 10);
      // خريطة مبسطة للألقاب (يمكن توسيعها لاحقًا)
      const map: Record<number, string> = {
        1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس', 6: 'السادس',
        7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر', 11: 'الحادي عشر', 12: 'الثاني عشر'
      };
      return map[n] ? `الصف ${map[n]}` : `الصف ${n}`;
    }
    // إبقاء القيمة كما هي إذا لم تُعرف
    return raw;
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

          <p className="text-gray-600 dark:text-gray-300">{errorMessages.accessDenied}</p>

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
      key: 'row_index',
      header: '🔢',
      align: 'center' as const,
      render: (s: any) => (
        <span className="text-xs font-semibold text-green-700">{s.row_index}</span>
      )
    },
    {
      key: 'weekday',
      header: '📅 ' + studyCirclesLabels.schedule.table.weekday,
      render: (schedule) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-green-700 dark:text-green-300" />
          <span>{getWeekdayNameFixed(schedule.weekday)}</span>
        </div>
      )
    },
    {
      key: 'time',
      header: '⏰ ' + studyCirclesLabels.schedule.table.time,
      align: 'right' as const,
      render: (schedule) => (
        <div className="flex items-center gap-1 flex-wrap max-w-full">
          <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{formatTime(schedule.start_time)}</span>
          </div>
          <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{formatTime(schedule.end_time)}</span>
          </div>
        </div>
      )
    },
    {
      key: 'location',
      header: '📍 ' + studyCirclesLabels.schedule.table.location,
      render: (schedule) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-orange-700 dark:text-orange-300" />
          <span>{schedule.location || studyCirclesLabels.schedule.table.defaultLocation}</span>
        </div>
      )
    },
    ...(userRole === 'superadmin' || userRole === 'admin' ? [{
      key: 'actions',
      header: '⚙️ ' + studyCirclesLabels.schedule.table.actions,
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
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 
                               border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              {/* العنوان والوصف */}
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-yellow-300" />
                <span className="truncate max-w-[180px] sm:max-w-none">{studyCirclesLabels.title}</span>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-0.5">
                {studyCirclesLabels.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0.5 pb-0 px-0 sm:px-0">
          {/* التابات + أزرار الأدوات */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-1 rounded-lg
            bg-white dark:bg-gray-900 p-2 shadow-sm border border-green-200 dark:border-green-700">
            {/* التابات */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'all-records' | 'my-records')}
              className="w-full md:w-[380px] bg-green-50 rounded-lg shadow-inner p-0.5"
            >
              <TabsList className="grid w-full grid-cols-2 gap-0.5 rounded-lg bg-white dark:bg-gray-900 shadow-sm ring-1 ring-green-300">
                {/* Tab جميع السجلات */}
                <TabsTrigger
                  value="all-records"
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
            <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end">
              {/* زر الفلتر */}
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className={`flex items-center gap-1.5 rounded-2xl 
              ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
              dark:bg-green-700 dark:hover:bg-green-600 
              shadow-md hover:scale-105 
              transition-transform duration-200 
              px-3 py-1.5 text-xs font-semibold h-8`}
                onClick={() => setShowFilters(p => !p)}
                title={showFilters ? 'إخفاء أدوات الفلترة' : 'إظهار أدوات الفلترة'}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">فلتر</span>
              </Button>
              {/* زر الترتيب
              <Button
                type="button"
                variant={listSortDirection ? 'default' : 'outline'}
                onClick={toggleListSort}
                title={listSortDirection === null ? 'ترتيب تصاعدي حسب اسم الحلقة' : listSortDirection === 'asc' ? 'ترتيب تنازلي' : 'إلغاء الترتيب'}
                className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold h-8 shadow-md hover:scale-105 transition-transform duration-200
                  ${listSortDirection === null
                    ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600'
                    : listSortDirection === 'asc'
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:hover:bg-yellow-500'
                      : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600'}`}
              >
                {listSortDirection === null && <ArrowDownUp className="h-3.5 w-3.5" />}
                {listSortDirection === 'asc' && <ArrowDownAZ className="h-3.5 w-3.5" />}
                {listSortDirection === 'desc' && <ArrowUpZA className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">
                  {listSortDirection === null ? 'ترتيب' : listSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}
                </span>
              </Button>  */}
              {/* زر التحديث */}
              <Button
                variant="outline"
                className="flex items-center gap-1.5 rounded-2xl 
              bg-green-600 hover:bg-green-700 
              dark:bg-green-700 dark:hover:bg-green-600 
              text-white shadow-md hover:scale-105 
              transition-transform duration-200 
              px-3 py-1.5 text-xs font-semibold h-8"
                onClick={loadCircles}
                title='تحديث البيانات'
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              {(userRole === 'superadmin' || userRole === 'admin') && (
                <>
                  {/* زر إضافة حلقة */}
                  <Button
                    onClick={handleAddCircle}
                    variant="outline"
                    className="flex items-center gap-1.5 rounded-2xl 
                  bg-green-600 hover:bg-green-700 
                  dark:bg-green-700 dark:hover:bg-green-600 
                  text-white shadow-md hover:scale-105 
                  transition-transform duration-200 
                  px-3 py-1.5 text-xs font-semibold h-8"
                    title='إضافة حلقة جديدة'
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إضافة حلقة</span>
                  </Button>
                </>
              )}
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="mb-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 ml-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {showFilters && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-2 bg-white 
                    dark:bg-gray-900 p-2 md:p-2 shadow-md border border-green-200 dark:border-green-700 
                    rounded-lg animate-fade-in">
              <Search className="absolute right-2.5 sm:right-3 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
              <Input
                placeholder={studyCirclesLabels.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8 sm:pr-9 h-8 sm:h-9 rounded-md sm:rounded-lg border-green-200 text-[12px] sm:text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* جدول الحلقات باستخدام المكون العام */}
      {(() => {
        const columns: Column<StudyCircle>[] = [
          {
            key: 'row_index',
            header: '🔢',
            align: 'center',
            render: (c) => {
              const idx = filteredCircles.findIndex(circle => circle.id === c.id);
              return idx >= 0 ? idx + 1 : '-';
            }
          },
          {
            key: 'name',
            header: `🕋 ${studyCirclesLabels.name}`,
            important: true,
            render: (c) => (
              <div className="flex items-center gap-2">
                🕋<span>{c.name}</span>
              </div>
            )
          },
          {
            key: 'teacher',
            header: `👨‍🏫 ${studyCirclesLabels.teacher}`,
            render: (c) => (
              <div className="flex items-center gap-2">
                👨‍🏫<span>{c.teacher?.full_name || studyCirclesLabels.unassignedTeacher}</span>
              </div>
            )
          },
          {
            key: 'max_students',
            header: `👥 الطلاب (الحالي/الحد)`,
            align: 'center',
            render: (c) => {
              const current = studentsCountMap[c.id] ?? 0;
              const max = c.max_students;
              const overLimit = max !== undefined && max !== null && current > max;
              const atLimit = max !== undefined && max !== null && current === max;
              // استخدام inline-flex بدلاً من flex للسماح لمحاذاة text-center في الخلية بتوسيط العنصر كله
              const baseClasses = "inline-flex items-center gap-1 justify-center px-2 py-1 rounded-full text-[11px] font-semibold border shadow-sm transition-colors";
              const colorClasses = overLimit
                ? "border-red-500 bg-red-100 hover:bg-red-200 text-red-700"
                : atLimit
                  ? "border-yellow-500 bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                  : "border-green-400 bg-green-50 hover:bg-green-100 text-green-700";
              return (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleOpenStudentsDialog(c); }}
                  className={`${baseClasses} ${colorClasses} justify-center`}
                  title="عرض طلاب الحلقة"
                >
                  👥 <span className="tabular-nums">{current}{max ? ` / ${max}` : ''}</span>
                </button>
              );
            }
          },
          ...((userRole === 'superadmin' || userRole === 'admin') ? [{
            key: 'actions',
            header: `⚙️ ${studyCirclesLabels.actions}`,
            align: 'center' as const,
            render: (c: StudyCircle) => (
              <div className="flex gap-2 justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenScheduleDialog(c)}
                  className="h-8 w-8 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 hover:text-green-700 dark:hover:text-green-200 rounded-full"
                  title={studyCirclesLabels.scheduleTooltip}
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
            data={displayedCircles}
            columns={columns}
            title={(
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[12.5px] font-bold text-emerald-800">
                      🕋 {studyCirclesLabels.title}
                    </span>
                  </div>
                </div>
              </div>
            )}
            emptyMessage={searchTerm ? studyCirclesLabels.searchNoResults : (activeTab === 'my-records' ? 'لا توجد حلقات خاصة بك' : studyCirclesLabels.noCircles)}
            onAddNew={(userRole === 'superadmin' || userRole === 'admin') ? handleAddCircle : undefined}
            onRefresh={loadCircles}
            enablePagination
            defaultPageSize={5}
            pageSizeOptions={[5, 10, 20, 50]}
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
                    <span className="hidden sm:inline">{studyCirclesLabels.editTooltip}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCircle(c)}
                    className="border-red-500 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-3 w-3 ml-1" />
                    <span className="hidden sm:inline">{studyCirclesLabels.deleteTooltip}</span>
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
                <span className="hidden sm:inline">{studyCirclesLabels.scheduleButtonLabel}</span>
              </Button>
            )}
            /* تطبيق نفس فكرة جدول سجلات الحفظ: إخفاء أيقونة الترتيب الافتراضي، تلوين الصفوف، تنسيق الإطار */
            className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
            getRowClassName={(_, index) => `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} transition-colors`}
            hideSortToggle={false}
          />
        );
      })()}

      <FormDialog
        title={dialogTitle}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveCircle}
        isLoading={isSavingCircle}
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
              placeholder={studyCirclesLabels.name}
              className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2 text-right"
            />
          </FormRow>

          {/* المعلم */}
          <FormRow label={`${studyCirclesLabels.teacher} *`}>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger
                id="teacher"
                dir="rtl"
                className={`h-9 text-right truncate max-w-full min-w-0 text-[11px] sm:text-xs
                  rounded-lg border px-2 pr-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500
                  bg-white dark:bg-gray-800
                  ${teacherId
                    ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500'}
                `}
              >
                <SelectValue placeholder={studyCirclesLabels.selectTeacher} />
              </SelectTrigger>
              <SelectContent
                position="popper"
                dir="rtl"
                className="text-right text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900"
              >
                {teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <SelectItem
                      key={teacher.id}
                      value={teacher.id}
                      className="cursor-pointer data-[highlighted]:bg-green-900 dark:data-[highlighted]:bg-green-700/50 rounded-md"
                    >
                      {teacher.full_name || `معلم ${teacher.id.slice(0, 4)}`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled className="text-gray-500">
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
        isLoading={isDeletingCircle}
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
              {`${studyCirclesLabels.schedule.openDialogTitlePrefix} ${selectedCircleForSchedule?.name || ""}`}
            </h2>

            {/* الأزرار على اليسار */}
            <div className="absolute left-3 sm:left-4 flex gap-2">
              {(userRole === "superadmin" || userRole === "admin") && (
                <Button
                  title={studyCirclesLabels.schedule.addButtonTooltip}
                  onClick={handleAddSchedule}
                  className="flex items-center gap-1 sm:gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-lg shadow-md border border-white/30 transition-all duration-200 h-6 sm:h-8"
                >
                  <Plus className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">{studyCirclesLabels.schedule.addDialog.title}</span>
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
                    {studyCirclesLabels.schedule.loading}
                  </span>
                </div>
              </div>
            ) : circleSchedules.length === 0 ? (
              <div className="text-center p-4 sm:p-8 bg-white/30 rounded-lg shadow-sm">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2 sm:mb-4" />
                <h3 className="font-medium text-sm sm:text-lg mb-1 sm:mb-2">
                  {studyCirclesLabels.schedule.noSchedulesTitle}
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-4">
                  {studyCirclesLabels.schedule.noSchedulesDescription}
                </p>
                {(userRole === "superadmin" || userRole === "admin") && (
                  <Button
                    onClick={handleAddSchedule}
                    className="bg-islamic-green hover:bg-islamic-green/90 text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                    {studyCirclesLabels.schedule.addFirstSchedule}
                  </Button>
                )}
                {userRole === "teacher" && (
                  <p className="text-muted-foreground text-[9px] sm:text-sm mt-2">
                    {studyCirclesLabels.schedule.teacherCannotAdd}
                  </p>
                )}
              </div>
            ) : (
              <GenericTable
                data={circleSchedules}
                columns={tableColumns}
                className="overflow-hidden rounded-lg text-xs sm:text-sm border border-green-300 dark:border-green-700 shadow-sm w-full"
                defaultView="table"
                hideSortToggle={false}
                enablePagination={true}
                defaultPageSize={3}
                pageSizeOptions={[3, 6, 12, 24, 50]}
                getRowClassName={(_, index) => `${index % 2 === 0 ? 'bg-green-50/40 dark:bg-green-900/20' : 'bg-white dark:bg-gray-900'} hover:bg-green-100 dark:hover:bg-green-800/40 transition-colors`}
              />
            )}
          </div>
        </DialogContent>


      </Dialog>

      {/* إضافة موعد جديد */}
      <FormDialog
        title={studyCirclesLabels.schedule.addDialog.title}
        description={studyCirclesLabels.schedule.addDialog.description}
        open={openAddScheduleDialog}
        onOpenChange={setOpenAddScheduleDialog}
        onSave={handleSaveNewSchedule}
        isLoading={savingNewSchedule}
        hideCancelButton={true}
        saveButtonText={savingNewSchedule ? studyCirclesLabels.schedule.addDialog.saving : studyCirclesLabels.schedule.addDialog.save}
        mode="add"
      >
        <div className="space-y-4">
          {/* اليوم كأزرار عصرية */}
          <FormRow label={studyCirclesLabels.schedule.fields.weekday}>
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
            <FormRow label={studyCirclesLabels.schedule.fields.startTime}>
              <Input
                id="add-schedule-start-time"
                type="time"
                value={addScheduleForm.start_time}
                onChange={(e) => handleAddScheduleFormChange('start_time', e.target.value)}
                required
                className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2"
              />
            </FormRow>

            <FormRow label={studyCirclesLabels.schedule.fields.endTime}>
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
          <FormRow label={studyCirclesLabels.schedule.fields.locationOptional}>
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Info className="h-3 w-3 ml-1" />
              {studyCirclesLabels.schedule.fields.locationHelp}
            </div>
            <Input
              id="add-schedule-location"
              value={addScheduleForm.location}
              onChange={(e) => handleAddScheduleFormChange('location', e.target.value)}
              placeholder={studyCirclesLabels.schedule.fields.locationPlaceholder}
              className="bg-gray-50 border-gray-300 rounded-md text-sm py-1 px-2"
            />
          </FormRow>
        </div>
      </FormDialog>

      {/* تعديل موعد */}
      <FormDialog
        title={studyCirclesLabels.schedule.editDialog.title}
        description={studyCirclesLabels.schedule.editDialog.description}
        open={openEditScheduleDialog}
        onOpenChange={setOpenEditScheduleDialog}
        onSave={handleSaveScheduleEdit}
        isLoading={savingScheduleEdit}
        saveButtonText={savingScheduleEdit ? studyCirclesLabels.schedule.editDialog.saving : studyCirclesLabels.schedule.editDialog.save}
        mode="edit"
      >
        <div className="space-y-4">
          {/* اليوم كأزرار عصرية */}
          <FormRow label={studyCirclesLabels.schedule.fields.weekday}>
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
            <FormRow label={studyCirclesLabels.schedule.fields.startTime}>
              <Input
                id="edit-schedule-start-time"
                type="time"
                value={editScheduleForm.start_time}
                onChange={(e) => handleEditScheduleFormChange('start_time', e.target.value)}
                required
                className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2"
              />
            </FormRow>

            <FormRow label={studyCirclesLabels.schedule.fields.endTime}>
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
          <FormRow label={studyCirclesLabels.schedule.fields.locationOptional}>
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Info className="h-3 w-3 ml-1" />
              {studyCirclesLabels.schedule.fields.locationHelp}
            </div>
            <Input
              id="edit-schedule-location"
              value={editScheduleForm.location}
              onChange={(e) => handleEditScheduleFormChange('location', e.target.value)}
              placeholder={studyCirclesLabels.schedule.fields.locationPlaceholder}
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
        isLoading={isDeletingSchedule}
        title={studyCirclesLabels.schedule.deleteDialog.title}
        description={studyCirclesLabels.schedule.deleteDialog.description}
        itemDetails={scheduleToDelete ? {
          [studyCirclesLabels.schedule.deleteDialog.weekdayLabel]: getWeekdayNameFixed(scheduleToDelete.weekday),
          [studyCirclesLabels.schedule.deleteDialog.timeLabel]: `${scheduleToDelete.start_time} - ${scheduleToDelete.end_time}`,
          [studyCirclesLabels.schedule.deleteDialog.locationLabel]: scheduleToDelete.location || "-"
        } : null}
        deleteButtonText={studyCirclesLabels.schedule.deleteDialog.deleteButton}
        cancelButtonText={studyCirclesLabels.schedule.deleteDialog.cancelButton}
      />

      {/* حوار عرض طلاب الحلقة باستخدام FormDialog */}
      <FormDialog
        title={`👥 طلاب حلقة: ${selectedCircleForStudents?.name || ''}`}
        open={openStudentsDialog}
        onOpenChange={setOpenStudentsDialog}
        onSave={() => { /* لا يوجد حفظ */ }}
        showSaveButton={false}
        hideCancelButton={true}
        maxWidth="850px"
        fullBleedBody
        transparentBody
        lightOverlay
        mode="edit"
      >
        <div className="p-2 sm:p-3">
          {loadingStudentsInCircle ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-green-600 mb-4"></div>
              <span className="text-xs sm:text-sm text-green-700">جاري تحميل الطلاب...</span>
            </div>
          ) : studentsInCircle.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-green-300 rounded-xl bg-white/70">
              <p className="text-sm font-medium text-green-700">لا يوجد طلاب في هذه الحلقة حاليا</p>
            </div>
          ) : (
            <GenericTable
              title={(
                <div className="w-full flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[12.5px] font-bold text-emerald-800">
                        🕋 {selectedCircleForStudents?.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              data={studentsInCircle.map((s, idx) => ({ ...s, id: s.id || String(idx) }))}
              columns={[
                { key: 'row_index', header: '🔢', align: 'center', render: (_s: any, i) => <span className="font-semibold text-green-700">{(i ?? 0) + 1}</span> },
                { key: 'full_name', header: '🧑‍🎓 الاسم', important: true, render: (s: Student) => <span className="font-medium">{s.full_name}</span> },
                { key: 'guardian', header: '👪 ولي الأمر', render: (s: Student) => <span>{s.guardian?.full_name || '-'}</span> },
                {
                  key: 'grade_level',
                  header: '🎓 الصف',
                  align: 'center',
                  // بعض السجلات قد تحتوي الحقل grade فقط (تمت إضافته في المابر للتوافق) لذا نستخدمه كخطة بديلة
                  render: (s: Student & { grade?: string }) => {
                    const raw = s.grade_level || s.grade;
                    const formatted = formatGrade(raw);
                    return raw ? <span title={raw}>{formatted}</span> : <span className="text-green-500/50">-</span>;
                  }
                },
                { key: 'phone_number', header: '📲 الجوال', align: 'center', render: (s: Student) => s.phone_number ? <span className="tracking-wide">{s.phone_number}</span> : <span className="text-green-500/50">-</span> },
              ]}
              defaultView="table"
              enablePagination
              defaultPageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              hideSortToggle={false}
              cardPageSize={2}
              className="rounded-lg border border-green-300 shadow bg-white"
            />
          )}
        </div>
      </FormDialog>

    </div>
  );
}
