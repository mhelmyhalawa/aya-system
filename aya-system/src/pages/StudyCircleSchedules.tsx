import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StudyCircle } from "@/types/study-circle";
import { StudyCircleSchedule, StudyCircleScheduleCreate, StudyCircleScheduleUpdate, weekdayOptions, getWeekdayName, formatTime } from "@/types/study-circle-schedule";
import { getAllStudyCircles, getStudyCircleById, getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { getStudyCircleSchedules, createStudyCircleSchedule, updateStudyCircleSchedule, deleteStudyCircleSchedule } from "@/lib/study-circle-schedule-service";
import { Calendar, Clock, Search, Plus, Pencil, Trash2, Info, MapPin, BookOpen, ChevronLeft, AlertCircle } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { GenericTable } from "@/components/ui/generic-table";

interface StudyCircleSchedulesPageProps {
  onNavigate: (path: string) => void;
  userRole: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string;
}

export function StudyCircleSchedulesPage({ onNavigate, userRole, userId }: StudyCircleSchedulesPageProps) {
  const { toast } = useToast();
  const [allCircles, setAllCircles] = useState<StudyCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCircle, setSelectedCircle] = useState<StudyCircle | null>(null);

  // State for circle schedules
  const [circleSchedules, setCircleSchedules] = useState<StudyCircleSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Add schedule dialog state
  const [openAddScheduleDialog, setOpenAddScheduleDialog] = useState(false);
  const [savingNewSchedule, setSavingNewSchedule] = useState(false);
  const [addScheduleForm, setAddScheduleForm] = useState({
    weekday: '0',
    start_time: '08:00',
    end_time: '09:00',
    location: ''
  });

  // Edit schedule dialog state
  const [openEditScheduleDialog, setOpenEditScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<StudyCircleSchedule | null>(null);
  const [savingScheduleEdit, setSavingScheduleEdit] = useState(false);
  const [editScheduleForm, setEditScheduleForm] = useState({
    weekday: '0',
    start_time: '08:00',
    end_time: '09:00',
    location: ''
  });

  // Delete confirmation dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<StudyCircleSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState(false);

  // Check if user can edit schedules (admin/superadmin only)
  const canEditSchedules = userRole === 'admin' || userRole === 'superadmin';

  // Load all circles on page load
  useEffect(() => {
    loadCircles();
  }, [userRole, userId]);

  // Load circles based on user role
  const loadCircles = async () => {
    setLoading(true);
    try {
      let circles: StudyCircle[] = [];

      // إذا كان المستخدم معلم، نحمل حلقاته فقط
      if (userRole === 'teacher' && userId) {
        circles = await getStudyCirclesByTeacherId(userId);
        console.log('Teacher circles loaded:', circles);
      }
      // إذا كان المستخدم مشرف أو مدير، نحمل جميع الحلقات
      else if (userRole === 'admin' || userRole === 'superadmin') {
        circles = await getAllStudyCircles();
      }

      setAllCircles(circles);

      // إذا كان معلم ولديه حلقة واحدة فقط، نختارها تلقائيًا
      if (userRole === 'teacher' && circles.length === 1) {
        setSelectedCircle(circles[0]);
        await loadCircleSchedules(circles[0].id);
      }
    } catch (error) {
      console.error("Error loading circles:", error);
      toast({
        title: "خطأ في تحميل الحلقات",
        description: "حدث خطأ أثناء تحميل قائمة الحلقات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load schedules for a specific circle
  const loadCircleSchedules = async (circleId: string) => {
    setLoadingSchedules(true);
    try {
      const schedules = await getStudyCircleSchedules(circleId);
      console.log('📅 Loaded schedules:', schedules);
      setCircleSchedules(schedules);
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast({
        title: "خطأ في تحميل الجدولة",
        description: "حدث خطأ أثناء تحميل جدولة الحلقة",
        variant: "destructive",
      });
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Handle circle selection
  const handleSelectCircle = async (circle: StudyCircle) => {
    setSelectedCircle(circle);
    await loadCircleSchedules(circle.id);
  };

  // Filter circles based on search term
  const filteredCircles = allCircles.filter(
    circle =>
      circle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (circle.teacher?.full_name && circle.teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Add schedule
  const handleAddSchedule = () => {
    // Reset add schedule form
    setAddScheduleForm({
      weekday: '0',
      start_time: '08:00',
      end_time: '09:00',
      location: ''
    });

    // Open add schedule dialog
    setOpenAddScheduleDialog(true);
  };

  // Handle add schedule form changes
  const handleAddScheduleFormChange = (field: string, value: string) => {
    setAddScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save new schedule
  const handleSaveNewSchedule = async () => {
    if (!selectedCircle || savingNewSchedule) return;

    try {
      setSavingNewSchedule(true);

      // Validate form data
      if (!addScheduleForm.start_time || !addScheduleForm.end_time) {
        toast({
          title: "خطأ في البيانات",
          description: "الرجاء تحديد وقت البداية والنهاية",
          variant: "destructive",
        });
        setSavingNewSchedule(false);
        return;
      }

      // Check if end time is after start time
      if (addScheduleForm.start_time >= addScheduleForm.end_time) {
        toast({
          title: "خطأ في الأوقات",
          description: "يجب أن يكون وقت النهاية بعد وقت البداية",
          variant: "destructive",
        });
        setSavingNewSchedule(false);
        return;
      }

      // Prepare new schedule data
      const newScheduleData: StudyCircleScheduleCreate = {
        study_circle_id: selectedCircle.id,
        weekday: parseInt(addScheduleForm.weekday),
        start_time: addScheduleForm.start_time,
        end_time: addScheduleForm.end_time,
        location: addScheduleForm.location.trim() || null
      };

      console.log('💾 Creating new schedule:', newScheduleData);

      // Call API to add the schedule
      const result = await createStudyCircleSchedule(newScheduleData);

      if (result.success) {
        toast({
          title: "✅ تمت الإضافة بنجاح",
          description: `تم إضافة جدولة جديدة للحلقة "${selectedCircle.name}" بنجاح`,
          variant: "default",
        });

        // Reload schedules to show the new one
        await loadCircleSchedules(selectedCircle.id);

        // Close add dialog
        setOpenAddScheduleDialog(false);
      } else {
        toast({
          title: "خطأ في الإضافة",
          description: result.message || "حدث خطأ أثناء إضافة الجدولة الجديدة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error creating new schedule:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء إضافة الجدولة الجديدة",
        variant: "destructive",
      });
    } finally {
      setSavingNewSchedule(false);
    }
  };

  // Edit schedule
  const handleEditSchedule = (schedule: StudyCircleSchedule) => {
    setEditingSchedule(schedule);
    setEditScheduleForm({
      weekday: schedule.weekday.toString(),
      start_time: schedule.start_time.substring(0, 5), // HH:MM format
      end_time: schedule.end_time.substring(0, 5), // HH:MM format
      location: schedule.location || ''
    });
    setOpenEditScheduleDialog(true);
  };

  // Handle edit schedule form changes
  const handleEditScheduleFormChange = (field: string, value: string) => {
    setEditScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save schedule edit
  const handleSaveScheduleEdit = async () => {
    if (!editingSchedule || savingScheduleEdit) return;

    try {
      setSavingScheduleEdit(true);

      // Validate form data
      if (!editScheduleForm.start_time || !editScheduleForm.end_time) {
        toast({
          title: "خطأ في البيانات",
          description: "الرجاء تحديد وقت البداية والنهاية",
          variant: "destructive",
        });
        return;
      }

      // Check if end time is after start time
      if (editScheduleForm.start_time >= editScheduleForm.end_time) {
        toast({
          title: "خطأ في الأوقات",
          description: "يجب أن يكون وقت النهاية بعد وقت البداية",
          variant: "destructive",
        });
        return;
      }

      // Prepare update data
      const updateData: StudyCircleScheduleUpdate = {
        id: editingSchedule.id,
        weekday: parseInt(editScheduleForm.weekday),
        start_time: editScheduleForm.start_time,
        end_time: editScheduleForm.end_time,
        location: editScheduleForm.location.trim() || null
      };

      console.log('💾 Updating schedule with data:', updateData);

      // Call API to update the schedule
      const result = await updateStudyCircleSchedule(updateData);

      if (result.success) {
        toast({
          title: "✅ تم التحديث بنجاح",
          description: `تم تحديث بيانات الجدولة بنجاح`,
          variant: "default",
        });

        // Reload schedules to show the update
        if (selectedCircle) {
          await loadCircleSchedules(selectedCircle.id);
        }

        // Close edit dialog
        setOpenEditScheduleDialog(false);
        setEditingSchedule(null);
      } else {
        toast({
          title: "خطأ في التحديث",
          description: result.message || "حدث خطأ أثناء تحديث بيانات الجدولة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error updating schedule:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء تحديث بيانات الجدولة",
        variant: "destructive",
      });
    } finally {
      setSavingScheduleEdit(false);
    }
  };

  // Delete schedule
  const handleDeleteSchedule = (schedule: StudyCircleSchedule) => {
    setScheduleToDelete(schedule);
    setOpenDeleteDialog(true);
  };

  // Confirm delete schedule
  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    try {
      setDeletingSchedule(true);

      // Execute the actual deletion
      const result = await deleteStudyCircleSchedule(scheduleToDelete.id);

      if (result.success) {
        toast({
          title: "✅ تم الحذف بنجاح",
          description: `تم حذف الجدولة بنجاح`,
          variant: "default",
        });

        console.log('✅ Schedule deleted successfully:', scheduleToDelete.id);

        // Reload schedules for the selected circle
        if (selectedCircle) {
          await loadCircleSchedules(selectedCircle.id);
        }
      } else {
        toast({
          title: "خطأ في الحذف",
          description: result.message || "حدث خطأ أثناء حذف الجدولة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error deleting schedule:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء حذف الجدولة",
        variant: "destructive",
      });
    } finally {
      setDeletingSchedule(false);
      setOpenDeleteDialog(false);
      setScheduleToDelete(null);
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedCircle(null);
    setCircleSchedules([]);
  };

  return (
    <div className="container mx-auto py-6" dir="rtl">

      <Card className="border border-green-300 shadow-xl rounded-2xl overflow-hidden">
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">

            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-300" />
                إدارة جدولة الحلقات الدراسية
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                عرض وتعديل جدولة الحلقات الدراسية ومواعيدها
              </CardDescription>
            </div>

            {/* زر العودة */}
            <Button
              variant="outline"
              className="flex items-center gap-2 rounded-3xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
              onClick={() => onNavigate('/study-circles')}
            >
              <ChevronLeft className="h-4 w-4" />
              العودة إلى الحلقات
            </Button>

          </div>
        </CardHeader>


        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* جانب الحلقات - ثلث الصفحة */}
            <div className="md:col-span-1">
              <div className="bg-green-50 border border-green-300 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 p-4">
                  <h2 className="text-xl font-semibold text-white mb-0 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    الحلقات الدراسية
                  </h2>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                  {/* مربع البحث */}
                  <div className="relative">
                    {userRole !== 'teacher' && (
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
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                      <span className="text-sm text-green-600">جاري تحميل الحلقات...</span>
                    </div>
                  ) : filteredCircles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
                      <BookOpen className="h-12 w-12 text-green-200" />
                      <h3 className="text-lg font-semibold text-green-800">لا توجد حلقات</h3>
                      <p className="text-sm text-green-600">
                        لم يتم العثور على حلقات تطابق معايير البحث
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-green-100">
                      {filteredCircles.map((circle) => (
                        <div
                          key={circle.id}
                          className={`cursor-pointer transition-all duration-200 rounded-2xl flex flex-col gap-1 p-2 shadow-sm ${selectedCircle?.id === circle.id
                            ? 'bg-green-700 text-white ring-1 ring-green-400 scale-105'
                            : 'bg-green-50 hover:bg-green-100 text-green-800'
                            }`}
                          onClick={() => handleSelectCircle(circle)}
                        >
                          <div className="flex items-center justify-between text-sm font-medium gap-1">
                            {/* اسم الحلقة مع أيقونة كتاب صغيرة */}
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-green-500">📖</span>
                              <span className="truncate">{circle.name}</span>
                              {circle.teacher && (
                                <span className={`flex items-center gap-1 text-xs truncate ${selectedCircle?.id === circle.id ? 'text-white' : 'text-green-700'
                                  }`}>
                                  👨‍🏫 {circle.teacher.full_name}
                                </span>
                              )}
                            </div>

                            {selectedCircle?.id === circle.id && (
                              <Badge
                                variant="outline"
                                className={`${selectedCircle?.id === circle.id ? 'text-white border-white' : 'text-green-800 border-green-400'
                                  } text-xs`}
                              >
                                محدد
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

            {/* جانب الجدولة - ثلثين الصفحة */}
            <div className="md:col-span-2">
              <div className="bg-green-50 border border-green-200 rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="pb-4 bg-gradient-to-r from-green-100 via-green-200 to-green-700 p-4">
                  <div className="flex justify-between  items-center">
                    <CardTitle className="text-lg font-bold text-white flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-700" />
                        {selectedCircle ? `جدولة حلقة: ${selectedCircle.name}` : 'جدولة الحلقات'} | 👨‍🏫
                      </div>

                      {selectedCircle?.teacher && (
                        <CardDescription className="text-gray-700 text-xs sm:text-[10px]">
                          المعلم: {selectedCircle.teacher.full_name}
                        </CardDescription>
                      )}
                    </CardTitle>

                    {selectedCircle && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-3 rounded-3xl border-2 border-green-600 text-green-900 
                                hover:bg-green-100 hover:text-green-800 hover:scale-105 
                                dark:border-green-500 dark:text-green-300 dark:hover:bg-green-800 dark:hover:text-green-200 
                                shadow-lg transition-all duration-200 px-5 py-2 font-semibold"
                          onClick={handleClearSelection}
                        >
                          إلغاء التحديد
                        </Button>

                        {canEditSchedules && (
                          <Button
                            onClick={handleAddSchedule}
                            size="sm"
                            className="flex items-center gap-3 rounded-3xl bg-green-600 hover:bg-green-700 
                            dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-5 py-2 font-semibold"
                          >
                            <Plus className="h-4 w-4" />
                            إضافة موعد
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  {!selectedCircle ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
                      <Calendar className="h-16 w-16 text-green-200" />
                      <h3 className="text-xl font-semibold text-green-800">اختر حلقة للبدء</h3>
                      <p className="text-green-600 max-w-md">
                        يرجى اختيار حلقة من القائمة على اليسار لعرض وإدارة مواعيد جدولتها
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg border border-green-200">
                        <Badge variant="outline" className="text-green-800 border-green-400">
                          {circleSchedules.length} موعد
                        </Badge>
                        <span className="text-sm text-green-700">إجمالي المواعيد</span>
                      </div>
                      <GenericTable
                        data={circleSchedules}
                        columns={[
                          {
                            key: 'weekday',
                            header: '📅 اليوم',
                            align: 'right' as const,
                            render: (schedule: StudyCircleSchedule) => (
                              <span className="font-medium text-green-900 dark:text-green-200 text-sm">
                                {getWeekdayName(schedule.weekday)}
                              </span>
                            ),
                          },
                          {
                            key: 'time',
                            header: '🕒 الوقت',
                            align: 'right' as const,
                            render: (schedule: StudyCircleSchedule) => (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-lg">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{formatTime(schedule.start_time)}</span>
                                </div>
                                <span className="text-gray-400 font-bold mx-1">—</span>
                                <div className="flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-lg">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{formatTime(schedule.end_time)}</span>
                                </div>
                              </div>
                            ),
                          },
                          {
                            key: 'location',
                            header: '📍 الموقع',
                            align: 'right' as const,
                            render: (schedule: StudyCircleSchedule) =>
                              schedule.location ? (
                                <div className="flex items-center gap-2 text-green-800">
                                  <MapPin className="h-4 w-4 text-green-600" />
                                  {schedule.location}
                                </div>
                              ) : (
                                <span className="text-green-700/60 italic text-sm">موقع الحلقة الافتراضي</span>
                              ),
                          },
                          {
                            key: 'created_at',
                            header: '📅 تاريخ الإضافة',
                            align: 'center' as const,
                            render: (schedule: StudyCircleSchedule) =>
                              schedule.created_at
                                ? new Date(schedule.created_at).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                                : '-',
                          },
                          ...(canEditSchedules ? [{
                            key: 'actions',
                            header: '⚙️ الإجراءات',
                            align: 'center' as const,
                            render: (schedule: StudyCircleSchedule) => (
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSchedule(schedule)}
                                  className="bg-green-200 hover:bg-green-300 text-green-900 rounded-md p-2 transition-colors"
                                  title="تعديل الموعد"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSchedule(schedule)}
                                  className="bg-red-100 hover:bg-red-200 text-red-700 rounded-md p-2 transition-colors"
                                  title="حذف الموعد"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ),
                          }] : []),
                        ]}
                        emptyMessage="لا توجد مواعيد"
                        className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
                        getRowClassName={(_, index) =>
                          `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`
                        }
                      />



                    </div>
                  )}
                </CardContent>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Add Schedule Dialog */}
      <Dialog open={openAddScheduleDialog} onOpenChange={setOpenAddScheduleDialog}>
        <DialogContent
          className="sm:max-w-[480px] w-full rounded-xl p-4 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100"
          dir="rtl"
        >
          {/* Frame container */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            {/* Header */}
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


            {/* Body */}
            <div className="space-y-4">
              {/* اليوم */}
              <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">
                {/* اليوم كأزرار عصرية */}
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

                {/* الوقت */}
                <Label htmlFor="add-schedule-start-time" className="text-right text-gray-800 text-sm mt-2">وقت البداية *</Label>
                <Input
                  id="add-schedule-start-time"
                  type="time"
                  value={addScheduleForm.start_time}
                  onChange={(e) => handleAddScheduleFormChange('start_time', e.target.value)}
                  required
                  className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2"
                />

                <Label htmlFor="add-schedule-end-time" className="text-right text-gray-800 text-sm mt-2">وقت النهاية *</Label>
                <Input
                  id="add-schedule-end-time"
                  type="time"
                  value={addScheduleForm.end_time}
                  onChange={(e) => handleAddScheduleFormChange('end_time', e.target.value)}
                  required
                  className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2"
                />

                {/* الموقع */}
                <Label htmlFor="add-schedule-location" className="text-right text-gray-800 text-sm mt-2">الموقع (اختياري)</Label>
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
              </div>
            </div>

            {/* Footer */}
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

      {/* Edit Schedule Dialog */}
      <Dialog open={openEditScheduleDialog} onOpenChange={setOpenEditScheduleDialog}>
        <DialogContent
          className="sm:max-w-[480px] w-full rounded-xl p-4 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100"
          dir="rtl"
        >
          {/* Frame container */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            {/* Header */}
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-bold text-center">
                <h3 className="flex items-center justify-center gap-2 
                        bg-gradient-to-r from-orange-400 via-orange-300 to-yellow-400 
                        text-white text-xl font-extrabold 
                        py-3 px-5 rounded-2xl shadow-md 
                        transition-transform duration-200 hover:scale-105">
                  <Pencil className="h-5 w-5 text-white" />
                  تعديل موعد
                </h3>
              </DialogTitle>

              <DialogDescription className="text-gray-600 text-center text-sm mt-1">
                قم بتعديل بيانات الموعد
              </DialogDescription>
            </DialogHeader>




            {/* Body */}
            <div className="space-y-4">
              {/* اليوم */}
              <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">

                {/* اليوم كأزرار عصرية */}
                <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">
                  <Label className="text-right text-gray-800 text-sm mb-2">اليوم *</Label>
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
                {/* الوقت */}
                <Label htmlFor="edit-schedule-start-time" className="text-right text-gray-800 text-sm mt-2">وقت البداية *</Label>
                <Input
                  id="edit-schedule-start-time"
                  type="time"
                  value={editScheduleForm.start_time}
                  onChange={(e) => handleEditScheduleFormChange('start_time', e.target.value)}
                  required
                  className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2"
                />

                <Label htmlFor="edit-schedule-end-time" className="text-right text-gray-800 text-sm mt-2">وقت النهاية *</Label>
                <Input
                  id="edit-schedule-end-time"
                  type="time"
                  value={editScheduleForm.end_time}
                  onChange={(e) => handleEditScheduleFormChange('end_time', e.target.value)}
                  required
                  className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2"
                />

                {/* الموقع */}
                <Label htmlFor="edit-schedule-location" className="text-right text-gray-800 text-sm mt-2">الموقع (اختياري)</Label>
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
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="gap-3 flex justify-end mt-4" dir="rtl">
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

      {/* حوار تأكيد الحذف */}

      <DeleteConfirmationDialog
        isOpen={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onConfirm={confirmDeleteSchedule}
        isLoading={deletingSchedule}
        title="تأكيد حذف الموعد"
        description="هل أنت متأكد من رغبتك في حذف هذا الموعد من جدول الحلقة؟"
        itemDetails={scheduleToDelete ? {
          "اليوم": getWeekdayName(scheduleToDelete.weekday),
          "الوقت": `${formatTime(scheduleToDelete.start_time)} - ${formatTime(scheduleToDelete.end_time)}`,
          "المكان": scheduleToDelete.location || "-"
        } : null}
        deleteButtonText="نعم، احذف الموعد"
        cancelButtonText="إلغاء"
      />

    </div>
  );
}
