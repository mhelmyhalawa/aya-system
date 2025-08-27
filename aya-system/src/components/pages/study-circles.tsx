import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { GenericTable } from "../ui/generic-table";

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

  // عرض الواجهة
  return (
    <div className="container mx-auto px-4 py-6">

      <Card className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-green-300 dark:border-green-700 overflow-hidden transition-all duration-300 hover:shadow-2xl">
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
                    shadow-lg transition-all duration-200 px-4 py-1.5 font-semibold"
                  onClick={() => onNavigate('/study-circle-schedules')}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{'جدولة الحلقات'}</span>
                </Button>
              )}

              {(userRole === 'superadmin' || userRole === 'admin') && (
                <Button
                  onClick={handleAddCircle}
                  className="flex items-center gap-2 rounded-3xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">{studyCirclesLabels.addCircle}</span>
                </Button>
              )}
            </div>

          </div>
        </CardHeader>


        {/* المحتوى */}
        <CardContent className="p-6 space-y-6">
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

          {/* الجدول */}
          <div className="border border-green-200 dark:border-green-700 rounded-2xl overflow-hidden shadow-md">
            <Table className="direction-rtl w-full border-collapse">
              <TableHeader className="bg-green-800 dark:bg-green-900">
                <TableRow>
                  <TableHead className="text-right font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center gap-2">

                      <span>📚{studyCirclesLabels.name}</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-bold text-white py-3 px-4 border-r border-green-700">👨‍🏫 {studyCirclesLabels.teacher}</TableHead>
                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">👥 {studyCirclesLabels.maxStudents}</TableHead>
                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">🗓️ {studyCirclesLabels.schedule}</TableHead>
                  {(userRole === 'superadmin' || userRole === 'admin') && (
                    <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">⚙️ الإجراءات</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredCircles.length > 0 ? (
                  filteredCircles.map((circle) => (
                    <TableRow
                      key={circle.id}
                      className="odd:bg-green-50 even:bg-white dark:odd:bg-green-800 dark:even:bg-green-900 hover:bg-green-100 dark:hover:bg-green-700 transition-colors duration-200 border-b border-green-200 dark:border-green-700"
                    >
                      {/* اسم الحلقة */}
                      <TableCell className="text-right font-medium text-green-900 dark:text-green-200 py-3 px-4 border-r border-green-200 dark:border-green-700">
                        <div className="flex items-center gap-2">
                          <span>📚 {circle.name}</span>
                        </div>
                      </TableCell>

                      {/* المعلم */}
                      <TableCell className="text-right py-3 px-4 border-r border-green-200 dark:border-green-700">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-green-700 dark:text-green-300" />
                          <span className="text-green-900 dark:text-green-200">{circle.teacher?.full_name || "غير محدد"}</span>
                        </div>
                      </TableCell>

                      {/* الحد الأقصى للطلاب */}
                      <TableCell className="text-center py-3 px-4 border-r border-green-200 dark:border-green-700">
                        {circle.max_students ? (
                          <div className="flex items-center justify-center gap-2">
                            <Users className="h-4 w-4 text-green-700 dark:text-green-300" />
                            <span className="text-green-900 dark:text-green-200">{circle.max_students}</span>
                          </div>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">-</span>
                        )}
                      </TableCell>

                      {/* أزرار الجدولة */}
                      <TableCell className="text-center py-3 px-4 border-r border-green-200 dark:border-green-700">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenScheduleDialog(circle)}
                          className="h-8 w-8 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 hover:text-green-700 dark:hover:text-green-200 rounded-full transition-colors"
                          title="جدولة الحلقة"
                        >
                          <Calendar size={16} />
                        </Button>
                      </TableCell>

                      {/* أزرار الإجراءات */}
                      {(userRole === 'superadmin' || userRole === 'admin') && (
                        <TableCell className="text-center py-3 px-4 border-r border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCircle(circle)}
                              className="h-8 w-8 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-700 hover:text-green-800 dark:hover:text-green-200 rounded-full transition-colors"
                              title={studyCirclesLabels.editTooltip}
                            >
                              <Pencil size={16} />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCircle(circle)}
                              className="h-8 w-8 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-800 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-colors"
                              title={studyCirclesLabels.deleteTooltip}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={(userRole === 'superadmin' || userRole === 'admin') ? 6 : 5}
                      className="text-center py-10"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <BookOpen className="h-8 w-8 text-green-300 mb-2" />
                        <p className="text-green-600 dark:text-green-400">
                          {searchTerm ? "لا توجد نتائج مطابقة للبحث" : studyCirclesLabels.noCircles}
                        </p>
                        {!searchTerm && (userRole === 'superadmin' || userRole === 'admin') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddCircle}
                            className="mt-4 flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-700 transition-colors rounded-xl px-4 py-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>{studyCirclesLabels.addCirclePrompt}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>



      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          dir="rtl"
          className="sm:max-w-[600px] w-full rounded-xl p-4 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100"
        >
          {/* Frame container */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">

            {/* Header */}
            <DialogHeader className="flex justify-center items-center pb-2 text-right">
              <DialogTitle className="text-xl flex items-center gap-2">
                <h3 className="bg-gradient-to-r from-orange-400 via-orange-300 to-yellow-400 
                        text-white text-xl font-extrabold py-3 px-5 rounded-2xl shadow-md 
                        transition-transform duration-200 hover:scale-105 flex items-center gap-2 text-right">
                  {dialogTitle}
                  <BookOpen className="h-5 w-5 text-white" />
                </h3>
              </DialogTitle>
            </DialogHeader>

            {/* Body */}
            <div className="grid gap-4 py-4">

              {/* اسم الحلقة */}
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-right text-gray-800 text-sm">
                  {studyCirclesLabels.name} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  placeholder="أدخل اسم الحلقة"
                  className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2 text-right"
                />
              </div>

              {/* المعلم */}
              <div className="grid gap-2">
                <Label htmlFor="teacher" className="text-right text-gray-800 text-sm">
                  {studyCirclesLabels.teacher} <span className="text-red-500">*</span>
                </Label>
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
              </div>

              {/* الحد الأقصى للطلاب */}
              <div className="grid gap-2">
                <Label htmlFor="max_students" className="text-right text-gray-800 text-sm">
                  {studyCirclesLabels.maxStudents}
                </Label>
                <Input
                  id="max_students"
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                  placeholder={studyCirclesLabels.enterNumber}
                  min="1"
                  className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2 text-right"
                />
              </div>

            </div>

            {/* Footer */}
            <DialogFooter dir="rtl" className="flex justify-end gap-2 mt-4">
              <Button
                onClick={handleSaveCircle}
                className="bg-green-600 hover:bg-green-700 text-white rounded-md px-4 py-2 text-sm transition-colors"
              >
                {dialogMode === "add"
                  ? studyCirclesLabels.addForm.submit
                  : studyCirclesLabels.editForm.submit}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-100 text-sm px-3 py-1"
              >
                {studyCirclesLabels.cancel}
              </Button>
            </DialogFooter>

          </div>
        </DialogContent>
      </Dialog>


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
        <DialogContent dir="rtl" className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl shadow-lg border border-gray-100">

          {/* رأس الديالوج */}
          <DialogHeader className="flex flex-col items-center border-b border-islamic-green/20 pb-4">
            <DialogTitle className="text-xl text-islamic-green flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedCircleForSchedule
                ? `جدولة حلقة: ${selectedCircleForSchedule.name}`
                : 'جدولة الحلقة'}
              {selectedCircleForSchedule?.teacher && ` | المعلم: ${selectedCircleForSchedule.teacher.full_name}`}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              إدارة مواعيد وأيام انعقاد الحلقة الدراسية
            </DialogDescription>
          </DialogHeader>

          {/* القسم الرئيسي */}
          <div className="space-y-4 mt-4">

            {/* ملخص المواعيد والإجراءات */}
            <div className="flex justify-between items-center p-4 bg-white/50 rounded-lg shadow-sm">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-islamic-green border-islamic-green/40">
                  {circleSchedules.length} موعد
                </Badge>
                <span className="text-sm text-muted-foreground">إجمالي المواعيد</span>
                {selectedCircleForSchedule && (
                  <Badge variant="secondary" className="text-xs">
                    الحلقة: {selectedCircleForSchedule.name}
                  </Badge>
                )}
              </div>

              {/* زر إضافة موعد جديد للمسؤولين */}
              {(userRole === 'superadmin' || userRole === 'admin') && (
                <Button
                  onClick={handleAddSchedule}
                  className="bg-islamic-green hover:bg-islamic-green/90 text-white flex items-center gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  إضافة موعد جديد
                </Button>
              )}
            </div>

            {/* حالة التحميل أو لا توجد مواعيد */}
            {loadingSchedules ? (
              <div className="text-center p-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-islamic-green mb-4"></div>
                  <span className="text-muted-foreground">جاري تحميل جدولة الحلقة...</span>
                </div>
              </div>
            ) : circleSchedules.length === 0 ? (
              <div className="text-center p-8 bg-white/30 rounded-lg shadow-sm">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">لا توجد مواعيد محددة</h3>
                <p className="text-muted-foreground mb-4">لم يتم تسجيل أي مواعيد لهذه الحلقة بعد</p>
                {(userRole === 'superadmin' || userRole === 'admin') && (
                  <Button onClick={handleAddSchedule} className="bg-islamic-green hover:bg-islamic-green/90 text-white">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة أول موعد
                  </Button>
                )}
                {userRole === 'teacher' && (
                  <p className="text-muted-foreground text-sm">لا يمكن للمعلمين إضافة مواعيد. يرجى التواصل مع الإدارة.</p>
                )}
              </div>
            ) : (

              <GenericTable
                data={circleSchedules}
                columns={[
                  {
                    key: 'weekday',
                    header: 'اليوم 📅',
                    align: 'right',
                    render: (schedule) => (
                      <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">
                        {getWeekdayName(schedule.weekday)}
                      </span>
                    ),
                  },
                  {
                    key: 'time',
                    header: 'الوقت 🕒',
                    align: 'right',
                    render: (schedule) => (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-md">
                          <Clock className="h-4 w-4" />
                          {formatTime(schedule.start_time)}
                        </div>
                        <span className="text-gray-400 font-bold">—</span>
                        <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 px-2 py-1 rounded-md">
                          <Clock className="h-4 w-4" />
                          {formatTime(schedule.end_time)}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'location',
                    header: 'الموقع 📍',
                    align: 'right',
                    render: (schedule) =>
                      schedule.location ? (
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          {schedule.location}
                        </div>
                      ) : (
                        <span className="text-green-700/60 dark:text-green-400 italic text-sm">
                          موقع الحلقة الافتراضي
                        </span>
                      ),
                  },
                  {
                    key: 'created_at',
                    header: 'تاريخ الإضافة 📅',
                    align: 'center',
                    render: (schedule) =>
                      schedule.created_at
                        ? new Date(schedule.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                        : '-',
                  },
                  {
                    key: 'actions',
                    header: 'الإجراءات ⚙️',
                    align: 'center',
                    render: (schedule) => (
                      <div className="flex justify-center gap-2 items-center">
                        {(userRole === 'superadmin' || userRole === 'admin') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSchedule(schedule)}
                              className="bg-green-200 dark:bg-green-800 hover:bg-green-300 dark:hover:bg-green-700 text-green-900 dark:text-green-200 rounded-md p-2 transition-colors"
                              title="تعديل الموعد"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule)}
                              className="bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded-md p-2 transition-colors"
                              title="حذف الموعد"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {userRole === 'teacher' && (
                          <span className="text-gray-500 dark:text-gray-400 text-xs py-2">
                            غير مسموح بالتعديل
                          </span>
                        )}
                      </div>
                    ),
                  },
                ]}
                emptyMessage="لا توجد مواعيد"
                className="overflow-hidden rounded-lg text-xs border border-green-300 dark:border-green-700 shadow-sm"
                getRowClassName={(_, index) =>
                  `${index % 2 === 0 ? 'bg-white' : 'bg-green-50/70'} hover:bg-green-100/60 cursor-pointer transition-colors`
                }
              />


            )}
          </div>

          {/* فوتر الديالوج */}
          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t flex justify-end gap-2" dir="rtl">
            <Button
              variant="outline"
              onClick={() => setOpenScheduleDialog(false)}
              className="border-islamic-green text-islamic-green hover:bg-islamic-green/10"
            >
              إغلاق
            </Button>
            {(userRole === 'superadmin' || userRole === 'admin') && (
              <Button
                onClick={handleAddSchedule}
                className="bg-islamic-green hover:bg-islamic-green/90 text-white"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة موعد
              </Button>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>


      <Dialog open={openAddScheduleDialog} onOpenChange={setOpenAddScheduleDialog}>
        <DialogContent
          className="sm:max-w-[500px] w-full rounded-xl p-4 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100"
          dir="rtl"
        >
          {/* إطار داخلي */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            {/* رأس الديالوج */}
            <DialogHeader>
              <DialogTitle className="text-center">
                <h3 className="flex items-center justify-center gap-2 
                          bg-gradient-to-r from-green-400 via-green-300 to-blue-400 
                          text-white text-xl font-extrabold 
                          py-3 px-5 rounded-2xl shadow-md 
                          transition-transform duration-200 hover:scale-105">
                  <Plus className="h-5 w-5 text-white" />
                  إضافة موعد جديد
                </h3>
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-center text-sm mt-1">
                قم بتحديد اليوم والوقت لإضافة موعد جديد للحلقة
              </DialogDescription>
            </DialogHeader>

            {/* الجسم */}
            <div className="space-y-4">
              {/* اختيار اليوم كأزرار عصريه */}
              <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">
                <Label className="text-right text-gray-800 text-sm mb-2">اليوم *</Label>
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
              </div>

              {/* وقت البداية والنهاية */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-schedule-start-time" className="text-right text-gray-800 text-sm">وقت البداية *</Label>
                  <Input
                    id="add-schedule-start-time"
                    type="time"
                    value={addScheduleForm.start_time}
                    onChange={(e) => handleAddScheduleFormChange('start_time', e.target.value)}
                    required
                    className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-schedule-end-time" className="text-right text-gray-800 text-sm">وقت النهاية *</Label>
                  <Input
                    id="add-schedule-end-time"
                    type="time"
                    value={addScheduleForm.end_time}
                    onChange={(e) => handleAddScheduleFormChange('end_time', e.target.value)}
                    required
                    className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2"
                  />
                </div>
              </div>

              {/* الموقع */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="add-schedule-location" className="text-right text-gray-800 text-sm">الموقع (اختياري)</Label>
                  <div className="flex items-center text-xs text-gray-500">
                    <Info className="h-3 w-3 ml-1" />
                    اتركه فارغاً لاستخدام موقع الحلقة الافتراضي
                  </div>
                </div>
                <Input
                  id="add-schedule-location"
                  value={addScheduleForm.location}
                  onChange={(e) => handleAddScheduleFormChange('location', e.target.value)}
                  placeholder="أدخل موقع الموعد (اختياري)"
                  className="bg-gray-50 border-gray-300 rounded-md text-sm py-1 px-2"
                />
              </div>
            </div>

            {/* الفوتر */}
            <DialogFooter className="gap-3 flex justify-end mt-4" dir="rtl">
              <Button
                variant="outline"
                onClick={() => setOpenAddScheduleDialog(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-100 text-sm px-3 py-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSaveNewSchedule}
                className="bg-green-600 hover:bg-green-700 text-white rounded-md px-4 py-2 text-sm transition-colors"
                disabled={!addScheduleForm.start_time || !addScheduleForm.end_time || savingNewSchedule}
              >
                {savingNewSchedule ? "جارٍ الإضافة..." : "إضافة الموعد"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>



      <Dialog open={openEditScheduleDialog} onOpenChange={setOpenEditScheduleDialog}>
        <DialogContent
          className="sm:max-w-[500px] w-full rounded-xl p-4 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100"
          dir="rtl"
        >
          {/* Frame container */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">

            {/* Header */}
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl flex items-center justify-center gap-2">
                <h3 className="bg-gradient-to-r from-orange-400 via-orange-300 to-yellow-400 
                          text-white text-xl font-extrabold py-3 px-5 rounded-2xl shadow-md 
                          transition-transform duration-200 hover:scale-105 flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-white" />
                  تعديل موعد
                </h3>
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground mt-1">
                قم بتعديل بيانات الموعد
              </DialogDescription>
            </DialogHeader>

            {/* Body */}
            <div className="space-y-4 py-4">

              {/* اليوم كأزرار عصرية */}
              <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">
                <Label className="text-right text-gray-800 text-sm mb-2">اليوم <span className="text-red-500">*</span></Label>
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
              </div>

              {/* وقت البداية والنهاية */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-schedule-start-time" className="text-right text-gray-800 text-sm">
                    وقت البداية <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-schedule-start-time"
                    type="time"
                    value={editScheduleForm.start_time}
                    onChange={(e) => handleEditScheduleFormChange('start_time', e.target.value)}
                    required
                    className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-schedule-end-time" className="text-right text-gray-800 text-sm">
                    وقت النهاية <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-schedule-end-time"
                    type="time"
                    value={editScheduleForm.end_time}
                    onChange={(e) => handleEditScheduleFormChange('end_time', e.target.value)}
                    required
                    className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2"
                  />
                </div>
              </div>

              {/* الموقع (اختياري) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-schedule-location" className="text-right text-gray-800 text-sm">
                    الموقع (اختياري)
                  </Label>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Info className="h-3 w-3 mr-1" />
                    اتركه فارغاً لاستخدام موقع الحلقة الافتراضي
                  </div>
                </div>
                <Input
                  id="edit-schedule-location"
                  value={editScheduleForm.location}
                  onChange={(e) => handleEditScheduleFormChange('location', e.target.value)}
                  placeholder="أدخل موقع الموعد (اختياري)"
                  className="bg-gray-50 border-gray-300 rounded-md text-sm py-1 px-2"
                />
              </div>

            </div>

            {/* Footer */}
            <DialogFooter className="flex justify-end gap-2 mt-4" dir="rtl">
              <Button
                variant="outline"
                onClick={() => setOpenEditScheduleDialog(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-100 text-sm px-3 py-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSaveScheduleEdit}
                className="bg-green-600 hover:bg-green-700 text-white rounded-md px-4 py-2 text-sm transition-colors"
                disabled={!editScheduleForm.start_time || !editScheduleForm.end_time || savingScheduleEdit}
              >
                {savingScheduleEdit ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </Button>
            </DialogFooter>

          </div>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تأكيد حذف الجدولة */}
      <DeleteConfirmationDialog
        isOpen={isDeleteScheduleDialogOpen}
        onOpenChange={setIsDeleteScheduleDialogOpen}
        onConfirm={executeDeleteSchedule}
        isLoading={false}
        title="تأكيد حذف الموعد"
        description="هل أنت متأكد من رغبتك في حذف هذا الموعد من جدول الحلقة؟"
        itemDetails={scheduleToDelete ? {
          "اليوم": getWeekdayName(+scheduleToDelete.weekday),
          "الوقت": `${scheduleToDelete.start_time} - ${scheduleToDelete.end_time}`,
          "المكان": scheduleToDelete.location || "-"
        } : null}
        deleteButtonText="نعم، احذف الموعد"
        cancelButtonText="إلغاء"
      />

    </div>
  );
}
