import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
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
import { Calendar, Clock, Search, Plus, Pencil, Trash2, Info, MapPin, BookOpen, ChevronLeft, AlertCircle, AlertTriangle, X, ChevronRight } from "lucide-react";
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

  // === Helpers for grouping & conflict detection ===
  const parseTimeToMinutes = (time: string) => {
    const [h, m] = time.split(":");
    return parseInt(h) * 60 + parseInt(m);
  };

  const conflictIds: Set<string> = (() => {
    const set = new Set<string>();
    const byDay: Record<number, StudyCircleSchedule[]> = {};
    circleSchedules.forEach(s => { (byDay[s.weekday] ||= []).push(s); });
    Object.values(byDay).forEach(list => {
      list.forEach(a => {
        const aStart = parseTimeToMinutes(a.start_time.substring(0, 5));
        const aEnd = parseTimeToMinutes(a.end_time.substring(0, 5));
        list.forEach(b => {
          if (a.id === b.id) return;
          const bStart = parseTimeToMinutes(b.start_time.substring(0, 5));
          const bEnd = parseTimeToMinutes(b.end_time.substring(0, 5));
          if (aStart < bEnd && aEnd > bStart) {
            set.add(a.id); set.add(b.id);
          }
        });
      });
    });
    return set;
  })();

  const groupedSchedules = (() => {
    const groups: Record<number, StudyCircleSchedule[]> = {};
    circleSchedules.forEach(s => { (groups[s.weekday] ||= []).push(s); });
    Object.values(groups).forEach(list => list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return weekdayOptions
      .map(o => parseInt(o.value, 10))
      .filter(day => groups[day]?.length)
      .map(day => ({ weekday: day, items: groups[day] }));
  })();

  return (
    // جعل العرض يملأ الشاشة في الموبايل بإزالة قيود container
    <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-0 py-1 sm:py-2">

      <Card>
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-base sm:text-xl md:text-2xl font-extrabold text-white flex items-center justify-between gap-2 drop-shadow-md">

                <div className="flex items-center gap-1 sm:gap-2 justify-end">
                  <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-300 animate-pulse" />
                  <span className="line-clamp-1">جدولة الحلقات الدراسية </span>
                </div>
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-sm text-green-100/90 mt-0.5">
                إدارة مواعيد وجدولة الحلقات الدراسية .
              </CardDescription>
            </div>

          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-6 px-2 sm:px-4 pt-3 pb-4">
          <div className="grid md:grid-cols-3 gap-2 sm:gap-6">
            {/* قائمة الجوال */}
            <div className="md:hidden">
              <div className="bg-white/70 backdrop-blur border border-green-200 rounded-lg shadow-sm overflow-hidden mb-3">
                {/* الهيدر */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-2 py-2 bg-gradient-to-r from-green-600 via-green-500 to-green-600">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-white" />
                    <h2 className="text-[12px] font-semibold text-white">قائمة الحلقات</h2>
                  </div>
                  {selectedCircle && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-white/80">المعلم:</span>
                      <Badge className="bg-white/20 text-white font-normal px-2 py-0 h-4 rounded-full text-[10px]">
                        {selectedCircle.teacher?.full_name?.split(" ")[0] || 'غير محدد'}
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
                        placeholder="بحث..."
                        className="pr-7 h-8 text-[11px] rounded-lg border-green-300 focus:ring-green-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* العناصر */}
                <div className="px-2 pt-2 pb-1 overflow-y-auto max-h-44 scrollbar-thin scrollbar-thumb-green-400 scrollbar-track-transparent">
                  {loading ? (
                    <div className="w-full py-6 text-center flex flex-col items-center">
                      <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full mb-2"></div>
                      <span className="text-green-700 text-[12px] font-medium">جاري التحميل...</span>
                    </div>
                  ) : filteredCircles.length === 0 ? (
                    <div className="w-full py-6 text-center text-green-600 text-[12px]">لا توجد نتائج</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {filteredCircles.map(circle => {
                        const active = selectedCircle?.id === circle.id;
                        return (
                          <button
                            key={circle.id}
                            onClick={() => handleSelectCircle(circle)}
                            className={`group flex items-center justify-between w-full px-2 py-1.5 rounded-md border text-[11px] transition-all duration-200
                        ${active
                                ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-300 text-white shadow-md'
                                : 'bg-white border-green-200 text-green-700 hover:bg-green-50 hover:border-green-400 hover:shadow-sm'}
                      `}
                          >
                            <span className="font-medium truncate">{circle.name}</span>
                            <div className="flex items-center gap-1.5">
                              {circle.teacher && (
                                <span className={`text-[10px] ${active ? 'text-green-100' : 'text-green-500'}`}>
                                  {circle.teacher.full_name.split(" ")[0]}
                                </span>
                              )}
                              {active && (
                                <span className="inline-flex items-center bg-white/30 text-[9px] px-1 py-0.5 rounded-full font-medium">
                                  ✓
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* جانب الحلقات - ثلث الصفحة (ديسكتوب) */}
            <div className="md:col-span-1 hidden md:block">
              <div className="bg-green-50 border border-green-300 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 p-3">
                  <h2 className="text-lg font-semibold text-white mb-0 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    الحلقات الدراسية
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
                          placeholder="بحث عن حلقة..."
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
                          className={`cursor-pointer transition-all duration-200 rounded-2xl flex flex-col gap-1 p-2.5 shadow-sm text-sm ${selectedCircle?.id === circle.id
                            ? 'bg-green-700 text-white ring-1 ring-green-400'
                            : 'bg-green-50 hover:bg-green-100 text-green-800'
                            }`}
                          onClick={() => handleSelectCircle(circle)}
                        >
                          <div className="flex items-center justify-between font-medium gap-1">
                            {/* اسم الحلقة مع أيقونة كتاب صغيرة */}
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-green-500">📖</span>
                              <span className="truncate">{circle.name}</span>
                              {circle.teacher && (
                                <span className={`flex items-center gap-1 text-[11px] truncate ${selectedCircle?.id === circle.id ? 'text-white' : 'text-green-700'
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
              <div className="bg-green-50 border border-green-200 rounded-none md:rounded-xl shadow-sm overflow-hidden">

                {/* هيدر ديناميكي حسب الشاشة */}
                {/** هيدر الموبايل **/}
                <div className="flex items-center justify-between md:hidden px-2 py-1 bg-gradient-to-r from-green-600 via-green-500 to-green-600 rounded-t-lg">
                  <div className="flex items-center gap-1 truncate">
                    {selectedCircle?.teacher && (
                      <>
                        <BookOpen className="h-3 w-3 text-white" />
                        <span className="text-[9px] text-white truncate">
                          <span className="truncate">{selectedCircle.name}</span> 👨‍🏫 {selectedCircle.teacher.full_name.split(" ")[0]}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canEditSchedules && selectedCircle && (
                      <Button
                      onClick={handleAddSchedule}
                      size="sm"
                      className="flex items-center gap-1 rounded-md bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-[8px] px-1 py-0.5 h-5 shadow-none"
                      title="إضافة موعد"
                      >
                      <Plus className="h-2.5 w-2.5" />
                      </Button>
                    )}

                    {selectedCircle && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSelection}
                        className="flex items-center gap-1 rounded-md bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-[8px] px-1 py-0.5 h-5 shadow-none border border-green-200"
                        title="إلغاء التحديد"
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>

                    )}
                  </div>
                </div>


                {/** هيدر الديسكتوب **/}
                <div className="hidden md:flex justify-between items-center bg-gradient-to-r from-green-100 via-green-200 to-green-700 px-4 py-4 rounded-t-xl">
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


                {/* محتوى الجدولة */}
                <CardContent className="px-3 sm:px-4 pt-4 pb-5">
                  {!selectedCircle ? (
                    <div className="flex flex-col items-center justify-center p-10 sm:p-12 text-center gap-3 text-sm sm:text-base">
                      <Calendar className="h-16 w-16 text-green-200" />
                      <h3 className="text-xl font-semibold text-green-800">اختر حلقة للبدء</h3>
                      <p className="text-green-600 max-w-md">
                        يرجى اختيار حلقة من القائمة على اليسار لعرض وإدارة مواعيد جدولتها
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">

                      {/* ملخص المواعيد */}
                      <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-green-100 rounded-none md:rounded-lg border border-green-200 text-xs sm:text-sm">
                        <span className="text-sm text-green-700">إجمالي المواعيد</span>
                        <Badge variant="outline" className="text-green-800 border-green-400">
                          {circleSchedules.length} موعد
                        </Badge>
                      </div>

                      {/* عرض الموبايل */}
                      <div className="md:hidden space-y-2.5 px-2" role="list" aria-label="قائمة المواعيد">
                        {circleSchedules.length === 0 && (
                          <div className="text-center text-[13px] text-green-600 py-5">لا توجد مواعيد</div>
                        )}

                        {[...circleSchedules]
                          .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time))
                          .map(schedule => {
                            const isConflict = conflictIds.has(schedule.id);

                            return (
                              <div
                                key={schedule.id}
                                role="listitem"
                                className={`rounded-lg border shadow-sm p-2.5 flex flex-col gap-2 text-[12px] relative transition-colors`}
                                aria-label={`موعد يوم ${getWeekdayName(schedule.weekday)}`}
                              >

                                <div className="px-4 py-2 flex items-center justify-between bg-gradient-to-r from-green-400 to-green-600 rounded-xl shadow-md border border-green-300">
                                  <h3 className="font-bold flex items-center gap-2 text-sm text-white">
                                    <span>📅 {getWeekdayName(schedule.weekday)}</span>
                                  </h3>
                                </div>


                                <div className="flex items-center gap-2 text-[11px]">
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-md flex-1 justify-center bg-blue-100 text-blue-800">
                                    <Clock className="h-3 w-3 text-blue-600" /> {formatTime(schedule.start_time)}
                                  </div>
                                  <span className="text-gray-400 font-bold">—</span>
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-md flex-1 justify-center bg-purple-100 text-purple-800">
                                    <Clock className="h-3 w-3 text-purple-600" /> {formatTime(schedule.end_time)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 text-green-700">
                                  {schedule.location ? (
                                    <span className="flex items-center gap-1 text-[12px]">
                                      <MapPin className="h-3 w-3 text-green-600" /> {schedule.location}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] italic text-green-500">موقع الحلقة الافتراضي</span>
                                  )}
                                </div>

                                {canEditSchedules && (
                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditSchedule(schedule)}
                                      className="flex-1 rounded-md h-7 bg-green-200 hover:bg-green-300 text-green-900"
                                      title="تعديل الموعد"
                                    >
                                      <Pencil className="h-3.5 w-3.5 mx-auto" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteSchedule(schedule)}
                                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md h-7"
                                      title="حذف الموعد"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mx-auto" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* عرض الديسكتوب */}
                      <div className="hidden md:flex flex-col gap-5" aria-label="المواعيد المجمعة">
                        {groupedSchedules.length === 0 && (
                          <div className="text-center text-sm text-green-600 py-8 border rounded-xl bg-white">لا توجد مواعيد</div>
                        )}
                        {groupedSchedules.map(group => {
                          const dayName = getWeekdayName(group.weekday);
                          return (
                            <div key={group.weekday} className="border border-green-200 rounded-xl overflow-hidden bg-white shadow-sm">
                              <div className="px-4 py-2 flex items-center justify-between bg-gradient-to-r from-green-400 to-green-600 rounded-xl shadow-md border border-green-300">
                                <h3 className="font-bold flex items-center gap-2 text-sm text-white">
                                  <span>📅 {dayName}</span>
                                </h3>
                              </div>
                              <div className="divide-y divide-green-100">
                                {group.items.map(item => {
                                  const isConflict = conflictIds.has(item.id);
                                  return (
                                    <div key={item.id} className={`p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[13px] ${isConflict ? 'bg-red-50/70' : 'hover:bg-green-50'} transition-colors`}>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                                          <Clock className="h-3 w-3 text-blue-600" /> <span className="font-bold">الحضور:</span> {formatTime(item.start_time)}
                                        </div>
                                        <span className="mx-1 text-gray-400">—</span>
                                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                                          <Clock className="h-3 w-3 text-purple-600" /> <span className="font-bold">الانصراف:</span> {formatTime(item.end_time)}
                                        </div>
                                        {item.location ? (
                                          <span className="flex items-center gap-1 text-[11px] md:text-xs text-green-700">
                                            <MapPin className="h-3 w-3 text-green-600" /> {item.location}
                                          </span>
                                        ) : (
                                          <span className="text-[11px] italic text-green-500">موقع افتراضي</span>
                                        )}
                                        {isConflict && (
                                          <span className="flex items-center gap-1 text-[11px] text-red-700 font-semibold bg-red-100 px-2 py-0.5 rounded-full border border-red-300 shadow-sm">
                                            <AlertTriangle className="h-3 w-3" /> تعارض في المواعيد
                                          </span>
                                        )}
                                      </div>
                                      {canEditSchedules && (
                                        <div className="flex items-center gap-2 mt-1 md:mt-0">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditSchedule(item)}
                                            className="bg-green-200 hover:bg-green-300 text-green-900 rounded-md p-2 h-8"
                                            title="تعديل الموعد"
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteSchedule(item)}
                                            className="bg-red-100 hover:bg-red-200 text-red-700 rounded-md p-2 h-8"
                                            title="حذف الموعد"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </CardContent>
              </div>
            </div>


          </div>
        </CardContent>
      </Card>



      {/* Add Schedule Dialog */}
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
          <FormRow label="وقت البداية *">
            <Input
              id="add-schedule-start-time"
              type="time"
              value={addScheduleForm.start_time}
              onChange={(e) => handleAddScheduleFormChange('start_time', e.target.value)}
              required
              className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2 font-medium"
            />
          </FormRow>

          <FormRow label="وقت النهاية *">
            <Input
              id="add-schedule-end-time"
              type="time"
              value={addScheduleForm.end_time}
              onChange={(e) => handleAddScheduleFormChange('end_time', e.target.value)}
              required
              className="bg-purple-50 border-purple-200 text-purple-900 rounded-md text-sm py-1 px-2 font-medium"
            />
          </FormRow>

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
      {/* Edit Schedule Dialog */}
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
        <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">
          {/* اليوم كأزرار عصرية */}
          <Label className="text-right text-gray-800 text-sm mb-2 block">اليوم *</Label>
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

          {/* الوقت */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <FormRow label="وقت البداية *">
              <Input
                id="edit-schedule-start-time"
                type="time"
                value={editScheduleForm.start_time}
                onChange={(e) => handleEditScheduleFormChange('start_time', e.target.value)}
                required
                className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2 font-medium"
              />
            </FormRow>
            <FormRow label="وقت النهاية *">
              <Input
                id="edit-schedule-end-time"
                type="time"
                value={editScheduleForm.end_time}
                onChange={(e) => handleEditScheduleFormChange('end_time', e.target.value)}
                required
                className="bg-purple-50 border-purple-200 text-purple-900 rounded-md text-sm py-1 px-2 font-medium"
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
